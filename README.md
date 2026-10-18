# Yves' Drums

A drum kit for the iPad, made for Yves. Plain HTML, CSS and JavaScript — no build step.

## Modes

- **Free Play** — hit anything.
- **Follow Me** — the piece to hit next lights up in rhythm.
  - ⭐ Wait for me: waits until he hits the lit piece.
  - ⭐⭐ Slow: keeps time at 65 bpm, forgiving timing (±200 ms).
  - ⭐⭐⭐ Normal: 90 bpm, tighter timing (±120 ms).
  - **Guide** plays the target sounds quietly so the beat continues even if he misses.

## Files

| Path | What it does |
|---|---|
| `index.html`, `style.css` | Page and visuals |
| `js/main.js` | Wires the top bar, kit and Follow Me together |
| `js/audio.js` | Loads samples, plays hits, metronome tick |
| `js/kit.js` | Drum layout, touch handling, hit animations |
| `js/follow.js` | Follow Me: beat loop, lights, timing check |
| `js/patterns.js` | Rhythm patterns as data — add new ones here |
| `sounds/*.wav` | Drum samples |
| `sw.js`, `manifest.json`, `icons/` | Home-screen app and offline support |
| `_headers` | Cloudflare Pages: never cache `sw.js` |

**After changing any file, bump `VERSION` in `sw.js`** so installed iPads pick up the update.

## Adding a rhythm

In `js/patterns.js`, each character is one 8th-note step (`x` = hit, `.` = rest):

```js
{
  id: 'my-beat',
  name: 'My Beat',
  stars: 2,
  tracks: {
    kick:  'x...x...',
    snare: '..x...x.',
  },
},
```

Piece names: `kick`, `snare`, `hihat`, `tom1`, `tom2`, `floor`, `ride`, `crash`.

## Run locally

```sh
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

## Deploy (Cloudflare Pages)

1. Cloudflare dashboard → **Workers & Pages** → **Create** → **Pages** → **Connect to Git** → pick this repo.
2. Framework preset: **None**. Build command: *(empty)*. Build output directory: `/`.
3. Every push to `main` deploys automatically.

## On the iPad

1. Open the site in Safari → Share → **Add to Home Screen**.
2. Open it from the home screen: full screen, works offline.
3. Optional: **Settings → Accessibility → Guided Access** keeps him inside the app (triple-click the side/home button to start).

## Credits

Drum samples from the *SF3007-2011-Set-03* Hydrogen drumkit (Sonor Force 3007), released under the WTFPL — see `sounds/LICENSE-SF3007.txt`.
