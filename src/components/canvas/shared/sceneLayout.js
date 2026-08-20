const FOV_DEG = 60;

export const angularDiameterDeg = (radius, distance) =>
  distance > radius ? (2 * Math.asin(radius / distance) * 180) / Math.PI : FOV_DEG;

export const SCENE = Object.freeze({
  weave: Object.freeze({
    outerRadius: 7.0,
    openingRadius: 2.1,
    bandDepth: 1.15,
    throatDepth: 3.4,
    apertureTravel: 5.6,
  }),

  passage: Object.freeze({
    radius: 9.0,
    length: 210,
    centerZ: -82,
    radialSegments: 96,
    heightSegments: 24,
  }),

  earth: Object.freeze({
    radius: 10,
    world: Object.freeze([0, -1.5, -192]),
    still: Object.freeze([0, -1.0, 2]),
    cloudScale: 1.014,
    atmosphereScale: 1.06,
    sunDirection: Object.freeze([-0.62, 0.3, 0.72]),
    presenceScaleFloor: 0.74,
  }),

  room: Object.freeze({
    radius: 44,
    height: 30,
    horizonRadius: 30,
  }),

  stars: Object.freeze({
    radius: 220,
  }),

  depthField: Object.freeze({
    innerRadius: 5,
    outerRadius: 34,
    followLambda: 0.55,
  }),

  pathways: Object.freeze({
    innerRadius: 8,
    outerRadius: 40,
  }),

  warmupY: -500,
});

export default SCENE;
