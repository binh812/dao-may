import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Q, qs } from './quality.js';

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

// kich thuoc hat theo chieu cao man hinh (app.js cap nhat khi doi kich thuoc)
const motesScale = { value: 1 };

export { SKY, SUN_DIR, U, motesScale, camera, controls, flatAmbient, hemi, lanternLight, renderer, scene, sun };
