// Lang mai cam cua thung lung: nha tuong voi trang san sat nhau quanh nha tho co thap, vai nha trai le giua ruong.
import * as THREE from 'three';
import { TRS, rnd } from '../core/util.js';
import { MILL, VILLAGE, heightAt, pathDistance } from './terrain.js';

const HOUSES = 36, FARMS = 7;
const HOUSE_RING = [14, VILLAGE.r * 0.66];      // nha nam trong vanh nay quanh tam lang
const HOUSE_GAP = 2.2, STREET_HALF = 3.4;       // khoang ho giua hai nha, nua be rong duong lang
const WALLS = [0xfbf7ec, 0xf4ead6, 0xfdfbf4, 0xf1e2c8], ROOFS = [0xe9843a, 0xdb5f2c, 0xf19a44, 0xe9843a, 0xc9502a, 0x8a93a6];
const WINDOW = 0x4a5f86, DOOR = 0x7a4d32, STONE = 0xcfc8ba;

function roofGeometry(width, rise, depth) {
  const shape = new THREE.Shape(); shape.moveTo(-width / 2, 0); shape.lineTo(0, rise); shape.lineTo(width / 2, 0); shape.closePath();
  return new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false }).translate(0, 0, -depth / 2);
}
const pick = (list) => list[Math.floor(rnd() * list.length)];

/** Mot ngoi nha: tuong, mai dau hoi, ong khoi, cua va cua so. (x, z) la tam, yaw la huong mat tien. */
function house(B, x, z, width, depth, wallHeight, yaw, roofHex) {
  const y = heightAt(x, z), at = (lx, ly, lz) => TRS(x, y, z, 0, yaw, 0).multiply(TRS(lx, ly, lz));
  B.add('clay', new THREE.BoxGeometry(width, wallHeight + 1, depth), at(0, wallHeight / 2 - 0.5, 0), pick(WALLS));
  B.add('clay', roofGeometry(width * 1.14, width * 0.46, depth * 1.1), at(0, wallHeight, 0), roofHex);
  B.add('clay', new THREE.BoxGeometry(0.8, 2.2, 0.8), at(width * 0.22, wallHeight + width * 0.3, depth * 0.2), STONE);
  B.add('clay', new THREE.BoxGeometry(0.12, 2.1, 1.1), at(width / 2, 1.05, 0), DOOR);
  for (const side of [-1, 1]) {
    for (let k = 0, n = Math.max(1, Math.round(depth / 3.2)); k < n; k++) B.add('clay', new THREE.BoxGeometry(0.1, 1.1, 0.9), at(side * width / 2, wallHeight * 0.62, (k - (n - 1) / 2) * 2.6 + (side > 0 ? 1.7 : 0)), WINDOW);
  }
  return { x, z, r: Math.max(width, depth) * 0.6 };
}

function church(B) {
  const yaw = 0.4, y = heightAt(VILLAGE.x, VILLAGE.z), blocks = [house(B, VILLAGE.x, VILLAGE.z, 9, 16, 7.5, yaw, 0x8a93a6)];
  const tx = VILLAGE.x + Math.sin(yaw) * 10, tz = VILLAGE.z + Math.cos(yaw) * 10;
  B.add('clay', new THREE.BoxGeometry(5.2, 19, 5.2), TRS(tx, y + 9.5, tz, 0, yaw, 0), 0xfbf7ec);
  B.add('clay', new THREE.BoxGeometry(5.6, 0.6, 5.6), TRS(tx, y + 14, tz, 0, yaw, 0), STONE);
  for (let k = 0; k < 4; k++) B.add('clay', new THREE.BoxGeometry(0.2, 2.2, 1.2), TRS(tx, y + 16.2, tz, 0, yaw + k * Math.PI / 2, 0).multiply(TRS(2.6, 0, 0)), WINDOW);
  B.add('clay', new THREE.ConeGeometry(4.5, 8, 4), TRS(tx, y + 23, tz, 0, yaw + Math.PI / 4, 0), 0xd9482e);
  blocks.push({ x: tx, z: tz, r: 3.8 });
  return blocks;
}

/** Dung lang va cac nha trai; tra ve vat can. */
export function createVillage(B) {
  const blocks = church(B);
  const fits = (x, z, r) => pathDistance(x, z) > r + STREET_HALF && blocks.every((b) => Math.hypot(b.x - x, b.z - z) > b.r + r + HOUSE_GAP);
  for (let placed = 0, guard = 0; placed < HOUSES && guard < HOUSES * 60; guard++) {
    const a = rnd() * Math.PI * 2, r = HOUSE_RING[0] + Math.sqrt(rnd()) * (HOUSE_RING[1] - HOUSE_RING[0]), x = VILLAGE.x + Math.cos(a) * r, z = VILLAGE.z + Math.sin(a) * r;
    const width = 6.5 + rnd() * 3, depth = 7.5 + rnd() * 5;
    if (!fits(x, z, Math.max(width, depth) * 0.6)) continue;
    blocks.push(house(B, x, z, width, depth, 4.2 + rnd() * 2.6, Math.round(rnd() * 3) * Math.PI / 2 + 0.4 + (rnd() - .5) * 0.5, pick(ROOFS)));
    placed++;
  }
  for (let placed = 0, guard = 0; placed < FARMS && guard < FARMS * 40; guard++) {
    const a = rnd() * Math.PI * 2, r = VILLAGE.r * 1.5 + rnd() * 260, x = VILLAGE.x + Math.cos(a) * r, z = VILLAGE.z + Math.sin(a) * r;
    if (!fits(x, z, 8) || Math.hypot(x - MILL.x, z - MILL.z) < 30 || Math.hypot(x, z) < 60) continue;
    blocks.push(house(B, x, z, 7 + rnd() * 2, 10 + rnd() * 4, 4.5, rnd() * Math.PI, pick(ROOFS)));
    placed++;
  }
  return blocks;
}
