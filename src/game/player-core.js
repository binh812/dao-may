// Luat di chuyen cua Mam: chay, nhay, luon, va cham. Module thuan: khong import three.js hay DOM,
// dia hinh duoc tiem vao qua world.heightAt nen chay duoc trong `node --test`.

export const TUNING = Object.freeze({
  runSpeed: 5.2, glideSpeed: 6.4, accel: 28, airAccel: 10,
  gravity: 24, jumpV: 8.6, glideFall: 1.6,
  stepUp: 0.5, coyote: 0.12, radius: 0.45, respawnY: -14, maxStep: 1 / 60,
  sprintAfter: 1.2, sprintRamp: 1.0, sprintStick: 0.9, sprintRelease: 0.6, // giu can gan het co qua sprintAfter giay thi tang toc dan trong sprintRamp giay
});

const GROUND_EPS = 0.05;

export function createPlayer(x, z, world) {
  const ground = world.heightAt(x, z);
  if (!Number.isFinite(ground)) throw new RangeError(`createPlayer: (${x}, ${z}) khong co mat dat de dung`);
  return {
    x, y: ground, z, vx: 0, vy: 0, vz: 0, yaw: 0,
    grounded: true, gliding: false, coyote: 0,
    jumpLatch: false,      // nut nhay dang duoc giu tu lan nhan truoc
    runHeld: 0,            // so giay da giu can gan het co lien tuc (de tang toc)
    glideArmed: false,     // da nha nut sau khi bat nhay, nen giu lan nua la luon
    safeX: x, safeZ: z,
    events: { jumped: false, landed: false, respawned: false },
  };
}

function approach(value, target, maxDelta) {
  return value < target ? Math.min(value + maxDelta, target) : Math.max(value - maxDelta, target);
}

function pushOutOfColliders(s, world) {
  for (const c of world.colliders) {
    const dx = s.x - c.x, dz = s.z - c.z, min = c.r + TUNING.radius, d = Math.hypot(dx, dz);
    if (d >= min) continue;
    if (d < 1e-6) { s.x = c.x + min; continue; } // dung dung tam: day ra theo +x
    s.x = c.x + (dx / d) * min; s.z = c.z + (dz / d) * min;
  }
}

/** Co di toi duoc (x, z) khong: nen khong cao hon chan qua muc cho phep. */
function canEnter(s, world, x, z) {
  // Do o mep than (tam + ban kinh theo huong di) de Mam khong lun nua nguoi vao vach.
  const dx = x - s.x, dz = z - s.z, d = Math.hypot(dx, dz) || 1;
  const limit = s.y + (s.grounded ? TUNING.stepUp : GROUND_EPS);
  for (const reach of [TUNING.radius, 0]) {
    const target = world.heightAt(x + (dx / d) * reach, z + (dz / d) * reach);
    if (Number.isFinite(target) && target > limit) return false; // ngoai mep dao (-Infinity): duoc phep, se roi
  }
  return true;
}

function moveHorizontally(s, world, dt) {
  const nx = s.x + s.vx * dt, nz = s.z + s.vz * dt;
  if (canEnter(s, world, nx, nz)) { s.x = nx; s.z = nz; }
  else if (canEnter(s, world, nx, s.z)) { s.x = nx; s.vz = 0; }
  else if (canEnter(s, world, s.x, nz)) { s.z = nz; s.vx = 0; }
  else { s.vx = 0; s.vz = 0; }
  pushOutOfColliders(s, world);
}

function settleVertically(s, world, dt) {
  s.y += s.vy * dt;
  const ground = world.heightAt(s.x, s.z);
  if (s.y <= ground) {
    if (!s.grounded) s.events.landed = true;
    s.y = ground; s.vy = 0; s.grounded = true; s.gliding = false; s.glideArmed = false;
  } else if (s.grounded) {
    if (s.y - ground <= TUNING.stepUp) s.y = ground;          // xuong doc thoai: bam dat
    else { s.grounded = false; s.coyote = TUNING.coyote; }    // buoc ra khoi mep
  }
}

function respawn(s, world) {
  s.x = s.safeX; s.z = s.safeZ; s.vx = s.vy = s.vz = 0; s.runHeld = 0;
  pushOutOfColliders(s, world);
  const ground = world.heightAt(s.x, s.z);
  s.y = Number.isFinite(ground) ? ground : 0;
  s.grounded = Number.isFinite(ground); s.gliding = false; s.glideArmed = false; s.coyote = 0;
  s.events.respawned = true;
}

function subStep(s, input, dt, world) {
  const pressed = input.jump && !s.jumpLatch;
  if (!input.jump && !s.grounded) s.glideArmed = true;
  s.jumpLatch = input.jump;

  if (pressed && (s.grounded || s.coyote > 0)) {
    s.vy = TUNING.jumpV; s.grounded = false; s.coyote = 0; s.glideArmed = false; s.events.jumped = true;
  } else if (pressed && !s.grounded) {
    s.glideArmed = true; // nhan lai khi dang o tren khong: luon ngay
  }

  if (!s.grounded) {
    s.coyote = Math.max(0, s.coyote - dt);
    s.vy -= TUNING.gravity * dt;
    s.gliding = input.jump && s.glideArmed && s.vy < 0;
    if (s.gliding) s.vy = Math.max(s.vy, -TUNING.glideFall);
  }

  const mag = Math.min(1, Math.hypot(input.moveX, input.moveZ));
  // tang toc: dem thoi gian giu can het co; tha can la ve toc do thuong ngay. The gioi khong dat sprintScale thi khong co gi doi.
  // bat dau dem khi day gan het co; da dem roi thi chi mat khi can ve duoi sprintRelease, de ngon tay rung nhe o mep can khong lam mat da
  if (mag >= TUNING.sprintStick || (s.runHeld > 0 && mag >= TUNING.sprintRelease)) s.runHeld += dt; else s.runHeld = 0;
  const sprint = Math.min(Math.max((s.runHeld - TUNING.sprintAfter) / TUNING.sprintRamp, 0), 1);
  const speed = (s.gliding ? TUNING.glideSpeed : TUNING.runSpeed) * (1 + ((world.sprintScale ?? 1) - 1) * sprint);
  const accel = (s.grounded ? TUNING.accel : TUNING.airAccel) * dt;
  const scale = mag > 1e-4 ? speed / Math.max(Math.hypot(input.moveX, input.moveZ), 1e-4) * mag : 0;
  s.vx = approach(s.vx, input.moveX * scale, accel);
  s.vz = approach(s.vz, input.moveZ * scale, accel);

  moveHorizontally(s, world, dt);
  settleVertically(s, world, dt);

  if (Math.hypot(s.vx, s.vz) > 0.3) s.yaw = Math.atan2(s.vx, s.vz);
  if (s.grounded && Math.hypot(s.x, s.z) < world.safeRadius) { s.safeX = s.x; s.safeZ = s.z; }
  // muc roi mac dinh hop voi dao bay; the gioi co thung lung sau tu dat world.respawnY (hoac -Infinity neu khong the roi)
  if (s.y < (world.respawnY ?? TUNING.respawnY)) respawn(s, world);
}

/** Tien trang thai them dt giay. Sua tai cho va tra lai chinh state. */
export function stepPlayer(state, input, dt, world) {
  state.events.jumped = state.events.landed = state.events.respawned = false;
  const steps = Math.max(1, Math.ceil(dt / TUNING.maxStep)), h = dt / steps;
  for (let i = 0; i < steps; i++) subStep(state, input, h, world);
  return state;
}
