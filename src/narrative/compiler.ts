// Compiler for the .s25 story DSL. See docs/STORY_DSL.md for the authoring guide.
// Pure module (no node APIs) so it runs in Vite plugins, vitest and the browser.

import { parseExpr } from './expr';
import type { Choice, CompiledScene, CompiledStory, Expr, Op } from './types';

export class StoryError extends Error {
  constructor(
    msg: string,
    public file: string,
    public line: number,
  ) {
    super(`${file}:${line}: ${msg}`);
  }
}

export const KNOWN_COMMANDS = new Set([
  'bg',
  'show',
  'hide',
  'move',
  'expr',
  'cam',
  'music',
  'amb',
  'sfx',
  'fx',
  'cg',
  'video',
  'wait',
  'time',
  'chapter',
  'rel',
  'flag',
  'var',
  'unlock',
  'ending',
  'credits',
  'hub',
  'minigame',
  'autosave',
  'name',
  'shake',
  'flash',
  'letterbox',
  'textbox',
  'menu_morning',
  'memory',
]);

type RawLine = { ind: number; text: string; line: number };

type Node =
  | { kind: 'say'; s: string; e?: string; text: string; line: number }
  | { kind: 'nar'; text: string; line: number }
  | { kind: 'cmd'; n: string; a: string[]; kv: Record<string, string>; line: number }
  | { kind: 'goto'; target: string; line: number }
  | { kind: 'call'; target: string; line: number }
  | { kind: 'ret'; line: number }
  | { kind: 'end'; line: number }
  | { kind: 'label'; name: string; line: number }
  | {
      kind: 'menu';
      line: number;
      choices: { text: string; tone?: string; cond?: Expr; body: Node[]; line: number }[];
    }
  | { kind: 'if'; line: number; branches: { cond: Expr | null; body: Node[] }[] };

const SAY_RE = /^([a-z_]+)(?:\[([a-z_]+)\])?:\s?(.*)$/;
const CHOICE_RE = /^\*\s*(?:\[([a-z_]+)\]\s*)?(.*?)\s*(?:\{if\s+(.+)\})?\s*$/;

function splitArgs(s: string): { a: string[]; kv: Record<string, string> } {
  const a: string[] = [];
  const kv: Record<string, string> = {};
  for (const part of s.split(/\s+/).filter(Boolean)) {
    const m = /^([a-z_]+)=(.+)$/.exec(part);
    if (m) kv[m[1]] = m[2];
    else a.push(part);
  }
  return { a, kv };
}

export function compileFile(file: string, src: string, story: CompiledStory, knownSpeakers?: Set<string>) {
  const lines = src.replace(/\r\n/g, '\n').split('\n');
  // split into scenes
  const scenes: { id: string; raw: RawLine[]; line: number }[] = [];
  let cur: { id: string; raw: RawLine[]; line: number } | null = null;
  lines.forEach((l, i) => {
    const expanded = l.replace(/\t/g, '    ');
    const trimmed = expanded.trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('//')) return;
    const sm = /^===\s*([a-z0-9_]+)\s*$/.exec(trimmed);
    if (sm) {
      cur = { id: sm[1], raw: [], line: i + 1 };
      scenes.push(cur);
      return;
    }
    if (!cur) throw new StoryError('content before first === scene header', file, i + 1);
    const ind = expanded.length - expanded.trimStart().length;
    (cur as { raw: RawLine[] }).raw.push({ ind, text: trimmed, line: i + 1 });
  });

  for (const sc of scenes) {
    if (story.scenes[sc.id]) throw new StoryError(`duplicate scene id ${sc.id}`, file, sc.line);
    const tree = parseBlock(sc.raw, 0, sc.raw.length, file, knownSpeakers);
    const compiled = emitScene(sc.id, file, tree, story);
    story.scenes[sc.id] = compiled;
  }
}

function parseBlock(raw: RawLine[], start: number, end: number, file: string, speakers?: Set<string>): Node[] {
  const nodes: Node[] = [];
  let i = start;
  const baseInd = start < end ? raw[start].ind : 0;
  // find extent of an indented body following line i
  const bodyEnd = (from: number, ind: number) => {
    let j = from;
    while (j < end && raw[j].ind > ind) j++;
    return j;
  };
  while (i < end) {
    const r = raw[i];
    if (r.ind !== baseInd) throw new StoryError(`unexpected indentation (${r.ind} vs ${baseInd})`, file, r.line);
    const t = r.text;
    // choices: consecutive '*' lines at same indentation form one menu
    if (t.startsWith('*')) {
      const menu: Extract<Node, { kind: 'menu' }> = { kind: 'menu', line: r.line, choices: [] };
      while (i < end && raw[i].ind === baseInd && raw[i].text.startsWith('*')) {
        const cm = CHOICE_RE.exec(raw[i].text);
        if (!cm || !cm[2]) throw new StoryError('bad choice line', file, raw[i].line);
        const be = bodyEnd(i + 1, baseInd);
        let cond: Expr | undefined;
        if (cm[3]) {
          try {
            cond = parseExpr(cm[3]);
          } catch (e) {
            throw new StoryError((e as Error).message, file, raw[i].line);
          }
        }
        menu.choices.push({
          text: cm[2],
          tone: cm[1],
          cond,
          body: parseBlock(raw, i + 1, be, file, speakers),
          line: raw[i].line,
        });
        i = be;
      }
      nodes.push(menu);
      continue;
    }
    if (t.startsWith('@if ')) {
      const node: Extract<Node, { kind: 'if' }> = { kind: 'if', line: r.line, branches: [] };
      let cond = t.slice(4);
      for (;;) {
        const be = bodyEnd(i + 1, baseInd);
        let parsed: Expr | null = null;
        if (cond !== '') {
          try {
            parsed = parseExpr(cond);
          } catch (e) {
            throw new StoryError((e as Error).message, file, raw[i].line);
          }
        }
        node.branches.push({ cond: parsed, body: parseBlock(raw, i + 1, be, file, speakers) });
        i = be;
        if (i < end && raw[i].ind === baseInd && raw[i].text.startsWith('@elif ')) {
          cond = raw[i].text.slice(6);
          continue;
        }
        if (i < end && raw[i].ind === baseInd && raw[i].text === '@else') {
          cond = '';
          if (node.branches[node.branches.length - 1].cond === null)
            throw new StoryError('double @else', file, raw[i].line);
          continue;
        }
        break;
      }
      nodes.push(node);
      continue;
    }
    if (t.startsWith('@elif') || t === '@else') throw new StoryError('@elif/@else without @if', file, r.line);
    if (i + 1 < end && raw[i + 1].ind > baseInd)
      throw new StoryError('unexpected indented block after non-block line', file, raw[i + 1].line);

    if (t.startsWith('~')) {
      nodes.push({ kind: 'label', name: t.slice(1).trim(), line: r.line });
    } else if (t.startsWith('>')) {
      const text = t.slice(1).trim();
      if (!text) throw new StoryError('empty narration', file, r.line);
      nodes.push({ kind: 'nar', text, line: r.line });
    } else if (t.startsWith('@')) {
      const sp = t.indexOf(' ');
      const name = (sp < 0 ? t.slice(1) : t.slice(1, sp)).trim();
      const rest = sp < 0 ? '' : t.slice(sp + 1).trim();
      if (name === 'goto') nodes.push({ kind: 'goto', target: rest, line: r.line });
      else if (name === 'call') nodes.push({ kind: 'call', target: rest, line: r.line });
      else if (name === 'return') nodes.push({ kind: 'ret', line: r.line });
      else if (name === 'end') nodes.push({ kind: 'end', line: r.line });
      else {
        if (!KNOWN_COMMANDS.has(name)) throw new StoryError(`unknown command @${name}`, file, r.line);
        const { a, kv } = name === 'var' ? { a: [rest], kv: {} } : splitArgs(rest);
        nodes.push({ kind: 'cmd', n: name, a, kv, line: r.line });
      }
    } else {
      const m = SAY_RE.exec(t);
      if (!m) throw new StoryError(`cannot parse line: ${t.slice(0, 60)}`, file, r.line);
      if (speakers && !speakers.has(m[1])) throw new StoryError(`unknown speaker '${m[1]}'`, file, r.line);
      if (!m[3].trim()) throw new StoryError('empty dialogue', file, r.line);
      nodes.push({ kind: 'say', s: m[1], e: m[2], text: m[3].trim(), line: r.line });
    }
    i++;
  }
  return nodes;
}

function emitScene(id: string, file: string, tree: Node[], story: CompiledStory): CompiledScene {
  const ops: Op[] = [];
  let n = 0;
  let menuN = 0;
  const labels: Record<string, number> = {};
  const labelFix: { idx: number; name: string; line: number }[] = [];
  const key = () => `${id}.${String(++n).padStart(3, '0')}`;
  const addText = (k: string, text: string, speaker?: string) => {
    story.text[k] = text;
    story.keyFile[k] = file;
    if (speaker) story.speakers[k] = speaker;
  };

  const emit = (nodes: Node[]) => {
    for (const nd of nodes) {
      switch (nd.kind) {
        case 'say': {
          const k = key();
          addText(k, nd.text, nd.s);
          ops.push(nd.e ? { o: 'say', k, s: nd.s, e: nd.e } : { o: 'say', k, s: nd.s });
          break;
        }
        case 'nar': {
          const k = key();
          addText(k, nd.text, 'narration');
          ops.push({ o: 'nar', k });
          break;
        }
        case 'cmd':
          ops.push({ o: 'cmd', n: nd.n, a: nd.a, kv: nd.kv });
          break;
        case 'goto':
          if (nd.target.startsWith('.')) {
            labelFix.push({ idx: ops.length, name: nd.target.slice(1), line: nd.line });
            ops.push({ o: 'jmp', t: -1 });
          } else ops.push({ o: 'goto', s: nd.target });
          break;
        case 'call':
          ops.push({ o: 'call', s: nd.target });
          break;
        case 'ret':
          ops.push({ o: 'ret' });
          break;
        case 'end':
          ops.push({ o: 'end' });
          break;
        case 'label':
          if (labels[nd.name] !== undefined) throw new StoryError(`duplicate label ${nd.name}`, file, nd.line);
          labels[nd.name] = ops.length;
          break;
        case 'menu': {
          const menuOp: Extract<Op, { o: 'menu' }> = { o: 'menu', id: `${id}.m${++menuN}`, c: [], end: -1 };
          ops.push(menuOp);
          const jumpsToEnd: number[] = [];
          for (const ch of nd.choices) {
            const k = key();
            addText(k, ch.text, 'choice');
            const c: Choice = { k, to: ops.length };
            if (ch.tone) c.tone = ch.tone;
            if (ch.cond) c.c = ch.cond;
            menuOp.c.push(c);
            emit(ch.body);
            jumpsToEnd.push(ops.length);
            ops.push({ o: 'jmp', t: -1 });
          }
          for (const j of jumpsToEnd) (ops[j] as { t: number }).t = ops.length;
          menuOp.end = ops.length;
          break;
        }
        case 'if': {
          const jumpsToEnd: number[] = [];
          for (const br of nd.branches) {
            let condIdx = -1;
            if (br.cond) {
              condIdx = ops.length;
              ops.push({ o: 'if', c: br.cond, f: -1 });
            }
            emit(br.body);
            jumpsToEnd.push(ops.length);
            ops.push({ o: 'jmp', t: -1 });
            if (condIdx >= 0) (ops[condIdx] as { f: number }).f = ops.length;
          }
          for (const j of jumpsToEnd) (ops[j] as { t: number }).t = ops.length;
          break;
        }
      }
    }
  };
  emit(tree);
  ops.push({ o: 'end' });
  for (const f of labelFix) {
    if (labels[f.name] === undefined) throw new StoryError(`unknown label .${f.name}`, file, f.line);
    (ops[f.idx] as { t: number }).t = labels[f.name];
  }
  return { id, file, ops };
}

export function emptyStory(): CompiledStory {
  return { scenes: {}, text: {}, speakers: {}, keyFile: {} };
}

/** Strip English text from the compiled story for runtime (text comes from locale files). */
export function runtimeStory(s: CompiledStory) {
  return { scenes: s.scenes };
}
