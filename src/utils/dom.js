const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(',');

export const prefersReducedMotionQuery = () => {
  if (typeof window === 'undefined' || !window.matchMedia) return null;
  return window.matchMedia('(prefers-reduced-motion: reduce)');
};

export const onReducedMotionChange = (listener) => {
  const query = prefersReducedMotionQuery();
  if (!query) return () => {};
  const handler = (event) => listener(event.matches);
  if (typeof query.addEventListener === 'function') {
    query.addEventListener('change', handler);
    return () => query.removeEventListener('change', handler);
  }
  query.addListener(handler);
  return () => query.removeListener(handler);
};

export const focusableWithin = (container) =>
  container ? Array.from(container.querySelectorAll(FOCUSABLE)).filter(isVisible) : [];

const isVisible = (element) =>
  Boolean(element.offsetWidth || element.offsetHeight || element.getClientRects().length);

export const trapFocus = (container, options = {}) => {
  if (!container || typeof document === 'undefined') return () => {};
  const previous = document.activeElement;

  const first = options.initialFocus ?? focusableWithin(container)[0] ?? container;
  if (first && typeof first.focus === 'function') first.focus();

  const onKeyDown = (event) => {
    if (event.key === 'Escape') {
      options.onEscape?.();
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = focusableWithin(container);
    if (focusable.length === 0) {
      event.preventDefault();
      return;
    }
    const start = focusable[0];
    const end = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === start) {
      event.preventDefault();
      end.focus();
    } else if (!event.shiftKey && document.activeElement === end) {
      event.preventDefault();
      start.focus();
    }
  };

  container.addEventListener('keydown', onKeyDown);
  return () => {
    container.removeEventListener('keydown', onKeyDown);
    if (previous && typeof previous.focus === 'function') previous.focus();
  };
};

let liveRegion = null;

const ensureLiveRegion = () => {
  if (typeof document === 'undefined') return null;
  if (liveRegion && document.body.contains(liveRegion)) return liveRegion;
  liveRegion = document.createElement('div');
  liveRegion.setAttribute('role', 'status');
  liveRegion.setAttribute('aria-live', 'polite');
  liveRegion.setAttribute('aria-atomic', 'true');
  liveRegion.className = 'ogp-visually-hidden';
  document.body.appendChild(liveRegion);
  return liveRegion;
};

export const announce = (message) => {
  const region = ensureLiveRegion();
  if (!region || !message) return;
  region.textContent = '';
  window.setTimeout(() => {
    region.textContent = message;
  }, 50);
};

export const destroyAnnouncer = () => {
  if (liveRegion?.parentNode) liveRegion.parentNode.removeChild(liveRegion);
  liveRegion = null;
};

export const replacePath = (path) => {
  if (typeof window === 'undefined' || !window.history) return;
  if (window.location.pathname === path) return;
  window.history.replaceState(window.history.state, '', path);
};
