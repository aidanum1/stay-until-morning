// Procedural fallback art. Used before (or instead of) generated assets so the whole
// story is playable at every stage of production. Everything is drawn on canvases.

import { BACKGROUNDS, type BgDef } from '../scenes/manifest';
import { CHARACTERS } from '../characters/characters';
import type { CharId } from '../narrative/types';

type Ctx = CanvasRenderingContext2D;

function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 100000) / 100000;
  };
}

function hash(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return h >>> 0;
}

function canvas(w: number, h: number): [HTMLCanvasElement, Ctx] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')!];
}

function vgrad(g: Ctx, w: number, h: number, stops: [number, string][]) {
  const gr = g.createLinearGradient(0, 0, 0, h);
  for (const [o, c] of stops) gr.addColorStop(o, c);
  g.fillStyle = gr;
  g.fillRect(0, 0, w, h);
}

function glow(g: Ctx, x: number, y: number, r: number, color: string, a = 1) {
  const gr = g.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, color);
  gr.addColorStop(1, 'transparent');
  g.globalAlpha = a;
  g.fillStyle = gr;
  g.fillRect(x - r, y - r, r * 2, r * 2);
  g.globalAlpha = 1;
}

function skyline(g: Ctx, w: number, base: number, color: string, r: () => number, maxH: number, lit = '#ffd89a') {
  let x = -10;
  while (x < w) {
    const bw = 30 + r() * 80;
    const bh = maxH * (0.3 + r() * 0.7);
    g.fillStyle = color;
    g.fillRect(x, base - bh, bw, bh + 2);
    for (let wy = base - bh + 10; wy < base - 8; wy += 14)
      for (let wx = x + 6; wx < x + bw - 6; wx += 12)
        if (r() < 0.18) {
          g.fillStyle = lit;
          g.globalAlpha = 0.35 + r() * 0.5;
          g.fillRect(wx, wy, 5, 7);
          g.globalAlpha = 1;
        }
    x += bw + 2;
  }
}

function stars(g: Ctx, w: number, h: number, r: () => number, n: number) {
  for (let i = 0; i < n; i++) {
    g.globalAlpha = 0.3 + r() * 0.7;
    g.fillStyle = r() < 0.2 ? '#bfe9ff' : '#ffffff';
    const s = r() < 0.05 ? 2.4 : 1.2;
    g.fillRect(r() * w, r() * h, s, s);
  }
  g.globalAlpha = 1;
}

function paintMotif(g: Ctx, w: number, h: number, def: BgDef, id: string) {
  const [c0, c1, c2] = def.palette;
  const r = rng(hash(id));
  vgrad(g, w, h, [
    [0, c0],
    [0.65, c1],
    [1, c0],
  ]);
  switch (def.motif) {
    case 'street': {
      stars(g, w, h * 0.3, r, 40);
      skyline(g, w, h * 0.62, '#0a0d22', r, h * 0.35);
      g.fillStyle = '#141833';
      g.fillRect(w * 0.18, h * 0.22, w * 0.5, h * 0.45);
      for (let fy = 0; fy < 4; fy++)
        for (let fx = 0; fx < 3; fx++) {
          g.fillStyle = fy === 3 && fx === 1 ? c2 : '#1e2446';
          g.fillRect(w * 0.22 + fx * w * 0.15, h * 0.25 + fy * h * 0.1, w * 0.1, h * 0.06);
        }
      glow(g, w * 0.43, h * 0.6, w * 0.35, c2, 0.35);
      g.fillStyle = '#e9e2ff';
      g.font = `bold ${w * 0.05}px sans-serif`;
      g.fillText('STUDIO 2', w * 0.27, h * 0.235);
      g.save();
      g.translate(w * 0.56, h * 0.215);
      g.rotate(0.12);
      g.fillText('5', 0, 0);
      g.restore();
      g.fillStyle = '#ffe9b5';
      g.globalAlpha = 0.8;
      g.fillRect(w * 0.72, h * 0.5, w * 0.22, h * 0.13);
      g.globalAlpha = 1;
      // wet ground reflections
      vgrad(g, w, h, [
        [0, 'transparent'],
        [0.68, 'transparent'],
        [0.69, 'rgba(10,12,30,0.85)'],
        [1, 'rgba(6,8,20,1)'],
      ]);
      for (let i = 0; i < 40; i++) {
        g.fillStyle = r() < 0.5 ? c2 : '#8fa6ff';
        g.globalAlpha = 0.1 + r() * 0.2;
        g.fillRect(r() * w, h * (0.7 + r() * 0.3), 2 + r() * 30, 1.5);
      }
      g.globalAlpha = 1;
      break;
    }
    case 'studio': {
      // archive wall
      const cols = Math.floor(w / 26);
      for (let y = h * 0.12; y < h * 0.55; y += 26)
        for (let i = 0; i < cols; i++) {
          const lit = r();
          g.fillStyle = lit < 0.35 ? c2 : '#2a2852';
          g.globalAlpha = lit < 0.35 ? 0.25 + r() * 0.5 : 0.8;
          g.fillRect(i * 26 + 4, y, 20, 20);
        }
      g.globalAlpha = 1;
      glow(g, w * 0.3, h * 0.3, w * 0.3, c2, 0.25);
      glow(g, w * 0.75, h * 0.35, w * 0.25, '#9ff3ff', 0.18);
      // floor
      vgrad(g, w, h, [
        [0, 'transparent'],
        [0.6, 'transparent'],
        [0.61, 'rgba(20,16,40,0.9)'],
        [1, 'rgba(12,10,26,1)'],
      ]);
      // furniture silhouettes
      g.fillStyle = '#1a1634';
      for (let i = 0; i < w / 400; i++) {
        const x = i * 400 + r() * 200;
        g.beginPath();
        g.roundRect(x, h * 0.62, 220, 70, 16);
        g.fill();
        g.fillRect(x - 10, h * 0.6, 20, 90);
      }
      g.fillStyle = '#231d44';
      g.fillRect(w * 0.05, h * 0.58, 180, 110);
      glow(g, w * 0.08, h * 0.56, 90, '#ffd89a', 0.5);
      break;
    }
    case 'hall': {
      const cx = w / 2;
      g.strokeStyle = 'rgba(160,200,255,0.25)';
      for (let i = 0; i < 12; i++) {
        g.beginPath();
        g.moveTo(cx, h * 0.4);
        g.lineTo((i / 11) * w, h);
        g.stroke();
      }
      for (let i = 0; i < 4; i++) {
        const d = 1 - i * 0.2;
        for (const side of [-1, 1]) {
          const x = cx + side * w * 0.38 * d;
          g.fillStyle = '#1a1c44';
          g.fillRect(x - 30 * d, h * 0.4 - 120 * d + h * 0.2 * d, 60 * d, 160 * d);
          glow(g, x, h * 0.35 + h * 0.2 * d, 70 * d, c2, 0.5);
        }
      }
      glow(g, cx, h * 0.4, w * 0.3, c2, 0.4);
      break;
    }
    case 'archive': {
      glow(g, w / 2, h * 0.42, w * 0.6, c2, 0.45);
      g.strokeStyle = 'rgba(159,243,255,0.35)';
      for (let i = 1; i < 8; i++) {
        g.beginPath();
        g.ellipse(w / 2, h * 0.42, i * w * 0.06, i * w * 0.02, 0, 0, Math.PI * 2);
        g.stroke();
      }
      g.fillStyle = 'rgba(200,250,255,0.8)';
      g.beginPath();
      g.moveTo(w / 2, h * 0.3);
      g.lineTo(w * 0.56, h * 0.42);
      g.lineTo(w / 2, h * 0.54);
      g.lineTo(w * 0.44, h * 0.42);
      g.closePath();
      g.globalAlpha = 0.5;
      g.fill();
      g.globalAlpha = 1;
      break;
    }
    case 'practice': {
      g.fillStyle = 'rgba(255,255,255,0.05)';
      for (let i = 0; i < 5; i++) g.fillRect(w * 0.05 + i * w * 0.19, h * 0.12, w * 0.17, h * 0.5);
      g.strokeStyle = 'rgba(255,255,255,0.12)';
      for (let i = 0; i < 20; i++) {
        g.beginPath();
        g.moveTo(0, h * 0.65 + i * i * 1.6);
        g.lineTo(w, h * 0.65 + i * i * 1.6);
        g.stroke();
      }
      glow(g, w * 0.5, h * 0.2, w * 0.4, '#ffffff', 0.15);
      glow(g, w * 0.8, h * 0.5, w * 0.3, c2, 0.25);
      break;
    }
    case 'rooftop': {
      stars(g, w, h * 0.6, r, 260);
      glow(g, w * 0.7, h * 0.18, w * 0.3, c2, 0.2);
      skyline(g, w, h * 0.72, '#060920', r, h * 0.25, '#ffcf8a');
      g.fillStyle = '#0b0e26';
      g.fillRect(0, h * 0.72, w, h * 0.28);
      g.strokeStyle = 'rgba(200,210,255,0.25)';
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(0, h * 0.76);
      g.lineTo(w, h * 0.76);
      g.stroke();
      for (let x = 0; x < w; x += 40) {
        g.beginPath();
        g.moveTo(x, h * 0.76);
        g.lineTo(x, h * 0.82);
        g.stroke();
      }
      g.lineWidth = 1;
      break;
    }
    case 'ocean': {
      stars(g, w, h * 0.45, r, 180);
      g.fillStyle = '#e8f6ff';
      g.beginPath();
      g.arc(w * 0.68, h * 0.2, w * 0.06, 0, Math.PI * 2);
      g.fill();
      glow(g, w * 0.68, h * 0.2, w * 0.3, '#b8f0ff', 0.35);
      g.fillStyle = '#071a44';
      g.fillRect(0, h * 0.48, w, h * 0.3);
      for (let i = 0; i < 70; i++) {
        g.fillStyle = '#b8f0ff';
        g.globalAlpha = 0.15 + r() * 0.35;
        const y = h * (0.48 + r() * 0.3);
        g.fillRect(w * 0.5 + (r() - 0.5) * w * (y / h), y, 10 + r() * 60, 1.5);
      }
      g.globalAlpha = 1;
      vgrad(g, w, h, [
        [0, 'transparent'],
        [0.77, 'transparent'],
        [0.78, '#1a2440'],
        [1, '#0e1428'],
      ]);
      break;
    }
    case 'subway': {
      g.fillStyle = '#16122a';
      g.fillRect(0, 0, w, h);
      for (let i = 0; i < 3; i++) {
        const x = w * 0.08 + i * w * 0.31;
        g.fillStyle = '#05040c';
        g.beginPath();
        g.roundRect(x, h * 0.2, w * 0.26, h * 0.3, 20);
        g.fill();
        for (let k = 0; k < 6; k++) {
          g.fillStyle = r() < 0.5 ? c2 : '#ffd6a0';
          g.globalAlpha = 0.25;
          g.fillRect(x + 8, h * 0.22 + r() * h * 0.26, w * 0.24, 2);
        }
        g.globalAlpha = 1;
      }
      g.fillStyle = '#2a2040';
      g.fillRect(0, h * 0.55, w, h * 0.08);
      g.fillStyle = '#c0b8d8';
      for (let i = 0; i < 4; i++) g.fillRect(w * 0.12 + i * w * 0.26, 0, 6, h * 0.8);
      glow(g, w * 0.5, 0, w * 0.6, c2, 0.25);
      vgrad(g, w, h, [
        [0, 'transparent'],
        [0.75, 'transparent'],
        [0.76, '#221a36'],
        [1, '#120e20'],
      ]);
      break;
    }
    case 'airport': {
      g.fillStyle = '#0a0e26';
      g.fillRect(0, h * 0.1, w, h * 0.45);
      for (let i = 0; i < 6; i++) {
        g.strokeStyle = 'rgba(180,200,255,0.2)';
        g.strokeRect(i * (w / 6), h * 0.1, w / 6, h * 0.45);
      }
      stars(g, w, h * 0.3, r, 50);
      g.fillStyle = '#10131e';
      g.fillRect(w * 0.1, h * 0.18, w * 0.8, h * 0.2);
      for (let row = 0; row < 7; row++)
        for (let col = 0; col < 10; col++) {
          g.fillStyle = c2;
          g.globalAlpha = 0.3 + r() * 0.6;
          g.fillRect(w * 0.12 + col * w * 0.075, h * 0.2 + row * h * 0.024, w * 0.06, h * 0.014);
        }
      g.globalAlpha = 1;
      glow(g, w * 0.5, h * 0.28, w * 0.5, c2, 0.15);
      for (let i = 0; i < 5; i++) {
        g.fillStyle = '#1c2140';
        g.fillRect(i * w * 0.22, h * 0.66, w * 0.18, h * 0.05);
      }
      break;
    }
    case 'home':
    case 'cafe': {
      glow(g, w * 0.7, h * 0.25, w * 0.7, c2, 0.6);
      g.fillStyle = 'rgba(255,240,210,0.5)';
      g.fillRect(w * 0.45, h * 0.1, w * 0.45, h * 0.35);
      g.strokeStyle = 'rgba(90,60,30,0.6)';
      g.lineWidth = 6;
      g.strokeRect(w * 0.45, h * 0.1, w * 0.45, h * 0.35);
      g.beginPath();
      g.moveTo(w * 0.675, h * 0.1);
      g.lineTo(w * 0.675, h * 0.45);
      g.stroke();
      g.lineWidth = 1;
      g.fillStyle = 'rgba(80,50,30,0.6)';
      g.fillRect(0, h * 0.6, w, h * 0.06);
      for (let i = 0; i < 30; i++) glow(g, r() * w, r() * h, 20 + r() * 40, '#fff4d8', 0.08);
      break;
    }
    case 'cinema': {
      g.fillStyle = '#e6d8ff';
      g.globalAlpha = 0.8;
      g.fillRect(w * 0.1, h * 0.12, w * 0.8, h * 0.28);
      g.globalAlpha = 1;
      glow(g, w * 0.5, h * 0.26, w * 0.6, c2, 0.4);
      const beam = g.createLinearGradient(w * 0.5, h * 0.9, w * 0.5, h * 0.2);
      beam.addColorStop(0, 'rgba(230,210,255,0.35)');
      beam.addColorStop(1, 'rgba(230,210,255,0)');
      g.fillStyle = beam;
      g.beginPath();
      g.moveTo(w * 0.48, h);
      g.lineTo(w * 0.1, h * 0.12);
      g.lineTo(w * 0.9, h * 0.12);
      g.lineTo(w * 0.52, h);
      g.fill();
      for (let row = 0; row < 7; row++) {
        g.fillStyle = `rgba(20,8,34,${0.7 + row * 0.04})`;
        for (let s = 0; s < 9 + row; s++) {
          const sw = w / (9 + row);
          g.beginPath();
          g.roundRect(s * sw + 2, h * (0.5 + row * 0.07), sw - 4, h * 0.08, 10);
          g.fill();
        }
      }
      break;
    }
    case 'lineart':
    case 'color': {
      g.fillStyle = def.motif === 'lineart' ? '#f4f3ef' : '#f7f2e8';
      g.fillRect(0, 0, w, h);
      if (def.motif === 'color') {
        for (let i = 0; i < 12; i++) glow(g, r() * w, r() * h, 80 + r() * 160, ['#8fd8cf', '#f6c27a', '#f3a0a8', '#9fb7ff'][i % 4], 0.35);
      }
      g.strokeStyle = '#3a4146';
      g.lineWidth = 2;
      const line = (x1: number, y1: number, x2: number, y2: number) => {
        g.beginPath();
        g.moveTo(x1 + (r() - 0.5) * 3, y1 + (r() - 0.5) * 3);
        g.lineTo(x2 + (r() - 0.5) * 3, y2 + (r() - 0.5) * 3);
        g.stroke();
      };
      line(w * 0.1, h * 0.1, w * 0.1, h * 0.62);
      line(w * 0.1, h * 0.62, w * 0.9, h * 0.62);
      line(w * 0.55, h * 0.12, w * 0.9, h * 0.12);
      line(w * 0.55, h * 0.12, w * 0.55, h * 0.45);
      line(w * 0.55, h * 0.45, w * 0.9, h * 0.45);
      line(w * 0.2, h * 0.5, w * 0.45, h * 0.5);
      line(w * 0.2, h * 0.5, w * 0.2, h * 0.62);
      line(w * 0.45, h * 0.5, w * 0.45, h * 0.62);
      for (let i = 0; i < 40; i++) {
        const x = w * 0.55 + r() * w * 0.35;
        const y = h * 0.12 + r() * h * 0.33;
        line(x, y, x + 8, y + 12);
      }
      break;
    }
    case 'arcade': {
      for (let i = 0; i < 6; i++) {
        const x = i * w * 0.17;
        const col = ['#58f5ff', '#ff5fd2', '#c38bff', '#ffe066'][i % 4];
        g.fillStyle = '#120a2a';
        g.fillRect(x + 6, h * 0.25, w * 0.15, h * 0.4);
        g.fillStyle = col;
        g.globalAlpha = 0.7;
        g.fillRect(x + 12, h * 0.3, w * 0.12, h * 0.1);
        g.globalAlpha = 1;
        glow(g, x + w * 0.08, h * 0.35, w * 0.15, col, 0.35);
      }
      g.strokeStyle = 'rgba(88,245,255,0.25)';
      for (let i = 0; i < 16; i++) {
        g.beginPath();
        g.moveTo(w / 2, h * 0.66);
        g.lineTo((i / 15) * w * 2 - w / 2, h);
        g.stroke();
      }
      break;
    }
    case 'booth': {
      g.fillStyle = '#2a2240';
      for (let i = 0; i < 14; i++) {
        g.fillStyle = i % 2 ? '#3a2e58' : '#2e2448';
        g.fillRect((i * w) / 14, 0, w / 14 + 1, h);
      }
      glow(g, w * 0.5, h * 0.3, w * 0.6, '#fff0f6', 0.45);
      g.fillStyle = 'rgba(255,255,255,0.1)';
      g.fillRect(w * 0.25, h * 0.15, w * 0.5, h * 0.3);
      break;
    }
    case 'patchwork': {
      const pals = ['#2a4a8a', '#8a4a2a', '#2a6a5a', '#6a2a6a', '#8a7a2a', '#2a2a5a'];
      for (let y = 0; y < 5; y++)
        for (let x = 0; x < 3; x++) {
          g.fillStyle = pals[(x + y * 3) % pals.length];
          g.globalAlpha = 0.5;
          g.fillRect(x * (w / 3) + 6, y * (h / 5) + 6, w / 3 - 12, h / 5 - 12);
          glow(g, x * (w / 3) + w / 6, y * (h / 5) + h / 10, 90, c2, 0.3);
        }
      g.globalAlpha = 1;
      break;
    }
    case 'dawn':
    case 'river': {
      vgrad(g, w, h, [
        [0, c0],
        [0.45, c1],
        [0.6, c2],
        [1, '#4a3a5a'],
      ]);
      glow(g, w * 0.5, h * 0.52, w * 0.5, '#fff2c8', 0.8);
      g.fillStyle = '#fff6e0';
      g.beginPath();
      g.arc(w * 0.5, h * 0.55, w * 0.07, Math.PI, 0);
      g.fill();
      skyline(g, w, h * 0.58, 'rgba(60,40,70,0.85)', r, h * 0.18, '#ffe0a0');
      if (def.motif === 'river') {
        g.fillStyle = 'rgba(255,220,180,0.35)';
        for (let i = 0; i < 50; i++) g.fillRect(w * 0.5 - r() * w * 0.3, h * (0.6 + r() * 0.35), 20 + r() * 60, 2);
      }
      break;
    }
    default:
      glow(g, w * 0.5, h * 0.4, w * 0.5, c2, 0.2);
  }
  // soft vignette
  const vg = g.createRadialGradient(w / 2, h / 2, h * 0.2, w / 2, h / 2, h * 0.75);
  vg.addColorStop(0, 'transparent');
  vg.addColorStop(1, 'rgba(0,0,0,0.45)');
  g.fillStyle = vg;
  g.fillRect(0, 0, w, h);
}

export function paintBackground(id: string): HTMLCanvasElement {
  const def = BACKGROUNDS[id] ?? BACKGROUNDS.black;
  const wide = !!def.wide;
  const [c, g] = canvas(wide ? 2276 : 720, 1280);
  if (id === 'black') {
    g.fillStyle = '#000';
    g.fillRect(0, 0, c.width, c.height);
    return c;
  }
  paintMotif(g, c.width, c.height, def, id);
  return c;
}

const CG_BG: Record<string, string> = {
  cg_arrival: 'studio_ext_night',
  cg_echo: 'studio_archive',
  cg_photo: 'studio_lobby',
  cg_ninth: 'mem_patchwork',
  cg_true_breakfast: 'dawn_cafe',
  cg_friendship: 'dawn_rooftop',
  cg_hamin_moment: 'mem_beach',
  cg_hamin_ending: 'dawn_cafe',
  cg_hyunjun_moment: 'mem_subway',
  cg_hyunjun_ending: 'dawn_subway',
  cg_charlie_moment: 'mem_home',
  cg_charlie_ending: 'dawn_river',
  cg_haruta_moment: 'mem_cinema',
  cg_haruta_ending: 'dawn_street',
  cg_justin_moment: 'mem_practice',
  cg_justin_ending: 'studio_practice',
  cg_songha_moment: 'mem_rooftop_stars',
  cg_songha_ending: 'dawn_rooftop',
  cg_hanbi_moment: 'mem_color',
  cg_hanbi_ending: 'studio_lounge',
  cg_daniel_moment: 'mem_arcade',
  cg_daniel_ending: 'dawn_street',
};

export function paintCg(id: string): HTMLCanvasElement {
  const bg = CG_BG[id] ?? 'studio_lobby';
  const def = BACKGROUNDS[bg];
  const [c, g] = canvas(720, 1280);
  paintMotif(g, 720, 1280, def, id);
  const member = id.split('_')[1] as CharId;
  const ch = CHARACTERS[member];
  if (ch) {
    const fig = paintCharacter(member, id.endsWith('ending') ? 'smile' : 'thinking');
    g.globalAlpha = 0.95;
    g.drawImage(fig, 90, 260, 540, 960);
    g.globalAlpha = 1;
    // the protagonist: a soft silhouette of light
    glow(g, 590, 820, 200, '#e8f4ff', 0.35);
  } else {
    const ids = Object.keys(CHARACTERS) as CharId[];
    ids.forEach((m, i) => {
      const fig = paintCharacter(m, 'smile');
      const x = 20 + (i % 4) * 170;
      const y = 380 + Math.floor(i / 4) * 330;
      g.drawImage(fig, x, y, 180, 320);
    });
  }
  return c;
}

/** Stylised stand-in character: bust + face with a simple expression. */
export function paintCharacter(id: CharId, expr: string): HTMLCanvasElement {
  const ch = CHARACTERS[id];
  const W = 576;
  const H = 1024;
  const [c, g] = canvas(W, H);
  const cx = W / 2;
  const headY = 300;
  // torso / outfit
  g.fillStyle = ch.outfit;
  g.beginPath();
  g.moveTo(cx - 230, H);
  g.bezierCurveTo(cx - 240, 620, cx - 170, 520, cx - 70, 505);
  g.lineTo(cx + 70, 505);
  g.bezierCurveTo(cx + 170, 520, cx + 240, 620, cx + 230, H);
  g.closePath();
  g.fill();
  g.fillStyle = ch.outfit2;
  g.beginPath();
  g.moveTo(cx - 60, 505);
  g.lineTo(cx, 640);
  g.lineTo(cx + 60, 505);
  g.closePath();
  g.fill();
  // neck
  g.fillStyle = ch.skin;
  g.fillRect(cx - 38, 400, 76, 120);
  g.fillStyle = 'rgba(0,0,0,0.12)';
  g.fillRect(cx - 38, 470, 76, 40);
  // head
  g.fillStyle = ch.skin;
  g.beginPath();
  g.ellipse(cx, headY, 118, 150, 0, 0, Math.PI * 2);
  g.fill();
  // hair
  g.fillStyle = ch.hair;
  const hs = ch.hairStyle;
  g.beginPath();
  g.ellipse(cx, headY - 60, 138, 120, 0, Math.PI, 0);
  g.fill();
  const fringe = (dx: number, len: number, w: number) => {
    g.beginPath();
    g.ellipse(cx + dx, headY - 70 + len / 2, w, len, dx * 0.004, 0, Math.PI * 2);
    g.fill();
  };
  if (hs === 'side') {
    fringe(-40, 70, 90);
    fringe(50, 50, 70);
  } else if (hs === 'fluffy' || hs === 'tousled') {
    for (let i = -3; i <= 3; i++) fringe(i * 38, 55 + (i % 2) * 15, 42);
  } else if (hs === 'wavy') {
    for (let i = -3; i <= 3; i++) fringe(i * 36, 60 + Math.abs(i) * 6, 40);
  } else if (hs === 'neat') {
    fringe(-20, 55, 120);
  } else if (hs === 'long') {
    fringe(-30, 75, 100);
    g.fillRect(cx - 140, headY - 60, 40, 200);
    g.fillRect(cx + 100, headY - 60, 40, 200);
  } else if (hs === 'thick') {
    g.beginPath();
    g.ellipse(cx, headY - 80, 160, 120, 0, Math.PI, 0);
    g.fill();
    fringe(0, 70, 130);
  } else {
    fringe(0, 65, 115);
  }
  g.fillStyle = ch.hairShine;
  g.globalAlpha = 0.45;
  g.beginPath();
  g.ellipse(cx - 40, headY - 130, 60, 16, -0.3, 0, Math.PI * 2);
  g.fill();
  g.globalAlpha = 1;
  // face
  const eyeY = headY + 20;
  g.fillStyle = '#2a2230';
  const eye = (x: number) => {
    if (expr === 'laugh') {
      g.strokeStyle = '#2a2230';
      g.lineWidth = 6;
      g.beginPath();
      g.arc(x, eyeY + 6, 18, Math.PI * 1.1, Math.PI * 1.9);
      g.stroke();
      return;
    }
    const hgt = expr === 'surprised' ? 24 : expr === 'sad' ? 13 : 19;
    g.beginPath();
    g.ellipse(x, eyeY, 15, hgt, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.arc(x - 5, eyeY - 7, 5, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#2a2230';
  };
  eye(cx - 48);
  eye(cx + 48);
  g.strokeStyle = ch.hair;
  g.lineWidth = 6;
  const browTilt = expr === 'sad' ? -8 : expr === 'surprised' ? 10 : expr === 'thinking' ? 4 : 0;
  g.beginPath();
  g.moveTo(cx - 75, eyeY - 40 + browTilt);
  g.lineTo(cx - 25, eyeY - 44);
  g.moveTo(cx + 25, eyeY - 44 + (expr === 'thinking' ? 8 : 0));
  g.lineTo(cx + 75, eyeY - 40 + browTilt);
  g.stroke();
  g.strokeStyle = '#9a4a4a';
  g.lineWidth = 5;
  g.beginPath();
  const my = headY + 90;
  if (expr === 'smile' || expr === 'shy') g.arc(cx, my - 14, 26, 0.2 * Math.PI, 0.8 * Math.PI);
  else if (expr === 'laugh') {
    g.fillStyle = '#7a2a3a';
    g.arc(cx, my - 10, 30, 0, Math.PI);
    g.fill();
  } else if (expr === 'surprised') g.ellipse(cx, my, 12, 16, 0, 0, Math.PI * 2);
  else if (expr === 'sad') g.arc(cx, my + 16, 22, 1.2 * Math.PI, 1.8 * Math.PI);
  else {
    g.moveTo(cx - 18, my);
    g.lineTo(cx + 18, my);
  }
  g.stroke();
  if (expr === 'shy') {
    g.fillStyle = 'rgba(255,120,140,0.35)';
    g.beginPath();
    g.ellipse(cx - 70, eyeY + 45, 28, 14, 0, 0, Math.PI * 2);
    g.ellipse(cx + 70, eyeY + 45, 28, 14, 0, 0, Math.PI * 2);
    g.fill();
  }
  // accent badge
  g.fillStyle = ch.color;
  g.globalAlpha = 0.9;
  g.beginPath();
  g.arc(cx + 150, 700, 34, 0, Math.PI * 2);
  g.fill();
  g.globalAlpha = 1;
  g.font = '40px serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(ch.symbol, cx + 150, 702);
  // bottom fade (sprites are knee-up)
  const fade = g.createLinearGradient(0, H * 0.82, 0, H);
  fade.addColorStop(0, 'rgba(0,0,0,0)');
  fade.addColorStop(1, 'rgba(0,0,0,1)');
  g.globalCompositeOperation = 'destination-out';
  g.fillStyle = fade;
  g.fillRect(0, H * 0.82, W, H * 0.18);
  g.globalCompositeOperation = 'source-over';
  return c;
}
