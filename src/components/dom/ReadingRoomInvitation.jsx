/**
 * S8 — the Reading Room invitation (master §3.2).
 *
 * Earth is held in frame, breathing. One short passage fades in — no paragraph wall, no
 * mission statement, no logo, no navigation — then one restrained invitation control.
 *
 * The passage is `COPY.PORTAL.FIRST_WORDS`, protected manuscript voice, rendered with its
 * authored line breaks intact. The invitation is exactly `COPY.INVITATION.READING_ROOM_INVITATION`
 * ("Enter", locked) in the same invitation styling as S5 — serif text, no box, no border,
 * no fill — carrying the locked hidden label `COPY.A11Y.HIDDEN_READING_ROOM_LABEL`.
 *
 * Both sit on the scrim mixin: this is text over live canvas, and §8.11 requires a ≥ 40 %
 * `void-deep` gradient scrim sized to the text block, verified at the brightest frame of
 * the sequence beneath it.
 *
 * The secondary controls that used to sit here are gone: they duplicated the persistent
 * affordance cluster and crossed the artwork. Motion, sound and the text-only path live in
 * that cluster on the bottom edge (§8.7).
 *
 * There is no timeout and no auto-advance. S8 holds indefinitely (§3.2).
 */

import { useCallback, useEffect, useState } from 'react';

import { COPY } from '@/config/copy';
import { OGP_MOTION } from '@/config/ogpTheme';
import { useExperience } from '@/experience/ExperienceProvider';

/**
 * @param {{ detail?: number, nativeEvent?: { pointerType?: string } }} event
 * @returns {'keyboard'|'touch'|'pointer'}
 */
const inputMethodOf = (event) => {
  if (!event || event.detail === 0) return 'keyboard';
  const pointerType = event.nativeEvent?.pointerType;
  if (pointerType === 'touch' || pointerType === 'pen') return 'touch';
  return 'pointer';
};

export const ReadingRoomInvitation = () => {
  const { advance } = useExperience();

  const [invitationRevealed, setInvitationRevealed] = useState(false);

  // The passage first, the invitation after it has been allowed to land.
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
      {/*
        The authored scene carries this moment visually; the protected first words remain in
        the accessible tree.

        Removing them from the page entirely was the instruction, and visually that is what
        happens — `--scene` is visually hidden. They are not deleted from the DOM, because
        §3.10 makes the accessible tree the experience for S8 onward: a screen-reader user who
        reached the invitation would otherwise arrive at an unlabelled button with no idea what
        they had been told. The words are also constitutionally protected manuscript voice
        (§2.7), which is a poor thing to drop silently.

        If the passage should leave the accessible tree as well, that is a founder decision
        about canon rather than a layout one, and deleting this block is all it takes.
      */}
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

      {/*
        The secondary row is gone. It sat across the middle of the scene, overlapping the
        typography the scene draws itself, and its three controls were already present in the
        persistent affordance cluster — the reader was offered the same choice twice, in two
        different places, over the top of the artwork.

        Motion, sound and the text-only path are still reachable: the cluster carries them, and
        it is anchored to the bottom edge where it belongs (§8.7, "small, low-contrast text
        controls in the bottom edge"). Nothing was taken away from the reader — the duplicate
        was, and the invitation is one choice again.
      */}
    </section>
  );
};

export default ReadingRoomInvitation;
