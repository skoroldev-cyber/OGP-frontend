/**
 * `/openingarc` — the Founding Reader private reading page (master §5.6.1, §5.10, §3.13).
 *
 * The one page-like route in an application that otherwise has no pages, and the last step
 * of the canonical Mode A pipeline:
 *
 *   LinkedIn → Email → Airtable → Welcome Email → **Private Reading Link** → Questionnaire
 *   → Airtable Completion Tracking
 *
 * **DOM-first.** The manuscript is the page: the reading surface mounts directly, with no
 * cinematic, no canvas dependency and no scene to wait for. A Founding Reader was sent a
 * link to read, not to watch.
 *
 * **Access is by link possession**, hardened with the tokenised variant recommended in
 * §5.10: `?i=<inviteToken>` opens the page, and an organisation cohort may enter its code
 * once instead. The bare URL shows exactly one quiet line —
 * `COPY.BETA.GATE_NOTICE` — and **no signup form, no marketing, no capture**. A rejected
 * code says so plainly and lets the reader try again.
 *
 * The page ends with the exact button `COPY.COMPLETE.BETA_END_BUTTON` — "Continue to
 * Observations" — which opens Questionnaire v2.0. Feedback follows reading, so no feedback
 * UI of any kind appears before it.
 *
 * Never email manuscript attachments: one centrally-updated page is the whole point of this
 * route, and the edition it mounts is the Beta Reader Edition lineage, never the
 * Confidential Development Edition.
 */

import { useCallback, useEffect, useState } from 'react';

import { COPY } from '@/config/copy';
import { api } from '@/services/api';

import { NavigationMinimal } from '@/components/dom/NavigationMinimal';
import { Questionnaire } from '@/components/dom/Questionnaire';
import { ReadingSurface } from '@/components/dom/ReadingSurface/ReadingSurface';

/** The invite-token query parameter from the welcome email's link (§5.7). */
const INVITE_PARAM = 'i';

/**
 * @returns {string|null} the invite token carried by the current URL
 */
const inviteTokenFromUrl = () => {
  if (typeof window === 'undefined') return null;
  const token = new URLSearchParams(window.location.search).get(INVITE_PARAM);
  return token && token.trim() ? token.trim() : null;
};

export const BetaReadingPage = () => {
  // Read once, before first paint, so a valid link never flashes the gate notice.
  const [admitted, setAdmitted] = useState(() => Boolean(inviteTokenFromUrl()));
  const [code, setCode] = useState('');
  const [rejected, setRejected] = useState(false);
  const [busy, setBusy] = useState(false);
  const [observationsOpen, setObservationsOpen] = useState(false);

  // A link-borne token is bound to the session so the cohort funnel can be reported
  // without any per-person identity ever reaching an event payload.
  useEffect(() => {
    const token = inviteTokenFromUrl();
    if (!token) return undefined;
    let cancelled = false;

    (async () => {
      try {
        await api.redeemInvitation(token);
      } catch {
        // Link possession already admitted the reader; a failed binding costs them nothing.
      }
      if (cancelled) return;
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const onSubmitCode = useCallback(async () => {
    if (!code.trim()) return;
    setBusy(true);
    setRejected(false);
    try {
      await api.redeemInvitation(code.trim());
      setAdmitted(true);
    } catch {
      setRejected(true);
    } finally {
      setBusy(false);
    }
  }, [code]);

  const openObservations = useCallback(() => setObservationsOpen(true), []);

  if (!admitted) {
    return (
      <section className="ogp-beta-gate" aria-label={COPY.BETA.PAGE_LABEL}>
        <div className="ogp-beta-gate__column">
          <p className="ogp-beta-gate__notice">{COPY.BETA.GATE_NOTICE}</p>

          <label className="ogp-beta-gate__field" htmlFor="ogp-beta-code">
            <span>{COPY.BETA.CODE_LABEL}</span>
            <input
              id="ogp-beta-code"
              type="text"
              value={code}
              onChange={(event) => setCode(event.target.value)}
            />
          </label>

          {rejected && (
            <p className="ogp-beta-gate__rejected" role="status">
              {COPY.BETA.CODE_REJECTED}
            </p>
          )}

          <button type="button" className="ogp-invitation" onClick={onSubmitCode} disabled={busy}>
            {COPY.BETA.CODE_SUBMIT}
          </button>
        </div>
      </section>
    );
  }

  if (observationsOpen) return <Questionnaire />;

  return (
    <div className="ogp-beta-reading" aria-label={COPY.BETA.PAGE_LABEL}>
      <NavigationMinimal />
      <ReadingSurface />

      <div className="ogp-beta-reading__end">
        <button type="button" className="ogp-invitation" onClick={openObservations}>
          {COPY.COMPLETE.BETA_END_BUTTON}
        </button>
      </div>
    </div>
  );
};

export default BetaReadingPage;
