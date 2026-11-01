/* Dead Miles: Homestead - game content.
   Everything a designer would tweak lives here: crops, meals, cards, charms,
   enemies, regions, events, survivors, buildings. The engine is game.js. */

/* ---------- activity ----------
   Grit is how much you moved today. It never gates the farm, travel or the
   camp - those are always free. It makes things BETTER: more runs, bigger
   harvests, faster levels. A quiet day still gets a full game. */
const GRIT_PER_STEPS = 100;          // 100 steps = 1 grit
const GRIT_PER_MIN = { light: 1, moderate: 2, hard: 3 };   // per workout minute
const VIGOR = [
  { n: 'Resting',     at: 0,   e: '🌙', mult: 1.00, d: 'Rest days count. The camp keeps working.' },
  { n: 'Moving',      at: 15,  e: '🌱', mult: 1.20, d: '+20% harvests and camp work' },
  { n: 'Strong',      at: 30,  e: '🔥', mult: 1.40, d: '+40% harvests and camp work' },
  { n: 'Unstoppable', at: 60,  e: '⚡', mult: 1.60, d: '+60% harvests and camp work' },
  { n: 'Legendary',   at: 120, e: '👑', mult: 1.80, d: '+80% harvests and camp work' },
];
const TORCH_FREE_CAP = 2;            // free torches bank up to this, so a skipped day is not wasted
const TORCH_GRIT = [30, 60, 120];    // grit thresholds that each give a bonus torch today
const WORKOUTS = [
  { id: 'walk', n: 'Walk', e: '🚶', i: 'light' },
  { id: 'yoga', n: 'Yoga / stretch', e: '🧘', i: 'light' },
  { id: 'bike', n: 'Bike', e: '🚴', i: 'moderate' },
  { id: 'lift', n: 'Strength', e: '🏋️', i: 'moderate' },
  { id: 'dance', n: 'Dance', e: '💃', i: 'moderate' },
  { id: 'sport', n: 'Sport', e: '⚽', i: 'moderate' },
  { id: 'run', n: 'Run', e: '🏃', i: 'hard' },
  { id: 'hiit', n: 'HIIT / cardio', e: '💥', i: 'hard' },
  { id: 'swim', n: 'Swim', e: '🏊', i: 'hard' },
];

/* ---------- farm ---------- */
// h = hours to grow. y = crops per harvest. s = chance the plant drops its seed back.
const CROPS = {
  radish:    { n: 'Radish',     e: '🌶️', h: 3,  y: 2, s: 0.7, sell: 2,  r: 'common' },
  potato:    { n: 'Potato',     e: '🥔', h: 6,  y: 3, s: 0.6, sell: 2,  r: 'common' },
  carrot:    { n: 'Carrot',     e: '🥕', h: 5,  y: 2, s: 0.6, sell: 3,  r: 'common' },
  tomato:    { n: 'Tomato',     e: '🍅', h: 8,  y: 3, s: 0.5, sell: 3,  r: 'common' },
  beans:     { n: 'Beans',      e: '🫘', h: 10, y: 4, s: 0.5, sell: 3,  r: 'uncommon' },
  corn:      { n: 'Corn',       e: '🌽', h: 12, y: 3, s: 0.5, sell: 4,  r: 'uncommon' },
  berry:     { n: 'Blackberry', e: '🫐', h: 16, y: 4, s: 0.4, sell: 5,  r: 'uncommon' },
  pumpkin:   { n: 'Pumpkin',    e: '🎃', h: 20, y: 2, s: 0.4, sell: 9,  r: 'rare' },
  garlic:    { n: 'Garlic',     e: '🧄', h: 14, y: 3, s: 0.4, sell: 6,  r: 'rare' },
  moonflower:{ n: 'Moonflower', e: '🌸', h: 24, y: 1, s: 0.25, sell: 20, r: 'epic' },
};
const CROP_ORDER = ['radish', 'carrot', 'potato', 'tomato', 'beans', 'corn', 'garlic', 'berry', 'pumpkin', 'moonflower'];

// Meals: cook at the kitchen, eat one before a run.
const MEALS = {
  salad:   { n: 'Radish salad',   e: '🥗', need: { radish: 2 },                   d: '+6 max HP this run',                    fx: { maxhp: 6 } },
  hash:    { n: 'Potato hash',    e: '🍳', need: { potato: 2, carrot: 1 },        d: 'Start every fight with 6 block',          fx: { block: 6 } },
  soup:    { n: 'Tomato soup',    e: '🍲', need: { tomato: 2, carrot: 1 },        d: '+1 Strength all run',                     fx: { str: 1 } },
  chili:   { n: 'Bean chili',     e: '🌶', need: { beans: 2, tomato: 1 },         d: 'Draw 1 more card on your first turn',     fx: { draw1: 1 } },
  chowder: { n: 'Corn chowder',   e: '🥣', need: { corn: 2, potato: 1 },          d: 'Heal 4 after every fight',                fx: { heal: 4 } },
  jam:     { n: 'Blackberry jam', e: '🍯', need: { berry: 3 },                    d: '+30% scrap this run',                     fx: { scrap: 0.3 } },
  bread:   { n: 'Garlic bread',   e: '🥖', need: { garlic: 2, potato: 1 },        d: 'Enemies start every fight Weak',          fx: { weakAll: 1 } },
  pie:     { n: 'Pumpkin pie',    e: '🥧', need: { pumpkin: 1, berry: 1 },        d: '+15 max HP and +1 Strength',              fx: { maxhp: 15, str: 1 } },
  tea:     { n: 'Moonflower tea', e: '🍵', need: { moonflower: 1, garlic: 1 },    d: '+1 energy every turn this run',           fx: { energy: 1 } },
};
const MEAL_ORDER = ['salad', 'hash', 'soup', 'chili', 'chowder', 'jam', 'bread', 'pie', 'tea'];

/* ---------- camp buildings ---------- */
// lv[i] is the cost to go from level i to i+1.
const BUILDINGS = {
  plots:     { n: 'Garden beds',  e: '🪴', d: lv => (4 + lv * 2) + ' beds to plant in', lv: [{ wood: 8, scrap: 10 }, { wood: 16, scrap: 25 }, { wood: 30, scrap: 50 }, { wood: 50, scrap: 90 }], start: 0 },
  walls:     { n: 'Walls',        e: '🧱', d: lv => (lv * 12) + ' defense against the Sunday horde', lv: [{ wood: 6, scrap: 6 }, { wood: 14, scrap: 18 }, { wood: 26, scrap: 36 }, { wood: 40, scrap: 60 }, { wood: 60, scrap: 100 }, { wood: 90, scrap: 160 }], start: 0 },
  bunk:      { n: 'Bunkhouse',    e: '🛏️', d: lv => 'Room for ' + (2 + lv * 2) + ' survivors', lv: [{ wood: 12, scrap: 15 }, { wood: 28, scrap: 40 }], start: 0 },
  workshop:  { n: 'Workshop',     e: '🔧', d: lv => lv ? 'Unlocks new cards for your runs (' + lv + ' tiers)' : 'Unlocks new cards for your runs', lv: [{ wood: 10, scrap: 20 }, { wood: 25, scrap: 50 }, { wood: 45, scrap: 100 }], start: 0 },
  greenhouse:{ n: 'Greenhouse',   e: '🏡', d: lv => 'Crops grow ' + (lv * 15) + '% faster', lv: [{ wood: 20, scrap: 30 }, { wood: 40, scrap: 70 }], start: 0 },
  tower:     { n: 'Watchtower',   e: '🗼', d: lv => '+' + (lv * 6) + ' defense, and you see tomorrow\'s night conditions', lv: [{ wood: 18, scrap: 20 }, { wood: 35, scrap: 55 }], start: 0 },
  kennel:    { n: 'Kennel',       e: '🐾', d: lv => 'Your pet fights harder, and brings home more', lv: [{ wood: 10, scrap: 12 }], start: 0 },
};
const BUILD_ORDER = ['plots', 'walls', 'workshop', 'bunk', 'greenhouse', 'tower', 'kennel'];

/* ---------- survivors ---------- */
const JOBS = {
  idle:     { n: 'Resting',     e: '💤', d: 'Takes it easy. Hearts grow a little faster.' },
  farm:     { n: 'Farmhand',    e: '🧑‍🌾', d: 'Replants what you harvest, +15% crops' },
  scav:     { n: 'Scavenger',   e: '🎒', d: 'Brings back scrap every hour' },
  wood:     { n: 'Woodcutter',  e: '🪓', d: 'Chops wood every hour' },
  guard:    { n: 'Guard',       e: '🛡️', d: 'Holds the wall: +8 defense, +2 per heart' },
  cook:     { n: 'Cook',        e: '👩‍🍳', d: 'Every meal cooks two portions' },
  medic:    { n: 'Medic',       e: '🩺', d: 'You start runs with +5 max HP, +1 per heart' },
};
const JOB_ORDER = ['farm', 'scav', 'wood', 'guard', 'cook', 'medic', 'idle'];
const SURV_NAMES = ['Jules', 'Dev', 'Marisol', 'Kenji', 'Ada', 'Booker', 'Tam', 'Rosa', 'Isaiah', 'Yuki', 'Cal', 'Nadine', 'Omar', 'Sasha', 'Wren', 'Elias', 'Priya', 'Dom', 'Lena', 'Rook', 'Hattie', 'Mateo', 'June', 'Ezra'];
const SURV_PAST = ['used to deliver mail on this route', 'taught third grade at Hollow Elementary', 'ran the night shift at the Gas & Go', 'was a line cook at the diner on Main', 'coached Little League', 'drove a tow truck', 'was two weeks from retiring', 'fixed phones at the mall kiosk', 'was a paramedic', 'sold insurance, and will not talk about it', 'was a park ranger', 'played bass in a bar band', 'worked the rail yard', 'was a hospital janitor', 'repaired church organs', 'ran a food truck', 'was a nursing student', 'was a locksmith', 'managed the hardware store', 'grew prize tomatoes for the county fair'];
const SURV_LIKES = ['radish', 'carrot', 'potato', 'tomato', 'beans', 'corn', 'berry', 'pumpkin', 'garlic'];
// One line per heart. {n} is their name, {p} what they used to do.
const SURV_STORY = [
  '{n} {p}. They say it like it happened to someone else.',
  '{n} laughed today. A real one. Nobody mentioned it, so it would not stop.',
  '{n} showed you a photo. They did not say who it was, and you did not ask.',
  '{n} started humming while they worked. Now half the camp does it.',
  '{n} carved your initials next to theirs on the porch post. "So they know who built it."',
];
// The perk each job gets at 5 hearts, as a charm they give you.
const HEART_GIFT = { farm: 'trowel', scav: 'magpie', wood: 'axehead', guard: 'badge', cook: 'ladle', medic: 'stetho', idle: 'locket' };

/* ---------- pets ---------- */
const PETS = {
  dog: { n: 'Dog', e: '🐕', d: 'Blocks the first hit of every fight (4, more with a Kennel), and digs up scrap overnight.' },
  cat: { n: 'Cat', e: '🐈', d: '+15% scrap from runs, and leaves a gift on the porch most mornings.' },
};
const PET_NAMES = { dog: ['Biscuit', 'Scout', 'Waffles', 'Pepper', 'Moose', 'Bean'], cat: ['Mochi', 'Salem', 'Noodle', 'Miso', 'Pumpkin', 'Toast'] };

/* ---------- cards ----------
   c = energy cost. t = attack | skill | power. tgt: 'one' | 'all' | 'self'.
   fx is resolved by the engine in order. up = what the upgraded version changes.
   tier: 0 starter, 1 always in the pool, 2-4 unlocked by Workshop levels. */
const CARDS = {
  strike:   { n: 'Swing',        t: 'attack', c: 1, tier: 0, fx: { dmg: 6 }, up: { dmg: 9 }, d: 'Deal {dmg}.' },
  brace:    { n: 'Brace',        t: 'skill',  c: 1, tier: 0, fx: { block: 5 }, up: { block: 8 }, d: 'Gain {block} block.' },
  kick:     { n: 'Kick',         t: 'attack', c: 1, tier: 0, fx: { dmg: 4, expose: 1 }, up: { dmg: 6, expose: 2 }, d: 'Deal {dmg}. Expose {expose}.' },
  // tier 1 - always findable
  shiv:     { n: 'Shiv',         t: 'attack', c: 0, tier: 1, fx: { dmg: 3 }, up: { dmg: 5 }, d: 'Deal {dmg}.' },
  pipe:     { n: 'Pipe Swing',   t: 'attack', c: 2, tier: 1, fx: { dmg: 13 }, up: { dmg: 18 }, d: 'Deal {dmg}.' },
  machete:  { n: 'Machete',      t: 'attack', c: 1, tier: 1, fx: { dmg: 4, hits: 2 }, up: { dmg: 5, hits: 2 }, d: 'Deal {dmg} twice.' },
  roll:     { n: 'Dodge Roll',   t: 'skill',  c: 1, tier: 1, fx: { block: 5, draw: 1 }, up: { block: 7, draw: 1 }, d: 'Gain {block} block. Draw {draw}.' },
  barricade:{ n: 'Barricade',    t: 'skill',  c: 2, tier: 1, fx: { block: 12 }, up: { block: 17 }, d: 'Gain {block} block.' },
  bandage:  { n: 'Bandage',      t: 'skill',  c: 1, tier: 1, fx: { heal: 5, exhaust: 1 }, up: { heal: 8, exhaust: 1 }, d: 'Heal {heal}. Used up.' },
  scrounge: { n: 'Scrounge',     t: 'skill',  c: 0, tier: 1, fx: { draw: 2, exhaust: 1 }, up: { draw: 3, exhaust: 1 }, d: 'Draw {draw}. Used up.' },
  trip:     { n: 'Trip Wire',    t: 'skill',  c: 1, tier: 1, fx: { weak: 2, block: 3 }, up: { weak: 3, block: 5 }, d: 'Weaken {weak}. Gain {block} block.' },
  crowbar:  { n: 'Crowbar',      t: 'attack', c: 1, tier: 1, fx: { dmg: 7, scrapKill: 3 }, up: { dmg: 10, scrapKill: 4 }, d: 'Deal {dmg}. If it kills: +{scrapKill} scrap.' },
  shove:    { n: 'Shove',        t: 'attack', c: 1, tier: 1, fx: { dmg: 3, block: 4 }, up: { dmg: 5, block: 6 }, d: 'Deal {dmg}. Gain {block} block.' },
  // tier 2 - Workshop 1
  molotov:  { n: 'Molotov',      t: 'attack', c: 2, tier: 2, tgt: 'all', fx: { dmg: 6, bleed: 3 }, up: { dmg: 8, bleed: 4 }, d: 'Deal {dmg} to ALL. Burn {bleed}.' },
  nailbat:  { n: 'Nail Bat',     t: 'attack', c: 2, tier: 2, fx: { dmg: 8, bleed: 4 }, up: { dmg: 10, bleed: 6 }, d: 'Deal {dmg}. Bleed {bleed}.' },
  rally:    { n: 'Deep Breath',  t: 'power',  c: 1, tier: 2, fx: { str: 2 }, up: { str: 3 }, d: 'Gain {str} Strength for this fight.' },
  adrenal:  { n: 'Adrenaline',   t: 'skill',  c: 0, tier: 2, fx: { energy: 2, exhaust: 1 }, up: { energy: 2, draw: 1, exhaust: 1 }, d: 'Gain {energy} energy.{draw?} Draw {draw}.{/} Used up.' },
  flare:    { n: 'Road Flare',   t: 'skill',  c: 1, tier: 2, tgt: 'all', fx: { weak: 1, draw: 1 }, up: { weak: 2, draw: 2 }, d: 'Weaken ALL {weak}. Draw {draw}.' },
  secondwind:{ n: 'Second Wind', t: 'skill',  c: 1, tier: 2, fx: { blockMissing: 0.35, exhaust: 1 }, up: { blockMissing: 0.5, exhaust: 1 }, d: 'Block equal to {blockMissing%} of your missing HP. Used up.' },
  // tier 3 - Workshop 2
  shotgun:  { n: 'Shotgun',      t: 'attack', c: 2, tier: 3, fx: { dmg: 14, expose: 2 }, up: { dmg: 19, expose: 2 }, d: 'Deal {dmg}. Expose {expose}.' },
  headshot: { n: 'Headshot',     t: 'attack', c: 2, tier: 3, fx: { dmg: 10, exposeX: 2 }, up: { dmg: 14, exposeX: 2 }, d: 'Deal {dmg}. Double damage to Exposed targets.' },
  ironskin: { n: 'Hold the Line',t: 'power',  c: 2, tier: 3, fx: { plate: 4 }, up: { plate: 6 }, d: 'At the start of each turn, gain {plate} block.' },
  frenzy:   { n: 'Frenzy',       t: 'attack', c: 1, tier: 3, fx: { dmg: 2, hits: 4 }, up: { dmg: 3, hits: 4 }, d: 'Deal {dmg} four times.' },
  // tier 4 - Workshop 3
  axe:      { n: 'Fire Axe',     t: 'attack', c: 3, tier: 4, fx: { dmg: 26 }, up: { dmg: 34 }, d: 'Deal {dmg}.' },
  chainsaw: { n: 'Chainsaw',     t: 'attack', c: 2, tier: 4, tgt: 'all', fx: { dmg: 9, bleed: 2 }, up: { dmg: 12, bleed: 3 }, d: 'Deal {dmg} to ALL. Bleed {bleed}.' },
  secondlife:{ n: 'Grit Teeth',  t: 'power',  c: 1, tier: 4, fx: { thorns: 3 }, up: { thorns: 5 }, d: 'Whenever you are hit, deal {thorns} back.' },
  // from survivors, pets and meals only
  sicem:    { n: "Sic 'Em",      t: 'attack', c: 1, tier: 9, fx: { dmg: 6, weak: 1 }, up: { dmg: 9, weak: 1 }, d: 'Your dog bites for {dmg}. Weaken {weak}.' },
  pounce:   { n: 'Pounce',       t: 'attack', c: 0, tier: 9, fx: { dmg: 4, draw: 1 }, up: { dmg: 6, draw: 1 }, d: 'Your cat strikes for {dmg}. Draw {draw}.' },
  wound:    { n: 'Bite Wound',   t: 'curse',  c: 9, tier: 9, fx: {}, d: 'Unplayable. Ends up discarded. Rest at a camp to clean it.' },
};
const STARTER_DECK = ['strike', 'strike', 'strike', 'strike', 'brace', 'brace', 'brace', 'brace', 'kick'];

/* ---------- charms (relics) ---------- */
const CHARMS = {
  rabbit:   { n: "Rabbit's Foot",  e: '🐇', r: 'common',   d: '+20% scrap from fights.' },
  watch:    { n: 'Pocket Watch',   e: '⌚', r: 'common',   d: '+1 energy on your first turn of each fight.' },
  thermos:  { n: 'Thermos',        e: '🧉', r: 'common',   d: 'Heal 3 after every fight.' },
  kneepads: { n: 'Knee Pads',      e: '🦵', r: 'common',   d: 'Start every fight with 5 block.' },
  whet:     { n: 'Whetstone',      e: '🪨', r: 'common',   d: 'Swing deals 3 more.' },
  bell:     { n: 'Cow Bell',       e: '🔔', r: 'uncommon', d: 'Enemies start every fight Exposed.' },
  walkman:  { n: 'Walkman',        e: '📼', r: 'uncommon', d: 'Draw 2 more cards on your first turn.' },
  pouch:    { n: 'Seed Pouch',     e: '👝', r: 'uncommon', d: 'Every fight drops a seed.' },
  mitts:    { n: 'Oven Mitts',     e: '🧤', r: 'uncommon', d: 'Gain 1 block whenever you play a skill.' },
  boots:    { n: 'Steel Toes',     e: '🥾', r: 'uncommon', d: 'Kick Exposes 1 more and deals 2 more.' },
  medal:    { n: 'Old Medal',      e: '🎖️', r: 'rare',     d: '+1 Strength at the start of every fight.' },
  candle:   { n: 'Vigil Candle',   e: '🕯️', r: 'rare',     d: 'Once a run, when you would die, heal to 30% instead.' },
  lantern:  { n: 'Storm Lantern',  e: '🏮', r: 'rare',     d: '+1 energy every turn. Start each fight with a Bite Wound in your draw pile.' },
  compass:  { n: 'Compass',        e: '🧭', r: 'rare',     d: 'Rest stops heal 50% more, and you can see what every event holds.' },
  // survivor gifts (5 hearts) - never found on runs
  trowel:   { n: "Hattie's Trowel", e: '🪏', r: 'gift', d: 'Gift from a farmhand. +1 crop from every harvest.' },
  magpie:   { n: 'Magpie Charm',    e: '🐦', r: 'gift', d: 'Gift from a scavenger. +25% scrap from everything.' },
  axehead:  { n: 'Lucky Axehead',   e: '🪓', r: 'gift', d: 'Gift from a woodcutter. Your first attack each fight deals 5 more.' },
  badge:    { n: 'Tin Badge',       e: '⭐', r: 'gift', d: 'Gift from a guard. +15 horde defense and start fights with 3 block.' },
  ladle:    { n: 'Family Ladle',    e: '🥄', r: 'gift', d: 'Gift from a cook. Meal effects are 50% stronger.' },
  stetho:   { n: 'Stethoscope',     e: '🩺', r: 'gift', d: 'Gift from a medic. Heal 5 at the start of every elite and boss fight.' },
  locket:   { n: 'Locket',          e: '📿', r: 'gift', d: 'Gift from a friend. +10 max HP on every run.' },
};

/* ---------- enemies ----------
   moves: list cycled or picked. a = attack, b = block, buff/debuff names map
   to statuses. w = weight for random pick. */
const ENEMIES = {
  shambler: { n: 'Shambler',  z: 'shambler', hp: [16, 20], moves: [{ a: 6, w: 3 }, { a: 4, wound: 1, w: 1, n: 'Bite' }] },
  runner:   { n: 'Runner',    z: 'runner',   hp: [11, 14], moves: [{ a: 3, hits: 2, w: 2 }, { a: 7, w: 1 }] },
  crawler:  { n: 'Crawler',   z: 'crawler',  hp: [9, 12],  moves: [{ a: 4, weak: 1, w: 2, n: 'Grab' }, { a: 5, w: 1 }] },
  bloater:  { n: 'Bloater',   z: 'bloater',  hp: [28, 34], moves: [{ a: 9, w: 2 }, { b: 8, w: 1, n: 'Swell' }], death: { aoe: 6 } },
  screamer: { n: 'Screamer',  z: 'screamer', hp: [14, 18], moves: [{ shout: 1, w: 2, n: 'Scream' }, { a: 5, w: 1 }] },
  raider:   { n: 'Raider',    z: 'raider',   hp: [22, 26], moves: [{ a: 8, w: 2 }, { b: 7, a: 4, w: 1, n: 'Cover' }] },
  gunner:   { n: 'Gunner',    z: 'gunner',   hp: [18, 22], moves: [{ a: 10, w: 1, n: 'Aimed shot' }, { b: 6, w: 1, n: 'Reload' }], cycle: true },
  hazmat:   { n: 'Hazmat',    z: 'hazmat',   hp: [26, 30], moves: [{ a: 6, bleed: 3, w: 2, n: 'Leak' }, { b: 10, w: 1 }] },
  stalker:  { n: 'Stalker',   z: 'stalker',  hp: [20, 24], moves: [{ a: 4, hits: 3, w: 1, n: 'Flurry' }, { str: 2, w: 1, n: 'Circle' }], cycle: true },
  hollow:   { n: 'Hollow Man', z: 'hollow',  hp: [30, 36], moves: [{ a: 10, w: 2 }, { weak: 2, expose: 1, w: 1, n: 'Stare' }] },
  // elites
  brute:    { n: 'Brute',       z: 'bloater', elite: 1, hp: [48, 54], moves: [{ a: 14, w: 2, n: 'Slam' }, { str: 3, b: 10, w: 1, n: 'Roar' }] },
  matron:   { n: 'The Matron',  z: 'matron',  elite: 1, hp: [44, 50], moves: [{ a: 7, hits: 2, w: 2 }, { heal: 10, b: 8, w: 1, n: 'Mend' }] },
  butcher:  { n: 'Butcher',     z: 'butcher', elite: 1, hp: [52, 58], moves: [{ a: 10, bleed: 4, w: 2, n: 'Cleave' }, { a: 18, w: 1, n: 'Chop' }] },
  cellar:   { n: 'Cellar Thing', z: 'cellar', elite: 1, hp: [52, 58], moves: [{ a: 5, hits: 3, w: 2 }, { b: 14, str: 2, w: 1, n: 'Burrow' }] },
};
const BOSSES = {
  reyes:   { n: 'Mad Dog Reyes',     boss: 'Mad Dog Reyes',    hp: 76,  moves: [{ a: 10, w: 1 }, { a: 5, hits: 2, w: 1 }, { summon: 'runner', w: 1, n: 'Whistle' }], cycle: true, line: 'He kept the dogs after the kennel burned. They kept him.' },
  ash:     { n: 'Sister Ash',        boss: 'Sister Ash',       hp: 100, moves: [{ b: 16, w: 1, n: 'Riot shield' }, { a: 14, w: 1 }, { a: 8, weak: 2, w: 1, n: 'Sermon' }], cycle: true, line: 'She runs the church like a fort. Nobody leaves mass early.' },
  butcherb:{ n: 'The Butcher of Elm St', boss: 'The Butcher of Elm St', hp: 110, moves: [{ a: 8, bleed: 4, w: 1, n: 'Cleaver' }, { a: 16, w: 1, n: 'Chop' }, { str: 2, b: 10, w: 1, n: 'Sharpen' }], cycle: true, line: 'Elm Street used to smell like barbecue on Sundays.' },
  marsh:   { n: 'The Widow Marsh',   boss: 'The Widow Marsh',  hp: 130, moves: [{ a: 9, weak: 2, w: 1, n: 'Poison kiss' }, { summon: 'crawler', b: 12, w: 1, n: 'Call the children' }, { a: 6, hits: 3, w: 1 }], cycle: true, line: 'The hospital still has power. She is the reason.' },
  gourd:   { n: 'The Gourd King',    boss: 'The Gourd King',   hp: 180, moves: [{ a: 9, hits: 2, w: 1, n: 'Harvest' }, { summon: 'shambler', str: 1, w: 1, n: 'Sow' }, { b: 20, heal: 12, w: 1, n: 'Root' }, { a: 22, w: 1, n: 'Reap' }], cycle: true, line: 'The dam holds back the river and him. One of them is cracking.' },
};

/* ---------- regions ----------
   Travel is free. Beat a region's boss to open the next one. */
const REGIONS = [
  { id: 'outskirts', n: 'The Outskirts', e: '🌾', d: 'Farmland and gas stations. Where everyone starts.', foes: ['shambler', 'runner', 'crawler'], elites: ['brute'], boss: 'reyes', seeds: ['radish', 'carrot', 'potato', 'tomato'], lvl: 1, color: '#7aa35a' },
  { id: 'town',      n: 'Hollow Town',   e: '🏘️', d: 'Main Street, the church, the school. Raiders hold the high ground.', foes: ['shambler', 'runner', 'screamer', 'raider'], elites: ['brute', 'matron'], boss: 'ash', seeds: ['tomato', 'beans', 'corn', 'carrot'], lvl: 2, color: '#c9a24a' },
  { id: 'rail',      n: 'The Rail Yard', e: '🚂', d: 'Rusted boxcars and the meat plant. Something big lives in the cold store.', foes: ['raider', 'gunner', 'bloater', 'stalker'], elites: ['butcher', 'brute'], boss: 'butcherb', seeds: ['corn', 'beans', 'garlic', 'berry'], lvl: 3, color: '#b0643a' },
  { id: 'hospital',  n: 'Mercy Hospital', e: '🏥', d: 'The lights are still on. That is the problem.', foes: ['hazmat', 'crawler', 'screamer', 'hollow'], elites: ['matron', 'cellar'], boss: 'marsh', seeds: ['garlic', 'berry', 'pumpkin', 'moonflower'], lvl: 4, color: '#6aa0b8' },
  { id: 'dam',       n: 'The Dam',       e: '🌊', d: 'The end of the county. The end of the road.', foes: ['hollow', 'stalker', 'hazmat', 'gunner', 'bloater'], elites: ['cellar', 'butcher'], boss: 'gourd', seeds: ['pumpkin', 'moonflower', 'berry', 'garlic'], lvl: 5, color: '#5a7ac8' },
];

/* ---------- nightly conditions ----------
   One per day, same for everyone (seeded by date), so friends can compare. */
const NIGHTS = [
  { id: 'clear',  n: 'Clear night',   e: '🌙', d: 'Nothing strange. A good night to push deep.' },
  { id: 'fog',    n: 'Fog',           e: '🌫️', d: 'You cannot see enemy intents until they act once. +25% scrap.', scrap: 0.25 },
  { id: 'blood',  n: 'Blood moon',    e: '🩸', d: 'Enemies have +25% HP. Elites drop an extra charm choice.', hp: 0.25, eliteCharm: 1 },
  { id: 'rain',   n: 'Heavy rain',    e: '🌧️', d: 'The farm drinks it up: crops planted today grow 30% faster. Runs are normal.', grow: 0.3 },
  { id: 'drop',   n: 'Supply drop',   e: '🪂', d: 'An extra loot cache on every map.', cache: 1 },
  { id: 'quiet',  n: 'Quiet night',   e: '🦗', d: 'Enemies have -15% HP. Fewer rewards from fights.', hp: -0.15, scrap: -0.2 },
  { id: 'heat',   n: 'Heat wave',     e: '🥵', d: 'Rest stops heal double, but you start runs at 85% HP.', rest: 2, startHp: 0.85 },
  { id: 'migrate',n: 'Migration',     e: '🧟', d: 'More fights, fewer events. Every fight drops wood.', fights: 1, wood: 2 },
  { id: 'market', n: 'Market night',  e: '🏮', d: 'A trader on every map, and prices are 25% lower.', shop: 1, cheap: 0.25 },
  { id: 'aurora', n: 'Strange lights',e: '✨', d: 'Card rewards offer an upgraded card.', upCards: 1 },
];

/* ---------- run events ----------
   Each choice: t text, need (optional), fx. The engine knows the fx keys. */
const EVENTS = [
  { id: 'pharmacy', n: 'Ransacked pharmacy', e: '💊', d: 'Shelves on the floor. A back room nobody tried.',
    ch: [{ t: 'Search the back room', fx: { roll: [[0.65, { heal: 12, txt: 'Painkillers and a clean bandage.' }], [0.35, { dmg: 6, txt: 'Something was in there. You got out.' }]] } },
         { t: 'Take what is left on the floor', fx: { heal: 4, txt: 'Half a bottle of aspirin.' } }] },
  { id: 'survivor', n: 'Someone in the attic', e: '🙋', d: 'A voice from above: "Are you... are you real?"',
    ch: [{ t: 'Bring them home', fx: { survivor: 1, txt: 'They climb down slowly. They will be at camp when you get back.' } },
         { t: 'Leave them food and go', fx: { scrap: 6, txt: 'They drop something down in thanks.' } }] },
  { id: 'shed', n: 'Garden shed', e: '🛖', d: 'Padlocked. Through the slats you can see seed tins.',
    ch: [{ t: 'Break the lock (noisy)', fx: { seeds: 3, fight: 1, txt: 'Seeds - and company.' } },
         { t: 'Pry a board loose, quietly', fx: { seeds: 1, txt: 'You get one tin out.' } }] },
  { id: 'car', n: 'Abandoned car', e: '🚗', d: 'Keys in the ignition. Something moving in the back seat.',
    ch: [{ t: 'Check the trunk', fx: { roll: [[0.5, { card: 1, txt: 'A gym bag. Something useful inside.' }], [0.5, { scrap: 12, txt: 'Jumper cables and a tool roll.' }]] } },
         { t: 'Siphon the gas and go', fx: { scrap: 7, txt: 'A good can of gas. That trades.' } }] },
  { id: 'shrine', n: 'Roadside shrine', e: '🕯️', d: 'Candles still burning. Someone keeps coming back here.',
    ch: [{ t: 'Leave something (lose 8 scrap)', need: { scrap: 8 }, fx: { scrap: -8, charm: 1, txt: 'When you look back, a charm sits where your scrap was.' } },
         { t: 'Sit a minute', fx: { heal: 7, txt: 'You feel steadier.' } }] },
  { id: 'gym', n: 'Hollow Fitness', e: '🏋️', d: 'The 24-hour gym. It really was open 24 hours.',
    ch: [{ t: 'Train (lose 6 HP)', fx: { dmg: 6, upgrade: 1, txt: 'Sore, but sharper. Upgrade a card.' } },
         { t: 'Raid the vending machines', fx: { heal: 5, scrap: 4, txt: 'Protein bars. Expired. Still good.' } }] },
  { id: 'crate', n: 'Military crate', e: '📦', d: 'Stenciled. Half buried. Booby trapped? Maybe.',
    ch: [{ t: 'Open it carefully', fx: { roll: [[0.7, { card: 1, rare: 1, txt: 'Clean gear.' }], [0.3, { dmg: 10, txt: 'It was trapped.' }]] } },
         { t: 'Leave it', fx: { txt: 'Probably smart.' } }] },
  { id: 'dog', n: 'A dog on a chain', e: '🐕', d: 'Thin. Wagging. Very much alive.',
    ch: [{ t: 'Cut it loose and bring it home', fx: { pet: 'dog', txt: 'It follows you all the way back. It has decided.' } },
         { t: 'Fill its bowl', fx: { heal: 3, txt: 'It licks your hand. That helped more than it should.' } }] },
  { id: 'cat', n: 'Cat in a window', e: '🐈', d: 'It watches you. It has been watching you for a while.',
    ch: [{ t: 'Open the window', fx: { pet: 'cat', txt: 'It walks out like it owns you now. It does.' } },
         { t: 'Nod at it', fx: { txt: 'It blinks slowly. You will take that.' } }] },
  { id: 'well', n: 'Old well', e: '🪣', d: 'Rope still good. Something glints at the bottom.',
    ch: [{ t: 'Climb down', fx: { roll: [[0.6, { charm: 1, txt: 'A charm, caught in the stones.' }], [0.4, { dmg: 8, txt: 'The rope gave. You climbed out.' }]] } },
         { t: 'Draw water', fx: { heal: 6, txt: 'Cold, clean water.' } }] },
  { id: 'trader', n: 'Lone trader', e: '🧳', d: '"Everything has a price. Especially out here."',
    ch: [{ t: 'Trade 15 scrap for a card', need: { scrap: 15 }, fx: { scrap: -15, card: 1, rare: 1, txt: 'A fair deal.' } },
         { t: 'Trade a card away (remove one)', fx: { remove: 1, txt: 'Lighter pack.' } }] },
  { id: 'radio', n: 'Radio tower', e: '📻', d: 'A looped broadcast: "...the dam... still holding... come if you can..."',
    ch: [{ t: 'Climb up and boost the signal', fx: { dmg: 4, scrap: 10, wood: 4, txt: 'Up there you can see the whole county. And a stash.' } },
         { t: 'Write down the frequency', fx: { txt: 'You will tune in from camp.' } }] },
];

/* ---------- morning (camp) events ----------
   One happens most mornings while you were away. Gentle: nothing here can
   take more than a little from you. */
const MORNINGS = [
  { id: 'trader',  w: 3, n: 'A trader at the gate', e: '🧳' },
  { id: 'storm',   w: 2, n: 'A storm came through', e: '⛈️' },
  { id: 'stray',   w: 1, n: 'A stray on the porch', e: '🐾' },
  { id: 'knock',   w: 2, n: 'Someone at the gate', e: '🚪' },
  { id: 'seeds',   w: 2, n: 'Seeds in the mailbox', e: '📬' },
  { id: 'radio',   w: 2, n: 'The radio crackles', e: '📻' },
  { id: 'deer',    w: 1, n: 'Deer in the garden', e: '🦌' },
  { id: 'shambler',w: 2, n: 'A shambler at the fence', e: '🧟' },
  { id: 'gift',    w: 2, n: 'A gift from the camp', e: '🎁' },
];
const RADIO = [
  '"...if anyone can hear this, the Dam still has lights. Bring seeds..."',
  '"...Hollow Elementary is clear. Repeat, the school is clear. Someone left the ovens on..."',
  '"...do not go to the hospital at night. Do not go to the hospital at night. Do not..."',
  '"...this is Booker, at the rail yard. The cold store door is open now. It was not open yesterday..."',
  '"...today\'s weather: grey, with a chance of grey. Stay hydrated out there, folks..."',
  '"...the Gourd King is not a story. I have seen the fields..."',
  '"...walk with someone if you can. Walk alone if you have to. But walk..."',
  '"...we lost the bridge, but we kept the garden. That is the right trade..."',
];

/* ---------- daily bounties ---------- */
const BOUNTIES = [
  { id: 'harvest', d: 'Harvest {n} crops', n: [6, 10, 14], r: { scrap: 15 } },
  { id: 'plant',   d: 'Plant {n} seeds', n: [3, 5], r: { wood: 6 } },
  { id: 'cook',    d: 'Cook a meal', n: [1], r: { scrap: 10 } },
  { id: 'fights',  d: 'Win {n} fights on runs', n: [3, 5, 8], r: { scrap: 20 } },
  { id: 'elite',   d: 'Beat an elite', n: [1], r: { seedRare: 1 } },
  { id: 'floor',   d: 'Reach floor {n} in a run', n: [4, 6], r: { scrap: 18 } },
  { id: 'gift',    d: 'Give a gift to a survivor', n: [1], r: { wood: 8 } },
  { id: 'grit',    d: 'Earn {n} grit today', n: [15, 30], r: { torch: 1 } },
  { id: 'build',   d: 'Build or upgrade something', n: [1], r: { scrap: 12 } },
  { id: 'cards',   d: 'Play {n} cards', n: [25, 40], r: { wood: 8 } },
];

/* ---------- character titles by level ---------- */
const TITLES = ['Drifter', 'Homesteader', 'Scavenger', 'Ranger', 'Warden', 'Road Captain', 'Legend of Hollow County'];
