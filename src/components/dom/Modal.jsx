import { useCallback, useEffect, useId, useRef } from 'react';

import { COPY } from '@/config/copy';

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), ' +
  'select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export const Modal = ({ title, description, onClose, children, footer, className = '' }) => {
  const panelRef = useRef(null);
  const returnFocusRef = useRef(null);
  const titleId = useId();
  const descriptionId = useId();

  const close = useCallback(() => onClose?.(), [onClose]);

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
