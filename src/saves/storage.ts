// Local persistence: settings/progress (persistent) + save slots.
// Everything is stored in localStorage (small JSON). Access is wrapped so private
// browsing modes or blocked storage degrade to an in-memory store instead of crashing.

import { clone, freshPersistent, defaultSettings, type Persistent, type RunState } from '../game/state';

const PREFIX = 's25.';
const mem = new Map<string, string>();

function read(key: string): string | null {
  try {
    return localStorage.getItem(PREFIX + key);
  } catch {
    return mem.get(key) ?? null;
  }
}

function write(key: string, value: string): boolean {
  try {
    localStorage.setItem(PREFIX + key, value);
    return true;
  } catch {
    mem.set(key, value);
    return false;
  }
}

function remove(key: string) {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {
    mem.delete(key);
  }
}

export const MANUAL_SLOTS = 12;
export type SlotId = 'auto' | 'quick' | `${number}`;

export interface SaveMeta {
  slot: SlotId;
  savedAt: number;
  scene: string;
  chapter: string | null;
  time: string | null;
  bg: string | null;
  lineKey: string | null;
  speaker: string | null;
  playtime: number;
  playerName: string;
}

export interface SaveFile {
  meta: SaveMeta;
  run: RunState;
}

export function loadPersistent(): Persistent {
  const raw = read('persistent');
  const base = freshPersistent();
  if (!raw) return base;
  try {
    const p = JSON.parse(raw) as Partial<Persistent>;
    return {
      ...base,
      ...p,
      settings: { ...defaultSettings(), ...(p.settings ?? {}) },
      unlocked: { ...base.unlocked, ...(p.unlocked ?? {}) },
    };
  } catch {
    return base;
  }
}

export function savePersistent(p: Persistent) {
  write('persistent', JSON.stringify(p));
}

export function writeSlot(slot: SlotId, run: RunState, lineKey: string | null, speaker: string | null): SaveMeta {
  const meta: SaveMeta = {
    slot,
    savedAt: Date.now(),
    scene: run.scene,
    chapter: run.chapter,
    time: run.stage.time,
    bg: run.stage.cg ?? run.stage.bg,
    lineKey,
    speaker,
    playtime: Math.round(run.playtime),
    playerName: run.playerName,
  };
  const file: SaveFile = { meta, run: clone(run) };
  write(`slot.${slot}`, JSON.stringify(file));
  return meta;
}

export function readSlot(slot: SlotId): SaveFile | null {
  const raw = read(`slot.${slot}`);
  if (!raw) return null;
  try {
    const f = JSON.parse(raw) as SaveFile;
    if (!f.run || !f.meta) return null;
    return f;
  } catch {
    return null;
  }
}

export function deleteSlot(slot: SlotId) {
  remove(`slot.${slot}`);
}

export function allSlotIds(): SlotId[] {
  const ids: SlotId[] = ['auto', 'quick'];
  for (let i = 1; i <= MANUAL_SLOTS; i++) ids.push(`${i}`);
  return ids;
}

export function listSlots(): Record<string, SaveMeta | null> {
  const out: Record<string, SaveMeta | null> = {};
  for (const id of allSlotIds()) out[id] = readSlot(id)?.meta ?? null;
  return out;
}

export function latestSlot(): SlotId | null {
  let best: SaveMeta | null = null;
  for (const id of allSlotIds()) {
    const m = readSlot(id)?.meta;
    if (m && (!best || m.savedAt > best.savedAt)) best = m;
  }
  return best?.slot ?? null;
}

export interface ExportBundle {
  game: 'stay-until-morning';
  version: 1;
  exportedAt: string;
  persistent: Persistent;
  slots: Record<string, SaveFile>;
}

export function exportAll(p: Persistent): ExportBundle {
  const slots: Record<string, SaveFile> = {};
  for (const id of allSlotIds()) {
    const f = readSlot(id);
    if (f) slots[id] = f;
  }
  return { game: 'stay-until-morning', version: 1, exportedAt: new Date().toISOString(), persistent: p, slots };
}

export function importAll(json: string): Persistent {
  const b = JSON.parse(json) as ExportBundle;
  if (b.game !== 'stay-until-morning' || !b.persistent) throw new Error('not a save export');
  for (const [id, f] of Object.entries(b.slots ?? {})) {
    if (f?.run && f?.meta) write(`slot.${id}`, JSON.stringify(f));
  }
  savePersistent(b.persistent);
  return loadPersistent();
}

export function wipeAll() {
  for (const id of allSlotIds()) deleteSlot(id);
  remove('persistent');
}
