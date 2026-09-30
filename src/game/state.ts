import { MEMBERS, type CharId, type RelationshipState } from '../narrative/types';

export type Lang = 'en' | 'ko' | 'ja' | 'zh-CN';
export const LANGS: Lang[] = ['en', 'ko', 'ja', 'zh-CN'];

export interface StageChar {
  id: string;
  expr: string;
  at: string;
}

export interface StageState {
  bg: string | null;
  chars: StageChar[];
  music: string | null;
  amb: string | null;
  fx: string | null;
  fxN: number;
  cam: string;
  camArgs: string[];
  time: string | null;
  cg: string | null;
  letterbox: boolean;
  textbox: string;
}

export interface BacklogEntry {
  /** localisation key */
  k: string;
  /** speaker id, 'narration' or 'choice' */
  s: string;
}

export interface RunState {
  v: number;
  scene: string;
  ip: number;
  stack: { scene: string; ip: number }[];
  rel: Record<CharId, RelationshipState>;
  flags: Record<string, boolean>;
  vars: Record<string, number | string>;
  visited: string[];
  stage: StageState;
  /** Non-null while the player is free-roaming the Studio 25 hub. */
  hub: string | null;
  playerName: string;
  backlog: BacklogEntry[];
  playtime: number;
  chapter: string | null;
  /** route ending reached in this run (for credits/menus) */
  ending: string | null;
}

export function freshStage(): StageState {
  return {
    bg: null,
    chars: [],
    music: null,
    amb: null,
    fx: null,
    fxN: 1,
    cam: 'wide',
    camArgs: [],
    time: null,
    cg: null,
    letterbox: false,
    textbox: 'normal',
  };
}

export function freshRun(playerName = ''): RunState {
  const rel = {} as Record<CharId, RelationshipState>;
  for (const m of MEMBERS) rel[m] = { trust: 0, closeness: 0, romance: 0 };
  return {
    v: 1,
    scene: 'prologue_start',
    ip: 0,
    stack: [],
    rel,
    flags: {},
    vars: {},
    visited: [],
    stage: freshStage(),
    hub: null,
    playerName,
    backlog: [],
    playtime: 0,
    chapter: null,
    ending: null,
  };
}

export interface Settings {
  textSpeed: number; // chars per second; 0 = instant
  autoDelay: number; // seconds after line completes
  skipUnseen: boolean;
  musicVol: number;
  sfxVol: number;
  ambVol: number;
  masterVol: number;
  fontScale: number; // 0.9 .. 1.4
  reduceMotion: boolean;
  reduceCamera: boolean;
  quality: 'auto' | 'high' | 'medium' | 'low';
  highContrast: boolean;
  dyslexiaFont: boolean;
  subtitles: boolean;
  textboxOpacity: number;
}

export function defaultSettings(): Settings {
  const prefersReduced =
    typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  return {
    textSpeed: 40,
    autoDelay: 1.6,
    skipUnseen: false,
    musicVol: 0.7,
    sfxVol: 0.8,
    ambVol: 0.6,
    masterVol: 0.9,
    fontScale: 1,
    reduceMotion: prefersReduced,
    reduceCamera: prefersReduced,
    quality: 'auto',
    highContrast: false,
    dyslexiaFont: false,
    subtitles: true,
    textboxOpacity: 0.82,
  };
}

export type EndingId = CharId | 'friendship' | 'true';

export interface Persistent {
  v: number;
  settings: Settings;
  language: Lang | null;
  seen: Record<string, 1>;
  seenChoices: Record<string, 1>;
  endings: EndingId[];
  unlocked: { cg: string[]; memory: string[]; music: string[]; cinematic: string[] };
  trueEnding: boolean;
  lastPlayerName: string;
  firstLaunchDone: boolean;
  totalPlaytime: number;
}

export function freshPersistent(): Persistent {
  return {
    v: 1,
    settings: defaultSettings(),
    language: null,
    seen: {},
    seenChoices: {},
    endings: [],
    unlocked: { cg: [], memory: [], music: [], cinematic: [] },
    trueEnding: false,
    lastPlayerName: '',
    firstLaunchDone: false,
    totalPlaytime: 0,
  };
}

export function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}
