/**
 * One question of the Beta Test Questionnaire (master §5.8, §8.10.4).
 *
 * **Nothing here authors a question.** The prompt, the short label, the options and the scale
 * legend all arrive from `GET /questionnaires/active`; this file decides only which control
 * a `kind` is rendered with. That separation is the whole point of the instrument being data
 * — a reworded question ships without a deploy, and a question this file has never heard of
 * still renders, as a plain textarea, rather than disappearing from the form.
 *
 * The rules the instrument imposes on every control here:
 *
 *  - **A visible label on everything.** Never a placeholder standing in for a label.
 *  - **Ratings are five plain numbered controls** with the anchor legend visible. Fixed 1–5,
 *    no other scale, no stars, no emoji, no colour ramp — it is a research instrument, not a
 *    rating widget.
 *  - **A rating can be taken back.** Radios cannot be unchecked by clicking them, so a
 *    reviewer who picks 4 by accident would be stuck reporting a 4 forever. Each rated
 *    question carries one quiet control to clear it.
 *  - **44px touch targets** throughout.
 *  - Single column, one scrollable page, in instrument order. No stepper, no wizard, no
 *    progress bar, no percentage complete.
 */

import { RATING_VALUES } from '@/services/api';
import { COPY } from '@/config/copy';

/**
 * The empty answer for a question, in the shape the wire accepts.
 *
 * One shape for every kind, so nothing downstream has to branch on kind to read an answer:
 * `text` holds prose, `rating` holds a 1–5 answer, `values` holds chosen options.
 *
 * @returns {{ text: string, rating: number|null, values: string[] }} The empty answer.
 */
export const emptyAnswer = () => ({ text: '', rating: null, values: [] });

/**
 * Whether a reviewer has put anything into an answer.
 *
 * @param {{ text?: string, rating?: number|null, values?: string[] }} [answer] The answer.
 * @returns {boolean} True when there is something to send.
 */
export const isAnswered = (answer) =>
  Boolean(
    (typeof answer?.text === 'string' && answer.text.trim() !== '') ||
      Number.isInteger(answer?.rating) ||
      (Array.isArray(answer?.values) && answer.values.length > 0),
  );

/** Kinds that carry a 1–5 rating alongside whatever else they ask for. */
const RATED_KINDS = new Set(['scale', 'rated_text']);

/** Kinds whose answer is a choice among the instrument's own options. */
const CHOICE_KINDS = new Set(['single_choice', 'multi_choice', 'chips_text']);

/** Kinds asking for one line rather than a paragraph. */
const LINE_KINDS = new Set(['short_text', 'date']);

/**
 * Whether a kind also invites an explanation in prose.
 *
 * `scale` and `single_choice` do not: the instrument asks those as a bare rating and a bare
 * choice, and adding a textarea underneath would be this file asking a question of its own.
 *
 * @param {string} kind The question kind.
 * @returns {boolean} Whether to render the explanation field.
 */
const invitesProse = (kind) =>
  kind === 'rated_text' || kind === 'chips_text' || kind === 'open_text' || kind === 'multi_choice';

/**
 * The five numbered controls, plus the way to take a rating back.
 *
 * @param {{
 *   name: string,
 *   legendId: string,
 *   value: number|null,
 *   scaleLegend: string|null,
 *   onChange: (rating: number|null) => void,
 * }} props The rating group.
 * @returns {import('react').ReactElement} The rating group.
 */
const RatingGroup = ({ name, legendId, value, scaleLegend, onChange }) => (
  <>
    {scaleLegend ? <p className="ogp-questionnaire__legend">{scaleLegend}</p> : null}

    <div className="ogp-questionnaire__ratings" role="group" aria-labelledby={legendId}>
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

      {/* Present only once there is something to undo, so the control never asks to be read
          by a reviewer who has not rated anything yet. */}
      {Number.isInteger(value) ? (
        <button
          type="button"
          className="ogp-questionnaire__clear"
          onClick={() => onChange(null)}
        >
          {COPY.QUESTIONNAIRE.RATING_CLEAR}
        </button>
      ) : null}
    </div>
  </>
);

/**
 * @param {{
 *   question: Object,
 *   value: { text: string, rating: number|null, values: string[] },
 *   onChange: (questionId: string, value: object) => void,
 * }} props The question, its answer, and the way to change it.
 * @returns {import('react').ReactElement} The rendered question.
 */
export const QuestionField = ({ question, value, onChange }) => {
  const id = `ogp-q-${question.questionId}`;
  const legendId = `${id}-legend`;
  const answer = value ?? emptyAnswer();

  /**
   * @param {object} patch The changed parts of the answer.
   * @returns {void}
   */
  const patch = (patched) => onChange(question.questionId, { ...answer, ...patched });

  const rated = RATED_KINDS.has(question.kind);
  const choices = CHOICE_KINDS.has(question.kind) ? question.options ?? [] : [];
  const single = question.kind === 'single_choice';

  /**
   * @param {string} option The option toggled.
   * @returns {void}
   */
  const toggle = (option) => {
    if (single) {
      // Selecting the chosen option again clears it. A radio cannot do that, and a reviewer
      // who answered a metadata question by accident should not be stuck with the answer.
      patch({ values: answer.values.includes(option) ? [] : [option] });
      return;
    }
    patch({
      values: answer.values.includes(option)
        ? answer.values.filter((entry) => entry !== option)
        : [...answer.values, option],
    });
  };

  // A question with a group of controls is a fieldset with a legend; a question with one
  // control is a label. Wrapping a lone textarea in a fieldset would announce a group of one.
  const grouped = rated || choices.length > 0;
  const Wrapper = grouped ? 'fieldset' : 'div';

  return (
    <Wrapper className="ogp-questionnaire__question">
      {grouped ? (
        <legend id={legendId} className="ogp-questionnaire__prompt">
          {question.label ? (
            <span className="ogp-questionnaire__name">{question.label}</span>
          ) : null}
          {question.prompt}
          {question.required ? (
            <span className="ogp-questionnaire__required"> {COPY.QUESTIONNAIRE.REQUIRED}</span>
          ) : null}
        </legend>
      ) : (
        <p className="ogp-questionnaire__prompt" id={legendId}>
          {question.label ? (
            <span className="ogp-questionnaire__name">{question.label}</span>
          ) : null}
          {question.prompt}
          {question.required ? (
            <span className="ogp-questionnaire__required"> {COPY.QUESTIONNAIRE.REQUIRED}</span>
          ) : null}
        </p>
      )}

      {rated ? (
        <RatingGroup
          name={id}
          legendId={legendId}
          value={answer.rating}
          scaleLegend={question.scaleLegend}
          onChange={(rating) => patch({ rating })}
        />
      ) : null}

      {choices.length > 0 ? (
        <div className="ogp-questionnaire__chips" role="group" aria-labelledby={legendId}>
          {choices.map((option) => (
            <label key={option} className="ogp-questionnaire__chip">
              <input
                type="checkbox"
                checked={answer.values.includes(option)}
                onChange={() => toggle(option)}
              />
              <span>{option}</span>
            </label>
          ))}
        </div>
      ) : null}

      {/* The prompt is already on the page, so the control points at it with
          `aria-labelledby` rather than repeating it in a second, hidden copy. The visible
          `<label>` stays for the click target it provides; the ARIA name wins over its text,
          which is what makes "Explanation" read as the question it explains. */}
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
          <span>
            {question.kind === 'open_text'
              ? COPY.QUESTIONNAIRE.RESPONSE_LABEL
              : COPY.QUESTIONNAIRE.EXPLANATION_LABEL}
          </span>
          <textarea
            id={`${id}-text`}
            rows={question.kind === 'open_text' ? 5 : 4}
            aria-labelledby={legendId}
            value={answer.text}
            onChange={(event) => patch({ text: event.target.value })}
          />
        </label>
      ) : null}
    </Wrapper>
  );
};

export default QuestionField;
