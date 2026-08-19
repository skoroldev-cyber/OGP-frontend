/**
 * The note a reader may leave once the Opening Arc is complete (master §3.13, §5.8).
 *
 * **It exists only after the reading.** §3.13 is explicit that the instrument follows
 * completion — "Please read the Opening Arc without stopping to edit" — so nothing in this
 * file is reachable while reading. During the arc a reader may mark a passage and nothing
 * else; here the marks are waiting, each with the words they were made against, so the
 * reader writes with the reference already attached instead of having to describe where they
 * were.
 *
 * **It is an invitation, and it blocks nothing.** S13's continue affordance stays where it
 * is; a reader may go straight to S14 and never see this. Opening it is a choice, closing it
 * is one control, and nothing is lost by never opening it at all.
 *
 * **What is asked, and what is not.** §5's framing is "Feedback is evidence, not
 * governance": the prompts ask what was clear, what was not, what felt honest, what got in
 * the way. There is no rating, no score out of five, no "did you enjoy this", no
 * recommendation question, and no celebration on submission — one quiet acknowledgement, and
 * then the reader's own way onward (§14.4.1).
 *
 * **What this form does not collect, and cannot.** No age, no age band, no birthdate, no
 * gender, no location. §14.4.3 forbids the profiling and §9.2 keeps the band in session state
 * where it never sits beside contact details; the server's schema is closed, so there is no
 * field for any of it to arrive in either. Name and email are optional because feedback is
 * not a transaction and a reader owes the platform no identity — the note itself is the only
 * required part, because it is the only part anybody reads.
 *
 * **The address is only kept with consent.** The contact box is off by default, and while it
 * is off this client does not send the address at all — the server would discard it, but an
 * address that was never transmitted cannot be discarded incorrectly.
 */

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

/**
 * Where an unsent note waits.
 *
 * `AREAS.SESSION` is `sessionStorage`, matching the questionnaire draft. That is the right
 * lifetime for this in both directions: it survives the reload, the crash and the accidental
 * navigation, which is what a reader who has just written several paragraphs needs — and it
 * does not outlive the tab, which matters because unlike the questionnaire this draft can
 * hold a name and an email address. Prose a reader typed once should not be waiting on the
 * disk of a shared machine a week later.
 */
const DRAFT_NAMESPACE = 'feedbackDraft';

/** The fields worth keeping. Marks live in their own store and are not duplicated here. */
const emptyDraft = () => ({
  body: '',
  category: '',
  displayName: '',
  email: '',
  contactConsent: false,
  comments: {},
});

/**
 * Why the note did not go, in words a reader can act on.
 *
 * The form used to answer every failure with one sentence — "could not be sent just now" —
 * which is true of a dropped network and actively misleading of everything else. A reader
 * whose note was refused for being too long, or who had reached the hourly limit, was told to
 * try again and could try all evening without success.
 *
 * A stale session is deliberately absent from this map. The API layer replaces a rejected
 * session and re-sends the note, so by the time anything reaches here that has already been
 * attempted and is not something to explain to a reader (§3.3: never a status code, never a
 * mechanism they did not ask about).
 *
 * @param {unknown} error
 * @returns {string}
 */
const explain = (error) => {
  if (!(error instanceof ApiError)) return COPY.FEEDBACK.UNAVAILABLE;
  if (error.code === CLIENT_ERROR_CODES.NETWORK) return COPY.FEEDBACK.OFFLINE;
  if (error.code === CLIENT_ERROR_CODES.TIMEOUT) return COPY.FEEDBACK.SLOW;
  if (error.status === 429) return COPY.FEEDBACK.TOO_MANY;
  if (error.status === 400 || error.status === 422) return COPY.FEEDBACK.REFUSED;
  return COPY.FEEDBACK.UNAVAILABLE;
};

/** Field ids, declared once so the labels and the `aria-describedby` lists cannot drift. */
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

/**
 * Deliberately permissive. The address is checked so a reader who asked to be written back to
 * is not left with a reply that can never arrive; it is not checked to police anybody.
 *
 * @param {string} value
 * @returns {boolean}
 */
const looksLikeEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim());

/**
 * A mark, in the shape the server's closed passage schema accepts.
 *
 * `componentIndex` and `markedAt` are local and are dropped: the server resolves the
 * component from the unit itself, so a client cannot file a comment against a component the
 * passage does not belong to. A section mark carries no character range, and the keys are
 * omitted rather than sent as null — the schema types them as integers.
 *
 * @param {Object} mark
 * @returns {{ unitId: string, excerpt?: string, charStart?: number, charEnd?: number }}
 */
const toPassage = (mark) => {
  const passage = { unitId: mark.unitId };
  if (mark.excerpt) passage.excerpt = mark.excerpt;
  if (hasRange(mark)) {
    passage.charStart = mark.charStart;
    passage.charEnd = mark.charEnd;
  }
  return passage;
};

/**
 * The note as one body of text.
 *
 * Per-passage comments are folded in under a heading naming the unit, because the wire's
 * passage anchor carries a reference and no prose. The anchors still travel in `passages[]`,
 * so a reviewer can find every passage exactly; this is what keeps the reader's words about
 * them from being dropped on the floor.
 *
 * @param {string} general
 * @param {Array<Object>} marks
 * @param {Record<string, string>} comments
 * @returns {string}
 */
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

/**
 * @param {{ onComplete?: () => void, onClose?: () => void }} props
 */
export const FeedbackForm = ({ onComplete, onClose }) => {
  const { marks, removeMark, clearMarks } = usePassageMarks();

  // Restored once, on mount. Everything a reader typed and did not manage to send is still
  // here — including after the failure this form used to answer with an unclearable message.
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

  /** The unit whose comment was just folded into the note, so the move is stated once. */
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

  /**
   * Remove a passage, keeping anything the reader wrote about it.
   *
   * The control says it removes a passage from the note. It used to also delete, without a
   * word, the paragraph the reader had written underneath that passage: the comment lived on
   * a mark-keyed map, and both the textarea that displays it and `composeNote` iterate the
   * marks, so once the mark was gone the writing was rendered nowhere and sent nowhere. A
   * reader trimming passages to get under the length limit would silently delete their most
   * specific feedback — the part worth having.
   *
   * So the quotation goes and the reader's own words move into the note, under the same
   * heading `composeNote` would have given them. Nothing is lost, and the move is visible in
   * the textarea rather than announced and forgotten.
   */
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

  // While this is mounted, the chrome withdraws the one control that would discard it.
  useEffect(() => {
    setNoteComposerOpen(true);
    return () => setNoteComposerOpen(false);
  }, []);

  // Autosave, on every keystroke that changes anything. The note never leaves this device
  // until the reader presses send, and it never enters an analytics event at any point.
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

  // Said while it can still be acted on, and never as a blocking error: an address typed with
  // the box unticked is a misunderstanding worth naming, not a mistake worth refusing.
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
      // The marks went with the note. Leaving them behind would attach them again to whatever
      // the reader wrote next, which is not what they meant either time.
      clearMarks();
      // The draft is discarded only here, once the server has confirmed it holds the note.
      // Anywhere earlier and a failed send would destroy the thing it failed to deliver.
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
          {/* One line. No counter, no badge, no summary of what was sent (§14.4.1). */}
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

        {/* The reader's own passages first: they chose them, and they are the specific thing
            this form exists to hear about. */}
        {marks.length > 0 && (
          <section className="ogp-feedback__marks" aria-labelledby={IDS.marks}>
            <h3 className="ogp-feedback__subtitle" id={IDS.marks}>
              {COPY.FEEDBACK.MARKED_HEADING}
            </h3>
            <p className="ogp-feedback__note">{COPY.FEEDBACK.MARKED_NOTE}</p>

            <ul className="ogp-feedback__mark-list" role="list">
              {marks.map((mark) => {
                const key = passageMarkKey(mark);
                // The key carries a timestamp, whose punctuation is legal in an id but
                // awkward in one. Flattened so the `for`/`id` pair stays easy to read.
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
              {/* Nothing is pre-selected: picking a heading on the reader's behalf would be a
                  guess recorded as their answer. */}
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

          {/* Off by default, and the note says exactly what ticking it does. */}
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
