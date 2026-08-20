export const OGP_COLORS = {
  voidDeep: '#030307',
  voidVignette: '#000000',
  voidFogNear: '#06060c',
  voidParticle: '#1a1a26',

  goldCore: '#ffe9c2',
  goldPrimary: '#d9a64a',
  goldMuted: '#b58a45',
  goldDeep: '#6e5320',
  goldText: '#cfae6e',

  atmosRim: '#8fc3ee',
  oceanDeep: '#0b2e4f',

  readField: '#0e0d0b',
  readSurface: '#12110e',
  readText: '#efe9dc',
  readTextDim: '#b9b2a3',
  readRule: '#2a2822',

  focus: '#ffe9c2',
  error: '#c96b5a',
  success: '#9fb98a',

  fogNear: '#06060c',
  fogFar: '#030307',
};

export const OGP_FOG = {
  color: OGP_COLORS.voidDeep,
  near: 15,
  far: 50,
};

export const OGP_MOTION = {
  ease: 'sine.inOut',
  easeEnter: 'power1.out',
  easeExit: 'power1.in',
  easeBreath: 'ogpBreath',
  durations: {
    uiMicro: 0.2,
    uiGentle: 0.6,
    scene: 1.5,
    passage: 3.0,
    threshold: 4.0,
  },
  pulsePeriodSec: [6, 8],
  pulseScaleAmplitude: 0.015,
  pulseGlowAmplitude: 0.1,
  parallaxIntensity: 0.25,
  passageParallaxIntensity: 0.15,
  minOpacityRampMs: { ui: 600, canvas: 1500 },
  cameraDriftUnits: 0.02,
  driftMaxUnitsPerSec: 0.02,
  earthRotationPeriodSec: 480,
  reducedMotionFadeSec: 1.2,
};

const STATE_ENVELOPES = {
  S1: { minDwellMs: 2000, targetMs: 5000 },
  S2: { minDwellMs: 4000, targetMs: 11000 },
  S3: { minDwellMs: 3000, targetMs: 7000 },
  S4: { minDwellMs: 12000, targetMs: 47000 },
  S5: { minDwellMs: 0, targetMs: null },
  S6: { minDwellMs: 2000, targetMs: 4000 },
  S7: { minDwellMs: 4000, targetMs: 12000 },
  S8: { minDwellMs: 0, targetMs: null },
  S9: { minDwellMs: 600, targetMs: 6000 },
  S10: { minDwellMs: 0, targetMs: null },
  S11: { minDwellMs: 0, targetMs: null },
  S12: { minDwellMs: 0, targetMs: null },
  S13: { minDwellMs: 1200, targetMs: null },
  S14: { minDwellMs: 0, targetMs: null },
};

export const OGP_TIMING = {
  ...STATE_ENVELOPES,
  states: STATE_ENVELOPES,

  machineTickMs: 100,

  arrivalCeilingMs: { broadband: 2000, slow: 4000 },

  warmupCeilingMs: 8000,

  veil: { closeMs: 900, holdMs: 400, openMs: 1200 },

  affordanceIdleFadeMs: 4000,

  roomSlowNoticeMs: 8000,

  progressWriteIntervalMs: 15000,

  events: { maxBatch: 10, flushIntervalMs: 15000, wireBatchCeiling: 20, requestTimeoutMs: 8000 },

  api: { timeoutMs: 10000, retryBackoffMs: 700 },

  audio: {
    fadeSec: 2.0,
    loopCrossfadeSec: 1.5,
    defaultVolume: 0.35,
    readingVolumeScale: 0.2,
    schedulerLookaheadSec: 0.5,
  },

  epigraphFadeMs: 400,

  chapterCrossfadeMs: [1500, 2500],

  becomeFamilyStillnessMs: 4000,

  readerIntentDebounceMs: 800,
};

export const PARTICLE_COUNTS = {
  weave: { HIGH: 90000, MEDIUM: 30000, LOW: 8000 },
  depth: { HIGH: 4000, MEDIUM: 1800, LOW: 600 },
  stars: { HIGH: 12000, MEDIUM: 5000, LOW: 1500 },
};

export const ORIGIN_FIELD = {
  particleCount: { HIGH: 18000, MEDIUM: 8000, LOW: 3000 },
  pointSizePx: [1.0, 2.2],
  colors: ['#d9a64a', '#b58a45', '#ffe9c2'],
  driftMaxUnitsPerSec: 0.02,
  breath: { periodSec: [6, 8], amplitudeScale: 0.015 },
  densityZones: { attractorCount: [3, 5], migrationPeriodSec: 90 },
  coherence: 0.85,
  activity: 0.0,
};

export const EARTH_TIERS = {
  HIGH: {
    resolutionKey: '8k',
    surfacePx: 8192,
    cloudResolutionKey: '4k',
    cloudPx: 4096,
    surfaceSegments: [128, 64],
    cloudSegments: [96, 48],
    atmosphereSegments: [96, 48],
    anisotropy: 8,
    useNightSide: true,
  },
  MEDIUM: {
    resolutionKey: '4k',
    surfacePx: 4096,
    cloudResolutionKey: '2k',
    cloudPx: 2048,
    surfaceSegments: [96, 48],
    cloudSegments: [64, 32],
    atmosphereSegments: [64, 32],
    anisotropy: 4,
    useNightSide: true,
  },
  LOW: {
    resolutionKey: '2k',
    surfacePx: 2048,
    cloudResolutionKey: '1k',
    cloudPx: 1024,
    surfaceSegments: [64, 32],
    cloudSegments: [48, 24],
    atmosphereSegments: [48, 24],
    anisotropy: 1,
    useNightSide: false,
  },
};

export const OGP_TYPE = {
  serif: "'Literata', 'Iowan Old Style', Georgia, 'Times New Roman', serif",
  ui: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  serifFontUrl: '/fonts/literata-variable.woff2',
  uiFontUrl: '/fonts/inter-variable.woff2',

  readSizeBase: 'clamp(1.0625rem, 0.95rem + 0.5vw, 1.25rem)',
  readLineHeight: 1.65,
  stanzaLineHeight: 1.75,
  readMeasure: '34em',
  readParaSpace: '0.85em',
  displayQuestion: 'clamp(1.5rem, 1.2rem + 1.8vw, 2.5rem)',

  epigraphScale: 1.25,
  epigraphSpaceLineHeights: 2,

  uiSizeMeta: '0.8125rem',
  uiSizeControl: '0.9375rem',
  uiSizePanelTitle: '1.125rem',
  capsLetterSpacing: '0.02em',

  pageRatio: 7 / 9,
  pageRatioMinWidthPx: 768,

  textSizeSteps: [0.875, 1, 1.125, 1.3125, 1.5],
  textSizeDefaultIndex: 1,

  minTouchTargetPx: 44,
};

export const budgetForTier = (budget, tier) => budget[tier] ?? budget.LOW;

export const envelopeFor = (state) => STATE_ENVELOPES[state] ?? { minDwellMs: 0, targetMs: null };
