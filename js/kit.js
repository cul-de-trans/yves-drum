// Drum kit: draws the pieces, handles touches, and plays hit animations.
// Coordinates are in stage units: the stage is 100 wide and 75 tall.

import { play } from './audio.js';

export const LAYOUT = [
  { id: 'crash', label: 'Crash',     type: 'cymbal', x: 14, y: 15, d: 22, color: '#ffd23f' },
  { id: 'ride',  label: 'Ride',      type: 'cymbal', x: 85, y: 18, d: 25, color: '#ff9f1c' },
  { id: 'hihat', label: 'Hi-hat',    type: 'cymbal', x: 10, y: 40, d: 17, color: '#2ec4b6' },
  { id: 'tom1',  label: 'Tom 1',     type: 'drum',   x: 38, y: 19, d: 17, color: '#ff4d6d' },
  { id: 'tom2',  label: 'Tom 2',     type: 'drum',   x: 59, y: 19, d: 17, color: '#4d96ff' },
  { id: 'snare', label: 'Snare',     type: 'drum',   x: 31, y: 46, d: 20, color: '#6bd425' },
  { id: 'floor', label: 'Floor Tom', type: 'drum',   x: 75, y: 46, d: 22, color: '#b15eff' },
  { id: 'kick',  label: 'Kick',      type: 'kick',   x: 50, y: 67.5, w: 40, h: 11, color: '#ff7eb6' },
];

const els = {};
let stage = null;
let hitListener = () => {};

export function onHit(fn) {
  hitListener = fn;
}

export function buildKit(stageEl) {
  stage = stageEl;
  for (const p of LAYOUT) {
    const el = document.createElement('div');
    el.className = `piece ${p.type}`;
    el.dataset.id = p.id;
    el.style.setProperty('--c', p.color);
    if (p.type === 'kick') {
      el.style.left = `${p.x - p.w / 2}%`;
      el.style.top = `${((p.y - p.h / 2) / 75) * 100}%`;
      el.style.width = `${p.w}%`;
      el.style.height = `${(p.h / 75) * 100}%`;
    } else {
      el.style.left = `${p.x - p.d / 2}%`;
      el.style.top = `${((p.y - p.d / 2) / 75) * 100}%`;
      el.style.width = `${p.d}%`;
      el.style.aspectRatio = '1';
    }
    el.innerHTML = `<div class="face"></div><span class="label">${p.label}</span>`;
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      hit(p.id);
      hitListener(p.id);
    });
    stage.appendChild(el);
    els[p.id] = el;
  }
}

// Play the sound and animate the piece.
export function hit(id, level = 1) {
  play(id, 0, level);
  const el = els[id];
  const face = el.firstElementChild;
  face.animate(
    [
      { transform: 'scale(0.93)', filter: 'brightness(1.6)' },
      { transform: 'scale(1)', filter: 'brightness(1)' },
    ],
    { duration: 180, easing: 'ease-out' },
  );
  const ripple = document.createElement('div');
  ripple.className = 'ripple';
  el.appendChild(ripple);
  ripple.animate(
    [
      { transform: 'scale(0.9)', opacity: 0.9 },
      { transform: 'scale(1.5)', opacity: 0 },
    ],
    { duration: 400, easing: 'ease-out' },
  ).onfinish = () => ripple.remove();
}

// Turn the "hit me now" glow on or off.
export function setLit(id, on) {
  els[id].classList.toggle('lit', on);
}

export function clearLit() {
  for (const el of Object.values(els)) el.classList.remove('lit');
}

// Approach ring: shrinks onto the piece as the hit time gets close.
export function addRing(id) {
  const ring = document.createElement('div');
  ring.className = 'ring';
  // The kick is wide, so its ring starts smaller or it covers the whole kit.
  ring.dataset.start = id === 'kick' ? 1.5 : 2.2;
  els[id].appendChild(ring);
  return ring;
}

// progress: 0 = just appeared, 1 = hit time now.
export function updateRing(ring, progress) {
  const start = Number(ring.dataset.start);
  const scale = start - (start - 1) * progress;
  ring.style.transform = `scale(${scale})`;
  ring.style.opacity = Math.min(1, progress * 2.5);
}

// Big burst when a target is hit on time.
export function burst(id) {
  const el = els[id];
  const b = document.createElement('div');
  b.className = 'burst';
  el.appendChild(b);
  b.animate(
    [
      { transform: 'scale(1)', opacity: 1 },
      { transform: 'scale(2.4)', opacity: 0 },
    ],
    { duration: 550, easing: 'cubic-bezier(.2,.7,.3,1)' },
  ).onfinish = () => b.remove();
}
