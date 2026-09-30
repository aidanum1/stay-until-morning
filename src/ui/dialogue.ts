// Textbox, name plate, typewriter, choices and the in-game quick bar.

import { h, clear, richText } from './dom';
import { speakerName, t } from '../localization/i18n';
import { accentFor } from '../characters/characters';
import type { Choice } from '../narrative/types';
import type { Game } from '../game/game';

export class DialogueView {
  root: HTMLElement;
  wrap: HTMLElement;
  private plate: HTMLElement;
  private box: HTMLElement;
  private body: HTMLElement;
  private cursor: HTMLElement;
  private choicesEl: HTMLElement;
  private typing = false;
  private typeTimer = 0;
  private fullText = '';
  private currentKey = '';
  private queue: { text: string; pause: boolean }[] = [];

  constructor(
    parent: HTMLElement,
    private game: Game,
  ) {
    this.plate = h('div', { class: 'nameplate' });
    this.cursor = h('span', { class: 'cursor hidden' });
    this.body = h('span', { class: 'body' });
    this.box = h('div', { class: 'textbox', role: 'log', 'aria-live': 'polite' }, this.body, this.cursor);
    this.wrap = h('div', { class: 'textbox-wrap hidden' }, this.plate, this.box);
    this.choicesEl = h('div', { class: 'choices hidden', role: 'group' });
    this.root = h('div', { class: 'layer' }, this.wrap, this.choicesEl);
    parent.appendChild(this.root);
    this.wrap.addEventListener('click', (e) => {
      e.stopPropagation();
      this.game.advance();
    });
  }

  setStyle(style: string) {
    this.wrap.classList.remove('memory', 'echo', 'phone');
    if (style !== 'normal') this.wrap.classList.add(style);
  }

  get isTyping() {
    return this.typing;
  }

  hide() {
    this.wrap.classList.add('hidden');
    this.stopTyping();
  }

  show(key: string, speaker: string, instant: boolean) {
    this.currentKey = key;
    const text = t(key);
    this.wrap.classList.remove('hidden');
    this.wrap.classList.toggle('you', speaker === 'you');
    this.box.classList.toggle('narration', speaker === 'narration');
    if (speaker === 'narration') {
      this.plate.classList.add('hidden');
    } else {
      this.plate.classList.remove('hidden');
      this.plate.textContent = speakerName(speaker);
      this.plate.style.color = accentFor(speaker);
    }
    this.cursor.classList.add('hidden');
    clear(this.body);
    this.fullText = text;
    const speed = this.game.settings.textSpeed;
    if (instant || speed <= 0) {
      this.body.appendChild(richText(text.replace(/\{p\}/g, '')));
      this.finish();
      return;
    }
    // split into segments on {p} pauses
    this.queue = text.split('{p}').map((s, i) => ({ text: s, pause: i > 0 }));
    this.typing = true;
    this.typeSegment();
  }

  private typeSegment() {
    const seg = this.queue.shift();
    if (!seg) {
      this.finish();
      return;
    }
    const start = () => {
      const span = h('span');
      this.body.appendChild(span);
      const chars = [...seg.text];
      let i = 0;
      const cps = this.game.settings.textSpeed;
      const step = () => {
        if (!this.typing) return;
        // reveal N chars per tick according to speed
        const per = Math.max(1, Math.round(cps / 30));
        i = Math.min(chars.length, i + per);
        span.replaceChildren(richText(chars.slice(0, i).join('')));
        if (i < chars.length) {
          const ch = chars[i - 1];
          const delay = /[.!?…]/.test(ch) ? 1000 / cps + 120 : /[,;—]/.test(ch) ? 1000 / cps + 50 : 1000 / cps;
          this.typeTimer = window.setTimeout(step, delay);
        } else this.typeSegment();
      };
      step();
    };
    if (seg.pause) this.typeTimer = window.setTimeout(start, 550);
    else start();
  }

  private finish() {
    this.typing = false;
    clearTimeout(this.typeTimer);
    this.cursor.classList.remove('hidden');
    this.game.onLineComplete(this.currentKey);
  }

  complete() {
    if (!this.typing) return;
    clearTimeout(this.typeTimer);
    clear(this.body);
    this.body.appendChild(richText(this.fullText.replace(/\{p\}/g, '')));
    this.finish();
  }

  private stopTyping() {
    this.typing = false;
    clearTimeout(this.typeTimer);
  }

  showChoices(menuId: string, choices: (Choice & { index: number })[]) {
    clear(this.choicesEl);
    this.choicesEl.classList.remove('hidden');
    choices.forEach((c, i) => {
      const seen = !!this.game.persistent.seenChoices[`${menuId}:${c.index}`];
      const btn = h(
        'button',
        {
          class: `choice${seen ? ' seen' : ''}`,
          onclick: (e: Event) => {
            e.stopPropagation();
            this.game.unlockAudio();
            this.game.choose(c.index);
          },
        },
        h('i', { class: `tone ${c.tone ?? ''}` }),
        h('span', null, richText(t(c.k))),
      );
      btn.dataset.index = String(i);
      this.choicesEl.appendChild(btn);
    });
    (this.choicesEl.firstElementChild as HTMLElement | null)?.focus({ preventScroll: true });
  }

  hideChoices() {
    this.choicesEl.classList.add('hidden');
    clear(this.choicesEl);
  }

  /** keyboard: pick nth visible choice */
  pickChoice(n: number) {
    const btn = this.choicesEl.children[n] as HTMLButtonElement | undefined;
    btn?.click();
  }

  setHidden(hidden: boolean) {
    this.wrap.classList.toggle('hidden-ui', hidden);
    this.choicesEl.style.visibility = hidden ? 'hidden' : '';
  }
}
