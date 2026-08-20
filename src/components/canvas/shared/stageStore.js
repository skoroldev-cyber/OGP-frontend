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

  speckPhase: 0,
  speckStructure: 0,
  portalOpen: 0,
  passageBright: 0,

  stateElapsed: 0,
  stateProgress: 0,
};

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
