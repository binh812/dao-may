// Chon bai theo suc cua be va ghi nhan tien bo. Module thuan.
import { SKILLS, skillById } from './questions.js';

export const ADAPTIVE = Object.freeze({
  learnShare: 0.7, reviewShare: 0.2,           // con lai 0.1 la bai nang cao
  rate: 0.25,                                  // toc do cap nhat muc thanh thao
  masteredAt: 0.8, minSeen: 5,
  placedMastery: 0.9,                          // ky nang lop duoi khi xep lop
  minGrade: 1, maxGrade: 3,
  keepMistakes: 12,                            // so bai sai gan nhat giu lai de xem lai
});

const blank = () => ({ mastery: 0, seen: 0, streak: 0, placed: false });

/** Ho so moi: coi ky nang cac lop duoi la da biet (xep lop), be tu chung minh lai khi on tap. */
export function createProfile(grade) {
  if (!Number.isInteger(grade) || grade < ADAPTIVE.minGrade || grade > ADAPTIVE.maxGrade) throw new RangeError(`lop khong hop le: ${grade}`);
  const skills = {};
  for (const s of SKILLS) if (s.grade < grade) skills[s.id] = { mastery: ADAPTIVE.placedMastery, seen: ADAPTIVE.minSeen, streak: 0, placed: true };
  return { version: 1, grade, skills, mistakes: [] };
}

/**
 * Bo me doi lop: ky nang lop duoi duoc coi la da biet; ky nang "xep san" tu lop moi tro len bi thu lai,
 * con ky nang be tu thanh thao thi giu nguyen.
 */
export function changeGrade(profile, grade) {
  if (!Number.isInteger(grade) || grade < ADAPTIVE.minGrade || grade > ADAPTIVE.maxGrade) throw new RangeError(`lop khong hop le: ${grade}`);
  for (const s of SKILLS) {
    const st = profile.skills[s.id];
    if (s.grade < grade) { if (!st || !isMastered(profile, s.id)) profile.skills[s.id] = { mastery: ADAPTIVE.placedMastery, seen: ADAPTIVE.minSeen, streak: 0, placed: true }; }
    else if (st?.placed) delete profile.skills[s.id];
  }
  profile.grade = grade;
  return profile;
}

/** Ghi mot bai be vua lam sai de xem lai trong So hoc (chi giu cac bai gan nhat). */
export function recordMistake(profile, question) {
  const list = profile.mistakes ?? (profile.mistakes = []);
  list.push({ skillId: question.skillId, text: question.text, answer: question.answer, solution: [...question.solution] });
  while (list.length > ADAPTIVE.keepMistakes) list.shift();
}

const stateOf = (profile, id) => profile.skills[id] ?? blank();
export const isMastered = (profile, id) => { const s = stateOf(profile, id); return s.mastery >= ADAPTIVE.masteredAt && s.seen >= ADAPTIVE.minSeen; };
export const masteredCount = (profile) => SKILLS.filter((s) => isMastered(profile, s.id)).length;

/**
 * Chon ky nang cho bai ke tiep: phan lon la ky nang dang hoc (ky nang dau tien chua thanh thao cua lop),
 * mot phan on lai ky nang da thanh thao, mot phan nho la ky nang cua lop tren.
 */
export function pickSkill(profile, rng) {
  const inGrade = SKILLS.filter((s) => s.grade <= profile.grade);
  const learning = inGrade.find((s) => !isMastered(profile, s.id));
  const review = inGrade.filter((s) => isMastered(profile, s.id));
  const stretch = SKILLS.find((s) => s.grade === profile.grade + 1 && !isMastered(profile, s.id));
  const pickReview = () => review[Math.floor(rng() * review.length)];
  const roll = rng();
  if (roll < ADAPTIVE.learnShare) return (learning ?? stretch ?? pickReview()).id;
  if (roll < ADAPTIVE.learnShare + ADAPTIVE.reviewShare) return (review.length ? pickReview() : learning ?? stretch).id;
  return (stretch ?? learning ?? pickReview()).id;
}

/** Ghi nhan mot lan tra loi. Tra ve { masteredNow } de game an mung dung luc. */
export function recordAnswer(profile, skillId, correct) {
  if (!skillById(skillId)) throw new RangeError(`khong co ky nang: ${skillId}`);
  const before = isMastered(profile, skillId), s = profile.skills[skillId] ?? (profile.skills[skillId] = blank());
  s.seen += 1;
  s.mastery += ((correct ? 1 : 0) - s.mastery) * ADAPTIVE.rate;
  s.streak = correct ? s.streak + 1 : 0;
  if (!correct) s.placed = false; // da lam that thi khong con la "xep san" nua
  else if (s.placed && s.seen > ADAPTIVE.minSeen) s.placed = false;
  return { masteredNow: !before && isMastered(profile, skillId) };
}

/** Kiem tra du lieu doc tu bo nho may truoc khi dung; sai dang thi tra null de tao ho so moi. */
export function reviveProfile(raw) {
  if (!raw || typeof raw !== 'object' || raw.version !== 1) return null;
  if (!Number.isInteger(raw.grade) || raw.grade < ADAPTIVE.minGrade || raw.grade > ADAPTIVE.maxGrade) return null;
  const skills = {};
  for (const s of SKILLS) {
    const v = raw.skills?.[s.id];
    if (!v || typeof v.mastery !== 'number' || typeof v.seen !== 'number') continue;
    skills[s.id] = { mastery: Math.min(1, Math.max(0, v.mastery)), seen: Math.max(0, Math.floor(v.seen)), streak: Math.max(0, Math.floor(v.streak ?? 0)), placed: Boolean(v.placed) };
  }
  const mistakes = Array.isArray(raw.mistakes) ? raw.mistakes.filter((m) => m && typeof m.text === 'string' && Number.isFinite(m.answer) && Array.isArray(m.solution) && m.solution.every((l) => typeof l === 'string'))
    .slice(-ADAPTIVE.keepMistakes).map((m) => ({ skillId: String(m.skillId ?? ''), text: m.text, answer: m.answer, solution: [...m.solution] })) : [];
  return { version: 1, grade: raw.grade, skills, mistakes };
}
