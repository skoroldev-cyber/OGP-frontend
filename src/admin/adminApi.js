import { ENV } from '@/config/env';
import { OGP_TIMING } from '@/config/ogpTheme';

export class AdminApiError extends Error {
  constructor(code, message, status = 0) {
    super(message);
    this.name = 'AdminApiError';
    this.code = code;
    this.status = status;
  }
}

export const ADMIN_ERROR_CODES = Object.freeze({
  NETWORK: 'CLIENT_NETWORK',
  TIMEOUT: 'CLIENT_TIMEOUT',
  PARSE: 'CLIENT_PARSE',
  SESSION_ENDED: 'CLIENT_SESSION_ENDED',
});

let accessToken = null;
let refreshToken = null;
let refreshInFlight = null;
let sessionLostHandler = null;

export const setAdminSession = (session) => {
  accessToken = session?.accessToken ?? null;
  refreshToken = session?.refreshToken ?? null;
};

export const clearAdminSession = () => {
  accessToken = null;
  refreshToken = null;
  refreshInFlight = null;
};

export const setSessionLostHandler = (handler) => {
  sessionLostHandler = typeof handler === 'function' ? handler : null;
};

export const hasAdminSession = () => accessToken !== null;

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

const attempt = async (method, url, body, options = {}) => {
  const { accept = 'application/json', auth = true, timeoutMs = OGP_TIMING.api.timeoutMs } =
    options;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const headers = { Accept: accept };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth && accessToken) headers.Authorization = `Bearer ${accessToken}`;

  try {
    return await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
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

const pagingParams = (paging, options = {}) => {
  const defaultLimit = options.defaultLimit ?? 50;
  const params = {};
  if (Number.isInteger(paging.limit) && paging.limit !== defaultLimit) params.limit = paging.limit;
  if (Number.isInteger(paging.offset) && paging.offset !== 0) params.offset = paging.offset;
  return params;
};

export const ADMIN_PAGE_SIZE = 50;

export const FEEDBACK_PAGE_SIZE = 25;

export const RESPONSE_PAGE_SIZE = 25;

const responseFilters = (query = {}) => ({
  cohortId: query.cohortId,
  questionnaireId: query.questionnaireId,
  readingFormat: query.readingFormat,
  quoteConsent: query.quoteConsent,
  q: query.q,
  from: query.from,
  to: query.to,
});

export const adminApi = {

  login: (body) => request('POST', '/admin/auth/login', { body, auth: false }),

  logout: () => request('POST', '/admin/auth/logout'),

  listInvitations: (query = {}) =>
    request('GET', '/admin/invitations', {
      query: {
        cohortId: query.cohortId,
        status: query.status,
        ...pagingParams(query),
      },
    }),

  sendInvitations: (body) =>
    request('POST', '/admin/invitations/send', { body, timeoutMs: 25_000 }),

  resendInvitation: (id, body = {}) =>
    request('POST', `/admin/invitations/${encodeURIComponent(id)}/resend`, {
      body,
      timeoutMs: 25_000,
    }),

  revokeInvitation: (id, body = {}) =>
    request('POST', `/admin/invitations/${encodeURIComponent(id)}/revoke`, { body }),

  listTemplates: () => request('GET', '/admin/templates'),

  saveTemplate: (key, body) =>
    request('PUT', `/admin/templates/${encodeURIComponent(key)}`, { body }),

  previewTemplate: (key, body = {}) =>
    request('POST', `/admin/templates/${encodeURIComponent(key)}/preview`, { body }),

  listCohorts: (query = {}) =>
    request('GET', '/admin/cohorts', {
      query: { status: query.status, ...pagingParams(query) },
    }),

  cohortSummary: (id) => request('GET', `/admin/cohorts/${encodeURIComponent(id)}/summary`),

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

  getFeedback: (id) => request('GET', `/admin/feedback/${encodeURIComponent(id)}`),

  updateFeedback: (id, body) =>
    request('PATCH', `/admin/feedback/${encodeURIComponent(id)}`, { body }),

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

  listQuestionnaires: (query = {}) =>
    request('GET', '/admin/questionnaires', {
      query: { status: query.status, ...pagingParams(query) },
    }),

  listQuestionnaireResponses: (query = {}) =>
    request('GET', '/admin/questionnaire-responses', {
      query: { ...responseFilters(query), ...pagingParams(query) },
    }),

  getQuestionnaireResponse: (id) =>
    request('GET', `/admin/questionnaire-responses/${encodeURIComponent(id)}`),

  questionnaireResponseSummary: (query = {}) =>
    request('GET', '/admin/questionnaire-responses/summary', {
      query: responseFilters(query),
    }),

  exportQuestionnaireResponsesCsv: async (query = {}) => {
    const response = await request('GET', '/admin/questionnaire-responses/export.csv', {
      accept: 'text/csv',
      raw: true,
      query: responseFilters(query),
    });
    return response.blob();
  },

  funnel: (query = {}) =>
    request('GET', '/admin/metrics/funnel', { query: { from: query.from, to: query.to } }),

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
