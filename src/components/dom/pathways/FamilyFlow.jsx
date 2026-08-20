import { useCallback, useState } from 'react';

import { COPY } from '@/config/copy';
import { api } from '@/services/api';

import { BecomeFamilyThreshold } from '@/components/dom/BecomeFamilyThreshold';

const COMMUNICATION = { ON: 'updates', OFF: 'none' };

const looksLikeEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim());

export const FamilyFlow = ({ onBack }) => {
  const [passedThreshold, setPassedThreshold] = useState(false);
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [communication, setCommunication] = useState(COMMUNICATION.OFF);
  const [problem, setProblem] = useState(null);
  const [busy, setBusy] = useState(false);
  const [welcomed, setWelcomed] = useState(false);

  const onThresholdContinue = useCallback(() => setPassedThreshold(true), []);

  const onSubmit = useCallback(async () => {
    if (!looksLikeEmail(email)) {
      setProblem(COPY.CONTRIBUTE.EMAIL_INVALID);
      return;
    }
    setProblem(null);
    setBusy(true);
    try {
      await api.becomeFamily({
        email: email.trim(),
        displayName: displayName.trim() || undefined,
        communicationPreference: communication,
      });
      setWelcomed(true);
    } catch {
      setProblem(COPY.CONTRIBUTE.DECLINED);
    } finally {
      setBusy(false);
    }
  }, [email, displayName, communication]);

  if (!passedThreshold) return <BecomeFamilyThreshold onContinue={onThresholdContinue} />;

  if (welcomed) {
    return (
      <section className="ogp-family" aria-label={COPY.THRESHOLD.PHRASE}>
        <p className="ogp-family__confirmation">{COPY.FAMILY.CONFIRMATION}</p>
        <button type="button" className="ogp-affordance" onClick={onBack}>
          {COPY.A11Y.BACK}
        </button>
      </section>
    );
  }

  return (
    <section className="ogp-family" aria-label={COPY.THRESHOLD.PHRASE}>
      <button type="button" className="ogp-affordance ogp-family__back" onClick={onBack}>
        {COPY.A11Y.BACK}
      </button>

      <p className="ogp-family__intro">{COPY.FAMILY.INTRO}</p>

      <label className="ogp-family__field" htmlFor="ogp-family-email">
        <span>{COPY.FAMILY.EMAIL}</span>
        <input
          id="ogp-family-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </label>

      <label className="ogp-family__field" htmlFor="ogp-family-name">
        <span>{COPY.FAMILY.DISPLAY_NAME}</span>
        <input
          id="ogp-family-name"
          type="text"
          autoComplete="nickname"
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
        />
      </label>

      <fieldset className="ogp-family__group">
        <legend>{COPY.FAMILY.COMMUNICATION}</legend>
        <label className="ogp-family__choice">
          <input
            type="radio"
            name="ogp-family-communication"
            value={COMMUNICATION.OFF}
            checked={communication === COMMUNICATION.OFF}
            onChange={() => setCommunication(COMMUNICATION.OFF)}
          />
          <span>{COPY.FAMILY.COMMUNICATION_OFF}</span>
        </label>
        <label className="ogp-family__choice">
          <input
            type="radio"
            name="ogp-family-communication"
            value={COMMUNICATION.ON}
            checked={communication === COMMUNICATION.ON}
            onChange={() => setCommunication(COMMUNICATION.ON)}
          />
          <span>{COPY.FAMILY.COMMUNICATION_ON}</span>
        </label>
      </fieldset>

      {problem && (
        <p className="ogp-family__problem" role="status">
          {problem}
        </p>
      )}

      <button type="button" className="ogp-invitation" onClick={onSubmit} disabled={busy}>
        {COPY.FAMILY.SUBMIT}
      </button>
    </section>
  );
};

export default FamilyFlow;
