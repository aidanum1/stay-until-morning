// npx vite-node tools/line-context.ts <file>   → key | speaker | English
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './story-build';

const file = process.argv[2];
if (!file) {
  console.error('usage: line-context <file> (e.g. 10_hamin)');
  process.exit(1);
}
const story = JSON.parse(readFileSync(join(ROOT, 'src/generated/story.json'), 'utf8')) as { speakers: Record<string, string> };
const en = JSON.parse(readFileSync(join(ROOT, `locales/src/story/en/${file}.json`), 'utf8')) as Record<string, string>;
for (const [k, v] of Object.entries(en)) console.log(`${k} | ${story.speakers[k] ?? '?'} | ${v}`);
