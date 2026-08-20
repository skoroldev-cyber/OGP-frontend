import { COPY } from '@/config/copy';
import { QuestionnaireForm } from '@/components/dom/questionnaire/QuestionnaireForm';

export const Questionnaire = ({ onComplete }) => (
  <section className="ogp-questionnaire" aria-label={COPY.QUESTIONNAIRE.TITLE}>
    <QuestionnaireForm
      readingFormat={COPY.QUESTIONNAIRE.READING_FORMAT_DEFAULT}
      onComplete={onComplete}
    />
  </section>
);

export default Questionnaire;
