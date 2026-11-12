// Phong thu do hoa: canh mau "dien anh thu nho". Ban thu, bo di duoc.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { ImprovedNoise } from 'three/addons/math/ImprovedNoise.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';

// ---------------------------------------------------------------- quality
const qs = new URLSearchParams(location.search);
const isMobile = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
const TIERS = {
  low:    { label: 'Thấp',  dpr: 1.0, msaa: 0, shadow: 1024, grass: 16000,  aoTaps: 0,  dofTaps: 0,  blobDetail: 3, leaves: 55,  field: 1500, volSteps: 0,  rain: 1500 },
  medium: { label: 'Vừa',   dpr: 1.5, msaa: 0, shadow: 2048, grass: 42000,  aoTaps: 8,  dofTaps: 10, blobDetail: 3, leaves: 90,  field: 3500, volSteps: 8,  rain: 3500 },
  high:   { label: 'Cao',   dpr: 2.0, msaa: 4, shadow: 2048, grass: 110000, aoTaps: 14, dofTaps: 20, blobDetail: 4, leaves: 150, field: 7000, volSteps: 12, rain: 7000 },
};
const tierName = TIERS[qs.get('q')] ? qs.get('q') : (isMobile ? 'medium' : 'high');
const Q = TIERS[tierName];

// ---------------------------------------------------------------- helpers
function mulberry32(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const rnd = mulberry32(20261112);
const noise = new ImprovedNoise();
const clamp = THREE.MathUtils.clamp, lerp = THREE.MathUtils.lerp;
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const fbm = (x, z, o = 4) => { let a = 0, amp = .5, f = 1; for (let i = 0; i < o; i++) { a += amp * noise.noise(x * f, z * f, 7.3); amp *= .5; f *= 2; } return a; };
const _p = new THREE.Vector3(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _e = new THREE.Euler();
function TRS(px, py, pz, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) {
  return new THREE.Matrix4().compose(_p.set(px, py, pz), _q.setFromEuler(_e.set(rx, ry, rz)), _s.set(sx, sy, sz));
}
const C = (hex) => new THREE.Color(hex);

class Builder {
  constructor() { this.b = new Map(); }
  add(key, geo, m, color, opt = {}) {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    for (const n of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(n)) g.deleteAttribute(n);
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    g.applyMatrix4(m);
    const pos = g.attributes.position, nor = g.attributes.normal, n = pos.count, col = new Float32Array(n * 3);
    const c = new THREE.Color(), base = typeof color === 'function' ? null : new THREE.Color(color), k = opt.gain ?? 1;
    for (let i = 0; i < n; i++) {
      if (base) c.copy(base); else color(c, pos.getX(i), pos.getY(i), pos.getZ(i), nor.getX(i), nor.getY(i), nor.getZ(i));
      const ao = opt.ao === false ? 1 : 0.72 + 0.28 * (nor.getY(i) * 0.5 + 0.5);
      col[i * 3] = c.r * ao * k; col[i * 3 + 1] = c.g * ao * k; col[i * 3 + 2] = c.b * ao * k;
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    if (!this.b.has(key)) this.b.set(key, []);
    this.b.get(key).push(g);
  }
  build(parent, mats, { cast = true, receive = true } = {}) {
    for (const [k, list] of this.b) {
      const geo = mergeGeometries(list, false);
      list.forEach(g => g.dispose());
      const mesh = new THREE.Mesh(geo, mats[k]);
      mesh.castShadow = cast && k !== 'glow' && k !== 'cloud';
      mesh.receiveShadow = receive && k !== 'glow' && k !== 'cloud';
      parent.add(mesh);
    }
    this.b.clear();
  }
}
function blob(radius, detail, amp, freq, seed) {
  const g = new THREE.IcosahedronGeometry(radius, detail), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const k = 1 + amp * noise.noise(x * freq + seed, y * freq + seed * 1.7, z * freq - seed);
    p.setXYZ(i, x * k, y * k, z * k);
  }
  return g;
}

// ---------------------------------------------------------------- world layout
const R = 14, WATER_Y = -0.38;
const POND = { x: 5.2, z: 3.2, r: 3.3 };
const HOUSE = { x: -5, z: -3.5, ry: 0.45 };
const MILL = { x: 6, z: -6 };
const CRAGS = [[10.6, 1.6, 3.1, 7.6], [11.8, 5.2, 2.5, 5.4], [9.9, -2.0, 2.3, 4.4], [12.2, -0.8, 2.7, 9.2], [-6.5, -10.6, 3.0, 8.0], [-2.9, -11.6, 2.6, 6.0], [-9.6, -8.6, 2.4, 5.0], [-4.6, -12.2, 2.9, 10.5]];
const inCrag = (x, z) => CRAGS.some(c => Math.hypot(x - c[0], z - c[1]) < c[2] * 0.95) || streamInfo(x, z).d < 0.85;
const TERRACE_STEP = 0.8;
function terrace(x, z) {
  const d = Math.hypot(x - MILL.x, z - MILL.z), b = 3.2 * smooth(5.4, 1.3, d), v = b / TERRACE_STEP, lv = Math.floor(v), ramp = smooth(0.7, 1.0, v - lv);
  return { h: (lv + ramp) * TERRACE_STEP, wall: clamp(ramp * (1 - ramp) * 4, 0, 1), level: lv, flat: ramp < 0.02 && d < 5.3 };
}
const PATH = [[HOUSE.x + Math.sin(HOUSE.ry) * 2.0, HOUSE.z + Math.cos(HOUSE.ry) * 2.0], [-2.6, 1.2], [-0.4, 2.6], [1.5, 2.7]];
const STREAM = [[5.9, 5.4], [5.7, 8.0], [4.8, 10.4], [4.3, 12.2], [4.2, 13.2]];
const STREAM_LEN = STREAM.slice(1).reduce((a, p, i) => a + Math.hypot(p[0] - STREAM[i][0], p[1] - STREAM[i][1]), 0);
function streamInfo(x, z) {
  let best = 1e9, bt = 0, acc = 0;
  for (let i = 0; i < STREAM.length - 1; i++) {
    const [ax, az] = STREAM[i], [bx, bz] = STREAM[i + 1], dx = bx - ax, dz = bz - az, len = Math.hypot(dx, dz);
    const t = clamp(((x - ax) * dx + (z - az) * dz) / (len * len), 0, 1), d = Math.hypot(x - ax - dx * t, z - az - dz * t);
    if (d < best) { best = d; bt = (acc + t * len) / STREAM_LEN; }
    acc += len;
  }
  return { d: best, t: bt };
}
const streamBed = (t) => WATER_Y - 0.28 - t * 0.9;
function pathDist(x, z) {
  let best = 1e9;
  for (let i = 0; i < PATH.length - 1; i++) {
    const [ax, az] = PATH[i], [bx, bz] = PATH[i + 1], dx = bx - ax, dz = bz - az;
    const t = clamp(((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz), 0, 1);
    best = Math.min(best, Math.hypot(x - ax - dx * t, z - az - dz * t));
  }
  return best;
}
function height(x, z) {
  const r = Math.hypot(x, z);
  let h = fbm(x * .09, z * .09) * 2.4 + 0.25 * fbm(x * .3 + 9, z * .3);
  h = lerp(h, 0.35, smooth(6, 2.6, Math.hypot(x - HOUSE.x, z - HOUSE.z)));
  h = lerp(h, 0.3, smooth(6.6, 5.0, Math.hypot(x - MILL.x, z - MILL.z))) + terrace(x, z).h;
  const dp = Math.hypot(x - POND.x, z - POND.z);
  h = lerp(h, 0.05, smooth(POND.r + 3.2, POND.r + 0.2, dp));
  h -= smooth(POND.r + 1.2, POND.r - 1.4, dp) * 1.35;
  const si = streamInfo(x, z); h = lerp(h, streamBed(si.t), smooth(1.35, 0.4, si.d));
  const e = smooth(R - 2.6, R, r);
  h -= e * e * 1.3;
  return h;
}

// ---------------------------------------------------------------- renderer / scene
const canvas = document.createElement('canvas');
document.body.prepend(canvas);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', stencil: false });
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.info.autoReset = false;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(38, 1, 0.5, 260);
camera.position.set(-15, 9.5, 20);
if (qs.get('cam')) camera.position.fromArray(qs.get('cam').split(',').map(Number));
const controls = new OrbitControls(camera, canvas);
controls.target.set(0.5, 2.2, 0);
controls.enableDamping = true; controls.dampingFactor = 0.06;
controls.minDistance = 7; controls.maxDistance = 36;
controls.minPolarAngle = 0.35; controls.maxPolarAngle = 1.5;
controls.enablePan = false; controls.autoRotate = true; controls.autoRotateSpeed = 0.35;

const SUN_DIR = new THREE.Vector3(-0.78, 0.50, 0.30).normalize();
const SKY = { zenith: new THREE.Color(0.07, 0.30, 0.80), horizon: new THREE.Color(0.52, 0.80, 0.98), below: new THREE.Color(0.66, 0.88, 0.96), sun: new THREE.Color(1.0, 0.95, 0.84) };
const U = { wind: { value: 1 }, windT: { value: 0 }, night: { value: 0 }, snow: { value: 0 }, gust: { value: 0 }, flash: { value: 0 }, dim: { value: 1 }, overcast: { value: 0 }, rain: { value: 0 }, time: { value: 0 }, player: { value: new THREE.Vector3() }, sunView: { value: new THREE.Vector3() } };

scene.fog = new THREE.FogExp2(new THREE.Color(0.60, 0.82, 0.97), 0.0055);

const sun = new THREE.DirectionalLight(new THREE.Color(1.0, 0.94, 0.82), 1.75);
sun.position.copy(SUN_DIR).multiplyScalar(45);
sun.castShadow = true;
sun.shadow.mapSize.set(Q.shadow, Q.shadow);
Object.assign(sun.shadow.camera, { left: -17, right: 17, top: 17, bottom: -17, near: 5, far: 95 });
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.045;
scene.add(sun, sun.target);
const flatAmbient = new THREE.AmbientLight(0xffffff, 1.3); flatAmbient.visible = false; scene.add(flatAmbient);
const lanternLight = new THREE.PointLight(0xffa850, 3, 9, 1.6);
const hemi = new THREE.HemisphereLight(new THREE.Color(0.52, 0.76, 1.0), new THREE.Color(0.34, 0.58, 0.56), 1.45); scene.add(hemi);

// ---------------------------------------------------------------- sky
const SKY_GLSL = /* glsl */`
  uniform vec3 uZenith, uHorizon, uBelow, uSunColor, uSunDir; uniform float uTime, uDisc, uOvercast, uNight, uFlash;
  varying vec3 vDir;
  float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
  float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f);
    return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y); }
  float fbm(vec2 p){ float a = .5, s = 0.; for (int i = 0; i < 5; i++){ s += a * vnoise(p); p = p * 2.03 + 17.; a *= .5; } return s; }
  void main(){
    vec3 d = normalize(vDir); float h = d.y;
    vec3 col = mix(uHorizon, uZenith, pow(smoothstep(0., 0.75, max(h, 0.)), 0.42));
    col = mix(col, uBelow, smoothstep(0.02, -0.45, h));
    vec3 ncol = mix(vec3(0.05, 0.09, 0.20), vec3(0.008, 0.015, 0.06), pow(max(h, 0.), 0.5));
    ncol = mix(ncol, vec3(0.04, 0.07, 0.15), smoothstep(0.02, -0.45, h));
    vec2 sg = d.xz / (abs(h) + 0.35) * 70.; float st = hash(floor(sg));
    ncol += step(0.985, st) * smoothstep(0.5, 0.1, length(fract(sg) - .5)) * (0.6 + 0.4 * sin(uTime * 2. + st * 40.)) * vec3(0.9, 0.95, 1.0) * 1.7 * step(0., h);
    col = mix(col, ncol, uNight);
    float sd = max(dot(d, uSunDir), 0.);
    col += mix(uSunColor, vec3(0.55, 0.70, 1.0) * 0.6, uNight) * (pow(sd, 12.) * 0.08 + pow(sd, 200.) * 0.35);
    col += uSunColor * smoothstep(0.9990, 0.9996, sd) * uDisc * 28. * (1. - uNight);
    col += uNight * uDisc * vec3(0.95, 0.97, 1.0) * smoothstep(0.9970, 0.9976, sd) * 1.7;
    vec2 uv = d.xz / (abs(h) + 0.22) * 1.1 + vec2(uTime * 0.006, 0.);
    float c = fbm(uv * 0.9), c2 = fbm(uv * 0.9 + uSunDir.xz * 0.22);
    float cover = smoothstep(0.50, 0.55, c) * smoothstep(-0.02, 0.10, h);
    vec3 cloud = mix(vec3(1.0), vec3(0.60, 0.76, 0.97), smoothstep(0.0, 0.05, c - c2 + 0.035));
    
    cloud *= mix(1., 0.16, uNight);
    col = mix(col, cloud, cover);
    vec3 grey = vec3(0.50, 0.56, 0.63) * (0.8 + 0.25 * c) * (1. - 2.0 * max(uOvercast - 1., 0.)) * mix(1., 0.2, uNight);
    col = mix(col, grey, min(uOvercast, 1.) * 0.92);
    col += uFlash * vec3(0.55, 0.60, 0.78);
    gl_FragColor = vec4(col, 1.);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`;
function skyMaterial(disc) {
  return new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { uZenith: { value: SKY.zenith }, uHorizon: { value: SKY.horizon }, uBelow: { value: SKY.below }, uSunColor: { value: SKY.sun }, uSunDir: { value: SUN_DIR }, uTime: U.time, uDisc: { value: disc }, uOvercast: U.overcast, uNight: U.night, uFlash: U.flash },
    vertexShader: `varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); gl_Position.z = gl_Position.w; }`,
    fragmentShader: SKY_GLSL,
  });
}
const sky = new THREE.Mesh(new THREE.SphereGeometry(60, 32, 16), skyMaterial(1));
sky.renderOrder = -10; sky.frustumCulled = false; scene.add(sky);
{
  const envScene = new THREE.Scene();
  envScene.add(new THREE.Mesh(new THREE.SphereGeometry(10, 32, 16), skyMaterial(0)));
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(envScene, 0, 0.1, 50).texture;
  scene.environmentIntensity = 0.4;
  pmrem.dispose();
}

// ---------------------------------------------------------------- materials
function patchBacklight(shader, amount) {
  shader.uniforms.uSunView = U.sunView;
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <common>', '#include <common>\nuniform vec3 uSunView;')
    .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      totalEmissiveRadiance += diffuseColor.rgb * ${amount.toFixed(2)} * pow(max(dot(normalize(-vViewPosition), uSunView), 0.0), 3.0);`);
}
const RAMP = (() => {
  const d = new Uint8Array([96, 96, 96, 96, 96, 96, 96, 100, 150, 205, 235, 250, 255, 255, 255, 255]);
  const t = new THREE.DataTexture(d, 16, 1, THREE.RedFormat, THREE.UnsignedByteType); t.minFilter = t.magFilter = THREE.LinearFilter; t.needsUpdate = true; return t;
})();
let toonId = 0;
function patchSnow(sh) {
  sh.uniforms.uSnow = U.snow;
  sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying float vSnowN;')
    .replace('#include <defaultnormal_vertex>', '#include <defaultnormal_vertex>\nvSnowN = normalize(mat3(modelMatrix) * objectNormal).y;');
  sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vSnowN; uniform float uSnow;')
    .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.90, 0.95, 1.0), uSnow * smoothstep(0.30, 0.72, vSnowN));');
}
const toon = (o = {}) => {
  const m = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: RAMP, ...o }), id = 'toon' + (toonId++);
  m.onBeforeCompile = (sh) => { if (m.userData.patch) m.userData.patch(sh); patchSnow(sh); };
  m.customProgramCacheKey = () => id;
  return m;
};
const MATS = {
  clay: toon(), gloss: toon(), foliage: toon(),
  metal: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.28, metalness: 1 }),
  glow: new THREE.MeshBasicMaterial({ vertexColors: true }),
  cloud: toon({ emissive: 0xbfd8ff, emissiveIntensity: 0.25, fog: false }),
};
MATS.foliage.userData.patch = (s) => {
  s.uniforms.uTime = U.time; s.uniforms.uWind = U.wind;
  s.vertexShader = s.vertexShader
    .replace('#include <common>', '#include <common>\nuniform float uTime, uWind;')
    .replace('#include <begin_vertex>', `#include <begin_vertex>
      transformed += vec3(sin(uTime * 1.3 + position.y * 1.4 + position.x * 0.8), sin(uTime * 1.7 + position.x * 1.1) * 0.4, cos(uTime * 1.1 + position.z * 1.2 + position.y)) * 0.045 * uWind;`);
  patchBacklight(s, 0.10);
};

// ---------------------------------------------------------------- island
const world = new THREE.Group(); scene.add(world);
const B = new Builder();
{
  const NR = 60, NU = 26, NS = 144, rows = NR + NU + 1;
  const pos = new Float32Array(rows * NS * 3), col = new Float32Array(rows * NS * 3), idx = [];
  const cGrassA = C(0x2a8a46), cGrassB = C(0x48a544), cSand = C(0xf2dfae), cBed = C(0x3fa9a0), cSoil = C(0x8ea3c6), cRockA = C(0x7f93b8), cRockB = C(0x596d96), cRockC = C(0xb4c2dc), cWall = C(0xb8c2d6), c = new THREE.Color();
  for (let i = 0; i < rows; i++) {
    for (let s = 0; s < NS; s++) {
      const ang = s / NS * Math.PI * 2, k = (i * NS + s) * 3;
      let x, y, z;
      if (i <= NR) {
        const r = R * Math.pow(i / NR, 0.9);
        x = Math.cos(ang) * r; z = Math.sin(ang) * r; y = height(x, z);
        c.copy(cGrassA).lerp(cGrassB, clamp(0.5 + fbm(x * .25, z * .25, 3), 0, 1));
        c.lerp(cSand, smooth(1.0, 0.35, pathDist(x, z)) * 0.95);
        c.lerp(cSand, smooth(WATER_Y + 0.35, WATER_Y + 0.05, y));
        c.lerp(cBed, smooth(WATER_Y - 0.1, WATER_Y - 0.9, y));
        c.lerp(cWall, terrace(x, z).wall);
        c.lerp(cSoil, smooth(R - 0.9, R - 0.15, r));
      } else {
        const t = (i - NR) / NU, lump = 1 + 0.16 * noise.noise(Math.cos(ang) * 2.2, t * 3.0, Math.sin(ang) * 2.2) + 0.05 * noise.noise(Math.cos(ang) * 7, t * 9, Math.sin(ang) * 7);
        const r = R * Math.pow(1 - t, 0.62) * lump * (1 - 0.02 * t) + (t < 0.12 ? 0.25 * Math.sin(t / 0.12 * Math.PI) : 0);
        x = Math.cos(ang) * r; z = Math.sin(ang) * r;
        y = height(Math.cos(ang) * R, Math.sin(ang) * R) - 0.25 - 11.5 * Math.pow(t, 0.85) * (1 + 0.18 * noise.noise(Math.cos(ang) * 1.5, 3.3, Math.sin(ang) * 1.5));
        const band = 0.5 + 0.5 * Math.sin(y * 2.4 + noise.noise(x * .4, y * .4, z * .4) * 3);
        c.copy(cRockA).lerp(cRockB, band).lerp(cRockC, clamp(noise.noise(x * .7, y * .7, z * .7) * 0.9, 0, 1));
        c.lerp(cSoil, smooth(0.14, 0.0, t)).multiplyScalar(lerp(1, 0.55, t));
      }
      pos[k] = x; pos[k + 1] = y; pos[k + 2] = z; col[k] = c.r; col[k + 1] = c.g; col[k + 2] = c.b;
    }
  }
  for (let i = 0; i < rows - 1; i++) for (let s = 0; s < NS; s++) {
    const a = i * NS + s, b = (i + 1) * NS + s, cc = i * NS + (s + 1) % NS, d = (i + 1) * NS + (s + 1) % NS;
    idx.push(a, cc, b, b, cc, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setIndex(idx); g.computeVertexNormals();
  const island = new THREE.Mesh(g, toon({ flatShading: true }));
  island.castShadow = true; island.receiveShadow = true; world.add(island);
}

// ---------------------------------------------------------------- house
{
  const y0 = height(HOUSE.x, HOUSE.z);
  const H = (...a) => TRS(HOUSE.x, y0, HOUSE.z, 0, HOUSE.ry, 0).multiply(TRS(...a));
  B.add('clay', new RoundedBoxGeometry(3.7, 0.4, 3.3, 4, 0.14), H(0, 0.08, 0), 0xb9aa9c);
  B.add('clay', new RoundedBoxGeometry(3.2, 2.2, 2.8, 8, 0.3), H(0, 1.3, 0), (c, x, y) => c.set(0xfff0d8).lerp(C(0xf3d2ae), smooth(y0 + 1.0, y0 + 0.2, y)));
  const sh = new THREE.Shape(); sh.moveTo(-2.15, 0); sh.quadraticCurveTo(-0.9, 0.55, 0, 1.75); sh.quadraticCurveTo(0.9, 0.55, 2.15, 0); sh.closePath();
  const roof = new THREE.ExtrudeGeometry(sh, { depth: 3.3, bevelEnabled: true, bevelSize: 0.14, bevelThickness: 0.14, bevelSegments: 5, curveSegments: 16 });
  B.add('gloss', roof, H(0, 2.32, -1.65), (c, x, y) => c.set(0xe9573f).lerp(C(0xff8a5c), smooth(y0 + 2.4, y0 + 4.2, y)));
  B.add('clay', new RoundedBoxGeometry(0.55, 1.2, 0.55, 4, 0.1), H(0.95, 3.5, -0.5), 0xc9785e);
  B.add('clay', new RoundedBoxGeometry(0.72, 0.16, 0.72, 3, 0.07), H(0.95, 4.12, -0.5), 0xf2e3d0);
  B.add('gloss', new RoundedBoxGeometry(0.86, 1.5, 0.14, 5, 0.07), H(0, 0.98, 1.4), 0x2fb3a6);
  B.add('clay', new RoundedBoxGeometry(1.06, 1.68, 0.1, 4, 0.05), H(0, 1.02, 1.37), 0xfffaf0);
  B.add('metal', new THREE.SphereGeometry(0.06, 16, 12), H(0.26, 0.95, 1.5), 0xffc94d);
  B.add('clay', new RoundedBoxGeometry(1.3, 0.16, 0.7, 3, 0.07), H(0, 0.3, 1.75), 0xcbbcae);
  for (const sx of [-1.05, 1.05]) {
    B.add('clay', new THREE.TorusGeometry(0.36, 0.075, 12, 32), H(sx, 1.55, 1.42), 0xfffaf0);
    B.add('glow', new THREE.CircleGeometry(0.34, 32), H(sx, 1.55, 1.425), C(0xffc56b), { ao: false, gain: 3.4 });
    B.add('clay', new RoundedBoxGeometry(0.05, 0.7, 0.04, 2, 0.015), H(sx, 1.55, 1.45), 0xfffaf0);
    B.add('clay', new RoundedBoxGeometry(0.7, 0.05, 0.04, 2, 0.015), H(sx, 1.55, 1.45), 0xfffaf0);
    B.add('clay', new RoundedBoxGeometry(0.8, 0.2, 0.26, 3, 0.07), H(sx, 1.02, 1.5), 0x9a6844);
    for (let i = 0; i < 5; i++) B.add('clay', blob(0.11, 2, 0.2, 6, i * 3.1), H(sx - 0.3 + i * 0.15, 1.2 + (i % 2) * 0.04, 1.52), [0xff7fa8, 0xffd15c, 0xff9f6b, 0xfff3f0, 0xc58cff][i]);
  }
  B.add('clay', new THREE.TorusGeometry(0.3, 0.065, 12, 28), H(1.615, 1.6, 0.1, 0, Math.PI / 2, 0), 0xfffaf0);
  B.add('glow', new THREE.CircleGeometry(0.28, 28), H(1.62, 1.6, 0.1, 0, Math.PI / 2, 0), C(0xffc56b), { ao: false, gain: 3.0 });
  // fence
  const posts = [];
  for (let a = -0.5; a <= 2.6; a += 0.21) {
    const x = HOUSE.x + Math.sin(HOUSE.ry + a - 1.0) * 5.0, z = HOUSE.z + Math.cos(HOUSE.ry + a - 1.0) * 4.4;
    posts.push(pathDist(x, z) < 1.0 ? null : [x, z]);
  }
  posts.forEach((p, i) => {
    if (!p) return;
    const y = height(p[0], p[1]);
    B.add('clay', new RoundedBoxGeometry(0.13, 0.78, 0.13, 3, 0.05), TRS(p[0], y + 0.36, p[1], 0, rnd() * 0.3, (rnd() - .5) * 0.08), 0xfff6ea);
    const n = posts[i + 1];
    if (n) for (const hh of [0.28, 0.56]) {
      const yn = height(n[0], n[1]), len = Math.hypot(n[0] - p[0], n[1] - p[1]);
      B.add('clay', new RoundedBoxGeometry(len + 0.1, 0.07, 0.05, 2, 0.02), TRS((p[0] + n[0]) / 2, (y + yn) / 2 + hh, (p[1] + n[1]) / 2, 0, -Math.atan2(n[1] - p[1], n[0] - p[0]), Math.atan2(yn - y, len)), 0xfff6ea);
    }
  });
}

// ---------------------------------------------------------------- lantern, path stones, dock
const lanternPos = new THREE.Vector3(-2.0, 0, 0.1); lanternPos.y = height(lanternPos.x, lanternPos.z);
{
  const { x, y, z } = lanternPos;
  B.add('clay', new THREE.CylinderGeometry(0.05, 0.08, 2.1, 10), TRS(x, y + 1.05, z), 0x4a3b45);
  B.add('clay', new RoundedBoxGeometry(0.5, 0.06, 0.06, 2, 0.02), TRS(x + 0.2, y + 2.08, z), 0x4a3b45);
  B.add('clay', new RoundedBoxGeometry(0.3, 0.08, 0.3, 3, 0.03), TRS(x + 0.4, y + 1.98, z), 0x4a3b45);
  B.add('glow', new RoundedBoxGeometry(0.22, 0.3, 0.22, 4, 0.08), TRS(x + 0.4, y + 1.8, z), C(0xffb657), { ao: false, gain: 5 });
  const pl = lanternLight; pl.position.set(x + 0.4, y + 1.75, z); scene.add(pl);
  for (let i = 0; i < PATH.length - 1; i++) {
    const [ax, az] = PATH[i], [bx, bz] = PATH[i + 1], len = Math.hypot(bx - ax, bz - az), n = Math.floor(len / 0.72);
    for (let k = 0; k < n; k++) {
      const t = (k + 0.5) / n, sx = lerp(ax, bx, t) + (rnd() - .5) * 0.22, sz = lerp(az, bz, t) + (rnd() - .5) * 0.22, r = 0.26 + rnd() * 0.12;
      B.add('clay', new THREE.CylinderGeometry(r, r * 1.08, 0.12, 14, 1), TRS(sx, height(sx, sz) + 0.03, sz, (rnd() - .5) * 0.08, rnd() * 6, (rnd() - .5) * 0.08, 1, 1, 0.8 + rnd() * 0.3), C(0xd9c9b4).multiplyScalar(0.9 + rnd() * 0.2));
    }
  }
  const dAng = Math.atan2(0.5, 2.6);
  for (let i = 0; i < 8; i++) {
    const t = i / 7, px = lerp(1.5, 4.1, t), pz = lerp(2.7, 3.2, t);
    B.add('clay', new RoundedBoxGeometry(0.3, 0.08, 1.15, 3, 0.03), TRS(px, WATER_Y + 0.3 + (rnd() - .5) * 0.02, pz, 0, -dAng + (rnd() - .5) * 0.06, 0), C(0xb98558).multiplyScalar(0.88 + rnd() * 0.25));
    if (i % 3 === 1) for (const s of [-0.55, 0.55]) B.add('clay', new THREE.CylinderGeometry(0.07, 0.08, 1.3, 10), TRS(px - Math.sin(dAng) * s, WATER_Y - 0.1, pz + Math.cos(dAng) * s), 0x8a5f3f);
  }
}

// ---------------------------------------------------------------- trees, rocks, mushrooms, bushes
const PAL = {
  green: [C(0x0c5f48), C(0x62bd47)], green2: [C(0x117052), C(0x8fcf4c)],
  blossom: [C(0xd9508f), C(0xffc9df)], autumn: [C(0xd2551f), C(0xffc23f)], pine: [C(0x0a5a5c), C(0x46d39a)],
};
const LEAF = { pos: [], nor: [], uv: [], col: [], leaf: [], idx: [] };
const _lc = new THREE.Color();
function leafBlob(cx, cy, cz, br, sy, pal, tint, count, size) {
  for (let i = 0; i < count; i++) {
    let dx = rnd() * 2 - 1, dy = rnd() * 2 - 1, dz = rnd() * 2 - 1; const l = Math.hypot(dx, dy, dz) || 1; dx /= l; dy /= l; dz /= l;
    if (dy < -0.4) dy = -dy * 0.5;
    const rr = br * (0.84 + rnd() * 0.24), px = cx + dx * rr, py = cy + dy * rr * sy, pz = cz + dz * rr;
    _lc.copy(pal[0]).lerp(pal[1], smooth(0.2, 0.95, dy * 0.5 + 0.5)).multiplyScalar(tint * (0.9 + rnd() * 0.2));
    const nl = Math.hypot(dx, dy + 0.35, dz), sz = size * (0.75 + rnd() * 0.5), rot = rnd() * 6.283, base = LEAF.pos.length / 3;
    for (const [u, v] of [[0, 0], [1, 0], [1, 1], [0, 1]]) {
      LEAF.pos.push(px, py, pz); LEAF.nor.push(dx / nl, (dy + 0.35) / nl, dz / nl); LEAF.uv.push(u, v); LEAF.col.push(_lc.r, _lc.g, _lc.b); LEAF.leaf.push(sz, rot);
    }
    LEAF.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
}
function crown(list, pal, s) {
  for (const [cx, cy, cz, br, sy] of list) {
    const tint = 0.9 + rnd() * 0.2;
    B.add('foliage', blob(br * 0.8, 2, 0.12, 1.5 / s, rnd() * 50), TRS(cx, cy, cz, 0, rnd() * 6, 0, 1, sy, 1), (c, px, py) => c.copy(pal[0]).lerp(pal[1], smooth(cy - br * sy, cy + br * sy, py) * 0.7).multiplyScalar(tint * 0.85), { ao: false });
    leafBlob(cx, cy, cz, br, sy, pal, tint, Math.round(Q.leaves * br * br * (0.5 + sy * 0.5)), 0.66 * Math.sqrt(br));
  }
}
const blossomCrowns = [];
function tree(x, z, s, palName, yBase) {
  const y = yBase ?? height(x, z), lean = (rnd() - .5) * 0.3, pal = PAL[palName], pine = palName === 'pine', th = (pine ? 4.4 : 2.5) * s;
  const tg = new THREE.CylinderGeometry(0.11 * s, 0.3 * s, th, 8, 8), tp = tg.attributes.position;
  for (let i = 0; i < tp.count; i++) { const yy = tp.getY(i) / th + 0.5; tp.setX(i, tp.getX(i) + Math.sin(yy * 2.2) * lean * s); }
  tg.computeVertexNormals();
  B.add('clay', tg, TRS(x, y + th * 0.46, z, 0, rnd() * 6.28, 0), (c, px, py) => c.set(pine ? 0x6b4a44 : 0x8b5a3a).multiplyScalar(0.62 + 0.5 * clamp((py - y) / (2 * s), 0, 1)));
  const list = [];
  if (pine) {
    for (let k = 0; k < 5; k++) { const a = k * 2.4 + rnd(), off = (k === 4 ? 0 : 0.45) * s; list.push([x + Math.cos(a) * off, y + (1.8 + k * 0.72) * s, z + Math.sin(a) * off, (1.5 - k * 0.24) * s, 0.4]); }
  } else {
    const n = 7 + (rnd() * 3 | 0);
    for (let k = 0; k < n; k++) {
      const a = k / n * 6.283 + rnd(), rr = k === 0 ? 0 : (0.75 + rnd() * 0.5) * s, br = (k === 0 ? 1.4 : 0.85 + rnd() * 0.45) * s;
      list.push([x + Math.cos(a) * rr, y + 2.75 * s + (k === 0 ? 0.6 * s : (rnd() - 0.3) * 0.75 * s), z + Math.sin(a) * rr, br, 0.86]);
    }
  }
  crown(list, pal, s);
  if (palName === 'blossom') blossomCrowns.push(new THREE.Vector3(x, y + 2.9 * s, z));
}
const TREES = [[-9.8, -4.4, 1.1, 'blossom'], [1.0, -8.6, 0.9, 'pine'], [8.0, 9.0, 1.05, 'blossom'], [-9.8, 8.0, 1.1, 'green2'], [-11.6, 1.6, 0.85, 'pine'], [1.4, 11.4, 0.7, 'pine'], [-1.2, -5.2, 0.95, 'green2']];
TREES.forEach(t => tree(...t));
const rockColor = (c, px, py, pz, nx, ny) => c.set(0x8ea3c6).lerp(C(0x6680ad), clamp(noise.noise(px * .6, py * .6, pz * .6) + .5, 0, 1)).lerp(C(0xc4d0e6), smooth(0.15, 0.6, ny) * 0.7).lerp(C(0x5cc04a), smooth(0.62, 0.8, ny));
function facet(detail, amp, freq, seed, shape) {
  const g = new THREE.IcosahedronGeometry(1, detail), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    if (shape) { const hz = Math.hypot(x, z) || 1e-4, k = Math.pow(hz, 0.45) / hz; x *= k; z *= k; y = clamp(y * 1.15, -1, 0.9); }
    const k = 1 + amp * noise.noise(x * freq + seed, y * freq + seed * 1.7, z * freq - seed);
    p.setXYZ(i, x * k, y, z * k);
  }
  g.computeVertexNormals(); return g;
}
function rock(x, y, z, r) { B.add('clay', facet(1, 0.3, 1.3, rnd() * 40), TRS(x, y, z, rnd() * 0.4, rnd() * 6, rnd() * 0.4, r, r * (0.6 + rnd() * 0.25), r * (0.8 + rnd() * 0.3)), rockColor); }
for (const [x, z, r, h] of CRAGS) {
  const y0 = height(x, z) - 0.8;
  B.add('clay', facet(2, 0.2, 1.5, rnd() * 60, true), TRS(x, y0 + h * 0.5, z, 0, rnd() * 6, 0, r, h * 0.55, r), rockColor);
  for (let k = 0; k < 3; k++) { const a = rnd() * 6.283, d = r * (0.95 + rnd() * 0.25), bx = x + Math.cos(a) * d, bz = z + Math.sin(a) * d; if (Math.hypot(bx, bz) < R - 0.6) rock(bx, height(bx, bz) + 0.3, bz, 0.5 + rnd() * 0.7); }
  if (h > 5) tree(x + (rnd() - .5) * r * 0.5, z + (rnd() - .5) * r * 0.5, 0.6 + rnd() * 0.2, rnd() < 0.7 ? 'pine' : 'green', y0 + h * 0.97);
}
for (let i = 0; i < 26; i++) {
  const a = rnd() * 6.283, r = i < 9 ? POND.r + 0.5 + rnd() * 0.9 : 3 + rnd() * 9.5;
  const x = (i < 9 ? POND.x : 0) + Math.cos(a) * r, z = (i < 9 ? POND.z : 0) + Math.sin(a) * r;
  if (pathDist(x, z) < 0.9 || Math.hypot(x - HOUSE.x, z - HOUSE.z) < 3.2 || Math.hypot(x, z) > R - 1 || (x > 1 && x < 4.6 && z > 2 && z < 4) || inCrag(x, z)) continue;
  const s = 0.18 + rnd() * rnd() * 0.6; rock(x, height(x, z) + s * 0.2, z, s);
}
for (let i = 0; i < 16; i++) {
  const t = TREES[i % TREES.length], a = rnd() * 6.283, d = 0.7 + rnd() * 1.4, x = t[0] + Math.cos(a) * d, z = t[1] + Math.sin(a) * d;
  if (Math.hypot(x, z) > R - 1.2) continue;
  const y = height(x, z), s = 0.5 + rnd() * 0.8, tilt = (rnd() - .5) * 0.3, capCol = rnd() < 0.7 ? 0xe5404a : 0xffa63d;
  B.add('clay', new THREE.CylinderGeometry(0.06 * s, 0.09 * s, 0.3 * s, 10), TRS(x, y + 0.13 * s, z, tilt, 0, tilt), 0xfff2de);
  B.add('gloss', new THREE.SphereGeometry(0.2 * s, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), TRS(x, y + 0.26 * s, z, tilt, 0, tilt, 1, 0.85, 1), capCol);
  for (let k = 0; k < 5; k++) { const da = k * 1.25 + rnd(), dr = 0.11 * s, dy = 0.14 * s; B.add('clay', new THREE.SphereGeometry(0.028 * s, 8, 6), TRS(x + Math.cos(da) * dr, y + 0.26 * s + dy, z + Math.sin(da) * dr), 0xffffff, { ao: false }); }
}
for (let i = 0; i < 12; i++) {
  const a = rnd() * 6.283, r = 4 + rnd() * 8.4, x = Math.cos(a) * r, z = Math.sin(a) * r;
  if (pathDist(x, z) < 1.3 || Math.hypot(x - HOUSE.x, z - HOUSE.z) < 3.4 || Math.hypot(x - POND.x, z - POND.z) < POND.r + 1.2 || Math.hypot(x - MILL.x, z - MILL.z) < 5.6 || inCrag(x, z)) continue;
  const y = height(x, z), s = 0.45 + rnd() * 0.4;
  for (let k = 0; k < 3; k++) {
    const bx = x + (rnd() - .5) * s * 1.3, bz = z + (rnd() - .5) * s * 1.3, cy = y + s * 0.5;
    crown([[bx, cy, bz, s * (0.7 + rnd() * 0.4), 0.8]], PAL.green, 1);
  }
  for (let k = 0; k < 6; k++) B.add('gloss', new THREE.SphereGeometry(0.05, 10, 8), TRS(x + (rnd() - .5) * s * 1.6, y + s * (0.5 + rnd() * 0.6), z + (rnd() - .5) * s * 1.6), 0xff4f6d);
}

// ---------------------------------------------------------------- windmill
const rotor = new THREE.Group();
{
  const y0 = height(MILL.x, MILL.z), ry = -0.75;
  B.add('clay', new THREE.CylinderGeometry(0.72, 1.15, 3.7, 24, 6), TRS(MILL.x, y0 + 1.8, MILL.z), (c, x, y) => c.set(0xfff0d8).lerp(C(0xf0cba6), smooth(y0 + 1.2, y0, y)));
  B.add('gloss', new THREE.ConeGeometry(1.02, 1.25, 28, 4), TRS(MILL.x, y0 + 4.25, MILL.z), 0x3aa7c9);
  B.add('gloss', new RoundedBoxGeometry(0.6, 1.1, 0.14, 4, 0.06), TRS(MILL.x + Math.sin(ry) * 1.03, y0 + 0.6, MILL.z + Math.cos(ry) * 1.03, 0.12, ry, 0), 0xe9573f);
  B.add('glow', new THREE.CircleGeometry(0.2, 24), TRS(MILL.x + Math.sin(ry) * 0.9, y0 + 2.3, MILL.z + Math.cos(ry) * 0.9, 0.12, ry, 0), C(0xffc56b), { ao: false, gain: 3 });
  const RB = new Builder();
  RB.add('clay', new THREE.SphereGeometry(0.2, 16, 12), TRS(0, 0, 0), 0x8a5f3f);
  RB.add('clay', new THREE.CylinderGeometry(0.07, 0.07, 0.5, 10), TRS(0, 0, -0.25, Math.PI / 2, 0, 0), 0x8a5f3f);
  for (let k = 0; k < 4; k++) {
    const a = k * Math.PI / 2, m = TRS(0, 0, 0.05, 0, 0, a);
    RB.add('clay', new RoundedBoxGeometry(0.07, 2.5, 0.07, 2, 0.025), m.clone().multiply(TRS(0, 1.25, 0)), 0x8a5f3f);
    RB.add('clay', new RoundedBoxGeometry(0.5, 1.75, 0.035, 3, 0.015), m.clone().multiply(TRS(0.27, 1.55, 0.02, 0, 0.12, 0)), 0xfff6ea);
  }
  RB.build(rotor, MATS);
  rotor.position.set(MILL.x + Math.sin(ry) * 1.0, y0 + 3.35, MILL.z + Math.cos(ry) * 1.0);
  rotor.rotation.order = 'YXZ'; rotor.rotation.y = ry;
  world.add(rotor);
}

// ---------------------------------------------------------------- lily pads, islets
for (let i = 0; i < 6; i++) {
  const a = i * 1.1 + 0.4, r = 0.6 + (i % 3) * 0.75, x = POND.x + Math.cos(a) * r, z = POND.z + Math.sin(a) * r, s = 0.26 + rnd() * 0.18;
  B.add('gloss', new THREE.CylinderGeometry(s, s, 0.025, 20, 1, false, 0, 5.6), TRS(x, WATER_Y + 0.02, z, 0, rnd() * 6, 0), C(0x4fae4f).multiplyScalar(0.85 + rnd() * 0.3), { ao: false });
  if (i % 2 === 0) { for (let k = 0; k < 6; k++) B.add('clay', new THREE.SphereGeometry(0.06, 10, 8), TRS(x + Math.cos(k * 1.05) * 0.05, WATER_Y + 0.07, z + Math.sin(k * 1.05) * 0.05, 0, -k * 1.05, 0.7, 1.3, 0.5, 0.7), 0xffb3d1, { ao: false }); B.add('clay', new THREE.SphereGeometry(0.035, 8, 6), TRS(x, WATER_Y + 0.1, z), 0xffd95c); }
}
function islet(cx, cy, cz, r, pal) {
  const g = blob(r, 3, 0.28, 0.9 / r, rnd() * 90), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setY(i, y > 0 ? y * 0.14 : y * 1.5); }
  g.computeVertexNormals();
  B.add('clay', g, TRS(cx, cy, cz), (c, px, py, pz, nx, ny) => c.set(0x8ea3c6).lerp(C(0x6680ad), 0.5 + 0.5 * Math.sin(py * 3)).lerp(C(0x5cc04a), smooth(0.4, 0.8, ny)), { ao: false });
  tree(cx, cz, r * 0.38, pal, cy + r * 0.08);
}
islet(-24, 2.5, -9, 3.2, 'green'); islet(21, -1.5, -17, 2.6, 'blossom'); islet(-17, 5.5, -26, 2.2, 'autumn'); islet(25, 4, 10, 2.0, 'green2');
B.build(world, MATS);
{
  const cv = document.createElement('canvas'); cv.width = cv.height = 128; const g2 = cv.getContext('2d'); g2.translate(64, 64); g2.fillStyle = '#fff';
  for (let i = 0; i < 6; i++) { g2.save(); g2.rotate(i / 6 * 6.283 + (i % 2) * 0.25); g2.beginPath(); g2.moveTo(0, 4); g2.bezierCurveTo(34, -8, 26, -50, 0, -58); g2.bezierCurveTo(-26, -50, -34, -8, 0, 4); g2.fill(); g2.restore(); }
  g2.beginPath(); g2.arc(0, 0, 34, 0, 6.3); g2.fill();
  const leafTex = new THREE.CanvasTexture(cv); leafTex.colorSpace = THREE.SRGBColorSpace;
  const leafMat = toon({ map: leafTex, alphaTest: 0.5 });
  leafMat.userData.patch = (sh) => {
    sh.uniforms.uTime = U.time; sh.uniforms.uWind = U.wind;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime, uWind; attribute vec2 aLeaf;')
      .replace('#include <project_vertex>', `
        vec4 mvPosition = modelViewMatrix * vec4(transformed + vec3(sin(uTime * 1.3 + position.y * 1.4 + position.x * 0.8), 0.0, cos(uTime * 1.1 + position.z * 1.2)) * 0.05 * uWind, 1.0);
        float la = aLeaf.y + sin(uTime * 1.6 + position.x * 3.0 + position.z * 2.0) * 0.16 * min(uWind, 2.5);
        mvPosition.xy += mat2(cos(la), -sin(la), sin(la), cos(la)) * (uv - 0.5) * aLeaf.x;
        gl_Position = projectionMatrix * mvPosition;`);
  };
  const lg = new THREE.BufferGeometry();
  lg.setAttribute('position', new THREE.Float32BufferAttribute(LEAF.pos, 3)); lg.setAttribute('normal', new THREE.Float32BufferAttribute(LEAF.nor, 3));
  lg.setAttribute('uv', new THREE.Float32BufferAttribute(LEAF.uv, 2)); lg.setAttribute('color', new THREE.Float32BufferAttribute(LEAF.col, 3));
  lg.setAttribute('aLeaf', new THREE.Float32BufferAttribute(LEAF.leaf, 2)); lg.setIndex(LEAF.idx);
  const leaves = new THREE.Mesh(lg, leafMat); leaves.receiveShadow = true; leaves.frustumCulled = false; world.add(leaves);
}

// ---------------------------------------------------------------- clouds
const clouds = new THREE.Group(); scene.add(clouds);
{
  const CB = new Builder();
  for (let i = 0; i < 11; i++) {
    const a = i / 11 * 6.283 + rnd(), r = 30 + rnd() * 26, cx = Math.cos(a) * r, cz = Math.sin(a) * r, cy = -9 + rnd() * 20, s = 2 + rnd() * 2.6;
    for (let k = 0; k < 6; k++) CB.add('cloud', blob(s * (0.6 + rnd() * 0.6), 3, 0.12, 0.5, rnd() * 20), TRS(cx + (k - 2.5) * s * 0.62, cy + (rnd() - .3) * s * 0.4, cz + (rnd() - .5) * s, 0, 0, 0, 1, 0.62, 1), 0xffffff);
  }
  CB.build(clouds, MATS, { cast: false, receive: false });
}

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

const motesScale = { value: 1 };
// ---------------------------------------------------------------- water
{
  const N = 96, half = POND.r + 1.6, data = new Uint8Array(N * N);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const x = POND.x - half + (i + .5) / N * half * 2, z = POND.z - half + (j + .5) / N * half * 2;
    data[j * N + i] = clamp((WATER_Y - height(x, z)) / 1.5, 0, 1) * 255;
  }
  const depthTex = new THREE.DataTexture(data, N, N, THREE.RedFormat, THREE.UnsignedByteType);
  depthTex.minFilter = depthTex.magFilter = THREE.LinearFilter; depthTex.needsUpdate = true;
  const mat = new THREE.ShaderMaterial({
    transparent: true, fog: false,
    uniforms: { uTime: U.time, uDepth: { value: depthTex }, uOrigin: { value: new THREE.Vector2(POND.x - half, POND.z - half) }, uSize: { value: half * 2 }, uSunDir: { value: SUN_DIR }, uSunColor: { value: SKY.sun }, uZenith: { value: SKY.zenith }, uHorizon: { value: SKY.horizon }, uFall: { value: new THREE.Vector2(6.75, 1.9) }, uRain: U.rain, uDim: U.dim },
    vertexShader: `varying vec3 vWorld; void main(){ vec4 w = modelMatrix * vec4(position, 1.); vWorld = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */`
      uniform float uTime, uSize; uniform sampler2D uDepth; uniform vec2 uOrigin; uniform vec3 uSunDir, uSunColor, uZenith, uHorizon; uniform vec2 uFall; uniform float uRain, uDim; varying vec3 vWorld;
      float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
      vec2 wave(vec2 p, vec2 d, float f, float s, float a){ return d * a * f * cos(dot(d, p) * f + uTime * s); }
      void main(){
        vec2 p = vWorld.xz;
        float depth = texture2D(uDepth, (p - uOrigin) / uSize).r * 1.5;
        vec2 g = wave(p, vec2(0.8, 0.6), 2.3, 1.3, 0.016) + wave(p, vec2(-0.5, 0.86), 3.7, 1.7, 0.009) + wave(p, vec2(0.2, -0.98), 6.1, 2.3, 0.004) + wave(p, vec2(-0.9, -0.3), 9.7, 2.9, 0.002);
        vec3 n = normalize(vec3(-g.x, 1., -g.y));
        vec3 v = normalize(cameraPosition - vWorld);
        float fres = 0.03 + 0.72 * pow(1. - max(dot(n, v), 0.), 5.0);
        vec3 r = reflect(-v, n);
        vec3 skyc = mix(uHorizon, uZenith, pow(clamp(r.y, 0., 1.), 0.5)) + uSunColor * pow(max(dot(r, uSunDir), 0.), 8.) * 0.12;
        float glint = pow(max(dot(r, uSunDir), 0.), 320.) * 14. + pow(max(dot(r, uSunDir), 0.), 40.) * 0.10;
        vec3 body = mix(vec3(0.30, 0.95, 0.86), vec3(0.02, 0.50, 0.70), smoothstep(0.0, 0.8, depth));
        vec2 q = p * 1.7 + vec2(uTime * 0.12, uTime * 0.08);
        float ln = abs(sin(q.x * 2.0 + sin(q.y * 2.3 + uTime * 0.6) * 1.2) * sin(q.y * 2.1 + sin(q.x * 1.7 - uTime * 0.5) * 1.2));
        body += smoothstep(0.07, 0.0, ln) * 0.22;
        vec3 col = mix(body, skyc, fres * 0.55) + uSunColor * glint;
        float wob = 0.035 * sin(p.x * 7. + uTime * 1.6) * sin(p.y * 6. - uTime * 1.2);
        float foam = 1. - smoothstep(0.02, 0.10, depth + wob);
        foam = max(foam, (1. - smoothstep(0.0, 0.03, abs(fract(depth * 4. - uTime * 0.25) - 0.5) - 0.44)) * smoothstep(0.42, 0.1, depth) * 0.55);
        if (uRain > 0.01) { vec2 gq = p * 2.4, id = floor(gq), gf = fract(gq) - .5; float hh = hash(id), tt = fract(uTime * 1.1 + hh * 7.);
          float rr = length(gf + (vec2(hash(id + 3.1), hash(id + 7.7)) - .5) * 0.5); col += uRain * smoothstep(0.035, 0., abs(rr - tt * 0.45)) * (1. - tt) * 0.6; }
        float fd = length(p - uFall);
        foam = max(foam, smoothstep(1.5, 0.2, fd) * (0.55 + 0.45 * sin(fd * 12. - uTime * 5.)));
        col = mix(col, vec3(1.0), foam * 0.9);
        float alpha = max(mix(0.72, 1., fres), foam) * smoothstep(0.0, 0.03, depth + wob + 0.02);
        gl_FragColor = vec4(col * uDim, alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const water = new THREE.Mesh(new THREE.CircleGeometry(POND.r + 1.5, 64).rotateX(-Math.PI / 2), mat);
  water.position.set(POND.x, WATER_Y, POND.z); world.add(water);
}

// ---------------------------------------------------------------- stream flowing off the island
{
  const pts = STREAM.map(([x, z]) => new THREE.Vector3(x, height(x, z) + 0.2, z)), last = pts[pts.length - 1], yEdge = last.y;
  pts.push(new THREE.Vector3(4.15, yEdge - 0.5, 13.95), new THREE.Vector3(4.1, yEdge - 3.2, 14.3), new THREE.Vector3(4.1, yEdge - 8, 14.4), new THREE.Vector3(4.1, yEdge - 14, 14.4));
  const curve = new THREE.CatmullRomCurve3(pts), NV = 90, pos = [], uv = [], fall = [], idx = [], side = new THREE.Vector3(1, 0, 0), tan = new THREE.Vector3();
  let dist = 0; const prev = curve.getPoint(0);
  for (let j = 0; j <= NV; j++) {
    const pt = curve.getPoint(j / NV); curve.getTangent(j / NV, tan); dist += pt.distanceTo(prev); prev.copy(pt);
    if (Math.hypot(tan.x, tan.z) > 0.25) side.set(tan.z, 0, -tan.x).normalize();
    const f = clamp((yEdge - pt.y) / 12, 0, 1), w = lerp(0.62, 0.45, f);
    pos.push(pt.x - side.x * w, pt.y, pt.z - side.z * w, pt.x + side.x * w, pt.y, pt.z + side.z * w); uv.push(0, dist, 1, dist); fall.push(f, f);
    if (j < NV) { const a = j * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setAttribute('aFall', new THREE.Float32BufferAttribute(fall, 1)); g.setIndex(idx);
  const stream = new THREE.Mesh(g, new THREE.ShaderMaterial({
    side: THREE.DoubleSide, transparent: true, uniforms: { uTime: U.time, uDim: U.dim },
    vertexShader: `attribute float aFall; varying vec2 vUv; varying float vFall; void main(){ vUv = uv; vFall = aFall; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
    fragmentShader: `uniform float uTime, uDim; varying vec2 vUv; varying float vFall;
      float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
      float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f); return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y); }
      void main(){
        float flow = vUv.y * 1.3 - uTime * mix(1.5, 4.0, vFall);
        float n = vnoise(vec2(vUv.x * 5., flow * 1.4)) * 0.6 + vnoise(vec2(vUv.x * 11., flow * 2.8)) * 0.4;
        float edge = smoothstep(0.30, 0.5, abs(vUv.x - 0.5));
        float white = smoothstep(0.56, 0.68, n) * mix(0.65, 1.0, vFall) + edge * 0.7 + smoothstep(0.0, 0.25, vFall) * 0.25;
        vec3 col = mix(vec3(0.20, 0.84, 0.86), vec3(1.0), clamp(white, 0., 1.));
        float a = (1. - smoothstep(0.44, 0.5, abs(vUv.x - 0.5))) * (1. - smoothstep(0.55, 1.0, vFall)) * mix(0.85, 1.0, white);
        gl_FragColor = vec4(col * uDim, a);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  }));
  world.add(stream);
}

// ---------------------------------------------------------------- waterfall + mist
{
  const prof = [[7.95, 5.9], [7.2, 5.75], [6.86, 4.9], [6.74, 2.4], [6.7, WATER_Y]], curve = new THREE.CatmullRomCurve3(prof.map(p => new THREE.Vector3(p[0], p[1], 0)));
  const NV = 20, NU = 4, W = 1.7, pos = [], uv = [], idx = [];
  for (let j = 0; j <= NV; j++) { const pt = curve.getPoint(j / NV); for (let i = 0; i <= NU; i++) { pos.push(pt.x - Math.sin(i / NU * Math.PI) * 0.18, pt.y, 1.9 + (i / NU - .5) * W); uv.push(i / NU, j / NV); } }
  for (let j = 0; j < NV; j++) for (let i = 0; i < NU; i++) { const a = j * (NU + 1) + i, b = a + 1, c = a + NU + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
  const fall = new THREE.Mesh(g, new THREE.ShaderMaterial({
    side: THREE.DoubleSide, transparent: true, uniforms: { uTime: U.time, uDim: U.dim },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
    fragmentShader: `uniform float uTime, uDim; varying vec2 vUv;
      float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
      float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f); return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y); }
      void main(){
        float n = vnoise(vec2(vUv.x * 7., vUv.y * 5. - uTime * 2.6)) * 0.6 + vnoise(vec2(vUv.x * 16., vUv.y * 9. - uTime * 4.2)) * 0.4;
        float streak = smoothstep(0.48, 0.62, n);
        vec3 col = mix(vec3(0.42, 0.90, 0.95), vec3(1.0), streak * 0.85 + smoothstep(0.8, 1.0, vUv.y) * 0.8);
        float a = smoothstep(0.0, 0.18, vUv.x) * smoothstep(1.0, 0.82, vUv.x) * mix(0.88, 1.0, streak);
        gl_FragColor = vec4(col * uDim, a);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  }));
  world.add(fall);
  const n = 46, sp = new Float32Array(n * 3); for (let i = 0; i < n * 3; i++) sp[i] = rnd();
  const mg = new THREE.BufferGeometry(); mg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  const mist = new THREE.Points(mg, new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, uniforms: { uTime: U.time, uScale: motesScale },
    vertexShader: `uniform float uTime, uScale; varying float vA;
      void main(){ float f = fract(uTime * (0.18 + position.y * 0.12) + position.x * 7.);
        vec3 p = vec3(6.55 - f * 0.9 * position.y, ${(WATER_Y + 0.1).toFixed(2)} + f * 1.5, 1.9 + (position.z - .5) * 2.0 * (1. + f));
        vA = sin(f * 3.14159) * 0.5; vec4 mv = viewMatrix * vec4(p, 1.); gl_PointSize = uScale * (0.5 + f * 0.7) / -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `varying float vA; void main(){ float d = length(gl_PointCoord - .5); gl_FragColor = vec4(vec3(1.0), smoothstep(.5, .1, d) * vA);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
  }));
  mist.frustumCulled = false; scene.add(mist);
}

// ---------------------------------------------------------------- character
const chr = new THREE.Group(), squash = new THREE.Group(), sprout = new THREE.Group(); chr.add(squash); scene.add(chr);
const eyes = [];
{
  const plush = new THREE.MeshPhysicalMaterial({ color: 0xfff3e2, roughness: 0.92, sheen: 1, sheenRoughness: 0.45, sheenColor: new THREE.Color(0xffd0b0) });
  const orange = new THREE.MeshPhysicalMaterial({ color: 0xff9a3d, roughness: 0.6, sheen: 0.6, sheenColor: new THREE.Color(0xffd0a0) });
  const eyeMat = new THREE.MeshPhysicalMaterial({ color: 0x1a1320, roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.05 });
  const leaf = new THREE.MeshPhysicalMaterial({ color: 0x66d06a, roughness: 0.45, clearcoat: 0.5 });
  const add = (parent, geo, mat, px, py, pz, sx = 1, sy = sx, sz = sx, rz = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(px, py, pz); m.scale.set(sx, sy, sz); m.rotation.z = rz; m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; };
  const sph = (r) => new THREE.SphereGeometry(r, 32, 24);
  add(squash, sph(0.5), plush, 0, 0.5, 0, 1, 0.93, 0.95);
  add(squash, sph(0.3), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.95, sheen: 1, sheenColor: new THREE.Color(0xffe8d8) }), 0, 0.4, 0.26, 1, 1, 0.75);
  for (const s of [-1, 1]) {
    add(squash, sph(0.14), orange, s * 0.2, 0.07, 0.1, 1, 0.6, 1.35);
    add(squash, sph(0.13), plush, s * 0.49, 0.42, 0.06, 0.7, 1.25, 0.8, s * 0.5);
    add(squash, sph(0.16), plush, s * 0.3, 0.93, -0.02, 0.8, 1.0, 0.6, -s * 0.35);
    const e = add(squash, sph(0.078), eyeMat, s * 0.175, 0.6, 0.425, 1, 1.15, 0.7); eyes.push(e);
    const hl = add(e, new THREE.SphereGeometry(0.024, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }), s * 0.01 + 0.025, 0.03, 0.065); hl.castShadow = false;
    add(squash, sph(0.075), new THREE.MeshStandardMaterial({ color: 0xff9db0, roughness: 0.9 }), s * 0.31, 0.47, 0.385, 1, 0.6, 0.35);
  }
  add(squash, sph(0.05), orange, 0, 0.5, 0.485, 1.1, 0.7, 0.9);
  sprout.position.set(0, 0.95, 0); squash.add(sprout);
  add(sprout, new THREE.CylinderGeometry(0.018, 0.024, 0.22, 8), leaf, 0, 0.11, 0);
  add(sprout, sph(0.14), leaf, 0.12, 0.25, 0, 1, 0.16, 0.5, 0.45);
  add(sprout, sph(0.11), leaf, -0.1, 0.23, 0, 1, 0.16, 0.5, -0.55);
}
const walk = new THREE.CatmullRomCurve3([[-3.2, 2.4], [-0.8, 4.2], [0.6, 6.8], [-2.4, 8.4], [-6, 7], [-7.6, 3.6], [-6.2, 1.6]].map(p => new THREE.Vector3(p[0], 0, p[1])), true);
const chrState = { u: 0, hop: 0, sa: 0, sv: 0, lastY: 0, blink: 2 };

// ---------------------------------------------------------------- butterflies, petals, motes
const butterflies = [];
{
  const wg = new THREE.CircleGeometry(0.09, 12); wg.scale(1, 0.72, 1); wg.translate(0.085, 0, 0); wg.rotateX(-Math.PI / 2);
  [0xffd84d, 0x7fd4ff, 0xff8fb8, 0xffffff, 0xff9a4d, 0xc59bff].forEach((hex, i) => {
    const mat = new THREE.MeshStandardMaterial({ color: hex, side: THREE.DoubleSide, roughness: 0.6, emissive: hex, emissiveIntensity: 0.25 });
    const g = new THREE.Group(), l = new THREE.Mesh(wg, mat), r = new THREE.Mesh(wg, mat); r.scale.x = -1; g.add(l, r); scene.add(g);
    const a = rnd() * 6.283, d = 3 + rnd() * 6;
    butterflies.push({ g, l, r, c: new THREE.Vector3(Math.cos(a) * d, 0, Math.sin(a) * d), ph: rnd() * 10, sp: 0.35 + rnd() * 0.3 });
  });
}
{
  const count = 46 * blossomCrowns.length, base = new THREE.PlaneGeometry(0.1, 0.07), g = new THREE.InstancedBufferGeometry();
  g.index = base.index; g.setAttribute('position', base.attributes.position);
  const org = new Float32Array(count * 3), seed = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) { const c = blossomCrowns[i % blossomCrowns.length]; org.set([c.x, c.y, c.z], i * 3); seed.set([rnd(), rnd(), rnd(), rnd()], i * 4); }
  g.setAttribute('aOrigin', new THREE.InstancedBufferAttribute(org, 3)); g.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seed, 4));
  g.instanceCount = count;
  const petals = new THREE.Mesh(g, new THREE.ShaderMaterial({
    side: THREE.DoubleSide, transparent: true, depthWrite: false, uniforms: { uTime: U.time, uWind: U.wind },
    vertexShader: /* glsl */`
      uniform float uTime, uWind; attribute vec3 aOrigin; attribute vec4 aSeed; varying float vA; varying float vT;
      void main(){
        float T = uTime * (0.10 + aSeed.w * 0.07) + aSeed.x * 10., f = fract(T);
        vec3 c = aOrigin + vec3((aSeed.x - .5) * 3.6, 0.5, (aSeed.z - .5) * 3.6);
        c.y -= f * (aOrigin.y + 0.9);
        c.x += sin(T * 9. + aSeed.y * 6.28) * 0.35 + f * 1.6 * uWind; c.z += cos(T * 7. + aSeed.z * 9.) * 0.3 - f * 0.6 * uWind;
        float a = T * 30. + aSeed.y * 6.28, b = T * 22.;
        vec3 l = position; l.xy = mat2(cos(a), -sin(a), sin(a), cos(a)) * l.xy; l.yz = mat2(cos(b), -sin(b), sin(b), cos(b)) * l.yz;
        vA = smoothstep(0., 0.08, f) * (1. - smoothstep(0.9, 1., f)); vT = aSeed.y;
        gl_Position = projectionMatrix * viewMatrix * vec4(c + l, 1.);
      }`,
    fragmentShader: `varying float vA; varying float vT; void main(){ gl_FragColor = vec4(mix(vec3(1.0, 0.62, 0.78), vec3(1.0, 0.9, 0.93), vT) * 1.5, vA);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
  }));
  petals.frustumCulled = false; scene.add(petals);
}
const motesMat = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uTime: U.time, uScale: motesScale, uNight: U.night },
  vertexShader: /* glsl */`
    uniform float uTime, uScale; attribute float aPhase; varying float vTw;
    void main(){
      vec3 p = (fract(position + vec3(uTime * 0.008, 0., uTime * 0.005)) - .5) * vec3(26., 1., 26.);
      p.y = position.y * 6.0 + 0.4 + sin(uTime * 0.6 + aPhase * 6.) * 0.35;
      p.xz += vec2(sin(uTime * 0.5 + aPhase * 20.), cos(uTime * 0.4 + aPhase * 31.)) * 0.45;
      vec4 mv = viewMatrix * vec4(p, 1.);
      vTw = 0.55 + 0.45 * sin(uTime * 2.6 + aPhase * 50.);
      gl_PointSize = uScale * (0.05 + 0.06 * fract(aPhase * 7.)) * vTw / -mv.z;
      gl_Position = projectionMatrix * mv;
    }`,
  fragmentShader: `uniform float uNight; varying float vTw; void main(){ float d = length(gl_PointCoord - .5); float a = smoothstep(.5, 0., d); gl_FragColor = vec4(mix(vec3(1.0, 0.82, 0.45) * 2.6, vec3(0.75, 1.0, 0.30) * 7.0, uNight) * a * a * vTw, 1.);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`,
});
{
  const n = 260, pos = new Float32Array(n * 3), ph = new Float32Array(n);
  for (let i = 0; i < n; i++) { pos.set([rnd(), rnd(), rnd()], i * 3); ph[i] = rnd(); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aPhase', new THREE.BufferAttribute(ph, 1));
  const pts = new THREE.Points(g, motesMat); pts.frustumCulled = false; scene.add(pts);
}

// ---------------------------------------------------------------- rain
const rainMesh = (() => {
  const base = new THREE.PlaneGeometry(1, 1), g = new THREE.InstancedBufferGeometry(); g.index = base.index; g.setAttribute('position', base.attributes.position);
  const seed = new Float32Array(Q.rain * 3); for (let i = 0; i < seed.length; i++) seed[i] = rnd();
  g.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seed, 3)); g.instanceCount = Q.rain;
  const m = new THREE.Mesh(g, new THREE.ShaderMaterial({
    side: THREE.DoubleSide, transparent: true, depthWrite: false, uniforms: { uTime: U.time, uRain: U.rain, uWind: U.wind },
    vertexShader: `uniform float uTime, uRain, uWind; attribute vec3 aSeed; varying float vA;
      void main(){
        vec3 box = vec3(38., 26., 38.), vel = vec3(-1.0 - uWind * 3.2, -24., 1.5);
        vec3 p = mod(aSeed * box + vel * uTime * (0.85 + aSeed.x * 0.3) - cameraPosition, box) - box * 0.5 + cameraPosition;
        vec4 mv = viewMatrix * vec4(p, 1.); vec3 ax = (viewMatrix * vec4(normalize(vel), 0.)).xyz;
        mv.xyz += ax * position.y * (0.7 + aSeed.y * 0.6); mv.xy += normalize(vec2(-ax.y, ax.x) + 1e-5) * position.x * max(0.022, -mv.z * 0.0017);
        vA = step(aSeed.z, uRain) * 0.42; gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `varying float vA; void main(){ if (vA < 0.01) discard; gl_FragColor = vec4(vec3(0.82, 0.90, 1.0), vA);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
  }));
  m.frustumCulled = false; m.visible = false; scene.add(m); return m;
})();

// ---------------------------------------------------------------- snow / flying leaves
function makeFlakes(count, vel, color, size, amount) {
  const pos = new Float32Array(count * 3); for (let i = 0; i < pos.length; i++) pos[i] = rnd();
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const m = new THREE.Points(g, new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uTime: U.time, uScale: motesScale, uAmount: amount, uWind: U.wind, uVel: { value: vel }, uColor: { value: color }, uSize: { value: size } },
    vertexShader: `uniform float uTime, uScale, uAmount, uWind, uSize; uniform vec3 uVel; varying float vA;
      void main(){
        vec3 box = vec3(36., 22., 36.), v = uVel * vec3(uWind, 1., uWind);
        vec3 p = mod(position * box + v * uTime * (0.7 + position.x * 0.6) + vec3(sin(uTime * 0.9 + position.y * 30.), 0., cos(uTime * 0.7 + position.z * 30.)) * 0.6 - cameraPosition, box) - box * 0.5 + cameraPosition;
        vec4 mv = viewMatrix * vec4(p, 1.); gl_PointSize = max(1.5, uScale * uSize * (0.6 + position.z * 0.8) / -mv.z); vA = uAmount; gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `uniform vec3 uColor; varying float vA; void main(){ if (vA < 0.01) discard; float d = length(gl_PointCoord - .5); gl_FragColor = vec4(uColor, smoothstep(.5, .25, d) * vA);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
  }));
  m.frustumCulled = false; scene.add(m); return m;
}
const snowFlakes = makeFlakes(Math.round(Q.rain * 0.6), new THREE.Vector3(0.9, -1.7, 0.3), new THREE.Color(1, 1, 1), 0.09, U.snow);
const windLeaves = makeFlakes(260, new THREE.Vector3(4.0, -0.5, 1.0), new THREE.Color(0.50, 0.80, 0.28), 0.13, U.gust);

// ---------------------------------------------------------------- post-processing
const rtScene = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: Q.msaa, depthTexture: new THREE.DepthTexture(4, 4) });
const aoRT = new THREE.WebGLRenderTarget(4, 4, { type: THREE.UnsignedByteType, depthBuffer: false });
const VS = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }`;
const aoMat = new THREE.ShaderMaterial({
  defines: { TAPS: Math.max(Q.aoTaps, 1) }, depthTest: false, depthWrite: false,
  uniforms: { tDepth: { value: rtScene.depthTexture }, uProj: { value: camera.projectionMatrix }, uProjInv: { value: camera.projectionMatrixInverse }, uRadius: { value: 0.85 }, uIntensity: { value: 1.25 } },
  vertexShader: VS,
  fragmentShader: /* glsl */`
    uniform sampler2D tDepth; uniform mat4 uProj, uProjInv; uniform float uRadius, uIntensity; varying vec2 vUv;
    vec3 vpos(vec2 uv){ float d = texture2D(tDepth, uv).x; vec4 v = uProjInv * vec4(uv * 2. - 1., d * 2. - 1., 1.); return v.xyz / v.w; }
    void main(){
      float d = texture2D(tDepth, vUv).x;
      if (d >= 0.99999) { gl_FragColor = vec4(1.); return; }
      vec3 p = vpos(vUv), n = normalize(cross(dFdx(p), dFdy(p)));
      vec2 rad = uRadius * vec2(uProj[0][0], uProj[1][1]) * 0.5 / -p.z;
      float ign = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
      float sum = 0., r2 = uRadius * uRadius;
      for (int i = 0; i < TAPS; i++) {
        float a = (float(i) + ign) * 2.39996323, r = sqrt((float(i) + .5) / float(TAPS));
        vec3 v = vpos(vUv + vec2(cos(a), sin(a)) * r * rad) - p;
        float vv = dot(v, v), vn = dot(v, n), f = max(r2 - vv, 0.);
        sum += f * f * f * max((vn - 0.02 * -p.z * 0.1) / (vv + 0.01), 0.);
      }
      float ao = max(0., 1. - sum * uIntensity * 5. / (r2 * r2 * r2 * float(TAPS)));
      gl_FragColor = vec4(ao, d, 0., 1.);
    }`,
});
const aoQuad = new FullScreenQuad(aoMat);
const volRT = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, depthBuffer: false });
const volMat = new THREE.ShaderMaterial({
  defines: { STEPS: Math.max(Q.volSteps, 1) }, depthTest: false, depthWrite: false,
  uniforms: { tDepth: { value: rtScene.depthTexture }, tShadow: { value: null }, uProjInv: { value: camera.projectionMatrixInverse }, uCamWorld: { value: camera.matrixWorld }, uShadowMat: { value: sun.shadow.matrix },
    uCamPos: { value: camera.position }, uSunDir: { value: SUN_DIR }, uSunCol: { value: new THREE.Color(1.0, 0.93, 0.78) }, uSkyCol: { value: new THREE.Color(0.62, 0.82, 0.98) }, uTime: U.time, uVol: { value: 1 }, uMist: { value: 0 }, uFog: { value: 0.004 } },
  vertexShader: VS,
  fragmentShader: /* glsl */`
    #include <packing>
    uniform sampler2D tDepth, tShadow; uniform mat4 uProjInv, uCamWorld, uShadowMat; uniform vec3 uCamPos, uSunDir, uSunCol, uSkyCol; uniform float uTime, uVol, uMist, uFog; varying vec2 vUv;
    float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
    float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f); return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y); }
    void main(){
      float d = texture2D(tDepth, vUv).x; vec4 v = uProjInv * vec4(vUv * 2. - 1., d * 2. - 1., 1.); v /= v.w;
      vec3 ray = (uCamWorld * vec4(v.xyz, 1.)).xyz - uCamPos; float len = min(length(ray), 70.); vec3 dir = normalize(ray);
      float ign = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715)))), ds = len / float(STEPS), T = 1.;
      float phase = 0.30 + 0.70 * pow(max(dot(dir, uSunDir), 0.), 3.);
      vec3 scat = vec3(0.);
      for (int i = 0; i < STEPS; i++) {
        vec3 p = uCamPos + dir * ds * (float(i) + ign);
        float low = exp(-max(p.y - 0.2, 0.) * 0.85), n = 1.0 + 0.4 * sin(p.x * 0.37 + uTime * 0.21) * sin(p.z * 0.31 - uTime * 0.13) + 0.25 * sin(p.x * 0.9 - p.z * 0.7 + uTime * 0.3);
        float dens = uFog * 0.35 + uMist * 0.09 * low * n;
        vec4 sc = uShadowMat * vec4(p, 1.); sc.xyz /= sc.w; float vis = 1.;
        float inside = step(0., sc.x) * step(sc.x, 1.) * step(0., sc.y) * step(sc.y, 1.) * step(sc.z, 1.);
        vis = mix(1., step(sc.z - 0.003, unpackRGBAToDepth(textureLod(tShadow, clamp(sc.xy, 0., 1.), 0.))), inside);
        scat += T * dens * ds * (uSunCol * vis * phase * uVol * 3.0 + uSkyCol * 0.2);
        T *= exp(-dens * ds);
      }
      gl_FragColor = vec4(scat, T);
    }`,
});
const volQuad = new FullScreenQuad(volMat);

const composer = new EffectComposer(renderer);
const combinePass = new ShaderPass(new THREE.ShaderMaterial({
  uniforms: { tScene: { value: rtScene.texture }, tAO: { value: aoRT.texture }, uAOTexel: { value: new THREE.Vector2() }, uAO: { value: 1 }, tVol: { value: volRT.texture }, uVolOn: { value: 1 } },
  vertexShader: VS,
  fragmentShader: /* glsl */`
    uniform sampler2D tScene, tAO, tVol; uniform vec2 uAOTexel; uniform float uAO, uVolOn; varying vec2 vUv;
    void main(){
      vec3 col = texture2D(tScene, vUv).rgb;
      if (uAO > 0.) {
        vec2 c = texture2D(tAO, vUv).rg; float sum = c.r, w = 1.;
        for (int x = -1; x <= 1; x++) for (int y = -1; y <= 1; y++) {
          if (x == 0 && y == 0) continue;
          vec2 s = texture2D(tAO, vUv + vec2(float(x), float(y)) * uAOTexel * 1.5).rg;
          float wi = 1. / (1. + abs(s.g - c.g) * 4000.); sum += s.r * wi; w += wi;
        }
        float ao = mix(1., sum / w, uAO);
        col *= mix(vec3(0.20, 0.38, 0.55), vec3(1.), ao);
      }
      if (uVolOn > 0.) {
        vec4 vol = texture2D(tVol, vUv) * 0.4 + 0.15 * (texture2D(tVol, vUv + uAOTexel * vec2(1.5, 0.5)) + texture2D(tVol, vUv + uAOTexel * vec2(-1.5, -0.5)) + texture2D(tVol, vUv + uAOTexel * vec2(0.5, -1.5)) + texture2D(tVol, vUv + uAOTexel * vec2(-0.5, 1.5)));
        col = col * vol.a + vol.rgb;
      }
      gl_FragColor = vec4(col, 1.);
    }`,
}));
composer.addPass(combinePass);
const bloomPass = new UnrealBloomPass(new THREE.Vector2(4, 4), 0.22, 0.5, 0.98);
composer.addPass(bloomPass);
const dofPass = new ShaderPass(new THREE.ShaderMaterial({
  defines: { TAPS: Math.max(Q.dofTaps, 1) },
  uniforms: { tDiffuse: { value: null }, tDepth: { value: rtScene.depthTexture }, uTexel: { value: new THREE.Vector2() }, uFocus: { value: 20 }, uRange: { value: 9 }, uMaxBlur: { value: 0 }, uNear: { value: camera.near }, uFar: { value: camera.far }, uSat: { value: 1.06 }, uVig: { value: 0.2 } },
  vertexShader: VS,
  fragmentShader: /* glsl */`
    #include <packing>
    uniform sampler2D tDiffuse, tDepth; uniform vec2 uTexel; uniform float uFocus, uRange, uMaxBlur, uNear, uFar, uSat, uVig; varying vec2 vUv;
    float coc(vec2 uv){ float z = -perspectiveDepthToViewZ(texture2D(tDepth, uv).x, uNear, uFar); return clamp((abs(z - uFocus) - uRange * 0.3) / uRange, 0., 1.); }
    void main(){
      vec3 acc = texture2D(tDiffuse, vUv).rgb; float w = 1.;
      float c = coc(vUv) * uMaxBlur;
      if (c > 0.4) {
        float ign = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
        for (int i = 0; i < TAPS; i++) {
          float a = (float(i) + ign) * 2.39996323, r = sqrt((float(i) + .5) / float(TAPS));
          vec2 uv = vUv + vec2(cos(a), sin(a)) * r * c * uTexel;
          float wi = mix(0.15, 1., coc(uv)); acc += texture2D(tDiffuse, uv).rgb * wi; w += wi;
        }
      }
      vec3 col = acc / w;
      col = mix(vec3(dot(col, vec3(0.2126, 0.7152, 0.0722))), col, uSat);
      col = pow(col, vec3(1.05));
      col *= 1. - uVig * smoothstep(0.45, 1.15, length(vUv - .5) * 1.5);
      gl_FragColor = vec4(max(col, 0.), 1.);
    }`,
}));
composer.addPass(dofPass);
composer.addPass(new OutputPass());
const fxaaPass = new ShaderPass(FXAAShader);
composer.addPass(fxaaPass);

// ---------------------------------------------------------------- weather
const WBASE = { fog: 0.004, mist: 0.15, vol: 0.8, sunI: 1.75, hemiI: 1.45, overcast: 0, rain: 0, wind: 1, night: 0, snow: 0, flash: 0 };
const WEATHER = {
  sun:   { ...WBASE, label: 'Nắng' },
  wind:  { ...WBASE, label: 'Gió',   wind: 2.8, overcast: 0.12 },
  mist:  { ...WBASE, label: 'Sương', fog: 0.006, mist: 1.0, vol: 1.3, sunI: 1.6, hemiI: 1.35, overcast: 0.22, wind: 0.6 },
  rain:  { ...WBASE, label: 'Mưa',   fog: 0.013, mist: 0.55, vol: 0.3, sunI: 0.6, hemiI: 1.5, overcast: 1, rain: 1, wind: 1.4 },
  storm: { ...WBASE, label: 'Bão',   fog: 0.017, mist: 0.4, vol: 0.15, sunI: 0.3, hemiI: 1.0, overcast: 1.2, rain: 1, wind: 3.2, flash: 1 },
  snow:  { ...WBASE, label: 'Tuyết', fog: 0.010, mist: 0.5, vol: 0.5, sunI: 1.1, hemiI: 1.6, overcast: 0.7, snow: 1, wind: 0.8 },
  night: { ...WBASE, label: 'Đêm',   fog: 0.005, mist: 0.5, vol: 1.0, sunI: 0.6, hemiI: 0.5, night: 1, wind: 0.7 },
};
let weatherName = WEATHER[qs.get('w')] ? qs.get('w') : 'sun';
const W = { ...WEATHER[weatherName] };
const FOG_CLEAR = new THREE.Color(0.60, 0.82, 0.97), FOG_GREY = new THREE.Color(0.50, 0.56, 0.63);
const FOG_NIGHT = new THREE.Color(0.03, 0.05, 0.12), SUN_DAY = new THREE.Color(1.0, 0.94, 0.82), SUN_MOON = new THREE.Color(0.52, 0.66, 1.0);
const HEMI_DAY = new THREE.Color(0.52, 0.76, 1.0), HEMI_NIGHT = new THREE.Color(0.22, 0.32, 0.70), VOL_DAY = new THREE.Color(1.0, 0.93, 0.78), VOL_MOON = new THREE.Color(0.40, 0.55, 0.95);
const WKEYS = ['fog', 'mist', 'vol', 'sunI', 'hemiI', 'overcast', 'rain', 'wind', 'night', 'snow'];
let flashTimer = 2, flashEcho = -1;
function updateWeather(dt) {
  const target = WEATHER[weatherName], k = 1 - Math.exp(-dt * 1.2);
  for (const key of WKEYS) W[key] += (target[key] - W[key]) * k;
  // lightning: a flash and a quick echo, only while a storm is the target
  U.flash.value = Math.max(0, U.flash.value - dt * 5);
  if (target.flash || qs.has('flash')) {
    flashTimer -= dt; if (flashTimer < 0) { U.flash.value = 1; flashTimer = 2.5 + Math.random() * 5; flashEcho = 0.14; }
    if (flashEcho > 0) { flashEcho -= dt; if (flashEcho <= 0) U.flash.value = 0.8; }
    if (qs.has('flash')) U.flash.value = Number(qs.get('flash')) || 0.7;
  }
  const fl = U.flash.value, storm = Math.max(W.overcast - 1, 0) * 5;
  sun.intensity = W.sunI + fl * 1.5; sun.color.copy(SUN_DAY).lerp(SUN_MOON, W.night);
  hemi.intensity = W.hemiI + fl * 2.2; hemi.color.copy(HEMI_DAY).lerp(HEMI_NIGHT, W.night);
  scene.fog.density = W.fog * 0.6;
  scene.fog.color.copy(FOG_CLEAR).lerp(FOG_GREY, Math.min(W.overcast, 1)).multiplyScalar(1 - 0.45 * storm).lerp(FOG_NIGHT, W.night);
  if (T.env) scene.environmentIntensity = 0.4 * (1 - 0.8 * W.night);
  lanternLight.intensity = 3 + 16 * W.night;
  U.overcast.value = W.overcast; U.rain.value = W.rain; U.night.value = W.night; U.snow.value = W.snow; U.wind.value = W.wind;
  U.windT.value += dt * (0.4 + 0.6 * W.wind); U.gust.value = smooth(1.8, 2.6, W.wind) * 0.9;
  U.dim.value = (1 - 0.72 * W.night) * (1 - 0.3 * storm) + fl * 0.3;
  rainMesh.visible = W.rain > 0.02; snowFlakes.visible = W.snow > 0.02; windLeaves.visible = U.gust.value > 0.02;
  volMat.uniforms.uVol.value = W.vol; volMat.uniforms.uMist.value = W.mist; volMat.uniforms.uFog.value = W.fog;
  volMat.uniforms.uSunCol.value.copy(VOL_DAY).lerp(VOL_MOON, W.night); volMat.uniforms.uSkyCol.value.copy(scene.fog.color);
}

// ---------------------------------------------------------------- UI / toggles
const T = { vol: Q.volSteps > 0, shadow: true, ao: Q.aoTaps > 0, bloom: true, dof: Q.dofTaps > 0, grass: true, env: true, spin: true };
const LABEL = { vol: 'Tia nắng + sương', shadow: 'Bóng đổ', ao: 'AO', bloom: 'Bloom', dof: 'Xa gần', grass: 'Cỏ', env: 'Ánh sáng trời', spin: 'Tự xoay' };
function applyToggles() {
  sun.castShadow = T.shadow;
  combinePass.uniforms.uAO.value = T.ao && Q.aoTaps > 0 ? 1 : 0;
  bloomPass.enabled = T.bloom;
  combinePass.uniforms.uVolOn.value = T.vol && Q.volSteps > 0 ? 1 : 0;
  dofPass.uniforms.uMaxBlur.value = T.dof && Q.dofTaps > 0 ? 1 : 0;
  grass.visible = T.grass;
  scene.environmentIntensity = T.env ? 0.4 : 0; hemi.visible = T.env; flatAmbient.visible = !T.env;
  controls.autoRotate = T.spin;
  document.querySelectorAll('#toggles button').forEach(b => b.classList.toggle('on', T[b.dataset.k]));
}
{
  const tg = document.getElementById('toggles'), tiers = document.getElementById('tiers');
  for (const k of Object.keys(T)) { const b = document.createElement('button'); b.textContent = LABEL[k]; b.dataset.k = k; b.onclick = () => { T[k] = !T[k]; applyToggles(); }; tg.append(b); }
  for (const k of Object.keys(TIERS)) { const b = document.createElement('button'); b.textContent = TIERS[k].label; b.classList.toggle('on', k === tierName); b.onclick = () => { qs.set('q', k); location.search = qs.toString(); }; tiers.append(b); }
  const wr = document.getElementById('weather');
  for (const k of Object.keys(WEATHER)) { const b = document.createElement('button'); b.textContent = WEATHER[k].label; b.dataset.w = k; b.classList.toggle('on', k === weatherName); b.onclick = () => { weatherName = k; wr.querySelectorAll('button').forEach(x => x.classList.toggle('on', x.dataset.w === k)); }; wr.append(b); }
  let saved = null;
  const flat = document.getElementById('flat');
  flat.onclick = () => {
    if (saved) { Object.assign(T, saved); saved = null; flat.classList.remove('on'); }
    else { saved = { ...T }; for (const k of ['vol', 'shadow', 'ao', 'bloom', 'dof', 'grass', 'env']) T[k] = false; flat.classList.add('on'); }
    applyToggles();
  };
  document.getElementById('head').onclick = () => document.getElementById('panel').classList.toggle('min');
  if (qs.has('ui') && qs.get('ui') === '0') document.getElementById('panel').style.display = 'none';
  if (qs.has('spin') && qs.get('spin') === '0') T.spin = false;
  if (qs.has('flat')) flat.onclick();
}
applyToggles();

// ---------------------------------------------------------------- resize / dynamic resolution
let resScale = 1;
function resize() {
  const w = innerWidth, h = innerHeight, pr = Math.min(devicePixelRatio || 1, Q.dpr) * resScale, W = Math.max(2, Math.round(w * pr)), Hh = Math.max(2, Math.round(h * pr));
  renderer.setPixelRatio(pr); renderer.setSize(w, h, false);
  camera.aspect = w / h; camera.fov = w < h ? 52 : 38; camera.updateProjectionMatrix();
  rtScene.setSize(W, Hh); aoRT.setSize(W >> 1, Hh >> 1); volRT.setSize(Math.max(2, W >> 2), Math.max(2, Hh >> 2));
  composer.setPixelRatio(pr); composer.setSize(w, h);
  combinePass.uniforms.uAOTexel.value.set(2 / W, 2 / Hh);
  dofPass.uniforms.uTexel.value.set(1 / W, 1 / Hh).multiplyScalar(Hh / 1080 * 3.2);
  fxaaPass.material.uniforms.resolution.value.set(1 / W, 1 / Hh);
  motesScale.value = Hh;
}
addEventListener('resize', resize); resize();

// ---------------------------------------------------------------- loop
const clock = new THREE.Clock(), fpsEl = document.getElementById('fps'), infoEl = document.getElementById('info');
const _v = new THREE.Vector3(), _t = new THREE.Vector3();
let frames = 0, acc = 0, slow = 0;
function tick() {
  const dt = Math.min(clock.getDelta(), 0.05), t = (U.time.value += dt);
  controls.update();
  sky.position.copy(camera.position);
  U.sunView.value.copy(SUN_DIR).transformDirection(camera.matrixWorldInverse);

  // character: hop along the loop
  const st = chrState; st.hop += dt * 2.3; const ph = st.hop % 1, air = ph < 0.62;
  if (air) st.u = (st.u + dt * 0.03) % 1;
  walk.getPointAt(st.u, _v); walk.getTangentAt(st.u, _t);
  const jump = air ? Math.sin(Math.PI * ph / 0.62) : 0, land = air ? 0 : Math.sin(Math.PI * (ph - 0.62) / 0.38);
  const gy = height(_v.x, _v.z), y = gy + jump * 0.42;
  chr.position.set(_v.x, y, _v.z); chr.rotation.y = Math.atan2(_t.x, _t.z);
  const sy = 1 + jump * 0.13 - land * 0.2, sxz = 1 / Math.sqrt(sy);
  squash.scale.set(sxz, sy, sxz);
  const vy = (y - st.lastY) / Math.max(dt, 1e-3); st.lastY = y;
  st.sv += (-90 * (st.sa + vy * 0.12) - 9 * st.sv) * dt; st.sa += st.sv * dt; sprout.rotation.x = clamp(st.sa, -1, 1);
  st.blink -= dt; const bl = st.blink < 0.12 ? 0.12 : 1.15; if (st.blink < 0) st.blink = 2 + Math.random() * 3;
  eyes.forEach(e => e.scale.y = bl);
  U.player.value.set(_v.x, gy, _v.z);

  rotor.rotation.z += dt * 0.7 * W.wind;
  clouds.rotation.y += dt * 0.006 * W.wind;
  for (const b of butterflies) {
    const a = t * b.sp + b.ph, x = b.c.x + Math.sin(a) * 1.8 + Math.sin(a * 2.3) * 0.5, z = b.c.z + Math.cos(a * 0.8) * 1.8;
    b.g.position.set(x, Math.max(height(x, z), WATER_Y) + 0.9 + Math.sin(a * 3.1) * 0.3, z);
    b.g.rotation.y = Math.atan2(Math.cos(a) * 1.8, -Math.sin(a * 0.8) * 1.44);
    const f = Math.sin(t * 16 + b.ph) * 0.9; b.l.rotation.z = f; b.r.rotation.z = -f;
  }
  dofPass.uniforms.uFocus.value = camera.position.distanceTo(controls.target);
  dofPass.uniforms.uRange.value = dofPass.uniforms.uFocus.value * 0.5;

  updateWeather(dt);
  renderer.info.reset();
  renderer.setRenderTarget(rtScene); renderer.render(scene, camera);
  const calls = renderer.info.render.calls, tris = renderer.info.render.triangles;
  if (combinePass.uniforms.uAO.value > 0) { renderer.setRenderTarget(aoRT); aoQuad.render(renderer); }
  if (combinePass.uniforms.uVolOn.value > 0 && sun.shadow.map) { volMat.uniforms.tShadow.value = sun.shadow.map.texture; renderer.setRenderTarget(volRT); volQuad.render(renderer); }
  renderer.setRenderTarget(null);
  composer.render(dt);

  frames++; acc += dt;
  if (acc >= 1) {
    const fps = frames / acc; frames = 0; acc = 0;
    fpsEl.textContent = fps.toFixed(0) + ' fps';
    infoEl.textContent = `${calls} lệnh vẽ · ${(tris / 1000).toFixed(0)}k tam giác · ${Math.round(resScale * 100)}%`;
    if (qs.get('dyn') !== '0') {
      if (fps < 42) { if (++slow >= 2 && resScale > 0.6) { resScale = Math.max(0.6, resScale - 0.1); slow = 0; resize(); } }
      else { slow = 0; if (fps > 57 && resScale < 1) { resScale = Math.min(1, resScale + 0.05); resize(); } }
    }
  }
  requestAnimationFrame(tick);
}
renderer.compile(scene, camera);
requestAnimationFrame(() => { tick(); const l = document.getElementById('loading'); l.style.opacity = 0; setTimeout(() => l.remove(), 700); });
