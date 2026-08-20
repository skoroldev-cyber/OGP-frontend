import { useCallback } from 'react';

import { COPY } from '@/config/copy';
import { OGP_TYPE } from '@/config/ogpTheme';
import { useReading } from '@/context/ReadingProvider';
import { AUTO_READ_SPEEDS } from '@/components/dom/ReadingSurface/useAutoRead';

const LAST_STEP = OGP_TYPE.textSizeSteps.length - 1;

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
