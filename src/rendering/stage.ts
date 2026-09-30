// The 3D stage: layered background, character sprites with procedural idle
// animation, cinematic camera rig, particle layers, CG overlay, transitions and a
// light post-processing pass (bloom + film grain + vignette). Vertical (9:16) first;
// wider viewports simply see more of the scene.

import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { TextureStore } from './assets';
import { FX_PRESETS, ParticleField } from './particles';
import { profileFor, type QualityLevel, type QualityProfile } from './quality';
import { BACKGROUNDS } from '../scenes/manifest';
import { CHARACTERS } from '../characters/characters';
import type { CharId } from '../narrative/types';
import type { StageChar } from '../game/state';

const GRADE = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uGrain: { value: 0.045 },
    uVignette: { value: 0.2 },
    uTint: { value: new THREE.Color('#ffffff') },
    uTintAmt: { value: 0 },
    uFlash: { value: 0 },
    uMono: { value: 0 },
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse; uniform float uTime, uGrain, uVignette, uTintAmt, uFlash, uMono; uniform vec3 uTint;
    varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)) + uTime) * 43758.5453); }
    void main(){
      vec4 c = texture2D(tDiffuse, vUv);
      float g = (hash(vUv * 900.0) - 0.5) * uGrain;
      c.rgb += g;
      float d = distance(vUv, vec2(0.5, 0.5));
      c.rgb *= 1.0 - smoothstep(0.45, 0.95, d) * uVignette;
      float l = dot(c.rgb, vec3(0.299, 0.587, 0.114));
      c.rgb = mix(c.rgb, vec3(l), uMono);
      c.rgb = mix(c.rgb, c.rgb * uTint, uTintAmt);
      c.rgb = mix(c.rgb, vec3(1.0), uFlash);
      gl_FragColor = c;
    }`,
};

type Transition = 'fade' | 'cut' | 'memory' | 'flash' | 'slow';

interface CharSprite {
  id: CharId;
  mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  aura: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  expr: string;
  at: string;
  targetX: number;
  targetAlpha: number;
  alpha: number;
  seed: number;
  blink: number;
  nextBlink: number;
  targetDim: number;
  back?: number;
  dim: number;
  pose: 'stand' | 'sit';
  scale: number;
  floorY: number;
}

const SLOT_X: Record<string, number> = { l: -1.15, c: 0, r: 1.15, fl: -0.55, fr: 0.55 };
const VIEW_H = 6; // world units visible vertically at camera distance

export interface CamShot {
  kind: string;
  targets: CharId[];
}

export class Stage {
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera: THREE.PerspectiveCamera;
  textures: TextureStore;
  profile: QualityProfile;
  private composer?: EffectComposer;
  private bloom?: UnrealBloomPass;
  private grade?: ShaderPass;
  private bgA: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  private bgB: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  private bgMix = 1; // 1 = A fully visible
  private bgTransition: Transition = 'fade';
  private bgDuration = 1;
  private bgCurrent: string | null = null;
  private bgWide = false;
  private cgMesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  private cgTarget = 0;
  private chars = new Map<CharId, CharSprite>();
  private fx = new Map<string, ParticleField>();
  private timer = new THREE.Timer();
  private time = 0;
  private cam = { x: 0, y: 0, z: 10, tx: 0, ty: 0, tz: 10, roll: 0, shake: 0, orbit: 0, pan: 0 };
  private shot: CamShot = { kind: 'wide', targets: [] };
  private letterbox = 0;
  private letterboxTarget = 0;
  private flash = 0;
  private tint: { color: THREE.Color; amt: number } = { color: new THREE.Color('#ffffff'), amt: 0 };
  private tintTarget = 0;
  private mono = 0;
  private monoTarget = 0;
  private lightColor = new THREE.Color('#ffffff');
  private viewW = 3.375;
  private hubOffset = 0;
  private hubTarget = 0;
  private groupScale = 1;
  private groupScaleNow = 1;
  reduceMotion = false;
  /** 0 disables the character aura (e.g. line-art scenes) */
  auraStrength = 1;
  private _aura?: THREE.Texture;
  private auraTexture() {
    if (this._aura) return this._aura;
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const g = c.getContext('2d')!;
    const gr = g.createRadialGradient(128, 128, 10, 128, 128, 128);
    gr.addColorStop(0, 'rgba(255,255,255,0.9)');
    gr.addColorStop(0.35, 'rgba(255,255,255,0.35)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, 256, 256);
    this._aura = new THREE.CanvasTexture(c);
    return this._aura;
  }
  reduceCamera = false;
  paused = false;

  constructor(
    public canvas: HTMLCanvasElement,
    quality: QualityLevel,
  ) {
    this.profile = profileFor(quality);
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: this.profile.antialias,
      powerPreference: 'high-performance',
      alpha: false,
    });
    this.renderer.setPixelRatio(this.profile.pixelRatio);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.camera = new THREE.PerspectiveCamera(33.4, 9 / 16, 0.1, 100);
    this.camera.position.set(0, 0, 10);
    this.textures = new TextureStore(this.renderer, quality === 'low' ? 12 : 24);
    this.textures.onSwap = (from, to) => {
      const mats = [this.bgA.material, this.bgB.material, this.cgMesh.material, ...[...this.chars.values()].map((c) => c.mesh.material)];
      for (const m of mats)
        if (m.map === from) {
          m.map = to;
          m.needsUpdate = true;
        }
    };
    this.textures.inUse = (set) => {
      set.add(this.bgA.material.map!);
      set.add(this.bgB.material.map!);
      if (this.cgMesh.material.map) set.add(this.cgMesh.material.map);
      for (const c of this.chars.values()) if (c.mesh.material.map) set.add(c.mesh.material.map);
    };

    const mkPlane = (z: number) => {
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(1, 1),
        new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, depthTest: false }),
      );
      m.position.z = z;
      m.renderOrder = z;
      this.scene.add(m);
      return m;
    };
    this.bgB = mkPlane(-3.2);
    this.bgA = mkPlane(-3);
    this.bgA.material.map = this.textures.bg('black');
    this.bgB.material.map = this.textures.bg('black');
    this.cgMesh = mkPlane(2.5);
    this.cgMesh.material.opacity = 0;
    this.cgMesh.visible = false;
    this.cgMesh.renderOrder = 50;

    this.setupPost();
    this.resize();
  }

  private setupPost() {
    if (!this.profile.post) return;
    const size = this.renderer.getSize(new THREE.Vector2());
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    if (this.profile.bloom) {
      this.bloom = new UnrealBloomPass(size, 0.22, 0.6, 0.9);
      this.composer.addPass(this.bloom);
    }
    this.grade = new ShaderPass(GRADE);
    this.composer.addPass(this.grade);
  }

  setQuality(level: QualityLevel) {
    this.profile = profileFor(level);
    this.renderer.setPixelRatio(this.profile.pixelRatio);
    this.composer?.dispose();
    this.composer = undefined;
    this.bloom = undefined;
    this.grade = undefined;
    this.setupPost();
    this.resize();
  }

  resize() {
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.composer?.setSize(w, h);
    this.camera.aspect = w / h;
    // keep the same vertical field of view; wider screens see more horizontally
    this.camera.updateProjectionMatrix();
    this.viewW = VIEW_H * this.camera.aspect;
    this.layoutBg(this.bgA, this.bgWide);
    this.layoutBg(this.bgB, this.bgWide);
    this.cgMesh.scale.set(this.coverW(9 / 16, 2.5), this.coverH(9 / 16, 2.5), 1);
  }

  /** world size of a plane at z that covers the view with the image's aspect */
  private coverW(imgAspect: number, z: number) {
    const dist = 10 - z;
    const vh = 2 * dist * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) * 1.15;
    const vw = vh * this.camera.aspect;
    return Math.max(vw, vh * imgAspect);
  }
  private coverH(imgAspect: number, z: number) {
    return this.coverW(imgAspect, z) / imgAspect;
  }

  private layoutBg(mesh: THREE.Mesh, wide: boolean) {
    const aspect = wide ? 2276 / 1280 : 720 / 1280;
    const h = this.coverH(aspect, -3);
    const w = h * aspect;
    mesh.scale.set(w, h, 1);
  }

  // ------------------------------------------------------------ backgrounds

  setBackground(id: string | null, transition: Transition = 'fade', duration = 1.2, tint?: string) {
    const target = id ?? 'black';
    if (target === this.bgCurrent && transition !== 'flash') return;
    const def = BACKGROUNDS[target] ?? BACKGROUNDS.black;
    // move A -> B, load new into A
    this.bgB.material.map = this.bgA.material.map;
    this.bgB.scale.copy(this.bgA.scale);
    this.bgA.material.map = this.textures.bg(target);
    this.bgWide = !!def.wide;
    this.layoutBg(this.bgA, this.bgWide);
    this.bgCurrent = target;
    this.bgTransition = transition;
    this.bgDuration = transition === 'cut' ? 0.001 : transition === 'slow' ? Math.max(duration, 2.4) : transition === 'memory' ? Math.max(duration, 1.8) : duration;
    this.bgMix = 0;
    if (transition === 'flash') this.flash = 1;
    this.lightColor.set(def.light);
    this.setTint(tint);
    this.hubOffset = this.hubTarget = 0;
    void this.textures.ready(`bg:${target}`);
  }

  setTint(tint?: string) {
    const map: Record<string, string> = { dawn: '#ffd8b8', night: '#aab8ff', memory: '#cfe6ff', mono: '#ffffff' };
    if (tint && map[tint]) {
      this.tint.color.set(map[tint]);
      this.tintTarget = tint === 'mono' ? 0 : 0.55;
      this.monoTarget = tint === 'mono' ? 0.8 : 0;
    } else {
      this.tintTarget = 0;
      this.monoTarget = 0;
    }
  }

  /** Hub panorama scroll, -1..1 */
  setHubScroll(v: number) {
    this.hubTarget = THREE.MathUtils.clamp(v, -1, 1);
  }

  // ------------------------------------------------------------ CG

  setCg(id: string | null) {
    if (id) {
      this.cgMesh.material.map = this.textures.cg(id);
      this.cgMesh.visible = true;
      this.cgTarget = 1;
    } else this.cgTarget = 0;
  }

  // ------------------------------------------------------------ characters

  syncCharacters(list: StageChar[], hub = false) {
    const wanted = new Map(list.map((c) => [c.id as CharId, c]));
    this.groupScale = hub ? 1 : list.length <= 1 ? 1 : list.length === 2 ? 0.84 : 0.72;
    // on a phone the named slots are too close together: spread whoever is present evenly, keeping their left-to-right order
    const spreadX = new Map<string, number>();
    if (!hub && list.length > 1) {
      const order = [...list].sort((p, q) => (SLOT_X[p.at ?? 'c'] ?? 0) - (SLOT_X[q.at ?? 'c'] ?? 0));
      const n = order.length;
      const step = (n === 2 ? 1.5 : n === 3 ? 1.08 : 3.0 / n) * (this.viewW / 3.375);
      order.forEach((c, i) => spreadX.set(c.id, (i - (n - 1) / 2) * step));
    }
    for (const [id, sp] of this.chars) {
      if (!wanted.has(id)) sp.targetAlpha = 0;
    }
    list.forEach((c) => {
      const id = c.id as CharId;
      if (!CHARACTERS[id]) return;
      let sp = this.chars.get(id);
      if (!sp) {
        const geo = new THREE.PlaneGeometry(1, 1);
        const mat = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, depthTest: false });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.renderOrder = 10;
        this.scene.add(mesh);
        const aura = new THREE.Mesh(
          new THREE.PlaneGeometry(1, 1),
          new THREE.MeshBasicMaterial({ map: this.auraTexture(), transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, color: new THREE.Color(CHARACTERS[id].color), opacity: 0 }),
        );
        aura.renderOrder = 9;
        this.scene.add(aura);
        sp = {
          id,
          mesh,
          aura,
          expr: '',
          at: c.at,
          targetX: 0,
          targetAlpha: 0,
          alpha: 0,
          seed: Math.random() * 100,
          blink: 0,
          nextBlink: 2 + Math.random() * 3,
          targetDim: 0,
          dim: 0,
          pose: 'stand',
          scale: 1,
          floorY: 0,
        };
        this.chars.set(id, sp);
        mesh.position.x = (spreadX.get(c.id) ?? this.slotX(c.at, hub));
      }
      if (sp.expr !== c.expr) {
        sp.expr = c.expr;
        sp.mesh.material.map = this.textures.char(id, c.expr);
        sp.mesh.material.needsUpdate = true;
      }
      sp.at = c.at;
      if (!hub) sp.scale = 1; // leaving the hub: back to story framing
      sp.targetX = (spreadX.get(c.id) ?? this.slotX(c.at, hub));
      sp.targetAlpha = 1;
    });
  }

  /** Position/scale sprites for the hub panorama (spots in 0..1 across the panorama). */
  placeHubSprite(id: CharId, x01: number, y01: number, scale: number, pose: 'stand' | 'sit') {
    const sp = this.chars.get(id);
    if (!sp) return;
    const panoW = this.bgA.scale.x;
    sp.targetX = (x01 - 0.5) * panoW;
    sp.pose = pose;
    // hub: people stand close to the camera; the knee cut sits below the bottom bar
    sp.scale = scale * 0.82;
    sp.floorY = -VIEW_H * 0.5 - 0.35 + (y01 - 0.18) * 1.5 + (pose === 'sit' ? -0.45 : 0);
    sp.mesh.position.z = 0.2;
  }

  private slotX(at: string, hub: boolean) {
    const base = SLOT_X[at] ?? 0;
    // on wide screens characters spread out a bit more
    const spread = hub ? 1 : Math.min(1.6, this.camera.aspect / (9 / 16));
    return base * (this.viewW / 3.375) * 0.62 * spread;
  }

  /** Dim everyone except the speaker. */
  focus(speaker: string | null) {
    for (const sp of this.chars.values()) sp.targetDim = speaker && speaker !== sp.id && this.chars.has(speaker as CharId) ? 0.35 : 0;
  }

  charScreenX(id: CharId): number | null {
    const sp = this.chars.get(id);
    return sp ? sp.mesh.position.x : null;
  }

  /** world y of the top of a character sprite */
  charTopY(id: CharId): number {
    const sp = this.chars.get(id);
    return sp ? sp.mesh.position.y + sp.mesh.scale.y * 0.5 : 0;
  }

  /** current panorama horizontal offset (world units) */
  get bgOffsetX() {
    return this.bgA.position.x;
  }

  get panoramaWidth() {
    return this.bgA.scale.x;
  }

  private projV = new THREE.Vector3();
  /** world → CSS pixel coordinates */
  projectToScreen(x: number, y: number, z: number): { x: number; y: number } {
    this.projV.set(x, y, z).project(this.camera);
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    return { x: (this.projV.x * 0.5 + 0.5) * w, y: (-this.projV.y * 0.5 + 0.5) * h };
  }

  // ------------------------------------------------------------ camera

  setShot(kind: string, targets: CharId[]) {
    this.shot = { kind, targets };
    this.cam.orbit = 0;
    this.cam.pan = 0;
  }

  shake(amount = 1) {
    if (this.reduceCamera) return;
    this.cam.shake = amount;
  }

  doFlash() {
    this.flash = 1;
  }

  setLetterbox(on: boolean) {
    this.letterboxTarget = on ? 1 : 0;
  }
  get letterboxAmount() {
    return this.letterbox;
  }

  // ------------------------------------------------------------ fx

  setFx(id: string | null, intensity = 1) {
    for (const [k, f] of this.fx) if (k !== id) f.fadeOut();
    if (!id) return;
    let f = this.fx.get(id);
    if (!f) {
      const preset = FX_PRESETS[id];
      if (!preset) return;
      f = new ParticleField(preset, this.profile.particleScale * (this.reduceMotion ? 0.5 : 1), this.profile.pixelRatio);
      f.points.position.z = id === 'rain' || id === 'snow' ? 1.5 : id === 'stars' ? -2.5 : 0.5;
      f.points.renderOrder = id === 'stars' ? 1 : 20;
      this.scene.add(f.points);
      this.fx.set(id, f);
    }
    f.setIntensity(FX_PRESETS[id].opacity * intensity);
  }

  // ------------------------------------------------------------ frame

  render() {
    this.timer.update();
    const dt = Math.min(0.05, this.timer.getDelta());
    if (this.paused) return dt;
    this.time += dt;
    const t = this.time;
    const lerp = (a: number, b: number, k: number) => a + (b - a) * Math.min(1, k);

    // background crossfade
    if (this.bgMix < 1) {
      this.bgMix = Math.min(1, this.bgMix + dt / this.bgDuration);
    }
    const e = this.bgTransition === 'memory' ? this.bgMix * this.bgMix * (3 - 2 * this.bgMix) : this.bgMix;
    this.bgA.material.opacity = e;
    this.bgB.material.opacity = 1;
    this.bgB.visible = e < 1;
    if (this.bgTransition === 'memory') {
      const s = 1 + (1 - e) * 0.08;
      this.bgA.scale.x = this.bgA.scale.x / (this.bgA.userData.s ?? 1) * s;
      this.bgA.userData.s = s;
    }
    // subtle background drift (parallax with camera)
    this.hubOffset = lerp(this.hubOffset, this.hubTarget, dt * 4);
    const panoOverflow = Math.max(0, (this.bgA.scale.x - this.coverW(9 / 16, -3) * 1.0) / 2);
    this.bgA.position.x = -this.hubOffset * panoOverflow;
    this.bgB.position.x = this.bgB.scale.x > this.bgA.scale.x * 1.5 ? -this.hubOffset * panoOverflow : 0;

    // characters
    this.groupScaleNow = lerp(this.groupScaleNow, this.groupScale, dt * 4);
    for (const [id, sp] of this.chars) {
      sp.alpha = lerp(sp.alpha, sp.targetAlpha, dt * 5);
      sp.dim = lerp(sp.dim, sp.targetDim, dt * 6);
      if (sp.alpha < 0.01 && sp.targetAlpha === 0) {
        this.scene.remove(sp.mesh);
        this.scene.remove(sp.aura);
        sp.mesh.geometry.dispose();
        sp.mesh.material.dispose();
        sp.aura.geometry.dispose();
        sp.aura.material.dispose();
        this.chars.delete(id);
        continue;
      }
      const ch = CHARACTERS[id];
      // story framing: one character fills the frame chest-up (face in the upper third); groups shrink a little
      // listeners stand a step behind the speaker
      sp.back = lerp(sp.back ?? 0, sp.targetDim > 0 ? 1 : 0, dt * 4);
      const h = sp.scale !== 1 ? VIEW_H * 0.72 * ch.height * sp.scale : VIEW_H * 1.02 * (0.97 + (ch.height - 1) * 0.6) * this.groupScaleNow * (1 - sp.back * 0.1);
      const breathe = this.reduceMotion ? 0 : Math.sin(t * 1.4 + sp.seed) * 0.004;
      sp.mesh.scale.set(h * (752 / 1344) * (1 + breathe * 0.5), h * (1 + breathe), 1);
      sp.mesh.position.x = lerp(sp.mesh.position.x, sp.targetX, dt * 5);
      if (sp.scale !== 1) sp.mesh.position.y = sp.floorY + h * 0.5;
      else sp.mesh.position.y = VIEW_H * 0.5 - VIEW_H * 0.09 - h * 0.5 - (1 - this.groupScaleNow) * 0.9 + (this.reduceMotion ? 0 : Math.sin(t * 0.7 + sp.seed) * 0.02);
      sp.mesh.material.opacity = sp.alpha;
      // the speaker stands in front; listeners fall back a step
      sp.mesh.renderOrder = sp.targetDim > 0 ? 10 : 12;
      sp.aura.renderOrder = sp.targetDim > 0 ? 8 : 11;
      // ethereal aura: a soft additive glow in the member's colour, breathing slowly
      const pulse = this.reduceMotion ? 0.5 : 0.5 + 0.5 * Math.sin(t * 0.9 + sp.seed);
      sp.aura.position.set(sp.mesh.position.x, sp.mesh.position.y + h * 0.08, sp.mesh.position.z - 0.05);
      sp.aura.scale.set(h * 1.25 * (1 + pulse * 0.04), h * 1.4 * (1 + pulse * 0.04), 1);
      sp.aura.material.opacity = sp.alpha * (0.34 + pulse * 0.16) * (1 - sp.dim * 0.7) * this.auraStrength;
      const l = this.lightColor;
      const d = 1 - sp.dim;
      // scene light only tints the sprite lightly so faces stay readable
      const k = 0.22;
      sp.mesh.material.color.setRGB((1 - k + l.r * k) * d, (1 - k + l.g * k) * d, (1 - k + l.b * k) * d);
      // blink: briefly swap to a squint by scaling the top of the sprite (cheap and readable)
      sp.nextBlink -= dt;
      if (sp.nextBlink <= 0) {
        sp.blink = 0.14;
        sp.nextBlink = 2.5 + Math.random() * 4;
      }
      if (sp.blink > 0) sp.blink -= dt;
    }

    // camera rig
    const c = this.cam;
    const shot = this.shot;
    const focusX = (ids: CharId[]) => {
      const xs = ids.map((i) => this.charScreenX(i)).filter((x): x is number => x !== null);
      return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
    };
    switch (shot.kind) {
      case 'closeup':
        c.tx = focusX(shot.targets) * 0.6;
        c.ty = 0.9;
        c.tz = 7.2;
        break;
      case 'shoulder':
        c.tx = focusX(shot.targets) * 0.5 + 0.35;
        c.ty = 0.6;
        c.tz = 7.8;
        c.roll = -0.01;
        break;
      case 'twoshot':
        c.tx = focusX(shot.targets) * 0.5;
        c.ty = 0.45;
        c.tz = 8.4;
        break;
      case 'pushin':
        c.tx = focusX(shot.targets) * 0.5;
        c.ty = 0.5;
        c.tz = Math.max(6.8, c.tz - dt * 0.35);
        break;
      case 'reveal':
        c.tx = 0;
        c.ty = Math.max(0, c.ty - dt * 0.4);
        c.tz = Math.max(10, c.tz - dt * 0.4);
        break;
      case 'orbit':
        c.orbit += dt * 0.25;
        c.tx = Math.sin(c.orbit) * 0.9;
        c.ty = 0.4 + Math.cos(c.orbit * 0.7) * 0.15;
        c.tz = 8.6;
        break;
      case 'pan':
        c.pan += dt * 0.12;
        c.tx = Math.sin(c.pan) * 1.2;
        c.ty = 0.2;
        c.tz = 9.5;
        break;
      default:
        c.tx = 0;
        c.ty = 0;
        c.tz = 10;
        c.roll = 0;
    }
    if (this.reduceCamera) {
      c.tx = shot.kind === 'wide' ? 0 : c.tx;
      c.tz = shot.kind === 'wide' ? 10 : Math.max(c.tz, 8.6);
    }
    const speed = this.reduceCamera ? 2.5 : shot.kind === 'pushin' ? 0.9 : 1.6;
    c.x = lerp(c.x, c.tx, dt * speed);
    c.y = lerp(c.y, c.ty, dt * speed);
    c.z = lerp(c.z, c.tz, dt * speed);
    const sway = this.reduceCamera || this.reduceMotion ? 0 : 0.03;
    this.camera.position.set(c.x + Math.sin(t * 0.35) * sway + (Math.random() - 0.5) * c.shake * 0.25, c.y + Math.cos(t * 0.27) * sway + (Math.random() - 0.5) * c.shake * 0.25, c.z);
    this.camera.rotation.z = c.roll;
    this.camera.lookAt(c.x, c.y, 0);
    c.shake = lerp(c.shake, 0, dt * 6);

    // CG
    const cgOp = lerp(this.cgMesh.material.opacity, this.cgTarget, dt * 3);
    this.cgMesh.material.opacity = cgOp;
    if (cgOp < 0.01 && this.cgTarget === 0) this.cgMesh.visible = false;
    this.cgMesh.position.set(this.camera.position.x * 0.9, this.camera.position.y * 0.9, 2.5);

    // fx
    for (const [k, f] of this.fx) {
      f.update(t, dt);
      if (f.dead) {
        this.scene.remove(f.points);
        f.dispose();
        this.fx.delete(k);
      }
    }

    // grade
    this.flash = lerp(this.flash, 0, dt * 3.5);
    this.letterbox = lerp(this.letterbox, this.letterboxTarget, dt * 3);
    this.tint.amt = lerp(this.tint.amt, this.tintTarget, dt * 1.5);
    this.mono = lerp(this.mono, this.monoTarget, dt * 1.5);
    if (this.grade) {
      const u = this.grade.uniforms;
      u.uTime.value = t;
      u.uFlash.value = this.flash;
      u.uTint.value = this.tint.color;
      u.uTintAmt.value = this.tint.amt;
      u.uMono.value = this.mono;
      u.uGrain.value = this.profile.level === 'high' ? 0.05 : 0.03;
      this.composer!.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }
    return dt;
  }

  dispose() {
    this.composer?.dispose();
    this.renderer.dispose();
  }
}
