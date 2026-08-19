/**
 * The one dialog in the experience.
 *
 * §14.4.1 prohibits popups and overlays *that interrupt* — the modal that arrives uninvited,
 * dims the reading, and asks for something the reader did not come for. Nothing here appears
 * on its own. Every instance opens because the reader activated a control that says what it
 * will open, and closes on Escape, on the backdrop, and on a control that is always present.
 * That is the difference between a dialog and an interruption, and it is the whole reason
 * this component is allowed to exist.
 *
 * What it guarantees, so that no caller has to remember it:
 *
 *   · Focus moves in on open and returns to the control that opened it on close. A reader who
 *     opened this from the keyboard is never dropped at the top of the document.
 *   · Tab is contained. §8.7 forbids interface traps, and the distinction is that a trap has
 *     no exit — this has three, and cycling within an open dialog is what assistive technology
 *     expects of `aria-modal`.
 *   · The page behind does not scroll, so dismissing does not also lose the reader's place.
 *   · The backdrop is a scrim over the reading, never a blank sheet: the manuscript stays
 *     visible behind it, because the reader has not left it.
 */

import { useCallback, useEffect, useId, useRef } from 'react';

import { COPY } from '@/config/copy';

/** Everything that can hold focus, minus anything deliberately removed from the order. */
const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), ' +
  'select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * @param {{
 *   title: string,
 *   description?: string,
 *   onClose: () => void,
 *   children: import('react').ReactNode,
 *   footer?: import('react').ReactNode,
 *   className?: string,
 * }} props
 */
export const Modal = ({ title, description, onClose, children, footer, className = '' }) => {
  const panelRef = useRef(null);
  const returnFocusRef = useRef(null);
  const titleId = useId();
  const descriptionId = useId();

  const close = useCallback(() => onClose?.(), [onClose]);

  // Remember where focus came from before anything moves it.
  useEffect(() => {
    returnFocusRef.current = typeof document !== 'undefined' ? document.activeElement : null;

    const panel = panelRef.current;
    const first = panel?.querySelector(FOCUSABLE);
    (first ?? panel)?.focus?.();

    return () => {
      const target = returnFocusRef.current;
      if (target && typeof target.focus === 'function' && document.contains(target)) {
        target.focus();
      }
    };
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        close();
        return;
      }
      if (event.key !== 'Tab') return;

      const panel = panelRef.current;
      if (!panel) return;

      const items = Array.from(panel.querySelectorAll(FOCUSABLE)).filter(
        (node) => node.offsetParent !== null || node === document.activeElement,
      );
      if (items.length === 0) {
        event.preventDefault();
        panel.focus();
        return;
      }

      const first = items[0];
      const last = items[items.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown, true);

    // The reader's place is behind this. Locking the scroll keeps it exactly where it was.
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      document.body.style.overflow = overflow;
    };
  }, [close]);

  return (
    <div
      className={`ogp-modal ${className}`.trim()}
      // The backdrop dismisses, but only when the press began on it. Without this a drag that
      // starts inside the panel and releases outside would close a dialog the reader was in
      // the middle of using — which, on a textarea, means losing what they had selected.
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div
        ref={panelRef}
        className="ogp-modal__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
      >
        <header className="ogp-modal__head">
          <h2 className="ogp-modal__title" id={titleId}>
            {title}
          </h2>
          {description && (
            <p className="ogp-modal__description" id={descriptionId}>
              {description}
            </p>
          )}
        </header>

        <div className="ogp-modal__body">{children}</div>

        <div className="ogp-modal__actions">
          {footer}
          <button type="button" className="ogp-affordance ogp-modal__close" onClick={close}>
            {COPY.A11Y.CLOSE}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Modal;
