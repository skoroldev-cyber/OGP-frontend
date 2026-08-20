import { useCallback, useId, useState } from 'react';

import { COPY } from '@/config/copy';
import { ADMIN_PAGE_SIZE, adminApi } from '@/admin/adminApi';
import { formatCount, label } from '@/admin/adminFormat';
import { COHORT_FUNNEL_STEPS, COHORT_STATUSES } from '@/admin/adminVocabulary';
import { Pager } from '@/admin/components/Pager';
import { Panel } from '@/admin/components/Panel';
import { ResourceState } from '@/admin/components/ResourceState';
import { StatusTag } from '@/admin/components/StatusTag';
import { useAdminResource } from '@/admin/useAdminResource';

const cohortTone = (status) => {
  if (status === 'active') return 'positive';
  if (status === 'closed') return 'quiet';
  return 'neutral';
};

export function CohortsScreen() {
  const ids = useId();

  const [status, setStatus] = useState('');
  const [offset, setOffset] = useState(0);
  const [selectedId, setSelectedId] = useState(null);

  const loadCohorts = useCallback(
    () =>
      adminApi.listCohorts({
        ...(status === '' ? {} : { status }),
        offset,
        limit: ADMIN_PAGE_SIZE,
      }),
    [status, offset],
  );
  const list = useAdminResource(loadCohorts);

  const loadSummary = useCallback(
    () => (selectedId ? adminApi.cohortSummary(selectedId) : Promise.resolve(null)),
    [selectedId],
  );
  const summary = useAdminResource(loadSummary);

  const cohorts = list.data?.cohorts ?? [];

  return (
    <>
      <header className="ogp-admin-screen-head">
        <h1 className="ogp-admin-screen-heading">{COPY.ADMIN.COHORTS.HEADING}</h1>
        <p className="ogp-admin-screen-intro">{COPY.ADMIN.COHORTS.INTRO}</p>
      </header>

      <Panel title={COPY.ADMIN.COHORTS.HEADING}>
        <div className="ogp-admin-filters" role="group" aria-label={COPY.ADMIN.COMMON.FILTERS}>
          <div className="ogp-admin-field">
            <label className="ogp-admin-label" htmlFor={`${ids}-status`}>
              {COPY.ADMIN.COMMON.STATUS}
            </label>
            <select
              id={`${ids}-status`}
              className="ogp-admin-select"
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setOffset(0);
              }}
            >
              <option value="">{COPY.ADMIN.COMMON.ALL}</option>
              {COHORT_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {COPY.ADMIN.STATUS.COHORT[value]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <ResourceState
          status={list.status}
          error={list.error}
          isEmpty={cohorts.length === 0}
          emptyMessage={COPY.ADMIN.COHORTS.EMPTY}
          onRetry={list.reload}
        >
          <div className="ogp-admin-table-scroll">
            <table className="ogp-admin-table">
              <thead>
                <tr>
                  <th scope="col">{COPY.ADMIN.COHORTS.COLUMN_NAME}</th>
                  <th scope="col">{COPY.ADMIN.COHORTS.COLUMN_TYPE}</th>
                  <th scope="col">{COPY.ADMIN.COHORTS.COLUMN_STATUS}</th>
                  <th scope="col">{COPY.ADMIN.COHORTS.COLUMN_TARGET}</th>
                  <th scope="col">{COPY.ADMIN.COMMON.DETAILS}</th>
                </tr>
              </thead>
              <tbody>
                {cohorts.map((cohort) => (
                  <tr key={cohort.id} data-selected={cohort.id === selectedId ? 'true' : 'false'}>
                    <td>{cohort.name}</td>
                    <td>{label(COPY.ADMIN.COHORTS.TYPE, cohort.type)}</td>
                    <td>
                      <StatusTag
                        label={label(COPY.ADMIN.STATUS.COHORT, cohort.status)}
                        tone={cohortTone(cohort.status)}
                      />
                    </td>
                    <td>{cohort.targetSize ?? COPY.ADMIN.COMMON.NOT_RECORDED}</td>
                    <td>
                      <button
                        type="button"
                        className="ogp-admin-button"
                        aria-pressed={cohort.id === selectedId}
                        onClick={() => setSelectedId(cohort.id)}
                      >
                        {COPY.ADMIN.COHORTS.SUMMARY_SELECT}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pager
            offset={offset}
            count={cohorts.length}
            total={list.data?.total ?? 0}
            pageSize={ADMIN_PAGE_SIZE}
            onChange={setOffset}
          />
        </ResourceState>
      </Panel>

      {selectedId ? (
        <Panel title={COPY.ADMIN.COHORTS.SUMMARY_HEADING}>
          <ResourceState status={summary.status} error={summary.error} onRetry={summary.reload}>
            {summary.data ? (
              <>
                <p className="ogp-admin-hint">{summary.data.name}</p>
                <dl className="ogp-admin-counts ogp-admin-counts--funnel">
                  {COHORT_FUNNEL_STEPS.map((step) => (
                    <div className="ogp-admin-counts__pair" key={step}>
                      <dt>{COPY.ADMIN.COHORTS.FUNNEL[step]}</dt>
                      <dd>{formatCount(summary.data.funnel?.[step])}</dd>
                    </div>
                  ))}
                </dl>
              </>
            ) : null}
          </ResourceState>
        </Panel>
      ) : null}
    </>
  );
}

export default CohortsScreen;
