// Library behind `npm run locales`.
// 1. compile + validate /story  → src/generated/story.json
// 2. extract English lines      → locales/src/story/en/<file>.json
// 3. merge UI + story per lang  → locales/<lang>.json   (runtime bundles)

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildStory, ROOT } from './story-build';

const LANGS = ['en', 'ko', 'ja', 'zh-CN'] as const;

export function buildLocales(opts: { quiet?: boolean } = {}) {
  const log = (...a: unknown[]) => !opts.quiet && console.log(...a);
  const { story, errors, warnings } = buildStory();
  for (const w of warnings) log(`  warn: ${w}`);
  if (errors.length) {
    for (const e of errors) console.error(`  ERROR: ${e}`);
    throw new Error(`${errors.length} story error(s)`);
  }

  const genDir = join(ROOT, 'src/generated');
  mkdirSync(genDir, { recursive: true });
  const runtime = { scenes: story.scenes, speakers: story.speakers };
  writeFileSync(join(genDir, 'story.json'), JSON.stringify(runtime));

  // English extraction, grouped by file
  const byFile: Record<string, Record<string, string>> = {};
  for (const [k, text] of Object.entries(story.text)) {
    const f = story.keyFile[k];
    (byFile[f] ??= {})[k] = text;
  }
  const enDir = join(ROOT, 'locales/src/story/en');
  mkdirSync(enDir, { recursive: true });
  for (const [f, entries] of Object.entries(byFile)) {
    writeFileSync(join(enDir, `${f}.json`), JSON.stringify(entries, null, 1) + '\n');
  }

  const report: Record<string, { missing: number; total: number }> = {};
  for (const lang of LANGS) {
    const ui = JSON.parse(readFileSync(join(ROOT, `locales/src/ui/${lang}.json`), 'utf8')) as Record<string, string>;
    const out: Record<string, string> = { ...ui };
    let missing = 0;
    const dir = join(ROOT, `locales/src/story/${lang}`);
    const tr: Record<string, string> = {};
    if (lang !== 'en' && existsSync(dir)) {
      for (const f of readdirSync(dir).filter((x) => x.endsWith('.json'))) {
        Object.assign(tr, JSON.parse(readFileSync(join(dir, f), 'utf8')));
      }
    }
    for (const [k, en] of Object.entries(story.text)) {
      if (lang === 'en') out[k] = en;
      else if (tr[k] !== undefined && tr[k] !== '') out[k] = tr[k];
      else {
        out[k] = en;
        missing++;
      }
    }
    report[lang] = { missing, total: Object.keys(story.text).length };
    writeFileSync(join(ROOT, `locales/${lang}.json`), JSON.stringify(out));
  }

  // asset index: which real art files exist (the rest falls back to procedural art)
  const pub = join(ROOT, 'public');
  const files: string[] = [];
  const walk = (d: string) => {
    if (!existsSync(d)) return;
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.(webp|png|jpg|mp4|webm|glb|m4a|mp3|ogg)$/.test(e.name)) files.push(p.slice(pub.length + 1).split('\\').join('/'));
    }
  };
  walk(join(pub, 'assets'));
  writeFileSync(join(genDir, 'assets.json'), JSON.stringify({ files: files.sort() }));

  const words = Object.values(story.text).reduce((n, s) => n + s.split(/\s+/).length, 0);
  log(`story: ${Object.keys(story.scenes).length} scenes, ${Object.keys(story.text).length} lines, ~${words} English words`);
  for (const [lang, r] of Object.entries(report)) if (lang !== 'en') log(`  ${lang}: ${r.total - r.missing}/${r.total} translated`);
  return { story, report };
}

