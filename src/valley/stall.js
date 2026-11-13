// Quay hang cua co Tho Bong o cong lang: noi be doi Hat Nang lay mu, khan va kieu choi cho Mam.
// Mai bat soc do trang va vien Hat Nang lon tren cot de nhin tu xa da nhan ra.
import * as THREE from 'three';
import { TRS } from '../core/util.js';
import { SHOP, heightAt } from './terrain.js';

const WOOD = 0xb9814f, WOOD_LIGHT = 0xdcaa72, STRIPES = [0xe2504a, 0xfff6ea], SEED = 0xffd75e;
const FUR = 0xfff3e2, EAR_INNER = 0xffb9c8, EYE = 0x2a2030, APRON = 0x57b356;
const AWNING_STRIPES = 7, AWNING_WIDTH = 4.6, AWNING_DEPTH = 3.6, AWNING_TILT = 0.2;
export const STALL_RADIUS = 2.9;   // vong vat can quanh quay

/** Dung quay hang; tra ve vat can. Khong dung so ngau nhien de khong lam doi phan con lai cua canh. */
export function createStall(B) {
  const base = TRS(SHOP.x, heightAt(SHOP.x, SHOP.z), SHOP.z, 0, SHOP.yaw, 0);
  const add = (geometry, color, x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) => B.add('clay', geometry, base.clone().multiply(TRS(x, y, z, rx, ry, rz, sx, sy, sz)), color);
  // quay va ke
  add(new THREE.BoxGeometry(3.6, 1.5, 1.0), WOOD, 0, 0.25, 0.7);
  add(new THREE.BoxGeometry(4.0, 0.14, 1.3), WOOD_LIGHT, 0, 1.05, 0.7);
  add(new THREE.BoxGeometry(3.6, 2.6, 0.3), WOOD, 0, 1.1, -1.25);
  add(new THREE.BoxGeometry(3.4, 0.1, 0.5), WOOD_LIGHT, 0, 1.9, -1.0);
  for (const [x, z] of [[-2.05, 1.35], [2.05, 1.35], [-2.05, -1.35], [2.05, -1.35]]) add(new THREE.CylinderGeometry(0.09, 0.09, 3.6, 8), WOOD, x, 1.5, z);
  // mai bat soc, doc ve phia truoc
  for (let k = 0; k < AWNING_STRIPES; k++) {
    const width = AWNING_WIDTH / AWNING_STRIPES;
    add(new THREE.BoxGeometry(width, 0.1, AWNING_DEPTH), STRIPES[k % 2], (k - (AWNING_STRIPES - 1) / 2) * width, 3.15, 0.15, AWNING_TILT);
  }
  // cot bien hieu: vien Hat Nang lon
  add(new THREE.CylinderGeometry(0.1, 0.12, 6.5, 8), WOOD, 2.9, 3.0, 1.5);
  add(new THREE.OctahedronGeometry(0.62, 0), SEED, 2.9, 6.9, 1.5, 0, 0.6, 0, 1, 1.35, 1);
  // hang bay tren quay: mu rom, cuon khan, cham len, chau hoa
  add(new THREE.CylinderGeometry(0.36, 0.38, 0.04, 14), 0xf2d27a, -1.35, 1.15, 0.75);
  add(new THREE.SphereGeometry(0.2, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), 0xf2d27a, -1.35, 1.15, 0.75);
  add(new THREE.TorusGeometry(0.2, 0.09, 8, 16), 0x4f9be0, 1.35, 1.21, 0.75, Math.PI / 2);
  add(new THREE.TorusGeometry(0.2, 0.09, 8, 16), 0xe2504a, 1.35, 1.38, 0.75, Math.PI / 2);
  add(new THREE.CylinderGeometry(0.16, 0.12, 0.24, 8), 0xd9602e, 0.65, 1.24, 0.95);
  add(new THREE.IcosahedronGeometry(0.17, 1), 0xff9fc2, 0.65, 1.5, 0.95);
  add(new THREE.SphereGeometry(0.36, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), 0xe2504a, -0.9, 1.9, -1.0);
  add(new THREE.IcosahedronGeometry(0.22, 1), 0xffd75e, 0.9, 2.15, -1.0);
  // co Tho Bong dung sau quay
  add(new THREE.IcosahedronGeometry(0.55, 2), FUR, 0, 1.5, -0.2, 0, 0, 0, 1, 1.05, 0.9);
  add(new THREE.IcosahedronGeometry(0.5, 2), FUR, 0, 2.25, -0.15, 0, 0, 0, 1, 0.92, 0.92);
  add(new THREE.BoxGeometry(0.75, 0.6, 0.1), APRON, 0, 1.45, 0.3);
  for (const side of [-1, 1]) {
    add(new THREE.IcosahedronGeometry(0.16, 1), FUR, side * 0.22, 2.8, -0.2, 0, 0, -side * 0.18, 1, 2.1, 0.7);
    add(new THREE.IcosahedronGeometry(0.09, 1), EAR_INNER, side * 0.22, 2.82, -0.1, 0, 0, -side * 0.18, 1, 2.3, 0.5);
    add(new THREE.IcosahedronGeometry(0.075, 1), EYE, side * 0.19, 2.32, 0.29, 0, 0, 0, 1, 1.25, 0.6);
    add(new THREE.IcosahedronGeometry(0.09, 1), 0xff9db0, side * 0.33, 2.15, 0.25, 0, 0, 0, 1, 0.6, 0.4);
    add(new THREE.IcosahedronGeometry(0.16, 1), FUR, side * 0.52, 1.6, 0.15, 0, 0, 0, 0.8, 1.2, 0.8);
  }
  add(new THREE.IcosahedronGeometry(0.06, 1), 0xff7f9a, 0, 2.2, 0.33);
  return { x: SHOP.x, z: SHOP.z, r: STALL_RADIUS };
}
