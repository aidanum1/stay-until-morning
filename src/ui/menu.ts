// Main menu: Studio 25 at night (or morning after the True Ending).

import { h, clear } from './dom';
import { t } from '../localization/i18n';
import { latestSlot, readSlot } from '../saves/storage';
import { audio } from '../audio/audio';
import { MEMBERS } from '../narrative/types';
import type { Game } from '../game/game';
import type { Panels } from './panels';

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

  hide() {
    this.root.classList.add('hidden');
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
      h(
        'div',
        { class: 'title-block' },
        h('div', { class: 'title-time' }, morning ? '06:14' : '00:25'),
        h('div', { class: 'title-name' }, t('ui.title')),
        h('div', { class: 'title-sub' }, morning ? t('ui.subtitle_morning') : t('ui.subtitle')),
      ),
      list,
      h('div', { class: 'legal' }, t('ui.legal')),
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
