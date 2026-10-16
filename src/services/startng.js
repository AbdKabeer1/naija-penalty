// Talking to start.ng.
//
// start.ng is the backend: it handles sign-in, the leaderboard and hosting.
// The game never sees a password, an email or the player's real sign-in.
//
// Two ways to talk to it. This file uses the **connect page**: a hidden iframe
// at start.ng/connect that we postMessage to. It only answers games served from
// a *.start.ng address, which publishing gives us.
//
// The HTTP API is the alternative, but it needs a game session that has to be
// picked out of the address and stored, and the only thing it adds over this is
// the player's id — which the connect page also gives us. One mechanism, less
// to go wrong.

const START_NG = 'https://start.ng';
const TIMEOUT_MS = 5000;

let framePromise;

function connectFrame() {
  framePromise ??= new Promise((resolve, reject) => {
    const el = document.createElement('iframe');
    el.src = `${START_NG}/connect`;
    el.hidden = true;
    el.onload = () => resolve(el);
    el.onerror = reject;
    document.body.append(el);
  });
  return framePromise;
}

// Sends a message and resolves to start.ng's reply, or null if it didn't answer.
//
// The origin check is the whole security model here: without it, any page that
// can get a message in edgewise could impersonate start.ng and hand us a fake
// player.
export async function askStartNg(message, replyType, timeoutMs = TIMEOUT_MS) {
  let el;
  try {
    el = await connectFrame();
  } catch {
    return null;
  }

  return new Promise((resolve) => {
    const requestId = Math.random().toString(36).slice(2);

    const done = (reply) => {
      clearTimeout(timer);
      removeEventListener('message', onMessage);
      resolve(reply);
    };

    const timer = setTimeout(() => done(null), timeoutMs);

    function onMessage(e) {
      if (e.origin !== START_NG || e.source !== el.contentWindow) return;
      if (e.data?.type === replyType && e.data.requestId === requestId) done(e.data);
    }

    addEventListener('message', onMessage);
    el.contentWindow.postMessage({ ...message, requestId }, START_NG);
  });
}

// Who is playing. Returns { user, guest, player } where `player` is whichever
// of the two applies, already resolved — the caller almost never cares which.
export async function whoami() {
  const reply = await askStartNg({ type: 'startng:whoami' }, 'startng:user');
  if (!reply) return { user: null, guest: null, player: null, offline: true };
  return {
    user: reply.user ?? null,
    guest: reply.guest ?? null,
    player: reply.user ?? reply.guest ?? null,
    offline: false,
  };
}

// The game plays at <name>.start.ng, so the subdomain is the game name.
export function gameName() {
  const host = location.hostname;
  if (!host.endsWith('.start.ng')) return null;
  return host.split('.')[0];
}

export function signInUrl() {
  return `${START_NG}/?return_to=${encodeURIComponent(location.origin + location.pathname)}`;
}

export function goToSignIn() {
  location.href = signInUrl();
}

// Save a run. Signed-in players only — guests get { ok: false, error }.
export async function saveScore(stats) {
  const reply = await askStartNg(
    { type: 'startng:score', stats },
    'startng:scoreSaved'
  );
  if (!reply) return { ok: false, error: 'start.ng did not answer' };
  return reply;
}

// The board is readable by everyone, guests included.
export async function readLeaderboard(limit = 10) {
  const reply = await askStartNg(
    { type: 'startng:leaderboard', limit },
    'startng:leaderboardData'
  );
  if (!reply || !reply.ok) return { ok: false, entries: [] };
  return { ok: true, entries: reply.entries || [] };
}

// ---------------------------------------------------------------------------
// The character
// ---------------------------------------------------------------------------

// start.ng's defaults, used for guests and when the game is opened outside
// start.ng (a local file, or a plain GitHub Pages preview). The docs are
// explicit that the game must still play with no player.
export const DEFAULT_STYLE = {
  body: 'male',
  primaryColor: '#008751',
  secondaryColor: '#ffffff',
  skinColor: '#8D5524',
  hairColor: '#17120f',
  hair: 'short',
  hat: 'none',
  accessory: 'none',
};

export const DEFAULT_PLAYER = {
  name: 'Guest',
  account: null,
  style: DEFAULT_STYLE,
  face: null,
};

// Who you're playing against.
//
// There's no roster: the opposition is one fixed character, dressed through the
// same code path as the player's so it inherits hats, hair and accessories
// without needing art of its own. Red and black, because it has to be obviously
// not you whatever colours the player picked.
export const OPPOSITION_STYLE = {
  body: 'male',
  primaryColor: '#c8102e',
  secondaryColor: '#1a1a1a',
  skinColor: '#6B3F22',
  hairColor: '#17120f',
  hair: 'afro',
  hat: 'none',
  accessory: 'none',
};

// start.ng may add options later, so anything unrecognised falls back rather
// than drawing nothing.
const HAIR_VALUES = ['short', 'afro', 'braids', 'bun', 'ponytail', 'dreads', 'bald'];
const HAT_VALUES = ['none', 'cap', 'beanie', 'tophat', 'crown'];
const ACCESSORY_VALUES = ['none', 'glasses', 'earrings', 'beard', 'scarf', 'backpack'];

// A style object that is safe to draw with, whatever start.ng sends.
export function safeStyle(style) {
  const s = style || {};
  const colour = (v, fallback) =>
    typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v) ? v : fallback;

  return {
    body: s.body === 'female' ? 'female' : 'male',
    primaryColor: colour(s.primaryColor, DEFAULT_STYLE.primaryColor),
    secondaryColor: colour(s.secondaryColor, DEFAULT_STYLE.secondaryColor),
    skinColor: colour(s.skinColor, DEFAULT_STYLE.skinColor),
    hairColor: colour(s.hairColor, DEFAULT_STYLE.hairColor),
    hair: HAIR_VALUES.includes(s.hair) ? s.hair : DEFAULT_STYLE.hair,
    hat: HAT_VALUES.includes(s.hat) ? s.hat : DEFAULT_STYLE.hat,
    accessory: ACCESSORY_VALUES.includes(s.accessory)
      ? s.accessory
      : DEFAULT_STYLE.accessory,
  };
}
