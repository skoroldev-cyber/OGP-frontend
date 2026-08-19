/**
 * WeaveMaterial — the Living Weave strand shader.
 *
 * "Gold muted, refined, polished, warm, dimensional; no neon, no lens flares, no banding"
 * (§2.5). Additive so strands ACCUMULATE into brightness where they cross — which is what
 * makes the form read as woven relationship rather than as a drawn outline — but the
 * per-point contribution is deliberately small so nothing ever blows out.
 *
 * Built in the itom idiom: a stock three material subclass with `onBeforeCompile`
 * injection and a `customProgramCacheKey`, so three's own colour/alpha pipeline is
 * untouched and only the geometry-of-becoming is ours (RevealMaterial's "KEY INSIGHT").
 *
 * The material owns the whole S2->S6 transformation chain as uniforms:
 *   converge   energy -> relationship -> form  (S3; "never Logo -> brand -> message")
 *   throat     the centre acquiring DEPTH      (S4; "no mechanical split")
 *   aperture   strand radii easing outward     (S5; never splitting or stretching)
 *   pulse      the heartbeat envelope          (S3+; <=1.5% scale, <=10% glow)
 *
 * Every amplitude comes from `@/config/ogpTheme`. The shader clamps nothing on its own
 * authority: if a token were raised past the design law, the law would be visibly broken,
 * which is the correct failure mode for a value the Creative Director owns.
 */

import * as THREE from 'three';
import { extend } from '@react-three/fiber';
import { OGP_COLORS, OGP_MOTION, ORIGIN_FIELD } from '@/config/ogpTheme';
import { GLSL_COMMON, GLSL_CURL } from '@/components/canvas/shaders/noise';

/** Bumped whenever the injected source changes, so three never reuses a stale program. */
const PROGRAM_CACHE_KEY = 'OGPWeaveMaterial_v1';

class WeaveMaterial extends THREE.PointsMaterial {
  constructor(parameters = {}) {
    super();

    this._ogpUniforms = {
      uTime: { value: 0 },
      /** 0 = free golden energy, 1 = resolved on the guide splines. */
      uConverge: { value: 0 },
      /** Master fade. Presence, never a hard mount/unmount (§2.3 quality 6). */
      uPresence: { value: 0 },
      /** Heartbeat envelope, 0..1, driven analytically by the component. */
      uPulse: { value: 0 },
      uPulseScale: { value: OGP_MOTION.pulseScaleAmplitude },
      uPulseGlow: { value: OGP_MOTION.pulseGlowAmplitude },
      /** S5 aperture expansion, in world units of outward strand travel. */
      uAperture: { value: 0 },
      /** S4 centre depth: the opening was always an opening. World units of recession. */
      uThroat: { value: 0 },
      /** Radius (world units) inside which the throat recession applies. */
      uOpeningRadius: { value: 1 },
      uCurlScale: { value: 0.12 },
      uCurlSpeed: { value: 1 },
      /** Flow amplitude. Sourced from `ORIGIN_FIELD.driftMaxUnitsPerSec` by the component. */
      uDrift: { value: ORIGIN_FIELD.driftMaxUnitsPerSec },
      /** Slow density-zone attractors — brighter and quieter regions (§8.6.3). */
      uZoneStrength: { value: 0 },
      uZonePhase: { value: 0 },
      /** Phase-2 hook: live participation modulates field density/brightness (§8.6.3). */
      uActivity: { value: ORIGIN_FIELD.activity },
      uSizeMin: { value: ORIGIN_FIELD.pointSizePx[0] },
      uSizeMax: { value: ORIGIN_FIELD.pointSizePx[1] },
      /** Soft depth attenuation so the field reads as volume, not as a decal. */
      uFadeNear: { value: 6 },
      uFadeFar: { value: 220 },
      /** 1 under reduced motion: no displacement, no scale pulse — an opacity breath. */
      uReduced: { value: 0 },
      uGoldCore: { value: new THREE.Color(OGP_COLORS.goldCore) },
      uGoldPrimary: { value: new THREE.Color(OGP_COLORS.goldPrimary) },
      uGoldMuted: { value: new THREE.Color(OGP_COLORS.goldMuted) },
      uGoldDeep: { value: new THREE.Color(OGP_COLORS.goldDeep) },
    };

    // Additive, unlit, unfogged. The scene fog is a 15..50 unit envelope; the weave and the
    // Earth beyond it live outside that range and carry their own depth attenuation.
    this.transparent = true;
    this.blending = THREE.AdditiveBlending;
    this.depthWrite = false;
    this.depthTest = true;
    this.fog = false;
    this.sizeAttenuation = true;
    this.toneMapped = false;
    this.size = 1;

    this.setValues(parameters);
  }

  get uniforms() {
    return this._ogpUniforms;
  }

  get time() { return this._ogpUniforms.uTime.value; }
  set time(value) { this._ogpUniforms.uTime.value = value; }

  get converge() { return this._ogpUniforms.uConverge.value; }
  set converge(value) { this._ogpUniforms.uConverge.value = value; }

  get presence() { return this._ogpUniforms.uPresence.value; }
  set presence(value) { this._ogpUniforms.uPresence.value = value; }

  get pulse() { return this._ogpUniforms.uPulse.value; }
  set pulse(value) { this._ogpUniforms.uPulse.value = value; }

  get aperture() { return this._ogpUniforms.uAperture.value; }
  set aperture(value) { this._ogpUniforms.uAperture.value = value; }

  get throat() { return this._ogpUniforms.uThroat.value; }
  set throat(value) { this._ogpUniforms.uThroat.value = value; }

  get openingRadius() { return this._ogpUniforms.uOpeningRadius.value; }
  set openingRadius(value) { this._ogpUniforms.uOpeningRadius.value = value; }

  get curlScale() { return this._ogpUniforms.uCurlScale.value; }
  set curlScale(value) { this._ogpUniforms.uCurlScale.value = value; }

  get curlSpeed() { return this._ogpUniforms.uCurlSpeed.value; }
  set curlSpeed(value) { this._ogpUniforms.uCurlSpeed.value = value; }

  get drift() { return this._ogpUniforms.uDrift.value; }
  set drift(value) { this._ogpUniforms.uDrift.value = value; }

  get zoneStrength() { return this._ogpUniforms.uZoneStrength.value; }
  set zoneStrength(value) { this._ogpUniforms.uZoneStrength.value = value; }

  get zonePhase() { return this._ogpUniforms.uZonePhase.value; }
  set zonePhase(value) { this._ogpUniforms.uZonePhase.value = value; }

  get activity() { return this._ogpUniforms.uActivity.value; }
  set activity(value) { this._ogpUniforms.uActivity.value = value; }

  get sizeMin() { return this._ogpUniforms.uSizeMin.value; }
  set sizeMin(value) { this._ogpUniforms.uSizeMin.value = value; }

  get sizeMax() { return this._ogpUniforms.uSizeMax.value; }
  set sizeMax(value) { this._ogpUniforms.uSizeMax.value = value; }

  get fadeNear() { return this._ogpUniforms.uFadeNear.value; }
  set fadeNear(value) { this._ogpUniforms.uFadeNear.value = value; }

  get fadeFar() { return this._ogpUniforms.uFadeFar.value; }
  set fadeFar(value) { this._ogpUniforms.uFadeFar.value = value; }

  get reduced() { return this._ogpUniforms.uReduced.value; }
  set reduced(value) { this._ogpUniforms.uReduced.value = value ? 1 : 0; }

  /**
   * Three must not hand this material a cached stock Points program, and must not hand a
   * stock Points mesh ours. One constant key per source revision is exactly right here:
   * the injected code has no per-instance branches.
   *
   * @returns {string}
   */
  customProgramCacheKey() {
    return PROGRAM_CACHE_KEY;
  }

  /**
   * @param {Object} shader three's shader descriptor
   */
  onBeforeCompile(shader) {
    Object.assign(shader.uniforms, this._ogpUniforms);

    shader.vertexShader = shader.vertexShader.replace(
      '#include <common>',
      /* glsl */ `#include <common>

      attribute vec3 aTarget;
      attribute vec3 aSeed;
      attribute float aPhase;
      attribute float aBand;
      attribute float aRadial;

      uniform float uTime;
      uniform float uConverge;
      uniform float uPresence;
      uniform float uPulse;
      uniform float uPulseScale;
      uniform float uPulseGlow;
      uniform float uAperture;
      uniform float uThroat;
      uniform float uOpeningRadius;
      uniform float uCurlScale;
      uniform float uCurlSpeed;
      uniform float uDrift;
      uniform float uZoneStrength;
      uniform float uZonePhase;
      uniform float uActivity;
      uniform float uSizeMin;
      uniform float uSizeMax;
      uniform float uFadeNear;
      uniform float uFadeFar;
      uniform float uReduced;

      varying float vGold;
      varying float vCore;
      varying float vAlpha;

      ${GLSL_COMMON}
      ${GLSL_CURL}
      `,
    );

    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      /* glsl */ `
      // ---- Energy -> relationship -> form -------------------------------------
      // Each point resolves on its own schedule. Staggering is what makes the weave
      // ASSEMBLE from relationships instead of cutting from one shape to another.
      float ogpStagger = clamp((uConverge - aPhase * 0.45) / 0.55, 0.0, 1.0);
      ogpStagger = ogpStagger * ogpStagger * (3.0 - 2.0 * ogpStagger);

      // Free golden energy: a divergence-free circulation, never a burst.
      vec3 ogpFlowSample = position * uCurlScale + vec3(aSeed.x, aSeed.y, uTime * uCurlSpeed);
      vec3 ogpFlow = ogpCurl(ogpFlowSample);
      float ogpFlowAmount = uDrift * (1.0 - ogpStagger * 0.88) * (1.0 - uReduced);
      vec3 ogpEnergy = position + ogpFlow * ogpFlowAmount;

      // Density zones: slow attractors producing brighter and quieter regions while the
      // silhouette stays coherent (Design Bible field behaviour, §8.6.3).
      float ogpZone = ogpSnoise(vec3(aTarget.xy * 0.35, uZonePhase));
      vec3 ogpForm = aTarget;
      ogpForm.xy += normalize(aTarget.xy + vec2(1e-4)) * ogpZone * uZoneStrength;

      // S5 aperture: the strand radii ease OUTWARD. Nothing splits, nothing stretches —
      // the whole band travels, so the opening widens by recession, not by tearing.
      float ogpR = length(ogpForm.xy) + 1e-5;
      ogpForm.xy += (ogpForm.xy / ogpR) * uAperture * (0.25 + 0.75 * aRadial);

      vec3 ogpPos = mix(ogpEnergy, ogpForm, ogpStagger);

      // The centre acquires DEPTH. The reader gradually understands it has always been an
      // opening: points near the axis recede, so the eye finds distance where it expected
      // a surface. No splitting, stretching, or mechanical opening, ever (C-001).
      float ogpCentre = 1.0 - smoothstep(0.0, uOpeningRadius, length(ogpPos.xy));
      ogpPos.z -= uThroat * ogpCentre * ogpCentre;

      // Heartbeat: scale, then glow, then stillness. Suppressed entirely under reduced
      // motion, where the same pulse is expressed as an opacity breath below.
      ogpPos *= 1.0 + uPulse * uPulseScale * (1.0 - uReduced);

      vec3 transformed = ogpPos;

      float ogpViewDepth = -(modelViewMatrix * vec4(transformed, 1.0)).z;
      float ogpDepthFade = 1.0 - smoothstep(uFadeNear, uFadeFar, ogpViewDepth);

      // Colour is dimensional, never flat: shadow side, body, and restrained glints.
      vGold = clamp(aRadial * 0.75 + aSeed.z * 0.25, 0.0, 1.0);
      vCore = clamp(aSeed.z * 0.35 + uPulse * uPulseGlow * 3.0, 0.0, 1.0) * ogpStagger;

      float ogpZoneBrightness = 1.0 + ogpZone * 0.22 + uActivity * 0.2;
      vAlpha = uPresence
        * mix(0.28, 1.0, ogpStagger)
        * mix(0.55, 1.0, aSeed.x)
        * ogpZoneBrightness
        * ogpDepthFade
        * (1.0 + uPulse * uPulseGlow * uReduced);

      float ogpSizeScale = mix(uSizeMin, uSizeMax, aSeed.y)
        * mix(0.7, 1.0, ogpStagger)
        * (1.0 + uPulse * uPulseScale);
      `,
    );

    shader.vertexShader = shader.vertexShader.replace(
      'gl_PointSize = size;',
      'gl_PointSize = size * ogpSizeScale;',
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <common>',
      /* glsl */ `#include <common>

      uniform vec3 uGoldCore;
      uniform vec3 uGoldPrimary;
      uniform vec3 uGoldMuted;
      uniform vec3 uGoldDeep;

      varying float vGold;
      varying float vCore;
      varying float vAlpha;

      ${GLSL_COMMON}
      `,
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <opaque_fragment>',
      /* glsl */ `
      // Analytic falloff: light, not a sprite. Nothing here can ever read as a bitmap.
      float ogpFalloff = ogpSoftPoint(gl_PointCoord, 1.6);
      if (ogpFalloff <= 0.003 || vAlpha <= 0.001) discard;

      vec3 ogpStrand = mix(uGoldDeep, uGoldMuted, smoothstep(0.0, 0.55, vGold));
      ogpStrand = mix(ogpStrand, uGoldPrimary, smoothstep(0.35, 1.0, vGold));
      ogpStrand = mix(ogpStrand, uGoldCore, vCore);

      outgoingLight = ogpDeband(ogpStrand, gl_FragCoord.xy);
      diffuseColor.a = vAlpha * ogpFalloff;

      #include <opaque_fragment>
      `,
    );
  }
}

extend({ WeaveMaterial });

export { WeaveMaterial };
export default WeaveMaterial;
