// Vat can va mat dat cho nhan vat. Doc bo cuc cua dao, khong dung canh.
import { CRAGS, HOUSE, MILL, R, WATER_Y, height } from './layout.js';
import { TREES } from './flora.js';

const CRAG_SCALE = 0.9, HOUSE_RADIUS = 2.3, MILL_RADIUS = 1.25, TRUNK_RADIUS = 0.4;
const EDGE_MARGIN = 0.1, WADE_DEPTH = 0.25;

/** Vat can dang tru tron: vach da, nha, coi xay, than cay. */
const colliders = [
  ...CRAGS.map(([x, z, r]) => ({ x, z, r: r * CRAG_SCALE })),
  { x: HOUSE.x, z: HOUSE.z, r: HOUSE_RADIUS },
  { x: MILL.x, z: MILL.z, r: MILL_RADIUS },
  ...TREES.map(([x, z, s]) => ({ x, z, r: TRUNK_RADIUS * s })),
];

/** Do cao mat dat de dung len: ngoai mep dao la khoang khong; trong ao va suoi thi loi o muc nuoc nong. */
function groundAt(x, z) {
  if (Math.hypot(x, z) > R - EDGE_MARGIN) return -Infinity;
  return Math.max(height(x, z), WATER_Y - WADE_DEPTH);
}

export { colliders, groundAt };
