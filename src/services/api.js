/**
 * HTTP client for `/api/v1` (BUILD_CONTRACT §4).
 *
 * Design constraints that are not negotiable:
 *
 *  - The reader never sees a technical error. Every reading-path failure degrades quietly:
 *    this module raises a typed `ApiError`, and the calling provider shows at most the one
 *    calm line the corpus allows ("The room is taking a moment to open. You can try again.").
 *    No status codes, no stack traces, no "something went wrong" toast (§3.3 fallback).
 *  - Exactly one retry, with a short backoff, and ONLY for idempotent GETs. Replaying a
 *    donation or an order is a real-world harm; replaying a manifest fetch is free.
 *  - Every request carries a deadline. A hung socket must not become a reader staring at
 *    darkness with no way forward.
 *
 * The bearer token is the anonymous session token from `POST /sessions`. It is set by
 * `services/session.js`; this module never reads storage, which keeps the dependency
 * direction one-way and avoids an import cycle.
 */

import { ENV } from '@/config/env';
import { OGP_TIMING } from '@/config/ogpTheme';

/** Typed failure. `code` is the server's SNAKE_CASE code, or a client-side stand-in. */
export class ApiError extends Error {
  /**
   * @param {string} code
   * @param {string} message
   * @param {number} [status]
   */
  constructor(code, message, status = 0) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

/** Client-side codes, distinguishable from any server code. */
export const CLIENT_ERROR_CODES = Object.freeze({
  NETWORK: 'CLIENT_NETWORK',
  TIMEOUT: 'CLIENT_TIMEOUT',
  PARSE: 'CLIENT_PARSE',
});

/**
 * The feedback category vocabulary, in the server's own order.
 *
 * Mirrored rather than fetched because the server's schema is closed: a category invented at
 * the client is refused by `additionalProperties: false` and by the enum, and would create a
 * bucket no reviewer ever opens. The reader-facing label for each key lives in
 * `COPY.FEEDBACK.CATEGORY_LABELS` — this list is the wire vocabulary, not language.
 */
export const FEEDBACK_CATEGORIES = Object.freeze([
  'clarity',
  'honesty',
  'accessibility',
  'pacing',
  'emotional_weight',
  'factual_concern',
  'technical_problem',
  'other',
]);

/**
 * The server's caps on one submission. Mirrored so the form can tell a reader their note is
 * too long *before* sending it, rather than letting the server refuse work they have already
 * written.
 */
export const FEEDBACK_LIMITS = Object.freeze({
  bodyMaxLength: 4000,
  excerptMaxLength: 500,
  maxPassages: 20,
});

/**
 * The instrument's fixed scale. Five points, and no other scale exists.
 *
 * Mirrored rather than fetched for the same reason as the categories above: the server's
 * schema is closed to 1–5, so a client offering a sixth point would be offering a control
 * whose answer is refused. The *legend* — what each number means — is not here, because that
 * is language the instrument owns and it arrives with the questions.
 */
export const RATING_VALUES = Object.freeze([1, 2, 3, 4, 5]);

/** The reviewer-metadata vocabulary for how the manuscript was read (§5.8). */
export const READING_FORMATS = Object.freeze(['DOCX', 'PDF', 'print', 'immersive room']);

let authToken = null;

/**
 * @param {string|null} token
 */
export const setAuthToken = (token) => {
  authToken = token || null;
};

/** @returns {string|null} */
export const getAuthToken = () => authToken;

/**
 * How this layer replaces a session the server has rejected.
 *
 * A reader's token lives in storage across reloads, but the session behind it does not live
 * forever — it expires, a retention sweep removes it, or the reader erased it in another tab.
 * The token stays syntactically valid, so nothing about the request looks wrong; it simply
 * comes back 401 for the rest of the reader's visit.
 *
 * That failure is invisible on the reading path, which is anonymous-first and carries on
 * without a session, and it is *not* invisible on the one surface where a reader hands over
 * something they wrote by hand. A note refused this way could be retried all evening and never
 * be accepted, because nothing in a retry replaces the token.
 *
 * `session.js` registers the replacement here rather than being imported, because it imports
 * this module — a direct call either way round is a cycle. The same inversion the admin panel
 * uses for `setSessionLostHandler`.
 *
 * @type {null | (() => Promise<string|null>)}
 */
let recoverSession = null;

/**
 * @param {null | (() => Promise<string|null>)} recover Mints a fresh session, or null to unset.
 * @returns {void}
 */
export const setSessionRecovery = (recover) => {
  recoverSession = typeof recover === 'function' ? recover : null;
};

/** The server's one answer for a missing, unknown or expired session (`plugins/sessionAuth.js`). */
const SESSION_REJECTED = 'SESSION_REQUIRED';

/**
 * @param {string} path
 * @param {Record<string, string|number|boolean|undefined|null>} [query]
 * @returns {string}
 */
const buildUrl = (path, query) => {
  const base = `${ENV.apiBaseUrl}${path}`;
  if (!query) return base;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue;
    params.append(key, String(value));
  }
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
};

/**
 * @param {number} ms
 * @returns {Promise<void>}
 */
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * One HTTP attempt.
 *
 * @param {string} method
 * @param {string} url
 * @param {Object} [body]
 * @param {{ timeoutMs?: number, keepalive?: boolean, auth?: boolean }} [options]
 * @returns {Promise<any>}
 */
const attempt = async (method, url, body, options = {}) => {
  const { timeoutMs = OGP_TIMING.api.timeoutMs, keepalive = false, auth = true } = options;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  /** @type {Record<string, string>} */
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth && authToken) headers.Authorization = `Bearer ${authToken}`;

  let response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
      credentials: 'omit',
      keepalive,
    });
  } catch (error) {
    clearTimeout(timer);
    if (error?.name === 'AbortError') {
      throw new ApiError(CLIENT_ERROR_CODES.TIMEOUT, 'The request took too long.');
    }
    throw new ApiError(CLIENT_ERROR_CODES.NETWORK, 'The network is unavailable.');
  }
  clearTimeout(timer);

  if (response.status === 204) return null;

  let payload = null;
  const text = await response.text().catch(() => '');
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      if (response.ok) throw new ApiError(CLIENT_ERROR_CODES.PARSE, 'Unreadable response.');
    }
  }

  if (!response.ok) {
    // Contract shape: { "error": { "code": "SNAKE_CASE", "message": "human readable" } }
    const envelope = payload?.error ?? {};
    throw new ApiError(
      envelope.code || `HTTP_${response.status}`,
      envelope.message || 'The request could not be completed.',
      response.status,
    );
  }

  return payload;
};

/**
 * Perform a request, retrying once on a *network* failure and only for idempotent GETs.
 *
 * @param {string} method
 * @param {string} path
 * @param {{ query?: Object, body?: Object, timeoutMs?: number, keepalive?: boolean, auth?: boolean }} [options]
 * @returns {Promise<any>}
 */
const request = async (method, path, options = {}) => {
  // A session-scoped call with no session is not an error worth making. Firing it anyway
  // produces a guaranteed 400 from the header schema, once per throttled progress write, and
  // the reader sees nothing while the log fills with rejections that describe a client bug
  // rather than a server one. Reading continues from local storage regardless (§3.8.3), so
  // this resolves quietly instead.
  if (options.auth !== false && !authToken && path.startsWith('/sessions/current')) {
    return null;
  }

  const url = buildUrl(path, options.query);
  const idempotent = method === 'GET';
  const authed = options.auth !== false;

  try {
    return await attempt(method, url, options.body, options);
  } catch (error) {
    const transient =
      error instanceof ApiError &&
      (error.code === CLIENT_ERROR_CODES.NETWORK || error.code === CLIENT_ERROR_CODES.TIMEOUT);

    if (transient && idempotent) {
      await wait(OGP_TIMING.api.retryBackoffMs);
      return attempt(method, url, options.body, options);
    }

    // A rejected session is replaced and the call is made once more — including for writes,
    // which the transient retry above deliberately excludes.
    //
    // The two cases are not alike. A network retry re-sends a request that may already have
    // been received and acted on, so it is limited to reads. A 401 is proof the request was
    // understood and refused before reaching anything: nothing was created, so sending it
    // again with a valid session cannot duplicate anything.
    //
    // Once, and only once: the retry goes through `attempt` rather than `request`, so this
    // branch cannot be reached a second time for the same call. If a request carrying a
    // freshly minted session is still refused, the refusal is real and belongs to the caller.
    const rejected =
      error instanceof ApiError && error.status === 401 && error.code === SESSION_REJECTED;

    if (rejected && authed && recoverSession) {
      const token = await recoverSession();
      if (token) return attempt(method, url, options.body, options);
    }

    throw error;
  }
};

/**
 * The whole surface the frontend is permitted to touch. Nothing outside this object
 * may call `fetch` against the API — that is what keeps auth, timeouts, the error
 * envelope and the retry policy in one auditable place.
 */
export const api = {
  /* ---- §4.1 Sessions ---- */

  /**
   * @param {{ ageBand?: string, motionPreference?: string, entryVia?: string, shareToken?: string, invitationCode?: string }} [body]
   * @returns {Promise<{ sessionToken: string, session: Object }>}
   */
  createSession: (body = {}) => request('POST', '/sessions', { body, auth: false }),

  /** @returns {Promise<{ session: Object }>} */
  getSession: () => request('GET', '/sessions/current'),

  /**
   * @param {{ ageBand?: string, currentState?: string, immersionState?: string, paceMode?: string, currentUnitId?: string, motionPreference?: string, audioEnabled?: boolean }} body
   * @returns {Promise<{ session: Object }>}
   */
  patchSession: (body) => request('PATCH', '/sessions/current', { body }),

  /**
   * @param {{ completedUnitId?: string, savedPassageUnitId?: string, scrollFraction?: number, readingMsDelta?: number }} body
   * @param {{ keepalive?: boolean }} [options] `keepalive` for the visibilitychange write
   * @returns {Promise<{ progress: Object }>}
   */
  postProgress: (body, options = {}) =>
    request('POST', '/sessions/current/progress', { body, keepalive: options.keepalive === true }),

  /** Erasure and severance (§4.1). @returns {Promise<null>} */
  deleteSession: () => request('DELETE', '/sessions/current'),

  /* ---- §4.2 Manuscript ---- */

  /**
   * Unit list and checksums. No text — the manifest is metadata only.
   *
   * @param {string} [arc]
   * @returns {Promise<Object>}
   */
  getManifest: (arc = 'opening') => request('GET', '/manuscript/manifest', { query: { arc } }),

  /**
   * One immutable unit, rendered server-side from the SESSION's contentLayer.
   * Responses are `Cache-Control: immutable` — releases never mutate.
   *
   * @param {string} unitId
   * @returns {Promise<{ unit: Object }>}
   */
  getUnit: (unitId) => request('GET', `/manuscript/units/${encodeURIComponent(unitId)}`),

  /* ---- §4.3 Events / Sharing / Beta / Family ---- */

  /**
   * Fire-and-forget ingest. Failure never surfaces to the reader.
   *
   * @param {{ events: Array<{ name: string, occurredAt: string, payload: Object }> }} body
   * @param {{ keepalive?: boolean }} [options]
   * @returns {Promise<{ accepted: number }>}
   */
  postEvents: (body, options = {}) =>
    request('POST', '/events', {
      body,
      keepalive: options.keepalive === true,
      timeoutMs: OGP_TIMING.events.requestTimeoutMs,
    }),

  /**
   * The server gates every prompt. The client never decides that a reader is ready
   * to be offered a share (§3.7).
   *
   * @returns {Promise<{ eligible: boolean, prompt?: Object }>}
   */
  getSharingEligibility: () => request('GET', '/sharing/eligibility'),

  /**
   * @param {{ promptId?: string }} [body]
   * @returns {Promise<{ shareUrl?: string, token?: string, eligible?: boolean }>}
   */
  createShare: (body = {}) => request('POST', '/shares', { body }),

  /**
   * @param {string} token
   * @returns {Promise<null>}
   */
  revokeShare: (token) => request('POST', `/shares/${encodeURIComponent(token)}/revoke`),

  /**
   * Share-link arrival. The open count it increments is PRIVATE — there is no share
   * counter anywhere in the interface (prohibited mechanic).
   *
   * @param {string} token
   * @returns {Promise<{ valid: boolean, entry: string }>}
   */
  openShare: (token) =>
    request('GET', `/shares/${encodeURIComponent(token)}`, { auth: false }),

  /**
   * @param {string} code
   * @returns {Promise<{ cohort: { name: string }, edition: string }>}
   */
  redeemInvitation: (code) => request('POST', '/invitations/redeem', { body: { code } }),

  /**
   * The Beta Test Questionnaire, as the server holds it.
   *
   * Everything a reviewer reads comes back from here — title, purpose, instruction, scale
   * legend, sections and every prompt. The client authors none of it: the questions are the
   * instrument under test, so a rewording has to be a change to the record rather than a
   * deploy (§9.2.8). `{ questionnaire: null }` means none is active.
   *
   * @returns {Promise<{ questionnaire: Object|null }>}
   */
  getActiveQuestionnaire: () => request('GET', '/questionnaires/active'),

  /**
   * `POST /questionnaire-responses`.
   *
   * One entry per question the reviewer answered, in three flat parts: `text` for prose,
   * `rating` for a 1–5 answer, `values` for chosen options. A question left blank is simply
   * absent — there is no empty answer to send.
   *
   * There is no reviewer block and no consent flag in this body, on purpose. The instrument
   * asks for a reviewer code, a date, a reading format, a reading time and permission to
   * quote as ordinary questions, so they travel as ordinary answers and the server lifts
   * them out by the `role` each question declares. A client that could send `quoteConsent`
   * on its own would be a client that could grant a permission nobody gave.
   *
   * @param {{
   *   questionnaireId: string,
   *   answers: Array<{ questionId: string, text?: string, rating?: number, values?: string[] }>,
   *   readingFormat?: string,
   * }} body
   * @returns {Promise<{ received: boolean }>}
   */
  submitQuestionnaire: (body) => request('POST', '/questionnaire-responses', { body }),

  /**
   * Free-form reader feedback — `POST /feedback`.
   *
   * `body` is the only required field: feedback is not a transaction and a reader owes the
   * platform no identity. `email` is meaningful only alongside `contactConsent`, and the
   * server discards an address that arrives without it — this client does not send one.
   *
   * `passages` are the anchors of the marks the reader made while reading, in the shape the
   * server's closed schema accepts: `{ unitId, excerpt?, charStart?, charEnd? }` and nothing
   * else. `componentIndex` is deliberately absent — the server resolves it from the unit, so
   * a client cannot file a comment against a component the passage does not belong to.
   *
   * There is no age, birthdate, gender or location field here and none may be added: §14.4.3
   * forbids the profiling and the schema refuses the key outright (§9.2).
   *
   * @param {{
   *   body: string,
   *   category?: string,
   *   displayName?: string,
   *   email?: string,
   *   contactConsent?: boolean,
   *   passages?: Array<{ unitId: string, excerpt?: string, charStart?: number, charEnd?: number }>,
   * }} body
   * @returns {Promise<{ received: boolean, feedback: Object }>}
   */
  submitFeedback: (body) => request('POST', '/feedback', { body }),

  /**
   * What this session has already sent, so a reader can see they were heard. Read-only:
   * feedback is research material once received, and erasing the session severs it.
   *
   * @returns {Promise<{ feedback: Object[] }>}
   */
  getOwnFeedback: () => request('GET', '/feedback/mine'),

  /**
   * The family pathway. Gate-checked server-side; the client cannot bypass the threshold.
   *
   * @param {{ email: string, displayName?: string, communicationPreference: string }} body
   * @returns {Promise<{ welcomed: boolean }>}
   */
  becomeFamily: (body) => request('POST', '/family', { body }),

  /**
   * Withdrawal is public and unauthenticated: leaving must never be harder than arriving.
   *
   * @param {string} email
   * @returns {Promise<Object>}
   */
  withdrawFamily: (email) => request('POST', '/family/withdraw', { body: { email }, auth: false }),

  /* ---- §4.4 Commerce ---- */

  /** @returns {Promise<{ products: Object[] }>} */
  getProducts: () => request('GET', '/commerce/products', { auth: false }),

  /**
   * @param {{ kind: string, amountCents: number, currency: string, paymentToken: string, email?: string, anonymous?: boolean, idempotencyKey: string }} body
   * @returns {Promise<Object>}
   */
  createDonation: (body) => request('POST', '/commerce/donations', { body }),

  /**
   * Founder switch: only available while `freeAccessEnabled`.
   *
   * @param {string} email
   * @returns {Promise<{ digitalAccess: Object }>}
   */
  createFreeAccess: (email) => request('POST', '/commerce/donations/free-access', { body: { email } }),

  /**
   * @param {{ productSku: string, quantity: number, email: string, shippingAddress: Object, paymentToken: string, idempotencyKey: string }} body
   * @returns {Promise<Object>}
   */
  createOrder: (body) => request('POST', '/commerce/orders', { body }),

  /**
   * @param {{ productSku: string, quantity: number, email: string }} body
   * @returns {Promise<{ reservationId: string, status: string }>}
   */
  createReservation: (body) => request('POST', '/commerce/reservations', { body }),
};

export default api;
