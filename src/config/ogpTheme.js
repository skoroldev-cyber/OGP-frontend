/**
 * One Global People — canvas-side design tokens.
 *
 * SINGLE SOURCE OF TRUTH for every colour, duration, easing, particle budget and
 * readiness envelope used by the R3F canvas and by JavaScript animation code.
 * The DOM twin of this file is `src/styles/_ogp-tokens.scss`; the values in the two
 * files are identical by contract (BUILD_CONTRACT §7 — "a lint script asserts parity").
 *
 * Naming convention (so token parity can be checked mechanically):
 *   SCSS `$ogp-void-fog-near`  <->  JS `OGP_COLORS.voidFogNear`
 * i.e. drop the `$ogp-` prefix and camel-case the remainder.
 *
 * LAW: no component may hardcode a colour, duration, easing or font that exists here
 * (BUILD_CONTRACT §0.9, §0.10; master §8 re-theme rule). Animation timings are
 * CONFIGURATION, not constants — they are tuned by the Creative Director, not by code.
 */

/* -------------------------------------------------------------------------- */
/* Colour                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Master §8.2.1 token source of truth. The palette is deliberately narrow:
 * one void family, one gold family, one Earth-echo blue family, one reading-neutral
 * family, plus semantic states. Earth itself is coloured by NASA imagery — never here.
 */
export const OGP_COLORS = {
  // ---- Void (opening field) — §8.2.1 ----
  /** Base canvas/fog black-violet. Never pure #000: "NOT flat black" (§2.4.2). */
  voidDeep: '#030307',
  /** Outer radial vignette edge only. */
  voidVignette: '#000000',
  /** Near fog layer — the atmospheric depth that keeps the void from banding (B-001). */
  voidFogNear: '#06060c',
  /** Depth-particle base colour, pre-gold phase (S0–S1). */
  voidParticle: '#1a1a26',

  // ---- Gold (warm point, fine golden energy, Living Weave) — §8.2.1 ----
  /** Hottest pixel of the S2 warm point and of weave glints. */
  goldCore: '#ffe9c2',
  /** Living Weave strands, logo render, UI accent. */
  goldPrimary: '#d9a64a',
  /** Secondary strands, inactive accents. */
  goldMuted: '#b58a45',
  /** Strand shadow side — the dimensionality that keeps the gold "muted, refined". */
  goldDeep: '#6e5320',
  /** "Muted gold" display text on the void (§8.2.1, §8.4.2). */
  goldText: '#cfae6e',

  // ---- Earth echo (UI only; the planet uses NASA textures) — §8.2.1 ----
  /** Thin blue atmospheric rim reference — the first visible Earth signal (§2.6). */
  atmosRim: '#8fc3ee',
  /** Deep ocean reference / rare cool accent. */
  oceanDeep: '#0b2e4f',

  // ---- Reading room quietness — §8.2.1 ----
  /** Reading environment background (warm near-black). */
  readField: '#0e0d0b',
  /** Manuscript page surface — the 7x9 panel. */
  readSurface: '#12110e',
  /** Warm off-white body text. */
  readText: '#efe9dc',
  /** Folios, running heads, metadata, idle chrome. */
  readTextDim: '#b9b2a3',
  /** Hairlines and quiet separators. */
  readRule: '#2a2822',

  // ---- Semantic — §8.2.1 ----
  /** Keyboard focus ring. 2px, 2px offset, never suppressed (§8.7). */
  focus: '#ffe9c2',
  /** Form validation. Muted terracotta — no alarm red (§8.2.2 prohibited colours). */
  error: '#c96b5a',
  /** Quiet confirmation. */
  success: '#9fb98a',

  // ---- Aliases retained for the master-doc snippet in §8.2.1 ----
  /** Alias of `voidFogNear` (the §8.2.1 JS snippet names it `fogNear`). */
  fogNear: '#06060c',
  /** Alias of `voidDeep` used as the far fog colour. */
  fogFar: '#030307',
};

/**
 * Scene fog. Replaces itom's `['#fafafa', 15, 50]` (master §7.4.3 cosmic dark sweep).
 * Layered near-black — the fog is what makes the darkness read as depth rather than a wall.
 */
export const OGP_FOG = {
  color: OGP_COLORS.voidDeep,
  near: 15,
  far: 50,
};

/* -------------------------------------------------------------------------- */
/* Motion                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Master §8.3.2. GSAP is the single animation driver. Only this easing set may be used.
 * Prohibited easings (§8.3.2): bounce, elastic, back, expo at UI scale, any stepped ease.
 * "Nothing snaps."
 */
export const OGP_MOTION = {
  /** Default for all canvas + DOM tweens. */
  ease: 'sine.inOut',
  /** Elements becoming perceptible. */
  easeEnter: 'power1.out',
  /** Elements receding. */
  easeExit: 'power1.in',
  /** Registered CustomEase name for pulse cycles: slow-in, long hold, slow-out (§8.3.2). */
  easeBreath: 'ogpBreath',
  /** Seconds. GSAP takes seconds; DOM/CSS consumers multiply by 1000. */
  durations: {
    uiMicro: 0.2,
    uiGentle: 0.6,
    scene: 1.5,
    passage: 3.0,
    threshold: 4.0,
  },
  /** Heartbeat pulse window, canonical (§2.5, §8.3.1): every 6–8 s, randomised. */
  pulsePeriodSec: [6, 8],
  /** Pulse amplitude ceilings (§8.3.1): scale <= 1.5%, emissive <= 10%. */
  pulseScaleAmplitude: 0.015,
  pulseGlowAmplitude: 0.1,
  /** Mouse/gyro parallax after the guided reveal completes (§8.3.1). Never above this. */
  parallaxIntensity: 0.25,
  /** S6 passage parallax is quieter still (§7.6). */
  passageParallaxIntensity: 0.15,
  /** Minimum opacity ramps (§8.3.1): >= 600 ms in UI, >= 1.5 s on canvas. */
  minOpacityRampMs: { ui: 600, canvas: 1500 },
  /** Camera micro-drift for the "quiet sense of depth" in S0–S4 (§7.6). Units. */
  cameraDriftUnits: 0.02,
  /** Depth particles / golden energy drift, below conscious tracking (§8.6.3). */
  driftMaxUnitsPerSec: 0.02,
  /** Earth rotation in the Reading Room: one revolution >= 8 minutes (§8.3.1). */
  earthRotationPeriodSec: 480,
  /** Reduced-motion mode: fades only, no travel, no parallax, no pulse (§8.3.4). */
  reducedMotionFadeSec: 1.2,
};

/* -------------------------------------------------------------------------- */
/* Readiness envelopes — the §2.2 ninety-second score as configuration          */
/* -------------------------------------------------------------------------- */

/**
 * Per-state readiness envelopes.
 *
 * `minDwellMs` — the floor. The machine will not leave the state before it, no matter
 *   how fast assets arrive. This is Restraint made mechanical (§2.3 quality 1:
 *   "everything arrives later than commercial productions would; enforce minimum dwells").
 * `targetMs` — the score's intended duration, and the ceiling used by `anyOf()` escape
 *   guards so a missing readiness signal can never strand the reader.
 * `targetMs: null` — the state holds indefinitely and only reader intent leaves it
 *   ("The experience stops and waits. It does not force the visitor onward." §3.2).
 *
 * Derived from the §2.2 score (cumulative wall-clock -> per-state duration):
 *   S1 0–5 s | S2 5–16 s | S3–S4 16–30 s | Earth-in-opening 30–50 s |
 *   breath 50–70 s | invitation 70–90 s | S6 passage 2–4 s | S7 reveal + hold.
 *
 * THESE ARE TARGETS. Progression is driven by readiness and reader intent, never a
 * rigid film timeline (§2.2, locked principle). Final motion timing is reserved for the
 * Founding Immersive and Adaptive Creative Director (§2.1 production posture) — which is
 * exactly why they live in configuration and not in components.
 */
const STATE_ENVELOPES = {
  /** S1 Darkness — 0–5 s. Master §7.2.1 fixes the dwell floor at 2 s. */
  S1: { minDwellMs: 2000, targetMs: 5000 },
  /** S2 Distant Speck — 5–16 s cumulative. */
  S2: { minDwellMs: 4000, targetMs: 11000 },
  /** S3 Logo Manifestation — opens the 16–30 s window. */
  S3: { minDwellMs: 3000, targetMs: 7000 },
  /** S4 Living Weave — threshold + Earth discovered + breath, to ~70 s cumulative. */
  S4: { minDwellMs: 12000, targetMs: 47000 },
  /** S5 Portal Entry — 70–90 s. Holds indefinitely; only "Enter" leaves it (§2.4.6). */
  S5: { minDwellMs: 0, targetMs: null },
  /** S6 Weave Passage — 2–4 s (§2.4.7). */
  S6: { minDwellMs: 2000, targetMs: 4000 },
  /** S7 Earth Reveal — reveal-and-hold (§2.4.8). */
  S7: { minDwellMs: 4000, targetMs: 12000 },
  /** S8 Reading Room Invitation — holds indefinitely; only "Enter" leaves it (§3.2). */
  S8: { minDwellMs: 0, targetMs: null },
  /** S9 Reading Room Initialization — settles into S10 once the first unit is ready. */
  S9: { minDwellMs: 600, targetMs: 6000 },
  /** S10 Opening Arc Reading — reader-paced; no timeline may advance it (§8.3.3). */
  S10: { minDwellMs: 0, targetMs: null },
  /** S11 Share Opportunity — reader-paced (§4). */
  S11: { minDwellMs: 0, targetMs: null },
  /** S12 Continue Reading — the return seam (§3.8.4). */
  S12: { minDwellMs: 0, targetMs: null },
  /** S13 Opening Arc Complete — brief quiet, then the continue affordance (1–2 s). */
  S13: { minDwellMs: 1200, targetMs: null },
  /** S14 Choose Your Path — terminal; the reader decides or leaves (§5). */
  S14: { minDwellMs: 0, targetMs: null },
};

export const OGP_TIMING = {
  // Envelopes are exposed both flat (OGP_TIMING.S4) and grouped (OGP_TIMING.states.S4).
  ...STATE_ENVELOPES,
  states: STATE_ENVELOPES,

  /** State-machine re-evaluation interval. Guards are re-checked on every tick (§7.2.1). */
  machineTickMs: 100,

  /**
   * S0 ceiling (§2.4.1): enter S1 anyway and stream behind the darkness.
   * Darkness costs nothing, so a slow device simply breathes longer (§2.14).
   */
  arrivalCeilingMs: { broadband: 2000, slow: 4000 },

  /** itom's warm-up frame-count contract fallback — never let warm-up strand a reader. */
  warmupCeilingMs: 8000,

  /** Veil choreography (teleport machine, renamed veilPhase — §7.3). Milliseconds. */
  veil: { closeMs: 900, holdMs: 400, openMs: 1200 },

  /** Accessibility affordances fade to 40% after idle, restore on any input (§8.7). */
  affordanceIdleFadeMs: 4000,

  /** Manifest failure: after this, one calm line — never a spinner (§3.3 fallback). */
  roomSlowNoticeMs: 8000,

  /** Reading progress writes: >= every 15 s of activity, every unit boundary (§3.8.1). */
  progressWriteIntervalMs: 15000,

  /** Event batching (§7.10): flush at 10 events or 15 s; wire batch ceiling 20 (§3 contract). */
  events: { maxBatch: 10, flushIntervalMs: 15000, wireBatchCeiling: 20, requestTimeoutMs: 8000 },

  /** Default API request timeout and the single idempotent-GET retry backoff. */
  api: { timeoutMs: 10000, retryBackoffMs: 700 },

  /**
   * Audio. Every audio state change is a gain ramp of at least two seconds, never a cut
   * (§8.5.3 / §7.12 defect 6 — itom's `AudioManager.fade()` was a hard-pause stub).
   * Loop points crossfade so no seam is audible; audible loop seams are prohibited (§8.5.2).
   * Reading-room ambience defaults to <= 20% of the opening level and decays further (§8.5.3).
   */
  audio: {
    fadeSec: 2.0,
    loopCrossfadeSec: 1.5,
    defaultVolume: 0.35,
    readingVolumeScale: 0.2,
    /** Scheduling look-ahead for the loop crossfade scheduler. */
    schedulerLookaheadSec: 0.5,
  },

  /** One-signature epigraph fade under full motion; none under reduced motion (§3.4.1). */
  epigraphFadeMs: 400,

  /** Ambient cross-fade between chapters; skipped under reduced motion (§3.4.2). */
  chapterCrossfadeMs: [1500, 2500],

  /** "Become Family." threshold: minimum stillness before any affordance fades in (§8.10.2). */
  becomeFamilyStillnessMs: 4000,

  /** Reader-intent debounce so one gesture is one intent, never a scrub (§7.2.1). */
  readerIntentDebounceMs: 800,
};

/* -------------------------------------------------------------------------- */
/* Particle budgets                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Per-tier particle counts (BUILD_CONTRACT §7; master §7.4.1, §7.8).
 * weave: HIGH 60–120k / MEDIUM 20–40k / LOW 6–10k — the contract fixes 90000/30000/8000.
 * depth: the S0–S1 depth motes that keep the void from reading as flat black (§2.4.2).
 * stars: "dark, quiet, humble, not sci-fi" — a restrained starfield, no flares (§7.4.2).
 */
export const PARTICLE_COUNTS = {
  weave: { HIGH: 90000, MEDIUM: 30000, LOW: 8000 },
  depth: { HIGH: 4000, MEDIUM: 1800, LOW: 600 },
  stars: { HIGH: 12000, MEDIUM: 5000, LOW: 1500 },
};

/**
 * Living Origin Field (Logo 1) behaviour specification — master §8.6.3, verbatim.
 * Phase 2 identity; the spec is reserved now so the Active Observer Platform can later
 * modulate the field from live participation data without a redesign.
 */
export const ORIGIN_FIELD = {
  particleCount: { HIGH: 18000, MEDIUM: 8000, LOW: 3000 },
  pointSizePx: [1.0, 2.2], // size attenuation by depth
  colors: ['#d9a64a', '#b58a45', '#ffe9c2'], // gold family only
  driftMaxUnitsPerSec: 0.02, // below conscious tracking
  breath: { periodSec: [6, 8], amplitudeScale: 0.015 }, // synced to heartbeat pulse
  densityZones: { attractorCount: [3, 5], migrationPeriodSec: 90 }, // slow cluster emergence
  coherence: 0.85, // >=85% of particles within emblem silhouette bounds
  activity: 0.0, // 0–1 uniform; Phase-2+ hook for Active Observer
};

/* -------------------------------------------------------------------------- */
/* Earth                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Earth texture tiers and sphere tessellation (master §7.7: HIGH 8k surface + 4k clouds;
 * MEDIUM 4k + 2k; LOW 2k + 1k or the pre-rendered fallback).
 *
 * `resolutionKey` is the suffix `assetManifest.js` uses to build texture paths, so the
 * tier and the manifest can never drift apart. Segments are [widthSegments, heightSegments]
 * for THREE.SphereGeometry. The atmosphere shell is coarser than the surface because a
 * Fresnel rim needs silhouette resolution, not surface resolution.
 */
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
    // Night-side city lights are omitted on LOW: "Earth as mother, not civilization
    // as machinery" (§7.4.2) — losing them costs nothing.
    useNightSide: false,
  },
};

/* -------------------------------------------------------------------------- */
/* Typography                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Reading metric tokens — master §8.4.1 / §8.4.2, mirrored in `_ogp-tokens.scss`.
 * The serif is the voice of the work; the sans is the voice of the machine, and the
 * machine stays out of the opening (§8.4.2).
 */
export const OGP_TYPE = {
  /** Manuscript serif — Literata variable, self-hosted (§8.4.1 option A, recommended). */
  serif: "'Literata', 'Iowan Old Style', Georgia, 'Times New Roman', serif",
  /** UI face — Inter, self-hosted. Never used inside the manuscript surface (§8.4.2). */
  ui: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  /** Canvas (troika `font=`) needs a file URL, not a family stack. */
  serifFontUrl: '/fonts/literata-variable.woff2',
  uiFontUrl: '/fonts/inter-variable.woff2',

  // ---- §8.4.1 reading metrics ----
  /** 17–20 px fluid body size. */
  readSizeBase: 'clamp(1.0625rem, 0.95rem + 0.5vw, 1.25rem)',
  /** Stanza prose breathes. */
  readLineHeight: 1.65,
  /** Stanza blocks are set looser than prose (§3.4.1). */
  stanzaLineHeight: 1.75,
  /** ~62–68 characters per line inside the 7x9 panel. */
  readMeasure: '34em',
  /** Stanza spacing. The source uses block breaks — no first-line indents. */
  readParaSpace: '0.85em',
  /** Threshold display lines, e.g. the invitation and the protected first words. */
  displayQuestion: 'clamp(1.5rem, 1.2rem + 1.8vw, 2.5rem)',

  // ---- §8.4.1 epigraph treatment ("When you see that signature, pause. Listen.") ----
  epigraphScale: 1.25,
  epigraphSpaceLineHeights: 2,

  // ---- §8.4.2 UI scale ----
  uiSizeMeta: '0.8125rem',
  uiSizeControl: '0.9375rem',
  uiSizePanelTitle: '1.125rem',
  /** Letterspacing on all-caps labels only. */
  capsLetterSpacing: '0.02em',

  /** "Immersive Reading Layout — 7 x 9": the page proportion, 7/9 = 0.778 (§8.4.1). */
  pageRatio: 7 / 9,
  /** The 7x9 panel is honoured at and above this viewport width; below it goes full-bleed. */
  pageRatioMinWidthPx: 768,

  /** Reader text-size control: 5 steps, 0.875x–1.5x, default 1x (§3.9). */
  textSizeSteps: [0.875, 1, 1.125, 1.3125, 1.5],
  textSizeDefaultIndex: 1,

  /** Minimum touch target (§8.10.4). */
  minTouchTargetPx: 44,
};

/* -------------------------------------------------------------------------- */
/* Convenience                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Resolve a per-tier budget without leaking a magic literal into a component.
 *
 * @param {{HIGH:number,MEDIUM:number,LOW:number}} budget
 * @param {'HIGH'|'MEDIUM'|'LOW'} tier
 * @returns {number}
 */
export const budgetForTier = (budget, tier) => budget[tier] ?? budget.LOW;

/**
 * The readiness envelope for a state id, with a safe default for states not in the score.
 *
 * @param {string} state one of `STATES`
 * @returns {{minDwellMs:number,targetMs:(number|null)}}
 */
export const envelopeFor = (state) => STATE_ENVELOPES[state] ?? { minDwellMs: 0, targetMs: null };
