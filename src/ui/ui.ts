// UI aggregator: HUD, dialogue, hub, panels, overlays, input handling.

import { h, clear } from './dom';
import { t } from '../localization/i18n';
import { DialogueView } from './dialogue';
import { Overlays } from './overlays';
import { Panels } from './panels';
import { MainMenu } from './menu';
import { HubView } from './hub';
import { runMinigame, type MinigameId } from './minigames';
import { audio } from '../audio/audio';
import type { Game } from '../game/game';
import type { Choice } from '../narrative/types';

export class UI {
  root: HTMLElement;
  dialogue: DialogueView;
  overlays: Overlays;
  panels: Panels;
  menu: MainMenu;
  hub: HubView;
  private hud: HTMLElement;
  private clockEl: HTMLElement;
  private quickbar: HTMLElement;
  private autosaveEl: HTMLElement;
  private tapCatcher: HTMLElement;
  private letterboxEl: HTMLElement;
  private clockText: string | null = null;
  private scrim!: HTMLElement;
  private scrimTop!: HTMLElement;

  constructor(
    root: HTMLElement,
    private game: Game,
  ) {
    this.root = root;
    this.letterboxEl = h('div', { class: 'layer letterbox' });
    root.appendChild(this.letterboxEl);
    this.tapCatcher = h('div', { class: 'tap-catcher hidden', style: { zIndex: '3' } });
    root.appendChild(this.tapCatcher);
    this.tapCatcher.addEventListener('click', () => {
      this.game.unlockAudio();
      if (this.game.hidden) {
        this.setHidden(false);
        return;
      }
      this.game.advance();
    });
    this.scrim = h('div', { class: 'scrim' });
    this.scrimTop = h('div', { class: 'scrim top' });
    root.append(this.scrim, this.scrimTop);
    this.dialogue = new DialogueView(root, game);
    this.hub = new HubView(root, game);
    this.clockEl = h('div', { class: 'clock hidden' });
    this.quickbar = h('div', { class: 'quickbar' });
    this.hud = h('div', { class: 'hud hidden' }, this.clockEl, this.quickbar);
    root.appendChild(this.hud);
    this.autosaveEl = h('div', { class: 'autosave-flash' }, t('ui.autosaved'));
    root.appendChild(this.autosaveEl);
    this.overlays = new Overlays(root);
    this.panels = new Panels(root, game);
    this.menu = new MainMenu(root, game, this.panels);
    this.buildQuickBar();
    this.bindKeys();
  }

  // ------------------------------------------------------------ modes

  showMenu() {
    this.scrim.classList.remove('on');
    this.scrimTop.classList.remove('on');
    this.hud.classList.add('hidden');
    this.tapCatcher.classList.add('hidden');
    this.dialogue.hide();
    this.dialogue.hideChoices();
    this.hub.leave();
    this.overlays.clearAll();
    this.panels.closeAll();
    this.setClock(null);
    this.menu.show();
  }

  enterStory() {
    this.menu.hide();
    this.hud.classList.remove('hidden');
    this.tapCatcher.classList.remove('hidden');
    this.hub.leave();
  }

  enterHub() {
    this.scrim.classList.remove('on');
    this.scrimTop.classList.add('on');
    this.hud.classList.add('in-hub');
    this.tapCatcher.classList.add('hidden');
    this.hub.enter();
  }
  leaveHub() {
    this.hud.classList.remove('in-hub');
    this.hub.leave();
    this.tapCatcher.classList.remove('hidden');
  }

  // ------------------------------------------------------------ dialogue

  showLine(key: string, speaker: string, instant: boolean) {
    this.scrim.classList.add('on');
    this.scrimTop.classList.add('on');
    this.dialogue.show(key, speaker, instant);
  }
  hideLine() {
    this.dialogue.hide();
  }
  lineTyping() {
    return this.dialogue.isTyping;
  }
  completeLine() {
    this.dialogue.complete();
  }
  showChoices(id: string, choices: (Choice & { index: number })[]) {
    this.dialogue.showChoices(id, choices);
  }
  hideChoices() {
    this.dialogue.hideChoices();
  }
  setTextboxStyle(s: string) {
    this.dialogue.setStyle(s);
  }

  setClock(time: string | null) {
    this.clockText = time;
    if (!time) {
      this.clockEl.classList.add('hidden');
      return;
    }
    this.clockEl.classList.remove('hidden');
    clear(this.clockEl);
    this.clockEl.append(time, h('small', null, t('ui.studio25')));
  }

  flashAutosave() {
    this.autosaveEl.classList.add('on');
    setTimeout(() => this.autosaveEl.classList.remove('on'), 1400);
  }

  toast(msg: string) {
    this.overlays.toast(msg);
  }

  // ------------------------------------------------------------ overlays

  waitFor(ms: number, done: () => void) {
    this.overlays.waitFor(ms, done);
  }
  playVideo(id: string, done: () => void) {
    this.overlays.playVideo(id, done, `video.${id}`);
  }
  runMinigame(id: MinigameId, done: (score: number) => void) {
    runMinigame(this.root, id, done);
  }
  askName(initial: string, done: (name: string) => void) {
    this.overlays.askName(initial, done);
  }
  chapterCard(id: string, done: () => void) {
    this.overlays.chapterCard(id, done);
  }
  rollCredits(done: () => void) {
    this.overlays.rollCredits(done);
  }

  showPanel(titleKey: string, body: HTMLElement) {
    (this.panels as unknown as { panel(t: string, b: HTMLElement): void }).panel(titleKey, body);
  }
  closePanels() {
    this.panels.closeAll();
  }
  get panelsOpen() {
    return this.panels.open;
  }
  openGameMenu() {
    this.game.unlockAudio();
    this.panels.gameMenu();
  }

  // ------------------------------------------------------------ quick bar

  private buildQuickBar() {
    clear(this.quickbar);
    const btn = (label: string, title: string, fn: () => void, id?: string) => {
      const b = h('button', { class: 'qb', title, 'aria-label': title, onclick: (e: Event) => {
        e.stopPropagation();
        this.game.unlockAudio();
        fn();
      } }, label);
      if (id) b.dataset.id = id;
      this.quickbar.appendChild(b);
      return b;
    };
    const icon = (b: HTMLElement, path: string) => {
      b.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${path}</svg>`;
    };
    icon(btn('', t('qb.auto_title'), () => this.game.setAuto(!this.game.auto), 'auto'), '<path d="M8 5.5v13l10.5-6.5z"/>');
    icon(btn('', t('qb.skip_title'), () => this.game.setSkip(!this.game.skip), 'skip'), '<path d="M4 6v12l8-6zM13 6v12l8-6z"/>');
    icon(btn('', t('qb.log_title'), () => this.panels.backlog()), '<path d="M5 7h14M5 12h14M5 17h9"/>');
    icon(btn('', t('qb.menu_title'), () => this.panels.gameMenu()), '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>');
    this.updateQuickBar();
  }

  updateQuickBar() {
    this.quickbar.querySelector('[data-id="auto"]')?.classList.toggle('on', this.game.auto);
    this.quickbar.querySelector('[data-id="skip"]')?.classList.toggle('on', this.game.skip);
  }

  setHidden(hidden: boolean) {
    this.game.hidden = hidden;
    this.hud.classList.toggle('hidden-ui', hidden);
    this.scrim.classList.toggle('on', !hidden);
    this.dialogue.setHidden(hidden);
  }

  refreshText() {
    this.buildQuickBar();
    this.setClock(this.clockText);
    this.autosaveEl.textContent = t('ui.autosaved');
    this.menu.refresh();
  }

  // ------------------------------------------------------------ input

  private bindKeys() {
    window.addEventListener('keydown', (e) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (this.game.mode === 'menu' || this.game.mode === 'boot') return;
      if (this.panels.open) {
        if (e.key === 'Escape') this.panels.closeTop();
        return;
      }
      switch (e.key) {
        case ' ':
        case 'Enter':
        case 'ArrowDown':
          e.preventDefault();
          if (this.game.mode === 'story') {
            if (this.game.hidden) this.setHidden(false);
            else this.game.advance();
          }
          break;
        case 'Escape':
          if (this.game.hidden) this.setHidden(false);
          else if (this.game.mode === 'story' || this.game.mode === 'hub') this.panels.gameMenu();
          break;
        case 'a':
        case 'A':
          this.game.setAuto(!this.game.auto);
          break;
        case 's':
        case 'S':
          this.game.setSkip(!this.game.skip);
          break;
        case 'l':
        case 'L':
          this.panels.backlog();
          break;
        case 'h':
        case 'H':
          this.setHidden(!this.game.hidden);
          break;
        case 'q':
        case 'Q':
          this.game.save('quick');
          break;
        case 'w':
        case 'W':
          this.game.quickLoad();
          break;
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
          this.dialogue.pickChoice(parseInt(e.key, 10) - 1);
          break;
        case 'Control':
          if (!this.game.skip) this.game.setSkip(true);
          break;
      }
    });
    window.addEventListener('keyup', (e) => {
      if (e.key === 'Control' && this.game.skip) this.game.setSkip(false);
    });
  }

  tick(_dt: number, _now: number) {
    this.hub.tick();
    const lb = this.game.stage.letterboxAmount;
    this.letterboxEl.style.setProperty('--lb', `${Math.round(lb * Math.min(70, window.innerHeight * 0.09))}px`);
    void audio;
  }
}
