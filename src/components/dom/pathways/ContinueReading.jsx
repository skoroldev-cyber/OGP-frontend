import { COPY } from '@/config/copy';

export const ContinueReading = ({ onBack }) => (
  <section
    className="ogp-continue-reading"
    aria-label={COPY.PATHWAYS.ITEMS.continue_founders_edition.label}
  >
    <p className="ogp-continue-reading__text">
      {COPY.PATHWAYS.ITEMS.continue_founders_edition.subCopy}
    </p>
    <p className="ogp-continue-reading__text">{COPY.CONTINUE_EDITION.NOTICE}</p>

    <button type="button" className="ogp-affordance" onClick={onBack}>
      {COPY.A11Y.BACK}
    </button>
  </section>
);

export default ContinueReading;
