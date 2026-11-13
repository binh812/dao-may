// Luat doi do o quay hang (thuan: khong import three.js hay DOM). Hat Nang nhat duoc la "tien"; so du = so hat da nhat
// tru tong gia cac mon da doi. Mon da doi la cua be mai mai, mac/coi tuy thich, khong mat phi. Khong co mua bang tien that.

export const SLOTS = [
  { id: 'hat', name: 'Mũ' },
  { id: 'scarf', name: 'Khăn' },
  { id: 'sprout', name: 'Chồi' },
];

// Khong doi id mon da phat hanh: tu do cua be luu theo id.
export const CATALOG = [
  { id: 'mu-rom', slot: 'hat', name: 'Mũ rơm', price: 6, swatch: '#f2d27a' },
  { id: 'mu-len', slot: 'hat', name: 'Mũ len đỏ', price: 8, swatch: '#e2504a' },
  { id: 'vong-hoa', slot: 'hat', name: 'Vòng hoa', price: 10, swatch: '#ff9fc2' },
  { id: 'khan-do', slot: 'scarf', name: 'Khăn đỏ', price: 5, swatch: '#e2504a' },
  { id: 'khan-xanh', slot: 'scarf', name: 'Khăn xanh', price: 5, swatch: '#4f9be0' },
  { id: 'choi-vang', slot: 'sprout', name: 'Chồi lá vàng', price: 6, swatch: '#f5c33b' },
  { id: 'choi-hoa', slot: 'sprout', name: 'Chồi nở hoa', price: 8, swatch: '#ff8fb5' },
];

const BY_ID = new Map(CATALOG.map((item) => [item.id, item]));
const SLOT_IDS = SLOTS.map((slot) => slot.id);

/** Tong gia ca quay: the gioi phai co it nhat ngan nay Hat Nang thi be moi doi duoc het. */
export const catalogTotal = () => CATALOG.reduce((sum, item) => sum + item.price, 0);
export const cheapestPrice = () => Math.min(...CATALOG.map((item) => item.price));

/**
 * Tu do { owned: Set<id>, worn: { hat, scarf, sprout } } dung lai tu du lieu da luu. Du lieu la/hong thi bo phan hong:
 * id khong con trong quay bi bo qua, mon dang mac ma khong so huu thi coi nhu khong mac.
 */
export function createWardrobe(saved = null) {
  const owned = new Set(Array.isArray(saved?.owned) ? saved.owned.filter((id) => BY_ID.has(id)) : []);
  const worn = {};
  for (const slot of SLOT_IDS) {
    const id = saved?.worn?.[slot];
    worn[slot] = owned.has(id) && BY_ID.get(id).slot === slot ? id : null;
  }
  return { owned, worn };
}

export const serializeWardrobe = (wardrobe) => ({ owned: [...wardrobe.owned], worn: { ...wardrobe.worn } });

export function spent(wardrobe) {
  let sum = 0;
  for (const id of wardrobe.owned) sum += BY_ID.get(id).price;
  return sum;
}

/** So Hat Nang con tieu duoc. Khong bao gio am, ke ca khi du lieu hat da nhat bi mat. */
export function balance(wardrobe, collected) {
  if (!Number.isInteger(collected) || collected < 0) throw new RangeError(`So Hat Nang khong hop le: ${collected}`);
  return Math.max(0, collected - spent(wardrobe));
}

/**
 * Doi mot mon. Du hat thi be so huu mon do va mac luon. Tra ve { ok: true } hoac
 * { ok: false, reason: 'owned' | 'short', missing } va khong doi gi.
 */
export function buy(wardrobe, id, collected) {
  const item = BY_ID.get(id);
  if (!item) throw new RangeError(`Quay khong co mon: ${id}`);
  if (wardrobe.owned.has(id)) return { ok: false, reason: 'owned', missing: 0 };
  const have = balance(wardrobe, collected);
  if (have < item.price) return { ok: false, reason: 'short', missing: item.price - have };
  wardrobe.owned.add(id); wardrobe.worn[item.slot] = id;
  return { ok: true };
}

/** Mac mon da so huu (thay mon cung vi tri), hoac coi ra neu dang mac. Tra ve true neu co thay doi. */
export function toggleWear(wardrobe, id) {
  const item = BY_ID.get(id);
  if (!item) throw new RangeError(`Quay khong co mon: ${id}`);
  if (!wardrobe.owned.has(id)) return false;
  wardrobe.worn[item.slot] = wardrobe.worn[item.slot] === id ? null : id;
  return true;
}

/** Trang thai tung mon de giao dien ve: 'worn' | 'owned' | 'can-buy' | 'short' (kem so hat con thieu). */
export function shelf(wardrobe, collected) {
  const have = balance(wardrobe, collected);
  return CATALOG.map((item) => {
    const status = wardrobe.worn[item.slot] === item.id ? 'worn' : wardrobe.owned.has(item.id) ? 'owned' : have >= item.price ? 'can-buy' : 'short';
    return { ...item, status, missing: status === 'short' ? item.price - have : 0 };
  });
}
