// Mot chuyen di: noi luat doi dau, he hoc tap, giao dien va hinh anh. Khong chua luat; luat nam o cac *-core.js va learn/.
import { camera, scene, U } from '../core/stage.js';
import { toon } from '../world/materials.js';
import { colliders, groundAt } from '../world/colliders.js';
import { BATTLE, allAwake, castSkill, createBattle, createEnemy, leafAttack, nearestEnemy, stepBattle } from './battle-core.js';
import { TUNING } from './player-core.js';
import { makeQuestion, skillById } from '../learn/questions.js';
import { ADAPTIVE, changeGrade, createProfile, masteredCount, pickSkill, recordAnswer, recordMistake, reviveProfile } from '../learn/adaptive.js';
import { createEnemyViews } from './enemy-views.js';
import { createHud } from '../ui/hud.js';
import { createQuestionCard } from '../ui/question-card.js';
import { createNotebook } from '../ui/notebook.js';
import { createHeartTree } from './heart-tree.js';
import { createSfx } from './sfx.js';

const SAVE_KEY = 'daomay.profile.v1', MUTE_KEY = 'daomay.muted';
const SLOW_WHILE_ASKING = 0.08;
const SPAWN_SPOTS = [[1.5, 6.0], [-6.5, 5.5], [-0.5, -2.0], [-7.5, 2.0], [2.5, -3.0], [0, 8.5], [-4, 9]];
const WAVE = { firstCount: 3, maxCount: 5, firstWake: 8, wakeStep: 2, maxWake: 16 };
const PRAISE = ['', 'Tuyệt!', 'Chiêu bậc 2!', 'Chiêu bậc 3, mạnh nhất!'];

function loadProfile() {
  try { return reviveProfile(JSON.parse(localStorage.getItem(SAVE_KEY))); }
  catch (error) { console.warn('Khong doc duoc ho so da luu, se tao ho so moi:', error); return null; }
}
function saveProfile(profile, hud) {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(profile)); }
  catch (error) { console.warn('Khong luu duoc ho so:', error); hud.toast('Máy không lưu được tiến độ lần này.', 2600); }
}

/** Cho dung hop le cho Bong Lang: co dat, khong nam trong vat can, khong sat cho Mam dang dung. */
function spawnEnemies(wave, player, rng) {
  const free = SPAWN_SPOTS.filter(([x, z]) => Number.isFinite(groundAt(x, z))
    && colliders.every((c) => Math.hypot(x - c.x, z - c.z) > c.r + 1)
    && Math.hypot(x - player.x, z - player.z) > 4);
  for (let i = free.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [free[i], free[j]] = [free[j], free[i]]; }
  const count = Math.min(WAVE.firstCount + wave - 1, WAVE.maxCount, free.length), wake = Math.min(WAVE.firstWake + (wave - 1) * WAVE.wakeStep, WAVE.maxWake);
  return free.slice(0, count).map(([x, z], i) => createEnemy(`w${wave}e${i}`, x, z, wake));
}

export function createSession(play) {
  const player = play.player, rng = Math.random;
  const views = createEnemyViews(scene, toon, groundAt), card = createQuestionCard();
  const hud = createHud({ onLeaf: useLeaf, onSkill: useSkill });
  const sfx = createSfx(), tree = createHeartTree(scene, toon, groundAt);
  try { sfx.setMuted(localStorage.getItem(MUTE_KEY) === '1'); } catch (error) { console.warn('Khong doc duoc cai dat am thanh:', error); }
  const notebook = createNotebook({
    getProfile: () => state.profile,
    changeGrade: (grade) => { changeGrade(state.profile, grade); saveProfile(state.profile, hud); refreshHud(); },
    resetProgress: () => { try { localStorage.removeItem(SAVE_KEY); } catch (error) { console.warn('Khong xoa duoc ho so:', error); } location.reload(); },
    isMuted: () => sfx.isMuted(),
    setMuted: (value) => { sfx.setMuted(value); try { localStorage.setItem(MUTE_KEY, value ? '1' : '0'); } catch (error) { console.warn('Khong luu duoc cai dat am thanh:', error); } },
  });
  const state = { profile: loadProfile(), battle: null, wave: 0, asking: false, cleared: false, answered: 0, correct: 0, time: 0 };

  function startWave() {
    state.wave += 1; state.cleared = false; state.answered = 0; state.correct = 0;
    state.battle = createBattle(spawnEnemies(state.wave, player, rng));
    views.reset(state.battle);
    refreshHud();
    hud.toast(state.wave === 1 ? 'Các Bóng Lặng đang ngủ quanh đảo. Lại gần và đánh thức chúng!' : `Chuyến ${state.wave}: Bóng Lặng ngủ say hơn rồi đấy!`, 3200);
  }
  function refreshHud() {
    const b = state.battle, awake = b.enemies.filter((e) => e.awake).length;
    hud.setHearts(b.hearts, BATTLE.hearts); hud.setCombo(b.combo);
    hud.setProgress(`Đánh thức ${awake}/${b.enemies.length} · Thành thạo ${masteredCount(state.profile)} kỹ năng`);
    tree.setMastered(masteredCount(state.profile));
  }
  function onWoke(enemy) {
    views.wake(enemy); refreshHud(); sfx.woke();
    if (!allAwake(state.battle)) return;
    state.cleared = true; sfx.cleared();
    hud.banner('Đảo đã thức giấc!', [`Bé đã giải đúng ${state.correct}/${state.answered} bài trong chuyến này.`, `Kỹ năng đã thành thạo: ${masteredCount(state.profile)}.`], 'Chuyến mới', startWave);
  }

  function useLeaf() {
    if (!state.battle || state.asking || state.cleared) return;
    const hit = leafAttack(state.battle, player);
    if (!hit) return;
    views.leaf(player, hit.target); sfx.leaf();
    if (hit.woke) onWoke(hit.target); else refreshHud();
  }

  function useSkill() {
    if (!state.battle || state.asking || state.cleared) return;
    if (!nearestEnemy(state.battle, player, BATTLE.skillRange)) { hud.toast('Lại gần một Bóng Lặng rồi hãy ra chiêu nhé!'); return; }
    state.asking = true;
    const skillId = pickSkill(state.profile, rng), question = makeQuestion(skillId, rng);
    card.ask(question, 'Nạp chiêu Tia Nắng').then(({ correct }) => {
      state.asking = false; state.answered += 1; if (correct) state.correct += 1;
      const { masteredNow } = recordAnswer(state.profile, skillId, correct);
      if (!correct) recordMistake(state.profile, question);
      saveProfile(state.profile, hud);
      const hit = castSkill(state.battle, player, correct);
      if (hit) views.beam(hit.target, hit.tier);
      if (masteredNow) sfx.mastered(); else if (correct) sfx.correct(hit ? hit.tier : 1); else sfx.wrong();
      if (masteredNow) hud.toast(`Bé đã thành thạo: ${skillById(skillId).name}! Cây Tâm vừa ra thêm quả.`, 3200);
      else if (correct && hit) hud.toast(PRAISE[hit.tier]);
      if (hit?.woke) onWoke(hit.target); else refreshHud();
    });
  }

  // ?grade=N tao ho so tam cho lop N ma khong hoi (de thu va chup anh kiem tra); khong ghi de ho so da co.
  const forcedGrade = Number(new URLSearchParams(location.search).get('grade'));
  if (!state.profile && Number.isInteger(forcedGrade) && forcedGrade >= ADAPTIVE.minGrade && forcedGrade <= ADAPTIVE.maxGrade) state.profile = createProfile(forcedGrade);

  if (state.profile) { tree.setMastered(masteredCount(state.profile)); startWave(); }
  else {
    const grades = []; for (let g = ADAPTIVE.minGrade; g <= ADAPTIVE.maxGrade; g++) grades.push(g);
    card.askGrade(grades).then((grade) => { state.profile = createProfile(grade); saveProfile(state.profile, hud); startWave(); });
  }

  return {
    /** He so thoi gian cho nhan vat va tran dau: dung khi chua chon lop, cham lai khi dang giai bai. */
    timeScale: () => (!state.profile || notebook.isOpen() ? 0 : state.cleared ? 1 : state.asking ? SLOW_WHILE_ASKING : 1),
    update(dt) {
      state.time += dt;
      tree.update(dt, state.time);
      const b = state.battle; if (!b) return;
      if (player.events.jumped) sfx.jump();
      if (player.events.landed) sfx.land();
      if (!state.cleared && !notebook.isOpen()) {
        stepBattle(b, player, dt * (state.asking ? SLOW_WHILE_ASKING : 1));
        if (b.events.hit) { refreshHud(); sfx.hit(); hud.toast(b.events.fainted ? 'Mầm ngủ gật một chút. Dậy nào, không sao cả!' : 'Ối! Chạy ra khỏi vòng đỏ nhé.', 1600); }
        for (const s of b.events.struck) views.strike(s.x, s.z);
        hud.setSkillReady(nearestEnemy(b, player, BATTLE.skillRange) !== null);
      }
      views.update(dt, state.time, b, camera);
      U.player.value.set(player.x, player.y, player.z);
    },
    /** Dung cho anh chup kiem tra: mo mot bai mau ngay. */
    debugAsk() { if (state.profile) useSkill(); },
    runSpeed: TUNING.runSpeed,
  };
}
