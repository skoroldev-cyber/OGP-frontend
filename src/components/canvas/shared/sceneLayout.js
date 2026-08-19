/**
 * The world layout of the single continuous scene.
 *
 * There is exactly ONE scene from S0 to S14 (§2.1, locked). Nothing is ever re-staged, so
 * every position here is fixed for the whole session and the reader's journey is literally
 * a journey: the camera travels from the darkness, through the weave, down the passage,
 * and arrives where Earth has been the entire time.
 *
 * These are SPATIAL constants, not design tokens: no colour, duration, easing, particle
 * count or font appears in this file. Distances are chosen from the framing requirements
 * of the score and are documented with the framing each one produces, so a Creative
 * Director can re-shoot the sequence by changing numbers here and nowhere else.
 *
 * Camera reference (owned by `App.jsx`): position [0, 0.2, 28], fov 60, near 0.1, far 400.
 */

/** Vertical field of view of the canvas camera, in degrees. Framing notes assume it. */
const FOV_DEG = 60;

/**
 * Angular diameter of a sphere, in degrees — the number every framing note below is
 * derived from, kept here so the framing can be re-checked rather than trusted.
 *
 * @param {number} radius
 * @param {number} distance distance from the camera to the sphere's centre
 * @returns {number} degrees
 */
export const angularDiameterDeg = (radius, distance) =>
  distance > radius ? (2 * Math.asin(radius / distance) * 180) / Math.PI : FOV_DEG;

export const SCENE = Object.freeze({
  /**
   * The Living Weave, centred on the world origin and facing the arriving camera.
   * `openingRadius / outerRadius` is the clear central opening of the Canonical One Global
   * Logo — "the second logo version, with the clearer central opening" (§2.12).
   *
   * From the S0–S4 camera at z = 28 the opening subtends ~8.6 deg; Earth at its world pose
   * subtends ~5.2 deg, so Earth is discovered INSIDE the opening with room around it.
   */
  weave: Object.freeze({
    outerRadius: 7.0,
    openingRadius: 2.1,
    /** How far the strands are allowed to spread along z. The band is dimensional, not flat. */
    bandDepth: 1.15,
    /** Peak recession of the centre in S4 — the opening acquiring depth, not splitting. */
    throatDepth: 3.4,
    /** Peak outward travel of the strand radii in S5. */
    apertureTravel: 5.6,
  }),

  /**
   * The passage — itom's `Tunnel.jsx` back-side cylinder, resurrected. Long, because the
   * distance the reader crosses in S6 is the distance between the weave and Earth; the
   * band flow supplies the sense of speed, so the length is never perceived as a number.
   * Spans z from +23 down to -187.
   */
  passage: Object.freeze({
    radius: 9.0,
    length: 210,
    centerZ: -82,
    radialSegments: 96,
    heightSegments: 24,
  }),

  /**
   * Earth. Fixed in the world for the whole session under full motion: the reader
   * approaches it, it never approaches the reader ("no flying at the viewer").
   *
   *   S4 (camera z = 28)     distance 220 -> ~5.2 deg: discovered far inside the opening
   *   S7 (camera z = -166)   distance  26 -> ~45 deg : whole, with space around it
   *
   * `still` is the reduced-motion composition: the camera never travels, so the hero frame
   * is achieved by placing Earth at the same 26-unit distance in front of the static
   * camera instead. The swap only ever happens while Earth's presence is zero (S6), so it
   * is a still-sequence crossfade, never a planet crossing the sky.
   */
  earth: Object.freeze({
    radius: 10,
    world: Object.freeze([0, -1.5, -192]),
    still: Object.freeze([0, -1.0, 2]),
    /** Clouds sit a hair above the surface; the atmosphere shell a hair above the clouds. */
    cloudScale: 1.014,
    atmosphereScale: 1.06,
    /** Solar, natural, sacred — one direction, shared by every Earth layer. */
    sunDirection: Object.freeze([-0.62, 0.3, 0.72]),
    /** Reading Room recession: Earth becomes background memory, it does not leave. */
    presenceScaleFloor: 0.74,
  }),

  /**
   * The Reading Room forms AROUND Earth and orbits it: "The Reading Room is not the
   * destination. Earth is the destination." A shell, not a room with walls.
   */
  room: Object.freeze({
    radius: 44,
    height: 30,
    /** Radius of the single hairline horizon ring. Quieter, not more elaborate. */
    horizonRadius: 30,
  }),

  /** Starfield shell. Follows the camera, so the stars never parallax into a backdrop. */
  stars: Object.freeze({
    radius: 220,
  }),

  /** Near-field depth motes, distributed in a shell that trails the camera. */
  depthField: Object.freeze({
    innerRadius: 5,
    outerRadius: 34,
    /** How quickly the field catches up to the camera. Lag IS the motion parallax in S6. */
    followLambda: 0.55,
  }),

  /** S14 ambience shell — atmosphere only; the equal choices live in the DOM. */
  pathways: Object.freeze({
    innerRadius: 8,
    outerRadius: 40,
  }),

  /** itom's warm-up idiom: heavy materials are compiled 500 units below the scene. */
  warmupY: -500,
});

export default SCENE;
