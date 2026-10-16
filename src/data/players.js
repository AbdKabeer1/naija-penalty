// The squad.
//
// Names are common, real Nigerian names from across the country, and each
// player is tagged with an age and a state of origin. Nothing here sorts
// players by ethnicity — the picker shows who they are and where they're from,
// which is what a team sheet actually says.
//
// Adding a player is one object in this array. The picker and the 3D figure
// both read from it, so there is nothing else to update.

// A realistic spread of Nigerian skin tones, deepest to lightest. Spread across
// the roster rather than correlated with anything.
export const SKIN_TONES = [
  { id: 'deep', hex: '#4A2C1A' },
  { id: 'rich', hex: '#6B3F22' },
  { id: 'warm', hex: '#8D5524' },
  { id: 'amber', hex: '#A9714B' },
  { id: 'honey', hex: '#C68642' },
  { id: 'light', hex: '#E0AC69' },
];

// Kit colours. Greens and whites for the home side, plus a spread of bright
// colours so the picker feels like choosing a real jersey.
export const KITS = [
  { id: 'naija', name: 'Naija Green', shirt: '#008751', trim: '#ffffff' },
  { id: 'white', name: 'Away White', shirt: '#f4f4f2', trim: '#008751' },
  { id: 'sunset', name: 'Sunset', shirt: '#e2571e', trim: '#ffd166' },
  { id: 'indigo', name: 'Indigo', shirt: '#2b3a8f', trim: '#f4f4f2' },
  { id: 'gold', name: 'Gold', shirt: '#d9a441', trim: '#3a2a10' },
  { id: 'laterite', name: 'Laterite', shirt: '#a03a1e', trim: '#f4f4f2' },
  { id: 'lagoon', name: 'Lagoon', shirt: '#0f7b8a', trim: '#f4f4f2' },
  { id: 'plum', name: 'Plum', shirt: '#5b2a5e', trim: '#ffd166' },
];

export const PLAYERS = [
  { name: 'Adebayo Adeyemi', age: 24, state: 'Oyo', skin: 'warm', kit: 'naija', number: 9 },
  { name: 'Oluwaseun Balogun', age: 27, state: 'Lagos', skin: 'rich', kit: 'white', number: 7 },
  { name: 'Temitope Adigun', age: 22, state: 'Osun', skin: 'honey', kit: 'sunset', number: 10 },
  { name: 'Ayomide Ogunleye', age: 29, state: 'Ogun', skin: 'deep', kit: 'gold', number: 4 },
  { name: 'Bukola Ajayi', age: 25, state: 'Ondo', skin: 'amber', kit: 'lagoon', number: 14 },
  { name: 'Damilola Fashola', age: 21, state: 'Ekiti', skin: 'light', kit: 'indigo', number: 21 },

  { name: 'Chukwuemeka Nwosu', age: 26, state: 'Anambra', skin: 'deep', kit: 'naija', number: 11 },
  { name: 'Obinna Eze', age: 23, state: 'Enugu', skin: 'warm', kit: 'indigo', number: 8 },
  { name: 'Chinedu Okeke', age: 30, state: 'Imo', skin: 'rich', kit: 'white', number: 6 },
  { name: 'Ifeanyi Nwachukwu', age: 20, state: 'Abia', skin: 'amber', kit: 'plum', number: 3 },
  { name: 'Ngozi Umeh', age: 24, state: 'Ebonyi', skin: 'honey', kit: 'sunset', number: 18 },

  { name: 'Abubakar Sani', age: 28, state: 'Kano', skin: 'amber', kit: 'naija', number: 1 },
  { name: 'Musa Danjuma', age: 25, state: 'Katsina', skin: 'deep', kit: 'gold', number: 5 },
  { name: 'Yusuf Aliyu', age: 22, state: 'Sokoto', skin: 'rich', kit: 'lagoon', number: 2 },
  { name: 'Ibrahim Bello', age: 31, state: 'Kaduna', skin: 'honey', kit: 'white', number: 12 },
  { name: 'Hadiza Bala', age: 19, state: 'Jigawa', skin: 'light', kit: 'plum', number: 23 },

  { name: 'Modibo Bah', age: 26, state: 'Adamawa', skin: 'light', kit: 'sunset', number: 14 },
  { name: 'Adama Gidado', age: 23, state: 'Taraba', skin: 'warm', kit: 'naija', number: 15 },
  { name: 'Yero Sambo', age: 27, state: 'Sokoto', skin: 'deep', kit: 'laterite', number: 16 },

  { name: 'Tamuno Briggs', age: 24, state: 'Bayelsa', skin: 'deep', kit: 'lagoon', number: 13 },
  { name: 'Ebiere Doubra', age: 21, state: 'Rivers', skin: 'rich', kit: 'indigo', number: 17 },
  { name: 'Preye Ebikeme', age: 29, state: 'Delta', skin: 'warm', kit: 'gold', number: 18 },

  { name: 'Bukar Modu', age: 25, state: 'Borno', skin: 'rich', kit: 'white', number: 19 },
  { name: 'Grema Kaltume', age: 22, state: 'Yobe', skin: 'amber', kit: 'naija', number: 20 },

  { name: 'Terhemba Aondofa', age: 28, state: 'Benue', skin: 'deep', kit: 'laterite', number: 21 },
  { name: 'Dooshima Mlumun', age: 20, state: 'Benue', skin: 'honey', kit: 'plum', number: 22 },
  { name: 'Terseer Kwaghdoo', age: 26, state: 'Benue', skin: 'warm', kit: 'white', number: 23 },

  { name: 'Ekaette Etim', age: 24, state: 'Akwa Ibom', skin: 'rich', kit: 'sunset', number: 24 },
  { name: 'Aniekan Ubong', age: 30, state: 'Akwa Ibom', skin: 'deep', kit: 'naija', number: 25 },
  { name: 'Idara Essien', age: 22, state: 'Cross River', skin: 'amber', kit: 'indigo', number: 26 },

  { name: 'Osaro Eghosa', age: 27, state: 'Edo', skin: 'deep', kit: 'gold', number: 27 },
  { name: 'Ivie Omoregie', age: 23, state: 'Edo', skin: 'honey', kit: 'lagoon', number: 28 },
  { name: 'Efosa Osagie', age: 25, state: 'Edo', skin: 'warm', kit: 'white', number: 29 },

  { name: 'Ndagi Baba', age: 29, state: 'Niger', skin: 'rich', kit: 'naija', number: 30 },
  { name: 'Saba Gimba', age: 21, state: 'Niger', skin: 'amber', kit: 'laterite', number: 31 },

  { name: 'Oghenekaro Efe', age: 26, state: 'Delta', skin: 'deep', kit: 'plum', number: 32 },
  { name: 'Onome Tega', age: 24, state: 'Delta', skin: 'honey', kit: 'white', number: 33 },

  { name: 'Idakwo Ocholi', age: 32, state: 'Kogi', skin: 'warm', kit: 'sunset', number: 34 },
  { name: 'Ene Attah', age: 22, state: 'Kogi', skin: 'rich', kit: 'naija', number: 35 },

  { name: 'Gyang Pam', age: 27, state: 'Plateau', skin: 'deep', kit: 'indigo', number: 36 },
  { name: 'Chuwang Dalyop', age: 20, state: 'Plateau', skin: 'light', kit: 'gold', number: 37 },

  { name: 'Ayirode Omatseye', age: 25, state: 'Delta', skin: 'amber', kit: 'lagoon', number: 38 },
  { name: 'Erivwo Temile', age: 28, state: 'Delta', skin: 'deep', kit: 'laterite', number: 39 },
];

// Clubs, mapped to the player's home state so a Kano lad plays for Kano
// Pillars and an Enugu one for Rangers — which is how Nigerian football
// actually works, and makes the profiles read as real rather than random.
const CLUB_BY_STATE = {
  Oyo: 'Shooting Stars',
  Lagos: 'Sporting Lagos',
  Osun: 'Osun United',
  Ogun: 'Remo Stars',
  Ondo: 'Sunshine Stars',
  Ekiti: 'Ekiti United',
  Anambra: 'Rangers International',
  Enugu: 'Enugu Rangers',
  Imo: 'Heartland',
  Abia: 'Abia Warriors',
  Ebonyi: 'Abia Warriors',
  Kano: 'Kano Pillars',
  Katsina: 'Katsina United',
  Sokoto: 'Sokoto United',
  Kaduna: 'Niger Tornadoes',
  Jigawa: 'Kano Pillars',
  Adamawa: 'Adamawa United',
  Taraba: 'Taraba FC',
  Bayelsa: 'Bayelsa United',
  Rivers: 'Rivers United',
  Delta: 'Bendel Insurance',
  Borno: 'El-Kanemi Warriors',
  Yobe: 'Yobe Desert Stars',
  Benue: 'Lobi Stars',
  'Akwa Ibom': 'Akwa United',
  'Cross River': 'Calabar Rovers',
  Edo: 'Bendel Insurance',
  Niger: 'Niger Tornadoes',
  Kogi: 'Kogi United',
  Plateau: 'Plateau United',
};

// A tiny deterministic hash, so a player's stats are always the same number
// every time the game loads. Random stats would mean the profile you read on
// the picker isn't the player you get.
function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

// Spread across a believable range without ever producing a 99-rated wonderkid
// or an unusable 30.
function statFrom(seed, offset, min = 52, max = 94) {
  const n = hash(String(seed) + ':' + offset) % 1000;
  return min + Math.round((n / 999) * (max - min));
}

// Resolve the tone and kit ids into actual values once, so the rest of the game
// never has to look them up again.
export function buildSquad() {
  return PLAYERS.map((p, index) => ({
    ...p,
    id: `p${index}`,
    firstName: p.name.split(' ')[0],
    lastName: p.name.split(' ').slice(1).join(' '),
    skinHex: (SKIN_TONES.find((s) => s.id === p.skin) || SKIN_TONES[2]).hex,
    kitColors: KITS.find((k) => k.id === p.kit) || KITS[0],
    club: CLUB_BY_STATE[p.state] || 'Free agent',
    stats: {
      pace: statFrom(p.name, 'pace'),
      power: statFrom(p.name, 'power'),
      accuracy: statFrom(p.name, 'accuracy', 58, 96),
    },
    // The face is generated from the name, so it's stable across reloads and
    // two players never share a face.
    faceSeed: hash(p.name) % 100000,
  }));
}
