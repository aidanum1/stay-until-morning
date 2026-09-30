// Audio: procedural music (Web Audio synthesis, one motif per track), ambience beds
// and small synthesised SFX. Zero licensed material; everything is generated at
// runtime, so the build has no audio files to download. If a real file exists in
// public/assets/audio/{music|amb}/<id>.mp3 it is streamed instead.

import { hasAsset, assetUrl } from '../rendering/assets';

type Ctx = AudioContext;

interface TrackDef {
  bpm: number;
  root: number; // midi
  scale: number[]; // semitone steps
  /** chord progression as scale degrees (0-based) */
  chords: number[][];
  /** melody pattern: [degree, beats] pairs; -1 = rest */
  melody: [number, number][];
  lead: 'piano' | 'synth' | 'bell' | 'pad' | 'pluck';
  padLevel: number;
  bassLevel: number;
  arp?: boolean;
  swing?: number;
  /** soft percussion */
  perc?: boolean;
}

const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const MINOR = [0, 2, 3, 5, 7, 8, 10];
const DORIAN = [0, 2, 3, 5, 7, 9, 10];
const LYDIAN = [0, 2, 4, 6, 7, 9, 11];
const PENTA = [0, 2, 4, 7, 9];

export const TRACKS: Record<string, TrackDef> = {
  title_night: { bpm: 62, root: 57, scale: MINOR, chords: [[0, 2, 4], [5, 0, 2], [3, 5, 0], [4, 6, 1]], melody: [[4, 2], [2, 1], [3, 1], [0, 3], [-1, 1], [5, 2], [4, 1], [2, 1], [1, 4]], lead: 'piano', padLevel: 0.25, bassLevel: 0.12 },
  title_morning: { bpm: 74, root: 60, scale: MAJOR, chords: [[0, 2, 4], [3, 5, 0], [5, 0, 2], [4, 6, 1]], melody: [[2, 1], [4, 1], [5, 2], [4, 1], [2, 1], [1, 2], [0, 1], [2, 1], [4, 4]], lead: 'bell', padLevel: 0.22, bassLevel: 0.12, perc: true },
  studio: { bpm: 84, root: 62, scale: DORIAN, chords: [[0, 2, 4], [3, 5, 0], [0, 2, 4], [6, 1, 3]], melody: [[0, 1], [2, 1], [4, 1], [3, 1], [2, 2], [-1, 2], [4, 1], [5, 1], [4, 2], [2, 2]], lead: 'pluck', padLevel: 0.18, bassLevel: 0.14, arp: true },
  echo: { bpm: 56, root: 64, scale: LYDIAN, chords: [[0, 2, 4], [1, 3, 5], [4, 6, 1], [0, 2, 4]], melody: [[4, 3], [6, 1], [4, 4], [-1, 2], [3, 2], [2, 4]], lead: 'bell', padLevel: 0.3, bassLevel: 0.06 },
  memory: { bpm: 66, root: 59, scale: MAJOR, chords: [[0, 2, 4], [5, 0, 2], [3, 5, 0], [4, 6, 1]], melody: [[2, 2], [4, 1], [3, 1], [2, 2], [0, 2], [-1, 1], [4, 1], [5, 2], [4, 4]], lead: 'piano', padLevel: 0.28, bassLevel: 0.1 },
  fun: { bpm: 112, root: 65, scale: MAJOR, chords: [[0, 2, 4], [3, 5, 0], [4, 6, 1], [0, 2, 4]], melody: [[0, 0.5], [2, 0.5], [4, 1], [2, 0.5], [4, 0.5], [5, 1], [4, 1], [2, 1], [0, 2]], lead: 'pluck', padLevel: 0.12, bassLevel: 0.18, arp: true, perc: true },
  quiet: { bpm: 52, root: 55, scale: MINOR, chords: [[0, 2, 4], [0, 2, 4], [3, 5, 0], [4, 6, 1]], melody: [[-1, 4], [4, 2], [3, 2], [2, 4], [-1, 4]], lead: 'pad', padLevel: 0.32, bassLevel: 0.05 },
  tension: { bpm: 70, root: 52, scale: MINOR, chords: [[0, 2, 4], [1, 3, 5], [0, 2, 4], [6, 1, 3]], melody: [[0, 1], [1, 1], [0, 2], [-1, 2], [2, 1], [1, 1], [0, 4]], lead: 'synth', padLevel: 0.22, bassLevel: 0.16 },
  dawn: { bpm: 68, root: 62, scale: MAJOR, chords: [[3, 5, 0], [4, 6, 1], [0, 2, 4], [0, 2, 4]], melody: [[4, 2], [5, 1], [6, 1], [7, 4], [-1, 2], [6, 1], [5, 1], [4, 4]], lead: 'piano', padLevel: 0.3, bassLevel: 0.12 },
  credits: { bpm: 96, root: 60, scale: MAJOR, chords: [[0, 2, 4], [4, 6, 1], [5, 0, 2], [3, 5, 0]], melody: [[0, 1], [2, 1], [4, 2], [7, 2], [6, 1], [4, 1], [5, 2], [4, 2], [2, 2]], lead: 'bell', padLevel: 0.2, bassLevel: 0.16, perc: true, arp: true },
  hamin: { bpm: 60, root: 57, scale: MAJOR, chords: [[0, 2, 4], [3, 5, 0], [5, 0, 2], [4, 6, 1]], melody: [[4, 3], [3, 1], [2, 2], [4, 2], [5, 3], [4, 1], [2, 4]], lead: 'piano', padLevel: 0.3, bassLevel: 0.1 },
  hyunjun: { bpm: 100, root: 63, scale: MAJOR, chords: [[0, 2, 4], [5, 0, 2], [3, 5, 0], [4, 6, 1]], melody: [[0, 0.5], [2, 0.5], [4, 1], [5, 1], [4, 1], [2, 1], [4, 0.5], [5, 0.5], [7, 2], [-1, 1]], lead: 'synth', padLevel: 0.2, bassLevel: 0.18, arp: true, perc: true },
  charlie: { bpm: 90, root: 65, scale: MAJOR, chords: [[0, 2, 4], [3, 5, 0], [0, 2, 4], [4, 6, 1]], melody: [[2, 1], [4, 1], [5, 1], [4, 1], [2, 2], [0, 2], [2, 1], [4, 1], [7, 4]], lead: 'pluck', padLevel: 0.24, bassLevel: 0.14, perc: true },
  haruta: { bpm: 72, root: 58, scale: DORIAN, chords: [[0, 2, 4], [2, 4, 6], [3, 5, 0], [4, 6, 1]], melody: [[4, 2], [2, 1], [3, 1], [4, 2], [-1, 2], [6, 1], [5, 1], [4, 4]], lead: 'bell', padLevel: 0.28, bassLevel: 0.1, swing: 0.15 },
  justin: { bpm: 108, root: 55, scale: PENTA, chords: [[0, 2, 4], [0, 2, 4], [3, 5, 0], [4, 6, 1]], melody: [[0, 0.5], [2, 0.5], [3, 0.5], [2, 0.5], [0, 1], [-1, 1], [4, 0.5], [3, 0.5], [2, 1], [0, 2]], lead: 'synth', padLevel: 0.12, bassLevel: 0.2, perc: true, arp: true },
  songha: { bpm: 64, root: 57, scale: LYDIAN, chords: [[0, 2, 4], [1, 3, 5], [4, 6, 1], [0, 2, 4]], melody: [[4, 2], [6, 2], [7, 3], [-1, 1], [6, 1], [4, 1], [2, 4]], lead: 'piano', padLevel: 0.3, bassLevel: 0.1 },
  hanbi: { bpm: 58, root: 60, scale: MAJOR, chords: [[0, 2, 4], [5, 0, 2], [3, 5, 0], [0, 2, 4]], melody: [[-1, 2], [2, 2], [4, 2], [3, 2], [2, 4], [0, 4]], lead: 'piano', padLevel: 0.34, bassLevel: 0.08 },
  daniel: { bpm: 118, root: 62, scale: MAJOR, chords: [[0, 2, 4], [4, 6, 1], [5, 0, 2], [3, 5, 0]], melody: [[4, 0.5], [4, 0.5], [5, 0.5], [7, 0.5], [4, 1], [2, 1], [0, 0.5], [2, 0.5], [4, 2]], lead: 'pluck', padLevel: 0.16, bassLevel: 0.2, arp: true, perc: true },
};

function midiHz(m: number) {
  return 440 * Math.pow(2, (m - 69) / 12);
}

/** Small polyphonic synth voice factory. */
function voice(ctx: Ctx, out: AudioNode, kind: TrackDef['lead'], hz: number, t0: number, dur: number, vel: number) {
  const g = ctx.createGain();
  g.connect(out);
  const osc = ctx.createOscillator();
  let osc2: OscillatorNode | null = null;
  const a = kind === 'pad' ? 0.6 : kind === 'piano' ? 0.005 : kind === 'bell' ? 0.003 : 0.01;
  const d = kind === 'pad' ? dur : kind === 'bell' ? dur * 1.6 : kind === 'pluck' ? 0.35 : dur;
  switch (kind) {
    case 'piano':
      osc.type = 'triangle';
      osc2 = ctx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.value = hz * 2;
      break;
    case 'bell':
      osc.type = 'sine';
      osc2 = ctx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.value = hz * 2.76;
      break;
    case 'synth':
      osc.type = 'sawtooth';
      break;
    case 'pluck':
      osc.type = 'square';
      break;
    case 'pad':
      osc.type = 'sine';
      osc2 = ctx.createOscillator();
      osc2.type = 'triangle';
      osc2.frequency.value = hz * 1.005;
      break;
  }
  osc.frequency.value = hz;
  const filt = ctx.createBiquadFilter();
  filt.type = 'lowpass';
  filt.frequency.value = kind === 'synth' ? 1600 : kind === 'pluck' ? 2400 : 4000;
  osc.connect(filt);
  if (osc2) {
    const g2 = ctx.createGain();
    g2.gain.value = kind === 'bell' ? 0.25 : 0.35;
    osc2.connect(g2).connect(filt);
    osc2.start(t0);
    osc2.stop(t0 + d + 0.1);
  }
  filt.connect(g);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vel, t0 + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
  osc.start(t0);
  osc.stop(t0 + d + 0.1);
}

class Sequencer {
  private timer = 0;
  private nextBar = 0;
  private bar = 0;
  private melodyPos = 0;
  private melodyTime = 0;
  stopped = false;
  constructor(
    private ctx: Ctx,
    private out: GainNode,
    private def: TrackDef,
  ) {
    this.nextBar = ctx.currentTime + 0.05;
    this.melodyTime = this.nextBar;
    this.schedule();
  }
  private note(deg: number, oct = 0) {
    const s = this.def.scale;
    const o = Math.floor(deg / s.length) + oct;
    const idx = ((deg % s.length) + s.length) % s.length;
    return this.def.root + s[idx] + o * 12;
  }
  private schedule = () => {
    if (this.stopped) return;
    const { ctx, def } = this;
    const beat = 60 / def.bpm;
    const barLen = beat * 4;
    while (this.nextBar < ctx.currentTime + 1.2) {
      const t0 = this.nextBar;
      const chord = def.chords[this.bar % def.chords.length];
      // pad
      chord.forEach((deg, i) => voice(ctx, this.out, 'pad', midiHz(this.note(deg, -1)), t0, barLen * 1.05, def.padLevel * (i === 0 ? 1 : 0.7)));
      // bass
      voice(ctx, this.out, 'synth', midiHz(this.note(chord[0], -2)), t0, beat * 1.8, def.bassLevel);
      if (def.arp) {
        for (let k = 0; k < 8; k++) {
          const deg = chord[k % chord.length];
          voice(ctx, this.out, 'pluck', midiHz(this.note(deg, k >= 4 ? 1 : 0)), t0 + k * beat * 0.5, beat * 0.45, 0.07);
        }
      }
      if (def.perc) {
        for (let k = 0; k < 4; k++) {
          const t = t0 + k * beat;
          const n = ctx.createBufferSource();
          const buf = ctx.createBuffer(1, ctx.sampleRate * 0.05, ctx.sampleRate);
          const data = buf.getChannelData(0);
          for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 3);
          n.buffer = buf;
          const g = ctx.createGain();
          g.gain.value = k % 2 ? 0.06 : 0.03;
          const f = ctx.createBiquadFilter();
          f.type = 'highpass';
          f.frequency.value = 5000;
          n.connect(f).connect(g).connect(this.out);
          n.start(t);
        }
      }
      // melody: advance through the pattern within this bar
      let tm = this.melodyTime;
      while (tm < t0 + barLen) {
        const [deg, beats] = def.melody[this.melodyPos % def.melody.length];
        const dur = beats * beat;
        const swing = def.swing ? (this.melodyPos % 2 ? def.swing * beat : 0) : 0;
        if (deg >= 0) voice(ctx, this.out, def.lead, midiHz(this.note(deg, 1)), tm + swing, dur * 0.95, def.lead === 'pad' ? 0.15 : 0.16);
        tm += dur;
        this.melodyPos++;
      }
      this.melodyTime = tm;
      this.nextBar += barLen;
      this.bar++;
    }
    this.timer = window.setTimeout(this.schedule, 400);
  };
  stop() {
    this.stopped = true;
    clearTimeout(this.timer);
  }
}

// ------------------------------------------------------------ ambience

function noiseBuffer(ctx: Ctx, seconds = 2) {
  const buf = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
  const d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < d.length; i++) {
    const w = Math.random() * 2 - 1;
    last = (last + 0.02 * w) / 1.02; // brown-ish
    d[i] = (last * 3.5 + w * 0.25) * 0.5;
  }
  return buf;
}

/**
 * Rain is not filtered hiss: it is thousands of separate drops. Build a stereo loop out of short
 * decaying ticks (near drops), a softer dense bed (far drops) and a little low roof rumble.
 */
function rainBuffer(ctx: Ctx, seconds = 7) {
  const sr = ctx.sampleRate;
  const n = Math.floor(sr * seconds);
  const buf = ctx.createBuffer(2, n, sr);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    // far bed: white noise through a one-pole high-pass and low-pass (roughly 700 Hz – 7 kHz), steady
    let lp = 0;
    let hp = 0;
    let rum = 0;
    for (let i = 0; i < n; i++) {
      const w = Math.random() * 2 - 1;
      lp += 0.55 * (w - lp);
      hp += 0.09 * (lp - hp);
      rum += 0.004 * (w - rum);
      d[i] = (lp - hp) * 0.2 + rum * 1.4;
    }
    // near drops: each is a 2–9 ms burst with its own brightness, loudness and a fast decay
    const drops = Math.floor(seconds * 230);
    for (let k = 0; k < drops; k++) {
      const at = Math.floor(Math.random() * (n - 800));
      const len = Math.floor(sr * (0.002 + Math.random() * 0.007));
      const amp = Math.pow(Math.random(), 3) * 0.55 + 0.03;
      const bright = 0.25 + Math.random() * 0.7;
      let y = 0;
      for (let i = 0; i < len; i++) {
        y += bright * (Math.random() * 2 - 1 - y);
        d[at + i] += y * amp * Math.exp((-5 * i) / len);
      }
    }
    // a few heavier drips off a ledge: short pitched plops
    const drips = Math.floor(seconds * 2.2);
    for (let k = 0; k < drips; k++) {
      const at = Math.floor(Math.random() * (n - 4000));
      const f = 900 + Math.random() * 1600;
      const len = Math.floor(sr * 0.035);
      const amp = 0.05 + Math.random() * 0.07;
      for (let i = 0; i < len; i++) {
        const t = i / sr;
        d[at + i] += Math.sin(2 * Math.PI * f * (1 + 6 * t) * t) * amp * Math.exp(-t * 90);
      }
    }
    // make the loop seamless: crossfade the last 0.25 s into the first
    const x = Math.floor(sr * 0.25);
    for (let i = 0; i < x; i++) {
      const k = i / x;
      d[i] = d[i] * k + d[n - x + i] * (1 - k);
    }
  }
  return buf;
}

class Ambience {
  nodes: AudioNode[] = [];
  lfo?: OscillatorNode;
  constructor(ctx: Ctx, out: GainNode, id: string) {
    if (id === 'rain') {
      const src = ctx.createBufferSource();
      const full = rainBuffer(ctx);
      src.buffer = full;
      src.loop = true;
      src.loopEnd = full.duration - 0.25;
      const tone = ctx.createBiquadFilter();
      tone.type = 'lowpass';
      tone.frequency.value = 9000;
      const g = ctx.createGain();
      g.gain.value = 0.55;
      src.connect(tone).connect(g).connect(out);
      src.start();
      this.nodes = [src, tone, g];
      return;
    }
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(ctx);
    src.loop = true;
    const filt = ctx.createBiquadFilter();
    const g = ctx.createGain();
    g.gain.value = 0.5;
    const cfg: Record<string, [BiquadFilterType, number, number, number]> = {
      // type, freq, Q, lfo depth
      rain: ['bandpass', 3200, 0.5, 0.15],
      ocean: ['lowpass', 500, 0.7, 0.9],
      city: ['lowpass', 900, 0.5, 0.2],
      subway: ['bandpass', 180, 1.2, 0.5],
      night: ['bandpass', 4200, 2, 0.05],
      wind: ['bandpass', 700, 0.8, 0.7],
      arcade: ['highpass', 1800, 0.6, 0.3],
      cinema: ['lowpass', 320, 0.9, 0.1],
      room: ['lowpass', 260, 0.7, 0.05],
      cafe: ['bandpass', 1200, 0.4, 0.2],
      birds: ['bandpass', 5200, 6, 0.9],
    };
    const [type, f, q, depth] = cfg[id] ?? cfg.room;
    filt.type = type;
    filt.frequency.value = f;
    filt.Q.value = q;
    if (depth > 0) {
      const lfo = ctx.createOscillator();
      lfo.frequency.value = id === 'ocean' ? 0.09 : id === 'birds' ? 3.2 : 0.2;
      const lg = ctx.createGain();
      lg.gain.value = depth * 0.5;
      lfo.connect(lg).connect(g.gain);
      lfo.start();
      this.lfo = lfo;
    }
    src.connect(filt).connect(g).connect(out);
    src.start();
    this.nodes = [src, filt, g];
  }
  stop() {
    (this.nodes[0] as AudioBufferSourceNode).stop();
    this.lfo?.stop();
    this.nodes.forEach((n) => n.disconnect());
  }
}

// ------------------------------------------------------------ engine

/** Recorded soundtrack: five tracks cover the eighteen music cues. */
const MUSIC_FILES: Record<string, string> = {
  title_night: 'night',
  studio: 'night',
  quiet: 'quiet',
  memory: 'quiet',
  hamin: 'quiet',
  hyunjun: 'quiet',
  charlie: 'quiet',
  haruta: 'quiet',
  justin: 'quiet',
  songha: 'quiet',
  hanbi: 'quiet',
  daniel: 'quiet',
  echo: 'echo',
  tension: 'echo',
  fun: 'fun',
  dawn: 'dawn',
  title_morning: 'dawn',
  credits: 'dawn',
};
const FILE_MUSIC_GAIN = 0.7;

export class AudioEngine {
  ctx: Ctx | null = null;
  private master!: GainNode;
  private musicBus!: GainNode;
  private ambBus!: GainNode;
  private sfxBus!: GainNode;
  private musicGain: GainNode | null = null;
  private seq: Sequencer | null = null;
  private musicEl: HTMLAudioElement | null = null;
  private musicFile: string | null = null;
  private musicLoopTimer = 0;
  private amb: Ambience | null = null;
  private ambGain: GainNode | null = null;
  private ambEl: HTMLAudioElement | null = null;
  current: string | null = null;
  currentAmb: string | null = null;
  private vol = { master: 0.9, music: 0.7, amb: 0.6, sfx: 0.8 };
  private muted = false;

  /** Must be called from a user gesture. */
  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    const comp = this.ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.ratio.value = 4;
    this.master.connect(comp).connect(this.ctx.destination);
    this.musicBus = this.ctx.createGain();
    this.ambBus = this.ctx.createGain();
    this.sfxBus = this.ctx.createGain();
    this.musicBus.connect(this.master);
    this.ambBus.connect(this.master);
    this.sfxBus.connect(this.master);
    this.applyVolumes();
    if (this.current) this.playMusic(this.current, true);
    if (this.currentAmb) this.playAmb(this.currentAmb);
  }

  setVolumes(v: Partial<typeof this.vol>) {
    Object.assign(this.vol, v);
    this.applyVolumes();
  }
  setMuted(m: boolean) {
    this.muted = m;
    this.applyVolumes();
  }
  private applyVolumes() {
    if (!this.ctx) return;
    const m = this.muted ? 0 : this.vol.master;
    this.master.gain.value = m;
    this.musicBus.gain.value = this.vol.music;
    this.ambBus.gain.value = this.vol.amb;
    this.sfxBus.gain.value = this.vol.sfx;
    if (this.musicEl) this.musicEl.volume = this.vol.music * m * FILE_MUSIC_GAIN;
    if (this.ambEl) this.ambEl.volume = this.vol.amb * m;
  }

  playMusic(id: string | null, force = false) {
    if (id === this.current && !force) return;
    this.current = id;
    if (!this.ctx) return;
    const wanted = id ? `assets/audio/music/${MUSIC_FILES[id] ?? id}.m4a` : null;
    // several ids share one recorded track: keep it playing instead of restarting
    if (wanted && wanted === this.musicFile && this.musicEl && !this.musicEl.paused) return;
    clearInterval(this.musicLoopTimer);
    this.musicFile = null;
    // fade out old
    const oldGain = this.musicGain;
    const oldSeq = this.seq;
    const oldEl = this.musicEl;
    if (oldGain) {
      oldGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.6);
      setTimeout(() => {
        oldSeq?.stop();
        oldGain.disconnect();
      }, 2500);
    }
    if (oldEl) {
      const el = oldEl;
      const fade = setInterval(() => {
        el.volume = Math.max(0, el.volume - 0.05);
        if (el.volume <= 0.01) {
          clearInterval(fade);
          el.pause();
        }
      }, 80);
    }
    this.seq = null;
    this.musicGain = null;
    this.musicEl = null;
    if (!id) return;
    const file = wanted!;
    if (hasAsset(file)) {
      this.musicFile = file;
      const target = () => this.vol.music * (this.muted ? 0 : this.vol.master) * FILE_MUSIC_GAIN;
      const start = () => {
        const el = new Audio(assetUrl(file));
        el.volume = 0;
        void el.play().catch(() => undefined);
        this.musicEl = el;
        return el;
      };
      let el = start();
      let fadeIn = 0;
      // recorded tracks are not cut as perfect loops: overlap the tail with a fresh copy and crossfade
      const OVERLAP = 2.4;
      let out: HTMLAudioElement | null = null;
      this.musicLoopTimer = window.setInterval(() => {
        fadeIn = Math.min(1, fadeIn + 0.06);
        el.volume = target() * fadeIn;
        if (out) {
          out.volume = Math.max(0, out.volume - target() * 0.06);
          if (out.volume <= 0.005) {
            out.pause();
            out = null;
          }
        }
        if (el.duration && el.duration - el.currentTime < OVERLAP && !out) {
          out = el;
          el = start();
          fadeIn = 0;
        }
      }, 100);
      return;
    }
    const def = TRACKS[id];
    if (!def) return;
    const g = this.ctx.createGain();
    g.gain.value = 0;
    g.gain.setTargetAtTime(1, this.ctx.currentTime + 0.05, 1.2);
    g.connect(this.musicBus);
    this.musicGain = g;
    this.seq = new Sequencer(this.ctx, g, def);
  }

  playAmb(id: string | null) {
    if (id === this.currentAmb && this.amb) return;
    this.currentAmb = id;
    if (!this.ctx) return;
    if (this.ambGain) {
      const og = this.ambGain;
      const oa = this.amb;
      og.gain.setTargetAtTime(0, this.ctx.currentTime, 0.8);
      setTimeout(() => {
        oa?.stop();
        og.disconnect();
      }, 3000);
    }
    if (this.ambEl) {
      this.ambEl.pause();
      this.ambEl = null;
    }
    this.amb = null;
    this.ambGain = null;
    if (!id) return;
    const file = `assets/audio/amb/${id}.mp3`;
    if (hasAsset(file)) {
      const el = new Audio(assetUrl(file));
      el.loop = true;
      el.volume = this.vol.amb * (this.muted ? 0 : this.vol.master);
      void el.play().catch(() => undefined);
      this.ambEl = el;
      return;
    }
    const g = this.ctx.createGain();
    g.gain.value = 0;
    g.gain.setTargetAtTime(0.6, this.ctx.currentTime + 0.05, 1.5);
    g.connect(this.ambBus);
    this.ambGain = g;
    this.amb = new Ambience(this.ctx, g, id);
  }

  sfx(id: string) {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime;
    const out = this.sfxBus;
    const tone = (hz: number, dur: number, type: OscillatorType, vel = 0.2, slide?: number) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(hz, t);
      if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
      g.gain.setValueAtTime(vel, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(out);
      o.start(t);
      o.stop(t + dur + 0.05);
    };
    const noise = (dur: number, hz: number, vel = 0.2, type: BiquadFilterType = 'bandpass') => {
      const n = ctx.createBufferSource();
      n.buffer = noiseBuffer(ctx, Math.max(0.2, dur));
      const f = ctx.createBiquadFilter();
      f.type = type;
      f.frequency.value = hz;
      const g = ctx.createGain();
      g.gain.setValueAtTime(vel, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      n.connect(f).connect(g).connect(out);
      n.start(t);
      n.stop(t + dur + 0.05);
    };
    switch (id) {
      case 'click':
        tone(1200, 0.04, 'square', 0.08);
        break;
      case 'chime':
        tone(880, 0.6, 'sine', 0.15);
        tone(1320, 0.8, 'sine', 0.1);
        break;
      case 'echo':
        tone(660, 1.2, 'sine', 0.12, 990);
        tone(330, 1.6, 'triangle', 0.08);
        break;
      case 'glitch':
        noise(0.25, 3000, 0.25, 'highpass');
        tone(200, 0.2, 'sawtooth', 0.1, 50);
        break;
      case 'door':
        noise(0.4, 300, 0.25, 'lowpass');
        tone(120, 0.3, 'triangle', 0.15, 60);
        break;
      case 'shutter':
        noise(0.08, 4000, 0.3, 'highpass');
        tone(2000, 0.05, 'square', 0.1);
        break;
      case 'whoosh':
        noise(0.7, 800, 0.2);
        break;
      case 'step':
        noise(0.12, 250, 0.15, 'lowpass');
        break;
      case 'can':
        tone(1800, 0.15, 'square', 0.08, 900);
        noise(0.2, 2500, 0.1);
        break;
      case 'vending':
        tone(300, 0.6, 'sawtooth', 0.06);
        noise(0.5, 200, 0.15, 'lowpass');
        break;
      case 'train':
        noise(2.5, 150, 0.3, 'lowpass');
        tone(90, 2.5, 'triangle', 0.1);
        break;
      case 'page':
        noise(0.3, 2000, 0.12, 'highpass');
        break;
      case 'pencil':
        noise(0.5, 3500, 0.08, 'bandpass');
        break;
      case 'bell':
        tone(1760, 1.5, 'sine', 0.15);
        tone(2637, 1.2, 'sine', 0.06);
        break;
      case 'phone':
        tone(1046, 0.12, 'sine', 0.15);
        setTimeout(() => this.ctx && tone(1318, 0.25, 'sine', 0.15), 140);
        break;
      case 'power_down':
        tone(400, 2.2, 'sawtooth', 0.12, 40);
        noise(2, 400, 0.1, 'lowpass');
        break;
      case 'power_up':
        tone(80, 1.8, 'sawtooth', 0.12, 900);
        noise(1.5, 3000, 0.08, 'highpass');
        break;
      case 'clap':
        noise(0.15, 1500, 0.3);
        break;
      case 'claw':
        tone(500, 0.4, 'square', 0.06, 250);
        noise(0.3, 900, 0.1);
        break;
      case 'heart':
        tone(70, 0.25, 'sine', 0.3);
        setTimeout(() => this.ctx && tone(60, 0.3, 'sine', 0.25), 220);
        break;
      case 'rain_hit':
        noise(0.6, 2600, 0.2);
        break;
      case 'projector':
        noise(1.2, 1200, 0.1);
        tone(50, 1.2, 'square', 0.04);
        break;
      case 'wave':
        noise(2.4, 500, 0.25, 'lowpass');
        break;
      default:
        tone(600, 0.1, 'sine', 0.1);
    }
  }

  /** Duck music briefly (e.g. for the rhythm minigame ending / video). */
  duck(on: boolean) {
    if (!this.ctx) return;
    this.musicBus.gain.setTargetAtTime(on ? this.vol.music * 0.25 : this.vol.music, this.ctx.currentTime, 0.4);
  }
}

export const audio = new AudioEngine();
