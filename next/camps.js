/* Dead Miles (next) 0.46 - camps to take over (owner: "map raids, like an NPC survivor camp you have to raid ... like the
   Walking Dead Governor taking over every campsite ... other parties can take them ... my friends don't live in New York";
   then: "tribute every day ... only for a specific store ... stash space, backpack space, but it has to cost a lot ... raids
   can be done in a party ... I expect people to die. I want it to be a real fight").
   - 12 shared camps (server: next/camps.sql). Who holds a camp is shared by everyone; WHERE it is depends on where you walk:
     each ~2 km neighbourhood has its own copy of all 12 (friends walking together see the same spots; a friend in Atlanta
     has The Mill somewhere in Atlanta). Taking your local copy takes the camp for everyone.
   - Raid = a real run inside the camp against its garrison (raiders.js spawnCamp): 4-10 armed raiders who hold their
     ground, wake each other, never run, plus a leader. Bigger defence = more, tougher raiders. Kill them all to take it.
     Dying is the normal death (you lose what you carry). 3 raid attempts a day; 3 captures a day (server); a fresh capture
     is safe for 12 h.
   - Party: mates (same party) who are at the same camp in the last 30 min fight beside you as AI allies.
   - Holding: every camp you or your party holds pays 1 tribute mark a day (claim on the home screen). Marks only buy from
     the War chest: extra pack / stash slots (expensive, rising), plated armor, a Masterwork weapon, capsule tokens.
   - Fortify: walk to a camp your side holds: +15 defence (once a day each).
   Save: SV.camps = { marks, trib, raids: { day, n }, prev: [ids], buys: { pack, stash } }. Map spots: computed, not saved. */
'use strict';
window.DM = window.DM || {};
(() => {
  const CP = DM.Camps = {};
  const G = () => DM.Game, SV = () => DM.Game && DM.Game.data(), N = () => window.NET, D = () => DM.D;
  const toast = (m, s) => DM.E && DM.E.toast && DM.E.toast(m, s || 2.6);
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  const today = () => { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };
  const dist = (a, b) => { const R = 6371000, r = Math.PI / 180, dLa = (b.lat - a.lat) * r, dLo = (b.lon - a.lon) * r; const q = Math.sin(dLa / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLo / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(q)); };
  const fmtD = d => d < 1000 ? Math.max(5, Math.round(d / 5) * 5) + ' m' : (d / 1000).toFixed(1) + ' km';
  const RAIDS_DAY = 3, NEAR = 40, CELL_LAT = .02, CELL_LON = .025;
  const TYPES = ['police', 'school', 'garage', 'mansion', 'pharmacy', 'rowL'];
  function st() { const v = SV(); v.camps = v.camps || { marks: 0, trib: '', raids: { day: '', n: 0 }, prev: [], buys: { pack: 0, stash: 0 } }; const c = v.camps; if (c.raids.day !== today()) c.raids = { day: today(), n: 0 }; return c; }
  // ---------------------------------------------------------------- who holds what (server)
  let list = [], listAt = 0, busy = false;
  CP.list = () => list;
  CP.refresh = async function (force) {
    const n = N(); if (!n || busy || (!force && Date.now() - listAt < 60e3)) return list;
    busy = true; try { const r = await n.rpc('next_camps_list', {}); if (Array.isArray(r)) { list = r; listAt = Date.now(); lostCheck(); } } catch (e) { /* offline */ } busy = false;
    return list;
  };
  const party = () => { const n = N(); return (n && n.party && n.party.code) || ''; };
  const mine = c => { const n = N(); return !!c && !!c.handle && ((n && c.handle === n.handle) || (party() && c.party === party())); };
  CP.held = () => list.filter(mine);
  function lostCheck() {   // tell her when a camp her side held was taken
    const s = st(), now = CP.held().map(c => c.id);
    for (const id of s.prev || []) if (!now.includes(id)) { const c = list.find(x => x.id === id); if (c) toast(`🏴 ${c.owner} took ${c.name} from you!`, 3.6); }
    s.prev = now; G().save();
  }
  // ---------------------------------------------------------------- where the local copies are
  CP.spots = function (pos) {
    if (!pos || !list.length) return [];
    const cy = Math.floor(pos.lat / CELL_LAT), cx = Math.floor(pos.lon / CELL_LON), out = [];
    for (const c of list) {
      const h = hash(c.id + '|' + cy + ':' + cx), lat = (cy + ((h % 1000) / 1000) * .9 + .05) * CELL_LAT, lon = (cx + (((h >>> 10) % 1000) / 1000) * .9 + .05) * CELL_LON;
      let at = { lat, lon }, near = '';
      const M = DM.Map && DM.Map._M; if (M && M.places) { let bd = 160; for (const pl of Object.values(M.places)) { const d = dist(pl, at); if (d < bd) { bd = d; near = pl.street || pl.name; at = { lat: pl.lat + .00012, lon: pl.lon + .00015 }; } } }
      out.push(Object.assign({ c, near }, at));
    }
    return out;
  };
  // ---------------------------------------------------------------- near a camp (mapfx.js calls this)
  let metId = null, rallyAt = {};
  CP.onPos = function (pos) {
    const n = N(); if (!pos || pos.acc > 60 || !n || !n.ok) return;
    CP.refresh();
    const reach = NEAR + Math.min(15, pos.acc / 2), sp = CP.spots(pos).find(x => dist(x, pos) <= reach);
    if (!sp) { metId = null; return; }
    if (!rallyAt[sp.c.id] || Date.now() - rallyAt[sp.c.id] > 90e3) { rallyAt[sp.c.id] = Date.now(); n.rpc('next_camp_rally', { p_handle: n.handle, p_token: n.token, p_camp: sp.c.id, p_party: party() }).then(r => { sp.mates = (r && r.mates) || []; CP._mates = sp.mates; }).catch(() => { }); }
    if (metId === sp.c.id || (DM.MapQ && DM.MapQ.dialogOpen())) return;
    metId = sp.c.id; open(sp);
  };
  function open(sp) {
    const U = DM.MapQ && DM.MapQ.ui; if (!U) return;
    const c = sp.c, s = st(), ours = mine(c), safe = c.safe && new Date(c.safe) > new Date(), left = RAIDS_DAY - s.raids.n;
    const gar = garrison(c, []);
    const mates = CP._mates || [];
    const status = ours ? '<b style="color:#7fd49a">Your side holds it.</b>' : `Held by <b>${esc(c.owner)}</b>${c.party ? ` (party ${esc(c.party)})` : ''}.`;
    U.dlg(U.head(`Camp · near ${sp.near || 'here'}`, '🏴', c.name) + `<p>${status} Defence <b>${c.def}</b> - ${gar.n - 1} armed raiders and their leader inside.</p>
      ${safe && !ours ? `<p class="mqbad">Just taken - safe until ${new Date(c.safe).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}.</p>` : ''}
      ${!ours ? `<p>Raids left today: <b>${Math.max(0, left)}/${RAIDS_DAY}</b>. If you go down in there you lose what you carry.${mates.length ? ` <b style="color:#7fd49a">${mates.length} party mate${mates.length > 1 ? 's' : ''} here with you: ${esc(mates.map(m => m.name).join(', '))}</b> - they fight beside you.` : ' Party mates who come here with you fight beside you.'}</p>` : '<p>Walk here once a day to fortify it (+15 defence) so other parties have a harder time taking it.</p>'}
      <div class="mqb">${ours ? '<button id="cpFort">Fortify (+15 defence)</button>' : `<button id="cpRaid"${safe || left <= 0 ? ' disabled' : ''}>Raid the camp</button>`}<button class="g" id="cpNo">Walk on</button></div>`, el => {
      el.querySelector('#cpNo').onclick = () => U.close();
      const f = el.querySelector('#cpFort'); if (f) f.onclick = async () => { f.disabled = true; const n = N(); let r; try { r = await n.rpc('next_camp_fortify', { p_handle: n.handle, p_token: n.token, p_camp: c.id, p_party: party() }); } catch (e) { r = null; } U.close(); toast(r && r.ok ? `${c.name} fortified - defence ${r.def}` : r && r.error === 'today' ? 'You already fortified it today' : 'Could not fortify it - try again', 2.4); CP.refresh(true); };
      const rd = el.querySelector('#cpRaid'); if (rd) rd.onclick = () => { U.close(); raid(sp); };
    });
  }
  // ---------------------------------------------------------------- the fight
  function garrison(c, mates) {
    const def = c.def || 40;
    return { n: Math.max(4, Math.min(10, 3 + Math.floor(def / 22))), hpMul: 1 + def / 180, dmgMul: 1 + def / 260, leader: { hp: Math.round(260 + def * 2.2), name: c.handle ? `${c.owner}'s lieutenant` : 'Bandit boss' } };
  }
  function raid(sp) {
    const s = st(), c = sp.c; if (s.raids.n >= RAIDS_DAY) return toast('No raids left today', 1.8);
    if (SV().survivor.hp < 30) return toast('Too hurt to raid. Patch up first.', 2);
    s.raids.n++; G().save();
    const allies = (CP._mates || []).slice(0, 5);
    if (DM.Map && DM.Map.on) DM.Map.close();
    const type = TYPES[hash(c.id) % TYPES.length], seed = hash(c.id + ':' + today());
    const L = JSON.parse(JSON.stringify(DM.Gen.generate(type, seed, { gv: G().GV || 4 })));
    L.id = 'camp-' + c.id + '-' + today(); L.seed = seed; L.address = c.name; L.danger = 4; L.camp = c.id;
    const spec = garrison(c, allies);
    G().hideMenu();
    let won = false;
    const O = {
      hint: `${c.name} · ${spec.n - 1} raiders and their leader. Kill them all.${allies.length ? ` ${allies.length} party mate${allies.length > 1 ? 's' : ''} with you.` : ''}`,
      noRaid: true, noBoss: true, camp: spec,
      onCampWin: async () => {
        won = true; const g = DM.House.G; g.banners.push({ text: 'CAMP TAKEN', sub: c.name, t: 0 }); try { DM.E.SFX.play('kill'); } catch (e) { /* ignore */ }
        const n = N(); let r; try { r = await n.rpc('next_camp_take', { p_handle: n.handle, p_token: n.token, p_camp: c.id, p_party: party() }); } catch (e) { r = null; }
        if (r && r.ok) { SV().trader.caps += 40; if (DM.Skills) DM.Skills.addXP(80); if (DM.Codex) DM.Codex.flag('camps'); toast(`🏴 ${c.name} is yours! +40 caps, +80 XP. It pays tribute every day. Walk out the front door when you're done.`, 4.5); }
        else toast(r && r.error === 'safe' ? 'Someone took it moments before you - it is safe for now' : r && r.error === 'limit' ? 'You took 3 camps today - this one stays as it is' : 'Could not claim it (offline?) - try again later', 3.4);
        CP.refresh(true);
      },
      onExit: res => { G().afterRun(res); if (!won) toast(res.kind === 'down' ? `${c.name} held. You lost what you carried.` : `You left ${c.name} - it still stands`, 2.6); },
    };
    DM.House.start(L, DM.Crew ? DM.Crew.wrap(O, 'house', { allies }) : O);
  }
  // ---------------------------------------------------------------- tribute + the War chest
  CP.tribReady = () => CP.held().length > 0 && st().trib !== today();
  CP.claim = function () {
    const s = st(), h = CP.held().length; if (!h || s.trib === today()) return;
    const m = h + (h >= 3 ? 1 : 0) + (h >= 6 ? 2 : 0); s.marks += m; s.trib = today(); G().save();
    toast(`🏴 Tribute from ${h} camp${h > 1 ? 's' : ''}: +${m} mark${m > 1 ? 's' : ''}`, 2.6);
  };
  const PACK_COST = [10, 16, 24, 34], STASH_COST = [12, 18, 26, 36];
  const STORE = [
    { k: 'pack', n: '+1 backpack slot', d: 'Permanent. Up to +4.', cost: s => PACK_COST[s.buys.pack], left: s => s.buys.pack < PACK_COST.length, buy: (s, v) => { s.buys.pack++; v.survivor.warPack = (v.survivor.warPack || 0) + 1; } },
    { k: 'stash', n: '+10 stash slots', d: 'Permanent. Up to +40.', cost: s => STASH_COST[s.buys.stash], left: s => s.buys.stash < STASH_COST.length, buy: (s, v) => { s.buys.stash++; v.survivor.warStash = (v.survivor.warStash || 0) + 10; } },
    { k: 'plate', n: 'Plated armor', d: 'The heaviest armor in the game.', cost: () => 14, left: () => true, buy: () => G().routeApi.toStash([{ k: 'armor_plate', n: 1 }]) },
    { k: 'master', n: 'Masterwork weapon', d: 'A random weapon at the top quality tier.', cost: () => 22, left: () => true, buy: () => { const k = ['machete', 'axe', 'spikedbat', 'pistol', 'shotgun', 'baton', 'bow'][Math.floor(Math.random() * 7)], e = { k, n: 1, q: 5 }; e.d = D().wMax(e); G().routeApi.toStash([e]); toast(`A Masterwork ${D().ITEMS[k].n.toLowerCase()} is in your stash`, 2.4); } },
    { k: 'tok', n: '3 capsule tokens', d: 'For the capsule machine.', cost: () => 6, left: () => !!DM.Gacha, buy: () => { DM.Gacha.state().tok += 3; } },
  ];
  CP.tile = function () {
    const n = N(); if (!n || !n.ok) return null; CP.refresh();
    const h = CP.held().length, s = st();
    return { k: 'camps', c: '#d94a3a', n: 'Camps', sub: list.length ? `You hold ${h}/${list.length} · ${s.marks} mark${s.marks === 1 ? '' : 's'}` : 'Loading...', hot: CP.tribReady() ? 'Tribute' : '' };
  };
  CP.html = function () {
    const n = N(), s = st(), v = SV();
    if (!n || !n.ok) return '<div class="kick">Camps</div><h3>Sign in first</h3><p class="mp">Camps are shared between players, so you need an account (Settings > Account & friends).</p>';
    const rows = list.map(c => `<div class="cprow${mine(c) ? ' mine' : !c.handle ? ' bandit' : ''}"><b>🏴 ${esc(c.name)}</b><span>${mine(c) ? 'yours' : esc(c.owner)} · defence ${c.def}${c.safe && new Date(c.safe) > new Date() ? ' · safe for now' : ''}</span></div>`).join('');
    const store = STORE.filter(x => x.left(s)).map(x => { const cst = x.cost(s); return `<div class="cpbuy"><div><b>${esc(x.n)}</b><span>${esc(x.d)}</span></div><button class="mbtn sm${s.marks < cst ? ' ghost' : ''}" data-cpb="${x.k}"${s.marks < cst ? ' disabled' : ''}>${cst} marks</button></div>`; }).join('');
    return `<div class="kick">Camps · become the Governor</div><h3>${CP.held().length} of ${list.length} camps held · ${s.marks} mark${s.marks === 1 ? '' : 's'}</h3>
      <p class="mp dim">Every neighbourhood has its own copy of the same 12 camps (🏴 on the map). Walk to one, raid it - a real fight, people die - and it is yours for everyone. Each camp you or your party holds pays 1 tribute mark a day (more if you hold 3+). Party mates at the same camp fight beside you. 3 raids a day.</p>
      ${CP.tribReady() ? '<button class="mbtn" id="cpTrib" style="width:100%;margin:6px 0">Collect today\'s tribute</button>' : ''}
      <div class="cplist">${rows || '<p class="mp dim">Loading camps...</p>'}</div>
      <div class="kick sect" style="margin-top:12px">War chest · marks only</div><div class="cplist">${store}</div>
      <p class="mp dim">Backpack ${v.survivor.warPack || 0}/4 bought · stash +${v.survivor.warStash || 0}/40 bought.</p>`;
  };
  CP.bind = function (root, re) {
    const t = root.querySelector('#cpTrib'); if (t) t.onclick = () => { CP.claim(); re(); };
    root.querySelectorAll('[data-cpb]').forEach(b => b.onclick = () => {
      const s = st(), x = STORE.find(y => y.k === b.dataset.cpb), cst = x.cost(s); if (!x.left(s) || s.marks < cst) return;
      if (!b.dataset.sure) { b.dataset.sure = 1; b.textContent = 'Tap to confirm'; return; }
      s.marks -= cst; x.buy(s, SV()); G().save(); try { DM.E.SFX.play('pick'); } catch (e) { /* ignore */ } toast(`Bought: ${x.n}`, 1.8); re();
    });
    const before = listAt; CP.refresh().then(() => { if (listAt !== before && document.body.contains(root)) re(); });
  };
  // ---------------------------------------------------------------- map markers + card line
  CP.drawMarks = function (x, t, SX, SY, wx, wy) {
    const M = DM.Map && DM.Map._M, mark = DM.MapFX && DM.MapFX.mark; if (!M || !mark) return;
    const pos = M.pos || M.guess; if (!pos) return;
    for (const sp of CP.spots(pos)) { const c = sp.c; mark(x, SX(wx(sp.lon)), SY(wy(sp.lat)), '🏴', mine(c) ? '#7fd49a' : !c.handle ? '#d94a3a' : '#5ab4ff', t, c.name); }
  };
  CP.lines = function (pos) {
    const n = N(); if (!pos || !n || !n.ok) return [];
    const sp = CP.spots(pos).filter(x => !mine(x.c)).map(x => [x, dist(x, pos)]).sort((a, b) => a[1] - b[1])[0];
    return sp ? [{ t: `🏴 ${sp[0].c.name} · ${sp[0].c.handle ? sp[0].c.owner : 'bandits'}`, s: fmtD(sp[1]) }] : [];
  };
  const css = document.createElement('style'); css.textContent = `
    .cplist { display: grid; gap: 5px; margin: 6px 0; } .cprow { display: flex; justify-content: space-between; gap: 8px; padding: 7px 10px; border-radius: 10px; background: rgba(17,20,47,.6); border: 2px solid #3d2d61; font-size: 13px; }
    .cprow span { color: var(--mute, #9d90bf); font-weight: 700; font-size: 12px; text-align: right; } .cprow.mine { border-color: #7fd49a; } .cprow.bandit b { color: #ff8a7a; }
    .cpbuy { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 12px; background: rgba(17,20,47,.6); border: 2px solid #3d2d61; } .cpbuy div { flex: 1; min-width: 0; } .cpbuy .mbtn { flex: none; width: auto; min-width: 92px; padding: 0 12px; } .cpbuy b { display: block; font-size: 13.5px; } .cpbuy span { font-size: 11.5px; color: var(--mute, #9d90bf); font-weight: 700; }`;
  document.head.appendChild(css);
})();
