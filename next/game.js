/* Dead Miles (next) - meta game: save, character creation, steps -> scouted houses, home screen, pack/stash.
   Steps arrive through ONE function: DM.addSteps(n, src) with src 'phone' | 'typed' | 'walk'.
   DM.onlineState is reserved for the account panel (net.js, written separately). */
'use strict';
(() => {
  const D = DM.D, E = DM.E, $ = E.$, SFX = E.SFX, toast = E.toast;
  const KEY = 'dm-next-save', VER = 1, VERSION = 'next 0.3';
  const STASH_SLOTS = 40;
  DM.onlineState = { signedIn: false, name: null, lastSync: null, status: 'offline' };
  const Game = DM.Game = {};
  let SV = null;

  // ---------------------------------------------------------------- dates
  const pad = n => String(n).padStart(2, '0');
  const today = () => { const d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  const dayNum = k => { const [y, m, d] = k.split('-').map(Number); return Math.round(Date.UTC(y, m - 1, d) / 864e5); };
  const keyOf = n => { const d = new Date(n * 864e5); return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()); };

  // ---------------------------------------------------------------- save
  function fresh() {
    return { v: VER, created: Date.now(), seedBase: (Math.random() * 1e9) >>> 0, survivor: null, day: { key: today(), phone: 0, typed: 0, walk: 0, scouted: 0 },
      houses: [], houseSeq: 0, tutorialDone: false, stats: { runs: 0, kills: 0, secrets: 0, auto: 0, downs: 0 } };
  }
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) { const v = JSON.parse(raw); if (v && v.v === VER) return v; }
    } catch (e) { /* blocked or corrupt: start fresh */ }
    return fresh();
  }
  Game.save = function () {
    try { localStorage.setItem(KEY, JSON.stringify(SV)); } catch (e) { /* storage blocked */ }
  };
  Game.data = () => SV;

  // ---------------------------------------------------------------- survivor
  const maxHp = s => s.job === 'brawler' ? 130 : 100;
  function createSurvivor(name, look, job) {
    const J = D.JOBS[job];
    let xp = 0; try { const v = JSON.parse(localStorage.getItem('dm-next-skills') || '{}'); if (v.scav) xp = +v.scav.xp || 0; } catch (e) { /* none */ }
    const s = { name: name || 'Survivor', look, job, hp: 0, xp, pack: [], stash: [], hands: null };
    s.hp = maxHp(s);
    for (const [k, n] of J.kit) {
      if (k === J.hands) { s.hands = { k, d: D.WEAPONS[D.ITEMS[k].w].dur }; continue; }
      addTo(s.pack, 12, k, n, D.isWeapon(k) ? D.WEAPONS[D.ITEMS[k].w].dur : undefined);
    }
    return s;
  }
  function addTo(list, slots, k, n, d) {
    const m = D.stackMax(k); let left = n;
    for (const e of list) if (e.k === k && e.n < m && left) { const t = Math.min(left, m - e.n); e.n += t; left -= t; }
    while (left && list.length < slots) { const t = Math.min(left, m); const e = { k, n: t }; if (d != null) e.d = d; list.push(e); left -= t; }
    return n - left;
  }
  const packSlots = () => D.scavLvl(SV.survivor.xp) >= 9 ? 14 : 12;

  // ---------------------------------------------------------------- steps -> houses
  const effective = d => d.phone + d.walk + d.typed * .5;
  const worth = e => Math.min(e, 7000) + .5 * Math.max(0, Math.min(e - 7000, 8000)) + .15 * Math.max(0, e - 15000);
  const housesFor = w => w < 600 ? 0 : Math.min(10, Math.round(.75 * w / 1000 + .75));
  function nextHouseAt(d) { // effective steps needed for the next scouted house
    const n = housesFor(worth(effective(d)));
    if (n >= 10) return null;
    let lo = effective(d), hi = 60000;
    for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2; if (housesFor(worth(mid)) > n) hi = mid; else lo = mid; }
    return Math.ceil(hi);
  }
  DM.addSteps = function (n, src = 'phone') {
    if (!SV) return 0;
    rollDay();
    n = Math.max(0, Math.round(+n || 0));
    if (!['phone', 'typed', 'walk'].includes(src)) src = 'phone';
    if (src === 'typed') n = Math.min(n, Math.max(0, 4000 - SV.day.typed));
    SV.day[src] += n;
    const before = SV.day.scouted;
    scout();
    Game.save();
    if (SV.day.scouted > before) toast(`Scouted ${SV.day.scouted - before} new house${SV.day.scouted - before > 1 ? 's' : ''}`, 2);
    renderHome();
    return n;
  };
  function scout() {
    const w = worth(effective(SV.day)), target = housesFor(w);
    while (SV.day.scouted < target) { SV.day.scouted++; addHouse(worth(effective(SV.day)) * SV.day.scouted / Math.max(1, target)); }
  }
  function pickType(w, rnd) {
    const T = D.BTYPES, keys = Object.keys(T).filter(k => T[k].w > 0);
    // more steps today = slightly better odds of bigger, rarer buildings
    const wt = keys.map(k => T[k].w * (1 + (T[k].big || 0) * w / 9000));
    let v = rnd() * wt.reduce((a, b) => a + b, 0);
    for (let i = 0; i < keys.length; i++) { v -= wt[i]; if (v <= 0) return keys[i]; }
    return keys[0];
  }
  function addHouse(w) {
    const seq = SV.houseSeq++;
    const seed = D.hashStr(SV.seedBase + ':' + seq);
    const type = pickType(w, D.mulberry32(seed ^ 0x9e3779b9));
    const L = layoutOf({ type, seed });
    SV.houses.push({ id: 'h' + seq, type, seed, day: SV.day.key, status: 'new', address: L.address, danger: L.danger, nLocks: L.nLocks, nZombies: L.nZombies });
  }
  const cache = new Map();
  function layoutOf(h) {
    const k = h.type + ':' + h.seed;
    if (!cache.has(k)) cache.set(k, h.type === 'tutorial' ? DM.Gen.tutorial() : DM.Gen.generate(h.type, h.seed));
    return cache.get(k);
  }
  Game.layoutOf = layoutOf;
  function rollDay(force) {
    const t = today();
    if (SV.day.key === t && !force) return;
    const days = Math.max(1, dayNum(t) - dayNum(SV.day.key));
    const s = SV.survivor;
    if (s) s.hp = Math.min(maxHp(s), s.hp + 25 * days); // rest heals a little each day
    SV.day = { key: t, phone: 0, typed: 0, walk: 0, scouted: 0 };
    // unlooted houses last 3 days; finished ones are cleared from the list
    SV.houses = SV.houses.filter(h => h.status === 'new' && dayNum(t) - dayNum(h.day) < 3);
  }
  function devNewDay() { // pretend a day passed: shift every date back one day, then roll over
    SV.day.key = keyOf(dayNum(SV.day.key) - 1);
    for (const h of SV.houses) h.day = keyOf(dayNum(h.day) - 1);
    rollDay(true); Game.save(); renderHome(); toast('A new day', 1.4);
  }

  // ---------------------------------------------------------------- crew auto-search: instant, ~40% of the loot, never secrets
  function autoSearch(h) {
    const L = layoutOf(h), rnd = D.mulberry32(h.seed ^ 0x5bd1e995);
    const got = [];
    for (const f of L.furn) {
      if (!f.loot || f.secretLoot) continue;
      if (f.lock && rnd() < .5) continue; // the crew skips half the locked stuff
      for (const k of D.rollLoot(f.loot, rnd)) if (rnd() < .4) got.push(k);
    }
    const stacks = D.toStacks(got, rnd), lost = [];
    for (const e of stacks) { const n = addTo(SV.survivor.stash, STASH_SLOTS, e.k, e.n, e.d); if (n < e.n) lost.push({ k: e.k, n: e.n - n }); }
    h.status = 'auto'; SV.stats.auto++;
    SV.survivor.xp += 3;
    Game.save();
    showResult(L.name + ' · ' + L.address, stacks, lost, 'Everything went to your stash. The crew grabs less than you would and never finds hidden compartments.');
    renderHome();
  }

  // ---------------------------------------------------------------- runs
  function loot(h) {
    if (SV.survivor.hp < 15) { toast('Too hurt to go in. Eat or patch up first.', 2.2); return; }
    const L = Object.assign({}, layoutOf(h), { id: h.id });
    SV.stats.runs++; Game.save();
    hideMenu();
    DM.House.start(L, {
      hint: h.type === 'tutorial' ? 'Joystick to move  ·  SEARCH near furniture' : `${L.name} · ${L.address}`,
      onExit: res => {
        h.status = 'looted'; if (h.type === 'tutorial') SV.tutorialDone = true;
        SV.stats.kills += res.kills; SV.stats.secrets += res.secrets; if (res.kind === 'down') SV.stats.downs++;
        Game.save(); showMenu(); tab('houses'); renderHome();
        toast(res.kind === 'down' ? 'You made it home. Barely.' : `Home safe from ${res.address}`, 2.4);
      },
    });
  }

  // ---------------------------------------------------------------- UI helpers
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const icon = k => `<img alt="" src="${ART.iconURL[D.ITEMS[k].i]}">`;
  const SKULL = '<svg viewBox="0 0 20 20" class="skull"><path d="M10 2C5.6 2 3 5 3 8.6c0 2.2 1 3.6 2.4 4.4V16h2v-1.6h1.3V16h2.6v-1.6h1.3V16h2v-3c1.4-.8 2.4-2.2 2.4-4.4C17 5 14.4 2 10 2z" fill="currentColor"/><circle cx="7.2" cy="9" r="1.9" fill="#1c1538"/><circle cx="12.8" cy="9" r="1.9" fill="#1c1538"/></svg>';
  const B = {
    row: '<rect x="18" y="8" width="28" height="48" fill="#8a4a3a"/><path d="M14 8h36v5H14z" fill="#5e2a2a"/><g fill="#f6e3bb"><rect x="22" y="17" width="7" height="9"/><rect x="35" y="17" width="7" height="9"/><rect x="22" y="31" width="7" height="9"/><rect x="35" y="31" width="7" height="9"/></g><rect x="28" y="44" width="8" height="12" fill="#11142f"/><path d="M24 56h16v3H24z" fill="#9d90bf"/>',
    apt: '<rect x="10" y="12" width="44" height="44" fill="#5a4a86"/><g fill="#f6e3bb">' + [0, 1, 2].map(r => [0, 1, 2].map(c => `<rect x="${15 + c * 13}" y="${17 + r * 12}" width="8" height="7"/>`).join('')).join('') + '</g><rect x="28" y="49" width="8" height="7" fill="#11142f"/>',
    shop: (aw, extra) => `<rect x="8" y="16" width="48" height="40" fill="#4a4060"/><path d="M6 16h52v8H6z" fill="${aw[0]}"/><g fill="${aw[1]}">${[0, 1, 2, 3, 4, 5].map(i => `<rect x="${6 + i * 9}" y="16" width="4.5" height="8"/>`).join('')}</g><rect x="13" y="30" width="20" height="16" fill="#f6e3bb"/><rect x="38" y="30" width="12" height="26" fill="#11142f"/>${extra || ''}`,
    garage: '<rect x="8" y="14" width="48" height="42" fill="#4a4660"/><path d="M6 14h52l-4-6H10z" fill="#7d8398"/><g fill="#9aa0b4">' + [0, 1, 2, 3, 4].map(i => `<rect x="14" y="${26 + i * 6}" width="36" height="4"/>`).join('') + '</g>',
    school: '<rect x="6" y="22" width="52" height="34" fill="#8a4a3a"/><path d="M22 22l10-12 10 12z" fill="#5e2a2a"/><circle cx="32" cy="19" r="4" fill="#f6e3bb"/><g fill="#f6e3bb"><rect x="11" y="30" width="8" height="8"/><rect x="45" y="30" width="8" height="8"/><rect x="11" y="43" width="8" height="8"/><rect x="45" y="43" width="8" height="8"/></g><rect x="27" y="40" width="10" height="16" fill="#11142f"/><path d="M32 4v9" stroke="#11142f" stroke-width="2"/><path d="M32 4h8v4h-8z" fill="#f07b3c"/>',
    police: '<rect x="8" y="18" width="48" height="38" fill="#3a4470"/><path d="M8 18h48v6H8z" fill="#262a52"/><path d="M32 28l3 6 6 1-4.5 4 1 6-5.5-3-5.5 3 1-6-4.5-4 6-1z" fill="#e0b94a" stroke="#11142f" stroke-width="1.2"/><rect x="28" y="46" width="8" height="10" fill="#11142f"/>',
    mansion: '<rect x="6" y="26" width="52" height="30" fill="#c9b48a"/><path d="M4 26L32 8l28 18z" fill="#7a5048"/><g fill="#f6e3bb">' + [0, 1, 2, 3].map(i => `<rect x="${12 + i * 12}" y="28" width="3.5" height="28"/>`).join('') + '</g><rect x="28" y="40" width="8" height="16" fill="#11142f"/>',
  };
  const TYPEICON = { tutorial: B.row, rowS: B.row, rowL: B.row, apt: B.apt, bodega: B.shop(['#f07b3c', '#f6e3bb']), laundro: B.shop(['#3fa7a0', '#f6e3bb'], '<circle cx="23" cy="38" r="5" fill="#5a6a8e" stroke="#11142f" stroke-width="1.5"/>'),
    pharmacy: B.shop(['#93a86c', '#f6e3bb'], '<path d="M20 34h6v-4h4v4h6v4h-6v4h-4v-4h-6z" fill="#b53a2e"/>'), garage: B.garage, school: B.school, police: B.police, mansion: B.mansion };
  const typeIcon = t => `<svg viewBox="0 0 64 64" class="bicon">${TYPEICON[t] || B.row}</svg>`;

  function showResult(title, stacks, lost, note) {
    const el = $('#mres');
    el.innerHTML = `<div class="mcard"><div class="kick">Crew search</div><h3>${esc(title)}</h3><p class="mp">${esc(note)}</p>
      <div class="sum">${stacks.length ? stacks.map(e => `<div class="sum-item${D.ITEMS[e.k].rare ? ' rare' : ''}">${icon(e.k)}<span>${D.ITEMS[e.k].n}</span>${e.n > 1 ? `<b>x${e.n}</b>` : ''}</div>`).join('') : '<div class="empty">They came back empty-handed.</div>'}</div>
      ${lost.length ? `<div class="lost">No room in the stash for: ${lost.map(e => D.ITEMS[e.k].n + (e.n > 1 ? ' x' + e.n : '')).join(', ')}</div>` : ''}
      <button class="mbtn" id="mresOk">OK</button></div>`;
    el.classList.add('on');
    $('#mresOk').onclick = () => el.classList.remove('on');
  }

  // ---------------------------------------------------------------- screens
  function hideMenu() { $('#menu').classList.add('off'); }
  function showMenu() { $('#menu').classList.remove('off'); }
  let curTab = 'houses';
  function tab(t) { curTab = t; document.querySelectorAll('#mtabs button').forEach(b => b.classList.toggle('on', b.dataset.t === t)); renderHome(); }

  // ---- character creation
  let cre = { name: '', look: 0, job: 'scavenger' };
  function renderCreate() {
    $('#menu').className = 'create';
    $('#mbody').innerHTML = `
      <div class="mhead"><div class="logo">DEAD MILES</div><div class="kick">a new survivor</div></div>
      <div class="ccard">
        <div class="cprev"><canvas id="cPort" width="200" height="240"></canvas></div>
        <div class="cform">
          <label class="kick" for="cName">Name</label>
          <input id="cName" maxlength="16" placeholder="Your name" value="${esc(cre.name)}" autocomplete="off">
          <div class="kick">Hood</div>
          <div class="swatches">${D.LOOKS.map((l, i) => `<button class="sw${i === cre.look ? ' on' : ''}" data-i="${i}" style="background:${l.c[0]}" aria-label="${l.n}"></button>`).join('')}</div>
        </div>
      </div>
      <div class="kick sect">Job</div>
      <div class="jobs">${Object.keys(D.JOBS).map(k => { const J = D.JOBS[k]; return `<button class="job${k === cre.job ? ' on' : ''}" data-j="${k}">
        <b>${J.n}</b><span>${J.perk}</span><div class="kit">${J.kit.map(([it, n]) => `<i>${icon(it)}${n > 1 ? `<em>${n}</em>` : ''}</i>`).join('')}</div></button>`; }).join('')}</div>
      <button class="mbtn big" id="cGo">Start walking</button>`;
    $('#cName').oninput = e => cre.name = e.target.value;
    document.querySelectorAll('.sw').forEach(b => b.onclick = async () => { cre.look = +b.dataset.i; await E.buildSurvivor(cre.look); renderCreate(); });
    document.querySelectorAll('.job').forEach(b => b.onclick = () => { cre.job = b.dataset.j; SFX.play('ui'); renderCreate(); });
    $('#cGo').onclick = async () => {
      SV.survivor = createSurvivor(cre.name.trim(), cre.look, cre.job);
      DM.S = SV.survivor; Game.save();
      await E.buildSurvivor(cre.look);
      renderHome();
    };
    drawPortrait($('#cPort'), cre.job ? D.JOBS[cre.job].hands : 'bat', 1.0);
  }
  function drawPortrait(c, weapon, sc = .7) {
    const dpr = c.width / c.clientWidth || 2, x = c.getContext('2d');
    x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, c.width, c.height);
    x.fillStyle = 'rgba(8,6,22,.4)'; x.beginPath(); x.ellipse(c.width / 2, c.height * .9, c.width * .28, c.width * .08, 0, 0, 6.3); x.fill();
    const wk = weapon && D.ITEMS[weapon] ? D.ITEMS[weapon].w : weapon;
    ART.drawRig(x, 'survivor', c.width / 2 - 4, c.height * .9, sc * c.height / 260, false, { weapon: wk || 'fists' });
  }

  // ---- home
  function renderHome() {
    if (!SV || !SV.survivor || DM.scene) return;
    rollDay();
    const s = SV.survivor, d = SV.day, J = D.JOBS[s.job], Lv = D.scavLvl(s.xp);
    const eff = effective(d), nxt = nextHouseAt(d), w = worth(eff);
    $('#menu').className = '';
    const hands = s.hands ? `${icon(s.hands.k)}<span>${D.ITEMS[s.hands.k].n}<i class="dur"><i style="width:${Math.max(3, s.hands.d / D.WEAPONS[D.ITEMS[s.hands.k].w].dur * 100)}%"></i></i></span>` : '<span>Fists</span>';
    $('#mbody').innerHTML = `
      <div class="mtop"><div class="logo">DEAD MILES</div><button id="mver" class="ver">${VERSION}</button><button id="mset" class="gear" aria-label="Settings"><svg viewBox="0 0 24 24"><path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zm8.4 4.6.1-1.1-.1-1.1 2-1.6-2-3.4-2.4 1a8 8 0 0 0-1.9-1.1L15.8 3h-4l-.4 2.6a8 8 0 0 0-1.9 1.1l-2.4-1-2 3.4 2 1.6-.1 1.1.1 1.1-2 1.6 2 3.4 2.4-1c.6.5 1.2.8 1.9 1.1l.4 2.6h4l.4-2.6a8 8 0 0 0 1.9-1.1l2.4 1 2-3.4z" fill="none" stroke="currentColor" stroke-width="1.7"/></svg></button></div>
      <div class="scard">
        <canvas id="mPort" width="150" height="190"></canvas>
        <div class="sinfo">
          <div class="sname">${esc(s.name)}</div>
          <div class="sjob">${J.n} · <span>${J.stats.join(' · ')}</span></div>
          <div class="mbar hp"><i style="width:${s.hp / maxHp(s) * 100}%"></i><span>HP ${Math.ceil(s.hp)}/${maxHp(s)}</span></div>
          <div class="sline">Scavenging Lv ${Lv}<div class="mbar xp"><i style="width:${Lv >= 10 ? 100 : (s.xp - D.XPCUM(Lv)) / (D.XPCUM(Lv + 1) - D.XPCUM(Lv)) * 100}%"></i></div></div>
          <div class="shands">${hands}</div>
        </div>
      </div>
      <div class="stepcard">
        <div class="steps"><b>${Math.round(d.phone + d.walk + d.typed).toLocaleString('en-US')}</b><span>steps today</span></div>
        <div class="stepinfo">${d.typed ? `${d.typed.toLocaleString('en-US')} typed (half value) · ` : ''}${Math.round(w).toLocaleString('en-US')} worth<br>
          <b>${d.scouted}</b> house${d.scouted === 1 ? '' : 's'} scouted${nxt ? ` · next at ${nxt.toLocaleString('en-US')}` : ' · that\'s the max today'}</div>
        <div class="steprow"><input id="mSteps" inputmode="numeric" placeholder="Log steps" maxlength="6"><button id="mLog" class="mbtn sm">Log</button></div>
      </div>
      <div id="mtabs"><button data-t="houses">Houses</button><button data-t="stash">Pack &amp; stash</button></div>
      <div id="mpane"></div>`;
    document.querySelectorAll('#mtabs button').forEach(b => { b.classList.toggle('on', b.dataset.t === curTab); b.onclick = () => { SFX.play('ui'); tab(b.dataset.t); }; });
    $('#mLog').onclick = () => { const v = parseInt($('#mSteps').value, 10); if (!(v > 0)) { toast('Type how many steps you walked', 1.6); return; } const used = DM.addSteps(v, 'typed'); if (used < v) toast(`Typed steps are capped at 4,000 a day (${used.toLocaleString('en-US')} counted)`, 2.6); };
    let vt = 0, vtT = 0; $('#mver').onclick = () => { const n = performance.now(); if (n - vtT > 1200) vt = 0; vtT = n; if (++vt >= 5) { vt = 0; openDev(); } };
    $('#mset').onclick = openSettings;
    drawPortrait($('#mPort'), s.hands && s.hands.k, .78);
    if (curTab === 'houses') renderHouses(); else renderStash();
  }
  function renderHouses() {
    const list = [];
    if (!SV.tutorialDone) list.push({ id: 'tutorial', type: 'tutorial', seed: 0, status: 'new', day: SV.day.key, address: '14 Halsey St', danger: 1, nLocks: 3, nZombies: 2 });
    list.push(...SV.houses);
    const el = $('#mpane');
    if (!list.length) { el.innerHTML = `<div class="empty big">No houses scouted yet.<br>Walk - every ~1,000 steps turns up another door.</div>`; return; }
    el.innerHTML = list.map(h => {
      const T = D.BTYPES[h.type], left = 3 - (dayNum(SV.day.key) - dayNum(h.day)), done = h.status !== 'new';
      const tags = [h.nLocks ? `${h.nLocks} lock${h.nLocks > 1 ? 's' : ''}` : 'no locks', `${h.nZombies} zombie${h.nZombies === 1 ? '' : 's'}`];
      return `<div class="hcard${done ? ' done' : ''}${h.type === 'tutorial' ? ' tut' : ''}">
        ${typeIcon(h.type)}
        <div class="hinfo"><div class="hname">${T.n} <em>${T.size}</em>${h.type === 'tutorial' ? ' <em class="first">first house</em>' : ''}</div>
          <div class="haddr">${esc(h.address)}</div>
          <div class="hmeta"><span class="danger">${SKULL.repeat(h.danger)}<span class="dim">${SKULL.repeat(5 - h.danger)}</span></span><span>${tags.join(' · ')}</span></div>
          <div class="hdays">${done ? (h.status === 'auto' ? 'Crew searched' : 'Looted') : h.type === 'tutorial' ? 'Start here' : left <= 1 ? 'Gone tomorrow' : left + ' days left'}</div></div>
        ${done ? '' : `<div class="hbtns"><button class="mbtn" data-loot="${h.id}">Loot</button>${h.type === 'tutorial' ? '' : `<button class="mbtn ghost" data-auto="${h.id}">Crew</button>`}</div>`}
      </div>`;
    }).join('');
    const find = id => id === 'tutorial' ? { id: 'tutorial', type: 'tutorial', seed: 0, status: 'new' } : SV.houses.find(h => h.id === id);
    el.querySelectorAll('[data-loot]').forEach(b => b.onclick = () => { SFX.play('ui'); loot(find(b.dataset.loot)); });
    el.querySelectorAll('[data-auto]').forEach(b => b.onclick = () => { SFX.play('ui'); autoSearch(find(b.dataset.auto)); });
  }

  // ---- pack & stash
  let sel = null; // {from:'pack'|'stash'|'hands', i}
  function renderStash() {
    const s = SV.survivor, el = $('#mpane');
    const slot = (e, from, i) => {
      const it = D.ITEMS[e.k], on = sel && sel.from === from && sel.i === i;
      return `<button class="slot${it.rare ? ' rare' : ''}${on ? ' sel' : ''}" data-from="${from}" data-i="${i}">${icon(e.k)}<span>${it.n}</span>${e.n > 1 ? `<i class="cnt">x${e.n}</i>` : ''}${e.d != null && it.w ? `<i class="dur"><i style="width:${Math.max(4, e.d / D.WEAPONS[it.w].dur * 100)}%"></i></i>` : ''}</button>`;
    };
    const empty = n => Array.from({ length: n }, () => '<div class="slot ph"></div>').join('');
    el.innerHTML = `
      <div class="kick sect">In hand</div>
      <div class="grid g4">${s.hands ? slot({ k: s.hands.k, n: 1, d: s.hands.d }, 'hands', 0) : '<div class="slot ph"><span>Fists</span></div>'}</div>
      <div class="kick sect">Backpack · ${s.pack.length}/${packSlots()}</div>
      <div class="grid g4">${s.pack.map((e, i) => slot(e, 'pack', i)).join('')}${empty(packSlots() - s.pack.length)}</div>
      <div id="sacts"></div>
      <div class="kick sect">Home stash · ${s.stash.length}/${STASH_SLOTS}</div>
      <div class="grid g5">${s.stash.map((e, i) => slot(e, 'stash', i)).join('')}${empty(Math.min(10, STASH_SLOTS - s.stash.length))}</div>`;
    el.querySelectorAll('.slot[data-from]').forEach(b => b.onclick = () => { const f = b.dataset.from, i = +b.dataset.i; sel = sel && sel.from === f && sel.i === i ? null : { from: f, i }; SFX.play('ui'); renderStash(); });
    if (sel) stashActions();
  }
  function stashActions() {
    const s = SV.survivor, acts = $('#sacts');
    const e = sel.from === 'hands' ? { k: s.hands.k, n: 1, d: s.hands.d } : s[sel.from][sel.i];
    if (!e) { sel = null; return; }
    const it = D.ITEMS[e.k], btns = [];
    const done = msg => { sel = null; Game.save(); renderHome(); if (msg) toast(msg, 1.4); };
    if (sel.from === 'pack') btns.push(['To stash', () => { const n = addTo(s.stash, STASH_SLOTS, e.k, e.n, e.d); if (!n) return toast('Stash is full', 1.4); e.n -= n; if (!e.n) s.pack.splice(sel.i, 1); done(); }]);
    if (sel.from === 'stash') btns.push(['To pack', () => { const n = addTo(s.pack, packSlots(), e.k, e.n, e.d); if (!n) return toast('Pack is full', 1.4); e.n -= n; if (!e.n) s.stash.splice(sel.i, 1); done(); }]);
    if (sel.from === 'hands') btns.push(['Unequip', () => { if (!addTo(s.pack, packSlots(), e.k, 1, e.d) && !addTo(s.stash, STASH_SLOTS, e.k, 1, e.d)) return toast('No room', 1.4); s.hands = null; done(); }]);
    if (it.w && sel.from !== 'hands') btns.push(['Equip', () => { const cur = s.hands; s.hands = { k: e.k, d: e.d }; s[sel.from].splice(sel.i, 1); if (cur) addTo(s.pack, packSlots(), cur.k, 1, cur.d) || addTo(s.stash, STASH_SLOTS, cur.k, 1, cur.d); done('Equipped ' + it.n.toLowerCase()); }]);
    if (it.w) {
      const cost = s.job === 'mechanic' ? 1 : 2, max = D.WEAPONS[it.w].dur;
      if (e.d < max) btns.push([`Repair (${cost} scrap)`, () => {
        const have = s.pack.concat(s.stash).filter(x => x.k === 'scrap').reduce((a, x) => a + x.n, 0);
        if (have < cost) return toast(`Needs ${cost} scrap metal`, 1.6);
        let need = cost; for (const list of [s.stash, s.pack]) for (let j = list.length - 1; j >= 0 && need; j--) if (list[j].k === 'scrap') { const t = Math.min(need, list[j].n); list[j].n -= t; need -= t; if (!list[j].n) list.splice(j, 1); }
        const nd = Math.min(max, e.d + Math.round(max * .4));
        if (sel.from === 'hands') s.hands.d = nd; else e.d = nd;
        done('Repaired');
      }]);
    }
    if (it.use && it.use !== 'Read' && (it.hp || it.sta)) btns.push([it.use, () => { s.hp = Math.min(maxHp(s), s.hp + (it.hp || 0)); e.n--; if (!e.n) s[sel.from].splice(sel.i, 1); done(`${it.n}: +${it.hp || 0} HP`); }]);
    if (e.k === 'note') btns.push(['Read', () => toast('The note is too faded to make sense of here.', 2)]);
    acts.innerHTML = `<div class="sact"><span><b>${it.n}</b>${e.n > 1 ? ' x' + e.n : ''}${it.tag ? ` <em>${it.tag}</em>` : ''}</span></div>`;
    const row = acts.firstChild;
    btns.forEach(([t, fn], i) => { const b = document.createElement('button'); b.className = 'mbtn sm' + (i ? ' ghost' : ''); b.textContent = t; b.onclick = () => { SFX.play('pick'); fn(); }; row.appendChild(b); });
  }

  // ---- settings: export / import / reset
  function sheetOpen(html) { const el = $('#msheet'); el.innerHTML = `<div class="mcard">${html}</div>`; el.classList.add('on'); el.onclick = e => { if (e.target === el) el.classList.remove('on'); }; }
  const sheetClose = () => $('#msheet').classList.remove('on');
  function openSettings() {
    sheetOpen(`<div class="kick">Settings</div><h3>Save</h3>
      <p class="mp">Your survivor, stash and today's houses are saved on this phone. Copy the text below to keep a backup, or paste one to restore.</p>
      <textarea id="mExp" readonly>${esc(JSON.stringify(SV))}</textarea>
      <div class="btnrow"><button class="mbtn sm" id="mCopy">Copy</button></div>
      <textarea id="mImp" placeholder="Paste a backup here"></textarea>
      <div class="btnrow"><button class="mbtn sm" id="mLoad">Load backup</button><button class="mbtn sm ghost" id="mClose">Close</button></div>
      <div class="mp dim">Account &amp; sync: ${DM.onlineState.signedIn ? 'signed in as ' + esc(DM.onlineState.name) : 'not connected yet'}</div>`);
    $('#mCopy').onclick = () => { const t = $('#mExp'); t.select(); try { navigator.clipboard.writeText(t.value); } catch (e) { document.execCommand('copy'); } toast('Copied', 1); };
    $('#mLoad').onclick = () => {
      try { const v = JSON.parse($('#mImp').value); if (!v || v.v !== VER || !('houses' in v)) throw new Error('not a Dead Miles save'); SV = v; DM.S = SV.survivor; Game.save(); sheetClose(); boot2(); toast('Backup loaded', 1.6); }
      catch (e) { toast('That does not look like a save: ' + e.message, 2.4); }
    };
    $('#mClose').onclick = sheetClose;
  }
  function openDev() {
    sheetOpen(`<div class="kick">Developer</div><h3>Test panel</h3>
      <div class="devgrid"><button class="mbtn sm" data-d="s1">+1,000 steps</button><button class="mbtn sm" data-d="s5">+5,000 steps</button>
      <button class="mbtn sm" data-d="day">New day</button><button class="mbtn sm" data-d="heal">Full heal</button>
      <button class="mbtn sm" data-d="ev">Thanksgiving: ${D.EVENT ? 'on' : 'off'}</button><button class="mbtn sm ghost" data-d="reset">Reset save</button></div>
      <div class="btnrow"><button class="mbtn sm ghost" id="mClose">Close</button></div>`);
    $('#msheet').querySelectorAll('[data-d]').forEach(b => b.onclick = () => {
      const k = b.dataset.d;
      if (k === 's1') DM.addSteps(1000, 'phone'); if (k === 's5') DM.addSteps(5000, 'phone');
      if (k === 'day') devNewDay();
      if (k === 'heal') { SV.survivor.hp = maxHp(SV.survivor); Game.save(); renderHome(); }
      if (k === 'ev') { location.search = D.EVENT ? '' : '?event=thanksgiving'; }
      if (k === 'reset') { if (b.dataset.sure) { try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ } SV = fresh(); DM.S = null; sheetClose(); boot2(); return; } b.dataset.sure = 1; b.textContent = 'Tap again to wipe'; return; }
      openDev();
    });
    $('#mClose').onclick = sheetClose;
  }

  // ---------------------------------------------------------------- boot
  function boot2() {
    rollDay();
    if (!SV.survivor) { cre = { name: '', look: 0, job: 'scavenger' }; E.buildSurvivor(0).then(renderCreate); return; }
    DM.S = SV.survivor;
    E.buildSurvivor(SV.survivor.look).then(renderHome);
  }
  Game.renderHome = renderHome;
  Game.boot = async function () {
    SV = load(); DM.S = SV.survivor;
    await E.start();
    if (D.EVENT) document.body.classList.add('event');
    boot2();
    $('#loading').remove();
    setInterval(() => { if (SV.day.key !== today()) { rollDay(); Game.save(); renderHome(); } }, 60000);
    DM.ready = true;
  };
  Game.boot().catch(e => { console.error(e); const l = $('#loading'); if (l) l.textContent = 'Failed to load: ' + e.message; });
})();
