// Runtime localisation. Every player-visible string goes through t().
// Locale bundles live in /locales/{lang}.json (built by tools/build-locales.ts) and are
// code-split so only the selected language is downloaded.

import type { Lang } from '../game/state';
import { applyKoreanParticles } from './korean';

type Dict = Record<string, string>;

const loaders = import.meta.glob<Dict>('../../locales/*.json', { import: 'default' });

let current: Lang = 'en';
let dict: Dict = {};
const listeners = new Set<() => void>();
let vars: Record<string, string> = { playerName: '' };

export function currentLang(): Lang {
  return current;
}

export async function loadLang(lang: Lang): Promise<void> {
  const loader = loaders[`../../locales/${lang}.json`];
  if (!loader) throw new Error(`Missing locale bundle ${lang}`);
  dict = await loader();
  current = lang;
  document.documentElement.lang = lang;
  document.documentElement.dataset.lang = lang;
  listeners.forEach((fn) => fn());
}

export function onLangChange(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function setVar(name: string, value: string) {
  vars[name] = value;
}

export function has(key: string) {
  return key in dict;
}

export function t(key: string, extra?: Record<string, string | number>): string {
  let s = dict[key];
  if (s === undefined) {
    if (import.meta.env.DEV) console.warn(`[i18n] missing ${current}:${key}`);
    return key;
  }
  if (s.includes('{{')) {
    s = s.replace(/\{\{(\w+)\}\}/g, (_, name: string) => {
      const v = extra?.[name] ?? vars[name];
      return v === undefined ? '' : String(v);
    });
    if (current === 'ko') s = applyKoreanParticles(s);
  }
  return s;
}

/** Speaker display name. */
export function speakerName(id: string): string {
  if (id === 'you') return vars.playerName || t('ui.you');
  return t(`name.${id}`);
}
