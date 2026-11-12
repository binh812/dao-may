import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GATE, createGate, isLocked, makeGateQuestion, secondsLeft, tryGate } from '../src/learn/parent-gate.js';

function seeded(seed) { let a = seed; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

test('gate questions use the 6-9 tables with four distinct positive choices', () => {
  const rng = seeded(11);
  for (let i = 0; i < 500; i++) {
    const q = makeGateQuestion(rng);
    assert.ok(q.a >= 6 && q.a <= 9 && q.b >= 6 && q.b <= 9, `${q.a} x ${q.b}`);
    let product = 0; for (let k = 0; k < q.b; k++) product += q.a;
    assert.equal(q.answer, product);
    assert.equal(q.choices.length, GATE.choices);
    assert.equal(new Set(q.choices).size, GATE.choices, String(q.choices));
    assert.equal(q.choices.filter((c) => c === q.answer).length, 1);
    assert.ok(q.choices.every((c) => c > 0));
  }
});

test('the right answer is not always in the same position', () => {
  const rng = seeded(3), seen = new Set();
  for (let i = 0; i < 200; i++) { const q = makeGateQuestion(rng); seen.add(q.choices.indexOf(q.answer)); }
  assert.equal(seen.size, GATE.choices);
});

test('a wrong answer locks the gate for 60 seconds from the press, then it opens again', () => {
  const gate = createGate(), q = makeGateQuestion(seeded(5)), wrong = q.choices.find((c) => c !== q.answer), t0 = 1_000_000;
  assert.equal(tryGate(gate, q, wrong, t0), 'wrong');
  assert.equal(isLocked(gate, t0 + 59_999), true);
  assert.equal(tryGate(gate, q, q.answer, t0 + 30_000), 'locked', 'dung cung khong qua khi dang khoa');
  assert.equal(secondsLeft(gate, t0 + 30_000), 30);
  assert.equal(isLocked(gate, t0 + 60_000), false);
  assert.equal(tryGate(gate, q, q.answer, t0 + 60_000), 'open');
});

test('the right answer opens an unlocked gate without locking it', () => {
  const gate = createGate(), q = makeGateQuestion(seeded(8));
  assert.equal(tryGate(gate, q, q.answer, 0), 'open');
  assert.equal(isLocked(gate, 1), false);
});
