/**
 * useAmbientTicker — the demand-frameloop heartbeat.
 *
 * From S9 onward `App.jsx` switches the canvas to `frameloop="demand"`: during reading the
 * canvas is ambience behind a page of text, and a continuous render loop there is pure
 * battery cost (§3.12). But ambience still has to move — clouds drift, Earth turns at one
 * revolution per eight minutes — so something must ask for frames.
 *
 * The rate is a budget, taken from `PerformanceContext`:
 *   HIGH   30 fps
 *   MEDIUM 12 fps   (the ceiling this ticker exists to honour)
 *   LOW     0 fps   (a still frame; nothing about the Earth needs 60 Hz to be true)
 *
 * With Motion set to Off the rate is 0 and the canvas renders only when something
 * discretely changes — a state transition, a unit boundary — which is exactly the
 * reduced-motion contract: "slow fades only, no camera travel, no parallax, no pulse."
 *
 * `nudge()` is returned so callers can request a single frame at a boundary without
 * raising the ambient rate. Under Motion Off it is the ONLY thing that ever draws.
 */

import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';

/**
 * @param {{ active?: boolean, fps?: number }} [options]
 * @returns {() => void} `nudge` — request exactly one frame
 */
export const useAmbientTicker = ({ active = true, fps = 0 } = {}) => {
  const invalidate = useThree((state) => state.invalidate);

  useEffect(() => {
    if (!active || !fps || fps <= 0) return undefined;

    // One frame immediately, so enabling the ticker is never perceived as a pause.
    invalidate();
    const interval = window.setInterval(invalidate, Math.max(1, Math.round(1000 / fps)));
    return () => window.clearInterval(interval);
  }, [active, fps, invalidate]);

  return invalidate;
};

export default useAmbientTicker;
