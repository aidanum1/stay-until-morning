#!/usr/bin/env python3
"""Place the story pictures (cg_<member>_x1..x6) into the expansion chapters.

Each picture is anchored to the first top-level narration line in its scene that matches a
keyword (falling back to ~60% through the scene), shown for a handful of lines, then cleared.
Only directives are inserted, so translation keys do not shift. Idempotent.
"""
import re, pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent
M = ['hamin', 'hyunjun', 'charlie', 'haruta', 'justin', 'songha', 'hanbi', 'daniel']
PLAN = {
    'hamin': [('ch1', 'lanyard'), ('ch4', 'asleep|sleep'), ('ch5', 'river'), ('ending_beside', 'step'), ('ending_someday', 'July|beach|sea'), ('newmem', None)],
    'hyunjun': [('ch1', 'receipt'), ('ch2', 'kimbap'), ('ch3', 'eight'), ('ch4', 'railing|bridge|city'), ('ending_beside', 'bridge'), ('ending_someday', 'snow|December|platform')],
    'charlie': [('ch1', 'bulb'), ('ch2', 'stamp'), ('ch3', 'napkin'), ('ch5', 'dryer'), ('ending_beside', 'bus'), ('ending_someday', 'December|arrivals')],
    'haruta': [('ch1', 'box|reel'), ('ch2', 'reel|projector'), ('ch3', 'ticket'), ('ch4', 'audience|rehears'), ('ending_beside', 'seat|chips'), ('ending_someday', 'March|ticket')],
    'justin': [('ch1', 'ledger|book'), ('ch2', 'banana'), ('ch4', 'pillow|coat'), ('ch5', 'finger'), ('ending_beside', 'doorway'), ('ending_someday', 'November|slow')],
    'songha': [('ch1', 'list'), ('ch2', 'hold|eighth'), ('ch3', 'ledger'), ('ch4', 'asleep|sleep'), ('ending_beside', 'rota|sunrise'), ('ending_someday', 'stairs|Arcturus|Gerald')],
    'hanbi': [('ch1', 'piece'), ('ch2', 'thirty|portrait'), ('ch5', 'asleep|sleep'), ('ch6', 'sharpener'), ('ending_beside', 'sofa'), ('ending_someday', 'rain|bench')],
    'daniel': [('ch1', 'pen'), ('ch2', 'chair'), ('ch3', 'still|four counts'), ('ch4', 'strip'), ('ending_beside', 'chair|soup|table'), ('ending_someday', 'July|booth|rain')],
}
HOLD = 7
STOP = re.compile(r'^@(bg|cg|video|ending|credits|goto|call|hub)\b')
is_text = lambda l: bool(l) and not l[0].isspace() and not l.startswith(('@', '#', '===', '~', '*'))

for n, m in enumerate(M):
    files = {f'6{n}_{m}_more.s25', f'1{n}_{m}.s25'}
    for fn in files:
        p = ROOT / 'story' / fn
        L = p.read_text().split('\n')
        # idempotent: drop a previous placement (the @cg line and the first @cg off after it)
        i = 0
        while i < len(L):
            if re.match(rf'^@cg cg_{m}_x\d$', L[i]):
                del L[i]
                j = next((k for k in range(i, len(L)) if L[k] == '@cg off'), None)
                if j is not None:
                    del L[j]
            else:
                i += 1
        for k, (scene, kw) in enumerate(PLAN[m], 1):
            head = f'=== {m}_{scene}'
            if head not in L:
                continue
            s = L.index(head)
            e = next((i for i in range(s + 1, len(L)) if L[i].startswith('=== ')), len(L))
            texts = [i for i in range(s + 1, e) if is_text(L[i])]
            rx = re.compile(kw or '$^', re.I)
            hit = next((i for i in texts[2:] if L[i].startswith('> ') and rx.search(L[i])), None)
            how = 'keyword'
            if kw is None:
                hit, how = texts[1], 'opening'
            elif hit is None:
                hit = texts[int(len(texts) * 0.6)]
                how = 'fallback'
            # end: HOLD text lines later, or just before the next staging/flow directive
            end, seen = None, 0
            for i in range(hit + 1, e):
                if not L[i][:1].isspace() and STOP.match(L[i]):
                    end = i
                    break
                if is_text(L[i]):
                    seen += 1
                    if seen == HOLD:
                        end = i + 1
                        break
            end = end or e
            L[end:end] = ['@cg off']
            L[hit + 1:hit + 1] = [f'@cg cg_{m}_x{k}']
            print(f'{m}_x{k} {scene:15} {how:8} {L[hit][:70]}')
        p.write_text('\n'.join(L))
