/**
 * The only navigation this application has (master §7.3, §8.7, §3.9).
 *
 * **Zero navigation before S9.** The first-screen law forbids it: no nav, headline,
 * donation ask, org description or social links exist anywhere in S0–S8 (§8.10.1). This
 * component is mounted only from S9 onward, and even then it is one unobtrusive cluster:
 *
 *   the mark and the name, the reading position beneath them
 *   · sound · reading settings · share · (from S13) the pathways
 *
 * The identity appears here and nowhere earlier for the same reason the navigation does. §8.10.1
 * keeps the organisation off the first screen entirely; by S9 the reader has crossed a threshold
 * on purpose and is inside a named room, and withholding whose room it is stops being restraint
 * and starts being evasive.
 *
 * **During reading all chrome recedes to 0.25 opacity and restores on pointer or keyboard
 * intent** (§8.7). It is never removed and nothing here is ever blocking — no interface
 * traps. The receded state is opacity only; the controls stay in the tab order, and the
 * first Tab restores full contrast, so a keyboard reader never has to find a 25 %-opacity
 * control.
 *
 * The settings panel is a disclosure, not a modal — there are no modals in S8–S13. While it
 * is open the manuscript column is marked `inert` so a keyboard or screen-reader user
 * cannot wander into text they cannot see, focus is kept inside the panel, and Escape
 * always closes it, as does a press outside it. Containment plus a guaranteed exit is what
 * separates a disclosure from a trap.
 *
 * Leaving needs no control of its own. The reader's place is already kept on the device, so
 * closing the tab loses nothing and there is nothing here to say goodbye to: no exit-intent
 * prompt, no "are you sure", no retention pattern, no reminder (§6.3, anti-compulsion
 * doctrine).
 */

import { useCallback, useEffect, useState } from 'react';

import { COPY } from '@/config/copy';
import { OGP_TIMING } from '@/config/ogpTheme';
import { useReading } from '@/context/ReadingProvider';
import { STATES, stateIndex } from '@/experience/states';
import { useExperience } from '@/experience/ExperienceProvider';

import { AudioOptIn } from '@/components/dom/AudioOptIn';
import {
  ReadingSettings,
  settingsToggleProps,
} from '@/components/dom/ReadingSurface/ReadingSettings';
import { ShareChannels } from '@/components/dom/ShareChannels';
import { useNoteComposerOpen } from '@/components/dom/noteComposerState';

/** Anything here counts as pointer or keyboard intent and restores full contrast. */
const WAKE_EVENTS = ['pointermove', 'pointerdown', 'keydown', 'focusin', 'touchstart'];

/** The manuscript column, which is what `inert` is applied to while settings are open. */
const MANUSCRIPT_SELECTOR = '.ogp-reading-surface__scroll';

/**
 * The woven mark, derived from the commissioned master by `scripts/build-logo-mark.mjs`.
 * The master is 1272 px and 2.1 MB; these are the two sizes it is actually worn at.
 */
const LOGO_MARK = '/logo/main-logo-64.png';
const LOGO_MARK_2X = '/logo/main-logo-128.png';

export const NavigationMinimal = () => {
  const { state, advance } = useExperience();
  const { unit } = useReading();

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [receded, setReceded] = useState(false);

  const noteOpen = useNoteComposerOpen();

  const index = state ? stateIndex(state) : -1;
  const reading =
    index >= stateIndex(STATES.S10_OPENING_ARC_READING) &&
    index <= stateIndex(STATES.S12_CONTINUE_READING);

  /**
   * Withdrawn while the reader is writing a note.
   *
   * This bar is fixed above the composer, so the button was clickable straight through it —
   * and pressing it advanced to S14, unmounting the form and taking the unsent writing off
   * the screen with no confirmation and no way back (S14 declares no transitions). The
   * composer offers its own two exits, and closing it returns here with the pathways one
   * click away, so nothing becomes unreachable: it becomes reachable a moment later, after
   * the reader has decided what to do with what they wrote.
   */
  const pathwaysAvailable = index >= stateIndex(STATES.S13_OPENING_ARC_COMPLETE) && !noteOpen;

  /* ---------------------------------------------------------------- */
  /* Recede and restore                                                */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    if (!reading) return undefined;

    let timer = null;

    const schedule = () => {
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(() => setReceded(true), OGP_TIMING.affordanceIdleFadeMs);
    };

    const wake = () => {
      setReceded(false);
      schedule();
    };

    for (const name of WAKE_EVENTS) window.addEventListener(name, wake, { passive: true });
    schedule();

    return () => {
      if (timer) window.clearTimeout(timer);
      for (const name of WAKE_EVENTS) window.removeEventListener(name, wake);
    };
  }, [reading]);

  /* ---------------------------------------------------------------- */
  /* The settings disclosure                                           */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    if (!settingsOpen || typeof document === 'undefined') return undefined;

    const manuscript = document.querySelector(MANUSCRIPT_SELECTOR);
    if (manuscript) {
      manuscript.inert = true;
      manuscript.setAttribute('inert', '');
    }

    return () => {
      if (!manuscript) return;
      manuscript.inert = false;
      manuscript.removeAttribute('inert');
    };
  }, [settingsOpen]);

  const openSettings = useCallback(() => setSettingsOpen(true), []);
  const closeSettings = useCallback(() => setSettingsOpen(false), []);

  const onPathways = useCallback(() => advance({ inputMethod: 'pointer' }), [advance]);

  return (
    <>
      <nav
        className="ogp-chrome ogp-nav-minimal"
        aria-label={COPY.NAV.LABEL}
        data-receded={reading && receded && !settingsOpen ? 'true' : 'false'}
      >
        {/*
          Identity, then place. The mark and the name are fixed; the folio beneath them is the
          only part that moves, so the reader always knows both whose room this is and where in
          it they are.

          It is deliberately not a link. §7.3 allows this application exactly one navigation
          cluster and the doctrine on leaving is that it needs no control of its own — a logo
          wired to a homepage would be a way out of the manuscript dressed as a brand, and the
          reader's place is already kept on the device. So this is identity, not a destination.

          The mark is decorative in the accessibility tree: the name is written out immediately
          beside it, and announcing both would say the organisation twice.
        */}
        <div className="ogp-nav-minimal__identity">
          <img
            className="ogp-nav-minimal__mark"
            src={LOGO_MARK}
            srcSet={`${LOGO_MARK} 1x, ${LOGO_MARK_2X} 2x`}
            width="64"
            height="64"
            alt=""
            aria-hidden="true"
            draggable="false"
            decoding="async"
          />

          <span className="ogp-nav-minimal__identity-text">
            <span className="ogp-nav-minimal__wordmark">{COPY.META.ORGANISATION}</span>

            {/* Reading position: the authored landmark, never a number or a percentage. */}
            {unit?.canonicalTitle && (
              <span className="ogp-nav-minimal__folio" aria-label={COPY.READING.POSITION_LABEL}>
                {unit.canonicalTitle}
              </span>
            )}
          </span>
        </div>

        <div className="ogp-nav-minimal__controls">
          <AudioOptIn variant="affordance" />

          <button
            type="button"
            className="ogp-affordance"
            aria-expanded={settingsOpen}
            onClick={settingsOpen ? closeSettings : openSettings}
            {...settingsToggleProps}
          >
            {COPY.NAV.SETTINGS}
          </button>

          <ShareChannels variant="disclosure" />

          {pathwaysAvailable && (
            <button type="button" className="ogp-affordance" onClick={onPathways}>
              {COPY.NAV.PATHS}
            </button>
          )}
        </div>
      </nav>

      <ReadingSettings open={settingsOpen} onClose={closeSettings} />
    </>
  );
};

export default NavigationMinimal;
