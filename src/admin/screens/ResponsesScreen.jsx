/**
 * The returned Test Questionnaire. Read-only.
 *
 * Its own screen, deliberately not merged into reader feedback. A note is one reader speaking
 * unprompted; a returned instrument is nineteen answers to nineteen fixed questions, and the
 * two are read for different reasons. Filed together, the notes would bury the instrument.
 *
 * Three things in order: what the filters currently describe, in aggregate; the distribution
 * behind every scaled question; and the list itself. The distributions come before the table
 * because five reviewers splitting 1/1/5/5/5 is the finding, and it is invisible in a column
 * of dates.
 *
 * Nothing here is keyed to a person. The projection behind it carries no `sessionId` and no
 * reading progress (§10.2, §10.7.3), so a reviewer reads what was answered and never who was
 * where. The name in the "Reviewer" column is the one the reviewer typed into the instrument
 * themselves — reviewer metadata, not an identity the platform assigned.
 *
 * The filters are one form with one Apply, for the reason given in `FeedbackScreen`: selects
 * that re-query on change fire a request per keystroke on the search field beside them.
 */

import { useCallback, useId, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { COPY } from '@/config/copy';
import { RESPONSE_PAGE_SIZE, adminApi } from '@/admin/adminApi';
import { fill, formatDateTime, messageForError } from '@/admin/adminFormat';
import { ADMIN_SEGMENTS, adminPath } from '@/admin/adminPaths';
import { QUOTE_CONSENT_FILTERS, READING_FORMATS } from '@/admin/adminVocabulary';
import { downloadFile } from '@/admin/downloadFile';
import { Notice } from '@/admin/components/Notice';
import { Pager } from '@/admin/components/Pager';
import { Panel } from '@/admin/components/Panel';
import { RatingDistribution } from '@/admin/components/RatingDistribution';
import { ResourceState } from '@/admin/components/ResourceState';
import { useAdminResource } from '@/admin/useAdminResource';

/** Every filter, cleared. */
const NO_FILTERS = Object.freeze({
  questionnaireId: '',
  cohortId: '',
  readingFormat: '',
  quoteConsent: '',
  q: '',
  from: '',
  to: '',
});

/** The words for the tri-state quote-permission filter, keyed by its wire value. */
const CONSENT_LABELS = Object.freeze({
  granted: COPY.ADMIN.RESPONSES.CONSENT_GRANTED,
  declined: COPY.ADMIN.RESPONSES.CONSENT_DECLINED,
  not_answered: COPY.ADMIN.RESPONSES.CONSENT_NOT_ANSWERED,
});

/**
 * Drop the empty entries so the query carries only what was asked for.
 *
 * The two date controls are `<input type="date">`, which yields `YYYY-MM-DD`; the routes take
 * a full ISO instant. `from` is widened to the start of its day and `to` to the end of its
 * own, so a range typed as one day is that whole day rather than a zero-length instant.
 *
 * @param {typeof NO_FILTERS} filters The applied filters.
 * @returns {object} The query.
 */
const asQuery = (filters) => {
  const query = {};
  for (const [name, value] of Object.entries(filters)) {
    if (value === '') continue;
    if (name === 'from') query.from = `${value}T00:00:00.000Z`;
    else if (name === 'to') query.to = `${value}T23:59:59.999Z`;
    else query[name] = value;
  }
  return query;
};

/**
 * @returns {import('react').ReactElement} The Test Questionnaire screen.
 */
export function ResponsesScreen() {
  const ids = useId();

  const [draft, setDraft] = useState(NO_FILTERS);
  const [applied, setApplied] = useState(NO_FILTERS);
  const [offset, setOffset] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [exportFailure, setExportFailure] = useState(null);

  const loadReference = useCallback(
    () => Promise.all([adminApi.listCohorts(), adminApi.listQuestionnaires()]),
    [],
  );
  const reference = useAdminResource(loadReference);
  const cohorts = reference.data?.[0]?.cohorts ?? [];
  const questionnaires = useMemo(
    () => reference.data?.[1]?.questionnaires ?? [],
    [reference.data],
  );

  // How many questions each instrument asks, so "8 answered" can be read as "8 of 19".
  // Taken from the instrument rather than from the longest response on the page: a table
  // whose denominator moves as you page through it is worse than no denominator.
  const questionCounts = useMemo(
    () =>
      new Map(
        questionnaires.map((questionnaire) => [
          questionnaire.id,
          questionnaire.questions?.length ?? 0,
        ]),
      ),
    [questionnaires],
  );

  const loadList = useCallback(
    () =>
      adminApi.listQuestionnaireResponses({
        ...asQuery(applied),
        offset,
        limit: RESPONSE_PAGE_SIZE,
      }),
    [applied, offset],
  );
  const list = useAdminResource(loadList);

  const loadSummary = useCallback(
    () => adminApi.questionnaireResponseSummary(asQuery(applied)),
    [applied],
  );
  const summary = useAdminResource(loadSummary);

  /**
   * @param {import('react').FormEvent} event The submission.
   * @returns {void}
   */
  const onApply = (event) => {
    event.preventDefault();
    setApplied(draft);
    setOffset(0);
  };

  /**
   * @returns {void}
   */
  const onClear = () => {
    setDraft(NO_FILTERS);
    setApplied(NO_FILTERS);
    setOffset(0);
  };

  /**
   * @returns {Promise<void>} Resolves once the file has been handed over or refused.
   */
  const onExport = async () => {
    setExporting(true);
    setExportFailure(null);
    try {
      const blob = await adminApi.exportQuestionnaireResponsesCsv(asQuery(applied));
      downloadFile(blob, COPY.ADMIN.RESPONSES.EXPORT_FILENAME);
    } catch (failure) {
      // The export carries reviewers' written words, and the names they gave, off the
      // platform. It is role-gated more tightly than reading the table is and every call is
      // audit-logged (§10.11), so a 403 here is a legitimate answer rather than a fault.
      setExportFailure(failure);
    } finally {
      setExporting(false);
    }
  };

  const rows = list.data?.responses ?? [];
  const rated = summary.data?.byQuestion ?? [];

  /**
   * @param {string} name The filter name.
   * @param {string} value The value.
   * @returns {void}
   */
  const setFilter = (name, value) => setDraft((previous) => ({ ...previous, [name]: value }));

  return (
    <>
      <header className="ogp-admin-screen-head">
        <h1 className="ogp-admin-screen-heading">{COPY.ADMIN.RESPONSES.HEADING}</h1>
        <p className="ogp-admin-screen-intro">{COPY.ADMIN.RESPONSES.INTRO}</p>
      </header>

      <Panel title={COPY.ADMIN.COMMON.FILTERS}>
        <form className="ogp-admin-filters" onSubmit={onApply}>
          <div className="ogp-admin-field">
            <label className="ogp-admin-label" htmlFor={`${ids}-instrument`}>
              {COPY.ADMIN.RESPONSES.FILTER_QUESTIONNAIRE}
            </label>
            <select
              id={`${ids}-instrument`}
              className="ogp-admin-select"
              value={draft.questionnaireId}
              onChange={(event) => setFilter('questionnaireId', event.target.value)}
            >
              <option value="">{COPY.ADMIN.COMMON.ALL}</option>
              {questionnaires.map((questionnaire) => (
                <option key={questionnaire.id} value={questionnaire.id}>
                  {questionnaire.title} {questionnaire.version}
                </option>
              ))}
            </select>
          </div>

          <div className="ogp-admin-field">
            <label className="ogp-admin-label" htmlFor={`${ids}-cohort`}>
              {COPY.ADMIN.COMMON.COHORT}
            </label>
            <select
              id={`${ids}-cohort`}
              className="ogp-admin-select"
              value={draft.cohortId}
              onChange={(event) => setFilter('cohortId', event.target.value)}
            >
              <option value="">{COPY.ADMIN.COMMON.ALL}</option>
              {cohorts.map((cohort) => (
                <option key={cohort.id} value={cohort.id}>
                  {cohort.name}
                </option>
              ))}
            </select>
          </div>

          <div className="ogp-admin-field">
            <label className="ogp-admin-label" htmlFor={`${ids}-format`}>
              {COPY.ADMIN.RESPONSES.FILTER_FORMAT}
            </label>
            <select
              id={`${ids}-format`}
              className="ogp-admin-select"
              value={draft.readingFormat}
              onChange={(event) => setFilter('readingFormat', event.target.value)}
            >
              <option value="">{COPY.ADMIN.COMMON.ALL}</option>
              {READING_FORMATS.map((format) => (
                <option key={format} value={format}>
                  {format}
                </option>
              ))}
            </select>
          </div>

          <div className="ogp-admin-field">
            <label className="ogp-admin-label" htmlFor={`${ids}-consent`}>
              {COPY.ADMIN.RESPONSES.FILTER_CONSENT}
            </label>
            <select
              id={`${ids}-consent`}
              className="ogp-admin-select"
              value={draft.quoteConsent}
              onChange={(event) => setFilter('quoteConsent', event.target.value)}
            >
              <option value="">{COPY.ADMIN.COMMON.ALL}</option>
              {QUOTE_CONSENT_FILTERS.map((value) => (
                <option key={value} value={value}>
                  {CONSENT_LABELS[value]}
                </option>
              ))}
            </select>
          </div>

          <div className="ogp-admin-field">
            <label className="ogp-admin-label" htmlFor={`${ids}-from`}>
              {COPY.ADMIN.COMMON.DATE_FROM}
            </label>
            <input
              id={`${ids}-from`}
              className="ogp-admin-input"
              type="date"
              value={draft.from}
              onChange={(event) => setFilter('from', event.target.value)}
            />
          </div>

          <div className="ogp-admin-field">
            <label className="ogp-admin-label" htmlFor={`${ids}-to`}>
              {COPY.ADMIN.COMMON.DATE_TO}
            </label>
            <input
              id={`${ids}-to`}
              className="ogp-admin-input"
              type="date"
              value={draft.to}
              onChange={(event) => setFilter('to', event.target.value)}
            />
          </div>

          <div className="ogp-admin-field ogp-admin-field--wide">
            <label className="ogp-admin-label" htmlFor={`${ids}-q`}>
              {COPY.ADMIN.RESPONSES.SEARCH_LABEL}
            </label>
            <input
              id={`${ids}-q`}
              className="ogp-admin-input"
              type="search"
              value={draft.q}
              onChange={(event) => setFilter('q', event.target.value)}
            />
          </div>

          <div className="ogp-admin-actions">
            <button type="submit" className="ogp-admin-button ogp-admin-button--primary">
              {COPY.ADMIN.COMMON.APPLY}
            </button>
            <button type="button" className="ogp-admin-button" onClick={onClear}>
              {COPY.ADMIN.COMMON.CLEAR}
            </button>
            <button
              type="button"
              className="ogp-admin-button"
              onClick={onExport}
              disabled={exporting}
            >
              {exporting ? COPY.ADMIN.RESPONSES.EXPORTING : COPY.ADMIN.RESPONSES.EXPORT}
            </button>
          </div>
        </form>

        {exportFailure ? (
          <Notice tone="error" title={COPY.ADMIN.COMMON.ERROR_TITLE}>
            <p>{messageForError(exportFailure)}</p>
          </Notice>
        ) : null}
      </Panel>

      <Panel title={COPY.ADMIN.RESPONSES.SUMMARY_HEADING}>
        <ResourceState status={summary.status} error={summary.error} onRetry={summary.reload}>
          <dl className="ogp-admin-counts">
            <div className="ogp-admin-counts__pair">
              <dt>{COPY.ADMIN.RESPONSES.SUMMARY_TOTAL}</dt>
              <dd>{summary.data?.total ?? 0}</dd>
            </div>
            {(summary.data?.byReadingFormat ?? []).map((entry) => (
              <div className="ogp-admin-counts__pair" key={`format-${entry.readingFormat}`}>
                <dt>{entry.readingFormat}</dt>
                <dd>{entry.count}</dd>
              </div>
            ))}
            <div className="ogp-admin-counts__pair">
              <dt>{COPY.ADMIN.RESPONSES.CONSENT_GRANTED}</dt>
              <dd>{summary.data?.quoteConsent?.granted ?? 0}</dd>
            </div>
            <div className="ogp-admin-counts__pair">
              <dt>{COPY.ADMIN.RESPONSES.CONSENT_DECLINED}</dt>
              <dd>{summary.data?.quoteConsent?.declined ?? 0}</dd>
            </div>
            <div className="ogp-admin-counts__pair">
              <dt>{COPY.ADMIN.RESPONSES.CONSENT_NOT_ANSWERED}</dt>
              <dd>{summary.data?.quoteConsent?.notAnswered ?? 0}</dd>
            </div>
          </dl>

          <h3 className="ogp-admin-subheading">{COPY.ADMIN.RESPONSES.SUMMARY_RATINGS}</h3>
          {rated.length === 0 ? (
            <p className="ogp-admin-state">{COPY.ADMIN.RESPONSES.SUMMARY_RATINGS_EMPTY}</p>
          ) : (
            <ul className="ogp-admin-ratings" role="list">
              {rated.map((question) => (
                <li className="ogp-admin-rating" key={question.questionId}>
                  <p className="ogp-admin-rating__label">
                    {question.label ?? question.questionId}
                  </p>
                  <p className="ogp-admin-rating__prompt">{question.prompt}</p>
                  <p className="ogp-admin-rating__figures">
                    <span className="ogp-admin-rating__average">
                      {question.average === null
                        ? COPY.ADMIN.COMMON.NOT_RECORDED
                        : fill(COPY.ADMIN.RESPONSES.RATING_VALUE, { rating: question.average })}
                    </span>
                    <span className="ogp-admin-rating__answered">
                      {fill(COPY.ADMIN.RESPONSES.SUMMARY_ANSWERED, { count: question.answered })}
                    </span>
                  </p>
                  <RatingDistribution distribution={question.distribution} />
                </li>
              ))}
            </ul>
          )}
        </ResourceState>
      </Panel>

      <Panel title={COPY.ADMIN.RESPONSES.HEADING}>
        <ResourceState
          status={list.status}
          error={list.error}
          isEmpty={rows.length === 0}
          emptyMessage={COPY.ADMIN.RESPONSES.EMPTY}
          onRetry={list.reload}
        >
          <div className="ogp-admin-table-scroll">
            <table className="ogp-admin-table">
              <thead>
                <tr>
                  <th scope="col">{COPY.ADMIN.RESPONSES.COLUMN_COMPLETED}</th>
                  <th scope="col">{COPY.ADMIN.RESPONSES.COLUMN_REVIEWER}</th>
                  <th scope="col">{COPY.ADMIN.RESPONSES.COLUMN_COHORT}</th>
                  <th scope="col">{COPY.ADMIN.RESPONSES.COLUMN_FORMAT}</th>
                  <th scope="col">{COPY.ADMIN.RESPONSES.COLUMN_ANSWERS}</th>
                  <th scope="col">{COPY.ADMIN.COMMON.DETAILS}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((response) => (
                  <tr key={response.id}>
                    <td>{formatDateTime(response.completedAt)}</td>
                    <td>{response.reviewer?.name || COPY.ADMIN.COMMON.NOT_RECORDED}</td>
                    <td>{response.cohortId || COPY.ADMIN.COMMON.NONE}</td>
                    <td>{response.readingFormat || COPY.ADMIN.COMMON.NOT_RECORDED}</td>
                    <td>
                      {fill(COPY.ADMIN.RESPONSES.ANSWER_COUNT, {
                        count: response.answers?.length ?? 0,
                        total: questionCounts.get(response.questionnaireId) ?? '—',
                      })}
                    </td>
                    <td>
                      <Link
                        className="ogp-admin-button"
                        to={`${adminPath(ADMIN_SEGMENTS.RESPONSES)}/${response.id}`}
                      >
                        {COPY.ADMIN.RESPONSES.OPEN}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pager
            offset={offset}
            count={rows.length}
            total={list.data?.total ?? 0}
            pageSize={RESPONSE_PAGE_SIZE}
            onChange={setOffset}
          />
        </ResourceState>
      </Panel>
    </>
  );
}

export default ResponsesScreen;
