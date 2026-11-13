// Ho nuoc canh lang: mat nuoc ve theo mang mau (nong xanh ngoc, sau xanh lam), vien bot trang o bo, gon song la net sang;
// la sung noi tren mat ho va mot dan vit boi vong quanh.
import * as THREE from 'three';
import { U } from '../core/stage.js';
import { toon } from '../world/materials.js';
import { TRS, rnd } from '../core/util.js';
import { LAKE, LAKE_LEVEL, lakeShape, surfaceAt } from './terrain.js';

const WATER_CELLS = 72, WATER_SPAN = LAKE.r * 2.7;       // luoi mat nuoc: so o va be rong (m)
const SHORE_LIMIT = 1.12;                                 // mat nuoc chi ton tai trong hinh ho (lakeShape) nho hon muc nay
const LILY_PADS = 46, LILY_DEPTH = 0.45;                 // la sung chi moc cho nuoc sau hon muc nay
const DUCKS = 6, DUCK_ORBIT = [0.32, 0.6], DUCK_SPEED = 0.16;

function waterSurface() {
  const g = new THREE.PlaneGeometry(WATER_SPAN, WATER_SPAN, WATER_CELLS, WATER_CELLS).rotateX(-Math.PI / 2), p = g.attributes.position;
  const depth = new Float32Array(p.count);
  // do sau lay tu chinh luoi dia hinh de vien bot trung voi cho nuoc cham dat tren man hinh
  // ngoai bo ho thi khong co nuoc, du cho do dat co thap hon mat ho (long thung lung phia lang)
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i) + LAKE.x, z = p.getZ(i) + LAKE.z;
    depth[i] = lakeShape(x, z) < SHORE_LIMIT ? LAKE_LEVEL - surfaceAt(x, z) : -1;
  }
  g.setAttribute('aDepth', new THREE.BufferAttribute(depth, 1));
  const mesh = new THREE.Mesh(g, new THREE.ShaderMaterial({
    fog: true, uniforms: { ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog), uTime: U.time, uDim: U.dim, uWind: U.wind },
    vertexShader: /* glsl */`
      #include <common>
      #include <fog_pars_vertex>
      attribute float aDepth; varying float vDepth; varying vec2 vWater;
      void main(){
        vDepth = aDepth; vec4 world = modelMatrix * vec4(position, 1.); vWater = world.xz;
        vec4 mvPosition = viewMatrix * world;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: /* glsl */`
      #include <common>
      #include <fog_pars_fragment>
      uniform float uTime, uDim, uWind; varying float vDepth; varying vec2 vWater;
      float wHash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
      float wNoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
        return mix(mix(wHash(i), wHash(i + vec2(1, 0)), f.x), mix(wHash(i + vec2(0, 1)), wHash(i + vec2(1, 1)), f.x), f.y); }
      void main(){
        if (vDepth < 0.) discard;
        float t = uTime * (0.6 + 0.2 * min(uWind, 2.5));
        // mau viet theo sRGB roi doi sang tuyen tinh
        vec3 col = mix(vec3(0.47, 0.86, 0.84), vec3(0.20, 0.55, 0.80), smoothstep(0.1, 1.9, vDepth));
        col = mix(col, vec3(0.13, 0.42, 0.72), smoothstep(1.9, 3.2, vDepth));
        float sky = wNoise(vWater * 0.07 + vec2(t * 0.02, 0.));
        col = mix(col, vec3(0.80, 0.90, 0.98), smoothstep(0.52, 0.60, sky) * 0.35);                     // bong may loang tren mat ho
        float wave = wNoise(vec2(vWater.x * 0.55 + t * 0.35, vWater.y * 2.4)) + 0.5 * wNoise(vec2(vWater.x * 1.3 - t * 0.2, vWater.y * 5.0));
        col = mix(col, vec3(0.93, 0.98, 1.0), smoothstep(1.02, 1.06, wave) * 0.55);                     // gon song: net sang manh
        float lap = 0.26 + 0.12 * sin(t * 1.6 + wNoise(vWater * 0.5) * 6.2831);
        col = mix(col, vec3(1.0), smoothstep(lap, lap - 0.07, vDepth) * 0.92);                          // bot trang vo vao bo
        gl_FragColor = vec4(pow(col, vec3(2.2)) * uDim, 1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }`,
  }));
  mesh.position.set(LAKE.x, LAKE_LEVEL, LAKE.z); mesh.frustumCulled = false;
  return mesh;
}

function lilyPads(B) {
  for (let placed = 0, guard = 0; placed < LILY_PADS && guard < LILY_PADS * 40; guard++) {
    const a = rnd() * Math.PI * 2, r = LAKE.r * (0.35 + rnd() * 0.6), x = LAKE.x + Math.cos(a) * r, z = LAKE.z + Math.sin(a) * r;
    if (lakeShape(x, z) > 0.92 || LAKE_LEVEL - surfaceAt(x, z) < LILY_DEPTH) continue;
    const size = 0.45 + rnd() * 0.5;
    B.add('clay', new THREE.CylinderGeometry(size, size, 0.04, 9, 1, false, 0.5, Math.PI * 1.75), TRS(x, LAKE_LEVEL + 0.03, z, 0, rnd() * 6.283, 0), rnd() < 0.5 ? 0x3f9d4a : 0x57b356);
    if (rnd() < 0.3) B.add('clay', new THREE.IcosahedronGeometry(0.16, 0), TRS(x, LAKE_LEVEL + 0.16, z, 0, rnd() * 6, 0, 1, 0.8, 1), rnd() < 0.5 ? 0xff9fc2 : 0xfff3f7);
    placed++;
  }
}

function ducks(scene) {
  const white = toon({ vertexColors: false, color: 0xfffbf0 }), beak = toon({ vertexColors: false, color: 0xf2952e });
  const body = new THREE.IcosahedronGeometry(0.3, 1), head = new THREE.IcosahedronGeometry(0.17, 1), bill = new THREE.ConeGeometry(0.07, 0.2, 5).rotateZ(-Math.PI / 2);
  const flock = [];
  for (let i = 0; i < DUCKS; i++) {
    const duck = new THREE.Group(), b = new THREE.Mesh(body, white), h = new THREE.Mesh(head, white), k = new THREE.Mesh(bill, beak);
    b.scale.set(1.35, 0.8, 0.95); h.position.set(0.3, 0.3, 0); k.position.set(0.5, 0.28, 0);
    duck.add(b, h, k); scene.add(duck);
    // ba con dau boi thanh hang, cac con sau boi le
    flock.push({ duck, orbit: LAKE.r * (i < 3 ? DUCK_ORBIT[0] : DUCK_ORBIT[0] + (DUCK_ORBIT[1] - DUCK_ORBIT[0]) * ((i - 2) / (DUCKS - 3))), phase: i < 3 ? i * 0.09 : i * 1.7, turn: i < 3 || i % 2 ? 1 : -1 });
  }
  return flock;
}

/** Dung ho; tra ve vat can (khong co) va ham cap nhat. */
export function createLake(scene, B) {
  scene.add(waterSurface());
  lilyPads(B);
  const flock = ducks(scene);
  return {
    colliders: [],
    update(time) {
      for (const { duck, orbit, phase, turn } of flock) {
        const angle = phase + time * DUCK_SPEED * turn * (LAKE.r * DUCK_ORBIT[0] / orbit);
        duck.position.set(LAKE.x + Math.cos(angle) * orbit, LAKE_LEVEL + 0.1 + Math.sin(time * 2.2 + phase * 5) * 0.025, LAKE.z + Math.sin(angle) * orbit);
        duck.rotation.y = -angle - turn * Math.PI / 2;                          // quay dau theo huong boi
      }
    },
  };
}
