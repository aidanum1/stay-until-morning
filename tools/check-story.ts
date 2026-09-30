// usage: vite-node tools/check-story.ts <file-stem> <member>
// Compiles the whole story and prints the errors/warnings that concern one file, plus its word count.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildStory, STORY_DIR } from './story-build';

const [stem, member] = process.argv.slice(2);
const { errors, warnings } = buildStory();
const mine = (s: string) => s.includes(stem) || (member ? s.includes(`${member}_`) : false);
const e = errors.filter(mine);
const w = warnings.filter(mine);
const src = readFileSync(join(STORY_DIR, `${stem}.s25`), 'utf8');
const words = src
  .split('\n')
  .filter((l) => l.trim() && !/^\s*(@|#|===|~)/.test(l))
  .join(' ')
  .split(/\s+/).length;
console.log(`${stem}: ${words} words, ${e.length} errors, ${w.length} warnings (other files: ${errors.length - e.length} errors)`);
for (const x of e) console.log('ERROR', x);
for (const x of w) console.log('warn ', x);
process.exit(e.length ? 1 : 0);
