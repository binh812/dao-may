// Luat nhat do (Hat Nang) thuan: khong import three.js hay DOM. Mot vat duoc nhat khi nhan vat cham vao no;
// da nhat thi khong nhat lai, ke ca sau khi mo lai game (danh sach id da nhat duoc luu ben ngoai).

export const COLLECT = {
  radius: 1.3,        // khoang cach ngang (m) de nhat
  reach: 2.0,         // chenh lech do cao toi da (m): luon ngang qua tren cao thi khong nhat
  milestone: 10,      // cu ngan nay vat thi khen mot lan
};

/**
 * Tao bo suu tap tu danh sach vat { id, x, y, z }. `takenIds` la cac id da nhat tu truoc; id la khong con ton tai thi bo qua.
 * Hai vat trung id la loi du lieu: nem loi ngay de khong am tham mat mot vat.
 */
export function createCollection(items, takenIds = []) {
  const known = new Set();
  for (const item of items) {
    if (known.has(item.id)) throw new RangeError(`Trung id vat nhat: ${item.id}`);
    if (![item.x, item.y, item.z].every(Number.isFinite)) throw new RangeError(`Vat nhat ${item.id} co toa do khong hop le`);
    known.add(item.id);
  }
  const taken = new Set(takenIds.filter((id) => known.has(id)));
  return { items: items.map((item) => ({ ...item, taken: taken.has(item.id) })), count: taken.size, total: items.length, events: { picked: [] } };
}

/** Mot buoc: nhat moi vat nhan vat dang cham. `events.picked` la cac vat vua nhat trong buoc nay. */
export function stepCollection(collection, player) {
  collection.events.picked = [];
  for (const item of collection.items) {
    if (item.taken) continue;
    if (Math.hypot(item.x - player.x, item.z - player.z) > COLLECT.radius || Math.abs(item.y - player.y) > COLLECT.reach) continue;
    item.taken = true; collection.count++; collection.events.picked.push(item);
  }
  return collection;
}

/** Cac id da nhat, de luu lai. */
export function takenIds(collection) { return collection.items.filter((item) => item.taken).map((item) => item.id); }

/** So vat hien tai co phai moc dang khen khong (boi cua COLLECT.milestone, hoac da nhat het). */
export function isMilestone(collection) {
  return collection.count > 0 && (collection.count === collection.total || collection.count % COLLECT.milestone === 0);
}
