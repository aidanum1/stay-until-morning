// GPU point-sprite particle presets (memory motes, rain, stars, film dust, rhythm, prism…).

import * as THREE from 'three';

export interface FxPreset {
  count: number;
  color: THREE.Color;
  color2: THREE.Color;
  size: number;
  speed: [number, number, number];
  spread: [number, number, number];
  drift: number;
  twinkle: number;
  shape: 'dot' | 'streak' | 'square' | 'ring';
  additive: boolean;
  opacity: number;
}

export const FX_PRESETS: Record<string, FxPreset> = {
  memory: { count: 260, color: new THREE.Color('#9ff3ff'), color2: new THREE.Color('#e8d9ff'), size: 0.09, speed: [0, 0.12, 0], spread: [4, 7, 3], drift: 0.35, twinkle: 1.2, shape: 'dot', additive: true, opacity: 0.85 },
  rain: { count: 900, color: new THREE.Color('#c9d8ff'), color2: new THREE.Color('#ffffff'), size: 0.05, speed: [0.3, -6.5, 0], spread: [7, 8, 3], drift: 0.05, twinkle: 0, shape: 'streak', additive: false, opacity: 0.35 },
  stars: { count: 700, color: new THREE.Color('#ffffff'), color2: new THREE.Color('#bfe9ff'), size: 0.045, speed: [0, 0, 0], spread: [9, 9, 1], drift: 0.02, twinkle: 2.4, shape: 'dot', additive: true, opacity: 0.9 },
  film: { count: 160, color: new THREE.Color('#e6d8ff'), color2: new THREE.Color('#ffffff'), size: 0.03, speed: [0, 0.9, 0], spread: [6, 8, 2], drift: 0.2, twinkle: 4, shape: 'square', additive: true, opacity: 0.6 },
  rhythm: { count: 320, color: new THREE.Color('#ff4b55'), color2: new THREE.Color('#ffffff'), size: 0.07, speed: [0, 0.6, 0], spread: [6, 6, 3], drift: 0.9, twinkle: 3, shape: 'ring', additive: true, opacity: 0.8 },
  prism: { count: 300, color: new THREE.Color('#58f5ff'), color2: new THREE.Color('#ff5fd2'), size: 0.08, speed: [0.2, 0.25, 0], spread: [6, 7, 3], drift: 0.6, twinkle: 1.5, shape: 'dot', additive: true, opacity: 0.8 },
  sketch: { count: 120, color: new THREE.Color('#3a4146'), color2: new THREE.Color('#8fd8cf'), size: 0.05, speed: [0, 0.2, 0], spread: [6, 7, 2], drift: 0.5, twinkle: 0.5, shape: 'square', additive: false, opacity: 0.55 },
  waves: { count: 240, color: new THREE.Color('#b8f0ff'), color2: new THREE.Color('#ffffff'), size: 0.07, speed: [0.5, 0.15, 0], spread: [8, 3, 2], drift: 0.4, twinkle: 1, shape: 'dot', additive: true, opacity: 0.7 },
  snow: { count: 500, color: new THREE.Color('#ffffff'), color2: new THREE.Color('#eef5ff'), size: 0.06, speed: [0.1, -0.6, 0], spread: [7, 8, 3], drift: 0.5, twinkle: 0, shape: 'dot', additive: false, opacity: 0.8 },
  dust: { count: 140, color: new THREE.Color('#ffe6b8'), color2: new THREE.Color('#ffffff'), size: 0.05, speed: [0.04, 0.05, 0], spread: [6, 7, 3], drift: 0.25, twinkle: 1, shape: 'dot', additive: true, opacity: 0.55 },
  light: { count: 90, color: new THREE.Color('#fff2c8'), color2: new THREE.Color('#ffd9a0'), size: 0.2, speed: [0.02, 0.08, 0], spread: [6, 7, 3], drift: 0.15, twinkle: 0.8, shape: 'dot', additive: true, opacity: 0.35 },
  glitch: { count: 200, color: new THREE.Color('#9ff3ff'), color2: new THREE.Color('#ff5fd2'), size: 0.08, speed: [3, 0, 0], spread: [7, 8, 1], drift: 2, twinkle: 8, shape: 'square', additive: true, opacity: 0.7 },
};

const VERT = /* glsl */ `
uniform float uTime; uniform float uPixelRatio; uniform float uSize; uniform vec3 uSpeed; uniform vec3 uSpread; uniform float uDrift; uniform float uTwinkle;
attribute float aSeed; attribute float aScale;
varying float vAlpha; varying float vMix;
void main(){
  vec3 p = position;
  float t = uTime;
  p += uSpeed * t;
  p.x += sin(t * (0.4 + aSeed) + aSeed * 6.283) * uDrift;
  p.y += cos(t * (0.3 + aSeed * 0.5) + aSeed * 3.1) * uDrift * 0.5;
  // wrap inside the spread box
  p = mod(p + uSpread * 0.5, uSpread) - uSpread * 0.5;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = uSize * aScale * uPixelRatio * (300.0 / -mv.z);
  float tw = uTwinkle > 0.0 ? 0.55 + 0.45 * sin(t * uTwinkle + aSeed * 40.0) : 1.0;
  vAlpha = tw;
  vMix = aSeed;
}`;

const FRAG = /* glsl */ `
uniform vec3 uColor; uniform vec3 uColor2; uniform float uOpacity; uniform int uShape;
varying float vAlpha; varying float vMix;
void main(){
  vec2 uv = gl_PointCoord - 0.5;
  float a;
  if (uShape == 1) { // streak
    a = smoothstep(0.5, 0.0, abs(uv.x) * 6.0) * smoothstep(0.5, 0.1, abs(uv.y));
  } else if (uShape == 2) { // square
    a = step(max(abs(uv.x), abs(uv.y)), 0.35);
  } else if (uShape == 3) { // ring
    float d = length(uv); a = smoothstep(0.12, 0.05, abs(d - 0.32));
  } else { // dot
    float d = length(uv); a = smoothstep(0.5, 0.05, d) * (0.6 + 0.4 * smoothstep(0.25, 0.0, d));
  }
  vec3 c = mix(uColor, uColor2, vMix);
  gl_FragColor = vec4(c, a * vAlpha * uOpacity);
}`;

export class ParticleField {
  points: THREE.Points;
  private mat: THREE.ShaderMaterial;
  private target = 0;
  private fade = 0;
  constructor(preset: FxPreset, scale: number, pixelRatio: number) {
    const n = Math.max(8, Math.floor(preset.count * scale));
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(n * 3);
    const seed = new Float32Array(n);
    const sc = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = (Math.random() - 0.5) * preset.spread[0];
      pos[i * 3 + 1] = (Math.random() - 0.5) * preset.spread[1];
      pos[i * 3 + 2] = (Math.random() - 0.5) * preset.spread[2];
      seed[i] = Math.random();
      sc[i] = 0.5 + Math.random();
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    geo.setAttribute('aScale', new THREE.BufferAttribute(sc, 1));
    this.mat = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthWrite: false,
      blending: preset.additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: pixelRatio },
        uSize: { value: preset.size * 10 },
        uSpeed: { value: new THREE.Vector3(...preset.speed) },
        uSpread: { value: new THREE.Vector3(...preset.spread) },
        uDrift: { value: preset.drift },
        uTwinkle: { value: preset.twinkle },
        uColor: { value: preset.color },
        uColor2: { value: preset.color2 },
        uOpacity: { value: 0 },
        uShape: { value: ['dot', 'streak', 'square', 'ring'].indexOf(preset.shape) },
      },
    });
    this.points = new THREE.Points(geo, this.mat);
    this.points.frustumCulled = false;
    this.target = preset.opacity;
  }
  setIntensity(v: number) {
    this.target = v;
  }
  update(t: number, dt: number) {
    this.mat.uniforms.uTime.value = t;
    this.fade += (this.target - this.fade) * Math.min(1, dt * 2.5);
    this.mat.uniforms.uOpacity.value = this.fade;
  }
  fadeOut() {
    this.target = 0;
  }
  get dead() {
    return this.target === 0 && this.fade < 0.01;
  }
  dispose() {
    this.points.geometry.dispose();
    this.mat.dispose();
  }
}
