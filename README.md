# 00:25 — Stay Until Morning

> **Unofficial fan-made fictional project. Not affiliated with SM Entertainment or the featured artists. Character portrayals are fictional interpretations inspired by publicly available appearances and content.**

A complete, mobile-first browser visual novel. One night in Seoul, eight memories, nine people, and a
choice to stay. Eight romance routes, a friendship ending and a true ending, in English, Korean,
Japanese and Simplified Chinese.

- **Play:** deploy to GitHub Pages (below) or run locally.
- **Length:** one playthrough ≈ 4–6 h of reading; ~68,000 words of English script; ten endings.
- **Stack:** Vite · TypeScript · Three.js (3D stage, particles, post-processing) · Web Audio (procedural score) · localStorage saves. No backend, no accounts, static files only.

## Run locally

```bash
npm install
npm run dev
```

Open the printed URL on your phone (same Wi-Fi) or in a browser — the layout is portrait-first and
also works on tablets and desktop.

```bash
npm test          # story integrity + engine tests (simulates hundreds of full playthroughs)
npm run build     # compiles story + locales, type-checks, builds ./dist
npm run preview   # serves the production build
```

## Deploy to GitHub Pages

1. Push this repository to GitHub (default branch `main`).
2. Repository → Settings → Pages → *Build and deployment* → Source: **GitHub Actions**.
3. The included workflow (`.github/workflows/deploy.yml`) tests, builds and publishes `dist/` on every push to `main`.

The build uses relative paths (`base: './'`), so it also works on Netlify, Cloudflare Pages, Firebase
Hosting or any static host: publish the `dist/` folder.

## Controls

| Action | Touch | Keyboard |
|---|---|---|
| Advance / finish typing | tap the text | Space · Enter · ↓ |
| Choose | tap an option | 1–5 |
| Auto mode | AUTO | A |
| Skip read text | SKIP | S (toggle) · hold Ctrl |
| Dialogue history | LOG | L |
| Quick save / quick load | Q.SAVE | Q / W |
| Hide interface | HIDE | H (any key/tap restores) |
| Menu | ≡ | Esc |
| Studio 25 hub | tap a person / door · swipe to look around | |

## Saves

Progress is stored in the browser (`localStorage`): autosave, quick save, 12 manual slots, plus
unlocks (endings, illustrations, cinematics, music, memories), settings and language. Saves are per
browser; use **Settings → Export saves** to download a JSON file and **Import saves** on another
device. **Erase everything** resets the game.

## Languages

English (canonical), 한국어, 日本語, 简体中文 — chosen on first launch and switchable any time in
Settings. All UI and story text is localised; Korean particles after the player's name are resolved
at runtime.

## Structure

```
story/            .s25 scripts (English canonical) — see docs/STORY_DSL.md
locales/src/      ui/<lang>.json + story/<lang>/<file>.json (translations)
locales/*.json    built runtime bundles (generated)
src/narrative/    DSL compiler, expression language, story VM
src/game/         game controller, state, hub logic, credits
src/rendering/    Three.js stage, particles, procedural fallback art, quality profiles
src/audio/        procedural music/ambience/SFX engine
src/ui/           dialogue, menus, panels, hub overlay, minigames
src/localization/ i18n runtime, Korean particle rules
public/assets/    art (webp) / video (mp4) — anything missing falls back to procedural art
research/         character research + CHARACTER_BIBLE.md
production/       outline, writer/translation briefs, Higgsfield tool notes + budget ledger
tools/            build scripts (story compile, locale build, asset import, checks)
tests/            vitest suites
```

## Credits & attribution

- Story, code, art direction, procedural music: this project (fan-made, non-commercial).
- Character art: generated with Higgsfield (ledger in `production/HIGGSFIELD_BUDGET.md`); stylised, non-photoreal, inspired by the members' publicly visible styling. No photographs are redistributed.
- Music/SFX: synthesised at runtime with the Web Audio API — no licensed recordings are used.
- Engine libraries: [three.js](https://threejs.org) (MIT), [Vite](https://vite.dev) (MIT).

See `PROJECT_STATUS.md` for the production status and QA log.
