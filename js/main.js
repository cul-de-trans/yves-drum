// Entry point: wires the top bar, the kit and Follow Me mode together.

import { initAudio, unlock } from './audio.js';
import { buildKit, onHit } from './kit.js';
import { PATTERNS } from './patterns.js';
import * as follow from './follow.js';

const $ = (sel) => document.querySelector(sel);

const state = {
  mode: 'free',
  pattern: PATTERNS[0],
  level: 1,
  bpm: follow.LEVELS[2].bpm,
  guide: false,
};

// ---------- Block iPad gestures that would get in the way ----------

for (const type of ['gesturestart', 'gesturechange', 'gestureend', 'dblclick', 'contextmenu']) {
  document.addEventListener(type, (e) => e.preventDefault(), { passive: false });
}
document.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });

// ---------- Kit ----------

buildKit($('#stage'));
onHit((piece) => follow.handleHit(piece));

// ---------- Feedback UI used by Follow Me ----------

const ui = {
  score(n) {
    $('#score').textContent = n > 0 ? `⭐ ${n}` : '';
  },
  count(text) {
    const el = $('#count');
    if (el.textContent !== text) el.textContent = text;
  },
  feedback(text, kind) {
    const el = $('#feedback');
    el.textContent = text;
    el.className = `feedback ${kind}`;
    el.animate(
      [
        { transform: 'scale(0.6)', opacity: 0 },
        { transform: 'scale(1.1)', opacity: 1, offset: 0.3 },
        { transform: 'scale(1)', opacity: 1, offset: 0.7 },
        { transform: 'scale(1)', opacity: 0 },
      ],
      { duration: 700, easing: 'ease-out', fill: 'forwards' },
    );
  },
};

// ---------- Top bar ----------

const songSelect = $('#song');
for (const p of PATTERNS) {
  const opt = document.createElement('option');
  opt.value = p.id;
  opt.textContent = `${p.name}  ${'⭐'.repeat(p.stars)}`;
  songSelect.appendChild(opt);
}

function render() {
  document.body.dataset.mode = state.mode;
  document.body.dataset.timed = String(state.level !== 1);
  for (const b of document.querySelectorAll('#mode button')) b.classList.toggle('on', b.dataset.mode === state.mode);
  for (const b of document.querySelectorAll('#level button')) b.classList.toggle('on', Number(b.dataset.level) === state.level);
  $('#bpm').textContent = state.bpm;
  $('#guide').setAttribute('aria-pressed', String(state.guide));
  $('#play').textContent = follow.isRunning() ? '■ Stop' : '▶ Start';
  $('#play').classList.toggle('stop', follow.isRunning());
}

function restartIfRunning() {
  if (follow.isRunning()) startFollow();
  render();
}

function startFollow() {
  follow.start({ ...state, ui });
  keepAwake(true);
  render();
}

function stopFollow() {
  follow.stop();
  ui.score(0);
  $('#feedback').getAnimations().forEach((a) => a.cancel());
  keepAwake(false);
  render();
}

$('#mode').addEventListener('click', (e) => {
  const mode = e.target.dataset.mode;
  if (!mode) return;
  state.mode = mode;
  if (mode === 'free') stopFollow();
  render();
});

$('#level').addEventListener('click', (e) => {
  const level = Number(e.target.dataset.level);
  if (!level) return;
  state.level = level;
  if (level !== 1) state.bpm = follow.LEVELS[level].bpm;
  restartIfRunning();
});

songSelect.addEventListener('change', () => {
  state.pattern = PATTERNS.find((p) => p.id === songSelect.value);
  restartIfRunning();
});

function changeTempo(delta) {
  state.bpm = Math.min(140, Math.max(40, state.bpm + delta));
  restartIfRunning();
}
$('#slower').addEventListener('click', () => changeTempo(-5));
$('#faster').addEventListener('click', () => changeTempo(5));

$('#guide').addEventListener('click', () => {
  state.guide = !state.guide;
  restartIfRunning();
});

$('#play').addEventListener('click', () => {
  if (follow.isRunning()) stopFollow();
  else startFollow();
});

// Stop when the app goes to the background.
document.addEventListener('visibilitychange', () => {
  if (document.hidden && follow.isRunning()) stopFollow();
});

// ---------- Keep the screen on during Follow Me ----------

let wakeLock = null;
async function keepAwake(on) {
  try {
    if (on && !wakeLock && navigator.wakeLock) {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => { wakeLock = null; });
    } else if (!on && wakeLock) {
      await wakeLock.release();
      wakeLock = null;
    }
  } catch (e) { /* not supported or not allowed */ }
}

// ---------- Start screen: audio must be unlocked by a tap ----------

const startEl = $('#start');
let ready = false;

// iOS only treats some events as a real user gesture for audio, so try each.
for (const type of ['pointerdown', 'touchend', 'click']) {
  startEl.addEventListener(type, () => { if (ready) unlock(); });
}
startEl.addEventListener('click', () => {
  if (ready) startEl.remove();
});

initAudio()
  .then(() => {
    ready = true;
    $('#start-msg').textContent = 'Tap to start';
    startEl.classList.add('ready');
  })
  .catch((err) => {
    $('#start-msg').textContent = 'Could not load the drums. Please reload.';
    console.error(err);
  });

render();

// ---------- Offline support ----------

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js');
}
