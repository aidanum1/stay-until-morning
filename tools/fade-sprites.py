#!/usr/bin/env python3
"""Soft-fade the bottom edge of every sprite so the waist cut never shows as a hard line."""
import pathlib
from PIL import Image
ROOT = pathlib.Path(__file__).resolve().parent.parent
for f in sorted((ROOT / 'public/assets/characters').glob('*/*.webp')):
    im = Image.open(f).convert('RGBA')
    if im.info.get('faded') or (f.parent / ('.' + f.stem + '.faded')).exists():
        continue
    w, h = im.size
    a = im.getchannel('A')
    px = a.load()
    start = int(h * 0.9)
    for y in range(start, h):
        k = 1 - (y - start) / (h - start)
        for x in range(w):
            px[x, y] = int(px[x, y] * k)
    im.putalpha(a)
    im.save(f, 'WEBP', quality=88, method=6)
    (f.parent / ('.' + f.stem + '.faded')).touch()
    print('faded', f.relative_to(ROOT))
