import { useCallback, useEffect, useState } from 'react';

import { COPY } from '@/config/copy';
import { api } from '@/services/api';

import { CollectJsFields } from '@/components/dom/pathways/CollectJsFields';

export const DONATION_PRESETS_CENTS = [];

const MINIMUM_AMOUNT_CENTS = 100;

const CENTS_PER_UNIT = 100;

const DONATION_KIND = 'digital_transcript_access';

const toCents = (value) => {
  const amount = Number.parseFloat(String(value).replace(/[^0-9.]/g, ''));
  if (!Number.isFinite(amount)) return 0;
  return Math.round(amount * CENTS_PER_UNIT);
};

const toDisplay = (cents) => (cents / CENTS_PER_UNIT).toFixed(2);

const looksLikeEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim());

export const ContributeFlow = ({ onBack }) => {
  const [amount, setAmount] = useState('');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [anonymous, setAnonymous] = useState(false);
  const [freeAccessEnabled, setFreeAccessEnabled] = useState(false);

  const [step, setStep] = useState('form');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState(null);
  const [result, setResult] = useState(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const products = await api.getProducts();
        if (!cancelled) setFreeAccessEnabled(products?.freeAccessEnabled === true);
      } catch {
        void 0;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const amountCents = toCents(amount);

  const onContinueToPayment = useCallback(() => {
    if (amountCents < MINIMUM_AMOUNT_CENTS) {
      setProblem(COPY.CONTRIBUTE.AMOUNT_INVALID);
      return;
    }
    if (!looksLikeEmail(email)) {
      setProblem(COPY.CONTRIBUTE.EMAIL_INVALID);
      return;
    }
    setProblem(null);
    setStep('payment');
  }, [amountCents, email]);

  const onToken = useCallback(
    async (paymentToken) => {
      setBusy(true);
      setProblem(null);
      try {
        const donation = await api.createDonation({
          kind: DONATION_KIND,
          amountCents,
          currency: COPY.CONTRIBUTE.CURRENCY_CODE,
          paymentToken,
          email: email.trim(),
          anonymous,
          idempotencyKey: crypto.randomUUID(),
        });
        setResult(donation);
        setStep('done');
      } catch {
        setProblem(COPY.CONTRIBUTE.DECLINED);
        setStep('form');
      } finally {
        setBusy(false);
      }
    },
    [amountCents, email, anonymous],
  );

  const onFreeAccess = useCallback(async () => {
    if (!looksLikeEmail(email)) {
      setProblem(COPY.CONTRIBUTE.EMAIL_INVALID);
      return;
    }
    setBusy(true);
    try {
      const granted = await api.createFreeAccess(email.trim());
      setResult(granted);
      setStep('done');
    } catch {
      setProblem(COPY.CONTRIBUTE.DECLINED);
    } finally {
      setBusy(false);
    }
  }, [email]);

  const onPaymentUnavailable = useCallback(() => setBusy(false), []);

  if (step === 'done') {
    const accessUrl = result?.digitalAccess?.url ?? null;
    return (
      <section className="ogp-contribute" aria-label={COPY.CONTRIBUTE.THANK_YOU}>
        <p className="ogp-contribute__thanks">{COPY.CONTRIBUTE.THANK_YOU}</p>

        {accessUrl && (
          <p className="ogp-contribute__delivery">
            {COPY.CONTRIBUTE.TRANSCRIPT_READY}{' '}
            <a href={accessUrl}>{accessUrl}</a>
          </p>
        )}

        {result?.receiptNumber && (
          <p className="ogp-contribute__receipt">
            {COPY.CONTRIBUTE.RECEIPT} {result.receiptNumber}
          </p>
        )}

        <button type="button" className="ogp-affordance" onClick={onBack}>
          {COPY.A11Y.BACK}
        </button>
      </section>
    );
  }

  return (
    <section className="ogp-contribute" aria-label={COPY.CONTRIBUTE.AMOUNT}>
      <button type="button" className="ogp-affordance ogp-contribute__back" onClick={onBack}>
        {COPY.A11Y.BACK}
      </button>

      <fieldset className="ogp-contribute__group">
        <legend>{COPY.CONTRIBUTE.AMOUNT}</legend>
        <p className="ogp-contribute__hint">{COPY.CONTRIBUTE.AMOUNT_HINT}</p>

        {DONATION_PRESETS_CENTS.length > 0 && (
          <div className="ogp-contribute__presets">
            {DONATION_PRESETS_CENTS.map((preset) => (
              <button
                key={preset}
                type="button"
                className="ogp-affordance"
                onClick={() => setAmount(toDisplay(preset))}
              >
                {COPY.CONTRIBUTE.CURRENCY_SYMBOL}
                {toDisplay(preset)}
              </button>
            ))}
          </div>
        )}

        <label className="ogp-contribute__field" htmlFor="ogp-contribute-amount">
          <span>{COPY.CONTRIBUTE.CUSTOM_AMOUNT}</span>
          <span className="ogp-contribute__amount-input">
            <span aria-hidden="true">{COPY.CONTRIBUTE.CURRENCY_SYMBOL}</span>
            <input
              id="ogp-contribute-amount"
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
          </span>
        </label>
      </fieldset>

      <div className="ogp-contribute__group">
        <label className="ogp-contribute__field" htmlFor="ogp-contribute-email">
          <span>{COPY.CONTRIBUTE.EMAIL}</span>
          <input
            id="ogp-contribute-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <p className="ogp-contribute__hint">{COPY.CONTRIBUTE.EMAIL_HINT}</p>

        <label className="ogp-contribute__field" htmlFor="ogp-contribute-name">
          <span>{COPY.CONTRIBUTE.NAME}</span>
          <input
            id="ogp-contribute-name"
            type="text"
            autoComplete="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>

        <label className="ogp-contribute__check">
          <input
            type="checkbox"
            checked={anonymous}
            onChange={(event) => setAnonymous(event.target.checked)}
          />
          <span>{COPY.CONTRIBUTE.ANONYMOUS}</span>
        </label>
      </div>

      {problem && (
        <p className="ogp-contribute__problem" role="status">
          {problem}
        </p>
      )}

      {step === 'form' ? (
        <button type="button" className="ogp-invitation" onClick={onContinueToPayment}>
          {COPY.CONTRIBUTE.CONTINUE_TO_PAYMENT}
        </button>
      ) : (
        <CollectJsFields
          onToken={onToken}
          onUnavailable={onPaymentUnavailable}
          submitLabel={COPY.CONTRIBUTE.PAY}
          busy={busy}
        />
      )}

      {freeAccessEnabled && (
        <button type="button" className="ogp-contribute__free" onClick={onFreeAccess}>
          {COPY.CONTRIBUTE.FREE_ACCESS}
        </button>
      )}
    </section>
  );
};

export default ContributeFlow;
