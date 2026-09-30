// npm run story:stats — per-scene line/word counts (writing progress)
import { buildStory } from './story-build';

const { story, errors, warnings } = buildStory();
const rows: Record<string, { lines: number; words: number; menus: number }> = {};
for (const sc of Object.values(story.scenes)) {
  const r = (rows[sc.id] = { lines: 0, words: 0, menus: 0 });
  for (const op of sc.ops) {
    if (op.o === 'say' || op.o === 'nar') {
      r.lines++;
      r.words += story.text[op.k].split(/\s+/).length;
    }
    if (op.o === 'menu') r.menus++;
  }
}
const filter = process.argv[2];
for (const [id, r] of Object.entries(rows)) if (!filter || id.startsWith(filter)) console.log(`${id.padEnd(28)} lines ${String(r.lines).padStart(4)}  words ${String(r.words).padStart(5)}  menus ${r.menus}`);
for (const w of warnings) if (!filter || w.includes(filter)) console.log('warn:', w);
for (const e of errors) console.log('ERROR:', e);
if (errors.length) process.exit(1);
