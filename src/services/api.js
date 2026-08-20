import { ENV } from '@/config/env';
import { OGP_TIMING } from '@/config/ogpTheme';

export class ApiError extends Error {
  constructor(code, message, status = 0) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

export const CLIENT_ERROR_CODES = Object.freeze({
  NETWORK: 'CLIENT_NETWORK',
  TIMEOUT: 'CLIENT_TIMEOUT',
  PARSE: 'CLIENT_PARSE',
});

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

export const FEEDBACK_LIMITS = Object.freeze({
  bodyMaxLength: 4000,
  excerptMaxLength: 500,
  maxPassages: 20,
});

export const RATING_VALUES = Object.freeze([1, 2, 3, 4, 5]);

let authToken = null;

export const setAuthToken = (token) => {
  authToken = token || null;
};

export const getAuthToken = () => authToken;

let recoverSession = null;

export const setSessionRecovery = (recover) => {
  recoverSession = typeof recover === 'function' ? recover : null;
};

const SESSION_REJECTED = 'SESSION_REQUIRED';

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

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const attempt = async (method, url, body, options = {}) => {
  const { timeoutMs = OGP_TIMING.api.timeoutMs, keepalive = false, auth = true } = options;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

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
    const envelope = payload?.error ?? {};
    throw new ApiError(
      envelope.code || `HTTP_${response.status}`,
      envelope.message || 'The request could not be completed.',
      response.status,
    );
  }

  return payload;
};

const request = async (method, path, options = {}) => {
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

    const rejected =
      error instanceof ApiError && error.status === 401 && error.code === SESSION_REJECTED;

    if (rejected && authed && recoverSession) {
      const token = await recoverSession();
      if (token) return attempt(method, url, options.body, options);
    }

    throw error;
  }
};

export const api = {

  createSession: (body = {}) => request('POST', '/sessions', { body, auth: false }),

  getSession: () => request('GET', '/sessions/current'),

  patchSession: (body) => request('PATCH', '/sessions/current', { body }),

  postProgress: (body, options = {}) =>
    request('POST', '/sessions/current/progress', { body, keepalive: options.keepalive === true }),

  deleteSession: () => request('DELETE', '/sessions/current'),

  getManifest: (arc = 'opening') => request('GET', '/manuscript/manifest', { query: { arc } }),

  getUnit: (unitId) => request('GET', `/manuscript/units/${encodeURIComponent(unitId)}`),

  postEvents: (body, options = {}) =>
    request('POST', '/events', {
      body,
      keepalive: options.keepalive === true,
      timeoutMs: OGP_TIMING.events.requestTimeoutMs,
    }),

  getSharingEligibility: () => request('GET', '/sharing/eligibility'),

  createShare: (body = {}) => request('POST', '/shares', { body }),

  revokeShare: (token) => request('POST', `/shares/${encodeURIComponent(token)}/revoke`),

  openShare: (token) =>
    request('GET', `/shares/${encodeURIComponent(token)}`, { auth: false }),

  redeemInvitation: (code) => request('POST', '/invitations/redeem', { body: { code } }),

  getActiveQuestionnaire: () => request('GET', '/questionnaires/active'),

  submitQuestionnaire: (body) => request('POST', '/questionnaire-responses', { body }),

  submitFeedback: (body) => request('POST', '/feedback', { body }),

  getOwnFeedback: () => request('GET', '/feedback/mine'),

  becomeFamily: (body) => request('POST', '/family', { body }),

  withdrawFamily: (email) => request('POST', '/family/withdraw', { body: { email }, auth: false }),

  getProducts: () => request('GET', '/commerce/products', { auth: false }),

  createDonation: (body) => request('POST', '/commerce/donations', { body }),

  createFreeAccess: (email) => request('POST', '/commerce/donations/free-access', { body: { email } }),

  createOrder: (body) => request('POST', '/commerce/orders', { body }),

  createReservation: (body) => request('POST', '/commerce/reservations', { body }),
};

export default api;
