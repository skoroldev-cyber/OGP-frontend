/**
 * Shared GLSL chunks for the OGP canvas.
 *
 * These are template strings, not files: every shader in `components/canvas` composes the
 * chunks it needs, so there is exactly one implementation of the noise, the curl flow
 * field, the de-banding dither and the analytic point falloff in the whole build.
 *
 * NAMING LAW: every symbol is `ogp`-prefixed. These chunks are injected into three's own
 * shader programs via `onBeforeCompile`, where `rand`, `pow2`, `mod289` and friends may
 * already exist — a collision would be a silent compile failure on some drivers only.
 *
 * DESIGN LAW served here:
 *   - "no banding (B-001)" — `ogpDeband` is applied to every gradient this build draws.
 *   - "drift ... below conscious tracking speed" (§8.3.1) — the curl field is a FLOW
 *     DIRECTION (unit length); amplitude is always supplied by the caller from a token.
 *   - "no glitter, no exploding particles" (§8.6.3) — the field is divergence-free by
 *     construction, so points circulate and never burst outward.
 */

/**
 * Hash + value noise + simplex noise + de-banding dither + analytic point falloff.
 * Include this chunk ONCE per shader stage. `GLSL_CURL` depends on it.
 */
export const GLSL_COMMON = /* glsl */ `
float ogpHash11(float n) {
  return fract(sin(n) * 43758.5453123);
}

float ogpHash12(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453123);
}

float ogpValueNoise2(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = ogpHash12(i);
  float b = ogpHash12(i + vec2(1.0, 0.0));
  float c = ogpHash12(i + vec2(0.0, 1.0));
  float d = ogpHash12(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float ogpFbm2(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 5; i++) {
    value += amplitude * ogpValueNoise2(p);
    p *= 2.03;
    amplitude *= 0.5;
  }
  return value;
}

vec3 ogpMod289v3(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 ogpMod289v4(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 ogpPermute(vec4 x) { return ogpMod289v4(((x * 34.0) + 1.0) * x); }
vec4 ogpTaylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

/** Ashima simplex noise, 3D. Range approximately [-1, 1]. */
float ogpSnoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);

  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);

  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;

  i = ogpMod289v3(i);
  vec4 p = ogpPermute(ogpPermute(ogpPermute(
             i.z + vec4(0.0, i1.z, i2.z, 1.0))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0))
           + i.x + vec4(0.0, i1.x, i2.x, 1.0));

  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);

  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);

  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);

  vec4 norm = ogpTaylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}

float ogpFbm3(vec3 p, int octaves) {
  float value = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 6; i++) {
    if (i >= octaves) break;
    value += amplitude * ogpSnoise(p);
    p *= 2.02;
    amplitude *= 0.5;
  }
  return value;
}

/**
 * Interleaved-gradient dither. The void is a near-black gradient across the whole
 * viewport, which is exactly where 8-bit banding shows; one sub-LSB of noise removes it
 * without being visible as grain. "no banding (B-001)" is a hard requirement, not a nicety.
 */
float ogpDither(vec2 fragCoord) {
  vec3 m = vec3(52.9829189, 0.06711056, 0.00583715);
  return fract(m.x * fract(dot(fragCoord, m.yz)));
}

vec3 ogpDeband(vec3 color, vec2 fragCoord) {
  return color + (ogpDither(fragCoord) - 0.5) * (1.0 / 255.0);
}

/**
 * Analytic radial falloff for point sprites.
 *
 * The warm point "must not behave like a logo animation" and must "never be a scaling
 * bitmap" (§2.4.3): computing the falloff in the fragment shader means there is no image
 * to scale, no pixel grid to reveal, and no resolution at which it stops being light.
 */
float ogpSoftPoint(vec2 coord, float hardness) {
  float d = length(coord - vec2(0.5)) * 2.0;
  float a = 1.0 - smoothstep(0.0, 1.0, d);
  return pow(a, hardness);
}
`;

/**
 * Divergence-free curl flow field. Requires `GLSL_COMMON` in the same shader stage.
 *
 * Returns a UNIT direction: the caller multiplies by an amplitude token
 * (`ORIGIN_FIELD.driftMaxUnitsPerSec`, `OGP_MOTION.driftMaxUnitsPerSec`) so that no
 * shader can ever exceed the "below conscious tracking speed" law on its own authority.
 *
 * Forward differences (4 potential samples rather than 6) keep the 90k-point HIGH tier
 * inside budget; for an art-directed flow the asymmetry is not perceptible.
 */
export const GLSL_CURL = /* glsl */ `
vec3 ogpPotential(vec3 p) {
  return vec3(
    ogpSnoise(p),
    ogpSnoise(p + vec3(19.19, 33.71, 7.13)),
    ogpSnoise(p + vec3(-11.37, 5.21, 27.03))
  );
}

vec3 ogpCurl(vec3 p) {
  const float e = 0.15;
  vec3 c0 = ogpPotential(p);
  vec3 cx = ogpPotential(p + vec3(e, 0.0, 0.0));
  vec3 cy = ogpPotential(p + vec3(0.0, e, 0.0));
  vec3 cz = ogpPotential(p + vec3(0.0, 0.0, e));

  vec3 curl = vec3(
    (cy.z - c0.z) - (cz.y - c0.y),
    (cz.x - c0.x) - (cx.z - c0.z),
    (cx.y - c0.y) - (cy.x - c0.x)
  );

  return curl / max(length(curl), 1e-4);
}
`;

/**
 * Noise-edged progressive discard, re-themed from itom's brush-stroke reveal.
 * Requires `GLSL_COMMON`. Used by `LuminousRevealMaterial` — dark/dormant discards to
 * expose the luminous twin beneath, with a warm edge instead of itom's cool one.
 */
export const GLSL_REVEAL_EDGE = /* glsl */ `
float ogpRevealBoundary(vec2 uvCoord, float progress, float scale, float roughness) {
  float n = ogpValueNoise2(uvCoord * scale) * roughness;
  float mask = (1.0 - uvCoord.y) + n;
  return mask - progress * (1.0 + roughness);
}
`;

export default GLSL_COMMON;
