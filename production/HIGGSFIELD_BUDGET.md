# Higgsfield Budget Ledger

**Hard limit: 550 credits. Production target: ≤ 500. Reserve: 50 (emergencies only).**

`remaining = 550 − confirmedSpent`

Prices verified by `get_cost` preflight (see HIGGSFIELD_TOOLS.md): nano_banana_pro 2K = 2.0 /
image (with or without references); kling3_0 5 s = 8.75 / clip; remove_background = measured below.

## Plan (envelope)
| Phase | Content | Est. |
|---|---|---:|
| A — identity | 8 canonical identity images (+ ≤ 1 reroll each) | 16–32 |
| B — reusable character cards | 6 expression variants × 8 members, reference-anchored | 96 |
| B' — cut-outs | background removal for 56 cards | ≤ 30 (measured) |
| C — environments + key moments | 28 backgrounds, 22 CGs | 100 |
| C' — cinematics | 10 × kling3_0 5 s from the CG | 87.5 |
| D — corrections / key art | rerolls, menu art | ≤ 40 |
| **Total planned** | | **≈ 330–385** |
| Reserve | untouched unless essential | 50 |

## Ledger
| # | Asset | Member | Purpose | Est. | Actual | Approved | Job id / note |
|---|---|---|---|---:|---:|---|---|
| 1 | identity/canonical | hamin | Phase A identity | 2.0 | 2.0 | ✔ | 6cbc41bf-aa5b-4e10-9091-1ea0d26a31cd |

| 2 | identity/canonical | hyunjun | Phase A identity | 2.0 | 2.0 | ✔ | 8e3690ee-47d4-45a7-ab92-3ad8e4a77a33 |
| 3 | identity/canonical | charlie | Phase A identity | 2.0 | 2.0 | ✔ | 689471a0-6e09-481e-8390-962a3f8b9c0d |
| 4 | identity/canonical | haruta | Phase A identity | 2.0 | 2.0 | ✔ | e6a23646-34aa-4c82-ba0d-dc638241c3d1 |
| 5 | identity/canonical | justin | Phase A identity | 2.0 | 2.0 | ✔ | 7380bc5e-5ed6-4efc-bf96-7cc9ca97422b |
| 6 | identity/canonical | songha | Phase A identity | 2.0 | 2.0 | ✔ | fcecc9cf-2699-4b08-9df3-1348715b0a21 |
| 7 | identity/canonical | hanbi | Phase A identity | 2.0 | 2.0 | ✔ | 09aa12be-7366-4cb1-bfef-e7cc23080ee5 |
| 8 | identity/canonical | daniel | Phase A identity | 2.0 | 2.0 | ✔ | b8f6ede0-aca9-4b69-9983-ffd537b92129 |

| 9–16 | identity v2 (L&DS-style, ethereal aura) | all 8 | Phase A identity, second pass (first pass too cartoon — rejected) | 16.0 | 16.0 | ✔ | b9d03d6b hamin · c99c76da hyunjun · 00ed4d25 charlie · 4afed593 haruta · 0ff8f885 justin · 414255e2 songha · 55b62416 hanbi · 6cf46fce daniel |

| 17–20 | identity v3 (style-anchored to approved Hamin+Hanbi renders) | hyunjun, charlie, justin, daniel | v2 still Pixar-leaning for these four → strategy change (style references) | 8.0 | 8.0 | ✔ | pending ids |

| 21 | style calibration v4 (stylised-realistic otome look) | hamin | single-image style test before committing the batch | 2.0 | 2.0 | ✔ | b8601955-b9f7-4822-9ae3-07b42a9b48e1 |

| 22–29 | identity v5 (photo-anchored via image_references, L&DS-style) | all 8 | Phase A identity — producer-approved style + likeness | 16.0 | 16.0 | ✔ | ecb27957 hamin · a6f0a007 hyunjun · 49febece charlie · 7ed53ab3 haruta · f1441a30 justin · ce5fb909 songha · f5fd8831 hanbi · fadaa8a7 daniel |

| 30–31 | maturity calibration (nano 2K vs gpt high, photo ref) | hamin | producer: v5 too young — test before redoing | 3.5 | 3.5 | ✔ | 263ce9d5 nano · 40e3e5a6 gpt |

| 32–38 | identity v6 (gpt_image_2_5 high, photo ref, mature) | 7 members (Hamin = job 40e3e5a6 from the test) | producer picked gpt direction | 10.5 | 10.5 | ✔ | 0926fc1a hyunjun · 3203d473 charlie · 0bec4c3b haruta · 2d44d882 justin · 01a7998c songha · 23785210 hanbi · cfacdfd8 daniel |

| 39 | background removal test | hamin | measure cost, sprite cut-out | ? | tbd | ✔ | 379eb859 |
| 40–45 | expressions (smile laugh surprised thinking shy sad), gpt high, refs=[canonical, photo] | hamin | Phase B probe | 9.0 | 9.0 | ✔ | aa31d37c 1c914e48 7981bf4e 3127772f 4cc33952 baaf73aa |
| 46–57 | environments batch 1 (nano 2K) | — | studio_ext_night, studio_lobby, studio_lobby_morning, studio_hall, studio_archive, studio_practice, studio_rooftop, studio_lounge, studio_frontdesk, mem_beach, mem_subway, mem_street_night | 24.0 | 24.0 | ✔ | 15a9ad02 1b6bd8b0 f65b0d38 2f19ad08 78c4c473 456ec068 2837d272 3e5acfef f27a2988 fcd94e27 7e99f37d e03dd5ee |

| 58 | env model test gpt medium 2K | — | studio_ext_night compare | 1.0 | 1.0 | ✔ | 813e5486 |
| 59–100 | expressions ×6 for 7 members (gpt high, refs) | all but hamin | Phase B | 63.0 | 63.0 | ✔ | see production/jobs.json |
| 101–106 | bg removal ×6 | hamin | sprites | ? | tbd | ✔ | jobs.json cutouts |

| 107–121 | environments batch 2 (gpt medium 2K @1.0) | — | mem_airport, mem_home, mem_cinema, mem_practice, mem_rooftop_stars, mem_lineart, mem_color, mem_arcade, mem_booth, mem_patchwork, dawn_street, dawn_rooftop, dawn_cafe, dawn_subway, dawn_river | 15.0 | 15.0 | ✔ | pending ids |

| 122–123 | lobby panoramas 16:9 (gpt medium 2K) | — | hub (night + morning) | 2.0 | 2.0 | ✔ | pending |

| 124–144 | 21 CGs (gpt high; 16 member CGs @1.5, 2 no-ref @2.75?, 3 group multi-ref @1.5+) | all | Phase C key moments + endings | ~36 | ~36 | ✔ | pending ids |

| 145–154 | 10 cinematics (kling3_0 5 s 9:16, start_image = CG) | all | Phase C signature Memory Moments + opening + sunrise | 87.5 | 87.5 | ✔ | see jobs.json video |

| 155–162 | 8 living-portrait idle loops (kling3_0 5 s, start_image = identity) | all | menu hero / animated character presence | 70.0 | 70.0 | ✔ | jobs.json idle |

**Confirmed spent: ≈380 (+ bg-removal ×7 tbd) · Remaining: ≈ 170** (reserve 50 untouched → ≈120 usable)

3D check (2026-09-30): textured + rigged image_to_3d preflights at **35 credits per character** (280 for eight) — over budget, and single-image meshes of faces are far below the quality of the reference-anchored renders. Not pursued.

Model policy from here: gpt_image_2_5 medium 2K (1.0) for environments, gpt high (1.5 with reference) for character work and CGs. Background removal done locally with rembg (free).

**Decision (producer, 2026-09-29): video cinematics over 3D meshes** — see HIGGSFIELD_TOOLS.md.

Reference photos (uploaded by the producer, never redistributed): hamin a8741f2c · hyunjun 18b6a6c9 · charlie ce8e9b29 · haruta 3605d717 · justin 4a7fe3f1 · songha 0dc582ca · hanbi 694d07f8 · daniel 7dfdeaa8

Locked identities (v2): hamin b9d03d6b · haruta 4afed593 · songha 414255e2 · hanbi 55b62416

### 2026-09-30 — 3D quality test (producer request: "try making 1 AA level 3d with hamin")
Planned: 1 × gpt_image_2_5 high full-body A-pose turnaround source for Hamin (ref = locked identity) ≈ 1.5–2.75, then 1 × image_to_3d textured + PBR + rigged ≈ 35. Planned total ≈ 38 → remaining ≈ 132 (≈82 usable above reserve). One attempt only; no retries without a changed strategy.
| 163 | gpt_image_2_5 high, full-body A-pose source (ref = identity) | hamin | 3D test source | 1.5 | 1.5 | ✔ | 20e93a74-66cb-4518-95b4-973ae9a62503 |
| 164 | image_to_3d textured + PBR + rigged | hamin | 3D quality test | 35 | 35 | ✔ (delivered; quality rejected) | 6d03bf38-9a38-40ec-bddf-38522c5ccbc9 |

Result: 30.7k tris, 24 bones, one 2K albedo. Coat/trousers/shoes usable; **face and hair are not** (smeared face texture, no likeness, hair is a solid shell, holes on the coat back). Far below the 2D identity art — not shippable, not retried.

**Confirmed spent: ≈416.5 · Remaining: ≈133.5** (reserve 50 untouched → ≈83.5 usable)

### 2026-09-30 — "Drama wardrobe" cinematics (producer request: more videos, new clothes/environments per story, love-interest styling)
Planned: 8 × gpt_image_2_5 high with identity reference (1.5) = 12, then 8 × kling3_0 5 s from those stills (8.75) = 70. Planned total 82 → remaining ≈ 51.5 (reserve 50 intact, 1.5 spare). **No retries possible after this batch without touching the reserve.**
| 165–172 | 8 × gpt_image_2_5 high "drama wardrobe" stills (ref = identity) | all | new outfits + story environments | 12.0 | 12.0 | ✔ | jobs.json dramaStills |
| 173–180 | 8 × kling3_0 5 s from those stills | all | drama cinematics | 70.0 | 70.0 | ✔ delivered | jobs.json dramaVideos |

**Confirmed spent: ≈498.5 · Remaining: ≈51.5** — only the 50-credit emergency reserve (+1.5) is left. No further generation without the producer's explicit say-so.

### 2026-09-30 — Drama redo for Hyunjun, Justin, Daniel (producer feedback: builds too big, clothes off-character)
**Producer explicitly authorised the emergency reserve for this ("Use reserve, up to 4 members").** Planned: 3 × gpt_image_2_5 high with identity + real reference photo (≈1.5–2 each) + 3 × kling3_0 5 s (8.75) ≈ 31–32. Expected remaining ≈ 20. Fix: slender idol builds taken from the reference photos; wardrobe derived from each member's signature style in CHARACTER_BIBLE (Hyunjun street bomber/pink, Justin loose dancer layers/red, Daniel iridescent jacket).
| 181–183 | 3 × gpt_image_2_5 high redo stills (identity + real photo refs, slim build, character wardrobe) | hyunjun, justin, daniel | replaces rejected stills | ≈4.5–6 | tbc | ✔ | jobs.json dramaStillsV2 |
| 184 | gpt_image_2_5 high, Daniel black leather jacket (producer request) | daniel | replaces iridescent jacket still | ≈1.5–2 | tbc | submitted | 7742a18d |
| 185–186 | 2 × kling3_0 5 s redo videos | hyunjun, justin | replace rejected clips | 17.5 | 17.5 | submitted | jobs.json dramaVideosV2 |
| 187 | kling3_0 5 s redo video | daniel | leather-jacket clip | 8.75 | 8.75 | ✔ delivered | b649cf9f |

**After this redo: spent ≈ 532 of 550 · remaining ≈ 18–19.** Reserve partly used with the producer's explicit authorisation. No further generation.

### 2026-09-30 — Soundtrack (producer request: "make a real game music ... using higgsfield mcp")
Image costs for the redo stills were not itemised; worst case (2.75 each × 4) puts spend at ≤ 535.75. Planned: 5 × sonilo_music 40 s at 2.5 = 12.5 → worst-case total 548.25, under the 550 hard limit. Tracks: night, quiet, echo, fun, dawn (aliased to the 18 music ids). This is the last spend possible.
| 188–192 | 5 × sonilo_music 40 s (night, quiet, echo, fun, dawn) | — | recorded soundtrack replacing the procedural music | 12.5 | 12.5 | ✔ | jobs.json music |

**Final: spent ≈ 543–548 of 550. Budget exhausted — no further Higgsfield generation.**
