#!/usr/bin/env python3
"""Download a generated asset and store it as an optimised WebP (or copy mp4) under public/assets.

usage: import-asset.py <url> <kind> <name> [--w 720] [--h 1280] [--keep-alpha] [--fit cover|contain]
  kind: bg | cg | char/<member> | video | ui | identity/<member>
Also writes the original file under assets/generated/<kind>/<name>.<ext> for the ledger.
"""
import sys, os, io, urllib.request, shutil, json, pathlib

from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
args = sys.argv[1:]
if len(args) < 3:
    print(__doc__); sys.exit(1)
url, kind, name = args[:3]
opts = {'w': 720, 'h': 1280, 'alpha': False, 'fit': 'cover', 'q': 82, 'top': 0.0, 'bottom': 1.0}
i = 3
while i < len(args):
    a = args[i]
    if a == '--w': opts['w'] = int(args[i+1]); i += 2
    elif a == '--h': opts['h'] = int(args[i+1]); i += 2
    elif a == '--keep-alpha': opts['alpha'] = True; i += 1
    elif a == '--fit': opts['fit'] = args[i+1]; i += 2
    elif a == '--q': opts['q'] = int(args[i+1]); i += 2
    elif a == '--crop': opts['top'] = float(args[i+1]); opts['bottom'] = float(args[i+2]); i += 3
    else: i += 1

req = urllib.request.Request(url, headers={'User-Agent': 'smtr25-import/1.0'})
data = urllib.request.urlopen(req, timeout=120).read()

gen_dir = ROOT / 'assets' / 'generated' / kind
gen_dir.mkdir(parents=True, exist_ok=True)

if kind == 'video':
    out = ROOT / 'public' / 'assets' / 'video' / f'{name}.mp4'
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_bytes(data)
    (gen_dir / f'{name}.mp4').write_bytes(data)
    print('video', out, len(data) // 1024, 'KB'); sys.exit(0)

img = Image.open(io.BytesIO(data))
ext = (img.format or 'png').lower()
(gen_dir / f'{name}.{ext}').write_bytes(data)

if opts['top'] > 0 or opts['bottom'] < 1:
    sw, sh = img.size
    img = img.crop((0, int(sh * opts['top']), sw, int(sh * opts['bottom'])))
target = (opts['w'], opts['h'])
if opts['fit'] == 'cover':
    sw, sh = img.size
    scale = max(target[0] / sw, target[1] / sh)
    nw, nh = round(sw * scale), round(sh * scale)
    img = img.resize((nw, nh), Image.LANCZOS)
    left, top = (nw - target[0]) // 2, (nh - target[1]) // 2
    img = img.crop((left, top, left + target[0], top + target[1]))
else:
    img.thumbnail(target, Image.LANCZOS)

if opts['alpha']:
    img = img.convert('RGBA')
else:
    img = img.convert('RGB')

sub = {'bg': 'bg', 'cg': 'cg', 'ui': 'ui'}.get(kind, kind)
if kind.startswith('char/'):
    out = ROOT / 'public' / 'assets' / 'characters' / kind.split('/')[1] / f'{name}.webp'
elif kind.startswith('identity/'):
    out = ROOT / 'assets' / 'characters' / kind.split('/')[1] / 'identity' / f'{name}.webp'
else:
    out = ROOT / 'public' / 'assets' / sub / f'{name}.webp'
out.parent.mkdir(parents=True, exist_ok=True)
img.save(out, 'WEBP', quality=opts['q'], method=6)
print('saved', out.relative_to(ROOT), img.size, out.stat().st_size // 1024, 'KB')
