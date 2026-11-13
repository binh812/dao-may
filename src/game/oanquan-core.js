// Luat tro choi dan gian O an quan (thuan: khong three.js, khong DOM, co test).
// Ban co la vong 12 o: o 0 va o 6 la hai o quan; o 1..5 la hang cua be (trai -> phai), o 7..11 la hang cua ban choi cung.
// Moi luot: boc het soi o mot o cua minh, rai moi o mot vien theo chieu da chon. Het soi:
//  - o ke tiep co soi (khong phai o quan): boc len rai tiep;
//  - o ke tiep trong, o sau do co soi: an het o do (an lien tiep duoc neu cu cach mot o trong);
//  - o ke tiep la o quan con soi, hoac hai o trong lien nhau: het luot.
// Het ca hai o quan thi tan cuoc: soi con lai ben nao ve ben do. Ai nhieu diem hon thi thang.

export const OQ = Object.freeze({ cells: 12, perCell: 5, quanValue: 10, scatter: 5, maxSteps: 2000 });
export const SIDES = Object.freeze({ player: Object.freeze([1, 2, 3, 4, 5]), rival: Object.freeze([7, 8, 9, 10, 11]) });
export const QUAN_CELLS = Object.freeze([0, 6]);
const other = (side) => (side === 'player' ? 'rival' : 'player');
const wrap = (i) => ((i % OQ.cells) + OQ.cells) % OQ.cells;
const isQuanCell = (i) => i === 0 || i === 6;
const isEmpty = (g, i) => g.dan[i] === 0 && !g.quan[i];

export function createGame() {
  const dan = Array.from({ length: OQ.cells }, (_, i) => (isQuanCell(i) ? 0 : OQ.perCell));
  return { dan, quan: dan.map((_, i) => isQuanCell(i)), score: { player: 0, rival: 0 }, turn: 'player', over: false };
}
export const cloneGame = (g) => ({ dan: [...g.dan], quan: [...g.quan], score: { ...g.score }, turn: g.turn, over: g.over });

/** Tong so diem tren ban va trong tay hai ben; khong bao gio doi (de test bao toan). */
export const totalValue = (g) => g.dan.reduce((a, b) => a + b, 0) + g.quan.filter(Boolean).length * OQ.quanValue + g.score.player + g.score.rival;

/** Cac nuoc di hop le cua mot ben: moi o con soi di duoc hai chieu. */
export function legalMoves(g, side) {
  if (g.over) return [];
  return SIDES[side].filter((cell) => g.dan[cell] > 0).flatMap((cell) => [{ cell, dir: 1 }, { cell, dir: -1 }]);
}

/** Het soi o ca nam o cua minh: phai bo ra 5 vien da an de rai lai moi o mot vien (thieu thi vay, diem co the am). */
function scatterIfBare(g, side, steps) {
  if (SIDES[side].some((cell) => g.dan[cell] > 0)) return;
  for (const cell of SIDES[side]) g.dan[cell] = 1;
  g.score[side] -= OQ.scatter;
  steps.push({ type: 'scatter', side });
}

/**
 * Di mot nuoc. Tra ve danh sach buoc de giao dien dien lai: { type: 'take' | 'sow' | 'capture' | 'scatter' | 'end', ... }.
 * Nem loi neu nuoc di khong hop le (sai luot, o khong phai cua minh, o trong).
 */
export function playMove(g, side, cell, dir) {
  if (g.over) throw new Error('Van co da ket thuc');
  if (g.turn !== side) throw new Error(`Chua toi luot cua ${side}`);
  if (!SIDES[side].includes(cell) || g.dan[cell] <= 0) throw new RangeError(`O khong di duoc: ${cell}`);
  if (dir !== 1 && dir !== -1) throw new RangeError(`Chieu rai khong hop le: ${dir}`);
  const steps = [];
  let hand = g.dan[cell], pos = cell;
  g.dan[cell] = 0; steps.push({ type: 'take', cell });
  while (steps.length < OQ.maxSteps) {
    while (hand > 0) { pos = wrap(pos + dir); g.dan[pos] += 1; hand -= 1; steps.push({ type: 'sow', cell: pos }); }
    const next = wrap(pos + dir);
    if (!isEmpty(g, next)) {
      if (isQuanCell(next)) break;                       // khong duoc boc o quan: het luot
      hand = g.dan[next]; g.dan[next] = 0; pos = next; steps.push({ type: 'take', cell: next });
      continue;
    }
    for (let gap = next; isEmpty(g, gap);) {             // an: cu cach mot o trong la an o sau do
      const prey = wrap(gap + dir);
      if (isEmpty(g, prey)) break;
      const gain = g.dan[prey] + (g.quan[prey] ? OQ.quanValue : 0);
      g.dan[prey] = 0; g.quan[prey] = false; g.score[side] += gain;
      steps.push({ type: 'capture', cell: prey, gain, side });
      gap = wrap(prey + dir);
    }
    break;
  }
  if (QUAN_CELLS.every((quanCell) => isEmpty(g, quanCell))) {
    for (const owner of ['player', 'rival']) for (const own of SIDES[owner]) { g.score[owner] += g.dan[own]; g.dan[own] = 0; }
    g.over = true; steps.push({ type: 'end' });
  } else { g.turn = other(side); scatterIfBare(g, g.turn, steps); }
  return steps;
}

/** 'player' | 'rival' | 'draw' khi van da xong; null khi chua xong. */
export function winner(g) {
  if (!g.over) return null;
  return g.score.player === g.score.rival ? 'draw' : g.score.player > g.score.rival ? 'player' : 'rival';
}

/**
 * Nuoc di cua ban choi cung. skill (0..1) la xac suat chon nuoc an duoc nhieu nhat; con lai di ngau nhien,
 * de be thang duoc thuong xuyen (giao dien tu chinh skill theo ket qua van truoc). Tra ve { cell, dir } hoac null neu khong con nuoc.
 */
export function chooseMove(g, side, rng = Math.random, skill = 0.2) {
  const moves = legalMoves(g, side);
  if (!moves.length) return null;
  if (rng() >= skill) return moves[Math.floor(rng() * moves.length)];
  let best = moves[0], bestGain = -Infinity;
  for (const move of moves) {
    const trial = cloneGame(g); playMove(trial, side, move.cell, move.dir);
    const gain = trial.score[side] - g.score[side];
    if (gain > bestGain) { best = move; bestGain = gain; }
  }
  return best;
}
