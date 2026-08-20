import { useCallback, useMemo, useState } from 'react';

import { COPY } from '@/config/copy';
import { EVENTS } from '@/experience/states';
import { emit as emitEvent } from '@/services/events';

import { Modal } from '@/components/dom/Modal';

const MESSAGE_MAX_LENGTH = 600;

const NAME_MAX_LENGTH = 80;

export const composeShareBody = (name, message, url) => {
  const who = name.trim();
  const body = message.trim();
  const greeting = who === '' ? '' : COPY.SHARE.COMPOSE_GREETING.replace('{name}', who);

  return [greeting, body, url].filter((part) => part !== '').join('\n\n');
};

export const ShareComposer = ({ url, onClose, message: initialMessage, eventPayload }) => {
  const [name, setName] = useState('');
  const [message, setMessage] = useState(initialMessage ?? COPY.SHARE.MESSAGE);
  const [copied, setCopied] = useState(false);

  const body = useMemo(() => composeShareBody(name, message, url), [name, message, url]);

  const onSend = useCallback(() => {
    if (typeof window === 'undefined') return;

    const subject = encodeURIComponent(COPY.SHARE.EMAIL_SUBJECT);
    window.location.href = `mailto:?subject=${subject}&body=${encodeURIComponent(body)}`;

    emitEvent(EVENTS.SHARE_COMPLETED, { channel: 'email', ...eventPayload });
    onClose?.();
  }, [body, eventPayload, onClose]);

  const onCopy = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      void 0;
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
