import { useCallback, useEffect, useRef, useState } from 'react';

import { COPY } from '@/config/copy';
import { ENV } from '@/config/env';
import { OGP_COLORS, OGP_TYPE } from '@/config/ogpTheme';

const COLLECT_JS_URL = 'https://secure.nmi.com/token/Collect.js';
const SCRIPT_ID = 'ogp-collect-js';

const hostedFieldCss = () => ({
  'background-color': OGP_COLORS.readSurface,
  color: OGP_COLORS.readText,
  'font-family': OGP_TYPE.ui,
  'font-size': OGP_TYPE.uiSizeControl,
  padding: '0.5rem 0.75rem',
});

const loadCollectJs = (tokenizationKey) =>
  new Promise((resolve) => {
    if (typeof document === 'undefined') {
      resolve(false);
      return;
    }
    if (window.CollectJS) {
      resolve(true);
      return;
    }

    const existing = document.getElementById(SCRIPT_ID);
    if (existing) {
      existing.addEventListener('load', () => resolve(Boolean(window.CollectJS)), { once: true });
      existing.addEventListener('error', () => resolve(false), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = COLLECT_JS_URL;
    script.async = true;
    script.setAttribute('data-tokenization-key', tokenizationKey);
    script.setAttribute('data-variant', 'inline');
    script.addEventListener('load', () => resolve(Boolean(window.CollectJS)), { once: true });
    script.addEventListener('error', () => resolve(false), { once: true });
    document.head.appendChild(script);
  });

export const CollectJsFields = ({ onToken, onUnavailable, submitLabel, busy = false }) => {
  const [ready, setReady] = useState(false);
  const [unavailable, setUnavailable] = useState(!ENV.nmiCollectJsKey);

  const onTokenRef = useRef(onToken);
  useEffect(() => {
    onTokenRef.current = onToken;
  }, [onToken]);

  useEffect(() => {
    if (!ENV.nmiCollectJsKey) {
      onUnavailable?.();
      return undefined;
    }

    let cancelled = false;

    (async () => {
      const loaded = await loadCollectJs(ENV.nmiCollectJsKey);
      if (cancelled) return;
      if (!loaded) {
        setUnavailable(true);
        onUnavailable?.();
        return;
      }

      try {
        window.CollectJS.configure({
          variant: 'inline',
          styleSniffer: false,
          customCss: hostedFieldCss(),
          fields: {
            ccnumber: { selector: '#ogp-cc-number' },
            ccexp: { selector: '#ogp-cc-exp' },
            cvv: { selector: '#ogp-cc-cvv' },
          },
          callback: (response) => {
            if (response?.token) onTokenRef.current?.(response.token);
          },
        });
        setReady(true);
      } catch {
        setUnavailable(true);
        onUnavailable?.();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [onUnavailable]);

  const submit = useCallback(() => {
    if (!window.CollectJS) return;
    window.CollectJS.startPaymentRequest();
  }, []);

  if (unavailable) {
    return (
      <>
        <p className="ogp-collectjs__unavailable" role="status">
          {COPY.PAYMENT.UNAVAILABLE}
        </p>

        {!ENV.isProduction && (
          <p className="ogp-collectjs__diagnostic">
            {ENV.nmiCollectJsKey
              ? COPY.PAYMENT.DEV_SCRIPT_BLOCKED
              : COPY.PAYMENT.DEV_KEY_MISSING}
          </p>
        )}
      </>
    );
  }

  return (
    <div className="ogp-collectjs">
      <p className="ogp-collectjs__note">{COPY.PAYMENT.SECURE_NOTE}</p>

      <div className="ogp-collectjs__field">
        <span className="ogp-collectjs__label" id="ogp-cc-number-label">
          {COPY.PAYMENT.CARD_NUMBER}
        </span>
        <div className="ogp-collectjs__host" id="ogp-cc-number" aria-labelledby="ogp-cc-number-label" />
      </div>

      <div className="ogp-collectjs__row">
        <div className="ogp-collectjs__field">
          <span className="ogp-collectjs__label" id="ogp-cc-exp-label">
            {COPY.PAYMENT.EXPIRY}
          </span>
          <div className="ogp-collectjs__host" id="ogp-cc-exp" aria-labelledby="ogp-cc-exp-label" />
        </div>

        <div className="ogp-collectjs__field">
          <span className="ogp-collectjs__label" id="ogp-cc-cvv-label">
            {COPY.PAYMENT.CVV}
          </span>
          <div className="ogp-collectjs__host" id="ogp-cc-cvv" aria-labelledby="ogp-cc-cvv-label" />
        </div>
      </div>

      <button
        type="button"
        className="ogp-invitation ogp-collectjs__submit"
        onClick={submit}
        disabled={!ready || busy}
      >
        {submitLabel}
      </button>

      {busy && (
        <p className="ogp-collectjs__working" role="status">
          {COPY.CONTRIBUTE.WORKING}
        </p>
      )}
    </div>
  );
};

export default CollectJsFields;
