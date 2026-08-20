import { useCallback, useEffect, useState } from 'react';

import { COPY } from '@/config/copy';
import { useExperience } from '@/experience/ExperienceProvider';
import { api } from '@/services/api';

import { ShareChannels } from '@/components/dom/ShareChannels';

const TREATMENTS = ['minimal', 'quiet_inline', 'isolated', 'full_breath'];
const DEFAULT_TREATMENT = 'quiet_inline';

export const ShareMoment = () => {
  const { advance } = useExperience();

  const [prompt, setPrompt] = useState(null);

  const leave = useCallback(() => advance({ inputMethod: 'pointer' }), [advance]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const result = await api.getSharingEligibility();
        if (cancelled) return;
        if (result?.eligible && result.prompt) {
          setPrompt(result.prompt);
          return;
        }
      } catch {
        void 0;
      }
      if (!cancelled) leave();
    })();

    return () => {
      cancelled = true;
    };
  }, [leave]);

  if (!prompt) return null;

  const treatment = TREATMENTS.includes(prompt.visualTreatment)
    ? prompt.visualTreatment
    : DEFAULT_TREATMENT;

  return (
    <section
      className="ogp-share-moment"
      data-treatment={treatment}
      aria-label={COPY.SHARE.OFFER}
    >
      <p className="ogp-share-moment__text">{prompt.promptText}</p>

      <div className="ogp-share-moment__actions">
        <ShareChannels eventPayload={{ promptId: prompt.promptId }} />
        <button type="button" className="ogp-affordance" onClick={leave}>
          {COPY.SHARE.DECLINE}
        </button>
      </div>
    </section>
  );
};

export default ShareMoment;
