# STORY OUTLINE — 00:25 · Stay Until Morning

Canonical plot + scene map. Characters: `research/CHARACTER_BIBLE.md`. Script format: `docs/STORY_DSL.md`.

## Theme
Someone who always leaves learns to stay. **Something does not need to be destiny to be meaningful.**

## The setting
- **Studio 25** — a narrow four-storey building behind a laundromat in Mapo, Seoul. Once a cheap creative space: practice rooms, a recording booth, a darkroom, a lounge café, a rooftop. Closed as a studio a year ago; tonight is the building's **Final Night** (the lease ends; renovation crews arrive at dawn; the power is cut at 05:00).
- **The Future Letter Project** — Studio 25's archive for messages to your future self (letters, voice memos, photos, videos, drawings, songs), submitted in person or by post/online. Ran roughly six to two years ago.
- **ECHO** — the founder Seo Yeonhwa's immersive archive system. At 00:25 it begins the **Final Return**: each record becomes a walk-in *Memory Room* reconstruction. Records open only with their owner's consent. Every record ECHO has matched tonight contains the same **unresolved subject** (a silhouette of light). At 05:00 ECHO sleeps; it can burn **one** record onto a glass keepsake card.
- A late-September night: rain until ~02:00, clear stars later, sunrise ≈06:15.

## Structure & clock

| Part | Clock | Scenes | Notes |
|---|---|---|---|
| **Prologue — 00:25** | 00:12→00:40 | `prologue_*` | message, arrival, meet all eight, name entry, ECHO activates, first mystery, Daniel proposes dropping formalities |
| **Act I — People I Almost Remember** | 00:40→01:05 | hub `act1`; `{m}_intro` ×8; `act1_gather` | free roam; talk to all eight (seeds the small-detail vars); gather scene: ECHO's rules, eight doors, consent |
| **Act II — Eight Memory Stories** | 01:05→03:30 | hub `act2`; `{m}_door`, `{m}_room`, `{m}_hub`; `interlude_1..3` | rooms in any order; interludes after 2/4/6 rooms |
| **Act III — The Ninth Memory** | 03:30→03:50 | `act3_*` | the protagonist's record; no destiny; route choice "Where do you want to be?" |
| **Route chapter** | 03:50→04:55 | `{m}_route` or `friendship_route` | signature Memory Moment of the chosen member |
| **Act IV — 04:57** | 04:57 | `act4_choice` | "Choose one record to preserve." |
| **Endings** | 05:00→morning | `{m}_ending`, `friendship_ending`, `true_ending` | then credits |
| **NEW MEMORIES** (post-game) | — | `{m}_newmem`, `newmem_group` | unlocked by True Ending |

The hub sets the clock automatically in Act II (`01:05 + 17 min × rooms`). Room scenes must **not** use `@time` for the present; past-memory timestamps are shown in `echo:` lines instead.

## Past encounters (all real, all independent, all non-romantic)
| Member | ≈When | Where | Record type | Protagonist's trace |
|---|---|---|---|---|
| Hanbi | 6 yrs ago, rainy afternoon | Studio 25 lounge | unfinished pencil portrait | the blank-faced sitter |
| Hamin | 6 yrs ago, summer night | a quiet beach in Busan | voice memo of waves | a laugh on the recording |
| Songha | 5 yrs ago, spring night | Studio 25 rooftop | five-year plan | "Ask the kid on the roof." |
| Charlie | 5 yrs ago, winter night | airport departures lounge, delayed flights | photo of a departures board | a hand pointing at a gate |
| Hyunjun | 4 yrs ago, winter, last train | Seoul subway, last loop | video of window reflections | a reflection in the glass |
| Haruta | 3 yrs ago, autumn late screening | a small old cinema in Seoul | ticket stub + one-line scene | the only other audience member |
| Justin | 3 yrs ago, after midnight | Studio 25 practice room | silent dance video | a figure in the doorway |
| Daniel | 2 yrs ago, rainy night | photo booth in a Hongdae arcade | four-frame photo strip | a washed-out face in frames 2–4 |

The protagonist volunteered at Studio 25's front desk during their Seoul years (explains Hanbi/Songha/Justin), and was elsewhere for the others by coincidence (moving house, a summer in Busan, travelling). **Nobody realised — not even the protagonist — until ECHO linked the records.** In each room, recognition happens gradually: a detail (a laugh, a phrase, a gesture) makes the member and the protagonist realise *"that was you."*

## Hub
**Act I hub** (`@hub act1`): eight members around the lobby. Tapping a member runs `{m}_intro` (first time) then `{m}_intro_repeat`. When all eight intros are seen, `act1_gather` runs automatically.

**Act II hub** (`@hub act2`): members → `{m}_hub`; the Hall of Doors → `{m}_door` for rooms not yet done. After a room: `hub_after_room` (interludes at rooms 2/4/6; Act III at 8).

Ambient events (`amb_*` scenes) play as speech bubbles in the hub and change with progress.

## Required per-member scenes (file `story/1x_{member}.s25`)
| scene | length | purpose |
|---|---|---|
| `{m}_intro` | 25–40 lines | Act I first talk; who he is tonight; sets the member's seed var; hints at his record; ends `@hub act1` |
| `{m}_intro_repeat` | 2–4 lines | repeat talk in Act I; ends `@hub act1` |
| `{m}_door` | 15–30 lines | Act II: at his door, he consents in his own way; player picks **"Open it."** / **"Not yet."** (not yet = `@rel m trust+1`, kind reply, `@hub act2`); open → `@goto {m}_room` |
| `{m}_room` | 150–220 lines | the Memory Room: reconstruction of the past encounter, recognition, emotional core, 5–8 menus; ends `@flag room_{m}` `@unlock memory:{m}` `@autosave` `@goto hub_after_room` |
| `{m}_hub` | 25–45 lines | Act II hub talk: `@if flag.room_{m}` post-room conversation (first time) / short repeat; else pre-room small talk; ends `@hub act2` |
| `{m}_route` | 180–260 lines | 03:50→04:55 route chapter with the **signature Memory Moment** (CG + cinematic), romance culmination, spec key lines; ends `@goto act4_choice` |
| `{m}_ending` | 50–90 lines | after he's preserved at 04:57: dawn, the spec ending lines, epilogue; ends `@ending {m}` then `@credits` |
| `{m}_newmem` | 20–35 lines | post-game "new memory" vignette — a normal day, a week later; ends `@end` |

## Interludes (story/20_interludes.s25)
- `interlude_1` (after 2 rooms, ~01:45) — **"What do we eat?"** Food argument, convenience-store run, snack-stealing; ECHO flickers a ninth door: `RECORD 09 — OWNER: UNRESOLVED`. Someone jokes the protagonist is a ghost. Choice: playful/sincere/quiet.
- `interlude_2` (after 4 rooms, ~02:20) — **"The founder's voice."** A power flicker; the founder's first voice log; ECHO explains 05:00 and the single glass card. Mild, fair question: "Did you know?" — the protagonist didn't. Trust scene; the group closes ranks around the protagonist.
- `interlude_3` (after 6 rooms, ~02:55) — **"The photo."** Rain stops. Daniel finds the studio's old instant camera; group photo of all nine (the friendship keepsake). ECHO: "Recipient {{playerName}}: your record is ready."

## Act III (story/30_act3.s25)
`act3_start` → the ninth door; the protagonist's own consent (`Open it.` / `Not yet.` — not yet loops back gently, the group waits). Inside: the front desk of Studio 25, moving boxes, a patchwork of cities. The Future Letter: *"I hope, by the time you read this, you've found a place you want to stay."* ECHO's record timeline: eight encounters, six years, four cities — **CAUSAL LINK: NONE FOUND.** Songha looks for a pattern; Charlie asks if it's fate; the answer they reach together: it wasn't destiny — "you just kept being there, and we kept noticing." The founder's last log: *"Archives are for keeping. People aren't."* 03:50: "Time remaining: seventy minutes." → `act3_choice`: **Where do you want to be?** Members with `romance >= 2 or closeness >= 5` are offered; "Stay with everyone." always.

## Act IV & endings (story/40_act4.s25)
`act4_choice` at 04:57 — ECHO: "Choose one record to preserve."
- the route member's record (if `var.route` is that member) → `{m}_ending`
- "Tonight. All nine of us." → `friendship_ending`
- **"We can make new memories."** (only if `endings() >= 8`) → `true_ending`

`friendship_ending` — the group photo burned onto the glass card; dawn on the roof; numbers exchanged; "see you" that means it.
`true_ending` — nobody is preserved; ECHO: "Then there is nothing I need to keep." ECHO sleeps; sunrise; the nine walk to breakfast; **credits roll during their casual conversation**; main menu turns to morning; **NEW MEMORIES** unlocks.

## Tone guardrails
Gentle, funny, specific. Seoul at night is beautiful, not dystopian. Nobody is in danger. The past is kind. The present is a choice.
