import { useEffect, useMemo, useState } from 'react';

import { COPY } from '@/config/copy';
import { OGP_MOTION } from '@/config/ogpTheme';

// The opening asks for stillness first. The cue waits out the same beat a
// threshold passage waits before it offers the reader anything to do.
const DWELL_MS = OGP_MOTION.durations.threshold * 1000;

// How long the cue stays at full strength after the reader stops moving.
const SETTLE_MS = 1200;

const coarsePointer = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(hover: none) and (pointer: coarse)')?.matches === true;

export const CrossingHint = () => {
  const label = useMemo(
    () => (coarsePointer() ? COPY.AFFORDANCES.CROSS_HINT_TOUCH : COPY.AFFORDANCES.CROSS_HINT),
    [],
  );

  const [revealed, setRevealed] = useState(false);
  const [stirring, setStirring] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const timer = window.setTimeout(() => setRevealed(true), DWELL_MS);
    return () => window.clearTimeout(timer);
  }, []);

  // The crossing asks for a sustained gesture, so the cue answers any movement
  // to show the reader they are being heard before the threshold is reached.
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    let settle = null;

    const stir = () => {
      setStirring(true);
      if (settle) window.clearTimeout(settle);
      settle = window.setTimeout(() => setStirring(false), SETTLE_MS);
    };

    window.addEventListener('wheel', stir, { passive: true });
    window.addEventListener('touchmove', stir, { passive: true });

    return () => {
      if (settle) window.clearTimeout(settle);
      window.removeEventListener('wheel', stir);
      window.removeEventListener('touchmove', stir);
    };
  }, []);

  return (
    <div
      className="ogp-crossing-hint"
      data-revealed={revealed ? 'true' : 'false'}
      data-stirring={stirring ? 'true' : 'false'}
      aria-hidden="true"
    >
      <span className="ogp-crossing-hint__trail" />
      <span className="ogp-crossing-hint__label">{label}</span>
    </div>
  );
};

export default CrossingHint;
