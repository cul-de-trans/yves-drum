// Follow Me mode: loops a pattern and lights up the piece to hit next.
// Level 1 waits for each hit; levels 2 and 3 keep time and judge accuracy.

import { audioContext, play, tick, outputLatency } from './audio.js';
import { addRing, updateRing, setLit, clearLit, burst } from './kit.js';
import { patternNotes, patternLength } from './patterns.js';

export const LEVELS = {
  1: { name: 'Wait for me', wait: true },
  2: { name: 'Slow',   bpm: 65, great: 0.10, ok: 0.20 },
  3: { name: 'Normal', bpm: 90, great: 0.06, ok: 0.12 },
};

const LOOKAHEAD = 0.15;   // seconds of audio scheduled ahead
const COUNT_IN_BEATS = 4;

let running = false;
let opts = null;          // { pattern, level, bpm, guide, ui }
let timer = null;
let raf = 0;
let stars = 0;

// Timed-mode state
let notes = [];           // pattern notes: { step, piece }
let len = 0;              // steps per loop
let stepDur = 0;
let t0 = 0;               // AudioContext time of step 0 of the first loop
let nextAudioStep = 0;    // next step (absolute, may be negative for count-in) to schedule audio for
let nextVisualStep = 0;   // next step to create approach rings for
let active = [];          // { piece, time, ring, done }

// Wait-mode state
let groups = [];          // [[piece, ...], ...] one entry per step that has notes
let groupIndex = 0;
let remaining = new Set();

export function isRunning() {
  return running;
}

export function start(options) {
  stop();
  opts = options;
  running = true;
  stars = 0;
  opts.ui.score(stars);

  const level = LEVELS[opts.level];
  notes = patternNotes(opts.pattern);
  len = patternLength(opts.pattern);

  if (level.wait) {
    startWait();
  } else {
    startTimed();
  }
}

export function stop() {
  running = false;
  clearInterval(timer);
  cancelAnimationFrame(raf);
  timer = null;
  for (const n of active) n.ring.remove();
  active = [];
  remaining.clear();
  clearLit();
  document.querySelectorAll('.ring').forEach((r) => r.remove());
  if (opts) opts.ui.count('');
}

// Called by the kit for every tap. Returns nothing; updates score/feedback.
export function handleHit(piece) {
  if (!running) return;
  if (LEVELS[opts.level].wait) {
    waitHit(piece);
  } else {
    timedHit(piece);
  }
}

// ---------- Level 1: wait for me ----------

function startWait() {
  const byStep = new Map();
  for (const n of notes) {
    if (!byStep.has(n.step)) byStep.set(n.step, []);
    byStep.get(n.step).push(n.piece);
  }
  groups = [...byStep.values()];
  groupIndex = 0;
  showGroup();
}

function showGroup() {
  remaining = new Set(groups[groupIndex]);
  for (const piece of remaining) {
    setLit(piece, true);
    const ring = addRing(piece);
    ring.classList.add('waiting');
  }
}

function waitHit(piece) {
  if (!remaining.has(piece)) return;
  remaining.delete(piece);
  setLit(piece, false);
  document.querySelectorAll(`.piece[data-id="${piece}"] .ring`).forEach((r) => r.remove());
  burst(piece);
  stars += 1;
  opts.ui.score(stars);
  if (remaining.size === 0) {
    opts.ui.feedback(groupIndex === groups.length - 1 ? 'Yay!' : 'Great!', 'great');
    groupIndex = (groupIndex + 1) % groups.length;
    setTimeout(() => { if (running) showGroup(); }, 150);
  }
}

// ---------- Levels 2 and 3: keep time ----------

function now() {
  // The moment the player is currently hearing, in AudioContext time.
  return audioContext().currentTime - outputLatency();
}

function approachTime() {
  return Math.min(1.2, Math.max(0.6, stepDur * 2));
}

function startTimed() {
  const ctx = audioContext();
  stepDur = 60 / opts.bpm / 2;
  const countInSteps = COUNT_IN_BEATS * 2;
  t0 = ctx.currentTime + 0.2 + countInSteps * stepDur;
  nextAudioStep = -countInSteps;
  nextVisualStep = 0;
  active = [];
  timer = setInterval(scheduleAudio, 25);
  scheduleAudio();
  raf = requestAnimationFrame(frame);
}

function stepTime(absStep) {
  return t0 + absStep * stepDur;
}

function notesAt(absStep) {
  const s = ((absStep % len) + len) % len;
  return notes.filter((n) => n.step === s);
}

function scheduleAudio() {
  const ctx = audioContext();
  while (stepTime(nextAudioStep) < ctx.currentTime + LOOKAHEAD) {
    const t = stepTime(nextAudioStep);
    if (nextAudioStep % 2 === 0) {
      tick(t, nextAudioStep % 8 === 0);
    }
    if (nextAudioStep >= 0 && opts.guide) {
      for (const n of notesAt(nextAudioStep)) play(n.piece, t, 0.35);
    }
    nextAudioStep += 1;
  }
}

function frame() {
  if (!running) return;
  const level = LEVELS[opts.level];
  const t = now();
  const approach = approachTime();

  // Count-in display.
  const beatsLeft = Math.ceil((t0 - t) / (stepDur * 2));
  if (t < t0 - 0.05) {
    opts.ui.count(beatsLeft >= COUNT_IN_BEATS ? 'Ready…' : String(beatsLeft));
  } else if (t < t0 + stepDur * 2) {
    opts.ui.count('Go!');
  } else {
    opts.ui.count('');
  }

  // Create rings for notes that are about to arrive.
  while (stepTime(nextVisualStep) < t + approach) {
    const time = stepTime(nextVisualStep);
    for (const n of notesAt(nextVisualStep)) {
      active.push({ piece: n.piece, time, ring: addRing(n.piece), done: false });
    }
    nextVisualStep += 1;
  }

  // Update rings, glow, and misses.
  const litNow = new Set();
  active = active.filter((n) => {
    if (n.done) return false;
    const progress = 1 - (n.time - t) / approach;
    updateRing(n.ring, Math.min(1, Math.max(0, progress)));
    if (t > n.time + level.ok) {
      // Missed: just fade away, no penalty.
      n.ring.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200 }).onfinish = () => n.ring.remove();
      return false;
    }
    if (Math.abs(n.time - t) <= level.ok) litNow.add(n.piece);
    return true;
  });
  document.querySelectorAll('.piece').forEach((el) => setLit(el.dataset.id, litNow.has(el.dataset.id)));

  raf = requestAnimationFrame(frame);
}

function timedHit(piece) {
  const level = LEVELS[opts.level];
  const t = now();
  let best = null;
  for (const n of active) {
    if (n.piece !== piece || n.done) continue;
    const d = Math.abs(n.time - t);
    if (d <= level.ok && (!best || d < Math.abs(best.time - t))) best = n;
  }
  if (!best) return;
  best.done = true;
  best.ring.remove();
  setLit(piece, false);
  burst(piece);
  stars += 1;
  opts.ui.score(stars);
  const great = Math.abs(best.time - t) <= level.great;
  opts.ui.feedback(great ? 'Great!' : 'Good!', great ? 'great' : 'good');
}
