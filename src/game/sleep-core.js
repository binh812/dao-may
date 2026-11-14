// Vung ngu va thuc (luat thuan, co test): quanh trai Bong Lang dang ngu, canh nhat mau. Moi con thuc day thi mau tro lai mot phan;
// con cuoi cung thuc thi mau loang tu giua trai ra het vung (nhu mau nuoc tham giay). Chi la hinh anh: khong chan duong, khong tru gi.

export const SLEEP = Object.freeze({
  margin: 20,        // (m) vung nhat mau rong hon cho con xa nhat chung nay
  minRadius: 28,
  deepest: 0.62,     // do nhat khi ca trai con ngu (1 = mat han mau)
  lightest: 0.34,    // do nhat khi chi con mot con chua thuc: van thay ro la vung chua thuc han
  easeRate: 1.6,     // toc do do nhat doi theo so con da thuc (1/giay)
  washSeconds: 3.2,  // mau loang het vung trong ngan nay giay sau khi con cuoi thuc
  washOvershoot: 1.15,
  washEdge: 4,       // (m) be rong mep loang (shader dung). Phai co minRadius * washOvershoot - washEdge >= minRadius, neu khong luc tat se giat mau
});

/** Vung quanh cac cho Bong Lang ngu: tam la trung binh cac cho, ban kinh trum het cong them le. `spots`: [{ x, z }]. */
export function createZone(spots) {
  if (!Array.isArray(spots) || !spots.length) throw new RangeError('Vung ngu can it nhat mot cho');
  const x = spots.reduce((sum, s) => sum + s.x, 0) / spots.length, z = spots.reduce((sum, s) => sum + s.z, 0) / spots.length;
  const reach = Math.max(...spots.map((s) => Math.hypot(s.x - x, s.z - z)));
  return { x, z, radius: Math.max(SLEEP.minRadius, reach + SLEEP.margin), amount: SLEEP.deepest, clear: 0 };
}

/**
 * Tien mot buoc. `awake`/`total`: so Bong Lang da thuc / tong so. Cap nhat va tra ve vung:
 * amount = do nhat mau (0..1), clear = ban kinh (m) phan da co mau tro lai tinh tu tam (0 khi chua thuc het).
 */
export function stepZone(zone, dt, awake, total) {
  if (!(dt >= 0) || !Number.isFinite(dt)) return zone;
  const asleep = total > 0 ? Math.min(Math.max(total - awake, 0), total) : 0;
  if (asleep === 0) {
    // thuc het: giu nguyen do nhat, de vong mau loang ra la thu lam mat no (khong mo dan dong loat)
    zone.clear = Math.min(zone.clear + dt * zone.radius * SLEEP.washOvershoot / SLEEP.washSeconds, zone.radius * SLEEP.washOvershoot);
    if (zone.clear >= zone.radius * SLEEP.washOvershoot) zone.amount = 0;
    return zone;
  }
  const target = total > 1 ? SLEEP.lightest + (SLEEP.deepest - SLEEP.lightest) * (asleep - 1) / (total - 1) : SLEEP.deepest;
  zone.amount += (target - zone.amount) * (1 - Math.exp(-dt * SLEEP.easeRate));
  zone.clear = 0;
  return zone;
}

/** Vung da co mau tro lai hoan toan chua. */
export const isAwake = (zone) => zone.amount === 0;
