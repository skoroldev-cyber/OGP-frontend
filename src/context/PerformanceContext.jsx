/**
 * Device tiers (master §7.8, BUILD_CONTRACT §7).
 *
 * A tier is a BUDGET, not a lesser experience. Mobile is a primary experience, "not a
 * reduced afterthought": the central threshold effect — speck → weave → opening → Earth —
 * must survive a 375 px viewport on every rung of the ladder.
 *
 * Downgrades are ONE-WAY. drei's `PerformanceMonitor` ratchets the tier down when frames
 * decline and never lets it climb back, because an oscillating tier would produce exactly
 * the visible machinery the design law forbids: assets swapping in and out mid-scene.
 * Mid-session downgrades apply at state boundaries so no switch is perceptible (§2.11).
 */

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { TIERS, detectTier } from '@/utils/deviceDetect';

export { TIERS };

/**
 * Per-tier renderer settings.
 *
 * `dpr` — HIGH ≤ 2, MEDIUM ≤ 1.5, LOW 0.8–1 (§7.8 delivery table).
 * `particleScale` — a multiplier applied on top of `PARTICLE_COUNTS`, so a mid-session
 *   downgrade can thin a live field without re-allocating a buffer.
 * `compileAsync` — `gl.compileAsync` warm-up is skipped on LOW (§7.3 RoomWarmup row).
 * `ambientFps` — the reading-room ambient ticker ceiling under `frameloop="demand"` (§3.12).
 */
const SETTINGS = {
  [TIERS.HIGH]: {
    dpr: [1, 2],
    antialias: true,
    powerPreference: 'high-performance',
    particleScale: 1.0,
    textureQuality: 'high',
    compileAsync: true,
    ambientFps: 30,
    shadows: false,
  },
  [TIERS.MEDIUM]: {
    dpr: [1, 1.5],
    antialias: true,
    powerPreference: 'default',
    particleScale: 0.6,
    textureQuality: 'medium',
    compileAsync: true,
    ambientFps: 12,
    shadows: false,
  },
  [TIERS.LOW]: {
    dpr: [0.8, 1],
    antialias: false,
    powerPreference: 'low-power',
    particleScale: 0.3,
    textureQuality: 'low',
    compileAsync: false,
    ambientFps: 0,
    shadows: false,
  },
};

const PerformanceContext = createContext(null);

/**
 * @returns {{ tier: string, settings: Object, isDetecting: boolean, downgradeTier: () => void }}
 */
export const usePerformance = () => {
  const context = useContext(PerformanceContext);
  if (!context) throw new Error('usePerformance must be used within a PerformanceProvider');
  return context;
};

/**
 * @param {{ children: React.ReactNode }} props
 */
export const PerformanceProvider = ({ children }) => {
  // Detection is synchronous and browser-only, so it runs in the lazy initialiser rather than
  // in an effect: the first paint already knows the tier, and the scene is never visibly
  // re-configured in front of the reader, which would read as machinery.
  // From here the tier only ratchets down — never back up.
  const [tier, setTier] = useState(detectTier);
  const isDetecting = false;

  /** One-way ratchet. HIGH -> MEDIUM -> LOW, and never back. */
  const downgradeTier = useCallback(() => {
    setTier((current) => {
      if (current === TIERS.HIGH) return TIERS.MEDIUM;
      return TIERS.LOW;
    });
  }, []);

  const value = useMemo(
    () => ({ tier, settings: SETTINGS[tier], isDetecting, downgradeTier }),
    [tier, downgradeTier],
  );

  return <PerformanceContext.Provider value={value}>{children}</PerformanceContext.Provider>;
};

export default PerformanceContext;
