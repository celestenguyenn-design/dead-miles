/* Dead Miles (next) 0.40 - walking together (owner liked "party step goal" and "friends step race").
   Both use the online board (next_get_board): every signed-in player publishes this calendar week's steps
   (Monday-Sunday, local time) in pub.extra.wk = { k: week key, s: steps } (game.js publish).
   - Party walk: your party (horde-night party, up to 6) walks toward one goal a week: 40,000 steps per member.
     Half way: 30 caps each. The full goal: 80 caps + 2 capsule tokens each. Each member claims their own.
   - Friends race: everyone on the board this week, ranked by steps. When a new week starts, last week's final
     standing pays out (claim once): 1st 150 caps + 3 tokens, 2nd 100 + 2, 3rd 60 + 1, anyone else with 20,000+ steps
     20 caps. Last week's standing is the last board this phone saw before Monday (kept in the save).
   Save: SV.social = { wk, party: [claimed tiers], race: { wk, rows }, raceDone: wk }. */
'use strict';
window.DM = window.DM || {};
(() => {
  const S = DM.Social = {};
  const G = () => DM.Game, SV = () => DM.Game && DM.Game.data(), N = () => window.NET;
  const toast = (m, s) => DM.E && DM.E.toast && DM.E.toast(m, s || 2.6);
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = n => Math.round(n).toLocaleString('en-US');
  const pad = n => String(n).padStart(2, '0');
  const monday = (d = new Date()) => { const m = new Date(d); m.setHours(12, 0, 0, 0); m.setDate(m.getDate() - ((m.getDay() + 6) % 7)); return m; };
  const wkKey = (d = new Date()) => { const m = monday(d); return m.getFullYear() + '-' + pad(m.getMonth() + 1) + '-' + pad(m.getDate()); };
  S.wkKey = wkKey;
  const PER = 40000, HALF = { caps: 30 }, FULL = { caps: 80, tok: 2 };
  const PRIZE = [{ caps: 150, tok: 3 }, { caps: 100, tok: 2 }, { caps: 60, tok: 1 }];
  function st() { const v = SV(); v.social = v.social || { wk: '', party: [], race: null, raceDone: '' }; const s = v.social; if (s.wk !== wkKey()) { s.wk = wkKey(); s.party = []; } return s; }
  // this calendar week's steps (phone/watch + typed at half, like the rest of the game)
  S.myWeek = function () {
    const n = N(); if (!n || !n._ledger) return { k: wkKey(), s: 0 };
    const L = n._ledger(), m = monday(), now = new Date(); let s = 0;
    for (let d = new Date(m); d <= now; d.setDate(d.getDate() + 1)) { const r = L.days[d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate())]; if (r) s += (r.ap || 0) + (r.at || 0); }
    return { k: wkKey(), s: Math.round(s) };
  };
  const stepsOf = row => { const w = row && row.pub && row.pub.wk; return w && w.k === wkKey() ? +w.s || 0 : 0; };
  let board = null, boardAt = 0, busy = false;
  S.refresh = async function (force) {
    const n = N(); if (!n || !n.ok || busy || (!force && Date.now() - boardAt < 120e3)) return board;
    busy = true; try { const rows = await n.board(); board = rows || []; boardAt = Date.now(); snapshot(); } catch (e) { /* offline */ } busy = false;
    return board;
  };
  function rows() {
    const n = N(), me = n && n.handle, mine = S.myWeek().s;
    const list = (board || (n && n.boardRows) || []).map(r => ({ h: r.handle, name: r.name || r.handle, s: r.handle === me ? Math.max(mine, stepsOf(r)) : stepsOf(r), me: r.handle === me })).filter(r => r.s > 0 || r.me);
    if (me && !list.some(r => r.me)) list.push({ h: me, name: (SV().survivor || {}).name || me, s: mine, me: true });
    return list.sort((a, b) => b.s - a.s);
  }
  // keep this week's standing so next week can pay out last week's
  function snapshot() { const s = st(), r = rows(); if (r.length) s.race = { wk: wkKey(), rows: r.map(x => ({ h: x.h, name: x.name, s: x.s, me: x.me })) }; G().save(); }
  function pay(p, why) {
    const v = SV(); v.trader.caps += p.caps || 0; if (p.tok && DM.Gacha) DM.Gacha.state().tok += p.tok;
    G().save(); try { DM.E.SFX.play('pick'); } catch (e) { /* ignore */ }
    toast(`${why}: +${p.caps} caps${p.tok ? `, ${p.tok} capsule token${p.tok > 1 ? 's' : ''}` : ''}`, 3.2);
  }
  // ---------------------------------------------------------------- party walk
  S.party = function () {
    const n = N(), p = n && n.party; if (!p || !p.code || !(p.members || []).length) return null;
    const r = rows(), mem = p.members.map(h => { const x = r.find(y => y.h === h); return { h, name: x ? x.name : h, s: x ? x.s : 0 }; });
    const total = mem.reduce((a, m) => a + m.s, 0), goal = PER * mem.length;
    return { code: p.code, mem: mem.sort((a, b) => b.s - a.s), total, goal, pct: Math.min(100, total / goal * 100) };
  };
  S.claimParty = function (tier) {
    const P = S.party(), s = st(); if (!P || s.party.includes(tier)) return;
    if (P.total < P.goal * (tier === 'half' ? .5 : 1)) return toast('Not there yet - keep walking together', 1.8);
    s.party.push(tier); pay(tier === 'half' ? HALF : FULL, tier === 'half' ? 'Party walk half way' : 'Party walk goal!');
  };
  // ---------------------------------------------------------------- last week's race
  S.lastRace = function () {
    const s = st(); if (!s.race || s.race.wk === wkKey() || s.raceDone === s.race.wk) return null;
    const r = s.race.rows, i = r.findIndex(x => x.me); if (i < 0 || r.length < 2) return null;
    const p = PRIZE[i] || (r[i].s >= 20000 ? { caps: 20 } : null);
    return { wk: s.race.wk, place: i + 1, of: r.length, steps: r[i].s, prize: p };
  };
  S.claimRace = function () {
    const lr = S.lastRace(), s = st(); if (!lr) return; s.raceDone = lr.wk;
    if (lr.prize) pay(lr.prize, `Last week's race: #${lr.place} of ${lr.of}`); else { G().save(); toast(`Last week you came #${lr.place} of ${lr.of}. This week is a new race!`, 2.6); }
  };
  // ---------------------------------------------------------------- home tile + sheet
  S.tile = function () {
    const n = N(); if (!n || !n.ok) return null;
    S.refresh();
    const lr = S.lastRace(), P = S.party(), r = rows(), me = r.findIndex(x => x.me);
    const sub = lr ? `Last week: #${lr.place} - claim!` : P ? `Party ${Math.round(P.pct)}% · race #${me + 1} of ${r.length}` : `Race #${me + 1} of ${r.length} · ${fmt(me >= 0 ? r[me].s : S.myWeek().s)} steps`;
    const canParty = P && ((P.total >= P.goal * .5 && !st().party.includes('half')) || (P.total >= P.goal && !st().party.includes('full')));
    return { k: 'social', c: '#5ab4ff', n: 'Walk together', sub, bar: P ? P.pct : null, hot: lr || canParty ? 'Claim' : '' };
  };
  S.html = function () {
    const n = N(), s = st(), P = S.party(), r = rows(), lr = S.lastRace();
    if (!n || !n.ok) return '<div class="kick">Walk together</div><h3>Sign in first</h3><p class="mp">The party walk and the friends race use your account (Settings > Account & friends).</p>';
    const left = Math.max(0, Math.ceil((monday().getTime() + 7 * 864e5 - Date.now()) / 864e5));
    let h = `<div class="kick">Walk together · this week (Mon-Sun) · ${left} day${left === 1 ? '' : 's'} left</div><h3>${fmt((r.find(x => x.me) || { s: S.myWeek().s }).s)} steps this week</h3>`;
    if (lr) h += `<div class="sorow hot"><b>Last week's race: #${lr.place} of ${lr.of}</b><span>${fmt(lr.steps)} steps${lr.prize ? ` · prize: ${lr.prize.caps} caps${lr.prize.tok ? ` + ${lr.prize.tok} tokens` : ''}` : ''}</span><button class="mbtn sm" id="soRace">Claim</button></div>`;
    h += `<div class="kick sect" style="margin-top:12px">Party walk</div>`;
    if (!P) h += '<p class="mp dim">Join a party (Horde night > Party) to walk toward a shared goal: 40,000 steps per member a week.</p>';
    else {
      const half = s.party.includes('half'), full = s.party.includes('full');
      h += `<p class="mp">Party <b>${esc(P.code)}</b>: ${fmt(P.total)} / ${fmt(P.goal)} steps together</p><div class="mbar"><i style="width:${Math.max(2, P.pct)}%"></i></div>
        <div class="solist">${P.mem.map(m => `<div><span>${esc(m.name)}</span><b>${fmt(m.s)}</b></div>`).join('')}</div>
        <div class="btnrow"><button class="mbtn sm${half ? ' ghost' : ''}" id="soHalf"${half ? ' disabled' : ''}>${half ? 'Half way · claimed' : `Half way · ${HALF.caps} caps`}</button><button class="mbtn sm${full ? ' ghost' : ''}" id="soFull"${full ? ' disabled' : ''}>${full ? 'Goal · claimed' : `Goal · ${FULL.caps} caps + ${FULL.tok} tokens`}</button></div>`;
    }
    h += `<div class="kick sect" style="margin-top:12px">Friends race · this week</div><p class="mp dim">Everyone signed in, ranked by this week's steps. Prizes on Monday: 1st 150 caps + 3 tokens, 2nd 100 + 2, 3rd 60 + 1, 20,000+ steps 20 caps.</p>
      <div class="solist race">${r.slice(0, 15).map((x, i) => `<div class="${x.me ? 'me' : ''}"><span>${['🥇', '🥈', '🥉'][i] || '#' + (i + 1)} ${esc(x.name)}${x.me ? ' (you)' : ''}</span><b>${fmt(x.s)}</b></div>`).join('')}</div>
      <p class="mp dim">Steps show up for others when your game syncs (a few minutes).</p>`;
    return h;
  };
  S.bind = function (root, rerender) {
    const q = id => root.querySelector(id);
    if (q('#soRace')) q('#soRace').onclick = () => { S.claimRace(); rerender(); };
    if (q('#soHalf')) q('#soHalf').onclick = () => { S.claimParty('half'); rerender(); };
    if (q('#soFull')) q('#soFull').onclick = () => { S.claimParty('full'); rerender(); };
    const before = boardAt; S.refresh().then(() => { if (boardAt !== before && document.body.contains(root)) rerender(); });   // throttled: no fetch loop
  };
  const css = document.createElement('style'); css.textContent = `
    .solist { display: grid; gap: 4px; margin: 8px 0; } .solist div { display: flex; justify-content: space-between; padding: 7px 10px; border-radius: 10px; background: rgba(17,20,47,.6); font-size: 13px; font-weight: 800; color: var(--mute, #9d90bf); }
    .solist div b { color: var(--crm, #f6e3bb); } .solist div.me { background: rgba(90,180,255,.18); border: 2px solid #5ab4ff; color: var(--crm, #f6e3bb); }
    .sorow { display: grid; gap: 4px; padding: 10px; border-radius: 14px; background: rgba(17,20,47,.7); border: 2px solid #5ab4ff; margin-top: 8px; } .sorow b { font-size: 14px; } .sorow span { font-size: 12px; font-weight: 700; color: var(--mute, #9d90bf); }`;
  document.head.appendChild(css);
})();
