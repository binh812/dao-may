// Luat doi dau Bong Lang. Module thuan: khong three.js, khong DOM.
// Mam khong tieu diet ma "danh thuc": thanh thuc cua Bong Lang day thi no tan thanh hoa.
// Nhip danh: chieu La ban lien tuc khong can bai; Tui Nang nap bang MOT cau do (be tu chon luc nao nap) roi nem dan.
// Luat tre em: giai chua dung van duoc vien nang, mot don khong qua 40% tim, nga thi tinh lai ngay va dich cham dan.

export const BATTLE = Object.freeze({
  hearts: 3,
  leafDamage: 1, leafRange: 7, leafCooldown: 0.45,
  orbDamage: 8, orbRange: 9, orbSplash: 4, pouchMax: 3,
  // so vien nang nap duoc theo cach be giai cau do: dung ngay / dung sau khi thu lai hoac xem goi y / xem cach giai
  charge: Object.freeze({ first: 3, later: 2, shown: 1 }),
  wake: 4, bigWake: 12,                        // thanh thuc cua Bong Lang thuong va Bong Lang lon
  aggroRange: 8, keepDistance: 2.2, enemySpeed: 1.1,
  attackEvery: 3.2, telegraph: 1.5, attackRadius: 1.6,
  invulnerable: 1.0,
  mercyStep: 0.35, mercyMax: 1.4,              // moi lan nga, vung bao truoc lau them; co tran
});

export function createEnemy(id, x, z, maxWake = BATTLE.wake, big = false) {
  return { id, x, z, wake: 0, maxWake, big, awake: false, attack: { phase: 'idle', timer: BATTLE.attackEvery, x: 0, z: 0 } };
}

/** So vien nang hop le tu du lieu ben ngoai: so nguyen 0..pouchMax, con lai coi nhu 0. */
export const revivePouch = (raw) => (Number.isInteger(raw) && raw >= 0 && raw <= BATTLE.pouchMax ? raw : 0);

/**
 * faints: so lan da nga o cac tran truoc trong cung phien, de luat thuong hai khong mat khi sang chuyen moi.
 * pouch: so vien nang con trong tui, mang theo sang chuyen moi.
 */
export function createBattle(enemies, faints = 0, pouch = 0) {
  return {
    enemies, hearts: BATTLE.hearts, faints, pouch: revivePouch(pouch), leafTimer: 0, invulnerable: 0,
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

/** Chieu La: khong can bai tap, giu nut thi ban lien tuc theo nhip hoi. Tra ve { target, woke }, hoac null neu chua hoi hoac khong co dich trong tam. */
export function leafAttack(b, player) {
  if (b.leafTimer > 0) return null;
  const target = nearestEnemy(b, player, BATTLE.leafRange);
  if (!target) return null;
  b.leafTimer = BATTLE.leafCooldown;
  return { target, woke: wakeUp(target, BATTLE.leafDamage) };
}

/**
 * Nap Tui Nang sau mot cau do. quality: 'first' | 'later' | 'shown' (xem BATTLE.charge). Giai kieu nao cung duoc it nhat 1 vien.
 * Tui khong vuot qua pouchMax. Tra ve so vien thuc su them vao.
 */
export function chargePouch(b, quality) {
  const amount = BATTLE.charge[quality];
  if (!Number.isInteger(amount)) throw new RangeError(`Cach giai khong hop le: ${quality}`);
  const before = b.pouch;
  b.pouch = Math.min(BATTLE.pouchMax, b.pouch + amount);
  return b.pouch - before;
}

/**
 * Nem mot vien nang vao Bong Lang gan nhat; nang lan ra moi Bong Lang con ngu quanh muc tieu.
 * Tra ve { target, hits: [{ enemy, woke }] }, hoac null (khong mat vien nao) neu tui rong hay khong co dich trong tam.
 */
export function throwOrb(b, player) {
  if (b.pouch <= 0) return null;
  const target = nearestEnemy(b, player, BATTLE.orbRange);
  if (!target) return null;
  b.pouch -= 1;
  const hits = sleeping(b).filter((e) => Math.hypot(e.x - target.x, e.z - target.z) <= BATTLE.orbSplash).map((enemy) => ({ enemy, woke: wakeUp(enemy, BATTLE.orbDamage) }));
  return { target, hits };
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
      if (b.hearts <= 0) { b.hearts = BATTLE.hearts; b.faints += 1; b.events.fainted = true; }
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
