import { useCallback } from 'react';

import { COPY } from '@/config/copy';
import { STATES, stateIndex } from '@/experience/states';
import { useExperience } from '@/experience/ExperienceProvider';

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
