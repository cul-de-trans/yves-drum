// Sound engine: loads the drum samples and plays them with minimal latency.

const PIECES = ['kick', 'snare', 'hihat', 'tom1', 'tom2', 'floor', 'ride', 'crash'];

// Per-piece loudness balance (samples are all peak-normalised).
const GAIN = {
  kick: 1.0,
  snare: 0.9,
  hihat: 0.7,
  tom1: 0.75,
  tom2: 0.75,
  floor: 0.85,
  ride: 0.8,
  crash: 0.75,
};

let ctx = null;
let master = null;
const buffers = {};

export function audioContext() {
  return ctx;
}

// Create the context and start decoding samples. Safe to call before any tap;
// the context stays suspended until unlock() runs inside a user gesture.
export async function initAudio() {
  const AC = window.AudioContext || window.webkitAudioContext;
  ctx = new AC({ latencyHint: 'interactive' });

  // Play even when the iPad is in silent mode (Safari 16.4+).
  if (navigator.audioSession) {
    try { navigator.audioSession.type = 'playback'; } catch (e) { /* ignore */ }
  }

  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -10;
  comp.knee.value = 6;
  comp.ratio.value = 4;
  comp.attack.value = 0.002;
  comp.release.value = 0.15;
  master = ctx.createGain();
  master.gain.value = 0.9;
  master.connect(comp).connect(ctx.destination);

  await Promise.all(PIECES.map(async (name) => {
    const res = await fetch(`sounds/${name}.wav`);
    const data = await res.arrayBuffer();
    buffers[name] = await new Promise((resolve, reject) =>
      ctx.decodeAudioData(data, resolve, reject));
  }));
}

// Must be called from inside a touch/click handler.
export function unlock() {
  if (!ctx) return;
  if (ctx.state !== 'running') ctx.resume();
  // A silent one-sample buffer fully wakes the iOS audio path.
  const src = ctx.createBufferSource();
  src.buffer = ctx.createBuffer(1, 1, 22050);
  src.connect(ctx.destination);
  src.start(0);
}

// Play a drum. `when` is in AudioContext time (0 = now); `level` is 0–1.
export function play(name, when = 0, level = 1) {
  const buf = buffers[name];
  if (!ctx || !buf) return;
  if (ctx.state !== 'running') ctx.resume();

  const src = ctx.createBufferSource();
  src.buffer = buf;
  // Tiny random variation so repeated hits don't sound robotic.
  src.playbackRate.value = 1 + (Math.random() - 0.5) * 0.03;
  const g = ctx.createGain();
  g.gain.value = GAIN[name] * level * (0.92 + Math.random() * 0.08);
  src.connect(g).connect(master);
  src.start(when);
}

// Soft metronome tick, synthesised. Accent on beat 1.
export function tick(when, accent = false) {
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.frequency.value = accent ? 1500 : 1000;
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(accent ? 0.25 : 0.15, when + 0.002);
  g.gain.exponentialRampToValueAtTime(0.0001, when + 0.05);
  osc.connect(g).connect(master);
  osc.start(when);
  osc.stop(when + 0.06);
}

// Seconds between when audio is scheduled and when it is actually heard.
export function outputLatency() {
  if (!ctx) return 0;
  return ctx.outputLatency || ctx.baseLatency || 0;
}
