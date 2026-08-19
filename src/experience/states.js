/**
 * The S0–S14 spine, the immersion sub-machine, and the canonical event catalog.
 *
 * These constants are BINDING (BUILD_CONTRACT §2 and §3). Nothing here may be renamed,
 * reordered or extended without amending the contract: the state ids appear in session
 * documents, and the event names are the funnel the admin dashboard is built on.
 */

/**
 * Phase 1 states. The whole platform is ONE continuous application with state
 * transitions rather than disconnected web pages (master §2.1, locked).
 * @readonly
 */
export const STATES = {
  S0_SITE_ARRIVAL: 'S0',
  S1_DARKNESS: 'S1',
  S2_DISTANT_SPECK: 'S2',
  S3_LOGO_MANIFESTATION: 'S3',
  S4_LIVING_WEAVE: 'S4',
  S5_PORTAL_ENTRY: 'S5',
  S6_WEAVE_PASSAGE: 'S6',
  S7_EARTH_REVEAL: 'S7',
  S8_READING_ROOM_INVITATION: 'S8',
  S9_READING_ROOM_INIT: 'S9',
  S10_OPENING_ARC_READING: 'S10',
  S11_SHARE_OPPORTUNITY: 'S11',
  S12_CONTINUE_READING: 'S12',
  S13_OPENING_ARC_COMPLETE: 'S13',
  S14_CHOOSE_YOUR_PATH: 'S14',
};

/** Canonical progression order. Index comparisons use this array, never string maths. */
export const STATE_ORDER = Object.freeze([
  STATES.S0_SITE_ARRIVAL,
  STATES.S1_DARKNESS,
  STATES.S2_DISTANT_SPECK,
  STATES.S3_LOGO_MANIFESTATION,
  STATES.S4_LIVING_WEAVE,
  STATES.S5_PORTAL_ENTRY,
  STATES.S6_WEAVE_PASSAGE,
  STATES.S7_EARTH_REVEAL,
  STATES.S8_READING_ROOM_INVITATION,
  STATES.S9_READING_ROOM_INIT,
  STATES.S10_OPENING_ARC_READING,
  STATES.S11_SHARE_OPPORTUNITY,
  STATES.S12_CONTINUE_READING,
  STATES.S13_OPENING_ARC_COMPLETE,
  STATES.S14_CHOOSE_YOUR_PATH,
]);

/**
 * The guided cinematic span. The reader has no control over the first reveal
 * ("The first reveal must be guided — no user control at first", §7.2.1) beyond the three
 * mandatory affordances. `skip` is offered throughout every one of these states.
 * Cinematic states are NEVER URL-addressable (§7.11) — this set is what enforces that.
 */
export const CINEMATIC_STATES = Object.freeze([
  STATES.S1_DARKNESS,
  STATES.S2_DISTANT_SPECK,
  STATES.S3_LOGO_MANIFESTATION,
  STATES.S4_LIVING_WEAVE,
  STATES.S5_PORTAL_ENTRY,
  STATES.S6_WEAVE_PASSAGE,
  STATES.S7_EARTH_REVEAL,
]);

/**
 * The immersion sub-machine that runs INSIDE S9–S14 (master §3.6.1, locked Handoff order).
 * It is carried in `readerState.immersionState` and is never flattened into S0–S14.
 * @readonly
 */
export const IMMERSION_STATES = Object.freeze({
  ENTRY: 'entry',
  ORIENTATION: 'orientation',
  READING: 'reading',
  RECOGNITION: 'recognition',
  REFLECTION: 'reflection',
  DECOMPRESSION: 'decompression',
  SHARING_READY: 'sharing_ready',
  RETURN: 'return',
  CONVERGENCE: 'convergence',
  BECOME_FAMILY_THRESHOLD: 'become_family_threshold',
});

/** Locked immersion order, for progress reasoning only — transitions are unit-driven. */
export const IMMERSION_ORDER = Object.freeze([
  IMMERSION_STATES.ENTRY,
  IMMERSION_STATES.ORIENTATION,
  IMMERSION_STATES.READING,
  IMMERSION_STATES.RECOGNITION,
  IMMERSION_STATES.REFLECTION,
  IMMERSION_STATES.DECOMPRESSION,
  IMMERSION_STATES.SHARING_READY,
  IMMERSION_STATES.RETURN,
  IMMERSION_STATES.CONVERGENCE,
  IMMERSION_STATES.BECOME_FAMILY_THRESHOLD,
]);

/**
 * Reader pace (master §3.6.1). Descriptive only — pace never drives a timer, and it is
 * never used to target the reader; reader-state inference exists only to SUPPRESS
 * prompts and protect the reader (§3.1).
 * @readonly
 */
export const PACE_MODES = Object.freeze({
  SLOW: 'slow',
  NATURAL: 'natural',
  DEEP: 'deep',
  PAUSED: 'paused',
  RETURNING: 'returning',
});

/**
 * The canonical event catalog — 11 canonical plus 1 [PROPOSED] (BUILD_CONTRACT §3).
 * Names are exact and case-sensitive; the ingest endpoint validates them.
 * @readonly
 */
export const EVENTS = Object.freeze({
  LANDING_STARTED: 'LandingStarted',
  LOGO_MANIFESTATION_STARTED: 'LogoManifestationStarted',
  PORTAL_ENTRY_STARTED: 'PortalEntryStarted',
  EARTH_REVEAL_COMPLETED: 'EarthRevealCompleted',
  READING_ROOM_ENTERED: 'ReadingRoomEntered',
  READING_SESSION_STARTED: 'ReadingSessionStarted',
  CHAPTER_COMPLETED: 'ChapterCompleted',
  SHARE_PROMPT_DISPLAYED: 'SharePromptDisplayed',
  SHARE_COMPLETED: 'ShareCompleted',
  OPENING_ARC_COMPLETED: 'OpeningArcCompleted',
  PATHWAY_SELECTED: 'PathwaySelected',
  /** [PROPOSED] §3 — share-link arrival. */
  SHARE_TOKEN_OPENED: 'ShareTokenOpened',
});

/**
 * Events that must fire at most once per session. The rest (chapter completions, share
 * prompts) legitimately repeat. Used by the machine's emit-once ledger so a skip's
 * back-emission can never duplicate a milestone the reader already reached.
 */
export const ONCE_PER_SESSION_EVENTS = Object.freeze([
  EVENTS.LANDING_STARTED,
  EVENTS.LOGO_MANIFESTATION_STARTED,
  EVENTS.PORTAL_ENTRY_STARTED,
  EVENTS.EARTH_REVEAL_COMPLETED,
  EVENTS.READING_ROOM_ENTERED,
  EVENTS.READING_SESSION_STARTED,
  EVENTS.OPENING_ARC_COMPLETED,
]);

/** Reader- and scene-originated intents accepted by the machine. */
export const INTENTS = Object.freeze({
  ADVANCE: 'advance',
  SKIP: 'skip',
  /** Cross a single-scene threshold in one movement. Not a skip — see stateMachine.cross(). */
  CROSS: 'cross',
  BACK: 'back',
  ENTER: 'enter',
  COMPLETE: 'complete',
});

/** Intents that originate with a person, not with the scene. Only these satisfy `readerIntent()`. */
export const READER_INTENTS = Object.freeze([INTENTS.ADVANCE, INTENTS.ENTER, INTENTS.BACK]);

/** Motion preference values (§3.9 Motion setting: Full / Reduced / Off). */
export const MOTION_PREFERENCES = Object.freeze({
  FULL: 'full',
  REDUCED: 'reduced',
  OFF: 'off',
});

/** Reading themes (§3.9). Dark is canonical; light is an opt-in reading surface only. */
export const READING_THEMES = Object.freeze({ DARK: 'dark', LIGHT: 'light' });

/**
 * Verbatim age-band → content-layer routing (BUILD_CONTRACT §5, master §3.3).
 * A pure function of the band string. No inference, no profiling, no exceptions.
 */
export const AGE_BAND_TO_CONTENT_LAYER = Object.freeze({
  '8-12': 'foundation',
  '13-16': 'awakening',
  '17-19': 'transition',
  '20-25': 'emerging_adult',
  '26-32': 'grounded_adult',
  '33+': 'full_manuscript',
});

/** The only certified layer today (§3.3) — and the default whenever no band is chosen. */
export const DEFAULT_CONTENT_LAYER = 'full_manuscript';

/**
 * @param {string|null|undefined} ageBand
 * @returns {string} content layer id
 */
export const contentLayerForAgeBand = (ageBand) =>
  AGE_BAND_TO_CONTENT_LAYER[ageBand] ?? DEFAULT_CONTENT_LAYER;

/**
 * States a reload may resume at. Everything else resolves to the nearest checkpoint.
 *
 * S8 is deliberately NOT one of them. It is the last state before the manuscript, and a
 * reader who got that far and came back has seen an invitation, not a book: resuming there
 * meant the threshold — the entire arrival — played exactly once per browser and never again.
 * A second visit opened on a bare "Enter" with no idea what it was inviting them into.
 *
 * The line is drawn at where the reading actually starts. Before it, the threshold replays,
 * because it is the work. From S9 onward the reader's place is kept, because §3.8.2 is equally
 * clear the other way: "A returning reader does not start over."
 */
export const RESUME_CHECKPOINTS = Object.freeze([
  STATES.S1_DARKNESS,
  STATES.S9_READING_ROOM_INIT,
  STATES.S10_OPENING_ARC_READING,
  STATES.S14_CHOOSE_YOUR_PATH,
]);

/** States in which the DOM reading surface owns the experience (§3.10, §3.12). */
export const READING_STATES = Object.freeze([
  STATES.S10_OPENING_ARC_READING,
  STATES.S11_SHARE_OPPORTUNITY,
  STATES.S12_CONTINUE_READING,
  STATES.S13_OPENING_ARC_COMPLETE,
]);

/**
 * @param {string} state
 * @returns {number} position in `STATE_ORDER`, or -1
 */
export const stateIndex = (state) => STATE_ORDER.indexOf(state);

/**
 * @param {string} state
 * @returns {boolean}
 */
export const isCinematic = (state) => CINEMATIC_STATES.includes(state);

/**
 * @param {string} state
 * @returns {boolean}
 */
export const isReadingState = (state) => READING_STATES.includes(state);
