// Texture loading with procedural fallbacks and a small LRU so phones don't hold
// every background in GPU memory at once.

import * as THREE from 'three';
import assetIndex from '../generated/assets.json';
import { paintBackground, paintCg, paintCharacter } from './placeholder';
import type { CharId } from '../narrative/types';

const available = new Set<string>((assetIndex as { files: string[] }).files);

export function hasAsset(path: string) {
  return available.has(path);
}

export function assetUrl(path: string) {
  return `./${path}`;
}

type Entry = { tex: THREE.Texture; used: number; pending?: Promise<THREE.Texture> };

export class TextureStore {
  private cache = new Map<string, Entry>();
  private loader = new THREE.TextureLoader();
  private clock = 0;
  constructor(
    private renderer: THREE.WebGLRenderer,
    private maxEntries = 24,
  ) {}

  private finish(tex: THREE.Texture, srgb = true) {
    if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = Math.min(4, this.renderer.capabilities.getMaxAnisotropy());
    tex.needsUpdate = true;
    return tex;
  }

  /** Returns a texture immediately (fallback) and upgrades to the real file when loaded. */
  get(key: string, file: string | null, fallback: () => HTMLCanvasElement): THREE.Texture {
    const hit = this.cache.get(key);
    if (hit) {
      hit.used = ++this.clock;
      return hit.tex;
    }
    const tex = this.finish(new THREE.CanvasTexture(fallback()));
    const entry: Entry = { tex, used: ++this.clock };
    this.cache.set(key, entry);
    if (file && hasAsset(file)) {
      entry.pending = this.loader.loadAsync(assetUrl(file)).then((real) => {
        this.finish(real);
        // swap image data into the same texture object so materials keep working
        tex.image = real.image;
        tex.needsUpdate = true;
        (tex.userData as { real?: boolean }).real = true;
        return tex;
      });
      entry.pending.catch(() => undefined);
    }
    this.evict();
    return tex;
  }

  /** Resolves once the real image (if any) is loaded. */
  ready(key: string): Promise<unknown> {
    return this.cache.get(key)?.pending ?? Promise.resolve();
  }

  bg(id: string) {
    return this.get(`bg:${id}`, `assets/bg/${id}.webp`, () => paintBackground(id));
  }

  cg(id: string) {
    return this.get(`cg:${id}`, `assets/cg/${id}.webp`, () => paintCg(id));
  }

  char(id: CharId, expr: string) {
    return this.get(`ch:${id}:${expr}`, `assets/characters/${id}/${expr}.webp`, () => paintCharacter(id, expr));
  }

  preload(keys: { kind: 'bg' | 'cg' | 'char'; id: string; expr?: string }[]) {
    return Promise.all(
      keys.map((k) => {
        if (k.kind === 'bg') this.bg(k.id);
        else if (k.kind === 'cg') this.cg(k.id);
        else this.char(k.id as CharId, k.expr ?? 'neutral');
        const key = k.kind === 'char' ? `ch:${k.id}:${k.expr ?? 'neutral'}` : `${k.kind}:${k.id}`;
        return this.ready(key);
      }),
    );
  }

  private evict() {
    if (this.cache.size <= this.maxEntries) return;
    const entries = [...this.cache.entries()].sort((a, b) => a[1].used - b[1].used);
    const inUse = new Set<THREE.Texture>();
    this.inUse?.(inUse);
    for (const [k, e] of entries) {
      if (this.cache.size <= this.maxEntries) break;
      if (inUse.has(e.tex)) continue;
      e.tex.dispose();
      this.cache.delete(k);
    }
  }

  /** set by the stage: reports textures currently bound to meshes */
  inUse?: (set: Set<THREE.Texture>) => void;
}
