import * as THREE from 'three';
import { PITCH } from './world.js';

// The ball, and the flight model behind every penalty.
//
// The trajectory is a simple ballistic arc with one addition: a constant
// sideways acceleration that stands in for spin. A real Magnus force depends on
// spin rate and velocity; modelling that properly is overkill here, and a
// constant lateral push produces the same curved flight you can see and aim
// around.

export const BALL_RADIUS = 0.11;

function makeBallTexture() {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#f4f1e8';
  ctx.fillRect(0, 0, size, size);

  // Dark panels, scattered rather than a true truncated-icosahedron unwrap —
  // at the size the ball appears on screen the difference is invisible.
  ctx.fillStyle = '#22201c';
  for (let i = 0; i < 16; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 34 + Math.random() * 18;
    ctx.beginPath();
    for (let s = 0; s < 5; s++) {
      const a = (s / 5) * Math.PI * 2 - Math.PI / 2;
      const px = x + Math.cos(a) * r;
      const py = y + Math.sin(a) * r;
      if (s === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  }

  // Seam shading so the ball reads as round even when lit flatly.
  ctx.strokeStyle = 'rgba(120,115,105,0.35)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, 60 + i * 40, 0, Math.PI * 2);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createBall() {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(BALL_RADIUS, 24, 18),
    new THREE.MeshStandardMaterial({
      map: makeBallTexture(),
      roughness: 0.55,
      metalness: 0.02,
    })
  );
  mesh.castShadow = true;
  mesh.position.set(0, BALL_RADIUS, PITCH.penaltySpot);

  // A soft contact shadow under the ball while it rolls or rests.
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(BALL_RADIUS * 1.6, 16),
    new THREE.MeshBasicMaterial({
      color: 0x2a1c12,
      transparent: true,
      opacity: 0.25,
      depthWrite: false,
    })
  );
  shadow.rotation.x = -Math.PI / 2;

  return {
    mesh,
    shadow,
    velocity: new THREE.Vector3(),
    curve: 0,
    spin: new THREE.Vector3(),
    inFlight: false,

    reset() {
      mesh.position.set(0, BALL_RADIUS, PITCH.penaltySpot);
      mesh.rotation.set(0, 0, 0);
      this.velocity.set(0, 0, 0);
      this.spin.set(0, 0, 0);
      this.curve = 0;
      this.inFlight = false;
      shadow.position.set(0, 0.012, PITCH.penaltySpot);
      shadow.scale.setScalar(1);
      shadow.material.opacity = 0.25;
    },

    placeAt(x, z) {
      mesh.position.set(x, BALL_RADIUS, z);
      shadow.position.set(x, 0.012, z);
    },

    // Launch at a target point on the goal plane.
    //   target: THREE.Vector3 on z = 0
    //   power:  0..1 — higher means a flatter, faster ball
    //   curve: -1..1 — negative bends left, positive bends right
    launch(target, power = 0.6, curve = 0) {
      const start = this.mesh.position.clone();
      // Flight time falls as power rises, so a hard shot gets there sooner and
      // therefore bends less — which is a real trade-off players can feel.
      const flightTime = THREE.MathUtils.lerp(1.05, 0.62, THREE.MathUtils.clamp(power, 0, 1));

      const dx = target.x - start.x;
      const dy = target.y - start.y;
      const dz = target.z - start.z;
      const g = 9.81;

      // Lateral push, scaled by flight time so a slow ball bends more.
      const ax = curve * 6.2 * flightTime;
      this.curve = ax;

      // Solve the launch velocity so the ball still arrives at the target WITH
      // the curve applied:
      //   x(T) = x0 + vx·T + ½·ax·T²  =  target.x
      // Without the ½·ax·T² term the ball would curve away from whatever the
      // player aimed at, which makes every curled shot feel like a bug.
      const vx = (dx - 0.5 * ax * flightTime * flightTime) / flightTime;

      this.velocity.set(
        vx,
        (dy + 0.5 * g * flightTime * flightTime) / flightTime,
        dz / flightTime
      );

      // Blasting it beyond the meter's useful range lifts the ball over the
      // bar — the one way power can actually punish you.
      const overhit = THREE.MathUtils.clamp((power - 0.86) / 0.14, 0, 1);
      this.velocity.y += overhit * 4.2;

      this.spin.set(0, curve * 14, -12 - power * 10);
      this.inFlight = true;
    },

    // Advances one frame. Returns a small event describing what happened, or
    // null while the ball is still travelling.
    step(dt) {
      if (!this.inFlight) return null;

      this.velocity.y -= 9.81 * dt;
      this.velocity.x += this.curve * dt;
      this.mesh.position.addScaledVector(this.velocity, dt);

      // Roll the ball in the direction of travel, so a shot visibly spins.
      this.mesh.rotation.x += this.spin.x * dt;
      this.mesh.rotation.y += this.spin.y * dt;
      this.mesh.rotation.z += this.spin.z * dt;

      const pos = this.mesh.position;

      // Shadow shrinks and fades as the ball climbs.
      this.shadow.position.set(pos.x, 0.012, pos.z);
      const h = Math.max(0, pos.y - BALL_RADIUS);
      const s = THREE.MathUtils.clamp(1 - h / 6, 0.35, 1);
      this.shadow.scale.setScalar(s);
      this.shadow.material.opacity = 0.25 * s;

      // --- Goal plane -----------------------------------------------------
      if (pos.z <= BALL_RADIUS && this.velocity.z < 0) {
        this.inFlight = false;
        const { goalWidth, goalHeight } = PITCH;
        const nearPost =
          Math.abs(Math.abs(pos.x) - goalWidth / 2) < BALL_RADIUS + 0.08;
        const nearBar = Math.abs(pos.y - goalHeight) < BALL_RADIUS + 0.08;

        if (nearPost || nearBar) {
          return { type: 'woodwork', x: pos.x, y: pos.y };
        }
        if (Math.abs(pos.x) < goalWidth / 2 && pos.y > 0 && pos.y < goalHeight) {
          return { type: 'crossed', x: pos.x, y: pos.y };
        }
        return { type: 'wide', x: pos.x, y: pos.y };
      }

      // --- Ground ---------------------------------------------------------
      if (pos.y <= BALL_RADIUS && this.velocity.y < 0) {
        if (pos.z > 0.5) {
          // Bounced short of the line and is rolling out.
          this.velocity.y = Math.abs(this.velocity.y) * 0.42;
          this.velocity.x *= 0.72;
          this.velocity.z *= 0.72;
          pos.y = BALL_RADIUS;
          if (this.velocity.length() < 1.2) {
            this.velocity.set(0, 0, 0);
            this.curve = 0;
            this.inFlight = false;
            return { type: 'grounded' };
          }
        }
      }

      // Ran out of world without a decision — treat as a miss.
      if (pos.z < -3 || Math.abs(pos.x) > 30 || pos.y > 25) {
        this.inFlight = false;
        return { type: 'wide', x: pos.x, y: pos.y };
      }

      return null;
    },
  };
}
