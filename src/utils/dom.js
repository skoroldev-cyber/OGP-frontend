/**
 * Small DOM helpers shared by the overlay layer.
 *
 * Accessibility here is a gate, not an enhancement (§7.9): the focus ring is never
 * suppressed, focus is never trapped without an escape, and every state change that
 * matters is announced politely rather than assertively — an assertive live region would
 * interrupt a screen-reader user mid-sentence, which is the aural equivalent of a popup.
 */

/** Elements that can receive focus, in DOM order. */
const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(',');

/**
 * The live `prefers-reduced-motion` query, or null outside a browser.
 *
 * @returns {MediaQueryList|null}
 */
export const prefersReducedMotionQuery = () => {
  if (typeof window === 'undefined' || !window.matchMedia) return null;
  return window.matchMedia('(prefers-reduced-motion: reduce)');
};

/**
 * Subscribe to system motion-preference changes. A reader who turns reduced motion on
 * mid-session must be honoured immediately, not at the next reload.
 *
 * @param {(reduced: boolean) => void} listener
 * @returns {() => void} unsubscribe
 */
export const onReducedMotionChange = (listener) => {
  const query = prefersReducedMotionQuery();
  if (!query) return () => {};
  const handler = (event) => listener(event.matches);
  if (typeof query.addEventListener === 'function') {
    query.addEventListener('change', handler);
    return () => query.removeEventListener('change', handler);
  }
  // Safari < 14
  query.addListener(handler);
  return () => query.removeListener(handler);
};

/**
 * @param {HTMLElement} container
 * @returns {HTMLElement[]}
 */
export const focusableWithin = (container) =>
  container ? Array.from(container.querySelectorAll(FOCUSABLE)).filter(isVisible) : [];

/**
 * @param {HTMLElement} element
 * @returns {boolean}
 */
const isVisible = (element) =>
  Boolean(element.offsetWidth || element.offsetHeight || element.getClientRects().length);

/**
 * Trap Tab inside a container while it is open, and restore focus to whatever had it
 * before. Escape always closes: no interface traps (§8.7 — "the back/exit affordance is
 * always reachable"). There are no modals in S8–S13; this exists for the settings panel,
 * which is a disclosure, not a modal.
 *
 * @param {HTMLElement} container
 * @param {{ onEscape?: () => void, initialFocus?: HTMLElement }} [options]
 * @returns {() => void} release
 */
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

/* -------------------------------------------------------------------------- */
/* Announcer                                                                   */
/* -------------------------------------------------------------------------- */

/** @type {HTMLElement|null} */
let liveRegion = null;

/**
 * The single shared polite live region. One region, reused, because several competing
 * regions produce overlapping speech.
 *
 * @returns {HTMLElement|null}
 */
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

/**
 * Announce a message politely.
 *
 * Politely, always: an `assertive` region interrupts, and interruption is the aural form
 * of the popups this experience forbids.
 *
 * @param {string} message
 */
export const announce = (message) => {
  const region = ensureLiveRegion();
  if (!region || !message) return;
  // Clearing first guarantees the reader hears a repeated message a second time.
  region.textContent = '';
  window.setTimeout(() => {
    region.textContent = message;
  }, 50);
};

/** Remove the shared live region (teardown / tests). */
export const destroyAnnouncer = () => {
  if (liveRegion?.parentNode) liveRegion.parentNode.removeChild(liveRegion);
  liveRegion = null;
};

/**
 * Coarse URL synchronisation. Cinematic states are never URL-addressable, so the address
 * bar is only ever nudged at the `/` <-> `/reading-room` boundary, with `replaceState` so
 * the browser's back button is not filled with states that are not pages (§7.11).
 *
 * @param {string} path
 */
export const replacePath = (path) => {
  if (typeof window === 'undefined' || !window.history) return;
  if (window.location.pathname === path) return;
  window.history.replaceState(window.history.state, '', path);
};
