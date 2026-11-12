import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SKILLS, makeQuestion, skillById, spokenText } from '../src/learn/questions.js';
import { ADAPTIVE, changeGrade, createProfile, isMastered, masteredCount, pickSkill, recordAnswer, recordMistake, reviveProfile } from '../src/learn/adaptive.js';

function seeded(seed) { let a = seed; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

/** Tinh lai dap an doc lap voi code san pham: chi dung so trong data va phep tinh so hoc co ban. */
function independentAnswer({ op, a, b }) {
  if (op === 'add') { let n = a; for (let i = 0; i < b; i++) n++; return n; }
  if (op === 'sub') { let n = a; for (let i = 0; i < b; i++) n--; return n; }
  if (op === 'mul') { let n = 0; for (let i = 0; i < b; i++) n += a; return n; }
  if (op === 'div') { let q = 0, rest = a; while (rest >= b) { rest -= b; q++; } assert.equal(rest, 0, `${a} : ${b} khong chia het`); return q; }
  throw new Error('op ' + op);
}

const SAMPLES = 400;

test('every skill: answers are right, choices are sound, texts are complete', () => {
  for (const skill of SKILLS) {
    const rng = seeded(skill.id.length * 7919 + 13);
    for (let i = 0; i < SAMPLES; i++) {
      const q = makeQuestion(skill.id, rng), where = `${skill.id} "${q.text}"`;
      assert.equal(q.answer, independentAnswer(q.data), `dap an sai: ${where}`);
      assert.equal(q.choices.length, 4, where);
      assert.equal(new Set(q.choices).size, 4, `lua chon trung nhau: ${where} ${q.choices}`);
      assert.equal(q.choices.filter((c) => c === q.answer).length, 1, `dap an dung phai xuat hien dung mot lan: ${where}`);
      assert.ok(q.choices.every((c) => Number.isInteger(c) && c >= 0 && c <= skill.max), `lua chon phai nam trong [0, ${skill.max}]: ${where} ${q.choices}`);
      assert.ok(q.hint.length > 10 && !/\d/.test(q.hint), `goi y khong duoc chua chu so nao (de khong the lo dap an): ${where} "${q.hint}"`);
      assert.equal(q.solution.at(-1), `Đáp số: ${q.answer}`, where);
      assert.ok(q.solution.length >= 2, `loi giai phai co buoc: ${where}`);
    }
  }
});

test('questions stay inside the range the skill names', () => {
  const limit = { g1_add_10: 10, g1_sub_10: 10, g1_add_20: 20, g1_sub_20: 20, g2_add_100: 100, g2_add_100_carry: 100, g2_sub_100_borrow: 100, g3_add_1000: 1000, g3_sub_1000: 1000 };
  for (const [id, max] of Object.entries(limit)) {
    const rng = seeded(max + id.length);
    for (let i = 0; i < SAMPLES; i++) {
      const { data, answer } = makeQuestion(id, rng);
      assert.ok(data.a <= max && data.b <= max && answer <= max && answer >= 0, `${id}: ${data.a}, ${data.b} -> ${answer}`);
    }
  }
});

test('carry and borrow skills really need carrying and borrowing', () => {
  const rng = seeded(99);
  for (let i = 0; i < SAMPLES; i++) {
    const carry = makeQuestion('g2_add_100_carry', rng).data, plain = makeQuestion('g2_add_100', rng).data, borrow = makeQuestion('g2_sub_100_borrow', rng).data;
    assert.ok((carry.a % 10) + (carry.b % 10) >= 10, `khong co nho: ${carry.a} + ${carry.b}`);
    assert.ok((plain.a % 10) + (plain.b % 10) < 10, `co nho ngoai y muon: ${plain.a} + ${plain.b}`);
    assert.ok((borrow.a % 10) < (borrow.b % 10), `khong can muon: ${borrow.a} - ${borrow.b}`);
  }
});

test('add/sub solutions: every step is true, chains from the previous one, and ends at the answer', () => {
  const rng = seeded(5);
  for (const skill of SKILLS.filter((s) => s.op === 'add' || s.op === 'sub')) {
    for (let i = 0; i < 300; i++) {
      const q = makeQuestion(skill.id, rng), lines = q.solution.slice(0, -1);
      let running = q.data.a;
      for (const line of lines) {
        const m = line.match(/^(\d+) ([+−]) (\d+) = (\d+)$/);
        assert.ok(m, `dong loi giai la: "${line}"`);
        assert.equal(Number(m[1]), running, `buoc khong noi tiep buoc truoc: ${q.text} -> ${line}`);
        assert.equal(m[2] === '+', skill.op === 'add', line);
        running = m[2] === '+' ? running + Number(m[3]) : running - Number(m[3]);
        assert.equal(Number(m[4]), running, line);
      }
      assert.equal(running, q.answer, q.text);
    }
  }
});

test('the solution uses the method the hint names', () => {
  const rng = seeded(77);
  for (const skill of SKILLS.filter((s) => s.op === 'add' || s.op === 'sub')) {
    for (let i = 0; i < 300; i++) {
      const q = makeQuestion(skill.id, rng), steps = q.solution.slice(0, -1).map((l) => l.match(/^(\d+) [+−] (\d+) = (\d+)$/).slice(1).map(Number));
      if (q.hint.includes('tròn chục')) assert.ok(steps.length >= 2 && steps.some(([, , result]) => result % 10 === 0), `goi y noi lam tron chuc nhung loi giai khong qua so tron chuc: ${q.text} ${q.solution}`);
      if (q.hint.includes('hàng lớn')) assert.ok(steps[0][1] % 10 === 0, `goi y noi hang lon truoc nhung buoc dau la: ${q.solution[0]}`);
      if (q.hint.includes('đếm')) assert.equal(steps.length, 1, `bai dem don gian phai mot buoc: ${q.solution}`);
    }
  }
});

test('multiplication and division solutions state the true fact', () => {
  const rng = seeded(31);
  for (const id of ['g2_mul_2_5', 'g3_mul_table', 'g3_div_table']) for (let i = 0; i < 200; i++) {
    const q = makeQuestion(id, rng), { a, b } = q.data;
    assert.ok(q.solution[0].includes(q.data.op === 'mul' ? `${a} × ${b} = ${a * b}` : `${b} × ${a / b} = ${a}`) || q.solution[0].includes(`= ${q.answer}`), q.solution[0]);
    assert.ok(q.solution[0].includes(String(q.answer)), q.solution[0]);
  }
});

test('spoken form names the operation in words and never the answer', () => {
  const rng = seeded(21), words = { add: 'cộng', sub: 'trừ', mul: 'nhân', div: 'chia' };
  for (const skill of SKILLS) {
    const q = makeQuestion(skill.id, rng), said = spokenText(q);
    assert.equal(said, `${q.data.a} ${words[q.data.op]} ${q.data.b} bằng mấy?`);
    assert.ok(!/[+−×:=]/.test(said), said);
  }
});

test('unknown skill is rejected', () => {
  assert.throws(() => makeQuestion('g9_nope', seeded(1)), RangeError);
  assert.equal(skillById('g9_nope'), undefined);
});

test('placement: lower grades start mastered, own grade does not', () => {
  const p = createProfile(2);
  assert.equal(isMastered(p, 'g1_add_10'), true);
  assert.equal(isMastered(p, 'g2_add_100'), false);
  assert.equal(masteredCount(createProfile(1)), 0);
  assert.throws(() => createProfile(0), RangeError);
  assert.throws(() => createProfile(4), RangeError);
});

test('a skill is mastered only after enough correct answers, and a mistake sets it back', () => {
  const p = createProfile(1);
  let masteredAt = null;
  for (let i = 1; i <= 12 && masteredAt === null; i++) if (recordAnswer(p, 'g1_add_10', true).masteredNow) masteredAt = i;
  assert.ok(masteredAt >= ADAPTIVE.minSeen, `thanh thao qua som: ${masteredAt}`);
  assert.equal(isMastered(p, 'g1_add_10'), true);
  recordAnswer(p, 'g1_add_10', false); recordAnswer(p, 'g1_add_10', false);
  assert.equal(isMastered(p, 'g1_add_10'), false);
});

test('a skill is celebrated only the first time it is mastered', () => {
  const p = createProfile(1);
  let celebrations = 0;
  const answer = (ok) => { if (recordAnswer(p, 'g1_add_10', ok).masteredNow) celebrations++; };
  for (let i = 0; i < 10; i++) answer(true);
  answer(false); answer(false);
  assert.equal(isMastered(p, 'g1_add_10'), false, 'da tut khoi thanh thao');
  for (let i = 0; i < 10; i++) answer(true);
  assert.equal(isMastered(p, 'g1_add_10'), true);
  assert.equal(celebrations, 1);
  // ky nang xep san: lo sai mot bai roi lam dung lai cung khong an mung
  const placed = createProfile(2);
  recordAnswer(placed, 'g1_add_10', false);
  let again = false; for (let i = 0; i < 10; i++) if (recordAnswer(placed, 'g1_add_10', true).masteredNow) again = true;
  assert.equal(again, false);
});

test('wrong answers alone never master a skill', () => {
  const p = createProfile(1);
  for (let i = 0; i < 50; i++) assert.equal(recordAnswer(p, 'g1_sub_10', false).masteredNow, false);
  assert.equal(isMastered(p, 'g1_sub_10'), false);
});

test('picks mostly the first unmastered skill, some review, some stretch', () => {
  const p = createProfile(2), rng = seeded(2026), count = {};
  for (let i = 0; i < 2000; i++) { const id = pickSkill(p, rng); count[id] = (count[id] ?? 0) + 1; }
  const learning = count.g2_add_100 ?? 0, review = Object.entries(count).filter(([id]) => skillById(id).grade === 1).reduce((a, [, n]) => a + n, 0), stretch = count.g3_mul_table ?? 0;
  assert.ok(learning > 1300 && learning < 1500, `dang hoc: ${learning}`);
  assert.ok(review > 320 && review < 480, `on tap: ${review}`);
  assert.ok(stretch > 140 && stretch < 260, `nang cao: ${stretch}`);
  assert.equal(learning + review + stretch, 2000, 'khong duoc chon ky nang ngoai ba nhom');
});

test('always returns a real skill, even with nothing or everything mastered', () => {
  const fresh = createProfile(1), done = createProfile(3), rng = seeded(7);
  for (const s of SKILLS) for (let i = 0; i < 12; i++) recordAnswer(done, s.id, true);
  for (let i = 0; i < 300; i++) { assert.ok(skillById(pickSkill(fresh, rng))); assert.ok(skillById(pickSkill(done, rng))); }
});

test('changing grade keeps what the child earned and withdraws only placed skills', () => {
  const p = createProfile(1);
  for (let i = 0; i < 8; i++) recordAnswer(p, 'g1_add_10', true);        // tu thanh thao
  changeGrade(p, 3);
  assert.equal(p.grade, 3);
  assert.equal(isMastered(p, 'g2_add_100'), true, 'lop duoi duoc xep san');
  assert.equal(p.skills.g2_add_100.placed, true);
  assert.equal(p.skills.g1_add_10.placed, false, 'ky nang tu thanh thao khong bi ghi de');
  for (let i = 0; i < 8; i++) recordAnswer(p, 'g2_mul_2_5', true);       // lam that mot ky nang lop 2
  changeGrade(p, 1);
  assert.equal(isMastered(p, 'g1_add_10'), true, 'giu ky nang tu thanh thao');
  assert.equal(isMastered(p, 'g2_mul_2_5'), true, 'giu ky nang lop tren da lam that');
  assert.equal(p.skills.g2_add_100, undefined, 'thu lai ky nang xep san');
  assert.throws(() => changeGrade(p, 7), RangeError);
});

test('mistakes are kept for review, newest last, capped', () => {
  const p = createProfile(1), rng = seeded(4);
  for (let i = 0; i < ADAPTIVE.keepMistakes + 5; i++) recordMistake(p, { ...makeQuestion('g1_add_10', rng), text: `bai ${i}` });
  assert.equal(p.mistakes.length, ADAPTIVE.keepMistakes);
  assert.equal(p.mistakes.at(-1).text, `bai ${ADAPTIVE.keepMistakes + 4}`);
  assert.equal(p.mistakes[0].text, 'bai 5');
  assert.ok(p.mistakes[0].solution.at(-1).startsWith('Đáp số:'));
});

test('saved profiles are validated on load', () => {
  const p = createProfile(2); recordAnswer(p, 'g2_add_100', true);
  assert.deepEqual(reviveProfile(JSON.parse(JSON.stringify(p))), p);
  assert.equal(reviveProfile(null), null);
  assert.equal(reviveProfile({ version: 2, grade: 2, skills: {} }), null);
  assert.equal(reviveProfile({ version: 1, grade: 9, skills: {} }), null);
  const dirty = reviveProfile({ version: 1, grade: 1, skills: { g1_add_10: { mastery: 7, seen: -3 }, hacked: { mastery: 1, seen: 9 }, g1_sub_10: 'x' } });
  assert.deepEqual(Object.keys(dirty.skills), ['g1_add_10']);
  assert.equal(dirty.skills.g1_add_10.mastery, 1);
  assert.equal(dirty.skills.g1_add_10.seen, 0);
  assert.deepEqual(dirty.mistakes, []);
  const withJunk = reviveProfile({ version: 1, grade: 1, skills: {}, mistakes: [{ text: 'ok', answer: 3, solution: ['Đáp số: 3'] }, { text: 5 }, null, { text: 'x', answer: 1, solution: [7] }] });
  assert.equal(withJunk.mistakes.length, 1);
});
