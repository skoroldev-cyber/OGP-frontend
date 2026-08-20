import { useCallback, useEffect } from 'react';

import { COPY } from '@/config/copy';

const EDGE_TOLERANCE_PX = 48;

const FORM_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

const atEnd = (element) => {
  if (!element) return true;
  return element.scrollTop + element.clientHeight >= element.scrollHeight - EDGE_TOLERANCE_PX;
};

const atStart = (element) => {
  if (!element) return true;
  return element.scrollTop <= EDGE_TOLERANCE_PX;
};

const landsInSilence = (unit) => {
  if (!unit) return false;
  const blocks = Array.isArray(unit.blocks) ? unit.blocks : [];
  return blocks[blocks.length - 1]?.type === 'cue';
};

export const ContinueAffordance = ({ unit, onAdvance, onBack, scrollRef }) => {
  const onKeyDown = useCallback(
    (event) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;

      const target = event.target;
      if (target && (FORM_TAGS.has(target.tagName) || target.isContentEditable)) return;

      const container = scrollRef?.current ?? null;

      if (event.key === 'Enter' || event.key === 'ArrowRight') {
        if (event.key === 'Enter' && target?.closest?.('button, a, [role="button"]')) return;
        if (!atEnd(container)) return;
        event.preventDefault();
        onAdvance();
        return;
      }

      if (event.key === 'ArrowLeft' || event.key === 'PageUp') {
        if (!onBack) return;
        if (!atStart(container)) return;
        event.preventDefault();
        onBack();
      }
    },
    [onAdvance, onBack, scrollRef],
  );

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onKeyDown]);

  return (
    <div className="ogp-continue" data-silence={landsInSilence(unit) ? 'true' : 'false'}>
      <div className="ogp-continue__silence" aria-hidden="true" />
    </div>
  );
};

export default ContinueAffordance;
