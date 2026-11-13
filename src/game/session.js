// Mot chuyen di: noi luat doi dau, he hoc tap, giao dien va hinh anh. Khong chua luat; luat nam o cac *-core.js va learn/.
import * as THREE from 'three';
import { camera, scene, U } from '../core/stage.js';
import { toon } from '../world/materials.js';
import { realm } from '../world/realm.js';
import { BATTLE, allAwake, chargePouch, createBattle, createEnemy, leafAttack, nearestEnemy, stepBattle, throwOrb } from './battle-core.js';
import { TUNING } from './player-core.js';
import { makeQuestion, skillById } from '../learn/questions.js';
import { PUZZLE_KINDS, makePuzzle, pickKind } from '../learn/puzzles.js';
import { createPuzzleCard } from '../ui/puzzle-card.js';
import { createOanQuan } from '../ui/oanquan.js';
import { createJuice } from './juice.js';
import { createPlayground } from './playground-view.js';
import { ADAPTIVE, changeGrade, createProfile, masteredCount, pickSkill, recordAnswer, recordMistake } from '../learn/adaptive.js';
import { createEnemyViews } from './enemy-views.js';
import { createHud } from '../ui/hud.js';
import { createQuestionCard } from '../ui/question-card.js';
import { createNotebook } from '../ui/notebook.js';
import { createHeartTree } from './heart-tree.js';
import { createSfx } from './sfx.js';
import { isMilestone, stepCollection, takenIds } from './collect-core.js';
import { createSeedViews } from './seed-views.js';
import { CATALOG, SLOTS, balance, buy, catalogTotal, cheapestPrice, serializeWardrobe, shelf, toggleWear } from './shop-core.js';
import { createShopPanel } from '../ui/shop.js';
import { canStart, cancelJob, finishJob, startJob } from './mill-core.js';
import { applyOutfit } from '../actors/outfit.js';
import { BONUS_KEY, MUTE_KEY, POUCH_KEY, SEED_KEY, WARDROBE_KEY, eraseProgress, loadMill, loadPouch, loadProfile, loadSeeds, loadWardrobe, saveProfile, store } from './save.js';
import { createLoot } from './loot.js';

const groundAt = (x, z) => realm.groundAt(x, z);
const WAVE = { firstCount: 3, maxCount: 5, bigFrom: 2 };   // tu chuyen thu hai, moi trai co mot Bong Lang lon
const PUZZLE_SHARE = 0.65;   // phan cau do tuong tac khi nap Tui Nang; con lai la the bai theo suc (de Cay Tam van lon)
const OANQUAN_REWARD = { win: 3, draw: 2, lose: 1 };   // Hat Nang cho mot van choi het; thua van co qua
const STREAK_GAP = 1.6, POP_HEIGHT = 1.7;   // qua ngan nay giay khong trung don thi chuoi lien hoan ve 0; do cao chu bay tren dau dich
const CHARGE_PRAISE = { first: 'Giỏi quá!', later: 'Bé làm được rồi!', shown: 'Lần sau bé sẽ tự làm được!' };
const MAX_START_WAVE = 99;
const MILL_SPIN_BOOST = 5, SPLASH_EVERY = 0.34, SPLASH_MIN_SPEED = 1.5, STEP_LENGTH = 1.55;   // STEP_LENGTH: quang duong (m) giua hai tieng buoc chan   // coi xay quay nhanh sau me bot; nhip tieng nuoc khi loi
const SHOP_HINT_DELAY_MS = 3600;
const GUIDE_FROM = 25; // xa hon khoang nay (m) thi hien mui ten chi huong

/** Cho dung hop le cho Bong Lang: co dat, khong nam trong vat can, khong sat cho Mam dang dung. */
function spawnEnemies(wave, player, rng) {
  const spots = realm.spotsForWave ? realm.spotsForWave(wave) : realm.spawnSpots; // the gioi rong: moi chuyen o mot noi
  const valid = spots.filter(([x, z]) => Number.isFinite(groundAt(x, z)) && realm.colliders.every((c) => Math.hypot(x - c.x, z - c.z) > c.r + 1));
  const away = valid.filter(([x, z]) => Math.hypot(x - player.x, z - player.z) > 4);
  const free = away.length ? away : valid; // Mam dung sat moi cho: van phai co dich, neu khong chuyen di khong bao gio xong
  if (!free.length) throw new Error('khong co cho hop le nao de dat Bong Lang');
  for (let i = free.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [free[i], free[j]] = [free[j], free[i]]; }
  const count = Math.min(WAVE.firstCount + wave - 1, WAVE.maxCount, free.length);
  return free.slice(0, count).map(([x, z], i) => { const big = i === 0 && wave >= WAVE.bigFrom; return createEnemy(`w${wave}e${i}`, x, z, big ? BATTLE.bigWake : BATTLE.wake, big); });
}

export function createSession(play) {
  const player = play.player, rng = Math.random;
  const views = createEnemyViews(scene, toon, groundAt), card = createQuestionCard(), puzzleCard = createPuzzleCard();
  const other = realm.name === 'valley' ? { id: 'island', label: 'Đảo Mây' } : { id: 'valley', label: 'Thung lũng' };
  const hud = createHud({ onLeaf: useLeaf, onSkill: useSkill, onAction: useAction, worldLabel: other.label, onSwitchWorld: () => { const q = new URLSearchParams(location.search); q.set('world', other.id); location.search = q.toString(); } });
  const sfx = createSfx(), tree = createHeartTree(scene, toon, groundAt, realm.treeSpot);
  try { sfx.setMuted(localStorage.getItem(MUTE_KEY) === '1'); } catch (error) { console.warn('Khong doc duoc cai dat am thanh:', error); }
  const notebook = createNotebook({
    getProfile: () => state.profile,
    changeGrade: (grade) => { changeGrade(state.profile, grade); saveProfile(state.profile, hud); refreshHud(); },
    resetProgress: () => { try { eraseProgress(); } catch (error) { console.warn('Khong xoa duoc ho so:', error); } location.reload(); },
    isMuted: () => sfx.isMuted(),
    setMuted: (value) => { sfx.setMuted(value); try { localStorage.setItem(MUTE_KEY, value ? '1' : '0'); } catch (error) { console.warn('Khong luu duoc cai dat am thanh:', error); } },
  });
  const guideForward = new THREE.Vector3();
  const seedSave = loadSeeds(), seeds = seedSave?.collection ?? null, seedViews = seeds ? createSeedViews(scene, seeds) : null;
  const wardrobe = loadWardrobe(), mill = loadMill(), millSpot = realm.mill ?? null;
  const juice = createJuice(camera), yardSpot = realm.playground ?? null;
  const yard = yardSpot ? createPlayground(scene, toon, groundAt, yardSpot) : null;
  const oanquan = createOanQuan({ onSound: (kind) => { if (kind === 'capture') sfx.correct(1); else if (kind === 'win') sfx.cleared(); else if (kind === 'end') sfx.wrong(); else sfx.pebble(); } });
  const popAt = (enemy, text, style) => juice.pop(enemy.x, groundAt(enemy.x, enemy.z) + POP_HEIGHT * (enemy.big ? 1.5 : 1), enemy.z, text, style);
  let streak = 0, streakAge = 0;
  const addStreak = (hits) => { streak += hits; streakAge = 0; juice.streak(streak); };
  applyOutfit(wardrobe.worn);
  // ?wear=id,id mac thu cac mon (chi de chup anh kiem tra; khong luu, khong tinh la so huu)
  const askedWear = (new URLSearchParams(location.search).get('wear') ?? '').split(',');
  if (askedWear[0]) applyOutfit(Object.fromEntries(SLOTS.map((slot) => [slot.id, CATALOG.find((item) => item.slot === slot.id && askedWear.includes(item.id))?.id ?? null])));
  // Quay hang chi co o the gioi dat `realm.shop` va co Hat Nang. Hat da nhat ma lan nay khong hien (parked) van la cua be.
  const stall = seeds && realm.shop ? realm.shop : null, collected = () => (seeds ? seeds.count + seedSave.parked.length : 0) + mill.bonus;
  const refreshSeeds = () => { if (seeds) hud.setSeeds(seeds.count, seeds.total, balance(wardrobe, collected())); };
  refreshSeeds();
  // khong nem loi: be van choi va doi duoc phan lon mon; nguoi lam game thay loi nay trong console khi thu
  if (stall && catalogTotal() > seeds.total) console.error(`Quay hang can ${catalogTotal()} Hat Nang nhung the gioi chi co ${seeds.total}: be se khong doi duoc het`);
  const shopPanel = stall ? createShopPanel({
    getView: () => ({ balance: balance(wardrobe, collected()), slots: SLOTS, items: shelf(wardrobe, collected()) }),
    onBuy: (id) => { if (!buy(wardrobe, id, collected()).ok) return; const saved = wardrobeChanged(); refreshSeeds(); sfx.buy(); if (saved) hud.toast('Mầm có đồ mới rồi! Xinh quá!', 2200); },
    onWear: (id) => { if (toggleWear(wardrobe, id)) wardrobeChanged(); },
  }) : null;
  let splashWait = 0, stepLeft = 0, leftFoot = false;
  let shopHinted = wardrobe.owned.size > 0;   // da tung doi do thi be biet quay hang roi
  const near = (spot) => Boolean(spot) && Math.hypot(player.x - spot.x, player.z - spot.z) < spot.reach;
  const busy = () => notebook.isOpen() || state.asking || Boolean(shopPanel?.isOpen()) || loot.isOpen();
  // tui do, vat hai luom, vat lieu roi ra, Hat Nang moc lai (xem loot.js)
  const loot = createLoot({ enabled: Boolean(stall), player, seeds, atStall: () => near(stall), canOpen: () => Boolean(state.profile) && !busy(), addBonus, juice, sfx, rng });
  // ?wave=N bat dau tu chuyen thu N (de thu va chup anh kiem tra cac diem xa)
  const askedWave = Math.floor(Number(new URLSearchParams(location.search).get('wave')));
  const firstWave = Number.isFinite(askedWave) && askedWave >= 1 ? Math.min(askedWave, MAX_START_WAVE) : 1;
  const state = { profile: loadProfile(), battle: null, wave: firstWave - 1, asking: false, cleared: false, answered: 0, correct: 0, puzzles: 0, lastKind: null, time: 0 };

  function startWave() {
    state.wave += 1; state.cleared = false; state.answered = 0; state.correct = 0; state.puzzles = 0;
    state.battle = createBattle(spawnEnemies(state.wave, player, rng), state.battle ? state.battle.faints : 0, state.battle ? state.battle.pouch : loadPouch());
    views.reset(state.battle);
    loot.newJourney(state.wave > firstWave);
    refreshHud();
    const where = realm.waveHint ? realm.waveHint(state.wave) : null;
    hud.toast(where ?? (state.wave === 1 ? 'Các Bóng Lặng đang ngủ quanh đây. Lại gần và giữ nút Lá để đánh thức chúng!' : `Chuyến ${state.wave}: có một Bóng Lặng lớn đấy!`), 3600);
  }
  function refreshHud() {
    const b = state.battle, awake = b.enemies.filter((e) => e.awake).length;
    hud.setHearts(b.hearts, BATTLE.hearts); hud.setPouch(b.pouch, BATTLE.pouchMax);
    hud.setProgress(`Đánh thức ${awake}/${b.enemies.length} · Thành thạo ${masteredCount(state.profile)} kỹ năng`);
    tree.setMastered(masteredCount(state.profile));
  }
  /** Mot hay nhieu Bong Lang vua thuc (mot vien nang co the danh thuc ca nhom). */
  function onWoke(enemies) {
    for (const enemy of enemies) loot.drop(enemy);
    for (const enemy of enemies) { views.wake(enemy); popAt(enemy, 'Thức rồi!', { color: '#ffe27a', size: enemy.big ? 34 : 26 }); if (enemy.big) juice.bump(0.45); }
    refreshHud(); sfx.woke();
    if (!allAwake(state.battle)) return;
    state.cleared = true; sfx.cleared();
    const done = state.answered + state.puzzles;
    const solved = done ? `Bé đã giải ${done} câu đố và bài tập trong chuyến này.` : 'Mẹo: bấm "Nạp nắng" và giải một câu đố để có 3 viên nắng, ném một viên là thức cả nhóm!';
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

  function wardrobeChanged() {
    applyOutfit(wardrobe.worn);
    try { localStorage.setItem(WARDROBE_KEY, JSON.stringify(serializeWardrobe(wardrobe))); return true; }
    catch (error) { console.warn('Khong luu duoc tu do:', error); hud.toast('Máy không lưu được đồ mới lần này.', 2600); return false; }
  }
  /** Viec lam duoc o cho Mam dang dung: nhan tren nut, hoac null. */
  function actionLabel() {
    if (!state.profile || busy()) return null;
    if (near(stall)) return 'Vào quầy hàng';
    if (near(yardSpot)) return 'Chơi ô ăn quan';
    if (near(millSpot) && !state.cleared) return canStart(mill, state.wave) ? 'Cân bột' : 'Bột đã cân xong ✓';
    return null;
  }
  function useAction() {
    if (!state.profile || busy()) return;
    if (near(stall)) shopPanel.open();
    else if (near(yardSpot)) startOanQuan();
    else if (near(millSpot) && !state.cleared) { if (canStart(mill, state.wave)) startMill(); else hud.toast('Mẻ bột chuyến này xong rồi. Chuyến sau cối xay lại có mẻ mới nhé!', 2600); }
  }

  /** Cham diem mot bai da tra loi: cap nhat ho so, bai sai, luu. Tra ve true neu be vua thanh thao ky nang. */
  function grade(skillId, question, correct) {
    state.answered += 1; if (correct) state.correct += 1;
    const { masteredNow } = recordAnswer(state.profile, skillId, correct);
    if (!correct) recordMistake(state.profile, question);
    saveProfile(state.profile, hud);
    return masteredNow;
  }

  /** Them Hat Nang thuong (coi xay, tro choi dan gian) va luu lai. */
  function addBonus(amount) {
    mill.bonus += amount;
    store(BONUS_KEY, mill.bonus); refreshSeeds();
  }

  /** Mot van o an quan voi ban Nhim. Choi het van la co qua; nghi giua chung thi khong mat gi. */
  function startOanQuan() {
    state.asking = true;
    let game;
    try { game = oanquan.play(); }
    catch (error) { console.error('Khong mo duoc ban o an quan:', error); hud.toast('Có trục trặc nhỏ, bé thử lại nhé.'); state.asking = false; return; }
    game.then(({ result }) => {
      if (!result) return;
      const reward = OANQUAN_REWARD[result];
      addBonus(reward);
      hud.toast(`${result === 'win' ? 'Bé thắng ván ô ăn quan!' : 'Ván ô ăn quan vui quá!'} Bé được ${reward} Hạt Nắng.`, 3200);
      hintShop();
    }).catch((error) => { console.error('Loi trong van o an quan:', error); hud.toast('Có trục trặc nhỏ, bé thử lại nhé.'); })
      .finally(() => { state.asking = false; });
  }

  /** Can mot me bot: MOT cau do can thang bang; xong thi nhan Hat Nang va coi xay quay nhanh. Luat o mill-core.js. */
  function startMill() {
    if (!startJob(mill, state.wave)) return;
    state.asking = true;
    const stop = (error) => { console.error('Khong can duoc me bot:', error); cancelJob(mill); hud.toast('Có trục trặc nhỏ, bé thử lại nhé.'); };
    let asked;
    try { asked = puzzleCard.ask(makePuzzle('balance', state.profile.grade, rng), 'Cân bột giúp cối xay'); }
    catch (error) { stop(error); state.asking = false; return; }   // cau do khong mo duoc thi khong de game dung hinh mai
    asked.then(({ quality }) => {
      if (!quality) { cancelJob(mill); return; }   // be bam "De sau": khong mat gi, quay lai luc nao cung duoc
      const reward = finishJob(mill, quality);
      state.puzzles += 1; realm.millBoost = MILL_SPIN_BOOST;
      addBonus(0); refreshHud(); sfx.cleared();   // finishJob da cong thuong; o day chi luu va cap nhat
      hud.toast(`Cối xay quay tít! ${CHARGE_PRAISE[quality]} Bé được ${reward} Hạt Nắng.`, 3400);
      hintShop();
    }).catch(stop).finally(() => { state.asking = false; });
  }

  /** Nhac mot lan khi be lan dau du hat cho mon re nhat. Tra loi sau loi khen dang hien de khong de mat no. */
  function hintShop() {
    if (!stall || shopHinted || balance(wardrobe, collected()) < cheapestPrice()) return;
    shopHinted = true;
    setTimeout(() => hud.toast('Bé đủ Hạt Nắng để đổi đồ rồi! Ghé quầy cô Thỏ Bông ở cổng làng nhé.', 3600), SHOP_HINT_DELAY_MS);
  }

  function collectSeeds() {
    stepCollection(seeds, player);
    if (seeds.events.picked.length === 0) return;
    sfx.seed(); refreshSeeds();
    for (const item of seeds.events.picked) juice.pop(item.x, player.y + 1.6, item.z, '+1 ✦', { color: '#ffe27a', size: 22 });
    store(SEED_KEY, [...takenIds(seeds), ...seedSave.parked]);
    if (seeds.count === seeds.total) hud.toast('Bé đã nhặt hết Hạt Nắng của thung lũng! Giỏi quá!', 3200);
    else if (isMilestone(seeds)) hud.toast(`${seeds.count} Hạt Nắng rồi! Còn ${seeds.total - seeds.count} hạt đang chờ bé.`, 2600);
    else hintShop();
  }

  function useLeaf() {
    if (!state.battle || busy() || state.cleared) return;
    const hit = leafAttack(state.battle, player);
    if (!hit) return;
    views.leaf(player, hit.target); views.hit(hit.target); sfx.leaf();
    popAt(hit.target, `+${BATTLE.leafDamage}`, { color: '#b9f59a', size: 20 }); addStreak(1);
    if (hit.woke) onWoke([hit.target]); else refreshHud();
  }

  function savePouch() {
    store(POUCH_KEY, state.battle.pouch);
  }

  /** Nut Tui Nang: con vien thi nem; het vien thi moi be nap bang mot cau do (be tu chon, khong bat buoc). */
  function useSkill() {
    if (!state.battle || busy()) return;
    if (state.battle.pouch === 0) { chargeUp(); return; }
    if (state.cleared) { hud.toast('Bóng Lặng thức hết rồi! Bé giữ viên nắng cho chuyến sau nhé.'); return; }
    const thrown = throwOrb(state.battle, player);
    if (!thrown) { hud.toast('Lại gần một Bóng Lặng rồi hãy ném nhé!'); return; }
    views.orb(player, thrown.target); sfx.orb(); savePouch();
    for (const hit of thrown.hits) { views.hit(hit.enemy); popAt(hit.enemy, `+${BATTLE.orbDamage}`, { color: '#ffd24a', size: 32 }); }
    juice.flash('#fff0b0', 0.45); juice.bump(0.35); addStreak(thrown.hits.length);
    const woke = thrown.hits.filter((hit) => hit.woke).map((hit) => hit.enemy);
    if (woke.length) onWoke(woke); else refreshHud();
  }

  /** Them vien nang sau mot cau do hay mot bai, luu tui, khen be. */
  function charged(quality, extra = '') {
    const gained = chargePouch(state.battle, quality);
    savePouch(); refreshHud();
    hud.toast(`${CHARGE_PRAISE[quality]} Túi Nắng có thêm ${gained} viên.${extra}`, extra ? 3200 : 2400);
  }

  /** Nap Tui Nang: phan lon la do vui tuong tac, xen ke the bai theo suc. forceKind: ep mot loai do (de chup anh kiem tra). */
  function chargeUp(forceKind = null) {
    state.asking = true; // tu day den khi dong the, Mam va Bong Lang dung yen (xem timeScale)
    const done = () => { state.asking = false; };
    const failed = (error) => { console.error('Loi khi nap Tui Nang:', error); hud.toast('Có trục trặc nhỏ, bé thử lại nhé.'); };
    try {
      if (forceKind || rng() < PUZZLE_SHARE) {
        const kind = forceKind ?? pickKind(state.lastKind, rng);
        state.lastKind = kind;
        puzzleCard.ask(makePuzzle(kind, state.profile.grade, rng), 'Nạp Túi Nắng').then(({ quality }) => {
          if (!quality) return;
          state.puzzles += 1;
          if (quality === 'shown') sfx.wrong(); else sfx.correct(quality === 'first' ? 2 : 1);
          charged(quality);
        }).catch(failed).finally(done);
        return;
      }
      const skillId = pickSkill(state.profile, rng), question = makeQuestion(skillId, rng);
      card.ask(question, 'Nạp Túi Nắng', { skippable: true }).then((result) => {
        if (result.skipped) return;
        const masteredNow = grade(skillId, question, result.correct);
        if (masteredNow) sfx.mastered(); else if (result.correct) sfx.correct(2); else sfx.wrong();
        charged(result.correct ? 'first' : 'shown', masteredNow ? ` Bé đã thành thạo: ${skillById(skillId).name}! Cây Tâm vừa ra thêm quả.` : '');
      }).catch(failed).finally(done);
    } catch (error) { failed(error); done(); }
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
    timeScale: () => (!state.profile || busy() ? 0 : 1),
    update(dt) {
      state.time += dt;
      tree.update(dt, state.time);
      if (yard) yard.update(state.time);
      streakAge += dt; if (streakAge > STREAK_GAP) streak = 0;
      if (seeds) {
        if (state.profile && !busy()) collectSeeds();
        seedViews.update(state.time);
      }
      if (loot.update(state.time, Boolean(state.profile) && !busy())) hintShop();
      hud.setAction(actionLabel());
      // tieng nuoc khi Mam loi (the gioi bao qua realm.wading)
      // tieng buoc chan theo quang duong da di va mat nen (the gioi bao qua realm.footing); dang loi nuoc thi da co tieng nuoc
      const pace = Math.hypot(player.vx, player.vz);
      if (player.grounded && pace > SPLASH_MIN_SPEED && !realm.wading && !busy()) { stepLeft -= pace * dt; if (stepLeft <= 0) { stepLeft = STEP_LENGTH; leftFoot = !leftFoot; sfx.step(realm.footing ? realm.footing(player.x, player.z) : 'grass', leftFoot); } } else stepLeft = 0;
      if (realm.wading && player.grounded && Math.hypot(player.vx, player.vz) > SPLASH_MIN_SPEED && !busy()) { splashWait -= dt; if (splashWait <= 0) { splashWait = SPLASH_EVERY; sfx.splash(); } } else splashWait = 0;
      const b = state.battle; if (!b) return;
      if (player.events.jumped) sfx.jump();
      if (player.events.landed) sfx.land();
      if (!state.cleared && !busy()) {
        if (hud.leafHeld()) useLeaf();   // giu nut La la ban lien tuc; nhip ban do battle-core quyet dinh
        stepBattle(b, player, dt);
        if (b.events.hit) { refreshHud(); sfx.hit(); juice.flash('#ff5a4a', 0.5); juice.bump(0.5); streak = 0; hud.toast(b.events.fainted ? 'Mầm ngủ gật một chút. Dậy nào, không sao cả!' : 'Ối! Chạy ra khỏi vòng đỏ nhé.', 1600); }
        for (const s of b.events.struck) views.strike(s.x, s.z);
        hud.setSkillReady(b.pouch === 0 || nearestEnemy(b, player, BATTLE.orbRange) !== null);
        updateGuide(b);
      }
      views.update(dt, state.time, b, camera);
      U.player.value.set(player.x, player.y, player.z);
    },
    /** Dung cho anh chup kiem tra: mo mot bai mau ngay. */
    debugAsk() { if (state.profile && !busy()) chargeUp(); },
    /** Dung cho anh chup kiem tra: mo ngay mot cau do thuoc loai `kind`. */
    debugPuzzle(kind) { if (state.profile && !busy() && PUZZLE_KINDS.includes(kind)) chargeUp(kind); },
    /** Dung cho anh chup kiem tra: mo bang doi do ngay. */
    debugShop() { if (shopPanel && state.profile) shopPanel.open(); },
    /** Dung cho anh chup kiem tra: bat dau me bot ngay. */
    /** Dung cho anh chup kiem tra: mo ngay ban o an quan. */
    debugOanQuan() { if (state.profile && !busy()) startOanQuan(); },
    debugMill() { if (millSpot && state.profile && !busy()) startMill(); },
    runSpeed: TUNING.runSpeed,
  };
}
