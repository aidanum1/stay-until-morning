// Core narrative data types shared by the compiler (build time) and the VM (runtime).

export const MEMBERS = [
  'hamin',
  'hyunjun',
  'charlie',
  'haruta',
  'justin',
  'songha',
  'hanbi',
  'daniel',
] as const;

export type CharId = (typeof MEMBERS)[number];

export function isMember(id: string): id is CharId {
  return (MEMBERS as readonly string[]).includes(id);
}

/** Speakers that are not members. `you` = protagonist, `echo` = the archive system. */
export const EXTRA_SPEAKERS = ['you', 'echo', 'all', 'staff', 'clerk', 'voice', 'unknown'] as const;

export type Expr =
  | { t: 'num'; v: number }
  | { t: 'str'; v: string }
  | { t: 'bool'; v: boolean }
  | { t: 'id'; path: string[] }
  | { t: 'call'; f: string; args: Expr[] }
  | { t: 'un'; op: 'not' | '-'; a: Expr }
  | { t: 'bin'; op: string; a: Expr; b: Expr };

export interface Choice {
  /** localisation key */
  k: string;
  /** personality/tone tag: playful | sincere | quiet | romantic | ... (for analytics + styling) */
  tone?: string;
  /** visibility condition */
  c?: Expr;
  /** op index of the choice body */
  to: number;
}

export type Op =
  | { o: 'say'; k: string; s: string; e?: string }
  | { o: 'nar'; k: string }
  | { o: 'menu'; id: string; c: Choice[]; end: number }
  | { o: 'jmp'; t: number }
  | { o: 'if'; c: Expr; f: number }
  | { o: 'goto'; s: string }
  | { o: 'call'; s: string }
  | { o: 'ret' }
  | { o: 'cmd'; n: string; a: string[]; kv: Record<string, string> }
  | { o: 'end' };

export interface CompiledScene {
  id: string;
  file: string;
  ops: Op[];
}

export interface CompiledStory {
  scenes: Record<string, CompiledScene>;
  /** English source text for every key (canonical script). */
  text: Record<string, string>;
  /** speaker for each dialogue key (translation context) */
  speakers: Record<string, string>;
  /** key -> source file (for locale file splitting) */
  keyFile: Record<string, string>;
}

export interface RelationshipState {
  trust: number;
  closeness: number;
  romance: number;
}
