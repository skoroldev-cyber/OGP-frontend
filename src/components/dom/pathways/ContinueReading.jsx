/**
 * S14 pathway 1 — Continue the Founder's Edition (master §6.3, §3.5.3).
 *
 * The manuscript continues beyond the Opening Arc into the certified full manuscript. The
 * current candidate — Founders Edition v33.1 — is explicitly a **"Final Certification
 * Candidate — Not Yet Certified"**: certification requires the Visionary Architect's textual
 * approval plus the publication fact-check, evidence certification and legal review.
 *
 * So this pathway tells the reader the truth and nothing more: their place is kept, and the
 * continuation opens here when the certified edition is published. **No waitlist, no email
 * capture, no "notify me", no countdown, no teaser.** No payment, no account — this pathway
 * has no workflow class at all, and gaining nothing from it must cost the reader nothing.
 *
 * When the continuation release exists, this component is where it is mounted: the reader
 * returns to the Reading Room and the manuscript resumes. Nothing about that later change
 * touches the six other pathways.
 */

import { COPY } from '@/config/copy';

/**
 * @param {{ onBack: () => void }} props
 */
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
