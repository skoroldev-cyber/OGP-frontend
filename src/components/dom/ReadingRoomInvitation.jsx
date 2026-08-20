import { useCallback, useEffect, useState } from 'react';

import { COPY } from '@/config/copy';
import { OGP_MOTION } from '@/config/ogpTheme';
import { useExperience } from '@/experience/ExperienceProvider';

const inputMethodOf = (event) => {
  if (!event || event.detail === 0) return 'keyboard';
  const pointerType = event.nativeEvent?.pointerType;
  if (pointerType === 'touch' || pointerType === 'pen') return 'touch';
  return 'pointer';
};

export const ReadingRoomInvitation = () => {
  const { advance } = useExperience();

  const [invitationRevealed, setInvitationRevealed] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const timer = window.setTimeout(
      () => setInvitationRevealed(true),
      OGP_MOTION.durations.threshold * 1000,
    );
    return () => window.clearTimeout(timer);
  }, []);

  const onEnter = useCallback(
    (event) => advance({ inputMethod: inputMethodOf(event) }),
    [advance],
  );

  return (
    <section className="ogp-room-invitation ogp-overlay-passthrough" aria-label={COPY.META.READING_ROOM_NAME}>
      <p className="ogp-threshold-text ogp-room-invitation__passage ogp-room-invitation__passage--scene">
        {COPY.PORTAL.FIRST_WORDS.map((line, index) => (
          <span key={line}>
            {index > 0 && <br />}
            {line}
          </span>
        ))}
      </p>

      <div
        className="ogp-room-invitation__enter"
        data-revealed={invitationRevealed ? 'true' : 'false'}
      >
        <button
          type="button"
          className="ogp-invitation"
          aria-label={COPY.A11Y.HIDDEN_READING_ROOM_LABEL}
          onClick={onEnter}
        >
          {COPY.INVITATION.READING_ROOM_INVITATION}
        </button>
      </div>

    </section>
  );
};

export default ReadingRoomInvitation;
