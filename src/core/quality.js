

// ---------------------------------------------------------------- quality
const qs = new URLSearchParams(location.search);
const isMobile = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
const TIERS = {
  low:    { label: 'Thấp',  dpr: 1.0, msaa: 0, shadow: 1024, grass: 16000,  aoTaps: 0,  dofTaps: 0,  blobDetail: 3, leaves: 55,  field: 1500, volSteps: 0,  rain: 1500, paintRadius: 0 },
  medium: { label: 'Vừa',   dpr: 3.0,  msaa: 0, shadow: 2048, grass: 64000,  aoTaps: 8,  dofTaps: 10, blobDetail: 3, leaves: 120, field: 5000, volSteps: 8,  rain: 3500, paintRadius: 2 },
  high:   { label: 'Cao',   dpr: 3.0, msaa: 4, shadow: 2048, grass: 110000, aoTaps: 14, dofTaps: 20, blobDetail: 4, leaves: 150, field: 7000, volSteps: 12, rain: 7000, paintRadius: 3 },
};
// dpr la tran do phan giai (so diem anh that tren moi diem CSS). Dien thoai thuong co 2.6-3; tran 1.5 lam ca canh mo.
// Do 14/11/2026 tren may anh Ben: 60 khung hinh o muc 'Vua' voi tran 1.5. Neu may yeu, app.js tu ha do phan giai khi duoi 42 khung hinh.
// Muc do hoa: tham so ?q= > muc nguoi choi da chon lan truoc (luu trong may) > mac dinh theo loai may.
const TIER_KEY = 'daomay.tier';
function savedTier() {
  try { return localStorage.getItem(TIER_KEY); } catch (error) { console.warn('Khong doc duoc muc do hoa da luu:', error); return null; }
}
/** Nho muc do hoa nguoi choi vua chon de lan mo sau dung lai. */
function rememberTier(name) {
  if (!TIERS[name]) throw new RangeError(`Muc do hoa khong co: ${name}`);
  try { localStorage.setItem(TIER_KEY, name); } catch (error) { console.warn('Khong luu duoc muc do hoa:', error); }
}
const asked = qs.get('q'), saved = savedTier();
const tierName = TIERS[asked] ? asked : TIERS[saved] ? saved : (isMobile ? 'medium' : 'high');
const Q = TIERS[tierName];

export { Q, TIERS, qs, rememberTier, tierName };
