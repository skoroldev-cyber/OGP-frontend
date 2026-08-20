import { useCallback, useEffect, useState } from 'react';

import { COPY } from '@/config/copy';
import { api } from '@/services/api';

import { NavigationMinimal } from '@/components/dom/NavigationMinimal';
import { Questionnaire } from '@/components/dom/Questionnaire';
import { ReadingSurface } from '@/components/dom/ReadingSurface/ReadingSurface';

const INVITE_PARAM = 'i';

const inviteTokenFromUrl = () => {
  if (typeof window === 'undefined') return null;
  const token = new URLSearchParams(window.location.search).get(INVITE_PARAM);
  return token && token.trim() ? token.trim() : null;
};

export const BetaReadingPage = () => {
  const [admitted, setAdmitted] = useState(() => Boolean(inviteTokenFromUrl()));
  const [code, setCode] = useState('');
  const [rejected, setRejected] = useState(false);
  const [busy, setBusy] = useState(false);
  const [observationsOpen, setObservationsOpen] = useState(false);

  useEffect(() => {
    const token = inviteTokenFromUrl();
    if (!token) return undefined;
    let cancelled = false;

    (async () => {
      try {
        await api.redeemInvitation(token);
      } catch {
        void 0;
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
