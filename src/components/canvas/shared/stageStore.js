/**
 * The stage — the scene's shared mutable state, at module scope.
 *
 * There is exactly ONE canvas and exactly ONE scene for the whole session (§2.1, and
 * `App.jsx`: "there is exactly one canvas ... nothing ever navigates, remounts the scene,
 * or reloads"). A singleton is therefore not a shortcut here, it is the accurate model:
 * a second stage could only exist if a second experience did.
 *
 * Two reasons it lives outside React rather than in a ref threaded through props:
 *
 *   1. These values change EVERY FRAME. Routing them through React state would re-render
 *      the scene graph sixty times a second; routing them through a ref prop would make
 *      every sub-scene's `useFrame` a deep mutation of somebody else's ref. The frame loop
 *      is not React's to schedule, and this is the boundary where that is admitted.
 *   2. It removes the prop drilling entirely. A sub-scene declares what it reads by
 *      importing it, which is also how the dependency shows up in review.
 *
 * `resetStage()` exists for StrictMode's double-mount and for HMR: a remount must not
 * inherit presences from the previous graph, or the reader would see the opening resume
 * mid-arc after a hot reload.
 */

/** Presence keys — the lighting plot's channels. Each is 0..1. */
export const PRESENCE_KEYS = Object.freeze([
  'depth',
  'speck',
  'weave',
  'portal',
  'passage',
  'earth',
  'room',
  'pathways',
  'stars',
]);

/**
 * Live scene presences plus the values sub-scenes publish for each other.
 *
 * Ownership is strict, and it is what keeps this object from becoming a global:
 *   `Experience`      every key in `PRESENCE_KEYS`, plus `stateElapsed` / `stateProgress`
 *   `DistantSpeck`    `speckPhase`, `speckStructure`
 *   `PortalEntry`     `portalOpen`
 *   `WeavePassage`    `passageBright`
 * Everything else READS.
 */
export const STAGE = {
  depth: 0,
  speck: 0,
  weave: 0,
  portal: 0,
  passage: 0,
  earth: 0,
  room: 0,
  pathways: 0,
  stars: 0,

  /** S2 perceptual order: light -> movement -> structure. Written by `DistantSpeck`. */
  speckPhase: 0,
  speckStructure: 0,
  /** How far the S5 aperture has eased outward. Written by `PortalEntry`. */
  portalOpen: 0,
  /** The S6 fully-bright centre frames, used for the crossfade. Written by `WeavePassage`. */
  passageBright: 0,

  /** Seconds in the current state, and that as a fraction of the score's envelope. */
  stateElapsed: 0,
  stateProgress: 0,
};

/**
 * Earth's layer amounts.
 *
 * Two authors, no shared keys — which is why neither needs to know about the other:
 *   `EarthGroup`     the locked reveal order (`rim`..`body`) and `presence`
 *   `EarthPresence`  the Reading Room's `dim`, `focus`, `rotationScale`, `recede`
 */
export const EARTH_LAYERS = {
  rim: 0,
  ocean: 0,
  clouds: 0,
  land: 0,
  body: 0,
  presence: 0,

  dim: 1,
  focus: 1,
  rotationScale: 1,
  recede: 0,
};

/** Restore both stores to their first-frame values. */
export const resetStage = () => {
  for (const key of PRESENCE_KEYS) STAGE[key] = 0;
  STAGE.speckPhase = 0;
  STAGE.speckStructure = 0;
  STAGE.portalOpen = 0;
  STAGE.passageBright = 0;
  STAGE.stateElapsed = 0;
  STAGE.stateProgress = 0;

  EARTH_LAYERS.rim = 0;
  EARTH_LAYERS.ocean = 0;
  EARTH_LAYERS.clouds = 0;
  EARTH_LAYERS.land = 0;
  EARTH_LAYERS.body = 0;
  EARTH_LAYERS.presence = 0;
  EARTH_LAYERS.dim = 1;
  EARTH_LAYERS.focus = 1;
  EARTH_LAYERS.rotationScale = 1;
  EARTH_LAYERS.recede = 0;
};

export default STAGE;
