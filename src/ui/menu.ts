// Main menu: Studio 25 at night (or morning after the True Ending).

import { h, clear } from './dom';
import { t } from '../localization/i18n';
import { latestSlot, readSlot } from '../saves/storage';
import { audio } from '../audio/audio';
import { MEMBERS } from '../narrative/types';
import type { Game } from '../game/game';
import type { Panels } from './panels';
import { hasAsset, assetUrl } from '../rendering/assets';

export class MainMenu {
  root: HTMLElement;
  constructor(
    parent: HTMLElement,
    private game: Game,
    private panels: Panels,
  ) {
    this.root = h('div', { class: 'menu hidden' });
    parent.appendChild(this.root);
  }

  private heroTimer = 0;
  private heroIndex = Math.floor(Math.random() * MEMBERS.length);

  hide() {
    this.root.classList.add('hidden');
    clearInterval(this.heroTimer);
    this.root.querySelectorAll('video').forEach((v) => v.pause());
  }

  /** Full-bleed living portrait of one member, cross-fading to the next every few seconds. */
  private buildHero(): HTMLElement {
    const hero = h('div', { class: 'menu-hero' });
    const label = h('div', { class: 'menu-hero-name' });
    const show = () => {
      const m = MEMBERS[this.heroIndex % MEMBERS.length];
      this.heroIndex++;
      const vid = `assets/video/idle_${m}.mp4`;
      const el = hasAsset(vid)
        ? (h('video', { src: assetUrl(vid), poster: assetUrl(`assets/ui/hero_${m}.webp`), muted: true, loop: true, playsinline: true, autoplay: true, preload: 'auto' }) as HTMLVideoElement)
        : h('img', { src: assetUrl(`assets/ui/hero_${m}.webp`), alt: '' });
      if (el instanceof HTMLVideoElement) {
        el.muted = true;
        void el.play().catch(() => undefined);
      }
      hero.appendChild(el);
      requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('show')));
      const old = Array.from(hero.children).filter((c) => c !== el && c !== label) as HTMLElement[];
      old.forEach((o) => {
        o.classList.remove('show');
        setTimeout(() => o.remove(), 1700);
      });
      label.textContent = t(`name.${m}`);
    };
    hero.appendChild(label);
    show();
    clearInterval(this.heroTimer);
    this.heroTimer = window.setInterval(show, 9000);
    return hero;
  }

  show() {
    const p = this.game.persistent;
    const morning = p.trueEnding;
    clear(this.root);
    this.root.classList.remove('hidden');
    this.root.classList.toggle('morning', morning);

    // stage dressing
    const stage = this.game.stage;
    stage.setBackground(morning ? 'studio_lobby_morning' : 'studio_ext_night', 'fade', 1.6);
    stage.setFx(morning ? 'light' : 'rain', morning ? 0.8 : 0.7);
    stage.setShot('wide', []);
    stage.setLetterbox(false);
    if (morning) {
      // the eight of them, casually around the lobby
      stage.syncCharacters(
        MEMBERS.map((m, i) => ({ id: m, expr: i % 3 === 0 ? 'smile' : i % 3 === 1 ? 'laugh' : 'neutral', at: ['l', 'c', 'r', 'fl', 'fr'][i % 5] })),
        true,
      );
      const spots: [number, number, number, 'stand' | 'sit'][] = [
        [0.18, 0.2, 0.95, 'sit'],
        [0.3, 0.2, 0.96, 'sit'],
        [0.42, 0.18, 1, 'stand'],
        [0.52, 0.2, 0.96, 'sit'],
        [0.62, 0.17, 1.02, 'stand'],
        [0.72, 0.18, 0.98, 'stand'],
        [0.82, 0.2, 0.96, 'sit'],
        [0.92, 0.17, 1.02, 'stand'],
      ];
      MEMBERS.forEach((m, i) => stage.placeHubSprite(m, ...spots[i]));
      stage.setHubScroll(0);
      stage.setShot('pan', []);
    } else stage.syncCharacters([]);
    audio.playMusic(morning ? 'title_morning' : 'title_night');
    audio.playAmb(morning ? 'birds' : 'rain');

    const latest = latestSlot();
    const latestMeta = latest ? readSlot(latest)?.meta : null;
    const item = (label: string, fn: () => void, opts: { cls?: string; hint?: string; disabled?: boolean } = {}) =>
      h(
        'button',
        {
          class: `menu-item ${opts.cls ?? ''}`,
          disabled: !!opts.disabled,
          onclick: () => {
            this.game.unlockAudio();
            audio.sfx('click');
            fn();
          },
        },
        h('span', null, label),
        opts.hint ? h('span', { class: 'hint' }, opts.hint) : null,
      );

    const list = h('div', { class: 'menu-list' });
    if (latestMeta)
      list.appendChild(
        item(t('menu.continue'), () => this.game.loadSlot(latest!), {
          cls: 'primary',
          hint: latestMeta.time ?? '',
        }),
      );
    list.appendChild(
      item(
        t('menu.new_game'),
        () => {
          const start = () => {
            this.hide();
            this.game.newGame(p.lastPlayerName || '');
          };
          if (latestMeta) this.panels.confirm(t('menu.new_game_confirm'), start);
          else start();
        },
        { cls: latestMeta ? '' : 'primary' },
      ),
    );
    list.appendChild(item(t('menu.load'), () => this.panels.saves('load'), { disabled: !this.panels.hasAnySave() }));
    list.appendChild(item(t('menu.archive'), () => this.panels.archive()));
    if (morning) list.appendChild(item(t('menu.new_memories'), () => this.panels.archive(), { cls: 'new-memories', hint: '🌅' }));
    list.appendChild(item(t('menu.settings'), () => this.panels.settings()));
    list.appendChild(item(t('menu.credits'), () => this.showCredits()));
    list.appendChild(item(t('menu.language'), () => this.panels.settings()));

    this.root.append(
      this.buildHero(),
      h(
        'div',
        { class: 'title-block' },
        h('div', { class: 'title-time' }, morning ? '06:14' : '00:25'),
        h('div', { class: 'title-name' }, t('ui.title')),
        h('div', { class: 'title-sub' }, morning ? t('ui.subtitle_morning') : t('ui.subtitle')),
      ),
      h('div', { class: 'menu-bottom' }, list, h('div', { class: 'legal' }, t('ui.legal'))),
    );
    // nudge the stage so the lobby drifts
    this.game.stage.setShot(morning ? 'pan' : 'wide', []);
  }

  private showCredits() {
    this.game.ui.rollCredits(() => undefined);
  }

  refresh() {
    if (!this.root.classList.contains('hidden')) this.show();
  }
}
