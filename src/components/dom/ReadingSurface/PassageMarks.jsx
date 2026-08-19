/**
 * Marking a passage while reading (master §3.13).
 *
 * **This is not a feedback surface, and it must never become one.** §3.13 places the
 * questionnaire after completion, in the instrument's own words — "Please read the Opening
 * Arc without stopping to edit" — so nothing here asks the reader a question, opens a form,
 * or wants an answer. Selecting text offers ONE quiet action: keep a reference to this
 * passage. That is the entire interaction. The reader writes about it later, at S13, with
 * the reference already attached.
 *
 * It is also not a popup and not an overlay, both of which §14.4.1 prohibits. It appears only
 * because the reader selected text, it sits beside their own selection, it blocks nothing,
 * it dims nothing, and it leaves the moment the selection does or the moment Escape is
 * pressed. Nothing is modal, and no reading is interrupted.
 *
 * **The manuscript's DOM is never touched.** Marks are painted with the CSS Custom Highlight
 * API, which styles ranges without wrapping them in elements. Wrapping the reader's selection
 * in `<mark>` tags would restructure the rendered manuscript from outside React — and the
 * Opening Arc text is immutable, rendered by `ManuscriptUnitView` and transformed by nobody
 * (§0.3, §3.4.1). Where the API is unavailable the reader loses the underline, not the mark:
 * the mark is still recorded, still removable, and still listed on the feedback form.
 *
 * Nothing here counts marks, displays a total, congratulates, or rewards.
 */

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

/** The registered highlight. `PassageMarks.scss` styles `::highlight(ogp-passage-mark)`. */
const HIGHLIGHT_NAME = 'ogp-passage-mark';

/** Distance between the reader's selection and the action offered beside it. */
const SELECTION_GAP_PX = 10;

/** Keeps the action off the viewport edges on a narrow screen. */
const VIEWPORT_MARGIN_PX = 12;

/** Room the action needs below the selection before it flips above it. */
const ACTION_CLEARANCE_PX = 64;

/**
 * The Custom Highlight API, where the browser has it. Feature-detected rather than
 * version-detected, and absence is silent: a missing underline is a missing cue, not a
 * missing capability.
 *
 * @returns {boolean}
 */
const highlightsAvailable = () =>
  typeof window !== 'undefined' &&
  typeof window.Highlight === 'function' &&
  Boolean(window.CSS?.highlights);

/**
 * @param {{
 *   passageMarks: ReturnType<typeof import('./usePassageMarks').usePassageMarks>,
 *   scrollRef: { current: HTMLElement|null },
 *   unit: Object|null,
 * }} props
 */
export const PassageMarks = ({ passageMarks, scrollRef, unit }) => {
  const { rangedMarks, atCapacity, lastAction, findOverlapping, markSelection } = passageMarks;

  const unitId = unit?.unitId ?? null;

  /** The live selection, measured: `{ charStart, charEnd, excerpt, x, y, above }`. */
  const [pending, setPending] = useState(null);

  /** The mark the reader chose to write about, or null. Opened only by the note control. */
  const [noting, setNoting] = useState(null);

  /* ---------------------------------------------------------------- */
  /* Painting                                                          */
  /* ---------------------------------------------------------------- */

  // Ranges are rebuilt from character offsets every time the unit renders, which is why a
  // mark survives a text-size change, a theme change and a reflow: there is no geometry to
  // invalidate. A mark whose offsets no longer resolve — a mark carried over from an earlier
  // release — is dropped from the painting quietly and remains in the list (§3.12).
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

  /* ---------------------------------------------------------------- */
  /* The selection                                                     */
  /* ---------------------------------------------------------------- */

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

      // Below the selection where there is room, above it where there is not. Never over the
      // reader's own words.
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

    // Coalesced to one measurement per frame: a drag-select fires `selectionchange`
    // continuously, and scrolling with a selection open fires as fast as the compositor will
    // allow. One rect read per frame, and only while a selection exists.
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
    // The selection has served its purpose. Releasing it also dismisses this action, which is
    // what makes the interaction end where the reader expects it to.
    window.getSelection()?.removeAllRanges();
    setPending(null);
  }, [pending, markSelection]);

  const existing = pending ? findOverlapping(pending.charStart, pending.charEnd) : null;
  const full = Boolean(pending) && atCapacity && !existing;

  /**
   * Open the note on the mark under the selection.
   *
   * Offered only where a mark already exists, which keeps the order of the interaction the
   * one §3.13 describes: a reader marks a passage, and only afterwards, and only if they
   * choose to, writes about it. Marking never leads anywhere on its own.
   */
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
            // Stated, not enforced by a control that would do nothing. The reader removes a
            // mark and marks this one instead, or leaves it.
            <p className="ogp-passage-mark__notice">
              {COPY.FEEDBACK.MARKS_FULL.replace('{count}', String(FEEDBACK_LIMITS.maxPassages))}
            </p>
          ) : (
            <>
              <button
                type="button"
                className="ogp-passage-mark__action"
                // Without this the browser collapses the selection on mousedown and the action
                // unmounts before the click can reach it.
                onMouseDown={(event) => event.preventDefault()}
                onClick={onActivate}
              >
                {existing ? COPY.FEEDBACK.MARK_PASSAGE_REMOVE : COPY.FEEDBACK.MARK_PASSAGE}
              </button>

              {/* Only on a passage already marked, and never the first thing offered. */}
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

      {/*
        Announced, never drawn. Marking is confirmed by the underline for a reader who can see
        it and by this line for a reader who cannot; neither is a celebration, and there is no
        number in either. The keyed span exists so a repeated action still announces.
      */}
      <p className="ogp-visually-hidden" role="status">
        {announcement && <span key={lastAction.seq}>{announcement}</span>}
      </p>
    </>
  );
};

export default PassageMarks;
