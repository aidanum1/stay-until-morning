// Device quality profiles. Story content is identical on every profile; only
// rendering cost changes (pixel ratio, post-processing, particles).

export type QualityLevel = 'high' | 'medium' | 'low';

export interface QualityProfile {
  level: QualityLevel;
  pixelRatio: number;
  bloom: boolean;
  post: boolean;
  particleScale: number;
  maxTexture: number;
  antialias: boolean;
}

export function detectQuality(): QualityLevel {
  const ua = navigator.userAgent;
  const mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(ua) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(ua));
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;
  const cores = navigator.hardwareConcurrency ?? 4;
  if (!mobile && cores >= 4) return 'high';
  if (mem <= 2 || cores <= 4) return 'low';
  return 'medium';
}

export function profileFor(level: QualityLevel): QualityProfile {
  const dpr = window.devicePixelRatio || 1;
  switch (level) {
    case 'high':
      return { level, pixelRatio: Math.min(dpr, 2), bloom: true, post: true, particleScale: 1, maxTexture: 2048, antialias: true };
    case 'medium':
      return { level, pixelRatio: Math.min(dpr, 1.5), bloom: true, post: true, particleScale: 0.6, maxTexture: 2048, antialias: false };
    case 'low':
      return { level, pixelRatio: Math.min(dpr, 1), bloom: false, post: false, particleScale: 0.3, maxTexture: 1024, antialias: false };
  }
}

/** Adaptive guard: if frame time stays bad, step the profile down once. */
export class FrameMonitor {
  private samples: number[] = [];
  private cooldown = 5;
  constructor(private onDegrade: () => void) {}
  tick(dt: number) {
    if (this.cooldown > 0) {
      this.cooldown -= dt;
      return;
    }
    this.samples.push(dt);
    if (this.samples.length >= 120) {
      const avg = this.samples.reduce((a, b) => a + b, 0) / this.samples.length;
      this.samples = [];
      if (avg > 1 / 26) {
        this.cooldown = 8;
        this.onDegrade();
      }
    }
  }
}
