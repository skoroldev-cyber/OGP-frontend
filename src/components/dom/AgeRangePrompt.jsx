/**
 * S9 — Phase 1B age calibration (master §3.3, §4, §8.10.4).
 *
 * Rendered ONLY when `FLAGS.ageLayerEnabled`. It ships OFF: only `full_manuscript` has
 * certified text today, so by default S9 settles straight into S10 and this screen never
 * exists. The flag check is repeated here rather than trusted to the caller, because a
 * screen that routes readers to uncertified renderings must not be one import away from
 * appearing.
 *
 * The three locked strings are rendered verbatim and in full:
 *   `COPY.AGE.ENTRY_MESSAGE` · `COPY.AGE.PROMPT_LONG` · `COPY.AGE.PRIVACY_STATEMENT`
 * The privacy statement is displayed *with* the prompt — never behind a link, never in a
 * tooltip, never smaller than the options it qualifies.
 *
 * Six ranges as quiet serif choices, plus a no-answer path. Every route ends in a content
 * layer: `contentLayerForAgeBand` maps the six bands verbatim, and no answer maps to
 * `full_manuscript`.
 *
 * **NO gender question. NO birthdate field. Session state only** — the band is set on the
 * machine context, never sent in an event (the event whitelist has no slot for it) and
 * never joined to a profile.
 */

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
    // The no-answer path. `contentLayerForAgeBand(null)` resolves to `full_manuscript`.
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
