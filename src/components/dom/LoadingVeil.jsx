import { useEffect, useRef } from 'react';
import gsap from 'gsap';

import { ASSET_GROUPS } from '@/config/assetManifest';
import { OGP_MOTION } from '@/config/ogpTheme';
import { STATES, stateIndex } from '@/experience/states';
import { useExperience } from '@/experience/ExperienceProvider';

export const LoadingVeil = () => {
  const { state, assetsReady, reducedMotion } = useExperience();
  const veilRef = useRef(null);

  const resolved =
    Boolean(state) &&
    stateIndex(state) >= stateIndex(STATES.S1_DARKNESS) &&
    assetsReady(ASSET_GROUPS.OPENING);

  useEffect(() => {
    const node = veilRef.current;
    if (!node || !resolved) return undefined;

    const tween = gsap.to(node, {
      opacity: 0,
      duration: reducedMotion ? OGP_MOTION.reducedMotionFadeSec : OGP_MOTION.durations.scene,
      ease: OGP_MOTION.easeExit,
      onComplete: () => {
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
