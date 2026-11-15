/* Dead Miles (next) 0.26 - the capsule machine (gachapon) and Deck the base (holiday decorating event).
   Capsule machine (home card): spend a token for a random cosmetic from the machine's line (D.COS src 'gacha'), plus
   the running holiday's capsules (src 'gacha' with ev = the event). While a holiday runs, 1 pull in 4 is a piece of
   holiday decor instead. Odds: common 55, rare 30, epic 12, legendary 3; 10 pulls in a row without an epic or better
   -> the next one is (pity). Cosmetics you do not own come first; a duplicate is sold to Dot (Game.unlockCos).
   Tokens: 1 per 4,000 steps walked (SV.walked, the same total Dot and quests use), at most 3 a day - the same for
   everyone - or 50 caps each. New saves start with 1.
   Deck the base (home card while a holiday with decor runs): place that holiday's decor at the base. 2 / 5 / 8 pieces
   placed -> 2 tokens + 40 caps / 3 tokens + 80 caps / the holiday's legendary cosmetic (ev.deckCos) + 100 caps.
   Claimed per event and year. Decor comes from Dot's holiday shelf, holiday houses and capsules.
   Save: SV.gacha = { tok, at, day, dayTok, pulls, pity }, SV.deck = { 'thanksgiving-2026': [tiers claimed] }. */
'use strict';
window.DM = window.DM || {};
(() => {
  const D = DM.D, E = DM.E, $ = E.$, SFX = E.SFX, toast = E.toast;
  const GA = DM.Gacha = {};
  const STEP = 4000, DAY_MAX = 3, PRICE = 50, PITY = 10;
  const ODDS = { c: 55, r: 30, e: 12, l: 3 };
  const RCOL = { c: '#cfc4ec', r: '#7ec0ee', e: '#b98cf0', l: '#ffd27a' };
  const G = () => DM.Game, SV = () => G() && G().data(), U = () => G().ui;
  const EVA = () => D.EV;
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = n => Math.round(n).toLocaleString('en-US');

  function st() {
    const v = SV(); if (!v || !v.survivor) return null;
    if (!v.gacha) v.gacha = { tok: 1, at: v.walked || 0, day: v.day.key, dayTok: 0, pulls: 0, pity: 0 };
    const g = v.gacha;
    if (g.day !== v.day.key) { g.day = v.day.key; g.dayTok = 0; }
    while ((v.walked || 0) - g.at >= STEP) { g.at += STEP; if (g.dayTok < DAY_MAX) { g.tok++; g.dayTok++; } }
    if (g.dayTok >= DAY_MAX) g.at = Math.max(g.at, (v.walked || 0) - STEP + 1);   // full for today: steps past the cap do not bank
    return g;
  }
  GA.state = st;
  const nextIn = g => g.dayTok >= DAY_MAX ? 0 : Math.max(1, Math.ceil(STEP - ((SV().walked || 0) - g.at)));
  // the machine's line right now
  function pool() {
    const ev = EVA() && EVA().id;
    return Object.keys(D.COS).filter(k => D.COS[k].src === 'gacha' && (!D.COS[k].ev || D.COS[k].ev === ev));
  }
  GA.pool = pool;
  const own = () => SV().survivor.wardrobe.own;
  function roll(g) {
    const ev = EVA(), decor = ev && ev.ev.decor;
    if (decor && Math.random() < .25) return { decor: decor[Math.floor(Math.random() * decor.length)] };
    const P = pool(), forced = g.pity >= PITY - 1;
    const odds = forced ? { e: 80, l: 20 } : ODDS;
    const rs = Object.keys(odds).filter(r => P.some(k => D.COS[k].r === r));
    let v = Math.random() * rs.reduce((a, r) => a + odds[r], 0), r = rs[rs.length - 1];
    for (const x of rs) { v -= odds[x]; if (v <= 0) { r = x; break; } }
    let pick = P.filter(k => D.COS[k].r === r); const fresh = pick.filter(k => !own()[k]); if (fresh.length) pick = fresh;
    return { cos: pick[Math.floor(Math.random() * pick.length)] };
  }
  function pull() {
    const g = st(); if (!g || g.tok < 1) return;
    g.tok--; g.pulls++;
    const res = roll(g);
    if (res.cos) {
      const C = D.COS[res.cos], had = !!own()[res.cos];
      g.pity = C.r === 'e' || C.r === 'l' ? 0 : g.pity + 1;
      G().unlockCos('cos_' + res.cos);   // a duplicate is sold to Dot there (with its own toast)
      res.dup = had;
    } else {
      g.pity++;
      const lost = G().routeApi.toStash([{ k: res.decor, n: 1 }]);
      res.lost = lost && lost.length;
    }
    lastRes = res; lastAt = Date.now(); G().save(); SFX.play('pick'); sheet(res);
  }
  function buy() {
    const v = SV(), g = st(); if (!g) return;
    if (v.trader.caps < PRICE) { toast(`A token is ${PRICE} caps`, 1.8); return; }
    v.trader.caps -= PRICE; g.tok++; G().save(); SFX.play('ui'); sheet();
  }
  // ---------------------------------------------------------------- UI
  const CAPSULE = (c1, c2) => `<svg viewBox="0 0 64 64" width="44" height="44"><circle cx="32" cy="32" r="22" fill="${c2}" stroke="#11142f" stroke-width="4"/><path d="M10 32 A22 22 0 0 1 54 32 Z" fill="${c1}" stroke="#11142f" stroke-width="4"/><path d="M18 22 q6 -6 14 -6" stroke="rgba(255,255,255,.6)" stroke-width="3" fill="none" stroke-linecap="round"/></svg>`;
  GA.cardHTML = function () {
    const g = st(); if (!g) return '';
    const ev = EVA(), n = nextIn(g);
    return `<div class="hcard gacha" id="gaCard"><div class="bicon gaicon">${CAPSULE(ev ? ev.ev.accent.c : '#f07aa8', '#f6e3bb')}</div>
      <div class="hinfo"><div class="hname">Capsule machine${ev && pool().some(k => D.COS[k].ev) ? ` <em>${esc(ev.ev.short || ev.ev.name)} capsules</em>` : ''}</div>
        <div class="haddr">A random cosmetic${ev && ev.ev.decor ? ' or holiday decor' : ''} for a token</div>
        <div class="hmeta"><span><b>${g.tok}</b> token${g.tok === 1 ? '' : 's'}</span><span>${n ? `next in ${fmt(n)} steps` : 'Step tokens done for today'}</span></div></div>
      <div class="hbtns"><button class="mbtn${g.tok ? '' : ' ghost'}" id="gaOpen">${g.tok ? 'Pull' : 'Look'}</button></div></div>`;
  };
  GA.bind = function (root) { const b = (root || document).querySelector('#gaOpen'); if (b) b.onclick = () => { SFX.play('ui'); sheet(); G().tip('gacha'); }; const d = (root || document).querySelector('#dkOpen'); if (d) d.onclick = () => { SFX.play('ui'); deckSheet(); G().tip('deck'); }; };
  // 0.26.5 (owner: "Capsule machine should be in its own tab"): the machine draws inside the Capsules tab (host);
  // anywhere else (e.g. opened from a card) it is a sheet as before.
  let host = null;
  let lastRes = null, lastAt = 0;   // the last pull stays on the tab while the page redraws (a new cosmetic redraws home)
  GA.renderPane = function (el) { host = el; sheet(Date.now() - lastAt < 20000 ? lastRes : undefined); };
  function sheet(res) {
    const g = st(), v = SV(), P = pool(), w = own(), ev = EVA();
    const got = P.filter(k => w[k]).length;
    const resHTML = !res ? '' : res.cos
      ? `<div class="garesult" style="--rc:${RCOL[D.COS[res.cos].r]}"><div class="gaitem">${U().icon('cos_' + res.cos)}</div><div><i>${D.RARITY[D.COS[res.cos].r].n}</i><b>${esc(D.COS[res.cos].n)}</b><span>${res.dup ? 'You had it already - Dot bought the spare' : 'New! It is in your wardrobe'}</span></div></div>`
      : `<div class="garesult" style="--rc:#f07aa8"><div class="gaitem">${U().icon(res.decor)}</div><div><i>Holiday decor</i><b>${esc(D.ITEMS[res.decor].n)}</b><span>${res.lost ? 'Your stash is full - it was left behind' : 'In your stash - place it at the base'}</span></div></div>`;
    const inTab = host && document.body.contains(host) && G().ui && document.querySelector('#mtabs [data-t="gacha"].on');
    (inTab ? h => { host.innerHTML = `<div class="mcard gatab">${h}</div>`; } : U().sheetOpen)(`<div class="kick">Capsule machine${ev && P.some(k => D.COS[k].ev) ? ' · ' + esc(ev.ev.name) + ' capsules in' : ''}</div>
      <h3>${g.tok} token${g.tok === 1 ? '' : 's'}</h3>${resHTML}
      <p class="mp dim">1 token per ${fmt(STEP)} steps (up to ${DAY_MAX} a day${g.dayTok >= DAY_MAX ? ' - done for today' : `, next in ${fmt(nextIn(g))}`}), or ${PRICE} caps. Epic or better at least every ${PITY} pulls (${PITY - g.pity} to go).</p>
      <div class="gapool">${P.map(k => `<span class="gap${w[k] ? ' own' : ''}" style="--rc:${RCOL[D.COS[k].r]}" title="${esc(D.COS[k].n)}">${U().icon('cos_' + k)}</span>`).join('')}</div>
      <p class="mp dim">${got}/${P.length} collected${ev && ev.ev.decor ? ` · 1 pull in 4 is ${esc(ev.ev.name)} decor` : ''}</p>
      <div class="btnrow">${inTab ? '' : '<button class="mbtn sm ghost" id="gaClose">Close</button>'}<button class="mbtn sm ghost" id="gaBuy">Buy · ${PRICE} caps</button><button class="mbtn sm" id="gaPull"${g.tok ? '' : ' disabled'}>Pull</button></div>`);
    if ($('#gaClose')) $('#gaClose').onclick = () => { U().sheetClose(); G().renderHome(); };
    if (inTab) G().tip('gacha');
    $('#gaBuy').onclick = buy; $('#gaPull').onclick = pull;
  }
  GA.open = sheet;

  // ---------------------------------------------------------------- Deck the base
  const TIERS = [{ n: 2, tok: 2, caps: 40 }, { n: 5, tok: 3, caps: 80 }, { n: 8, cos: 1, caps: 100 }];
  function deck() {
    const ev = EVA(), v = SV(); if (!ev || !ev.ev.decor || !v || !v.survivor || !v.base) return null;
    v.deck = v.deck || {}; const key = ev.id + '-' + ev.y; v.deck[key] = v.deck[key] || [];
    const placed = (v.base.decor || []).filter(o => D.DECOR[o.k] && D.DECOR[o.k].ev === ev.id).length;
    return { ev, key, placed, got: v.deck[key] };
  }
  GA.deck = deck;
  GA.deckHTML = function () {
    const d = deck(); if (!d) return '';
    const ready = TIERS.filter((t, i) => d.placed >= t.n && !d.got.includes(i)).length, next = TIERS.find((t, i) => !d.got.includes(i));
    return `<div class="hcard deck" id="dkCard" style="--evc:${d.ev.ev.accent.c}"><div class="bicon gaicon">${U().icon(d.ev.ev.decor[0])}</div>
      <div class="hinfo"><div class="hname">Deck the base <em>${esc(d.ev.ev.name)}</em></div>
        <div class="haddr">Place ${esc(d.ev.ev.name)} decor at your base for prizes</div>
        <div class="hmeta"><span><b>${d.placed}</b> placed</span><span>${ready ? `<b class="hot">${ready} prize${ready > 1 ? 's' : ''} to claim</b>` : next ? `next prize at ${next.n}` : 'all prizes claimed'}</span></div>
        <div class="mbar"><i style="width:${Math.min(100, d.placed / TIERS[TIERS.length - 1].n * 100)}%"></i></div></div>
      <div class="hbtns"><button class="mbtn${ready ? '' : ' ghost'}" id="dkOpen">${ready ? 'Claim' : 'Prizes'}</button></div></div>`;
  };
  function deckSheet() {
    const d = deck(); if (!d) return;
    const pr = t => t.cos ? `${U().icon('cos_' + d.ev.ev.deckCos)} ${esc(D.COS[d.ev.ev.deckCos].n)} (legendary) + ${t.caps} caps` : `${t.tok} capsule tokens + ${t.caps} caps`;
    U().sheetOpen(`<div class="kick">${esc(d.ev.ev.name)} · Deck the base</div><h3>${d.placed} piece${d.placed === 1 ? '' : 's'} placed</h3>
      <div class="dklist">${TIERS.map((t, i) => `<div class="dkrow${d.got.includes(i) ? ' done' : ''}"><b>${t.n} pieces</b><span>${pr(t)}</span>${d.got.includes(i) ? '<em>Claimed</em>' : d.placed >= t.n ? `<button class="mbtn sm" data-dk="${i}">Claim</button>` : `<em>${t.n - d.placed} to go</em>`}</div>`).join('')}</div>
      <p class="mp dim">Holiday decor: Dot's holiday shelf, ${esc(d.ev.ev.name)} houses (storage, pantries, closets) and the capsule machine. Place it from Base &gt; Decor. Pieces you put away stop counting, but prizes stay claimed.</p>
      <div class="dkdecor">${d.ev.ev.decor.map(k => `<span title="${esc(D.ITEMS[k].n)}">${U().icon(k)}<i>${esc(D.ITEMS[k].n)}</i></span>`).join('')}</div>
      <div class="btnrow"><button class="mbtn sm ghost" id="dkClose">Close</button></div>`);
    $('#dkClose').onclick = () => { U().sheetClose(); G().renderHome(); };
    document.querySelectorAll('[data-dk]').forEach(b => b.onclick = () => claim(+b.dataset.dk));
  }
  function claim(i) {
    const d = deck(), t = TIERS[i]; if (!d || d.got.includes(i) || d.placed < t.n) return;
    const v = SV(); d.got.push(i); v.trader.caps += t.caps;
    if (t.tok) { st().tok += t.tok; toast(`+${t.tok} capsule tokens, +${t.caps} caps`, 2.2); }
    if (t.cos) G().unlockCos('cos_' + d.ev.ev.deckCos);
    G().save(); SFX.play('pick'); deckSheet();
  }
})();
