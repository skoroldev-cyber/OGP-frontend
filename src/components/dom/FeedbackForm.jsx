import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { COPY } from '@/config/copy';
import { ApiError, CLIENT_ERROR_CODES, FEEDBACK_CATEGORIES, FEEDBACK_LIMITS, api } from '@/services/api';
import { AREAS, STORAGE_KEYS, mergeNamespaced, readNamespaced } from '@/services/storage';
import { setNoteComposerOpen } from '@/components/dom/noteComposerState';
import {
  hasRange,
  passageMarkKey,
  usePassageMarks,
} from '@/components/dom/ReadingSurface/usePassageMarks';

const DRAFT_NAMESPACE = 'feedbackDraft';

const emptyDraft = () => ({
  body: '',
  category: '',
  displayName: '',
  email: '',
  contactConsent: false,
  comments: {},
});

const explain = (error) => {
  if (!(error instanceof ApiError)) return COPY.FEEDBACK.UNAVAILABLE;
  if (error.code === CLIENT_ERROR_CODES.NETWORK) return COPY.FEEDBACK.OFFLINE;
  if (error.code === CLIENT_ERROR_CODES.TIMEOUT) return COPY.FEEDBACK.SLOW;
  if (error.status === 429) return COPY.FEEDBACK.TOO_MANY;
  if (error.status === 400 || error.status === 422) return COPY.FEEDBACK.REFUSED;
  return COPY.FEEDBACK.UNAVAILABLE;
};

const IDS = Object.freeze({
  body: 'ogp-feedback-body',
  bodyHint: 'ogp-feedback-body-hint',
  bodyError: 'ogp-feedback-body-error',
  category: 'ogp-feedback-category',
  name: 'ogp-feedback-name',
  email: 'ogp-feedback-email',
  emailError: 'ogp-feedback-email-error',
  emailOrphan: 'ogp-feedback-email-orphan',
  consentNote: 'ogp-feedback-consent-note',
  marks: 'ogp-feedback-marks',
});

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

const composeNote = (general, marks, comments) => {
  const parts = [general.trim()];

  for (const mark of marks) {
    const comment = (comments[passageMarkKey(mark)] ?? '').trim();
    if (comment === '') continue;
    const heading = `${COPY.FEEDBACK.PASSAGE_NOTE_PREFIX} ${mark.unitId}`;
    parts.push([heading, mark.excerpt, comment].filter(Boolean).join('\n'));
  }

  return parts.filter((part) => part !== '').join('\n\n');
};

export const FeedbackForm = ({ onComplete, onClose }) => {
  const { marks, removeMark, clearMarks } = usePassageMarks();

  const restored = useMemo(() => {
    const saved = readNamespaced(AREAS.SESSION, STORAGE_KEYS.SESSION, DRAFT_NAMESPACE);
    return { ...emptyDraft(), ...(saved ?? {}) };
  }, []);

  const [comments, setComments] = useState(() => restored.comments ?? {});
  const [body, setBody] = useState(() => restored.body ?? '');
  const [category, setCategory] = useState(() => restored.category ?? '');
  const [displayName, setDisplayName] = useState(() => restored.displayName ?? '');
  const [email, setEmail] = useState(() => restored.email ?? '');
  const [contactConsent, setContactConsent] = useState(() => restored.contactConsent === true);

  const [keptFrom, setKeptFrom] = useState(null);

  const [bodyError, setBodyError] = useState(null);
  const [emailError, setEmailError] = useState(null);
  const [failure, setFailure] = useState(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const bodyRef = useRef(null);
  const emailRef = useRef(null);

  const onComment = useCallback((key, value) => {
    setComments((previous) => ({ ...previous, [key]: value }));
  }, []);

  const discardPassage = useCallback(
    (mark) => {
      const key = passageMarkKey(mark);
      const comment = (comments[key] ?? '').trim();

      if (comment !== '') {
        const heading = `${COPY.FEEDBACK.PASSAGE_NOTE_PREFIX} ${mark.unitId}`;
        const block = [heading, mark.excerpt, comment].filter(Boolean).join('\n');
        setBody((previous) => (previous.trim() === '' ? block : `${previous.trimEnd()}\n\n${block}`));
        setKeptFrom(mark.unitId);
      }

      setComments((previous) => {
        const next = { ...previous };
        delete next[key];
        return next;
      });
      removeMark(mark);
    },
    [comments, removeMark],
  );

  useEffect(() => {
    setNoteComposerOpen(true);
    return () => setNoteComposerOpen(false);
  }, []);

  useEffect(() => {
    if (sent) return;
    mergeNamespaced(AREAS.SESSION, STORAGE_KEYS.SESSION, DRAFT_NAMESPACE, {
      body,
      category,
      displayName,
      email,
      contactConsent,
      comments,
    });
  }, [sent, body, category, displayName, email, contactConsent, comments]);

  const addressWillBeDropped = email.trim() !== '' && !contactConsent;

  const onSubmit = useCallback(async () => {
    const note = composeNote(body, marks, comments);

    if (body.trim() === '') {
      setBodyError(COPY.FEEDBACK.BODY_REQUIRED);
      bodyRef.current?.focus();
      return;
    }
    if (note.length > FEEDBACK_LIMITS.bodyMaxLength) {
      setBodyError(COPY.FEEDBACK.BODY_TOO_LONG);
      bodyRef.current?.focus();
      return;
    }
    setBodyError(null);

    const address = email.trim();
    if (contactConsent && address === '') {
      setEmailError(COPY.FEEDBACK.EMAIL_NEEDED);
      emailRef.current?.focus();
      return;
    }
    if (contactConsent && !looksLikeEmail(address)) {
      setEmailError(COPY.FEEDBACK.EMAIL_INVALID);
      emailRef.current?.focus();
      return;
    }
    setEmailError(null);
    setFailure(null);

    const payload = { body: note, contactConsent };
    if (category !== '') payload.category = category;
    if (displayName.trim() !== '') payload.displayName = displayName.trim();
    if (contactConsent) payload.email = address;

    const passages = marks.slice(0, FEEDBACK_LIMITS.maxPassages).map(toPassage);
    if (passages.length > 0) payload.passages = passages;

    setBusy(true);
    try {
      await api.submitFeedback(payload);
      clearMarks();
      mergeNamespaced(AREAS.SESSION, STORAGE_KEYS.SESSION, DRAFT_NAMESPACE, emptyDraft());
      setSent(true);
    } catch (error) {
      setFailure(explain(error));
    } finally {
      setBusy(false);
    }
  }, [body, marks, comments, category, displayName, email, contactConsent, clearMarks]);

  const emailDescribedBy = useMemo(
    () =>
      [
        emailError ? IDS.emailError : null,
        addressWillBeDropped ? IDS.emailOrphan : null,
        IDS.consentNote,
      ]
        .filter(Boolean)
        .join(' '),
    [emailError, addressWillBeDropped],
  );

  if (sent) {
    return (
      <section className="ogp-feedback" aria-label={COPY.FEEDBACK.TITLE}>
        <div className="ogp-feedback__column">
          <p className="ogp-feedback__confirmation" role="status">
            {COPY.FEEDBACK.CONFIRMATION}
          </p>
          {onComplete && (
            <button type="button" className="ogp-invitation" onClick={onComplete}>
              {COPY.COMPLETE.CONTINUE}
            </button>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="ogp-feedback" aria-label={COPY.FEEDBACK.TITLE}>
      <div className="ogp-feedback__column">
        <h2 className="ogp-feedback__title">{COPY.FEEDBACK.TITLE}</h2>
        <p className="ogp-feedback__intro">{COPY.FEEDBACK.INTRO}</p>

        {marks.length > 0 && (
          <section className="ogp-feedback__marks" aria-labelledby={IDS.marks}>
            <h3 className="ogp-feedback__subtitle" id={IDS.marks}>
              {COPY.FEEDBACK.MARKED_HEADING}
            </h3>
            <p className="ogp-feedback__note">{COPY.FEEDBACK.MARKED_NOTE}</p>

            <ul className="ogp-feedback__mark-list" role="list">
              {marks.map((mark) => {
                const key = passageMarkKey(mark);
                const commentId = `ogp-feedback-mark-${key.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
                return (
                  <li key={key} className="ogp-feedback__mark">
                    <blockquote className="ogp-feedback__excerpt">{mark.excerpt}</blockquote>
                    {!hasRange(mark) && (
                      <p className="ogp-feedback__note">{COPY.FEEDBACK.MARKED_SECTION}</p>
                    )}

                    <label className="ogp-feedback__field" htmlFor={commentId}>
                      <span>{COPY.FEEDBACK.MARKED_COMMENT_LABEL}</span>
                      <textarea
                        id={commentId}
                        rows={3}
                        maxLength={FEEDBACK_LIMITS.bodyMaxLength}
                        value={comments[key] ?? ''}
                        onChange={(event) => onComment(key, event.target.value)}
                      />
                    </label>

                    <button
                      type="button"
                      className="ogp-affordance ogp-feedback__discard"
                      onClick={() => discardPassage(mark)}
                    >
                      {COPY.FEEDBACK.MARK_DISCARD}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        <div className="ogp-feedback__question">
          <label className="ogp-feedback__field" htmlFor={IDS.body}>
            <span>{COPY.FEEDBACK.BODY_LABEL}</span>
            <textarea
              id={IDS.body}
              ref={bodyRef}
              rows={8}
              required
              maxLength={FEEDBACK_LIMITS.bodyMaxLength}
              aria-describedby={bodyError ? `${IDS.bodyHint} ${IDS.bodyError}` : IDS.bodyHint}
              aria-invalid={bodyError ? 'true' : undefined}
              value={body}
              onChange={(event) => setBody(event.target.value)}
            />
          </label>
          <p className="ogp-feedback__note" id={IDS.bodyHint}>
            {COPY.FEEDBACK.BODY_HINT}
          </p>
          {keptFrom && (
            <p className="ogp-feedback__note" role="status">
              {COPY.FEEDBACK.MARK_DISCARD_KEPT}
            </p>
          )}
          {bodyError && (
            <p className="ogp-feedback__problem" id={IDS.bodyError}>
              {bodyError}
            </p>
          )}
        </div>

        <div className="ogp-feedback__question">
          <label className="ogp-feedback__field" htmlFor={IDS.category}>
            <span>{COPY.FEEDBACK.CATEGORY_LABEL}</span>
            <select
              id={IDS.category}
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
        </div>

        <div className="ogp-feedback__question">
          <label className="ogp-feedback__field" htmlFor={IDS.name}>
            <span>{COPY.FEEDBACK.NAME_LABEL}</span>
            <input
              id={IDS.name}
              type="text"
              autoComplete="name"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
            />
          </label>
        </div>

        <div className="ogp-feedback__question">
          <label className="ogp-feedback__field" htmlFor={IDS.email}>
            <span>{COPY.FEEDBACK.EMAIL_LABEL}</span>
            <input
              id={IDS.email}
              ref={emailRef}
              type="email"
              autoComplete="email"
              aria-describedby={emailDescribedBy}
              aria-invalid={emailError ? 'true' : undefined}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          {emailError && (
            <p className="ogp-feedback__problem" id={IDS.emailError}>
              {emailError}
            </p>
          )}
          {addressWillBeDropped && (
            <p className="ogp-feedback__note" id={IDS.emailOrphan} role="status">
              {COPY.FEEDBACK.EMAIL_WITHOUT_CONSENT}
            </p>
          )}

          <label className="ogp-feedback__consent">
            <input
              type="checkbox"
              checked={contactConsent}
              onChange={(event) => setContactConsent(event.target.checked)}
            />
            <span>{COPY.FEEDBACK.CONTACT_CONSENT}</span>
          </label>
          <p className="ogp-feedback__note" id={IDS.consentNote}>
            {COPY.FEEDBACK.CONTACT_CONSENT_NOTE}
          </p>
        </div>

        {failure && (
          <p className="ogp-feedback__problem" role="status">
            {failure}
          </p>
        )}

        <div className="ogp-feedback__actions">
          <button
            type="button"
            className="ogp-invitation ogp-feedback__submit"
            onClick={onSubmit}
            disabled={busy}
          >
            {busy ? COPY.FEEDBACK.WORKING : COPY.FEEDBACK.SUBMIT}
          </button>

          {onClose && (
            <button type="button" className="ogp-affordance" onClick={onClose}>
              {COPY.FEEDBACK.CLOSE}
            </button>
          )}
        </div>
      </div>
    </section>
  );
};

export default FeedbackForm;
