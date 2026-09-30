// Story virtual machine: executes compiled ops, mutates RunState, and yields
// blocking events (lines, menus, async commands) to the host.

import { evalExpr, truthy, type ExprEnv } from './expr';
import { MEMBERS, isMember, type CharId, type Choice, type Op } from './types';
import type { RunState, StageChar } from '../game/state';

export type VmEvent =
  | { type: 'say'; key: string; speaker: string; expr?: string }
  | { type: 'nar'; key: string }
  | { type: 'menu'; id: string; choices: (Choice & { index: number })[] }
  | { type: 'cmd'; name: string; args: string[]; kv: Record<string, string> }
  | { type: 'end' };

/** Commands that pause execution until the host resumes the VM. */
export const BLOCKING = new Set(['wait', 'video', 'minigame', 'name', 'hub', 'credits', 'chapter', 'ending', 'cg_wait']);

export interface VmContext {
  /** persistent ending ids achieved (for ending()/endings() in conditions) */
  endings(): string[];
  trueEnding(): boolean;
  /** notified for non-blocking commands after state mutation (render/audio) */
  apply?(name: string, args: string[], kv: Record<string, string>): void;
}

export interface StoryData {
  scenes: Record<string, { id: string; ops: Op[] }>;
}

const MAX_STEPS = 100000;

export class Vm {
  constructor(
    public story: StoryData,
    public state: RunState,
    public ctx: VmContext,
  ) {}

  get op(): Op {
    const sc = this.story.scenes[this.state.scene];
    if (!sc) throw new Error(`Unknown scene ${this.state.scene}`);
    return sc.ops[this.state.ip] ?? { o: 'end' };
  }

  env(): ExprEnv {
    const st = this.state;
    return {
      lookup: (path) => {
        const [a, b] = path;
        if (isMember(a)) {
          const r = st.rel[a];
          if (!b) return r.trust + r.closeness + r.romance;
          if (b === 'trust' || b === 'closeness' || b === 'romance') return r[b];
          throw new Error(`Unknown relationship field ${path.join('.')}`);
        }
        if (a === 'flag') return !!st.flags[b];
        if (a === 'var') return st.vars[b] ?? 0;
        if (a === 'ending') return st.ending ?? '';
        throw new Error(`Unknown identifier ${path.join('.')}`);
      },
      call: (f, args) => {
        switch (f) {
          case 'seen':
            return st.visited.includes(String(args[0]));
          case 'ending':
            return this.ctx.endings().includes(String(args[0]));
          case 'endings':
            return this.ctx.endings().filter((e) => isMember(e)).length;
          case 'truedone':
            return this.ctx.trueEnding();
          case 'rooms':
            return MEMBERS.filter((m) => st.flags[`room_${m}`]).length;
          case 'bond': {
            const r = st.rel[String(args[0]) as CharId];
            return r ? r.trust + r.closeness + r.romance : 0;
          }
          case 'top':
            return topRomance(st);
          case 'onstage':
            return st.stage.chars.some((c) => c.id === String(args[0]));
        }
        throw new Error(`Unknown function ${f}()`);
      },
    };
  }

  test(c: Choice['c']): boolean {
    return !c || truthy(evalExpr(c, this.env()));
  }

  enterScene(id: string) {
    if (!this.story.scenes[id]) throw new Error(`goto unknown scene ${id}`);
    this.state.scene = id;
    this.state.ip = 0;
    if (!this.state.visited.includes(id)) this.state.visited.push(id);
  }

  /** Run until a blocking event. The ip is left ON the blocking op for say/nar/menu (so saves resume there). */
  run(): VmEvent {
    for (let steps = 0; steps < MAX_STEPS; steps++) {
      const op = this.op;
      switch (op.o) {
        case 'say':
          return { type: 'say', key: op.k, speaker: op.s, expr: op.e };
        case 'nar':
          return { type: 'nar', key: op.k };
        case 'menu': {
          const choices = op.c.map((c, index) => ({ ...c, index })).filter((c) => this.test(c.c));
          if (choices.length === 0) {
            // no visible option: fall through to the end of the menu (compiler guarantees jmp after last body)
            this.state.ip = op.end;
            continue;
          }
          return { type: 'menu', id: op.id, choices };
        }
        case 'jmp':
          this.state.ip = op.t;
          continue;
        case 'if':
          this.state.ip = truthy(evalExpr(op.c, this.env())) ? this.state.ip + 1 : op.f;
          continue;
        case 'goto':
          this.enterScene(op.s);
          continue;
        case 'call':
          this.state.stack.push({ scene: this.state.scene, ip: this.state.ip + 1 });
          this.enterScene(op.s);
          continue;
        case 'ret': {
          const fr = this.state.stack.pop();
          if (!fr) return { type: 'end' };
          this.state.scene = fr.scene;
          this.state.ip = fr.ip;
          continue;
        }
        case 'end': {
          const fr = this.state.stack.pop();
          if (fr) {
            this.state.scene = fr.scene;
            this.state.ip = fr.ip;
            continue;
          }
          return { type: 'end' };
        }
        case 'cmd': {
          this.state.ip++;
          this.execCmd(op.n, op.a, op.kv);
          if (BLOCKING.has(op.n)) return { type: 'cmd', name: op.n, args: op.a, kv: op.kv };
          this.ctx.apply?.(op.n, op.a, op.kv);
          continue;
        }
      }
    }
    throw new Error(`VM step limit exceeded near ${this.state.scene}:${this.state.ip} (infinite loop?)`);
  }

  /** Advance past the current say/nar. */
  advance() {
    const op = this.op;
    if (op.o === 'say' || op.o === 'nar') {
      this.state.backlog.push({ k: op.k, s: op.o === 'say' ? op.s : 'narration' });
      if (this.state.backlog.length > 250) this.state.backlog.splice(0, this.state.backlog.length - 250);
      if (op.o === 'say' && op.e) this.setExpr(op.s, op.e);
      this.state.ip++;
    }
  }

  choose(index: number) {
    const op = this.op;
    if (op.o !== 'menu') throw new Error('choose() while not at a menu');
    const c = op.c[index];
    if (!c) throw new Error(`bad choice index ${index}`);
    this.state.backlog.push({ k: c.k, s: 'choice' });
    this.state.ip = c.to;
  }

  private setExpr(id: string, expr: string) {
    const ch = this.state.stage.chars.find((c) => c.id === id);
    if (ch) ch.expr = expr;
  }

  /** State mutation for every command (rendering happens in the host). */
  execCmd(n: string, a: string[], kv: Record<string, string>) {
    const st = this.state;
    const sg = st.stage;
    switch (n) {
      case 'bg':
        sg.bg = a[0] === 'none' ? null : a[0];
        sg.cg = null;
        break;
      case 'show': {
        const id = a[0];
        const expr = a[1] ?? kv.expr ?? 'neutral';
        const existing = sg.chars.find((c) => c.id === id);
        const at = kv.at ?? existing?.at ?? autoSlot(sg.chars);
        if (existing) {
          existing.expr = a[1] ?? kv.expr ?? existing.expr;
          existing.at = at;
        } else sg.chars.push({ id, expr, at } as StageChar);
        break;
      }
      case 'move': {
        const ch = sg.chars.find((c) => c.id === a[0]);
        if (ch && kv.at) ch.at = kv.at;
        break;
      }
      case 'hide':
        if (a[0] === 'all' || !a[0]) sg.chars = [];
        else sg.chars = sg.chars.filter((c) => !a.includes(c.id));
        break;
      case 'expr':
        this.setExpr(a[0], a[1]);
        break;
      case 'cam':
        sg.cam = a[0] ?? 'wide';
        sg.camArgs = a.slice(1);
        break;
      case 'music':
        sg.music = a[0] === 'stop' ? null : a[0];
        break;
      case 'amb':
        sg.amb = a[0] === 'none' ? null : a[0];
        break;
      case 'fx':
        sg.fx = a[0] === 'off' ? null : a[0];
        sg.fxN = kv.n ? parseFloat(kv.n) : 1;
        break;
      case 'cg':
        sg.cg = a[0] === 'off' ? null : a[0];
        break;
      case 'time':
        st.stage.time = a[0] === 'off' ? null : a[0];
        break;
      case 'letterbox':
        sg.letterbox = a[0] !== 'off';
        break;
      case 'textbox':
        sg.textbox = a[0] ?? 'normal';
        break;
      case 'chapter':
        st.chapter = a[0];
        break;
      case 'rel': {
        const id = a[0] as CharId;
        if (!st.rel[id]) throw new Error(`@rel unknown member ${id}`);
        for (const part of a.slice(1)) {
          const m = /^(trust|closeness|romance)([+-]\d+)$/.exec(part);
          if (!m) throw new Error(`@rel bad delta ${part}`);
          st.rel[id][m[1] as 'trust'] += parseInt(m[2], 10);
        }
        break;
      }
      case 'flag':
        for (const f of a) {
          if (f.startsWith('!')) delete st.flags[f.slice(1)];
          else st.flags[f] = true;
        }
        break;
      case 'var': {
        const m = /^([a-z_0-9]+)\s*(\+=|-=|=)\s*(.+)$/.exec(a[0]);
        if (!m) throw new Error(`@var bad syntax ${a[0]}`);
        const raw = m[3].trim();
        const val: number | string = /^-?\d+(\.\d+)?$/.test(raw) ? parseFloat(raw) : raw.replace(/^["']|["']$/g, '');
        if (m[2] === '=') st.vars[m[1]] = val;
        else {
          const cur = Number(st.vars[m[1]] ?? 0);
          st.vars[m[1]] = m[2] === '+=' ? cur + Number(val) : cur - Number(val);
        }
        break;
      }
      case 'hub':
        st.hub = a[0] ?? 'main';
        break;
      case 'ending':
        st.ending = a[0];
        break;
    }
  }
}

function autoSlot(chars: StageChar[]): string {
  const used = new Set(chars.map((c) => c.at));
  for (const s of ['c', 'l', 'r', 'fl', 'fr']) if (!used.has(s)) return s;
  return 'c';
}

export function topRomance(st: RunState): string {
  let best = '';
  let bestScore = -Infinity;
  for (const m of MEMBERS) {
    const r = st.rel[m];
    const score = r.romance * 100 + r.closeness * 10 + r.trust;
    if (score > bestScore) {
      bestScore = score;
      best = m;
    }
  }
  return best;
}
