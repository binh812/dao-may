// Hinh anh cua Bong Lang va hieu ung tran dau. Chi doc trang thai tu battle-core.js, khong chua luat.
import * as THREE from 'three';
import { BATTLE } from './battle-core.js';

const BODY_RADIUS = 0.7, BAR_WIDTH = 1.3, BAR_Y = 1.75, GRAVITY = 9, BURST_LIFE = 1.3;
const FLOWER_COLORS = [0xff8fb8, 0xffd84d, 0xffffff, 0xb692ff, 0xff7a59, 0x8fe07a];

export function createEnemyViews(scene, makeToon, groundAt) {
  const root = new THREE.Group(); scene.add(root);
  const bodyGeo = new THREE.SphereGeometry(BODY_RADIUS, 24, 16), eyeGeo = new THREE.SphereGeometry(0.09, 10, 8), bitGeo = new THREE.SphereGeometry(0.09, 8, 6);
  const bodyMat = makeToon({ vertexColors: false, color: 0x9b96b4 }), eyeMat = new THREE.MeshBasicMaterial({ color: 0x2a2433 });
  const barBack = new THREE.MeshBasicMaterial({ color: 0x2a2433, transparent: true, opacity: 0.55, depthTest: false });
  const barFill = new THREE.MeshBasicMaterial({ color: 0xffd04a, depthTest: false });
  const warnMat = new THREE.MeshBasicMaterial({ color: 0xff5a4a, transparent: true, opacity: 0.3, depthWrite: false });
  const beamMat = new THREE.MeshBasicMaterial({ color: 0xffe9a0, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const bitMats = FLOWER_COLORS.map((c) => new THREE.MeshBasicMaterial({ color: c }));
  const leafMat = new THREE.MeshBasicMaterial({ color: 0x6fd65a });
  const views = new Map(), transient = [];

  function addView(enemy) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(bodyGeo, bodyMat); body.scale.set(1, 0.82, 1); body.position.y = BODY_RADIUS * 0.82; body.castShadow = true;
    const eyes = [-0.24, 0.24].map((x) => { const e = new THREE.Mesh(eyeGeo, eyeMat); e.position.set(x, 0.68, 0.6); e.scale.set(1.5, 0.25, 0.6); g.add(e); return e; });
    const bar = new THREE.Group(); bar.position.y = BAR_Y;
    const back = new THREE.Mesh(new THREE.PlaneGeometry(BAR_WIDTH, 0.16), barBack), fill = new THREE.Mesh(new THREE.PlaneGeometry(BAR_WIDTH - 0.06, 0.1), barFill);
    back.renderOrder = 20; fill.renderOrder = 21; fill.position.z = 0.01; bar.add(back, fill);
    const warn = new THREE.Mesh(new THREE.CircleGeometry(BATTLE.attackRadius, 40).rotateX(-Math.PI / 2), warnMat.clone()); warn.visible = false; warn.renderOrder = 5;
    g.add(body, bar); root.add(g, warn);
    views.set(enemy.id, { g, body, eyes, bar, fill, warn, phase: Math.random() * 6 });
  }

  function burst(x, y, z, count, mats, speed) {
    for (let i = 0; i < count; i++) {
      const m = new THREE.Mesh(bitGeo, mats[i % mats.length]); m.position.set(x, y, z); root.add(m);
      const a = Math.random() * Math.PI * 2, up = 2.5 + Math.random() * 3;
      transient.push({ mesh: m, life: BURST_LIFE, vx: Math.cos(a) * speed * Math.random(), vy: up, vz: Math.sin(a) * speed * Math.random(), kind: 'bit' });
    }
  }

  return {
    /** Dong bo danh sach hinh voi danh sach dich cua mot tran moi. */
    reset(battle) {
      for (const v of views.values()) { root.remove(v.g, v.warn); }
      views.clear();
      battle.enemies.forEach(addView);
    },
    /** Bong Lang thuc giac: bien mat trong mot chum hoa. */
    wake(enemy) {
      const v = views.get(enemy.id); if (!v) return;
      root.remove(v.g, v.warn); views.delete(enemy.id);
      burst(enemy.x, groundAt(enemy.x, enemy.z) + 0.7, enemy.z, 18, bitMats, 3.2);
    },
    /** Tia nang doi xuong muc tieu; bac cang cao tia cang to. */
    beam(enemy, tier) {
      const r = 0.35 + 0.3 * Math.max(tier, 0.4), mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.6, 14, 16, 1, true), beamMat.clone());
      mesh.position.set(enemy.x, groundAt(enemy.x, enemy.z) + 7, enemy.z); root.add(mesh);
      transient.push({ mesh, life: 0.55, kind: 'beam', ownMaterial: true, ownGeometry: true });
    },
    /** La bay tu Mam toi muc tieu. */
    leaf(from, enemy) {
      const mesh = new THREE.Mesh(bitGeo, leafMat); mesh.scale.set(1.6, 0.5, 1.1); root.add(mesh);
      const y1 = groundAt(enemy.x, enemy.z) + 0.7;
      transient.push({ mesh, life: 0.2, total: 0.2, kind: 'leaf', x0: from.x, y0: from.y + 0.8, z0: from.z, x1: enemy.x, y1, z1: enemy.z });
    },
    /** Don cua Bong Lang cham dat: bui tung len. */
    strike(x, z) { burst(x, groundAt(x, z) + 0.2, z, 8, [barBack], 2.4); },
    update(dt, time, battle, camera) {
      for (const enemy of battle.enemies) {
        const v = views.get(enemy.id); if (!v) continue;
        const ratio = enemy.wake / enemy.maxWake, ground = groundAt(enemy.x, enemy.z);
        v.g.position.set(enemy.x, ground + Math.abs(Math.sin(time * 1.6 + v.phase)) * 0.12, enemy.z);
        v.body.scale.y = 0.82 + Math.sin(time * 2 + v.phase) * 0.04;
        v.g.rotation.y = Math.atan2(camera.position.x - enemy.x, camera.position.z - enemy.z);
        v.eyes.forEach((e) => { e.scale.y = 0.25 + ratio * 0.9; });
        v.bar.quaternion.copy(camera.quaternion).premultiply(v.g.quaternion.clone().invert());
        v.fill.scale.x = Math.max(ratio, 0.001); v.fill.position.x = -(BAR_WIDTH - 0.06) * (1 - ratio) / 2;
        const a = enemy.attack;
        v.warn.visible = a.phase === 'telegraph';
        if (v.warn.visible) {
          v.warn.position.set(a.x, groundAt(a.x, a.z) + 0.12, a.z);
          v.warn.material.opacity = 0.25 + 0.3 * (0.5 + 0.5 * Math.sin(time * 14));
        }
      }
      for (let i = transient.length - 1; i >= 0; i--) {
        const t = transient[i]; t.life -= dt;
        if (t.kind === 'bit') { t.vy -= GRAVITY * dt; t.mesh.position.x += t.vx * dt; t.mesh.position.y += t.vy * dt; t.mesh.position.z += t.vz * dt; t.mesh.scale.setScalar(Math.max(t.life / BURST_LIFE, 0.01)); }
        else if (t.kind === 'beam') { t.mesh.material.opacity = Math.max(t.life / 0.55, 0) * 0.8; t.mesh.scale.x = t.mesh.scale.z = 0.6 + (1 - t.life / 0.55) * 0.8; }
        else if (t.kind === 'leaf') { const k = 1 - Math.max(t.life, 0) / t.total; t.mesh.position.set(t.x0 + (t.x1 - t.x0) * k, t.y0 + (t.y1 - t.y0) * k + Math.sin(k * Math.PI) * 0.5, t.z0 + (t.z1 - t.z0) * k); t.mesh.rotation.y += dt * 20; }
        if (t.life <= 0) {
          root.remove(t.mesh);
          if (t.ownMaterial) t.mesh.material.dispose();
          if (t.ownGeometry) t.mesh.geometry.dispose();
          transient.splice(i, 1);
        }
      }
    },
  };
}
