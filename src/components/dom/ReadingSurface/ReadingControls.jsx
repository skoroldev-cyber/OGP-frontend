/**
 * The floating reading controls (master §3.9).
 *
 * A small cluster pinned to the edge of the reading surface: text size out, text size in, and
 * the way into the full settings. It is the quiet settings affordance §3.9 asks for, brought
 * within reach — a reader adjusting type should not have to open a panel, change a value, and
 * close it again to see whether it helped.
 *
 * What it deliberately is not:
 *
 *   - **Not a progress display.** No percentage, no page count, no time remaining, no
 *     "3 of 12". §3.9 permits a plain position indicator and §14.4.1 prohibits streaks, goals
 *     and progress celebrations; a number counting down is the beginning of the second thing,
 *     not the first.
 *   - **Not a share button.** Sharing is not a control the reader can reach for. It appears at
 *     S11, only when the server says the window is open, and only after "recognition,
 *     reflection, decompression, and regulation" (the Sharing Law, §5.1). A share affordance
 *     parked in the reading chrome would be available during a witness section — exactly what
 *     §14.4.4 forbids.
 *   - **Not always visible.** It recedes with the rest of the chrome while reading and returns
 *     on intent (§8.7), so nothing competes with the manuscript.
 *
 * It does carry one thing that is not a display control: "Mark this section". Marking is
 * offered inline on a text selection, and a reader who cannot drag-select — a keyboard
 * reader, a switch user, anyone whose pointer will not hold a range across a paragraph —
 * would otherwise have no way to mark anything at all. It records a reference to the section
 * being read and asks nothing (§3.13): no form opens, no question is put, and nothing about
 * the reading changes.
 */

import { useCallback } from 'react';

import { COPY } from '@/config/copy';
import { OGP_TYPE } from '@/config/ogpTheme';
import { useReading } from '@/context/ReadingProvider';
import { AUTO_READ_SPEEDS } from '@/components/dom/ReadingSurface/useAutoRead';

const LAST_STEP = OGP_TYPE.textSizeSteps.length - 1;

/**
 * @param {{
 *   onOpenSettings?: () => void,
 *   autoRead?: {
 *     running: boolean, toggle: () => void,
 *     speedIndex: number, setSpeedIndex: (index: number) => void,
 *   },
 *   passageMarks?: {
 *     sectionMark: Object|null,
 *     toggleSectionMark: () => void,
 *   }|null,
 * }} props
 */
export const ReadingControls = ({ onOpenSettings, autoRead, passageMarks }) => {
  const { settings, setSetting } = useReading();

  const index = settings.textSizeIndex ?? OGP_TYPE.textSizeDefaultIndex;

  const smaller = useCallback(() => {
    setSetting('textSizeIndex', Math.max(0, index - 1));
  }, [index, setSetting]);

  const larger = useCallback(() => {
    setSetting('textSizeIndex', Math.min(LAST_STEP, index + 1));
  }, [index, setSetting]);

  const cycleSpeed = useCallback(() => {
    if (!autoRead) return;
    autoRead.setSpeedIndex((autoRead.speedIndex + 1) % AUTO_READ_SPEEDS.length);
  }, [autoRead]);

  return (
    <div className="ogp-reading-controls" role="group" aria-label={COPY.READING.CONTROLS_LABEL}>
      {autoRead && (
        <>
          <button
            type="button"
            className="ogp-reading-controls__button ogp-reading-controls__button--primary"
            onClick={autoRead.toggle}
            aria-pressed={autoRead.running}
            aria-label={autoRead.running ? COPY.READING.AUTO_READ_STOP : COPY.READING.AUTO_READ_START}
            title={autoRead.running ? COPY.READING.AUTO_READ_STOP : COPY.READING.AUTO_READ_START}
          >
            <span aria-hidden="true" className="ogp-reading-controls__icon">
              {autoRead.running ? (
                // Two bars. A square would read as "stop" in the sense of cancel; the page is
                // being paused, and it resumes exactly where it was left.
                <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
                  <rect x="3.5" y="2.5" width="3" height="11" rx="1" />
                  <rect x="9.5" y="2.5" width="3" height="11" rx="1" />
                </svg>
              ) : (
                <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
                  <path d="M4.5 2.8v10.4a.8.8 0 0 0 1.22.68l8.2-5.2a.8.8 0 0 0 0-1.36l-8.2-5.2A.8.8 0 0 0 4.5 2.8Z" />
                </svg>
              )}
            </span>
          </button>

          <button
            type="button"
            className="ogp-reading-controls__button ogp-reading-controls__button--pace"
            onClick={cycleSpeed}
            aria-label={COPY.READING.AUTO_READ_PACE}
            title={COPY.READING.AUTO_READ_PACE}
          >
            {/* The pace as a mark, not a number: five steps shown as a rising bar. A figure in
                px/s would be a specification; this is a dial. */}
            <span aria-hidden="true" className="ogp-reading-controls__pace">
              {AUTO_READ_SPEEDS.map((_, step) => (
                <i
                  key={step}
                  className="ogp-reading-controls__pace-bar"
                  data-on={step <= autoRead.speedIndex ? 'true' : 'false'}
                />
              ))}
            </span>
          </button>

          <span className="ogp-reading-controls__divider" aria-hidden="true" />
        </>
      )}

      <button
        type="button"
        className="ogp-reading-controls__button"
        onClick={smaller}
        disabled={index === 0}
        aria-label={COPY.READING.TEXT_SMALLER}
        title={COPY.READING.TEXT_SMALLER}
      >
        {/* Two glyphs of the same letter at different sizes: the control shows what it does
            without a word, and reads identically in every language the platform later serves. */}
        <span aria-hidden="true" className="ogp-reading-controls__glyph ogp-reading-controls__glyph--small">
          A
        </span>
      </button>

      <button
        type="button"
        className="ogp-reading-controls__button"
        onClick={larger}
        disabled={index === LAST_STEP}
        aria-label={COPY.READING.TEXT_LARGER}
        title={COPY.READING.TEXT_LARGER}
      >
        <span aria-hidden="true" className="ogp-reading-controls__glyph ogp-reading-controls__glyph--large">
          A
        </span>
      </button>

      {passageMarks && (
        <>
          <span className="ogp-reading-controls__divider" aria-hidden="true" />

          <button
            type="button"
            className="ogp-reading-controls__button ogp-reading-controls__button--mark"
            onClick={passageMarks.toggleSectionMark}
            aria-pressed={Boolean(passageMarks.sectionMark)}
            aria-label={
              passageMarks.sectionMark
                ? COPY.FEEDBACK.MARK_SECTION_REMOVE
                : COPY.FEEDBACK.MARK_SECTION
            }
            title={
              passageMarks.sectionMark
                ? COPY.FEEDBACK.MARK_SECTION_REMOVE
                : COPY.FEEDBACK.MARK_SECTION
            }
          >
            {/* Lines of text with the last one underscored: the mark itself, drawn small.
                Not a bookmark, not a flag, not a star — none of which mean "I want to say
                something about this" and one of which is a rating. */}
            <span aria-hidden="true" className="ogp-reading-controls__icon">
              <svg
                viewBox="0 0 16 16"
                width="14"
                height="14"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinecap="round"
              >
                <path d="M3 4h10" />
                <path d="M3 7.5h7" />
                <path d="M3 12h10" />
              </svg>
            </span>
          </button>
        </>
      )}

      {onOpenSettings && (
        <button
          type="button"
          className="ogp-reading-controls__button"
          onClick={onOpenSettings}
          aria-label={COPY.READING.SETTINGS}
          title={COPY.READING.SETTINGS}
        >
          <span aria-hidden="true" className="ogp-reading-controls__glyph">
            ·
          </span>
        </button>
      )}

      {/*
        The current step, announced but not drawn. A reader changing text size with a screen
        reader gets confirmation that something happened; a reader looking at the page gets the
        page, which is the confirmation.
      */}
      <span className="ogp-visually-hidden" role="status">
        {COPY.READING.TEXT_SIZE_STATUS.replace('{step}', String(index + 1)).replace(
          '{total}',
          String(LAST_STEP + 1),
        )}
      </span>
    </div>
  );
};

export default ReadingControls;
