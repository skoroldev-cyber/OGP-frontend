/**
 * The audit log. Read-only for every role, including the founder (§10.9).
 *
 * Nobody edits history, so there is no action on any row — only the filters that find an
 * entry and the disclosure that opens its diff. `before` and `after` arrive as capped JSON
 * strings rather than as objects, which is what lets the response envelope stay closed; they
 * are shown as text, unparsed, because reformatting an audit record is a small lie about what
 * was recorded.
 */

import { useCallback, useId, useState } from 'react';

import { COPY } from '@/config/copy';
import { ADMIN_PAGE_SIZE, adminApi } from '@/admin/adminApi';
import { formatDateTime, label } from '@/admin/adminFormat';
import { Pager } from '@/admin/components/Pager';
import { Panel } from '@/admin/components/Panel';
import { ResourceState } from '@/admin/components/ResourceState';
import { useAdminResource } from '@/admin/useAdminResource';

/** Every filter, cleared. */
const NO_FILTERS = Object.freeze({
  action: '',
  target: '',
  targetId: '',
  actorId: '',
  from: '',
  to: '',
});

/**
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
 * @returns {import('react').ReactElement} The audit screen.
 */
export function AuditScreen() {
  const ids = useId();

  const [draft, setDraft] = useState(NO_FILTERS);
  const [applied, setApplied] = useState(NO_FILTERS);
  const [offset, setOffset] = useState(0);
  const [openId, setOpenId] = useState(null);

  const load = useCallback(
    () => adminApi.listAudit({ ...asQuery(applied), offset, limit: ADMIN_PAGE_SIZE }),
    [applied, offset],
  );
  const { status, data, error, reload } = useAdminResource(load);
  const entries = data?.entries ?? [];

  /**
   * @param {string} name The filter name.
   * @param {string} value The value.
   * @returns {void}
   */
  const setFilter = (name, value) => setDraft((previous) => ({ ...previous, [name]: value }));

  return (
    <>
      <header className="ogp-admin-screen-head">
        <h1 className="ogp-admin-screen-heading">{COPY.ADMIN.AUDIT.HEADING}</h1>
        <p className="ogp-admin-screen-intro">{COPY.ADMIN.AUDIT.INTRO}</p>
      </header>

      <Panel title={COPY.ADMIN.COMMON.FILTERS}>
        <form
          className="ogp-admin-filters"
          onSubmit={(event) => {
            event.preventDefault();
            setApplied(draft);
            setOffset(0);
          }}
        >
          <div className="ogp-admin-field">
            <label className="ogp-admin-label" htmlFor={`${ids}-action`}>
              {COPY.ADMIN.AUDIT.FILTER_ACTION}
            </label>
            <input
              id={`${ids}-action`}
              className="ogp-admin-input"
              type="text"
              spellCheck="false"
              value={draft.action}
              onChange={(event) => setFilter('action', event.target.value)}
            />
          </div>

          <div className="ogp-admin-field">
            <label className="ogp-admin-label" htmlFor={`${ids}-target`}>
              {COPY.ADMIN.AUDIT.FILTER_TARGET}
            </label>
            <input
              id={`${ids}-target`}
              className="ogp-admin-input"
              type="text"
              spellCheck="false"
              value={draft.target}
              onChange={(event) => setFilter('target', event.target.value)}
            />
          </div>

          <div className="ogp-admin-field">
            <label className="ogp-admin-label" htmlFor={`${ids}-target-id`}>
              {COPY.ADMIN.AUDIT.FILTER_TARGET_ID}
            </label>
            <input
              id={`${ids}-target-id`}
              className="ogp-admin-input"
              type="text"
              spellCheck="false"
              value={draft.targetId}
              onChange={(event) => setFilter('targetId', event.target.value)}
            />
          </div>

          <div className="ogp-admin-field">
            <label className="ogp-admin-label" htmlFor={`${ids}-actor`}>
              {COPY.ADMIN.AUDIT.FILTER_ACTOR}
            </label>
            <input
              id={`${ids}-actor`}
              className="ogp-admin-input"
              type="text"
              spellCheck="false"
              value={draft.actorId}
              onChange={(event) => setFilter('actorId', event.target.value)}
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

          <div className="ogp-admin-actions">
            <button type="submit" className="ogp-admin-button ogp-admin-button--primary">
              {COPY.ADMIN.COMMON.APPLY}
            </button>
            <button
              type="button"
              className="ogp-admin-button"
              onClick={() => {
                setDraft(NO_FILTERS);
                setApplied(NO_FILTERS);
                setOffset(0);
              }}
            >
              {COPY.ADMIN.COMMON.CLEAR}
            </button>
          </div>
        </form>
      </Panel>

      <Panel title={COPY.ADMIN.AUDIT.HEADING}>
        <ResourceState
          status={status}
          error={error}
          isEmpty={entries.length === 0}
          emptyMessage={COPY.ADMIN.AUDIT.EMPTY}
          onRetry={reload}
        >
          <div className="ogp-admin-table-scroll">
            <table className="ogp-admin-table">
              <thead>
                <tr>
                  <th scope="col">{COPY.ADMIN.AUDIT.COLUMN_AT}</th>
                  <th scope="col">{COPY.ADMIN.AUDIT.COLUMN_ACTOR}</th>
                  <th scope="col">{COPY.ADMIN.AUDIT.COLUMN_ACTION}</th>
                  <th scope="col">{COPY.ADMIN.AUDIT.COLUMN_TARGET}</th>
                  <th scope="col">{COPY.ADMIN.AUDIT.COLUMN_CHANGE}</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id}>
                    <td>{formatDateTime(entry.at)}</td>
                    <td>
                      {label(COPY.ADMIN.AUDIT.ACTOR_TYPE, entry.actorType)}
                      {entry.actorId ? (
                        <span className="ogp-admin-table__code"> {entry.actorId}</span>
                      ) : null}
                    </td>
                    <td className="ogp-admin-table__code">{entry.action}</td>
                    <td>
                      {entry.targetCollection || COPY.ADMIN.COMMON.NONE}
                      {entry.targetId ? (
                        <span className="ogp-admin-table__code"> {entry.targetId}</span>
                      ) : null}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="ogp-admin-button"
                        aria-expanded={openId === entry.id}
                        onClick={() => setOpenId(openId === entry.id ? null : entry.id)}
                      >
                        {openId === entry.id
                          ? COPY.ADMIN.AUDIT.HIDE_CHANGE
                          : COPY.ADMIN.AUDIT.SHOW_CHANGE}
                      </button>
                      {openId === entry.id ? (
                        <dl className="ogp-admin-diff">
                          <dt>{COPY.ADMIN.AUDIT.BEFORE}</dt>
                          <dd>
                            <pre className="ogp-admin-pre">
                              {entry.before || COPY.ADMIN.COMMON.NONE}
                            </pre>
                          </dd>
                          <dt>{COPY.ADMIN.AUDIT.AFTER}</dt>
                          <dd>
                            <pre className="ogp-admin-pre">
                              {entry.after || COPY.ADMIN.COMMON.NONE}
                            </pre>
                          </dd>
                        </dl>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pager
            offset={offset}
            count={entries.length}
            total={data?.total ?? 0}
            pageSize={ADMIN_PAGE_SIZE}
            onChange={setOffset}
          />
        </ResourceState>
      </Panel>
    </>
  );
}

export default AuditScreen;
