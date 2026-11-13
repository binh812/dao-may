import * as THREE from 'three';
import { Q } from '../core/quality.js';
import { U, motesScale, scene } from '../core/stage.js';

// Bo sinh so rieng: hat mua/tuyet khong duoc tieu chuoi so ngau nhien dung de dung canh,
// neu khong thu tu nap module se lam doi bo cuc cua the gioi.
let seedState = 20261113;
const rnd = () => { seedState |= 0; seedState = seedState + 0x6D2B79F5 | 0; let t = Math.imul(seedState ^ seedState >>> 15, 1 | seedState); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };

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

export { rainMesh, snowFlakes, windLeaves };
