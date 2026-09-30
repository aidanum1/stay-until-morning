# PROJECT STATUS — 00:25 · Stay Until Morning

_Last updated: 2026-09-29_

## Completed
- Research: 8 member research files + `research/CHARACTER_BIBLE.md` (fact / persona / fiction separated).
- Architecture: Vite + TS + Three.js stage, `.s25` story DSL + compiler + VM, i18n runtime (4 languages, Korean particle resolution), local save system (auto/quick/12 slots, export/import), hidden relationship model, hub + ambient event system, quality profiles (high/medium/low, adaptive), reduced-motion / reduced-camera settings, procedural Web Audio score (18 tracks, 11 ambiences, 23 SFX).
- Story: Prologue, Act I (8 intros + gather), Act II (8 Memory Rooms + 3 interludes + hub talks + 39 ambient scenes), Act III (ninth memory), 8 route chapters, 8 romance endings, friendship route + ending, True Ending with credits during dialogue, 9 post-game New Memories vignettes. 128 scenes · 5,720 lines · ~68k English words.
- Tests: 27 vitest tests incl. 200 simulated full playthroughs; every ending reachable; no softlocks; "Not yet." at every door in any room order verified.
- Localisation: UI strings ko/ja/zh-CN; story translation **ko 100 %, ja 100 %, zh-CN 100 %** (5,720 / 5,720 lines each).
- Minigames: rhythm (Justin) and sketch (Hanbi).
- Deployment: relative-path build, GitHub Pages workflow, 404 fallback, PWA manifest.
- Higgsfield: tools inspected, budget ledger, style calibration; 4 identities locked at v2 (superseded by v5 photo-anchored pass in progress).

- Art (Higgsfield, v6 pipeline — see production/ART_PROMPTS.md): 8 photo-anchored identities, 56 expression sprites (cut out locally), 28 environments (incl. two hub panoramas), 21 CGs, 10 cinematics. In-engine aura per character.
- Production build passes (`npm run build`), 27 tests pass.

## Next / nice-to-have
- Full human playthrough on a real phone for pacing and typo-level polish in all four languages.
- Optional: compress the ten MP4 cinematics (≈75 MB total) if faster first loads are wanted.

## Higgsfield credits
- Used: **≈310** · Remaining: **≈240** · Reserve: 50 (untouched). See production/HIGGSFIELD_BUDGET.md (7 background-removal calls have no reported price; treat the total as ≈310–320).

## Blockers / decisions
- Reference photos are uploaded by the producer through the Higgsfield widget (the assistant's own upload path is blocked by the safety filter) — resolved.
- 3D mesh generation not used (see `production/HIGGSFIELD_TOOLS.md`): 2.5D character cards on a 3D stage instead.

## Outstanding QA
- Verified in a 375×812 viewport: first launch, menu, prologue, name entry, choices, Memory Room with real art, hub + ambient chatter, Hall of Doors.
- Not yet hand-verified: every ending's final screens, landscape/desktop layout, save/load round trip in the browser (covered by unit tests only).
