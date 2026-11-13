// Luat tui do (thuan: khong three.js, khong DOM, co test). Be nhat vat lieu khi di choi va khi danh thuc Bong Lang,
// roi mang toi quay hang doi lay Hat Nang theo ti le co dinh ("3 canh hoa doi 1 hat": phep chia an trong viec doi do).
// Tui chi tang khi nhat va chi giam khi be tu doi; khong co gi lam mat do.

export const MATERIALS = Object.freeze([
  Object.freeze({ id: 'hoa', name: 'Cánh hoa', icon: '🌸' }),
  Object.freeze({ id: 'nam', name: 'Nấm', icon: '🍄' }),
  Object.freeze({ id: 'go', name: 'Gỗ', icon: '🪵' }),
  Object.freeze({ id: 'da', name: 'Đá pha lê', icon: '💎' }),
]);
/** Doi `give` vat lieu lay `get` Hat Nang. */
export const TRADES = Object.freeze({
  hoa: Object.freeze({ give: 3, get: 1 }), nam: Object.freeze({ give: 3, get: 1 }),
  go: Object.freeze({ give: 2, get: 1 }), da: Object.freeze({ give: 1, get: 2 }),
});
export const BAG_CAP = 99;   // moi loai toi da ngan nay; day thi vat nhat them khong vao tui (be nen di doi)

const known = (id) => Object.hasOwn(TRADES, id);
const clean = (raw) => (Number.isInteger(raw) && raw >= 0 ? Math.min(raw, BAG_CAP) : 0);

/** Tui tu du lieu da luu ({ hoa: 2, ... }); gia tri la thi coi nhu 0, loai la thi bo qua. */
export function createBag(saved = null) {
  const source = saved && typeof saved === 'object' ? saved : {};
  return { counts: Object.fromEntries(MATERIALS.map((m) => [m.id, clean(source[m.id])])) };
}
export const serializeBag = (bag) => ({ ...bag.counts });
export const bagTotal = (bag) => Object.values(bag.counts).reduce((a, b) => a + b, 0);

/** Bo `amount` vat vao tui. Tra ve so vat thuc su vao (it hon khi tui day loai do). */
export function addItem(bag, id, amount = 1) {
  if (!known(id)) throw new RangeError(`Vat lieu khong co: ${id}`);
  if (!Number.isInteger(amount) || amount < 1) throw new RangeError(`So luong khong hop le: ${amount}`);
  const before = bag.counts[id];
  bag.counts[id] = Math.min(BAG_CAP, before + amount);
  return bag.counts[id] - before;
}

/** Doi mot lan theo ti le cua loai `id`. Du thi tru vat lieu va tra ve { ok: true, seeds }; thieu thi khong doi gi, tra ve { ok: false, missing }. */
export function trade(bag, id) {
  if (!known(id)) throw new RangeError(`Vat lieu khong co: ${id}`);
  const { give, get } = TRADES[id];
  if (bag.counts[id] < give) return { ok: false, missing: give - bag.counts[id] };
  bag.counts[id] -= give;
  return { ok: true, seeds: get };
}

/** Danh sach de hien trong tui: moi loai kem so dang co, ti le doi va so lan doi duoc. */
export function bagView(bag) {
  return MATERIALS.map((m) => ({ ...m, count: bag.counts[m.id], ...TRADES[m.id], times: Math.floor(bag.counts[m.id] / TRADES[m.id].give) }));
}
