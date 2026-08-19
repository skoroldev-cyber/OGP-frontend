/**
 * The email a reader sends when they pass the Opening Arc on.
 *
 * §5.3 allows exactly one pre-fill — `COPY.SHARE.MESSAGE` — **and says the reader may edit
 * it**. Handing that line straight to `mailto:` honoured the first half and quietly dropped
 * the second: the message was already sealed into the URL by the time any mail client opened,
 * and a reader who wanted to say something of their own had to delete ours first. This is the
 * editing the clause describes, done before the handoff rather than after it.
 *
 * The name field exists for the same reason. "I thought of you while taking this journey"
 * arrives from an unfamiliar address with no sender in it; a reader who adds their name is
 * editing the message, which is permitted, and the greeting is assembled here rather than
 * baked into the locked string.
 *
 * What this does not do: it does not send anything, it does not ask for the recipient, and it
 * never sees an address. The reader's own mail client opens with the message in it, addressed
 * by them, and the handoff ends there. Nothing about who they wrote to reaches the platform —
 * §5.4's "never track the reader's clipboard or messages", which is also why `ShareCompleted`
 * records only that a channel was used.
 */

import { useCallback, useMemo, useState } from 'react';

import { COPY } from '@/config/copy';
import { EVENTS } from '@/experience/states';
import { emit as emitEvent } from '@/services/events';

import { Modal } from '@/components/dom/Modal';

/** Long enough for a paragraph, short enough that no mail client truncates the handoff. */
const MESSAGE_MAX_LENGTH = 600;

/** The reader's name, if they give one. A greeting, not an identity the platform keeps. */
const NAME_MAX_LENGTH = 80;

/**
 * Assemble what the mail client will open with.
 *
 * @param {string} name
 * @param {string} message
 * @param {string} url
 * @returns {string}
 */
export const composeShareBody = (name, message, url) => {
  const who = name.trim();
  const body = message.trim();
  const greeting = who === '' ? '' : COPY.SHARE.COMPOSE_GREETING.replace('{name}', who);

  return [greeting, body, url].filter((part) => part !== '').join('\n\n');
};

/**
 * @param {{
 *   url: string,
 *   onClose: () => void,
 *   message?: string,
 *   eventPayload?: Record<string, string>,
 * }} props `message` is the starting text — `COPY.SHARE.MESSAGE` unless a caller has already
 *   given the reader somewhere to edit it, in which case that edit is what opens here.
 */
export const ShareComposer = ({ url, onClose, message: initialMessage, eventPayload }) => {
  const [name, setName] = useState('');
  const [message, setMessage] = useState(initialMessage ?? COPY.SHARE.MESSAGE);
  const [copied, setCopied] = useState(false);

  const body = useMemo(() => composeShareBody(name, message, url), [name, message, url]);

  const onSend = useCallback(() => {
    if (typeof window === 'undefined') return;

    const subject = encodeURIComponent(COPY.SHARE.EMAIL_SUBJECT);
    window.location.href = `mailto:?subject=${subject}&body=${encodeURIComponent(body)}`;

    // Recorded on handoff, which is all that can honestly be known: whether the reader then
    // pressed send in their own mail client is theirs and is never observed (§5.4).
    emitEvent(EVENTS.SHARE_COMPLETED, { channel: 'email', ...eventPayload });
    onClose?.();
  }, [body, eventPayload, onClose]);

  const onCopy = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      // A refused clipboard is not worth a message: the link is on screen and selectable.
    }
  }, [url]);

  return (
    <Modal
      title={COPY.SHARE.COMPOSE_TITLE}
      description={COPY.SHARE.COMPOSE_INTRO}
      onClose={onClose}
      className="ogp-share-composer"
      footer={
        <button type="button" className="ogp-action" onClick={onSend}>
          {COPY.SHARE.COMPOSE_SEND}
        </button>
      }
    >
      <label className="ogp-field">
        <span className="ogp-field__label">{COPY.SHARE.COMPOSE_NAME}</span>
        <input
          type="text"
          className="ogp-field__input"
          autoComplete="name"
          maxLength={NAME_MAX_LENGTH}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </label>

      <label className="ogp-field">
        <span className="ogp-field__label">{COPY.SHARE.COMPOSE_MESSAGE}</span>
        <textarea
          className="ogp-field__input ogp-field__input--area"
          rows={4}
          maxLength={MESSAGE_MAX_LENGTH}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
        />
      </label>
      <p className="ogp-field__hint">{COPY.SHARE.COMPOSE_MESSAGE_HINT}</p>

      {/* Shown rather than described. A reader passing something on should be able to see
          exactly what will arrive, including the address it points at. */}
      <div className="ogp-share-composer__preview">
        <p className="ogp-field__label">{COPY.SHARE.COMPOSE_PREVIEW}</p>
        <pre className="ogp-share-composer__preview-body">{body}</pre>
      </div>

      <div className="ogp-share-composer__link">
        <button type="button" className="ogp-affordance" onClick={onCopy}>
          {copied ? COPY.SHARE.COPIED : COPY.SHARE.COPY_LINK}
        </button>
      </div>
    </Modal>
  );
};

export default ShareComposer;
