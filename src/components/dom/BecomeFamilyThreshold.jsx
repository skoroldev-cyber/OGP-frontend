/**
 * The "Become Family." threshold (master §5.5, §8.10.2).
 *
 * The locked phrase, WITH the trailing period — `rules.json` locks `"Become Family."` and
 * the machine-readable rule governs — alone in the manuscript serif at display size, on a
 * full viewport of `read-field`, with nothing else on screen.
 *
 * "Surrounded by silence and visual breathing space" is implemented literally:
 *
 *  - **Ambient audio is faded to silence** on entry, never cut. Silence is an active
 *    compositional element here, not an absence.
 *  - **A minimum of four seconds of stillness** passes before any response affordance fades
 *    in (`OGP_TIMING.becomeFamilyStillnessMs`). Nothing else happens in that window: no
 *    animation, no progress, no hint that something is coming.
 *  - No commerce button styling, no card, no border, no fill. The response is a serif
 *    invitation like every other threshold in this work.
 *
 * **Never wallpaper, never a header, never repeated.** It appears on exactly two surfaces —
 * the convergence threshold inside the Reading Room, and S14 pathway 4 — and nowhere else:
 * not in navigation, footers, marketing, emails or landing surfaces. The interface never
 * says "member" or "membership"; the role exists internally and is not a label.
 *
 * This threshold must never route into a payment surface. Donation, purchase and "Support
 * the Mission" are separate workflows.
 */

import { useEffect, useState } from 'react';

import { COPY } from '@/config/copy';
import { OGP_TIMING } from '@/config/ogpTheme';
import { useAudio } from '@/context/AudioProvider';

/**
 * @param {{ onContinue: () => void }} props
 */
export const BecomeFamilyThreshold = ({ onContinue }) => {
  const { silence } = useAudio();
  const [still, setStill] = useState(false);

  useEffect(() => {
    // Faded, never cut: every audio state change is a ramp of at least two seconds
    // (§8.5.3), which `audioManager` owns.
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
