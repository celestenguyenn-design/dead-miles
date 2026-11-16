/* Dead Miles (next) 0.53 - collections (owner: "more walking related stuff + looting").
   Six sets of five collectibles. Five sets turn up while looting, each in its own kind of furniture; the sixth
   (roadside postcards) only turns up on walks: walk finds, walking caches and the strange places on the map.
   - A new one files itself into your collection the next time you're on the home screen (no bag space kept).
   - Duplicates stay as items: sell them to Dot (they count as junk) or gift them to a friend who needs them.
   - A full set pays 120 caps + a capsule token; all six pay 400 caps + 3 tokens more.
   - The gold piece of each set is the rare one.
   Loot: 'col_*' in a D.LOOT table becomes a piece from a set that fits that furniture (D.rollLoot is wrapped).
   Save: SV.col = { got: { k: time }, done: { set: time }, all: time, fresh: [k] }. */
'use strict';
window.DM = window.DM || {};
(() => {
  const C = DM.Collect = {};
  const D = DM.D, G = () => DM.Game, SV = () => DM.Game && DM.Game.data();
  const toast = (m, s) => DM.E && DM.E.toast && DM.E.toast(m, s || 2.6);
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const S = '#11142f';
  const W5 = [4, 4, 3, 2.5, 1.2], VAL = [8, 8, 10, 12, 25], SET_CAPS = 120, ALL_CAPS = 400;
  // where: shown on the collection page; src: the LOOT tables a piece of this set can come from (with a weight)
  const SETS = {
    cards: { n: 'Zed Heads cards', g: '🃏', where: 'desks, nightstands, bookshelves, dressers, filing cabinets',
      src: { desk: .45, night: .35, books: .4, dresser: .3, filing: .35, side: .2 },
      p: [['Rookie Walker', '#7c9a4c'], ['Shiny Crawler', '#3fa7a0'], ['Holo Bloater', '#b98cf0'], ['Foil Screamer', '#e8609a'], ['Gold Brute', '#e0b94a']] },
    vinyl: { n: 'Dead Air records', g: '💿', where: 'china hutches, shelves, TV stands, storage rooms',
      src: { hutch: .45, shelves: .35, tv: .35, storage: .3, books: .2 },
      p: [['Static Hearts', '#d9483a'], ['Last Bus Home', '#3a6ab8'], ['Porch Light', '#e0b94a'], ['Gravel Lullaby', '#7c9a4c'], ['Brooklyn After Dark', '#b98cf0']] },
    globes: { n: 'Snow globes', g: '🔮', where: 'side tables, hutches, dressers, shop registers',
      src: { side: .35, hutch: .3, dresser: .25, register: .35, night: .2 },
      p: [['Skyline globe', '#7ec0ee'], ['Lighthouse globe', '#d9483a'], ['Ferris wheel globe', '#e8609a'], ['Pine cabin globe', '#7c9a4c'], ['Golden peach globe', '#e0b94a']] },
    figures: { n: 'Mall Rangers figures', g: '🦸', where: 'wardrobes, dressers, locked rooms, attics, gift boxes',
      src: { wardrobe: .35, dresser: .25, lockedroom: .6, attic: .6, giftbox: .4, hordecrate: .3 },
      p: [['Red Ranger', '#d9483a'], ['Blue Ranger', '#3a6ab8'], ['Green Ranger', '#7c9a4c'], ['Pink Ranger', '#e8609a'], ['Gold Ranger', '#e0b94a']] },
    plates: { n: 'License plates', g: '🚗', where: 'garages, toolboxes, workbenches, cars',
      src: { garage: .45, toolbox: .3, workbench: .35, car: .4, storage: .2 },
      p: [['New York plate', '#e0b94a', 'NY'], ['Georgia plate', '#f07b3c', 'GA'], ['New Jersey plate', '#f6e3bb', 'NJ'], ['Vermont plate', '#7c9a4c', 'VT'], ['California plate', '#3a6ab8', 'CA']] },
    postcards: { n: 'Roadside postcards', g: '📮', walk: 1, where: 'only on walks: walk finds, walking caches, strange places on the map',
      src: {},
      p: [['Greetings from the Pier', '#7ec0ee'], ["World's Biggest Donut", '#e8609a'], ['The Mystery Spot', '#b98cf0'], ['Route 9 Diner', '#d9483a'], ['Last Motel Before Nowhere', '#e0b94a']] },
  };
  C.SETS = SETS;
  const keyOf = (s, i) => 'col_' + s + (i + 1);

  // ---------------------------------------------------------------- icons
  function iconSVG(set, i, col, txt) {
    if (set === 'cards') return `<g transform="rotate(-8)"><rect x="-17" y="-25" width="34" height="48" rx="4" fill="${col}" stroke="${S}" stroke-width="2.6"/><rect x="-12" y="-20" width="24" height="26" rx="2" fill="#f6e3bb" stroke="${S}" stroke-width="1.8"/>
      <circle cx="0" cy="-8" r="8" fill="#93a86c" stroke="${S}" stroke-width="1.8"/><circle cx="-3" cy="-9" r="1.6" fill="${S}"/><circle cx="3.5" cy="-9" r="1.6" fill="#d9483a"/><path d="M-3,-3 h6" stroke="${S}" stroke-width="1.6"/>
      <path d="M-11,12 h22 M-11,17 h14" stroke="#11142f" stroke-width="2.2" stroke-linecap="round" opacity=".55"/>${i >= 2 ? `<path d="M10,-25 l3,6 6,1 -4.5,4 1,6 -5.5,-3 -5.5,3 1,-6 -4.5,-4 6,-1 z" fill="#fff6c8" stroke="${S}" stroke-width="1.4"/>` : ''}</g>`;
    if (set === 'vinyl') return `<g transform="rotate(-6)"><rect x="-26" y="-24" width="40" height="44" rx="2" fill="${col}" stroke="${S}" stroke-width="2.6"/><path d="M-21,-16 h20 M-21,-10 h14" stroke="#f6e3bb" stroke-width="2.4" stroke-linecap="round"/></g>
      <circle cx="8" cy="2" r="22" fill="#1b1a26" stroke="${S}" stroke-width="2.6"/><circle cx="8" cy="2" r="15" fill="none" stroke="#3a3848" stroke-width="1.2"/><circle cx="8" cy="2" r="10" fill="none" stroke="#3a3848" stroke-width="1.2"/>
      <circle cx="8" cy="2" r="7" fill="${col}" stroke="${S}" stroke-width="1.6"/><circle cx="8" cy="2" r="1.6" fill="${S}"/><path d="M-6,-10 Q0,-16 8,-17" stroke="#ffffff" stroke-width="1.8" fill="none" opacity=".35"/>`;
    if (set === 'globes') {
      const inner = [`<rect x="-9" y="-6" width="5" height="16" fill="#3a3848"/><rect x="-3" y="-12" width="6" height="22" fill="#4a4657"/><rect x="4" y="-3" width="6" height="13" fill="#3a3848"/>`,
        `<path d="M-3,10 L-1,-10 h4 L5,10 z" fill="#f6e3bb" stroke="${S}" stroke-width="1.2"/><rect x="-2" y="-4" width="6" height="3" fill="${col}"/><path d="M-1,-10 L1,-13 3,-10" fill="${col}"/>`,
        `<circle cx="0" cy="-1" r="10" fill="none" stroke="${col}" stroke-width="2"/><path d="M0,-11 V9 M-10,-1 H10 M-7,-8 L7,6 M7,-8 L-7,6" stroke="${col}" stroke-width="1.2"/><path d="M-5,11 L0,-1 5,11" stroke="${S}" stroke-width="1.6" fill="none"/>`,
        `<path d="M-10,10 L-4,-8 2,10 z" fill="#5c7836"/><rect x="2" y="2" width="9" height="8" fill="#8a5a36" stroke="${S}" stroke-width="1"/><path d="M1,2 L6.5,-3 12,2" fill="#d9483a"/>`,
        `<circle cx="0" cy="0" r="8" fill="${col}" stroke="${S}" stroke-width="1.6"/><path d="M0,-8 Q4,-14 8,-12" stroke="#5c7836" stroke-width="2.4" fill="none"/>`][i];
      return `<path d="M-20,16 h40 l-4,12 h-32 z" fill="#8a5a36" stroke="${S}" stroke-width="2.6" stroke-linejoin="round"/><circle cx="0" cy="-4" r="22" fill="#cfe8f6" stroke="${S}" stroke-width="2.6"/>
        <g>${inner}</g><path d="M-17,10 Q0,4 17,10 L16,14 Q0,18 -16,14 z" fill="#ffffff"/><circle cx="-9" cy="-14" r="1.6" fill="#fff"/><circle cx="7" cy="-18" r="1.4" fill="#fff"/><circle cx="12" cy="-6" r="1.2" fill="#fff"/>
        <path d="M-14,-16 Q-8,-24 0,-25" stroke="#ffffff" stroke-width="2.6" fill="none" opacity=".7"/>`;
    }
    if (set === 'figures') return `<rect x="-22" y="-28" width="44" height="56" rx="5" fill="#f6e3bb" stroke="${S}" stroke-width="2.6"/><rect x="-17" y="-20" width="34" height="42" rx="8" fill="#cfe8f6" stroke="${S}" stroke-width="1.8" opacity=".9"/>
      <circle cx="0" cy="-10" r="6" fill="${col}" stroke="${S}" stroke-width="2"/><rect x="-4" y="-12" width="8" height="3" rx="1" fill="${S}"/><path d="M-6,-3 h12 l1,13 h-14 z" fill="${col}" stroke="${S}" stroke-width="2" stroke-linejoin="round"/>
      <path d="M-6,-1 L-11,6 M6,-1 L11,6 M-4,10 v8 M4,10 v8" stroke="${S}" stroke-width="3" stroke-linecap="round"/><path d="M-3,2 l3,3 3,-3" stroke="#f6e3bb" stroke-width="1.6" fill="none"/>
      <circle cx="-14" cy="-24" r="2" fill="${S}"/>`;
    if (set === 'plates') return `<g transform="rotate(-6)"><rect x="-30" y="-16" width="60" height="32" rx="5" fill="#f4efe6" stroke="${S}" stroke-width="2.6"/><rect x="-30" y="-16" width="60" height="8" rx="3" fill="${col}" stroke="${S}" stroke-width="2"/>
      <text x="0" y="12" font-size="17" font-weight="900" text-anchor="middle" fill="${S}" font-family="Inter, system-ui, sans-serif">${txt}·${(i + 1) * 117 % 900 + 100}</text><circle cx="-24" cy="10" r="1.8" fill="#9d90bf"/><circle cx="24" cy="10" r="1.8" fill="#9d90bf"/></g>`;
    return `<g transform="rotate(5)"><rect x="-30" y="-20" width="60" height="40" rx="3" fill="#f6e3bb" stroke="${S}" stroke-width="2.6"/><rect x="-26" y="-16" width="38" height="32" rx="2" fill="${col}" stroke="${S}" stroke-width="1.6"/>
      <path d="M-26,8 Q-14,-2 -4,6 Q4,0 12,6 V16 H-26 z" fill="#5c7836" opacity=".8"/><circle cx="-16" cy="-6" r="4" fill="#fff6c8"/>
      <rect x="16" y="-16" width="11" height="13" fill="#d9483a" stroke="${S}" stroke-width="1.4"/><path d="M16,4 h11 M16,9 h11 M16,14 h8" stroke="#9d90bf" stroke-width="1.4"/></g>`;
  }

  // ---------------------------------------------------------------- items + loot
  const ICONS = {};
  for (const s in SETS) SETS[s].p.forEach(([n, col, txt], i) => {
    const k = keyOf(s, i);
    D.ITEMS[k] = { n, i: k, col: s, setN: SETS[s].n, rare: 1, tag: `collectible · ${SETS[s].n} ${i + 1}/5${i === 4 ? ' · rare' : ''}` };
    D.VALUE[k] = VAL[i]; D.STACK[k] = 5;
    ICONS[k] = iconSVG(s, i, col, txt);
  });
  if (typeof ART !== 'undefined' && ART.addIcons) ART.addIcons(ICONS);   // ART is a top-level const
  for (const s in SETS) for (const t in SETS[s].src) if (D.LOOT[t]) { const w = D.LOOT[t][1]; w['col_*'] = +((w['col_*'] || 0) + SETS[s].src[t]).toFixed(3); }
  for (const t of ['deep2', 'cache', 'safe', 'evidence']) if (D.LOOT[t]) D.LOOT[t][1]['col_*'] = (D.LOOT[t][1]['col_*'] || 0) + .3;

  function st() { const v = SV(); if (!v) return null; v.col = v.col || {}; const c = v.col; c.got = c.got || {}; c.done = c.done || {}; c.fresh = c.fresh || []; return c; }
  C.st = st;
  C.has = k => { const c = st(); return !!(c && c.got[k]); };
  function pickIn(set, rnd) {
    const c = st(), ks = SETS[set].p.map((_, i) => keyOf(set, i));
    const miss = c ? ks.filter(k => !c.got[k]) : ks, pool = miss.length && rnd() < .6 ? miss : ks;
    const w = pool.map(k => W5[+k.slice(-1) - 1]), tot = w.reduce((a, b) => a + b, 0);
    let x = rnd() * tot; for (let i = 0; i < pool.length; i++) { x -= w[i]; if (x <= 0) return pool[i]; }
    return pool[0];
  }
  // a piece that fits this LOOT table (or any looting set)
  C.pick = function (table, rnd = Math.random) {
    let sets = Object.keys(SETS).filter(s => SETS[s].src[table]);
    if (!sets.length) sets = Object.keys(SETS).filter(s => !SETS[s].walk);
    const w = sets.map(s => SETS[s].src[table] || 1), tot = w.reduce((a, b) => a + b, 0);
    let x = rnd() * tot; for (let i = 0; i < sets.length; i++) { x -= w[i]; if (x <= 0) return pickIn(sets[i], rnd); }
    return pickIn(sets[0], rnd);
  };
  // walks: mostly postcards
  C.pickWalk = (rnd = Math.random) => rnd() < .75 ? pickIn('postcards', rnd) : C.pick('', rnd);
  const roll0 = D.rollLoot;
  D.rollLoot = function (key, rnd = Math.random) { const out = roll0.call(this, key, rnd); for (let i = 0; i < out.length; i++) if (out[i] === 'col_*') out[i] = C.pick(key, rnd); return out; };

  // ---------------------------------------------------------------- filing (home screen)
  C.file = function () {
    const v = SV(), c = st(); if (!v || !c || !v.survivor || DM.scene) return;
    const s = v.survivor, filed = [];
    for (const list of [s.pack, s.stash]) for (let j = list.length - 1; j >= 0; j--) {
      const e = list[j], it = D.ITEMS[e.k]; if (!it || !it.col || c.got[e.k]) continue;
      c.got[e.k] = Date.now(); c.fresh.push(e.k); filed.push(e.k); e.n--; if (e.n <= 0) list.splice(j, 1);
    }
    if (!filed.length) return;
    const msgs = [];
    for (const k of filed) { const it = D.ITEMS[k]; msgs.push(`📔 New for your collection: ${it.n} (${it.setN} ${have(it.col)}/5)`); }
    for (const set in SETS) if (!c.done[set] && have(set) === 5) {
      c.done[set] = Date.now(); v.trader.caps += SET_CAPS; if (DM.Gacha) DM.Gacha.state().tok += 1; if (DM.Skills && DM.Skills.addXP) DM.Skills.addXP(60);
      DM.Journal && DM.Journal.note(`Finished the ${SETS[set].n} collection.`);
      msgs.push(`🏆 ${SETS[set].n} complete! +${SET_CAPS} caps, +1 capsule token`);
    }
    if (!c.all && Object.keys(SETS).every(x => c.done[x])) { c.all = Date.now(); v.trader.caps += ALL_CAPS; if (DM.Gacha) DM.Gacha.state().tok += 3; msgs.push(`👑 Every collection done! +${ALL_CAPS} caps, +3 capsule tokens`); }
    G().save(); try { DM.E.SFX.play('pick'); } catch (e) { /* ignore */ }
    msgs.forEach((m, i) => setTimeout(() => toast(m, 3), i * 1500));
  };
  const have = set => { const c = st(); return SETS[set].p.filter((_, i) => c.got[keyOf(set, i)]).length; };
  C.count = () => { const c = st(); return c ? Object.keys(c.got).filter(k => D.ITEMS[k]).length : 0; };
  C.total = () => Object.keys(SETS).length * 5;

  // ---------------------------------------------------------------- the sheet
  C.tile = function () {
    const c = st(); if (!c) return null; const n = C.count(), done = Object.keys(c.done).length;
    return { k: 'collect', c: '#7fd9c8', n: 'Collections', sub: n ? `${n}/${C.total()} found · ${done} set${done === 1 ? '' : 's'} done` : 'Find cards, records, plates...', hot: c.fresh.length ? 'New' : '' };
  };
  C.html = function () {
    const c = st(), img = k => (typeof ART !== 'undefined' && ART.iconURL[k]) ? `<img alt="" src="${ART.iconURL[k]}">` : '';
    return `<div class="kick">Collections · ${C.count()}/${C.total()}</div><h3>Your collections</h3>
      <p class="mp dim">Things worth keeping turn up while you loot and walk. A new one files itself when you get home - no bag space. Doubles: sell them to Dot or gift them to a friend. A full set: ${SET_CAPS} caps + a capsule token. All six: ${ALL_CAPS} caps + 3 tokens.</p>
      <div class="cllist">${Object.keys(SETS).map(set => {
        const S0 = SETS[set], n = have(set), done = !!c.done[set];
        return `<div class="clset${done ? ' done' : ''}"><div class="clhead"><b>${S0.g} ${esc(S0.n)}</b><em>${done ? 'Complete ✓' : n + '/5'}</em></div>
          <div class="clrow">${S0.p.map((p, i) => { const k = keyOf(set, i), got = !!c.got[k], nw = c.fresh.includes(k);
            return `<div class="clp${got ? ' got' : ''}${nw ? ' nw' : ''}${i === 4 ? ' gold' : ''}">${got ? img(k) : '<span>?</span>'}<small>${got ? esc(p[0]) : i === 4 ? 'Rare' : '???'}</small></div>`; }).join('')}</div>
          <p class="clwhere">${S0.walk ? '🚶 ' : '🔎 '}${esc(S0.where)}</p></div>`;
      }).join('')}</div>`;
  };
  C.bind = function () { const c = st(); if (c && c.fresh.length) { c.fresh = []; G().save(); } };
  const css = document.createElement('style'); css.textContent = `
    .cllist { display: grid; gap: 8px; margin: 6px 0 10px; } .clset { padding: 9px 10px 8px; border-radius: 14px; background: rgba(17,20,47,.65); border: 2px solid #3d2d61; }
    .clset.done { border-color: #e0b94a; } .clhead { display: flex; justify-content: space-between; align-items: center; }
    .clhead b { font-size: 14px; font-weight: 900; color: var(--crm, #f6e3bb); } .clhead em { font-style: normal; font-size: 12px; font-weight: 900; color: #7fd9c8; } .clset.done .clhead em { color: #e0b94a; }
    .clrow { display: grid; grid-template-columns: repeat(5, 1fr); gap: 5px; margin: 7px 0 4px; }
    .clp { position: relative; display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 5px 2px 4px; border-radius: 10px; background: #11142f; border: 2px dashed #3d2d61; min-height: 72px; }
    .clp.got { border: 2px solid #7fd9c8; background: rgba(127,217,200,.08); } .clp.gold.got { border-color: #e0b94a; background: rgba(224,185,74,.12); }
    .clp img { width: 42px; height: 42px; } .clp > span { height: 42px; line-height: 42px; font-size: 22px; font-weight: 900; color: #3d2d61; }
    .clp small { font-size: 9px; font-weight: 800; line-height: 1.15; text-align: center; color: var(--mute, #9d90bf); } .clp.got small { color: var(--crm, #f6e3bb); }
    .clp.nw::after { content: 'NEW'; position: absolute; top: -6px; right: -4px; padding: 1px 4px; border-radius: 5px; background: #d9483a; color: #fff; font: 900 8px Inter, system-ui, sans-serif; }
    .clwhere { margin: 2px 0 0; font-size: 11px; font-weight: 700; color: var(--mute, #9d90bf); }`;
  document.head.appendChild(css);
})();
