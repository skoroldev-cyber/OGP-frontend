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

const consentWord = (consent) => {
  if (consent === true) return COPY.ADMIN.RESPONSES.CONSENT_GRANTED;
  if (consent === false) return COPY.ADMIN.RESPONSES.CONSENT_DECLINED;
  return COPY.ADMIN.RESPONSES.CONSENT_NOT_ANSWERED;
};

export function ResponseDetail() {
  const { responseId } = useParams();

  const load = useCallback(() => adminApi.getQuestionnaireResponse(responseId), [responseId]);
  const { status, data, error, reload } = useAdminResource(load);

  const record = data?.response ?? null;
  const instrument = data?.questionnaire ?? null;

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
