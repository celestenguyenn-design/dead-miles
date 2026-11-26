/* Dead Miles (next) 0.73 - FRIENDS FEED + WEEKLY PARTY MISSION (owner said yes to "make friends' actions show up:
   'Isa raided your camp!', 'Bubba passed you on the weekly steps board', 'your party is 2,000 HP from killing the boss',
   plus one shared party goal each week").
   - Feed: things other players did that touch you. From the server (next_alerts: your camp was taken - also pushed to
     your phone by push-send.js), and worked out here from the board: someone passed you in this week's steps, your
     party has the weekly boss nearly dead. Home tile "📣 Friends" lights up with anything new.
   - Party mission: one shared goal a week for the whole party, alternating: put down 50 zombies each, or loot 8 houses
     each (summed over the party). Everyone publishes this week's count (pub.extra.wkx, game.js publish). Done: 120 caps
     and 2 capsule tokens each (each member claims their own).
   Save: SV.fr = { feed: [{ id, title, body, at }], read: time, ahead: [handles], wk, base: { kills, runs }, claimed, bossSaid }. */
'use strict';
window.DM = window.DM || {};
(() => {
  const F = DM.Friends = {};
  const G = () => DM.Game, SV = () => DM.Game && DM.Game.data(), N = () => window.NET;
  const toast = (m, s) => DM.E && DM.E.toast && DM.E.toast(m, s || 2.6);
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = n => Math.round(n).toLocaleString('en-US');
  const wk = () => DM.Social ? DM.Social.wkKey() : '';
  const MISSIONS = [
    { k: 'kills', n: 'Clear the streets', per: 50, unit: 'zombies put down', g: '🧟' },
    { k: 'loot', n: 'Strip the block', per: 8, unit: 'houses looted', g: '🏚️' },
  ];
  const PRIZE = { caps: 120, tok: 2 };
  function st() {
    const v = SV(); if (!v) return null;
    const f = v.fr = v.fr || { feed: [], read: 0, ahead: null, wk: '', base: null, claimed: '', bossSaid: '' };
    if (f.wk !== wk()) { f.wk = wk(); f.base = { kills: (v.stats && v.stats.kills) || 0, runs: (v.stats && v.stats.runs) || 0 }; f.ahead = null; }
    return f;
  }
  // this week's own numbers, published for the party (game.js publish -> pub.extra.wkx)
  F.wkx = function () {
    const v = SV(), f = st(); if (!v || !f || !f.base) return undefined;
    return { k: f.wk, kills: Math.max(0, (v.stats.kills || 0) - f.base.kills), loot: Math.max(0, (v.stats.runs || 0) - f.base.runs) };
  };
  function add(id, title, body) {
    const f = st(); if (!f || f.feed.some(x => x.id === id)) return false;
    f.feed.unshift({ id, title: String(title).slice(0, 90), body: String(body || '').slice(0, 220), at: Date.now() });
    f.feed.length = Math.min(f.feed.length, 30);
    return true;
  }
  F.unread = () => { const f = st(); return f ? f.feed.filter(x => x.at > f.read).length : 0; };

  // ---------------------------------------------------------------- pulling news
  let lastPull = 0, busy = false, board = null;
  F.pull = async function (force) {
    const n = N(); if (!n || !n.ok || busy || (!force && Date.now() - lastPull < 5 * 60e3)) return;
    busy = true; lastPull = Date.now(); let news = 0;
    try {
      const r = await n.rpc('next_alerts_get', { p_handle: n.handle, p_token: n.token });
      if (Array.isArray(r)) for (const a of r.slice().reverse()) if (add('a' + a.id, a.title, a.body) && !a.seen) news++;
    } catch (e) { /* offline or not deployed yet */ }
    try { if (DM.Social) board = await DM.Social.refresh(true); } catch (e) { /* offline */ }
    news += passes() + bossNews();
    busy = false; G().save();
    if (news && !DM.scene) { toast(`📣 ${news} new from your friends - see Friends on the home screen`, 2.8); G().renderHome(); }
  };
  const stepsOf = r => { const w = r && r.pub && r.pub.wk; return w && w.k === wk() ? +w.s || 0 : 0; };
  // "Bubba passed you": someone who was behind you this week is now ahead
  function passes() {
    const n = N(), f = st(); if (!board || !n || !DM.Social) return 0;
    const mine = DM.Social.myWeek().s, others = board.filter(r => r.handle !== n.handle && stepsOf(r) > 0);
    const ahead = others.filter(r => stepsOf(r) > mine).map(r => r.handle);
    let c = 0;
    if (f.ahead) for (const r of others) if (ahead.includes(r.handle) && !f.ahead.includes(r.handle) && mine > 0) {
      if (add(`pass-${f.wk}-${r.handle}-${ahead.length}`, `${r.name || r.handle} passed you this week`, `${fmt(stepsOf(r))} steps to your ${fmt(mine)}. Time for a walk?`)) c++;
    }
    f.ahead = ahead;
    return c;
  }
  // the party has the weekly boss nearly dead
  function bossNews() {
    const f = st(), n = N(), B = DM.Boss; if (!B || !n || !n.party || !n.party.code) return 0;
    try {
      const s = B.state(); if (!s || !s.max || s.hp <= 0) return 0;
      const pct = s.hp / s.max, w = B.week();
      if (pct <= .25 && f.bossSaid !== w) { f.bossSaid = w; return add(`boss-${w}`, `Your party has the boss down to ${Math.max(1, Math.round(pct * 100))}%`, `${fmt(s.hp)} HP left. Get your hits in before it dies - everyone who lands one gets loot.`) ? 1 : 0; }
    } catch (e) { /* boss not loaded */ }
    return 0;
  }

  // ---------------------------------------------------------------- the weekly party mission
  F.mission = function () {
    const n = N(), f = st(); if (!n || !n.ok || !n.party || !n.party.code || !(n.party.members || []).length || !f) return null;
    const M = MISSIONS[Math.abs(DM.D.hashStr(f.wk)) % MISSIONS.length];
    const rows = board || n.boardRows || [], me = F.wkx() || { kills: 0, loot: 0 };
    const mem = n.party.members.map(h => {
      if (h === n.handle) return { h, name: 'You', v: me[M.k] };
      const r = rows.find(x => x.handle === h), w = r && r.pub && r.pub.wkx;
      return { h, name: (r && r.name) || h, v: w && w.k === f.wk ? +w[M.k] || 0 : 0 };
    }).sort((a, b) => b.v - a.v);
    const goal = M.per * mem.length, total = mem.reduce((a, m) => a + m.v, 0);
    return { M, mem, goal, total, done: total >= goal, claimed: f.claimed === f.wk };
  };
  function claim() {
    const m = F.mission(), f = st(), v = SV(); if (!m || !m.done || m.claimed) return;
    f.claimed = f.wk; v.trader.caps += PRIZE.caps; if (DM.Gacha) DM.Gacha.state().tok += PRIZE.tok;
    G().save(); toast(`🎉 Party mission done! +${PRIZE.caps} caps, +${PRIZE.tok} capsule tokens`, 3);
  }

  // ---------------------------------------------------------------- tile + sheet
  F.has = k => k === 'friends';
  F.tile = function () {
    const n = N(); if (!n || !n.ok || !SV().tutorialDone) return null;
    F.pull();
    const f = st(), u = F.unread(), m = F.mission();
    const sub = u ? f.feed[0].title : m ? `${m.M.g} ${m.M.n}: ${fmt(m.total)}/${fmt(m.goal)} ${m.M.unit}` : 'What your friends are up to';
    return { k: 'friends', c: '#f07aa8', n: '📣 Friends', sub, bar: m ? Math.min(100, m.total / m.goal * 100) : null, hot: u ? 'New' : m && m.done && !m.claimed ? 'Claim' : '' };
  };
  F.html = function () {
    const f = st(), m = F.mission(), n = N();
    const mis = m ? `<div class="frmis"><div class="kick">${m.M.g} This week's party mission</div><h3>${esc(m.M.n)}</h3>
        <p class="mp">Your party together: <b>${fmt(m.total)} / ${fmt(m.goal)}</b> ${esc(m.M.unit)} (${m.M.per} each). Done = ${PRIZE.caps} caps + ${PRIZE.tok} capsule tokens for everyone.</p>
        <div class="jybar"><i style="width:${Math.min(100, m.total / m.goal * 100)}%"></i></div>
        <div class="frmem">${m.mem.map(x => `<span><b>${esc(x.name)}</b> ${fmt(x.v)}</span>`).join('')}</div>
        ${m.done ? (m.claimed ? '<p class="mp dim">Claimed. A new mission comes Monday.</p>' : '<button class="mbtn" id="frClaim">Claim the reward</button>') : '<p class="mp dim">A new mission every Monday.</p>'}</div>`
      : `<div class="frmis"><p class="mp">${n && n.ok ? 'Join a party (Settings → Account & friends) to get a weekly party mission with friends.' : 'Sign in to see what your friends are up to.'}</p></div>`;
    const feed = f.feed.length ? f.feed.map(x => `<div class="frrow${x.at > f.read ? ' nw' : ''}"><b>${esc(x.title)}</b>${x.body ? `<span>${esc(x.body)}</span>` : ''}<em>${new Date(x.at).toLocaleDateString([], { weekday: 'short' })} ${new Date(x.at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</em></div>`).join('')
      : '<p class="mp dim">Nothing yet. When someone takes your camp, passes you on the weekly steps, or your party nearly kills the boss, it shows up here.</p>';
    return mis + `<div class="kick sect" style="margin-top:10px">📣 News</div><div class="frfeed">${feed}</div>`;
  };
  F.bind = function (root, re) {
    const f = st(); if (f) { f.read = Date.now(); G().save(); }
    const c = root.querySelector('#frClaim'); if (c) c.onclick = () => { claim(); re(); };
  };
  const css = document.createElement('style'); css.textContent = `
    .frmis { padding: 10px; border-radius: 12px; background: rgba(240,122,168,.08); border: 2px solid #f07aa8; margin: 4px 0; }
    .frmem { display: flex; flex-wrap: wrap; gap: 4px 10px; margin: 6px 0; font-size: 12px; color: var(--mute, #9d90bf); } .frmem b { color: var(--crm, #f6e3bb); }
    .frfeed { display: grid; gap: 6px; } .frrow { padding: 8px 10px; border-radius: 10px; background: rgba(17,20,47,.6); border: 2px solid #3d2d61; }
    .frrow.nw { border-color: #f07aa8; } .frrow b { display: block; font-size: 13.5px; } .frrow span { display: block; font-size: 12px; color: var(--mute, #9d90bf); font-weight: 700; } .frrow em { display: block; font-style: normal; font-size: 10.5px; color: #6f6496; margin-top: 2px; }`;
  document.head.appendChild(css);
})();
