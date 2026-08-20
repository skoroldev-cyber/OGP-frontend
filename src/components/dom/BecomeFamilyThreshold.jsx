import { useEffect, useState } from 'react';

import { COPY } from '@/config/copy';
import { OGP_TIMING } from '@/config/ogpTheme';
import { useAudio } from '@/context/AudioProvider';

export const BecomeFamilyThreshold = ({ onContinue }) => {
  const { silence } = useAudio();
  const [still, setStill] = useState(false);

  useEffect(() => {
    silence();
  }, [silence]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const timer = window.setTimeout(() => setStill(true), OGP_TIMING.becomeFamilyStillnessMs);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <section className="ogp-become-family" aria-label={COPY.THRESHOLD.PHRASE}>
      <p className="ogp-become-family__phrase">{COPY.THRESHOLD.PHRASE}</p>

      <div className="ogp-become-family__response" data-ready={still ? 'true' : 'false'}>
        {still && (
          <button type="button" className="ogp-invitation" onClick={onContinue}>
            {COPY.FAMILY.THRESHOLD_CONTINUE}
          </button>
        )}
      </div>
    </section>
  );
};

export default BecomeFamilyThreshold;
