import { useCallback, useEffect, useRef, useState } from 'react';

import { COPY } from '@/config/copy';
import { useMilestones } from '@/context/MilestonesContext';
import { useReading } from '@/context/ReadingProvider';

import { MilestoneHint } from '@/components/dom/MilestoneHint';
import { ContentNotice } from '@/components/dom/ReadingSurface/ContentNotice';
import { ContinueAffordance } from '@/components/dom/ReadingSurface/ContinueAffordance';
import { ManuscriptUnitView } from '@/components/dom/ReadingSurface/ManuscriptUnitView';
import { PassageMarks } from '@/components/dom/ReadingSurface/PassageMarks';
import { ResumeCard } from '@/components/dom/ReadingSurface/ResumeCard';
import { TypographyProvider } from '@/components/dom/ReadingSurface/TypographyProvider';
import { ReadingControls } from '@/components/dom/ReadingSurface/ReadingControls';
import { useAutoRead } from '@/components/dom/ReadingSurface/useAutoRead';
import { usePassageMarks } from '@/components/dom/ReadingSurface/usePassageMarks';
import { ReadingNav } from '@/components/dom/ReadingSurface/ReadingNav';

const HINT_DELAY_MS = 2000;

export const ReadingSurface = () => {
  const {
    unit,
    neighbours,
    unitIndex,
    unitCount,
    error,
    settings,
    progress,
    advance,
    goBack,
    saveScroll,
    resumeAvailable,
    resume,
    restart,
  } = useReading();
  const { showHint } = useMilestones();

  const scrollRef = useRef(null);
  const restoredFor = useRef(null);

  const [acknowledged, setAcknowledged] = useState([]);
  const [resumeDecided, setResumeDecided] = useState(false);

  const unitId = unit?.unitId ?? null;
  const noticeKey = unit?.contentNoticeKey ?? null;
  const noticePending = Boolean(noticeKey) && !acknowledged.includes(unitId);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node || !unitId) return;
    if (restoredFor.current === unitId) return;
    restoredFor.current = unitId;

    const fraction = progress.currentUnitId === unitId ? progress.scrollFraction ?? 0 : 0;
    const extent = node.scrollHeight - node.clientHeight;
    node.scrollTop = extent > 0 ? extent * Math.max(0, Math.min(1, fraction)) : 0;

    node.focus({ preventScroll: true });
  }, [unitId, progress.currentUnitId, progress.scrollFraction]);

  const onScroll = useCallback(() => {
    const node = scrollRef.current;
    if (!node) return;
    const extent = node.scrollHeight - node.clientHeight;
    saveScroll(extent > 0 ? node.scrollTop / extent : 0);
  }, [saveScroll]);

  useEffect(() => {
    if (typeof window === 'undefined' || !unitId) return undefined;
    const timer = window.setTimeout(() => showHint('reading_controls'), HINT_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [unitId, showHint]);

  const acknowledgeNotice = useCallback(() => {
    setAcknowledged((previous) => (previous.includes(unitId) ? previous : [...previous, unitId]));
  }, [unitId]);

  const skipNoticedUnit = useCallback(() => {
    acknowledgeNotice();
    advance();
  }, [acknowledgeNotice, advance]);

  const onResumeContinue = useCallback(() => {
    setResumeDecided(true);
    resume();
  }, [resume]);

  const onResumeRestart = useCallback(() => {
    setResumeDecided(true);
    restart();
  }, [restart]);

  const autoRead = useAutoRead({ scrollRef, unitId, enabled: !noticePending });

  const passageMarks = usePassageMarks({ unit });

  const showResume = resumeAvailable && !resumeDecided && unitIndex > 0;
  const canGoBack = unitIndex > 0;
  const markable = Boolean(unit) && !noticePending;

  return (
    <div className="ogp-reading-surface ogp-reading-surface--fixed" data-theme={settings.theme}>
      <ReadingControls autoRead={autoRead} passageMarks={markable ? passageMarks : null} />

      {markable && (
        <PassageMarks passageMarks={passageMarks} scrollRef={scrollRef} unit={unit} />
      )}

      <ReadingNav
        onPrevious={canGoBack ? goBack : null}
        onNext={unit && !noticePending ? advance : null}
      />

      <main
        className="ogp-reading-surface__scroll"
        ref={scrollRef}
        onScroll={onScroll}
        tabIndex={-1}
        aria-label={COPY.READING.MANUSCRIPT_LABEL}
      >
        <TypographyProvider>
          {showResume && (
            <ResumeCard onContinue={onResumeContinue} onRestart={onResumeRestart} />
          )}

          <MilestoneHint />

          {error === 'slow' && !unit && (
            <p className="ogp-reading-surface__notice" role="status">
              {COPY.NOTICES.ROOM_SLOW}
            </p>
          )}

          {noticePending ? (
            <ContentNotice
              noticeKey={noticeKey}
              onContinue={acknowledgeNotice}
              onSkip={skipNoticedUnit}
            />
          ) : (
            <>
              <ManuscriptUnitView unit={unit} />

              {unit && (
                <ContinueAffordance
                  unit={unit}
                  onAdvance={advance}
                  onBack={canGoBack ? goBack : null}
                  scrollRef={scrollRef}
                />
              )}
            </>
          )}
        </TypographyProvider>

        <div hidden aria-hidden="true" className="ogp-reading-surface__window">
          {neighbours.previous && <ManuscriptUnitView unit={neighbours.previous} />}
          {neighbours.next && <ManuscriptUnitView unit={neighbours.next} />}
        </div>
      </main>

      {settings.positionIndicator && unitCount > 0 && (
        <div
          className="ogp-reading-surface__position"
          role="img"
          aria-label={COPY.READING.POSITION_LABEL}
        >
          <span
            className="ogp-reading-surface__position-mark"
            style={{ blockSize: `${((unitIndex + 1) / unitCount) * 100}%` }}
          />
        </div>
      )}
    </div>
  );
};

export default ReadingSurface;
