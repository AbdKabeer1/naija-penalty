import * as THREE from 'three';

// Players are built from primitives in code, not loaded from a model file.
//
// Two reasons. A rigged humanoid .glb is several megabytes and would dominate
// the download on a Nigerian mobile connection; and a stylised low-poly figure
// actually looks better here than a realistic one, because the whole scene is
// deliberately simple.
//
// Limbs are attached to pivot Groups positioned at the joint, with the mesh
// offset downward by half its length. Rotating the Group then swings the limb
// from the shoulder or hip, which is what makes animation possible at all —
// rotating the mesh directly would spin it about its own centre.

// Anatomy, in metres from the ground. Every joint below is expressed as a
// position between these landmarks, so the figure stays in proportion if
// HEIGHT changes.
const HEIGHT = 1.78;
const HIP_Y = 0.92; // where the legs meet the body — the pelvis
const SHOULDER_Y = 0.53; // relative to the hip group
const HEAD_Y = 0.72; // relative to the hip group
const THIGH_LEN = 0.45;
const SHIN_LEN = 0.39;

function limbMaterial(color) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.85 });
}

// A capsule-ish limb: a cylinder with a sphere at the joint end, so a bent
// knee or elbow doesn't show a hard seam between the two segments.
function makeLimb(color, length, radius) {
  const group = new THREE.Group();
  const mat = limbMaterial(color);

  const cyl = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius * 0.88, length, 8),
    mat
  );
  cyl.position.y = -length / 2;
  cyl.castShadow = true;
  group.add(cyl);

  const cap = new THREE.Mesh(new THREE.SphereGeometry(radius, 8, 6), mat);
  cap.castShadow = true;
  group.add(cap);

  return group;
}

// ---- Character options -----------------------------------------------------
// start.ng gives every player a character: a body, colours, a hairstyle, and
// optionally a hat and an accessory. These build the ones a footballer can
// plausibly wear, so the kid who made a crown on start.ng sees it on the pitch.

function buildHair(head, style, colour) {
  if (style === 'bald') return;
  const mat = limbMaterial(colour);

  // Every style starts from a close cap, then adds what makes it distinct.
  const cap = new THREE.Mesh(
    new THREE.SphereGeometry(0.141, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55),
    mat
  );
  cap.position.y = 0.015;
  cap.castShadow = true;
  head.add(cap);

  if (style === 'afro') {
    const afro = new THREE.Mesh(new THREE.SphereGeometry(0.19, 12, 10), mat);
    afro.position.y = 0.03;
    afro.scale.set(1, 0.92, 1);
    afro.castShadow = true;
    head.add(afro);
  }

  if (style === 'braids' || style === 'dreads') {
    const len = style === 'dreads' ? 0.2 : 0.15;
    const count = 7;
    for (let i = 0; i < count; i++) {
      const a = (i / (count - 1)) * Math.PI - Math.PI / 2;
      const strand = new THREE.Mesh(
        new THREE.CylinderGeometry(0.016, 0.012, len, 5),
        mat
      );
      strand.position.set(
        Math.sin(a) * 0.115,
        -0.02 - len / 2,
        -Math.cos(a) * 0.1 - 0.03
      );
      strand.castShadow = true;
      head.add(strand);
    }
  }

  if (style === 'bun') {
    const bun = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), mat);
    bun.position.set(0, 0.02, -0.14);
    bun.castShadow = true;
    head.add(bun);
  }

  if (style === 'ponytail') {
    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.028, 0.26, 8), mat);
    tail.position.set(0, -0.08, -0.17);
    tail.rotation.x = -0.35;
    tail.castShadow = true;
    head.add(tail);
  }
}

function buildHat(head, style) {
  if (!style || style === 'none') return;

  if (style === 'cap') {
    const crown = new THREE.Mesh(
      new THREE.SphereGeometry(0.148, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.5),
      limbMaterial('#1f2937')
    );
    crown.position.y = 0.025;
    crown.castShadow = true;
    head.add(crown);

    const brim = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.16, 0.02, 12, 1, false, 0, Math.PI),
      limbMaterial('#111827')
    );
    brim.position.set(0, 0.02, 0.05);
    brim.castShadow = true;
    head.add(brim);
    return;
  }

  if (style === 'beanie') {
    const beanie = new THREE.Mesh(
      new THREE.SphereGeometry(0.15, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.62),
      limbMaterial('#b91c1c')
    );
    beanie.position.y = 0.03;
    beanie.castShadow = true;
    head.add(beanie);

    const fold = new THREE.Mesh(new THREE.TorusGeometry(0.142, 0.022, 6, 14), limbMaterial('#7f1d1d'));
    fold.position.y = 0.02;
    fold.rotation.x = Math.PI / 2;
    head.add(fold);
    return;
  }

  if (style === 'tophat') {
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.018, 14), limbMaterial('#111827'));
    brim.position.y = 0.06;
    head.add(brim);

    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.12, 0.22, 12), limbMaterial('#111827'));
    tube.position.y = 0.17;
    tube.castShadow = true;
    head.add(tube);
    return;
  }

  if (style === 'crown') {
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.145, 0.145, 0.05, 12, 1, true), limbMaterial('#d9a441'));
    band.position.y = 0.075;
    band.castShadow = true;
    head.add(band);

    // Five points, front-weighted so it reads as a crown from the camera.
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.075, 4), limbMaterial('#f0c419'));
      spike.position.set(Math.sin(a) * 0.135, 0.13, Math.cos(a) * 0.135);
      spike.castShadow = true;
      head.add(spike);
    }
  }
}

function buildAccessory(head, style, skinMat) {
  if (!style || style === 'none') return;

  if (style === 'glasses') {
    const lensMat = limbMaterial('#1f2937');
    for (const side of [-1, 1]) {
      const lens = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.008, 5, 12), lensMat);
      lens.position.set(side * 0.06, 0, 0.115);
      head.add(lens);
    }
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.008, 0.008), lensMat);
    bridge.position.set(0, 0, 0.118);
    head.add(bridge);
    return;
  }

  if (style === 'earrings') {
    const gold = limbMaterial('#f0c419');
    for (const side of [-1, 1]) {
      const earring = new THREE.Mesh(new THREE.SphereGeometry(0.022, 6, 5), gold);
      earring.position.set(side * 0.145, -0.03, 0.01);
      head.add(earring);
    }
    return;
  }

  if (style === 'beard') {
    const beard = new THREE.Mesh(
      new THREE.SphereGeometry(0.14, 12, 8, 0, Math.PI * 2, Math.PI * 0.62, Math.PI * 0.38),
      limbMaterial('#17120f')
    );
    beard.position.y = 0.01;
    beard.scale.set(1, 1.02, 0.98);
    head.add(beard);
  }
}

// Scarf and backpack hang off the body rather than the head, so they're built
// against the torso.
function buildBodyAccessory(torso, style, shirtMat) {
  if (style === 'scarf') {
    const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.115, 0.032, 6, 14), limbMaterial('#b91c1c'));
    scarf.position.y = 0.56;
    scarf.rotation.x = Math.PI / 2;
    scarf.castShadow = true;
    torso.add(scarf);
  }

  if (style === 'backpack') {
    const pack = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.32, 0.14), limbMaterial('#4b5563'));
    pack.position.set(0, 0.28, -0.2);
    pack.castShadow = true;
    torso.add(pack);
  }
}

export function createFigure({
  skinHex = '#8D5524',
  shirtHex = '#008751',
  trimHex = '#ffffff',
  hairHex = '#17120f',
  hair = 'short',
  hat = 'none',
  accessory = 'none',
  isKeeper = false,
  number = 10,
} = {}) {
  const root = new THREE.Group();
  root.userData.height = HEIGHT;

  const skinMat = limbMaterial(skinHex);
  const shirtMat = limbMaterial(shirtHex);
  const trimMat = limbMaterial(trimHex);

  // ---- Legs --------------------------------------------------------------
  // Attached at HIP_Y, not at the root, so the pelvis is where the body is.
  // Getting this wrong is what makes a figure look like a floating torso with
  // two sticks under it.
  function makeLeg(side) {
    const hip = new THREE.Group();
    hip.position.set(side * 0.105, HIP_Y, 0);
    root.add(hip);

    const thigh = makeLimb(skinHex, THIGH_LEN, 0.082);
    hip.add(thigh);

    const knee = new THREE.Group();
    knee.position.y = -THIGH_LEN;
    thigh.add(knee);

    const shin = makeLimb(skinHex, SHIN_LEN, 0.066);
    knee.add(shin);

    // Sock, over the lower half of the shin.
    const sock = new THREE.Mesh(
      new THREE.CylinderGeometry(0.072, 0.066, 0.22, 8),
      trimMat
    );
    sock.position.y = -SHIN_LEN + 0.11;
    sock.castShadow = true;
    knee.add(sock);

    const boot = new THREE.Mesh(
      new THREE.BoxGeometry(0.115, 0.075, 0.23),
      limbMaterial('#1a1a1a')
    );
    boot.position.set(0, -SHIN_LEN - 0.015, 0.045);
    boot.castShadow = true;
    knee.add(boot);

    return { hip, knee };
  }

  const legs = { left: makeLeg(-1), right: makeLeg(1) };

  // ---- Torso -------------------------------------------------------------
  const torso = new THREE.Group();
  torso.position.y = HIP_Y;
  root.add(torso);

  // Shorts sit on the torso rather than the thighs, so they don't swing with
  // the leg — which is how clothing actually behaves and reads much better on
  // a run-up.
  const shorts = new THREE.Mesh(
    new THREE.CylinderGeometry(0.185, 0.17, 0.26, 10),
    trimMat
  );
  shorts.position.y = -0.03;
  shorts.castShadow = true;
  torso.add(shorts);

  const chest = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2, 0.175, 0.54, 10),
    shirtMat
  );
  chest.position.y = 0.29;
  chest.castShadow = true;
  torso.add(chest);

  // Neck — a short stub, which is the difference between a head that sits on
  // the shoulders and one that hovers above them.
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.06, 0.1, 8), skinMat);
  neck.position.y = 0.58;
  neck.castShadow = true;
  torso.add(neck);

  // Number on the back.
  const numCanvas = document.createElement('canvas');
  numCanvas.width = numCanvas.height = 128;
  const nctx = numCanvas.getContext('2d');
  nctx.fillStyle = trimHex;
  nctx.font = 'bold 88px Outfit, sans-serif';
  nctx.textAlign = 'center';
  nctx.textBaseline = 'middle';
  nctx.fillText(String(number).slice(0, 2), 64, 68);
  const backNumber = new THREE.Mesh(
    new THREE.PlaneGeometry(0.24, 0.24),
    new THREE.MeshBasicMaterial({
      map: new THREE.CanvasTexture(numCanvas),
      transparent: true,
    })
  );
  backNumber.position.set(0, 0.34, -0.185);
  backNumber.rotation.y = Math.PI;
  torso.add(backNumber);

  buildBodyAccessory(torso, accessory, shirtMat);

  // ---- Head --------------------------------------------------------------
  const head = new THREE.Group();
  head.position.y = HEAD_Y;
  torso.add(head);

  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.135, 12, 10), skinMat);
  skull.scale.set(1, 1.1, 0.95);
  skull.castShadow = true;
  head.add(skull);

  buildHair(head, hair, hairHex);
  buildHat(head, hat);
  buildAccessory(head, accessory, skinMat);

  // ---- Arms --------------------------------------------------------------
  function makeArm(side) {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.225, SHOULDER_Y, 0);
    torso.add(shoulder);

    // Sleeve caps the top of the arm so the shoulder joint reads as a shoulder.
    const sleeve = new THREE.Mesh(
      new THREE.SphereGeometry(0.085, 10, 8),
      shirtMat
    );
    sleeve.castShadow = true;
    shoulder.add(sleeve);

    const upper = makeLimb(skinHex, 0.29, 0.062);
    shoulder.add(upper);

    const elbow = new THREE.Group();
    elbow.position.y = -0.29;
    upper.add(elbow);

    const fore = makeLimb(skinHex, 0.26, 0.055);
    elbow.add(fore);

    const handMat = isKeeper ? limbMaterial('#f0c419') : skinMat;
    const hand = new THREE.Mesh(
      new THREE.SphereGeometry(isKeeper ? 0.1 : 0.072, 8, 6),
      handMat
    );
    hand.position.y = -0.28;
    hand.castShadow = true;
    elbow.add(hand);

    return { shoulder, elbow };
  }

  const arms = { left: makeArm(-1), right: makeArm(1) };

  // A soft contact shadow. Real shadow-mapping at this scale is patchy on
  // phones, and a blob underneath anchors the figure either way.
  const blob = new THREE.Mesh(
    new THREE.CircleGeometry(0.34, 16),
    new THREE.MeshBasicMaterial({
      color: 0x2a1c12,
      transparent: true,
      opacity: 0.24,
      depthWrite: false,
    })
  );
  blob.rotation.x = -Math.PI / 2;
  blob.position.y = 0.015;
  root.add(blob);

  return {
    root,
    torso,
    head,
    arms,
    legs,
    material: { skin: skinMat, shirt: shirtMat, trim: trimMat },
  };
}

// Draw a start.ng character.
//
// `style` is expected to have been normalised already by safeStyle() in
// services/startng.js. This layer deliberately does not import from services —
// the scene has to stay drawable on its own — so the caller does that.
export function createFigureFromStyle(style, { isKeeper = false, number = 10 } = {}) {
  return createFigure({
    skinHex: style.skinColor,
    shirtHex: style.primaryColor,
    trimHex: style.secondaryColor,
    hairHex: style.hairColor,
    hair: style.hair,
    hat: style.hat,
    accessory: style.accessory,
    isKeeper,
    number,
  });
}

// ---- Poses -----------------------------------------------------------------
// Named poses rather than raw rotations at every call site, so the game code
// reads as football ("wind up", "follow through") rather than trigonometry.

export function applyIdle(fig, t) {
  const sway = Math.sin(t * 1.4) * 0.03;
  fig.torso.rotation.z = sway;
  fig.torso.rotation.x = Math.sin(t * 1.4 + 1) * 0.015;
  fig.arms.left.shoulder.rotation.x = -0.12 + sway;
  fig.arms.right.shoulder.rotation.x = -0.12 - sway;
  fig.arms.left.elbow.rotation.x = -0.35;
  fig.arms.right.elbow.rotation.x = -0.35;
}

export function applyKeeperReady(fig, t) {
  // Crouched, arms out, bouncing on the toes.
  const bounce = Math.sin(t * 3.2) * 0.04;
  fig.root.position.y = bounce * 0.4;
  fig.torso.rotation.x = 0.22;
  fig.arms.left.shoulder.rotation.z = 1.15;
  fig.arms.right.shoulder.rotation.z = -1.15;
  fig.arms.left.elbow.rotation.x = -0.5;
  fig.arms.right.elbow.rotation.x = -0.5;
  fig.legs.left.hip.rotation.x = -0.28 - bounce;
  fig.legs.right.hip.rotation.x = -0.28 + bounce;
  fig.legs.left.knee.rotation.x = 0.5;
  fig.legs.right.knee.rotation.x = 0.5;
}

// progress: 0 = standing, 1 = fully committed to the dive.
export function applyDive(fig, dir, progress, high = false) {
  const p = THREE.MathUtils.clamp(progress, 0, 1);
  const eased = 1 - Math.pow(1 - p, 2);

  fig.root.position.x = dir * eased * 1.9;
  fig.root.position.y = Math.sin(eased * Math.PI) * (high ? 1.05 : 0.45);
  fig.root.rotation.z = -dir * eased * (high ? 1.35 : 0.95);

  fig.arms.left.shoulder.rotation.z = 1.5 * eased * (dir > 0 ? 0.6 : 1);
  fig.arms.right.shoulder.rotation.z = -1.5 * eased * (dir < 0 ? 0.6 : 1);
  fig.arms.left.shoulder.rotation.x = -0.2;
  fig.arms.right.shoulder.rotation.x = -0.2;
  fig.arms.left.elbow.rotation.x = -0.12;
  fig.arms.right.elbow.rotation.x = -0.12;

  fig.legs.left.hip.rotation.x = -0.5 * eased;
  fig.legs.right.hip.rotation.x = -0.9 * eased;
  fig.legs.left.knee.rotation.x = 0.7 * eased;
  fig.legs.right.knee.rotation.x = 1.1 * eased;
}

// progress: 0 = standing at the start of the run-up, 1 = follow-through.
export function applyKick(fig, progress) {
  const p = THREE.MathUtils.clamp(progress, 0, 1);

  if (p < 0.55) {
    // Run-up: drive the left leg forward, swing the arms in opposition.
    const s = p / 0.55;
    fig.legs.left.hip.rotation.x = -Math.sin(s * Math.PI) * 0.9;
    fig.legs.right.hip.rotation.x = Math.sin(s * Math.PI) * 0.7;
    fig.legs.left.knee.rotation.x = 0.6;
    fig.legs.right.knee.rotation.x = 0.4;
    fig.arms.right.shoulder.rotation.x = -Math.sin(s * Math.PI) * 0.8;
    fig.arms.left.shoulder.rotation.x = Math.sin(s * Math.PI) * 0.8;
    fig.torso.rotation.y = Math.sin(s * Math.PI) * 0.12;
  } else {
    // Strike and follow-through: the right leg whips through and the body
    // leans back over the standing foot.
    const s = (p - 0.55) / 0.45;
    fig.legs.right.hip.rotation.x = -1.4 * Math.sin(s * Math.PI * 0.75);
    fig.legs.right.knee.rotation.x = 0.15 + s * 0.4;
    fig.legs.left.hip.rotation.x = -0.25;
    fig.legs.left.knee.rotation.x = 0.45;
    fig.torso.rotation.x = -0.1 - s * 0.28;
    fig.torso.rotation.y = 0.12 - s * 0.3;
    fig.arms.left.shoulder.rotation.x = 0.5 * s;
    fig.arms.right.shoulder.rotation.x = -0.5 * s;
    fig.arms.left.shoulder.rotation.z = 0.9 * s;
  }
}

// Arms up, knees pumping. Loops for as long as `t` keeps advancing, so the
// celebration can run until the turn ends rather than being a fixed clip.
export function applyCelebration(fig, t) {
  const hop = Math.abs(Math.sin(t * 4.6));

  fig.root.position.y = hop * 0.28;
  fig.root.rotation.z = Math.sin(t * 4.6) * 0.05;

  fig.torso.rotation.x = -0.14;
  fig.torso.rotation.y = Math.sin(t * 3.1) * 0.16;

  // Both arms punched overhead.
  fig.arms.left.shoulder.rotation.z = 2.75;
  fig.arms.right.shoulder.rotation.z = -2.75;
  fig.arms.left.shoulder.rotation.x = Math.sin(t * 6.2) * 0.25;
  fig.arms.right.shoulder.rotation.x = Math.sin(t * 6.2 + 1) * 0.25;
  fig.arms.left.elbow.rotation.x = -0.18;
  fig.arms.right.elbow.rotation.x = -0.18;

  // Legs tuck on the way up, extend on the way down.
  fig.legs.left.hip.rotation.x = -hop * 0.55;
  fig.legs.right.hip.rotation.x = -hop * 0.4;
  fig.legs.left.knee.rotation.x = hop * 0.85;
  fig.legs.right.knee.rotation.x = hop * 0.6;
}

export function resetPose(fig) {
  // x and y go back to zero, z is kept — the caller has already placed the
  // figure at its spot along the pitch and that must not be clobbered.
  //
  // Zeroing x matters: a dive leaves the keeper offset sideways, and without
  // this he'd take the next penalty standing two metres off his line.
  fig.root.position.set(0, 0, fig.root.position.z);
  fig.root.rotation.set(0, fig.root.rotation.y, 0);
  fig.torso.rotation.set(0, 0, 0);
  for (const side of ['left', 'right']) {
    fig.arms[side].shoulder.rotation.set(0, 0, 0);
    fig.arms[side].elbow.rotation.set(0, 0, 0);
    fig.legs[side].hip.rotation.set(0, 0, 0);
    fig.legs[side].knee.rotation.set(0, 0, 0);
  }
}
