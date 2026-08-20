import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { TIERS, detectTier } from '@/utils/deviceDetect';

export { TIERS };

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

export const usePerformance = () => {
  const context = useContext(PerformanceContext);
  if (!context) throw new Error('usePerformance must be used within a PerformanceProvider');
  return context;
};

export const PerformanceProvider = ({ children }) => {
  const [tier, setTier] = useState(detectTier);
  const isDetecting = false;

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
