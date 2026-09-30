// Modal panels: settings, save/load, backlog, memory archive, language picker, confirm.

import { h, clear, fmtDate, fmtTime, richText } from './dom';
import { currentLang, loadLang, speakerName, t } from '../localization/i18n';
import { LANGS, type Lang, type Settings } from '../game/state';
import { allSlotIds, deleteSlot, exportAll, importAll, listSlots, readSlot, savePersistent } from '../saves/storage';
import { paintBackground, paintCg } from '../rendering/placeholder';
import { hasAsset, assetUrl } from '../rendering/assets';
import { CG_IDS, MUSIC_IDS, MUSIC_TITLES, VIDEO_IDS } from '../scenes/manifest';
import { MEMBERS, type CharId } from '../narrative/types';
import { CHARACTERS, accentFor } from '../characters/characters';
import { audio } from '../audio/audio';
import type { Game } from '../game/game';

export const LANG_LABELS: Record<Lang, string> = { en: 'English', ko: '한국어', ja: '日本語', 'zh-CN': '简体中文' };

export class Panels {
  root: HTMLElement;
  private stack: HTMLElement[] = [];
  constructor(
    parent: HTMLElement,
    private game: Game,
  ) {
    this.root = h('div', { class: 'layer', style: { zIndex: '25' } });
    parent.appendChild(this.root);
  }

  get open() {
    return this.stack.length > 0;
  }

  closeTop() {
    const el = this.stack.pop();
    el?.remove();
  }
  closeAll() {
    while (this.stack.length) this.closeTop();
  }

  private panel(titleKey: string, body: HTMLElement, extraHead?: HTMLElement): HTMLElement {
    const el = h(
      'div',
      { class: 'overlay', role: 'dialog', 'aria-label': t(titleKey) },
      h(
        'div',
        { class: 'panel-head' },
        h('h2', null, t(titleKey)),
        h('div', { class: 'row' }, extraHead, h('button', { class: 'icon-btn', 'aria-label': t('ui.close'), onclick: () => this.closeTop() }, '✕')),
      ),
      body,
    );
    this.root.appendChild(el);
    this.stack.push(el);
    return el;
  }

  confirm(msg: string, onYes: () => void, danger = false) {
    const el = h(
      'div',
      { class: 'overlay transparent', style: { justifyContent: 'center', alignItems: 'center', zIndex: '30' } },
      h(
        'div',
        { style: { background: 'rgba(14,16,44,0.95)', padding: '22px', borderRadius: '16px', maxWidth: '360px', textAlign: 'center' } },
        h('p', { style: { margin: '0 0 18px', lineHeight: '1.5' } }, msg),
        h(
          'div',
          { class: 'row', style: { justifyContent: 'center' } },
          h('button', { class: 'btn', onclick: () => this.closeTop() }, t('ui.cancel')),
          h(
            'button',
            {
              class: `btn ${danger ? 'danger' : 'primary'}`,
              onclick: () => {
                this.closeTop();
                onYes();
              },
            },
            t('ui.confirm'),
          ),
        ),
      ),
    );
    this.root.appendChild(el);
    this.stack.push(el);
  }

  // ------------------------------------------------------------ settings

  settings() {
    const s = this.game.settings;
    const body = h('div', { class: 'panel-body' });
    const apply = () => this.game.applySettings();

    const slider = (labelKey: string, key: keyof Settings, min: number, max: number, step: number, fmt?: (v: number) => string) => {
      const input = h('input', { type: 'range', min: String(min), max: String(max), step: String(step), value: String(s[key]) }) as HTMLInputElement;
      const val = h('span', { class: 'muted small', style: { minWidth: '38px', textAlign: 'right' } }, fmt ? fmt(Number(s[key])) : String(s[key]));
      input.addEventListener('input', () => {
        (s as unknown as Record<string, unknown>)[key] = Number(input.value);
        val.textContent = fmt ? fmt(Number(input.value)) : input.value;
        apply();
      });
      input.addEventListener('change', () => audio.sfx('click'));
      return h('div', { class: 'setting' }, h('label', null, t(labelKey)), h('div', { class: 'row' }, input, val));
    };
    const toggle = (labelKey: string, key: keyof Settings, descKey?: string) => {
      const btn = h('button', { class: `toggle${s[key] ? ' on' : ''}`, role: 'switch', 'aria-checked': String(!!s[key]), 'aria-label': t(labelKey) });
      btn.addEventListener('click', () => {
        (s as unknown as Record<string, unknown>)[key] = !s[key];
        btn.classList.toggle('on', !!s[key]);
        btn.setAttribute('aria-checked', String(!!s[key]));
        apply();
      });
      return h('div', { class: 'setting' }, h('label', null, t(labelKey), descKey && h('span', { class: 'desc' }, t(descKey))), btn);
    };
    const seg = <T extends string>(labelKey: string, key: keyof Settings, options: [T, string][]) => {
      const wrap = h('div', { class: 'seg' });
      const render = () => {
        clear(wrap);
        for (const [v, label] of options)
          wrap.appendChild(
            h(
              'button',
              {
                class: s[key] === v ? 'on' : '',
                onclick: () => {
                  (s as unknown as Record<string, unknown>)[key] = v;
                  render();
                  apply();
                },
              },
              label,
            ),
          );
      };
      render();
      return h('div', { class: 'setting' }, h('label', null, t(labelKey)), wrap);
    };

    body.append(
      h('div', { class: 'section-title' }, t('settings.language')),
      this.langRow(),
      h('div', { class: 'section-title' }, t('settings.text')),
      slider('settings.text_speed', 'textSpeed', 0, 120, 5, (v) => (v === 0 ? t('settings.instant') : `${v}`)),
      slider('settings.auto_delay', 'autoDelay', 0.4, 4, 0.2, (v) => `${v.toFixed(1)}s`),
      toggle('settings.skip_unseen', 'skipUnseen', 'settings.skip_unseen_desc'),
      slider('settings.font_size', 'fontScale', 0.85, 1.4, 0.05, (v) => `${Math.round(v * 100)}%`),
      slider('settings.box_opacity', 'textboxOpacity', 0.4, 1, 0.05, (v) => `${Math.round(v * 100)}%`),
      h('div', { class: 'section-title' }, t('settings.audio')),
      slider('settings.master', 'masterVol', 0, 1, 0.05, (v) => `${Math.round(v * 100)}%`),
      slider('settings.music', 'musicVol', 0, 1, 0.05, (v) => `${Math.round(v * 100)}%`),
      slider('settings.ambience', 'ambVol', 0, 1, 0.05, (v) => `${Math.round(v * 100)}%`),
      slider('settings.sfx', 'sfxVol', 0, 1, 0.05, (v) => `${Math.round(v * 100)}%`),
      h('div', { class: 'section-title' }, t('settings.display')),
      seg('settings.quality', 'quality', [
        ['auto', t('settings.q_auto')],
        ['high', t('settings.q_high')],
        ['medium', t('settings.q_medium')],
        ['low', t('settings.q_low')],
      ]),
      toggle('settings.reduce_motion', 'reduceMotion', 'settings.reduce_motion_desc'),
      toggle('settings.reduce_camera', 'reduceCamera', 'settings.reduce_camera_desc'),
      toggle('settings.high_contrast', 'highContrast'),
      toggle('settings.dyslexia', 'dyslexiaFont'),
      h('div', { class: 'section-title' }, t('settings.data')),
      h(
        'div',
        { class: 'row', style: { padding: '8px 4px' } },
        h('button', { class: 'btn small', onclick: () => this.exportSaves() }, t('settings.export')),
        h('button', { class: 'btn small', onclick: () => this.importSaves() }, t('settings.import')),
        h(
          'button',
          {
            class: 'btn small danger',
            onclick: () =>
              this.confirm(
                t('settings.reset_confirm'),
                () => {
                  import('../saves/storage').then((m) => {
                    m.wipeAll();
                    location.reload();
                  });
                },
                true,
              ),
          },
          t('settings.reset'),
        ),
      ),
      h('p', { class: 'muted small', style: { padding: '8px 4px' } }, t('settings.save_note')),
      h('p', { class: 'muted small', style: { padding: '0 4px' } }, t('ui.legal')),
    );
    this.panel('settings.title', body);
  }

  langRow() {
    const row = h('div', { class: 'lang-row' });
    for (const l of LANGS) {
      row.appendChild(
        h(
          'button',
          {
            class: `lang-btn${currentLang() === l ? ' on' : ''}`,
            onclick: async () => {
              await this.setLanguage(l);
              row.querySelectorAll('.lang-btn').forEach((b, i) => b.classList.toggle('on', LANGS[i] === l));
              // rebuild the panel so labels update
              this.closeTop();
              this.settings();
            },
          },
          LANG_LABELS[l],
        ),
      );
    }
    return row;
  }

  async setLanguage(l: Lang) {
    await loadLang(l);
    this.game.persistent.language = l;
    savePersistent(this.game.persistent);
    this.game.onLanguageChanged();
  }

  private exportSaves() {
    const bundle = exportAll(this.game.persistent);
    const blob = new Blob([JSON.stringify(bundle, null, 1)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = h('a', { href: url, download: `stay-until-morning-save-${new Date().toISOString().slice(0, 10)}.json` });
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    this.game.ui.toast(t('settings.exported'));
  }

  private importSaves() {
    const input = h('input', { type: 'file', accept: 'application/json,.json', style: { display: 'none' } }) as HTMLInputElement;
    input.addEventListener('change', async () => {
      const f = input.files?.[0];
      if (!f) return;
      try {
        const text = await f.text();
        this.game.persistent = importAll(text);
        this.game.applySettings();
        if (this.game.persistent.language) await this.setLanguage(this.game.persistent.language);
        this.game.ui.toast(t('settings.imported'));
        this.closeAll();
        this.game.toMenu();
      } catch {
        this.game.ui.toast(t('settings.import_failed'));
      }
    });
    document.body.appendChild(input);
    input.click();
    setTimeout(() => input.remove(), 60000);
  }

  // ------------------------------------------------------------ saves

  saves(mode: 'save' | 'load') {
    const body = h('div', { class: 'panel-body' });
    const render = () => {
      clear(body);
      const slots = listSlots();
      for (const id of allSlotIds()) {
        const meta = slots[id];
        const label = id === 'auto' ? t('saves.auto') : id === 'quick' ? t('saves.quick') : `${t('saves.slot')} ${id}`;
        const canWrite = mode === 'save' && id !== 'auto';
        const canRead = mode === 'load' && !!meta;
        const thumb = h('div', { class: 'thumb' });
        if (meta) {
          const c = paintBackground(meta.bg ?? 'studio_lobby');
          c.style.width = '100%';
          c.style.height = '100%';
          thumb.appendChild(c);
        }
        const info = h(
          'div',
          { class: 'info' },
          h('b', null, label),
          meta
            ? [
                h('span', null, meta.lineKey ? this.previewLine(meta.lineKey, meta.speaker) : t(`chapter.${meta.chapter ?? 'prologue'}.title`)),
                h('span', null, `${meta.time ? meta.time + ' · ' : ''}${fmtDate(meta.savedAt, currentLang())} · ${fmtTime(meta.playtime)}`),
              ]
            : h('span', null, t('saves.empty')),
        );
        const btn = h(
          'button',
          {
            class: `slot${meta ? '' : ' empty'}`,
            disabled: !(canWrite || canRead),
            onclick: () => {
              if (mode === 'save') {
                const doSave = () => {
                  this.game.save(id);
                  render();
                };
                if (meta) this.confirm(t('saves.overwrite_confirm'), doSave);
                else doSave();
              } else {
                this.closeAll();
                this.game.loadSlot(id);
              }
            },
          },
          thumb,
          info,
        );
        const del = meta
          ? h(
              'button',
              {
                class: 'del',
                'aria-label': t('saves.delete'),
                onclick: (e: Event) => {
                  e.stopPropagation();
                  this.confirm(
                    t('saves.delete_confirm'),
                    () => {
                      deleteSlot(id);
                      render();
                    },
                    true,
                  );
                },
              },
              t('saves.delete'),
            )
          : null;
        body.appendChild(h('div', { class: 'row', style: { alignItems: 'stretch', gap: '4px' } }, btn, del));
      }
    };
    render();
    this.panel(mode === 'save' ? 'saves.title_save' : 'saves.title_load', body);
  }

  private previewLine(key: string, speaker: string | null) {
    const text = t(key).replace(/\{p\}/g, '').replace(/\*/g, '');
    const who = speaker && speaker !== 'narration' ? `${speakerName(speaker)}: ` : '';
    return (who + text).slice(0, 80);
  }

  hasAnySave() {
    return allSlotIds().some((id) => !!readSlot(id));
  }

  // ------------------------------------------------------------ backlog

  backlog() {
    const body = h('div', { class: 'panel-body' });
    const entries = this.game.run?.backlog ?? [];
    if (!entries.length) body.appendChild(h('p', { class: 'muted' }, t('log.empty')));
    for (const e of entries.slice(-120)) {
      const cls = e.s === 'choice' ? 'choice' : e.s === 'narration' ? 'narration' : '';
      const el = h('div', { class: `log-entry ${cls}` });
      if (e.s !== 'choice' && e.s !== 'narration') {
        const b = h('b', null, speakerName(e.s));
        b.style.color = accentFor(e.s);
        el.appendChild(b);
      }
      if (e.s === 'choice') el.appendChild(h('b', null, t('log.choice')));
      el.appendChild(richText(t(e.k).replace(/\{p\}/g, '')));
      body.appendChild(el);
    }
    this.panel('log.title', body);
    requestAnimationFrame(() => (body.scrollTop = body.scrollHeight));
  }

  // ------------------------------------------------------------ archive

  archive() {
    const p = this.game.persistent;
    const body = h('div', { class: 'panel-body' });
    const tabs = h('div', { class: 'tabs' });
    const content = h('div');
    const tabDefs: [string, () => HTMLElement][] = [
      ['archive.tab_progress', () => this.archiveProgress()],
      ['archive.tab_memories', () => this.archiveMemories()],
      ['archive.tab_gallery', () => this.archiveGallery()],
      ['archive.tab_music', () => this.archiveMusic()],
    ];
    if (p.trueEnding) tabDefs.push(['archive.tab_newmem', () => this.archiveNewMemories()]);
    let active = 0;
    const render = () => {
      clear(tabs);
      tabDefs.forEach(([k, fn], i) => {
        tabs.appendChild(
          h(
            'button',
            {
              class: `tab${i === active ? ' on' : ''}`,
              onclick: () => {
                active = i;
                render();
              },
            },
            t(k),
          ),
        );
        if (i === active) {
          clear(content);
          content.appendChild(fn());
        }
      });
    };
    render();
    body.append(tabs, content);
    this.panel('archive.title', body);
  }

  private archiveProgress() {
    const p = this.game.persistent;
    const wrap = h('div');
    const romance = MEMBERS.filter((m) => p.endings.includes(m)).length;
    const pct = Math.round(((romance + (p.endings.includes('friendship') ? 1 : 0) + (p.trueEnding ? 1 : 0)) / 10) * 100);
    wrap.append(
      h('p', { class: 'muted' }, t('archive.progress_desc')),
      h('div', { class: 'progress' }, h('i', { style: { width: `${pct}%` } })),
      h('div', { class: 'section-title' }, t('archive.endings')),
      h(
        'div',
        { class: 'ending-symbols' },
        ...MEMBERS.map((m) => h('span', { class: p.endings.includes(m) ? 'on' : '', title: t(`name.${m}`) }, CHARACTERS[m].symbol)),
        h('span', { class: p.endings.includes('friendship') ? 'on' : '', title: t('ending.friendship') }, '📷'),
        h('span', { class: p.trueEnding ? 'on' : '', title: t('ending.true') }, '🌅'),
      ),
    );
    const list = h('div');
    for (const m of MEMBERS) {
      const done = p.endings.includes(m);
      list.appendChild(
        h(
          'div',
          { class: 'card wide' },
          h('div', { class: 'badge' }, CHARACTERS[m].symbol),
          h('div', { class: 'grow' }, h('b', null, t(`name.${m}`)), h('div', { class: 'muted small' }, done ? t(`route.${m}`) : t('archive.locked_ending'))),
        ),
      );
    }
    list.appendChild(
      h('div', { class: 'card wide' }, h('div', { class: 'badge' }, '📷'), h('div', { class: 'grow' }, h('b', null, t('ending.friendship')), h('div', { class: 'muted small' }, p.endings.includes('friendship') ? t('archive.seen') : t('archive.locked_ending')))),
    );
    list.appendChild(
      h(
        'div',
        { class: 'card wide' },
        h('div', { class: 'badge' }, '🌅'),
        h('div', { class: 'grow' }, h('b', null, t('ending.true')), h('div', { class: 'muted small' }, p.trueEnding ? t('archive.seen') : romance >= 8 ? t('archive.true_hint_ready') : t('archive.true_hint', { n: 8 - romance }))),
      ),
    );
    wrap.appendChild(list);
    wrap.appendChild(h('p', { class: 'muted small', style: { marginTop: '14px' } }, t('archive.playtime', { time: fmtTime(p.totalPlaytime) })));
    return wrap;
  }

  private archiveMemories() {
    const p = this.game.persistent;
    const grid = h('div', { class: 'grid2' });
    for (const m of MEMBERS) {
      const unlocked = p.unlocked.memory.includes(m);
      const routeDone = p.endings.includes(m);
      const art = h('div', { class: `art${unlocked ? '' : ' locked'}` }, CHARACTERS[m].symbol);
      if (unlocked) {
        const c = paintCg(`cg_${m}_moment`);
        art.appendChild(c);
      }
      const cap = h('div', { class: 'cap' }, h('b', null, t(`name.${m}`)), h('span', null, unlocked ? t(`route.${m}`) : t('archive.locked_memory')));
      const actions = h('div', { class: 'row', style: { padding: '0 8px 10px', gap: '6px' } });
      if (unlocked)
        actions.appendChild(
          h(
            'button',
            {
              class: 'btn small',
              onclick: () => {
                this.closeAll();
                this.game.replayScene(`${m}_room`, m);
              },
            },
            t('archive.replay_room'),
          ),
        );
      if (routeDone)
        actions.appendChild(
          h(
            'button',
            {
              class: 'btn small',
              onclick: () => {
                this.closeAll();
                this.game.replayScene(`${m}_route`, m);
              },
            },
            t('archive.replay_route'),
          ),
        );
      grid.appendChild(h('div', { class: 'card' }, art, cap, actions));
    }
    return grid;
  }

  private archiveGallery() {
    const p = this.game.persistent;
    const grid = h('div', { class: 'grid2' });
    const items: { id: string; kind: 'cg' | 'video' }[] = [
      ...CG_IDS.map((id) => ({ id, kind: 'cg' as const })),
      ...VIDEO_IDS.map((id) => ({ id, kind: 'video' as const })),
    ];
    for (const it of items) {
      const unlocked = it.kind === 'cg' ? p.unlocked.cg.includes(it.id) : p.unlocked.cinematic.includes(it.id);
      const art = h('div', { class: `art${unlocked ? '' : ' locked'}` }, unlocked ? '' : '·');
      if (unlocked) {
        const cgId = it.kind === 'cg' ? it.id : it.id === 'vid_opening' ? 'cg_echo' : it.id === 'vid_true' ? 'cg_true_breakfast' : it.id.replace('vid_', 'cg_') + '_moment';
        const file = `assets/cg/${cgId}.webp`;
        art.appendChild(hasAsset(file) ? h('img', { src: assetUrl(file), alt: '' }) : paintCg(cgId));
        if (it.kind === 'video') art.appendChild(h('span', { style: { position: 'relative', fontSize: '28px', textShadow: '0 2px 12px #000' } }, '▶'));
      }
      const card = h(
        'button',
        {
          class: 'card',
          disabled: !unlocked,
          onclick: () => {
            if (it.kind === 'cg') this.viewCg(it.id);
            else this.game.ui.playVideo(it.id, () => undefined);
          },
        },
        art,
        h('div', { class: 'cap' }, h('b', null, t(`gallery.${it.id}`)), h('span', null, unlocked ? '' : t('archive.locked'))),
      );
      grid.appendChild(card);
    }
    return grid;
  }

  private viewCg(id: string) {
    const file = `assets/cg/${id}.webp`;
    const el = h('div', { class: 'cg-view' }, hasAsset(file) ? h('img', { src: assetUrl(file), alt: t(`gallery.${id}`) }) : paintCg(id));
    el.addEventListener('click', () => el.remove());
    this.root.appendChild(el);
  }

  private archiveMusic() {
    const p = this.game.persistent;
    const list = h('div');
    for (const id of MUSIC_IDS) {
      const unlocked = p.unlocked.music.includes(id) || id === 'title_night';
      const playing = audio.current === id;
      list.appendChild(
        h(
          'button',
          {
            class: 'card wide',
            style: { width: '100%' },
            disabled: !unlocked,
            onclick: () => {
              this.game.unlockAudio();
              audio.playMusic(audio.current === id ? 'title_night' : id);
              this.closeTop();
              this.archive();
            },
          },
          h('div', { class: 'badge' }, playing ? '▮▮' : unlocked ? '▶' : '·'),
          h('div', { class: 'grow' }, h('b', null, unlocked ? MUSIC_TITLES[id] : '— — —'), h('div', { class: 'muted small' }, unlocked ? t('archive.track') : t('archive.locked'))),
        ),
      );
    }
    return list;
  }

  private archiveNewMemories() {
    const grid = h('div', { class: 'grid2' });
    const items: { scene: string; member: CharId | null; symbol: string; label: string }[] = MEMBERS.map((m) => ({
      scene: `${m}_newmem`,
      member: m,
      symbol: CHARACTERS[m].symbol,
      label: t(`name.${m}`),
    }));
    items.push({ scene: 'newmem_group', member: null, symbol: '🍳', label: t('archive.newmem_group') });
    for (const it of items) {
      grid.appendChild(
        h(
          'button',
          {
            class: 'card wide',
            onclick: () => {
              this.closeAll();
              this.game.replayScene(it.scene, it.member ?? 'hamin');
            },
          },
          h('div', { class: 'badge' }, it.symbol),
          h('div', { class: 'grow' }, h('b', null, it.label), h('div', { class: 'muted small' }, t('archive.newmem_desc'))),
        ),
      );
    }
    return h('div', null, h('p', { class: 'muted' }, t('archive.newmem_intro')), grid);
  }

  // ------------------------------------------------------------ first launch

  firstLaunch(done: () => void) {
    const el = h(
      'div',
      { class: 'overlay first-launch', style: { zIndex: '50' } },
      h('h1', null, '00:25'),
      h('p', { class: 'muted' }, 'Choose your language · 언어를 선택하세요 · 言語を選んでください · 请选择语言'),
      h(
        'div',
        { class: 'lang-grid' },
        ...LANGS.map((l) =>
          h(
            'button',
            {
              class: 'btn',
              onclick: async () => {
                this.game.unlockAudio();
                await this.setLanguage(l);
                this.game.persistent.firstLaunchDone = true;
                savePersistent(this.game.persistent);
                el.remove();
                this.stack = this.stack.filter((x) => x !== el);
                done();
              },
            },
            LANG_LABELS[l],
          ),
        ),
      ),
    );
    this.root.appendChild(el);
    this.stack.push(el);
  }

  // ------------------------------------------------------------ in-game menu

  gameMenu() {
    const body = h('div', { class: 'panel-body', style: { display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '420px', margin: '0 auto', width: '100%' } });
    const item = (label: string, fn: () => void, cls = '') =>
      h(
        'button',
        {
          class: `menu-item ${cls}`,
          onclick: () => {
            audio.sfx('click');
            fn();
          },
        },
        label,
      );
    body.append(
      item(t('menu.resume'), () => this.closeAll(), 'primary'),
      item(t('menu.save'), () => this.saves('save')),
      item(t('menu.load'), () => this.saves('load')),
      item(t('menu.log'), () => this.backlog()),
      item(t('menu.settings'), () => this.settings()),
      item(t('menu.archive'), () => this.archive()),
      item(t('menu.to_title'), () =>
        this.confirm(t('menu.to_title_confirm'), () => {
          this.closeAll();
          this.game.toMenu();
        }),
      ),
    );
    this.panel('menu.paused', body);
  }
}
