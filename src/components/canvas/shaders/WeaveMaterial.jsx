import * as THREE from 'three';
import { extend } from '@react-three/fiber';
import { OGP_COLORS, OGP_MOTION, ORIGIN_FIELD } from '@/config/ogpTheme';
import { GLSL_COMMON, GLSL_CURL } from '@/components/canvas/shaders/noise';

const PROGRAM_CACHE_KEY = 'OGPWeaveMaterial_v1';

class WeaveMaterial extends THREE.PointsMaterial {
  constructor(parameters = {}) {
    super();

    this._ogpUniforms = {
      uTime: { value: 0 },
      uConverge: { value: 0 },
      uPresence: { value: 0 },
      uPulse: { value: 0 },
      uPulseScale: { value: OGP_MOTION.pulseScaleAmplitude },
      uPulseGlow: { value: OGP_MOTION.pulseGlowAmplitude },
      uAperture: { value: 0 },
      uThroat: { value: 0 },
      uOpeningRadius: { value: 1 },
      uCurlScale: { value: 0.12 },
      uCurlSpeed: { value: 1 },
      uDrift: { value: ORIGIN_FIELD.driftMaxUnitsPerSec },
      uZoneStrength: { value: 0 },
      uZonePhase: { value: 0 },
      uActivity: { value: ORIGIN_FIELD.activity },
      uSizeMin: { value: ORIGIN_FIELD.pointSizePx[0] },
      uSizeMax: { value: ORIGIN_FIELD.pointSizePx[1] },
      uFadeNear: { value: 6 },
      uFadeFar: { value: 220 },
      uReduced: { value: 0 },
      uGoldCore: { value: new THREE.Color(OGP_COLORS.goldCore) },
      uGoldPrimary: { value: new THREE.Color(OGP_COLORS.goldPrimary) },
      uGoldMuted: { value: new THREE.Color(OGP_COLORS.goldMuted) },
      uGoldDeep: { value: new THREE.Color(OGP_COLORS.goldDeep) },
    };

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

  customProgramCacheKey() {
    return PROGRAM_CACHE_KEY;
  }

  onBeforeCompile(shader) {
    Object.assign(shader.uniforms, this._ogpUniforms);

    shader.vertexShader = shader.vertexShader.replace(
      '#include <common>',
       `#include <common>

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
       `
      float ogpStagger = clamp((uConverge - aPhase * 0.45) / 0.55, 0.0, 1.0);
      ogpStagger = ogpStagger * ogpStagger * (3.0 - 2.0 * ogpStagger);

      vec3 ogpFlowSample = position * uCurlScale + vec3(aSeed.x, aSeed.y, uTime * uCurlSpeed);
      vec3 ogpFlow = ogpCurl(ogpFlowSample);
      float ogpFlowAmount = uDrift * (1.0 - ogpStagger * 0.88) * (1.0 - uReduced);
      vec3 ogpEnergy = position + ogpFlow * ogpFlowAmount;

      float ogpZone = ogpSnoise(vec3(aTarget.xy * 0.35, uZonePhase));
      vec3 ogpForm = aTarget;
      ogpForm.xy += normalize(aTarget.xy + vec2(1e-4)) * ogpZone * uZoneStrength;

      float ogpR = length(ogpForm.xy) + 1e-5;
      ogpForm.xy += (ogpForm.xy / ogpR) * uAperture * (0.25 + 0.75 * aRadial);

      vec3 ogpPos = mix(ogpEnergy, ogpForm, ogpStagger);

      float ogpCentre = 1.0 - smoothstep(0.0, uOpeningRadius, length(ogpPos.xy));
      ogpPos.z -= uThroat * ogpCentre * ogpCentre;

      ogpPos *= 1.0 + uPulse * uPulseScale * (1.0 - uReduced);

      vec3 transformed = ogpPos;

      float ogpViewDepth = -(modelViewMatrix * vec4(transformed, 1.0)).z;
      float ogpDepthFade = 1.0 - smoothstep(uFadeNear, uFadeFar, ogpViewDepth);

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
       `#include <common>

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
       `
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
