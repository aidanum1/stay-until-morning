// Korean particle resolution for inserted names.
// Translators write e.g. "{{playerName}}(이)가", "{{playerName}}(은)는", "{{playerName}}(아)야".
// After interpolation, "(X)Y" directly after the name is resolved from the final syllable.

const HANGUL_START = 0xac00;
const HANGUL_END = 0xd7a3;

/** Returns [hasBatchim, isRieul] for the last character of a word. */
export function finalConsonant(word: string): [boolean, boolean] {
  const w = word.trim();
  if (!w) return [false, false];
  const ch = w[w.length - 1];
  const code = ch.charCodeAt(0);
  if (code >= HANGUL_START && code <= HANGUL_END) {
    const jong = (code - HANGUL_START) % 28;
    return [jong !== 0, jong === 8];
  }
  if (/[0-9]/.test(ch)) {
    // 0 영, 1 일, 3 삼, 6 육, 7 칠, 8 팔 end in a consonant
    return ['013678'.includes(ch), '178'.includes(ch)];
  }
  if (/[a-zA-Z]/.test(ch)) {
    const lower = w.toLowerCase();
    // heuristic: vowel-ending (and -y/-w) names take the no-batchim form
    if (/[aeiouyw]$/.test(lower)) return [false, false];
    if (/l$/.test(lower)) return [true, true];
    return [true, false];
  }
  // Japanese kana / CJK names: kana end in vowels (except ん)
  if (ch === 'ん' || ch === 'ン') return [true, false];
  return [false, false];
}

const PAIRS: Record<string, [string, string]> = {
  '(이)가': ['이', '가'],
  '(은)는': ['은', '는'],
  '(을)를': ['을', '를'],
  '(과)와': ['과', '와'],
  '(아)야': ['아', '야'],
};

/**
 * Resolve particle markers. The marker must directly follow a word (the name).
 * Generic "(이)X" → "이X" after batchim, "X" otherwise. "(으)로" → "으로" / "로" (ㄹ batchim → 로).
 */
export function applyKoreanParticles(s: string): string {
  return s.replace(/(\S+?)(\((?:이|은|을|과|아|으)\)[가-힣]*)/g, (_, word: string, marker: string) => {
    const [batchim, rieul] = finalConsonant(word);
    const pair = PAIRS[marker];
    if (pair) return word + (batchim ? pair[0] : pair[1]);
    const m = /^\((이|으)\)([가-힣]*)$/.exec(marker);
    if (!m) return word + marker;
    if (m[1] === '으') return word + (batchim && !rieul ? '으' : '') + m[2];
    return word + (batchim ? '이' : '') + m[2];
  });
}
