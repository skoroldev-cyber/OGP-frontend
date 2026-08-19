/**
 * The two Founding Reader messages, and nothing else.
 *
 * The set is closed on purpose: §10.6.4 rules out email campaign tooling, so this screen
 * rewrites what the two existing messages say and cannot create a third. There is no
 * schedule, no sequence and no recipient list here — that lives, deliberately singular, on
 * the invitations screen.
 *
 * Two refusals are expected and are treated as ordinary results rather than as errors:
 *
 *  - the copy lint (§10.6.2) refuses a prohibited term, with no override, because the message
 *    reaches someone who did not ask for marketing language;
 *  - the renderer refuses a placeholder it does not know, and refuses a message that has lost
 *    `{{invitationUrl}}` — a message promising a private reading link and carrying none.
 *
 * Both come back as a 422 with the server's own sentence, which is shown verbatim beneath a
 * line explaining why the rule exists. The editor keeps the copy on screen throughout: a
 * refusal that discarded the draft would be a worse offence than the term that caused it.
 *
 * The preview renders inside a fully sandboxed iframe. The copy is founder-authored, but it
 * is still stored data being rendered as markup, and `sandbox=""` means no script in it can
 * run even if one day it contains something that never should have been stored.
 */

import { useCallback, useId, useState } from 'react';

import { COPY } from '@/config/copy';
import { adminApi } from '@/admin/adminApi';
import { formatDateTime, messageForError } from '@/admin/adminFormat';
import { Notice } from '@/admin/components/Notice';
import { Panel } from '@/admin/components/Panel';
import { ResourceState } from '@/admin/components/ResourceState';
import { useAdminResource } from '@/admin/useAdminResource';

/**
 * The placeholder as it is written in the copy.
 *
 * Built rather than written literally so the braces are never mistaken for a JSX expression,
 * and so the four names have exactly one spelling in this file.
 *
 * @param {string} name The placeholder name.
 * @returns {string} The token.
 */
const token = (name) => `{{${name}}}`;

/**
 * Which explanation belongs to a refusal.
 *
 * @param {{ code?: string }|null} failure The API failure.
 * @returns {string|null} The line to show above the server's own message.
 */
const explanationFor = (failure) => {
  if (failure?.code === 'PROHIBITED_TERM') return COPY.ADMIN.TEMPLATES.REJECTED_PROHIBITED;
  if (failure?.code === 'UNKNOWN_PLACEHOLDER') return COPY.ADMIN.TEMPLATES.REJECTED_PLACEHOLDER;
  if (failure?.code === 'MISSING_PLACEHOLDER') return COPY.ADMIN.TEMPLATES.REJECTED_MISSING;
  return null;
};

/**
 * @returns {import('react').ReactElement} The templates screen.
 */
export function TemplatesScreen() {
  const ids = useId();

  const load = useCallback(() => adminApi.listTemplates(), []);
  const { status, data, error, reload } = useAdminResource(load);

  const templates = data?.templates ?? [];
  const [activeKey, setActiveKey] = useState(null);
  const [edits, setEdits] = useState({});
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(null);
  const [failure, setFailure] = useState(null);
  const [saved, setSaved] = useState(false);

  // Derived rather than copied into state on load: an effect that seeded a draft from the
  // fetched copy would fight every re-read, and would silently drop an edit in progress.
  const key = activeKey ?? templates[0]?.key ?? '';
  const stored = templates.find((template) => template.key === key) ?? null;
  const edit = edits[key] ?? {};
  const draft = {
    subject: edit.subject ?? stored?.subject ?? '',
    bodyText: edit.bodyText ?? stored?.bodyText ?? '',
    bodyHtml: edit.bodyHtml ?? stored?.bodyHtml ?? '',
  };

  /**
   * @param {string} field The field being edited.
   * @param {string} value The new value.
   * @returns {void}
   */
  const setField = (field, value) => {
    setSaved(false);
    setEdits((previous) => ({ ...previous, [key]: { ...previous[key], [field]: value } }));
  };

  /**
   * The body as the API takes it. An emptied HTML body is omitted, which the service stores
   * as null — the message then goes out as plain text only.
   *
   * @returns {{ subject: string, bodyText: string, bodyHtml?: string }} The payload.
   */
  const payload = () => ({
    subject: draft.subject,
    bodyText: draft.bodyText,
    ...(draft.bodyHtml.trim() === '' ? {} : { bodyHtml: draft.bodyHtml }),
  });

  /**
   * @returns {Promise<void>} Resolves when the preview or its refusal is on screen.
   */
  const onPreview = async () => {
    setBusy('preview');
    setFailure(null);
    try {
      const result = await adminApi.previewTemplate(key, payload());
      setPreview(result.preview);
    } catch (thrown) {
      setPreview(null);
      setFailure(thrown);
    } finally {
      setBusy(null);
    }
  };

  /**
   * @param {import('react').FormEvent} event The submission.
   * @returns {Promise<void>} Resolves when the copy is stored or refused.
   */
  const onSave = async (event) => {
    event.preventDefault();
    setBusy('save');
    setFailure(null);
    setSaved(false);
    try {
      await adminApi.saveTemplate(key, payload());
      setEdits((previous) => {
        const next = { ...previous };
        delete next[key];
        return next;
      });
      setSaved(true);
      reload();
    } catch (thrown) {
      setFailure(thrown);
    } finally {
      setBusy(null);
    }
  };

  const explanation = explanationFor(failure);

  return (
    <>
      <header className="ogp-admin-screen-head">
        <h1 className="ogp-admin-screen-heading">{COPY.ADMIN.TEMPLATES.HEADING}</h1>
        <p className="ogp-admin-screen-intro">{COPY.ADMIN.TEMPLATES.INTRO}</p>
      </header>

      <ResourceState status={status} error={error} onRetry={reload}>
        <Panel title={COPY.ADMIN.TEMPLATES.PICKER_LABEL}>
          <div className="ogp-admin-field">
            <label className="ogp-admin-label" htmlFor={`${ids}-key`}>
              {COPY.ADMIN.TEMPLATES.PICKER_LABEL}
            </label>
            <select
              id={`${ids}-key`}
              className="ogp-admin-select"
              value={key}
              onChange={(event) => {
                setActiveKey(event.target.value);
                setPreview(null);
                setFailure(null);
                setSaved(false);
              }}
            >
              {templates.map((template) => (
                <option key={template.key} value={template.key}>
                  {COPY.ADMIN.TEMPLATES.KEYS[template.key] ?? template.key}
                </option>
              ))}
            </select>
          </div>

          {stored ? (
            <dl className="ogp-admin-meta">
              <div className="ogp-admin-meta__pair">
                <dt>{COPY.ADMIN.TEMPLATES.VERSION}</dt>
                <dd>{stored.version}</dd>
              </div>
              <div className="ogp-admin-meta__pair">
                <dt>{COPY.ADMIN.TEMPLATES.UPDATED_BY}</dt>
                <dd>{stored.updatedBy || COPY.ADMIN.COMMON.NOT_RECORDED}</dd>
              </div>
              <div className="ogp-admin-meta__pair">
                <dt>{COPY.ADMIN.COMMON.UPDATED}</dt>
                <dd>{formatDateTime(stored.updatedAt)}</dd>
              </div>
            </dl>
          ) : null}
        </Panel>

        <div className="ogp-admin-split">
          <form className="ogp-admin-form ogp-admin-split__main" onSubmit={onSave} noValidate>
            <div className="ogp-admin-field">
              <label className="ogp-admin-label" htmlFor={`${ids}-subject`}>
                {COPY.ADMIN.TEMPLATES.SUBJECT}
              </label>
              <input
                id={`${ids}-subject`}
                className="ogp-admin-input"
                type="text"
                value={draft.subject}
                onChange={(event) => setField('subject', event.target.value)}
              />
            </div>

            <div className="ogp-admin-field">
              <label className="ogp-admin-label" htmlFor={`${ids}-text`}>
                {COPY.ADMIN.TEMPLATES.BODY_TEXT}
              </label>
              <textarea
                id={`${ids}-text`}
                className="ogp-admin-textarea ogp-admin-textarea--tall"
                rows={16}
                value={draft.bodyText}
                onChange={(event) => setField('bodyText', event.target.value)}
              />
            </div>

            <div className="ogp-admin-field">
              <label className="ogp-admin-label" htmlFor={`${ids}-html`}>
                {COPY.ADMIN.TEMPLATES.BODY_HTML}
              </label>
              <textarea
                id={`${ids}-html`}
                className="ogp-admin-textarea ogp-admin-textarea--tall ogp-admin-textarea--code"
                rows={14}
                spellCheck="false"
                value={draft.bodyHtml}
                onChange={(event) => setField('bodyHtml', event.target.value)}
              />
            </div>

            {failure ? (
              <Notice tone="error" title={COPY.ADMIN.TEMPLATES.REJECTED_HEADING}>
                {explanation ? <p>{explanation}</p> : null}
                <p className="ogp-admin-notice__detail">{messageForError(failure)}</p>
              </Notice>
            ) : null}
            {saved ? <Notice tone="success">{COPY.ADMIN.TEMPLATES.SAVED}</Notice> : null}

            <div className="ogp-admin-actions">
              <button
                type="submit"
                className="ogp-admin-button ogp-admin-button--primary"
                disabled={busy !== null}
              >
                {busy === 'save' ? COPY.ADMIN.COMMON.SAVING : COPY.ADMIN.TEMPLATES.SAVE}
              </button>
              <button
                type="button"
                className="ogp-admin-button"
                disabled={busy !== null}
                onClick={onPreview}
              >
                {busy === 'preview' ? COPY.ADMIN.TEMPLATES.PREVIEWING : COPY.ADMIN.TEMPLATES.PREVIEW}
              </button>
            </div>
          </form>

          <aside className="ogp-admin-split__aside" aria-labelledby={`${ids}-placeholders`}>
            <h2 className="ogp-admin-subheading" id={`${ids}-placeholders`}>
              {COPY.ADMIN.TEMPLATES.PLACEHOLDERS_HEADING}
            </h2>
            <p className="ogp-admin-hint">{COPY.ADMIN.TEMPLATES.PLACEHOLDERS_INTRO}</p>
            <dl className="ogp-admin-placeholders">
              {Object.entries(COPY.ADMIN.TEMPLATES.PLACEHOLDER_ITEMS).map(([name, description]) => (
                <div className="ogp-admin-placeholders__pair" key={name}>
                  <dt>
                    <code className="ogp-admin-code">{token(name)}</code>
                  </dt>
                  <dd>{description}</dd>
                </div>
              ))}
            </dl>
          </aside>
        </div>

        <Panel title={COPY.ADMIN.TEMPLATES.PREVIEW_HEADING}>
          {preview ? (
            <div className="ogp-admin-preview-render">
              <h3 className="ogp-admin-subheading">{COPY.ADMIN.TEMPLATES.PREVIEW_SUBJECT}</h3>
              <p className="ogp-admin-preview-render__subject">{preview.subject}</p>

              <h3 className="ogp-admin-subheading">{COPY.ADMIN.TEMPLATES.PREVIEW_TEXT}</h3>
              <pre className="ogp-admin-pre">{preview.text}</pre>

              {preview.html ? (
                <>
                  <h3 className="ogp-admin-subheading">{COPY.ADMIN.TEMPLATES.PREVIEW_HTML}</h3>
                  <iframe
                    className="ogp-admin-frame"
                    title={COPY.ADMIN.TEMPLATES.PREVIEW_HTML_FRAME}
                    sandbox=""
                    srcDoc={preview.html}
                  />
                  <h3 className="ogp-admin-subheading">
                    {COPY.ADMIN.TEMPLATES.PREVIEW_HTML_SOURCE}
                  </h3>
                  <pre className="ogp-admin-pre">{preview.html}</pre>
                </>
              ) : null}
            </div>
          ) : (
            <p className="ogp-admin-state">{COPY.ADMIN.TEMPLATES.PREVIEW_NONE}</p>
          )}
        </Panel>
      </ResourceState>
    </>
  );
}

export default TemplatesScreen;
