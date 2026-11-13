// Doc va ghi tien do trong localStorage: ho so hoc, Hat Nang, tu do, hat thuong, Tui Nang, tui do. Khong chua luat.
// Doc hong thi tra ve gia tri trong (va ghi canh bao), khong bao gio lam game dung.
import { realm } from '../world/realm.js';
import { reviveProfile } from '../learn/adaptive.js';
import { revivePouch } from './battle-core.js';
import { createCollection } from './collect-core.js';
import { createWardrobe } from './shop-core.js';
import { createMill } from './mill-core.js';
import { createBag } from './bag-core.js';

export const SAVE_KEY = 'daomay.profile.v1';
export const MUTE_KEY = 'daomay.muted';
// cac khoa duoi day dung chung cho moi the gioi
export const WARDROBE_KEY = 'daomay.wardrobe.v1';
export const BONUS_KEY = 'daomay.bonus.v1';
export const POUCH_KEY = 'daomay.pouch.v1';
export const BAG_KEY = 'daomay.bag.v1';
const SEED_PREFIX = 'daomay.seeds.';
export const SEED_KEY = `${SEED_PREFIX}${realm.name}.v1`;   // Hat Nang da nhat, luu rieng cho tung the gioi

/** Ghi mot gia tri; khong ghi duoc thi canh bao va tra ve false (noi goi quyet dinh co bao cho be khong). */
export function store(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; }
  catch (error) { console.warn(`Khong luu duoc ${key}:`, error); return false; }
}
/** Tui do da luu; khong doc duoc thi coi nhu tui rong. */
export function loadBag() {
  try { return createBag(JSON.parse(localStorage.getItem(BAG_KEY) ?? 'null')); }
  catch (error) { console.warn('Khong doc duoc tui do:', error); return createBag(); }
}

export function loadProfile() {
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
export function saveProfile(profile, hud) {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(profile)); }
  catch (error) { console.warn('Khong luu duoc ho so:', error); hud.toast('Máy không lưu được tiến độ lần này.', 2600); }
}

/** Hat Nang cua the gioi nay (neu co): doc cac hat da nhat tu lan choi truoc; khong doc duoc thi coi nhu chua nhat. */
export function loadSeeds() {
  if (!realm.collectibles?.length) return null;
  let saved = [];
  try { const raw = JSON.parse(localStorage.getItem(SEED_KEY) ?? '[]'); if (Array.isArray(raw)) saved = raw.filter((id) => typeof id === 'string'); }
  catch (error) { console.warn('Khong doc duoc Hat Nang da nhat:', error); }
  // id da luu ma lan nay khong co (cho dat bi vat can chiem o muc do hoa nay) van duoc giu lai khi ghi, de lan sau khong mat
  const known = new Set(realm.collectibles.map((item) => item.id));
  return { collection: createCollection(realm.collectibles, saved), parked: saved.filter((id) => !known.has(id)) };
}

/** Tu do da luu; khong doc duoc thi coi nhu chua co mon nao (so du tinh lai tu so hat da nhat nen be khong mat hat). */
export function loadWardrobe() {
  try { return createWardrobe(JSON.parse(localStorage.getItem(WARDROBE_KEY) ?? 'null')); }
  catch (error) { console.warn('Khong doc duoc tu do cua Mam:', error); return createWardrobe(); }
}
/** Hat Nang thuong (xay bot) da luu; khong doc duoc thi coi nhu 0. */
export function loadMill() {
  try { return createMill(JSON.parse(localStorage.getItem(BONUS_KEY) ?? '0')); }
  catch (error) { console.warn('Khong doc duoc Hat Nang thuong:', error); return createMill(); }
}
/** So vien nang con trong tui tu lan choi truoc; khong doc duoc thi coi nhu tui rong. */
export function loadPouch() {
  try { return revivePouch(JSON.parse(localStorage.getItem(POUCH_KEY) ?? '0')); }
  catch (error) { console.warn('Khong doc duoc Tui Nang:', error); return 0; }
}
/** Xoa moi tien do: ho so hoc, Hat Nang cua moi the gioi, tu do, Tui Nang. */
export function eraseProgress() {
  const seedKeys = [];
  for (let i = 0; i < localStorage.length; i++) { const key = localStorage.key(i); if (key?.startsWith(SEED_PREFIX)) seedKeys.push(key); }
  for (const key of [SAVE_KEY, WARDROBE_KEY, BONUS_KEY, POUCH_KEY, BAG_KEY, ...seedKeys]) localStorage.removeItem(key);
}
