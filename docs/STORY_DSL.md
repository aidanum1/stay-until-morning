# `.s25` Story Script Format

All story content lives in `/story/*.s25` (English = canonical source). The build
(`npm run locales`) compiles scripts into `src/generated/story.json` (logic only) and
extracts every line into `locales/src/story/en/<file>.json`. Translations live in
`locales/src/story/{ko,ja,zh-CN}/<file>.json` with the **same keys**.

Keys are assigned automatically: `<scene_id>.<NNN>` in order of appearance. **After a
file has been translated, do not insert/delete text lines in the middle of a scene** —
append new scenes instead, or re-run translation for that scene.

## Scenes

```
=== hamin_room_enter
```
Scene ids: lowercase `a-z0-9_`, globally unique. Execution runs top to bottom; a scene
ends at the next `===` (implicit `@end`, which returns to a caller if called with `@call`).

## Text lines

```
> Narration. The protagonist's inner voice / description. Second person is avoided; use plain present tense.
hamin: Dialogue line.
hamin[smile]: Dialogue with an expression change (persists).
you: A line the protagonist says out loud.
echo: The archive system speaking.
all: Several people at once.
```
Speakers: `hamin hyunjun charlie haruta justin songha hanbi daniel you echo all staff clerk voice unknown`.

Inline tokens (keep them in translations):
- `{{playerName}}` — the protagonist's chosen name.
- `{p}` — a short dramatic pause while text is typing (≈0.6 s).
- `*word*` — emphasis (rendered italic).

Expressions: `neutral smile laugh surprised thinking shy sad`.

## Choices

Consecutive `*` lines at the same indentation form one menu. The indented body runs when
picked, then flow continues after the menu.

```
* [sincere] "You notice everything."
    @rel hamin trust+1
    hamin: Not everything.
* [playful] Nudge his shoulder.
    @rel hamin closeness+1
* [quiet] Say nothing. Stay beside him. {if hamin.closeness >= 3}
    @rel hamin romance+1
```
- Optional tone tag in `[ ]`: `sincere playful quiet romantic curious careful`.
- Optional condition `{if expr}` hides the option unless true. At least one option must
  always be visible (the validator checks unconditional fallbacks).
- Quote marks: write spoken choices in quotes, actions without.

## Conditions

```
@if hamin.romance >= 3 and flag.hamin_jacket
    ...
@elif hamin.closeness >= 2
    ...
@else
    ...
```
Expressions: `and or not == != >= <= > < + -`, numbers, `true/false`.
- `hamin.trust` / `.closeness` / `.romance`, `hamin` alone = sum of all three.
- `flag.name` (default false), `var.name` (default 0).
- Functions: `seen(scene_id)`, `rooms()` (# memory rooms completed), `bond(member)`,
  `top()` (member id with highest romance), `ending(id)` (persistent), `endings()` (# romance endings achieved), `truedone()`.

## Flow

```
@goto scene_id        # jump to another scene
@call scene_id        # run scene, then come back
@return / @end
~ label               # local label
@goto .label          # jump to local label
@hub act2             # return control to the Studio 25 hub (free exploration)
```

## State

```
@rel hamin trust+1 closeness+1 romance+1   # never visible to the player
@flag hamin_jacket        # set;  @flag !hamin_jacket  to clear
@var drinks += 1          # also = and -=
@unlock memory:hamin      # archive unlocks: cg:<id> memory:<id> music:<id> cinematic:<id>
@autosave
```

## Staging

```
@bg studio_lobby t=fade d=1.2      # t = fade | cut | memory | flash | slow
@show hamin smile at=l             # at = l c r fl fr   (auto if omitted)
@hide hamin   /  @hide all
@expr hamin shy
@cam closeup hamin                 # wide | closeup <id> | twoshot <a> <b> | shoulder <id> | pushin | reveal | orbit | pan
@music hamin_theme                 # see manifest; @music stop
@amb ocean                         # rain ocean city subway night wind arcade cinema room none
@sfx door                          # see manifest
@fx memory n=1                     # memory rain stars film rhythm prism sketch waves snow dust off
@cg hamin_beach                    # full-screen illustration (unlocks in gallery); @cg off
@video hamin_moment                # full-screen cinematic clip
@time 01:40                        # clock HUD
@chapter act2                      # chapter title card (key chapter.act2 in UI locale)
@letterbox on / off                # cinematic bars
@textbox memory                    # normal | memory | echo | phone
@wait 1.5
@shake / @flash
@minigame rhythm                   # rhythm | sketch   → sets var.minigame_score
@name                              # player name entry
@ending hamin                      # records ending
@credits                           # roll credits
```

Speaking members appear automatically if not on stage (max three; least-recent leaves).
Use `@hide` to clear the stage for intimate scenes.
