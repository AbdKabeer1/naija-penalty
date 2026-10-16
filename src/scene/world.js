import * as THREE from 'three';

// The rural pitch and everything around it.
//
// Every texture here is drawn at runtime on a <canvas> rather than loaded from
// a file. That keeps the build to a few JS files, which matters because
// start.ng serves static files and a folder of PNGs is the usual reason a
// drag-and-drop deploy half-works.

export const PITCH = {
  goalWidth: 7.32, // real FIFA dimensions
  goalHeight: 2.44,
  penaltySpot: 11,
  boxDepth: 16.5,
  boxWidth: 40.32,
  sixYardDepth: 5.5,
  sixYardWidth: 18.32,
};

// ---------------------------------------------------------------------------
// Canvas texture helpers
// ---------------------------------------------------------------------------

function makeCanvas(size = 512) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  return { canvas, ctx: canvas.getContext('2d') };
}

// Scattered speckle. Used to break up flat colours so the ground and the mud
// walls don't look like untextured plastic.
function speckle(ctx, size, count, colours, maxRadius = 3) {
  for (let i = 0; i < count; i++) {
    ctx.fillStyle = colours[Math.floor(Math.random() * colours.length)];
    ctx.globalAlpha = 0.15 + Math.random() * 0.35;
    ctx.beginPath();
    ctx.arc(
      Math.random() * size,
      Math.random() * size,
      Math.random() * maxRadius + 0.5,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// The dust bowl the game is played on: patchy dry grass over laterite.
export function makeGroundTexture() {
  const size = 1024;
  const { canvas, ctx } = makeCanvas(size);

  ctx.fillStyle = '#9c8055';
  ctx.fillRect(0, 0, size, size);

  // Patchy dry grass.
  for (let i = 0; i < 900; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 12 + Math.random() * 60;
    ctx.fillStyle = ['#7d7a3e', '#8a8148', '#6f7438', '#93855a'][
      Math.floor(Math.random() * 4)
    ];
    ctx.globalAlpha = 0.25 + Math.random() * 0.35;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Bare laterite showing through, especially down the middle where play wears
  // the grass away — the way a real village pitch looks.
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = '#a8663c';
  ctx.beginPath();
  ctx.ellipse(size / 2, size / 2, size * 0.22, size * 0.14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  speckle(ctx, size, 4000, ['#7a5533', '#b08a5e', '#5f4a2c'], 2.5);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 6);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

// Sun-bleached mud-brick, for the huts.
function makeMudTexture() {
  const size = 256;
  const { canvas, ctx } = makeCanvas(size);
  ctx.fillStyle = '#b07a4e';
  ctx.fillRect(0, 0, size, size);
  speckle(ctx, size, 1200, ['#96663f', '#c4906a', '#8a5c38'], 4);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Thatch for the roofs.
function makeThatchTexture() {
  const size = 256;
  const { canvas, ctx } = makeCanvas(size);
  ctx.fillStyle = '#b99a52';
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 400; i++) {
    ctx.strokeStyle = ['#9c7f3c', '#cdb06a', '#8a6f33'][i % 3];
    ctx.globalAlpha = 0.4;
    ctx.lineWidth = 1 + Math.random();
    const x = Math.random() * size;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + (Math.random() - 0.5) * 12, size);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// The goal net, as a transparent grid. Drawn rather than modelled so it costs
// one plane per side instead of hundreds of line segments.
export function makeNetTexture(cellPx = 26) {
  const size = 256;
  const { canvas, ctx } = makeCanvas(size);
  ctx.clearRect(0, 0, size, size);
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 1.6;
  for (let i = 0; i <= size; i += cellPx) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, size);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(size, i);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

// The sky. A vertical gradient on the inside of a big sphere — cheap, and reads
// as a hazy harmattan afternoon rather than a flat blue screen.
export function makeSkyTexture() {
  const { canvas, ctx } = makeCanvas(256);
  canvas.width = 8;
  canvas.height = 256;
  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0.0, '#4a86c4'); // zenith
  grad.addColorStop(0.35, '#93b7d4');
  grad.addColorStop(0.62, '#d8cba6'); // dust band near the horizon
  grad.addColorStop(0.8, '#e8c48c');
  grad.addColorStop(1.0, '#c99a63'); // ground haze
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 8, 256);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ---------------------------------------------------------------------------
// Scenery
// ---------------------------------------------------------------------------

function createSky() {
  const geo = new THREE.SphereGeometry(400, 32, 16);
  const mat = new THREE.MeshBasicMaterial({
    map: makeSkyTexture(),
    side: THREE.BackSide,
    fog: false, // the sky must not be washed out by the haze that fogs the land
  });
  return new THREE.Mesh(geo, mat);
}

function createGround() {
  const geo = new THREE.PlaneGeometry(600, 600);
  const mat = new THREE.MeshStandardMaterial({
    map: makeGroundTexture(),
    roughness: 1,
  });
  const ground = new THREE.Mesh(geo, mat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  return ground;
}

// The painted lines: goal line, penalty box, six-yard box, spot and the D.
function createMarkings() {
  const group = new THREE.Group();
  const lineMat = new THREE.MeshBasicMaterial({
    color: 0xf2ece0,
    transparent: true,
    opacity: 0.75,
  });
  const W = 0.12; // line thickness
  const y = 0.012; // just above the grass, to avoid z-fighting

  function stripe(width, depth, x, z) {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), lineMat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, y, z);
    group.add(mesh);
  }

  const { goalWidth, boxDepth, boxWidth, sixYardDepth, sixYardWidth, penaltySpot } =
    PITCH;

  // Goal line.
  stripe(boxWidth + 6, W, 0, 0);
  // Penalty box: two sides plus the far edge.
  stripe(W, boxDepth, -boxWidth / 2, boxDepth / 2);
  stripe(W, boxDepth, boxWidth / 2, boxDepth / 2);
  stripe(boxWidth, W, 0, boxDepth);
  // Six-yard box.
  stripe(W, sixYardDepth, -sixYardWidth / 2, sixYardDepth / 2);
  stripe(W, sixYardDepth, sixYardWidth / 2, sixYardDepth / 2);
  stripe(sixYardWidth, W, 0, sixYardDepth);

  // Penalty spot.
  const spot = new THREE.Mesh(new THREE.CircleGeometry(0.14, 20), lineMat);
  spot.rotation.x = -Math.PI / 2;
  spot.position.set(0, y, penaltySpot);
  group.add(spot);

  // The D — a real arc, drawn from points so it curves properly.
  const arcPoints = [];
  const radius = 9.15;
  for (let i = 0; i <= 40; i++) {
    const t = -0.62 + (i / 40) * 1.24;
    arcPoints.push(
      new THREE.Vector3(Math.sin(t) * radius, 0, penaltySpot + Math.cos(t) * radius)
    );
  }
  const arcCurve = new THREE.CatmullRomCurve3(arcPoints);
  const arc = new THREE.Mesh(
    new THREE.TubeGeometry(arcCurve, 40, W / 2, 6, false),
    lineMat
  );
  arc.position.y = y;
  group.add(arc);

  group.traverse((o) => {
    if (o.isMesh) o.receiveShadow = false;
  });
  return group;
}

// One thatched round hut, the shape you see across most of rural Nigeria.
function createHut(mudTex, thatchTex) {
  const hut = new THREE.Group();

  const wallH = 2.2;
  const wall = new THREE.Mesh(
    new THREE.CylinderGeometry(2.1, 2.3, wallH, 14, 1),
    new THREE.MeshStandardMaterial({ map: mudTex, roughness: 1 })
  );
  wall.position.y = wallH / 2;
  wall.castShadow = true;
  wall.receiveShadow = true;
  hut.add(wall);

  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(2.9, 2.0, 14),
    new THREE.MeshStandardMaterial({ map: thatchTex, roughness: 1 })
  );
  roof.position.y = wallH + 1.0;
  roof.castShadow = true;
  hut.add(roof);

  // Doorway — a dark rectangle, enough to read as a door at distance.
  const door = new THREE.Mesh(
    new THREE.PlaneGeometry(0.9, 1.5),
    new THREE.MeshBasicMaterial({ color: 0x2a1c12 })
  );
  door.position.set(0, 0.75, 2.28);
  hut.add(door);

  return hut;
}

// A palm: bare curved trunk with fronds fanned at the top.
function createPalm() {
  const palm = new THREE.Group();
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x7a6242, roughness: 1 });

  // Trunk built from stacked segments so it can lean.
  const segments = 8;
  let prev = new THREE.Vector3(0, 0, 0);
  for (let i = 0; i < segments; i++) {
    const t = i / segments;
    const next = new THREE.Vector3(
      Math.sin(t * 1.1) * 0.9,
      (i + 1) * 1.05,
      Math.cos(t * 0.7) * 0.35
    );
    const dir = next.clone().sub(prev);
    const len = dir.length();
    const seg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.19 - t * 0.06, 0.24 - t * 0.06, len, 7),
      trunkMat
    );
    seg.position.copy(prev).add(dir.clone().multiplyScalar(0.5));
    seg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    seg.castShadow = true;
    palm.add(seg);
    prev = next;
  }

  const frondMat = new THREE.MeshStandardMaterial({
    color: 0x4f7a2e,
    roughness: 1,
    side: THREE.DoubleSide,
  });
  const count = 9;
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const frond = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.55, 6, 1), frondMat);

    // Curve the frond by pushing its vertices down and outward — a flat plane
    // reads as a paddle, a curved one reads as a leaf.
    const pos = frond.geometry.attributes.position;
    for (let v = 0; v < pos.count; v++) {
      const x = pos.getX(v);
      const norm = (x + 1.6) / 3.2;
      pos.setZ(v, -Math.sin(norm * Math.PI) * 0.9);
      pos.setY(v, pos.getY(v) - norm * norm * 0.7);
    }
    pos.needsUpdate = true;
    frond.geometry.computeVertexNormals();

    frond.position.copy(prev);
    frond.rotation.set(-0.35, a, 0);
    palm.add(frond);
  }

  return palm;
}

// A broad flat-topped tree — acacia-ish. Silhouetted against the sky it does a
// lot of work for very little geometry.
function createBroadTree() {
  const tree = new THREE.Group();
  const barkMat = new THREE.MeshStandardMaterial({ color: 0x5f4a33, roughness: 1 });

  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.55, 3.4, 8), barkMat);
  trunk.position.y = 1.7;
  trunk.castShadow = true;
  tree.add(trunk);

  const canopyMat = new THREE.MeshStandardMaterial({
    color: 0x5c7a35,
    roughness: 1,
    flatShading: true,
  });
  // Three squashed spheres read as an irregular canopy.
  const blobs = [
    [0, 4.3, 0, 2.6, 1.15, 2.6],
    [-1.5, 3.9, 0.6, 1.7, 0.85, 1.7],
    [1.4, 4.0, -0.5, 1.6, 0.8, 1.6],
  ];
  for (const [x, y, z, sx, sy, sz] of blobs) {
    const blob = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), canopyMat);
    blob.position.set(x, y, z);
    blob.scale.set(sx, sy, sz);
    blob.castShadow = true;
    tree.add(blob);
  }
  return tree;
}

// Distant hills. Unlit and pale so they sit back in the haze rather than
// competing with the pitch.
function createHills() {
  const group = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color: 0xbca887 });
  for (let i = 0; i < 14; i++) {
    const r = 40 + Math.random() * 70;
    const h = 20 + Math.random() * 45;
    const hill = new THREE.Mesh(new THREE.ConeGeometry(r, h, 7), mat);
    hill.position.set(
      (Math.random() - 0.5) * 600,
      h / 2 - 8,
      -160 - Math.random() * 160
    );
    hill.rotation.y = Math.random() * Math.PI;
    group.add(hill);
  }
  return group;
}

// A rough wooden fence along one side — a village pitch always has something
// makeshift at the edge.
function createFence(length = 60, posts = 26) {
  const fence = new THREE.Group();
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x8a6a45, roughness: 1 });
  const step = length / posts;
  for (let i = 0; i <= posts; i++) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.5, 0.14), woodMat);
    post.position.set(-length / 2 + i * step, 0.75, 0);
    post.castShadow = true;
    fence.add(post);
  }
  for (const y of [0.55, 1.15]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(length, 0.1, 0.08), woodMat);
    rail.position.set(0, y, 0);
    fence.add(rail);
  }
  return fence;
}

// Dust drifting in the air. A single Points cloud, animated in the update loop.
function createDust() {
  const count = 420;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 120;
    positions[i * 3 + 1] = Math.random() * 14;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 120;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const { canvas, ctx } = makeCanvas(32);
  const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
  grad.addColorStop(0, 'rgba(255,235,200,0.9)');
  grad.addColorStop(1, 'rgba(255,235,200,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 32, 32);

  const mat = new THREE.PointsMaterial({
    size: 0.5,
    map: new THREE.CanvasTexture(canvas),
    transparent: true,
    depthWrite: false,
    opacity: 0.5,
    blending: THREE.AdditiveBlending,
  });

  const points = new THREE.Points(geo, mat);
  points.userData.drift = true;
  return points;
}

// ---------------------------------------------------------------------------
// The crowd
// ---------------------------------------------------------------------------

// Spectators are two InstancedMeshes — one for bodies, one for heads — rather
// than a few hundred individual Meshes. Two hundred people as separate objects
// would be four hundred draw calls per frame, which is the difference between a
// smooth game and a slideshow on a mid-range phone.
//
// They bob on individual phases so the crowd ripples instead of pulsing in
// unison, which is the thing that makes a crowd look fake.
export function createCrowd() {
  const group = new THREE.Group();

  // Where people stand: a bank behind the goal, and lines down both touchlines.
  const spots = [];
  const jitter = (n) => (Math.random() - 0.5) * n;

  // Behind the goal — four rows, thinning out with distance.
  for (let row = 0; row < 4; row++) {
    const z = -13 - row * 2.4;
    const spread = 26 + row * 3;
    const count = 30 - row * 3;
    for (let i = 0; i < count; i++) {
      const x = -spread + (i / (count - 1)) * spread * 2 + jitter(1.4);
      spots.push({ x, z: z + jitter(0.9), row });
    }
  }

  // Down both sides.
  for (const side of [-1, 1]) {
    for (let row = 0; row < 3; row++) {
      const x = side * (24 + row * 2.2);
      for (let i = 0; i < 16; i++) {
        const z = -8 + i * 2.3 + jitter(1);
        spots.push({ x: x + jitter(0.9), z, row });
      }
    }
  }

  const count = spots.length;

  const bodyGeo = new THREE.CylinderGeometry(0.16, 0.22, 0.85, 6);
  const headGeo = new THREE.SphereGeometry(0.13, 6, 5);

  const bodyMat = new THREE.MeshLambertMaterial();
  const headMat = new THREE.MeshLambertMaterial();

  const bodies = new THREE.InstancedMesh(bodyGeo, bodyMat, count);
  const heads = new THREE.InstancedMesh(headGeo, headMat, count);
  bodies.castShadow = false; // hundreds of shadow casters would kill the frame rate
  heads.castShadow = false;
  bodies.frustumCulled = false;
  heads.frustumCulled = false;

  // Bright, varied clothing — a match crowd, not a uniform.
  const shirtColours = [
    '#008751', '#f4f4f2', '#ffd166', '#e2571e', '#2b3a8f',
    '#0f7b8a', '#5b2a5e', '#a03a1e', '#d9a441', '#1f6b3a',
  ];
  const skinColours = ['#4A2C1A', '#6B3F22', '#8D5524', '#A9714B', '#C68642', '#E0AC69'];

  // Raised arms, on some of the crowd only. A third instanced mesh rather than
  // per-person geometry, and scaling unused instances to zero is cheaper than
  // tracking a separate draw call.
  const armGeo = new THREE.CylinderGeometry(0.045, 0.038, 0.5, 5);
  const armMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const arms = new THREE.InstancedMesh(armGeo, armMat, count * 2);
  arms.frustumCulled = false;

  const dummy = new THREE.Object3D();
  const color = new THREE.Color();

  const people = spots.map((spot, i) => {
    const build = 0.86 + Math.random() * 0.3;
    return {
      ...spot,
      i,
      // Height and width vary independently, so the crowd isn't a row of
      // identically-scaled clones — that uniformity is what reads as fake.
      scaleY: build,
      scaleXZ: build * (0.82 + Math.random() * 0.42),
      phase: Math.random() * Math.PI * 2,
      bounce: 0.45 + Math.random() * 1.1,
      armsUp: Math.random() > 0.62,
      sway: (Math.random() - 0.5) * 0.3,
      baseY: 0.42 * build,
    };
  });

  for (const p of people) {
    bodies.setColorAt(p.i, color.set(shirtColours[Math.floor(Math.random() * shirtColours.length)]));
    heads.setColorAt(p.i, color.set(skinColours[Math.floor(Math.random() * skinColours.length)]));
    // Arms pick up the shirt colour so they read as sleeves, not sticks.
    const sleeve = shirtsForArms(p.i);
    arms.setColorAt(p.i * 2, color.set(sleeve));
    arms.setColorAt(p.i * 2 + 1, color.set(sleeve));
  }

  function shirtsForArms(i) {
    // Same colour as this person's body, read back off the instance, so a
    // spectator's arms always match their shirt.
    const c = new THREE.Color();
    bodies.getColorAt(i, c);
    return c;
  }

  bodies.instanceColor.needsUpdate = true;
  heads.instanceColor.needsUpdate = true;
  arms.instanceColor.needsUpdate = true;

  group.add(bodies, heads, arms);

  const heading = (p) => Math.atan2(-p.x, 20) + p.sway;

  // Write the resting pose immediately, so the crowd is correct on frame one
  // rather than snapping into place.
  function writePose(t) {
    for (const p of people) {
      // People in the front row jump higher — they're the ones who can see.
      const energy = p.row === 0 ? 1 : 0.45;
      const bob =
        Math.sin(t * 1.9 + p.phase) * 0.055 * p.bounce * energy +
        (p.armsUp ? Math.abs(Math.sin(t * 3.1 + p.phase)) * 0.05 * energy : 0);
      const y = p.baseY + bob;

      dummy.rotation.set(0, heading(p), 0);
      dummy.scale.set(p.scaleXZ, p.scaleY, p.scaleXZ);

      dummy.position.set(p.x, y, p.z);
      dummy.updateMatrix();
      bodies.setMatrixAt(p.i, dummy.matrix);

      dummy.position.set(p.x, y + 0.55 * p.scaleY, p.z);
      dummy.updateMatrix();
      heads.setMatrixAt(p.i, dummy.matrix);

      // Two arms per person, angled up and outward when raised.
      for (const side of [0, 1]) {
        const idx = p.i * 2 + side;
        if (!p.armsUp) {
          dummy.scale.set(0, 0, 0);
          dummy.position.set(0, -100, 0); // out of shot
          dummy.updateMatrix();
          arms.setMatrixAt(idx, dummy.matrix);
          continue;
        }
        const dir = side === 0 ? -1 : 1;
        const swing = Math.sin(t * 4.2 + p.phase + side) * 0.16;
        dummy.scale.set(1, 1, 1);
        dummy.position.set(p.x + dir * 0.17 * p.scaleXZ, y + 0.62 * p.scaleY, p.z);
        dummy.rotation.set(0, heading(p), dir * (0.32 + swing));
        dummy.updateMatrix();
        arms.setMatrixAt(idx, dummy.matrix);
      }
    }
    bodies.instanceMatrix.needsUpdate = true;
    heads.instanceMatrix.needsUpdate = true;
    arms.instanceMatrix.needsUpdate = true;
  }

  writePose(0);

  return {
    group,
    count,
    update(t) {
      writePose(t);
    },
  };
}

// ---------------------------------------------------------------------------
// Assembly
// ---------------------------------------------------------------------------

export function createWorld(scene) {
  scene.fog = new THREE.Fog(0xd6c19a, 60, 330);

  scene.add(createSky());

  const hemi = new THREE.HemisphereLight(0xffe6bd, 0x8a6a45, 0.85);
  scene.add(hemi);

  // Low, warm sun. Late afternoon — long shadows, which is what makes a flat
  // scene read as three-dimensional.
  const sun = new THREE.DirectionalLight(0xffd9a0, 2.0);
  sun.position.set(-26, 22, 24);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 120;
  sun.shadow.camera.left = -40;
  sun.shadow.camera.right = 40;
  sun.shadow.camera.top = 40;
  sun.shadow.camera.bottom = -40;
  sun.shadow.bias = -0.0006;
  scene.add(sun);
  scene.add(sun.target);

  scene.add(createGround());
  scene.add(createMarkings());

  const mudTex = makeMudTexture();
  const thatchTex = makeThatchTexture();

  // The village behind the goal. Placed off-centre so the composition isn't
  // symmetrical — a straight row of huts looks like a fence, not a place.
  const village = new THREE.Group();
  const hutSpots = [
    [-34, -30, 1.15],
    [-24, -38, 0.9],
    [-40, -44, 1.3],
    [26, -34, 1.0],
    [38, -42, 1.25],
    [14, -46, 0.85],
    [48, -30, 0.95],
  ];
  for (const [x, z, s] of hutSpots) {
    const hut = createHut(mudTex, thatchTex);
    hut.position.set(x, 0, z);
    hut.scale.setScalar(s);
    hut.rotation.y = Math.random() * Math.PI * 2;
    village.add(hut);
  }
  scene.add(village);

  // Trees — palms close in for scale, broad trees further back for depth.
  const grove = new THREE.Group();
  const palmSpots = [
    [-18, -20],
    [-46, -22],
    [34, -24],
    [52, -18],
    [-56, -36],
  ];
  for (const [x, z] of palmSpots) {
    const palm = createPalm();
    palm.position.set(x, 0, z);
    palm.rotation.y = Math.random() * Math.PI;
    palm.scale.setScalar(0.9 + Math.random() * 0.5);
    grove.add(palm);
  }
  for (const [x, z] of [
    [-30, -58],
    [20, -62],
    [58, -50],
    [-62, -48],
  ]) {
    const tree = createBroadTree();
    tree.position.set(x, 0, z);
    tree.scale.setScalar(1.3 + Math.random() * 0.7);
    grove.add(tree);
  }
  scene.add(grove);

  scene.add(createHills());

  const fence = createFence(70, 30);
  fence.position.set(-44, 0, 14);
  fence.rotation.y = Math.PI / 2.2;
  scene.add(fence);

  const fence2 = createFence(70, 30);
  fence2.position.set(44, 0, 14);
  fence2.rotation.y = -Math.PI / 2.2;
  scene.add(fence2);

  const dust = createDust();
  scene.add(dust);

  const crowd = createCrowd();
  scene.add(crowd.group);

  return {
    sun,
    dust,
    crowd,
    // Called every frame from the render loop.
    update(t, dt) {
      crowd.update(t);

      // Dust drifts slowly sideways and loops back, so the air always looks
      // alive without the cost of spawning and destroying particles.
      if (!dust.userData.drift) return;
      const pos = dust.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        let x = pos.getX(i) + dt * 0.6;
        let y = pos.getY(i) + Math.sin(t * 0.4 + i) * dt * 0.12;
        if (x > 60) x = -60;
        if (y > 14) y = 0;
        pos.setX(i, x);
        pos.setY(i, y);
      }
      pos.needsUpdate = true;
    },
  };
}
