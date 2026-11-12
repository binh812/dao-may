

// ---------------------------------------------------------------- quality
const qs = new URLSearchParams(location.search);
const isMobile = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
const TIERS = {
  low:    { label: 'Thấp',  dpr: 1.0, msaa: 0, shadow: 1024, grass: 16000,  aoTaps: 0,  dofTaps: 0,  blobDetail: 3, leaves: 55,  field: 1500, volSteps: 0,  rain: 1500 },
  medium: { label: 'Vừa',   dpr: 1.5, msaa: 0, shadow: 2048, grass: 42000,  aoTaps: 8,  dofTaps: 10, blobDetail: 3, leaves: 90,  field: 3500, volSteps: 8,  rain: 3500 },
  high:   { label: 'Cao',   dpr: 2.0, msaa: 4, shadow: 2048, grass: 110000, aoTaps: 14, dofTaps: 20, blobDetail: 4, leaves: 150, field: 7000, volSteps: 12, rain: 7000 },
};
const tierName = TIERS[qs.get('q')] ? qs.get('q') : (isMobile ? 'medium' : 'high');
const Q = TIERS[tierName];

export { Q, TIERS, qs, tierName };
