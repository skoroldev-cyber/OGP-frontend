/**
 * The mandatory affordances — live from S1 onward (BUILD_CONTRACT §0.5, master §2.10, §8.7).
 *
 * Three small, low-emphasis text controls at the bottom edge, in `read-text-dim`:
 *
 *   `Skip the opening` · `Continue in silence` · `Sound`
 *
 * `Reduce motion` used to sit second in that row and is gone. One press wrote `reduced` to
 * this device and every visit afterwards rendered the authored scenes as a single settled
 * frame — correct for the setting, indistinguishable from a broken threshold for anyone who
 * did not know they had pressed it. Motion is now Full for everyone; see `ExperienceProvider`.
 *
 * Laws this component exists to keep:
 *
 *  - **Never removed.** They fade to 40 % opacity after four idle seconds and return to
 *    FULL contrast on any focus, hover or key press — they are never hidden, never
 *    collapsed behind a menu, and never conditional on scroll position (§8.7).
 *  - **Keyboard reachable, and the first Tab restores full contrast.** The idle fade is
 *    cleared by `focusin` as well as by pointer movement, so a keyboard-only reader never
 *    reads a 40 %-opacity control (§8.11 "idle-faded controls … restore to full contrast
 *    on any input").
 *  - **Skip is never punishing.** It lands the reader in the same world — the invitation
 *    over the still Earth composition — with continuity preserved and the bypassed
 *    canonical events back-emitted (§2.10, C-006). The control is withdrawn only once the
 *    reader is at or past that landing point, because at that point it would do nothing.
 *  - **Silence is a complete experience**, not a fallback. "Continue in silence" is an
 *    affirmative choice, and it is pressed-state-visible so a reader can see that silence
 *    is what they have.
 *
 * No labels are invented here: every string is `COPY.AFFORDANCES.*`.
 */

import { useCallback, useEffect, useState } from 'react';

import { COPY } from '@/config/copy';
import { OGP_TIMING } from '@/config/ogpTheme';
import { useAudio } from '@/context/AudioProvider';
import { STATES, stateIndex } from '@/experience/states';
import { useExperience } from '@/experience/ExperienceProvider';

import { AudioOptIn } from '@/components/dom/AudioOptIn';

/** Any of these wakes the cluster back to full contrast. */
const WAKE_EVENTS = ['pointermove', 'pointerdown', 'keydown', 'focusin', 'touchstart'];

export const AccessibilityControls = () => {
  const { state, skip } = useExperience();
  const { audioEnabled, disableAudio } = useAudio();

  const [idle, setIdle] = useState(false);

  // Idle fade. The timer is the only thing that ever sets `idle`; every input clears it.
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

  // Skip's landing point is S8. Offering it at or beyond that point would be offering the
  // reader a control that does nothing, which is worse than not offering it.
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
