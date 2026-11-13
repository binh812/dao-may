// Canh vat cua thung lung: rung thong (instanced), coi xay, nui tuyet o xa; cay tan la o trees.js, lang o village.js.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { MATS, toon } from '../world/materials.js';
import { Q } from '../core/quality.js';
import { Builder, C, TRS, clamp, fbm, noise, rnd, smooth } from '../core/util.js';
import { EDGE, MILL, forestMask, heightAt } from './terrain.js';
import { createTrees } from './trees.js';
import { createVillage } from './village.js';
import { createLife } from './life.js';

const FOREST_REACH = 1900, CONIFER_PER_FIELD = 3; // so cay thong = Q.field x he so nay                 // rung thong phu ca vanh doi ngoai vung choi de tao cac dai rung sam mau
const _m = new THREE.Matrix4(), _p = new THREE.Vector3(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _e = new THREE.Euler(), _c = new THREE.Color();

function conifers(scene) {
  const lower = new THREE.ConeGeometry(1, 2.3, 5, 1, true).translate(0, 1.5, 0), upper = new THREE.ConeGeometry(0.7, 1.9, 5, 1, true).translate(0, 2.75, 0);
  const total = Q.field * CONIFER_PER_FIELD;
  const mesh = new THREE.InstancedMesh(mergeGeometries([lower, upper]), toon({ vertexColors: false, side: THREE.DoubleSide }), total);
  const dark = C(0x16503a), light = C(0x2f7d4c);
  let n = 0, guard = 0;
  while (n < total && guard++ < total * 40) {
    const a = rnd() * Math.PI * 2, r = 120 + Math.sqrt(rnd()) * (FOREST_REACH - 120), x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (forestMask(x, z) < 0.56 + rnd() * 0.08) continue;
    const s = 3.6 + rnd() * 2.2;
    _m.compose(_p.set(x, heightAt(x, z) - 0.4, z), _q.setFromEuler(_e.set(0, rnd() * 6.283, 0)), _s.set(s * (0.85 + rnd() * 0.3), s, s * (0.85 + rnd() * 0.3)));
    mesh.setMatrixAt(n, _m); mesh.setColorAt(n, _c.copy(dark).lerp(light, rnd())); n++;
  }
  mesh.count = n; mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.frustumCulled = false; scene.add(mesh);
}

function windmill(scene, B) {
  const y0 = heightAt(MILL.x, MILL.z), yaw = -2.1;
  B.add('clay', new THREE.CylinderGeometry(2.1, 3.2, 11, 14), TRS(MILL.x, y0 + 5.5, MILL.z), 0xf6f1e4);
  B.add('clay', new THREE.ConeGeometry(2.7, 3, 14), TRS(MILL.x, y0 + 12.5, MILL.z), 0xd9602e);
  const RB = new Builder(), rotor = new THREE.Group();
  for (let k = 0; k < 4; k++) RB.add('clay', new THREE.BoxGeometry(1.3, 8, 0.12), TRS(0, 0, 0, 0, 0, k * Math.PI / 2).multiply(TRS(0, 4.4, 0)), 0xfaf6ee);
  RB.add('clay', new THREE.SphereGeometry(0.5, 10, 8), TRS(0, 0, 0), 0x6b4a3a);
  RB.build(rotor, MATS, { cast: false });
  rotor.position.set(MILL.x + Math.sin(yaw) * 2.6, y0 + 10.2, MILL.z + Math.cos(yaw) * 2.6); rotor.rotation.order = 'YXZ'; rotor.rotation.y = yaw;
  scene.add(rotor);
  return { rotor, block: { x: MILL.x, z: MILL.z, r: 3.6 } };
}

// Khoi nui da phu tuyet o rat xa: [goc nhin tu doi co (rad), khoang cach, be rong chan, do cao dinh]
const MASSIFS = [[-0.30, 7600, 3400, 1150], [-1.12, 8200, 3000, 760], [0.70, 8200, 3200, 700]];
const MASSIF_CELLS = 44, MASSIF_SINK = 260;

/** Mot khoi nui: luoi do cao voi nhieu song nui (ridged noise), dinh nhon o giua, to mau da va tuyet. */
function massif(B, [angle, dist, size, height], index) {
  const haze = C(0xa9cdee), rock = C(0x8d8a86).lerp(haze, 0.30), rockDark = C(0x596273).lerp(haze, 0.30), snow = C(0xfbfdff).lerp(haze, 0.06), snowShade = C(0xb9cdea).lerp(haze, 0.15);
  const g = new THREE.PlaneGeometry(size, size, MASSIF_CELLS, MASSIF_CELLS).rotateX(-Math.PI / 2), p = g.attributes.position, half = size / 2;
  for (let v = 0; v < p.count; v++) {
    const x = p.getX(v), z = p.getZ(v), r = Math.min(Math.hypot(x, z) / half, 1), envelope = Math.pow(1 - r, 1.35);
    let ridge = 0, amp = 0.55, freq = 1;
    for (let o = 0; o < 4; o++) { ridge += amp * (1 - Math.abs(noise.noise(x * freq / 620 + index * 13, o * 7.3, z * freq / 620))); amp *= 0.5; freq *= 2.1; }
    p.setY(v, height * (envelope * (0.25 + 0.75 * ridge) + Math.pow(1 - r, 4) * 0.22));
  }
  const flat = g.toNonIndexed(); flat.computeVertexNormals();
  const cx = Math.cos(angle) * dist, cz = Math.sin(angle) * dist, base = heightAt(cx, cz) - MASSIF_SINK, snowLine = base + height * 0.42;
  B.add('far', flat, TRS(cx, base, cz, 0, index * 2.1, 0), (c, px, py, pz, nx, ny) => {
    const snowy = smooth(snowLine - 80, snowLine + 160, py + fbm(px / 190, pz / 190, 2) * 170) * smooth(0.30, 0.62, ny);
    c.copy(rockDark).lerp(rock, clamp(ny * 1.5 - 0.1, 0, 1)).lerp(nx * 0.4 + ny > 0.5 ? snow : snowShade, snowy);
  }, { ao: false });
}

/** Dung toan bo canh vat; tra ve vat can va phan can cap nhat moi khung hinh. */
export function createScenery(scene, grassCenter) {
  const B = new Builder();
  conifers(scene);
  const colliders = [...createTrees(scene), ...createVillage(B)];
  const mill = windmill(scene, B), life = createLife(scene, B, grassCenter);
  colliders.push(...life.colliders);
  const group = new THREE.Group(); scene.add(group);
  // nui xa khong chiu suong cua canh (se thanh mang xanh nhat); do mo da pha san vao mau dinh
  const massifs = new THREE.Group(), massifBuilder = new Builder(); scene.add(massifs);
  MASSIFS.forEach((spec, index) => massif(massifBuilder, spec, index));
  massifBuilder.build(massifs, { far: toon({ fog: false, flatShading: true }) }, { cast: false });
  massifs.traverse((o) => { o.frustumCulled = false; });
  B.build(group, MATS, { cast: false });
  group.traverse((o) => { o.frustumCulled = false; });
  colliders.push(mill.block);
  return { colliders: colliders.filter((c) => Math.hypot(c.x, c.z) < EDGE + 50), rotor: mill.rotor, life, massifs };
}
