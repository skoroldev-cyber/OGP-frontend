/**
 * S14 pathway 6 — Share the Opening Arc (master §5.3, §5.4).
 *
 * The second of exactly three share surfaces, and the only one the reader opens themselves.
 * Because the reader asked, there is no gate to pass: §5.2's gates constrain when the
 * *system* speaks, never the reader's own agency.
 *
 * Email, WhatsApp (coming soon) and LinkedIn (coming soon) sit with the native share sheet
 * and "Copy the link". **No social-network brand buttons, no compose widgets, no
 * contact-list access, ever.**
 *
 * The only permitted pre-fill is `COPY.SHARE.MESSAGE` — "I thought of you while taking this
 * journey." — and the reader may edit it. Never "Read this."
 *
 * The link is an entrance, not an excerpt: the recipient lands at S0 and receives their own
 * journey from the beginning, with no sender name, no "shared with you" banner and no
 * skip-ahead. **Sharing yields the sharer nothing** — no content, no access, no status, no
 * acknowledgement, no count. A link can always be withdrawn.
 */

import { useCallback, useState } from 'react';

import { COPY } from '@/config/copy';
import { EVENTS } from '@/experience/states';
import { api } from '@/services/api';
import { emit as emitEvent } from '@/services/events';

import { ShareChannels } from '@/components/dom/ShareChannels';

/**
 * @param {{ onBack: () => void }} props
 */
export const ShareFlow = ({ onBack }) => {
  const [share, setShare] = useState(null);
  const [message, setMessage] = useState(COPY.SHARE.MESSAGE);
  const [status, setStatus] = useState(null);

  /**
   * Create the token once and reuse it for both channels, so one intention is one link.
   *
   * @returns {Promise<{ url: string, token: string }|null>}
   */
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
      // Dismissed or refused. A share that did not complete is never reported as one.
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
      // No clipboard permission. The link is on screen and selectable; nothing errors.
      setStatus(null);
    }
  }, [ensureShare, message]);

  const onRevoke = useCallback(async () => {
    if (!share?.token) return;
    try {
      await api.revokeShare(share.token);
    } catch {
      // Best effort. A link the server could not revoke is still revoked on request later.
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

      {/* A statement of fact. No counter, no flourish, no animation. */}
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
