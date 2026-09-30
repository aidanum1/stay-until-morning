# Art prompt system (v2 — premium 3D otome, "soft realism")

Direction from the producer: **closer to Love and Deepspace's production feel** (high-end real-time 3D,
soft-realistic faces, cinematic lighting, realistic proportions), **not** stylised 2D animation /
Pixar / cel-shading. We take inspiration from the *production value* only — no L&DS designs, UI,
logos, shaders or shots are copied.

## Style block (prefix for every character prompt)
```
High-end 3D otome game cinematic render, Unreal-Engine-5-quality real-time character: soft realism, realistic facial proportions and bone structure, subsurface-scattering skin with fine pores and natural blush, moist expressive eyes with detailed irises and soft catchlights, individually rendered hair strands with natural highlights, fabric with real weave and stitching, physically based lighting with a soft key light and cool rim light, shallow depth of field, gentle bloom, subtle film grain. NOT cartoon, NOT anime, NOT cel-shaded, NOT Pixar, NOT chibi, NOT exaggerated features, NOT photograph. Handsome young adult East Asian man, K-pop-trainee polish, understated idol styling.
```

## Framing block (identity + expression cards)
```
Three-quarter view, knee-up framing, centered, arms relaxed, looking toward camera. Plain flat neutral mid-grey seamless studio background, even soft lighting, no props, no text, no watermark. Vertical 9:16.
```

## Expression variants (reference = canonical identity job id via `image_references`)
Prefix: `Same character, same face, same hair, same outfit and same framing as the reference image. Only the expression changes:`
- neutral — calm, lips closed, relaxed brows
- smile — small warm closed-mouth smile, eyes softening
- laugh — open laugh, eyes crinkled, head tilted a little
- surprised — brows up, lips parted, slight lean back
- thinking — eyes down-left, faint frown, lips pressed
- shy — small smile looking slightly away, warm blush across cheeks and ears
- sad — soft downcast eyes, mouth neutral, quiet

## Per-member identity lines
See `assets/characters/<member>/identity/identity.json` (hair, face, body, outfit, motif). When
reference photos are approved for use they are passed as `image_references` together with the text;
otherwise the text alone is used.

## Environments (no characters)
```
Cinematic 3D environment concept for a premium romance visual novel, vertical 9:16, dreamy contemporary Seoul + memory technology, soft volumetric light, wet reflections, glass, light leaks, subtle film grain, midnight blue / soft violet / silver / pale cyan palette with warm amber accents. Empty of people. No text.
```
Per-background subject lines live in `tools/art-manifest.ts`.

## CGs (member reference + environment)
```
Cinematic key illustration, same rendering style as the character reference (soft-realistic 3D, not anime). Vertical 9:16. [scene]. The protagonist is shown only as hands / a coat sleeve / a soft silhouette of light — never a face.
```


---

# v6 — FINAL pipeline (approved by the producer, 2026-09-29/30)

**Look:** mature (mid-twenties), stylised-realistic 3D otome render in the production tier of top Chinese mobile romance games — defined cheekbones/jaw, adult eye proportions, porcelain skin shading, strand hair, teal-cyan cinematic rim light, per-member ethereal aura. Earlier passes (v1 Pixar-like, v2 photoreal, v5 too young) were rejected.

**Model:** `gpt_image_2_5` quality `high` (1.5 credits with a reference) for all character work; `gpt_image_2_5` `medium` 2K (1.0) for environments; `kling3_0` 5 s for cinematics.

**Likeness:** each member's public profile photo was uploaded *by the producer* through the Higgsfield widget and passed as `image_references`. The photos themselves are never stored in the repo or shipped.

**Identity prompt (per member, only the hair/outfit/aura lines change):**
```
Re-render the man in the reference photo as a premium 3D otome game character in the stylised-realistic look of top-tier Chinese mobile romance games: a MATURE adult man in his mid-twenties, keep his exact facial identity recognisable. Adult proportions and bone structure: defined cheekbones, clean jawline, refined nose, eyes proportionate to a real adult face (NOT oversized, NOT childlike, NOT cute), <expression>. Semi-realistic 3D with flawless skin shading, realistic strand-by-strand hair with glossy highlights: <hair>. Outfit: <outfit>. Dramatic cinematic lighting: deep teal-cyan ambient, strong cool rim light, soft key light, <aura>, subtle bloom. Framing: knee-up, three-quarter view, looking toward camera, centered, vertical 9:16, dark teal-blue atmospheric background with soft light streaks, no text. NOT cartoon, NOT Pixar, NOT anime doll, NOT a photograph.
```

**Expression variants:** `image_references = [canonical identity job, reference photo]` + "Same character … Only the expression changes: <smile|laugh|surprised|thinking|shy|sad>".

**Sprites:** backgrounds removed locally with `rembg` (`tools/make-sprites.py`, free); the aura is re-created in-engine as an additive glow in the member's colour (`src/rendering/stage.ts`).

**CGs:** `image_references = [identity job]` (group shots: all eight identity jobs); the protagonist appears only as a hand, sleeve or silhouette of light.
