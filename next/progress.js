/* Dead Miles (next) 0.60 - more skills, more blueprints, slower progression (owner: "we should definitely add more skills
   ... and blueprints. I feel like the game is still progressing pretty fast ... 4 days? I have all the blueprints").
   - Every general skill tree gets 3 more ranks (6-8). They cost 3 / 4 / 5 points and need survivor level 12 / 18 / 25.
   - A new tree for everyone: Walker (what your steps do: walk finds, caches, gear upkeep). Its last rank needs level 15.
   - 16 new blueprints. The advanced ones can only be learned once your Crafting level (trades.js) is high enough, so
     finding a blueprint is not the end of it.
   Effects plug into the helpers in skills.js (wrapped here) and walkfx.js (DM.Skills.has('walk', r)). */
'use strict';
window.DM = window.DM || {};
(() => {
  const D = DM.D, SK = DM.Skills;
  if (!SK) return;
  // ---------------------------------------------------------------- extra ranks
  const MORE = {
    scav: [['Eagle-eyed', '+6% chance a search turns up something rare.', 3, 12], ['Bottomless bag', '+2 pack slots and +10 stash slots.', 4, 18], ['Fortune', '+8% extra-find chance in every search.', 5, 25]],
    stealth: [['Shadowstep', 'Footsteps another 20% quieter.', 3, 12], ['Unseen', 'Zombies spot you from another 10% less far.', 4, 18], ['Phantom', 'Every noise you make is another 15% smaller.', 5, 25]],
    combat: [['Brutal', '+10% melee damage.', 3, 12], ['Deadeye', '+15% bow and crossbow damage.', 4, 18], ['Juggernaut', '+25 max HP.', 5, 25]],
    surv: [['Forager', 'Food, bandages and meds heal another 20% more.', 3, 12], ['Endurance', '+20 max stamina.', 4, 18], ['Hardy', 'Hunger and thirst drain another 15% slower.', 5, 25]],
    lock: [['Feather touch', 'Sweet spots another 15% wider.', 3, 12], ['Unbreakable', 'Picks break 35% less again.', 4, 18], ['Grandmaster', 'Prying is another 35% quieter.', 5, 25]],
  };
  for (const id in MORE) { const T = SK.tree(id); if (T && T.ranks.length === 5) for (const [n, d, c, lv] of MORE[id]) T.ranks.push({ n, d: `${d} (level ${lv}+)`, c, lv }); }
  // the Walker tree (everyone)
  SK.TREES.push({ id: 'walk', n: 'Walker', col: '#7fd9c8', blurb: 'What your steps do: walk finds, walking caches and keeping your gear in shape.', ranks: [
    { n: 'Trail legs', d: 'Walking caches open 10% faster.', c: 1 },
    { n: 'Scrounger', d: '+2 walk finds a day.', c: 1 },
    { n: 'Wayfinder', d: 'A walk find every 10% fewer steps.', c: 2 },
    { n: 'Lucky stride', d: 'Rare walk finds (caches, blueprints, collectibles, charms) 1.5x as often.', c: 2 },
    { n: 'Long hauler', d: 'Walking keeps your weapon and armor in shape 50% faster.', c: 3 },
    { n: 'Road warrior', d: 'Caches open another 15% faster and +2 more walk finds a day. (level 15+)', c: 4, lv: 15 },
  ] });
  const hasR = (t, r, s) => SK.has(t, r, s);
  const W = (name, f) => { const o = SK[name]; if (o) SK[name] = (s = DM.S) => f(o(s), s); };
  W('rareBonus', (v, s) => v + (hasR('scav', 6, s) ? .06 : 0));
  W('packBonus', (v, s) => v + (hasR('scav', 7, s) ? 2 : 0));
  W('stashBonus', (v, s) => v + (hasR('scav', 7, s) ? 10 : 0));
  W('extraFind', (v, s) => v + (hasR('scav', 8, s) ? .08 : 0));
  W('stepNoise', (v, s) => v * (hasR('stealth', 6, s) ? .8 : 1));
  W('sightMul', (v, s) => v * (hasR('stealth', 7, s) ? .9 : 1));
  W('allNoise', (v, s) => v * (hasR('stealth', 8, s) ? .85 : 1));
  W('meleeMul', (v, s) => v * (hasR('combat', 6, s) ? 1.1 : 1));
  W('bowMul', (v, s) => v * (hasR('combat', 7, s) ? 1.15 : 1));
  W('hpBonus', (v, s) => v + (hasR('combat', 8, s) ? 25 : 0));
  W('healMul', (v, s) => v * (hasR('surv', 6, s) ? 1.2 : 1));
  W('staBonus', (v, s) => v + (hasR('surv', 7, s) ? 20 : 0));
  W('drainMul', (v, s) => v * (hasR('surv', 8, s) ? .85 : 1));
  W('lockWide', (v, s) => v * (hasR('lock', 6, s) ? 1.15 : 1));
  W('snapMul', (v, s) => v * (hasR('lock', 7, s) ? 1 / .65 : 1));
  W('pryNoise', (v, s) => v * (hasR('lock', 8, s) ? .65 : 1));
  // level gates
  const block0 = SK.block;
  SK.block = function (t, r, s = DM.S) {
    const why = block0(t, r, s); if (why === 'learned' || /first$/.test(why)) return why;
    const R = SK.tree(t).ranks[r - 1]; if (R && R.lv && SK.level(s) < R.lv) return `needs survivor level ${R.lv}`;
    return why;
  };
  // the Walker glyph (a shoe print)
  const g0 = SK.glyph;
  SK.glyph = (t, size = 22) => t === 'walk' ? `<svg viewBox="0 0 24 24" width="${size}" height="${size}" class="skg"><path d="M8 2c3 0 4 3 4 6s-1 6-4 6-4-3-4-6 1-6 4-6z" fill="#7fd9c8" stroke="#11142f" stroke-width="2"/><path d="M5 16h6v3c0 2-1 3-3 3s-3-1-3-3z" fill="#7fd9c8" stroke="#11142f" stroke-width="2"/><circle cx="17" cy="8" r="2" fill="#f6e3bb" stroke="#11142f" stroke-width="1.6"/><circle cx="19" cy="13" r="1.6" fill="#f6e3bb" stroke="#11142f" stroke-width="1.4"/></svg>` : g0(t, size);
  // the walk perks (walkfx.js reads these)
  SK.walkFindStep = (s = DM.S) => hasR('walk', 3, s) ? .9 : 1;
  SK.walkFindMax = (s = DM.S) => (hasR('walk', 2, s) ? 2 : 0) + (hasR('walk', 6, s) ? 2 : 0);
  SK.walkLucky = (s = DM.S) => hasR('walk', 4, s) ? 1.5 : 1;
  SK.walkFix = (s = DM.S) => hasR('walk', 5, s) ? 1.5 : 1;
  SK.walkCache = (s = DM.S) => 1 + (hasR('walk', 1, s) ? .1 : 0) + (hasR('walk', 6, s) ? .15 : 0);

  // ---------------------------------------------------------------- new blueprints (cl = Crafting level to learn it)
  const NEW = {
    golfclub: { out: ['golfclub', 1], in: { scrap: 4, cloth: 1, tape: 1 }, n: 'Golf club (FORE!)', cl: 2 },
    pipewrench: { out: ['pipewrench', 1], in: { scrap: 6, tape: 1 }, n: 'Pipe wrench', cl: 2 },
    arrow2: { out: ['arrow', 15], in: { wood: 2, scrap: 2, cloth: 1 }, n: 'Arrow bundle (15 arrows)', cl: 3 },
    combatknife: { out: ['combatknife', 1], in: { scrap: 4, cloth: 1, tape: 2 }, n: 'Combat knife', cl: 3 },
    charm_canteen: { out: ['charm_canteen', 1], in: { scrap: 3, cloth: 2 }, n: 'Canteen (walking charm)', cl: 3 },
    ammo: { out: ['ammo', 8], in: { scrap: 4, nails: 6 }, n: 'Reloaded 9mm (8 rounds)', cl: 4 },
    sledge: { out: ['sledge', 1], in: { scrap: 8, wood: 2, tape: 2 }, n: 'Sledgehammer', cl: 4 },
    crossbow: { out: ['crossbow', 1], in: { wood: 4, scrap: 4, cloth: 2, tape: 2 }, n: 'Crossbow', cl: 5 },
    meds: { out: ['meds', 1], in: { herbs: 3, cloth: 1 }, n: 'Herbal remedy (painkillers)', cl: 5 },
    charm_walkman: { out: ['charm_walkman', 1], in: { battery: 4, scrap: 3, tape: 2 }, n: 'Walkman (walking charm)', cl: 6 },
    charm_pedo: { out: ['charm_pedo', 1], in: { battery: 2, scrap: 2, tape: 1 }, n: 'Pedometer (walking charm)', cl: 7 },
    armor_plate: { out: ['armor_plate', 1], in: { scrap: 16, cloth: 6, tape: 6, nails: 16 }, n: 'Plate carrier (armor, -35% damage)', cl: 8 },
    antibio: { out: ['antibio', 1], in: { herbs: 4, meds: 1, water: 1 }, n: 'Home-made antibiotics', cl: 9 },
    charm_compass: { out: ['charm_compass', 1], in: { scrap: 4, jewelry: 1, tape: 1 }, n: 'Brass compass (walking charm)', cl: 9 },
    backpack: { out: ['backpack', 1], in: { cloth: 10, tape: 4, scrap: 3 }, n: 'Hiking backpack (+4 slots)', cl: 10 },
    mod_silencer2: { out: ['mod_silencer', 1], in: { scrap: 3, cloth: 3, battery: 1 }, n: 'Cheap silencer (ranged mod)', cl: 6 },
  };
  for (const k in NEW) {
    if (D.RECIPES[k] || !D.ITEMS[NEW[k].out[0]]) continue;
    D.RECIPES[k] = NEW[k];
    D.ITEMS['bp_' + k] = { n: 'Blueprint: ' + NEW[k].n.replace(/ \(.*\)/, ''), i: 'blueprint', use: 'Learn', bp: k, rare: 1, tag: `needs Crafting level ${NEW[k].cl} to learn` };
  }
  // 0.60: the older advanced blueprints get a Crafting level too
  for (const [k, cl] of [['armor_riot', 5], ['nailgun', 3], ['shells', 3], ['mod_scope', 4], ['mod_silencer', 5], ['lockset', 3], ['armor_sport', 2]]) if (D.RECIPES[k] && !D.RECIPES[k].cl) { D.RECIPES[k].cl = cl; if (D.ITEMS['bp_' + k]) D.ITEMS['bp_' + k].tag = `needs Crafting level ${cl} to learn`; }
  DM.Progress = { NEW };
})();
