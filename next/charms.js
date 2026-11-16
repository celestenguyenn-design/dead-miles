/* Dead Miles (next) 0.53 - walking charms (owner: "definitely more walking related stuff").
   One charm slot (survivor.charm = key). A charm changes what your steps do (walkfx.js asks DM.Charm.on(k)):
   - Pedometer: a walk find every 750 steps instead of 1,000
   - Map case: up to 16 walk finds a day instead of 12
   - Rabbit's foot: walk finds are luckier (caches, blueprints, collectibles, charms 2x as often)
   - Brass compass: walking caches open 25% faster
   - Walkman: walking fixes your weapon and armor twice as fast
   - Canteen: every 1,000 steps, +8 thirst
   Sources: walk finds (rare), walking caches (5 km 25%, 10 km 50%), locked rooms, attics, map places, Dot (level 3+).
   Wear one from the pack or stash (tap it -> Wear); the old one goes back to the stash. */
'use strict';
window.DM = window.DM || {};
(() => {
  const H = DM.Charm = {};
  const D = DM.D, SV = () => DM.Game && DM.Game.data(), S = '#11142f';
  const LIST = {
    charm_pedo: ['Pedometer', 'a walk find every 750 steps (not 1,000)', 18],
    charm_mapcase: ['Map case', 'up to 16 walk finds a day (not 12)', 18],
    charm_rabbit: ["Rabbit's foot", 'walk finds are luckier: caches, blueprints, collectibles 2x', 22],
    charm_compass: ['Brass compass', 'walking caches open 25% faster', 20],
    charm_walkman: ['Walkman', 'walking fixes your weapon and armor 2x as fast', 16],
    charm_canteen: ['Canteen', 'every 1,000 steps: +8 thirst', 14],
  };
  H.LIST = LIST;
  const ICONS = {
    charm_pedo: `<rect x="-17" y="-24" width="34" height="46" rx="10" fill="#3fa7a0" stroke="${S}" stroke-width="2.6"/><rect x="-11" y="-16" width="22" height="16" rx="3" fill="#cfe8c8" stroke="${S}" stroke-width="2"/>
      <text x="0" y="-4" font-size="10" font-weight="900" text-anchor="middle" fill="${S}" font-family="Inter, system-ui, sans-serif">9,412</text><circle cx="-6" cy="11" r="4" fill="#f6e3bb" stroke="${S}" stroke-width="1.8"/><circle cx="6" cy="11" r="4" fill="#f6e3bb" stroke="${S}" stroke-width="1.8"/>
      <rect x="-5" y="-30" width="10" height="7" rx="2" fill="#4a4657" stroke="${S}" stroke-width="2"/>`,
    charm_mapcase: `<g transform="rotate(-8)"><rect x="-24" y="-20" width="48" height="40" rx="5" fill="#8a5a36" stroke="${S}" stroke-width="2.6"/><rect x="-18" y="-14" width="36" height="28" rx="2" fill="#f6e3bb" stroke="${S}" stroke-width="1.8"/>
      <path d="M-18,4 Q-8,-8 0,2 T18,-6" stroke="#d9483a" stroke-width="2.4" fill="none" stroke-dasharray="4 3"/><path d="M8,-8 l4,4 M12,-8 l-4,4" stroke="${S}" stroke-width="2"/><rect x="-6" y="-26" width="12" height="7" rx="2" fill="#6b4a33" stroke="${S}" stroke-width="2"/></g>`,
    charm_rabbit: `<g transform="rotate(20)"><path d="M-8,-4 Q-14,-26 -4,-28 Q4,-26 2,-6 Q12,-20 16,-12 Q18,-4 6,4 L6,18 Q0,26 -6,18 Z" fill="#f4efe6" stroke="${S}" stroke-width="2.6" stroke-linejoin="round"/>
      <path d="M-6,-8 Q-9,-20 -4,-24 M4,-6 Q10,-14 13,-12" stroke="#f0b8c8" stroke-width="2.4" fill="none"/><rect x="-6" y="16" width="12" height="7" rx="2" fill="#e0b94a" stroke="${S}" stroke-width="2"/><circle cx="0" cy="28" r="4" fill="none" stroke="#e0b94a" stroke-width="2.4"/></g>`,
    charm_compass: `<circle cx="0" cy="2" r="24" fill="#e0b94a" stroke="${S}" stroke-width="2.6"/><circle cx="0" cy="2" r="18" fill="#f6e3bb" stroke="${S}" stroke-width="1.8"/><path d="M0,-12 L5,2 0,16 -5,2 Z" fill="#d9483a" stroke="${S}" stroke-width="1.6"/>
      <path d="M0,2 L5,2 0,16 Z" fill="#4a4657"/><circle cx="0" cy="2" r="2" fill="${S}"/><rect x="-4" y="-28" width="8" height="7" rx="2" fill="#b48a28" stroke="${S}" stroke-width="2"/><text x="0" y="-6" font-size="6" font-weight="900" text-anchor="middle" fill="${S}">N</text>`,
    charm_walkman: `<g transform="rotate(-6)"><rect x="-22" y="-18" width="44" height="36" rx="5" fill="#d9483a" stroke="${S}" stroke-width="2.6"/><rect x="-16" y="-12" width="32" height="16" rx="3" fill="#2a2440" stroke="${S}" stroke-width="1.8"/>
      <circle cx="-7" cy="-4" r="4" fill="#f6e3bb"/><circle cx="7" cy="-4" r="4" fill="#f6e3bb"/><rect x="-14" y="8" width="7" height="5" rx="1" fill="#f6e3bb"/><rect x="-4" y="8" width="7" height="5" rx="1" fill="#f6e3bb"/><rect x="6" y="8" width="7" height="5" rx="1" fill="#f6e3bb"/></g>
      <path d="M-18,-20 Q0,-36 18,-20" stroke="${S}" stroke-width="3" fill="none"/>`,
    charm_canteen: `<path d="M-6,-26 h12 v6 h-12 z" fill="#4a4657" stroke="${S}" stroke-width="2.2"/><ellipse cx="0" cy="4" rx="21" ry="23" fill="#5c7836" stroke="${S}" stroke-width="2.6"/><ellipse cx="0" cy="4" rx="14" ry="16" fill="none" stroke="#7c9a4c" stroke-width="2"/>
      <path d="M-20,-4 Q-30,-22 -10,-22" stroke="#8a5a36" stroke-width="3" fill="none"/><path d="M-10,-6 Q-6,-12 0,-12" stroke="#a9c27c" stroke-width="2.4" fill="none"/>`,
  };
  for (const k in LIST) {
    const [n, d, v] = LIST[k];
    D.ITEMS[k] = { n, i: k, charm: 1, rare: 1, tag: d };
    D.VALUE[k] = v;
  }
  if (typeof ART !== 'undefined' && ART.addIcons) ART.addIcons(ICONS);
  // where they turn up
  for (const [t, w] of [['lockedroom', .1], ['attic', .12], ['wallcache', .08], ['hordecrate', .1], ['deep2', .1]]) if (D.LOOT[t]) D.LOOT[t][1]['charm_*'] = w;
  // Dot sells one now and then from trader level 3 (one random charm per day's stock roll)
  if (D.SHOP) for (const [k, c] of [['charm_canteen', .25], ['charm_walkman', .2], ['charm_pedo', .15], ['charm_compass', .15]]) D.SHOP.push([k, 1, LIST[k][2] * 6, 3, c]);
  H.pick = (rnd = Math.random) => { const ks = Object.keys(LIST); return ks[Math.floor(rnd() * ks.length)]; };
  const roll0 = D.rollLoot;
  D.rollLoot = function (key, rnd = Math.random) { const out = roll0.call(this, key, rnd); for (let i = 0; i < out.length; i++) if (out[i] === 'charm_*') out[i] = H.pick(rnd); return out; };

  H.worn = () => { const v = SV(); const k = v && v.survivor && v.survivor.charm; return k && LIST[k] ? k : null; };
  H.on = k => H.worn() === 'charm_' + k;
  // wear one from a pack / stash list; returns the old one (or null)
  H.wear = function (s, list, i) {
    const e = list[i]; if (!e || !LIST[e.k]) return null;
    const old = s.charm && LIST[s.charm] ? s.charm : null;
    s.charm = e.k; e.n = (e.n || 1) - 1; if (e.n <= 0) list.splice(i, 1);
    return old;
  };
  H.slotHTML = function (s, icon, esc) {
    const k = s.charm && LIST[s.charm] ? s.charm : null;
    return `<button class="eqslot charm" id="eqCharm"><i class="eqk">Charm · walking</i>${k ? icon(k) : '<span class="eqnone">🍀</span>'}<b>${k ? esc(LIST[k][0]) : 'No charm'}</b><span>${k ? esc(LIST[k][1]) : 'Find one on walks or in caches'}</span></button>`;
  };
  // tapping the slot: take it off, or tips
  H.tap = function (s, back, done, toast) {
    if (s.charm && LIST[s.charm]) { const k = s.charm; if (!back(k)) return toast('No room for it', 1.4); s.charm = null; done(`Took off the ${LIST[k][0].toLowerCase()}`); return; }
    toast(s.pack.concat(s.stash).some(e => LIST[e.k]) ? 'Open Backpack or Stash, tap the charm, then Wear' : 'Charms turn up on walks, in walking caches, attics and locked rooms', 2.6);
  };
})();
