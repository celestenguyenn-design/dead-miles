/* Dead Miles (next) 0.58 - trades: Farming, Chef and Crafting levels + cooking (owner: "we already have such an abundance of
   food. We should be able to craft them into recipes and add a farming level, a chef level, crafting level ... kind of like
   giving it progression").
   - Each trade levels up on its own (level = 1 + floor(sqrt(xp / 25)), max 20).
     Farming: XP per crop harvested. Perks: +1 crop every 4 levels, seeds come back more often (50% -> up to 90%).
     Chef: XP per meal cooked. Perks: recipes unlock by chef level, and a growing chance of a second portion (4% a level).
     Crafting: XP per workbench craft. Perks: crafted weapons come out better (+1 tier at 6, +2 at 14), a chance to get a
       material back (2% a level), and repairs cost 1 scrap less from level 5.
   - Cooking: the Kitchen on the Workbench tab turns crops (and a few pantry things) into meals that heal and fill you a
     lot more than raw food.
   Save: SV.trades = { farm, chef, craft } (XP). */
'use strict';
window.DM = window.DM || {};
(() => {
  const T = DM.Trades = {};
  const D = DM.D, G = () => DM.Game, SV = () => DM.Game && DM.Game.data();
  const toast = (m, s) => DM.E && DM.E.toast && DM.E.toast(m, s || 2.4);
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const MAX = 20;
  T.INFO = {
    farm: { n: 'Farming', g: '🌱', c: '#93c45a', how: 'harvest crops at your base' },
    chef: { n: 'Chef', g: '🍳', c: '#f0b25a', how: 'cook meals in the Kitchen (Workbench tab)' },
    craft: { n: 'Crafting', g: '🔨', c: '#9fe0e6', how: 'craft at the Workbench' },
  };
  function st() { const v = SV(); if (!v) return null; v.trades = v.trades || {}; const t = v.trades; for (const k in T.INFO) t[k] = +t[k] || 0; return t; }
  T.lvl = k => { const t = st(); return t ? Math.min(MAX, 1 + Math.floor(Math.sqrt(t[k] / 25))) : 1; };
  T.need = L => 25 * L * L;   // XP at which level L + 1 starts
  T.gain = function (k, n) {
    const t = st(); if (!t || !n) return; const l0 = T.lvl(k); t[k] += n; const l1 = T.lvl(k);
    if (l1 > l0) { const I = T.INFO[k]; setTimeout(() => toast(`${I.g} ${I.n} level ${l1}! ${T.perkLine(k, l1)}`, 3.2), 600); try { DM.E.SFX.play('pick'); } catch (e) { /* ignore */ } if (DM.Journal) DM.Journal.note(`Reached ${I.n.toLowerCase()} level ${l1}.`); }
  };
  T.perkLine = (k, L = T.lvl(k)) => k === 'farm' ? `+${Math.floor(L / 4)} crop a harvest · seeds back ${Math.round(T.seedChance(L) * 100)}%`
    : k === 'chef' ? `${Object.values(T.MEALS).filter(m => m.lv <= L).length}/${Object.keys(T.MEALS).length} recipes · ${Math.round(T.extraPortion(L) * 100)}% chance of a second portion`
    : `${T.craftTier(L) ? `crafted weapons +${T.craftTier(L)} tier · ` : ''}${Math.round(T.refund(L) * 100)}% chance to save a material${L >= 5 ? ' · repairs 1 scrap cheaper' : ''}`;
  // perks
  T.cropBonus = (L = T.lvl('farm')) => Math.floor(L / 4);
  T.seedChance = (L = T.lvl('farm')) => Math.min(.9, .5 + .025 * (L - 1));
  T.extraPortion = (L = T.lvl('chef')) => Math.min(.6, .04 * (L - 1));
  T.craftTier = (L = T.lvl('craft')) => L >= 14 ? 2 : L >= 6 ? 1 : 0;
  T.refund = (L = T.lvl('craft')) => Math.min(.4, .02 * (L - 1));
  T.repairCut = (L = T.lvl('craft')) => L >= 5 ? 1 : 0;

  // ---------------------------------------------------------------- meals
  // lv = chef level needed; in = ingredients; xp = chef XP
  T.MEALS = {
    meal_baked: { n: 'Baked potatoes', lv: 1, in: { potato: 2 }, hp: 14, hu: 45, xp: 8, col: ['#c9a06a', '#f6e3bb'] },
    meal_tea: { n: 'Herb tea', lv: 1, in: { herbs: 1, water: 1 }, hp: 8, sta: 70, th: 50, xp: 8, col: ['#7c9a4c', '#c9e3a0'] },
    meal_stew: { n: 'Veggie stew', lv: 2, in: { tomato: 1, potato: 1, carrot: 1 }, hp: 28, hu: 65, th: 15, xp: 14, col: ['#d9483a', '#f07b3c'] },
    meal_chowder: { n: 'Corn chowder', lv: 3, in: { corn: 2, potato: 1, water: 1 }, hp: 22, hu: 60, th: 30, xp: 16, col: ['#e0b94a', '#f6e3bb'] },
    meal_salsa: { n: 'Salsa & chips', lv: 4, in: { tomato: 2, herbs: 1, snack: 1 }, hp: 12, sta: 35, hu: 40, xp: 16, col: ['#d9483a', '#e0b94a'] },
    meal_cake: { n: 'Carrot cake', lv: 5, in: { carrot: 2, corn: 1 }, hp: 18, sta: 45, hu: 50, xp: 18, col: ['#f07b3c', '#f6e3bb'] },
    meal_pie: { n: 'Pot pie', lv: 7, in: { potato: 1, carrot: 1, corn: 1, beans: 1 }, hp: 42, hu: 85, xp: 26, col: ['#c9803e', '#e8a35a'] },
    meal_broth: { n: 'Healing broth', lv: 9, in: { herbs: 2, carrot: 1, water: 1 }, hp: 50, th: 40, xp: 28, cure: 0, col: ['#b48a28', '#93a86c'] },
    meal_feast: { n: "Survivor's feast", lv: 12, in: { tomato: 2, potato: 2, corn: 1, herbs: 2 }, hp: 75, sta: 100, hu: 100, th: 40, xp: 45, col: ['#d9483a', '#93a86c'] },
  };
  const S = '#11142f';
  const ICONS = {};
  for (const k in T.MEALS) {
    const m = T.MEALS[k];
    D.ITEMS[k] = { n: m.n, i: k, use: m.th && !m.hu ? 'Drink' : 'Eat', hp: m.hp, sta: m.sta, hu: m.hu, th: m.th, tag: 'home-cooked' };
    D.VALUE[k] = Math.round(4 + m.xp / 3); D.STACK[k] = 6;
    const [a, b] = m.col;
    ICONS[k] = k === 'meal_tea'
      ? `<path d="M-18,-8 h30 v16 q0,14 -15,14 q-15,0 -15,-14 Z" fill="#f6e3bb" stroke="${S}" stroke-width="2.6"/><path d="M12,-2 q10,0 10,8 q0,8 -10,6" fill="none" stroke="${S}" stroke-width="2.6"/><ellipse cx="-3" cy="-8" rx="15" ry="3.4" fill="${a}" stroke="${S}" stroke-width="2"/><path d="M-8,-14 q-4,-6 0,-12 M2,-14 q-4,-6 0,-12" stroke="#cfc4ec" stroke-width="2" fill="none" opacity=".8"/>`
      : k === 'meal_cake'
        ? `<path d="M-22,6 L0,-14 L22,6 L22,18 L-22,18 Z" fill="${b}" stroke="${S}" stroke-width="2.6" stroke-linejoin="round"/><path d="M-22,6 L22,6" stroke="${a}" stroke-width="4"/><path d="M-22,12 L22,12" stroke="#c9803e" stroke-width="3"/><path d="M0,-14 l-3,-6 M0,-14 l4,-5" stroke="#7c9a4c" stroke-width="2.4"/><circle cx="0" cy="-15" r="3" fill="#f07b3c" stroke="${S}" stroke-width="1.6"/>`
      : k === 'meal_pie'
        ? `<ellipse cx="0" cy="8" rx="26" ry="10" fill="#9aa0b4" stroke="${S}" stroke-width="2.6"/><ellipse cx="0" cy="2" rx="22" ry="10" fill="${b}" stroke="${S}" stroke-width="2.6"/><path d="M-10,0 l4,4 M2,-4 l4,4 M8,2 l4,4" stroke="${a}" stroke-width="2.4"/>`
      : `<path d="M-26,-2 Q-24,22 0,22 Q24,22 26,-2 Z" fill="#f6e3bb" stroke="${S}" stroke-width="2.6" stroke-linejoin="round"/><ellipse cx="0" cy="-2" rx="26" ry="7" fill="${a}" stroke="${S}" stroke-width="2.6"/>
        <circle cx="-9" cy="-3" r="3.4" fill="${b}" stroke="${S}" stroke-width="1.4"/><circle cx="6" cy="-4" r="3" fill="${b}" stroke="${S}" stroke-width="1.4"/><circle cx="14" cy="-1" r="2.4" fill="#7c9a4c"/>
        <path d="M-6,-12 q-4,-6 0,-12 M6,-12 q-4,-6 0,-12" stroke="#cfc4ec" stroke-width="2" fill="none" opacity=".7"/>`;
  }
  if (typeof ART !== 'undefined' && ART.addIcons) ART.addIcons(ICONS);

  const has = (m) => Object.keys(m.in).every(k => G().countItem(k) >= m.in[k]);
  T.cook = function (k) {
    const m = T.MEALS[k], L = T.lvl('chef'); if (!m) return;
    if (m.lv > L) return toast(`Chef level ${m.lv} to cook that`, 1.8);
    if (!has(m)) return toast('Missing ingredients', 1.4);
    for (const i in m.in) G().takeItems(i, m.in[i]);
    const n = 1 + (Math.random() < T.extraPortion(L) ? 1 : 0), lost = G().give(k, n);
    T.gain('chef', m.xp); if (DM.Skills && DM.Skills.addXP) DM.Skills.addXP(2); G().save();
    try { DM.E.SFX.play('open'); } catch (e) { /* ignore */ }
    toast(`Cooked ${m.n.toLowerCase()}${n > 1 ? ' - a second portion!' : ''}${lost ? ' (no room for some)' : ''}`, 2);
  };
  // the Kitchen section (Workbench tab)
  T.kitchenHTML = function (icon) {
    const L = T.lvl('chef'), crops = ['tomato', 'potato', 'carrot', 'corn', 'herbs'].map(k => `${icon(k)}<b>${G().countItem(k)}</b>`).join(' ');
    return `<div class="kick sect">Kitchen · 🍳 Chef level ${L}</div><div class="benchhint">Cook your harvest into meals - they heal and fill you far more than raw food. Your crops: <span class="ktcrops">${crops}</span></div>`
      + Object.keys(T.MEALS).map(k => {
        const m = T.MEALS[k], open = m.lv <= L, ok = open && has(m), it = D.ITEMS[k];
        const fx = [m.hp ? `+${m.hp} HP` : '', m.sta ? `+${m.sta} stamina` : '', m.hu ? `+${m.hu} hunger` : '', m.th ? `+${m.th} thirst` : ''].filter(Boolean).join(' · ');
        return `<div class="recipe${ok ? '' : ' no'}${open ? '' : ' locked'}"><div class="rout">${icon(k)}</div>
          <div class="rinfo"><b>${esc(it.n)}</b><div class="ktfx">${fx}</div>${open ? `<div class="rin">${Object.keys(m.in).map(i => { const hv = G().countItem(i); return `<span class="${hv >= m.in[i] ? 'ok' : 'miss'}">${icon(i)}<i>${D.ITEMS[i].n}</i> ${hv}/${m.in[i]}</span>`; }).join('')}</div>` : `<div class="bpneed">Chef level ${m.lv}</div>`}</div>
          ${open ? `<button class="mbtn sm${ok ? '' : ' ghost'}" data-cook="${k}"${ok ? '' : ' disabled'}>Cook</button>` : '<span class="rlock">🔒</span>'}</div>`;
      }).join('');
  };
  T.bindKitchen = (root, re) => root.querySelectorAll('[data-cook]').forEach(b => b.onclick = e => { e.stopPropagation(); T.cook(b.dataset.cook); re(); });
  // the Gear tab: your three trades
  T.gearHTML = function () {
    const t = st(); if (!t) return '';
    return Object.keys(T.INFO).map(k => {
      const I = T.INFO[k], L = T.lvl(k), lo = T.need(L - 1), hi = T.need(L), pct = L >= MAX ? 100 : Math.round((t[k] - lo) / (hi - lo) * 100);
      return `<div class="gline trl"><span class="gi">${I.g}</span><div><b>${I.n} · level ${L}</b><span>${esc(T.perkLine(k, L))}</span><div class="trbar"><i style="width:${pct}%;background:${I.c}"></i></div><small>${L >= MAX ? 'Maxed' : `${Math.round(t[k])}/${hi} XP · ${I.how}`}</small></div></div>`;
    }).join('');
  };
  const css = document.createElement('style'); css.textContent = `
    .trl small { display: block; font-size: 10px; font-weight: 800; color: var(--mute, #9d90bf); margin-top: 2px; }
    .trbar { height: 6px; margin-top: 4px; border-radius: 4px; background: #11142f; overflow: hidden; } .trbar i { display: block; height: 100%; }
    .ktfx { font-size: 11px; font-weight: 800; color: #a9c46a; margin: 1px 0 3px; } .ktcrops img { width: 18px; height: 18px; vertical-align: -4px; } .ktcrops b { margin-right: 6px; }`;
  document.head.appendChild(css);
})();
