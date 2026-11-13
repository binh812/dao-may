// Luat "xay bot o coi xay" (thuan: khong import three.js hay DOM). Moi chuyen di, coi xay co mot me bot: be giai mot so bai,
// xong me thi duoc Hat Nang thuong. Sai khong bi phat: van xong me, van co cong xay; moi bai dung duoc them hat.

export const MILL_JOB = {
  questions: 3,      // so bai cua mot me bot
  base: 1,           // cong xay: xong me la co, du dung hay sai
  perCorrect: 1,     // them cho moi bai dung
};

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
  mill.job = { wave, answered: 0, correct: 0 };
  return true;
}

/**
 * Ghi mot cau tra loi. Tra ve { done: false, left } khi con bai, hoac { done: true, reward, correct } khi xong me
 * (luc do hat thuong da cong vao `bonus` va chuyen di duoc danh dau da xay).
 */
export function answer(mill, correct) {
  const job = mill.job;
  if (!job) throw new Error('Chua bat dau me bot nao');
  job.answered += 1; if (correct) job.correct += 1;
  if (job.answered < MILL_JOB.questions) return { done: false, left: MILL_JOB.questions - job.answered };
  const reward = MILL_JOB.base + job.correct * MILL_JOB.perCorrect;
  mill.bonus += reward; mill.doneWave = job.wave; mill.job = null;
  return { done: true, reward, correct: job.correct };
}

/** Bo do me dang xay (vd. khong ra duoc bai): khong thuong, khong danh dau, be thu lai duoc. */
export function cancelJob(mill) { mill.job = null; }
