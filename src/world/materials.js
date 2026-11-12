import * as THREE from 'three';
import { U } from '../core/stage.js';

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

export { MATS, patchBacklight, toon };
