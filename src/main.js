// Diem vao: chon the gioi theo ?world=..., dung no, dang ky, roi moi nap phan game dung chung.
// Thu tu nay bat buoc: cac module dung chung doc `realm` ngay khi duoc nap.
import { qs } from './core/quality.js';
import { setRealm } from './world/realm.js';

const WORLDS = { island: () => import('./worlds/island.js'), valley: () => import('./worlds/valley.js') };
const name = Object.hasOwn(WORLDS, qs.get('world') ?? '') ? qs.get('world') : 'island';
try {
  setRealm((await WORLDS[name]()).default);
  await import('./app.js');
} catch (error) {
  const loading = document.getElementById('loading');
  if (loading) loading.textContent = 'Không mở được game. Hãy kiểm tra mạng rồi tải lại trang.';
  throw error; // hop bao loi o index.html hien chi tiet
}
