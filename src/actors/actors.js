import * as THREE from 'three';
import { U, scene } from '../core/stage.js';
import { rnd } from '../core/util.js';
import { blossomCrowns } from '../world/flora.js';
import { motesScale } from '../world/meadow.js';

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

export { butterflies, chr, chrState, eyes, sprout, squash, walk };
