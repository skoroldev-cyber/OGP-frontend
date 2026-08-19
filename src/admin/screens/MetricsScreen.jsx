/**
 * The S0→S14 funnel. Read-only, aggregate only.
 *
 * §10.4.1 fixes the shape: per-state session counts, step conversion (Sₙ₊₁/Sₙ) and cumulative
 * conversion (Sₙ/S0). §10.2 fixes what may not exist beside them — no per-reader browsing
 * view, no session replay, no individual timeline. There is no route in this panel that could
 * produce one, and no age or content-layer dimension in any metrics shape to slice by.
 *
 * The bars are proportion, drawn from the numbers already in the row. They are an internal
 * instrument, never rendered back into the reader experience: a completion total in
 * reader-facing UI would be a social-proof indicator, which §14.4.1 prohibits outright.
 *
 * §10.4.2's sentence is printed under the table verbatim, because a pacing panel read without
 * it invites exactly the wrong conclusion about the skip path.
 */

import { useCallback, useId, useState } from 'react';

import { COPY } from '@/config/copy';
import { adminApi } from '@/admin/adminApi';
import { formatCount, formatRatio } from '@/admin/adminFormat';
import { Panel } from '@/admin/components/Panel';
import { ResourceState } from '@/admin/components/ResourceState';
import { useAdminResource } from '@/admin/useAdminResource';

/**
 * @returns {import('react').ReactElement} The metrics screen.
 */
export function MetricsScreen() {
  const ids = useId();

  const [draft, setDraft] = useState({ from: '', to: '' });
  const [range, setRange] = useState({ from: '', to: '' });

  const load = useCallback(
    () =>
      adminApi.funnel({
        ...(range.from === '' ? {} : { from: `${range.from}T00:00:00.000Z` }),
        ...(range.to === '' ? {} : { to: `${range.to}T23:59:59.999Z` }),
      }),
    [range],
  );
  const { status, data, error, reload } = useAdminResource(load);

  const steps = data?.steps ?? [];
  const first = steps[0]?.sessions ?? 0;

  return (
    <>
      <header className="ogp-admin-screen-head">
        <h1 className="ogp-admin-screen-heading">{COPY.ADMIN.METRICS.HEADING}</h1>
        <p className="ogp-admin-screen-intro">{COPY.ADMIN.METRICS.INTRO}</p>
      </header>

      <Panel title={COPY.ADMIN.METRICS.RANGE_HEADING}>
        <form
          className="ogp-admin-filters"
          onSubmit={(event) => {
            event.preventDefault();
            setRange(draft);
          }}
        >
          <div className="ogp-admin-field">
            <label className="ogp-admin-label" htmlFor={`${ids}-from`}>
              {COPY.ADMIN.COMMON.DATE_FROM}
            </label>
            <input
              id={`${ids}-from`}
              className="ogp-admin-input"
              type="date"
              value={draft.from}
              onChange={(event) =>
                setDraft((previous) => ({ ...previous, from: event.target.value }))
              }
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
              onChange={(event) => setDraft((previous) => ({ ...previous, to: event.target.value }))}
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
                setDraft({ from: '', to: '' });
                setRange({ from: '', to: '' });
              }}
            >
              {COPY.ADMIN.COMMON.CLEAR}
            </button>
          </div>
        </form>
      </Panel>

      <Panel title={COPY.ADMIN.METRICS.HEADING}>
        <ResourceState
          status={status}
          error={error}
          isEmpty={steps.length === 0}
          emptyMessage={COPY.ADMIN.METRICS.EMPTY}
          onRetry={reload}
        >
          <div className="ogp-admin-table-scroll">
            <table className="ogp-admin-table">
              <thead>
                <tr>
                  <th scope="col">{COPY.ADMIN.METRICS.COLUMN_STATE}</th>
                  <th scope="col">{COPY.ADMIN.METRICS.COLUMN_EVENT}</th>
                  <th scope="col">{COPY.ADMIN.METRICS.COLUMN_SESSIONS}</th>
                  <th scope="col">{COPY.ADMIN.METRICS.COLUMN_STEP}</th>
                  <th scope="col">{COPY.ADMIN.METRICS.COLUMN_CUMULATIVE}</th>
                  <th scope="col">{COPY.ADMIN.METRICS.BAR_LABEL}</th>
                </tr>
              </thead>
              <tbody>
                {steps.map((step) => {
                  const share = first > 0 ? Math.min(1, step.sessions / first) : 0;
                  return (
                    <tr key={step.state}>
                      <th scope="row">{step.state}</th>
                      <td>{step.event}</td>
                      <td className="ogp-admin-table__number">{formatCount(step.sessions)}</td>
                      <td className="ogp-admin-table__number">{formatRatio(step.stepConversion)}</td>
                      <td className="ogp-admin-table__number">
                        {formatRatio(step.cumulativeConversion)}
                      </td>
                      <td>
                        {/* Presentation of the number in the previous cell. `aria-hidden`
                            because a screen reader has already been given the count and the
                            ratio; reading the bar too would say the same thing three times. */}
                        <span className="ogp-admin-bar" aria-hidden="true">
                          <span
                            className="ogp-admin-bar__fill"
                            style={{ inlineSize: `${(share * 100).toFixed(1)}%` }}
                          />
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="ogp-admin-hint">{COPY.ADMIN.METRICS.SKIP_NOTE}</p>
        </ResourceState>
      </Panel>
    </>
  );
}

export default MetricsScreen;
