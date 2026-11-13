// Co dai va hoa dai cua thung lung. The gioi qua rong de trai co khap noi, nen co chi song trong mot o vuong quanh
// nguoi choi: moi la co co vi tri co dinh trong the gioi va "quan" lai theo o (nhu hat mua), cao do lay tu ban do do cao.
// Ra gan mep o thi co thap dan ve 0; mau nen dat trung mau co nen khong thay duong ranh.
import * as THREE from 'three';
import { U, scene } from '../core/stage.js';
import { Q } from '../core/quality.js';
import { rnd } from '../core/util.js';
import { CELLS, SIZE, heightTexture } from './terrain.js';

const TILE = 72;                       // canh o co (m)
const FLOWER_SHARE = 0.07;             // so hoa so voi so la co

const COMMON = /* glsl */`
  uniform float uWindT, uWind, uTile, uSize, uCells; uniform vec2 uCenter; uniform sampler2D uHeight; uniform vec3 uPlayer;
  attribute vec3 aSeed;
  // noi suy theo dung hai tam giac cua moi o luoi (duong cheo b-c), giong groundAt trong terrain.js
  float groundH(vec2 p){
    vec2 g = clamp((p + uSize * 0.5) / (uSize / uCells), vec2(0.), vec2(uCells - 0.001)); ivec2 i = ivec2(floor(g)); vec2 t = g - vec2(i);
    float a = texelFetch(uHeight, i, 0).r, b = texelFetch(uHeight, i + ivec2(1, 0), 0).r, c = texelFetch(uHeight, i + ivec2(0, 1), 0).r, d = texelFetch(uHeight, i + ivec2(1, 1), 0).r;
    return t.x + t.y <= 1. ? a + (b - a) * t.x + (c - a) * t.y : d + (c - d) * (1. - t.x) + (b - d) * (1. - t.y);
  }
  vec2 wrapped(){ return (fract(aSeed.xz - uCenter / uTile + 0.5) - 0.5) * uTile + uCenter; }
  float edgeFade(vec2 base){ return 1. - smoothstep(uTile * 0.34, uTile * 0.49, length(base - uCenter)); }
`;
const FRAG_TAIL = /* glsl */`
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
`;

function sharedUniforms(center) {
  return { ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog), uWindT: U.windT, uWind: U.wind, uDim: U.dim, uPlayer: U.player, uCenter: { value: center },
    uTile: { value: TILE }, uSize: { value: SIZE }, uCells: { value: CELLS }, uHeight: { value: heightTexture } };
}
function instanced(base, count) {
  const g = new THREE.InstancedBufferGeometry(); g.index = base.index; g.setAttribute('position', base.attributes.position);
  const seed = new Float32Array(count * 3); for (let i = 0; i < seed.length; i++) seed[i] = rnd();
  g.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seed, 3)); g.instanceCount = count;
  return g;
}

export function createGrass() {
  const center = new THREE.Vector2(), group = new THREE.Group(); scene.add(group);

  const blade = new THREE.PlaneGeometry(1, 1, 1, 3); blade.translate(0, 0.5, 0);
  const bp = blade.attributes.position;
  for (let i = 0; i < bp.count; i++) bp.setX(i, bp.getX(i) * (1 - Math.pow(bp.getY(i), 1.6)));
  const blades = new THREE.Mesh(instanced(blade, Q.grass), new THREE.ShaderMaterial({
    side: THREE.DoubleSide, fog: true, uniforms: sharedUniforms(center),
    vertexShader: /* glsl */`
      #include <common>
      #include <fog_pars_vertex>
      ${COMMON}
      varying float vH; varying vec3 vCol;
      void main(){
        vec2 base = wrapped(); float fade = edgeFade(base), straw = step(0.965, fract(aSeed.y * 13.7));
        float tall = (0.30 + 0.34 * fract(aSeed.y * 7.3)) * mix(1., 1.8, straw) * fade;
        float ang = aSeed.y * 6.2831, c = cos(ang), s = sin(ang);
        vec3 p = vec3(position.x * 0.085, position.y * tall, position.y * position.y * tall * 0.25);
        vec3 w = vec3(base.x + p.x * c - p.z * s, groundH(base) + p.y, base.y + p.x * s + p.z * c);
        float g = sin(base.x * 0.11 + base.y * 0.07 + uWindT * 1.3) * 0.6 + sin(base.x * 0.031 - base.y * 0.05 + uWindT * 0.6) * 0.8 + sin(base.x * 0.9 + base.y * 1.3 + uWindT * 3.) * 0.12;
        float bend = position.y * position.y * tall * 1.5, ws = min(uWind, 2.4);
        w.x += (g * 0.16 + 0.05 + (ws - 1.) * 0.1) * bend * ws; w.z += g * 0.09 * bend * ws;
        vec2 dp = base - uPlayer.xz; float push = smoothstep(1.2, 0.15, length(dp)) * position.y * position.y;
        w.xz += normalize(dp + 1e-4) * push * 0.45; w.y -= push * 0.18;
        vH = position.y;
        // moi la mot sac xanh rieng (tu xanh dam toi xanh non) de thay ro tung net; vai la kho mau rom
        float hue = fract(aSeed.y * 3.7);
        vec3 green = hue < 0.5 ? mix(vec3(0.20, 0.52, 0.16), vec3(0.38, 0.72, 0.22), hue * 2.) : mix(vec3(0.38, 0.72, 0.22), vec3(0.66, 0.88, 0.34), hue * 2. - 1.);
        vCol = pow(mix(green, vec3(0.74, 0.76, 0.40), straw), vec3(2.2)); // sRGB -> tuyen tinh
        vec4 mvPosition = viewMatrix * vec4(w, 1.);
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: /* glsl */`
      #include <common>
      #include <fog_pars_fragment>
      uniform float uDim; varying float vH; varying vec3 vCol;
      void main(){
        gl_FragColor = vec4(vCol * mix(0.55, 1.1, vH) * uDim, 1.);
        ${FRAG_TAIL}
      }`,
  }));

  const petal = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  const flowers = new THREE.Mesh(instanced(petal, Math.round(Q.grass * FLOWER_SHARE)), new THREE.ShaderMaterial({
    side: THREE.DoubleSide, fog: true, uniforms: sharedUniforms(center),
    vertexShader: /* glsl */`
      #include <common>
      #include <fog_pars_vertex>
      ${COMMON}
      varying vec3 vCol; varying vec2 vUv2;
      void main(){
        vec2 base = wrapped();
        // hoa moc thanh mang: mat na theo vi tri the gioi
        float patch = sin(base.x * 0.045) * sin(base.y * 0.05 + 1.3) + 0.6 * sin(base.x * 0.013 + base.y * 0.017 + 2.);
        float on = smoothstep(0.05, 0.3, patch) * edgeFade(base);
        float size = (0.10 + 0.08 * fract(aSeed.y * 5.1)) * on;
        float sway = sin(base.x * 0.11 + base.y * 0.07 + uWindT * 1.3) * 0.06 * min(uWind, 2.4);
        vec3 w = vec3(base.x + position.x * size + sway, groundH(base) + 0.36 + 0.2 * fract(aSeed.y * 9.7), base.y + position.z * size);
        float k = fract(aSeed.y * 17.3);
        vCol = pow(k < 0.62 ? vec3(1.0, 0.97, 0.72) : k < 0.86 ? vec3(1.0) : k < 0.95 ? vec3(1.0, 0.72, 0.80) : vec3(1.0, 0.85, 0.25), vec3(2.2)); // sRGB -> tuyen tinh
        vUv2 = position.xz;
        vec4 mvPosition = viewMatrix * vec4(w, 1.);
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: /* glsl */`
      #include <common>
      #include <fog_pars_fragment>
      uniform float uDim; varying vec3 vCol; varying vec2 vUv2;
      void main(){
        if (length(vUv2) > 0.5) discard;
        gl_FragColor = vec4(vCol * uDim, 1.);
        ${FRAG_TAIL}
      }`,
  }));
  blades.frustumCulled = flowers.frustumCulled = false;
  group.add(blades, flowers);
  return { group, setCenter(x, z) { center.set(x, z); } };
}
