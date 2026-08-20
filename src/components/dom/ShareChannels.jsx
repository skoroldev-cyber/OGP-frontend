
import { useCallback, useEffect, useId, useRef, useState } from 'react';

import { COPY } from '@/config/copy';

import { ChannelIcon } from '@/components/dom/ChannelIcon';
import { Modal } from '@/components/dom/Modal';
import { ShareComposer } from '@/components/dom/ShareComposer';

const originUrl = () => (typeof window !== 'undefined' ? window.location.origin : '');

const CHANNELS = [
  { key: 'email', icon: 'email', label: () => COPY.SHARE.EMAIL, ready: true },
  { key: 'whatsapp', icon: 'whatsapp', label: () => COPY.SHARE.WHATSAPP, ready: false },
  { key: 'linkedin', icon: 'linkedin', label: () => COPY.SHARE.LINKEDIN, ready: false },
];

export const ShareChannels = ({
  variant = 'inline',
  url,
  message = COPY.SHARE.MESSAGE,
  className = '',
  eventPayload,
  onShared,
}) => {
  const [open, setOpen] = useState(false);
  const [dialog, setDialog] = useState(null);

  const rootRef = useRef(null);
  const panelId = useId();

  const resolveUrl = useCallback(() => (url && String(url).trim()) || originUrl(), [url]);

  const close = useCallback(() => setOpen(false), []);
  const toggle = useCallback(() => setOpen((value) => !value), []);
  const closeDialog = useCallback(() => setDialog(null), []);

  const onChannel = useCallback((channel) => {
    setDialog(channel.key);
    setOpen(false);
  }, []);

  const onComposerClose = useCallback(() => {
    setDialog(null);
    onShared?.('email');
  }, [onShared]);

  useEffect(() => {
    if (!open || variant !== 'disclosure') return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') close();
    };
    const onPointer = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) close();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [close, open, variant]);

  const notReady = dialog !== null && dialog !== 'email' ? CHANNELS.find((c) => c.key === dialog) : null;

  const channels = (
    <ul className="ogp-share-channels__list">
      {CHANNELS.map((channel) => (
        <li key={channel.key} className="ogp-share-channels__item">
          <button
            type="button"
            className="ogp-share-channels__channel"
            data-ready={channel.ready ? 'true' : 'false'}
            onClick={() => onChannel(channel)}
          >
            <ChannelIcon name={channel.icon} className="ogp-share-channels__icon" />
            <span className="ogp-share-channels__label">{channel.label()}</span>
            {!channel.ready && (
              <span className="ogp-share-channels__soon">{COPY.SHARE.COMING_SOON}</span>
            )}
          </button>
        </li>
      ))}
    </ul>
  );

  const dialogs = (
    <>
      {dialog === 'email' && (
        <ShareComposer
          url={resolveUrl()}
          message={message}
          eventPayload={eventPayload}
          onClose={onComposerClose}
        />
      )}
      {notReady && (
        <Modal
          title={COPY.SHARE.SOON_TITLE.replace('{channel}', notReady.label())}
          onClose={closeDialog}
          className="ogp-share-soon"
        >
          <p className="ogp-share-soon__body">{COPY.SHARE.SOON_BODY}</p>
          <p className="ogp-share-soon__body">{COPY.SHARE.SOON_ALTERNATIVE}</p>
        </Modal>
      )}
    </>
  );

  if (variant === 'disclosure') {
    return (
      <div
        ref={rootRef}
        className={`ogp-share-channels ogp-share-channels--disclosure ${className}`.trim()}
      >
        <button
          type="button"
          className="ogp-affordance"
          aria-expanded={open}
          aria-controls={open ? panelId : undefined}
          onClick={toggle}
        >
          {COPY.NAV.SHARE}
        </button>
        {open && (
          <div
            id={panelId}
            className="ogp-share-channels__panel"
            role="group"
            aria-label={COPY.SHARE.OFFER}
          >
            {channels}
          </div>
        )}
        {dialogs}
      </div>
    );
  }

  return (
    <div
      className={`ogp-share-channels ogp-share-channels--inline ${className}`.trim()}
      role="group"
      aria-label={COPY.SHARE.OFFER}
    >
      {channels}
      {dialogs}
    </div>
  );
};

export default ShareChannels;
