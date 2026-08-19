/**
 * S14 — Choose Your Path (master §6.2, §6.3, §8.10.3).
 *
 * Five voluntary continuation pathways. **No pathway is default, promoted, or ranked.**
 * They are serif titles with one quiet line of sub-copy each, generous vertical rhythm, all
 * at identical weight — no cards, no shadows, no prices, no "recommended" badge, no urgency,
 * no countdown, no social proof. Leaving is not among them and is not argued with: the
 * reader's place is kept on the device, so closing the tab costs nothing.
 *
 * S14 is a full state of the continuous application, not a modal or an overlay: selecting a
 * pathway opens its flow *in place*, and the flow's back control returns to the list. No
 * hard page reload happens at any point.
 *
 * `PathwaySelected` fires once per selection, carrying only the stable internal slug — the
 * one and only event payload key the contract permits for it. The family pathway's slug is
 * `become_family`; its visible label is the locked phrase, and the interface never says
 * "member" or "membership" anywhere on this screen.
 *
 * Fallback (§6.2): if the pathway list could not be built the two zero-dependency pathways
 * still render, because `pathwaysData` is static configuration and cannot fail — the reader
 * is never trapped on this screen.
 */

import { useCallback, useState } from 'react';

import { COPY } from '@/config/copy';
import { PATHWAYS } from '@/config/pathwaysData';
import { useReading } from '@/context/ReadingProvider';
import { EVENTS } from '@/experience/states';
import { useExperience } from '@/experience/ExperienceProvider';
import { emit as emitEvent } from '@/services/events';

import { ContinueReading } from '@/components/dom/pathways/ContinueReading';
import { ContributeFlow } from '@/components/dom/pathways/ContributeFlow';
import { FamilyFlow } from '@/components/dom/pathways/FamilyFlow';
import { HardcoverFlow } from '@/components/dom/pathways/HardcoverFlow';
import { ShareFlow } from '@/components/dom/pathways/ShareFlow';

/**
 * @param {{ slug: string, onBack: () => void }} props
 */
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

  /**
   * Read the Opening Arc again, from the beginning.
   *
   * Deliberately **not** another pathway. §6.2 forbids ranking or promoting any of them;
   * adding one would change the listed set. This is a quiet control beneath them, at chrome
   * weight — the way back into the work, not a competing destination.
   *
   * Both records are cleared, because they are separate by design (§3.9): the machine's
   * checkpoint, so the opening plays rather than the arc resuming at its end, and the reading
   * position, so the manuscript starts at the first unit rather than the last one read. The
   * reader's marks survive both — those are their own annotations, not a position, and
   * discarding what someone wrote down because they chose to read again would be a strange
   * way to reward it.
   */
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

            {/* Beneath the list, at chrome weight, with a rule between: a way back into the
                reading rather than another thing to choose between. */}
            <div className="ogp-choose-path__again">
              <button type="button" className="ogp-affordance" onClick={readAgain}>
                {COPY.PATHWAYS.READ_AGAIN}
              </button>
              <p className="ogp-choose-path__again-note">{COPY.PATHWAYS.READ_AGAIN_NOTE}</p>
            </div>
          </>
        )}
      </div>
    </section>
  );
};

export default ChoosePath;
