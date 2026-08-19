/**
 * The share channels offered from reading chrome and the share surfaces.
 *
 * Email opens a composer the reader can edit before their mail client does (§5.3 permits
 * exactly one pre-fill "and the reader may edit it"). WhatsApp and LinkedIn are present at
 * equal weight and say plainly that they are not built yet.
 *
 * They used to say so as `disabled` buttons with the words "Coming soon" beside them, which
 * is the one arrangement that tells a reader nothing: a control that cannot be pressed cannot
 * explain itself, is skipped by most screen-reader navigation, and reads at a glance as
 * broken rather than as unfinished. They are ordinary buttons now, and pressing one answers
 * the question it raises. Nothing is dressed up as working.
 *
 * Icons are the §8.7 house set — line, 1.5 px, 20 px grid, `currentColor` — and deliberately
 * not brand marks. See `ChannelIcon`.
 *
 * The first-screen law still holds: this component is only mounted from S9 onward (nav) or on
 * surfaces that already exist after the opening (S11, S13, S14). Sharing never appears in
 * S0–S8, and no count of anything is displayed anywhere in it (§14.4.1).
 */

import { useCallback, useEffect, useId, useRef, useState } from 'react';

import { COPY } from '@/config/copy';

import { ChannelIcon } from '@/components/dom/ChannelIcon';
import { Modal } from '@/components/dom/Modal';
import { ShareComposer } from '@/components/dom/ShareComposer';

const originUrl = () => (typeof window !== 'undefined' ? window.location.origin : '');

/**
 * The three channels, in one place so the row markup cannot drift between them.
 *
 * `ready: false` is the honest state of a channel that has no implementation. It changes what
 * pressing the row does; it does not demote the row, grey it out, or move it below the others.
 */
const CHANNELS = [
  { key: 'email', icon: 'email', label: () => COPY.SHARE.EMAIL, ready: true },
  { key: 'whatsapp', icon: 'whatsapp', label: () => COPY.SHARE.WHATSAPP, ready: false },
  { key: 'linkedin', icon: 'linkedin', label: () => COPY.SHARE.LINKEDIN, ready: false },
];

/**
 * @param {{
 *   variant?: 'inline' | 'disclosure',
 *   url?: string,
 *   message?: string,
 *   className?: string,
 *   eventPayload?: Record<string, string>,
 *   onShared?: (channel: string) => void,
 * }} props `message` seeds the composer — `ShareFlow` has its own message field above these
 *   channels, and a reader who edited it there must not find the default again here.
 */
export const ShareChannels = ({
  variant = 'inline',
  url,
  message = COPY.SHARE.MESSAGE,
  className = '',
  eventPayload,
  onShared,
}) => {
  const [open, setOpen] = useState(false);
  /** Either `null`, `'email'`, or the key of a channel that is not built yet. */
  const [dialog, setDialog] = useState(null);

  const rootRef = useRef(null);
  const panelId = useId();

  const resolveUrl = useCallback(() => (url && String(url).trim()) || originUrl(), [url]);

  const close = useCallback(() => setOpen(false), []);
  const toggle = useCallback(() => setOpen((value) => !value), []);
  const closeDialog = useCallback(() => setDialog(null), []);

  const onChannel = useCallback((channel) => {
    setDialog(channel.key);
    // The panel has done its job. Leaving it open behind a dialog would put two dismissable
    // layers on screen for one decision.
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
