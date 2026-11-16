/* Dead Miles (next) 0.55 - rare named houses (owner picked "rare named houses: a collector's house, a doomsday
   prepper's bunker, a pawn shop").
   About 1 in 12 houses your steps scout is somebody's place, with its own loot and more zombies guarding it:
   - The Collector's house: collectibles in most furniture, decor, and the rare 5th piece of a set you're missing.
   - Prepper's bunker: food, water, ammo, meds and armor; a riot vest and a 5 km walking cache stashed away.
   - Pawn shop: weapons and jewelry everywhere; a top-shelf weapon behind the counter.
   - Hoarder's house: piles of materials and junk, decor, two blueprints and a hiking backpack under it all.
   Picked from the house seed when it's scouted (game.js addHouse -> DM.Named.tag), so it never changes. Crew can't
   search them - you go in yourself. Extras go into furniture as f.extra (house.js pre-rolls them with the loot). */
'use strict';
window.DM = window.DM || {};
(() => {
  const N = DM.Named = {};
  const D = DM.D;
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const RATE = 1 / 12;
  const pickOf = (a, r) => a[Math.floor(r() * a.length)];
  const decor = r => pickOf(Object.keys(D.DECOR), r);
  const KINDS = {
    collector: { n: "The Collector's house", g: '🗃️', c: '#7fd9c8', on: ['rowL', 'mansion', 'apt', 'rowS'], z: 2, d: 'Someone kept everything. Shelves of it. Cards, records, globes - and something rare.',
      each: (f, r) => r() < .55 && DM.Collect ? [DM.Collect.pick(f.loot, r)] : r() < .2 ? [decor(r)] : [],
      jack: r => { const C = DM.Collect, out = [decor(r)]; if (!C) return out; const sets = Object.keys(C.SETS).filter(s => !C.SETS[s].walk && !C.has('col_' + s + '5')); out.push('col_' + (sets.length ? pickOf(sets, r) : pickOf(Object.keys(C.SETS), r)) + '5'); return out; } },
    prepper: { n: "Prepper's bunker", g: '🛢️', c: '#93a86c', on: ['rowL', 'garage', 'rowS', 'apt'], z: 3, d: 'Canned food to the ceiling, a water filter, a gun safe. He was ready for everything but this.',
      each: (f, r) => r() < .5 ? [pickOf(['beans', 'beans', 'water', 'water', 'ammo', 'ammo', 'shells', 'meds', 'bandage', 'antibio', 'battery', 'coffee'], r)] : [],
      jack: r => ['armor_riot', 'cache5', pickOf(['crossbow', 'shotgun', 'pistol'], r), 'antibio'] },
    pawn: { n: 'Pawn shop', g: '💍', c: '#e0b94a', on: ['bodega', 'laundro', 'garage'], z: 2, d: '"WE BUY GOLD." Everything in here was somebody\'s last good thing.',
      each: (f, r) => r() < .35 ? [pickOf(['golfclub', 'combatknife', 'machete', 'pipewrench', 'sledge', 'bat', 'crowbar', 'pan', 'baton', 'nailgun'], r)] : r() < .35 ? [pickOf(['jewelry', 'watch', 'jewelry', 'mod_grip', 'mod_scope'], r)] : [],
      jack: r => [pickOf(['katana', 'crossbow', 'shotgun', 'pistol', 'axe'], r), 'jewelry', 'watch', 'mod_silencer'] },
    hoarder: { n: "Hoarder's house", g: '📦', c: '#d9a46a', on: ['rowS', 'rowL', 'apt'], z: 1, d: 'You can barely open the door. Under all this, there has to be something good.',
      each: (f, r) => { const o = []; for (let i = 0; i < 2; i++) if (r() < .7) o.push(pickOf(['scrap', 'wood', 'nails', 'cloth', 'tape', 'book', 'battery', 'wood', 'scrap'], r)); if (r() < .12) o.push(decor(r)); return o; },
      jack: r => [D.pickBP(r), D.pickBP(r), 'backpack'] },
  };
  N.KINDS = KINDS;
  // scouting: is this new house somebody's place?
  N.tag = function (h) {
    if (!h || h.named || h.type === 'tutorial' || h.quest || h.daily) return h;
    const r = D.mulberry32((h.seed ^ 0x5eed1e) >>> 0);
    if (r() >= RATE) return h;
    const ks = Object.keys(KINDS).filter(k => KINDS[k].on.includes(h.type)); if (!ks.length) return h;
    h.named = pickOf(ks, r); return h;
  };
  N.title = h => h && KINDS[h.named] ? KINDS[h.named].n : null;
  N.tagHTML = h => { const K = KINDS[h.named]; return K ? `<b class="nmtag" style="--nc:${K.c}">${K.g} rare find · +${K.z} guard${K.z > 1 ? 's' : ''} · go yourself</b>` : ''; };
  // before a run: put the extras into the furniture (once per layout; a resumed run gets the same)
  N.prepRun = function (h, L) {
    const K = KINDS[h.named]; if (!K) return L.furn;
    L.namedZ = K.z; L.named = h.named;
    if (L._named === h.id + ':' + h.named) return L.furn;
    const r = D.mulberry32((h.seed ^ 0xbadc0de) >>> 0);
    const furn = L.furn.map(f => Object.assign({}, f)), cs = furn.filter(f => f.loot && f.lootable !== false && !f.secretLoot && D.LOOT[f.loot]);
    for (const f of cs) { const x = K.each(f, r).filter(k => D.ITEMS[k] || D.DECOR[k]); if (x.length) { f.extra = (f.extra || []).concat(x); f.noEmpty = 1; } }
    if (cs.length) { const f = cs.slice().sort((a, b) => (b.secretLoot ? 1 : 0) - (a.secretLoot ? 1 : 0))[Math.floor(r() * cs.length)]; f.extra = (f.extra || []).concat(K.jack(r).filter(k => D.ITEMS[k] || D.DECOR[k])); f.noEmpty = 1; f.namedJack = 1; }
    L._named = h.id + ':' + h.named;
    return furn;
  };
  N.intro = h => { const K = KINDS[h.named]; return K ? `${K.g} ${K.n}: ${K.d}` : ''; };
  const css = document.createElement('style'); css.textContent = `
    .nmtag { color: var(--nc, #e0b94a); font-weight: 900; } .hcard.named { border-color: var(--nc, #e0b94a) !important; box-shadow: 0 0 0 1px var(--nc, #e0b94a) inset; }`;
  document.head.appendChild(css);
})();
