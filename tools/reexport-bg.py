#!/usr/bin/env python3
"""Re-export backgrounds/CGs from the saved originals at phone-retina resolution."""
import pathlib
from PIL import Image
ROOT = pathlib.Path(__file__).resolve().parent.parent
for src in sorted((ROOT / 'assets/generated/bg').glob('*.png')):
    im = Image.open(src).convert('RGB')
    wide = im.width > im.height
    tw, th = (2560, 1440) if wide else (1080, 1920)
    sc = max(tw / im.width, th / im.height)
    im = im.resize((round(im.width * sc), round(im.height * sc)), Image.LANCZOS)
    l, t = (im.width - tw) // 2, (im.height - th) // 2
    im = im.crop((l, t, l + tw, t + th))
    out = ROOT / 'public/assets/bg' / (src.stem + '.webp')
    im.save(out, 'WEBP', quality=84, method=6)
    print(out.name, im.size, out.stat().st_size // 1024, 'KB')
