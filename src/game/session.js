// Mot chuyen di: noi luat doi dau, he hoc tap, giao dien va hinh anh. Khong chua luat; luat nam o cac *-core.js va learn/.
import * as THREE from 'three';
import { camera, scene, U } from '../core/stage.js';
import { toon } from '../world/materials.js';
import { realm } from '../world/realm.js';
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
import { createCollection, isMilestone, stepCollection, takenIds } from './collect-core.js';
import { createSeedViews } from './seed-views.js';

const SAVE_KEY = 'daomay.profile.v1', MUTE_KEY = 'daomay.muted';
const SEED_KEY = `daomay.seeds.${realm.name}.v1`;   // Hat Nang da nhat, luu rieng cho tung the gioi
const groundAt = (x, z) => realm.groundAt(x, z);
const WAVE = { firstCount: 3, maxCount: 5, firstWake: 8, wakeStep: 2, maxWake: 16 };
const MAX_START_WAVE = 99;
const GUIDE_FROM = 25; // xa hon khoang nay (m) thi hien mui ten chi huong
const PRAISE = ['', 'Tuyệt!', 'Chiêu bậc 2!', 'Chiêu bậc 3, mạnh nhất!'];

function loadProfile() {
  let raw = null;
  try {
    raw = localStorage.getItem(SAVE_KEY);
    const profile = raw === null ? null : reviveProfile(JSON.parse(raw));
    if (raw !== null && !profile) throw new Error('du lieu khong dung dang');
    return profile;
  } catch (error) {
    console.warn('Khong doc duoc ho so da luu, se tao ho so moi:', error);
    // giu lai ban khong doc duoc de khong ghi de mat tien do cu
    try { if (raw !== null) localStorage.setItem(SAVE_KEY + '.bak', raw); } catch (backupError) { console.warn('Khong sao luu duoc ho so cu:', backupError); }
    return null;
  }
}
function saveProfile(profile, hud) {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(profile)); }
  catch (error) { console.warn('Khong luu duoc ho so:', error); hud.toast('Máy không lưu được tiến độ lần này.', 2600); }
}

/** Cho dung hop le cho Bong Lang: co dat, khong nam trong vat can, khong sat cho Mam dang dung. */
/** Hat Nang cua the gioi nay (neu co): doc cac hat da nhat tu lan choi truoc; khong doc duoc thi coi nhu chua nhat. */
function loadSeeds() {
  if (!realm.collectibles?.length) return null;
  let saved = [];
  try { const raw = JSON.parse(localStorage.getItem(SEED_KEY) ?? '[]'); if (Array.isArray(raw)) saved = raw.filter((id) => typeof id === 'string'); }
  catch (error) { console.warn('Khong doc duoc Hat Nang da nhat:', error); }
  return createCollection(realm.collectibles, saved);
}

function spawnEnemies(wave, player, rng) {
  const spots = realm.spotsForWave ? realm.spotsForWave(wave) : realm.spawnSpots; // the gioi rong: moi chuyen o mot noi
  const valid = spots.filter(([x, z]) => Number.isFinite(groundAt(x, z)) && realm.colliders.every((c) => Math.hypot(x - c.x, z - c.z) > c.r + 1));
  const away = valid.filter(([x, z]) => Math.hypot(x - player.x, z - player.z) > 4);
  const free = away.length ? away : valid; // Mam dung sat moi cho: van phai co dich, neu khong chuyen di khong bao gio xong
  if (!free.length) throw new Error('khong co cho hop le nao de dat Bong Lang');
  for (let i = free.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [free[i], free[j]] = [free[j], free[i]]; }
  const count = Math.min(WAVE.firstCount + wave - 1, WAVE.maxCount, free.length), wake = Math.min(WAVE.firstWake + (wave - 1) * WAVE.wakeStep, WAVE.maxWake);
  return free.slice(0, count).map(([x, z], i) => createEnemy(`w${wave}e${i}`, x, z, wake));
}

export function createSession(play) {
  const player = play.player, rng = Math.random;
  const views = createEnemyViews(scene, toon, groundAt), card = createQuestionCard();
  const other = realm.name === 'valley' ? { id: 'island', label: 'Đảo Mây' } : { id: 'valley', label: 'Thung lũng' };
  const hud = createHud({ onLeaf: useLeaf, onSkill: useSkill, worldLabel: other.label, onSwitchWorld: () => { const q = new URLSearchParams(location.search); q.set('world', other.id); location.search = q.toString(); } });
  const sfx = createSfx(), tree = createHeartTree(scene, toon, groundAt, realm.treeSpot);
  try { sfx.setMuted(localStorage.getItem(MUTE_KEY) === '1'); } catch (error) { console.warn('Khong doc duoc cai dat am thanh:', error); }
  const notebook = createNotebook({
    getProfile: () => state.profile,
    changeGrade: (grade) => { changeGrade(state.profile, grade); saveProfile(state.profile, hud); refreshHud(); },
    resetProgress: () => { try { localStorage.removeItem(SAVE_KEY); localStorage.removeItem(SEED_KEY); } catch (error) { console.warn('Khong xoa duoc ho so:', error); } location.reload(); },
    isMuted: () => sfx.isMuted(),
    setMuted: (value) => { sfx.setMuted(value); try { localStorage.setItem(MUTE_KEY, value ? '1' : '0'); } catch (error) { console.warn('Khong luu duoc cai dat am thanh:', error); } },
  });
  const guideForward = new THREE.Vector3();
  const seeds = loadSeeds(), seedViews = seeds ? createSeedViews(scene, seeds) : null;
  if (seeds) hud.setSeeds(seeds.count, seeds.total);
  // ?wave=N bat dau tu chuyen thu N (de thu va chup anh kiem tra cac diem xa)
  const askedWave = Math.floor(Number(new URLSearchParams(location.search).get('wave')));
  const firstWave = Number.isFinite(askedWave) && askedWave >= 1 ? Math.min(askedWave, MAX_START_WAVE) : 1;
  const state = { profile: loadProfile(), battle: null, wave: firstWave - 1, asking: false, cleared: false, answered: 0, correct: 0, time: 0 };

  function startWave() {
    state.wave += 1; state.cleared = false; state.answered = 0; state.correct = 0;
    state.battle = createBattle(spawnEnemies(state.wave, player, rng), state.battle ? state.battle.faints : 0);
    views.reset(state.battle);
    refreshHud();
    const where = realm.waveHint ? realm.waveHint(state.wave) : null;
    hud.toast(where ?? (state.wave === 1 ? 'Các Bóng Lặng đang ngủ quanh đây. Lại gần và đánh thức chúng!' : `Chuyến ${state.wave}: Bóng Lặng ngủ say hơn rồi đấy!`), 3600);
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
    const solved = state.answered ? `Bé đã giải đúng ${state.correct}/${state.answered} bài trong chuyến này.` : 'Lần tới thử chiêu Tia Nắng nhé: giải đúng thì chiêu mạnh hơn nhiều!';
    hud.banner(realm.name === 'valley' ? 'Thung lũng đã thức giấc!' : 'Đảo đã thức giấc!', [solved, `Kỹ năng đã thành thạo: ${masteredCount(state.profile)}.`], 'Chuyến mới', startWave);
  }

  /** Mui ten chi toi Bong Lang gan nhat khi no o xa (the gioi rong de khong bi lac). */
  function updateGuide(b) {
    const target = nearestEnemy(b, player, Infinity);
    if (!target) { hud.setGuide(null); return; }
    const dx = target.x - player.x, dz = target.z - player.z, dist = Math.hypot(dx, dz);
    if (dist < GUIDE_FROM) { hud.setGuide(null); return; }
    camera.getWorldDirection(guideForward);
    // goc giua huong nhin cua may quay va huong toi muc tieu, tren mat phang ngang; duong la lech sang phai man hinh
    const angle = Math.atan2(guideForward.x * dz - guideForward.z * dx, guideForward.x * dx + guideForward.z * dz);
    hud.setGuide(angle, dist);
  }

  function collectSeeds() {
    stepCollection(seeds, player);
    if (seeds.events.picked.length === 0) return;
    sfx.seed(); hud.setSeeds(seeds.count, seeds.total);
    try { localStorage.setItem(SEED_KEY, JSON.stringify(takenIds(seeds))); } catch (error) { console.warn('Khong luu duoc Hat Nang:', error); }
    if (seeds.count === seeds.total) hud.toast('Bé đã nhặt hết Hạt Nắng của thung lũng! Giỏi quá!', 3200);
    else if (isMilestone(seeds)) hud.toast(`${seeds.count} Hạt Nắng rồi! Còn ${seeds.total - seeds.count} hạt đang chờ bé.`, 2600);
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
    let skillId, question;
    try { skillId = pickSkill(state.profile, rng); question = makeQuestion(skillId, rng); }
    catch (error) { console.error('Khong tao duoc bai tap:', error); hud.toast('Chưa ra được bài lúc này, bé thử lại nhé.'); return; }
    state.asking = true; // tu day den khi dong the, Mam va Bong Lang dung yen (xem timeScale)
    card.ask(question, 'Nạp chiêu Tia Nắng').then(({ correct }) => {
      state.answered += 1; if (correct) state.correct += 1;
      const { masteredNow } = recordAnswer(state.profile, skillId, correct);
      if (!correct) recordMistake(state.profile, question);
      saveProfile(state.profile, hud);
      const hit = castSkill(state.battle, player, correct);
      if (hit) views.beam(hit.target, hit.tier);
      if (masteredNow) sfx.mastered(); else if (correct) sfx.correct(hit ? hit.tier : 1); else sfx.wrong();
      if (masteredNow) hud.toast(`Bé đã thành thạo: ${skillById(skillId).name}! Cây Tâm vừa ra thêm quả.`, 3200);
      else if (correct && hit) hud.toast(PRAISE[hit.tier]);
      if (!hit) hud.toast('Bóng Lặng đã ở xa mất rồi. Lại gần hơn rồi ra chiêu nhé!');
      if (hit?.woke) onWoke(hit.target); else refreshHud();
    }).catch((error) => { console.error('Loi khi xu ly cau tra loi:', error); hud.toast('Có trục trặc nhỏ, bé thử lại nhé.'); })
      .finally(() => { state.asking = false; });
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
    timeScale: () => (!state.profile || notebook.isOpen() || state.asking ? 0 : 1),
    update(dt) {
      state.time += dt;
      tree.update(dt, state.time);
      if (seeds) {
        if (state.profile && !notebook.isOpen() && !state.asking) collectSeeds();
        seedViews.update(state.time);
      }
      const b = state.battle; if (!b) return;
      if (player.events.jumped) sfx.jump();
      if (player.events.landed) sfx.land();
      if (!state.cleared && !notebook.isOpen() && !state.asking) {
        stepBattle(b, player, dt);
        if (b.events.hit) { refreshHud(); sfx.hit(); hud.toast(b.events.fainted ? 'Mầm ngủ gật một chút. Dậy nào, không sao cả!' : 'Ối! Chạy ra khỏi vòng đỏ nhé.', 1600); }
        for (const s of b.events.struck) views.strike(s.x, s.z);
        hud.setSkillReady(nearestEnemy(b, player, BATTLE.skillRange) !== null);
        updateGuide(b);
      }
      views.update(dt, state.time, b, camera);
      U.player.value.set(player.x, player.y, player.z);
    },
    /** Dung cho anh chup kiem tra: mo mot bai mau ngay. */
    debugAsk() { if (state.profile) useSkill(); },
    runSpeed: TUNING.runSpeed,
  };
}
