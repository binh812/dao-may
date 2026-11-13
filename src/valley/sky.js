// Bau troi thung lung: xanh tham, may tich khong lo dung tu chan troi voi dinh trang phang va than xam lam.
import * as THREE from 'three';
import { SUN_DIR, U, renderer, scene } from '../core/stage.js';

const FRAGMENT = /* glsl */`
  uniform vec3 uSunDir; uniform float uTime, uDisc, uOvercast, uNight, uFlash;
  varying vec3 vDir;
  float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
  float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f);
    return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y); }
  float fbm(vec2 p){ float a = .5, s = 0.; for (int i = 0; i < 5; i++){ s += a * vnoise(p); p = p * 2.03 + 17.; a *= .5; } return s; }
  void main(){
    vec3 d = normalize(vDir); float h = d.y;
    vec3 zenith = vec3(0.10, 0.36, 0.80), horizon = vec3(0.42, 0.70, 0.95), haze = vec3(0.74, 0.87, 0.97);
    vec3 col = mix(horizon, zenith, pow(smoothstep(0., 0.8, max(h, 0.)), 0.6));
    col = mix(col, haze, smoothstep(0.10, -0.02, h));
    float sd = max(dot(d, uSunDir), 0.);
    col += vec3(1.0, 0.96, 0.86) * (pow(sd, 14.) * 0.07 + smoothstep(0.9992, 0.9997, sd) * uDisc * 22.);

    // may tich: moi huong mot "cot may" cao thap khac nhau, mep lon nhon, dinh trang phang, than xam lam
    vec2 ring = normalize(d.xz + 1e-5);
    // "cuon" tron: 1 - |2n - 1| cho cac u tron thay vi dinh nhon
    float billow = (1. - abs(2. * vnoise(ring * 3.2 + 3.) - 1.)) * 0.55 + (1. - abs(2. * vnoise(ring * 7.5 + 11.) - 1.)) * 0.28 + (1. - abs(2. * vnoise(ring * 17. + 5.) - 1.)) * 0.14;
    float tower = fbm(ring * 1.6 + 3.) * 0.8 + billow * 0.55;
    float top = 0.04 + smoothstep(0.38, 0.95, tower) * 0.56;
    float lumps = fbm(ring * 9. + vec2(h * 13., h * 7.));
    float edge = (lumps - 0.5) * 0.09 + (fbm(ring * 24. + h * 30.) - 0.5) * 0.03;
    float body = smoothstep(top + edge + 0.004, top + edge - 0.004, h) * step(-0.03, h) * step(0.06, top);
    float depth = clamp((top - h) / max(top, 0.05), 0., 1.);                 // 0 o dinh, 1 o day
    float shade = smoothstep(0.10, 0.24, depth * 0.8 + (lumps - 0.5) * 0.5);
    vec3 cloud = mix(vec3(0.98, 0.99, 1.0), vec3(0.57, 0.67, 0.84), shade);
    cloud = mix(cloud, vec3(0.80, 0.86, 0.95), smoothstep(0.75, 1.0, depth) * 0.6);   // day may tan vao suong
    col = mix(col, cloud, body);

    vec3 grey = vec3(0.50, 0.56, 0.63) * (0.8 + 0.25 * lumps) * (1. - 2.0 * max(uOvercast - 1., 0.));
    col = mix(col, grey, min(uOvercast, 1.) * 0.9);
    vec3 night = mix(vec3(0.05, 0.09, 0.20), vec3(0.008, 0.015, 0.06), pow(max(h, 0.), 0.5)) + body * vec3(0.05, 0.06, 0.10);
    vec2 sg = d.xz / (abs(h) + 0.35) * 70.; float st = hash(floor(sg));
    night += step(0.985, st) * smoothstep(0.5, 0.1, length(fract(sg) - .5)) * (0.6 + 0.4 * sin(uTime * 2. + st * 40.)) * vec3(0.9, 0.95, 1.0) * 1.7 * step(0., h) * (1. - body);
    col = mix(col, night, uNight) + uFlash * vec3(0.55, 0.60, 0.78);
    gl_FragColor = vec4(col, 1.);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`;

function material(disc) {
  return new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { uSunDir: { value: SUN_DIR }, uTime: U.time, uDisc: { value: disc }, uOvercast: U.overcast, uNight: U.night, uFlash: U.flash },
    vertexShader: `varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); gl_Position.z = gl_Position.w; }`,
    fragmentShader: FRAGMENT,
  });
}

export function createSky() {
  const sky = new THREE.Mesh(new THREE.SphereGeometry(60, 48, 24), material(1));
  sky.renderOrder = -10; sky.frustumCulled = false; scene.add(sky);
  const envScene = new THREE.Scene(); envScene.add(new THREE.Mesh(new THREE.SphereGeometry(10, 32, 16), material(0)));
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(envScene, 0, 0.1, 50).texture; scene.environmentIntensity = 0.4;
  pmrem.dispose();
  return sky;
}
