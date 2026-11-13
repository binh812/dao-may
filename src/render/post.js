import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';
import { Q } from '../core/quality.js';
import { SUN_DIR, U, camera, renderer, sun } from '../core/stage.js';
import { realm } from '../world/realm.js';

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

// Net co: bo loc Kuwahara chon vung it bien dong nhat quanh moi diem anh, lam hinh tron lai thanh tung mang nhu son.
// Chi bat o the gioi co phong cach tranh ve (realm.paint) va khi muc do hoa cho phep. Bau troi duoc de nguyen.
const PAINT_STEP = 1.35;
const paintPass = new ShaderPass(new THREE.ShaderMaterial({
  defines: { RADIUS: Math.max(Q.paintRadius, 1) },
  uniforms: { tDiffuse: { value: null }, tDepth: { value: rtScene.depthTexture }, uTexel: { value: new THREE.Vector2() } },
  vertexShader: VS,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse, tDepth; uniform vec2 uTexel; varying vec2 vUv;
    void region(vec2 dir, inout vec3 best, inout float bestVar){
      vec3 sum = vec3(0.), sq = vec3(0.);
      for (int i = 0; i <= RADIUS; i++) for (int j = 0; j <= RADIUS; j++) {
        vec3 c = texture2D(tDiffuse, vUv + vec2(float(i), float(j)) * dir * uTexel).rgb; sum += c; sq += c * c;
      }
      float n = float((RADIUS + 1) * (RADIUS + 1)); vec3 mean = sum / n; float variance = dot(sq / n - mean * mean, vec3(1.));
      if (variance < bestVar) { bestVar = variance; best = mean; }
    }
    void main(){
      vec4 src = texture2D(tDiffuse, vUv);
      if (texture2D(tDepth, vUv).x >= 0.99999) { gl_FragColor = src; return; }
      vec3 best = src.rgb; float bestVar = 1e9;
      region(vec2(1., 1.), best, bestVar); region(vec2(-1., 1.), best, bestVar); region(vec2(1., -1.), best, bestVar); region(vec2(-1., -1.), best, bestVar);
      gl_FragColor = vec4(best, src.a);
    }`,
}));
paintPass.enabled = Boolean(realm.paint) && Q.paintRadius > 0;
paintPass.setSize = (width, height) => paintPass.uniforms.uTexel.value.set(PAINT_STEP / width, PAINT_STEP / height);
composer.addPass(paintPass);
const fxaaPass = new ShaderPass(FXAAShader);
composer.addPass(fxaaPass);

export { aoQuad, aoRT, bloomPass, combinePass, composer, dofPass, fxaaPass, paintPass, rtScene, volMat, volQuad, volRT };
