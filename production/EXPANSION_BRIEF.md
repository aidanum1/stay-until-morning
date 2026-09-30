# Expansion brief — "12 hours, 8 × 3 endings"

Producer request (2026-09-30): the game must hold **at least 12 hours** of content and every
member must have **three endings** (24 route endings + Friendship + True). "Real emotions, but
don't hurt or embarrass anyone."

You are writing ONE new file: `story/6N_<member>_more.s25`. Do not edit any other file.
English in existing files is frozen (translations are keyed by line index).

## Read first (in this order)
1. `docs/STORY_DSL.md` — the script format. Follow it exactly.
2. `production/WRITER_BRIEF.md` — tone, banned phrases, content rules. All still apply.
3. `research/CHARACTER_BIBLE.md` and `research/characters/<member>.md` — voice and boundaries.
4. `story/1N_<member>.s25` — the existing route. Your writing continues it: same voice, same
   running motifs, same callbacks (flags/vars set there may be read with `@if`).
5. Skim `story/40_act4.s25` (`act4_choice`, `echo_farewell`) and the existing `<member>_ending`.

## How your scenes are wired (the producer does the wiring, you only write the scenes)
- `<member>_route` will jump to **`<member>_ch1`** instead of `act4_choice`.
- Your chapters run in a chain: `<member>_ch1` → `_ch2` → … → `_ch6`, each ending with
  `@goto <member>_chN+1`; the last ends with `@time 04:57` then `@goto act4_choice`.
- In `act4_choice`, "Preserve <Member>'s record." will jump to **`<member>_final`**.
- `<member>_final` is a short, quiet beat (150–300 words) ending in ONE menu of three options,
  each a thing the protagonist says or does that tells us what this night has been:
  - the romantic one — condition `{if <member>.romance >= 4}` — `@goto <member>_ending` (exists)
  - the "beside" one — unconditional — `@goto <member>_ending_beside`
  - the "someday" one — unconditional — `@goto <member>_ending_someday`
  Never label the options as endings; they are just honest things to say.

## What to write (target **10,000–11,000 words** of narration + dialogue; minimum 9,500)
### Six new chapters, ~1,300–1,500 words each
Time runs 03:10 → 04:57 on the same night in and around Studio 25 (use `@time`). They deepen
the route between the existing route scene and the final choice. Each chapter needs:
- its own small situation with a beginning and an end (a task, a place, a game, a small
  problem that gets solved kindly) — not just talking;
- one emotional step forward that is *earned by something specific the two of them did*;
- 2–3 menus with meaningful `@rel` effects (romance is only raised by choices that are
  honest/attentive, never by flattery); every menu has at least one unconditional option;
- at least one chapter where other members pass through warmly (max three on stage);
- at least one chapter that is mostly light/funny, and one that is mostly quiet;
- one chapter where the member is the one who needs something and the protagonist gives it
  (care flows both ways);
- start each chapter with `@autosave`, `@bg`, `@music`, `@time`.
Real emotion comes from specifics: what he notices, what he's been carrying about debut and
the future, what he is afraid to want. Let feelings be named plainly at least once. Vulnerable
is good; humiliated is not. Nobody is mocked, caught out, rejected, shamed or made to cry
alone. No jealousy, possessiveness, rivalry, illness, injury, danger, or villains. No claims
about the real person's private life, family, health, relationships or history — invent only
small fictional moments inside this one fictional night.

### Two new endings, ~900–1,200 words each
Mirror the structure of the existing `<member>_ending` (ECHO preserves the record, `@call
echo_farewell` if the existing ending does, dawn scene outside, a last image) but make each
its own story, not a lesser version of the romance ending:
- **`<member>_ending_beside`** — "Beside you": chosen-family closeness. The two become each
  other's person without romance, and that is complete and joyful, never a consolation prize
  or a rejection. End with `@ending <member>_beside` then `@credits`.
- **`<member>_ending_someday`** — "Someday": the feeling is mutual and said out loud, and
  they choose *together* to let it arrive at its own pace — a concrete, hopeful promise
  (a place, a time, a thing to bring). Warm and certain, not sad, not a cliffhanger. End with
  `@ending <member>_someday` then `@credits`.

## Hard constraints
- Assets: only use ids that exist in `src/scenes/manifest.ts` (backgrounds, music, amb, sfx,
  fx, cam, expressions). Do **not** use `@cg`, `@video`, `@chapter`, `@minigame`, `@name`,
  `@hub`, or `@unlock`. No new speakers.
- Protagonist is `{{playerName}}`, gender-neutral, never described physically.
- Scene ids exactly: `<member>_ch1` … `<member>_ch6`, `<member>_final`,
  `<member>_ending_beside`, `<member>_ending_someday`.
- Flags/vars you create must be prefixed `<member>x_`.
- Validate until clean: `npx vite-node tools/check-story.ts 6N_<member>_more <member>`
  (errors about *other* files are other writers' work in progress — ignore them). Do not run
  `npm run locales`, `npm run build`, or the test suite.

## Report back (final message)
Word count from the checker, the six chapter one-line summaries, and a **title for each of
the two new endings** (2–4 words each, like a track title).
