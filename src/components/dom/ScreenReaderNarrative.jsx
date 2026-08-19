/**
 * The parallel accessible narrative for S1–S8 (master §2.10, §3.10; itom
 * `ScreenReaderOverlay`, promoted).
 *
 * The canvas is `aria-hidden` decoration. During the opening there is nothing else — no
 * visible language before ~70 s — so without this component a screen-reader user would
 * experience ninety seconds of nothing at all. This region announces, politely, what is
 * present: not marketing, not a description of the artwork, a plain statement of the state.
 *
 * Politeness is a rule, not a preference: an `assertive` region interrupts mid-sentence,
 * which is the aural form of the popups this experience forbids.
 *
 * **It steps back from S10.** From the Reading Room onward the manuscript DOM *is* the
 * accessible surface (§3.10 — "for S8–S13 the accessible tree IS the experience"), so a
 * parallel narrative would be a second, competing voice over the work itself.
 *
 * The parallel invitation resolves an ambiguity between two sources. §2.10 requires "the
 * passage as real text, the invitation as a real `<button>` with the locked hidden label";
 * BUILD_CONTRACT §1 places that passage and that button at S8, where
 * `ReadingRoomInvitation` renders both as ordinary, real, focusable DOM. So this component
 * renders them only for S1–S7 — the span in which no visible invitation exists yet — and
 * hands over at S8 rather than duplicating a control the reader already has. During that
 * span the button carries `COPY.A11Y.HIDDEN_ENTRY_LABEL` and performs `skip`, which is the
 * transition that lands the reader at the invitation with continuity preserved.
 */

import { useCallback } from 'react';

import { COPY } from '@/config/copy';
import { STATES, stateIndex } from '@/experience/states';
import { useExperience } from '@/experience/ExperienceProvider';

/** Machine state → the plain sentence describing it. All copy, no invention. */
const NARRATIVE_FOR_STATE = {
  [STATES.S1_DARKNESS]: COPY.NARRATIVE.S1,
  [STATES.S2_DISTANT_SPECK]: COPY.NARRATIVE.S2,
  [STATES.S3_LOGO_MANIFESTATION]: COPY.NARRATIVE.S3,
  [STATES.S4_LIVING_WEAVE]: COPY.NARRATIVE.S4,
  [STATES.S5_PORTAL_ENTRY]: COPY.NARRATIVE.S5,
  [STATES.S6_WEAVE_PASSAGE]: COPY.NARRATIVE.S6,
  [STATES.S7_EARTH_REVEAL]: COPY.NARRATIVE.S7,
  [STATES.S8_READING_ROOM_INVITATION]: COPY.NARRATIVE.S8,
};

export const ScreenReaderNarrative = () => {
  const { state, skip } = useExperience();

  const onEnter = useCallback(() => skip({ inputMethod: 'assistive' }), [skip]);

  // From S10 the manuscript DOM is itself the accessible surface; this steps back entirely.
  if (!state || stateIndex(state) >= stateIndex(STATES.S9_READING_ROOM_INIT)) return null;

  const narrative = NARRATIVE_FOR_STATE[state] ?? '';
  const beforeInvitation = stateIndex(state) < stateIndex(STATES.S8_READING_ROOM_INVITATION);

  return (
    <div className="ogp-sr-narrative">
      <div
        className="ogp-visually-hidden"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        aria-label={COPY.A11Y.NARRATIVE_REGION_LABEL}
      >
        {narrative}
      </div>

      {beforeInvitation && (
        <section
          className="ogp-sr-narrative__passage"
          aria-label={COPY.A11Y.OPENING_PASSAGE_LABEL}
        >
          <p className="ogp-visually-hidden">
            {COPY.PORTAL.FIRST_WORDS.map((line, index) => (
              <span key={line}>
                {index > 0 && <br />}
                {line}
              </span>
            ))}
          </p>

          {/*
            Visually hidden until focused, so a sighted keyboard reader is never sent to a
            control they cannot see, and a screen-reader reader never has to wait out the
            cinematic to reach the Reading Room.
          */}
          <button
            type="button"
            className="ogp-sr-narrative__action"
            aria-label={COPY.A11Y.HIDDEN_ENTRY_LABEL}
            onClick={onEnter}
          >
            {COPY.OPENING.THRESHOLD_ACTION}
          </button>
        </section>
      )}
    </div>
  );
};

export default ScreenReaderNarrative;
