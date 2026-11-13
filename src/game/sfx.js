// Am thanh tong hop bang code (khong file am thanh). Trinh duyet chi cho phat sau lan cham dau tien,
// nen AudioContext duoc tao/tiep tuc o moi lan pointerdown/keydown.

const MASTER = 0.5;

export function createSfx() {
  const AudioCtor = window.AudioContext ?? window.webkitAudioContext;
  let ctx = null, muted = false;
  const wake = () => {
    if (!AudioCtor) return;
    if (!ctx) ctx = new AudioCtor();
    if (ctx.state === 'suspended') ctx.resume().catch((error) => console.warn('Khong bat duoc am thanh:', error));
  };
  addEventListener('pointerdown', wake); addEventListener('keydown', wake);

  /** Mot not: truot tan so from -> to trong dur giay, bao bien do giam dan. */
  function note({ from, to = from, dur = 0.15, type = 'sine', gain = 0.2, delay = 0 }) {
    if (!ctx || muted || ctx.state !== 'running') return;
    const t0 = ctx.currentTime + delay, osc = ctx.createOscillator(), amp = ctx.createGain();
    osc.type = type; osc.frequency.setValueAtTime(from, t0); osc.frequency.exponentialRampToValueAtTime(Math.max(to, 1), t0 + dur);
    amp.gain.setValueAtTime(0.0001, t0); amp.gain.exponentialRampToValueAtTime(gain * MASTER, t0 + 0.012); amp.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(amp).connect(ctx.destination); osc.start(t0); osc.stop(t0 + dur + 0.02);
  }
  const chord = (freqs, step, opts) => freqs.forEach((f, i) => note({ from: f, delay: i * step, ...opts }));

  return {
    jump: () => note({ from: 320, to: 620, dur: 0.16, type: 'triangle' }),
    land: () => note({ from: 150, to: 70, dur: 0.1, type: 'sine', gain: 0.25 }),
    glide: () => note({ from: 500, to: 420, dur: 0.25, type: 'sine', gain: 0.07 }),
    seed: () => chord([1319, 1760], 0.05, { dur: 0.14, type: 'sine', gain: 0.16 }),
    buy: () => chord([784, 988, 1319, 1568], 0.07, { dur: 0.26, type: 'triangle', gain: 0.16 }),
    splash: () => { note({ from: 760, to: 300, dur: 0.07, type: 'sine', gain: 0.07 }); note({ from: 520, to: 240, dur: 0.09, type: 'triangle', gain: 0.05, delay: 0.05 }); },
    leaf: () => note({ from: 900, to: 500, dur: 0.09, type: 'triangle', gain: 0.12 }),
    orb: () => { note({ from: 520, to: 1040, dur: 0.18, type: 'triangle', gain: 0.16 }); note({ from: 1040, to: 780, dur: 0.3, type: 'sine', gain: 0.12, delay: 0.2 }); },
    correct: (tier) => chord([523, 659, 784, 1047].slice(0, 2 + Math.min(tier, 2)), 0.07, { dur: 0.22, type: 'triangle' }),
    wrong: () => chord([330, 277], 0.12, { dur: 0.25, type: 'sine', gain: 0.14 }),   // nhe nhang, khong che trach
    woke: () => chord([659, 784, 988, 1319], 0.06, { dur: 0.3, type: 'sine' }),
    hit: () => note({ from: 220, to: 110, dur: 0.2, type: 'square', gain: 0.1 }),
    mastered: () => chord([523, 659, 784, 1047, 1319], 0.1, { dur: 0.45, type: 'triangle' }),
    cleared: () => chord([392, 523, 659, 784, 1047], 0.12, { dur: 0.5, type: 'triangle' }),
    setMuted(value) { muted = Boolean(value); },
    isMuted: () => muted,
  };
}
