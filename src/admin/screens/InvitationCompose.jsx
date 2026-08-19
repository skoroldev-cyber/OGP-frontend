/**
 * Write to one address or to a cohort's worth of them.
 *
 * The screen the founder uses most, so it is built around one promise: nothing is sent until
 * what will happen is visible. The list is read as it is typed, de-duplicated and validated
 * against the same pattern the server applies, and every address is shown with what the panel
 * expects to do with it before the button is reachable. After the send, the per-address
 * outcome replaces the guess with the fact — sent, skipped or failed, each with its reason.
 *
 * Partial failure is the normal case (Backend `admin/invitations.js`): a relay that refuses
 * one mailbox has not invalidated the other 499. So a refusal is a row in a table here, not
 * an error that throws the panel away.
 *
 * No dialog, no overlay, no confirmation sheet. §14.4.1 bans popups and forced overlays
 * platform-wide, and the preview is a better confirmation than a modal asking "are you sure"
 * about a number the operator cannot see.
 */

import { useId, useMemo, useState } from 'react';

import { COPY } from '@/config/copy';
import { adminApi } from '@/admin/adminApi';
import { fill, messageForError } from '@/admin/adminFormat';
import { addressTone, readAddresses, sendTone } from '@/admin/adminVocabulary';
import { Notice } from '@/admin/components/Notice';
import { Panel } from '@/admin/components/Panel';
import { StatusTag } from '@/admin/components/StatusTag';

/**
 * @param {{ cohorts: object[], templates: object[], onSent: () => void }} props Reference
 *        data for the pickers, and what to do once addresses have been written to.
 * @returns {import('react').ReactElement} The compose panel.
 */
export function InvitationCompose({ cohorts, templates, onSent }) {
  const ids = useId();

  const [raw, setRaw] = useState('');
  const [cohortId, setCohortId] = useState('');
  const [templateKey, setTemplateKey] = useState(templates[0]?.key ?? '');
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [outcome, setOutcome] = useState(null);
  const [failure, setFailure] = useState(null);

  const addresses = useMemo(() => readAddresses(raw), [raw]);
  const counts = useMemo(
    () => ({
      valid: addresses.filter((entry) => entry.state === 'valid').length,
      duplicate: addresses.filter((entry) => entry.state === 'duplicate').length,
      invalid: addresses.filter((entry) => entry.state === 'invalid').length,
    }),
    [addresses],
  );

  /**
   * @param {import('react').FormEvent} event The submission.
   * @returns {Promise<void>} Resolves when the outcome is on screen.
   */
  const onSubmit = async (event) => {
    event.preventDefault();
    if (sending || counts.valid === 0) return;

    setSending(true);
    setFailure(null);
    setOutcome(null);
    try {
      const result = await adminApi.sendInvitations({
        emails: addresses.filter((entry) => entry.state === 'valid').map((entry) => entry.address),
        ...(cohortId === '' ? {} : { cohortId }),
        ...(templateKey === '' ? {} : { templateKey }),
        ...(note.trim() === '' ? {} : { message: note.trim() }),
      });
      setOutcome(result);
      setRaw('');
      onSent();
    } catch (error) {
      // A prohibited term in the added line refuses the whole request rather than half the
      // batch. The server names the term; it is shown exactly as sent.
      setFailure(error);
    } finally {
      setSending(false);
    }
  };

  return (
    <Panel title={COPY.ADMIN.INVITATIONS.COMPOSE_HEADING}>
      <form className="ogp-admin-form ogp-admin-compose" onSubmit={onSubmit} noValidate>
        <div className="ogp-admin-field">
          <label className="ogp-admin-label" htmlFor={`${ids}-addresses`}>
            {COPY.ADMIN.INVITATIONS.ADDRESSES_LABEL}
          </label>
          <textarea
            id={`${ids}-addresses`}
            className="ogp-admin-textarea"
            rows={6}
            spellCheck="false"
            autoCapitalize="off"
            placeholder={COPY.ADMIN.INVITATIONS.ADDRESSES_PLACEHOLDER}
            aria-describedby={`${ids}-addresses-hint`}
            value={raw}
            onChange={(event) => setRaw(event.target.value)}
          />
          <p className="ogp-admin-hint" id={`${ids}-addresses-hint`}>
            {COPY.ADMIN.INVITATIONS.ADDRESSES_HINT}
          </p>
        </div>

        <div className="ogp-admin-field-row">
          <div className="ogp-admin-field">
            <label className="ogp-admin-label" htmlFor={`${ids}-template`}>
              {COPY.ADMIN.INVITATIONS.TEMPLATE_LABEL}
            </label>
            <select
              id={`${ids}-template`}
              className="ogp-admin-select"
              value={templateKey}
              onChange={(event) => setTemplateKey(event.target.value)}
            >
              {templates.map((template) => (
                <option key={template.key} value={template.key}>
                  {COPY.ADMIN.TEMPLATES.KEYS[template.key] ?? template.key}
                </option>
              ))}
            </select>
          </div>

          <div className="ogp-admin-field">
            <label className="ogp-admin-label" htmlFor={`${ids}-cohort`}>
              {COPY.ADMIN.INVITATIONS.COHORT_LABEL}
            </label>
            <select
              id={`${ids}-cohort`}
              className="ogp-admin-select"
              value={cohortId}
              onChange={(event) => setCohortId(event.target.value)}
            >
              <option value="">{COPY.ADMIN.INVITATIONS.COHORT_NONE}</option>
              {cohorts.map((cohort) => (
                <option key={cohort.id} value={cohort.id}>
                  {cohort.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="ogp-admin-field">
          <label className="ogp-admin-label" htmlFor={`${ids}-note`}>
            {COPY.ADMIN.INVITATIONS.NOTE_LABEL}
          </label>
          <textarea
            id={`${ids}-note`}
            className="ogp-admin-textarea"
            rows={3}
            aria-describedby={`${ids}-note-hint`}
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
          <p className="ogp-admin-hint" id={`${ids}-note-hint`}>
            {COPY.ADMIN.INVITATIONS.NOTE_HINT}
          </p>
        </div>

        <section className="ogp-admin-preview" aria-labelledby={`${ids}-preview`}>
          <h3 className="ogp-admin-subheading" id={`${ids}-preview`}>
            {COPY.ADMIN.INVITATIONS.PREVIEW_HEADING}
          </h3>
          <p className="ogp-admin-hint" aria-live="polite">
            {addresses.length === 0
              ? COPY.ADMIN.INVITATIONS.PREVIEW_EMPTY
              : fill(COPY.ADMIN.INVITATIONS.PREVIEW_COUNTS, counts)}
          </p>
          {addresses.length > 0 ? (
            <ul className="ogp-admin-preview__list" role="list">
              {addresses.map((entry, index) => (
                <li className="ogp-admin-preview__item" key={`${entry.address}-${index}`}>
                  <span className="ogp-admin-preview__address">{entry.address}</span>
                  <StatusTag
                    label={COPY.ADMIN.STATUS.ADDRESS[entry.state]}
                    tone={addressTone(entry.state)}
                  />
                </li>
              ))}
            </ul>
          ) : null}
        </section>

        {failure ? (
          <Notice tone="error" title={COPY.ADMIN.COMMON.ERROR_TITLE}>
            <p>{messageForError(failure)}</p>
          </Notice>
        ) : null}

        <div className="ogp-admin-actions">
          <button
            type="submit"
            className="ogp-admin-button ogp-admin-button--primary"
            disabled={sending || counts.valid === 0}
          >
            {sending ? COPY.ADMIN.INVITATIONS.SENDING : COPY.ADMIN.INVITATIONS.SEND}
          </button>
          {counts.valid === 0 ? (
            <p className="ogp-admin-hint">{COPY.ADMIN.INVITATIONS.SEND_BLOCKED}</p>
          ) : null}
        </div>
      </form>

      {outcome ? (
        <section className="ogp-admin-results" aria-labelledby={`${ids}-results`}>
          <h3 className="ogp-admin-subheading" id={`${ids}-results`}>
            {COPY.ADMIN.INVITATIONS.RESULTS_HEADING}
          </h3>
          <p className="ogp-admin-hint" role="status">
            {fill(COPY.ADMIN.INVITATIONS.RESULTS_SUMMARY, {
              sent: outcome.sent,
              skipped: outcome.skipped,
              failed: outcome.failed,
            })}
          </p>
          <div className="ogp-admin-table-scroll">
            <table className="ogp-admin-table">
              <thead>
                <tr>
                  <th scope="col">{COPY.ADMIN.INVITATIONS.RESULTS_ADDRESS}</th>
                  <th scope="col">{COPY.ADMIN.INVITATIONS.RESULTS_OUTCOME}</th>
                  <th scope="col">{COPY.ADMIN.INVITATIONS.RESULTS_REASON}</th>
                </tr>
              </thead>
              <tbody>
                {outcome.results.map((entry, index) => (
                  <tr key={`${entry.email}-${index}`}>
                    <td className="ogp-admin-table__address">{entry.email}</td>
                    <td>
                      <StatusTag
                        label={COPY.ADMIN.STATUS.SEND[entry.status] ?? entry.status}
                        tone={sendTone(entry.status)}
                      />
                    </td>
                    <td>
                      {entry.reason
                        ? (COPY.ADMIN.INVITATIONS.REASONS[entry.reason] ?? entry.reason)
                        : COPY.ADMIN.COMMON.NOT_APPLICABLE}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button type="button" className="ogp-admin-button" onClick={() => setOutcome(null)}>
            {COPY.ADMIN.INVITATIONS.RESULTS_DISMISS}
          </button>
        </section>
      ) : null}
    </Panel>
  );
}

export default InvitationCompose;
