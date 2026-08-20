import { COPY } from '@/config/copy';

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
