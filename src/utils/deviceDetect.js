/**
 * Capability detection.
 *
 * Detection here is about CAPABILITY, never about identity: nothing in this module is
 * combined, hashed or stored to distinguish one reader from another. "No fingerprinting"
 * is an explicit rule of the opening (§2.4.1), and `deviceId`/`fingerprint` are
 * CI-linted prohibited fields (BUILD_CONTRACT §5).
 */

/** Device tiers. Mirrored by `context/PerformanceContext.jsx`, which owns the settings. */
export const TIERS = Object.freeze({ HIGH: 'HIGH', MEDIUM: 'MEDIUM', LOW: 'LOW' });

/**
 * True on touch-only devices. Drives the "no hover" rules: the invitation's light response
 * becomes a gentle idle glow, and hover-only texture variants are never fetched (§2.11).
 *
 * @returns {boolean}
 */
export const isTouchDevice = () => {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(hover: none) and (pointer: coarse)').matches;
};

/**
 * True when the device can hover — the inverse test the asset filter needs.
 *
 * @returns {boolean}
 */
export const supportsHover = () => {
  if (typeof window === 'undefined' || !window.matchMedia) return true;
  return window.matchMedia('(hover: hover)').matches;
};

/**
 * The reader's system-level motion preference. It is auto-detected at S0 and can also be
 * set explicitly in-experience; either one routes every cinematic state to its still-frame
 * variant, which is a complete deliverable, not a degraded one (§2.10, §8.3.4).
 *
 * @returns {boolean}
 */
export const prefersReducedMotion = () => {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

/**
 * Device tier, per master §7.8:
 *   mobile UA        -> MEDIUM
 *   <= 4 cores       -> MEDIUM on desktop, LOW on mobile
 *   deviceMemory <=4 -> LOW
 *
 * Mobile is a PRIMARY experience, not a reduced afterthought: MEDIUM is a smaller budget,
 * not a smaller experience. The central threshold effect survives every tier (§2.11).
 *
 * @returns {'HIGH'|'MEDIUM'|'LOW'}
 */
export const detectTier = () => {
  if (typeof navigator === 'undefined') return TIERS.MEDIUM;

  let tier = TIERS.HIGH;

  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent || '');
  if (isMobile) tier = TIERS.MEDIUM;

  const cores = navigator.hardwareConcurrency;
  if (typeof cores === 'number' && cores <= 4) tier = isMobile ? TIERS.LOW : TIERS.MEDIUM;

  const memory = navigator.deviceMemory;
  if (typeof memory === 'number' && memory <= 4) tier = TIERS.LOW;

  return tier;
};

/** Cached so the probe context is created at most once per page-load. */
let webglSupport;

/**
 * Whether a usable WebGL context can be created.
 *
 * `failIfMajorPerformanceCaveat: true` is deliberate and is contract law
 * (BUILD_CONTRACT §7): a software-rasterised canvas would produce a slideshow, and the
 * still Earth hero frame is a better experience than a stuttering one. On failure the
 * application takes the pre-rendered/static path — the manuscript itself never depends
 * on WebGL at all.
 *
 * @returns {boolean}
 */
export const supportsWebGL = () => {
  if (webglSupport !== undefined) return webglSupport;
  if (typeof document === 'undefined') {
    webglSupport = false;
    return webglSupport;
  }
  try {
    const canvas = document.createElement('canvas');
    const attributes = { failIfMajorPerformanceCaveat: true, alpha: false, antialias: false };
    const context =
      canvas.getContext('webgl2', attributes) || canvas.getContext('webgl', attributes);
    if (context) {
      // Release the probe immediately; contexts are a scarce browser resource.
      const lose = context.getExtension('WEBGL_lose_context');
      if (lose) lose.loseContext();
    }
    webglSupport = Boolean(context);
  } catch {
    webglSupport = false;
  }
  return webglSupport;
};

/**
 * How the reader is driving the experience. Recorded on `PortalEntryStarted` as
 * `inputMethod` — one of the whitelisted payload keys.
 *
 * @param {Event} [event]
 * @returns {'pointer'|'touch'|'keyboard'|'assistive'}
 */
export const inputMethodFrom = (event) => {
  if (!event) return isTouchDevice() ? 'touch' : 'pointer';
  if (event.type?.startsWith('key')) return 'keyboard';
  if (event.type?.startsWith('touch') || event.pointerType === 'touch') return 'touch';
  // A synthetic click with no coordinates is how assistive technology activates a control.
  if (event.type === 'click' && event.detail === 0) return 'assistive';
  return 'pointer';
};

/**
 * The referrer's DOMAIN only. The full referrer URL is a prohibited event field —
 * "referrer URL (domain only)" (BUILD_CONTRACT §3).
 *
 * @returns {string}
 */
export const referrerDomain = () => {
  if (typeof document === 'undefined' || !document.referrer) return '';
  try {
    return new URL(document.referrer).hostname;
  } catch {
    return '';
  }
};
