/**
 * One reader's observations, with the passages they marked.
 *
 * The excerpts are the only place in this panel set in the manuscript face. Everything else
 * is Inter, because everything else is chrome; a marked passage is the work itself, quoted,
 * and setting it in the interface face would misrepresent what the reader was looking at.
 *
 * What the reader wrote is read-only. The triage route accepts a status and staff notes and
 * nothing else — `body`, `category`, `passages` and the contact fields are absent from it by
 * design, so the people reviewing feedback cannot edit the words they are reviewing.
 *
 * A screen of its own rather than a drawer over the list: a route can be linked, reloaded and
 * left with the back button, and §14.4.1's ban on forced overlays applies to staff too.
 */

import { useCallback, useId, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { COPY } from '@/config/copy';
import { adminApi } from '@/admin/adminApi';
import { fill, formatDateTime, label, messageForError } from '@/admin/adminFormat';
import { ADMIN_SEGMENTS, adminPath } from '@/admin/adminPaths';
import { FEEDBACK_STATUSES, feedbackTone } from '@/admin/adminVocabulary';
import { Notice } from '@/admin/components/Notice';
import { Panel } from '@/admin/components/Panel';
import { ResourceState } from '@/admin/components/ResourceState';
import { StatusTag } from '@/admin/components/StatusTag';
import { useAdminResource } from '@/admin/useAdminResource';

/**
 * @returns {import('react').ReactElement} The feedback detail screen.
 */
export function FeedbackDetail() {
  const { feedbackId } = useParams();
  const ids = useId();

  const load = useCallback(() => adminApi.getFeedback(feedbackId), [feedbackId]);
  const { status, data, error, reload } = useAdminResource(load);
  const record = data?.feedback ?? null;

  const [triage, setTriage] = useState({ status: null, adminNotes: null });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [failure, setFailure] = useState(null);

  // Derived, never seeded by an effect: the fetched record is the default and an edit in
  // progress is an override on top of it, so a re-read cannot discard what is being typed.
  const triageStatus = triage.status ?? record?.status ?? '';
  const adminNotes = triage.adminNotes ?? record?.adminNotes ?? '';

  /**
   * @param {import('react').FormEvent} event The submission.
   * @returns {Promise<void>} Resolves when the triage is stored or refused.
   */
  const onSave = async (event) => {
    event.preventDefault();
    setSaving(true);
    setFailure(null);
    setSaved(false);
    try {
      await adminApi.updateFeedback(feedbackId, {
        status: triageStatus,
        ...(adminNotes === '' ? {} : { adminNotes }),
      });
      setTriage({ status: null, adminNotes: null });
      setSaved(true);
      reload();
    } catch (thrown) {
      setFailure(thrown);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <header className="ogp-admin-screen-head">
        <h1 className="ogp-admin-screen-heading">{COPY.ADMIN.FEEDBACK.DETAIL_HEADING}</h1>
        <Link className="ogp-admin-button" to={adminPath(ADMIN_SEGMENTS.FEEDBACK)}>
          {COPY.ADMIN.FEEDBACK.BACK}
        </Link>
      </header>

      <ResourceState status={status} error={error} onRetry={reload}>
        {record ? (
          <>
            <Panel title={COPY.ADMIN.FEEDBACK.BODY_LABEL}>
              <dl className="ogp-admin-meta">
                <div className="ogp-admin-meta__pair">
                  <dt>{COPY.ADMIN.FEEDBACK.COLUMN_RECEIVED}</dt>
                  <dd>{formatDateTime(record.createdAt)}</dd>
                </div>
                <div className="ogp-admin-meta__pair">
                  <dt>{COPY.ADMIN.COMMON.CATEGORY}</dt>
                  <dd>{label(COPY.ADMIN.CATEGORY, record.category)}</dd>
                </div>
                <div className="ogp-admin-meta__pair">
                  <dt>{COPY.ADMIN.COMMON.STATUS}</dt>
                  <dd>
                    <StatusTag
                      label={label(COPY.ADMIN.STATUS.FEEDBACK, record.status)}
                      tone={feedbackTone(record.status)}
                    />
                  </dd>
                </div>
                <div className="ogp-admin-meta__pair">
                  <dt>{COPY.ADMIN.FEEDBACK.READING_FORMAT}</dt>
                  <dd>{record.readingFormat || COPY.ADMIN.COMMON.NOT_RECORDED}</dd>
                </div>
                <div className="ogp-admin-meta__pair">
                  <dt>{COPY.ADMIN.FEEDBACK.RELEASE}</dt>
                  <dd>{record.releaseId || COPY.ADMIN.COMMON.NOT_RECORDED}</dd>
                </div>
                <div className="ogp-admin-meta__pair">
                  <dt>{COPY.ADMIN.FEEDBACK.NAME_LABEL}</dt>
                  <dd>{record.displayName || COPY.ADMIN.COMMON.NOT_RECORDED}</dd>
                </div>
                <div className="ogp-admin-meta__pair">
                  <dt>{COPY.ADMIN.FEEDBACK.EMAIL_LABEL}</dt>
                  <dd>{record.email || COPY.ADMIN.COMMON.NOT_RECORDED}</dd>
                </div>
                <div className="ogp-admin-meta__pair">
                  <dt>{COPY.ADMIN.COMMON.DETAILS}</dt>
                  <dd>
                    {record.contactConsent
                      ? COPY.ADMIN.FEEDBACK.CONTACT_CONSENT_YES
                      : COPY.ADMIN.FEEDBACK.CONTACT_CONSENT_NO}
                  </dd>
                </div>
              </dl>

              <p className="ogp-admin-feedback-body">{record.body}</p>
            </Panel>

            <Panel title={COPY.ADMIN.FEEDBACK.PASSAGES_LABEL}>
              {record.passages?.length ? (
                <ol className="ogp-admin-passages" role="list">
                  {record.passages.map((passage, index) => (
                    <li className="ogp-admin-passage" key={`${passage.unitId}-${index}`}>
                      <p className="ogp-admin-passage__unit">
                        {passage.unitId}
                        {typeof passage.charStart === 'number' &&
                        typeof passage.charEnd === 'number' ? (
                          <span className="ogp-admin-passage__range">
                            {' '}
                            {fill(COPY.ADMIN.FEEDBACK.PASSAGE_RANGE, {
                              start: passage.charStart,
                              end: passage.charEnd,
                            })}
                          </span>
                        ) : null}
                      </p>
                      {passage.excerpt ? (
                        <blockquote className="ogp-admin-passage__excerpt">
                          {passage.excerpt}
                        </blockquote>
                      ) : null}
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="ogp-admin-state">{COPY.ADMIN.FEEDBACK.PASSAGES_EMPTY}</p>
              )}
            </Panel>

            <Panel title={COPY.ADMIN.FEEDBACK.STATUS_LABEL}>
              <form className="ogp-admin-form" onSubmit={onSave} noValidate>
                <div className="ogp-admin-field">
                  <label className="ogp-admin-label" htmlFor={`${ids}-status`}>
                    {COPY.ADMIN.FEEDBACK.STATUS_LABEL}
                  </label>
                  <select
                    id={`${ids}-status`}
                    className="ogp-admin-select"
                    value={triageStatus}
                    onChange={(event) =>
                      setTriage((previous) => ({ ...previous, status: event.target.value }))
                    }
                  >
                    {FEEDBACK_STATUSES.map((value) => (
                      <option key={value} value={value}>
                        {COPY.ADMIN.STATUS.FEEDBACK[value]}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="ogp-admin-field">
                  <label className="ogp-admin-label" htmlFor={`${ids}-notes`}>
                    {COPY.ADMIN.FEEDBACK.NOTES_LABEL}
                  </label>
                  <textarea
                    id={`${ids}-notes`}
                    className="ogp-admin-textarea"
                    rows={6}
                    aria-describedby={`${ids}-notes-hint`}
                    value={adminNotes}
                    onChange={(event) =>
                      setTriage((previous) => ({ ...previous, adminNotes: event.target.value }))
                    }
                  />
                  <p className="ogp-admin-hint" id={`${ids}-notes-hint`}>
                    {COPY.ADMIN.FEEDBACK.NOTES_HINT}
                  </p>
                </div>

                {failure ? (
                  <Notice tone="error" title={COPY.ADMIN.COMMON.ERROR_TITLE}>
                    <p>{messageForError(failure)}</p>
                  </Notice>
                ) : null}
                {saved ? <Notice tone="success">{COPY.ADMIN.COMMON.SAVED}</Notice> : null}

                <div className="ogp-admin-actions">
                  <button
                    type="submit"
                    className="ogp-admin-button ogp-admin-button--primary"
                    disabled={saving}
                  >
                    {saving ? COPY.ADMIN.COMMON.SAVING : COPY.ADMIN.FEEDBACK.SAVE_TRIAGE}
                  </button>
                </div>
              </form>
            </Panel>
          </>
        ) : null}
      </ResourceState>
    </>
  );
}

export default FeedbackDetail;
