/**
 * The Beta Test Questionnaire as reached from inside the reading room (master §5.8, §3.13).
 *
 * S13 mounts this after "Continue to Observations", and from nowhere else: the instrument
 * says "Please read the Opening Arc without stopping to edit", so no feedback surface exists
 * mid-read. That ordering is enforced here, by what is mounted where, rather than by the
 * server — which cannot observe a reading that happened in a PDF (see
 * `modules/feedback/routes.js`).
 *
 * The instrument itself, and every rule about how it is answered, lives in
 * `QuestionnaireForm`, shared with the standalone page at `/test-questionnaire`. What this
 * file contributes is the two facts that are true only in the reading room: the reviewer read
 * it here, so the reading format defaults to `immersive room`; and there is somewhere to go
 * afterwards, so a way onward is offered once the answers are in.
 */

import { COPY } from '@/config/copy';
import { QuestionnaireForm } from '@/components/dom/questionnaire/QuestionnaireForm';

/**
 * @param {{ onComplete?: () => void }} props The way onward, offered after submission.
 * @returns {import('react').ReactElement} The instrument.
 */
export const Questionnaire = ({ onComplete }) => (
  <section className="ogp-questionnaire" aria-label={COPY.QUESTIONNAIRE.TITLE}>
    <QuestionnaireForm
      readingFormat={COPY.QUESTIONNAIRE.READING_FORMAT_DEFAULT}
      onComplete={onComplete}
    />
  </section>
);

export default Questionnaire;
