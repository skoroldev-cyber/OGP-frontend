import { RATING_VALUES } from '@/services/api';
import { COPY } from '@/config/copy';

export const emptyAnswer = () => ({ text: '', rating: null, values: [] });

export const isAnswered = (answer) =>
  Boolean(
    (typeof answer?.text === 'string' && answer.text.trim() !== '') ||
      Number.isInteger(answer?.rating) ||
      (Array.isArray(answer?.values) && answer.values.length > 0),
  );

const RATED_KINDS = new Set(['scale', 'rated_text']);

const CHOICE_KINDS = new Set(['single_choice', 'multi_choice', 'chips_text']);

const LINE_KINDS = new Set(['short_text', 'date']);

const invitesProse = (kind) =>
  kind === 'rated_text' ||
  kind === 'chips_text' ||
  kind === 'open_text' ||
  kind === 'multi_choice' ||
  !(RATED_KINDS.has(kind) || CHOICE_KINDS.has(kind) || LINE_KINDS.has(kind));

const ClearControl = ({ label, onClear }) => (
  <button type="button" className="ogp-questionnaire__clear" onClick={onClear}>
    {label}
  </button>
);

// The five sit in one connected track rather than as five separate boxes: the radio dot is
// left to the assistive layer and the choice is carried visually by the filled segment, so the
// scale reads as a scale instead of as a form. The inputs stay native radios — arrow keys,
// the shared `name`, and the enclosing legend all keep working untouched.
const RatingGroup = ({ name, value, scaleLegend, onChange }) => (
  <>
    {scaleLegend ? <p className="ogp-questionnaire__legend">{scaleLegend}</p> : null}

    <div className="ogp-questionnaire__ratings">
      <div className="ogp-questionnaire__scale">
        {RATING_VALUES.map((rating) => (
          <label key={rating} className="ogp-questionnaire__rating">
            <input
              type="radio"
              name={name}
              value={rating}
              checked={value === rating}
              onChange={() => onChange(rating)}
            />
            <span>{rating}</span>
          </label>
        ))}
      </div>

      {Number.isInteger(value) ? (
        <ClearControl
          label={COPY.QUESTIONNAIRE.RATING_CLEAR}
          onClear={() => onChange(null)}
        />
      ) : null}
    </div>
  </>
);

export const QuestionField = ({ question, value, onChange }) => {
  const id = `ogp-q-${question.questionId}`;
  const legendId = `${id}-legend`;
  const proseLabelId = `${id}-text-label`;
  const answer = value ?? emptyAnswer();

  const patch = (patched) => onChange(question.questionId, { ...answer, ...patched });

  const rated = RATED_KINDS.has(question.kind);
  const choices = CHOICE_KINDS.has(question.kind) ? question.options ?? [] : [];
  const single = question.kind === 'single_choice';

  const toggle = (option) =>
    patch({
      values: answer.values.includes(option)
        ? answer.values.filter((entry) => entry !== option)
        : [...answer.values, option],
    });

  const grouped = rated || choices.length > 0;
  const Wrapper = grouped ? 'fieldset' : 'div';

  const prompt = (
    <>
      {question.label ? (
        <span className="ogp-questionnaire__name">{question.label}</span>
      ) : null}
      {question.prompt}
      {question.required ? (
        <span className="ogp-questionnaire__required"> {COPY.QUESTIONNAIRE.REQUIRED}</span>
      ) : null}
    </>
  );

  return (
    <Wrapper className="ogp-questionnaire__question">
      {grouped ? (
        <legend id={legendId} className="ogp-questionnaire__prompt">
          {prompt}
        </legend>
      ) : (
        <p id={legendId} className="ogp-questionnaire__prompt">
          {prompt}
        </p>
      )}

      {rated ? (
        <RatingGroup
          name={id}
          value={answer.rating}
          scaleLegend={question.scaleLegend}
          onChange={(rating) => patch({ rating })}
        />
      ) : null}

      {choices.length > 0 ? (
        <div className="ogp-questionnaire__chips">
          {choices.map((option) => (
            <label key={option} className="ogp-questionnaire__chip">
              <input
                type={single ? 'radio' : 'checkbox'}
                name={single ? id : undefined}
                checked={answer.values.includes(option)}
                onChange={() => (single ? patch({ values: [option] }) : toggle(option))}
              />
              <span>{option}</span>
            </label>
          ))}

          {single && answer.values.length > 0 ? (
            <ClearControl
              label={COPY.QUESTIONNAIRE.CHOICE_CLEAR}
              onClear={() => patch({ values: [] })}
            />
          ) : null}
        </div>
      ) : null}

      {LINE_KINDS.has(question.kind) ? (
        <div className="ogp-questionnaire__field">
          <input
            id={`${id}-text`}
            type={question.kind === 'date' ? 'date' : 'text'}
            aria-labelledby={legendId}
            value={answer.text}
            onChange={(event) => patch({ text: event.target.value })}
          />
        </div>
      ) : null}

      {invitesProse(question.kind) ? (
        <label className="ogp-questionnaire__field" htmlFor={`${id}-text`}>
          <span id={proseLabelId}>
            {question.kind === 'open_text'
              ? COPY.QUESTIONNAIRE.RESPONSE_LABEL
              : COPY.QUESTIONNAIRE.EXPLANATION_LABEL}
          </span>
          <textarea
            id={`${id}-text`}
            rows={question.kind === 'open_text' ? 5 : 4}
            aria-labelledby={`${legendId} ${proseLabelId}`}
            value={answer.text}
            onChange={(event) => patch({ text: event.target.value })}
          />
        </label>
      ) : null}
    </Wrapper>
  );
};

export default QuestionField;
