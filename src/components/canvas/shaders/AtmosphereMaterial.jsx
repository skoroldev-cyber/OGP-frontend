import * as THREE from 'three';
import { extend } from '@react-three/fiber';
import { OGP_COLORS } from '@/config/ogpTheme';
import { GLSL_COMMON } from '@/components/canvas/shaders/noise';

const VERTEX_SHADER =  `
varying vec3 vViewNormal;
varying vec3 vViewPosition;
varying vec3 vWorldNormal;

void main() {
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  vViewPosition = -mvPosition.xyz;
  vViewNormal = normalize(normalMatrix * normal);
  vWorldNormal = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * mvPosition;
}
`;

const FRAGMENT_SHADER =  `
uniform vec3 uRimColor;
uniform vec3 uSunDirection;
uniform float uPower;
uniform float uIntensity;
uniform float uPresence;
uniform float uNightFloor;

varying vec3 vViewNormal;
varying vec3 vViewPosition;
varying vec3 vWorldNormal;

${GLSL_COMMON}

void main() {
  vec3 normal = normalize(-vViewNormal);
  vec3 viewDir = normalize(vViewPosition);

  float fresnel = 1.0 - clamp(dot(normal, viewDir), 0.0, 1.0);
  fresnel = pow(fresnel, uPower);

  float sun = dot(normalize(vWorldNormal), normalize(uSunDirection));
  float lit = mix(uNightFloor, 1.0, smoothstep(-0.55, 0.35, sun));

  float amount = fresnel * lit * uIntensity * uPresence;
  if (amount <= 0.0008) discard;

  vec3 color = ogpDeband(uRimColor * amount, gl_FragCoord.xy);
  gl_FragColor = vec4(color, amount);
}
`;

class AtmosphereMaterial extends THREE.ShaderMaterial {
  constructor(parameters = {}) {
    super({
      uniforms: {
        uRimColor: { value: new THREE.Color(OGP_COLORS.atmosRim) },
        uSunDirection: { value: new THREE.Vector3(-0.62, 0.3, 0.72).normalize() },
        uPower: { value: 4.2 },
        uIntensity: { value: 1.0 },
        uPresence: { value: 0 },
        uNightFloor: { value: 0.08 },
      },
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      depthWrite: false,
      toneMapped: false,
    });

    this.setValues(parameters);
  }

  get presence() { return this.uniforms.uPresence.value; }
  set presence(value) { this.uniforms.uPresence.value = value; }

  get intensity() { return this.uniforms.uIntensity.value; }
  set intensity(value) { this.uniforms.uIntensity.value = value; }

  get power() { return this.uniforms.uPower.value; }
  set power(value) { this.uniforms.uPower.value = value; }

  get nightFloor() { return this.uniforms.uNightFloor.value; }
  set nightFloor(value) { this.uniforms.uNightFloor.value = value; }

  get rimColor() { return this.uniforms.uRimColor.value; }
  set rimColor(value) { this.uniforms.uRimColor.value.set(value); }

  get sunDirection() { return this.uniforms.uSunDirection.value; }
  set sunDirection(value) {
    if (Array.isArray(value)) this.uniforms.uSunDirection.value.set(...value).normalize();
    else if (value?.isVector3) this.uniforms.uSunDirection.value.copy(value).normalize();
  }
}

extend({ AtmosphereMaterial });

export { AtmosphereMaterial };
export default AtmosphereMaterial;
