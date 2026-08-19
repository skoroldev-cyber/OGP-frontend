/**
 * The quiet continue affordance at unit end (master §3.4.2).
 *
 * Advancing is an explicit reader action. Movement is by readiness and reader intent, never
 * by a timeline: nothing in this component can advance the reader, and nothing in it counts
 * down.
 *
 * **The manuscript keeps the voice.** Where the text supplies its own cue — "Turn the
 * page." ends Chapter 0 §8; "Take a breath. Then turn the page." ends the Introduction —
 * that cue is rendered by `ManuscriptUnitView` as manuscript text, and this affordance sits
 * *beneath* it, unlabelled. It never borrows the author's words as a button label.
 *
 * **Locked ending cues land in silence.** "You." / "You are awake." / Chapter 1 §8's
 * closing lines are followed by a full viewport of quiet space before anything appears
 * (§3.4.2). The space is rendered, not timed: the reader scrolls through it at their own
 * pace, and the affordance is simply there when they arrive.
 *
 * Keyboard, per §3.4.2:
 *   ArrowDown / PageDown / Space  scroll — left entirely to the browser, never intercepted
 *   Enter / ArrowRight            advance, at unit end
 *   ArrowLeft / PageUp            return, at unit start
 *
 * The positional conditions matter: PageUp inside a long unit must page up, and ArrowRight
 * in the middle of a chapter must not throw the reader into the next one. Keys are also
 * ignored whenever focus is inside a form control, so the settings panel and every
 * questionnaire field keep their ordinary behaviour.
 */

import { useCallback, useEffect } from 'react';

import { COPY } from '@/config/copy';

/** Pixels of slack when deciding whether a scroll container is at its end or its start. */
const EDGE_TOLERANCE_PX = 48;

/** Focus contexts in which reading keys must not be intercepted. */
const FORM_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

/**
 * @param {Element|null} element
 * @returns {boolean}
 */
const atEnd = (element) => {
  if (!element) return true;
  return element.scrollTop + element.clientHeight >= element.scrollHeight - EDGE_TOLERANCE_PX;
};

/**
 * @param {Element|null} element
 * @returns {boolean}
 */
const atStart = (element) => {
  if (!element) return true;
  return element.scrollTop <= EDGE_TOLERANCE_PX;
};

/**
 * A unit whose closing lands in silence gets a full viewport of quiet space before the
 * affordance. High-impact units, units requiring decompression, and units that close on an
 * authored cue all qualify.
 *
 * @param {Object|null} unit
 * @returns {boolean}
 */
const landsInSilence = (unit) => {
  if (!unit) return false;
  // Only an authored cue earns the full viewport.
  //
  // This used to include every high-impact and every decompression unit, which is most of the
  // arc — so almost every page ended with a screen of nothing, and the quiet stopped meaning
  // anything because it was everywhere. §3.4.2 names the moments it is for: the locked ending
  // cues, the lines the manuscript itself closes on ("Turn the page.", "You.", "You are
  // awake."). Those are exactly the units whose last block is a `cue`.
  //
  // The others still get a breath — a generous one — just not a whole screen of it.
  const blocks = Array.isArray(unit.blocks) ? unit.blocks : [];
  return blocks[blocks.length - 1]?.type === 'cue';
};

/**
 * @param {{
 *   unit: Object|null,
 *   onAdvance: () => void,
 *   onBack: (() => void)|null,
 *   scrollRef: { current: HTMLElement|null },
 * }} props
 */
export const ContinueAffordance = ({ unit, onAdvance, onBack, scrollRef }) => {
  const onKeyDown = useCallback(
    (event) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;

      const target = event.target;
      if (target && (FORM_TAGS.has(target.tagName) || target.isContentEditable)) return;

      const container = scrollRef?.current ?? null;

      if (event.key === 'Enter' || event.key === 'ArrowRight') {
        // Enter on a focused control belongs to that control, not to the reading surface.
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
      {/*
        The breath after the last line, and nothing else.

        Previous and Continue used to sit here, in the flow, which put a control between the
        reader and the end of the page and meant the page could not end on its own words. They
        now live on the rails either side of the surface, where they are reachable without
        being read. Keyboard traversal is unchanged — the handler above still owns Enter,
        ArrowRight and ArrowLeft (§3.4.2).
      */}
      <div className="ogp-continue__silence" aria-hidden="true" />
    </div>
  );
};

export default ContinueAffordance;
