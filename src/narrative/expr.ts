// Tiny expression language used by @if and choice conditions.
//   hamin.romance >= 3 and flag.beach
//   not seen(act2_hamin) or rooms() >= 4
//   bond(daniel) > bond(hanbi)

import type { Expr } from './types';

type Tok = { k: 'num' | 'str' | 'id' | 'op' | 'lp' | 'rp' | 'comma' | 'eof'; v: string };

const OPS = ['==', '!=', '>=', '<=', '>', '<', '+', '-', '*'];

function lex(src: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    if (/[0-9]/.test(ch)) {
      let j = i;
      while (j < src.length && /[0-9.]/.test(src[j])) j++;
      out.push({ k: 'num', v: src.slice(i, j) });
      i = j;
      continue;
    }
    if (ch === '"' || ch === "'") {
      const j = src.indexOf(ch, i + 1);
      if (j < 0) throw new Error(`Unterminated string in expression: ${src}`);
      out.push({ k: 'str', v: src.slice(i + 1, j) });
      i = j + 1;
      continue;
    }
    if (/[A-Za-z_]/.test(ch)) {
      let j = i;
      while (j < src.length && /[A-Za-z0-9_.]/.test(src[j])) j++;
      out.push({ k: 'id', v: src.slice(i, j) });
      i = j;
      continue;
    }
    if (ch === '(') {
      out.push({ k: 'lp', v: ch });
      i++;
      continue;
    }
    if (ch === ')') {
      out.push({ k: 'rp', v: ch });
      i++;
      continue;
    }
    if (ch === ',') {
      out.push({ k: 'comma', v: ch });
      i++;
      continue;
    }
    const op = OPS.find((o) => src.startsWith(o, i));
    if (op) {
      out.push({ k: 'op', v: op });
      i += op.length;
      continue;
    }
    if (ch === '=') {
      // tolerate single '=' as equality
      out.push({ k: 'op', v: '==' });
      i++;
      continue;
    }
    throw new Error(`Unexpected '${ch}' in expression: ${src}`);
  }
  out.push({ k: 'eof', v: '' });
  return out;
}

export function parseExpr(src: string): Expr {
  const toks = lex(src);
  let p = 0;
  const peek = () => toks[p];
  const next = () => toks[p++];
  const isWord = (w: string) => peek().k === 'id' && peek().v === w;

  function or(): Expr {
    let a = and();
    while (isWord('or')) {
      next();
      a = { t: 'bin', op: 'or', a, b: and() };
    }
    return a;
  }
  function and(): Expr {
    let a = not();
    while (isWord('and')) {
      next();
      a = { t: 'bin', op: 'and', a, b: not() };
    }
    return a;
  }
  function not(): Expr {
    if (isWord('not')) {
      next();
      return { t: 'un', op: 'not', a: not() };
    }
    return cmp();
  }
  function cmp(): Expr {
    const a = sum();
    const t = peek();
    if (t.k === 'op' && ['==', '!=', '>=', '<=', '>', '<'].includes(t.v)) {
      next();
      return { t: 'bin', op: t.v, a, b: sum() };
    }
    return a;
  }
  function sum(): Expr {
    let a = unary();
    while (peek().k === 'op' && ['+', '-', '*'].includes(peek().v)) {
      const op = next().v;
      a = { t: 'bin', op, a, b: unary() };
    }
    return a;
  }
  function unary(): Expr {
    if (peek().k === 'op' && peek().v === '-') {
      next();
      return { t: 'un', op: '-', a: unary() };
    }
    return primary();
  }
  function primary(): Expr {
    const t = next();
    if (t.k === 'num') return { t: 'num', v: parseFloat(t.v) };
    if (t.k === 'str') return { t: 'str', v: t.v };
    if (t.k === 'lp') {
      const e = or();
      if (next().k !== 'rp') throw new Error(`Expected ) in: ${src}`);
      return e;
    }
    if (t.k === 'id') {
      if (t.v === 'true') return { t: 'bool', v: true };
      if (t.v === 'false') return { t: 'bool', v: false };
      if (peek().k === 'lp') {
        next();
        const args: Expr[] = [];
        if (peek().k !== 'rp') {
          for (;;) {
            // bare identifiers inside calls are treated as strings: seen(act2_hamin)
            const a = peek();
            if (a.k === 'id' && (toks[p + 1].k === 'comma' || toks[p + 1].k === 'rp')) {
              next();
              args.push({ t: 'str', v: a.v });
            } else args.push(or());
            if (peek().k === 'comma') {
              next();
              continue;
            }
            break;
          }
        }
        if (next().k !== 'rp') throw new Error(`Expected ) after args in: ${src}`);
        return { t: 'call', f: t.v, args };
      }
      return { t: 'id', path: t.v.split('.') };
    }
    throw new Error(`Unexpected token '${t.v}' in expression: ${src}`);
  }

  const e = or();
  if (peek().k !== 'eof') throw new Error(`Trailing tokens in expression: ${src}`);
  return e;
}

export interface ExprEnv {
  lookup(path: string[]): number | string | boolean;
  call(f: string, args: (number | string | boolean)[]): number | string | boolean;
}

export function evalExpr(e: Expr, env: ExprEnv): number | string | boolean {
  switch (e.t) {
    case 'num':
    case 'str':
    case 'bool':
      return e.v;
    case 'id':
      return env.lookup(e.path);
    case 'call':
      return env.call(
        e.f,
        e.args.map((a) => evalExpr(a, env)),
      );
    case 'un': {
      const v = evalExpr(e.a, env);
      return e.op === 'not' ? !truthy(v) : -Number(v);
    }
    case 'bin': {
      if (e.op === 'and') return truthy(evalExpr(e.a, env)) && truthy(evalExpr(e.b, env));
      if (e.op === 'or') return truthy(evalExpr(e.a, env)) || truthy(evalExpr(e.b, env));
      const a = evalExpr(e.a, env);
      const b = evalExpr(e.b, env);
      switch (e.op) {
        case '==':
          return a == b; // eslint-disable-line eqeqeq
        case '!=':
          return a != b; // eslint-disable-line eqeqeq
        case '>=':
          return Number(a) >= Number(b);
        case '<=':
          return Number(a) <= Number(b);
        case '>':
          return Number(a) > Number(b);
        case '<':
          return Number(a) < Number(b);
        case '+':
          return Number(a) + Number(b);
        case '-':
          return Number(a) - Number(b);
        case '*':
          return Number(a) * Number(b);
      }
      throw new Error(`Unknown operator ${e.op}`);
    }
  }
}

export function truthy(v: number | string | boolean): boolean {
  return !!v && v !== '0' && v !== 'false';
}

/** Collect identifiers + calls used (for static validation). */
export function exprRefs(e: Expr, out: { ids: string[][]; calls: { f: string; args: Expr[] }[] }) {
  switch (e.t) {
    case 'id':
      out.ids.push(e.path);
      break;
    case 'call':
      out.calls.push({ f: e.f, args: e.args });
      e.args.forEach((a) => exprRefs(a, out));
      break;
    case 'un':
      exprRefs(e.a, out);
      break;
    case 'bin':
      exprRefs(e.a, out);
      exprRefs(e.b, out);
      break;
  }
  return out;
}
