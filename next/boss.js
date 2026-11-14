/* Dead Miles (next) - phase 5b: the weekly group boss.
   One named boss a week (Monday-Sunday, America/New_York), in a special boss house on everyone's house list, reachable
   after 5,000 steps that week. Its health is SHARED across the party for the whole week through ONE Supabase function,
   next_boss_hit(handle, token, code, week, dmg) -> { hp, max, hits: {handle: dmg}, killed_by }. Party-less players get a
   solo boss (code 'solo:' + handle); players who are not signed in fight a boss kept on this phone only.
   Two fights per player per day. When it goes down, everyone who hit it gets a reward on their next visit.
   Save: SV.boss (B.norm adds defaults). Must work offline: hits wait in SV.boss.pend until the network is back. */
'use strict';
(() => {
  const D = DM.D, E = DM.E, $ = E.$, SFX = E.SFX, toast = E.toast, T = E.T, P = ART.P;
  const B = DM.Boss = {};
  const G = () => DM.Game, SV = () => DM.Game.data(), H = () => DM.House;
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const icon = k => `<img alt="" src="${ART.iconURL[D.ITEMS[k].i]}">`;
  const fmt = n => Math.round(n).toLocaleString('en-US');
  B.STEPS = 5000; B.PER_DAY = 2; B.FIGHT_S = 90; B.SOLO_MAX = 5000;
  B.ARMOR = .55;   // the boss shrugs off part of every hit: a good fight takes ~1,000-1,400 off its shared health
  B.maxFor = n => Math.round(5000 * (1 + .8 * (Math.max(1, Math.min(6, n)) - 1)));   // same formula as the server

  // ---------------------------------------------------------------- the bosses (rotating by week)
  B.LIST = [
    { id: 'butcher', name: 'The Butcher of Bed-Stuy', place: 'the old meat market on Fulton St', floor: 't', gim: ['charge', 'slam'], cos: 'apron', col: '#9e2b35', tint: '#7a4040',
      blurb: 'Still wears the apron. Still has the cleaver. Telegraphs a straight-line charge - step aside and it slams into the wall.' },
    { id: 'ash', name: 'Mother Ash', place: 'the burned-out church on Macon St', floor: 'x', gim: ['summon', 'slam'], cos: 'ashcrown', col: '#ff9a4a', tint: '#5a5462',
      blurb: 'Smoke and cinders. She calls walkers out of the ash and slams the ground - watch for the ring.' },
    { id: 'warden', name: 'The Bridge Warden', place: 'the toll plaza under the bridge', floor: 'g', gim: ['slam', 'charge'], cos: 'wardencap', col: '#e0b94b', tint: '#2c3462',
      blurb: 'Huge, slow, armoured in a toll-booth coat. Ground slams that shake the whole plaza, and a charge if you keep your distance.' },
    { id: 'nurse', name: 'The Night Nurse', place: 'the Woodhull ER waiting room', floor: 'm', gim: ['summon', 'charge'], cos: 'stetho', col: '#9fe0e6', tint: '#4a6a8a',
      blurb: 'The last shift never ended. She brings her patients with her, and lunges across the room.' },
  ];

  // ---------------------------------------------------------------- weeks (New York Monday)
  let nyf = null; try { nyf = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }); } catch (e) { nyf = null; }
  const pad = n => String(n).padStart(2, '0');
  B.now = () => Date.now() + ((DM.Horde && DM.Horde.devOffset) || 0);
  function nyDay(ms) {
    if (nyf) try { const o = {}; for (const p of nyf.formatToParts(new Date(ms))) o[p.type] = p.value; return Date.UTC(+o.year, +o.month - 1, +o.day); } catch (e) { /* fall through */ }
    const d = new Date(ms - 5 * 36e5); return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  }
  const keyOfUTC = t => { const d = new Date(t); return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()); };
  B.week = (ms = B.now()) => { const t = nyDay(ms), dow = new Date(t).getUTCDay(); return keyOfUTC(t - ((dow + 6) % 7) * 864e5); };
  B.daysLeft = (ms = B.now()) => { const dow = new Date(nyDay(ms)).getUTCDay(); return dow === 0 ? 1 : 8 - dow; };   // including today
  const wIdx = w => { const [y, m, d] = w.split('-').map(Number); return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(2026, 10, 9)) / (7 * 864e5)); };
  B.bossOf = w => B.LIST[((wIdx(w) % B.LIST.length) + B.LIST.length) % B.LIST.length];
  const today = () => { const d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };

  // ---------------------------------------------------------------- save data
  B.norm = function (v) {
    const b = v.boss = v.boss && typeof v.boss === 'object' ? v.boss : {};
    b.week = b.week || ''; b.fights = b.fights && typeof b.fights === 'object' ? b.fights : {};
    b.pend = Array.isArray(b.pend) ? b.pend : []; b.claimed = b.claimed && typeof b.claimed === 'object' ? b.claimed : {};
    b.mine = b.mine || 0; b.st = b.st || null; b.prev = b.prev || null; b.wins = b.wins || 0; b.reward = b.reward || null;
    const ks = Object.keys(b.claimed).sort(); while (ks.length > 8) delete b.claimed[ks.shift()];
    return v;
  };
  const bs = () => SV().boss;
  const N = () => window.NET;
  const online = () => !!(N() && N().ok && N().handle && N().token);
  B.me = () => online() ? String(N().handle).toLowerCase() : 'me';
  B.code = () => online() ? ((N().party && N().party.code) || 'solo:' + String(N().handle).toLowerCase()) : 'local';
  const effToday = v => v.day ? v.day.phone + v.day.walk + v.day.typed * .5 : 0;
  B.roll = function () { // a new boss week: remember last week's boss for its reward, reset the counters
    const v = SV(); if (!v || !v.boss) return;
    const b = bs(), w = B.week();
    if (b.week === w) return;
    if (b.week && b.mine > 0 && !b.claimed[b.week]) { const c = b.st ? b.st.code : B.code(); b.prev = { week: b.week, code: c, st: c === 'local' ? b.st : null }; }
    const first = !b.week;
    b.week = w; b.mine = 0; b.st = null;
    // steps this week: from now on (the first time ever: today, plus yesterday if it was in this week)
    let back = effToday(v); if (first && v.prevDay && new Date().getDay() !== 1) back += v.prevDay.phone + v.prevDay.walk + v.prevDay.typed * .5;
    b.w0 = Math.max(0, (v.walked || 0) - back);
    for (const k of Object.keys(b.fights)) if (k < today()) delete b.fights[k];
  };
  B.weekSteps = () => Math.max(0, (SV().walked || 0) - (bs().w0 || 0));
  B.fightsLeft = () => Math.max(0, B.PER_DAY - (bs().fights[today()] || 0));
  // the shared state as best we know it (the server's, or this phone's)
  B.state = function () {
    const b = bs(), code = B.code();
    if (!b.st || b.st.week !== b.week || b.st.code !== code) {
      const mx = code === 'local' || code.startsWith('solo:') ? B.SOLO_MAX : B.maxFor(((N() && N().party && N().party.members) || []).length || 1);
      b.st = { code, week: b.week, hp: mx, max: mx, hits: {}, killed_by: null, at: 0, guess: code !== 'local' };
      // pending hits this phone has not delivered yet count against the guess
      for (const p of b.pend) if (p.week === b.week && p.code === code) { b.st.hp = Math.max(0, b.st.hp - p.dmg); b.st.hits[B.me()] = (b.st.hits[B.me()] || 0) + p.dmg; }
    }
    return b.st;
  };

  // ---------------------------------------------------------------- network (fails quietly)
  async function rpc(code, week, dmg) {
    try { return await N().rpc('next_boss_hit', { p_handle: N().handle, p_token: N().token, p_code: code, p_week: week, p_dmg: dmg | 0 }); }
    catch (e) { return { ok: false, error: 'network' }; }
  }
  let syncing = false;
  B.sync = async function () {
    if (syncing || !online() || !SV() || !SV().boss) return; syncing = true;
    try {
      const b = bs();
      for (const p of b.pend.slice()) {
        const r = await rpc(p.code, p.week, p.dmg);
        if (r && r.ok) { b.pend.splice(b.pend.indexOf(p), 1); if (r.week === b.week && r.code === B.code()) b.st = Object.assign(r, { at: Date.now() }); }
        else if (r && r.error && !['network', 'auth'].includes(r.error)) b.pend.splice(b.pend.indexOf(p), 1);   // refused for good (old week, left the party)
        else break;
      }
      const r = await rpc(B.code(), b.week, 0);
      if (r && r.ok) b.st = Object.assign(r, { at: Date.now(), guess: false });
      if (b.prev && online()) { const pr = await rpc(b.prev.code && b.prev.code !== 'local' ? b.prev.code : B.code(), b.prev.week, 0); if (pr && pr.ok) b.prev.st = Object.assign(pr, { guess: false }); else if (pr && pr.error && pr.error !== 'network') b.prev.done = 1; }
      checkReward(); G().save();
    } finally { syncing = false; }
  };
  // ---------------------------------------------------------------- rewards
  function rewardFor(st, week) {
    const me = B.me(), b = bs();
    if (!st || st.hp > 0 || b.claimed[week]) return false;
    if (!((st.hits || {})[me] > 0) && !(week === b.week && b.mine > 0 && st.code === 'local')) return false;
    b.claimed[week] = 1;
    const boss = B.bossOf(week), rnd = D.mulberry32(D.hashStr(week + ':' + me + ':' + SV().seedBase));
    const pool = [['axe', 1], ['machete', 1], ['spikedbat', 1], ['lockset', 1], ['meds', 3], ['ammo', 20], ['backpack', 1], ['prybar', 1]].concat(SV().survivor.job === 'hunter' ? [['bow', 1], ['arrow', 18]] : []);
    const [k, n] = pool[Math.floor(rnd() * pool.length)], kb = st.killed_by === me;
    const caps = 40 + (kb ? 15 : 0);
    const q = D.isWeapon(k) ? D.rollQuality(3.8, 0, rnd) : undefined;   // 0.19: boss weapons are Solid-Masterwork (~12% Masterwork)
    const left = G().give(k, n, undefined, q);
    SV().trader.caps += caps; b.wins++;
    let cos = null; if (rnd() < .35) { cos = boss.cos; G().unlockCos('cos_' + cos); }
    b.reward = { week, boss: boss.name, k, n, q, left, caps, cos, kb, seen: false };
    return true;
  }
  function checkReward() {
    const b = bs(); let got = false;
    if (b.prev) { // last week's boss: decided once we hold its final state (this phone's, or fetched from the server)
      const st = b.prev.st;
      if (st && !st.guess) { if (rewardFor(st, b.prev.week)) got = true; b.prev = null; }
      else if (b.prev.done || b.claimed[b.prev.week]) b.prev = null;
    }
    if (b.st && b.st.week === b.week && rewardFor(b.st, b.week)) got = true;
    if (got) { G().save(); if (!DM.scene) setTimeout(() => G().renderHome(), 50); }
  }
  B.checkReward = checkReward;
  function rewardSheet() {
    const r = bs().reward; if (!r || r.seen) return;
    const el = $('#msheet');
    el.innerHTML = `<div class="mcard bosswin"><div class="kick">Weekly boss · down!</div><h3>${esc(r.boss)} is finished</h3>
      <p class="mp">${r.kb ? 'You landed the killing blow.' : 'Your crew of survivors finished it off.'} Everyone who hit it this week gets a share.</p>
      <div class="bwrow">${icon(r.k)}<b>${r.q && G().qTag ? D.QUAL[r.q].n + ' ' : ''}${D.ITEMS[r.k].n}${r.n > 1 ? ' x' + r.n : ''}</b>${r.q && G().qTag ? G().qTag({ q: r.q }) : ''}</div>
      <div class="bwrow">${icon('caps')}<b>${r.caps} caps</b>${r.kb ? '<em>+15 for the last hit</em>' : ''}</div>
      ${r.cos ? `<div class="bwrow cos"><img alt="" src="${ART.iconURL['cos_' + r.cos]}"><b>${esc(D.COS[r.cos].n)}</b><em>boss cosmetic!</em></div>` : ''}
      ${r.left ? '<p class="mp warn">Pack and stash are full: some of it could not be carried.</p>' : ''}
      <button class="mbtn" id="bwOk">Nice</button></div>`;
    el.classList.add('on'); el.onclick = null;
    $('#bwOk').onclick = () => { r.seen = true; G().save(); el.classList.remove('on'); el.innerHTML = ''; G().renderHome(); };
  }

  // ---------------------------------------------------------------- home card + house list entry
  const hitters = st => Object.entries(st.hits || {}).filter(([, d]) => d > 0).sort((a, b) => b[1] - a[1]);
  const who = h => h === 'me' ? 'you' : '@' + h;
  B.cardHTML = function (compact) {
    B.roll();
    const b = bs(), st = B.state(), boss = B.bossOf(b.week), ws = B.weekSteps(), far = ws < B.STEPS, dead = st.hp <= 0, left = B.fightsLeft();
    const hs = hitters(st), pct = Math.max(0, st.hp / st.max * 100), dl = B.daysLeft();
    const code = B.code(), party = code !== 'local' && !code.startsWith('solo:');
    const btn = dead ? '' : far ? '' : left ? '<button class="mbtn" data-boss="go">Fight</button>' : '';
    if (compact) return `<div class="hcard bossh"><div class="bicon bossic" style="--bc:${boss.col}">${SKULLB}</div>
      <div class="hinfo"><div class="hname">${esc(boss.name)} <em>weekly boss</em></div><div class="haddr">${esc(boss.place)}</div>
      <div class="bbar sm"><i style="width:${pct}%"></i></div>
      <div class="hdays">${dead ? 'Defeated!' : far ? `${fmt(B.STEPS - ws)} more steps this week to reach it` : left ? `${left}/${B.PER_DAY} fights left today` : 'No fights left today - back tomorrow'}</div></div>
      ${btn ? `<div class="hbtns">${btn}</div>` : ''}</div>`;
    return `<div class="bosscard${dead ? ' dead' : ''}" style="--bc:${boss.col}"><div class="hhead"><span class="kick">Weekly boss</span><span class="hwhen">${dl <= 1 ? 'last day!' : dl + ' days left'} · Mon-Sun NY</span></div>
      <div class="bname">${esc(boss.name)}</div><div class="bplace">${esc(boss.place)}${party ? ` · party <b>${esc(code)}</b>` : code === 'local' ? ' · on this phone (sign in to share it)' : ' · solo'}</div>
      <div class="bbar"><i style="width:${pct}%"></i><span>${dead ? 'DOWN' : `${fmt(st.hp)} / ${fmt(st.max)}`}</span></div>
      <div class="bhits">${hs.length ? hs.slice(0, 5).map(([h, d]) => `<span${h === B.me() ? ' class="me"' : ''}>${esc(who(h))} <b>${fmt(d)}</b></span>`).join('') : '<span class="none">Nobody has hit it yet this week.</span>'}${st.killed_by ? `<span class="kb">killed by ${esc(who(st.killed_by))}</span>` : ''}</div>
      <div class="hbtnrow">${dead ? `<span class="hdone">${bs().claimed[b.week] ? 'Reward collected' : b.mine ? 'Reward on its way' : 'Beaten this week - hit it next week to share the reward'}</span>`
        : far ? `<span class="hdone">${fmt(ws)}/${fmt(B.STEPS)} steps this week · walk to reach it</span>` : left ? `<button class="mbtn sm" data-boss="go">Fight (${left}/${B.PER_DAY} today)</button>` : '<span class="hdone">2 fights a day - back tomorrow</span>'}<button class="mbtn sm ghost" data-boss="info">Info</button></div></div>`;
  };
  const SKULLB = '<svg viewBox="0 0 40 40"><path d="M20 5c-8.3 0-14 5.6-14 13 0 4.6 2.2 7.3 4.6 8.6V32c0 1.6 1.2 2.6 2.6 2.6h13.6c1.4 0 2.6-1 2.6-2.6v-5.4C31.8 25.3 34 22.6 34 18 34 10.6 28.3 5 20 5z" fill="var(--bc)" stroke="#11142f" stroke-width="3" stroke-linejoin="round"/><circle cx="14.5" cy="19" r="4" fill="#11142f"/><circle cx="25.5" cy="19" r="4" fill="#11142f"/><path d="M20 23l-2.4 4h4.8z" fill="#11142f"/><path d="M15 31v3M20 31v3M25 31v3" stroke="#11142f" stroke-width="2"/></svg>';
  B.bind = function (root) {
    (root || document).querySelectorAll('[data-boss]').forEach(b => b.onclick = () => { SFX.play('ui'); if (b.dataset.boss === 'go') B.fight(); else infoSheet(); });
    if (bs().reward && !bs().reward.seen && !DM.scene) setTimeout(rewardSheet, 300);
  };
  function infoSheet() {
    const b = bs(), boss = B.bossOf(b.week), st = B.state(), next = B.bossOf(keyOfUTC(Date.UTC(...b.week.split('-').map((x, i) => i === 1 ? x - 1 : +x)) + 7 * 864e5));
    const el = $('#msheet');
    el.innerHTML = `<div class="mcard"><div class="kick">Weekly boss</div><h3>${esc(boss.name)}</h3><p class="mp">${esc(boss.blurb)}</p>
      <div class="evrow"><b>Where</b><span>${esc(boss.place)}. Reachable after ${fmt(B.STEPS)} steps in the week (Mon-Sun, New York time).</span></div>
      <div class="evrow"><b>Health</b><span>Shared by your whole party for the whole week. Every fight's damage is added. ${fmt(st.max)} HP${B.code() === 'local' ? ' (on this phone - sign in and join a party to share it)' : ''}.</span></div>
      <div class="evrow"><b>Fights</b><span>${B.PER_DAY} a day, ${B.FIGHT_S} seconds each. Watch the red markers: they show where the next attack lands. Going down just ends the fight - you keep your pack.</span></div>
      <div class="evrow"><b>Reward</b><span>When it falls, everyone who hit it gets one good item, caps, and a chance at <b>${esc(D.COS[boss.cos].n)}</b>.</span></div>
      <div class="evrow"><b>Next week</b><span>${esc(next.name)}</span></div>
      <button class="mbtn ghost" id="biClose">Close</button></div>`;
    el.classList.add('on'); el.onclick = e => { if (e.target === el) close(); };
    $('#biClose').onclick = close;
    function close() { el.classList.remove('on'); el.innerHTML = ''; }
  }

  // ---------------------------------------------------------------- the arena
  function arena(boss) {
    const W = 15, rows = [];
    rows.push('#'.repeat(W));
    for (let y = 1; y <= 14; y++) rows.push('#' + 'a'.repeat(W - 2) + '#');
    rows.push('#'.repeat(7) + '+' + '#'.repeat(7));
    rows.push('o'.repeat(W)); rows.push('o'.repeat(W));
    const furn = {
      butcher: [{ art: 'counter', at: [2, 1, 3, 1], H: 34 }, { art: 'fridge', at: [10, 1, 1, 1], H: 62 }, { art: 'fridge', at: [11, 1, 1, 1], H: 62 }, { art: 'crate', at: [2, 8, 1, 1], H: 30 }, { art: 'crate', at: [12, 6, 1, 1], H: 30 }, { art: 'table', at: [10, 10, 2, 1], H: 24 }],
      ash: [{ art: 'bench', at: [1, 5, 2, 1], H: 20 }, { art: 'bench', at: [12, 5, 2, 1], H: 20 }, { art: 'bench', at: [1, 9, 2, 1], H: 20 }, { art: 'bench', at: [12, 9, 2, 1], H: 20 }, { art: 'heater', at: [2, 1, 1, 1], H: 54 }],
      warden: [{ art: 'car', at: [1, 3, 2, 3], H: 34 }, { art: 'crate', at: [12, 8, 1, 1], H: 30 }, { art: 'supply', at: [11, 1, 2, 1], H: 56 }, { art: 'crate', at: [2, 11, 1, 1], H: 30 }],
      nurse: [{ art: 'bed', at: [1, 2, 2, 3], H: 18 }, { art: 'bed', at: [12, 2, 2, 3], H: 18 }, { art: 'shelves', at: [2, 9, 2, 1], H: 58 }, { art: 'locker', at: [12, 9, 1, 1], H: 62 }, { art: 'chair', at: [3, 12, 1, 1], H: 16, solid: 0 }],
    }[boss.id] || [];
    return {
      id: 'boss', type: 'boss', name: boss.name, address: boss.place, rows, doors: { '7,15': 'a' },
      rooms: { a: { name: boss.name, style: boss.floor }, o: { name: 'Street', style: 'o' } },
      street: 'o', streetY: 16, stoop: { x: 7.5 }, frontDoor: '7,15', start: { x: 7.5, y: 13.4 },
      decor: { '3,0': 'window', '4,0': 'window', '10,0': 'window', '11,0': 'window' }, rugs: [], zombies: [], secrets: [], furn, wanderer: false, emptyPct: 0,
    };
  }

  let F = null;   // the running fight
  B.active = () => !!F;
  B.fight = function () {
    if (DM.scene) return;
    B.roll();
    const b = bs(), st = B.state(), boss = B.bossOf(b.week);
    if (B.weekSteps() < B.STEPS) { toast(`Walk ${fmt(B.STEPS - B.weekSteps())} more steps this week to reach it`, 2.2); return; }
    if (st.hp <= 0) { toast('It is already down this week', 1.6); return; }
    if (!B.fightsLeft()) { toast('Two boss fights a day - come back tomorrow', 2); return; }
    if (SV().survivor.hp < 15) { toast('Too hurt to fight. Eat or patch up first.', 2.2); return; }
    b.fights[today()] = (b.fights[today()] || 0) + 1; G().save();
    G().hideMenu();
    const L = arena(boss);
    F = { boss, hp0: st.hp, max: st.max, t: 0, over: false, z: null, tele: null, dealt: 0, minions: 0 };
    document.body.classList.add('bossfight');
    const O = {
      hint: `${boss.name} · ${boss.place}`, noFog: true, noBoss: true, tick, zupdate, drawUnder,
      onDown: () => endFight('down'),
      onExit: res => { document.body.classList.remove('bossfight'); $('#shiftbar').innerHTML = ''; const f = F; F = null; record(f); G().afterRun(Object.assign({}, res, { boss: !!(f && f.z && f.z.dead) })); },
    };
    H().start(L, DM.Crew ? DM.Crew.wrap(O, 'boss') : O);
    const g = H().G;
    const z = H().spawn(7.5 * T, 3.6 * T, { kind: 'wboss', hp: st.hp / B.ARMOR, maxHp: st.max / B.ARMOR, hp0: st.hp / B.ARMOR, hw: 18, hh: 12, scale: 1.55, over: OVER[boss.id], st: 'chase', bst: 'intro', bT: 0, gT: 3, gi: 0, cdS: 0, hunter: true });
    z.flip = false; F.z = z;
    g.banners.push({ text: boss.name.toUpperCase(), sub: 'weekly boss', t: 0 }); SFX.play('groan');
  };
  function record(f) {
    if (!f || f.recorded) return; f.recorded = true;
    const dmg = Math.max(0, Math.min(2000, Math.round(f.dealt)));
    const b = bs(); if (!dmg) { G().save(); return; }
    b.mine += dmg;
    const st = B.state(); st.hp = Math.max(0, st.hp - dmg); st.hits[B.me()] = (st.hits[B.me()] || 0) + dmg;
    if (st.hp <= 0 && !st.killed_by) st.killed_by = B.me();
    if (st.code !== 'local') { b.pend.push({ code: st.code, week: b.week, dmg }); st.guess = true; }
    G().save();
    if (st.code === 'local') checkReward(); else B.sync().catch(() => { });
  }
  // damage numbers the boss can take: stops counting once the shared health is gone
  function tick(dt, g) {
    if (!F || F.over) return;
    F.t += dt;
    const z = F.z; F.dealt = Math.min(F.hp0, Math.min(2000, (z.hp0 - Math.max(0, z.hp)) * B.ARMOR));
    if (F.dealt >= 2000 && !z.dead) { endFight('time'); return; }   // one fight counts up to 2,000 (the server's limit): it staggers off
    const left = Math.max(0, B.FIGHT_S - F.t), hp = Math.max(0, F.hp0 - F.dealt);
    const k = Math.ceil(left) + '|' + Math.round(hp);
    if (k !== F.hk) { F.hk = k; $('#shiftbar').innerHTML = `<div class="bfb"><span>${esc(F.boss.name.toUpperCase())}</span><i class="bbar sm"><i style="width:${hp / F.max * 100}%"></i></i><em>${fmt(F.dealt)} dmg</em></div><b>${Math.floor(left / 60)}:${pad(Math.floor(left % 60))}</b>`; }
    if (z.dead) { endFight('win'); return; }
    if (left <= 0) endFight('time');
  }
  function endFight(kind) {
    if (!F || F.over) return; F.over = true;
    const g = H().G, z = F.z;
    if (kind === 'win') { g.banners.push({ text: 'BOSS DOWN', sub: 'the block breathes again', t: 0 }); SFX.play('kill'); z.searched = true; }
    else if (kind === 'time') { g.banners.push({ text: 'IT FALLS BACK', sub: 'time is up', t: 0 }); z.bst = 'retreat'; }
    for (const m of g.zs) if (m !== z && !m.dead) { m.st = 'idle'; m.target = null; }
    g.paused = kind !== 'down';
    const st = B.state(), after = Math.max(0, st.hp - F.dealt);
    if (DM.Skills && F.dealt > 0) DM.Skills.addXP(6 + Math.min(14, Math.floor(F.dealt / 150)) + (kind === 'win' ? 20 : 0));   // 0.13: boss fights teach (6-20 xp, +20 for the last hit)
    setTimeout(() => {
      $('#cardBody').innerHTML = `<div class="kick${kind === 'down' ? ' red' : ''}">${kind === 'win' ? 'weekly boss · down!' : kind === 'down' ? 'knocked out' : 'fight over'}</div>
        <h2>${kind === 'win' ? `${esc(F.boss.name)} is finished` : kind === 'down' ? 'You went down' : 'Time is up'}</h2>
        <p>${kind === 'win' ? 'The reward goes to everyone who hit it this week - check the boss card at home.' : kind === 'down' ? 'Your crew dragged you out. You keep your pack - and every hit you landed still counts.' : 'It limps back into the dark. Every hit you landed counts against its health for the whole party.'}</p>
        <div class="stats"><div><b>${fmt(F.dealt)}</b>damage</div><div><b>${fmt(after)}</b>HP left</div><div><b>${g.stats.kills - (z.dead ? 1 : 0)}</b>walkers</div><div><b>${B.fightsLeft()}/${B.PER_DAY}</b>fights left</div></div>
        <div class="btnrow"><button id="cNew">Head home</button></div>`;
      $('#card').classList.add('on');
      $('#cNew').onclick = () => { $('#card').classList.remove('on'); H().exit(kind === 'down' ? 'down' : 'leave'); };
    }, kind === 'win' ? 1800 : 700);
  }

  // ---- the boss's brain (house.js calls this instead of the normal zombie logic; summoned walkers use the normal one)
  function zupdate(z, dt) {
    if (z.kind !== 'wboss') return false;
    if (z.dead) return false;                                   // the normal code lays the body down
    const g = H().G, p = g.p, ph = z.hp / z.maxHp > .66 ? 1 : z.hp / z.maxHp > .33 ? 2 : 3;
    z.stT += dt; z.flash = Math.max(0, z.flash - dt * 6); z.bT += dt;
    if (z.st === 'hurt') { z.kbx *= .2; z.kby *= .2; }          // heavy: hits barely move it
    if (z.phase !== ph) { if (z.phase) { g.banners.push({ text: ph === 3 ? 'ENRAGED' : 'IT GETS ANGRY', sub: F.boss.name, t: 0 }); SFX.play('groan'); } z.phase = ph; }
    const dx = p.x - z.x, dy = p.y - z.y, d = Math.hypot(dx, dy) || 1, spdM = 1 + .15 * (ph - 1), over = !F || F.over;
    let vx = 0, vy = 0, spd = 0, pose = 'chase';
    const face = () => { if (Math.abs(dx) > 6) { z.flip = dx > 0; z.fx = Math.sign(dx); } };
    const go = (s, b) => { z.bst = s; z.bT = 0; if (b) b(); };
    switch (z.bst) {
      case 'intro': face(); if (z.bT > 1.4) go('walk'); break;
      case 'retreat': spd = 1.2 * T; vx = 0; vy = -1; z.alpha = Math.max(0, z.alpha - dt * .6); break;
      case 'walk': {
        if (over || p.st === 'down') break;
        face();
        const see = H().los(z.x, z.y - 30, p.x, p.y - 30), st = see ? p : H().stepToPlayer(z), ex = st.x - z.x, ey = st.y - z.y, ed = Math.hypot(ex, ey) || 1;
        spd = (d < .9 * T ? 0 : 1.45 * T * spdM); vx = ex / ed; vy = ey / ed;
        z.gT -= dt; z.cdS = Math.max(0, z.cdS - dt);
        if (d < 1.35 * T && z.cdS <= 0) go('swipeW');
        else if (z.gT <= 0) {
          const gim = F.boss.gim[z.gi++ % F.boss.gim.length];
          if (gim === 'charge') go('chargeW', () => { z.ang = Math.atan2(dy, dx); z.tele = { type: 'line', ang: z.ang, len: 8 * T, t: 0 }; SFX.play('alert'); });
          else if (gim === 'slam') go('slamW', () => { z.tele = { type: 'ring', r: (2.3 + .3 * ph) * T, t: 0 }; SFX.play('groan'); });
          else go('summonW', () => { z.tele = { type: 'call', t: 0 }; SFX.play('groan'); });
        }
        break;
      }
      case 'swipeW': face(); pose = 'windup'; if (z.bT > .55 / spdM) go('swipe', () => { SFX.play('whoosh'); }); break;
      case 'swipe': pose = 'lunge'; if (!z.hitDone && d < 1.45 * T && Math.abs(dy) < 40) { z.hitDone = 1; H().hurtPlayer(13 + 2 * ph, dx / d, dy / d, null); }
        if (z.bT > .25) { z.hitDone = 0; z.cdS = 1.1 / spdM; go('walk'); } break;
      case 'chargeW': pose = 'windup'; z.tele.t = z.bT; if (z.bT < .6) { z.ang = Math.atan2(dy, dx); z.tele.ang = z.ang; z.flip = dx > 0; } if (z.bT > .95 / Math.sqrt(spdM)) go('charge', () => { z.tele = null; SFX.play('whoosh'); z.hitDone = 0; }); break;
      case 'charge': {
        pose = 'lunge'; spd = 7.5 * T; vx = Math.cos(z.ang); vy = Math.sin(z.ang);
        if (!z.hitDone && d < .95 * T) { z.hitDone = 1; H().hurtPlayer(18 + 2 * ph, vx, vy, null); }
        const want = spd * dt, m = moveBoss(z, vx * want, vy * want); spd = 0;
        if (m < want * .3 && z.bT > .08) { go('stun'); g.shake = 14; SFX.play('thunk'); H().puff(z.x, z.y, 20, 14, 'rgba(234,210,164,.6)', 120, .7, 4); toast('It slammed into the wall - hit it now!', 1.6); }
        else if (z.bT > .75) { go('walk'); z.gT = (5.5 - ph) * (.8 + Math.random() * .4); }
        break;
      }
      case 'stun': pose = 'hurt'; if (z.bT > 1.6) { go('walk'); z.gT = (5.5 - ph) * (.8 + Math.random() * .4); } break;
      case 'slamW': pose = 'windup'; z.tele.t = z.bT; if (z.bT > 1.05 / Math.sqrt(spdM)) go('slam', () => {
        const r = z.tele.r; z.tele = null; g.shake = 16; SFX.play('kill'); g.rings.push({ x: z.x, y: z.y, r, t: 0 });
        H().puff(z.x, z.y, 6, 22, 'rgba(234,210,164,.55)', 220, .8, 5);
        if (Math.hypot(dx, dy * 1.2) < r) H().hurtPlayer(16 + 3 * ph, dx / d, dy / d, null);
      }); break;
      case 'slam': pose = 'lunge'; if (z.bT > .5) { go('walk'); z.gT = (5.5 - ph) * (.8 + Math.random() * .4); } break;
      case 'summonW': pose = 'windup'; z.tele.t = z.bT; if (z.bT > .9) go('walk', () => {
        z.tele = null; z.gT = (6 - ph) * (.8 + Math.random() * .4);
        const alive = g.zs.filter(m => m !== z && !m.dead).length, n = Math.min(4 - alive, ph >= 3 ? 3 : 2);
        for (let i = 0; i < n; i++) { const sx = (i % 2 ? 12.5 : 2.5) * T, sy = (2.5 + Math.random() * 6) * T; H().spawn(sx, sy, { hunter: true, hp: 70, maxHp: 70, st: 'chase' }); H().puff(sx, sy, 10, 12, 'rgba(90,84,98,.8)', 80, .9, 5); }
        if (n > 0) toast(`${F.boss.name} calls the dead!`, 1.6);
      }); break;
    }
    if (z.bst !== 'charge') {
      const tvx = vx * spd, tvy = vy * spd, k = 1 - Math.exp(-10 * dt);
      z.vx = E.lerp(z.vx, tvx, k); z.vy = E.lerp(z.vy, tvy, k);
      moveBoss(z, (z.vx + z.kbx) * dt, (z.vy + z.kby) * dt);
    } else { z.vx = Math.cos(z.ang) * 7.5 * T; z.vy = Math.sin(z.ang) * 7.5 * T; }
    z.kbx *= Math.exp(-9 * dt); z.kby *= Math.exp(-9 * dt);
    z.ph += Math.hypot(z.vx, z.vy) * dt / (T * .5) * Math.PI * .5;
    z.st = pose === 'chase' ? 'chase' : pose;                   // drives the zombie rig's poses in house.js
    if (pose === 'windup') { z.stT = Math.min(z.bT, .4); }
    return true;
  }
  function moveBoss(z, dx, dy) { const ox = z.x, oy = z.y; H().move(z, dx, dy); return Math.hypot(z.x - ox, z.y - oy); }
  // telegraphs on the floor (under everyone)
  function drawUnder(c, g) {
    if (!F || !F.z) return;
    const z = F.z;
    if (!z.dead) { const gl = c.createRadialGradient(z.x, z.y, 4, z.x, z.y, 70); gl.addColorStop(0, F.boss.col + '55'); gl.addColorStop(1, F.boss.col + '00'); c.fillStyle = gl; c.fillRect(z.x - 70, z.y - 70, 140, 140); }
    const t = z.tele; if (!t || z.dead) return;
    const pulse = .35 + .25 * Math.sin(g.t * 18);
    c.save();
    if (t.type === 'line') {
      c.translate(z.x, z.y); c.rotate(t.ang);
      c.fillStyle = `rgba(255,90,72,${pulse})`; c.fillRect(0, -22, t.len, 44);
      c.strokeStyle = 'rgba(255,90,72,.9)'; c.lineWidth = 3; c.setLineDash([10, 8]); c.strokeRect(0, -22, t.len, 44); c.setLineDash([]);
      for (let x = 40; x < t.len; x += 60) { c.beginPath(); c.moveTo(x, -12); c.lineTo(x + 16, 0); c.lineTo(x, 12); c.strokeStyle = 'rgba(246,227,187,.8)'; c.lineWidth = 4; c.stroke(); }
    } else if (t.type === 'ring') {
      const k = Math.min(1, t.t / 1.0);
      c.beginPath(); c.ellipse(z.x, z.y, t.r, t.r * .8, 0, 0, 6.28); c.fillStyle = `rgba(255,90,72,${.12 + pulse * .4})`; c.fill();
      c.lineWidth = 3; c.strokeStyle = 'rgba(255,90,72,.95)'; c.stroke();
      c.beginPath(); c.ellipse(z.x, z.y, t.r * k, t.r * .8 * k, 0, 0, 6.28); c.strokeStyle = 'rgba(246,227,187,.85)'; c.lineWidth = 2.5; c.stroke();
    } else if (t.type === 'call') {
      for (const sx of [2.5, 12.5]) { c.beginPath(); c.ellipse(sx * T, 5 * T, 30, 18, 0, 0, 6.28); c.fillStyle = `rgba(157,144,191,${pulse})`; c.fill(); }
    }
    c.restore();
  }
  // what each boss wears (zombie-rig head coordinates: the head faces left, pivot at -20,-108)
  const OVER = {
    butcher(c) { c.lineJoin = 'round'; c.lineWidth = 4; c.strokeStyle = P.INK; c.beginPath(); c.moveTo(-52, -168); c.quadraticCurveTo(-10, -186, 26, -166); c.lineTo(24, -154); c.quadraticCurveTo(-10, -172, -50, -156); c.closePath(); c.fillStyle = '#e9e2cf'; c.fill(); c.stroke(); c.fillStyle = '#9e2b35'; c.beginPath(); c.arc(-14, -166, 5, 0, 6.3); c.fill(); c.beginPath(); c.arc(8, -165, 3, 0, 6.3); c.fill(); },
    ash(c) { c.lineCap = 'round'; for (const [x0, x1, y1] of [[-40, -48, -206], [-22, -24, -214], [-4, 2, -216], [12, 22, -204]]) { c.beginPath(); c.moveTo(x0, -168); c.lineTo(x1, y1); c.strokeStyle = P.INK; c.lineWidth = 9; c.stroke(); c.strokeStyle = '#5a5462'; c.lineWidth = 5; c.stroke(); c.fillStyle = '#ffb06a'; c.beginPath(); c.arc(x1, y1, 4.5, 0, 6.3); c.fill(); } c.beginPath(); c.moveTo(-52, -170); c.quadraticCurveTo(-14, -184, 28, -168); c.lineTo(26, -158); c.quadraticCurveTo(-14, -172, -50, -160); c.closePath(); c.fillStyle = '#3a3440'; c.fill(); c.lineWidth = 4; c.strokeStyle = P.INK; c.stroke(); },
    warden(c) { c.lineJoin = 'round'; c.lineWidth = 4; c.strokeStyle = P.INK; c.beginPath(); c.moveTo(-50, -166); c.quadraticCurveTo(-48, -204, -12, -206); c.quadraticCurveTo(22, -204, 24, -168); c.quadraticCurveTo(-12, -176, -50, -166); c.closePath(); c.fillStyle = '#2c3462'; c.fill(); c.stroke(); c.beginPath(); c.moveTo(-50, -166); c.quadraticCurveTo(-70, -162, -76, -152); c.quadraticCurveTo(-58, -152, -40, -160); c.closePath(); c.fillStyle = '#16152a'; c.fill(); c.stroke(); c.beginPath(); c.moveTo(-18, -196); c.lineTo(-10, -202); c.lineTo(-2, -196); c.lineTo(-4, -186); c.lineTo(-16, -186); c.closePath(); c.fillStyle = '#e0b94b'; c.fill(); c.lineWidth = 2.4; c.stroke(); },
    nurse(c) { c.lineJoin = 'round'; c.lineWidth = 4; c.strokeStyle = P.INK; c.beginPath(); c.moveTo(-42, -168); c.lineTo(-36, -194); c.lineTo(14, -194); c.lineTo(18, -168); c.quadraticCurveTo(-12, -176, -42, -168); c.closePath(); c.fillStyle = '#e9e6f0'; c.fill(); c.stroke(); c.fillStyle = '#b53a2e'; c.fillRect(-16, -190, 8, 18); c.fillRect(-21, -185, 18, 8); },
  };

  // test hook (local copies): pretend this week's steps are walked
  B.dev = { steps: () => { B.roll(); bs().w0 = (SV().walked || 0) - B.STEPS - 100; G().save(); }, fights: () => { bs().fights = {}; G().save(); }, hurt: n => { const st = B.state(); st.hp = Math.max(1, st.hp - n); G().save(); } };
})();
