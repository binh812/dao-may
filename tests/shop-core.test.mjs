// Luat doi do: du hat moi doi duoc, khong tru hai lan, mon da doi khong mat, so du khong am, du lieu hong khong lam hong tu do.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CATALOG, SLOTS, balance, buy, catalogTotal, cheapestPrice, createWardrobe, serializeWardrobe, shelf, spent, toggleWear } from '../src/game/shop-core.js';

const item = (id) => CATALOG.find((i) => i.id === id);

test('catalogue is well formed: unique ids, known slots, whole positive prices', () => {
  assert.equal(new Set(CATALOG.map((i) => i.id)).size, CATALOG.length);
  for (const i of CATALOG) {
    assert.ok(SLOTS.some((s) => s.id === i.slot), `${i.id} co vi tri la`);
    assert.ok(Number.isInteger(i.price) && i.price > 0, `${i.id} co gia la`);
  }
  assert.equal(catalogTotal(), CATALOG.reduce((s, i) => s + i.price, 0));
  assert.equal(cheapestPrice(), 5);
});

test('buying with enough seeds gives the item, wears it and lowers the balance by its price', () => {
  const w = createWardrobe();
  assert.deepEqual(buy(w, 'mu-rom', 10), { ok: true });
  assert.ok(w.owned.has('mu-rom'));
  assert.equal(w.worn.hat, 'mu-rom');
  assert.equal(balance(w, 10), 10 - item('mu-rom').price);
});

test('one seed short is refused, says how many are missing and changes nothing', () => {
  const w = createWardrobe(), price = item('vong-hoa').price;
  assert.deepEqual(buy(w, 'vong-hoa', price - 1), { ok: false, reason: 'short', missing: 1 });
  assert.equal(w.owned.size, 0);
  assert.equal(w.worn.hat, null);
  assert.deepEqual(buy(w, 'vong-hoa', price), { ok: true }, 'vua du thi doi duoc');
});

test('an owned item is never charged twice', () => {
  const w = createWardrobe();
  buy(w, 'khan-do', 20);
  assert.deepEqual(buy(w, 'khan-do', 20), { ok: false, reason: 'owned', missing: 0 });
  assert.equal(spent(w), item('khan-do').price);
});

test('seeds already spent cannot be spent again', () => {
  const w = createWardrobe();
  buy(w, 'mu-len', 12);                                   // con 4
  assert.deepEqual(buy(w, 'khan-do', 12), { ok: false, reason: 'short', missing: 1 });
  assert.deepEqual(buy(w, 'khan-do', 13), { ok: true });
  assert.equal(balance(w, 13), 0);
});

test('wearing swaps within a slot, leaves other slots alone, and tapping the worn item takes it off for free', () => {
  const w = createWardrobe();
  buy(w, 'mu-rom', 40); buy(w, 'mu-len', 40); buy(w, 'khan-xanh', 40);
  assert.equal(w.worn.hat, 'mu-len');
  assert.equal(toggleWear(w, 'mu-rom'), true);
  assert.deepEqual(w.worn, { hat: 'mu-rom', scarf: 'khan-xanh', sprout: null });
  toggleWear(w, 'mu-rom');
  assert.equal(w.worn.hat, null);
  assert.ok(w.owned.has('mu-rom'), 'coi ra van la cua be');
  assert.equal(balance(w, 40), 40 - spent(w), 'mac va coi khong ton hat');
});

test('an item the child does not own cannot be worn', () => {
  const w = createWardrobe();
  assert.equal(toggleWear(w, 'vong-hoa'), false);
  assert.equal(w.worn.hat, null);
});

test('balance never goes negative when collected seeds were lost, and rejects nonsense counts', () => {
  const w = createWardrobe();
  buy(w, 'vong-hoa', 30);
  assert.equal(balance(w, 3), 0);
  assert.ok(w.owned.has('vong-hoa'), 'mon da doi khong bi thu lai');
  assert.throws(() => balance(w, -1), RangeError);
  assert.throws(() => balance(w, 2.5), RangeError);
  assert.throws(() => balance(w, NaN), RangeError);
});

test('a saved wardrobe survives a round trip; broken or stale saved data is dropped, not fatal', () => {
  const w = createWardrobe();
  buy(w, 'mu-rom', 30); buy(w, 'choi-hoa', 30);
  const again = createWardrobe(JSON.parse(JSON.stringify(serializeWardrobe(w))));
  assert.deepEqual([...again.owned].sort(), ['choi-hoa', 'mu-rom']);
  assert.deepEqual(again.worn, { hat: 'mu-rom', scarf: null, sprout: 'choi-hoa' });
  const odd = createWardrobe({ owned: ['mu-rom', 'mon-da-bo', 7], worn: { hat: 'vong-hoa', scarf: 'mu-rom', sprout: 'mon-da-bo' } });
  assert.deepEqual([...odd.owned], ['mu-rom']);
  assert.deepEqual(odd.worn, { hat: null, scarf: null, sprout: null }, 'khong mac mon khong so huu hoac sai vi tri');
  for (const junk of [null, undefined, 'x', 5, [], { owned: 'mu-rom' }]) assert.equal(createWardrobe(junk).owned.size, 0);
});

test('unknown item ids are rejected loudly', () => {
  const w = createWardrobe();
  assert.throws(() => buy(w, 'khong-co', 99), RangeError);
  assert.throws(() => toggleWear(w, 'khong-co'), RangeError);
});

test('the shelf tells the screen what each item needs', () => {
  const w = createWardrobe();
  buy(w, 'mu-rom', 12); buy(w, 'khan-do', 12);            // con 1
  toggleWear(w, 'khan-do');
  const byId = Object.fromEntries(shelf(w, 12).map((i) => [i.id, i]));
  assert.equal(byId['mu-rom'].status, 'worn');
  assert.equal(byId['khan-do'].status, 'owned');
  assert.equal(byId['khan-xanh'].status, 'short');
  assert.equal(byId['khan-xanh'].missing, 4);
  assert.equal(shelf(w, 30).find((i) => i.id === 'vong-hoa').status, 'can-buy');
});
