// Luat "can bot o coi xay" (thuan: khong import three.js hay DOM). Moi chuyen di, coi xay co mot me bot: be lam MOT cau do
// can thang bang (can bot vao bao). Xong me thi duoc Hat Nang thuong. Khong bi phat: xem cach giai van xong me va van co cong.

export const MILL_JOB = Object.freeze({
  base: 1,                                               // cong xay: xong me la co
  bonus: Object.freeze({ first: 3, later: 2, shown: 1 }), // them theo cach be giai cau do
});

/** So Hat Nang thuong da luu: chi nhan so nguyen khong am, con lai coi nhu 0. */
export const reviveBonus = (raw) => (Number.isInteger(raw) && raw >= 0 ? raw : 0);

/** Trang thai coi xay: `bonus` la tong hat thuong da nhan (luu ben ngoai), `doneWave` la chuyen di da xay xong me. */
export function createMill(savedBonus = 0) {
  return { bonus: reviveBonus(savedBonus), doneWave: 0, job: null };
}

/** Chuyen di nay con me bot chua xay va hien khong xay do. */
export const canStart = (mill, wave) => mill.job === null && mill.doneWave !== wave;

/** Bat dau me bot cua chuyen `wave`. Tra ve false (khong doi gi) neu chuyen nay da xay roi hoac dang xay. */
export function startJob(mill, wave) {
  if (!Number.isInteger(wave) || wave < 1) throw new RangeError(`Chuyen di khong hop le: ${wave}`);
  if (!canStart(mill, wave)) return false;
  mill.job = { wave };
  return true;
}

/**
 * Xong me bot. quality: 'first' | 'later' | 'shown' (cach be giai cau do). Hat thuong cong vao `bonus`,
 * chuyen di duoc danh dau da xay. Tra ve so hat thuong cua me nay.
 */
export function finishJob(mill, quality) {
  if (!mill.job) throw new Error('Chua bat dau me bot nao');
  const extra = MILL_JOB.bonus[quality];
  if (!Number.isInteger(extra)) throw new RangeError(`Cach giai khong hop le: ${quality}`);
  const reward = MILL_JOB.base + extra;
  mill.bonus += reward; mill.doneWave = mill.job.wave; mill.job = null;
  return reward;
}

/** Bo do me dang xay (be bam "De sau", hoac khong ra duoc cau do): khong thuong, khong danh dau, be thu lai duoc. */
export function cancelJob(mill) { mill.job = null; }
