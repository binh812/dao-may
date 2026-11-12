// Luat doi dau Bong Lang. Module thuan: khong three.js, khong DOM.
// Mam khong tieu diet ma "danh thuc": thanh thuc cua Bong Lang day thi no tan thanh hoa.
// Luat tre em: sai khong mat gi (chi chieu yeu di), mot don khong qua 40% tim, nga thi tinh lai ngay va dich cham dan.

export const BATTLE = Object.freeze({
  hearts: 3,
  leafDamage: 1, leafRange: 7, leafCooldown: 0.45,
  skillDamage: 4, weakSkillDamage: 1.5, skillRange: 9, comboBonus: Object.freeze([1, 1.5, 2]),
  aggroRange: 8, keepDistance: 2.2, enemySpeed: 1.1,
  attackEvery: 3.2, telegraph: 1.5, attackRadius: 1.6,
  invulnerable: 1.0,
  mercyStep: 0.35, mercyMax: 1.4,              // moi lan nga, vung bao truoc lau them; co tran
});

export function createEnemy(id, x, z, maxWake = 8) {
  return { id, x, z, wake: 0, maxWake, awake: false, attack: { phase: 'idle', timer: BATTLE.attackEvery, x: 0, z: 0 } };
}

export function createBattle(enemies) {
  return {
    enemies, hearts: BATTLE.hearts, combo: 0, faints: 0, leafTimer: 0, invulnerable: 0,
    events: { hit: false, fainted: false, struck: [] },
  };
}

const sleeping = (b) => b.enemies.filter((e) => !e.awake);
export const allAwake = (b) => b.enemies.every((e) => e.awake);

/** Bong Lang con ngu gan nhat trong tam, hoac null. */
export function nearestEnemy(b, player, range) {
  let best = null, bestD = range;
  for (const e of sleeping(b)) { const d = Math.hypot(e.x - player.x, e.z - player.z); if (d <= bestD) { best = e; bestD = d; } }
  return best;
}

/** Cong vao thanh thuc; tra ve true neu don nay lam Bong Lang thuc han. */
function wakeUp(enemy, amount) {
  enemy.wake = Math.min(enemy.maxWake, enemy.wake + amount);
  if (enemy.wake < enemy.maxWake || enemy.awake) return false;
  enemy.awake = true; enemy.attack.phase = 'idle';
  return true;
}

/** Don Thuong (chieu La): khong can bai tap. Tra ve { target, woke }, hoac null neu chua hoi hoac khong co dich trong tam. */
export function leafAttack(b, player) {
  if (b.leafTimer > 0) return null;
  const target = nearestEnemy(b, player, BATTLE.leafRange);
  if (!target) return null;
  b.leafTimer = BATTLE.leafCooldown;
  return { target, woke: wakeUp(target, BATTLE.leafDamage) };
}

/**
 * Chieu Thoi Tiet sau khi be tra loi. Dung: du luc, combo tang (toi da bac 3). Sai: chieu van ra nhung yeu, combo ve 0.
 * Tra ve { target, damage, tier, woke } hoac null neu khong con dich trong tam.
 */
export function castSkill(b, player, correct) {
  const target = nearestEnemy(b, player, BATTLE.skillRange);
  b.combo = correct ? Math.min(b.combo + 1, BATTLE.comboBonus.length) : 0;
  if (!target) return null;
  const tier = Math.max(b.combo, 1), damage = correct ? BATTLE.skillDamage * BATTLE.comboBonus[tier - 1] : BATTLE.weakSkillDamage;
  return { target, damage, tier: correct ? tier : 0, woke: wakeUp(target, damage) };
}

function stepEnemy(b, enemy, player, dt) {
  const dx = player.x - enemy.x, dz = player.z - enemy.z, dist = Math.hypot(dx, dz), a = enemy.attack;
  if (a.phase === 'telegraph') {
    a.timer -= dt;
    if (a.timer > 0) return;
    a.phase = 'idle'; a.timer = BATTLE.attackEvery;
    b.events.struck.push({ id: enemy.id, x: a.x, z: a.z });
    if (b.invulnerable <= 0 && Math.hypot(player.x - a.x, player.z - a.z) <= BATTLE.attackRadius) {
      b.hearts -= 1; b.invulnerable = BATTLE.invulnerable; b.events.hit = true;
      if (b.hearts <= 0) { b.hearts = BATTLE.hearts; b.faints += 1; b.combo = 0; b.events.fainted = true; }
    }
    return;
  }
  if (dist > BATTLE.aggroRange) return;
  if (dist > BATTLE.keepDistance) { const step = Math.min(BATTLE.enemySpeed * dt, dist - BATTLE.keepDistance); enemy.x += (dx / dist) * step; enemy.z += (dz / dist) * step; }
  a.timer -= dt;
  if (a.timer <= 0) { a.phase = 'telegraph'; a.timer = telegraphTime(b); a.x = player.x; a.z = player.z; }
}

/** Thoi gian bao truoc hien tai: dai them sau moi lan be nga (luat thuong hai). */
export const telegraphTime = (b) => BATTLE.telegraph + Math.min(b.faints * BATTLE.mercyStep, BATTLE.mercyMax);

/** Tien tran dau them dt giay. player = { x, z }. Su kien cua buoc nay nam trong b.events. */
export function stepBattle(b, player, dt) {
  b.events.hit = b.events.fainted = false; b.events.struck.length = 0;
  b.leafTimer = Math.max(0, b.leafTimer - dt);
  b.invulnerable = Math.max(0, b.invulnerable - dt);
  for (const enemy of sleeping(b)) stepEnemy(b, enemy, player, dt);
  return b;
}
