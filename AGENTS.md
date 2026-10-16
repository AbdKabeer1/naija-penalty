# AGENTS.md

Instructions for AI coding agents working on **Naija Penalty** (Vite + Three.js,
vanilla JavaScript, no framework).

Read `README.md` first for what the project is and how to run it, and
`HANDOVER.md` for the current state — what is known-good and what has not been
verified. This file is about *how* to work on it.

## Commands

```sh
npm install
npm run dev       # dev server with hot reload
npm run build     # static output to dist/
npm run preview   # serve the build
```

There is no test runner and no linter configured. Adding one is welcome, but say
so in the PR rather than assuming it exists.

## Architecture

Four layers, and code belongs in the one it's named for:

| Path | Holds |
| --- | --- |
| `src/scene/` | Anything that creates 3D objects. Pure geometry and materials. |
| `src/game/` | Rules and state. Must not create meshes. |
| `src/ui/` | DOM and styling. Must not touch Three.js. |
| `src/data/` | Static content — the roster, and any future tables. |

The dependency arrow only points one way: `main.js` wires scene + game + ui
together, and the lower layers never import upward. `game/shootout.js` importing
`scene/figures.js` is fine — it needs the pose functions. `scene/` importing
`game/` is not.

`main.js` is deliberately the only file that knows about all three. Keep it that
way; it's what makes the rest testable in isolation.

## Conventions

**Procedural assets only.** No `.png`, `.glb`, `.mp3` or `.fbx` files. Every
texture is drawn on a `<canvas>`, every sound is an oscillator or filtered noise.
This is a deliberate constraint — the game is aimed at people on metered mobile
connections, and a single 2MB model would undo it. If you genuinely need a binary
asset, raise it first rather than adding one quietly.

**Comment the why, not the what.** Grade the density to the surrounding code.
The existing comments explain decisions that would otherwise look arbitrary —
why the net is flat, why the launch solve includes the curve term, why skin tone
isn't tied to ethnicity. A comment restating what the next line does is noise.

**Units are metres.** `PITCH` in `scene/world.js` holds the real FIFA dimensions
and everything else derives from it. Don't introduce a second scale.

**Build figures through `createFigure`.** It returns joint pivot groups, and the
posed functions in the same file (`applyKick`, `applyDive`, `applyIdle`) are the
only supported way to animate them. Rotating limb meshes directly will spin them
about their own centres, which looks broken.

**Interface is DOM, not 3D.** Text, buttons and the HUD live in `src/ui/` and
`src/styles.css`. Don't add text geometry or sprites — it's blurry at some
densities, unselectable, and invisible to screen readers.

## Boundaries

- **Never commit binary assets** without asking first. See above.
- **Never hardcode a URL** that should be relative. `base: './'` in
  `vite.config.js` exists so the build works from a subdirectory; absolute asset
  paths break start.ng deployments.
- **Don't raise the pixel ratio** above 2 or the shadow map above 2048. Both are
  tuned for mid-range phones, which is the target device.
- **Don't add a framework.** No React, Vue, Svelte or a state library. The UI is
  a few hundred lines of DOM; a framework would be more code, not less.
- **Don't move existing files** without a reason. The layout mirrors the
  dependency direction described above.

## Verifying a change

There's no automated check, so verify by hand and say what you actually did:

1. `npm run build` — it must complete without warnings.
2. `npm run dev`, then play a full shootout: five penalties as the shooter, five
   as the keeper, through to the summary screen.
3. Check the thing you changed at a narrow width as well as a wide one. The
   layout is responsive and it's easy to break the phone view from a desktop.
4. If you touched physics or the keeper, take several shots from different aim
   points and confirm goals and saves both still happen.

State plainly what you could not test. "The build passes and I played a full
shootout" is useful. "It works" is not.
