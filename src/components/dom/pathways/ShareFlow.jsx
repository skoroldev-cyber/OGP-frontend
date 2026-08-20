import { useCallback, useState } from 'react';

import { COPY } from '@/config/copy';
import { EVENTS } from '@/experience/states';
import { api } from '@/services/api';
import { emit as emitEvent } from '@/services/events';

import { ShareChannels } from '@/components/dom/ShareChannels';

export const ShareFlow = ({ onBack }) => {
  const [share, setShare] = useState(null);
  const [message, setMessage] = useState(COPY.SHARE.MESSAGE);
  const [status, setStatus] = useState(null);

  const ensureShare = useCallback(async () => {
    if (share) return share;
    try {
      const result = await api.createShare({});
      if (!result?.shareUrl) return null;
      const created = { url: result.shareUrl, token: result.token };
      setShare(created);
      return created;
    } catch {
      return null;
    }
  }, [share]);

  const onNativeShare = useCallback(async () => {
    const created = await ensureShare();
    if (!created) return;
    if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') return;
    try {
      await navigator.share({ text: `${message} ${created.url}` });
      emitEvent(EVENTS.SHARE_COMPLETED, { shareTokenId: created.token, channel: 'native_share' });
    } catch {
      void 0;
    }
  }, [ensureShare, message]);

  const onCopy = useCallback(async () => {
    const created = await ensureShare();
    if (!created) return;
    try {
      await navigator.clipboard.writeText(`${message} ${created.url}`);
      setStatus(COPY.SHARE.COPIED);
      emitEvent(EVENTS.SHARE_COMPLETED, { shareTokenId: created.token, channel: 'copy_link' });
    } catch {
      setStatus(null);
    }
  }, [ensureShare, message]);

  const onRevoke = useCallback(async () => {
    if (!share?.token) return;
    try {
      await api.revokeShare(share.token);
    } catch {
      void 0;
    }
    setShare(null);
    setStatus(COPY.SHARE.REVOKED);
  }, [share]);

  const nativeAvailable = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  return (
    <section className="ogp-share-flow" aria-label={COPY.SHARE.OFFER}>
      <button type="button" className="ogp-affordance ogp-share-flow__back" onClick={onBack}>
        {COPY.A11Y.BACK}
      </button>

      <label className="ogp-share-flow__field" htmlFor="ogp-share-message">
        <span>{COPY.SHARE.OFFER}</span>
        <textarea
          id="ogp-share-message"
          rows={2}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
        />
      </label>

      {share && (
        <label className="ogp-share-flow__field" htmlFor="ogp-share-flow-link">
          <span>{COPY.SHARE.LINK_LABEL}</span>
          <input id="ogp-share-flow-link" type="text" value={share.url} readOnly />
        </label>
      )}

      <div className="ogp-share-flow__channels">
        {nativeAvailable && (
          <button type="button" className="ogp-invitation" onClick={onNativeShare}>
            {COPY.SHARE.NATIVE}
          </button>
        )}
        <button type="button" className="ogp-invitation" onClick={onCopy}>
          {COPY.SHARE.COPY_LINK}
        </button>
      </div>

      <ShareChannels url={share?.url} message={message} />

      {status && (
        <p className="ogp-share-flow__status" role="status">
          {status}
        </p>
      )}

      {share && (
        <button type="button" className="ogp-affordance" onClick={onRevoke}>
          {COPY.SHARE.REVOKE}
        </button>
      )}
    </section>
  );
};

export default ShareFlow;
