# Translation Guide — 00:25 · Stay Until Morning

You are localising a wholesome romance visual novel (all characters adults; the past memories are non-romantic). English is canonical. **Do not translate mechanically** — rewrite each line as a native writer would, preserving tone, humour, intimacy, subtext and rhythm. Lines are read on a phone: keep them short.

## Files
- Source: `locales/src/story/en/<file>.json` — `{ "scene.NNN": "English line" }`.
- Target: `locales/src/story/<lang>/<file>.json` — **exactly the same keys**, translated values. Nothing else. Valid JSON (no trailing commas, escape quotes as `\"`).
- Context for who says a line: run `npx vite-node tools/line-context.ts <file>` from the project root — prints `key | speaker | English`. Speaker `narration` = the protagonist's inner voice (present tense); `choice` = a menu option the player picks; `you` = the protagonist speaking aloud; `echo` = the archive system; `voice` = the founder Seo Yeonhwa's voice log; `clerk`/`staff` = minor NPC.
- Character bible: `research/CHARACTER_BIBLE.md` (§1 protagonist, §2 ECHO, §3 group + speech progression, §4 each member's voice).

## Must keep verbatim inside strings
- `{{playerName}}` — the player's name (any script). Never alter, never omit when present. You may add it where natural, and you may drop it where the target language wouldn't repeat a name — but never break the token.
- `{p}` — a short pause. Keep roughly where it is.
- `*word*` — emphasis. Keep one pair where emphasis matters; fine to drop if the language shows emphasis differently.

## Universal rules
1. **The protagonist has no gender and no age relative to the cast.** Never use gendered pronouns, gendered nouns or age-based kinship for them. Their appearance is never described.
2. Members: Hanbi (22, eldest), Songha (22), Daniel (21), Justin / Hyunjun / Haruta / Hamin (20; same-age friends), Charlie (19, youngest).
3. No new content, no removed content, no softening of the key lines. Keep jokes funny in the target language (adapt, don't transliterate).
4. ECHO speaks like a precise, slightly odd archive system that is slowly learning warmth: formal, exact, timestamps and record codes, occasional accidental humour. Keep record headers (`RECORD 02 — OWNER: HAMIN. …`) as formatted headers.
5. Place names stay real (Mapo, Hongdae, Hapjeong, Sindorim, Dangsan, Busan). Fictional names: Studio 25, ECHO, the Future Letter Project, Seo Yeonhwa (서연화 / ソ・ヨナ / 徐妍花), *The Umbrella Shop* (film), the Dalbit cinema, "Mr. Kim" (claw machine), "Gerald" (a star).
6. Numbers/times: keep 24h times as digits (00:25, 04:57).

## Korean (ko)
- **Particles after `{{playerName}}`**: write `{{playerName}}(이)가`, `{{playerName}}(은)는`, `{{playerName}}(을)를`, `{{playerName}}(과)와`, `{{playerName}}(아)야`, `{{playerName}}(이)랑`, `{{playerName}}(으)로` etc. — the engine resolves batchim at runtime. Prefer `{{playerName}}` + `씨`/`님` avoided: **members address the protagonist by bare name** (or `{{playerName}}(아)야` once casual).
- **Speech levels (핵심)**: Prologue — everyone 존댓말 with the stranger (해요체). After Daniel's "stop being polite" line at the end of the Prologue, **Daniel, Hyunjun, Charlie, Justin, Songha, Hanbi switch to 반말**. **Hamin and Haruta keep 해요체 until the `# SPEECH SHIFT` moment in their own Memory Room**, then 반말. (In `hub`/interlude scenes before their room they are still polite; the script branches on `flag.room_*` — translate each branch as its context implies.) ECHO: 합쇼체/격식체 ("~습니다"), gradually warmer but still formal. Founder Seo Yeonhwa: warm, casual-adult 해요체 with wry 반말 asides.
- Between members: 반말; younger → older uses 형 naturally (Charlie calls everyone 형; Hamin/Haruta/Hyunjun/Justin call Hanbi/Songha/Daniel 형). Never 형/누나/오빠/언니 toward the protagonist.
- Choices: the player's spoken choices in quotes stay quotes; actions stay as brief actions in the same register as narration.
- Narration: 현재형, 담담하고 관찰적인 문체, 짧은 문장. Avoid translationese ("~하는 것이다"). Use natural 구어체 in dialogue.

## Japanese (ja)
- Protagonist: never 彼/彼女, never 君 from ECHO. Members call the protagonist `{{playerName}}さん` while polite; after the Prologue switch, most drop to `{{playerName}}` (呼び捨て) — Charlie may keep さん playfully once or twice; **Hamin and Haruta keep です・ます and さん until their SPEECH SHIFT**, then plain form and bare name. Player lines (`you`): neutral, mostly omit pronouns; if unavoidable use 私. Narration: plain form (だ・である mixed with sentence fragments), present tense, observational.
- ECHO: です・ます, precise, slightly stiff (「記録02——所有者：ハミン。状態：封印。」). Founder: warm casual adult speech.
- Members among themselves: casual; Justin/Haruta occasionally natural (they are Japanese in the fiction) — the English marks the rare Japanese asides; render them as natural Japanese without italic markers.
- Names: ハミン, ヒョンジュン, チャーリー, ハルタ, ジャスティン, ソンハ, ハンビ, ダニエル, エコー(ECHO can stay "ECHO").

## Simplified Chinese (zh-CN)
- Natural modern spoken Mandarin; 你 for the protagonist; never 他/她 for the protagonist (restructure or use the name / 你). Members: 哈敏, 贤俊, 查理, 春太, 贾斯汀, 松河, 韩非, 丹尼尔 — **use these consistently**. ECHO: 你 with formal, precise phrasing (「记录02——所有者：哈敏。状态：封存。」).
- Polite→casual progression: show it through wording (您/请 → 你/直接称名, fewer softeners) — Hamin and Haruta stay slightly formal until their SPEECH SHIFT.
- Narration: 简洁、现在时、克制、有画面感; dialogue: 口语化，避免翻译腔。

## Quality bar
Read the whole file first for context. Translate scene by scene. Every line must be idiomatic on its own and consistent with its neighbours. When done, validate JSON with `python3 -m json.tool locales/src/story/<lang>/<file>.json > /dev/null` and check key parity with `npx vite-node tools/locale-check.ts <lang> <file>`.
