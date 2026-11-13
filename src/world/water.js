import * as THREE from 'three';
import { POND, STREAM, WATER_Y, height } from './layout.js';
import { clamp, lerp, rnd } from '../core/util.js';
import { SKY, SUN_DIR, U, motesScale, scene } from '../core/stage.js';
import { world } from './island.js';

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
