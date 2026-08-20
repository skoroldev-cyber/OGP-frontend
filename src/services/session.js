import { ApiError, api, setAuthToken, setSessionRecovery } from '@/services/api';
import {
  AREAS,
  STORAGE_KEYS,
  clearAllOgpStorage,
  mergeNamespaced,
  readNamespaced,
} from '@/services/storage';

let pending = null;

const SESSION_REJECTED = 'SESSION_REQUIRED';

const wasRejected = (error) =>
  error instanceof ApiError && error.status === 401 && error.code === SESSION_REJECTED;

const readSlice = () => readNamespaced(AREAS.SESSION, STORAGE_KEYS.SESSION, 'session');

const writeSlice = (patch) =>
  mergeNamespaced(AREAS.SESSION, STORAGE_KEYS.SESSION, 'session', patch);

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

const SESSION_ENTRY_VIA = Object.freeze({
  direct: 'direct',
  share_token: 'share_token',
  invitation: 'invitation',
  founding_reader: 'invitation',
  skip_cinematic: 'direct',
  pathways: 'direct',
});

const toSessionEntryVia = (value) =>
  typeof value === 'string' ? (SESSION_ENTRY_VIA[value] ?? null) : null;

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

const stripInvitationCode = () => {
  if (typeof window === 'undefined' || !window.history?.replaceState) return;
  try {
    const url = new URL(window.location.href);
    if (!url.searchParams.has('fr')) return;
    url.searchParams.delete('fr');
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
  } catch {
    void 0;
  }
};

export const getSessionToken = () => readSlice().sessionToken ?? null;

export const getSessionKey = () => readSlice().sessionKey ?? null;

export const isOfflineSession = () => readSlice().offline === true;

export const ensureSession = async (options = {}) => {
  const existing = readSlice();

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
    const sessionKey = existing.sessionKey || randomKey();

    const body = {};
    if (options.ageBand) body.ageBand = options.ageBand;
    if (options.motionPreference) body.motionPreference = options.motionPreference;
    if (options.shareToken) body.shareToken = options.shareToken;

    const invitationCode = readInvitationCode() ?? options.invitationCode;
    if (invitationCode) body.invitationCode = invitationCode;

    const entryVia = invitationCode ? 'invitation' : toSessionEntryVia(options.entryVia);
    if (entryVia) body.entryVia = entryVia;

    try {
      const result = await api.createSession(body);
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
      setAuthToken(null);
      writeSlice({ sessionKey, sessionToken: null, offline: true, createdAt: new Date().toISOString() });
      return { token: null, sessionKey, offline: true, session: null };
    } finally {
      pending = null;
    }
  })();

  return pending;
};

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
    if (wasRejected(error)) {
      const fresh = await recoverSession();
      return { token: fresh, session: readSlice().session ?? null, offline: fresh === null };
    }
    writeSlice({ offline: true });
    return { token: slice.sessionToken, session: slice.session ?? null, offline: true };
  }
};

export const recoverSession = async () => {
  setAuthToken(null);
  writeSlice({ sessionToken: null, session: null });
  const result = await ensureSession();
  return result.token;
};

setSessionRecovery(recoverSession);

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

export const clearSession = async ({ server = true } = {}) => {
  if (server && getSessionToken()) {
    try {
      await api.deleteSession();
    } catch {
      void 0;
    }
  }
  setAuthToken(null);
  clearAllOgpStorage();
};
