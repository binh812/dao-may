// Bau troi thung lung: xanh tham voi may tich co khoi that (dinh trang bat nang, than xam lam, day phang).
// May duoc "nuong" mot lan luc mo game: dung tia di xuyen mot lop may 3D (nhieu lay tu texture 3D) roi ghi vao mot
// tam anh toan canh. Luc choi chi con mot lan doc texture cho moi diem anh, nen dien thoai khong ton gi them;
// may troi bang cach xoay cham tam anh quanh truc dung.
import * as THREE from 'three';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import { SUN_DIR, U, renderer, scene } from '../core/stage.js';
import { tierName } from '../core/quality.js';

const NOISE_SIZE = 64;                                   // canh texture nhieu 3D
const BAKE = {                                           // do phan giai anh may va so buoc tia theo muc do hoa
  low: { width: 1024, height: 384, steps: 36 },
  medium: { width: 1536, height: 512, steps: 48 },
  high: { width: 2048, height: 768, steps: 64 },
}[tierName];
const PAINT_BACK_LEAN = 0.9;                             // do nghieng ra phia sau cua anh sang ve may (0 = thang tu tren xuong)
const BAKE_STRIPS = 8;                                   // nuong tung dai de khong co lenh ve nao qua lau
const DRIFT_PER_SECOND = 0.00035;                        // vong/giay khi gio = 1 (mot vong mat khoang 48 phut)

function noiseTexture() {
  let seed = 20261113;
  const next = () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const data = new Uint8Array(NOISE_SIZE ** 3);
  for (let i = 0; i < data.length; i++) data[i] = Math.floor(next() * 256);
  const texture = new THREE.Data3DTexture(data, NOISE_SIZE, NOISE_SIZE, NOISE_SIZE);
  texture.format = THREE.RedFormat; texture.type = THREE.UnsignedByteType;
  texture.minFilter = texture.magFilter = THREE.LinearFilter;
  texture.wrapS = texture.wrapT = texture.wrapR = THREE.RepeatWrapping; texture.unpackAlignment = 1; texture.needsUpdate = true;
  return texture;
}

const BAKE_FRAGMENT = /* glsl */`
  precision highp float; precision highp sampler3D;
  uniform sampler3D uNoise; uniform float uBackLean; varying vec2 vUv;
  const float BASE = 1.0, TOP = 3.0, SPAN = 14.0, LIGHT_STEP = 0.19;
  // nhieu gia tri muot: lam tron phan le truoc khi de GPU noi suy
  float n3(vec3 p){ p *= ${NOISE_SIZE.toFixed(1)}; vec3 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return textureLod(uNoise, (i + f + 0.5) / ${NOISE_SIZE.toFixed(1)}, 0.).r; }
  float density(vec3 p){
    float cover = n3(vec3(p.x, 0., p.z) / 230.) * 0.62 + n3(vec3(p.x + 40., 7., p.z) / 95.) * 0.38;    // dong may lon nho
    float hf = clamp((p.y - BASE) / (TOP - BASE), 0., 1.);
    float billow = 1. - abs(2. * n3(p / 44.) - 1.);
    float shape = (cover - 0.60) * 9.0 - pow(hf, 1.5) * 1.4 + billow * 0.50 + (1. - abs(2. * n3(p / 19. + 1.7) - 1.)) * 0.40 - 0.50;
    float erode = (n3(p / 30. + 3.) - 0.5) * 0.40 + (n3(p / 13. + 9.) - 0.5) * 0.20;
    return clamp((shape - erode) * 6., 0., 1.) * step(BASE, p.y);
  }
  void main(){
    float y = vUv.y * vUv.y, a = vUv.x * 6.2831853, r = sqrt(max(1. - y * y, 0.));
    vec3 d = vec3(cos(a) * r, max(y, 0.004), sin(a) * r);
    float t0 = BASE / d.y, t1 = min(TOP / d.y, t0 + SPAN), dt = (t1 - t0) / float(STEPS);
    // anh sang ve may: tu phia sau dam may chech len tren, nen nhin huong nao may cung co vien trang o dinh va than xam lam
    vec3 light = normalize(vec3(cos(a) * uBackLean, 1., sin(a) * uBackLean));
    // Ghi cac dai luong tron (do sang, do cao trong may, do mo vi xa, do day) chu khong ghi mau: luc ve se cat nguong
    // de co mep sac net nhu net co du anh nuong co do phan giai thap.
    vec3 sum = vec3(0.); float alpha = 0.;
    for (int i = 0; i < STEPS; i++) {
      float t = t0 + (float(i) + 0.5) * dt; vec3 p = d * t;
      float dens = density(p);
      float shadow = 0.;
      for (int k = 1; k <= 4; k++) shadow += density(p + light * LIGHT_STEP * float(k) * (1. + 0.4 * float(k)));
      float hf = clamp((p.y - BASE) / (TOP - BASE), 0., 1.);
      float ai = clamp(dens * dt * 5., 0., 1.) * (1. - alpha);
      sum += vec3(exp(-shadow * 0.8), hf, 1. - exp(-t * 0.02)) * ai; alpha += ai;
    }
    vec3 fields = mix(vec3(1., 0.6, 1. - exp(-t0 * 0.02)), sum / max(alpha, 1e-4), smoothstep(0., 0.05, alpha));
    gl_FragColor = vec4(fields, alpha * (1. - smoothstep(26., 44., t0)));   // may rat xa tan vao chan troi
  }`;

function bakeClouds() {
  const target = new THREE.WebGLRenderTarget(BAKE.width, BAKE.height, { depthBuffer: false, generateMipmaps: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, wrapS: THREE.RepeatWrapping });
  const noise = noiseTexture();
  const quad = new FullScreenQuad(new THREE.ShaderMaterial({
    defines: { STEPS: BAKE.steps }, uniforms: { uNoise: { value: noise }, uBackLean: { value: PAINT_BACK_LEAN } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }', fragmentShader: BAKE_FRAGMENT,
  }));
  const previous = renderer.getRenderTarget(), stripWidth = Math.ceil(BAKE.width / BAKE_STRIPS);
  target.scissorTest = true;
  for (let i = 0; i < BAKE_STRIPS; i++) {
    target.scissor.set(i * stripWidth, 0, stripWidth, BAKE.height);
    renderer.setRenderTarget(target); quad.render(renderer);
    renderer.getContext().flush();
  }
  target.scissorTest = false;
  renderer.setRenderTarget(previous);
  quad.material.dispose(); quad.dispose(); noise.dispose();
  return target.texture;
}

const FRAGMENT = /* glsl */`
  uniform vec3 uSunDir; uniform float uTime, uDisc, uOvercast, uNight, uFlash, uDrift; uniform sampler2D uClouds;
  varying vec3 vDir;
  float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
  float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f);
    return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y); }
  void main(){
    vec3 d = normalize(vDir); float h = d.y;
    vec3 zenith = vec3(0.09, 0.34, 0.80), horizon = vec3(0.36, 0.66, 0.95), haze = vec3(0.74, 0.87, 0.97);
    vec3 col = mix(horizon, zenith, pow(smoothstep(0., 0.75, max(h, 0.)), 0.6));
    col = mix(col, haze, smoothstep(0.09, -0.02, h));
    float sd = max(dot(d, uSunDir), 0.);
    col += vec3(1.0, 0.96, 0.86) * (pow(sd, 14.) * 0.07 + smoothstep(0.9992, 0.9997, sd) * uDisc * 22.);

    // may: doc cac dai luong da nuong roi cat nguong thanh ba mang mau (trang nang, xam lam sang, xam lam dam) nhu tranh ve
    vec2 cuv = vec2(atan(d.z, d.x) * 0.15915494 + uDrift, sqrt(clamp(h, 0., 1.)));
    vec4 cloud = textureLod(uClouds, cuv, 0.);
    float wobble = (vnoise(cuv * vec2(700., 200.)) - 0.5) * 0.10 + (vnoise(cuv * vec2(2200., 600.)) - 0.5) * 0.04, soft = (vnoise(cuv * vec2(300., 90.)) - 0.5) * 0.03;
    float body = smoothstep(0.40, 0.47, cloud.a + wobble * 0.6) * step(0., h);
    // mau viet theo sRGB (nhu nhin tren man hinh) roi doi sang tuyen tinh
    vec3 shade = pow(mix(vec3(0.50, 0.61, 0.81), vec3(0.62, 0.73, 0.90), smoothstep(0.05, 0.6, cloud.g + soft)), vec3(2.2));
    vec3 cloudCol = mix(shade, pow(vec3(0.76, 0.83, 0.94), vec3(2.2)), smoothstep(0.05, 0.08, cloud.r + soft));
    cloudCol = mix(cloudCol, vec3(1.0, 0.995, 0.97), smoothstep(0.17, 0.20, cloud.r + soft));
    cloudCol = mix(cloudCol, haze, cloud.b * 0.85);
    col = mix(col, cloudCol, body);

    float lumps = vnoise(d.xz / (abs(h) + 0.3) * 2.2 + uTime * 0.01) * 0.6 + vnoise(d.xz / (abs(h) + 0.3) * 5.3) * 0.4;
    vec3 grey = vec3(0.50, 0.56, 0.63) * (0.8 + 0.25 * lumps) * (1. - 2.0 * max(uOvercast - 1., 0.));
    col = mix(col, grey, min(uOvercast, 1.) * 0.9);
    vec3 night = mix(vec3(0.05, 0.09, 0.20), vec3(0.008, 0.015, 0.06), pow(max(h, 0.), 0.5));
    night = mix(night, cloudCol * vec3(0.10, 0.13, 0.22), body);
    vec2 sg = d.xz / (abs(h) + 0.35) * 70.; float st = hash(floor(sg));
    night += step(0.985, st) * smoothstep(0.5, 0.1, length(fract(sg) - .5)) * (0.6 + 0.4 * sin(uTime * 2. + st * 40.)) * vec3(0.9, 0.95, 1.0) * 1.7 * step(0., h) * (1. - body);
    col = mix(col, night, uNight) + uFlash * vec3(0.55, 0.60, 0.78);
    gl_FragColor = vec4(col, 1.);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`;

function material(disc, clouds, drift) {
  return new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { uSunDir: { value: SUN_DIR }, uTime: U.time, uDisc: { value: disc }, uOvercast: U.overcast, uNight: U.night, uFlash: U.flash, uClouds: { value: clouds }, uDrift: drift },
    vertexShader: `varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); gl_Position.z = gl_Position.w; }`,
    fragmentShader: FRAGMENT,
  });
}

/** Dung bau troi; tra ve luoi bau troi va ham cho may troi theo gio. */
export function createSky() {
  const clouds = bakeClouds(), drift = { value: 0 };
  const sky = new THREE.Mesh(new THREE.SphereGeometry(60, 48, 24), material(1, clouds, drift));
  sky.renderOrder = -10; sky.frustumCulled = false; scene.add(sky);
  const envScene = new THREE.Scene(); envScene.add(new THREE.Mesh(new THREE.SphereGeometry(10, 32, 16), material(0, clouds, drift)));
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(envScene, 0, 0.1, 50).texture; scene.environmentIntensity = 0.4;
  pmrem.dispose();
  return { mesh: sky, drift(dt, wind) { drift.value = (drift.value + dt * DRIFT_PER_SECOND * wind) % 1; } };
}
