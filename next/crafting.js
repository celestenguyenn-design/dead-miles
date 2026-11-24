/* Dead Miles (next) 0.67 - more to craft (owner: "my crafting level is still at 0 because I don't have anything I need to
   craft ... there's still a surplus of supplies ... even upgrading my stuff doesn't give me craft points, which it should").
   - Recipes that unlock on their own as Crafting levels up (r.auto = the level; no blueprint): base decor made from wood,
     nails, cloth, batteries and paperbacks, and supply crates that pack surplus food and water into something Auntie Dot
     buys (food and drink can't be sold loose).
   - Crafting XP now also comes from repairing and upgrading weapons, class upgrades, and building or repairing base
     pieces (game.js / base.js call DM.Trades.gain('craft', ...)).
   Save: nothing new - unlocked recipes go into survivor.known like learned blueprints. */
'use strict';
window.DM = window.DM || {};
(() => {
  const D = DM.D, CR = DM.Craft = {};
  const G = () => DM.Game, SV = () => DM.Game && DM.Game.data();
  const toast = (m, s) => DM.E && DM.E.toast && DM.E.toast(m, s || 2.4);
  // supply crates: a sell item, so the "Sell" sheet takes them
  Object.assign(D.ITEMS, {
    crate_ration: { n: 'Ration crate', i: 'crate_ration', tag: 'Dot pays well for it' },
    crate_snack: { n: 'Snack crate', i: 'crate_snack', tag: 'Dot pays for it' },
    crate_med: { n: 'First-aid box', i: 'crate_med', tag: 'Dot pays well for it' },
  });
  Object.assign(D.VALUE, { crate_ration: 24, crate_snack: 14, crate_med: 30 });
  const S = '#11142f';
  const crate = (lid, mark) => `<rect x="-24" y="-14" width="48" height="34" rx="3" fill="#b07a4a" stroke="${S}" stroke-width="2.8"/><rect x="-26" y="-22" width="52" height="10" rx="2" fill="${lid}" stroke="${S}" stroke-width="2.6"/>
    <path d="M-24,-2 H24 M-24,9 H24" stroke="#8a5a32" stroke-width="2"/><path d="M-18,-12 V18 M18,-12 V18" stroke="#8a5a32" stroke-width="2.4"/>${mark}`;
  if (typeof ART !== 'undefined' && ART.addIcons) ART.addIcons({
    crate_ration: crate('#93a86c', `<rect x="-9" y="-9" width="18" height="16" rx="2" fill="#f6e3bb" stroke="${S}" stroke-width="1.8"/><path d="M-5,-3 h10 M-5,2 h7" stroke="#7a5a3a" stroke-width="1.8"/>`),
    crate_snack: crate('#f07b3c', `<path d="M-8,-9 h16 l-2,16 h-12 Z" fill="#e0b94a" stroke="${S}" stroke-width="1.8"/><circle cx="0" cy="-1" r="3" fill="#d9483a"/>`),
    crate_med: crate('#f6e3bb', `<rect x="-9" y="-9" width="18" height="16" rx="2" fill="#f6e3bb" stroke="${S}" stroke-width="1.8"/><path d="M0,-6 v10 M-5,-1 h10" stroke="#d9483a" stroke-width="3.2"/>`),
  });
  // auto = Crafting level that teaches it
  const R = {
    crate_ration: { out: ['crate_ration', 1], in: { beans: 3, water: 3 }, n: 'Ration crate (sell to Dot, 24 caps)', auto: 1 },
    crate_snack: { out: ['crate_snack', 1], in: { snack: 4, drink: 2 }, n: 'Snack crate (sell to Dot, 14 caps)', auto: 1 },
    dc_crates: { out: ['d_crates', 1], in: { wood: 2, nails: 4 }, n: 'Stacked crates (decor)', auto: 1 },
    dc_flowers: { out: ['d_flowers', 1], in: { wood: 2, nails: 4, herbs: 1 }, n: 'Flower box (decor)', auto: 1 },
    dc_bench: { out: ['d_bench', 1], in: { wood: 4, nails: 8 }, n: 'Park bench (decor)', auto: 2 },
    dc_lantern: { out: ['d_lantern', 1], in: { scrap: 2, battery: 1, tape: 1 }, n: 'Camp lantern (decor)', auto: 2 },
    dc_bunting: { out: ['d_bunting', 1], in: { cloth: 3, tape: 1 }, n: 'Flag bunting (decor)', auto: 2 },
    crate_med: { out: ['crate_med', 1], in: { bandage: 3, meds: 1, cloth: 1 }, n: 'First-aid box (sell to Dot, 30 caps)', auto: 3 },
    dc_lights: { out: ['d_lights', 1], in: { battery: 2, tape: 1, scrap: 1 }, n: 'String lights (decor)', auto: 3 },
    dc_rug: { out: ['d_rug', 1], in: { cloth: 6 }, n: 'Woven rug (decor)', auto: 3 },
    dc_chair: { out: ['d_chair', 1], in: { wood: 2, nails: 4 }, n: 'Kitchen chair (decor)', auto: 3 },
    dc_armchair: { out: ['d_armchair', 1], in: { cloth: 4, wood: 2, nails: 4 }, n: 'Armchair (decor)', auto: 4 },
    dc_rug2: { out: ['d_rug2', 1], in: { cloth: 5 }, n: 'Round rug (decor)', auto: 4 },
    dc_sidetable: { out: ['d_sidetable', 1], in: { wood: 2, nails: 4 }, n: 'Side table (decor)', auto: 4 },
    dc_barrel: { out: ['d_barrelfire', 1], in: { scrap: 6, wood: 2 }, n: 'Burn barrel (decor, glows)', auto: 5 },
    dc_lamp: { out: ['d_lamp', 1], in: { scrap: 3, battery: 1, cloth: 1 }, n: 'Floor lamp (decor, glows)', auto: 5 },
    dc_bookshelf: { out: ['d_bookshelf', 1], in: { wood: 5, nails: 8, book: 4 }, n: 'Bookshelf (decor - uses up paperbacks)', auto: 6 },
    dc_desk: { out: ['d_desk', 1], in: { wood: 5, nails: 8 }, n: 'Writing desk (decor)', auto: 6 },
    dc_dining: { out: ['d_dining', 1], in: { wood: 5, nails: 8 }, n: 'Dining table (decor)', auto: 7 },
    dc_sofa: { out: ['d_sofa', 1], in: { cloth: 8, wood: 4, nails: 10 }, n: 'Old sofa (decor)', auto: 8 },
    dc_neon: { out: ['d_neon', 1], in: { battery: 4, scrap: 3, tape: 2 }, n: 'Neon HOME sign (decor, glows)', auto: 8 },
    dc_lamppost: { out: ['d_lamppost', 1], in: { scrap: 10, battery: 3, tape: 2 }, n: 'Street lamp (decor, glows)', auto: 10 },
  };
  Object.assign(D.RECIPES, R);
  CR.lvl = () => DM.Trades ? DM.Trades.lvl('craft') : 1;
  // teach every auto recipe the crafting level has reached; returns the names of new ones
  CR.sync = function () {
    const v = SV(), s = v && v.survivor; if (!s || !s.known) return [];
    const L = CR.lvl(), got = [];
    for (const k in D.RECIPES) { const r = D.RECIPES[k]; if (r.auto && r.auto <= L && !s.known.includes(k)) { s.known.push(k); got.push(r.n.replace(/ \(.*\)/, '')); } }
    return got;
  };
  CR.lockText = r => r.auto ? `Unlocks at Crafting level ${r.auto}` : null;
  // level-ups say what they taught
  if (DM.Trades) { const g0 = DM.Trades.gain; DM.Trades.gain = function (k, n) { g0.apply(this, arguments); if (k !== 'craft') return; const got = CR.sync(); if (got.length) setTimeout(() => toast(`🔨 New at the workbench: ${got.join(', ')}`, 3.4), 3900); }; }
})();
