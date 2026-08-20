import { useCallback, useEffect, useState } from 'react';

import { COPY } from '@/config/copy';
import { FEEDBACK_LIMITS } from '@/services/api';
import {
  offsetsForRange,
  rangeForOffsets,
  unitRootIn,
} from '@/components/dom/ReadingSurface/usePassageMarks';

import { ChannelIcon } from '@/components/dom/ChannelIcon';
import { PassageNote } from '@/components/dom/ReadingSurface/PassageNote';

const HIGHLIGHT_NAME = 'ogp-passage-mark';

const SELECTION_GAP_PX = 10;

const VIEWPORT_MARGIN_PX = 12;

const ACTION_CLEARANCE_PX = 64;

const highlightsAvailable = () =>
  typeof window !== 'undefined' &&
  typeof window.Highlight === 'function' &&
  Boolean(window.CSS?.highlights);

export const PassageMarks = ({ passageMarks, scrollRef, unit }) => {
  const { rangedMarks, atCapacity, lastAction, findOverlapping, markSelection } = passageMarks;

  const unitId = unit?.unitId ?? null;

  const [pending, setPending] = useState(null);

  const [noting, setNoting] = useState(null);

  useEffect(() => {
    if (!highlightsAvailable()) return undefined;

    const root = unitRootIn(scrollRef?.current ?? null, unitId);
    const highlight = new window.Highlight();

    if (root) {
      for (const mark of rangedMarks) {
        const range = rangeForOffsets(root, mark.charStart, mark.charEnd);
        if (range) highlight.add(range);
      }
    }

    if (highlight.size === 0) {
      window.CSS.highlights.delete(HIGHLIGHT_NAME);
      return undefined;
    }

    window.CSS.highlights.set(HIGHLIGHT_NAME, highlight);
    return () => window.CSS.highlights.delete(HIGHLIGHT_NAME);
  }, [rangedMarks, scrollRef, unitId]);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;

    let frame = 0;

    const measure = () => {
      const root = unitRootIn(scrollRef?.current ?? null, unitId);
      const selection = window.getSelection();

      if (!root || !selection || selection.isCollapsed || selection.rangeCount === 0) {
        setPending(null);
        return;
      }

      const range = selection.getRangeAt(0);
      const offsets = offsetsForRange(root, range);
      const excerpt = range.toString();
      if (!offsets || excerpt.trim() === '') {
        setPending(null);
        return;
      }

      const rect = range.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) {
        setPending(null);
        return;
      }

      const above = rect.bottom + ACTION_CLEARANCE_PX > window.innerHeight;
      setPending({
        ...offsets,
        excerpt,
        x: Math.min(
          Math.max(rect.left + rect.width / 2, VIEWPORT_MARGIN_PX),
          window.innerWidth - VIEWPORT_MARGIN_PX,
        ),
        y: above ? rect.top - SELECTION_GAP_PX : rect.bottom + SELECTION_GAP_PX,
        above,
      });
    };

    const schedule = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        measure();
      });
    };

    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      setPending(null);
      window.getSelection()?.removeAllRanges();
    };

    const container = scrollRef?.current ?? null;

    document.addEventListener('selectionchange', schedule);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', schedule);
    container?.addEventListener('scroll', schedule, { passive: true });

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      document.removeEventListener('selectionchange', schedule);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', schedule);
      container?.removeEventListener('scroll', schedule);
    };
  }, [scrollRef, unitId]);

  const onActivate = useCallback(() => {
    if (!pending) return;
    markSelection({
      charStart: pending.charStart,
      charEnd: pending.charEnd,
      excerpt: pending.excerpt,
    });
    window.getSelection()?.removeAllRanges();
    setPending(null);
  }, [pending, markSelection]);

  const existing = pending ? findOverlapping(pending.charStart, pending.charEnd) : null;
  const full = Boolean(pending) && atCapacity && !existing;

  const onNote = useCallback(() => {
    if (!existing) return;
    setNoting(existing);
    window.getSelection()?.removeAllRanges();
    setPending(null);
  }, [existing]);

  const closeNote = useCallback(() => setNoting(null), []);

  const announcement =
    lastAction.kind === 'added'
      ? COPY.FEEDBACK.MARK_ADDED
      : lastAction.kind === 'removed'
        ? COPY.FEEDBACK.MARK_REMOVED
        : lastAction.kind === 'full'
          ? COPY.FEEDBACK.MARKS_FULL.replace('{count}', String(FEEDBACK_LIMITS.maxPassages))
          : '';

  return (
    <>
      {pending && (
        <div
          className="ogp-passage-mark"
          data-above={pending.above ? 'true' : 'false'}
          style={{ left: `${pending.x}px`, top: `${pending.y}px` }}
        >
          {full ? (
            <p className="ogp-passage-mark__notice">
              {COPY.FEEDBACK.MARKS_FULL.replace('{count}', String(FEEDBACK_LIMITS.maxPassages))}
            </p>
          ) : (
            <>
              <button
                type="button"
                className="ogp-passage-mark__action"
                onMouseDown={(event) => event.preventDefault()}
                onClick={onActivate}
              >
                {existing ? COPY.FEEDBACK.MARK_PASSAGE_REMOVE : COPY.FEEDBACK.MARK_PASSAGE}
              </button>

              {existing && (
                <button
                  type="button"
                  className="ogp-passage-mark__action ogp-passage-mark__action--note"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={onNote}
                >
                  <ChannelIcon name="note" className="ogp-passage-mark__icon" />
                  {COPY.FEEDBACK.PASSAGE_NOTE_ACTION}
                </button>
              )}
            </>
          )}
        </div>
      )}

      {noting && <PassageNote mark={noting} onClose={closeNote} />}

      <p className="ogp-visually-hidden" role="status">
        {announcement && <span key={lastAction.seq}>{announcement}</span>}
      </p>
    </>
  );
};

export default PassageMarks;
