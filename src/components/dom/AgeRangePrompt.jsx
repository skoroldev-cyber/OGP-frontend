import { useCallback } from 'react';

import { COPY } from '@/config/copy';
import { FLAGS } from '@/config/env';
import { useExperience } from '@/experience/ExperienceProvider';

export const AgeRangePrompt = () => {
  const { setAgeBand, advance } = useExperience();

  const choose = useCallback(
    (band) => {
      setAgeBand(band);
      advance({ inputMethod: 'pointer' });
    },
    [setAgeBand, advance],
  );

  const decline = useCallback(() => {
    setAgeBand(null);
    advance({ inputMethod: 'pointer' });
  }, [setAgeBand, advance]);

  if (!FLAGS.ageLayerEnabled) return null;

  return (
    <section className="ogp-age-prompt" aria-labelledby="ogp-age-prompt-message">
      <div className="ogp-age-prompt__column">
        <p className="ogp-age-prompt__message" id="ogp-age-prompt-message">
          {COPY.AGE.ENTRY_MESSAGE}
        </p>

        <fieldset className="ogp-age-prompt__choices">
          <legend className="ogp-age-prompt__prompt">{COPY.AGE.PROMPT_LONG}</legend>

          <ul className="ogp-age-prompt__list" role="list">
            {COPY.AGE.BANDS.map((band) => (
              <li key={band}>
                <button
                  type="button"
                  className="ogp-invitation ogp-age-prompt__band"
                  onClick={() => choose(band)}
                >
                  {band}
                </button>
              </li>
            ))}
          </ul>
        </fieldset>

        <button type="button" className="ogp-affordance ogp-age-prompt__decline" onClick={decline}>
          {COPY.AGE.DECLINE}
        </button>

        <p className="ogp-age-prompt__privacy">{COPY.AGE.PRIVACY_STATEMENT}</p>
      </div>
    </section>
  );
};

export default AgeRangePrompt;
