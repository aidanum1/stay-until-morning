import { describe, it, expect } from 'vitest';
import { parseExpr, evalExpr } from '../src/narrative/expr';
import { compileFile, emptyStory } from '../src/narrative/compiler';
import { Vm } from '../src/narrative/vm';
import { freshRun } from '../src/game/state';
import { applyKoreanParticles, finalConsonant } from '../src/localization/korean';

const env = {
  lookup: (p: string[]) => (p.join('.') === 'hamin.trust' ? 3 : p[0] === 'flag' ? p[1] === 'on' : 0),
  call: (f: string, a: unknown[]) => (f === 'rooms' ? 4 : f === 'seen' ? a[0] === 'x' : 0),
};

describe('expressions', () => {
  it('parses precedence', () => {
    expect(evalExpr(parseExpr('hamin.trust >= 3 and not flag.off'), env)).toBe(true);
    expect(evalExpr(parseExpr('rooms() == 4 or false'), env)).toBe(true);
    expect(evalExpr(parseExpr('seen(x) and seen(y)'), env)).toBe(false);
    expect(evalExpr(parseExpr('hamin.trust + 1 > 3'), env)).toBe(true);
    expect(evalExpr(parseExpr('var.x == "peach"'), { ...env, lookup: () => 'peach' })).toBe(true);
  });
  it('rejects garbage', () => {
    expect(() => parseExpr('hamin.trust >=')).toThrow();
    expect(() => parseExpr('(a')).toThrow();
  });
});

describe('compiler + vm', () => {
  const src = `
=== a
@time 00:10
> Hello {{playerName}}.
hamin[smile]: Hi.
* [playful] Joke.
    @rel hamin closeness+1
    hamin: Ha.
* Serious. {if hamin.closeness >= 5}
    hamin: Oh.
@if hamin.closeness >= 1
    > closeness path
@else
    > other path
@call b
~ end
> done
@end
=== b
> in b
@return
`;
  it('compiles and runs with correct branching', () => {
    const story = emptyStory();
    compileFile('t', src, story);
    expect(Object.keys(story.scenes)).toEqual(['a', 'b']);
    const run = freshRun('P');
    const vm = new Vm({ scenes: story.scenes }, run, { endings: () => [], trueEnding: () => false });
    vm.enterScene('a');
    let ev = vm.run();
    expect(ev.type).toBe('nar');
    expect(run.stage.time).toBe('00:10');
    vm.advance();
    ev = vm.run();
    expect(ev).toMatchObject({ type: 'say', speaker: 'hamin', expr: 'smile' });
    vm.advance();
    ev = vm.run();
    expect(ev.type).toBe('menu');
    if (ev.type !== 'menu') return;
    expect(ev.choices.length).toBe(1); // conditional option hidden
    expect(ev.choices[0].tone).toBe('playful');
    vm.choose(ev.choices[0].index);
    ev = vm.run();
    expect(ev.type).toBe('say');
    expect(run.rel.hamin.closeness).toBe(1);
    vm.advance();
    ev = vm.run();
    expect(story.text[(ev as { key: string }).key]).toBe('closeness path');
    vm.advance();
    ev = vm.run();
    expect(story.text[(ev as { key: string }).key]).toBe('in b');
    vm.advance();
    ev = vm.run();
    expect(story.text[(ev as { key: string }).key]).toBe('done');
    vm.advance();
    expect(vm.run().type).toBe('end');
    expect(run.backlog.length).toBe(7);
  });
  it('reports bad syntax with line numbers', () => {
    const story = emptyStory();
    expect(() => compileFile('t', '=== a\n@bogus x\n', story)).toThrow(/t:2/);
    expect(() => compileFile('t', '=== a\nnobody: hi\n', story, new Set(['hamin']))).toThrow(/unknown speaker/);
    expect(() => compileFile('t', '=== a\n@goto .nope\n', story)).toThrow(/unknown label/);
  });
  it('save/restore round-trips through JSON', () => {
    const story = emptyStory();
    compileFile('t', src, story);
    const run = freshRun('P');
    const vm = new Vm({ scenes: story.scenes }, run, { endings: () => [], trueEnding: () => false });
    vm.enterScene('a');
    vm.run();
    vm.advance();
    const copy = JSON.parse(JSON.stringify(run));
    const vm2 = new Vm({ scenes: story.scenes }, copy, { endings: () => [], trueEnding: () => false });
    expect(vm2.run()).toMatchObject({ type: 'say', speaker: 'hamin' });
  });
});

describe('korean particles', () => {
  it('detects batchim', () => {
    expect(finalConsonant('민준')).toEqual([true, false]);
    expect(finalConsonant('수아')).toEqual([false, false]);
    expect(finalConsonant('하늘')).toEqual([true, true]);
    expect(finalConsonant('Ayda')).toEqual([false, false]);
    expect(finalConsonant('Kim')).toEqual([true, false]);
  });
  it('resolves markers', () => {
    expect(applyKoreanParticles('민준(이)가 왔다')).toBe('민준이 왔다');
    expect(applyKoreanParticles('수아(이)가 왔다')).toBe('수아가 왔다');
    expect(applyKoreanParticles('민준(은)는')).toBe('민준은');
    expect(applyKoreanParticles('수아(을)를')).toBe('수아를');
    expect(applyKoreanParticles('민준(아)야!')).toBe('민준아!');
    expect(applyKoreanParticles('수아(아)야!')).toBe('수아야!');
    expect(applyKoreanParticles('하늘(으)로')).toBe('하늘로');
    expect(applyKoreanParticles('민준(으)로')).toBe('민준으로');
    expect(applyKoreanParticles('민준(이)랑')).toBe('민준이랑');
    expect(applyKoreanParticles('수아(이)랑')).toBe('수아랑');
  });
});
