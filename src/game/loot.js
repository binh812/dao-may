// Do nhat duoc ngoai Hat Nang chinh: tui do, vat hai luom (hoa, nam, go, da pha le), vat lieu Bong Lang de lai,
// va Hat Nang moc lai. Noi luat (bag-core, collect-core) voi hinh, tieng va luu tru; khong chua luat.
import { scene } from '../core/stage.js';
import { toon } from '../world/materials.js';
import { realm } from '../world/realm.js';
import { MATERIALS, addItem, bagTotal, bagView, serializeBag, trade } from './bag-core.js';
import { createCollection, stepCollection } from './collect-core.js';
import { createGatherViews } from './gather-views.js';
import { createSeedViews } from './seed-views.js';
import { BAG_KEY, loadBag, store } from './save.js';
import { createBagUi } from '../ui/bag.js';

const DROPS = ['hoa', 'go', 'nam'], BIG_DROP = { id: 'da', amount: 2 };   // Bong Lang thuc giac de lai vat lieu; con lon de lai da pha le
const REGROW = 6;          // moi chuyen moi, ngan nay Hat Nang da nhat moc lai (nhat lan nua thi tinh la hat thuong)
const DROP_HEIGHT = 0.9, PICK_HEIGHT = 1.2, SEED_POP_HEIGHT = 1.6;
const ICON = Object.fromEntries(MATERIALS.map((m) => [m.id, m.icon]));

/**
 * player: nhan vat; seeds: bo Hat Nang chinh (hoac null); atStall(): Mam co dang o quay hang khong;
 * canOpen(): luc nay mo tui duoc khong; addBonus(n): cong Hat Nang thuong; juice, hud, sfx, rng: phan hoi va ngau nhien.
 */
export function createLoot({ player, seeds, atStall, canOpen, addBonus, juice, hud, sfx, rng }) {
  const bag = loadBag(), groundAt = (x, z) => realm.groundAt(x, z);
  // vat hai luom moc lai moi chuyen di nen khong luu
  const wild = realm.gatherables?.length ? createCollection(realm.gatherables) : null, wildViews = wild ? createGatherViews(scene, toon, wild) : null;
  let sprouts = null, sproutViews = null;
  const bagUi = createBagUi({
    canOpen,
    getView: () => ({ items: bagView(bag), total: bagTotal(bag), canTrade: atStall() }),
    onTrade: (id) => { if (!atStall()) return; const deal = trade(bag, id); if (!deal.ok) return; store(BAG_KEY, serializeBag(bag)); addBonus(deal.seeds); sfx.buy(); },
  });

  /** Bo vat vao tui, luu, hien chu bay tai cho nhat. Tui day loai do thi nhac be di doi. */
  function gain(id, amount, x, y, z) {
    const added = addItem(bag, id, amount);
    if (added > 0) { store(BAG_KEY, serializeBag(bag)); bagUi.refresh(); juice.pop(x, y, z, `+${added} ${ICON[id]}`, { size: 24 }); }
    else hud.toast('Túi đầy loại này rồi! Bé mang tới quầy cô Thỏ Bông đổi lấy Hạt Nắng nhé.', 2600);
  }

  return {
    isOpen: () => bagUi.isOpen(),
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
