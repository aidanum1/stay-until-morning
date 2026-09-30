#!/usr/bin/env python3
"""Build the 30 s game trailers (9:16 and 16:9) from existing footage.

Writes title overlays + a spec into assets/generated/trailer/ and renders with tools/out/trailer
(compile first: swiftc -O tools/trailer.swift -o tools/out/trailer).
Output: marketing/stay-until-morning-trailer-9x16.mp4 and -16x9.mp4
"""
import json, pathlib, subprocess
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = pathlib.Path(__file__).resolve().parent.parent
WORK = ROOT / 'assets/generated/trailer'
VID = ROOT / 'public/assets/video'
OUT = ROOT / 'marketing'
WORK.mkdir(parents=True, exist_ok=True)
OUT.mkdir(exist_ok=True)

SERIF = '/System/Library/Fonts/Supplemental/Didot.ttc'
SANS = '/System/Library/Fonts/Avenir Next.ttc'
CJK = next(p for p in ['/System/Library/Fonts/PingFang.ttc', '/System/Library/Fonts/Hiragino Sans GB.ttc', '/System/Library/Fonts/STHeiti Medium.ttc'] if pathlib.Path(p).exists())
LEGAL = ('Unofficial fan-made fictional project. Not affiliated with SM Entertainment or the featured artists. '
         'Character portrayals are fictional interpretations inspired by publicly available appearances and content.')
URL = 'aidanum1.github.io/stay-until-morning'
MEMBERS = ['hamin', 'hyunjun', 'charlie', 'haruta', 'justin', 'songha', 'hanbi', 'daniel']


def font(path, size, index=0):
    return ImageFont.truetype(path, size, index=index)


def spaced(draw, xy, text, f, fill, tracking=0, anchor='mm'):
    """Draw text with letter-spacing, centred on xy (anchor mm) or left at xy (anchor lm)."""
    widths = [draw.textlength(c, font=f) for c in text]
    total = sum(widths) + tracking * (len(text) - 1)
    x = xy[0] - total / 2 if anchor == 'mm' else xy[0]
    for c, w in zip(text, widths):
        draw.text((x, xy[1]), c, font=f, fill=fill, anchor='lm')
        x += w + tracking


def wrap(draw, text, f, width):
    lines, cur = [], ''
    for word in text.split():
        t = (cur + ' ' + word).strip()
        if draw.textlength(t, font=f) <= width:
            cur = t
        else:
            lines.append(cur)
            cur = word
    lines.append(cur)
    return lines


def shadowed(size, paint):
    """Paint text on a transparent layer with a soft dark glow behind it for legibility."""
    text = Image.new('RGBA', size, (0, 0, 0, 0))
    paint(ImageDraw.Draw(text))
    glow = Image.new('RGBA', size, (0, 0, 0, 0))
    a = text.getchannel('A').filter(ImageFilter.GaussianBlur(size[1] // 110))
    glow.paste((4, 6, 18, 255), mask=a.point(lambda v: min(255, int(v * 1.7))))
    glow.alpha_composite(text)
    return glow


def caption(name, size, text, y_frac, px, sub=None):
    W, H = size
    f = font(SERIF, px)

    def paint(d):
        lines = wrap(d, text, f, W * 0.86)
        y = H * y_frac - (len(lines) - 1) * px * 0.62
        for ln in lines:
            spaced(d, (W / 2, y), ln, f, (255, 255, 255, 255), tracking=px * 0.04)
            y += px * 1.24
        if sub:
            fs = font(SANS, int(px * 0.36))
            spaced(d, (W / 2, y + px * 0.1), sub.upper(), fs, (170, 240, 255, 235), tracking=px * 0.12)

    shadowed(size, paint).save(WORK / name)
    return name


def tag(name, size, text, y_frac, px):
    W, H = size
    f = font(SANS, px)
    shadowed(size, lambda d: spaced(d, (W / 2, H * y_frac), text.upper(), f, (170, 240, 255, 245), tracking=px * 0.22)).save(WORK / name)
    return name


def multilang(d, cx, y, px, fill):
    parts = [('English', SANS), ('  ·  ', SANS), ('한국어', '/System/Library/Fonts/AppleSDGothicNeo.ttc'), ('  ·  ', SANS),
             ('日本語', CJK), ('  ·  ', SANS), ('简体中文', CJK)]
    fonts = [font(fp, px) for _, fp in parts]
    total = sum(d.textlength(t, font=f) for (t, _), f in zip(parts, fonts))
    x = cx - total / 2
    for (t, _), f in zip(parts, fonts):
        d.text((x, y), t, font=f, fill=fill, anchor='lm')
        x += d.textlength(t, font=f)


def names(name, size, labels, centers, y_frac, px):
    W, H = size
    f = font(SERIF, px)

    def paint(d):
        for label, cx in zip(labels, centers):
            y = H * y_frac
            spaced(d, (cx, y), label.upper(), f, (255, 255, 255, 255), tracking=px * 0.3)
            d.line([(cx - px * 1.1, y + px * 0.95), (cx + px * 1.1, y + px * 0.95)], fill=(170, 240, 255, 220), width=max(2, px // 22))

    shadowed(size, paint).save(WORK / name)
    return name


def endcard(name, size):
    W, H = size
    portrait = H > W
    im = Image.new('RGBA', size, (5, 7, 18, 255))
    # soft night gradient
    g = Image.new('RGBA', size, (0, 0, 0, 0))
    gd = ImageDraw.Draw(g)
    for i in range(60):
        r = (1 - i / 60)
        gd.ellipse([W / 2 - W * r, H * 0.42 - H * 0.5 * r, W / 2 + W * r, H * 0.42 + H * 0.5 * r], fill=(40, 60, 140, 5))
    im.alpha_composite(g.filter(ImageFilter.GaussianBlur(W // 12)))
    d = ImageDraw.Draw(im)
    u = (W if portrait else H) / 1080
    cy = H * (0.36 if portrait else 0.33)
    spaced(d, (W / 2, cy), '00:25', font(SERIF, int(230 * u)), (255, 255, 255, 255), tracking=10 * u)
    spaced(d, (W / 2, cy + 190 * u), 'STAY UNTIL MORNING', font(SERIF, int(62 * u)), (255, 255, 255, 255), tracking=16 * u)
    d.line([(W / 2 - 90 * u, cy + 260 * u), (W / 2 + 90 * u, cy + 260 * u)], fill=(170, 240, 255, 230), width=max(2, int(3 * u)))
    spaced(d, (W / 2, cy + 330 * u), 'PLAY FREE IN YOUR BROWSER', font(SANS, int(30 * u)), (170, 240, 255, 255), tracking=8 * u)
    spaced(d, (W / 2, cy + 392 * u), URL, font(SANS, int(34 * u)), (255, 255, 255, 235), tracking=1.5 * u)
    multilang(d, W / 2, cy + 470 * u, int(26 * u), (255, 255, 255, 170))
    fl = font(SANS, int(19 * u))
    lines = wrap(d, LEGAL, fl, W * 0.84)
    y = H - (len(lines) * 27 + 46) * u
    for ln in lines:
        spaced(d, (W / 2, y), ln, fl, (255, 255, 255, 130))
        y += 27 * u
    im.save(WORK / name)
    return name


def render(spec, name):
    p = WORK / f'{name}.json'
    p.write_text(json.dumps(spec, indent=1))
    subprocess.run([str(ROOT / 'tools/out/trailer'), 'build', str(p)], check=True)


def v(n):
    return str(VID / n)


def portrait():
    S = (1080, 1920)
    full = [0, 0, 1080, 1920]
    segs = [{'dur': 3.0, 'panels': [{'file': v('vid_opening.mp4'), 'from': 0.6, 'rect': full}]}]
    ov = [{'image': caption('p_open.png', S, 'One rainy night in Seoul.', 0.78, 78), 'start': 0.4, 'dur': 2.5}]
    t = 3.0
    for m in MEMBERS:
        segs.append({'dur': 2.0, 'panels': [{'file': v(f'vid_{m}_drama.mp4'), 'from': 2.4, 'rect': full}]})
        ov.append({'image': names(f'p_{m}.png', S, [m], [540], 0.86, 66), 'start': t + 0.15, 'dur': 1.75, 'fade': 0.25})
        t += 2.0
    ov.append({'image': tag('p_eight.png', S, 'Eight memories', 0.925, 34), 'start': 3.2, 'dur': 7.6})
    ov.append({'image': tag('p_choice.png', S, 'One choice at 04:57', 0.925, 34), 'start': 11.2, 'dur': 7.6})
    for f, frm in [('vid_hamin.mp4', 1.2), ('vid_justin.mp4', 1.2)]:
        segs.append({'dur': 2.5, 'panels': [{'file': v(f), 'from': frm, 'rect': full}]})
    ov.append({'image': caption('p_end24.png', S, 'Twenty-four endings.', 0.80, 74, sub='A romance visual novel in four languages'), 'start': 19.2, 'dur': 4.6})
    segs.append({'dur': 2.5, 'panels': [{'file': v('vid_true.mp4'), 'from': 1.0, 'rect': full}]})
    ov.append({'image': caption('p_stay.png', S, 'Will you stay until morning?', 0.80, 74), 'start': 24.2, 'dur': 2.3, 'fade': 0.35})
    segs.append({'dur': 3.5, 'panels': []})
    ov.append({'image': endcard('p_card.png', S), 'start': 26.2, 'dur': 3.8, 'fade': 0.5})
    render({'width': 1080, 'height': 1920, 'fps': 30, 'out': str(OUT / 'stay-until-morning-trailer-9x16.mp4'),
            'audio': str(ROOT / 'public/assets/audio/music/night.m4a'), 'audioFadeOut': 2.0, 'segments': segs, 'overlays': ov}, 'portrait')


def landscape():
    S = (1920, 1080)
    full = [0, 0, 1920, 1080]
    segs = [{'dur': 4.0, 'panels': [{'file': str(WORK / 'lobby_night.mp4'), 'from': 0.6, 'rect': full, 'anchorY': 0.5}]}]
    ov = [{'image': caption('l_open.png', S, 'One rainy night in Seoul.', 0.80, 76, sub='Studio 25 closes at 05:00'), 'start': 0.5, 'dur': 3.3}]
    t = 4.0
    gap = 3
    for group in (MEMBERS[:4], MEMBERS[4:]):
        w = 1920 / 4
        segs.append({'dur': 4.5, 'panels': [
            {'file': v(f'vid_{m}_drama.mp4'), 'from': 0.4, 'rect': [i * w + gap, 0, w - 2 * gap, 1080], 'anchorY': 0.12} for i, m in enumerate(group)]})
        ov.append({'image': names(f'l_{group[0]}.png', S, group, [i * w + w / 2 for i in range(4)], 0.88, 40), 'start': t + 0.3, 'dur': 4.0, 'fade': 0.35})
        t += 4.5
    ov.append({'image': tag('l_eight.png', S, 'Eight memories  ·  One choice at 04:57', 0.955, 24), 'start': 4.4, 'dur': 8.4})
    w = 1920 / 3
    for trio, text in ((['vid_hamin.mp4', 'vid_charlie.mp4', 'vid_daniel.mp4'], None), (['vid_haruta.mp4', 'vid_justin.mp4', 'vid_hanbi.mp4'], None)):
        segs.append({'dur': 3.0, 'panels': [{'file': v(f), 'from': 1.2, 'rect': [i * w + gap, 0, w - 2 * gap, 1080], 'anchorY': 0.25} for i, f in enumerate(trio)]})
    ov.append({'image': caption('l_end24.png', S, 'Twenty-four endings.', 0.84, 70, sub='A romance visual novel in four languages'), 'start': 13.3, 'dur': 5.4})
    segs.append({'dur': 4.0, 'panels': [{'file': str(WORK / 'lobby_morning.mp4'), 'from': 0.6, 'rect': full, 'anchorY': 0.5}]})
    ov.append({'image': caption('l_stay.png', S, 'Will you stay until morning?', 0.80, 76), 'start': 19.4, 'dur': 3.5})
    segs.append({'dur': 7.0, 'panels': []})
    ov.append({'image': endcard('l_card.png', S), 'start': 22.6, 'dur': 7.4, 'fade': 0.6})
    render({'width': 1920, 'height': 1080, 'fps': 30, 'out': str(OUT / 'stay-until-morning-trailer-16x9.mp4'),
            'audio': str(ROOT / 'public/assets/audio/music/night.m4a'), 'audioFadeOut': 2.0, 'segments': segs, 'overlays': ov}, 'landscape')


if __name__ == '__main__':
    portrait()
    landscape()
