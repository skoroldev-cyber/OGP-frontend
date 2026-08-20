import { useCallback, useId, useState } from 'react';

import { COPY } from '@/config/copy';
import { ApiError, CLIENT_ERROR_CODES, FEEDBACK_CATEGORIES, FEEDBACK_LIMITS, api } from '@/services/api';
import { hasRange } from '@/components/dom/ReadingSurface/usePassageMarks';

import { ChannelIcon } from '@/components/dom/ChannelIcon';
import { Modal } from '@/components/dom/Modal';

const explain = (error) => {
  if (!(error instanceof ApiError)) return COPY.FEEDBACK.UNAVAILABLE;
  if (error.code === CLIENT_ERROR_CODES.NETWORK) return COPY.FEEDBACK.OFFLINE;
  if (error.code === CLIENT_ERROR_CODES.TIMEOUT) return COPY.FEEDBACK.SLOW;
  if (error.status === 429) return COPY.FEEDBACK.TOO_MANY;
  if (error.status === 400 || error.status === 422) return COPY.FEEDBACK.REFUSED;
  return COPY.FEEDBACK.UNAVAILABLE;
};

const looksLikeEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim());

const toPassage = (mark) => {
  const passage = { unitId: mark.unitId };
  if (mark.excerpt) passage.excerpt = mark.excerpt;
  if (hasRange(mark)) {
    passage.charStart = mark.charStart;
    passage.charEnd = mark.charEnd;
  }
  return passage;
};

export const PassageNote = ({ mark, onClose }) => {
  const ids = useId();

  const [body, setBody] = useState('');
  const [category, setCategory] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [contactConsent, setContactConsent] = useState(false);
  const [failure, setFailure] = useState(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const addressWillBeDropped = email.trim() !== '' && !contactConsent;

  const onSubmit = useCallback(async () => {
    if (busy) return;

    if (body.trim() === '') {
      setFailure(COPY.FEEDBACK.BODY_REQUIRED);
      return;
    }

    const address = email.trim();
    if (contactConsent && address === '') {
      setFailure(COPY.FEEDBACK.EMAIL_NEEDED);
      return;
    }
    if (contactConsent && !looksLikeEmail(address)) {
      setFailure(COPY.FEEDBACK.EMAIL_INVALID);
      return;
    }

    setFailure(null);
    setBusy(true);

    try {
      const payload = {
        body: body.trim(),
        contactConsent,
        passages: [toPassage(mark)],
      };
      if (category !== '') payload.category = category;
      if (displayName.trim() !== '') payload.displayName = displayName.trim();
      if (contactConsent) payload.email = address;

      await api.submitFeedback(payload);
      setSent(true);
    } catch (error) {
      setFailure(explain(error));
    } finally {
      setBusy(false);
    }
  }, [body, busy, category, contactConsent, displayName, email, mark]);

  if (sent) {
    return (
      <Modal title={COPY.FEEDBACK.PASSAGE_NOTE_TITLE} onClose={onClose} className="ogp-passage-note">
        <p className="ogp-passage-note__confirmation" role="status">
          {COPY.FEEDBACK.CONFIRMATION}
        </p>
      </Modal>
    );
  }

  return (
    <Modal
      title={COPY.FEEDBACK.PASSAGE_NOTE_TITLE}
      description={COPY.FEEDBACK.PASSAGE_NOTE_INTRO}
      onClose={onClose}
      className="ogp-passage-note"
      footer={
        <button type="button" className="ogp-action" onClick={onSubmit} disabled={busy}>
          {busy ? COPY.FEEDBACK.WORKING : COPY.FEEDBACK.SUBMIT}
        </button>
      }
    >
      <figure className="ogp-passage-note__reference">
        <ChannelIcon name="passage" className="ogp-passage-note__reference-icon" />
        <blockquote className="ogp-passage-note__excerpt">
          {mark.excerpt || COPY.FEEDBACK.MARKED_SECTION}
        </blockquote>
      </figure>

      <label className="ogp-field" htmlFor={`${ids}-body`}>
        <span className="ogp-field__label">{COPY.FEEDBACK.BODY_LABEL}</span>
        <textarea
          id={`${ids}-body`}
          className="ogp-field__input ogp-field__input--area"
          rows={5}
          autoFocus
          maxLength={FEEDBACK_LIMITS.bodyMaxLength}
          value={body}
          onChange={(event) => setBody(event.target.value)}
        />
      </label>

      <label className="ogp-field" htmlFor={`${ids}-category`}>
        <span className="ogp-field__label">{COPY.FEEDBACK.CATEGORY_LABEL}</span>
        <select
          id={`${ids}-category`}
          className="ogp-field__input"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
        >
          <option value="">{COPY.FEEDBACK.CATEGORY_NONE}</option>
          {FEEDBACK_CATEGORIES.map((value) => (
            <option key={value} value={value}>
              {COPY.FEEDBACK.CATEGORY_LABELS[value]}
            </option>
          ))}
        </select>
      </label>

      <label className="ogp-field" htmlFor={`${ids}-name`}>
        <span className="ogp-field__label">{COPY.FEEDBACK.NAME_LABEL}</span>
        <input
          id={`${ids}-name`}
          type="text"
          className="ogp-field__input"
          autoComplete="name"
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
        />
      </label>

      <div className="ogp-field">
        <label className="ogp-field__label" htmlFor={`${ids}-email`}>
          {COPY.FEEDBACK.EMAIL_LABEL}
        </label>
        <input
          id={`${ids}-email`}
          type="email"
          className="ogp-field__input"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />

        {addressWillBeDropped && (
          <p className="ogp-field__hint" role="status">
            {COPY.FEEDBACK.EMAIL_WITHOUT_CONSENT}
          </p>
        )}

        <label className="ogp-passage-note__consent">
          <input
            type="checkbox"
            checked={contactConsent}
            onChange={(event) => setContactConsent(event.target.checked)}
          />
          <span>{COPY.FEEDBACK.CONTACT_CONSENT}</span>
        </label>
        <p className="ogp-field__hint">{COPY.FEEDBACK.CONTACT_CONSENT_NOTE}</p>
      </div>

      {failure && (
        <p className="ogp-passage-note__problem" role="status">
          {failure}
        </p>
      )}

      <p className="ogp-field__hint">{COPY.FEEDBACK.PASSAGE_NOTE_LATER}</p>
    </Modal>
  );
};

export default PassageNote;
