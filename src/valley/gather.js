// Cho moc vat hai luom trong thung lung (hoa, nam, go, da pha le): moi trai Bong Lang co mot vong vat quanh no,
// de di danh thuc cho nao cung co thu de nhat. Vi tri co dinh (khong ngau nhien); moi chuyen di chung moc lai.
import { CAMP_SPOTS, lakeShape } from './terrain.js';

const KINDS = ['hoa', 'nam', 'go', 'da'], PER_CAMP = 8;
const RING = { near: 18, step: 5, steps: 5 };       // ban kinh vong: 18..38 m quanh trai
const LAKE_MARGIN = 1.4, COLLIDER_MARGIN = 1.2;

/** Danh sach { id, kind, x, y, z }; bo cho roi vao ho, ngoai dia hinh hay sat vat can. */
export function gatherSpots(groundAt, colliders) {
  const spots = [];
  CAMP_SPOTS.forEach(([cx, cz], camp) => {
    for (let k = 0; k < PER_CAMP; k++) {
      const angle = (k / PER_CAMP) * Math.PI * 2 + camp * 0.7, radius = RING.near + ((k * 7 + camp * 3) % RING.steps) * RING.step;
      const x = cx + Math.cos(angle) * radius, z = cz + Math.sin(angle) * radius, y = groundAt(x, z);
      if (!Number.isFinite(y) || lakeShape(x, z) < LAKE_MARGIN) continue;
      if (colliders.some((c) => Math.hypot(x - c.x, z - c.z) < c.r + COLLIDER_MARGIN)) continue;
      spots.push({ id: `hai-${camp}-${k}`, kind: KINDS[(k + camp) % KINDS.length], x, y, z });
    }
  });
  return spots;
}
