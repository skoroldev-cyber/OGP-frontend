/**
 * The donation workflow — S14 pathway 2 (master §6.4, §6.6).
 *
 * > "Digital transcript access uses a donation workflow. Hardcover editions use a product
 * > purchase workflow. These remain separate throughout the platform."
 *
 * This file is one half of that separation. It has no import from `HardcoverFlow`, no shared
 * cart, no shared state, and **no cross-sell in either direction** — there is no "add a
 * donation to your order" and no "would you also like the hardcover". Merging the two would
 * merge a charitable MCC with product revenue, which is an accounting and card-network
 * problem before it is a trust problem.
 *
 * Pay-what-you-can, and it is meant literally:
 *
 *  - An open amount field, with quiet equal presets beside it when the founder has set any.
 *    **The custom field is equally prominent** — the same size, the same weight, the same
 *    position in the tab order.
 *  - **No highlighted amount. No default selection. No "most people give…" social proof. No
 *    monthly toggle** (Phase 1 is one-time only). **No goal meter, no thermometer, no
 *    progress bar, no matching-gift banner, no give-again upsell.**
 *  - The free-access path appears only while the founder's switch is on, as a plain link
 *    with no shame framing: same delivery, one click plus an email address.
 *
 * "The money is secondary. Trust is primary." Nothing here may make a reader feel solicited,
 * and a failed or abandoned payment always leaves the reader exactly where they were, with
 * their reading progress intact (§6.1.5).
 */

import { useCallback, useEffect, useState } from 'react';

import { COPY } from '@/config/copy';
import { api } from '@/services/api';

import { CollectJsFields } from '@/components/dom/pathways/CollectJsFields';

/**
 * Preset amounts, in cents.
 *
 * **No preset amounts exist anywhere in the corpus** (§6.10): they are configuration
 * awaiting founder pricing. The list ships empty, which renders the open amount field alone
 * — the purest form of pay-what-you-can. Adding values here renders them as quiet, equal
 * options; it may never render one of them as a default or a suggestion.
 */
export const DONATION_PRESETS_CENTS = [];

/** [PROPOSED] §6.6 — the card-network floor for a real transaction. */
const MINIMUM_AMOUNT_CENTS = 100;

const CENTS_PER_UNIT = 100;

/** The only remaining contribution kind. Support-the-mission was the same page. */
const DONATION_KIND = 'digital_transcript_access';

/**
 * @param {string} value
 * @returns {number} cents, or 0 when unparseable
 */
const toCents = (value) => {
  const amount = Number.parseFloat(String(value).replace(/[^0-9.]/g, ''));
  if (!Number.isFinite(amount)) return 0;
  return Math.round(amount * CENTS_PER_UNIT);
};

/** @param {number} cents */
const toDisplay = (cents) => (cents / CENTS_PER_UNIT).toFixed(2);

/** A deliberately permissive check: the receipt has to be able to reach someone. */
const looksLikeEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim());

/**
 * @param {{ onBack: () => void }} props
 */
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

  // The free-access switch is the founder's, held on the server. The client only reads it.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const products = await api.getProducts();
        if (!cancelled) setFreeAccessEnabled(products?.freeAccessEnabled === true);
      } catch {
        // Unreachable catalogue simply means no free-access link. Nothing is reported.
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
          // Application-level duplicate protection, on top of NMI's own (§6.14).
          idempotencyKey: crypto.randomUUID(),
        });
        setResult(donation);
        setStep('done');
      } catch {
        // A decline is a fact, not a failure of the reader. Nothing has been charged.
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

        {/* No "give again", no share-your-contribution prompt, no tier, no badge. */}
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

      {/* The free path. Same delivery, no shame framing, and only while the switch is on. */}
      {freeAccessEnabled && (
        <button type="button" className="ogp-contribute__free" onClick={onFreeAccess}>
          {COPY.CONTRIBUTE.FREE_ACCESS}
        </button>
      )}
    </section>
  );
};

export default ContributeFlow;
