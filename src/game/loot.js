// Do nhat duoc ngoai Hat Nang chinh: tui do, vat hai luom (hoa, nam, go, da pha le), vat lieu Bong Lang de lai,
// Hat Nang moc lai, va viec giup dan lang (tang vat lieu trong tui). Noi luat (bag-core, collect-core, errand-core) voi hinh,
// tieng va luu tru; khong chua luat.
import { scene } from '../core/stage.js';
import { toon } from '../world/materials.js';
import { realm } from '../world/realm.js';
import { MATERIALS, addItem, bagTotal, bagView, serializeBag, trade } from './bag-core.js';
import { createCollection, stepCollection } from './collect-core.js';
import { createErrands, errandFor, giftLabel, help, missingFor } from './errand-core.js';
import { createGatherViews } from './gather-views.js';
import { createSeedViews } from './seed-views.js';
import { BAG_KEY, loadBag, store } from './save.js';
import { createBagUi } from '../ui/bag.js';

const DROPS = ['hoa', 'go', 'nam'], BIG_DROP = { id: 'da', amount: 2 };   // Bong Lang thuc giac de lai vat lieu; con lon de lai da pha le
const REGROW = 6;          // moi chuyen moi, ngan nay Hat Nang da nhat moc lai (nhat lan nua thi tinh la hat thuong)
const OVERFLOW_SEEDS = 1;  // tui day loai do: moi lan nhat doi thang thanh ngan nay Hat Nang, de khong vat nao bi mat
const DROP_HEIGHT = 0.9, PICK_HEIGHT = 1.2, SEED_POP_HEIGHT = 1.9;
const ICON = Object.fromEntries(MATERIALS.map((m) => [m.id, m.icon]));

/**
 * enabled: the gioi co quay hang de doi do thi moi co tui (khong thi tra ve ban khong lam gi);
 * player: nhan vat; seeds: bo Hat Nang chinh (hoac null); atStall(): Mam co dang o quay hang khong;
 * canOpen(): luc nay mo tui duoc khong; addBonus(n): cong Hat Nang thuong; juice, hud, sfx, rng: phan hoi va ngau nhien.
 */
export function createLoot({ enabled, player, seeds, atStall, canOpen, addBonus, juice, sfx, rng }) {
  if (!enabled) return { isOpen: () => false, newJourney() {}, drop() {}, update: () => false, errandOf: () => null, giftLabel: () => null, gift: () => null };
  const bag = loadBag(), errands = createErrands(), groundAt = (x, z) => realm.groundAt(x, z);
  // vat hai luom moc lai moi chuyen di nen khong luu
  const wild = realm.gatherables?.length ? createCollection(realm.gatherables) : null, wildViews = wild ? createGatherViews(scene, toon, wild) : null;
  let sprouts = null, sproutViews = null;
  const bagUi = createBagUi({
    canOpen,
    getView: () => ({ items: bagView(bag), total: bagTotal(bag), canTrade: atStall() }),
    onTrade: (id) => { if (!atStall()) return; const deal = trade(bag, id); if (!deal.ok) return; store(BAG_KEY, serializeBag(bag)); addBonus(deal.seeds); sfx.buy(); },
  });

  /** Bo vat vao tui, luu, hien chu bay tai cho nhat. Phan khong vua tui (loai do da day) doi thang thanh Hat Nang: khong mat gi. */
  function gain(id, amount, x, y, z) {
    const added = addItem(bag, id, amount);
    if (added > 0) { store(BAG_KEY, serializeBag(bag)); bagUi.refresh(); juice.pop(x, y, z, `+${added} ${ICON[id]}`, { size: 24 }); }
    if (added < amount) { addBonus(OVERFLOW_SEEDS); juice.pop(x, y + 0.5, z, `+${OVERFLOW_SEEDS} ✦`, { color: '#ffe27a', size: 22 }); }
  }

  return {
    isOpen: () => bagUi.isOpen(),
    /** Viec ma dan lang `giver` nho o chuyen di nay, hoac null. */
    errandOf: (giver, journey) => errandFor(errands, giver, journey),
    /** Chu tren nut tang do khi be dung canh `friend` va trong tui co du; khong thi null. */
    giftLabel(friend, journey) {
      const errand = errandFor(errands, friend.id, journey);
      return errand && missingFor(bag, errand) === 0 ? giftLabel(errand, friend.name) : null;
    },
    /** Be bam tang: tru vat lieu, cong Hat Nang, hien so bay. Tra ve viec vua giup (de noi loi cam on) hoac null neu khong tang duoc. */
    gift(friend, journey) {
      const errand = errandFor(errands, friend.id, journey);
      if (!errand) return null;
      const result = help(errands, bag, errand, journey);
      if (!result.ok) return null;
      addBonus(result.seeds);                        // cong thuong TRUOC khi luu tui: co truc trac giua chung thi be khong mat do ma khong duoc gi
      store(BAG_KEY, serializeBag(bag)); bagUi.refresh(); sfx.buy();
      juice.pop(friend.x, groundAt(friend.x, friend.z) + SEED_POP_HEIGHT, friend.z, `+${result.seeds} ✦`, { color: '#ffe27a', size: 26 });
      return errand;
    },
    /** Dau moi chuyen di: vat hai luom moc lai; tu chuyen thu hai cua lan choi, vai Hat Nang da nhat moc lai dung cho cu. */
    newJourney(regrowSeeds) {
      if (wild) for (const item of wild.items) item.taken = false;
      if (sproutViews) { sproutViews.dispose(); sproutViews = null; sprouts = null; }
      if (!seeds || !regrowSeeds) return;
      const taken = seeds.items.filter((item) => item.taken);
      for (let i = taken.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [taken[i], taken[j]] = [taken[j], taken[i]]; }
      if (!taken.length) return;
      sprouts = createCollection(taken.slice(0, REGROW).map((item) => ({ id: item.id, x: item.x, y: item.y, z: item.z })));
      sproutViews = createSeedViews(scene, sprouts);
    },
    /** Bong Lang vua thuc de lai vat lieu (vao thang tui). */
    drop(enemy) {
      const loot = enemy.big ? BIG_DROP : { id: DROPS[Math.floor(rng() * DROPS.length)], amount: 1 };
      gain(loot.id, loot.amount, enemy.x, groundAt(enemy.x, enemy.z) + DROP_HEIGHT, enemy.z);
    },
    /** Moi khung hinh. active = Mam dang choi (khong mo bang nao): chi luc do moi nhat. Tra ve true neu vua nhat duoc Hat Nang moc lai. */
    update(time, active) {
      let pickedSeed = false;
      if (active && wild) { stepCollection(wild, player); for (const item of wild.events.picked) { sfx.seed(); gain(item.kind, 1, item.x, item.y + PICK_HEIGHT, item.z); } }
      if (active && sprouts) {
        stepCollection(sprouts, player);
        if (sprouts.events.picked.length) {
          sfx.seed(); addBonus(sprouts.events.picked.length); pickedSeed = true;
          for (const item of sprouts.events.picked) juice.pop(item.x, player.y + SEED_POP_HEIGHT, item.z, '+1 ✦', { color: '#ffe27a', size: 22 });
        }
      }
      if (wildViews) wildViews.update(time);
      if (sproutViews) sproutViews.update(time);
      return pickedSeed;
    },
  };
}
