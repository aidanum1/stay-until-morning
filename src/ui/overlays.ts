// Transient overlays: chapter card, name entry, wait, cinematic player, credits, toast.

import { h, clear } from './dom';
import { t } from '../localization/i18n';
import { hasAsset, assetUrl } from '../rendering/assets';
import { paintCg } from '../rendering/placeholder';
import { audio } from '../audio/audio';
import { CREDITS } from '../game/credits';

export class Overlays {
  root: HTMLElement;
  private toastEl: HTMLElement | null = null;
  private toastTimer = 0;
  private waitTimer = 0;
  private waitDone: (() => void) | null = null;
  private waitCatcher: HTMLElement | null = null;
  private creditsEl: HTMLElement | null = null;
  private creditsTimer = 0;

  constructor(parent: HTMLElement) {
    this.root = h('div', { class: 'layer' });
    parent.appendChild(this.root);
  }

  toast(msg: string) {
    if (this.toastEl) this.toastEl.remove();
    this.toastEl = h('div', { class: 'toast', role: 'status' }, msg);
    this.root.appendChild(this.toastEl);
    clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => {
      this.toastEl?.remove();
      this.toastEl = null;
    }, 2200);
  }

  chapterCard(id: string, done: () => void) {
    const kicker = t(`chapter.${id}.kicker`);
    const title = t(`chapter.${id}.title`);
    const card = h('div', { class: 'chapter-card' }, h('div', { class: 'kicker' }, kicker), h('h1', null, title));
    this.root.appendChild(card);
    audio.sfx('chime');
    const finish = () => {
      card.style.transition = 'opacity 0.5s';
      card.style.opacity = '0';
      setTimeout(() => card.remove(), 500);
      done();
    };
    const timer = setTimeout(finish, 2400);
    card.addEventListener('click', () => {
      clearTimeout(timer);
      finish();
    });
  }

  askName(initial: string, done: (name: string) => void) {
    const input = h('input', {
      type: 'text',
      maxlength: '14',
      autocomplete: 'off',
      autocapitalize: 'words',
      spellcheck: false,
      'aria-label': t('ui.name_label'),
      value: initial,
      placeholder: t('ui.name_placeholder'),
    });
    const submit = () => {
      const v = input.value.trim().replace(/[<>{}]/g, '');
      if (!v) {
        input.focus();
        input.style.borderColor = '#ff9ec7';
        return;
      }
      ov.remove();
      done(v);
    };
    const ov = h(
      'div',
      { class: 'overlay name-entry' },
      h('div', { class: 'phone-msg' }, t('ui.name_prompt')),
      input,
      h('div', { class: 'muted small' }, t('ui.name_hint')),
      h('button', { class: 'btn primary', onclick: submit }, t('ui.confirm')),
    );
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') submit();
      e.stopPropagation();
    });
    this.root.appendChild(ov);
    setTimeout(() => input.focus(), 50);
  }

  waitFor(ms: number, done: () => void) {
    this.cancelWait();
    this.waitDone = done;
    const catcher = h('div', { class: 'tap-catcher', style: { zIndex: '15' } });
    catcher.addEventListener('click', () => this.finishWait());
    this.root.appendChild(catcher);
    this.waitCatcher = catcher;
    this.waitTimer = window.setTimeout(() => this.finishWait(), ms);
  }
  private finishWait() {
    const done = this.waitDone;
    this.cancelWait();
    done?.();
  }
  private cancelWait() {
    clearTimeout(this.waitTimer);
    this.waitCatcher?.remove();
    this.waitCatcher = null;
    this.waitDone = null;
  }

  /** Full-screen cinematic. Real video if present, otherwise a generated "moving still" from the CG art. */
  playVideo(id: string, done: () => void, captionKey?: string) {
    const file = `assets/video/${id}.mp4`;
    const wrap = h('div', { class: 'cinematic' });
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      audio.duck(false);
      wrap.style.transition = 'opacity 0.6s';
      wrap.style.opacity = '0';
      setTimeout(() => wrap.remove(), 600);
      done();
    };
    const skip = h('button', { class: 'skip', onclick: finish }, t('ui.skip'));
    if (hasAsset(file)) {
      const v = h('video', { src: assetUrl(file), playsinline: true, autoplay: true, muted: false, preload: 'auto' }) as HTMLVideoElement;
      v.addEventListener('ended', finish);
      v.addEventListener('error', finish);
      wrap.append(v, skip);
      this.root.appendChild(wrap);
      audio.duck(true);
      void v.play().catch(() => {
        v.muted = true;
        void v.play().catch(finish);
      });
      return;
    }
    // Fallback: slow push-in over the CG that belongs to this cinematic
    const cgId = id.replace(/^vid_/, 'cg_') + (id === 'vid_true' ? '' : '_moment');
    const canvasId = id === 'vid_opening' ? 'cg_echo' : id === 'vid_true' ? 'cg_true_breakfast' : cgId;
    const art = hasAsset(`assets/cg/${canvasId}.webp`)
      ? h('img', { src: assetUrl(`assets/cg/${canvasId}.webp`) })
      : paintCg(canvasId);
    art.style.cssText = 'width:100%;height:100%;object-fit:cover;transform:scale(1.05);transition:transform 7s ease-out, opacity 1s;opacity:0;';
    wrap.append(art, skip);
    if (captionKey) wrap.appendChild(h('div', { class: 'caption' }, t(captionKey)));
    this.root.appendChild(wrap);
    audio.duck(true);
    requestAnimationFrame(() => {
      art.style.opacity = '1';
      art.style.transform = 'scale(1.18)';
    });
    setTimeout(finish, 6500);
  }

  rollCredits(done: () => void) {
    this.stopCredits();
    const roll = h('div', { class: 'roll' });
    roll.appendChild(h('h1', null, t('ui.title_full')));
    for (const section of CREDITS) {
      roll.appendChild(h('h2', null, t(section.titleKey)));
      for (const line of section.lines) roll.appendChild(h('p', null, line.key ? t(line.key) : line.text ?? ''));
    }
    roll.appendChild(h('div', { class: 'legal-block' }, t('ui.legal')));
    const el = h('div', { class: 'credits with-dialogue' }, roll);
    const dur = 75;
    el.style.setProperty('--credits-dur', `${dur}s`);
    const skip = h('button', { class: 'credits-skip', onclick: () => this.stopCredits(true) }, t('ui.skip_credits'));
    el.appendChild(skip);
    this.root.appendChild(el);
    this.creditsEl = el;
    const finish = () => {
      this.creditsEl = null;
      el.remove();
      done();
    };
    this.creditsTimer = window.setTimeout(finish, dur * 1000 + 500);
    (el as HTMLElement & { finish?: () => void }).finish = () => {
      clearTimeout(this.creditsTimer);
      finish();
    };
  }
  stopCredits(finish = false) {
    const el = this.creditsEl as (HTMLElement & { finish?: () => void }) | null;
    if (!el) return;
    if (finish) el.finish?.();
    else {
      clearTimeout(this.creditsTimer);
      el.remove();
      this.creditsEl = null;
    }
  }
  get creditsActive() {
    return !!this.creditsEl;
  }

  clearAll() {
    this.cancelWait();
    this.stopCredits();
    clear(this.root);
    this.toastEl = null;
  }
}
