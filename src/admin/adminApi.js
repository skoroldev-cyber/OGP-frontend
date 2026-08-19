/**
 * HTTP client for `/api/v1/admin/**` (BUILD_CONTRACT §4.5, master §10.10.3).
 *
 * Deliberately NOT `services/api.js`. That module is the reader's client and carries the
 * reader's law: quiet degradation, one silent retry, never a status code on screen. An
 * operator needs the opposite — the server's own code and message, every time, so a refused
 * send or a refused piece of copy can be acted on. Two audiences, two clients.
 *
 * Three rules govern the token, and they are the reason this file exists at all:
 *
 * 1. **No admin token is ever written to browser storage.** Not `localStorage`, not
 *    `sessionStorage`, not a cookie this script can read. Both the access token and the
 *    refresh token live in module scope for the lifetime of the tab, which is why a reload
 *    signs the operator out — `COPY.ADMIN.AUTH.SESSION_NOTE` says so rather than leaving it
 *    to be discovered. §10.8.2 asks for strong session controls on a surface that sees named
 *    humans and money; a token sitting in `localStorage` is readable by any script that ever
 *    reaches this origin, and this panel is not worth that exposure.
 * 2. **A 401 buys exactly one refresh.** The refresh is shared between concurrent callers, so
 *    a screen that fires four requests at once produces one refresh rather than four — four
 *    would race, and three would present a rotated token that no longer matches the stored
 *    hash.
 * 3. **A failed refresh ends the session.** No second attempt, no retry loop: the tokens are
 *    cleared and the surface returns to the sign-in form.
 */

import { ENV } from '@/config/env';
import { OGP_TIMING } from '@/config/ogpTheme';

/** Typed failure carrying the server's own SNAKE_CASE code (§4 error envelope). */
export class AdminApiError extends Error {
  /**
   * @param {string} code The server's code, or a client-side stand-in.
   * @param {string} message Human-readable, safe to display to an operator.
   * @param {number} [status] The HTTP status, or 0 for a client-side failure.
   */
  constructor(code, message, status = 0) {
    super(message);
    this.name = 'AdminApiError';
    this.code = code;
    this.status = status;
  }
}

/** Client-side codes, distinguishable from anything the server can send. */
export const ADMIN_ERROR_CODES = Object.freeze({
  NETWORK: 'CLIENT_NETWORK',
  TIMEOUT: 'CLIENT_TIMEOUT',
  PARSE: 'CLIENT_PARSE',
  SESSION_ENDED: 'CLIENT_SESSION_ENDED',
});

/** Access token. Module scope, never storage. */
let accessToken = null;
/** Refresh token. Same rule — it is an admin credential too. */
let refreshToken = null;
/** The in-flight refresh, shared by every caller that hit a 401 at once. */
let refreshInFlight = null;
/** Called when the session cannot be recovered, so the surface can return to sign-in. */
let sessionLostHandler = null;

/**
 * Adopt the tokens minted by `login` or `refresh`.
 *
 * @param {{ accessToken: string, refreshToken: string }|null} session The minted pair.
 * @returns {void}
 */
export const setAdminSession = (session) => {
  accessToken = session?.accessToken ?? null;
  refreshToken = session?.refreshToken ?? null;
};

/**
 * Forget both tokens.
 *
 * @returns {void}
 */
export const clearAdminSession = () => {
  accessToken = null;
  refreshToken = null;
  refreshInFlight = null;
};

/**
 * Register the callback that runs when a session cannot be recovered.
 *
 * @param {(() => void)|null} handler The callback.
 * @returns {void}
 */
export const setSessionLostHandler = (handler) => {
  sessionLostHandler = typeof handler === 'function' ? handler : null;
};

/** @returns {boolean} Whether a token is held right now. */
export const hasAdminSession = () => accessToken !== null;

/**
 * @param {string} path An `/admin/...` path.
 * @param {Record<string, string|number|boolean|undefined|null>} [query] Query parameters.
 * @returns {string} The absolute URL.
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
 * One HTTP attempt against the admin namespace.
 *
 * @param {string} method The HTTP method.
 * @param {string} url The absolute URL.
 * @param {object} [body] JSON body, or undefined.
 * @param {{ accept?: string, auth?: boolean, timeoutMs?: number }} [options] Per-call options.
 * @returns {Promise<Response>} The raw response, for the caller to decode.
 */
const attempt = async (method, url, body, options = {}) => {
  const { accept = 'application/json', auth = true, timeoutMs = OGP_TIMING.api.timeoutMs } =
    options;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  /** @type {Record<string, string>} */
  const headers = { Accept: accept };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth && accessToken) headers.Authorization = `Bearer ${accessToken}`;

  try {
    return await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
      // The admin API is bearer-authenticated and CORS-locked. Sending credentials would
      // widen the CORS contract for no gain.
      credentials: 'omit',
    });
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new AdminApiError(ADMIN_ERROR_CODES.TIMEOUT, 'The request took too long.');
    }
    throw new AdminApiError(ADMIN_ERROR_CODES.NETWORK, 'The network is unavailable.');
  } finally {
    clearTimeout(timer);
  }
};

/**
 * Turn a non-2xx response into a typed failure carrying the server's envelope.
 *
 * @param {Response} response The response.
 * @returns {Promise<AdminApiError>} The failure to throw.
 */
const failureFrom = async (response) => {
  let envelope = null;
  const text = await response.text().catch(() => '');
  if (text) {
    try {
      envelope = JSON.parse(text)?.error ?? null;
    } catch {
      envelope = null;
    }
  }
  return new AdminApiError(
    envelope?.code || `HTTP_${response.status}`,
    envelope?.message || 'The request could not be completed.',
    response.status,
  );
};

/**
 * Exchange the refresh token for a new pair. At most one runs at a time.
 *
 * @returns {Promise<boolean>} Whether the session was recovered.
 */
const refreshOnce = async () => {
  if (!refreshToken) return false;
  if (!refreshInFlight) {
    const presented = refreshToken;
    refreshInFlight = (async () => {
      const response = await attempt(
        'POST',
        buildUrl('/admin/auth/refresh'),
        { refreshToken: presented },
        { auth: false },
      ).catch(() => null);
      if (!response || !response.ok) return false;
      const payload = await response.json().catch(() => null);
      if (!payload?.accessToken || !payload?.refreshToken) return false;
      setAdminSession(payload);
      return true;
    })().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
};

/**
 * Perform a request, refreshing once on a 401 and ending the session if that fails.
 *
 * @param {string} method The HTTP method.
 * @param {string} path An `/admin/...` path.
 * @param {{ query?: object, body?: object, auth?: boolean, accept?: string,
 *           raw?: boolean }} [options] Per-call options. `raw` returns the Response.
 * @returns {Promise<any>} The decoded body, `null` for 204, or the Response when `raw`.
 */
const request = async (method, path, options = {}) => {
  const url = buildUrl(path, options.query);
  const auth = options.auth !== false;

  let response = await attempt(method, url, options.body, options);

  if (response.status === 401 && auth) {
    const recovered = await refreshOnce();
    if (!recovered) {
      clearAdminSession();
      sessionLostHandler?.();
      throw new AdminApiError(
        ADMIN_ERROR_CODES.SESSION_ENDED,
        'That session ended.',
        401,
      );
    }
    response = await attempt(method, url, options.body, options);
    // A second 401 is not a stale token; it is an account that no longer has the right.
    // The auth plugin re-reads the account on every request, so a deactivated administrator
    // lands here (§10.8 least privilege) and must not be handed another refresh.
    if (response.status === 401) {
      clearAdminSession();
      sessionLostHandler?.();
      throw new AdminApiError(ADMIN_ERROR_CODES.SESSION_ENDED, 'That session ended.', 401);
    }
  }

  if (!response.ok) throw await failureFrom(response);
  if (options.raw === true) return response;
  if (response.status === 204) return null;

  const text = await response.text().catch(() => '');
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    throw new AdminApiError(ADMIN_ERROR_CODES.PARSE, 'The response could not be read.');
  }
};

/**
 * The paging parameters the platform's list routes accept.
 *
 * `limit` and `offset` are declared as INTEGERS on the shared `listQuery` schema, and the
 * platform's Ajv runs with `coerceTypes: false` (Backend `src/app.js`) — a query string
 * carries no types, so `?limit=50` is rejected outright while an omitted parameter picks up
 * its schema default through `useDefaults`. So the first page is requested by asking for
 * nothing, which is also the only shape those routes accept today.
 *
 * @param {{ limit?: number, offset?: number }} paging The requested window.
 * @param {{ defaultLimit?: number }} [options] The server-side default for this route.
 * @returns {object} Query parameters to merge.
 */
const pagingParams = (paging, options = {}) => {
  const defaultLimit = options.defaultLimit ?? 50;
  const params = {};
  if (Number.isInteger(paging.limit) && paging.limit !== defaultLimit) params.limit = paging.limit;
  if (Number.isInteger(paging.offset) && paging.offset !== 0) params.offset = paging.offset;
  return params;
};

/** The server-side default page size of every `listQuery` route. */
export const ADMIN_PAGE_SIZE = 50;

/** The feedback queue pages by page number and accepts its size as digits. */
export const FEEDBACK_PAGE_SIZE = 25;

/** One returned instrument is a screenful, so the review list pages in short pages. */
export const RESPONSE_PAGE_SIZE = 25;

/**
 * The filters shared by the response list, its summary and its export.
 *
 * Declared once because the three routes must be given identical filters: a summary computed
 * over a different set than the table beneath it is worse than no summary, and an export that
 * quietly widens the filters is a data-handling incident.
 *
 * @param {object} query The screen's applied filters.
 * @returns {object} Query parameters to merge.
 */
const responseFilters = (query = {}) => ({
  cohortId: query.cohortId,
  questionnaireId: query.questionnaireId,
  readingFormat: query.readingFormat,
  quoteConsent: query.quoteConsent,
  q: query.q,
  from: query.from,
  to: query.to,
});

/**
 * The whole admin surface the panel is permitted to touch. Nothing outside this object may
 * call `fetch` against the admin API — that is what keeps the token, the refresh policy and
 * the error envelope in one auditable place.
 */
export const adminApi = {
  /* ---- Authentication (§10.8.2) ---- */

  /**
   * Email, password AND authenticator code in one request. There is no intermediate state
   * in which a password alone has bought anything.
   *
   * @param {{ email: string, password: string, totpCode: string }} body The credentials.
   * @returns {Promise<{ accessToken: string, expiresAt: string, refreshToken: string,
   *                     admin: object }>} The minted session.
   */
  login: (body) => request('POST', '/admin/auth/login', { body, auth: false }),

  /**
   * @returns {Promise<null>} Resolves when the refresh token is cleared server-side.
   */
  logout: () => request('POST', '/admin/auth/logout'),

  /* ---- Invitations (§10.7.2) ---- */

  /**
   * @param {{ cohortId?: string, status?: string, limit?: number, offset?: number }} [query]
   *        Filters and the requested window.
   * @returns {Promise<{ invitations: object[], total: number }>} The page.
   */
  listInvitations: (query = {}) =>
    request('GET', '/admin/invitations', {
      query: {
        cohortId: query.cohortId,
        status: query.status,
        ...pagingParams(query),
      },
    }),

  /**
   * One message per address, addressed individually. Partial failure is the normal case and
   * comes back per address rather than as a thrown error.
   *
   * @param {{ emails: string[], cohortId?: string, templateKey?: string,
   *           message?: string }} body The batch.
   * @returns {Promise<{ results: Array<{ email: string, status: string, reason: string|null }>,
   *                     sent: number, skipped: number, failed: number }>} The outcome.
   */
  sendInvitations: (body) =>
    request('POST', '/admin/invitations/send', { body, timeoutMs: 25_000 }),

  /**
   * @param {string} id The invitation identifier.
   * @param {{ templateKey?: string }} [body] The template to use.
   * @returns {Promise<{ invitation: object, delivered: boolean }>} The result.
   */
  resendInvitation: (id, body = {}) =>
    request('POST', `/admin/invitations/${encodeURIComponent(id)}/resend`, {
      body,
      timeoutMs: 25_000,
    }),

  /**
   * @param {string} id The invitation identifier.
   * @param {{ reason?: string }} [body] An optional reason for the audit trail.
   * @returns {Promise<{ invitation: object }>} The withdrawn invitation.
   */
  revokeInvitation: (id, body = {}) =>
    request('POST', `/admin/invitations/${encodeURIComponent(id)}/revoke`, { body }),

  /* ---- Message templates (§10.7.2) ---- */

  /** @returns {Promise<{ templates: object[] }>} The closed set, seeded if absent. */
  listTemplates: () => request('GET', '/admin/templates'),

  /**
   * @param {string} key A template key.
   * @param {{ subject: string, bodyText: string, bodyHtml: string|null }} body The copy.
   * @returns {Promise<{ template: object }>} The stored template.
   */
  saveTemplate: (key, body) =>
    request('PUT', `/admin/templates/${encodeURIComponent(key)}`, { body }),

  /**
   * Render without sending. The same copy lint runs, so a preview cannot be used to see
   * what refused copy would look like.
   *
   * @param {string} key A template key.
   * @param {{ subject?: string, bodyText?: string, bodyHtml?: string|null }} [body] Draft copy.
   * @returns {Promise<{ preview: { subject: string, text: string, html: string|null } }>}
   *          The rendered message.
   */
  previewTemplate: (key, body = {}) =>
    request('POST', `/admin/templates/${encodeURIComponent(key)}/preview`, { body }),

  /* ---- Cohorts (§10.7.2) ---- */

  /**
   * @param {{ status?: string, limit?: number, offset?: number }} [query] Filters.
   * @returns {Promise<{ cohorts: object[], total: number }>} The page.
   */
  listCohorts: (query = {}) =>
    request('GET', '/admin/cohorts', {
      query: { status: query.status, ...pagingParams(query) },
    }),

  /**
   * @param {string} id The cohort identifier.
   * @returns {Promise<{ cohortId: string, name: string, targetSize: number|null,
   *                     funnel: object }>} Counts only — no per-participant trail.
   */
  cohortSummary: (id) => request('GET', `/admin/cohorts/${encodeURIComponent(id)}/summary`),

  /* ---- Feedback (§3.13, §10.7.3) ---- */

  /**
   * The feedback queue pages by page number rather than by offset, and its numeric
   * parameters are declared as digit strings, so they are sent as written.
   *
   * @param {{ status?: string, category?: string, cohortId?: string, unitId?: string,
   *           q?: string, from?: string, to?: string, page?: number,
   *           limit?: number }} [query] Filters and the page.
   * @returns {Promise<{ feedback: object[], total: number, page: number }>} The page.
   */
  listFeedback: (query = {}) =>
    request('GET', '/admin/feedback', {
      query: {
        status: query.status,
        category: query.category,
        cohortId: query.cohortId,
        unitId: query.unitId,
        q: query.q,
        from: query.from,
        to: query.to,
        page: query.page && query.page > 1 ? String(query.page) : undefined,
        limit: String(query.limit ?? FEEDBACK_PAGE_SIZE),
      },
    }),

  /**
   * @param {object} [query] The same filters as the list, without paging.
   * @returns {Promise<{ total: number, byCategory: object[], byStatus: object[],
   *                     byUnit: object[] }>} Aggregate counts, never keyed by a person.
   */
  feedbackSummary: (query = {}) =>
    request('GET', '/admin/feedback/summary', {
      query: {
        status: query.status,
        category: query.category,
        cohortId: query.cohortId,
        unitId: query.unitId,
        q: query.q,
        from: query.from,
        to: query.to,
      },
    }),

  /**
   * @param {string} id The feedback identifier.
   * @returns {Promise<{ feedback: object }>} One record, without any session reference.
   */
  getFeedback: (id) => request('GET', `/admin/feedback/${encodeURIComponent(id)}`),

  /**
   * Triage only. What a reader wrote is not editable here, and the route does not accept it.
   *
   * @param {string} id The feedback identifier.
   * @param {{ status?: string, adminNotes?: string }} body The triage change.
   * @returns {Promise<{ feedback: object }>} The updated record.
   */
  updateFeedback: (id, body) =>
    request('PATCH', `/admin/feedback/${encodeURIComponent(id)}`, { body }),

  /**
   * The export as a file. Fetched rather than linked because the route is bearer
   * authenticated and a plain anchor cannot carry the header.
   *
   * @param {object} [query] The same filters as the list.
   * @returns {Promise<Blob>} The CSV.
   */
  exportFeedbackCsv: async (query = {}) => {
    const response = await request('GET', '/admin/feedback/export.csv', {
      accept: 'text/csv',
      raw: true,
      query: {
        status: query.status,
        category: query.category,
        cohortId: query.cohortId,
        unitId: query.unitId,
        q: query.q,
        from: query.from,
        to: query.to,
      },
    });
    return response.blob();
  },

  /* ---- Questionnaires (§10.7.3) ---- */

  /**
   * @param {{ status?: string, limit?: number, offset?: number }} [query] Filters.
   * @returns {Promise<{ questionnaires: object[], total: number }>} The page.
   */
  listQuestionnaires: (query = {}) =>
    request('GET', '/admin/questionnaires', {
      query: { status: query.status, ...pagingParams(query) },
    }),

  /**
   * @param {{ cohortId?: string, questionnaireId?: string, readingFormat?: string,
   *           quoteConsent?: string, q?: string, limit?: number,
   *           offset?: number }} [query] Filters.
   * @returns {Promise<{ responses: object[], total: number }>} The page.
   */
  listQuestionnaireResponses: (query = {}) =>
    request('GET', '/admin/questionnaire-responses', {
      query: { ...responseFilters(query), ...pagingParams(query) },
    }),

  /**
   * One response with the instrument it was answered against, so the screen can show each
   * question as the reviewer saw it rather than a column of bare identifiers.
   *
   * @param {string} id The response identifier.
   * @returns {Promise<{ response: object, questionnaire: object|null }>} The record.
   */
  getQuestionnaireResponse: (id) =>
    request('GET', `/admin/questionnaire-responses/${encodeURIComponent(id)}`),

  /**
   * @param {object} [query] The same filters as the list, without paging.
   * @returns {Promise<{ total: number, byReadingFormat: object[], quoteConsent: object,
   *                     byQuestion: object[] }>} Aggregates, never keyed by a person.
   */
  questionnaireResponseSummary: (query = {}) =>
    request('GET', '/admin/questionnaire-responses/summary', {
      query: responseFilters(query),
    }),

  /**
   * The export as a file. Fetched rather than linked because the route is bearer
   * authenticated and a plain anchor cannot carry the header.
   *
   * @param {object} [query] The same filters as the list.
   * @returns {Promise<Blob>} The CSV.
   */
  exportQuestionnaireResponsesCsv: async (query = {}) => {
    const response = await request('GET', '/admin/questionnaire-responses/export.csv', {
      accept: 'text/csv',
      raw: true,
      query: responseFilters(query),
    });
    return response.blob();
  },

  /* ---- Metrics (§10.4.1) ---- */

  /**
   * @param {{ from?: string, to?: string }} [query] The date range.
   * @returns {Promise<{ from: string|null, to: string|null, steps: object[] }>} The ladder.
   */
  funnel: (query = {}) =>
    request('GET', '/admin/metrics/funnel', { query: { from: query.from, to: query.to } }),

  /* ---- Audit (§10.9) ---- */

  /**
   * @param {{ target?: string, targetId?: string, action?: string, actorId?: string,
   *           from?: string, to?: string, limit?: number, offset?: number }} [query] Filters.
   * @returns {Promise<{ entries: object[], total: number }>} The page.
   */
  listAudit: (query = {}) =>
    request('GET', '/admin/audit', {
      query: {
        target: query.target,
        targetId: query.targetId,
        action: query.action,
        actorId: query.actorId,
        from: query.from,
        to: query.to,
        ...pagingParams(query),
      },
    }),
};

export default adminApi;
