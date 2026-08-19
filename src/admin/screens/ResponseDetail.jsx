/**
 * One returned questionnaire, in full.
 *
 * Rendered against the instrument the answers were given to, which the route sends alongside
 * them. That is the whole point of this screen: a stored answer is a `questionId` and some
 * text, and a column of `q07_american_chinese_mirror` is not something anybody can read, or —
 * worse — is something people will read by guessing. Every answer here appears under the
 * question the reviewer actually saw, in instrument order, including for a response returned
 * against a version that has since been reworded.
 *
 * Nothing on this screen is editable. There is no triage route for a returned instrument and
 * there should not be one: a questionnaire response is evidence, and evidence with an edit
 * button beside it stops being evidence.
 *
 * A screen of its own rather than a drawer over the list, so it can be linked, reloaded and
 * left with the back button.
 */

import { useCallback, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';

import { COPY } from '@/config/copy';
import { adminApi } from '@/admin/adminApi';
import { fill, formatDateTime } from '@/admin/adminFormat';
import { ADMIN_SEGMENTS, adminPath } from '@/admin/adminPaths';
import { Notice } from '@/admin/components/Notice';
import { Panel } from '@/admin/components/Panel';
import { ResourceState } from '@/admin/components/ResourceState';
import { useAdminResource } from '@/admin/useAdminResource';

/**
 * The reviewer's answer to the quotation question, as three states rather than two.
 *
 * `false` is a reviewer who declined; `null` is one who was never asked or left it blank.
 * Rendering both as "No" would be safe today and wrong the first time somebody filters on it.
 *
 * @param {boolean|null} consent The stored tri-state.
 * @returns {string} The word for it.
 */
const consentWord = (consent) => {
  if (consent === true) return COPY.ADMIN.RESPONSES.CONSENT_GRANTED;
  if (consent === false) return COPY.ADMIN.RESPONSES.CONSENT_DECLINED;
  return COPY.ADMIN.RESPONSES.CONSENT_NOT_ANSWERED;
};

/**
 * @returns {import('react').ReactElement} The returned-questionnaire screen.
 */
export function ResponseDetail() {
  const { responseId } = useParams();

  const load = useCallback(() => adminApi.getQuestionnaireResponse(responseId), [responseId]);
  const { status, data, error, reload } = useAdminResource(load);

  const record = data?.response ?? null;
  const instrument = data?.questionnaire ?? null;

  /**
   * The answers in instrument order, each carrying its question.
   *
   * Ordered by the instrument rather than by the array as submitted, because the client may
   * send answers in any order and a research instrument read out of order is a different
   * instrument. Answers whose question has since been removed are kept and appended, marked:
   * an orphaned answer is precisely the kind of thing somebody needs to be told about, and
   * dropping it silently would hide an editing mistake behind a clean-looking page.
   */
  const entries = useMemo(() => {
    const answers = new Map((record?.answers ?? []).map((answer) => [answer.questionId, answer]));
    const questions = [...(instrument?.questions ?? [])].sort(
      (a, b) => (a.order ?? 0) - (b.order ?? 0),
    );

    const known = questions.map((question) => ({
      question,
      answer: answers.get(question.questionId) ?? null,
    }));
    for (const question of questions) answers.delete(question.questionId);

    return [...known, ...[...answers.values()].map((answer) => ({ question: null, answer }))];
  }, [record, instrument]);

  const sections = instrument?.sections ?? [];

  /**
   * @param {object} entry One question with its answer.
   * @returns {import('react').ReactElement} The rendered pair.
   */
  const renderEntry = ({ question, answer }) => {
    const values = answer?.values ?? [];
    const text = answer?.text ?? '';
    const rating = answer?.rating ?? null;
    const empty = rating === null && values.length === 0 && text === '';

    return (
      <li className="ogp-admin-answer" key={question?.questionId ?? answer.questionId}>
        {question ? (
          <>
            {question.label ? (
              <p className="ogp-admin-answer__label">{question.label}</p>
            ) : null}
            <p className="ogp-admin-answer__prompt">{question.prompt}</p>
          </>
        ) : (
          <>
            <p className="ogp-admin-answer__label">{answer.questionId}</p>
            {/* Only when there is an instrument to be missing from. With none stored at all,
                the panel above has already said so and repeating it per answer would read as
                nineteen separate faults. */}
            {instrument ? (
              <p className="ogp-admin-answer__prompt">{COPY.ADMIN.RESPONSES.UNKNOWN_QUESTION}</p>
            ) : null}
          </>
        )}

        {empty ? (
          <p className="ogp-admin-answer__empty">{COPY.ADMIN.RESPONSES.NO_ANSWER}</p>
        ) : (
          <>
            {rating === null ? null : (
              <p className="ogp-admin-answer__rating">
                {fill(COPY.ADMIN.RESPONSES.RATING_VALUE, { rating })}
              </p>
            )}
            {values.length === 0 ? null : (
              <ul className="ogp-admin-answer__values" role="list">
                {values.map((value) => (
                  <li className="ogp-admin-answer__value" key={value}>
                    {value}
                  </li>
                ))}
              </ul>
            )}
            {text === '' ? null : <p className="ogp-admin-answer__text">{text}</p>}
          </>
        )}
      </li>
    );
  };

  return (
    <>
      <header className="ogp-admin-screen-head">
        <h1 className="ogp-admin-screen-heading">{COPY.ADMIN.RESPONSES.DETAIL_HEADING}</h1>
        <Link className="ogp-admin-button" to={adminPath(ADMIN_SEGMENTS.RESPONSES)}>
          {COPY.ADMIN.RESPONSES.BACK}
        </Link>
      </header>

      <ResourceState status={status} error={error} onRetry={reload}>
        {record ? (
          <>
            <Panel
              title={COPY.ADMIN.RESPONSES.REVIEWER_HEADING}
              description={instrument ? `${instrument.title} ${instrument.version}` : undefined}
            >
              <dl className="ogp-admin-meta">
                <div className="ogp-admin-meta__pair">
                  <dt>{COPY.ADMIN.RESPONSES.COLUMN_COMPLETED}</dt>
                  <dd>{formatDateTime(record.completedAt)}</dd>
                </div>
                <div className="ogp-admin-meta__pair">
                  <dt>{COPY.ADMIN.RESPONSES.REVIEWER_NAME}</dt>
                  <dd>{record.reviewer?.name || COPY.ADMIN.COMMON.NOT_RECORDED}</dd>
                </div>
                <div className="ogp-admin-meta__pair">
                  <dt>{COPY.ADMIN.RESPONSES.REVIEWER_DATE}</dt>
                  <dd>{record.reviewer?.completedOn || COPY.ADMIN.COMMON.NOT_RECORDED}</dd>
                </div>
                <div className="ogp-admin-meta__pair">
                  <dt>{COPY.ADMIN.RESPONSES.REVIEWER_FORMAT}</dt>
                  <dd>{record.readingFormat || COPY.ADMIN.COMMON.NOT_RECORDED}</dd>
                </div>
                <div className="ogp-admin-meta__pair">
                  <dt>{COPY.ADMIN.RESPONSES.REVIEWER_TIME}</dt>
                  <dd>{record.reviewer?.readingTime || COPY.ADMIN.COMMON.NOT_RECORDED}</dd>
                </div>
                <div className="ogp-admin-meta__pair">
                  <dt>{COPY.ADMIN.RESPONSES.REVIEWER_CONSENT}</dt>
                  <dd>{consentWord(record.reviewer?.quoteConsent ?? null)}</dd>
                </div>
                <div className="ogp-admin-meta__pair">
                  <dt>{COPY.ADMIN.RESPONSES.COLUMN_COHORT}</dt>
                  <dd>{record.cohortId || COPY.ADMIN.COMMON.NONE}</dd>
                </div>
              </dl>
            </Panel>

            {instrument ? null : (
              <Notice tone="info">
                <p>{COPY.ADMIN.RESPONSES.INSTRUMENT_MISSING}</p>
              </Notice>
            )}

            {sections.length > 0 ? (
              sections.map((section) => {
                const inSection = entries.filter(
                  (entry) => (entry.question?.section ?? 'core') === section.key,
                );
                if (inSection.length === 0) return null;
                return (
                  <Panel
                    key={section.key}
                    title={section.title}
                    description={section.description ?? undefined}
                  >
                    <ol className="ogp-admin-answer-list" role="list">
                      {inSection.map(renderEntry)}
                    </ol>
                  </Panel>
                );
              })
            ) : (
              <Panel title={COPY.ADMIN.RESPONSES.ANSWERS_HEADING}>
                <ol className="ogp-admin-answer-list" role="list">
                  {entries.map(renderEntry)}
                </ol>
              </Panel>
            )}
          </>
        ) : null}
      </ResourceState>
    </>
  );
}

export default ResponseDetail;
