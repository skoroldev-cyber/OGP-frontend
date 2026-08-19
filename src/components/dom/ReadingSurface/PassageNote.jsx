/**
 * A note about one marked passage, written while reading.
 *
 * **This is a deliberate departure from §3.13, made on the founder's instruction.** The clause
 * places the instrument after completion — "Please read the Opening Arc without stopping to
 * edit" — and the reasoning behind it is sound: a reader interrupted to evaluate stops being a
 * reader. What is built here keeps everything that reasoning protects and gives up only the
 * timing:
 *
 *   · Nothing asks. This never opens on its own, never appears on a schedule, never follows a
 *     unit boundary. It opens because the reader marked a passage and then chose a second
 *     control that says exactly what it will do.
 *   · Nothing is owed. There is no prompt, no counter of notes written, no acknowledgement
 *     beyond one line, and closing without writing costs nothing (§14.4.1).
 *   · Nothing is lost by ignoring it. The passage is still marked, still listed at S13, and
 *     the reader can still write about it there instead — this is an additional door onto the
 *     same room, not a replacement for it.
 *
 * The reference travels with the words. `passages[]` carries `{ unitId, excerpt, charStart,
 * charEnd }`, which is what lets a reviewer open the exact sentence the reader meant rather
 * than reconstruct it from a description — the same anchor the S13 form sends, produced by the
 * same marks.
 *
 * The reader's text is never cleared on failure. A note refused for any reason stays on
 * screen, in the box, with a line saying what happened.
 */

import { useCallback, useId, useState } from 'react';

import { COPY } from '@/config/copy';
import { ApiError, CLIENT_ERROR_CODES, FEEDBACK_CATEGORIES, FEEDBACK_LIMITS, api } from '@/services/api';
import { hasRange } from '@/components/dom/ReadingSurface/usePassageMarks';

import { ChannelIcon } from '@/components/dom/ChannelIcon';
import { Modal } from '@/components/dom/Modal';

/**
 * The same mapping the S13 form uses, for the same reason: one sentence for every cause is
 * only kind when every cause has the same remedy, and these do not.
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

/**
 * Deliberately permissive, and identical to the S13 form's. The address is checked so that a
 * reader who asked to be written back to is not left with a reply that can never arrive; it is
 * not checked to police anybody.
 *
 * @param {string} value
 * @returns {boolean}
 */
const looksLikeEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim());

/**
 * The wire shape of one passage anchor. `componentIndex` is resolved server-side from the
 * unit, so a client cannot file a note against a component the passage does not belong to.
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
 * @param {{ mark: Object, onClose: () => void }} props
 */
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

  // Said while it can still be acted on, never as a refusal: an address typed with the box
  // unticked is a misunderstanding worth naming, not a mistake worth blocking.
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
      // Sent only with consent. The server would discard it anyway, but an address that was
      // never transmitted cannot be discarded incorrectly.
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
        {/* One line. The reading is what the reader came back to. */}
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
      {/* The reader's own passage, shown first: it is the reference, and seeing it is how
          they know the note will arrive attached to the right words. */}
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

        {/* Off by default, and the note says exactly what ticking it does (§9.2.7). */}
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
