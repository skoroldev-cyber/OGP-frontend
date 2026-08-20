import { useCallback, useEffect, useState } from 'react';

import { COPY } from '@/config/copy';
import { OGP_TIMING } from '@/config/ogpTheme';
import { useAudio } from '@/context/AudioProvider';
import { STATES, stateIndex } from '@/experience/states';
import { useExperience } from '@/experience/ExperienceProvider';

import { AudioOptIn } from '@/components/dom/AudioOptIn';

const WAKE_EVENTS = ['pointermove', 'pointerdown', 'keydown', 'focusin', 'touchstart'];

export const AccessibilityControls = () => {
  const { state, skip } = useExperience();
  const { audioEnabled, disableAudio } = useAudio();

  const [idle, setIdle] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    let timer = null;

    const schedule = () => {
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(() => setIdle(true), OGP_TIMING.affordanceIdleFadeMs);
    };

    const wake = () => {
      setIdle(false);
      schedule();
    };

    for (const name of WAKE_EVENTS) {
      window.addEventListener(name, wake, { passive: true });
    }
    schedule();

    return () => {
      if (timer) window.clearTimeout(timer);
      for (const name of WAKE_EVENTS) window.removeEventListener(name, wake);
    };
  }, []);

  const onSkip = useCallback(() => skip({ inputMethod: 'keyboard' }), [skip]);

  const onContinueInSilence = useCallback(() => {
    void disableAudio();
  }, [disableAudio]);

  const skipAvailable =
    Boolean(state) && stateIndex(state) < stateIndex(STATES.S8_READING_ROOM_INVITATION);

  return (
    <div
      className="ogp-affordances ogp-accessibility-controls"
      role="group"
      aria-label={COPY.AFFORDANCES.GROUP_LABEL}
      data-idle={idle ? 'true' : 'false'}
    >
      {skipAvailable && (
        <button type="button" className="ogp-affordance" onClick={onSkip}>
          {COPY.AFFORDANCES.SKIP}
        </button>
      )}

      <button
        type="button"
        className="ogp-affordance"
        aria-pressed={!audioEnabled}
        onClick={onContinueInSilence}
      >
        {COPY.AFFORDANCES.CONTINUE_IN_SILENCE}
      </button>

      <AudioOptIn variant="affordance" />
    </div>
  );
};

export default AccessibilityControls;
