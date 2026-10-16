// Player portraits, drawn on a canvas at runtime.
//
// These are stylised illustrations, not photographs. Two reasons, and the
// second is the important one:
//
//   1. The whole game ships as JS with no binary assets — see AGENTS.md.
//   2. Using a real person's face would need their permission. A generated
//      portrait is nobody's likeness.
//
// Every player gets a stable, unique face: the seed comes from their name, so
// the same player always looks the same and no two players match.

function rng(seed) {
  // mulberry32 — small, fast, and stable across runs, which matters because
  // Math.random would give a different face on every reload.
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick(rand, arr) {
  return arr[Math.floor(rand() * arr.length)];
}

// Darken or lighten a hex colour by a ratio.
function shade(hex, amount) {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.replace(/./g, (c) => c + c) : h;
  const num = parseInt(full, 16);
  const target = amount < 0 ? 0 : 255;
  const p = Math.abs(amount);
  const r = Math.round(((num >> 16) & 255) * (1 - p) + target * p);
  const g = Math.round(((num >> 8) & 255) * (1 - p) + target * p);
  const b = Math.round((num & 255) * (1 - p) + target * p);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

const HAIR_STYLES = ['fade', 'afro', 'short-curls', 'braids', 'bald', 'wrap', 'low-cut'];
const HAIR_COLOURS = ['#141010', '#1c1410', '#241a12', '#100c0a'];

// ctx.roundRect only landed in Safari 16 / Chrome 99, and this game is aimed at
// whatever phone people actually have. Draw the path by hand when it's missing.
function roundRect(ctx, x, y, w, h, r) {
  if (typeof ctx.roundRect === 'function') {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    return;
  }
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

const cache = new Map();

// A portrait for a start.ng character.
//
// Only used when start.ng hasn't given us a picture — which happens when the
// game is opened outside start.ng (a local file, a plain preview). Live, the
// platform sends a real `face` data URL and this never runs.
//
// The colours and skin come from the character; the hairstyle doesn't, because
// the generator picks one at random from its own set. That's a deliberate
// limitation of the fallback rather than an oversight — the real face is used
// whenever there is one.
export function styleFace(style, size = 256) {
  let seed = 0;
  const key = `${style.skinColor}${style.hair}${style.hat}${style.accessory}`;
  for (let i = 0; i < key.length; i++) seed = (seed * 31 + key.charCodeAt(i)) | 0;

  return makeFaceDataUrl(
    {
      id: `style-${Math.abs(seed)}`,
      faceSeed: Math.abs(seed) % 100000,
      skinHex: style.skinColor,
      kitColors: { shirt: style.primaryColor, trim: style.secondaryColor },
      number: 10,
    },
    size
  );
}

export function makeFaceDataUrl(player, size = 256) {
  const key = `${player.id}-${size}`;
  if (cache.has(key)) return cache.get(key);

  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const rand = rng(player.faceSeed || 1);

  const s = size / 256; // everything below is authored against a 256px canvas
  ctx.scale(s, s);

  const skin = player.skinHex || '#8D5524';
  const shirt = (player.kitColors && player.kitColors.shirt) || '#008751';
  const trim = (player.kitColors && player.kitColors.trim) || '#ffffff';

  const skinShadow = shade(skin, -0.22);
  const skinLight = shade(skin, 0.16);

  // ---- Background --------------------------------------------------------
  const bg = ctx.createRadialGradient(128, 96, 20, 128, 128, 150);
  bg.addColorStop(0, shade(shirt, 0.32));
  bg.addColorStop(1, shade(shirt, -0.34));
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 256, 256);

  // ---- Shoulders and shirt ----------------------------------------------
  ctx.fillStyle = shirt;
  ctx.beginPath();
  ctx.moveTo(18, 256);
  ctx.quadraticCurveTo(28, 196, 76, 182);
  ctx.lineTo(180, 182);
  ctx.quadraticCurveTo(228, 196, 238, 256);
  ctx.closePath();
  ctx.fill();

  // Collar in the trim colour.
  ctx.fillStyle = trim;
  ctx.beginPath();
  ctx.moveTo(100, 184);
  ctx.quadraticCurveTo(128, 214, 156, 184);
  ctx.quadraticCurveTo(128, 200, 100, 184);
  ctx.closePath();
  ctx.fill();

  // ---- Neck --------------------------------------------------------------
  ctx.fillStyle = skinShadow;
  roundRect(ctx, 108, 150, 40, 46, 14);
  ctx.fill();

  // ---- Head --------------------------------------------------------------
  const cx = 128;
  const cy = 112;
  const rx = 56 + rand() * 6;
  const ry = 66 + rand() * 6;

  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();

  // Jaw shading on one side, so the head isn't a flat disc.
  ctx.fillStyle = skinShadow;
  ctx.globalAlpha = 0.2;
  ctx.beginPath();
  ctx.ellipse(cx + rx * 0.34, cy + 6, rx * 0.6, ry * 0.86, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Forehead highlight.
  ctx.fillStyle = skinLight;
  ctx.globalAlpha = 0.3;
  ctx.beginPath();
  ctx.ellipse(cx - 8, cy - 32, rx * 0.5, ry * 0.28, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // ---- Ears --------------------------------------------------------------
  ctx.fillStyle = skin;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(cx + side * rx * 0.96, cy + 8, 9, 15, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // ---- Hair --------------------------------------------------------------
  const style = pick(rand, HAIR_STYLES);
  const hairColour = pick(rand, HAIR_COLOURS);
  ctx.fillStyle = hairColour;

  if (style === 'afro') {
    ctx.beginPath();
    ctx.ellipse(cx, cy - 16, rx * 1.24, ry * 0.94, 0, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx, cy - 12, rx * 1.16, ry * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
    // Put the face back over the lower half of the afro.
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.ellipse(cx, cy + 8, rx * 0.98, ry * 0.86, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (style === 'fade' || style === 'low-cut' || style === 'short-curls') {
    const lift = style === 'short-curls' ? 14 : 8;
    ctx.beginPath();
    ctx.ellipse(cx, cy - lift, rx * 1.03, ry * 0.92, 0, Math.PI * 1.02, Math.PI * 1.98);
    ctx.fill();
  } else if (style === 'braids') {
    ctx.beginPath();
    ctx.ellipse(cx, cy - 12, rx * 1.06, ry * 0.9, 0, Math.PI, Math.PI * 2);
    ctx.fill();
    for (let i = -2; i <= 2; i++) {
      roundRect(ctx, cx + i * 21 - 4, cy - 34, 8, 30, 4);
      ctx.fill();
    }
  } else if (style === 'wrap') {
    // A headwrap, in a colour derived from the shirt so it always coordinates.
    ctx.fillStyle = shade(trim, -0.1);
    ctx.beginPath();
    ctx.ellipse(cx, cy - 26, rx * 1.14, ry * 0.72, 0, Math.PI, Math.PI * 2);
    ctx.fill();
    roundRect(ctx, cx - rx * 1.14, cy - 30, rx * 2.28, 22, 8);
    ctx.fill();
  }
  // 'bald' draws nothing — the head is already the right shape.

  // ---- Facial hair -------------------------------------------------------
  const beardRoll = rand();
  if (beardRoll > 0.62) {
    ctx.fillStyle = hairColour;
    ctx.globalAlpha = 0.92;
    ctx.beginPath();
    // Chin strap: an arc following the bottom of the head, hollowed out in the
    // middle so it reads as a beard rather than a mask.
    ctx.ellipse(cx, cy + ry * 0.42, rx * 0.78, ry * 0.46, 0, 0, Math.PI);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.ellipse(cx, cy + ry * 0.4, rx * 0.52, ry * 0.34, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // ---- Eyes --------------------------------------------------------------
  const eyeY = cy - 4;
  const eyeGap = rx * 0.42;
  const eyeW = 13 + rand() * 3;
  const eyeH = 8 + rand() * 2;

  for (const side of [-1, 1]) {
    const ex = cx + side * eyeGap;

    ctx.fillStyle = '#f6f2ea';
    ctx.beginPath();
    ctx.ellipse(ex, eyeY, eyeW, eyeH, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#3a2416';
    ctx.beginPath();
    ctx.arc(ex, eyeY + 0.5, eyeH * 0.82, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#100a06';
    ctx.beginPath();
    ctx.arc(ex, eyeY + 0.5, eyeH * 0.42, 0, Math.PI * 2);
    ctx.fill();

    // Catchlight — the single detail that stops eyes looking dead.
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath();
    ctx.arc(ex + 3, eyeY - 2.5, 2.2, 0, Math.PI * 2);
    ctx.fill();

    // Brow.
    ctx.strokeStyle = hairColour;
    ctx.lineWidth = 4 + rand() * 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(ex - eyeW * 0.9, eyeY - 14);
    ctx.quadraticCurveTo(ex, eyeY - 19, ex + eyeW * 0.9, eyeY - 14);
    ctx.stroke();
  }

  // ---- Nose --------------------------------------------------------------
  ctx.strokeStyle = shade(skin, -0.34);
  ctx.lineWidth = 3.4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - 1, eyeY + 6);
  ctx.quadraticCurveTo(cx - 6, eyeY + 22, cx + 5, eyeY + 25);
  ctx.stroke();

  // ---- Mouth -------------------------------------------------------------
  const mouthY = cy + 44;
  ctx.strokeStyle = shade(skin, -0.42);
  ctx.lineWidth = 4;
  ctx.beginPath();
  if (rand() > 0.45) {
    // Smiling.
    ctx.moveTo(cx - 17, mouthY);
    ctx.quadraticCurveTo(cx, mouthY + 13, cx + 17, mouthY);
  } else {
    ctx.moveTo(cx - 15, mouthY + 3);
    ctx.quadraticCurveTo(cx, mouthY + 7, cx + 15, mouthY + 3);
  }
  ctx.stroke();

  const url = canvas.toDataURL('image/png');
  cache.set(key, url);
  return url;
}
