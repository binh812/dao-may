// Su song cua thung lung: buom bay quanh nguoi choi, dan chim luon tren cao, bay cuu gam co tren dong.
import * as THREE from 'three';
import { U } from '../core/stage.js';
import { TRS, rnd } from '../core/util.js';
import { COMMON, FRAG_TAIL, instanced, sharedUniforms } from './grass.js';
import { MILL, VILLAGE, fieldAmount, forestMask, heightAt, pathDistance } from './terrain.js';

const BUTTERFLIES = 44, BUTTERFLY_TILE = 46;        // buom song trong o vuong canh nay quanh nguoi choi (quan lai nhu co)
const FLOCKS = [                                    // dan chim: tam vong luon, ban kinh, do cao so voi mat dat, so con, toc do goc
  { x: 190, z: -140, radius: 170, height: 75, birds: 9, speed: 0.11 },
  { x: -120, z: 160, radius: 120, height: 95, birds: 6, speed: -0.09 },
];
const BIRD_SPAN = 1.5, BIRD_COLOR = 0x3a4863;
const SHEEP_FLOCKS = 9, SHEEP_PER_FLOCK = [4, 8], SHEEP_CLEAR = { path: 5, village: VILLAGE.r, mill: 16, spawn: 22 };
const WOOL = 0xfdfaf2, FACE = 0x4a4040;

function butterflies(center) {
  const wings = new THREE.BufferGeometry();
  // hai canh la hai tam giac chung goc o than; x am la canh trai
  wings.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, -0.35, -1, 0, -0.6, -0.8, 0, 0.55, 0, 0, 0.35, 0, 0, -0.35, 1, 0, -0.6, 0.8, 0, 0.55, 0, 0, 0.35]), 3));
  wings.setIndex([0, 1, 2, 0, 2, 3, 4, 6, 5, 4, 7, 6]);
  const uniforms = { ...sharedUniforms(center), uTime: U.time, uNight: U.night, uRain: U.rain };
  uniforms.uTile = { value: BUTTERFLY_TILE };
  const mesh = new THREE.Mesh(instanced(wings, BUTTERFLIES), new THREE.ShaderMaterial({
    side: THREE.DoubleSide, fog: true, uniforms,
    vertexShader: /* glsl */`
      #include <common>
      #include <fog_pars_vertex>
      ${COMMON}
      uniform float uTime, uNight, uRain; varying vec3 vCol; varying float vShade;
      void main(){
        vec2 home = wrapped(); float s = aSeed.y, t = uTime * (0.7 + 0.5 * fract(s * 7.1));
        float alive = (1. - smoothstep(uTile * 0.34, uTile * 0.49, length(home - uCenter))) * (1. - uNight) * (1. - min(uRain, 1.));
        vec2 at = home + vec2(sin(t * 0.55 + s * 31.), cos(t * 0.43 + s * 17.)) * 3.2 + vec2(sin(t * 1.7 + s * 5.), cos(t * 1.3 + s * 9.)) * 0.6;
        float flap = sin(uTime * (11. + 6. * fract(s * 3.3)) + s * 50.) * 1.05, yaw = t * 0.45 + s * 6.2831, size = (0.13 + 0.07 * fract(s * 11.7)) * alive;
        vec3 p = vec3(position.x * cos(flap), abs(position.x) * sin(flap), position.z) * size;
        float c = cos(yaw), sn = sin(yaw);
        vec3 w = vec3(at.x + p.x * c - p.z * sn, groundH(at) + 0.95 + 0.45 * sin(t * 1.9 + s * 23.) + p.y, at.y + p.x * sn + p.z * c);
        float k = fract(s * 17.3);
        vCol = pow(k < 0.3 ? vec3(1.0, 0.85, 0.30) : k < 0.55 ? vec3(1.0, 1.0, 1.0) : k < 0.75 ? vec3(0.50, 0.83, 1.0) : k < 0.9 ? vec3(1.0, 0.56, 0.72) : vec3(1.0, 0.60, 0.30), vec3(2.2));
        vShade = 0.82 + 0.18 * abs(position.x);
        vec4 mvPosition = viewMatrix * vec4(w, 1.);
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: /* glsl */`
      #include <common>
      #include <fog_pars_fragment>
      uniform float uDim; varying vec3 vCol; varying float vShade;
      void main(){
        gl_FragColor = vec4(vCol * vShade * uDim, 1.);
        ${FRAG_TAIL}
      }`,
  }));
  mesh.frustumCulled = false;
  return mesh;
}

function birds(scene) {
  const wing = new THREE.BufferGeometry();
  wing.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, -0.22, 1, 0, -0.05, 0, 0, 0.28]), 3));
  const material = new THREE.MeshBasicMaterial({ color: BIRD_COLOR, side: THREE.DoubleSide });
  return FLOCKS.map((flock, f) => {
    const group = new THREE.Group(), members = [];
    for (let i = 0; i < flock.birds; i++) {
      const bird = new THREE.Group(), left = new THREE.Mesh(wing, material), right = new THREE.Mesh(wing, material);
      left.scale.set(-BIRD_SPAN, 1, BIRD_SPAN); right.scale.set(BIRD_SPAN, 1, BIRD_SPAN); bird.add(left, right);
      const row = Math.ceil(i / 2), side = i % 2 === 0 ? 1 : -1;                         // xep hinh chu V
      bird.position.set(side * row * 2.6, Math.sin(i * 1.7) * 0.8, row * 2.4);
      group.add(bird); members.push({ left, right, phase: i * 0.9 + f * 2 });
    }
    scene.add(group);
    return { flock, group, members, angle: f * 2.2 };
  });
}

/** Mot con cuu: than bong tron, dau va chan sam mau. */
function sheep(B, x, z, yaw, size) {
  const at = (lx, ly, lz, sx = 1, sy = sx, sz = sx) => TRS(x, heightAt(x, z), z, 0, yaw, 0).multiply(TRS(lx * size, ly * size, lz * size, 0, 0, 0, sx * size, sy * size, sz * size));
  B.add('clay', new THREE.IcosahedronGeometry(0.5, 1), at(0, 0.62, 0, 1.25, 0.95, 0.95), WOOL);
  B.add('clay', new THREE.IcosahedronGeometry(0.22, 1), at(0.72, 0.72, 0, 1.1, 1, 0.9), FACE);
  for (const [lx, lz] of [[0.3, 0.2], [0.3, -0.2], [-0.3, 0.2], [-0.3, -0.2]]) B.add('clay', new THREE.CylinderGeometry(0.05, 0.05, 0.4, 5), at(lx, 0.2, lz), FACE);
}

function flocksOfSheep(B) {
  const blocks = [];
  for (let placed = 0, guard = 0; placed < SHEEP_FLOCKS && guard < SHEEP_FLOCKS * 60; guard++) {
    const a = rnd() * Math.PI * 2, r = 40 + rnd() * 420, cx = VILLAGE.x * 0.55 + Math.cos(a) * r, cz = VILLAGE.z * 0.55 + Math.sin(a) * r;
    if (forestMask(cx, cz) > 0.5 || fieldAmount(cx, cz) > 0.7 && rnd() < 0.5 || Math.hypot(cx, cz) < SHEEP_CLEAR.spawn) continue;
    for (let i = 0, count = SHEEP_PER_FLOCK[0] + Math.floor(rnd() * (SHEEP_PER_FLOCK[1] - SHEEP_PER_FLOCK[0] + 1)); i < count; i++) {
      const x = cx + (rnd() - .5) * 16, z = cz + (rnd() - .5) * 16, size = 0.85 + rnd() * 0.5;
      if (pathDistance(x, z) < SHEEP_CLEAR.path || Math.hypot(x - VILLAGE.x, z - VILLAGE.z) < SHEEP_CLEAR.village || Math.hypot(x - MILL.x, z - MILL.z) < SHEEP_CLEAR.mill) continue;
      if (blocks.some((b) => Math.hypot(b.x - x, b.z - z) < 1.8)) continue;
      sheep(B, x, z, rnd() * Math.PI * 2, size); blocks.push({ x, z, r: 0.6 * size });
    }
    placed++;
  }
  return blocks;
}

/** Dung sinh vat; tra ve vat can (cuu) va ham cap nhat moi khung hinh. */
export function createLife(scene, B, center) {
  scene.add(butterflies(center));
  const flocks = birds(scene), colliders = flocksOfSheep(B);
  return {
    colliders,
    update(dt, time) {
      for (const { flock, group, members } of flocks) {
        const angle = time * flock.speed, x = flock.x + Math.cos(angle) * flock.radius, z = flock.z + Math.sin(angle) * flock.radius;
        group.position.set(x, heightAt(flock.x, flock.z) + flock.height + Math.sin(time * 0.2) * 6, z);
        group.rotation.y = -angle + (flock.speed > 0 ? Math.PI : 0);              // bay theo tiep tuyen vong tron
        for (const m of members) { const flap = Math.sin(time * 5.5 + m.phase) * 0.55; m.left.rotation.z = -flap; m.right.rotation.z = flap; }
      }
    },
  };
}
