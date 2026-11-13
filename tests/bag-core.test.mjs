// Tui do: nhat thi tang, doi thi giam dung ti le, thieu thi khong doi, khong bao gio am, du lieu luu bi hong khong lam vo tui.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BAG_CAP, MATERIALS, TRADES, addItem, bagTotal, bagView, createBag, serializeBag, trade } from '../src/game/bag-core.js';

test('a new bag is empty and every material has a trade rate that pays at least one seed', () => {
  const bag = createBag();
  assert.equal(bagTotal(bag), 0);
  assert.deepEqual(Object.keys(bag.counts), MATERIALS.map((m) => m.id));
  for (const m of MATERIALS) { assert.ok(TRADES[m.id].give >= 1 && TRADES[m.id].get >= 1, m.id); assert.ok(m.name.length > 1 && m.icon.length > 0); }
  assert.equal(new Set(MATERIALS.map((m) => m.id)).size, MATERIALS.length);
});

test('picking up adds to the right material and stops at the cap without throwing anything away silently', () => {
  const bag = createBag();
  assert.equal(addItem(bag, 'hoa'), 1);
  assert.equal(addItem(bag, 'hoa', 4), 4);
  assert.equal(bag.counts.hoa, 5);
  assert.equal(bag.counts.go, 0);
  assert.equal(addItem(bag, 'hoa', BAG_CAP), BAG_CAP - 5, 'chi vao duoc phan con cho');
  assert.equal(addItem(bag, 'hoa'), 0);
  assert.equal(bag.counts.hoa, BAG_CAP);
  assert.throws(() => addItem(bag, 'vang'), RangeError);
  for (const bad of [0, -1, 1.5, NaN, '2']) assert.throws(() => addItem(bag, 'go', bad), RangeError);
});

test('a trade takes exactly the rate and pays exactly the seeds; short of the rate nothing changes', () => {
  const bag = createBag({ hoa: 7, da: 1, go: 1 });
  assert.deepEqual(trade(bag, 'hoa'), { ok: true, seeds: TRADES.hoa.get });
  assert.equal(bag.counts.hoa, 7 - TRADES.hoa.give);
  assert.deepEqual(trade(bag, 'hoa'), { ok: true, seeds: 1 });
  assert.deepEqual(trade(bag, 'hoa'), { ok: false, missing: TRADES.hoa.give - 1 });
  assert.equal(bag.counts.hoa, 1, 'thieu thi khong bi tru');
  assert.deepEqual(trade(bag, 'go'), { ok: false, missing: 1 });
  assert.deepEqual(trade(bag, 'da'), { ok: true, seeds: 2 });
  assert.equal(bag.counts.da, 0);
  assert.deepEqual(trade(bag, 'da'), { ok: false, missing: 1 });
  assert.ok(Object.values(bag.counts).every((n) => n >= 0));
  assert.throws(() => trade(bag, 'vang'), RangeError);
  assert.throws(() => trade(bag, 'constructor'), RangeError);
});

test('the view lists every material with how many trades it affords', () => {
  const view = bagView(createBag({ hoa: 7, go: 5 }));
  assert.deepEqual(view.map((row) => [row.id, row.count, row.times]), [['hoa', 7, 2], ['nam', 0, 0], ['go', 5, 2], ['da', 0, 0]]);
  assert.ok(view.every((row) => row.give === TRADES[row.id].give && row.get === TRADES[row.id].get));
});

test('saving and loading round-trips; junk in storage becomes zero and unknown keys are dropped', () => {
  const bag = createBag(); addItem(bag, 'nam', 3); addItem(bag, 'da', 2);
  assert.deepEqual(createBag(JSON.parse(JSON.stringify(serializeBag(bag)))).counts, bag.counts);
  const junk = createBag({ hoa: -4, nam: 2.5, go: '9', da: 1e9, vang: 50, __proto__: { hoa: 3 } });
  assert.deepEqual(junk.counts, { hoa: 0, nam: 0, go: 0, da: BAG_CAP });
  for (const raw of [null, undefined, 7, 'x', []]) assert.equal(bagTotal(createBag(raw)), 0);
});
