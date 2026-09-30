// npx vite-node tools/locale-check.ts <lang> [file] — key parity + token checks
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './story-build';

const lang = process.argv[2];
const only = process.argv[3];
if (!lang) {
  console.error('usage: locale-check <lang> [file]');
  process.exit(1);
}
const enDir = join(ROOT, 'locales/src/story/en');
let problems = 0;
const files = only ? [`${only}.json`] : readdirSync(enDir).filter((f) => f.endsWith('.json'));
for (const f of files) {
  const en = JSON.parse(readFileSync(join(enDir, f), 'utf8')) as Record<string, string>;
  const p = join(ROOT, `locales/src/story/${lang}/${f}`);
  if (!existsSync(p)) {
    console.log(`${f}: MISSING`);
    problems++;
    continue;
  }
  let tr: Record<string, string>;
  try {
    tr = JSON.parse(readFileSync(p, 'utf8'));
  } catch (e) {
    console.log(`${f}: INVALID JSON ${(e as Error).message}`);
    problems++;
    continue;
  }
  const missing = Object.keys(en).filter((k) => !(k in tr) || !tr[k]);
  const extra = Object.keys(tr).filter((k) => !(k in en));
  const badToken = Object.keys(en).filter((k) => tr[k] && /\{\{playerName\}\}/.test(en[k]) && !/\{\{playerName\}\}/.test(tr[k]) && !/\{\{/.test(tr[k]) ? false : tr[k] && /\{\{(?!playerName\}\})/.test(tr[k]));
  const untranslated = Object.keys(en).filter((k) => tr[k] && tr[k] === en[k] && en[k].length > 12);
  if (missing.length || extra.length || badToken.length) problems++;
  console.log(`${f}: ${Object.keys(en).length - missing.length}/${Object.keys(en).length} translated${missing.length ? `, missing: ${missing.slice(0, 5).join(', ')}${missing.length > 5 ? '…' : ''}` : ''}${extra.length ? `, extra keys: ${extra.length}` : ''}${badToken.length ? `, broken tokens: ${badToken.slice(0, 3).join(', ')}` : ''}${untranslated.length ? `, identical to English: ${untranslated.length}` : ''}`);
}
process.exit(problems ? 1 : 0);
