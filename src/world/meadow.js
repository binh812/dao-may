import * as THREE from 'three';
import { MATS, patchBacklight, toon } from './materials.js';
import { U } from '../core/stage.js';
import { Q } from '../core/quality.js';
import { Builder, C, TRS, _e, _p, _q, _s, fbm, lerp, rnd, smooth } from '../core/util.js';
import { HOUSE, MILL, R, WATER_Y, height, inCrag, pathDist, terrace } from './layout.js';
import { world } from './island.js';

// ---------------------------------------------------------------- grass
let grass;
{
  const bg = new THREE.PlaneGeometry(1, 1, 1, 4); bg.translate(0, 0.5, 0);
  const bp = bg.attributes.position;
  for (let i = 0; i < bp.count; i++) { const y = bp.getY(i); bp.setX(i, bp.getX(i) * (1 - Math.pow(y, 1.7)) * 0.095); bp.setZ(i, y * y * 0.22); }
  const mat = toon({ side: THREE.DoubleSide, vertexColors: false });
  mat.userData.patch = (s) => {
    s.uniforms.uTime = U.time; s.uniforms.uPlayer = U.player; s.uniforms.uWindT = U.windT; s.uniforms.uWind = U.wind;
    s.vertexShader = s.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime, uWindT, uWind; uniform vec3 uPlayer; varying float vH;')
      .replace('#include <beginnormal_vertex>', 'vec3 objectNormal = normalize(vec3(normal.x * 0.3, 1.0, normal.z * 0.3));')
      .replace('#include <project_vertex>', `
        vH = uv.y;
        vec4 wp = modelMatrix * instanceMatrix * vec4(transformed, 1.0);
        vec3 root = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
        float g = sin(root.x * 0.22 + root.z * 0.17 + uWindT * 1.3) * 0.6 + sin(root.x * 0.07 - root.z * 0.11 + uWindT * 0.6) * 0.8 + sin(root.x * 1.3 + root.z * 1.7 + uWindT * 3.1) * 0.14;
        float ws = min(uWind, 2.4);
        float bend = vH * vH;
        wp.x += (g * 0.2 + 0.08 + (ws - 1.) * 0.12) * bend * ws; wp.z += g * 0.11 * bend * ws; wp.y -= (abs(g) * 0.045 + max(ws - 1., 0.) * 0.06) * bend * ws;
        vec2 dp = root.xz - uPlayer.xz;
        float push = smoothstep(1.25, 0.15, length(dp)) * bend;
        wp.xz += normalize(dp + 1e-4) * push * 0.5; wp.y -= push * 0.28;
        vec4 mvPosition = viewMatrix * wp;
        gl_Position = projectionMatrix * mvPosition;`);
    s.fragmentShader = s.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vH;')
      .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb *= mix(0.5, 1.0, vH);')
      .replace('#include <normal_fragment_begin>', '#include <normal_fragment_begin>\nnormal = normalize(vNormal);')
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(0.9, 0.5, vH);');
    patchBacklight(s, 0.3);
    s.fragmentShader = s.fragmentShader.replace('pow(max(dot(normalize(-vViewPosition), uSunView), 0.0), 3.0);', 'pow(max(dot(normalize(-vViewPosition), uSunView), 0.0), 3.0) * vH;');
  };
  grass = new THREE.InstancedMesh(bg, mat, Q.grass);
  const m = new THREE.Matrix4(), c = new THREE.Color(), c1 = C(0x44ad48), c2 = C(0x84cc48), c3 = C(0x1e9a72), c4 = C(0xe6dc5a);
  const ch = Math.cos(-HOUSE.ry), shh = Math.sin(-HOUSE.ry);
  let n = 0, guard = 0;
  while (n < Q.grass && guard++ < Q.grass * 6) {
    const a = rnd() * 6.283, r = Math.sqrt(rnd()) * (R - 0.35), x = Math.cos(a) * r, z = Math.sin(a) * r;
    const pd = pathDist(x, z); if (pd < 0.5) continue;
    const y = height(x, z); if (y < WATER_Y + 0.08) continue;
    const hx = x - HOUSE.x, hz = z - HOUSE.z, lx = hx * ch + hz * shh, lz = -hx * shh + hz * ch;
    if (Math.abs(lx) < 1.95 && lz > -1.75 && lz < 2.2) continue;
    if (Math.hypot(x - MILL.x, z - MILL.z) < 1.25 || inCrag(x, z)) continue;
    const tr = terrace(x, z); if (tr.wall > 0.3) continue;
    const patch = fbm(x * .16 + 30, z * .16, 3) + .5, tall = (0.34 + 0.55 * smooth(0.25, 0.8, patch)) * lerp(0.55, 1, smooth(0.5, 2.6, pd)) * (0.75 + rnd() * 0.5) * lerp(1, 0.6, smooth(R - 1.5, R - 0.3, r)) * (tr.flat ? 0.5 : 1);
    m.compose(_p.set(x, y - 0.02, z), _q.setFromEuler(_e.set((rnd() - .5) * 0.25, rnd() * 6.283, 0)), _s.set(0.8 + rnd() * 0.7, tall, 1));
    grass.setMatrixAt(n, m);
    c.copy(c1).lerp(c2, smooth(0.3, 0.8, patch)).lerp(c3, smooth(0.5, 0.1, patch) * 0.7).lerp(c4, rnd() < 0.04 ? 0.6 : 0).multiplyScalar(0.85 + rnd() * 0.3);
    grass.setColorAt(n, c); n++;
  }
  grass.count = n; grass.instanceMatrix.needsUpdate = true; grass.instanceColor.needsUpdate = true;
  grass.receiveShadow = true; grass.frustumCulled = false; world.add(grass);
}

// ---------------------------------------------------------------- flowers
{
  const colors = [0xffffff, 0xffd84d, 0xff8fb8, 0xb692ff, 0xff7a59];
  const FLOWERS_PER_COLOR = 70;
  colors.forEach((hex, ci) => {
    const FB = new Builder();
    FB.add('clay', new THREE.CylinderGeometry(0.012, 0.016, 0.42, 5), TRS(0, 0.21, 0), 0x4c9a3f, { ao: false });
    for (let k = 0; k < 6; k++) FB.add('clay', new THREE.SphereGeometry(0.05, 8, 6), TRS(Math.cos(k * 1.047) * 0.065, 0.43, Math.sin(k * 1.047) * 0.065, 0, -k * 1.047, 0, 1.2, 0.3, 0.75), hex, { ao: false });
    FB.add('clay', new THREE.SphereGeometry(0.04, 8, 6), TRS(0, 0.445, 0, 0, 0, 0, 1, 0.7, 1), ci === 1 ? 0xff9a3d : 0xffd23f, { ao: false });
    const holder = new THREE.Group(); FB.build(holder, MATS);
    const geo = holder.children[0].geometry, count = FLOWERS_PER_COLOR, inst = new THREE.InstancedMesh(geo, MATS.clay, count), m = new THREE.Matrix4();
    let n = 0, guard = 0;
    while (n < count && guard++ < 4000) {
      const a = rnd() * 6.283, r = Math.sqrt(rnd()) * (R - 1), x = Math.cos(a) * r, z = Math.sin(a) * r, pd = pathDist(x, z), y = height(x, z);
      const nearPath = pd > 0.6 && pd < 2.4, meadow = fbm(x * .3 + ci * 11, z * .3, 2) > 0.12;
      if (!(nearPath || meadow) || y < WATER_Y + 0.15 || Math.hypot(x - HOUSE.x, z - HOUSE.z) < 2.6 || pd < 0.6 || inCrag(x, z) || Math.hypot(x - MILL.x, z - MILL.z) < 5.5) continue;
      m.compose(_p.set(x, y, z), _q.setFromEuler(_e.set((rnd() - .5) * 0.3, rnd() * 6.283, (rnd() - .5) * 0.3)), _s.setScalar(0.9 + rnd() * 0.7));
      inst.setMatrixAt(n++, m);
    }
    inst.count = n; inst.castShadow = true; inst.receiveShadow = true; world.add(inst);
  });
}

// ---------------------------------------------------------------- terrace flower fields
{
  const cols = [C(0xff8a1f), C(0xffd426), C(0xff5b2e), C(0xff9ec4)], m = new THREE.Matrix4(), c = new THREE.Color();
  const field = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.085, 0), toon({ vertexColors: false }), Q.field);
  let n = 0, guard = 0;
  while (n < Q.field && guard++ < Q.field * 8) {
    const a = rnd() * 6.283, d = 1.6 + Math.sqrt(rnd()) * 3.7, x = MILL.x + Math.cos(a) * d, z = MILL.z + Math.sin(a) * d, t = terrace(x, z);
    if (!t.flat || t.level > 3 || Math.hypot(x, z) > R - 0.9) continue;
    m.compose(_p.set(x, height(x, z) + 0.26 + rnd() * 0.14, z), _q.setFromEuler(_e.set(rnd() * 3, rnd() * 3, 0)), _s.set(1, 0.7, 1).multiplyScalar(0.8 + rnd() * 0.6));
    field.setMatrixAt(n, m); field.setColorAt(n, c.copy(cols[t.level % 4]).multiplyScalar(0.85 + rnd() * 0.3)); n++;
  }
  field.count = n; field.instanceMatrix.needsUpdate = true; if (field.instanceColor) field.instanceColor.needsUpdate = true;
  field.receiveShadow = true; world.add(field);
}


export { grass };
