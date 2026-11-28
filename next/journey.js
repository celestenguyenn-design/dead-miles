/* Dead Miles (next) 0.73 - THE ROAD EAST + THE WEEKLY RADIO (owner said yes to "a journey your steps move you along ...
   each town has new house types, a boss and a story chapter. Plus a weekly mini-story with 3 choices").
   - Every step you walk (typed steps at half, like everywhere) moves you down the road out of the city, toward the
     lighthouse at Montauk. 100,000 steps a town. Reaching a town: a story chapter, caps + a capsule token, a hideout
     house with the town's boss (a named zombie with 10x health and a jackpot), and the houses your steps scout lean
     toward that town's kind of building from then on.
   - Every Monday the radio picks up a call. Three choices: a walking goal for the week, a house to raid right now, or
     a small safe reward. You pick once a week.
   Save: SV.journey = { base, town, seen, radio: { week, story, pick, base, paid } }. Starts at town 0 wherever you are. */
'use strict';
window.DM = window.DM || {};
(() => {
  const J = DM.Journey = {};
  const D = DM.D, G = () => DM.Game, SV = () => DM.Game && DM.Game.data();
  const toast = (m, s) => DM.E && DM.E.toast && DM.E.toast(m, s || 2.6);
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = n => Math.round(n).toLocaleString('en-US');
  const STEP = 100000;
  const TOWNS = [
    { n: 'Bed-Stuy', g: '🏘️', bias: {}, boss: '', ch: 'Home. Brownstones, bodegas, a base you built out of nothing. The radio keeps saying the same thing: the lighthouse at Montauk still has its light on. Someone is out there. Time to start walking.' },
    { n: 'Bushwick', g: '🏭', bias: { garage: 2.2, laundro: 1.6, bodega: 1.3 }, boss: 'The Foreman', ch: 'Warehouses and murals. The auto shops here were stripped early, but the people who stripped them never left - they just stopped breathing. Something big is still punching the clock at the old plant.' },
    { n: 'Ridgewood', g: '⛪', bias: { rowL: 1.8, apt: 1.4 }, boss: 'Father Novak', ch: 'Quiet streets of brick houses, every one of them shut tight. The church bell rings by itself at night. Nobody here wants to know who is pulling the rope.' },
    { n: 'Jamaica', g: '🚉', bias: { bodega: 1.8, pharmacy: 1.8, apt: 1.3 }, boss: 'The Conductor', ch: 'The train hub. A thousand people tried to leave the city from here on the same day. Most of them are still waiting on the platform.' },
    { n: 'Hempstead', g: '🏫', bias: { school: 3, rowS: 1.2 }, boss: 'Coach Brennan', ch: 'Suburbs begin. Lawns gone wild, and a high school that was turned into a shelter - until it wasn\'t. The gym doors are chained from the inside.' },
    { n: 'Levittown', g: '🏡', bias: { rowS: 2, rowL: 1.5 }, boss: 'Mrs. Abernathy', ch: 'Row after row of the same little house. The neighbourhood watch is still patrolling. They just don\'t ask questions anymore.' },
    { n: 'Huntington', g: '🚓', bias: { police: 3.2, pharmacy: 1.4 }, boss: 'Sheriff Doyle', ch: 'The county police held out here longest. Their station is a fortress - full of guns, and full of officers who never clocked out.' },
    { n: 'Port Jefferson', g: '⚓', bias: { garage: 1.6, bodega: 1.6, mansion: 1.5 }, boss: 'The Ferryman', ch: 'The harbour town. Boats bob at the dock, half of them still tied. A voice on channel 16 keeps offering passage across the sound - for a price.' },
    { n: 'Riverhead', g: '🌾', bias: { garage: 1.8, rowS: 1.4 }, boss: 'Farmer Kask', ch: 'Farmland, finally. Food grows here without anyone planting it. Something walks the rows of corn at dusk, and it is not a scarecrow.' },
    { n: 'The Hamptons', g: '🏛️', bias: { mansion: 6, pharmacy: 1.3 }, boss: 'The Host', ch: 'Mansions behind hedges. The rich locked themselves in with everything they owned. Somebody is still throwing a party in the biggest house on the beach.' },
    { n: 'Montauk', g: '🗼', bias: { mansion: 2, police: 2, school: 2 }, boss: 'The Keeper', ch: 'The end of the road. The lighthouse light is on. Whoever kept it burning all this time is waiting at the top of the stairs. You made it.' },
  ];
  J.TOWNS = TOWNS;
  // the weekly radio: [title, call, [label, kind, detail]...]
  const RADIO = [
    ['A convoy on the expressway', 'Static, then a woman\'s voice: "Three trucks, heading east. We can drop supplies for anyone who keeps pace with us this week."',
      [['Keep pace with the convoy', 'walk', 'Walk 25,000 steps this week for a big supply drop'], ['Ambush the stragglers', 'raid', 'A wrecked truck to loot right now - infested'], ['Let them pass', 'safe', 'They toss you 40 caps as they go']]],
    ['The pharmacist', '"This is Dr. Patel. I\'m out of insulin and walking to every pharmacy in the borough. If you walk with me, I\'ll share what I find."',
      [['Walk with the doctor', 'walk', 'Walk 25,000 steps this week for meds and antibiotics'], ['Raid the clinic first', 'raid', 'A burning clinic to loot right now'], ['Wish him luck', 'safe', 'He leaves 2 bandages on your step']]],
    ['Kids on the roof', 'Children\'s voices, giggling: "We have a slingshot and a LOT of canned peaches. Trade you?"',
      [['Do their supply run', 'walk', 'Walk 25,000 steps this week and they pay in food and caps'], ['Clear their block', 'raid', 'A house full of zombies by their building - right now'], ['Tell them to stay hidden', 'safe', 'They toss you a can of peaches and 30 caps']]],
    ['The preacher', '"The end is a road, brothers and sisters. Walk it with me and be rewarded."',
      [['Walk the pilgrimage', 'walk', 'Walk 25,000 steps this week for a blueprint'], ['Raid his chapel', 'raid', 'A dark chapel to loot right now'], ['Switch the channel', 'safe', '+30 caps for not listening']]],
    ['A lost dog', '"Has anyone seen Biscuit? Brown, floppy ears, answers to treats. Reward for anyone who helps look."',
      [['Look for Biscuit on your walks', 'walk', 'Walk 25,000 steps this week - the owner pays well'], ['Check the house he ran into', 'raid', 'A house with a twist, right now'], ['Hope he turns up', 'safe', '+25 caps from the owner, for trying']]],
  ];
  const RADIO_STEPS = 25000;
  const week = () => { const d = new Date(), t = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()), dow = new Date(t).getUTCDay(); const m = new Date(t - ((dow + 6) % 7) * 864e5); return m.getUTCFullYear() + '-' + (m.getUTCMonth() + 1) + '-' + m.getUTCDate(); };
  const walked = () => (SV() && SV().walked) || 0;
  function st() {
    const v = SV(); if (!v) return null;
    if (!v.journey) v.journey = { base: walked(), town: 0, seen: 0, radio: null };
    return v.journey;
  }
  J.st = st;
  const along = () => { const s = st(); return Math.max(0, walked() - s.base); };
  J.town = () => TOWNS[Math.min(TOWNS.length - 1, st() ? st().town : 0)];
  J.next = () => { const s = st(); return s && s.town < TOWNS.length - 1 ? TOWNS[s.town + 1] : null; };
  J.toNext = () => { const s = st(); return s ? Math.max(0, (s.town + 1) * STEP - along()) : STEP; };
  // houses scouted lean toward the current town's kind of building (game.js pickType)
  J.typeMul = k => { const s = st(); if (!s) return 1; const b = TOWNS[Math.min(TOWNS.length - 1, s.town)].bias; return b[k] || 1; };

  // ---------------------------------------------------------------- arriving
  J.tick = function () {
    const v = SV(), s = st(); if (!v || !s || !v.survivor || !v.tutorialDone || DM.scene) return;
    let got = 0;
    while (s.town < TOWNS.length - 1 && along() >= (s.town + 1) * STEP) { s.town++; got++; arrive(s.town); }
    radioTick();
    if (got) G().save();
  };
  function arrive(i) {
    const T = TOWNS[i], v = SV();
    v.trader.caps += 100 * i; if (DM.Gacha) DM.Gacha.state().tok += 1;
    if (DM.Skills && DM.Skills.addXP) DM.Skills.addXP(100);
    if (DM.Journal) DM.Journal.note(`Reached ${T.n}.`);
    // the town boss's hideout: a named zombie with 10x health and a jackpot (twists.js reads h.townBoss)
    const types = Object.keys(T.bias).length ? Object.keys(T.bias) : ['rowL'];
    const h = G().routeApi.addHouse(types[0], D.hashStr('town:' + i + ':' + v.seedBase), { twist: 'named', twName: T.boss, townBoss: i });
    h.address = `${T.n} · ${T.boss}'s hideout`;
    st().newTown = i;
    setTimeout(() => toast(`${T.g} You reached ${T.n}! +${100 * i} caps, a capsule token, +100 XP. ${T.boss} is waiting in your houses.`, 4.5), 800);
  }

  // ---------------------------------------------------------------- the radio
  function radioTick() {
    const s = st(), w = week();
    if (!s.radio || s.radio.week !== w) s.radio = { week: w, story: Math.abs(DM.D.hashStr(w + ':' + (SV().seedBase || 0))) % RADIO.length, pick: null, base: 0, paid: 0 };
    const r = s.radio;
    if (r.pick === 'walk' && !r.paid && walked() - r.base >= RADIO_STEPS) { r.paid = 1; payWalk(r); }
  }
  J.radio = () => { const s = st(); return s && s.radio ? Object.assign({ R: RADIO[s.radio.story] }, s.radio) : null; };
  J.radioPending = () => { const r = J.radio(); return !!(r && !r.pick); };
  function payWalk(r) {
    const v = SV(), story = RADIO[r.story][0];
    const items = r.story === 1 ? [['meds', 3], ['antibio', 1], ['bandage', 3]] : r.story === 2 ? [['beans', 4], ['water', 4], ['snack', 3]] : r.story === 3 ? [[D.pickBP(Math.random), 1]] : [['ammo', 20], ['meds', 2], ['battery', 3], ['tape', 2]];
    G().routeApi.toStash(items.map(([k, n]) => ({ k, n })));
    const caps = r.story === 2 || r.story === 4 ? 120 : 60; v.trader.caps += caps;
    if (DM.Journal) DM.Journal.note(`Radio: ${story} - kept my word.`);
    G().save(); setTimeout(() => toast(`📻 ${story}: you kept your word. +${caps} caps and supplies in your stash.`, 4), 600);
  }
  function choose(kind) {
    const s = st(), r = s.radio; if (!r || r.pick) return;
    r.pick = kind; r.base = walked();
    const v = SV(), story = RADIO[r.story];
    if (kind === 'safe') {
      const caps = [40, 0, 30, 30, 25][r.story]; v.trader.caps += caps;
      if (r.story === 1) G().routeApi.toStash([{ k: 'bandage', n: 2 }]);
      if (r.story === 2) G().routeApi.toStash([{ k: 'snack', n: 1 }]);
      toast(`📻 ${story[2][2][2]}.`, 2.6);
    }
    if (kind === 'raid') {
      const tw = ['infested', 'fire', 'infested', 'dark', ['dark', 'infested', 'fire', 'trap', 'named'][Math.floor(Math.random() * 5)]][r.story];
      const type = ['garage', 'pharmacy', 'rowL', 'rowL', 'rowS'][r.story];
      const h = G().routeApi.addHouse(type, D.hashStr('radio:' + r.week + ':' + v.seedBase), { twist: tw, radio: 1 });
      if (tw === 'named') h.twName = 'Biscuit\'s owner';
      h.address = `📻 ${story[0]}`;
      toast('📻 It is on your house list now. Go before it is gone.', 2.8);
    }
    if (kind === 'walk') toast(`📻 Walk ${fmt(RADIO_STEPS)} steps by Sunday night and they will keep their end.`, 3);
    if (DM.Journal) DM.Journal.note(`Radio: ${story[0]} - ${story[2].find(o => o[1] === kind)[0].toLowerCase()}.`);
    G().save();
  }

  // ---------------------------------------------------------------- home tile + sheet
  J.has = k => k === 'journey';
  J.tile = function () {
    const s = st(); if (!s || !SV().tutorialDone) return null;
    const nx = J.next(), pct = nx ? Math.round(100 * (1 - J.toNext() / STEP)) : 100;
    const sub = s.newTown ? `You reached ${TOWNS[s.newTown].n}!` : J.radioPending() ? `📻 The radio is calling · ${nx ? fmt(J.toNext()) + ' steps to ' + nx.n : 'Montauk'}` : nx ? `${fmt(J.toNext())} steps to ${nx.n}` : 'You made it to Montauk';
    return { k: 'journey', c: '#5fb3d9', n: `${J.town().g} The road east`, sub, bar: pct, hot: s.newTown ? 'New' : J.radioPending() ? 'Radio' : '' };
  };
  J.html = function () {
    const s = st(), cur = s.town, nx = J.next(), r = J.radio();
    const road = TOWNS.map((T, i) => `<div class="jyt${i < cur ? ' done' : i === cur ? ' here' : ''}"><i>${i <= cur ? T.g : '·'}</i><span>${esc(T.n)}</span>${i === cur + 1 ? `<em>${fmt(J.toNext())} to go</em>` : i === cur ? '<em>you are here</em>' : ''}</div>`).join('');
    const ch = TOWNS[cur];
    const radio = r ? `<div class="jyradio"><div class="kick">📻 This week's radio · ${esc(r.R[0])}</div><p class="mp">${esc(r.R[1])}</p>${!r.pick
      ? r.R[2].map(([l, k, d]) => `<button class="mbtn sm jyopt" data-jy="${k}"><b>${esc(l)}</b><span>${esc(d)}</span></button>`).join('')
      : `<p class="mp"><b>You chose:</b> ${esc(r.R[2].find(o => o[1] === r.pick)[0])}.${r.pick === 'walk' ? (r.paid ? ' Done - they kept their end.' : ` ${fmt(Math.max(0, RADIO_STEPS - (walked() - r.base)))} steps left this week.`) : ''} A new call comes Monday.</p>`}</div>` : '';
    return `<div class="kick">The road east · ${cur + 1}/${TOWNS.length}</div><h3>${ch.g} ${esc(ch.n)}</h3><p class="mp">${esc(ch.ch)}</p>
      ${ch.boss ? `<div class="jyboss"><img src="img/town${cur}.webp" alt="" onerror="this.style.display='none'"><div><div class="kick">Town boss</div><b>${esc(ch.boss)}</b><span>${(SV().houses || []).some(h => h.townBoss === cur && h.status === 'new') ? 'Hiding in one of your houses. 10x health, and a jackpot.' : 'Their hideout is gone from your houses.'}</span></div></div>` : ''}
      ${nx ? `<div class="jybar"><i style="width:${Math.round(100 * (1 - J.toNext() / STEP))}%"></i></div><p class="mp dim">Next: <b>${esc(nx.n)}</b> in ${fmt(J.toNext())} steps. Every step counts (typed steps at half). Each town brings a story, a reward, its own kind of houses - and a boss.</p>` : '<p class="mp"><b>You walked all the way to Montauk.</b></p>'}
      ${radio}<div class="kick sect" style="margin-top:10px">The road</div><div class="jyroad">${road}</div>`;
  };
  J.bind = function (root, re) {
    const s = st(); if (s.newTown) { s.newTown = 0; G().save(); }
    root.querySelectorAll('[data-jy]').forEach(b => b.onclick = () => { choose(b.dataset.jy); re(); });
  };
  const css = document.createElement('style'); css.textContent = `
    .jybar { height: 10px; border-radius: 6px; background: #11142f; border: 2px solid #3d2d61; overflow: hidden; margin: 6px 0; } .jybar i { display: block; height: 100%; background: #5fb3d9; }
    .jyradio { margin: 10px 0 4px; padding: 10px; border-radius: 12px; background: rgba(95,179,217,.08); border: 2px solid #5fb3d9; }
    .jyopt { display: block; width: 100%; text-align: left; margin: 6px 0 0; height: auto !important; padding: 8px 12px !important; } .jyopt b { display: block; font-size: 14px; } .jyopt span { display: block; font-size: 11.5px; font-weight: 700; opacity: .8; }
    .jyboss { display: flex; align-items: center; gap: 10px; margin: 8px 0; padding: 8px 10px; border-radius: 12px; background: rgba(255,138,122,.08); border: 2px solid #ff8a7a; }
    .jyboss img { height: 92px; flex: none; filter: drop-shadow(0 3px 0 rgba(0,0,0,.35)); } .jyboss .kick { color: #ff8a7a; } .jyboss b { display: block; font-size: 16px; } .jyboss span { display: block; font-size: 11.5px; font-weight: 700; opacity: .8; }
    .jyroad { display: grid; gap: 3px; } .jyt { display: flex; align-items: center; gap: 8px; padding: 5px 8px; border-radius: 9px; font-size: 13px; color: var(--mute, #9d90bf); }
    .jyt i { font-style: normal; width: 22px; text-align: center; } .jyt span { flex: 1; font-weight: 800; } .jyt em { font-style: normal; font-size: 11px; font-weight: 800; }
    .jyt.done { color: var(--crm, #f6e3bb); } .jyt.here { background: rgba(95,179,217,.15); color: var(--crm, #f6e3bb); border: 2px solid #5fb3d9; }`;
  document.head.appendChild(css);
})();
