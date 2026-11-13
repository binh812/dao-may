// Canh vat cua thung lung: rung thong (instanced), cay tan tron tung cum, lang mai cam, coi xay, day nui tuyet o xa.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { MATS, toon } from '../world/materials.js';
import { Q } from '../core/quality.js';
import { Builder, C, TRS, blob, clamp, fbm, noise, rnd, smooth } from '../core/util.js';
import { EDGE, MILL, VILLAGE, forestMask, heightAt } from './terrain.js';

const FOREST_REACH = 1900, CONIFER_PER_FIELD = 3; // so cay thong = Q.field x he so nay                 // rung thong phu ca vanh doi ngoai vung choi de tao cac dai rung sam mau
const BROADLEAF_CLUMPS = 46, HOUSES = 17;
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

/** Cay tan tron moc tung cum o bia dong co; tra ve vat can cho than cay. */
function broadleaf(B) {
  const trunks = [], low = C(0x1d6b3c), high = C(0x5cae45);
  for (let k = 0; k < BROADLEAF_CLUMPS; k++) {
    const a = rnd() * Math.PI * 2, r = 45 + Math.sqrt(rnd()) * 820, cx = Math.cos(a) * r, cz = Math.sin(a) * r;
    if (Math.hypot(cx - VILLAGE.x, cz - VILLAGE.z) < VILLAGE.r + 25 || forestMask(cx, cz) > 0.6) continue;
    for (let t = 0, count = 2 + Math.floor(rnd() * 5); t < count; t++) {
      const x = cx + (rnd() - .5) * 26, z = cz + (rnd() - .5) * 26, y = heightAt(x, z), s = 2.6 + rnd() * 2.4;
      B.add('clay', new THREE.CylinderGeometry(0.16 * s, 0.26 * s, 1.5 * s, 7), TRS(x, y + 0.7 * s, z), 0x6b4a3a);
      for (let b = 0, blobs = 3 + Math.floor(rnd() * 2); b < blobs; b++) {
        const br = (0.75 + rnd() * 0.45) * s, bx = x + (b === 0 ? 0 : (rnd() - .5) * 1.5 * s), bz = z + (b === 0 ? 0 : (rnd() - .5) * 1.5 * s), by = y + (1.5 + (b === 0 ? 0.5 : rnd() * 0.5)) * s;
        B.add('foliage', blob(br, 2, 0.16, 1.4 / s, rnd() * 50), TRS(bx, by, bz, 0, rnd() * 6, 0, 1, 0.82, 1),
          (c, px, py) => c.copy(low).lerp(high, smooth(by - br * 0.6, by + br * 0.8, py)), { ao: false });
      }
      trunks.push({ x, z, r: 0.3 * s });
    }
  }
  return trunks;
}

function roofGeometry(width, rise, depth) {
  const shape = new THREE.Shape(); shape.moveTo(-width / 2, 0); shape.lineTo(0, rise); shape.lineTo(width / 2, 0); shape.closePath();
  return new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false }).translate(0, 0, -depth / 2);
}

/** Lang: nha tuong voi mai cam, nha tho co thap. Tra ve vat can. */
function village(B) {
  const blocks = [], walls = [0xf6f1e4, 0xf1e6d0, 0xfaf6ee], roofs = [0xe8853a, 0xd9602e, 0xf09a45, 0x8a93a6];
  const y0 = heightAt(VILLAGE.x, VILLAGE.z);
  const house = (x, z, w, d, wallH, yaw, roofHex) => {
    B.add('clay', new THREE.BoxGeometry(w, wallH, d), TRS(x, y0 + wallH / 2, z, 0, yaw, 0), walls[Math.floor(rnd() * walls.length)]);
    B.add('clay', roofGeometry(w * 1.12, w * 0.42, d * 1.08), TRS(x, y0 + wallH, z, 0, yaw, 0), roofHex);
    blocks.push({ x, z, r: Math.max(w, d) * 0.62 });
  };
  for (let i = 0; i < HOUSES; i++) {
    const a = i / HOUSES * Math.PI * 2 + rnd() * 0.5, r = 18 + rnd() * (VILLAGE.r - 30);
    house(VILLAGE.x + Math.cos(a) * r, VILLAGE.z + Math.sin(a) * r, 7 + rnd() * 4, 6 + rnd() * 3, 4 + rnd() * 2, rnd() * Math.PI, roofs[Math.floor(rnd() * roofs.length)]);
  }
  // nha tho giua lang
  house(VILLAGE.x, VILLAGE.z, 9, 15, 7, 0.4, 0x8a93a6);
  const tx = VILLAGE.x + Math.sin(0.4) * 9, tz = VILLAGE.z + Math.cos(0.4) * 9;
  B.add('clay', new THREE.BoxGeometry(5, 17, 5), TRS(tx, y0 + 8.5, tz, 0, 0.4, 0), 0xf6f1e4);
  B.add('clay', new THREE.ConeGeometry(4.2, 7, 4), TRS(tx, y0 + 20.5, tz, 0, 0.4 + Math.PI / 4, 0), 0xd9482e);
  blocks.push({ x: tx, z: tz, r: 3.6 });
  return blocks;
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

/** Day nui da co tuyet o rat xa, mot phia chan troi. */
function mountains(B) {
  const haze = C(0x9ec6ea), rock = C(0x8a8f96).lerp(haze, 0.45), rockDark = C(0x5f6b7a).lerp(haze, 0.45), snow = C(0xf7faff).lerp(haze, 0.12);
  for (let i = 0; i < 5; i++) {
    const a = -1.25 + i * 0.3 + rnd() * 0.1, dist = 5200 + rnd() * 1300, radius = 620 + rnd() * 420, height = 780 + rnd() * 560;
    const g = new THREE.ConeGeometry(radius, height, 9, 6), p = g.attributes.position;
    for (let v = 0; v < p.count; v++) {
      const x = p.getX(v), y = p.getY(v), z = p.getZ(v), k = 1 + 0.32 * noise.noise(x / 300 + i * 9, y / 300, z / 300) + 0.12 * noise.noise(x / 90, y / 90 + i, z / 90);
      p.setXYZ(v, x * k, y + (y > -height / 2 + 1 ? 60 * noise.noise(x / 200, i * 3.1, z / 200) : 0), z * k);
    }
    const flat = g.toNonIndexed(); flat.computeVertexNormals();
    const base = heightAt(Math.cos(a) * dist, Math.sin(a) * dist) - 120, snowLine = base + height * (0.52 + rnd() * 0.12);
    B.add('far', flat, TRS(Math.cos(a) * dist, base + height / 2, Math.sin(a) * dist, 0, rnd() * 6, 0),
      (c, px, py, pz, nx, ny) => c.copy(rockDark).lerp(rock, clamp(ny * 1.4 + 0.3, 0, 1)).lerp(snow, smooth(snowLine - 40, snowLine + 60, py + fbm(px / 160, pz / 160, 2) * 90) * smooth(-0.1, 0.35, ny)), { ao: false });
  }
}

/** Dung toan bo canh vat; tra ve vat can va phan can cap nhat moi khung hinh. */
export function createScenery(scene) {
  const B = new Builder();
  conifers(scene);
  const colliders = [...broadleaf(B), ...village(B)];
  const mill = windmill(scene, B);
  mountains(B);
  const group = new THREE.Group(); scene.add(group);
  // nui xa khong chiu suong cua canh (se thanh mang xanh nhat); do mo da pha san vao mau dinh
  B.build(group, { ...MATS, far: toon({ fog: false, flatShading: true }) }, { cast: false });
  group.traverse((o) => { o.frustumCulled = false; });
  colliders.push(mill.block);
  return { colliders: colliders.filter((c) => Math.hypot(c.x, c.z) < EDGE + 50), rotor: mill.rotor };
}
