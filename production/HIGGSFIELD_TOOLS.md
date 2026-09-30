# Higgsfield MCP — what is actually available (inspected 2026-09-29)

Inspected by preflighting real tool calls with `get_cost: true` (no credits spent) and by reading
the MCP tool descriptions. Nothing below is assumed.

## Tools exposed to this session
| Tool | Purpose | Notes |
|---|---|---|
| `generate_image` / `generate_image_batch` | text→image and reference-guided image | widget vs. headless (1–12 jobs) |
| `generate_video` / `generate_video_batch` | text/image→video | |
| `generate_3d` | image→GLB mesh | `image_to_3d`, `multi_image_to_3d`, `sam_3_3d`, `3d_rigging` |
| `remove_background` | cut-out of an image/video | no cost preflight parameter |
| `upscale_image` | 2K/4K upscale (ByteDance) | needs source width/height |
| `show_characters` | trained "Soul" identity models | needs 5–20 photos → **not used** (we do not use real photos of the members) |
| `show_reference_elements` | saved reference elements | not needed; job ids can be passed directly as references |
| `generate_audio` | text-to-speech only | no music/SFX model outside the game pipeline → music is procedural (Web Audio) |
| `job_display`, `show_generation_by_ids`, `show_generations` | inspect results | |
| `media_upload`, `media_import_url`, `media_confirm` | bring our own media | |

`models_explore` is referenced in descriptions but is **not** exposed here; model ids and roles were
discovered through error messages and preflights.

## Image models (verified)
| Model | Cost (9:16) | Reference input | Notes |
|---|---:|---|---|
| `nano_banana_pro` 1K | 2.0 | `image_references` | |
| `nano_banana_pro` 2K | 2.0 | `image_references` | **chosen default** (best value; strong identity consistency with references) |
| `nano_banana_pro` 4K | 4.0 | `image_references` | |
| `nano_banana_2` | 1.5 | — | |
| `gpt_image_2_5` (default quality) | 0.25 | `image_references` | very cheap; weaker on stylised character consistency |
| `gpt_image_2_5` medium 2K | 1.0 | `image_references` | |
| `gpt_image_2_5` high 2K | 2.75 | `image_references` | high with reference: 1.5 |
| `soul_cast` | ~0.12 | — | 16:9 only, photoreal avatar style → not suitable (we avoid photorealism) |

Unknown ids rejected: `seedream_4_5`, `seedream_5_lite`.

## Video models (verified)
| Model | Cost | Reference |
|---|---:|---|
| `kling3_0` 5 s 9:16 | 8.75 | `start_image` (job id of a CG) — **chosen** for the ten cinematics |
| `minimax_h3` 6 s 9:16 | 12.0 | |
| `seedance_2_5` 5 s 9:16 | 35.0 | too expensive |

## 3D (verified)
| Model | Cost | Notes |
|---|---:|---|
| `image_to_3d` | 20 credits per mesh (untextured, unrigged; texture/rigging/animation are extra flags) | 8 members × ≥20 = 160+ credits for meshes of uncertain face quality, before rigging/expressions |

**Decision:** 3D mesh generation is not used. Image-to-3D of stylised faces is low quality and
rigging eight heads with seven expressions each would exceed the budget and the maintenance
capacity of a browser project. The game instead renders **stylised 2.5D character cards inside a
real Three.js 3D stage** (parallax camera rig, particles, post-processing), which gives the
cinematic presentation at a fraction of the cost and keeps every expression identity-consistent.

## Output formats
- Images: PNG/JPEG URLs (downloaded with curl and converted to WebP by `tools/import-asset.ts`).
- Video: MP4 URL.
- 3D: GLB URL (unused).

## Reference-image workflow used for identity consistency
1. Generate the canonical identity image per member from **text only** (bible visual brief) — no
   real photographs are used as references anywhere, so the characters are inspired-by, not replicas.
2. Pass that job id as `image_references` for every expression variant, CG and key art of that member.
3. Two poor attempts for the same purpose → change the prompt/reference strategy, never brute-force.
