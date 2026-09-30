# Writer Brief — member files `story/1x_{member}.s25`

Read first (in this order):
1. `research/CHARACTER_BIBLE.md` — canonical characters (esp. your member's block, §0 rules, §3 group, §5 seeds, §6 relationship model)
2. `production/STORY_OUTLINE.md` — structure, clock, past encounters, required scenes
3. `docs/STORY_DSL.md` — the script format (strict; the validator rejects unknown ids)
4. `research/characters/{member}.md` — public basis (fact vs. persona vs. fiction)
5. `story/00_prologue.s25` — **voice sample**. Match its prose: present tense, observational, dry-warm, specific, short paragraphs, no purple prose.

Validate as you go: `cd /Users/ayda/Desktop/smtr25 && npx vite-node tools/story-stats.ts {member}` (prints per-scene line counts plus any ERROR lines for the whole story; fix every ERROR mentioning your file; warnings about other writers' missing scenes are expected).

Only create/edit **your own file**. Do not touch any other file.

## File map
| member | file | Memory Room bg | route bgs (suggested) | ending bg |
|---|---|---|---|---|
| hamin | `story/10_hamin.s25` | `mem_beach` (fx waves, amb ocean) | `studio_lounge` / `mem_beach` | `dawn_cafe` |
| hyunjun | `story/11_hyunjun.s25` | `mem_subway` (+ `mem_street_night`) (amb subway / city) | `studio_ext_night` / `mem_street_night` / `mem_subway` | `dawn_subway` |
| charlie | `story/12_charlie.s25` | `mem_airport` → `mem_home` (fx light) | `studio_rooftop` / `mem_home` | `dawn_river` |
| haruta | `story/13_haruta.s25` | `mem_cinema` (fx film, amb cinema) | `mem_cinema` | `dawn_street` |
| justin | `story/14_justin.s25` | `mem_practice` (fx rhythm) | `studio_practice` / `mem_practice` | `studio_practice tint=dawn` |
| songha | `story/15_songha.s25` | `studio_rooftop` → `mem_rooftop_stars` (fx stars) | `mem_rooftop_stars` | `dawn_rooftop` |
| hanbi | `story/16_hanbi.s25` | `mem_lineart` → `mem_color` (fx sketch) | `studio_lounge` / `mem_lineart` / `mem_color` | `studio_lounge tint=dawn` |
| daniel | `story/17_daniel.s25` | `mem_arcade` → `mem_booth` (fx prism, amb arcade) | `mem_arcade` / `mem_booth` | `dawn_street` |

Hub/lobby scenes use `studio_lobby`; door scenes use `studio_hall`.

## Required scenes (exact ids)
`{m}_intro`, `{m}_intro_repeat`, `{m}_door`, `{m}_room`, `{m}_hub`, `{m}_route`, `{m}_ending`, `{m}_newmem` — see the table in STORY_OUTLINE.md for purpose/length. You may add helper scenes named `{m}_*`.

### `{m}_intro` (Act I, lobby, ~00:45)
- `@bg studio_lobby` is already showing; you may `@show` him and use `@cam`. 1–2 other members may cameo (group texture — he is not isolated).
- Establish who he is tonight + hint at his record ("I think I sent a … to this thing").
- **Set his seed var** (bible §5) with a natural choice (e.g. Hyunjun offers snacks → `@var snack = "banana"`). Members with no seed in §5 (hamin) can reference `var.drink` / `flag.cold` instead.
- End with `@hub act1`.

### `{m}_intro_repeat` — 2–4 lines, end `@hub act1`.

### `{m}_door` (Act II, `@bg studio_hall`)
- He consents in his own way. Then the player picks **exactly** these two lines as options (tone tags ok): `* "Open it."` and `* "Not yet."`.
- "Not yet." → kind, unpunished reply, `@rel {m} trust+1`, `@hub act2`. (He is fine; maybe relieved; maybe teases.)
- "Open it." → `@goto {m}_room`.

### `{m}_room` (Memory Room) — the heart of Act II
- `@music {m}`, the bg/fx/amb from the table; start with `@bg ... t=memory`.
- ECHO record header, e.g. `echo: RECORD 04 — OWNER: CHARLIE. TYPE: PHOTOGRAPH. DATE: DECEMBER, FIVE YEARS AGO. UNRESOLVED SUBJECTS: 1.` (use `@textbox echo` then back to `@textbox normal`).
- **Order-independence:** rooms can be played in any order. Near the start branch on `rooms()`:
  - `@if rooms() == 0` — first room of the night: nobody knows the silhouette is the protagonist yet; recognition is a real surprise.
  - `@else` — they've seen the figure in other rooms; he half-expects it's you ("Is it you again?"). With `rooms() >= 4` it can be a gentle running joke.
- **Past reconstruction:** show the old encounter with `@hide all` + `@textbox memory`. Lines spoken by the younger selves use normal speakers (`hamin:` = young Hamin, `you:` = young protagonist) inside the memory textbox; narration describes the reconstruction (the silhouette of light, the younger him). **Past = kind, brief, never romantic** (they were ~13–16).
- Present-day conversation: the emotional core of his theme. 5–8 menus mixing:
  1. **personality** choices (`[playful]`/`[sincere]`/`[quiet]`) that change tone;
  2. **emotional** choices (trust/closeness);
  3. **romantic** choices that only appear once earned: `{if {m}.closeness >= 2}` or `{if {m}.trust >= 2}` etc. — small intimate gestures (stay beside him, hold his sleeve, ask what he wants, sit in silence). **A player who favours him must be able to reach `romance >= 2` inside this room alone.**
- Reserved/respectful options give `trust`, never nothing, never negative.
- Hamin & Haruta: they switch from polite to casual speech inside their room. Mark the moment with a comment line in the script: `# SPEECH SHIFT: casual from here (ko 반말 / ja plain)` and show it in English through tone (e.g. he drops a formality, uses the name plainly, says something like "I think I can stop being careful now").
- End: `@flag room_{m}` `@unlock memory:{m}` `@autosave` `@goto hub_after_room`.

### `{m}_hub` (Act II lobby talk)
```
@if flag.room_{m} and not flag.{m}_postchat
    ... post-room conversation (15–30 lines, one menu, callbacks to his room) ...
    @flag {m}_postchat
@elif flag.room_{m}
    ... 2–4 line repeat (can vary with rooms()) ...
@else
    ... pre-room small talk (5–10 lines) ...
@hub act2
```

### `{m}_route` (03:50 → 04:55) — his route chapter
- Starts: `@chapter route` `@time 03:50` `@var route = "{m}"` and the protagonist finding him somewhere in/around the studio.
- Contains the **signature Memory Moment** (bible + outline): ECHO opens one last, dreamlike reconstruction for the two of them. Use `@letterbox on`, `@cam` moves, `@fx`, `@music {m}`, then at the climax `@cg cg_{m}_moment` `@unlock cg:cg_{m}_moment`, and once `@video vid_{m}` `@unlock cinematic:vid_{m}` (video before or after the CG — your call), `@cg off` to return.
- **Spec key lines verbatim** (bible) where they belong in the route or ending.
- Small intimate choices (bible/spec lists) — never "kiss him / reject him". Branch flavour on `{m}.romance >= 4` (high-romance variants: remembered details, hand held, forehead touch) vs. lower (warm but more tentative). Both paths are complete and lovely.
- Use his seed var callback at least once (and `var.drink` / `flag.cold` if natural).
- 1 short group beat is welcome (a text in the group chat, someone passing by), keeping the group intact.
- End: `@time 04:57` then `@goto act4_choice` (ECHO calls everyone to the lobby).

### `{m}_ending` (after the player preserves his record at 04:57)
- `@chapter ending` — begins in the lobby as ECHO writes his record to the glass card: the group reacts warmly (teasing allowed, **no jealousy**).
- Then `@call echo_farewell` (shared scene: ECHO's power-down at 05:00; returns to you).
- Then the dawn scene (`@time 05:40`+, ending bg from the table): spec ending lines verbatim, `@cg cg_{m}_ending` `@unlock cg:cg_{m}_ending`, `@music dawn` or `@music {m}`.
- End: `@ending {m}` then `@credits` then `@end`.

### `{m}_newmem` (post-game vignette, a week later)
Warm, funny, ordinary day; compatible with *any* ending (friendship-with-a-spark; no assumption they're dating). Ends `@end`.

## Style rules (hard)
- No gendered words or kinship titles for the protagonist. No physical description of the protagonist beyond hands/coat/reflection-without-detail.
- Banned phrasing: "You're different", "I can't explain why", "You're not like anyone else", "You belong to me", "something about you", "my heart skipped a beat". Avoid clichés; be specific.
- No possessiveness, jealousy, rivalry, danger, illness, tragedy. Friendship intact.
- Keep lines short enough for a phone screen: aim ≤ 30 words per line; split long thoughts.
- Use `{p}` for spoken pauses sparingly. Italic `*word*` sparingly.
- Other members speak in character (see bible §3 texture). Use them in intro/hub scenes.
- Expressions only: neutral smile laugh surprised thinking shy sad.
- Every menu must have at least one unconditional option.
- The protagonist speaks via `you:` lines and choices; narration `>` is their inner voice.

When finished, reply with: final line counts per scene (from story-stats), the choices where romance can be gained, and any spec key lines you placed (scene + context).
