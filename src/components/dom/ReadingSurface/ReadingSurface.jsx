/**
 * S10–S12 — the reading surface (master §3.4, §3.10, §3.12).
 *
 * **The manuscript renders in a DOM layer composited above the R3F canvas, never as 3D
 * text.** That is the central technical decision of §3.12, and it follows from three
 * requirements at once: the screen-reader mandate (the accessible tree IS the experience),
 * typographic authority (real CSS typography, text selection, find-in-page), and
 * performance (troika text for ~15,500 words loses on every axis).
 *
 * **Load discipline is binding.** Only the current unit and its immediate neighbours are
 * ever mounted; completed units unmount as the window slides. Full-arc DOM mounting is
 * prohibited — the arc is ~15,540 words, and mounting all of it would cost exactly the
 * scroll performance long-form reading needs. The neighbours are mounted `hidden`: parsed
 * and resident, absent from the accessibility tree, absent from find-in-page, absent from
 * layout. One unit is ever readable at a time (§3.4.2, and the one-column cognitive law).
 *
 * **No layout coupling.** This column never reads or writes the canvas per frame.
 * Environment synchronisation happens on unit boundaries only, inside `ReadingProvider`,
 * which keeps scrolling on the compositor thread.
 *
 * **The surface functions with the canvas absent** — context loss, crash, lightweight tier.
 * Text on a static deep field, typography identical (§3.4.4 fallback).
 *
 * The only failure language a reader may ever see here is `COPY.NOTICES.ROOM_SLOW`. No
 * status codes, no stack traces, no "something went wrong", no spinner (§3.3).
 */

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

/** Orientation hints are offered once, quietly, shortly after the room settles. */
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

  /** Unit ids whose content notice the reader has answered. Set only from a reader action. */
  const [acknowledged, setAcknowledged] = useState([]);
  const [resumeDecided, setResumeDecided] = useState(false);

  const unitId = unit?.unitId ?? null;
  const noticeKey = unit?.contentNoticeKey ?? null;
  const noticePending = Boolean(noticeKey) && !acknowledged.includes(unitId);

  /* ---------------------------------------------------------------- */
  /* Scroll                                                            */
  /* ---------------------------------------------------------------- */

  // Restore the reader's place inside the unit, once per unit. `scroll_fraction` is the
  // device-local record that makes progress survive without an account (§3.8.1).
  useEffect(() => {
    const node = scrollRef.current;
    if (!node || !unitId) return;
    if (restoredFor.current === unitId) return;
    restoredFor.current = unitId;

    const fraction = progress.currentUnitId === unitId ? progress.scrollFraction ?? 0 : 0;
    const extent = node.scrollHeight - node.clientHeight;
    node.scrollTop = extent > 0 ? extent * Math.max(0, Math.min(1, fraction)) : 0;

    // The column owns keyboard scrolling, so it has to be able to hold focus. Focusing it
    // without scrolling is what makes ArrowDown / PageDown / Space work from first paint.
    node.focus({ preventScroll: true });
  }, [unitId, progress.currentUnitId, progress.scrollFraction]);

  const onScroll = useCallback(() => {
    const node = scrollRef.current;
    if (!node) return;
    const extent = node.scrollHeight - node.clientHeight;
    saveScroll(extent > 0 ? node.scrollTop / extent : 0);
  }, [saveScroll]);

  /* ---------------------------------------------------------------- */
  /* Orientation                                                       */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    if (typeof window === 'undefined' || !unitId) return undefined;
    const timer = window.setTimeout(() => showHint('reading_controls'), HINT_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [unitId, showHint]);

  /* ---------------------------------------------------------------- */
  /* Reader actions                                                    */
  /* ---------------------------------------------------------------- */

  const acknowledgeNotice = useCallback(() => {
    setAcknowledged((previous) => (previous.includes(unitId) ? previous : [...previous, unitId]));
  }, [unitId]);

  // Moving past a noticed chapter costs the reader nothing: the unit is completed the same
  // way it would have been by reading it, and the arc continues.
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

  // Auto-reading scrolls within this unit and stops at its end; crossing to the next unit
  // stays the reader's act (§14.4.2).
  const autoRead = useAutoRead({ scrollRef, unitId, enabled: !noticePending });

  // The reader's marks. One instance for the whole surface: the inline action and the
  // keyboard equivalent in the controls are two ways into the same list (§3.13). Marking
  // records a reference and nothing else — no feedback UI exists mid-read.
  const passageMarks = usePassageMarks({ unit });

  const showResume = resumeAvailable && !resumeDecided && unitIndex > 0;
  const canGoBack = unitIndex > 0;
  const markable = Boolean(unit) && !noticePending;

  return (
    <div className="ogp-reading-surface ogp-reading-surface--fixed" data-theme={settings.theme}>
      {/* Outside the scroller on purpose: it stays put while the page moves under it. */}
      <ReadingControls autoRead={autoRead} passageMarks={markable ? passageMarks : null} />

      {/* Also outside the scroller: the action is positioned against the viewport, and a
          child of the scroller would add to its scroll height at the moment the reader is
          holding a selection near the end of a page. */}
      {markable && (
        <PassageMarks passageMarks={passageMarks} scrollRef={scrollRef} unit={unit} />
      )}

      {/* Outside the page, in the ambient field: reachable without ever crossing the measure. */}
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

        {/*
          The mount window: the current unit ± one neighbour. The neighbours are `hidden`,
          so they are resident in the document but absent from layout, from the
          accessibility tree and from find-in-page. Units behind the window unmount.
        */}
        <div hidden aria-hidden="true" className="ogp-reading-surface__window">
          {neighbours.previous && <ManuscriptUnitView unit={neighbours.previous} />}
          {neighbours.next && <ManuscriptUnitView unit={neighbours.next} />}
        </div>
      </main>

      {/*
        The one permitted progress affordance, and it is off by default: a hairline mark,
        no number, no percentage, no estimate, no celebration at either end (§3.9).
      */}
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
