// Game controller: owns the story VM, the stage, audio, persistence and the UI
// mode machine (menu / story / hub / minigame / video / credits).

import storyData from '../generated/story.json';
import { Vm, type StoryData, type VmEvent } from '../narrative/vm';
import { isMember, MEMBERS, type CharId } from '../narrative/types';
import { freshRun, type EndingId, type Persistent, type RunState, type Settings } from './state';
import { loadPersistent, savePersistent, writeSlot, readSlot, type SlotId } from '../saves/storage';
import { Stage } from '../rendering/stage';
import { detectQuality, FrameMonitor, type QualityLevel } from '../rendering/quality';
import { audio } from '../audio/audio';
import { currentLang, setVar, t } from '../localization/i18n';
import { hubAutoScene } from './hub-data';
import type { UI } from '../ui/ui';
import { CHARACTERS } from '../characters/characters';

export type Mode = 'boot' | 'menu' | 'story' | 'hub' | 'minigame' | 'video' | 'wait' | 'name' | 'chapter' | 'replay';

const STORY = storyData as unknown as StoryData & { speakers: Record<string, string> };

export class Game {
  persistent: Persistent;
  run: RunState | null = null;
  vm: Vm | null = null;
  stage: Stage;
  mode: Mode = 'boot';
  ui!: UI;
  currentEvent: VmEvent | null = null;
  auto = false;
  skip = false;
  hidden = false;
  /** replaying a memory scene from the archive (no saving, returns to menu at end) */
  replay = false;
  private monitor: FrameMonitor;
  private autoTimer = 0;
  private creditsRolling = false;
  private creditsDone: (() => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.persistent = loadPersistent();
    const q = this.resolveQuality();
    this.stage = new Stage(canvas, q);
    this.monitor = new FrameMonitor(() => {
      if (this.persistent.settings.quality !== 'auto') return;
      const cur = this.stage.profile.level;
      const next: QualityLevel | null = cur === 'high' ? 'medium' : cur === 'medium' ? 'low' : null;
      if (next) this.stage.setQuality(next);
    });
    this.applySettings();
    window.addEventListener('resize', () => this.stage.resize());
    window.addEventListener('orientationchange', () => setTimeout(() => this.stage.resize(), 250));
    document.addEventListener('visibilitychange', () => {
      this.stage.paused = document.hidden;
      audio.setMuted(document.hidden);
    });
  }

  get settings(): Settings {
    return this.persistent.settings;
  }

  resolveQuality(): QualityLevel {
    const s = this.persistent.settings.quality;
    return s === 'auto' ? detectQuality() : s;
  }

  applySettings() {
    const s = this.settings;
    audio.setVolumes({ master: s.masterVol, music: s.musicVol, amb: s.ambVol, sfx: s.sfxVol });
    this.stage.reduceMotion = s.reduceMotion;
    this.stage.reduceCamera = s.reduceCamera;
    const q = this.resolveQuality();
    if (q !== this.stage.profile.level) this.stage.setQuality(q);
    const root = document.documentElement;
    root.style.setProperty('--font-scale', String(s.fontScale));
    root.style.setProperty('--box-alpha', String(s.textboxOpacity));
    root.classList.toggle('reduce-motion', s.reduceMotion);
    root.classList.toggle('high-contrast', s.highContrast);
    root.classList.toggle('dyslexia', s.dyslexiaFont);
    savePersistent(this.persistent);
  }

  // ------------------------------------------------------------ loop

  start() {
    const loop = (now: number) => {
      const dt = this.stage.render();
      if (this.mode !== 'menu' && this.mode !== 'boot' && this.run && !document.hidden) {
        this.run.playtime += dt;
        this.persistent.totalPlaytime += dt;
      }
      this.monitor.tick(dt);
      this.ui.tick(dt, now);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  // ------------------------------------------------------------ flow

  newGame(name: string) {
    this.replay = false;
    this.run = freshRun(name);
    this.persistent.lastPlayerName = name;
    savePersistent(this.persistent);
    setVar('playerName', name);
    this.vm = new Vm(STORY, this.run, this.vmContext());
    this.vm.enterScene('prologue_start');
    this.syncStage(true);
    this.mode = 'story';
    this.ui.enterStory();
    this.step();
  }

  loadRun(run: RunState) {
    this.replay = false;
    this.run = run;
    setVar('playerName', run.playerName);
    this.vm = new Vm(STORY, run, this.vmContext());
    this.syncStage(true);
    this.ui.enterStory();
    if (run.hub) this.enterHub();
    else {
      this.mode = 'story';
      this.step();
    }
  }

  loadSlot(slot: SlotId): boolean {
    const f = readSlot(slot);
    if (!f) return false;
    this.loadRun(f.run);
    this.ui.toast(t('ui.loaded'));
    return true;
  }

  /** Replay a completed memory room / route from the archive (no saving). */
  replayScene(scene: string, member: CharId) {
    const run = freshRun(this.persistent.lastPlayerName || t('ui.you'));
    // generous relationship values so the warmest variants show in replays
    for (const m of MEMBERS) run.rel[m] = { trust: 4, closeness: 4, romance: m === member ? 5 : 1 };
    for (const m of MEMBERS) run.flags[`room_${m}`] = true;
    run.vars.route = member;
    run.vars.drink = 'peach';
    run.vars.snack = 'banana';
    run.vars.seat = 'back';
    run.vars.color = 'blue';
    run.vars.plush = 'whale';
    run.vars.hour = 'night';
    run.vars.homeword = 'people';
    run.vars.music = 'instrumental';
    this.run = run;
    this.replay = true;
    setVar('playerName', run.playerName);
    this.vm = new Vm(STORY, run, this.vmContext());
    this.vm.enterScene(scene);
    this.syncStage(true);
    this.mode = 'story';
    this.ui.enterStory();
    this.step();
  }

  toMenu() {
    this.mode = 'menu';
    this.auto = false;
    this.skip = false;
    this.hidden = false;
    this.vm = null;
    this.run = null;
    this.replay = false;
    this.stage.setShot('wide', []);
    this.stage.setCg(null);
    this.stage.setLetterbox(false);
    this.stage.setTint();
    this.stage.syncCharacters([]);
    this.ui.showMenu();
  }

  private vmContext() {
    return {
      endings: () => this.persistent.endings as string[],
      trueEnding: () => this.persistent.trueEnding,
      apply: (n: string, a: string[], kv: Record<string, string>) => this.applyCmd(n, a, kv),
    };
  }

  /** Run the VM until it blocks and dispatch the event. */
  step() {
    if (!this.vm || !this.run) return;
    let ev: VmEvent;
    try {
      ev = this.vm.run();
    } catch (e) {
      console.error(e);
      this.ui.toast(`Story error: ${(e as Error).message}`);
      this.toMenu();
      return;
    }
    this.currentEvent = ev;
    switch (ev.type) {
      case 'say':
      case 'nar': {
        const key = ev.key;
        const seen = !!this.persistent.seen[key];
        this.persistent.seen[key] = 1;
        const speaker = ev.type === 'say' ? ev.speaker : 'narration';
        if (ev.type === 'say' && this.run.stage.textbox !== 'phone') this.ensureOnStage(ev.speaker, ev.expr);
        this.stage.focus(ev.type === 'say' && isMember(ev.speaker) ? ev.speaker : null);
        this.ui.showLine(key, speaker, this.skip && (seen || this.settings.skipUnseen));
        if (this.skip && (seen || this.settings.skipUnseen)) {
          setTimeout(() => {
            if (this.skip && this.currentEvent === ev) this.advance();
          }, 45);
        }
        break;
      }
      case 'menu':
        this.auto = false;
        this.skip = false;
        this.ui.updateQuickBar();
        this.stage.focus(null);
        this.ui.showChoices(ev.id, ev.choices);
        break;
      case 'cmd':
        this.handleBlocking(ev.name, ev.args, ev.kv);
        break;
      case 'end':
        this.onEnd();
        break;
    }
  }

  private onEnd() {
    if (this.creditsRolling) {
      this.creditsDone = () => this.toMenu();
      this.ui.hideLine();
      return;
    }
    if (this.replay) {
      this.toMenu();
      return;
    }
    // a scene ending without @hub / @credits means the story ran out: return to hub if we were in one
    if (this.run?.hub) {
      this.enterHub();
      return;
    }
    this.toMenu();
  }

  advance() {
    if (!this.vm || this.mode !== 'story') return;
    const ev = this.currentEvent;
    if (!ev || (ev.type !== 'say' && ev.type !== 'nar')) return;
    if (this.ui.lineTyping() && !this.skip) {
      this.ui.completeLine();
      return;
    }
    this.vm.advance();
    this.step();
  }

  choose(index: number) {
    if (!this.vm || !this.run) return;
    const ev = this.currentEvent;
    if (!ev || ev.type !== 'menu') return;
    this.persistent.seenChoices[`${ev.id}:${index}`] = 1;
    this.vm.choose(index);
    this.ui.hideChoices();
    this.step();
  }

  /** Called by the UI when a line finished typing (for auto mode). */
  onLineComplete(key: string) {
    if (!this.auto) return;
    const len = (t(key) || '').length;
    const delay = this.settings.autoDelay * 1000 + len * 28;
    clearTimeout(this.autoTimer);
    this.autoTimer = window.setTimeout(() => {
      if (this.auto && this.mode === 'story' && this.currentEvent && (this.currentEvent.type === 'say' || this.currentEvent.type === 'nar')) this.advance();
    }, delay);
  }

  setAuto(on: boolean) {
    this.auto = on;
    if (on) this.skip = false;
    if (on && this.currentEvent && !this.ui.lineTyping() && (this.currentEvent.type === 'say' || this.currentEvent.type === 'nar')) this.onLineComplete(this.currentEvent.key);
    if (!on) clearTimeout(this.autoTimer);
    this.ui.updateQuickBar();
  }

  setSkip(on: boolean) {
    this.skip = on;
    if (on) {
      this.auto = false;
      clearTimeout(this.autoTimer);
      const ev = this.currentEvent;
      if (ev && (ev.type === 'say' || ev.type === 'nar') && this.mode === 'story') {
        const seen = !!this.persistent.seen[ev.key];
        if (seen || this.settings.skipUnseen) this.advance();
      }
    }
    this.ui.updateQuickBar();
  }

  // ------------------------------------------------------------ commands

  private ensureOnStage(speaker: string, expr?: string) {
    if (!this.run || !isMember(speaker)) return;
    const chars = this.run.stage.chars;
    const existing = chars.find((c) => c.id === speaker);
    if (existing) {
      if (expr) existing.expr = expr;
      // move to front of recency
      chars.splice(chars.indexOf(existing), 1);
      chars.push(existing);
    } else {
      if (chars.length >= 3) chars.shift();
      const used = new Set(chars.map((c) => c.at));
      const at = ['c', 'l', 'r', 'fl', 'fr'].find((s) => !used.has(s)) ?? 'c';
      chars.push({ id: speaker, expr: expr ?? 'neutral', at });
    }
    this.stage.syncCharacters(chars);
  }

  /** Non-blocking command side-effects (state already mutated by the VM). */
  private applyCmd(n: string, a: string[], kv: Record<string, string>) {
    if (!this.run) return;
    const sg = this.run.stage;
    switch (n) {
      case 'bg':
        this.stage.setBackground(sg.bg, (kv.t as 'fade') ?? 'fade', kv.d ? parseFloat(kv.d) : 1.2, kv.tint);
        this.stage.setCg(null);
        this.stage.syncCharacters(sg.chars);
        this.ui.setTextboxStyle(sg.textbox);
        break;
      case 'show':
      case 'hide':
      case 'move':
      case 'expr':
        this.stage.syncCharacters(sg.chars);
        break;
      case 'cam':
        this.stage.setShot(sg.cam, sg.camArgs.filter(isMember));
        break;
      case 'music':
        audio.playMusic(sg.music);
        if (sg.music) this.unlock('music', sg.music, true);
        break;
      case 'amb':
        audio.playAmb(sg.amb);
        break;
      case 'sfx':
        audio.sfx(a[0]);
        break;
      case 'fx':
        this.stage.setFx(sg.fx, sg.fxN);
        break;
      case 'cg':
        this.stage.setCg(sg.cg);
        if (sg.cg) this.unlock('cg', sg.cg, true);
        break;
      case 'time':
        this.ui.setClock(sg.time);
        break;
      case 'letterbox':
        this.stage.setLetterbox(sg.letterbox);
        break;
      case 'textbox':
        this.ui.setTextboxStyle(sg.textbox);
        break;
      case 'shake':
        this.stage.shake(a[0] ? parseFloat(a[0]) : 1);
        break;
      case 'flash':
        this.stage.doFlash();
        break;
      case 'unlock': {
        const [kind, id] = a[0].split(':');
        this.unlock(kind as 'cg', id, false);
        break;
      }
      case 'autosave':
        this.autosave();
        break;
      case 'menu_morning':
        break;
    }
  }

  unlock(kind: 'cg' | 'memory' | 'music' | 'cinematic', id: string, silent: boolean) {
    if (this.replay) return;
    const list = this.persistent.unlocked[kind];
    if (list.includes(id)) return;
    list.push(id);
    savePersistent(this.persistent);
    if (!silent) this.ui.toast(t(`ui.unlocked_${kind}`));
  }

  private handleBlocking(n: string, a: string[], kv: Record<string, string>) {
    if (!this.run) return;
    switch (n) {
      case 'wait': {
        const ms = parseFloat(a[0] || '1') * 1000;
        this.mode = 'wait';
        this.ui.hideLine();
        this.ui.waitFor(this.skip ? 40 : ms, () => this.resumeStory('wait'));
        break;
      }
      case 'video':
        this.mode = 'video';
        this.ui.hideLine();
        this.unlock('cinematic', a[0], true);
        this.ui.playVideo(a[0], () => this.resumeStory('video'));
        break;
      case 'minigame':
        this.mode = 'minigame';
        this.ui.hideLine();
        this.ui.runMinigame(a[0] as 'rhythm' | 'sketch', (score) => {
          if (this.run) this.run.vars.minigame_score = score;
          this.resumeStory('minigame');
        });
        break;
      case 'name':
        this.mode = 'name';
        this.ui.askName(this.run.playerName || this.persistent.lastPlayerName, (name) => {
          if (this.run) {
            this.run.playerName = name;
            this.persistent.lastPlayerName = name;
            savePersistent(this.persistent);
            setVar('playerName', name);
          }
          this.resumeStory('name');
        });
        break;
      case 'chapter':
        this.mode = 'chapter';
        this.ui.hideLine();
        this.ui.chapterCard(a[0], () => this.resumeStory('chapter'));
        break;
      case 'ending':
        this.recordEnding(a[0] as EndingId);
        this.resumeStory();
        break;
      case 'credits':
        this.creditsRolling = true;
        this.ui.rollCredits(() => {
          this.creditsRolling = false;
          const done = this.creditsDone;
          this.creditsDone = null;
          done?.();
        });
        this.resumeStory();
        break;
      case 'hub':
        this.enterHub();
        break;
      default:
        this.resumeStory();
    }
    void kv;
  }

  /** `from` = the blocking mode that is finishing; stale callbacks (after a load / menu) are ignored. */
  private resumeStory(from?: Mode) {
    if (!this.vm) return;
    if (from && this.mode !== from) return;
    this.mode = 'story';
    this.step();
  }

  recordEnding(id: EndingId) {
    if (this.replay) return;
    if (this.run) this.run.ending = id;
    if (!this.persistent.endings.includes(id)) this.persistent.endings.push(id);
    if (id === 'true') this.persistent.trueEnding = true;
    savePersistent(this.persistent);
    this.ui.toast(t('ui.ending_unlocked'));
  }

  get allRomanceEndingsDone() {
    return MEMBERS.every((m) => (this.persistent.endings as string[]).some((e) => e.split('_')[0] === m));
  }

  // ------------------------------------------------------------ hub

  enterHub() {
    if (!this.run || !this.vm) return;
    const autoScene = hubAutoScene(this.run);
    if (autoScene) {
      this.vm.enterScene(autoScene);
      this.run.hub = null;
      this.mode = 'story';
      this.step();
      return;
    }
    this.mode = 'hub';
    this.auto = false;
    this.skip = false;
    this.currentEvent = null;
    this.ui.hideLine();
    this.ui.hideChoices();
    // hub staging
    this.run.stage.chars = [];
    this.run.stage.cg = null;
    this.run.stage.cam = 'wide';
    this.run.stage.camArgs = [];
    this.run.stage.letterbox = false;
    this.run.stage.textbox = 'normal';
    this.run.stage.bg = 'studio_lobby';
    if (!this.run.stage.music || this.run.stage.music === 'stop') this.run.stage.music = 'studio';
    this.run.stage.amb = 'room';
    this.run.stage.fx = 'dust';
    this.run.stage.fxN = 0.5;
    this.syncStage(false);
    this.autosave();
    this.ui.enterHub();
  }

  /** Player tapped a spot / door in the hub. */
  runHubScene(scene: string) {
    if (!this.run || !this.vm) return;
    if (!STORY.scenes[scene]) {
      this.ui.toast(t('ui.scene_missing'));
      return;
    }
    this.ui.leaveHub();
    this.run.hub = null;
    this.run.stage.chars = [];
    this.stage.syncCharacters([]);
    this.stage.setHubScroll(0);
    this.vm.enterScene(scene);
    this.mode = 'story';
    this.step();
  }

  // ------------------------------------------------------------ stage sync

  syncStage(full: boolean) {
    if (!this.run) return;
    const sg = this.run.stage;
    this.stage.setBackground(sg.bg, full ? 'cut' : 'fade', 0.8);
    this.stage.setCg(sg.cg);
    this.stage.syncCharacters(sg.chars);
    this.stage.setShot(sg.cam, sg.camArgs.filter(isMember));
    this.stage.setFx(sg.fx, sg.fxN);
    this.stage.setLetterbox(sg.letterbox);
    audio.playMusic(sg.music);
    audio.playAmb(sg.amb);
    this.ui.setClock(sg.time);
    this.ui.setTextboxStyle(sg.textbox);
  }

  // ------------------------------------------------------------ saves

  private lineInfo(): { key: string | null; speaker: string | null } {
    const ev = this.currentEvent;
    if (ev && (ev.type === 'say' || ev.type === 'nar')) return { key: ev.key, speaker: ev.type === 'say' ? ev.speaker : 'narration' };
    return { key: null, speaker: null };
  }

  save(slot: SlotId, quiet = false) {
    if (!this.run || this.replay) return false;
    const { key, speaker } = this.lineInfo();
    writeSlot(slot, this.run, key, speaker);
    savePersistent(this.persistent);
    if (!quiet) this.ui.toast(slot === 'quick' ? t('ui.quicksaved') : t('ui.saved'));
    return true;
  }

  autosave() {
    if (!this.run || this.replay) return;
    this.save('auto', true);
    this.ui.flashAutosave();
  }

  quickLoad() {
    if (!this.loadSlot('quick')) this.ui.toast(t('ui.no_quicksave'));
  }

  /** Called on language change: re-render current line/choices. */
  onLanguageChanged() {
    setVar('playerName', this.run?.playerName ?? '');
    this.ui.refreshText();
    if (this.mode === 'story' && this.currentEvent) {
      const ev = this.currentEvent;
      if (ev.type === 'say' || ev.type === 'nar') this.ui.showLine(ev.key, ev.type === 'say' ? ev.speaker : 'narration', true);
      if (ev.type === 'menu') this.ui.showChoices(ev.id, ev.choices);
    }
    document.title = t('ui.title_full');
    void currentLang;
  }

  memberName(id: CharId) {
    return t(`name.${id}`);
  }

  characterColor(id: string) {
    return isMember(id) ? CHARACTERS[id].color : '#c9c2ff';
  }

  speakerFor(key: string): string {
    return STORY.speakers[key] ?? 'narration';
  }

  hasScene(id: string) {
    return !!STORY.scenes[id];
  }

  unlockAudio() {
    audio.unlock();
  }
}
