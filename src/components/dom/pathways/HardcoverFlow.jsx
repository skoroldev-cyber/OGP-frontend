/**
 * The product purchase workflow — S14 pathway 3 (master §6.4, §6.7).
 *
 * The other half of the locked separation. This file imports nothing from `ContributeFlow`,
 * shares no state with it, and offers **no cross-sell in either direction, ever**: no "add a
 * contribution to your order", no "consider supporting the mission instead". A donation is
 * never an order with a zero-price product, and an order is never a donation with a
 * fulfilment flag.
 *
 * **Reserve is the launch mode.** Hardcover production is a Publishing Readiness deliverable
 * that is not complete, so the default flow takes an email address and a quantity, charges
 * nothing, and says so plainly in the confirmation: "Nothing has been charged." One
 * notification when the edition is ready — not a drip sequence.
 *
 * **Purchase is built and flag-gated.** It activates only when the server reports the
 * product `purchasable` *and* a `priceCents` exists. No price exists anywhere in the corpus;
 * the field ships null and the founder sets it. Until then the reserve path stands alone
 * with one honest line, and never a scarcity or urgency framing — "limited time" and its
 * relatives are prohibited terms, and `fulfillment_hold` is described as a wait, not a
 * privilege.
 */

import { useCallback, useEffect, useState } from 'react';

import { COPY } from '@/config/copy';
import { api } from '@/services/api';

import { CollectJsFields } from '@/components/dom/pathways/CollectJsFields';

/** The single orderable item at launch (§6.7 catalogue seed). */
const HARDCOVER_SKU = 'hardcover-standard';

const MIN_QUANTITY = 1;
const MAX_QUANTITY = 9;

const looksLikeEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim());

/**
 * @param {{ onBack: () => void }} props
 */
export const HardcoverFlow = ({ onBack }) => {
  const [product, setProduct] = useState(null);
  const [email, setEmail] = useState('');
  const [quantity, setQuantity] = useState(MIN_QUANTITY);
  const [shipping, setShipping] = useState({
    line1: '',
    line2: '',
    city: '',
    region: '',
    postalCode: '',
    country: '',
  });

  const [step, setStep] = useState('form');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState(null);
  const [confirmation, setConfirmation] = useState(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const catalogue = await api.getProducts();
        if (cancelled) return;
        const items = Array.isArray(catalogue?.products) ? catalogue.products : [];
        setProduct(items.find((item) => item.sku === HARDCOVER_SKU) ?? null);
      } catch {
        // No catalogue means reserve only. Nothing is reported to the reader.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Purchase requires BOTH the founder's status flip and a price. Either alone is not enough.
  const purchasable = product?.status === 'purchasable' && Number.isFinite(product?.priceCents);

  const onShippingField = useCallback(
    (field) => (event) => setShipping((previous) => ({ ...previous, [field]: event.target.value })),
    [],
  );

  const onReserve = useCallback(async () => {
    if (!looksLikeEmail(email)) {
      setProblem(COPY.CONTRIBUTE.EMAIL_INVALID);
      return;
    }
    setProblem(null);
    setBusy(true);
    try {
      await api.createReservation({ productSku: HARDCOVER_SKU, quantity, email: email.trim() });
      setConfirmation(COPY.HARDCOVER.RESERVE_CONFIRMATION);
      setStep('done');
    } catch {
      setProblem(COPY.CONTRIBUTE.DECLINED);
    } finally {
      setBusy(false);
    }
  }, [email, quantity]);

  const onContinueToPayment = useCallback(() => {
    if (!looksLikeEmail(email)) {
      setProblem(COPY.CONTRIBUTE.EMAIL_INVALID);
      return;
    }
    setProblem(null);
    setStep('payment');
  }, [email]);

  const onToken = useCallback(
    async (paymentToken) => {
      setBusy(true);
      try {
        await api.createOrder({
          productSku: HARDCOVER_SKU,
          quantity,
          email: email.trim(),
          shippingAddress: shipping,
          paymentToken,
          idempotencyKey: crypto.randomUUID(),
        });
        setConfirmation(COPY.HARDCOVER.PURCHASE_CONFIRMATION);
        setStep('done');
      } catch {
        setProblem(COPY.CONTRIBUTE.DECLINED);
        setStep('form');
      } finally {
        setBusy(false);
      }
    },
    [quantity, email, shipping],
  );

  const onPaymentUnavailable = useCallback(() => setBusy(false), []);

  if (step === 'done') {
    return (
      <section className="ogp-hardcover" aria-label={COPY.HARDCOVER.RESERVE_TITLE}>
        <p className="ogp-hardcover__confirmation">{confirmation}</p>
        {purchasable && <p className="ogp-hardcover__note">{COPY.HARDCOVER.PURCHASE_WAIT_NOTE}</p>}
        <button type="button" className="ogp-affordance" onClick={onBack}>
          {COPY.A11Y.BACK}
        </button>
      </section>
    );
  }

  return (
    <section
      className="ogp-hardcover"
      aria-label={purchasable ? COPY.HARDCOVER.PURCHASE_TITLE : COPY.HARDCOVER.RESERVE_TITLE}
    >
      <button type="button" className="ogp-affordance ogp-hardcover__back" onClick={onBack}>
        {COPY.A11Y.BACK}
      </button>

      <h3 className="ogp-hardcover__title">
        {purchasable ? COPY.HARDCOVER.PURCHASE_TITLE : COPY.HARDCOVER.RESERVE_TITLE}
      </h3>

      {!purchasable && <p className="ogp-hardcover__note">{COPY.HARDCOVER.UNAVAILABLE}</p>}

      <label className="ogp-hardcover__field" htmlFor="ogp-hardcover-email">
        <span>{COPY.HARDCOVER.EMAIL}</span>
        <input
          id="ogp-hardcover-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </label>

      <label className="ogp-hardcover__field" htmlFor="ogp-hardcover-quantity">
        <span>{COPY.HARDCOVER.QUANTITY}</span>
        <input
          id="ogp-hardcover-quantity"
          type="number"
          min={MIN_QUANTITY}
          max={MAX_QUANTITY}
          value={quantity}
          onChange={(event) => setQuantity(Number(event.target.value) || MIN_QUANTITY)}
        />
      </label>

      {purchasable && (
        <fieldset className="ogp-hardcover__group">
          <legend>{COPY.HARDCOVER.SHIPPING}</legend>

          <label className="ogp-hardcover__field" htmlFor="ogp-ship-line1">
            <span>{COPY.HARDCOVER.SHIPPING_LINE1}</span>
            <input
              id="ogp-ship-line1"
              type="text"
              autoComplete="address-line1"
              value={shipping.line1}
              onChange={onShippingField('line1')}
            />
          </label>

          <label className="ogp-hardcover__field" htmlFor="ogp-ship-line2">
            <span>{COPY.HARDCOVER.SHIPPING_LINE2}</span>
            <input
              id="ogp-ship-line2"
              type="text"
              autoComplete="address-line2"
              value={shipping.line2}
              onChange={onShippingField('line2')}
            />
          </label>

          <label className="ogp-hardcover__field" htmlFor="ogp-ship-city">
            <span>{COPY.HARDCOVER.SHIPPING_CITY}</span>
            <input
              id="ogp-ship-city"
              type="text"
              autoComplete="address-level2"
              value={shipping.city}
              onChange={onShippingField('city')}
            />
          </label>

          <label className="ogp-hardcover__field" htmlFor="ogp-ship-region">
            <span>{COPY.HARDCOVER.SHIPPING_REGION}</span>
            <input
              id="ogp-ship-region"
              type="text"
              autoComplete="address-level1"
              value={shipping.region}
              onChange={onShippingField('region')}
            />
          </label>

          <label className="ogp-hardcover__field" htmlFor="ogp-ship-postal">
            <span>{COPY.HARDCOVER.SHIPPING_POSTAL}</span>
            <input
              id="ogp-ship-postal"
              type="text"
              autoComplete="postal-code"
              value={shipping.postalCode}
              onChange={onShippingField('postalCode')}
            />
          </label>

          <label className="ogp-hardcover__field" htmlFor="ogp-ship-country">
            <span>{COPY.HARDCOVER.SHIPPING_COUNTRY}</span>
            <input
              id="ogp-ship-country"
              type="text"
              autoComplete="country-name"
              value={shipping.country}
              onChange={onShippingField('country')}
            />
          </label>
        </fieldset>
      )}

      {problem && (
        <p className="ogp-hardcover__problem" role="status">
          {problem}
        </p>
      )}

      {!purchasable && (
        <button type="button" className="ogp-invitation" onClick={onReserve} disabled={busy}>
          {COPY.HARDCOVER.RESERVE_SUBMIT}
        </button>
      )}

      {purchasable && step === 'form' && (
        <button type="button" className="ogp-invitation" onClick={onContinueToPayment}>
          {COPY.CONTRIBUTE.CONTINUE_TO_PAYMENT}
        </button>
      )}

      {purchasable && step === 'payment' && (
        <CollectJsFields
          onToken={onToken}
          onUnavailable={onPaymentUnavailable}
          submitLabel={COPY.HARDCOVER.PURCHASE_SUBMIT}
          busy={busy}
        />
      )}
    </section>
  );
};

export default HardcoverFlow;
