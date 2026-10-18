// Rhythm patterns for Follow Me mode.
// Each character is one 8th-note step: "x" = hit, "." = rest.
// All tracks in a pattern must be the same length.

export const PATTERNS = [
  {
    id: 'heartbeat',
    name: 'Heartbeat',
    stars: 1,
    tracks: {
      kick: 'x.x.x.x.',
    },
  },
  {
    id: 'boom-clap',
    name: 'Boom-Clap',
    stars: 1,
    tracks: {
      kick:  'x...x...',
      snare: '..x...x.',
    },
  },
  {
    id: 'stomp-clap',
    name: 'Stomp Stomp Clap',
    stars: 2,
    tracks: {
      kick:  'x.x.....x.x.....',
      snare: '....x.......x...',
    },
  },
  {
    id: 'basic-rock',
    name: 'Basic Rock',
    stars: 3,
    tracks: {
      hihat: 'x.x.x.x.',
      kick:  'x...x...',
      snare: '..x...x.',
    },
  },
  {
    id: 'tom-roll',
    name: 'Tom Roll',
    stars: 2,
    tracks: {
      tom1:  'x.x.............',
      tom2:  '....x.x.........',
      floor: '........x.x.....',
      crash: '............x...',
      kick:  '............x...',
    },
  },
];

// Turn a pattern into a sorted list of { step, piece }.
export function patternNotes(pattern) {
  const notes = [];
  for (const [piece, line] of Object.entries(pattern.tracks)) {
    [...line].forEach((ch, step) => {
      if (ch === 'x') notes.push({ step, piece });
    });
  }
  notes.sort((a, b) => a.step - b.step);
  return notes;
}

export function patternLength(pattern) {
  return Object.values(pattern.tracks)[0].length;
}
