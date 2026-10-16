import * as THREE from 'three';
import './styles.css';
import { createWorld, PITCH } from './scene/world.js';
import { createGoal } from './scene/goal.js';
import { createBall } from './scene/ball.js';
import { Shootout, PHASE, ZONES } from './game/shootout.js';
import { buildSquad } from './data/players.js';
import { createUI } from './ui/screens.js';
import { sfx, unlockAudio } from './game/audio.js';
import {
  whoami,
  saveScore,
  readLeaderboard,
  goToSignIn,
  safeStyle,
  DEFAULT_PLAYER,
} from './services/startng.js';

// ---------------------------------------------------------------------------
// Anything that throws should be visible.
//
// A game that silently stops responding is the worst possible failure — you
// can't tell a bug from a slow frame. This puts the error on screen, which also
// makes it reportable without opening dev tools.
// ---------------------------------------------------------------------------

function showFatal(message) {
  let bar = document.getElementById('fatal');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'fatal';
    document.body.appendChild(bar);
  }
  bar.textContent = `Something broke: ${message}`;
  bar.classList.add('fatal-on');
}

window.addEventListener('error', (e) => showFatal(e.message || 'unknown error'));
window.addEventListener('unhandledrejection', (e) => {
  const reason = e.reason;
  showFatal((reason && reason.message) || String(reason) || 'unknown error');
});

// ---------------------------------------------------------------------------
// Renderer
// ---------------------------------------------------------------------------

const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: 'high-performance',
});
// Cap the pixel ratio: a 3x retina phone would otherwise render nine times the
// pixels for no visible gain, and this scene has shadows and fog to pay for.
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  48,
  window.innerWidth / window.innerHeight,
  0.1,
  800
);
camera.position.set(0, 3.0, 15.6);
scene.userData.camera = camera; // the aim reticle billboards toward this

// ---------------------------------------------------------------------------
// Scene contents
// ---------------------------------------------------------------------------

const world = createWorld(scene);

const goal = createGoal();
goal.position.set(0, 0, 0);
scene.add(goal);

const ball = createBall();
scene.add(ball.mesh, ball.shadow);

// ---------------------------------------------------------------------------
// Camera rigs
// ---------------------------------------------------------------------------

// Two fixed compositions, blended between as the game changes ends. Shooting
// is over-the-shoulder from behind the spot; keeping is from behind the goal,
// looking back up the pitch at the taker.
const RIGS = {
  shoot: {
    pos: new THREE.Vector3(0, 3.0, 15.6),
    look: new THREE.Vector3(0, 1.25, 0),
  },
  keep: {
    pos: new THREE.Vector3(0, 2.3, -4.4),
    look: new THREE.Vector3(0, 1.15, PITCH.penaltySpot),
  },
};

const camState = {
  pos: RIGS.shoot.pos.clone(),
  look: RIGS.shoot.look.clone(),
  target: 'shoot',
  shake: 0,
};

function setCameraTarget(name) {
  camState.target = name;
}

// ---------------------------------------------------------------------------
// UI + game
// ---------------------------------------------------------------------------

const ui = createUI(document.getElementById('ui'));
const squad = buildSquad();

const game = new Shootout({
  scene,
  world,
  ball,
  onEvent(event) {
    switch (event.type) {
      case 'turn':
        ui.setHud({
          round: event.round,
          side: event.side,
          goals: game.goals,
          shots: game.shotsTaken,
          saves: game.saves,
          faced: game.faced,
        });
        ui.clearFlash();
        ui.hideKeeperPick();
        ui.showPower(event.side === 'shoot', 0);
        setCameraTarget(event.side === 'shoot' ? 'shoot' : 'keep');
        if (event.side === 'keep') {
          ui.showKeeperPick(ZONES, (zoneId) => game.chooseDive(zoneId));
        }
        break;

      case 'struck':
        sfx.kick();
        camState.shake = 0.14;
        ui.showPower(false);
        break;

      case 'result':
        ui.showPower(false);
        ui.flashResult(event);
        if (event.kind === 'goal') sfx.goal();
        else if (event.kind === 'save') sfx.save();
        else if (event.kind === 'woodwork') sfx.woodwork();
        else if (event.kind === 'miss' || event.kind === 'grounded') sfx.miss();

        ui.setHud({
          round: game.round,
          side: event.side,
          goals: game.goals,
          shots: game.shotsTaken,
          saves: game.saves,
          faced: game.faced,
        });
        break;

      case 'over':
        sfx.whistle();
        // Save the run, then read the board back — otherwise your own score
        // wouldn't be in the list it's shown next to. Guests can read the board
        // but not post to it, which is start.ng's rule, not ours.
        (async () => {
          const signedIn = Boolean(startngPlayer && startngPlayer.account);
          let saved = null;

          if (signedIn) {
            saved = await saveScore({ goals: event.goals, saves: event.saves });
          }

          const { entries, local } = await refreshBoard();

          ui.showSummary({
            goals: event.goals,
            shots: event.shots,
            saves: event.saves,
            faced: event.faced,
            playerName: startngPlayer ? startngPlayer.name : 'You',
            playerId: startngPlayer ? startngPlayer.id : null,
            opponent: selectedOpponent,
            board: entries,
            local,
            saved,
            onSignIn: () => goToSignIn(),
          });
        })();
        break;

      default:
        break;
    }
  },
});

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------

// Aiming casts a ray from the pointer onto the goal plane (z = 0) rather than
// mapping screen coordinates to an angle. That way the reticle sits exactly
// under the cursor no matter where the camera is, and the two camera rigs need
// no separate aiming maths.
const raycaster = new THREE.Raycaster();
const goalPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
const ndc = new THREE.Vector2();
const hit = new THREE.Vector3();

function pointerToAim(clientX, clientY) {
  ndc.x = (clientX / window.innerWidth) * 2 - 1;
  ndc.y = -(clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(ndc, camera);
  if (!raycaster.ray.intersectPlane(goalPlane, hit)) return null;

  const nx = hit.x / (PITCH.goalWidth / 2);
  const ny = hit.y / PITCH.goalHeight;
  return { x: THREE.MathUtils.clamp(nx, -1, 1), y: THREE.MathUtils.clamp(ny, -1, 1) };
}

canvas.addEventListener('pointermove', (e) => {
  if (ui.paused) return;
  const aim = pointerToAim(e.clientX, e.clientY);
  if (aim) game.aimAt(aim.x, aim.y);
});

canvas.addEventListener('pointerdown', (e) => {
  unlockAudio();
  if (ui.paused || game.phase !== PHASE.AIM) return;
  canvas.setPointerCapture(e.pointerId);
  game.beginCharge();
});

canvas.addEventListener('pointerup', (e) => {
  if (ui.paused || game.phase !== PHASE.AIM) return;
  try {
    canvas.releasePointerCapture(e.pointerId);
  } catch {
    // Pointer capture may already be gone if the pointer left the canvas.
  }
  game.release();
});

// Keyboard aiming, for anyone who can't or doesn't want to use a pointer.
const keys = new Set();
window.addEventListener('keydown', (e) => {
  if (e.code === 'Escape' || e.code === 'KeyP') {
    e.preventDefault();
    togglePause();
    return;
  }
  keys.add(e.code);
  unlockAudio();
  if (e.code === 'Space') {
    e.preventDefault();
    if (game.phase === PHASE.AIM && !game.charging && !ui.paused) game.beginCharge();
  }
});
window.addEventListener('keyup', (e) => {
  keys.delete(e.code);
  if (e.code === 'Space' && game.phase === PHASE.AIM && game.charging) game.release();
});

// ---------------------------------------------------------------------------
// Resize
// ---------------------------------------------------------------------------

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------------------------------------------------------------------------
// Loop
// ---------------------------------------------------------------------------

const clock = new THREE.Clock();
let tickAccum = 0;

function frame() {
  requestAnimationFrame(frame);
  // getDelta is called every frame even while paused, so the clock never
  // accumulates a huge delta to spend in one jump when play resumes.
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.getElapsedTime();

  if (ui.paused) {
    // Keep drawing — the pitch stays visible behind the pause panel — but
    // freeze the game, the camera drift and the crowd.
    renderer.render(scene, camera);
    return;
  }

  // Keyboard reticle movement.
  if (keys.size > 0 && game.phase === PHASE.AIM) {
    const speed = 1.4 * dt;
    let { x, y } = game.aim;
    if (keys.has('ArrowLeft') || keys.has('KeyA')) x -= speed;
    if (keys.has('ArrowRight') || keys.has('KeyD')) x += speed;
    if (keys.has('ArrowUp') || keys.has('KeyW')) y += speed;
    if (keys.has('ArrowDown') || keys.has('KeyS')) y -= speed;
    game.aimAt(x, y);
  }

  // Click as the meter passes each tenth, so power has an audible feel.
  if (game.charging) {
    tickAccum += dt;
    if (tickAccum > 0.085) {
      tickAccum = 0;
      sfx.tick();
    }
  }

  game.update(dt);

  // Blend the camera toward its target rig.
  const rig = RIGS[camState.target];
  camState.pos.lerp(rig.pos, Math.min(1, dt * 2.6));
  camState.look.lerp(rig.look, Math.min(1, dt * 2.6));

  camera.position.copy(camState.pos);

  // Handheld feel: a slow drift plus a decaying kick shake.
  camera.position.x += Math.sin(t * 0.42) * 0.045;
  camera.position.y += Math.sin(t * 0.63) * 0.03;
  if (camState.shake > 0) {
    camState.shake = Math.max(0, camState.shake - dt * 0.7);
    const s = camState.shake;
    camera.position.x += (Math.random() - 0.5) * s;
    camera.position.y += (Math.random() - 0.5) * s;
  }

  camera.lookAt(camState.look);

  renderer.render(scene, camera);
}

// ---------------------------------------------------------------------------

// True once a match is under way. Pausing the title screen or the full-time
// summary would be meaningless, so both are guarded on this.
let started = false;

// Who you are on start.ng: their character, name and account name. Falls back
// to the default guest look when the game is opened outside start.ng.
let startngPlayer = null;
// Who you're up against, chosen from the roster.
let selectedOpponent = null;
let boardEntries = [];
let boardLocal = true;

// Re-read the leaderboard. Returns the entries so callers can use them straight
// away rather than waiting on another async hop.
async function refreshBoard() {
  const { ok, entries } = await readLeaderboard(10);
  boardEntries = entries;
  boardLocal = !ok;
  return { entries, local: !ok };
}

// The matchup screen: your character on one side, the opposition on the other.
function showMatchup() {
  // Default to a random opponent so there is always someone to play, and the
  // grid below lets you pick a different one.
  if (!selectedOpponent) {
    selectedOpponent = squad[Math.floor(Math.random() * squad.length)];
  }
  game.setOpposition(selectedOpponent);

  ui.showMenu({
    roster: squad,
    player: startngPlayer,
    onStart: (opponent, difficulty) => startGame(opponent, difficulty),
    onSignIn: () => goToSignIn(),
  });
}

function startGame(opponent, difficulty) {
  if (opponent) selectedOpponent = opponent;
  if (selectedOpponent) game.setOpposition(selectedOpponent);

  game.setDifficulty(difficulty);
  game.reset();
  game.beginMatch();
  started = true;
  ui.hideMenu();
  ui.hidePause();
  ui.setHud({ round: 1, side: 'shoot', goals: 0, shots: 0, saves: 0, faced: 0 });
  setCameraTarget('shoot');
  sfx.whistle();
}

function togglePause(force) {
  if (!started || game.phase === PHASE.OVER) return;
  const next = typeof force === 'boolean' ? force : !ui.paused;
  if (next) {
    ui.showPause();
    ui.showPower(false);
  } else {
    ui.hidePause();
  }
}

ui.onPause(() => togglePause());
ui.setPauseHandlers({
  onResume: () => togglePause(false),
  onRestart: () => {
    ui.hidePause();
    startGame(null, game.difficulty.key);
  },
  onQuit: () => {
    ui.hidePause();
    started = false;
    game.reset();
    game.active = false;
    game.reticle.visible = false;
    showMatchup();
  },
});

game.reset();
game.reticle.visible = false;

// Ask start.ng who's playing, dress their character, then show the matchup.
//
// Outside start.ng — opened as a local file, or a plain preview — the connect
// page never answers, so this falls back to the default guest character and the
// game plays anyway. start.ng's own docs require that, and it's also the only
// way to test without publishing.
(async function boot() {
  const { player } = await whoami();
  startngPlayer = player || DEFAULT_PLAYER;
  game.setPlayerStyle(safeStyle(startngPlayer.style));
  await refreshBoard();
  showMatchup();
})();

frame();
