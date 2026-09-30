#!/usr/bin/env python3
"""usage: check-translation.py <lang> <file-stem>  — keys, tokens and emphasis markers must match English."""
import json, re, sys
lang, stem = sys.argv[1:3]
en = json.load(open(f'locales/src/story/en/{stem}.json'))
try:
    tr = json.load(open(f'locales/src/story/{lang}/{stem}.json'))
except Exception as e:
    sys.exit(f'cannot read translation: {e}')
bad = 0
for k, v in en.items():
    if k not in tr or not str(tr[k]).strip():
        print('MISSING', k); bad += 1; continue
    t = tr[k]
    for tok in ('{{playerName}}', '{p}'):
        if v.count(tok) != t.count(tok):
            print('TOKEN', tok, k); bad += 1
    if re.search('[\U0001F000-\U0001FAFF⭐️]', t):
        print('EMOJI', k); bad += 1
    if lang != 'en' and len(v) > 40 and t == v:
        print('UNTRANSLATED', k); bad += 1
for k in tr:
    if k not in en:
        print('EXTRA', k); bad += 1
print(f'{lang}/{stem}: {len(tr)}/{len(en)} keys, {bad} problems')
sys.exit(1 if bad else 0)
