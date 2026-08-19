/**
 * S4 / S5 — the threshold.
 *
 * `COPY.OPENING.THRESHOLD_QUESTION` is set in the manuscript serif, warm off-white or muted
 * gold, centred beneath the weave, with **no paragraph copy** beside it (§8.4.2, §8.10.1).
 * After a pause the threshold action `COPY.OPENING.THRESHOLD_ACTION` settles beneath it.
 *
 * **It is an invitation, not a button.** No box, no border, no fill — serif text whose
 * hover/focus response is a subtle glow (`gold-core` text-shadow at ≤ 8 px blur), a slight
 * underline, or a gentle light response (§8.7). It is nevertheless a real `<button>`,
 * carrying `COPY.A11Y.HIDDEN_ENTRY_LABEL` as its accessible name and a visible focus ring
 * that is never suppressed.
 *
 * **The state holds indefinitely.** There is no timeout, no auto-advance, and no
 * attention-recapture of any kind: "The experience stops and waits. It does not force the
 * visitor onward" (§2.4.6). The one timer in this file reveals the action; it never
 * advances the machine.
 *
 * Label placement follows BUILD_CONTRACT §1: "Begin the Journey" is the S5 threshold
 * action, shown at S4 beneath the question, and "Enter" is the separate S8 Reading Room
 * invitation. They are not competitors. (Master §2.7 records the question and this action
 * as superseded-pending-founder-lock; the contract's placement rule is what is implemented,
 * and the conflict is flagged rather than silently resolved.)
 *
 * Because the action is visible at S4 but commits at S5, a press made at S4 is *latched*:
 * the machine holds the reader's intent through its own readiness guards, and this
 * component re-offers it the instant S5 is reached. A reader's press is never dropped.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import { COPY } from '@/config/copy';
import { OGP_MOTION } from '@/config/ogpTheme';
import { STATES } from '@/experience/states';
import { useExperience } from '@/experience/ExperienceProvider';

/**
 * Which input method produced an activation, for the `PortalEntryStarted` payload
 * (BUILD_CONTRACT §3). `detail === 0` is how a keyboard-activated click identifies itself.
 *
 * @param {{ detail?: number, nativeEvent?: { pointerType?: string } }} event
 * @returns {'keyboard'|'touch'|'pointer'}
 */
const inputMethodOf = (event) => {
  if (!event || event.detail === 0) return 'keyboard';
  const pointerType = event.nativeEvent?.pointerType;
  if (pointerType === 'touch' || pointerType === 'pen') return 'touch';
  return 'pointer';
};

export const PortalInvitation = () => {
  const { state, advance } = useExperience();

  const [actionRevealed, setActionRevealed] = useState(false);
  const committed = useRef(false);

  // The pause between the question and the action. A reveal, never an advance.
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const timer = window.setTimeout(
      () => setActionRevealed(true),
      OGP_MOTION.durations.threshold * 1000,
    );
    return () => window.clearTimeout(timer);
  }, []);

  const onActivate = useCallback(
    (event) => {
      committed.current = true;
      advance({ inputMethod: inputMethodOf(event) });
    },
    [advance],
  );

  // A press made at S4 is honoured the moment S5 arrives. Entering a state clears the
  // machine's intent latch, so the intent is re-offered here rather than assumed to survive.
  useEffect(() => {
    if (state !== STATES.S5_PORTAL_ENTRY) return;
    if (!committed.current) return;
    advance({});
  }, [state, advance]);

  return (
    <div className="ogp-portal-invitation">
      <p className="ogp-threshold-text ogp-portal-invitation__question">
        {COPY.OPENING.THRESHOLD_QUESTION}
      </p>

      <div
        className="ogp-portal-invitation__action"
        data-revealed={actionRevealed ? 'true' : 'false'}
      >
        <button
          type="button"
          className="ogp-invitation"
          aria-label={COPY.A11Y.HIDDEN_ENTRY_LABEL}
          onClick={onActivate}
        >
          {COPY.OPENING.THRESHOLD_ACTION}
        </button>
      </div>
    </div>
  );
};

export default PortalInvitation;
