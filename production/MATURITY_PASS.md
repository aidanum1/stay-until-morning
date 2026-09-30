# Maturity pass — producer note (2026-09-30)

> "Do not make them have childish emotions. They are adult men." / "They are love interests."

The eight are written as **adult men in their mid-twenties**: self-possessed, capable, warm.
You are revising ONE file, `story/6N_<member>_more.s25`, line by line. Keep every scene id,
the scene order, all `@goto`/`@call`/`@ending`/`@credits` flow, every flag/var name, and the
three-option menu in `<member>_final` exactly as wired. Keep the plot of each chapter.

## Change
- **Childish emotional register → adult.** Remove pouting, sulking, whining, squealing,
  bouncing, giddy over-excitement, flailing, tantrum-like or little-kid reactions, baby-talk,
  strings of exclamation marks, "yay"-type interjections, and being flustered into
  incoherence. An adult can be delighted, moved, nervous or shy — show it the way a grown man
  does: a pause, a lower voice, a held look, a dry line, saying the thing plainly.
- **Humour stays, but it is dry, quick and affectionate** — wit between adults, not
  silliness or mascot energy. Cut gags that make someone look like a child (including
  other members who pass through). Nobody is the butt of a joke.
- **Romantic weight.** He is a love interest, not a little brother. Let him be steady and
  intentional: he notices, decides, says what he wants, and gives the protagonist room to
  answer. Attraction is shown through attention, restraint and directness — never
  possessiveness, jealousy, pressure, or anything physical beyond a hand, a shoulder, a coat,
  standing close. Consent stays explicit.
- **Vulnerability stays, with composure.** Fear about debut or the future is said in a
  level voice by someone who will be all right. No one cries alone, is shamed or humiliated.
- Expression tags: prefer `neutral smile thinking`; use `shy`, `surprised`, `laugh` sparingly
  and only where an adult would plausibly show it.
- Replace any emoji characters with plain text. Do not add any.

## Keep
All rules in `production/EXPANSION_BRIEF.md` and `production/WRITER_BRIEF.md` still apply
(no claims about real people's private lives, banned phrases, asset ids only from the
manifest, no @cg/@video/@chapter/@unlock). Word count must stay **≥ 9,800** by the checker.

## Validate
`npx vite-node tools/check-story.ts 6N_<member>_more <member>` → 0 errors. Do not run
`npm run locales`, the build, or the tests. Do not touch any other file.

## Report
Checker line, and 5–8 short before → after examples of lines you changed.
