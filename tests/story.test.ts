// Story integrity: compiles, validates, and simulates thousands of playthroughs to
// prove every ending is reachable and nothing softlocks.

import { describe, it, expect } from 'vitest';
import { buildStory } from '../tools/story-build';
import { Vm, type VmEvent } from '../src/narrative/vm';
import { freshRun } from '../src/game/state';
import { MEMBERS, type CharId } from '../src/narrative/types';
import { hubAutoScene, hubSpotScene, hubSpots, doorScene } from '../src/game/hub-data';

const { story, errors, warnings } = buildStory();

function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };
}

interface SimResult {
  ending: string | null;
  scenes: Set<string>;
  lines: number;
  choices: number;
  hubVisits: number;
}

/**
 * Plays the whole game with a policy. `favour` = member the bot leans toward.
 * Mirrors Game.step/enterHub logic closely enough to catch dead ends.
 */
function simulate(seed: number, favour: CharId | null, endings: string[] = [], opts: { notYet?: boolean; roomOrder?: CharId[]; final?: 'beside' | 'someday' } = {}): SimResult {
  const r = rng(seed);
  const run = freshRun('Sim');
  const vm = new Vm({ scenes: story.scenes }, run, { endings: () => endings, trueEnding: () => endings.includes('true') });
  vm.enterScene('prologue_start');
  const res: SimResult = { ending: null, scenes: new Set(), lines: 0, choices: 0, hubVisits: 0 };
  let steps = 0;
  const notYetLeft = new Map<string, number>();
  for (;;) {
    if (++steps > 200000) throw new Error(`runaway at ${run.scene}:${run.ip}`);
    res.scenes.add(run.scene);
    let ev: VmEvent;
    try {
      ev = vm.run();
    } catch (e) {
      throw new Error(`${(e as Error).message} (scene ${run.scene} ip ${run.ip})`);
    }
    if (ev.type === 'say' || ev.type === 'nar') {
      res.lines++;
      vm.advance();
      continue;
    }
    if (ev.type === 'menu') {
      res.choices++;
      let pick = ev.choices[Math.floor(r() * ev.choices.length)];
      const texts = ev.choices.map((c) => story.text[c.k]);
      // door consent: "Not yet." once per door if opts.notYet, else open
      const notYetIdx = texts.findIndex((t) => t === '"Not yet."');
      const openIdx = texts.findIndex((t) => t === '"Open it."');
      if (openIdx >= 0 && notYetIdx >= 0) {
        const left = notYetLeft.get(run.scene) ?? (opts.notYet ? 1 : 0);
        if (left > 0) {
          notYetLeft.set(run.scene, left - 1);
          pick = ev.choices[notYetIdx];
        } else pick = ev.choices[openIdx];
      }
      // favour a member: prefer romantic/sincere options
      if (favour && !(openIdx >= 0)) {
        const inFavScene = run.scene.startsWith(favour);
        const pref = inFavScene
          ? ev.choices.filter((c) => c.tone === 'romantic' || c.tone === 'sincere')
          : ev.choices.filter((c) => c.tone !== 'romantic');
        if (pref.length && r() < 0.9) pick = pref[Math.floor(r() * pref.length)];
      }
      // act3 route choice
      if (run.scene === 'act3_choice') {
        const want = favour ? texts.findIndex((t) => t.toLowerCase().includes(favour)) : -1;
        pick = want >= 0 ? ev.choices[want] : ev.choices.find((c) => story.text[c.k].startsWith('Stay'))!;
      }
      // act4
      if (run.scene === 'act4_choice') {
        const trueIdx = texts.findIndex((t) => t.includes('new memories'));
        if (trueIdx >= 0 && endings.length >= 8) pick = ev.choices[trueIdx];
        else if (favour) {
          const idx = texts.findIndex((t) => t.toLowerCase().includes(favour));
          pick = idx >= 0 ? ev.choices[idx] : ev.choices[0];
        } else pick = ev.choices.find((c) => story.text[c.k].startsWith('"Tonight'))!;
      }
      // the last thing said at 04:57 decides which of a member's three endings plays
      if (run.scene.endsWith('_final')) {
        const n = ev.choices.length; // [romance?], beside, someday
        pick = opts.final === 'someday' ? ev.choices[n - 1] : opts.final === 'beside' ? ev.choices[n - 2] : ev.choices[0];
      }
      vm.choose(pick.index);
      continue;
    }
    if (ev.type === 'cmd') {
      if (ev.name === 'ending') res.ending = ev.args[0];
      if (ev.name === 'minigame') run.vars.minigame_score = Math.floor(r() * 101);
      if (ev.name === 'hub') {
        res.hubVisits++;
        // emulate Game.enterHub
        const auto = hubAutoScene(run);
        if (auto) {
          vm.enterScene(auto);
          run.hub = null;
          continue;
        }
        // player policy in hub: act1 → talk to everyone; act2 → talk to some, open doors
        if (run.hub === 'act1') {
          const spots = hubSpots(run).filter((s) => s.kind === 'member');
          const remaining = spots.filter((s) => !run.visited.includes(`${s.member}_intro`));
          const pickSpot = remaining.length ? remaining[Math.floor(r() * remaining.length)] : spots[0];
          const scene = hubSpotScene(run, pickSpot)!;
          run.hub = null;
          vm.enterScene(scene);
          continue;
        }
        // act2: sometimes talk to a member / echo, otherwise open a door
        const openRooms = MEMBERS.filter((m) => !run.flags[`room_${m}`]);
        if (openRooms.length && r() < 0.65) {
          const order = opts.roomOrder ?? openRooms;
          const next = order.find((m) => !run.flags[`room_${m}`]) ?? openRooms[0];
          run.hub = null;
          vm.enterScene(doorScene(next));
          continue;
        }
        const spots = hubSpots(run).filter((s) => s.kind !== 'doors');
        const favSpot = favour ? spots.find((s) => s.member === favour) : undefined;
        const sp = favSpot && r() < 0.6 ? favSpot : spots[Math.floor(r() * spots.length)];
        const scene = hubSpotScene(run, sp)!;
        run.hub = null;
        vm.enterScene(scene);
        if (!openRooms.length) {
          // all rooms done: hub_after_room already routed to act3; if we're back here something is wrong
        }
        continue;
      }
      continue; // wait/video/chapter/name/credits: non-blocking in sim
    }
    if (ev.type === 'end') return res;
  }
}

describe('story build', () => {
  it('compiles without errors', () => {
    expect(errors).toEqual([]);
  });
  it('has no unreferenced scenes or dangling hub refs', () => {
    const bad = warnings.filter((w) => !w.includes('conditional'));
    expect(bad).toEqual([]);
  });
  it('has every required scene for every member', () => {
    for (const m of MEMBERS) for (const s of ['intro', 'intro_repeat', 'door', 'room', 'hub', 'route', 'ending', 'newmem']) expect(story.scenes[`${m}_${s}`], `${m}_${s}`).toBeTruthy();
    for (const s of ['prologue_start', 'act1_gather', 'hub_echo', 'hub_after_room', 'interlude_1', 'interlude_2', 'interlude_3', 'act3_start', 'act3_choice', 'act4_choice', 'echo_farewell', 'friendship_route', 'friendship_ending', 'true_ending', 'newmem_group'])
      expect(story.scenes[s], s).toBeTruthy();
  });
  it('is a substantial script', () => {
    const words = Object.values(story.text).reduce((n, s) => n + s.split(/\s+/).length, 0);
    expect(words).toBeGreaterThan(50000);
  });
  it('has no banned phrasing', () => {
    const banned = [/you're different/i, /can't explain why/i, /not like anyone else/i, /belong to me/i, /heart skipped/i];
    const hits = Object.entries(story.text).filter(([, s]) => banned.some((b) => b.test(s)));
    expect(hits).toEqual([]);
  });
  it('every door scene offers exactly "Open it." and "Not yet."', () => {
    for (const m of MEMBERS) {
      const ops = story.scenes[`${m}_door`].ops;
      const menus = ops.filter((o) => o.o === 'menu');
      const texts = menus.flatMap((mm) => (mm.o === 'menu' ? mm.c.map((c) => story.text[c.k]) : []));
      expect(texts, m).toContain('"Open it."');
      expect(texts, m).toContain('"Not yet."');
    }
  });
});

describe('playthrough simulation', () => {
  it('reaches the friendship ending', () => {
    const r = simulate(1, null);
    expect(r.ending).toBe('friendship');
    expect(r.scenes.has('act3_room')).toBe(true);
    expect(r.scenes.has('interlude_1')).toBe(true);
    expect(r.scenes.has('interlude_2')).toBe(true);
    expect(r.scenes.has('interlude_3')).toBe(true);
  });
  for (const m of MEMBERS) {
    it(`reaches the ${m} ending across seeds`, () => {
      let ok = 0;
      for (let seed = 1; seed <= 12; seed++) {
        const r = simulate(seed * 7 + 3, m);
        if (r.ending === m) ok++;
        expect(r.ending, `seed ${seed}`).not.toBeNull();
        expect([m, `${m}_beside`], `seed ${seed}`).toContain(r.ending);
        for (let c = 1; c <= 6; c++) expect(r.scenes.has(`${m}_ch${c}`), `${m}_ch${c}`).toBe(true);
      }
      // favouring a member should almost always earn the romance ending
      expect(ok).toBeGreaterThanOrEqual(11);
    });
    it(`reaches ${m}'s "beside" and "someday" endings`, () => {
      for (let seed = 1; seed <= 4; seed++) {
        expect(simulate(seed * 5 + 1, m, [], { final: 'beside' }).ending).toBe(`${m}_beside`);
        expect(simulate(seed * 5 + 2, m, [], { final: 'someday' }).ending).toBe(`${m}_someday`);
      }
    });
  }
  it('reaches the true ending once all eight are done', () => {
    const r = simulate(99, 'hamin', [...MEMBERS]);
    expect(r.ending).toBe('true');
    expect(r.scenes.has('true_dawn')).toBe(true);
  });
  it('does not offer the true ending early', () => {
    const r = simulate(5, 'daniel', ['hamin', 'hyunjun']);
    expect(r.ending).toBe('daniel');
  });
  it('survives "Not yet." at every door and any room order', () => {
    const orders: CharId[][] = [
      [...MEMBERS],
      [...MEMBERS].reverse(),
      ['daniel', 'hanbi', 'songha', 'justin', 'haruta', 'charlie', 'hyunjun', 'hamin'],
    ];
    for (const [i, order] of orders.entries()) {
      const r = simulate(100 + i, null, [], { notYet: true, roomOrder: order });
      expect(r.ending).toBe('friendship');
      for (const m of MEMBERS) expect(r.scenes.has(`${m}_room`), m).toBe(true);
    }
  });
  it('random policies never softlock (200 seeds)', () => {
    for (let seed = 1000; seed < 1200; seed++) {
      const fav = seed % 3 === 0 ? null : MEMBERS[seed % 8];
      const r = simulate(seed, fav, seed % 5 === 0 ? [...MEMBERS] : []);
      expect(r.ending, `seed ${seed}`).not.toBeNull();
    }
  });
  it('newmem scenes run to completion', () => {
    for (const scene of [...MEMBERS.map((m) => `${m}_newmem`), 'newmem_group']) {
      const run = freshRun('Sim');
      const vm = new Vm({ scenes: story.scenes }, run, { endings: () => [], trueEnding: () => true });
      vm.enterScene(scene);
      let guard = 0;
      for (;;) {
        const ev = vm.run();
        if (ev.type === 'end') break;
        if (ev.type === 'say' || ev.type === 'nar') vm.advance();
        else if (ev.type === 'menu') vm.choose(ev.choices[0].index);
        if (++guard > 5000) throw new Error(`${scene} runaway`);
      }
    }
  });
});
