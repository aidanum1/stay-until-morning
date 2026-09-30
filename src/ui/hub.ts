// Studio 25 hub overlay: tappable spots on top of the 3D panorama, the Hall of Doors,
// swipe-to-look, and ambient chatter bubbles.

import { h, clear } from './dom';
import { t, speakerName } from '../localization/i18n';
import { hubSpots, hubSpotScene, doorScene, hubTime, hubTier, type HubSpot } from '../game/hub-data';
import { MEMBERS, type CharId } from '../narrative/types';
import { CHARACTERS, accentFor } from '../characters/characters';
import { audio } from '../audio/audio';
import storyData from '../generated/story.json';
import type { Game } from '../game/game';
import type { Op } from '../narrative/types';

const STORY = storyData as unknown as { scenes: Record<string, { ops: Op[] }> };

export class HubView {
  root: HTMLElement;
  private spotsEl: HTMLElement;
  private bubblesEl: HTMLElement;
  private bar: HTMLElement;
  private dots: HTMLElement;
  private hint: HTMLElement;
  private active = false;
  private scroll = 0;
  private dragStart: number | null = null;
  private dragScroll = 0;
  private spots: HubSpot[] = [];
  private ambientTimer = 0;
  private recentAmbient: string[] = [];
  private bubbleTimers: number[] = [];

  constructor(
    parent: HTMLElement,
    private game: Game,
  ) {
    this.spotsEl = h('div', { class: 'layer' });
    this.bubblesEl = h('div', { class: 'layer' });
    this.dots = h('div', { class: 'hub-scroll' });
    this.hint = h('div', { class: 'hub-hint' });
    this.bar = h('div', { class: 'hub-bar' });
    this.root = h('div', { class: 'hub hidden' }, this.spotsEl, this.bubblesEl, this.dots, this.hint, this.bar);
    parent.appendChild(this.root);
    this.root.addEventListener('pointerdown', (e) => {
      if ((e.target as HTMLElement).closest('button')) return;
      this.dragStart = e.clientX;
      this.dragScroll = this.scroll;
    });
    window.addEventListener('pointermove', (e) => {
      if (this.dragStart === null || !this.active) return;
      const dx = e.clientX - this.dragStart;
      this.setScroll(this.dragScroll - dx / (window.innerWidth * 0.5));
    });
    window.addEventListener('pointerup', () => (this.dragStart = null));
    window.addEventListener('pointercancel', () => (this.dragStart = null));
    this.root.addEventListener('wheel', (e) => this.setScroll(this.scroll + e.deltaX / 400 + e.deltaY / 800), { passive: true });
  }

  private setScroll(v: number) {
    this.scroll = Math.max(-1, Math.min(1, v));
    this.game.stage.setHubScroll(this.scroll);
    this.dots.querySelectorAll('i').forEach((d, i) => d.classList.toggle('on', i === Math.round((this.scroll + 1) * 1.5)));
  }

  enter() {
    const run = this.game.run!;
    this.active = true;
    this.root.classList.remove('hidden');
    this.scroll = 0;
    this.game.stage.setHubScroll(0);
    this.spots = hubSpots(run);
    // place sprites
    const chars = this.spots.filter((s) => s.kind === 'member').map((s) => ({ id: s.member!, expr: 'neutral', at: 'c' }));
    run.stage.chars = [];
    this.game.stage.syncCharacters(chars, true);
    for (const s of this.spots) if (s.kind === 'member') this.game.stage.placeHubSprite(s.member!, s.x, s.y, s.s, s.pose ?? 'stand');
    this.game.ui.setClock(hubTime(run));
    this.renderSpots();
    clear(this.dots);
    for (let i = 0; i < 4; i++) this.dots.appendChild(h('i', { class: i === 1 || i === 2 ? 'on' : '' }));
    this.hint.textContent = run.hub === 'act1' ? t('hub.hint_act1') : t('hub.hint_act2');
    clear(this.bar);
    if (run.hub === 'act2') this.bar.appendChild(h('button', { class: 'btn', onclick: () => this.openDoors() }, t('hub.doors')));
    this.bar.appendChild(h('button', { class: 'btn', onclick: () => this.game.ui.openGameMenu() }, t('hub.menu')));
    this.scheduleAmbient(2500);
  }

  leave() {
    this.active = false;
    this.root.classList.add('hidden');
    clearTimeout(this.ambientTimer);
    this.bubbleTimers.forEach(clearTimeout);
    this.bubbleTimers = [];
    clear(this.bubblesEl);
  }

  private renderSpots() {
    clear(this.spotsEl);
    const run = this.game.run!;
    for (const s of this.spots) {
      const done = s.kind === 'member' && (run.hub === 'act1' ? run.visited.includes(`${s.member}_intro`) : !!run.flags[`${s.member}_postchat`]);
      const sym = s.kind === 'member' ? CHARACTERS[s.member!].symbol : s.kind === 'doors' ? '▯' : '◈';
      const el = h(
        'button',
        {
          class: `hub-spot${done ? ' done' : ''}`,
          dataset: { id: s.id },
          onclick: (e: Event) => {
            e.stopPropagation();
            this.game.unlockAudio();
            audio.sfx('click');
            if (s.kind === 'doors') this.openDoors();
            else {
              const scene = hubSpotScene(run, s);
              if (scene) this.game.runHubScene(scene);
            }
          },
        },
        h('div', { class: 'pin' }, sym),
        h('div', { class: 'tag' }, t(s.label)),
      );
      this.spotsEl.appendChild(el);
    }
    this.layout();
  }

  /** Project each spot to screen space each frame (cheap: a handful of elements). */
  tick() {
    if (!this.active) return;
    this.layout();
  }

  private layout() {
    const stage = this.game.stage;
    const w = window.innerWidth;
    const hgt = window.innerHeight;
    for (const el of Array.from(this.spotsEl.children) as HTMLElement[]) {
      const s = this.spots.find((x) => x.id === el.dataset.id);
      if (!s) continue;
      let sx: number;
      let sy: number;
      if (s.kind === 'member') {
        const x = stage.charScreenX(s.member!);
        if (x === null) continue;
        const p = stage.projectToScreen(x + stage.bgOffsetX, stage.charTopY(s.member!) + 0.35, 0.2);
        sx = p.x;
        sy = p.y;
      } else {
        const px = (s.x - 0.5) * stage.panoramaWidth;
        const p = stage.projectToScreen(px + stage.bgOffsetX, s.y * 3 - 1.5, -2.9);
        sx = p.x;
        sy = p.y;
      }
      el.style.left = `${sx}px`;
      el.style.top = `${sy}px`;
      el.style.opacity = sx < -40 || sx > w + 40 || sy < 0 || sy > hgt ? '0' : '1';
      el.style.pointerEvents = sx < -40 || sx > w + 40 ? 'none' : 'auto';
    }
    for (const b of Array.from(this.bubblesEl.children) as HTMLElement[]) {
      const m = b.dataset.member as CharId;
      const x = stage.charScreenX(m);
      if (x === null) continue;
      const p = stage.projectToScreen(x + stage.bgOffsetX + 0.3, stage.charTopY(m) + 0.5, 0.2);
      b.style.left = `${Math.max(100, Math.min(w - 100, p.x))}px`;
      b.style.top = `${p.y}px`;
      b.style.visibility = p.x < -80 || p.x > w + 80 ? 'hidden' : 'visible';
    }
  }

  // ------------------------------------------------------------ doors

  private openDoors() {
    const run = this.game.run!;
    const grid = h('div', { class: 'doors-grid' });
    for (const m of MEMBERS) {
      const done = !!run.flags[`room_${m}`];
      grid.appendChild(
        h(
          'button',
          {
            class: `door${done ? ' done' : ''}`,
            disabled: done,
            onclick: () => {
              audio.sfx('door');
              this.game.ui.closePanels();
              this.game.runHubScene(doorScene(m));
            },
          },
          h('img', { src: `./assets/ui/hero_${m}.webp`, alt: '', loading: 'lazy' }),
          h('div', { class: 'sym' }, CHARACTERS[m].symbol),
          h('b', null, t(`name.${m}`)),
          h('span', null, done ? t('hub.door_done') : t(`route.${m}`)),
        ),
      );
    }
    const n = MEMBERS.filter((m) => run.flags[`room_${m}`]).length;
    this.game.ui.showPanel('hub.doors', h('div', { class: 'panel-body' }, h('p', { class: 'muted' }, t('hub.doors_desc', { n, total: 8 })), grid));
  }

  // ------------------------------------------------------------ ambient chatter

  private scheduleAmbient(ms: number) {
    clearTimeout(this.ambientTimer);
    this.ambientTimer = window.setTimeout(() => this.playAmbient(), ms);
  }

  private playAmbient() {
    if (!this.active || this.game.ui.panelsOpen) {
      this.scheduleAmbient(3000);
      return;
    }
    const run = this.game.run!;
    const tier = hubTier(run);
    const prefix = run.hub === 'act1' ? 'amb_a1_' : tier <= 2 ? 'amb_a2e_' : 'amb_a2l_';
    const candidates = Object.keys(STORY.scenes).filter((id) => id.startsWith(prefix) && !this.recentAmbient.includes(id));
    if (!candidates.length) {
      this.recentAmbient = [];
      this.scheduleAmbient(4000);
      return;
    }
    const id = candidates[Math.floor(Math.random() * candidates.length)];
    this.recentAmbient.push(id);
    if (this.recentAmbient.length > 12) this.recentAmbient.shift();
    const lines = STORY.scenes[id].ops.filter((o): o is Extract<Op, { o: 'say' }> => o.o === 'say');
    let delay = 0;
    lines.forEach((op, i) => {
      const timer = window.setTimeout(() => this.bubble(op.s as CharId, t(op.k)), delay);
      this.bubbleTimers.push(timer);
      delay += 2600 + Math.min(2400, t(op.k).length * 45);
      if (i === lines.length - 1) this.scheduleAmbient(delay + 5000 + Math.random() * 6000);
    });
  }

  private bubble(member: CharId, text: string) {
    if (!this.active) return;
    // one bubble per member at a time
    this.bubblesEl.querySelectorAll(`[data-member="${member}"]`).forEach((b) => b.remove());
    const b = h('div', { class: 'hub-bubble', dataset: { member } }, h('b', { style: { color: accentFor(member) } }, speakerName(member)), text.replace(/\{p\}/g, '').replace(/\*/g, ''));
    this.bubblesEl.appendChild(b);
    this.layout();
    const life = 2400 + Math.min(2400, text.length * 45);
    const timer = window.setTimeout(() => {
      b.classList.add('out');
      setTimeout(() => b.remove(), 300);
    }, life);
    this.bubbleTimers.push(timer);
  }
}
