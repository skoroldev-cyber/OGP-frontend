import { useCallback, useId, useMemo, useState } from 'react';

import { COPY } from '@/config/copy';
import { ADMIN_PAGE_SIZE, adminApi } from '@/admin/adminApi';
import { formatDateTime, label, messageForError } from '@/admin/adminFormat';
import { INVITATION_STATUSES, invitationTone } from '@/admin/adminVocabulary';
import { Notice } from '@/admin/components/Notice';
import { Pager } from '@/admin/components/Pager';
import { Panel } from '@/admin/components/Panel';
import { ResourceState } from '@/admin/components/ResourceState';
import { StatusTag } from '@/admin/components/StatusTag';
import { useAdminResource } from '@/admin/useAdminResource';

const matches = (invitation, needle) => {
  if (needle === '') return true;
  const haystack = [invitation.email, invitation.displayName, invitation.code]
    .filter((value) => typeof value === 'string')
    .join(' ')
    .toLowerCase();
  return haystack.includes(needle);
};

export function InvitationList({ cohorts, reloadSignal }) {
  const ids = useId();

  const [status, setStatus] = useState('');
  const [cohortId, setCohortId] = useState('');
  const [offset, setOffset] = useState(0);
  const [find, setFind] = useState('');

  const [busyId, setBusyId] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const [rowNotice, setRowNotice] = useState(null);

  const load = useCallback(() => {
    void reloadSignal;
    return adminApi.listInvitations({
      ...(status === '' ? {} : { status }),
      ...(cohortId === '' ? {} : { cohortId }),
      offset,
      limit: ADMIN_PAGE_SIZE,
    });
  }, [status, cohortId, offset, reloadSignal]);

  const { status: readStatus, data, error, reload } = useAdminResource(load);

  const invitations = useMemo(() => data?.invitations ?? [], [data]);
  const needle = find.trim().toLowerCase();
  const visible = useMemo(
    () => invitations.filter((invitation) => matches(invitation, needle)),
    [invitations, needle],
  );

  const run = async (id, act, confirmation) => {
    setBusyId(id);
    setRowNotice(null);
    try {
      await act();
      setRowNotice({ id, tone: 'success', message: confirmation });
      reload();
    } catch (failure) {
      setRowNotice({ id, tone: 'error', message: messageForError(failure) });
    } finally {
      setBusyId(null);
      setConfirmId(null);
    }
  };

  return (
    <Panel title={COPY.ADMIN.INVITATIONS.LIST_HEADING}>
      <div className="ogp-admin-filters" role="group" aria-label={COPY.ADMIN.COMMON.FILTERS}>
        <div className="ogp-admin-field">
          <label className="ogp-admin-label" htmlFor={`${ids}-status`}>
            {COPY.ADMIN.INVITATIONS.FILTER_STATUS}
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
            {INVITATION_STATUSES.map((value) => (
              <option key={value} value={value}>
                {COPY.ADMIN.STATUS.INVITATION[value] ?? value}
              </option>
            ))}
          </select>
        </div>

        <div className="ogp-admin-field">
          <label className="ogp-admin-label" htmlFor={`${ids}-cohort`}>
            {COPY.ADMIN.INVITATIONS.FILTER_COHORT}
          </label>
          <select
            id={`${ids}-cohort`}
            className="ogp-admin-select"
            value={cohortId}
            onChange={(event) => {
              setCohortId(event.target.value);
              setOffset(0);
            }}
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
          <label className="ogp-admin-label" htmlFor={`${ids}-find`}>
            {COPY.ADMIN.INVITATIONS.FIND_LABEL}
          </label>
          <input
            id={`${ids}-find`}
            className="ogp-admin-input"
            type="search"
            autoCapitalize="off"
            spellCheck="false"
            aria-describedby={`${ids}-find-hint`}
            value={find}
            onChange={(event) => setFind(event.target.value)}
          />
          <p className="ogp-admin-hint" id={`${ids}-find-hint`}>
            {COPY.ADMIN.INVITATIONS.FIND_HINT}
          </p>
        </div>
      </div>

      {rowNotice && !rowNotice.id ? (
        <Notice tone={rowNotice.tone}>{rowNotice.message}</Notice>
      ) : null}

      <ResourceState
        status={readStatus}
        error={error}
        isEmpty={visible.length === 0}
        emptyMessage={COPY.ADMIN.INVITATIONS.EMPTY}
        onRetry={reload}
      >
        <div className="ogp-admin-table-scroll">
          <table className="ogp-admin-table ogp-admin-invitations-table">
            <thead>
              <tr>
                <th scope="col">{COPY.ADMIN.INVITATIONS.COLUMN_ADDRESS}</th>
                <th scope="col">{COPY.ADMIN.INVITATIONS.COLUMN_NAME}</th>
                <th scope="col">{COPY.ADMIN.INVITATIONS.COLUMN_CODE}</th>
                <th scope="col">{COPY.ADMIN.INVITATIONS.COLUMN_STATUS}</th>
                <th scope="col">{COPY.ADMIN.INVITATIONS.COLUMN_SENT}</th>
                <th scope="col">{COPY.ADMIN.INVITATIONS.COLUMN_ACTIONS}</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((invitation) => (
                <tr key={invitation.id}>
                  <td className="ogp-admin-table__address">
                    {invitation.email || COPY.ADMIN.INVITATIONS.NO_ADDRESS}
                  </td>
                  <td>
                    {invitation.displayName || (
                      <span className="ogp-admin-table__empty">{COPY.ADMIN.INVITATIONS.NO_NAME}</span>
                    )}
                  </td>
                  <td className="ogp-admin-table__code">{invitation.code}</td>
                  <td>
                    <StatusTag
                      label={label(COPY.ADMIN.STATUS.INVITATION, invitation.status)}
                      tone={invitationTone(invitation.status)}
                    />
                  </td>
                  <td>{formatDateTime(invitation.readingLinkSentAt)}</td>
                  <td>
                    <div className="ogp-admin-row-actions">
                      <button
                        type="button"
                        className="ogp-admin-button"
                        disabled={busyId === invitation.id || !invitation.email}
                        aria-busy={busyId === invitation.id}
                        onClick={() =>
                          run(
                            invitation.id,
                            () => adminApi.resendInvitation(invitation.id),
                            COPY.ADMIN.INVITATIONS.RESENT,
                          )
                        }
                      >
                        {busyId === invitation.id
                          ? COPY.ADMIN.INVITATIONS.RESENDING
                          : COPY.ADMIN.INVITATIONS.RESEND}
                      </button>

                      {confirmId === invitation.id ? (
                        <>
                          <button
                            type="button"
                            className="ogp-admin-button ogp-admin-button--danger"
                            disabled={busyId === invitation.id}
                            onClick={() =>
                              run(
                                invitation.id,
                                () => adminApi.revokeInvitation(invitation.id),
                                COPY.ADMIN.INVITATIONS.REVOKED,
                              )
                            }
                          >
                            {busyId === invitation.id
                              ? COPY.ADMIN.INVITATIONS.REVOKING
                              : COPY.ADMIN.INVITATIONS.REVOKE_CONFIRM}
                          </button>
                          <button
                            type="button"
                            className="ogp-admin-button"
                            disabled={busyId === invitation.id}
                            onClick={() => setConfirmId(null)}
                          >
                            {COPY.ADMIN.INVITATIONS.REVOKE_CANCEL}
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          className="ogp-admin-button"
                          disabled={busyId === invitation.id || invitation.status === 'revoked'}
                          onClick={() => setConfirmId(invitation.id)}
                        >
                          {COPY.ADMIN.INVITATIONS.REVOKE}
                        </button>
                      )}
                    </div>
                    {confirmId === invitation.id ? (
                      <p className="ogp-admin-hint">{COPY.ADMIN.INVITATIONS.REVOKE_NOTE}</p>
                    ) : null}
                    {rowNotice?.id === invitation.id ? (
                      <div className="ogp-admin-row-feedback">
                        <Notice tone={rowNotice.tone}>{rowNotice.message}</Notice>
                      </div>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Pager
          offset={offset}
          count={invitations.length}
          total={data?.total ?? 0}
          pageSize={ADMIN_PAGE_SIZE}
          onChange={setOffset}
        />
      </ResourceState>
    </Panel>
  );
}

export default InvitationList;
