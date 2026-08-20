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

const WAKE_EVENTS = ['pointermove', 'pointerdown', 'keydown', 'focusin', 'touchstart'];

const MANUSCRIPT_SELECTOR = '.ogp-reading-surface__scroll';

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

  const pathwaysAvailable = index >= stateIndex(STATES.S13_OPENING_ARC_COMPLETE) && !noteOpen;

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
