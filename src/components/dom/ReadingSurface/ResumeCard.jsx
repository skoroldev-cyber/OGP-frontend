/**
 * Resume — offered, never forced (master §3.8.2).
 *
 * "A returning reader does not start over." The card states the fact and gives two equal
 * choices: `COPY.RESUME.CONTINUE` and `COPY.RESUME.RESTART`. Neither is default, neither is
 * emphasised, and ignoring both is a complete answer — scrolling on simply reads from where
 * the reader is.
 *
 * Anti-compulsion is locked doctrine and is enforced by absence: there are no
 * notifications, no reminder emails, no re-engagement mechanics, no "you left off 3 days
 * ago", no streak, no percentage complete. "The reason to return should be unfinished
 * meaning, not engineered compulsion."
 *
 * "Begin again from the start" clears the kept place after the reader chooses it — nothing
 * is retained silently.
 */

import { COPY } from '@/config/copy';

/**
 * @param {{ onContinue: () => void, onRestart: () => void }} props
 */
export const ResumeCard = ({ onContinue, onRestart }) => (
  <section className="ogp-resume-card" aria-label={COPY.RESUME.CARD}>
    <p className="ogp-resume-card__text">{COPY.RESUME.CARD}</p>

    <div className="ogp-resume-card__actions">
      <button type="button" className="ogp-invitation ogp-resume-card__action" onClick={onContinue}>
        {COPY.RESUME.CONTINUE}
      </button>
      <button type="button" className="ogp-invitation ogp-resume-card__action" onClick={onRestart}>
        {COPY.RESUME.RESTART}
      </button>
    </div>
  </section>
);

export default ResumeCard;
