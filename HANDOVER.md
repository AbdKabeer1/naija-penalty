# HANDOVER

Point-in-time snapshot of **Naija Penalty**. Read this before changing anything —
it records what is known-good, what has never been run, and what to do first.

**Status: complete first version, written but not yet executed.**
See "Verification status" below before trusting any of it.

---

## What this is

A Three.js penalty shootout set on a rural Nigerian pitch. Pick a player from a
39-strong roster spanning 14 ethnic groups, take five penalties, then go in goal
and face five. Everything — geometry, textures, sound — is generated in code.

---

## What's built

| File | Contains |
| --- | --- |
| `src/main.js` | Renderer, two camera rigs, pointer/keyboard input, pause, frame loop |
| `src/styles.css` | Full interface styling, responsive, reduced-motion aware |
| `src/data/players.js` | 43 players — name, age, state, 6 skin tones, 8 kits |
| `src/scene/world.js` | Pitch, sky, markings, huts, palms, trees, hills, fences, dust, **crowd** |
| `src/scene/goal.js` | Goal frame, netting panels, `aimToWorld` |
| `src/scene/figures.js` | Procedural figures with joint pivots; kick/dive/idle/celebration poses |
| `src/scene/ball.js` | Ball mesh, canvas texture, ballistic flight model with curve |
| `src/game/shootout.js` | Turn state machine, keeper AI, difficulty presets, scoring |
| `src/game/audio.js` | Synthesised kick, goal, save, miss, woodwork, whistle |
| `src/ui/screens.js` | Title screen, player picker, difficulty, HUD, pause, summary |

---

## Change log of the second pass

Everything below was added after the first playable build, in response to
feedback. All of it is **untested** in the same way the rest is.

- **Figures rebuilt.** The legs were originally parented to the root at ground
  level while the torso sat at hip height, so the body floated. Every joint is
  now expressed against named landmarks (`HIP_Y`, `SHOULDER_Y`, `HEAD_Y`) and
  the figure reads as a full body. A neck and a shoulder cap were added.
- **Celebration.** `applyCelebration` in `figures.js` — arms overhead, hopping.
  Fires for 2.4 s on a goal, and on a save when you're the keeper.
- **Difficulty.** Three presets in `shootout.js` (`casual` / `normal` / `tough`),
  selectable on the title screen, shown in the HUD and the summary.
- **Ethnic grouping removed** from the roster and the picker, at the author's
  request. Players now carry name, age and state of origin.
- **Crowd.** `createCrowd` in `world.js` — roughly 200 spectators in four rows
  behind the goal and three down each side, as two `InstancedMesh` objects.
- **Pause.** `Esc` / `P`, or the `II` button in the HUD. Freezes the game, the
  camera drift and the crowd, and keeps rendering so the pitch stays visible.

---

## Verification status

**Nothing in this project has been run.** The code was written in an environment
where the shell was unavailable, so `npm install` has never completed,
`npm run build` has never run, and no page has been loaded in a browser.

Treat the following as unverified and check them first, in this order:

1. **It builds at all.** `npm install && npm run build`. Module import paths and
   the Vite config are the most likely first failure.
2. **It renders.** A black screen usually means a shader or texture error in the
   console; a "three is not defined" style failure means an import path.
3. **The scene is composed sensibly.** The camera positions in `RIGS`
   (`src/main.js`) were chosen by calculation, not by looking. Expect to nudge
   them.
4. **Aim maps correctly.** Raycasting onto the goal plane should make the
   reticle track the cursor exactly. If it feels offset or inverted, look at
   `pointerToAim`.
5. **A full shootout completes.** Five shots, five saves, summary screen, play
   again.

---

## Things most likely to need tuning

These are judgement calls made without seeing the game run. Every one is a single
constant near the top of its file.

| What | Where | Current | If it feels wrong |
| --- | --- | --- | --- |
| Keeper save radius | `KEEPER_REACH`, `game/shootout.js` | `0.78` m | Raise to make saves rarer, lower to make the keeper sharper. This is the single biggest lever on difficulty. |
| Keeper reaction delay | `DIVE_DELAY`, `game/shootout.js` | `0.1` s | Higher gives the shooter an easier time. |
| Dive animation length | `_updateKeeperDive`, `game/shootout.js` | `/ 0.42` s | Lower makes dives snappier. |
| Power meter speed | `this.power += this.chargeDir * dt * 1.35` | `1.35` | Lower is more forgiving. |
| Overhit threshold | `overhit`, `scene/ball.js` | `0.86` | Where the ball starts to rise over the bar. |
| Flight time range | `launch()`, `scene/ball.js` | `1.05`–`0.62` s | Longer feels floatier. |
| Curve strength | `this.curve = curve * 6.2 * flightTime` | `6.2` | Purely cosmetic — the launch solve compensates, so the ball still lands on target. |
| Camera framing | `RIGS`, `src/main.js` | — | The most likely thing to want changing once you can see it. |
| Keeper direction bias | `_pickKeeperDirection` | 16% centre | Real keepers under-pick the middle; this mimics that. |

---

## Known gaps

**Not implemented, in rough priority order:**

1. **No crowd.** The fences and huts frame an empty pitch. A row of simple
   billboarded spectators behind the goal would lift the atmosphere a lot for
   very little geometry.
2. **No difficulty setting.** The current balance is one fixed point.
3. **The AI never misses deliberately.** It shoots at a weighted-random zone
   every time, so a strong keeper can save more than feels fair. Consider giving
   it a small chance of a wild shot.
4. **No save percentage or streaks.** The summary shows totals only.
5. **No pause.** Leaving the tab mid-flight is handled (delta time is clamped)
   but there is no explicit pause.
6. **The roster is fixed.** No way to add a custom player name at runtime.

**Deliberately not done:**

- **No binary assets.** Explained in `AGENTS.md`; this is a constraint, not an
  oversight.
- **No framework.** The UI is a few hundred lines of DOM.
- **No net physics.** The net doesn't bulge when the ball hits it.

---

## Next steps

1. Run it. Fix whatever breaks first. Everything downstream depends on this.
2. Frame the two camera rigs properly by eye.
3. Play ten penalties and adjust `KEEPER_REACH` until roughly a third of shots
   are saved — that's a fun ratio for a casual game.
4. Take the before/after screenshots if this is going in as a submission.
5. Deploy: `npm run build`, then upload the **contents** of `dist/` to start.ng.

---

## Gotchas

- **`dist/`, not `dist/`'s parent.** Uploading the folder itself puts
  `index.html` one level too deep and the site 404s.
- **Sound is silent until the first tap.** Browser autoplay policy, not a bug.
  `unlockAudio()` is called on first pointer or key event.
- **The keeper's coverage is derived from its animation**, not stored
  separately. If you change `applyDive` in `figures.js`, the save maths in
  `_keeperCoverage` moves with it — check both together or saves will drift away
  from what you see.
- **Zone lists exist in one place:** `ZONES` in `game/shootout.js`. The keeper
  picker and the AI both read it. There used to be a duplicate in `goal.js`; if
  you find one, it's stale.
- **Delta time is clamped** to 50ms in the frame loop. Removing that clamp lets
  the ball tunnel through the goal plane when a tab regains focus.
