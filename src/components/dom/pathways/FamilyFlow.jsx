/**
 * S14 pathway 4 — the family pathway (master §5.5, §6.3).
 *
 * The threshold comes first: `BecomeFamilyThreshold` renders the locked phrase alone, in
 * silence, for at least four seconds before anything can be answered. Only after the reader
 * chooses to continue does the quiet form exist at all.
 *
 * **Membership-word resolution (binding ruling).** The state machine's internal pathway name
 * is "Become a Global Family Member"; the analytics slug is `become_family`; the role is
 * recorded internally as `Global Family Member`. **Every user-facing string here is the
 * locked phrase or ordinary language** — the interface never says "member", "membership",
 * or any of the prohibited vocabulary, and where a label is needed it says "Family" or
 * nothing.
 *
 * Minimal fields: email, an optional chosen name, and a communication preference.
 * **No gender question. No birthdate.** No profile, no public presence, no badge, no title,
 * no number.
 *
 * **This threshold must never route into a payment surface.** Donation and purchase
 * are separate workflows, and nothing in this file touches them.
 */

import { useCallback, useState } from 'react';

import { COPY } from '@/config/copy';
import { api } from '@/services/api';

import { BecomeFamilyThreshold } from '@/components/dom/BecomeFamilyThreshold';

/** The two communication preferences. Nothing is sent unless the reader asks for it. */
const COMMUNICATION = { ON: 'updates', OFF: 'none' };

const looksLikeEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim());

/**
 * @param {{ onBack: () => void }} props
 */
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
      // Gate-checked server-side; the client cannot bypass the threshold.
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
        {/* One screen, then back to where the reader was. Nothing more is asked. */}
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
