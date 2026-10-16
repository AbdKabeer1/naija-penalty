import * as THREE from 'three';
import { PITCH, makeNetTexture } from './world.js';

// The goal: frame plus netting.
//
// The net is four flat panels with an alpha grid texture rather than a modelled
// mesh. Modelling the net properly costs thousands of segments and would be the
// most expensive object in the scene by an order of magnitude — for something
// that reads identically at this camera distance.

const POST_RADIUS = 0.065;
const NET_DEPTH = 1.9;

function frameMaterial() {
  return new THREE.MeshStandardMaterial({
    color: 0xf6f4ef,
    roughness: 0.45,
    metalness: 0.05,
  });
}

export function createGoal() {
  const goal = new THREE.Group();
  const { goalWidth: W, goalHeight: H } = PITCH;
  const halfW = W / 2;

  const mat = frameMaterial();

  // Uprights.
  for (const x of [-halfW, halfW]) {
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(POST_RADIUS, POST_RADIUS, H, 12),
      mat
    );
    post.position.set(x, H / 2, 0);
    post.castShadow = true;
    goal.add(post);
  }

  // Crossbar.
  const bar = new THREE.Mesh(
    new THREE.CylinderGeometry(POST_RADIUS, POST_RADIUS, W + POST_RADIUS * 2, 12),
    mat
  );
  bar.rotation.z = Math.PI / 2;
  bar.position.set(0, H, 0);
  bar.castShadow = true;
  goal.add(bar);

  // ---- Netting ----------------------------------------------------------
  const netTex = makeNetTexture();
  // Repeat is set per panel below, so each grid square stays roughly square
  // regardless of the panel's real-world proportions.
  function netMaterial(repX, repY) {
    const tex = netTex.clone();
    tex.needsUpdate = true;
    tex.repeat.set(repX, repY);
    return new THREE.MeshStandardMaterial({
      map: tex,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
      depthWrite: false,
      roughness: 1,
    });
  }

  const back = new THREE.Mesh(
    new THREE.PlaneGeometry(W, H * 0.98),
    netMaterial(W / 0.5, H / 0.5)
  );
  back.position.set(0, (H * 0.98) / 2, -NET_DEPTH);
  goal.add(back);

  // Sloped top panel, sagging slightly back — a taut net looks wrong.
  const top = new THREE.Mesh(
    new THREE.PlaneGeometry(W, NET_DEPTH * 1.05),
    netMaterial(W / 0.5, NET_DEPTH / 0.5)
  );
  top.rotation.x = -Math.PI / 2 + 0.06;
  top.position.set(0, H - 0.03, -NET_DEPTH / 2);
  goal.add(top);

  for (const side of [-1, 1]) {
    const panel = new THREE.Mesh(
      new THREE.PlaneGeometry(NET_DEPTH, H * 0.98),
      netMaterial(NET_DEPTH / 0.5, H / 0.5)
    );
    panel.rotation.y = Math.PI / 2;
    panel.position.set(side * halfW, (H * 0.98) / 2, -NET_DEPTH / 2);
    goal.add(panel);
  }

  // The frame positions itself at the goal line; callers can move the group.
  return goal;
}

// Turn a normalised aim (x,y in -1..1) into a world position on the goal plane.
export function aimToWorld(x, y) {
  const halfW = PITCH.goalWidth / 2;
  // Keep the ball inside the frame even at the extremes of the reticle.
  const clampedX = THREE.MathUtils.clamp(x, -1, 1) * (halfW - 0.18);
  const clampedY = THREE.MathUtils.clamp(y, -1, 1) * (PITCH.goalHeight - 0.14);
  return new THREE.Vector3(clampedX, Math.max(0.12, clampedY), 0);
}
