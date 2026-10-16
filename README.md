# Naija Penalty

A penalty shootout on a dusty village pitch, built with Three.js. Pick a player
from anywhere in Nigeria, take five penalties, then go in goal and try to save
five.

Everything — the pitch, the huts, the palms, the players, the ball, the sounds —
is generated in code. There are no image, model or audio files to download.

## Quick start

```bash
npm install
npm run dev
```

Open the URL it prints (usually <http://localhost:5173>).

```bash
npm run build     # outputs static files to dist/
npm run preview   # serve the built version locally
```

Requires Node 18 or newer.

## Signing in, and the leaderboard

Before you play you either **enter a name** or **continue as a guest** (which
generates a name like "Swift Falcon 42"). Either way you end up with something
to put on the board.

**To be clear about what this is:** it's a display name, not an account. There
are no passwords, no email verification, and no server-side identity — the name
lives in `localStorage` and is attached to whatever score you post. That's
enough to make a leaderboard readable. If you want real accounts later,
`src/services/session.js` is the only file to replace.

### Turning on the global leaderboard

Out of the box, scores are kept **in the browser only** and the board says
"Local only". To make it genuinely global:

1. Create a free project at [supabase.com](https://supabase.com) (or reuse one).
2. **SQL Editor → New query** → paste and run the SQL in `SETUP_SQL`, exported
   from `src/services/leaderboard.js`. It creates the scores table and the two
   access rules.
3. Copy `.env.example` to `.env` and fill in `VITE_SUPABASE_URL` and
   `VITE_SUPABASE_ANON_KEY` from **Project Settings → API**.
4. Restart the dev server — Vite reads `.env` only at startup.

The badge flips to **Live** once it's working, and every player sees the same
board.

**One honest caveat:** anyone can read and post scores, because there are no
accounts to scope a row to. A determined player could post a fake score. That's
fine for a game; it isn't a system to trust with anything real.

## How to play

**Taking a penalty**

| Action | Pointer | Keyboard |
| --- | --- | --- |
| Aim | Move the mouse / drag a finger | Arrow keys or `W` `A` `S` `D` |
| Power up | Press and hold on the pitch | Hold `Space` |
| Shoot | Release | Release `Space` |
| Pause | Tap the `II` button, top right | `Esc` or `P` |

The meter fills and then falls back, so holding it forever is not a strategy —
release near the top. Push it past ~86% and the ball starts to rise over the
bar.

**In goal**

Pick one of six zones. Where you dive is compared against where the AI actually
shoots, using the same collision maths the other end uses — so a save here means
the same thing a save means when you're shooting.

**Scoring.** You take five, then you face five. You win if your goals beat
their goals.

**Difficulty** is chosen on the title screen and changes three things: how far
the keeper can reach, how quickly he commits to a dive, and how often he stays
in the middle.

| | Reach | Reaction | Stays central |
| --- | --- | --- | --- |
| Casual | 0.60 m | 0.18 s | 26% |
| Normal | 0.78 m | 0.10 s | 16% |
| Tough | 0.95 m | 0.04 s | 9% |

## Deploying to start.ng

The build is fully static — no server, no environment variables, no API.

```bash
npm run build
```

Then upload the **contents of `dist/`** to start.ng. The contents, not the folder
itself: `index.html` has to sit at the web root.

`vite.config.js` sets `base: './'`, so relative asset paths work whether the site
is served from a domain root or a subdirectory. If you change that to `'/'` and
deploy to a subpath, every asset 404s.

## Project structure

```
src/
  main.js                 Renderer, camera rigs, input, the frame loop
  styles.css              All interface styling
  data/
    players.js            The squad: names, ethnic groups, states, kits
  scene/
    world.js              Pitch, sky, village, trees, hills, dust
    goal.js               Goal frame, netting, aim-to-world maths
    figures.js            Procedural player figures and their poses
    ball.js               Ball mesh and the flight model
  game/
    shootout.js           The state machine: turns, keeper AI, scoring
    audio.js              Synthesised sound (WebAudio, no files)
  ui/
    screens.js            Menu, player picker, HUD, results
```

## Design notes

**Why everything is procedural.** A rigged player model is several megabytes,
and this is aimed at people on Nigerian mobile data. A stylised low-poly figure
built from cylinders and spheres loads instantly, and it suits a scene that is
deliberately simple anyway. Same reasoning for the sound: an oscillator makes a
convincing boot-on-leather for zero bytes.

**Why the roster isn't grouped by ethnicity.** The picker is a team sheet —
name, age, state — not a set of categories. Nigeria is diverse within every
community, and the six skin tones are spread across the whole squad rather than
tied to anything.

**Why the net is flat panels.** Modelling the netting properly costs thousands
of segments. Four planes with an alpha grid texture read identically at this
camera distance.

**Why aiming raycasts onto the goal plane.** Mapping screen coordinates to a
fixed angle breaks the moment the camera moves. Casting a ray at `z = 0` means
the reticle sits exactly under the cursor from either camera rig.

## The roster

43 players from across the country, each with a name, an age and a state of
origin — Lagos to Sokoto, Bayelsa to Borno, Plateau to Akwa Ibom — plus a skin
tone and a kit.

Players are not grouped or labelled by ethnicity. The picker shows a team sheet:
who they are, how old they are, and where they're from.

Adding a player is one object in `src/data/players.js`. The picker and the 3D
figure both read from it, so there's nothing else to update.

## Browser support

Needs WebGL2. Works on current Chrome, Safari, Firefox and Edge, desktop and
mobile. Sound starts muted until the first tap — browsers require a user gesture
before audio can play, so that's expected, not a bug.

## Licence

No licence file yet. Add one before making the repository public.
