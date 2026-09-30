// Studio 25 hub: who stands where, what can be tapped, and which scenes run.
// Pure data + helpers (also imported by the story validator at build time).

import { MEMBERS, type CharId } from '../narrative/types';
import type { RunState } from './state';

export const HUB_PHASES = ['act1', 'act2'];

export interface HubSpot {
  id: string;
  kind: 'member' | 'doors' | 'object';
  member?: CharId;
  /** horizontal position across the panorama, 0..1 */
  x: number;
  /** vertical anchor (feet), 0 = bottom of view, 1 = top */
  y: number;
  /** sprite scale multiplier (depth) */
  s: number;
  /** i18n key for the label */
  label: string;
  pose?: 'stand' | 'sit';
}

/** Progress tier: characters drift around the studio as the night goes on. */
export function hubTier(st: RunState): number {
  if (st.hub === 'act1') return 0;
  const r = MEMBERS.filter((m) => st.flags[`room_${m}`]).length;
  return r < 2 ? 1 : r < 4 ? 2 : r < 6 ? 3 : 4;
}

// x positions per tier for each member (panorama is ~2.6 screens wide)
const LAYOUT: Record<number, Record<CharId, [number, number, number, 'stand' | 'sit']>> = {
  0: {
    songha: [0.1, 0.18, 1, 'stand'],
    hanbi: [0.2, 0.2, 0.96, 'sit'],
    hyunjun: [0.33, 0.16, 1, 'stand'],
    justin: [0.42, 0.17, 1.02, 'stand'],
    hamin: [0.55, 0.2, 0.96, 'stand'],
    haruta: [0.66, 0.18, 0.98, 'stand'],
    charlie: [0.78, 0.16, 1, 'stand'],
    daniel: [0.9, 0.17, 1.02, 'stand'],
  },
  1: {
    songha: [0.47, 0.2, 0.95, 'stand'],
    hanbi: [0.12, 0.2, 0.96, 'sit'],
    hyunjun: [0.8, 0.16, 1, 'stand'],
    justin: [0.9, 0.17, 1.02, 'stand'],
    hamin: [0.22, 0.2, 0.96, 'stand'],
    haruta: [0.34, 0.18, 0.98, 'sit'],
    charlie: [0.66, 0.16, 1, 'stand'],
    daniel: [0.57, 0.17, 1.02, 'stand'],
  },
  2: {
    songha: [0.36, 0.2, 0.95, 'stand'],
    hanbi: [0.25, 0.2, 0.96, 'sit'],
    hyunjun: [0.14, 0.16, 1, 'sit'],
    justin: [0.88, 0.17, 1.02, 'stand'],
    hamin: [0.47, 0.2, 0.96, 'stand'],
    haruta: [0.6, 0.18, 0.98, 'stand'],
    charlie: [0.7, 0.16, 1, 'sit'],
    daniel: [0.79, 0.17, 1.02, 'stand'],
  },
  3: {
    songha: [0.58, 0.2, 0.95, 'sit'],
    hanbi: [0.69, 0.2, 0.96, 'sit'],
    hyunjun: [0.3, 0.16, 1, 'stand'],
    justin: [0.4, 0.17, 1.02, 'stand'],
    hamin: [0.8, 0.2, 0.96, 'stand'],
    haruta: [0.9, 0.18, 0.98, 'stand'],
    charlie: [0.19, 0.16, 1, 'stand'],
    daniel: [0.09, 0.17, 1.02, 'sit'],
  },
  4: {
    songha: [0.2, 0.2, 0.95, 'sit'],
    hanbi: [0.3, 0.2, 0.96, 'sit'],
    hyunjun: [0.52, 0.16, 1, 'sit'],
    justin: [0.62, 0.17, 1.02, 'stand'],
    hamin: [0.41, 0.2, 0.96, 'sit'],
    haruta: [0.73, 0.18, 0.98, 'sit'],
    charlie: [0.84, 0.16, 1, 'sit'],
    daniel: [0.93, 0.17, 1.02, 'stand'],
  },
};

export function hubSpots(st: RunState): HubSpot[] {
  const tier = hubTier(st);
  const lay = LAYOUT[tier];
  const spots: HubSpot[] = MEMBERS.map((m) => ({
    id: m,
    kind: 'member',
    member: m,
    x: lay[m][0],
    y: lay[m][1],
    s: lay[m][2],
    pose: lay[m][3],
    label: `name.${m}`,
  }));
  spots.push({ id: 'echo', kind: 'object', x: 0.02, y: 0.45, s: 1, label: 'hub.echo' });
  if (st.hub === 'act2') spots.push({ id: 'doors', kind: 'doors', x: 0.985, y: 0.4, s: 1, label: 'hub.doors' });
  return spots;
}

/** Scene to run when a spot is tapped. */
export function hubSpotScene(st: RunState, spot: HubSpot): string | null {
  if (spot.kind === 'member' && spot.member) {
    const m = spot.member;
    if (st.hub === 'act1') return st.visited.includes(`${m}_intro`) ? `${m}_intro_repeat` : `${m}_intro`;
    return `${m}_hub`;
  }
  if (spot.id === 'echo') return 'hub_echo';
  return null;
}

export function doorScene(m: CharId): string {
  return `${m}_door`;
}

/** A scene the hub should run automatically before handing control to the player. */
export function hubAutoScene(st: RunState): string | null {
  if (st.hub === 'act1' && MEMBERS.every((m) => st.visited.includes(`${m}_intro`)) && !st.visited.includes('act1_gather'))
    return 'act1_gather';
  return null;
}

/** Clock shown in the hub. */
export function hubTime(st: RunState): string {
  if (st.hub === 'act1') {
    const n = MEMBERS.filter((m) => st.visited.includes(`${m}_intro`)).length;
    return fmt(40 + n * 3);
  }
  const r = MEMBERS.filter((m) => st.flags[`room_${m}`]).length;
  return fmt(65 + r * 17);
}

function fmt(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Every scene id the hub can reach (for static validation). */
export function hubSceneRefs(): string[] {
  const out = ['act1_gather', 'hub_echo', 'hub_after_room'];
  for (const m of MEMBERS) out.push(`${m}_intro`, `${m}_intro_repeat`, `${m}_hub`, `${m}_door`);
  return out;
}

// ---------------------------------------------------------------- ambient events

export interface AmbientEvent {
  scene: string;
  phase: 'act1' | 'act2';
  minRooms?: number;
  maxRooms?: number;
  /** extra condition on flags */
  flag?: string;
}

export const AMBIENT: AmbientEvent[] = [];

export function registerAmbient(events: AmbientEvent[]) {
  AMBIENT.push(...events);
}
