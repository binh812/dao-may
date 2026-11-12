// Cong phu huynh: mot phep nhan bang 6-9 voi phuong an nhieu; sai thi khoa 60 giay. Module thuan.

export const GATE = Object.freeze({ lo: 6, hi: 9, lockMs: 60000, choices: 4 });

const int = (rng, lo, hi) => lo + Math.floor(rng() * (hi - lo + 1));

/** Cau hoi cong: { a, b, answer, choices } voi cac phuong an sai gan dung de khong doan mo duoc. */
export function makeGateQuestion(rng) {
  const a = int(rng, GATE.lo, GATE.hi), b = int(rng, GATE.lo, GATE.hi), answer = a * b;
  const near = [answer + a, answer - a, answer + b, answer - b, answer + 1, answer - 1, answer + 10, answer - 10].filter((v) => v > 0 && v !== answer);
  const wrong = new Set();
  while (wrong.size < GATE.choices - 1) wrong.add(near[int(rng, 0, near.length - 1)]);
  const choices = [answer, ...wrong];
  for (let i = choices.length - 1; i > 0; i--) { const j = int(rng, 0, i); [choices[i], choices[j]] = [choices[j], choices[i]]; }
  return { a, b, answer, choices };
}

export const createGate = () => ({ lockedUntil: 0 });
export const isLocked = (gate, nowMs) => nowMs < gate.lockedUntil;
export const secondsLeft = (gate, nowMs) => Math.max(0, Math.ceil((gate.lockedUntil - nowMs) / 1000));

/** Tra ve 'open' | 'wrong' | 'locked'. Sai thi khoa lockMs tinh tu luc bam. */
export function tryGate(gate, question, choice, nowMs) {
  if (isLocked(gate, nowMs)) return 'locked';
  if (choice === question.answer) return 'open';
  gate.lockedUntil = nowMs + GATE.lockMs;
  return 'wrong';
}
