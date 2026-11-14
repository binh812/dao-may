// Trang phuc cua Mam: mu, khan va kieu choi doi duoc o quay hang. Moi mon la mot nhom luoi gan san vao nhan vat,
// chi bat nhom dang mac. Id mon khop voi CATALOG trong game/shop-core.js.
import * as THREE from 'three';
import { sprout, squash } from './mam.js';

const SPROUT_Y = 0.95, SPROUT_Y_WITH_HAT = { 'mu-rom': 1.07, 'mu-len': 1.1 };   // doi mu thi choi nho len tren chop mu
const HAT_TOP = 0.93, SCARF_MID = 0.43;                     // do cao cua mu va khan trong he cua than bong cu
const HATS = ['mu-rom', 'mu-len', 'vong-hoa'], SCARVES = ['khan-do', 'khan-xanh'];
// cach dat trang phuc len than hien tai; mac dinh la than bong cu, fitOutfit doi khi mo hinh dang nguoi nap xong
const fit = { sproutY: SPROUT_Y, hatLift: 1 };
let lastWorn = { hat: null, scarf: null, sprout: null };
const SCARF_TILT = 0.3;
const LEAF_GREEN = 0x66d06a, LEAF_GOLD = 0xf5c33b;

const cloth = (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.85 });
function part(parent, geometry, material, x, y, z, sx = 1, sy = sx, sz = sx) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z); mesh.scale.set(sx, sy, sz); mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}

function strawHat() {
  const hat = new THREE.Group(), straw = cloth(0xf2d27a);
  part(hat, new THREE.CylinderGeometry(0.5, 0.54, 0.035, 24), straw, 0, 0.9, 0);
  part(hat, new THREE.SphereGeometry(0.27, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), straw, 0, 0.9, 0, 1, 0.75, 1);
  part(hat, new THREE.CylinderGeometry(0.275, 0.275, 0.07, 20, 1, true), cloth(0xe2504a), 0, 0.945, 0);
  return hat;
}

function woolHat() {
  const hat = new THREE.Group(), red = cloth(0xe2504a);
  part(hat, new THREE.SphereGeometry(0.42, 22, 12, 0, Math.PI * 2, 0, Math.PI / 2), red, 0, 0.72, 0, 1, 0.92, 0.97);
  part(hat, new THREE.TorusGeometry(0.41, 0.06, 8, 24), cloth(0xfff6ea), 0, 0.73, 0).rotation.x = Math.PI / 2;
  return hat;
}

function flowerCrown() {
  const crown = new THREE.Group(), petals = [cloth(0xff9fc2), cloth(0xfff6ea), cloth(0xffd75e)];
  const ring = part(crown, new THREE.TorusGeometry(0.33, 0.03, 6, 24), cloth(0x57b356), 0, 0.86, 0);
  ring.rotation.x = Math.PI / 2;
  for (let k = 0; k < 9; k++) {
    const a = k / 9 * Math.PI * 2;
    part(crown, new THREE.IcosahedronGeometry(0.075, 1), petals[k % 3], Math.sin(a) * 0.33, 0.875, Math.cos(a) * 0.33, 1, 0.75, 1);
  }
  return crown;
}

function scarf(color) {
  const group = new THREE.Group(), material = cloth(color);
  // vong khan nghieng: thap duoi cam o phia truoc, cao sau gay, de nhin tu sau lung van ra chiec khan
  const loop = part(group, new THREE.TorusGeometry(0.47, 0.065, 8, 28), material, 0, 0.43, 0, 1, 1, 1.2);
  loop.rotation.x = Math.PI / 2 + SCARF_TILT;
  // nut that va hai dau khan buong sau lung (nguoi choi hau nhu luon nhin Mam tu phia sau)
  part(group, new THREE.SphereGeometry(0.09, 10, 8), material, 0.14, 0.57, -0.47);
  part(group, new THREE.BoxGeometry(0.13, 0.32, 0.05), material, 0.12, 0.4, -0.52).rotation.z = 0.12;
  part(group, new THREE.BoxGeometry(0.12, 0.25, 0.05), material, 0.25, 0.44, -0.48).rotation.z = 0.5;
  return group;
}

function bloom() {
  const flower = new THREE.Group(), pink = cloth(0xff8fb5);
  for (let k = 0; k < 5; k++) {
    const a = k / 5 * Math.PI * 2;
    part(flower, new THREE.SphereGeometry(0.07, 12, 8), pink, Math.cos(a) * 0.075, 0.3, Math.sin(a) * 0.075, 1, 0.45, 1);
  }
  part(flower, new THREE.SphereGeometry(0.05, 10, 8), cloth(0xffd75e), 0, 0.31, 0, 1, 0.7, 1);
  return flower;
}

const pieces = {
  'mu-rom': [squash, strawHat()], 'mu-len': [squash, woolHat()], 'vong-hoa': [squash, flowerCrown()],
  'khan-do': [squash, scarf(0xe2504a)], 'khan-xanh': [squash, scarf(0x4f9be0)],
  'choi-hoa': [sprout, bloom()],
};
for (const [parent, group] of Object.values(pieces)) { group.visible = false; parent.add(group); }
const leafMaterial = sprout.children[0].material;   // than va hai la cua choi dung chung mot vat lieu

/** Mac dung nhung mon trong `worn` ({ hat, scarf, sprout } -> id hoac null); mon khac thi cat di. */
export function applyOutfit(worn) {
  const wearing = new Set(Object.values(worn).filter(Boolean));
  for (const [id, [, group]] of Object.entries(pieces)) group.visible = wearing.has(id);
  leafMaterial.color.setHex(worn.sprout === 'choi-vang' ? LEAF_GOLD : LEAF_GREEN);
  sprout.position.y = fit.sproutY + ((SPROUT_Y_WITH_HAT[worn.hat] ?? SPROUT_Y) - SPROUT_Y) * fit.hatLift;
  lastWorn = worn;
}

/** Chuyen mu va choi sang nhom `head`, khan sang nhom `neck` (hai nhom bam theo xuong cua mo hinh); cho dat trong nhom giu nguyen. */
export function carryOutfit(head, neck) {
  for (const id of HATS) head.add(pieces[id][1]);
  for (const id of SCARVES) neck.add(pieces[id][1]);
  head.add(sprout);
}

/**
 * Dat lai mu, khan, choi cho mot dang than khac: hatY/scarfY la do cao dinh dau va co (m), hatScale/scarfScale la ti le
 * so voi than bong cu. Goi lai applyOutfit de choi nam dung cho.
 */
export function fitOutfit({ sproutY, hatY, hatScale, scarfY, scarfScale }) {
  for (const id of HATS) { const group = pieces[id][1]; group.scale.setScalar(hatScale); group.position.y = hatY - HAT_TOP * hatScale; }
  for (const id of SCARVES) { const group = pieces[id][1]; group.scale.setScalar(scarfScale); group.position.y = scarfY - SCARF_MID * scarfScale; }
  fit.sproutY = sproutY; fit.hatLift = hatScale;
  applyOutfit(lastWorn);
}
