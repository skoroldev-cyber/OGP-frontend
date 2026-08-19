/**
 * The free-form feedback queue.
 *
 * What a reader wrote after finishing the arc, with the passages they marked while reading
 * attached to it (§3.13: the questionnaire follows completion; while reading, a reader may
 * only mark). Nothing here is keyed to a person or to a place in the manuscript: the
 * projection carries no `sessionId` and no reading progress, so a reviewer reads what someone
 * wrote and never where they were.
 *
 * The filters are one form with one Apply. Selects that re-queried on change would fire a
 * request per keystroke on the search field beside them, and a queue that re-orders itself
 * while it is being read is a queue nobody trusts.
 */

import { useCallback, useId, useState } from 'react';
import { Link } from 'react-router-dom';

import { COPY } from '@/config/copy';
import { FEEDBACK_PAGE_SIZE, adminApi } from '@/admin/adminApi';
import { excerpt, formatDateTime, label, messageForError } from '@/admin/adminFormat';
import { ADMIN_SEGMENTS, adminPath } from '@/admin/adminPaths';
import { FEEDBACK_CATEGORIES, FEEDBACK_STATUSES, feedbackTone } from '@/admin/adminVocabulary';
import { downloadFile } from '@/admin/downloadFile';
import { Notice } from '@/admin/components/Notice';
import { Pager } from '@/admin/components/Pager';
import { Panel } from '@/admin/components/Panel';
import { ResourceState } from '@/admin/components/ResourceState';
import { StatusTag } from '@/admin/components/StatusTag';
import { useAdminResource } from '@/admin/useAdminResource';

/** Every filter, cleared. */
const NO_FILTERS = Object.freeze({
  status: '',
  category: '',
  cohortId: '',
  unitId: '',
  q: '',
  from: '',
  to: '',
});

/**
 * Drop the empty entries so the query carries only what was asked for.
 *
 * The two date controls are `<input type="date">`, which yields `YYYY-MM-DD`; the route takes
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
 * @returns {import('react').ReactElement} The feedback queue screen.
 */
export function FeedbackScreen() {
  const ids = useId();

  const [draft, setDraft] = useState(NO_FILTERS);
  const [applied, setApplied] = useState(NO_FILTERS);
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);
  const [exportFailure, setExportFailure] = useState(null);

  const loadCohorts = useCallback(() => adminApi.listCohorts(), []);
  const cohortsResource = useAdminResource(loadCohorts);
  const cohorts = cohortsResource.data?.cohorts ?? [];

  const loadList = useCallback(
    () => adminApi.listFeedback({ ...asQuery(applied), page, limit: FEEDBACK_PAGE_SIZE }),
    [applied, page],
  );
  const list = useAdminResource(loadList);

  const loadSummary = useCallback(() => adminApi.feedbackSummary(asQuery(applied)), [applied]);
  const summary = useAdminResource(loadSummary);

  /**
   * @param {import('react').FormEvent} event The submission.
   * @returns {void}
   */
  const onApply = (event) => {
    event.preventDefault();
    setApplied(draft);
    setPage(1);
  };

  /**
   * @returns {void}
   */
  const onClear = () => {
    setDraft(NO_FILTERS);
    setApplied(NO_FILTERS);
    setPage(1);
  };

  /**
   * @returns {Promise<void>} Resolves once the file has been handed over or refused.
   */
  const onExport = async () => {
    setExporting(true);
    setExportFailure(null);
    try {
      const blob = await adminApi.exportFeedbackCsv(asQuery(applied));
      downloadFile(blob, COPY.ADMIN.FEEDBACK.EXPORT_FILENAME);
    } catch (failure) {
      // The export moves contact details off the platform, so it is role-gated more tightly
      // than reading the queue is (§10.11 — every export is audit-logged). A 403 here is a
      // legitimate answer, not a fault, and says so.
      setExportFailure(failure);
    } finally {
      setExporting(false);
    }
  };

  const rows = list.data?.feedback ?? [];
  const total = list.data?.total ?? 0;
  const offset = (page - 1) * FEEDBACK_PAGE_SIZE;

  /**
   * @param {string} name The filter name.
   * @param {string} value The value.
   * @returns {void}
   */
  const setFilter = (name, value) => setDraft((previous) => ({ ...previous, [name]: value }));

  return (
    <>
      <header className="ogp-admin-screen-head">
        <h1 className="ogp-admin-screen-heading">{COPY.ADMIN.FEEDBACK.HEADING}</h1>
        <p className="ogp-admin-screen-intro">{COPY.ADMIN.FEEDBACK.INTRO}</p>
      </header>

      <Panel title={COPY.ADMIN.COMMON.FILTERS}>
        <form className="ogp-admin-filters" onSubmit={onApply}>
          <div className="ogp-admin-field">
            <label className="ogp-admin-label" htmlFor={`${ids}-status`}>
              {COPY.ADMIN.COMMON.STATUS}
            </label>
            <select
              id={`${ids}-status`}
              className="ogp-admin-select"
              value={draft.status}
              onChange={(event) => setFilter('status', event.target.value)}
            >
              <option value="">{COPY.ADMIN.COMMON.ALL}</option>
              {FEEDBACK_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {COPY.ADMIN.STATUS.FEEDBACK[value]}
                </option>
              ))}
            </select>
          </div>

          <div className="ogp-admin-field">
            <label className="ogp-admin-label" htmlFor={`${ids}-category`}>
              {COPY.ADMIN.COMMON.CATEGORY}
            </label>
            <select
              id={`${ids}-category`}
              className="ogp-admin-select"
              value={draft.category}
              onChange={(event) => setFilter('category', event.target.value)}
            >
              <option value="">{COPY.ADMIN.COMMON.ALL}</option>
              {FEEDBACK_CATEGORIES.map((value) => (
                <option key={value} value={value}>
                  {COPY.ADMIN.CATEGORY[value]}
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
            <label className="ogp-admin-label" htmlFor={`${ids}-unit`}>
              {COPY.ADMIN.FEEDBACK.UNIT_LABEL}
            </label>
            <input
              id={`${ids}-unit`}
              className="ogp-admin-input"
              type="text"
              spellCheck="false"
              placeholder={COPY.ADMIN.FEEDBACK.UNIT_PLACEHOLDER}
              value={draft.unitId}
              onChange={(event) => setFilter('unitId', event.target.value)}
            />
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
              {COPY.ADMIN.FEEDBACK.SEARCH_LABEL}
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
              {exporting ? COPY.ADMIN.FEEDBACK.EXPORTING : COPY.ADMIN.FEEDBACK.EXPORT}
            </button>
          </div>
        </form>

        {exportFailure ? (
          <Notice tone="error" title={COPY.ADMIN.COMMON.ERROR_TITLE}>
            <p>{messageForError(exportFailure)}</p>
          </Notice>
        ) : null}
      </Panel>

      <Panel title={COPY.ADMIN.FEEDBACK.SUMMARY_HEADING}>
        <ResourceState
          status={summary.status}
          error={summary.error}
          onRetry={summary.reload}
        >
          <dl className="ogp-admin-counts">
            <div className="ogp-admin-counts__pair">
              <dt>{COPY.ADMIN.FEEDBACK.SUMMARY_TOTAL}</dt>
              <dd>{summary.data?.total ?? 0}</dd>
            </div>
            {(summary.data?.byStatus ?? []).map((entry) => (
              <div className="ogp-admin-counts__pair" key={`status-${entry.status}`}>
                <dt>{label(COPY.ADMIN.STATUS.FEEDBACK, entry.status)}</dt>
                <dd>{entry.count}</dd>
              </div>
            ))}
            {(summary.data?.byCategory ?? []).map((entry) => (
              <div className="ogp-admin-counts__pair" key={`category-${entry.category}`}>
                <dt>{label(COPY.ADMIN.CATEGORY, entry.category)}</dt>
                <dd>{entry.count}</dd>
              </div>
            ))}
          </dl>
        </ResourceState>
      </Panel>

      <Panel title={COPY.ADMIN.FEEDBACK.HEADING}>
        <ResourceState
          status={list.status}
          error={list.error}
          isEmpty={rows.length === 0}
          emptyMessage={COPY.ADMIN.FEEDBACK.EMPTY}
          onRetry={list.reload}
        >
          <div className="ogp-admin-table-scroll">
            <table className="ogp-admin-table">
              <thead>
                <tr>
                  <th scope="col">{COPY.ADMIN.FEEDBACK.COLUMN_RECEIVED}</th>
                  <th scope="col">{COPY.ADMIN.FEEDBACK.COLUMN_CATEGORY}</th>
                  <th scope="col">{COPY.ADMIN.FEEDBACK.COLUMN_STATUS}</th>
                  <th scope="col">{COPY.ADMIN.FEEDBACK.COLUMN_PASSAGES}</th>
                  <th scope="col">{COPY.ADMIN.FEEDBACK.COLUMN_EXCERPT}</th>
                  <th scope="col">{COPY.ADMIN.COMMON.DETAILS}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((entry) => (
                  <tr key={entry.id}>
                    <td>{formatDateTime(entry.createdAt)}</td>
                    <td>{label(COPY.ADMIN.CATEGORY, entry.category)}</td>
                    <td>
                      <StatusTag
                        label={label(COPY.ADMIN.STATUS.FEEDBACK, entry.status)}
                        tone={feedbackTone(entry.status)}
                      />
                    </td>
                    <td>{entry.passages?.length ?? 0}</td>
                    <td>{excerpt(entry.body)}</td>
                    <td>
                      <Link
                        className="ogp-admin-button"
                        to={`${adminPath(ADMIN_SEGMENTS.FEEDBACK)}/${entry.id}`}
                      >
                        {COPY.ADMIN.FEEDBACK.OPEN}
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
            total={total}
            pageSize={FEEDBACK_PAGE_SIZE}
            onChange={(next) => setPage(Math.floor(next / FEEDBACK_PAGE_SIZE) + 1)}
          />
        </ResourceState>
      </Panel>
    </>
  );
}

export default FeedbackScreen;
