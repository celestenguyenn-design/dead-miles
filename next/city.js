/* Dead Miles (next) 0.63 - the city and co-op (owner: "I love the weekly city horde and reclaim the neighborhood";
   "long distance survivors ... make sure it cannot be unlocked by ONE person only and it has to be a coop thing").
   Server: next/city.sql (next_city_report / next_city_get, next_pair_ask / _answer / _leave / _sync).
   Only REAL steps count (phone, watch, map walking) - typed steps never reach any of this.
   - Reclaim the neighborhood: pick your neighborhood once (a list - never a location). Everyone's weekly steps there
     push the infection back: 60,000 steps a player clears it. A cleared neighborhood pays its walkers at week's end.
   - City horde: one goal for the whole city each week (horde-night week, ends Sunday 9 PM New York). Reach it together
     and everyone who walked 5,000+ that week gets caps + capsule tokens.
   - Long-distance survivors: two players pair up (both must say yes). The shared safehouse only grows by the steps of
     the partner who walked LESS - one person alone can never unlock anything. Radio contact: both walk 3,000+ the same
     day -> a capsule token each. One partner at a time.
   Save: SV.city = { hood, days: { 'YYYY-MM-DD': realSteps }, wkClaim: {}, hoodClaim: {}, pair: { tiers: { id: [..] }, day: {} } }. */
'use strict';
window.DM = window.DM || {};
(() => {
  const C = DM.City = {};
  const D = DM.D, G = () => DM.Game, SV = () => DM.Game && DM.Game.data(), N = () => window.NET, H = () => DM.Horde;
  const toast = (m, s) => DM.E && DM.E.toast && DM.E.toast(m, s || 2.6);
  const sfx = k => { try { DM.E.SFX.play(k); } catch (e) { /* ignore */ } };
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = n => Math.round(n).toLocaleString('en-US');
  const pad = n => String(n).padStart(2, '0');
  const iso = (d = new Date()) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const HOOD_STEPS = 60000, CITY_MIN = 200000, CITY_PER = 45000, CITY_SHARE = 5000;
  C.HOODS = [
    ['Brooklyn', ['Bed-Stuy', 'Bushwick', 'Crown Heights', 'Flatbush', 'Williamsburg', 'Park Slope', 'Fort Greene', 'Sunset Park', 'Bay Ridge', 'Greenpoint', 'East New York', 'Brownsville', 'Canarsie', 'Coney Island']],
    ['Manhattan', ['Harlem', 'Washington Heights', 'Upper West Side', 'Upper East Side', 'Midtown', 'Lower East Side', 'Downtown']],
    ['Queens', ['Astoria', 'Long Island City', 'Ridgewood', 'Jamaica', 'Flushing']],
    ['The rest of New York', ['The Bronx', 'Staten Island']],
    ['Georgia', ['Atlanta', 'Savannah', 'Augusta', 'Athens', 'Macon', 'Elsewhere in Georgia']],
    ['Elsewhere', ['New Jersey', 'Somewhere else']],
  ];
  const TIERS = [
    { need: 15000, n: 'The radio', d: 'A crackly two-way radio between your bases.', caps: 60, tok: 1, items: [['d_tv', 1]] },
    { need: 50000, n: 'The supply line', d: 'You leave crates for each other on the way.', caps: 120, tok: 2, items: [['backpack', 1]] },
    { need: 120000, n: 'The safehouse', d: 'A place halfway between you, stocked and safe.', caps: 200, tok: 3, items: [['cos_cape', 1]] },
    { need: 250000, n: 'Ride or die', d: 'Whatever happens, you have each other\'s back.', caps: 300, tok: 5, items: [['cos_batwings', 1]] },
  ];
  C.TIERS = TIERS;
  function st() { const v = SV(); if (!v) return null; v.city = v.city || {}; const c = v.city; c.days = c.days || {}; c.wkClaim = c.wkClaim || {}; c.hoodClaim = c.hoodClaim || {}; c.pair = c.pair || {}; c.pair.tiers = c.pair.tiers || {}; c.pair.day = c.pair.day || {}; return c; }
  const real = v => { const d = v.day || {}; return Math.round((d.phone || 0) + (d.walk || 0)); };
  const signed = () => { const n = N(); return !!(n && n.ok && n.handle && n.token); };
  // ---------------------------------------------------------------- weeks
  const wkNow = () => { const n = H() && H().next(); return n ? n : null; };
  const wkPrev = () => { const p = H() && H().prev(); return p ? p : null; };
  function stepsIn(w) {   // real steps on the local days of the horde week ending at w.at
    const c = st(); if (!c || !w) return 0; const end = w.at, start = end - 7 * 864e5; let s = 0;
    for (const k in c.days) { const [y, m, d] = k.split('-').map(Number), noon = new Date(y, m - 1, d, 12).getTime(); if (noon > start && noon <= end) s += c.days[k]; }
    return s;
  }
  C.weekSteps = () => stepsIn(wkNow());
  // ---------------------------------------------------------------- server calls (cached)
  let cityCache = { week: '', at: 0, data: null }, prevCache = { week: '', data: null }, pairCache = { at: 0, data: null }, lastReport = 0, busy = false;
  async function rpc(fn, args) { const n = N(); return n.rpc(fn, args); }
  async function report(force) {
    const v = SV(), c = st(); if (!v || !c || !signed() || busy) return; if (!force && Date.now() - lastReport < 3 * 60e3) return;
    busy = true; lastReport = Date.now(); const n = N(), w = wkNow();
    try {
      if (c.hood && w) await rpc('next_city_report', { p_handle: n.handle, p_token: n.token, p_week: w.week, p_hood: c.hood, p_steps: C.weekSteps() });
      const y = iso(new Date(Date.now() - 864e5)); if (c.days[y] && !c.pair.sentY) { await rpc('next_pair_sync', { p_handle: n.handle, p_token: n.token, p_day: y, p_steps: c.days[y] }); c.pair.sentY = 1; }
      const r = await rpc('next_pair_sync', { p_handle: n.handle, p_token: n.token, p_day: iso(), p_steps: c.days[iso()] || 0 }); if (r && r.ok) pairCache = { at: Date.now(), data: r };
      if (w) { const g = await rpc('next_city_get', { p_week: w.week }); if (g && g.ok) cityCache = { week: w.week, at: Date.now(), data: g }; }
      const p = wkPrev(); if (p && prevCache.week !== p.week) { const g = await rpc('next_city_get', { p_week: p.week }); if (g && g.ok) prevCache = { week: p.week, data: g }; }
    } catch (e) { /* offline: next time */ }
    busy = false; radioBits();
  }
  C.refresh = () => report(true);
  // ---------------------------------------------------------------- tick (home screen)
  C.tick = function () {
    const v = SV(), c = st(); if (!v || !c || !v.survivor) return;
    const t = iso(); if (c.days[t] !== real(v)) { c.days[t] = Math.max(c.days[t] || 0, real(v)); if (c.pair.sentDay !== t) { c.pair.sentDay = t; c.pair.sentY = 0; } }
    const keys = Object.keys(c.days).sort(); while (keys.length > 21) delete c.days[keys.shift()];
    report(false);
  };
  // goals
  const cityGoal = d => Math.max(CITY_MIN, CITY_PER * ((d && d.players) || 0));
  const hoodRow = (d, hood) => (d && d.hoods || []).find(x => x.hood === hood) || { hood, steps: 0, n: 0 };
  const hoodPct = r => Math.min(100, Math.round(r.steps / (HOOD_STEPS * Math.max(1, r.n)) * 100));
  // last week's rewards (claimed from the sheet)
  function lastWeek() {
    const p = wkPrev(), c = st(); if (!p || !prevCache.data || prevCache.week !== p.week) return null;
    const mine = stepsIn(p), d = prevCache.data, cityOk = d.total >= cityGoal(d) && mine >= CITY_SHARE, hr = c.hood ? hoodRow(d, c.hood) : null, hoodOk = hr && hoodPct(hr) >= 100 && mine >= CITY_SHARE;
    return { week: p.week, mine, cityOk, hoodOk, cityC: !!c.wkClaim[p.week], hoodC: !!c.hoodClaim[p.week], d };
  }
  // ---------------------------------------------------------------- radio
  function radioBits() {
    const L = DM.Life; if (!L) return; const c = st(), d = cityCache.data, t = iso();
    if (d && c.hood) { const r = hoodRow(d, c.hood), pc = hoodPct(r); if (pc >= 50) L.radio(`🏙 ${c.hood} is ${pc}% cleared this week. Keep walking - the infection is pulling back.`, 'hood50' + cityCache.week); if (pc >= 100) L.radio(`🏙 ${c.hood} is CLEAR! Everyone who walked there gets paid at the end of the week.`, 'hood100' + cityCache.week); }
    const P = pairCache.data && pairCache.data.pair; if (P) { const th = (P.theirDays || {})[t] || 0, me = c.days[t] || 0; if (th >= 3000 && me < 3000) L.radio(`📻 ${P.name}: "I'm at ${fmt(th)} today. Your turn. Over."`, 'pairnudge' + t); if (th >= 3000 && me >= 3000) L.radio(`📻 Radio contact with ${P.name}! You both walked 3,000+ today - claim it in Long-distance survivors.`, 'paircontact' + t); }
    const asks = pairCache.data && pairCache.data.asks; if (asks && asks.length) L.radio(`📻 ${asks[0].name} wants to be your long-distance survivor partner.`, 'ask' + asks[0].from);
  }
  // ---------------------------------------------------------------- tiles
  C.tiles = function () {
    const v = SV(), c = st(); if (!v || !c) return [];
    const out = [], d = cityCache.data, lw = lastWeek(), claim = lw && ((lw.cityOk && !lw.cityC) || (lw.hoodOk && !lw.hoodC));
    const goal = cityGoal(d), pc = d ? Math.min(100, Math.round(d.total / goal * 100)) : null;
    out.push({ k: 'city', c: '#e0604a', n: c.hood ? `Reclaim ${c.hood}` : 'Reclaim your neighborhood', sub: !c.hood ? 'Pick your neighborhood · weekly city horde' : d ? `${hoodPct(hoodRow(d, c.hood))}% cleared · city horde ${pc}%` : signed() ? 'Loading the city...' : 'Sign in to join the city', bar: d && c.hood ? hoodPct(hoodRow(d, c.hood)) : null, hot: claim ? 'Claim' : '' });
    const pd = pairCache.data, P = pd && pd.pair, asks = pd && pd.asks && pd.asks.length;
    out.push({ k: 'coop', c: '#b98cf0', n: 'Long-distance survivors', sub: P ? `With ${P.name} · ${fmt(Math.min(P.mine, P.theirs))} shared steps` : asks ? `${pd.asks[0].name} wants to pair up!` : 'Pair up with a friend far away', hot: asks ? 'New' : P && coopClaimable(P) ? 'Claim' : '' });
    return out;
  };
  function coopClaimable(P) { const c = st(), got = c.pair.tiers[P.id] || [], sh = Math.min(P.mine, P.theirs); if (TIERS.some((t, i) => sh >= t.need && !got.includes(i))) return true; const t = iso(); return ((P.myDays || {})[t] || 0) >= 3000 && ((P.theirDays || {})[t] || 0) >= 3000 && !c.pair.day[t + ':' + P.id]; }
  C.has = k => k === 'city' || k === 'coop';
  // ---------------------------------------------------------------- the city sheet
  C.cityHTML = function () {
    const c = st();
    if (!c.hood) return `<div class="kick">Reclaim your neighborhood</div><h3>Where do you walk?</h3><p class="mp">Pick your neighborhood. Everyone's real steps there (phone and watch - typed steps don't count) push the infection back each week. Only the name goes online - never where you are.</p>
      ${C.HOODS.map(([g, list]) => `<div class="kick sect">${esc(g)}</div><div class="chips">${list.map(h => `<button class="chip" data-hood="${esc(h)}">${esc(h)}</button>`).join('')}</div>`).join('')}`;
    if (!signed()) return `<div class="kick">The city</div><h3>${esc(c.hood)}</h3><p class="mp">Sign in (Account &amp; friends) to join the city: your steps count for ${esc(c.hood)} and the weekly city horde.</p><button class="linkbtn" data-hood="">Change neighborhood</button>`;
    const d = cityCache.data, w = wkNow(), left = w ? Math.max(0, w.at - Date.now()) : 0, goal = cityGoal(d), lw = lastWeek();
    const me = C.weekSteps(), mineRow = d ? hoodRow(d, c.hood) : null;
    const rows = d ? (d.hoods || []).slice(0, 12) : [];
    return `<div class="kick">The city · this week</div><h3>${esc(c.hood)}</h3>
      ${lw && ((lw.cityOk && !lw.cityC) || (lw.hoodOk && !lw.hoodC)) ? `<div class="cyclaim"><b>Last week paid off!</b><span>${lw.cityOk && !lw.cityC ? 'The city held the horde. ' : ''}${lw.hoodOk && !lw.hoodC ? `${esc(c.hood)} was cleared. ` : ''}</span><button class="mbtn sm" id="cyClaim">Claim</button></div>` : ''}
      <div class="kick sect">🧟 City horde · ${Math.floor(left / 864e5)}d ${Math.floor(left % 864e5 / 36e5)}h left</div>
      ${d ? `<div class="cybar"><i style="width:${Math.min(100, d.total / goal * 100)}%"></i></div><p class="mp dim">${fmt(d.total)} / ${fmt(goal)} steps from ${d.players} survivor${d.players === 1 ? '' : 's'} across the city. Hold the line: everyone who walks ${fmt(CITY_SHARE)}+ this week gets 100 caps + 2 capsule tokens if the city makes it. You: ${fmt(me)}.</p>` : '<p class="mp dim">Loading...</p>'}
      <div class="kick sect">🏙 Neighborhoods</div>
      ${rows.length ? rows.map(r => { const pc = hoodPct(r); return `<div class="cyrow${r.hood === c.hood ? ' me' : ''}"><b>${esc(r.hood)}</b><span>${pc}% cleared · ${r.n} walker${r.n === 1 ? '' : 's'}</span><div class="cybar sm"><i style="width:${pc}%"></i></div></div>`; }).join('') : '<p class="mp dim">Nobody has reported yet this week - be the first.</p>'}
      ${mineRow && !rows.find(r => r.hood === c.hood) ? `<div class="cyrow me"><b>${esc(c.hood)}</b><span>${hoodPct(mineRow)}% cleared</span></div>` : ''}
      <p class="mp dim">${fmt(HOOD_STEPS)} steps a walker clears a neighborhood. Cleared at week's end: +50 caps + a capsule token for everyone there who walked ${fmt(CITY_SHARE)}+.</p>
      <button class="linkbtn" data-hood="">Change neighborhood</button>`;
  };
  C.bindCity = function (root, re) {
    const c = st();
    root.querySelectorAll('[data-hood]').forEach(b => b.onclick = () => { c.hood = b.dataset.hood || null; G().save(); sfx('ui'); if (c.hood) { toast(`You walk for ${c.hood} now`, 1.8); report(true).then(re); } re(); });
    const cl = root.querySelector('#cyClaim'); if (cl) cl.onclick = () => {
      const lw = lastWeek(); if (!lw) return; const v = SV(); let caps = 0, tok = 0;
      if (lw.cityOk && !lw.cityC) { c.wkClaim[lw.week] = 1; caps += 100; tok += 2; }
      if (lw.hoodOk && !lw.hoodC) { c.hoodClaim[lw.week] = 1; caps += 50; tok += 1; }
      v.trader.caps += caps; if (DM.Gacha) DM.Gacha.state().tok += tok; G().save(); sfx('open'); toast(`+${caps} caps, +${tok} capsule token${tok > 1 ? 's' : ''}`, 2.4); re();
    };
    if (c.hood && signed() && Date.now() - cityCache.at > 60e3) report(true).then(re);
  };
  // ---------------------------------------------------------------- the co-op sheet
  C.coopHTML = function () {
    if (!signed()) return `<div class="kick">Co-op</div><h3>Long-distance survivors</h3><p class="mp">Pair up with a friend who lives far away. Your steps build a shared safehouse - but it only grows as fast as whoever walked less, so you both have to walk. Sign in first (Account &amp; friends).</p>`;
    const pd = pairCache.data, c = st(), t = iso();
    if (!pd) return '<div class="kick">Co-op</div><h3>Long-distance survivors</h3><p class="mp dim">Tuning the radio...</p>';
    const asks = (pd.asks || []).map(a => `<div class="prow"><div><b>${esc(a.name)}</b><span>@${esc(a.from)} wants to pair up</span></div><div class="btnrow"><button class="mbtn sm" data-pyes="${esc(a.from)}">Accept</button><button class="mbtn sm ghost" data-pno="${esc(a.from)}">No</button></div></div>`).join('');
    const P = pd.pair;
    if (!P) {
      const n = N(), fr = (n.boardRows || []).filter(r => r.handle && r.handle !== n.handle).slice(0, 12);
      return `<div class="kick">Co-op</div><h3>Long-distance survivors</h3>
        <p class="mp">Pick one partner - ideally someone far away. Your real steps (phone and watch) build a shared safehouse with 4 levels of rewards, but it only grows by the steps of <b>whoever walked less</b>. Nobody can unlock it alone. Both walk 3,000+ on the same day = radio contact, a capsule token each.</p>
        ${asks ? `<div class="kick sect">Asking you</div><div class="plist">${asks}</div>` : ''}
        <div class="kick sect">Ask someone</div><div class="plist">${fr.map(r => `<div class="prow"><div><b>${esc(r.name || r.handle)}</b><span>@${esc(r.handle)}</span></div><button class="mbtn sm" data-pask="${esc(r.handle)}">Ask</button></div>`).join('') || '<div class="mp dim">No players on the board yet.</div>'}</div>
        <div class="btnrow" style="margin-top:6px"><input id="cpH" placeholder="or type their handle" maxlength="24" autocapitalize="off" autocorrect="off" spellcheck="false" style="flex:1;min-width:0"><button class="mbtn sm" id="cpAsk">Ask</button></div><p class="mp dim" id="cpMsg"></p>`;
    }
    const sh = Math.min(P.mine, P.theirs), got = c.pair.tiers[P.id] || [], myT = (P.myDays || {})[t] || 0, thT = (P.theirDays || {})[t] || 0, contact = myT >= 3000 && thT >= 3000, cdone = !!c.pair.day[t + ':' + P.id];
    const nx = TIERS.find(x => sh < x.need);
    return `<div class="kick">Co-op · since ${new Date(P.since).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div><h3>You &amp; ${esc(P.name)}</h3>
      <div class="cpduo"><div><b>You</b><span>${fmt(P.mine)} steps</span><em>${fmt(myT)} today</em></div><i>📻</i><div><b>${esc(P.name)}</b><span>${fmt(P.theirs)} steps</span><em>${fmt(thT)} today</em></div></div>
      <div class="kick sect">Shared safehouse · ${fmt(sh)} shared steps</div>
      <p class="mp dim">Shared steps = whoever walked less. ${P.mine < P.theirs ? `You're behind by ${fmt(P.theirs - P.mine)} - ${esc(P.name)} is waiting on you!` : P.theirs < P.mine ? `${esc(P.name)} is behind by ${fmt(P.mine - P.theirs)} - give them a nudge.` : 'Neck and neck.'}</p>
      ${TIERS.map((x, i) => { const ok = sh >= x.need, cl = got.includes(i); return `<div class="cptier${ok ? ' ok' : ''}${cl ? ' got' : ''}"><div><b>${i + 1}. ${esc(x.n)}</b><span>${esc(x.d)} · ${fmt(x.need)} shared steps</span><small>${x.caps} caps · ${x.tok} capsule token${x.tok > 1 ? 's' : ''} · ${x.items.map(([k]) => esc(D.ITEMS[k] ? D.ITEMS[k].n : k)).join(', ')}</small>${!ok ? `<div class="cybar sm"><i style="width:${Math.min(100, sh / x.need * 100)}%"></i></div>` : ''}</div>${cl ? '<em>✓</em>' : ok ? `<button class="mbtn sm" data-tier="${i}">Claim</button>` : ''}</div>`; }).join('')}
      <div class="kick sect">Radio contact today</div>
      <div class="cptier${contact ? ' ok' : ''}${cdone ? ' got' : ''}"><div><b>Both walk 3,000+ today</b><span>You ${fmt(Math.min(myT, 3000))}/3,000 · ${esc(P.name)} ${fmt(Math.min(thT, 3000))}/3,000</span><small>+1 capsule token and 15 caps each</small></div>${cdone ? '<em>✓</em>' : contact ? '<button class="mbtn sm" id="cpContact">Claim</button>' : ''}</div>
      ${nx ? '' : '<p class="mp">You two did it all. Ride or die.</p>'}
      <p class="mp dim">Steps sync every few minutes while the game is open. Each of you claims your own rewards.</p>
      <button class="linkbtn" id="cpLeave">End the partnership</button>`;
  };
  const ERR = { paired: 'You already have a partner.', taken: 'They already have a partner.', nobody: 'No player with that handle.', to: 'Pick someone else.', limit: 'You asked 10 people today - try tomorrow.', gone: 'That request is gone.' };
  C.bindCoop = function (root, re) {
    const n = N(), c = st(), P = pairCache.data && pairCache.data.pair, again = () => report(true).then(re);
    const ask = async (h, btn) => { const m = root.querySelector('#cpMsg'); if (btn) { btn.disabled = true; btn.textContent = '...'; } let r; try { r = await n.rpc('next_pair_ask', { p_handle: n.handle, p_token: n.token, p_to: h }); } catch (e) { r = { ok: false }; }
      if (r && r.ok && r.paired) { toast('You two are partners now!', 2.2); sfx('open'); again(); return; }
      if (btn) btn.textContent = r && r.ok ? 'Asked ✓' : 'Ask'; if (m) m.textContent = r && r.ok ? `Asked @${h.replace(/^@/, '')} - when they say yes, you're partners.` : (ERR[r && r.error] || 'Could not send it.'); };
    root.querySelectorAll('[data-pask]').forEach(b => b.onclick = () => ask(b.dataset.pask, b));
    const ab = root.querySelector('#cpAsk'); if (ab) ab.onclick = () => { const h = root.querySelector('#cpH').value.trim(); if (h) ask(h); };
    const answer = async (f, yes) => { let r; try { r = await n.rpc('next_pair_answer', { p_handle: n.handle, p_token: n.token, p_from: f, p_yes: yes }); } catch (e) { r = { ok: false }; } if (yes) toast(r && r.ok ? 'Partners! Start walking.' : (ERR[r && r.error] || 'Could not pair up'), 2.2); again(); };
    root.querySelectorAll('[data-pyes]').forEach(b => b.onclick = () => answer(b.dataset.pyes, true));
    root.querySelectorAll('[data-pno]').forEach(b => b.onclick = () => answer(b.dataset.pno, false));
    root.querySelectorAll('[data-tier]').forEach(b => b.onclick = () => {
      const i = +b.dataset.tier, x = TIERS[i], got = c.pair.tiers[P.id] = c.pair.tiers[P.id] || []; if (got.includes(i) || Math.min(P.mine, P.theirs) < x.need) return;
      got.push(i); SV().trader.caps += x.caps; if (DM.Gacha) DM.Gacha.state().tok += x.tok; G().routeApi.toStash(x.items.map(([k, nn]) => ({ k, n: nn })));
      DM.Journal && DM.Journal.note(`${P.name} and I reached "${x.n}".`); G().save(); sfx('open'); toast(`${x.n}! +${x.caps} caps, +${x.tok} tokens`, 2.6); re();
    });
    const ct = root.querySelector('#cpContact'); if (ct) ct.onclick = () => { const k = iso() + ':' + P.id; if (c.pair.day[k]) return; c.pair.day[k] = 1; SV().trader.caps += 15; if (DM.Gacha) DM.Gacha.state().tok += 1; G().save(); sfx('pick'); toast('Radio contact! +1 capsule token, +15 caps', 2.2); re(); };
    const lv = root.querySelector('#cpLeave'); if (lv) lv.onclick = async () => { if (!lv.dataset.sure) { lv.dataset.sure = 1; lv.textContent = 'Tap again to end it (shared progress is lost)'; return; } try { await n.rpc('next_pair_leave', { p_handle: n.handle, p_token: n.token }); } catch (e) { /* ignore */ } pairCache.data = null; again(); };
    if (signed() && (!pairCache.data || Date.now() - pairCache.at > 60e3)) again();
  };
  C.html = k => k === 'city' ? C.cityHTML() : C.coopHTML();
  C.bind = (k, root, re) => k === 'city' ? C.bindCity(root, re) : C.bindCoop(root, re);
  C._test = { cache: (cd, pd) => { if (cd) cityCache = { week: (wkNow() || {}).week, at: Date.now(), data: cd }; if (pd) pairCache = { at: Date.now(), data: pd }; }, prev: d => { prevCache = { week: (wkPrev() || {}).week, data: d }; } };
  const css = document.createElement('style'); css.textContent = `
    .cybar { height: 10px; margin: 6px 0 2px; border-radius: 6px; background: #11142f; overflow: hidden; border: 2px solid #3d2d61; } .cybar i { display: block; height: 100%; background: linear-gradient(90deg, #e0604a, #e0b94a); }
    .cybar.sm { height: 6px; border-width: 1px; } .cyrow { padding: 7px 10px; margin: 5px 0; border-radius: 12px; background: rgba(17,20,47,.65); border: 2px solid #3d2d61; } .cyrow.me { border-color: #e0b94a; }
    .cyrow b { display: block; font-size: 13px; color: var(--crm, #f6e3bb); } .cyrow span { font-size: 11px; font-weight: 800; color: var(--mute, #9d90bf); }
    .cyclaim { display: flex; align-items: center; gap: 8px; padding: 10px; margin: 8px 0; border-radius: 12px; border: 2px solid #e0b94a; background: rgba(224,185,74,.1); } .cyclaim b { font-size: 14px; color: #e0b94a; } .cyclaim span { flex: 1; font-size: 12px; font-weight: 800; color: var(--crm, #f6e3bb); }
    .cpduo { display: flex; align-items: center; gap: 8px; margin: 8px 0; } .cpduo > div { flex: 1; text-align: center; padding: 8px; border-radius: 12px; background: rgba(17,20,47,.65); border: 2px solid #3d2d61; } .cpduo > i { font-style: normal; font-size: 22px; }
    .cpduo b { display: block; font-size: 14px; color: var(--crm, #f6e3bb); } .cpduo span { display: block; font-size: 12px; font-weight: 800; color: #b98cf0; } .cpduo em { font-style: normal; font-size: 11px; font-weight: 800; color: var(--mute, #9d90bf); }
    .cptier { display: flex; align-items: center; gap: 8px; padding: 8px 10px; margin: 5px 0; border-radius: 12px; background: rgba(17,20,47,.65); border: 2px solid #3d2d61; } .cptier > div { flex: 1; min-width: 0; } .cptier.ok { border-color: #e0b94a; } .cptier.got { opacity: .7; border-color: #7fd49a; }
    .cptier b { display: block; font-size: 13px; color: var(--crm, #f6e3bb); } .cptier span { display: block; font-size: 11px; font-weight: 700; color: var(--mute, #9d90bf); } .cptier small { display: block; font-size: 10px; font-weight: 800; color: #b98cf0; margin-top: 2px; } .cptier em { font-style: normal; color: #7fd49a; font-weight: 900; }
    .cptier .mbtn, .cyclaim .mbtn { flex: none; width: auto; margin: 0; }`;
  document.head.appendChild(css);
})();
