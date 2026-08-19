/**
 * S0–S1 — the loading veil.
 *
 * **Darkness is the loading veil** (BUILD_CONTRACT §0.6, master §2.4.1). There is no
 * spinner, no percentage, no progress bar, no counter, no skeleton and no "loading" word
 * anywhere in this component or in this application. The only motion the veil has is its
 * own dissolve, and the only thing that drives that dissolve is the opening asset group
 * actually becoming resident.
 *
 * The veil is painted by `index.html` before a byte of JavaScript runs and is continuous
 * with it: the reader never sees a white flash, a mount, or a hand-off (§2.4.1 "Instant
 * full-viewport black").
 *
 * It is `aria-hidden` because it says nothing. A screen-reader user is told what is
 * happening by `ScreenReaderNarrative`, in words, not by a description of a black
 * rectangle.
 */

import { useEffect, useRef } from 'react';
import gsap from 'gsap';

import { ASSET_GROUPS } from '@/config/assetManifest';
import { OGP_MOTION } from '@/config/ogpTheme';
import { STATES, stateIndex } from '@/experience/states';
import { useExperience } from '@/experience/ExperienceProvider';

export const LoadingVeil = () => {
  const { state, assetsReady, reducedMotion } = useExperience();
  const veilRef = useRef(null);

  // Two conditions, both required. The state condition keeps the veil opaque through S0,
  // which is never perceptible as a distinct state; the asset condition is the real one.
  const resolved =
    Boolean(state) &&
    stateIndex(state) >= stateIndex(STATES.S1_DARKNESS) &&
    assetsReady(ASSET_GROUPS.OPENING);

  useEffect(() => {
    const node = veilRef.current;
    if (!node || !resolved) return undefined;

    // >= 1.5 s on canvas-adjacent surfaces (§8.3.1 minimum opacity ramps). Under reduced
    // motion the dissolve is a fade too — reduced motion removes travel, not continuity.
    const tween = gsap.to(node, {
      opacity: 0,
      duration: reducedMotion ? OGP_MOTION.reducedMotionFadeSec : OGP_MOTION.durations.scene,
      ease: OGP_MOTION.easeExit,
      onComplete: () => {
        // Removed from compositing entirely once it has nothing left to say.
        node.style.visibility = 'hidden';
      },
    });

    return () => tween.kill();
  }, [resolved, reducedMotion]);

  return (
    <div
      ref={veilRef}
      className="ogp-veil ogp-loading-veil"
      data-resolved={resolved ? 'true' : 'false'}
      aria-hidden="true"
    />
  );
};

export default LoadingVeil;
