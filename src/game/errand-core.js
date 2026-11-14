// Viec giup ngan cua dan lang (luat thuan, co test): moi chuyen di, moi nguoi nho MOT viec nho bang vat lieu be hai duoc
// ("3 canh hoa de ket vong hoa"). Be tu nguyen tang thi duoc cam on va Hat Nang; khong tang cung khong sao, khong ai giuc.
// Toan an: dem xem minh co du khong, con thieu may. Tang cho dan lang khong bao gio thiet hon mang ra quay doi.
// Khong doi `id` viec da phat hanh.
import { MATERIALS, TRADES } from './bag-core.js';

/** `giver` khop voi `id` cua dan lang trong `realm.villagers`; `item` la id vat lieu trong tui. */
export const ERRANDS = Object.freeze([
  { id: 'vong-hoa', giver: 'cong-chua', item: 'hoa', count: 3, seeds: 2, ask: 'Mình đang kết vòng hoa. Bạn có dư 3 cánh hoa không?', thanks: 'Vòng hoa xong rồi, đẹp quá! Cảm ơn Mầm nhé!' },
  { id: 'sup-nam', giver: 'cong-chua', item: 'nam', count: 3, seeds: 2, ask: 'Mình định nấu nồi súp nấm cho cả làng. Bạn có dư 3 cây nấm không?', thanks: 'Súp thơm lừng! Lát nữa mời Mầm một bát nhé!' },
  { id: 'hang-rao', giver: 'hoang-tu', item: 'go', count: 2, seeds: 2, ask: 'Hàng rào chuồng cừu hở một chỗ. Bạn có dư 2 khúc gỗ không?', thanks: 'Hàng rào kín rồi, đàn cừu hết chạy lung tung. Cảm ơn Mầm!' },
  { id: 'den-long', giver: 'hoang-tu', item: 'da', count: 1, seeds: 3, ask: 'Mình đang làm đèn lồng cho làng. Bạn có dư 1 viên đá pha lê không?', thanks: 'Đèn sáng lung linh! Tối nay cả làng có đèn rồi!' },
].map(Object.freeze));
const ICON = Object.fromEntries(MATERIALS.map((m) => [m.id, m.icon]));

/** Trang thai trong mot lan choi: nguoi nao da duoc giup o chuyen di nao. */
export function createErrands() { return { helpedOn: new Map() }; }

/** Viec ma `giver` nho o chuyen di `journey` (dem tu 1): xoay vong qua cac viec cua nguoi do; null neu khong co viec hoac chuyen nay da giup roi. */
export function errandFor(state, giver, journey) {
  if (!Number.isInteger(journey) || journey < 1 || state.helpedOn.get(giver) === journey) return null;
  const mine = ERRANDS.filter((errand) => errand.giver === giver);
  return mine.length ? mine[(journey - 1) % mine.length] : null;
}

/** Be con thieu may mon de giup duoc viec nay (0 = du). */
export function missingFor(bag, errand) { return Math.max(0, errand.count - bag.counts[errand.item]); }

/** Chu tren nut: "Tặng 3 🌸 cho Công chúa". */
export function giftLabel(errand, name) { return `Tặng ${errand.count} ${ICON[errand.item]} cho ${name}`; }

/**
 * Tang do. Du thi tru vat lieu, ghi nhan da giup o chuyen nay va tra ve { ok: true, seeds };
 * thieu, hoac viec nay khong con la viec cua chuyen di nay, thi khong doi gi va tra ve { ok: false }.
 */
export function help(state, bag, errand, journey) {
  if (errandFor(state, errand.giver, journey) !== errand) return { ok: false, missing: 0 };
  const missing = missingFor(bag, errand);
  if (missing > 0) return { ok: false, missing };
  bag.counts[errand.item] -= errand.count;
  state.helpedOn.set(errand.giver, journey);
  return { ok: true, seeds: errand.seeds };
}

/** Gia tri cua mon do neu mang ra quay doi (de test: giup dan lang khong bao gio thiet hon). */
export function stallValue(errand) { const { give, get } = TRADES[errand.item]; return Math.floor(errand.count / give) * get; }
