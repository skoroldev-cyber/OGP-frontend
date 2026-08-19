/**
 * The anonymous session.
 *
 * No account is required to read (BUILD_CONTRACT §0.7). The "session" is a random key and
 * a bearer token — no profile, no fingerprint, no identifier derived from the device.
 *
 * The API being unreachable is a supported mode, not an error state: the reader continues
 * in a device-local session, reading progress keeps saving to `ogp_reading_session`, and
 * events queue for idempotent replay (§3.3 fallback, §3.8.3). Nothing about that is ever
 * shown to the reader.
 */

import { ApiError, api, setAuthToken, setSessionRecovery } from '@/services/api';
import {
  AREAS,
  STORAGE_KEYS,
  clearAllOgpStorage,
  mergeNamespaced,
  readNamespaced,
} from '@/services/storage';

/** In-flight guard so React StrictMode's double-invocation cannot create two sessions. */
let pending = null;

/**
 * The server's answer when a session is missing, unknown or expired (`plugins/sessionAuth.js`
 * answers all three identically on purpose, so that an opaque token cannot be probed).
 */
const SESSION_REJECTED = 'SESSION_REQUIRED';

/**
 * Did the server refuse this token, or did we simply fail to reach the server?
 *
 * These need opposite handling and look the same from a `catch`. A refusal is a verdict: the
 * session is gone and keeping the token only guarantees the next call fails too. An unreachable
 * API is a verdict about nothing — the session is probably fine, and discarding a good token
 * would strand a reader whose network dipped for a moment, losing the progress and marks tied
 * to it.
 *
 * @param {unknown} error
 * @returns {boolean} true only when the server itself rejected the session.
 */
const wasRejected = (error) =>
  error instanceof ApiError && error.status === 401 && error.code === SESSION_REJECTED;

/** @returns {Object} the persisted session slice */
const readSlice = () => readNamespaced(AREAS.SESSION, STORAGE_KEYS.SESSION, 'session');

/**
 * @param {Object} patch
 * @returns {Object}
 */
const writeSlice = (patch) =>
  mergeNamespaced(AREAS.SESSION, STORAGE_KEYS.SESSION, 'session', patch);

/**
 * A random, non-derived key. `crypto.randomUUID` where available; otherwise random bytes.
 * Never a hash of anything about the reader or their device (§2.4.1: no fingerprinting).
 *
 * @returns {string}
 */
const randomKey = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  }
  return `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};

/**
 * How a route's entry label maps onto the session document's `entryVia`.
 *
 * These are two vocabularies that were being treated as one. The session field is closed to
 * three values — `direct | share_token | invitation` (master §9.2, BUILD_CONTRACT §4.1) — and
 * the server's schema enforces it. What `routes.jsx` produces is richer, because it also
 * feeds the machine context and the `entryType` of the opening event, where `skip_cinematic`
 * is exactly the provenance the master doc asks to be recorded (§2042, §2055).
 *
 * Posting the richer label into the narrower field failed the whole request. `POST /sessions`
 * answered 400 for every arrival at `/reading-room`, `/openingarc` and `/pathways` — three of
 * the four entry routes, and `/openingarc` is the Founding Reader page. `ensureSession` catches
 * that, so nothing was reported: the reader simply continued with `offline: true` and **no
 * token at all**, which reading survives (the manuscript is anonymous-first) and every
 * session-scoped write does not. A reader who arrived that way and later wrote a note was told
 * it could not be sent, and no retry could ever succeed, because there was no session to send
 * it under and creating one failed the same way every time.
 *
 * So the descriptive label stays where it is useful, and it is translated here, at the one
 * boundary where the closed vocabulary applies.
 */
const SESSION_ENTRY_VIA = Object.freeze({
  direct: 'direct',
  share_token: 'share_token',
  invitation: 'invitation',
  // A private reading link is an invitation, whichever page it lands on.
  founding_reader: 'invitation',
  // Skipping the opening, or arriving at the pathways, is still an ordinary direct arrival.
  // The distinction is carried by the event's `entryType`, which is where §2.10 puts it.
  skip_cinematic: 'direct',
  pathways: 'direct',
});

/**
 * @param {string|undefined|null} value A route entry label.
 * @returns {string|null} The value the session schema accepts, or null to send nothing.
 */
const toSessionEntryVia = (value) =>
  typeof value === 'string' ? (SESSION_ENTRY_VIA[value] ?? null) : null;

/**
 * The invitation code carried by a Founding Reader's private link, `?fr=<code>`.
 *
 * The server has always been able to claim one — `POST /sessions` accepts `invitationCode`
 * and `claimInvitation` binds the participant to the session — but nothing on this side ever
 * read it out of the address, so the claim never happened and every invited reader arrived
 * anonymous. The matching half of the fix is in `modules/admin/templates.js`, which now
 * writes the code into the link in the first place.
 *
 * The shape is checked here against the server's own pattern rather than posted blindly: a
 * code mangled by a mail client that wrapped the line should be ignored quietly, not sent to
 * be refused. §5.7 codes are single-use, so a wrong guess is not retried.
 *
 * @returns {string|null} the code, or null when there is none worth sending.
 */
const readInvitationCode = () => {
  if (typeof window === 'undefined') return null;
  try {
    const code = new URLSearchParams(window.location.search).get('fr');
    if (typeof code !== 'string') return null;
    const trimmed = code.trim();
    return /^[A-Za-z0-9][A-Za-z0-9_-]{3,63}$/.test(trimmed) ? trimmed : null;
  } catch {
    return null;
  }
};

/**
 * Take the code out of the address bar once it has been read.
 *
 * "The link is yours alone" (§5.7), and a personal single-use code sitting in the address bar
 * outlives the moment it was needed: it is in the screenshot of the reading room, in the URL
 * a reader copies to send the site to someone else, and in the browser history of a shared
 * machine. Replacing rather than pushing leaves the back button untouched.
 *
 * @returns {void}
 */
const stripInvitationCode = () => {
  if (typeof window === 'undefined' || !window.history?.replaceState) return;
  try {
    const url = new URL(window.location.href);
    if (!url.searchParams.has('fr')) return;
    url.searchParams.delete('fr');
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
  } catch {
    // An address we cannot rewrite is not worth failing a reader's arrival over.
  }
};

/**
 * The current bearer token, or null when running device-local.
 *
 * @returns {string|null}
 */
export const getSessionToken = () => readSlice().sessionToken ?? null;

/**
 * The session key used to stamp queued events while the API is unreachable.
 *
 * @returns {string|null}
 */
export const getSessionKey = () => readSlice().sessionKey ?? null;

/** @returns {boolean} true when this page-load never reached the API */
export const isOfflineSession = () => readSlice().offline === true;

/**
 * Establish a session, or reuse the one this tab already has.
 *
 * @param {{ ageBand?: string, motionPreference?: string, entryVia?: string, shareToken?: string, invitationCode?: string }} [options]
 * @returns {Promise<{ token: string|null, sessionKey: string, offline: boolean, session: Object|null }>}
 */
export const ensureSession = async (options = {}) => {
  const existing = readSlice();

  // An unspent code in the address outranks the session already in hand. A Founding Reader
  // who opens their private link is asking to be recognised as that participant, and reusing
  // whatever anonymous session the tab happened to hold would silently refuse them — the
  // invitation would stay unclaimed and their cohort would never show them as having read.
  //
  // This cannot loop: the code is removed from the address as soon as it is spent, so the
  // next call sees none and takes the ordinary path. The reader's `sessionKey`, and with it
  // their device-local place in the text, is carried across by the mint below.
  const arriving = readInvitationCode() !== null;

  if (existing.sessionToken && !arriving) {
    setAuthToken(existing.sessionToken);
    return {
      token: existing.sessionToken,
      sessionKey: existing.sessionKey,
      offline: false,
      session: existing.session ?? null,
    };
  }
  if (pending) return pending;

  pending = (async () => {
    // The local key exists before the network call so a failure changes nothing about
    // how the reader's device behaves — it only changes where progress is mirrored.
    const sessionKey = existing.sessionKey || randomKey();

    /** Only non-personal fields are sent. Age band is included ONLY when the reader chose one. */
    const body = {};
    if (options.ageBand) body.ageBand = options.ageBand;
    if (options.motionPreference) body.motionPreference = options.motionPreference;
    if (options.shareToken) body.shareToken = options.shareToken;

    // A code in the address takes precedence over one passed in, because it is the one the
    // reader actually followed. Arriving on a private link is an invitation whatever route it
    // lands on (§5.7), so the provenance follows the code rather than the page.
    const invitationCode = readInvitationCode() ?? options.invitationCode;
    if (invitationCode) body.invitationCode = invitationCode;

    const entryVia = invitationCode ? 'invitation' : toSessionEntryVia(options.entryVia);
    if (entryVia) body.entryVia = entryVia;

    try {
      const result = await api.createSession(body);
      // Only once the code has been spent — a failed arrival keeps the link usable, so a
      // reader whose connection dropped can simply open it again.
      if (invitationCode) stripInvitationCode();
      setAuthToken(result?.sessionToken ?? null);
      writeSlice({
        sessionKey,
        sessionToken: result?.sessionToken ?? null,
        session: result?.session ?? null,
        offline: false,
        createdAt: new Date().toISOString(),
      });
      return {
        token: result?.sessionToken ?? null,
        sessionKey,
        offline: false,
        session: result?.session ?? null,
      };
    } catch {
      // Unreachable API: run device-local. Reading is unaffected; events queue and replay.
      setAuthToken(null);
      writeSlice({ sessionKey, sessionToken: null, offline: true, createdAt: new Date().toISOString() });
      return { token: null, sessionKey, offline: true, session: null };
    } finally {
      pending = null;
    }
  })();

  return pending;
};

/**
 * Re-attach to an existing session after a reload and confirm the server still knows it.
 * A rejected token silently downgrades to device-local rather than interrupting a reader.
 *
 * @returns {Promise<{ token: string|null, session: Object|null, offline: boolean }>}
 */
export const resumeSession = async () => {
  const slice = readSlice();
  if (!slice.sessionToken) {
    return { token: null, session: null, offline: slice.offline === true };
  }
  setAuthToken(slice.sessionToken);
  try {
    const result = await api.getSession();
    writeSlice({ session: result?.session ?? null, offline: false });
    return { token: slice.sessionToken, session: result?.session ?? null, offline: false };
  } catch (error) {
    // A token the server has rejected is replaced here rather than kept.
    //
    // It used to be kept — the failure was caught, `offline: true` was written, and the dead
    // token stayed installed for the rest of the visit. Reading did not care, because the
    // manuscript routes are anonymous-first and simply served the text. Everything
    // session-scoped did: progress writes, the arc-completion note, the reader's own list.
    // They all answered 401 forever, and no amount of retrying could clear it, because a
    // retry re-sends the same dead token. A reader who wrote a note after finishing the
    // Opening Arc was told it could not be sent just now, and "just now" never ended.
    //
    // So a refusal mints a replacement, and only an unreachable API downgrades to local.
    if (wasRejected(error)) {
      const fresh = await recoverSession();
      return { token: fresh, session: readSlice().session ?? null, offline: fresh === null };
    }
    writeSlice({ offline: true });
    return { token: slice.sessionToken, session: slice.session ?? null, offline: true };
  }
};

/**
 * Replace a session the server has rejected, keeping everything that is not the session.
 *
 * `sessionKey` is deliberately preserved by `ensureSession`, so the reader's device-local
 * reading record stays attached to the same key and their place in the text is undisturbed.
 * What is replaced is only the credential.
 *
 * Registered below as the API layer's recovery hook, which is what lets a single refused
 * write succeed on its own retry instead of surfacing to the reader as a failure they cannot
 * do anything about.
 *
 * @returns {Promise<string|null>} the new token, or null if the API could not be reached.
 */
export const recoverSession = async () => {
  setAuthToken(null);
  writeSlice({ sessionToken: null, session: null });
  const result = await ensureSession();
  return result.token;
};

// Wired here, not imported there: `api.js` must not depend on storage or on this module.
setSessionRecovery(recoverSession);

/**
 * Mirror machine/reading state to the session document. Best-effort by design: a failed
 * PATCH must never block a transition, so this resolves rather than rejects.
 *
 * @param {Object} patch
 * @returns {Promise<boolean>} whether the server accepted the patch
 */
export const patchSessionQuietly = async (patch) => {
  if (!getSessionToken()) return false;
  try {
    const result = await api.patchSession(patch);
    if (result?.session) writeSlice({ session: result.session });
    return true;
  } catch {
    return false;
  }
};

/**
 * Erasure and severance (§4.1 `DELETE /sessions/current`) plus every local trace.
 * Backs "Begin again from the start" and the settings control that clears the saved place.
 *
 * @param {{ server?: boolean }} [options]
 * @returns {Promise<void>}
 */
export const clearSession = async ({ server = true } = {}) => {
  if (server && getSessionToken()) {
    try {
      await api.deleteSession();
    } catch {
      // The local erasure below is the part the reader asked for; it always happens.
    }
  }
  setAuthToken(null);
  clearAllOgpStorage();
};
