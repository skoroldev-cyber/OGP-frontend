export const TIERS = Object.freeze({ HIGH: 'HIGH', MEDIUM: 'MEDIUM', LOW: 'LOW' });

export const isTouchDevice = () => {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(hover: none) and (pointer: coarse)').matches;
};

export const supportsHover = () => {
  if (typeof window === 'undefined' || !window.matchMedia) return true;
  return window.matchMedia('(hover: hover)').matches;
};

export const prefersReducedMotion = () => {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

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

let webglSupport;

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
      const lose = context.getExtension('WEBGL_lose_context');
      if (lose) lose.loseContext();
    }
    webglSupport = Boolean(context);
  } catch {
    webglSupport = false;
  }
  return webglSupport;
};

export const inputMethodFrom = (event) => {
  if (!event) return isTouchDevice() ? 'touch' : 'pointer';
  if (event.type?.startsWith('key')) return 'keyboard';
  if (event.type?.startsWith('touch') || event.pointerType === 'touch') return 'touch';
  if (event.type === 'click' && event.detail === 0) return 'assistive';
  return 'pointer';
};

export const referrerDomain = () => {
  if (typeof document === 'undefined' || !document.referrer) return '';
  try {
    return new URL(document.referrer).hostname;
  } catch {
    return '';
  }
};
