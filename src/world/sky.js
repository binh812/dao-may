import * as THREE from 'three';
import { SKY, SUN_DIR, U, renderer, scene } from '../core/stage.js';

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

export { sky };
