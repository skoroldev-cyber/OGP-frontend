/**
 * LuminousRevealMaterial — itom's RevealMaterial, re-themed dark -> luminous.
 *
 * The itom two-texture convention was `X.webp` (sketch) + `X_painted.webp` (painted),
 * hover-revealed by a noise-edged discard. §8.9 re-points that machinery without changing
 * it: `X.webp` is the DORMANT surface and `X_glow.webp` is the LUMINOUS one. The dormant
 * plane sits in front; as `progress` rises its pixels are discarded along a noisy
 * boundary, and the luminous twin behind is what the reader ends up seeing.
 *
 * RevealMaterial's "KEY INSIGHT" is preserved exactly: this subclass only decides WHICH
 * pixels to hide. Colour and lighting stay on the stock MeshBasicMaterial path, which is
 * why a re-theme was possible at all — there was no bespoke lighting model to port.
 *
 * The one deliberate change is the edge. itom brightened the boundary toward blue-white
 * ("fresh digital paint"); here it is `gold-core` at a restrained amplitude, because the
 * edge of a reveal in this build is warm light arriving, not wet ink.
 *
 * The reveal coordinate comes from a varying this material declares itself rather than
 * from `vMapUv`, so the material is safe on meshes with no map — a missing texture must
 * degrade the picture and never produce a shader that fails to compile.
 */

import * as THREE from 'three';
import { extend } from '@react-three/fiber';
import { OGP_COLORS } from '@/config/ogpTheme';
import { GLSL_COMMON, GLSL_REVEAL_EDGE } from '@/components/canvas/shaders/noise';

const PROGRAM_CACHE_KEY = 'OGPLuminousRevealMaterial_v1';

/**
 * The luminous twin of a dormant texture path (§8.9 convention).
 *
 * @param {string} url e.g. `/textures/room/field_gradient.webp`
 * @returns {string} e.g. `/textures/room/field_gradient_glow.webp`
 */
export const glowTwin = (url) => (url ? url.replace(/(\.[a-z0-9]+)$/i, '_glow$1') : url);

class LuminousRevealMaterial extends THREE.MeshBasicMaterial {
  constructor(parameters = {}) {
    super();

    this._ogpUniforms = {
      /** 0 = fully dormant, 1 = fully discarded (the luminous twin is entirely exposed). */
      uProgress: { value: 0 },
      /** Noise frequency across the reveal boundary. Higher = finer ragged edge. */
      uEdgeScale: { value: 9 },
      /** Boundary roughness. 0 would be a straight wipe, which reads as machinery. */
      uEdgeRoughness: { value: 0.22 },
      /** Width of the warm edge, in boundary units. */
      uEdgeWidth: { value: 0.16 },
      uEdgeColor: { value: new THREE.Color(OGP_COLORS.goldCore) },
      /** Edge brightness ceiling. Restrained: light arriving, not a flash. */
      uEdgeIntensity: { value: 0.35 },
    };

    this.transparent = true;
    this.fog = false;
    this.toneMapped = false;

    this.setValues(parameters);
  }

  get uniforms() {
    return this._ogpUniforms;
  }

  get progress() { return this._ogpUniforms.uProgress.value; }
  set progress(value) { this._ogpUniforms.uProgress.value = value; }

  get edgeScale() { return this._ogpUniforms.uEdgeScale.value; }
  set edgeScale(value) { this._ogpUniforms.uEdgeScale.value = value; }

  get edgeRoughness() { return this._ogpUniforms.uEdgeRoughness.value; }
  set edgeRoughness(value) { this._ogpUniforms.uEdgeRoughness.value = value; }

  get edgeWidth() { return this._ogpUniforms.uEdgeWidth.value; }
  set edgeWidth(value) { this._ogpUniforms.uEdgeWidth.value = value; }

  get edgeIntensity() { return this._ogpUniforms.uEdgeIntensity.value; }
  set edgeIntensity(value) { this._ogpUniforms.uEdgeIntensity.value = value; }

  get edgeColor() { return this._ogpUniforms.uEdgeColor.value; }
  set edgeColor(value) { this._ogpUniforms.uEdgeColor.value.set(value); }

  /**
   * @returns {string}
   */
  customProgramCacheKey() {
    return PROGRAM_CACHE_KEY;
  }

  /**
   * @param {Object} shader
   */
  onBeforeCompile(shader) {
    Object.assign(shader.uniforms, this._ogpUniforms);

    shader.vertexShader = shader.vertexShader.replace(
      '#include <common>',
      /* glsl */ `#include <common>
      varying vec2 vOgpRevealUv;
      `,
    );

    shader.vertexShader = shader.vertexShader.replace(
      '#include <uv_vertex>',
      /* glsl */ `#include <uv_vertex>
      vOgpRevealUv = uv;
      `,
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <common>',
      /* glsl */ `#include <common>

      uniform float uProgress;
      uniform float uEdgeScale;
      uniform float uEdgeRoughness;
      uniform float uEdgeWidth;
      uniform float uEdgeIntensity;
      uniform vec3 uEdgeColor;

      varying vec2 vOgpRevealUv;

      ${GLSL_COMMON}
      ${GLSL_REVEAL_EDGE}
      `,
    );

    // After three's own alpha test (which still owns the texture's transparent regions),
    // apply the progressive discard — exactly the insertion point itom used.
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <alphatest_fragment>',
      /* glsl */ `#include <alphatest_fragment>

      float ogpBoundary = ogpRevealBoundary(vOgpRevealUv, uProgress, uEdgeScale, uEdgeRoughness);
      if (uProgress > 0.0005 && ogpBoundary < 0.0) discard;
      `,
    );

    // The warm edge rides just ahead of the boundary and vanishes when the reveal settles,
    // so there is no residual seam to read as a scene switch.
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <opaque_fragment>',
      /* glsl */ `
      if (uProgress > 0.0005 && uProgress < 0.9995 && ogpBoundary < uEdgeWidth) {
        float ogpEdge = smoothstep(uEdgeWidth, 0.0, ogpBoundary) * uEdgeIntensity;
        outgoingLight += uEdgeColor * ogpEdge;
      }
      outgoingLight = ogpDeband(outgoingLight, gl_FragCoord.xy);

      #include <opaque_fragment>
      `,
    );
  }
}

extend({ LuminousRevealMaterial });

export { LuminousRevealMaterial };
export default LuminousRevealMaterial;
