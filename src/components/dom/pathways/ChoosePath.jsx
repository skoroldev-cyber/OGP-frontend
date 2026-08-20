import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';

import { COPY } from '@/config/copy';
import { FLAGS } from '@/config/env';
import { PATHWAYS } from '@/config/pathwaysData';
import { useReading } from '@/context/ReadingProvider';
import { EVENTS } from '@/experience/states';
import { useExperience } from '@/experience/ExperienceProvider';
import { PATHS } from '@/routes';
import { emit as emitEvent } from '@/services/events';

import { ContinueReading } from '@/components/dom/pathways/ContinueReading';
import { ContributeFlow } from '@/components/dom/pathways/ContributeFlow';
import { FamilyFlow } from '@/components/dom/pathways/FamilyFlow';
import { HardcoverFlow } from '@/components/dom/pathways/HardcoverFlow';
import { ShareFlow } from '@/components/dom/pathways/ShareFlow';

const PathwayFlow = ({ slug, onBack }) => {
  switch (slug) {
    case 'continue_founders_edition':
      return <ContinueReading onBack={onBack} />;
    case 'donate_digital_transcript':
      return <ContributeFlow onBack={onBack} />;
    case 'purchase_hardcover':
      return <HardcoverFlow onBack={onBack} />;
    case 'become_family':
      return <FamilyFlow onBack={onBack} />;
    case 'share_opening_arc':
      return <ShareFlow onBack={onBack} />;
    default:
      return null;
  }
};

export const ChoosePath = () => {
  const [selected, setSelected] = useState(null);
  const { restart: restartExperience } = useExperience();
  const { restart: restartReading } = useReading();

  const choose = useCallback((slug) => {
    emitEvent(EVENTS.PATHWAY_SELECTED, { pathway: slug });
    setSelected(slug);
  }, []);

  const onBack = useCallback(() => setSelected(null), []);

  const readAgain = useCallback(() => {
    restartReading();
    restartExperience();
  }, [restartReading, restartExperience]);

  return (
    <section className="ogp-choose-path" aria-label={COPY.PATHWAYS.HEADING}>
      <div className="ogp-choose-path__column">
        {selected ? (
          <PathwayFlow slug={selected} onBack={onBack} />
        ) : (
          <>
            <h2 className="ogp-choose-path__heading">{COPY.PATHWAYS.HEADING}</h2>
            <p className="ogp-choose-path__intro">{COPY.PATHWAYS.INTRO}</p>

            <ul className="ogp-choose-path__list" role="list">
              {PATHWAYS.map((pathway) => (
                <li key={pathway.slug} className="ogp-choose-path__item">
                  <button
                    type="button"
                    className="ogp-invitation ogp-choose-path__label"
                    onClick={() => choose(pathway.slug)}
                  >
                    {pathway.label}
                  </button>
                  <p className="ogp-choose-path__sub">{pathway.subCopy}</p>
                </li>
              ))}
            </ul>

            <div className="ogp-choose-path__again">
              <button type="button" className="ogp-affordance" onClick={readAgain}>
                {COPY.PATHWAYS.READ_AGAIN}
              </button>
              <p className="ogp-choose-path__again-note">{COPY.PATHWAYS.READ_AGAIN_NOTE}</p>
            </div>

            {/* The questionnaire is not a pathway. `PathwaySelected` carries a locked enum of
                seven slugs (§6.3), asserted in the backend event catalog, and none of them is
                this — so it is offered the way "read again" is: below the seven, weighted as
                the aside it is, and emitting nothing. Beta builds only. */}
            {FLAGS.betaMode && (
              <div className="ogp-choose-path__again">
                <Link className="ogp-affordance" to={PATHS.TEST_QUESTIONNAIRE}>
                  {COPY.PATHWAYS.QUESTIONNAIRE}
                </Link>
                <p className="ogp-choose-path__again-note">
                  {COPY.PATHWAYS.QUESTIONNAIRE_NOTE}
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
};

export default ChoosePath;
