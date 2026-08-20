import * as THREE from 'three';
import { extend } from '@react-three/fiber';
import { OGP_COLORS } from '@/config/ogpTheme';
import { GLSL_COMMON, GLSL_REVEAL_EDGE } from '@/components/canvas/shaders/noise';

const PROGRAM_CACHE_KEY = 'OGPLuminousRevealMaterial_v1';

export const glowTwin = (url) => (url ? url.replace(/(\.[a-z0-9]+)$/i, '_glow$1') : url);

class LuminousRevealMaterial extends THREE.MeshBasicMaterial {
  constructor(parameters = {}) {
    super();

    this._ogpUniforms = {
      uProgress: { value: 0 },
      uEdgeScale: { value: 9 },
      uEdgeRoughness: { value: 0.22 },
      uEdgeWidth: { value: 0.16 },
      uEdgeColor: { value: new THREE.Color(OGP_COLORS.goldCore) },
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

  customProgramCacheKey() {
    return PROGRAM_CACHE_KEY;
  }

  onBeforeCompile(shader) {
    Object.assign(shader.uniforms, this._ogpUniforms);

    shader.vertexShader = shader.vertexShader.replace(
      '#include <common>',
       `#include <common>
      varying vec2 vOgpRevealUv;
      `,
    );

    shader.vertexShader = shader.vertexShader.replace(
      '#include <uv_vertex>',
       `#include <uv_vertex>
      vOgpRevealUv = uv;
      `,
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <common>',
       `#include <common>

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

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <alphatest_fragment>',
       `#include <alphatest_fragment>

      float ogpBoundary = ogpRevealBoundary(vOgpRevealUv, uProgress, uEdgeScale, uEdgeRoughness);
      if (uProgress > 0.0005 && ogpBoundary < 0.0) discard;
      `,
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <opaque_fragment>',
       `
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
