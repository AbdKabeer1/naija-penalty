import * as THREE from 'three';
import { PITCH } from '../scene/world.js';
import { aimToWorld } from '../scene/goal.js';
import {
  createFigure,
  createFigureFromStyle,
  applyIdle,
  applyKeeperReady,
  applyDive,
  applyKick,
  applyCelebration,
  resetPose,
} from '../scene/figures.js';

// The shootout: five penalties taken, then five faced.
//
// Kept as one state machine rather than spread across event handlers, because
// the phases share a lot of state (who's on the spot, which dive is in
// progress) and splitting them leads to bugs where two animations run at once.

export const PHASE = {
  AIM: 'aim',
  RUNUP: 'runup',
  FLIGHT: 'flight',
  RESULT: 'result',
  KEEP_PICK: 'keepPick',
  KEEP_FLIGHT: 'keepFlight',
  OVER: 'over',
};

const SHOTS_PER_SIDE = 5;

// Difficulty presets. Three numbers do all the work between them:
//   reach   — how far the keeper's hands cover, in metres, on the goal plane
//   delay   — how long he waits after the strike before committing to a dive
//   centre  — how often he stays in the middle (real keepers under-pick it)
export const DIFFICULTY = {
  casual: { key: 'casual', label: 'Casual', reach: 0.6, delay: 0.18, centre: 0.26 },
  normal: { key: 'normal', label: 'Normal', reach: 0.78, delay: 0.1, centre: 0.16 },
  tough: { key: 'tough', label: 'Tough', reach: 0.95, delay: 0.04, centre: 0.09 },
};

// Keepers wear yellow. It's the one bit of kit that isn't anyone's choice.
const KEEPER_KIT = { shirt: '#f0c419', trim: '#1a1a1a' };

// The six zones, shared by the shooter's aim and the keeper's dive so the two
// halves of the game reason about the goal the same way.
export const ZONES = [
  { id: 'tl', x: -0.72, y: 0.74, label: 'Top left' },
  { id: 'tc', x: 0, y: 0.82, label: 'Top centre' },
  { id: 'tr', x: 0.72, y: 0.74, label: 'Top right' },
  { id: 'bl', x: -0.7, y: 0.22, label: 'Bottom left' },
  { id: 'bc', x: 0, y: 0.24, label: 'Bottom centre' },
  { id: 'br', x: 0.7, y: 0.22, label: 'Bottom right' },
];

function zoneFromAim(x, y) {
  let best = ZONES[0];
  let bestDist = Infinity;
  for (const z of ZONES) {
    // Weight the horizontal axis harder: a shot 20cm off to the left of the
    // top-left zone is still a top-left shot, but 20cm lower is a different
    // zone entirely.
    const d = Math.hypot((x - z.x) * 1.15, y - z.y);
    if (d < bestDist) {
      bestDist = d;
      best = z;
    }
  }
  return best;
}

export class Shootout {
  constructor({ scene, world, ball, onEvent } = {}) {
    this.scene = scene;
    this.world = world;
    this.ball = ball;
    this.onEvent = onEvent || (() => {});

    // Defaults to Normal; the menu calls setDifficulty before kickoff.
    this.difficulty = DIFFICULTY.normal;

    this.phase = PHASE.AIM;
    this.round = 1;

    // Player's shooting half.
    this.shotsTaken = 0;
    this.goals = 0;
    // Player's keeping half.
    this.faced = 0;
    this.saves = 0;

    this.aim = { x: 0, y: 0.4 };
    this.power = 0;
    this.charging = false;
    this.chargeDir = 1;

    this.runupT = 0;
    this.resultTimer = 0;
    this.lastResult = null;

    this.keeperDive = null;
    this.celebrating = 0;
    this.time = 0;

    // False on the title screen. The render loop keeps running there so the
    // crowd and the dust stay alive behind the menu, but nothing should be
    // playable yet — which is why the aim reticle is gated on this.
    this.active = false;

    // The reticle the player moves around the goal mouth.
    this.reticle = this._buildReticle();
    scene.add(this.reticle);

    this._buildCast();
  }

  // Called when a match actually begins. Until then `active` stays false, so
  // the title screen shows the ground and the crowd without arming the aiming
  // reticle behind the menu.
  beginMatch() {
    this.active = true;
  }

  // -------------------------------------------------------------------------
  // Setup
  // -------------------------------------------------------------------------

  _buildReticle() {
    const group = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffe066,
      transparent: true,
      opacity: 0.9,
      depthTest: false,
    });
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.24, 0.3, 24), mat);
    group.add(ring);
    const dot = new THREE.Mesh(new THREE.CircleGeometry(0.05, 12), mat);
    group.add(dot);
    group.renderOrder = 999;
    group.visible = false;
    return group;
  }

  _buildCast() {
    // Placeholders — both are replaced by setPlayerStyle / setOpposition before
    // kickoff. They exist so the scene is never missing an actor if something
    // upstream fails.
    this.keeperFig = createFigure({ isKeeper: true, number: 1 });
    this._placeKeeper();
    this.scene.add(this.keeperFig.root);

    this.kickerFig = createFigure({ number: 10 });
    this._placeKicker();
    this.scene.add(this.kickerFig.root);
    this.playerKickerFig = this.kickerFig;

    this.aiTakerFig = null;
    this.opposition = null;
  }

  _placeKeeper() {
    this.keeperFig.root.position.set(0, 0, -0.45);
    this.keeperFig.root.rotation.y = 0;
  }

  _placeKicker() {
    this.kickerFig.root.position.set(0, 0, PITCH.penaltySpot + 1.7);
    this.kickerFig.root.rotation.y = Math.PI;
  }

  _swapFigure(which, figure) {
    const old = this[which];
    if (old) this.scene.remove(old.root);
    this[which] = figure;
    this.scene.add(figure.root);
    return figure;
  }

  // Swap who is standing at the spot. Both figures are built once and kept, so
  // changing ends is a scene add/remove rather than rebuilding geometry.
  _setKicker(fig) {
    if (!fig || this.kickerFig === fig) {
      if (fig) this._placeKicker();
      return;
    }
    if (this.kickerFig) this.scene.remove(this.kickerFig.root);
    this.kickerFig = fig;
    this.scene.add(fig.root);
    this._placeKicker();
    resetPose(fig);
  }

  // The player's own start.ng character, dressed from their chosen style. This
  // is the figure that takes the penalties.
  setPlayerStyle(style) {
    this.playerKickerFig = createFigureFromStyle(style, { number: 10 });
    this._setKicker(this.playerKickerFig);
    return this.playerKickerFig;
  }

  // The opposition.
  //
  // There is no roster any more. They're a character built from the same style
  // shape as the player's, so they dress through exactly the same code path —
  // just in a contrasting kit, with the keeper in the usual yellow.
  setOpposition(style) {
    this.oppositionStyle = style;

    this._swapFigure(
      'keeperFig',
      createFigure({
        skinHex: style.skinColor,
        shirtHex: KEEPER_KIT.shirt,
        trimHex: KEEPER_KIT.trim,
        hairHex: style.hairColor,
        hair: style.hair,
        isKeeper: true,
        number: 1,
      })
    );
    this._placeKeeper();

    this.aiTakerFig = createFigureFromStyle(style, { number: 9 });
    this.aiTakerFig.root.position.set(0, 0, PITCH.penaltySpot + 1.7);
    this.aiTakerFig.root.rotation.y = Math.PI;
  }

  setDifficulty(key) {
    this.difficulty = DIFFICULTY[key] || DIFFICULTY.normal;
  }

  reset() {
    this.phase = PHASE.AIM;
    this.round = 1;
    this.shotsTaken = 0;
    this.goals = 0;
    this.faced = 0;
    this.saves = 0;
    this.power = 0;
    this.charging = false;
    this.keeperDive = null;
    this.celebrating = 0;
    // These three must be cleared per match. Leaving keepingStarted set meant
    // the second game never swapped ends and the round counter ran on forever.
    this.keepingStarted = false;
    this.playerDiveZone = null;
    this.aiZone = null;
    this.reticle.visible = false;
    // Back to the player's own character taking the penalties.
    this._setKicker(this.playerKickerFig);
    this.ball.reset();
    resetPose(this.keeperFig);
    resetPose(this.kickerFig);
    this.keeperFig.root.position.set(0, 0, -0.45);
    this.kickerFig.root.position.set(0, 0, PITCH.penaltySpot + 1.7);
    this._emit('turn', { round: this.round, side: 'shoot' });
  }

  // -------------------------------------------------------------------------
  // Input
  // -------------------------------------------------------------------------

  aimAt(nx, ny) {
    if (this.phase !== PHASE.AIM) return;
    // nx, ny arrive as -1..1 from the pointer.
    this.aim.x = THREE.MathUtils.clamp(nx, -1, 1);
    this.aim.y = THREE.MathUtils.clamp(ny, -1, 1);
  }

  beginCharge() {
    if (this.phase !== PHASE.AIM) return;
    this.charging = true;
  }

  release() {
    if (this.phase === PHASE.KEEP_PICK) return;
    if (this.phase !== PHASE.AIM || !this.charging) return;
    this.charging = false;
    this.phase = PHASE.RUNUP;
    this.runupT = 0;
  }

  // The keeper half: the player picks where to dive.
  chooseDive(zoneId) {
    if (this.phase !== PHASE.KEEP_PICK) return;
    const zone = ZONES.find((z) => z.id === zoneId) || ZONES[4];
    this.playerDiveZone = zone;
    this._startAiPenalty(zone);
  }

  // -------------------------------------------------------------------------
  // Update
  // -------------------------------------------------------------------------

  update(dt) {
    this.time += dt;
    this.world.update(this.time, dt);

    // The celebration runs through the result window. Counted down in game time,
    // so pausing freezes it along with everything else rather than letting it
    // run on behind the pause screen.
    if (this.celebrating > 0) {
      this.celebrating -= dt;
      const saving = this.lastResult && this.lastResult.kind === 'save';
      applyCelebration(saving ? this.keeperFig : this.kickerFig, this.time);
    }

    // The reticle follows the aim while shooting.
    if (this.phase === PHASE.AIM) {
      const world = aimToWorld(this.aim.x, this.aim.y);
      this.reticle.position.set(world.x, world.y, 0.05);
      this.reticle.visible = this.active;
      this.reticle.lookAt(this._reticleLook());
      applyIdle(this.kickerFig, this.time);
    } else {
      this.reticle.visible = false;
    }

    if (this.charging) {
      // A ping-pong meter: it fills, then falls, so holding forever isn't a
      // winning strategy and release timing actually matters.
      this.power += this.chargeDir * dt * 1.35;
      if (this.power >= 1) {
        this.power = 1;
        this.chargeDir = -1;
      }
      if (this.power <= 0) {
        this.power = 0;
        this.chargeDir = 1;
      }
      this._emit('power', { power: this.power });
    }

    if (this.phase === PHASE.RUNUP) {
      this.runupT += dt / 0.72;
      applyKick(this.kickerFig, Math.min(this.runupT, 1));
      if (this.runupT >= 0.58 && !this.kicked) {
        this.kicked = true;
        this._strike();
      }
      if (this.runupT >= 1) {
        this.phase = PHASE.FLIGHT;
      }
    }

    if (this.phase === PHASE.FLIGHT) {
      this._updateKeeperDive(dt);
      const event = this.ball.step(dt);
      if (event) this._resolveShot(event);
      else if (this._ballWithinReach()) this._resolveCatch('shoot');
    }

    if (this.phase === PHASE.KEEP_FLIGHT) {
      this._updateKeeperDive(dt);
      const event = this.ball.step(dt);
      if (event) this._resolveSave(event);
      else if (this._ballWithinReach()) this._resolveCatch('keep');
    }

    if (this.phase === PHASE.RESULT) {
      this.resultTimer -= dt;
      if (this.resultTimer <= 0) this._nextTurn();
    }

    if (this.phase === PHASE.KEEP_PICK) {
      // Keeper shuffles on the line while the player decides.
      applyKeeperReady(this.keeperFig, this.time);
    }
  }

  _reticleLook() {
    // Billboard the ring toward the camera so it always reads as a flat circle.
    const cam = this.scene.userData.camera;
    if (cam) return cam.position;
    return new THREE.Vector3(0, 2, 12);
  }

  _strike() {
    const target = aimToWorld(this.aim.x, this.aim.y);
    // A little curl, always bending outward from where you aimed. Enough to
    // see, not enough to make aiming feel unreliable.
    const curve = -this.aim.x * 0.3;
    this.ball.launch(target, this.power, curve);
    this.kicked = true;

    // The keeper commits a moment after the strike.
    this.keeperDive = {
      dir: this._pickKeeperDirection(),
      high: Math.random() < 0.45,
      startAt: this.time + this.difficulty.delay,
      progress: 0,
      duration: 0.42,
    };
    this.shotsTaken += 1;
    this._emit('struck', { power: this.power });
  }

  // Where the keeper goes. Deliberately not uniform: staying central is
  // under-picked by real keepers, and guessing purely at random would make the
  // game feel arbitrary rather than difficult.
  _pickKeeperDirection() {
    const r = Math.random();
    if (r < this.difficulty.centre) return 0;
    return r < 0.5 + this.difficulty.centre / 2 ? -1 : 1;
  }

  _updateKeeperDive(dt) {
    if (!this.keeperDive) {
      applyKeeperReady(this.keeperFig, this.time);
      return;
    }
    if (this.time < this.keeperDive.startAt) {
      applyKeeperReady(this.keeperFig, this.time);
      return;
    }
    this.keeperDive.progress = Math.min(
      1,
      this.keeperDive.progress + dt / (this.keeperDive.duration || 0.42)
    );
    applyDive(
      this.keeperFig,
      this.keeperDive.dir,
      this.keeperDive.progress,
      this.keeperDive.high
    );
  }

  // Has the keeper got a hand to the ball?
  //
  // This is checked every frame while the ball is near the line, not only at
  // the instant it crosses. Comparing a single crossing point against a single
  // coverage point meant a save needed the ball to land within reach on one
  // exact frame — technically correct, and in practice it felt like the keeper
  // was ignoring shots he'd clearly got to.
  _ballWithinReach() {
    if (!this.keeperDive) return false;
    const pos = this.ball.mesh.position;
    if (pos.z > 0.55) return false; // only once the ball is at the goalmouth

    const cov = this._keeperCoverage();
    return Math.hypot(pos.x - cov.x, pos.y - cov.y) < this.difficulty.reach;
  }

  _resolveCatch(side) {
    // Stop the ball dead — it's been held, not deflected.
    this.ball.inFlight = false;
    this.ball.velocity.set(0, 0, 0);
    this.ball.curve = 0;

    this.phase = PHASE.RESULT;
    this.resultTimer = 1.9;

    if (side === 'shoot') {
      this.lastResult = { kind: 'save', label: 'SAVED!' };
      this._emit('result', {
        ...this.lastResult,
        goals: this.goals,
        shots: this.shotsTaken,
        side: 'shoot',
      });
    } else {
      this.saves += 1;
      this.celebrating = 2.4;
      this.lastResult = { kind: 'save', label: 'YOU SAVED IT!' };
      this._emit('result', {
        ...this.lastResult,
        saves: this.saves,
        faced: this.faced,
        side: 'keep',
      });
    }
  }

  // The keeper's coverage point, in metres on the goal plane. Derived from the
  // same numbers that drive the animation, so what you see is what saves you.
  _keeperCoverage() {
    const d = this.keeperDive;
    if (!d) return { x: 0, y: 1.0 };
    const p = THREE.MathUtils.clamp(d.progress, 0, 1);
    const eased = 1 - Math.pow(1 - p, 2);
    const reachY = d.high ? 1.75 : 0.55;
    return {
      x: d.dir * eased * 1.95,
      y: 1.0 + (reachY - 1.0) * eased,
    };
  }

  _resolveShot(event) {
    this.phase = PHASE.RESULT;
    this.resultTimer = 1.9;

    let outcome;
    if (event.type === 'woodwork') {
      outcome = { kind: 'woodwork', label: 'Off the woodwork!' };
    } else if (event.type === 'wide') {
      outcome = { kind: 'miss', label: 'Wide!' };
    } else if (event.type === 'grounded') {
      outcome = { kind: 'miss', label: 'Short of the goal' };
    } else {
      // Reached the goal plane inside the frame — now it's keeper vs ball.
      const cov = this._keeperCoverage();
      const dist = Math.hypot(event.x - cov.x, event.y - cov.y);
      if (this.keeperDive && dist < this.difficulty.reach) {
        outcome = { kind: 'save', label: 'SAVED!' };
      } else {
        this.goals += 1;
        outcome = { kind: 'goal', label: 'GOAL!' };
        // Run the celebration for the whole result window, so it plays out
        // rather than being cut off when the next turn starts.
        this.celebrating = 2.4;
      }
    }

    this.lastResult = outcome;
    this._emit('result', {
      ...outcome,
      goals: this.goals,
      shots: this.shotsTaken,
      side: 'shoot',
    });
  }

  // -------------------------------------------------------------------------
  // Keeper half
  // -------------------------------------------------------------------------

  beginKeeping() {
    this.phase = PHASE.KEEP_PICK;
    // You're in goal now, so the player standing at the spot is theirs.
    this._setKicker(this.aiTakerFig);
    this._resetForKeeper();
    this._emit('turn', { round: 1, side: 'keep' });
  }

  _resetForKeeper() {
    this.ball.reset();
    resetPose(this.keeperFig);
    resetPose(this.kickerFig);
    this.keeperFig.root.position.set(0, 0, -0.45);
    this.kickerFig.root.position.set(0, 0, PITCH.penaltySpot + 1.7);
    this.keeperDive = null;
    this.kicked = false;
    this.runupT = 0;
  }

  _startAiPenalty() {
    // The AI shooter picks a zone, then everything runs through the same
    // physical model the player used — so a save here means the same thing it
    // would have meant at the other end.
    const weights = ZONES.map((z) => {
      // Corners are harder and therefore preferred; the middle is a last resort.
      const corner = Math.abs(z.x) > 0.5 ? 3 : Math.abs(z.x) < 0.2 ? 1 : 2;
      const low = z.y < 0.5 ? 1.3 : 1;
      return corner * low;
    });
    const total = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    let aiZone = ZONES[0];
    for (let i = 0; i < ZONES.length; i++) {
      r -= weights[i];
      if (r <= 0) {
        aiZone = ZONES[i];
        break;
      }
    }
    this.aiZone = aiZone;

    // You've already committed before the kick, so your dive gets a head start
    // and is quicker than the AI keeper's — otherwise you'd be mid-air when the
    // ball arrived and never reach anything.
    this.keeperDive = {
      dir: Math.sign(this.playerDiveZone.x) || 0,
      high: this.playerDiveZone.y > 0.5,
      startAt: this.time + 0.05,
      progress: 0,
      duration: 0.28,
    };

    const target = aimToWorld(aiZone.x, aiZone.y);
    this.ball.launch(target, 0.55 + Math.random() * 0.3, -aiZone.x * 0.25);
    this.faced += 1;
    this.phase = PHASE.KEEP_FLIGHT;
    this._emit('struck', { power: 0.7 });
  }

  _resolveSave(event) {
    this.phase = PHASE.RESULT;
    this.resultTimer = 1.9;

    let outcome;
    if (event.type === 'woodwork' || event.type === 'wide' || event.type === 'grounded') {
      outcome = { kind: 'theirmiss', label: 'They missed!' };
    } else {
      const cov = this._keeperCoverage();
      const dist = Math.hypot(event.x - cov.x, event.y - cov.y);
      if (this.keeperDive && dist < this.difficulty.reach) {
        this.saves += 1;
        outcome = { kind: 'save', label: 'YOU SAVED IT!' };
        // The keeper you're controlling gets the celebration when you save.
        this.celebrating = 2.4;
      } else {
        outcome = { kind: 'concede', label: 'They scored' };
      }
    }

    this.lastResult = outcome;
    this._emit('result', {
      ...outcome,
      saves: this.saves,
      faced: this.faced,
      side: 'keep',
    });
  }

  // -------------------------------------------------------------------------

  _nextTurn() {
    this.kicked = false;
    this.celebrating = 0;
    this.ball.reset();
    resetPose(this.keeperFig);
    resetPose(this.kickerFig);
    this.keeperFig.root.position.set(0, 0, -0.45);
    this.kickerFig.root.position.set(0, 0, PITCH.penaltySpot + 1.7);
    this.keeperDive = null;
    this.runupT = 0;

    if (this.shotsTaken >= SHOTS_PER_SIDE && this.faced === 0 && !this.keepingStarted) {
      // Shooting half done. Swap ends.
      this.keepingStarted = true;
      this.beginKeeping();
      this.round = 1;
      return;
    }

    if (this.faced >= SHOTS_PER_SIDE) {
      this.phase = PHASE.OVER;
      this._emit('over', {
        goals: this.goals,
        shots: this.shotsTaken,
        saves: this.saves,
        faced: this.faced,
        won: this.goals > this.faced - this.saves,
      });
      return;
    }

    this.round += 1;
    this.phase = this.faced > 0 ? PHASE.KEEP_PICK : PHASE.AIM;
    this.power = 0;
    this.chargeDir = 1;
    this._emit('turn', {
      round: this.round,
      side: this.faced > 0 ? 'keep' : 'shoot',
    });
  }

  _emit(type, data) {
    this.onEvent({ type, ...data });
  }
}
