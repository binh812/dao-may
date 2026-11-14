// Viec giup dan lang: moi chuyen moi nguoi mot viec, du moi tang duoc, tang thi tru dung va thuong dung, khong tang hai lan,
// khong bao gio thiet hon doi o quay, tui khong am, loi nho khong giuc.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MATERIALS, createBag } from '../src/game/bag-core.js';
import { ERRANDS, createErrands, errandFor, giftLabel, help, missingFor, stallValue } from '../src/game/errand-core.js';

const GIVERS = [...new Set(ERRANDS.map((errand) => errand.giver))];
const bagWith = (counts) => createBag(counts);

test('every errand asks for a real material in a small countable amount and never pays less than the stall would', () => {
  assert.equal(new Set(ERRANDS.map((errand) => errand.id)).size, ERRANDS.length);
  for (const errand of ERRANDS) {
    assert.ok(MATERIALS.some((m) => m.id === errand.item), errand.id);
    assert.ok(Number.isInteger(errand.count) && errand.count >= 1 && errand.count <= 5, `${errand.id}: be lop 1 dem duoc`);
    assert.ok(errand.seeds >= 1 && errand.seeds > stallValue(errand), `${errand.id}: giup phai loi hon doi o quay`);
    assert.ok(errand.seeds <= stallValue(errand) + 2, `${errand.id}: khong thuong qua tay lam lech gia`);
  }
});

test('the request names the exact amount and neither nags nor blames', () => {
  for (const errand of ERRANDS) {
    assert.ok(errand.ask.includes(String(errand.count)), `${errand.id}: loi nho phai noi ro so luong`);
    for (const text of [errand.ask, errand.thanks]) {
      assert.ok(text.length >= 20 && text.length <= 110, `${errand.id}: ${text.length} ky tu`);
      assert.doesNotMatch(text, /phải |nhanh lên|mau lên|chưa\?|tại bạn|tại Mầm|sao bạn không/i, errand.id);
    }
  }
});

test('every giver is a villager the valley declares', () => {
  const valley = readFileSync(new URL('../src/worlds/valley.js', import.meta.url), 'utf8');
  for (const giver of GIVERS) assert.ok(valley.includes(`{ id: '${giver}', model:`), giver);
});

test('each giver asks one thing per journey and rotates through their errands across journeys', () => {
  const state = createErrands();
  for (const giver of GIVERS) {
    const mine = ERRANDS.filter((errand) => errand.giver === giver);
    for (let journey = 1; journey <= mine.length * 2; journey++) assert.equal(errandFor(state, giver, journey), mine[(journey - 1) % mine.length]);
  }
  assert.equal(errandFor(state, 'ai-do', 1), null);
  for (const bad of [0, -1, 1.5, NaN, undefined]) assert.equal(errandFor(state, GIVERS[0], bad), null);
});

test('helping with enough items takes exactly the asked amount, pays the seeds, and closes the errand for this journey only', () => {
  const state = createErrands(), errand = errandFor(state, 'cong-chua', 1);
  const bag = bagWith({ [errand.item]: errand.count + 2, go: 4 });
  assert.equal(missingFor(bag, errand), 0);
  assert.deepEqual(help(state, bag, errand, 1), { ok: true, seeds: errand.seeds });
  assert.equal(bag.counts[errand.item], 2);
  assert.equal(bag.counts.go, 4, 'vat lieu khac khong bi dong toi');
  assert.equal(errandFor(state, 'cong-chua', 1), null, 'chuyen nay da giup roi');
  assert.notEqual(errandFor(state, 'hoang-tu', 1), null, 'nguoi khac van con viec');
  assert.notEqual(errandFor(state, 'cong-chua', 2), null, 'chuyen sau lai co viec');
});

test('helping twice in one journey is refused and takes nothing the second time', () => {
  const state = createErrands(), errand = errandFor(state, 'hoang-tu', 1);
  const bag = bagWith({ [errand.item]: errand.count * 3 });
  assert.equal(help(state, bag, errand, 1).ok, true);
  const left = bag.counts[errand.item];
  assert.equal(help(state, bag, errand, 1).ok, false);
  assert.equal(bag.counts[errand.item], left);
});

test('with too few items nothing is taken, the shortfall is reported, and the errand stays open', () => {
  const state = createErrands(), errand = errandFor(state, 'cong-chua', 1);
  const bag = bagWith({ [errand.item]: errand.count - 1 });
  assert.equal(missingFor(bag, errand), 1);
  assert.deepEqual(help(state, bag, errand, 1), { ok: false, missing: 1 });
  assert.equal(bag.counts[errand.item], errand.count - 1);
  assert.equal(errandFor(state, 'cong-chua', 1), errand);
});

test('an errand that is not this journey\'s errand cannot be paid, so the bag never goes negative', () => {
  const state = createErrands(), mine = ERRANDS.filter((errand) => errand.giver === 'cong-chua');
  const bag = bagWith({ hoa: 9, nam: 9 });
  assert.equal(help(state, bag, mine[1], 1).ok, false, 'viec cua chuyen 2 khong tang duoc o chuyen 1');
  assert.deepEqual(bag.counts, bagWith({ hoa: 9, nam: 9 }).counts);
  for (const errand of ERRANDS) for (let j = 1; j <= 4; j++) { help(state, bagWith({}), errand, j); }
  assert.ok(Object.values(bag.counts).every((n) => n >= 0));
});

test('the button label shows the amount, the material icon and who it is for', () => {
  const errand = ERRANDS.find((e) => e.item === 'hoa');
  assert.equal(giftLabel(errand, 'Công chúa'), `Tặng ${errand.count} 🌸 cho Công chúa`);
});
