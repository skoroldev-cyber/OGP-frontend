const raw = import.meta.env ?? {};

const asBool = (value, fallback = false) => {
  if (value === undefined || value === '') return fallback;
  return String(value).toLowerCase() === 'true';
};

const asBase = (value) => (value ? String(value).replace(/\/+$/, '') : '');

export const ENV = Object.freeze({
  apiBaseUrl: asBase(raw.VITE_API_BASE_URL),
  env: raw.VITE_ENV || 'development',
  eventsEnabled: asBool(raw.VITE_EVENTS_ENABLED, false),
  assetBase: asBase(raw.VITE_ASSET_BASE),
  commitSha: raw.VITE_COMMIT_SHA || '',
  nmiCollectJsKey: raw.VITE_NMI_COLLECT_JS_KEY || '',
  isProduction: raw.PROD === true || (raw.VITE_ENV || 'development') === 'production',
  isDevelopment: raw.PROD !== true && (raw.VITE_ENV || 'development') === 'development',
});

export const FLAGS = Object.freeze({
  ageLayerEnabled: asBool(raw.VITE_AGE_LAYER_ENABLED, false),
  betaMode: asBool(raw.VITE_BETA_MODE, false),
});

const nonEmpty = (value, fallback) => {
  const text = typeof value === 'string' ? value.trim() : '';
  return text === '' ? fallback : text;
};

export const ENTRANCE_MODE = (() => {
  const value = String(raw.VITE_ENTRANCE_MODE ?? 'spline').trim().toLowerCase();
  return value === 'weave' ? 'weave' : 'spline';
})();

export const SPLINE_SCENES = Object.freeze({
  entrance: nonEmpty(raw.VITE_SPLINE_ENTRANCE_SCENE, '/scene/entrance.splinecode'),
  invitation: nonEmpty(raw.VITE_SPLINE_INVITATION_SCENE, '/scene/invitation.splinecode'),
});

export const assetUrl = (path) => {
  if (!path) return path;
  if (/^(https?:)?\/\//.test(path)) return path;
  return `${ENV.assetBase}${path.startsWith('/') ? path : `/${path}`}`;
};

export default ENV;
