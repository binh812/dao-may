// Cho dat Hat Nang trong thung lung: rai deu doc cac duong mon, them mot vong quanh ho va quanh coi xay.
// Id cua moi hat co dinh theo vi tri trong danh sach (khong phu thuoc so ngau nhien) vi tien do nhat duoc luu theo id.
import { LAKE, MILL, PATH_SEGMENTS, lakeShape, pathDistance } from './terrain.js';

const ALONG_PATH_EVERY = 21, PATH_START = 14;      // khoang cach giua hai hat tren duong (m); bo qua doan sat dau duong
const LAKE_RING = 10, MILL_RING = 6, MILL_RADIUS = 9;
const FLOAT_HEIGHT = 0.85;                         // hat lo lung cao ngang nguoi Mam
const CENTERING_STEPS = 4;

/** Keo mot diem ve dung tim duong mon (duong ve tren mat dat bi uon nhe so voi doan thang). */
function ontoPath(x, z) {
  let px = x, pz = z;
  for (let i = 0; i < CENTERING_STEPS; i++) {
    const here = pathDistance(px, pz), dx = pathDistance(px + 0.5, pz) - here, dz = pathDistance(px, pz + 0.5) - here, len = Math.hypot(dx, dz);
    if (len < 1e-6) break;
    px -= dx / len * here; pz -= dz / len * here;
  }
  return [px, pz];
}

/** Danh sach hat { id, x, y, z }; bo nhung cho bi vat can chiem. */
export function seedSpots(groundAt, colliders) {
  const spots = [];
  PATH_SEGMENTS.forEach(([ax, az, bx, bz], s) => {
    const length = Math.hypot(bx - ax, bz - az);
    for (let d = PATH_START, k = 0; d < length - 4; d += ALONG_PATH_EVERY, k++) {
      const [x, z] = ontoPath(ax + (bx - ax) * d / length, az + (bz - az) * d / length);
      spots.push({ id: `duong${s}-${k}`, x, z });
    }
  });
  for (let k = 0; k < LAKE_RING; k++) {
    // di tu tam ho ra toi khi cham bo, roi lui vao mot chut: hat nam o vung nuoc nong ven ho
    const a = k / LAKE_RING * Math.PI * 2; let r = LAKE.r * 0.5;
    while (lakeShape(LAKE.x + Math.cos(a) * r, LAKE.z + Math.sin(a) * r) < 0.9) r += 0.5;
    spots.push({ id: `ho-${k}`, x: LAKE.x + Math.cos(a) * r, z: LAKE.z + Math.sin(a) * r });
  }
  for (let k = 0; k < MILL_RING; k++) {
    const a = k / MILL_RING * Math.PI * 2;
    spots.push({ id: `coixay-${k}`, x: MILL.x + Math.cos(a) * MILL_RADIUS, z: MILL.z + Math.sin(a) * MILL_RADIUS });
  }
  return spots
    .filter((spot) => colliders.every((c) => Math.hypot(c.x - spot.x, c.z - spot.z) > c.r + 0.8))
    .map((spot) => ({ ...spot, y: groundAt(spot.x, spot.z) + FLOAT_HEIGHT }));
}
