// Compiles /story/*.s25 and validates every reference against the manifest.
// Used by tools/build-locales.ts, the Vite plugin and the test-suite.

import { readdirSync, readFileSync } from 'node:fs';
import { join, basename } from 'node:path';
import { compileFile, emptyStory, StoryError } from '../src/narrative/compiler';
import { exprRefs } from '../src/narrative/expr';
import { EXTRA_SPEAKERS, MEMBERS, isMember, type CompiledStory, type Expr, type Op } from '../src/narrative/types';
import {
  AMB_IDS,
  BACKGROUNDS,
  CAM_IDS,
  CG_IDS,
  CHAPTERS,
  EXPRESSIONS,
  FX_IDS,
  MINIGAMES,
  MUSIC_IDS,
  POSITIONS,
  SFX_IDS,
  TEXTBOXES,
  VIDEO_IDS,
} from '../src/scenes/manifest';
import { HUB_PHASES, hubSceneRefs } from '../src/game/hub-data';

export const ROOT = join(import.meta.dirname ?? __dirname, '..');
export const STORY_DIR = join(ROOT, 'story');

export interface BuildResult {
  story: CompiledStory;
  errors: string[];
  warnings: string[];
}

const SPEAKERS = new Set<string>([...MEMBERS, ...EXTRA_SPEAKERS]);
const FUNCS = new Set(['seen', 'ending', 'endings', 'truedone', 'rooms', 'bond', 'top', 'onstage']);
const ENDING_IDS = new Set<string>([...MEMBERS, 'friendship', 'true']);
const UNLOCK_KINDS = new Set(['cg', 'memory', 'music', 'cinematic']);

export function storyFiles(): string[] {
  return readdirSync(STORY_DIR)
    .filter((f) => f.endsWith('.s25'))
    .sort();
}

export function buildStory(): BuildResult {
  const story = emptyStory();
  const errors: string[] = [];
  const warnings: string[] = [];
  for (const f of storyFiles()) {
    try {
      compileFile(basename(f, '.s25'), readFileSync(join(STORY_DIR, f), 'utf8'), story, SPEAKERS);
    } catch (e) {
      errors.push(e instanceof StoryError ? e.message : `${f}: ${(e as Error).message}`);
    }
  }
  validate(story, errors, warnings);
  return { story, errors, warnings };
}

function checkExpr(e: Expr, where: string, errors: string[], story: CompiledStory) {
  const refs = exprRefs(e, { ids: [], calls: [] });
  for (const p of refs.ids) {
    const [a, b] = p;
    if (isMember(a)) {
      if (b && !['trust', 'closeness', 'romance'].includes(b)) errors.push(`${where}: bad field ${p.join('.')}`);
    } else if (a === 'flag' || a === 'var') {
      if (!b) errors.push(`${where}: ${a} needs a name`);
    } else if (a !== 'ending') errors.push(`${where}: unknown identifier ${p.join('.')}`);
  }
  for (const c of refs.calls) {
    if (!FUNCS.has(c.f)) errors.push(`${where}: unknown function ${c.f}()`);
    if (c.f === 'seen') {
      const arg = c.args[0];
      if (arg?.t === 'str' && !story.scenes[arg.v]) errors.push(`${where}: seen() of unknown scene ${arg.v}`);
    }
  }
}

function validate(story: CompiledStory, errors: string[], warnings: string[]) {
  const has = (list: readonly string[], v: string) => list.includes(v);
  const called = new Set<string>();
  const referenced = new Set<string>();
  for (const sc of Object.values(story.scenes)) {
    sc.ops.forEach((op: Op, i) => {
      const where = `${sc.file}:${sc.id}#${i}`;
      switch (op.o) {
        case 'say':
          if (op.e && !has(EXPRESSIONS, op.e)) errors.push(`${where}: unknown expression ${op.e}`);
          break;
        case 'goto':
        case 'call':
          if (!story.scenes[op.s]) errors.push(`${where}: ${op.o} unknown scene '${op.s}'`);
          referenced.add(op.s);
          if (op.o === 'call') called.add(op.s);
          break;
        case 'if':
          checkExpr(op.c, where, errors, story);
          break;
        case 'menu':
          op.c.forEach((c) => c.c && checkExpr(c.c, where, errors, story));
          if (op.c.every((c) => c.c)) warnings.push(`${where}: every option in menu is conditional (make sure one is always visible)`);
          break;
        case 'cmd': {
          const [a0, a1] = op.a;
          const bad = (msg: string) => errors.push(`${where}: @${op.n} ${msg}`);
          switch (op.n) {
            case 'bg':
              if (!BACKGROUNDS[a0] && a0 !== 'none') bad(`unknown background '${a0}'`);
              if (op.kv.t && !['fade', 'cut', 'memory', 'flash', 'slow'].includes(op.kv.t)) bad(`bad transition ${op.kv.t}`);
              if (op.kv.tint && !['dawn', 'night', 'memory', 'mono'].includes(op.kv.tint)) bad(`bad tint ${op.kv.tint}`);
              break;
            case 'show':
              if (!isMember(a0)) bad(`unknown member '${a0}'`);
              if (a1 && !has(EXPRESSIONS, a1)) bad(`unknown expression '${a1}'`);
              if (op.kv.at && !has(POSITIONS, op.kv.at)) bad(`unknown position '${op.kv.at}'`);
              break;
            case 'move':
              if (!isMember(a0)) bad(`unknown member '${a0}'`);
              if (!op.kv.at || !has(POSITIONS, op.kv.at)) bad(`needs at=<pos>`);
              break;
            case 'hide':
              for (const x of op.a) if (x !== 'all' && !isMember(x)) bad(`unknown member '${x}'`);
              break;
            case 'expr':
              if (!isMember(a0)) bad(`unknown member '${a0}'`);
              if (!has(EXPRESSIONS, a1)) bad(`unknown expression '${a1}'`);
              break;
            case 'cam':
              if (!has(CAM_IDS, a0)) bad(`unknown camera '${a0}'`);
              for (const x of op.a.slice(1)) if (!isMember(x)) bad(`camera target '${x}' is not a member`);
              break;
            case 'music':
              if (a0 !== 'stop' && !has(MUSIC_IDS, a0)) bad(`unknown track '${a0}'`);
              break;
            case 'amb':
              if (a0 !== 'none' && !has(AMB_IDS, a0)) bad(`unknown ambience '${a0}'`);
              break;
            case 'sfx':
              if (!has(SFX_IDS, a0)) bad(`unknown sfx '${a0}'`);
              break;
            case 'fx':
              if (a0 !== 'off' && !has(FX_IDS, a0)) bad(`unknown fx '${a0}'`);
              break;
            case 'cg':
              if (a0 !== 'off' && !has(CG_IDS, a0)) bad(`unknown cg '${a0}'`);
              break;
            case 'video':
              if (!has(VIDEO_IDS, a0)) bad(`unknown video '${a0}'`);
              break;
            case 'time':
              if (!/^(\d\d:\d\d|off)$/.test(a0 ?? '')) bad(`bad time '${a0}'`);
              break;
            case 'chapter':
              if (!has(CHAPTERS, a0)) bad(`unknown chapter '${a0}'`);
              break;
            case 'letterbox':
              if (!['on', 'off'].includes(a0)) bad(`use on/off`);
              break;
            case 'textbox':
              if (!has(TEXTBOXES, a0)) bad(`unknown textbox '${a0}'`);
              break;
            case 'minigame':
              if (!has(MINIGAMES, a0)) bad(`unknown minigame '${a0}'`);
              break;
            case 'wait':
              if (!(parseFloat(a0) >= 0)) bad(`bad duration`);
              break;
            case 'rel':
              if (!isMember(a0)) bad(`unknown member '${a0}'`);
              for (const d of op.a.slice(1))
                if (!/^(trust|closeness|romance)[+-]\d+$/.test(d)) bad(`bad delta '${d}' (use trust+1)`);
              if (op.a.length < 2) bad('needs at least one delta');
              break;
            case 'flag':
              if (!op.a.length) bad('needs a name');
              break;
            case 'var':
              if (!/^([a-z_0-9]+)\s*(\+=|-=|=)\s*(.+)$/.test(a0 ?? '')) bad(`bad syntax '${a0}'`);
              break;
            case 'unlock': {
              const [kind, id] = (a0 ?? '').split(':');
              if (!UNLOCK_KINDS.has(kind) || !id) bad(`use kind:id (${[...UNLOCK_KINDS].join('/')})`);
              if (kind === 'cg' && !has(CG_IDS, id)) bad(`unknown cg ${id}`);
              if (kind === 'music' && !has(MUSIC_IDS, id)) bad(`unknown music ${id}`);
              if (kind === 'memory' && !isMember(id)) bad(`memory unlock must be a member id`);
              break;
            }
            case 'ending':
              if (!ENDING_IDS.has(a0)) bad(`unknown ending '${a0}'`);
              break;
            case 'hub':
              if (!HUB_PHASES.includes(a0)) bad(`unknown hub phase '${a0}'`);
              break;
          }
          break;
        }
      }
    });
  }
  // hub references
  for (const ref of hubSceneRefs()) {
    if (!story.scenes[ref]) warnings.push(`hub references missing scene '${ref}'`);
    referenced.add(ref);
  }
  referenced.add('prologue_start');
  for (const id of Object.keys(story.scenes)) {
    if (!referenced.has(id) && !id.startsWith('amb_') && !id.endsWith('_newmem') && id !== 'newmem_group')
      warnings.push(`scene '${id}' is never referenced`);
  }
}
