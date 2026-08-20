import { useCallback, useEffect, useRef, useState } from 'react';

import { COPY } from '@/config/copy';
import { OGP_MOTION } from '@/config/ogpTheme';
import { STATES } from '@/experience/states';
import { useExperience } from '@/experience/ExperienceProvider';

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
