#!/usr/bin/env python3
"""Cut character cards out of their generated background and save game sprites.

usage: make-sprites.py [member ...]
Reads  assets/generated/expr/<member>_<expr>.png
Writes public/assets/characters/<member>/<expr>.webp  (752x1344, RGBA — full source resolution)

Background removal runs locally with rembg (free), so no Higgsfield credits are used.
All expressions of a member share the same source framing, so we never crop to the
subject's bounding box — that keeps the head in the same place across expressions.
"""
import sys, io, pathlib
from PIL import Image, ImageFilter
from rembg import remove, new_session

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / 'assets' / 'generated' / 'expr'
OUT = ROOT / 'public' / 'assets' / 'characters'
W, H = 752, 1344

members = sys.argv[1:] or sorted({p.name.split('_')[0] for p in SRC.glob('*.png')})
session = new_session('isnet-general-use')

for m in members:
    for src in sorted(SRC.glob(f'{m}_*.png')):
        expr = src.stem.split('_', 1)[1]
        dst = OUT / m / f'{expr}.webp'
        if dst.exists() and Image.open(dst).size == (W, H):
            continue
        img = Image.open(src).convert('RGBA')
        cut = remove(img, session=session, post_process_mask=True)
        # soften the matte edge a touch so hair strands don't look cut with scissors
        a = cut.getchannel('A').filter(ImageFilter.GaussianBlur(0.6))
        cut.putalpha(a)
        # keep the source framing; fit width, anchor to bottom
        scale = W / cut.width
        nh = round(cut.height * scale)
        cut = cut.resize((W, nh), Image.LANCZOS)
        canvas = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        y = H - nh if nh <= H else 0
        canvas.paste(cut.crop((0, 0, W, min(nh, H))) if nh > H else cut, (0, max(0, y)))
        dst.parent.mkdir(parents=True, exist_ok=True)
        canvas.save(dst, 'WEBP', quality=88, method=6)
        # coverage sanity: how much of the frame is opaque
        cov = sum(1 for p in canvas.getchannel('A').getdata() if p > 128) / (W * H)
        print(f'{m}/{expr}: {dst.stat().st_size // 1024} KB, coverage {cov:.2f}')
