// Chuong trinh hoc va bo sinh bai tap (toan lop 1-3). Module thuan: khong three.js, khong DOM.
// Moi bai co goi y (khong lo dap an) va loi giai tung buoc, dong cuoi la "Đáp số: ...".
// rng la ham tra ve so trong [0, 1); truyen bo sinh co seed de bai lap lai duoc trong test.

const int = (rng, lo, hi) => lo + Math.floor(rng() * (hi - lo + 1));

const SYMBOL = { add: '+', sub: '−', mul: '×', div: ':' };
const SPOKEN = { add: 'cộng', sub: 'trừ', mul: 'nhân', div: 'chia' };

/** Cau doc to cho may doc: "37 cộng 8 bằng mấy?" (ky hieu toan doc len khong tu nhien). */
export const spokenText = (question) => `${question.data.a} ${SPOKEN[question.data.op]} ${question.data.b} bằng mấy?`;
const HINT = {
  countOn: 'Bắt đầu từ số thứ nhất rồi đếm thêm số thứ hai.',
  countBack: 'Bắt đầu từ số thứ nhất rồi đếm lùi số thứ hai.',
  addSplit: 'Tách số thứ hai để làm tròn chục trước, rồi cộng phần còn lại.',
  subSplit: 'Trừ để về số tròn chục trước, rồi trừ tiếp phần còn lại.',
  addPlaces: 'Cộng hàng lớn của số thứ hai trước, rồi cộng hàng đơn vị.',
  subPlaces: 'Trừ hàng lớn của số thứ hai trước, rồi trừ hàng đơn vị.',
  mul: 'Phép nhân là cộng nhiều lần cùng một số.',
  div: 'Tìm số nào nhân với số chia thì ra số bị chia.',
};

/**
 * Danh sach ky nang theo thu tu hoc. id khong doi sau khi phat hanh (du lieu luu tham chieu theo id).
 * max la so lon nhat be gap trong ky nang do; moi lua chon cung nam trong [0, max] de khong loai tru bang mat duoc.
 */
export const SKILLS = Object.freeze([
  { id: 'g1_add_10', max: 10, grade: 1, name: 'Cộng trong phạm vi 10', op: 'add', make: (r) => { const a = int(r, 1, 8); return [a, int(r, 1, 9 - a)]; } },
  { id: 'g1_sub_10', max: 10, grade: 1, name: 'Trừ trong phạm vi 10', op: 'sub', make: (r) => { const a = int(r, 2, 10); return [a, int(r, 1, a - 1)]; } },
  { id: 'g1_add_20', max: 20, grade: 1, name: 'Cộng qua 10', op: 'add', make: (r) => { const a = int(r, 5, 9); return [a, int(r, 11 - a, 9)]; } },
  { id: 'g1_sub_20', max: 20, grade: 1, name: 'Trừ qua 10', op: 'sub', make: (r) => { const a = int(r, 11, 18); return [a, int(r, a - 9, 9)]; } },
  { id: 'g2_add_100', max: 100, grade: 2, name: 'Cộng không nhớ trong phạm vi 100', op: 'add', make: (r) => { const au = int(r, 1, 8), at = int(r, 1, 7); return [at * 10 + au, int(r, 1, 8 - at) * 10 + int(r, 0, 9 - au)]; } },
  { id: 'g2_add_100_carry', max: 100, grade: 2, name: 'Cộng có nhớ trong phạm vi 100', op: 'add', make: (r) => { const au = int(r, 2, 9), at = int(r, 1, 7); return [at * 10 + au, int(r, 0, 7 - at) * 10 + int(r, 10 - au, 9)]; } },
  { id: 'g2_sub_100_borrow', max: 100, grade: 2, name: 'Trừ có nhớ trong phạm vi 100', op: 'sub', make: (r) => { const au = int(r, 0, 8), at = int(r, 2, 9); return [at * 10 + au, int(r, 0, at - 2) * 10 + int(r, au + 1, 9)]; } },
  { id: 'g2_mul_2_5', max: 50, grade: 2, name: 'Bảng nhân 2 và 5', op: 'mul', make: (r) => [r() < 0.5 ? 2 : 5, int(r, 1, 10)] },
  { id: 'g3_mul_table', max: 81, grade: 3, name: 'Bảng nhân 3 đến 9', op: 'mul', make: (r) => [int(r, 3, 9), int(r, 2, 9)] },
  { id: 'g3_div_table', max: 10, grade: 3, name: 'Bảng chia 2 đến 9', op: 'div', make: (r) => { const b = int(r, 2, 9); return [b * int(r, 2, 9), b]; } },
  { id: 'g3_add_1000', max: 1000, grade: 3, name: 'Cộng trong phạm vi 1000', op: 'add', make: (r) => { const a = int(r, 120, 780); return [a, int(r, 105, 999 - a)]; } },
  { id: 'g3_sub_1000', max: 1000, grade: 3, name: 'Trừ trong phạm vi 1000', op: 'sub', make: (r) => { const a = int(r, 300, 999); return [a, int(r, 105, a - 100)]; } },
]);

const SKILL_BY_ID = new Map(SKILLS.map((s) => [s.id, s]));
export const skillById = (id) => SKILL_BY_ID.get(id);

export function compute(op, a, b) {
  if (op === 'add') return a + b;
  if (op === 'sub') return a - b;
  if (op === 'mul') return a * b;
  if (op === 'div') return a / b;
  throw new RangeError(`phep tinh khong ho tro: ${op}`);
}

/** Buoc cong/tru hang don vi co vuot qua so tron chuc khong (va khong xuat phat tu so tron chuc). */
function unitCrossing(op, running, unit) {
  const r = running % 10;
  return op === 'add' ? (r !== 0 && r + unit > 10) : (r !== 0 && r < unit);
}

function hintFor(op, a, b) {
  if (op === 'mul') return HINT.mul;
  if (op === 'div') return HINT.div;
  if (b >= 10) return op === 'add' ? HINT.addPlaces : HINT.subPlaces;
  if (unitCrossing(op, a, b)) return op === 'add' ? HINT.addSplit : HINT.subSplit;
  return op === 'add' ? HINT.countOn : HINT.countBack;
}

/** Loi giai di dung cach ma goi y neu: hang lon truoc, don vi sau; qua chuc thi tach de ve so tron chuc. */
function solutionFor(op, a, b, answer) {
  const steps = [], sym = SYMBOL[op];
  if (op === 'mul') {
    steps.push(b <= 5 ? `${a} × ${b} là ${a} lấy ${b} lần: ${Array(b).fill(a).join(' + ')} = ${answer}` : `Theo bảng nhân ${a}: ${a} × ${b} = ${answer}`);
  } else if (op === 'div') {
    steps.push(`${b} × ${answer} = ${a}, nên ${a} : ${b} = ${answer}`);
  } else {
    let running = a;
    const apply = (part) => { const next = op === 'add' ? running + part : running - part; steps.push(`${running} ${sym} ${part} = ${next}`); running = next; };
    for (const part of [Math.floor(b / 100) * 100, Math.floor((b % 100) / 10) * 10]) if (part > 0) apply(part);
    const unit = b % 10;
    if (unit > 0 && unitCrossing(op, running, unit)) {
      const toTen = op === 'add' ? 10 - (running % 10) : running % 10;
      apply(toTen); apply(unit - toTen);
    } else if (unit > 0) apply(unit);
  }
  steps.push(`Đáp số: ${answer}`);
  return steps;
}

/** Ba dap an sai la loi be hay mac (lech 1, lech 10, nham phep tinh), luon nam trong [0, max] cua ky nang. */
function distractorsFor(op, a, b, answer, max, rng) {
  const wrong = new Set();
  const offer = (v) => { if (Number.isInteger(v) && v >= 0 && v <= max && v !== answer) wrong.add(v); };
  const mistakes = {
    add: [answer - 10, answer + 10, answer - 1, answer + 1, Math.abs(a - b)],
    sub: [answer + 10, answer - 10, answer + 1, answer - 1, a + b],
    mul: [a * (b + 1), a * (b - 1), a + b, answer + 1],
    div: [answer + 1, answer - 1, a - b, answer * 2],
  }[op];
  for (let i = mistakes.length - 1; i > 0; i--) { const j = int(rng, 0, i); [mistakes[i], mistakes[j]] = [mistakes[j], mistakes[i]]; }
  mistakes.forEach(offer);
  const picked = [...wrong].slice(0, 3);
  for (let step = 2; picked.length < 3 && step <= max + 1; step++) for (const v of [answer + step, answer - step]) {
    if (picked.length < 3 && Number.isInteger(v) && v >= 0 && v <= max && !picked.includes(v)) picked.push(v);
  }
  if (picked.length < 3) throw new RangeError(`khong du lua chon sai trong [0, ${max}] cho ${a} ${op} ${b}`);
  return picked;
}

/** Sinh mot bai cho ky nang da cho. Tra ve bai co 4 lua chon da tron. */
export function makeQuestion(skillId, rng) {
  const skill = skillById(skillId);
  if (!skill) throw new RangeError(`khong co ky nang: ${skillId}`);
  const [a, b] = skill.make(rng), answer = compute(skill.op, a, b);
  const choices = [answer, ...distractorsFor(skill.op, a, b, answer, skill.max, rng)];
  for (let i = choices.length - 1; i > 0; i--) { const j = int(rng, 0, i); [choices[i], choices[j]] = [choices[j], choices[i]]; }
  return {
    skillId, text: `${a} ${SYMBOL[skill.op]} ${b} = ?`, answer, choices,
    hint: hintFor(skill.op, a, b), solution: solutionFor(skill.op, a, b, answer),
    data: { op: skill.op, a, b },
  };
}
