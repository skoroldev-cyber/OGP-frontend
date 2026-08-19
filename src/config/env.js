/**
 * Build-time environment, read once and normalised.
 *
 * Vite inlines every `VITE_*` variable into the client bundle, so EVERYTHING here is
 * PUBLIC by definition (BUILD_CONTRACT §9: "No secret ever appears in a VITE_ var").
 * Gateway security keys, Mongo URIs and mail credentials are server-side only; the
 * frontend touches payments exclusively through §6's tokenized flows.
 *
 * There is no analytics key of any kind. The public build ships no third-party
 * analytics, pixels or trackers — no PostHog, no Google Analytics (BUILD_CONTRACT §0.8).
 */

/** @type {Record<string, string|undefined>} */
const raw = import.meta.env ?? {};

/**
 * Vite gives every var as a string. Only the literal "true" is true, so an unset or
 * malformed flag can never accidentally enable an uncertified experience layer.
 *
 * @param {string|undefined} value
 * @param {boolean} [fallback]
 * @returns {boolean}
 */
const asBool = (value, fallback = false) => {
  if (value === undefined || value === '') return fallback;
  return String(value).toLowerCase() === 'true';
};

/**
 * Trim a trailing slash so callers can always join with a leading-slash path.
 *
 * @param {string|undefined} value
 * @returns {string}
 */
const asBase = (value) => (value ? String(value).replace(/\/+$/, '') : '');

export const ENV = Object.freeze({
  /** API origin including the `/api/v1` prefix. Empty string = same-origin. */
  apiBaseUrl: asBase(raw.VITE_API_BASE_URL),
  /** development | staging | production. */
  env: raw.VITE_ENV || 'development',
  /**
   * First-party event pipeline. "false" in development by default (§7.13) so local work
   * never writes to the funnel. This gates OUR endpoint only — there is no other pipeline.
   */
  eventsEnabled: asBool(raw.VITE_EVENTS_ENABLED, false),
  /** Optional CDN prefix for /public assets. Empty = same-origin. */
  assetBase: asBase(raw.VITE_ASSET_BASE),
  /** Injected by CI for §10 build provenance in the admin dashboard. */
  commitSha: raw.VITE_COMMIT_SHA || '',
  /** NMI Collect.js PUBLIC tokenization key. Never the security key (§9). */
  nmiCollectJsKey: raw.VITE_NMI_COLLECT_JS_KEY || '',
  /**
   * Convenience predicates.
   *
   * `raw.PROD` is Vite's own build flag and is trusted first, deliberately. `VITE_ENV` is a
   * value someone has to remember to set, and forgetting it made a production bundle describe
   * itself as development — which is the wrong way round for a flag whose whole job is to
   * gate things that must not ship. A build produced by `vite build` is production whatever
   * the environment file says; `VITE_ENV` can only add to that, never subtract from it.
   */
  isProduction: raw.PROD === true || (raw.VITE_ENV || 'development') === 'production',
  isDevelopment: raw.PROD !== true && (raw.VITE_ENV || 'development') === 'development',
});

/**
 * Feature flags — launch defaults per BUILD_CONTRACT §10.
 * `FREE_ACCESS_ENABLED`, `HARDCOVER_PURCHASABLE` and `SHARING_ENABLED` are server-owned
 * founder switches; the client learns them from the API (products, sharing eligibility),
 * never from a bundled literal that could drift from the server's truth.
 */
export const FLAGS = Object.freeze({
  /**
   * Phase 1B age-calibration screen. Ships OFF: only `full_manuscript` is certified
   * today, so S9 goes straight to S10 with contentLayer = "full_manuscript" (§3.3).
   */
  ageLayerEnabled: asBool(raw.VITE_AGE_LAYER_ENABLED, false),
  /** Founding Reader build: shows "Continue to Observations" at S13 (§3.13). */
  betaMode: asBool(raw.VITE_BETA_MODE, false),
});

/**
 * Which threshold carries S1–S7.
 *
 *   `spline`  a single authored Spline scene, self-hosted at `/scene/entrance.splinecode`
 *   `weave`   the canonical R3F opening — darkness, speck, Living Weave, passage, Earth reveal
 *
 * Both exist on purpose. §1.3.1's No-Loss Rule forbids silently discarding a canonical engine,
 * and the Living Weave and the Earth reveal are canon (§2.5, §2.6, §8.6): they are specified in
 * detail, down to the locked reveal order and the prohibition on mechanical splitting. Choosing
 * a different threshold is a founder's decision to make, and this flag is what makes it a
 * decision rather than a deletion — flipping it back restores the canonical opening intact.
 *
 * @type {'spline'|'weave'}
 */
/**
 * A trimmed env string, or the fallback when it is absent or blank.
 *
 * @param {unknown} value The raw env value.
 * @param {string} fallback Used when `value` is nullish or whitespace.
 * @returns {string}
 */
const nonEmpty = (value, fallback) => {
  const text = typeof value === 'string' ? value.trim() : '';
  return text === '' ? fallback : text;
};

export const ENTRANCE_MODE = (() => {
  const value = String(raw.VITE_ENTRANCE_MODE ?? 'spline').trim().toLowerCase();
  return value === 'weave' ? 'weave' : 'spline';
})();

/**
 * The self-hosted Spline scenes.
 *
 * Two slots, because the threshold and the invitation are different moments: the threshold is
 * the arrival, and S8 is where the reader is addressed directly for the first time (§2.4.6,
 * "The first human truth"). They may be the same scene — `invitation` falls back to `entrance`
 * — but they need not be.
 *
 * Both are paths on our own origin, never `prod.spline.design`. A threshold that depends on a
 * third party's CDN is a threshold that a third party can take down (§7.13).
 */
export const SPLINE_SCENES = Object.freeze({
  // `??` alone is not enough: a declared-but-empty var (`VITE_SPLINE_INVITATION_SCENE=` in a
  // .env file) is the empty string, which is not nullish, and would resolve to a request for
  // the site root instead of the scene.
  entrance: nonEmpty(raw.VITE_SPLINE_ENTRANCE_SCENE, '/scene/entrance.splinecode'),
  invitation: nonEmpty(raw.VITE_SPLINE_INVITATION_SCENE, '/scene/invitation.splinecode'),
});

/**
 * Resolve a /public asset path against the optional CDN prefix.
 *
 * @param {string} path absolute path beginning with `/`
 * @returns {string}
 */
export const assetUrl = (path) => {
  if (!path) return path;
  if (/^(https?:)?\/\//.test(path)) return path;
  return `${ENV.assetBase}${path.startsWith('/') ? path : `/${path}`}`;
};

export default ENV;
