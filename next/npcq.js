/* Dead Miles (next) 0.27 - NPC quests (owner: "add npcs to houses that require aid or help, we can go back to those houses
   to submit a quest but will take steps").
   About 1 house in 8 has someone inside who needs help (deterministic per house; not the tutorial, daily, Dot's quest or
   route houses, and never where a survivor is hiding to join the crew). Talk to them (crew.js draws them and adds Talk):
   they ask for something - bandages for a wound, food for a family, batteries for a radio... Accept and it goes on the
   quest list. Find or craft it, then WALK: the house opens for your return after 1,500-3,000 more steps (SV.walked, the
   same total Dot and quests use). The house card then shows Return: hand it over from your pack or stash for caps, XP and
   a reward (supplies, a blueprint, capsule tokens, sometimes a cosmetic). Sometimes the helped person asks to join your
   crew (when a bunk is free). Max 3 open at once; an open one keeps its house on the list. Abandon any time.
   Save: SV.npcq = { list: [{ id, house, name, look, type, need: [[k, n]], at, back, rw, state: 'open'|'done' }], seq, done }. */
'use strict';
window.DM = window.DM || {};
(() => {
  const N = DM.NPCQ = {};
  const D = DM.D, E = DM.E, $ = E.$, SFX = E.SFX, toast = E.toast;
  const G = () => DM.Game, SV = () => DM.Game && DM.Game.data();
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = n => Math.round(n).toLocaleString('en-US');
  const MAX = 3, CHANCE = 1 / 8;
  // what they need: [item, count] options (one picked per house), the story, the thanks
  const TYPES = {
    wound: { t: 'Patch me up', ask: "Got bit by glass climbing in, not a zombie, I swear. It won't stop bleeding. If you find bandages, come back for me?", need: [[['bandage', 3]], [['meds', 1]]], cap: [30, 45] },
    family: { t: 'Hungry family', ask: "My kids haven't eaten since Tuesday. Anything in a can, anything at all. Please come back.", need: [[['beans', 3]], [['snack', 3]], [['beans', 2], ['water', 2]]], cap: [25, 40] },
    thirst: { t: 'Dry taps', ask: 'The water stopped three days ago. We are rationing a juice box. Bring water if you can.', need: [[['water', 4]], [['water', 2], ['drink', 2]]], cap: [25, 35] },
    radio: { t: 'The radio', ask: 'My radio still works, but the batteries are dead. There is a station that reads out safe streets. I need to hear it.', need: [[['battery', 2]], [['battery', 3]]], cap: [35, 50] },
    barricade: { t: 'Hold the door', ask: "They keep testing the back door. If I had nails and tape I could board it up properly. I'd owe you.", need: [[['nails', 12], ['tape', 2]], [['wood', 4], ['nails', 10]]], cap: [35, 55] },
    fever: { t: 'Fever', ask: "My grandson has a fever and it's getting worse. Antibiotics. The pharmacy on the corner was picked clean. I'm begging you.", need: [[['antibio', 1]]], cap: [60, 90], rare: 1 },
    lock: { t: 'Locked out', ask: "My sister is stuck in the apartment downstairs and the door jammed. Bring me lockpicks and I'll get her out.", need: [[['lockpick', 3]], [['crowbar', 1]]], cap: [30, 45] },
  };
  const TKEYS = Object.keys(TYPES);
  const NAMES = ['Mrs. Alvarez', 'Darnell', 'Old Pete', 'Grace', 'Mr. Kowalski', 'Tasha', 'Hector', 'Ms. Odom', 'Benny', 'Lucia', 'Frank', 'Aunt June', 'Ravi', 'Shonda', 'Mr. Liu', 'Carmen', 'Teo', 'Nell'];
  const st = () => { const v = SV(); if (!v) return null; v.npcq = v.npcq || { list: [], seq: 0, done: 0 }; return v.npcq; };
  N.state = st;
  const open = () => (st() ? st().list.filter(q => q.state === 'open') : []);
  N.open = open;
  const forHouseQ = hid => open().find(q => q.house === hid) || null;
  N.forHouseQ = forHouseQ;
  // ---------------------------------------------------------------- which houses have someone (deterministic)
  N.spec = function (h) {
    if (!h || h.type === 'tutorial' || h.daily || h.quest || h.route || String(h.id).startsWith('q-')) return null;
    const v = SV(); if (!v) return null;
    if (v.npcq && v.npcq.list.some(q => q.house === h.id && q.state === 'done')) return null;   // already helped
    const r = D.mulberry32((h.seed ^ 0x51ed270b) >>> 0);
    if (r() >= CHANCE) return null;
    const type = TKEYS[Math.floor(r() * TKEYS.length)], T = TYPES[type];
    if (T.rare && r() < .5) return null;   // the antibiotics one is rarer
    const need = T.need[Math.floor(r() * T.need.length)];
    return { type, need, name: NAMES[Math.floor(r() * NAMES.length)], seed: (h.seed ^ 0x9e3779b9) >>> 0, back: 1500 + Math.floor(r() * 16) * 100,
      caps: T.cap[0] + Math.floor(r() * (T.cap[1] - T.cap[0] + 1)) };
  };
  const needText = need => need.map(([k, n]) => `${n} ${D.ITEMS[k].n.toLowerCase()}${n > 1 && !/s$/.test(D.ITEMS[k].n) ? 's' : ''}`).join(' and ');
  N.needText = needText;
  const count = k => { const s = SV().survivor; return s.pack.concat(s.stash).filter(e => e.k === k).reduce((a, e) => a + e.n, 0); };
  const left = q => Math.max(0, Math.ceil(q.at + q.back - (SV().walked || 0)));
  N.left = left;
  // ---------------------------------------------------------------- in the house: the offer (crew.js calls this from Talk)
  N.offer = function (h, spec, panel, close, onAccept) {
    const T = TYPES[spec.type], q = forHouseQ(h.id);
    if (st().list.some(x => x.house === h.id && x.state === 'done')) { panel(`<div class="kick">${esc(spec.name)}</div><h3>"Thank you again."</h3><p class="mp">"We'll be okay now. Go on - others need you more."</p><button class="mbtn ghost" id="nqOk">Close</button>`); $('#nqOk').onclick = close; return; }   // 0.41.1: helped already
    // 0.41.1 (owner: "she needs 1 painkiller. I already have one on me, I should be able to submit it"): if it is in her
    // pack or stash, she can hand it over right here - no walking away and Return needed
    const haveNow = need => need.every(([k, n]) => count(k) >= n);
    if (q) {
      if (haveNow(q.need)) { panel(`<div class="kick">${esc(q.name)}</div><h3>"You found it?"</h3><p class="mp">"I still need ${esc(needText(q.need))}." You have it on you.</p><button class="mbtn" id="nqHand">Hand it over now</button><button class="mbtn ghost" id="nqOk">"Not yet."</button>`);
        $('#nqHand').onclick = () => { take(q.need); reward(q, { panel, close }); }; $('#nqOk').onclick = close; return; }
      panel(`<div class="kick">${esc(q.name)}</div><h3>"You came back?"</h3><p class="mp">"I still need ${esc(needText(q.need))}. ${left(q) ? `Go on - I'll be here. (Walk ${fmt(left(q))} more steps, then Return from your house list.)` : 'Bring it to me - use Return on your house list.'}"</p><button class="mbtn" id="nqOk">"I'm on it."</button>`); $('#nqOk').onclick = close; return;
    }
    const full = open().length >= MAX;
    panel(`<div class="kick">Someone needs help · ${esc(T.t)}</div><h3>${esc(spec.name)}</h3>
      <p class="mp">"${esc(T.ask)}"</p>
      <div class="perkline"><b>They need</b><span>${esc(needText(spec.need))}</span></div>
      <p class="mp small">Find or craft it, then walk about ${fmt(spec.back)} steps and come back (Return on the house card). Reward: ${spec.caps} caps, XP and something from their stash.</p>
      ${full ? `<p class="mp warn">You are already helping ${MAX} people. Finish one first.</p><button class="mbtn ghost" id="nqNo">"I can't right now."</button>`
        : `${haveNow(spec.need) ? '<button class="mbtn" id="nqNow">"Here - I have it on me."</button>' : ''}<button class="mbtn${haveNow(spec.need) ? ' ghost' : ''}" id="nqYes">"I'll be back with it."</button><button class="mbtn ghost" id="nqNo">"Sorry, I can't."</button>`}`);
    if ($('#nqYes')) $('#nqYes').onclick = () => {
      const S = st(), v = SV();
      S.list.push({ id: 'n' + (++S.seq), house: h.id, addr: h.address || '', type: spec.type, name: spec.name, seed: spec.seed, need: spec.need, at: v.walked || 0, back: spec.back, caps: spec.caps, state: 'open', day: v.day.key });
      h.npcq = 'n' + S.seq; G().save(); SFX.play('pick'); close(); toast(`${spec.name}: "Thank you. I'll be here."`, 2.4); if (onAccept) onAccept();
    };
    if ($('#nqNow')) $('#nqNow').onclick = () => {   // 0.41.1: help right away
      const S = st(), v = SV(), q2 = { id: 'n' + (++S.seq), house: h.id, addr: h.address || '', type: spec.type, name: spec.name, seed: spec.seed, need: spec.need, at: v.walked || 0, back: 0, caps: spec.caps, state: 'open', day: v.day.key };
      S.list.push(q2); take(spec.need); reward(q2, { panel, close });
    };
    $('#nqNo').onclick = close;
  };
  // ---------------------------------------------------------------- the house card
  N.cardBits = function (h) {
    const q = forHouseQ(h.id);
    if (q) {
      const l = left(q), have = q.need.every(([k, n]) => count(k) >= n);
      return { tag: `<b class="nqtag">🙋 ${esc(q.name)} needs ${esc(needText(q.need))}${l ? ` · back in ${fmt(l)} steps` : have ? ' · ready!' : ''}</b>`, btn: l ? '' : `<button class="mbtn${have ? '' : ' ghost'}" data-nq="${q.id}">Return</button>` };
    }
    return N.spec(h) && h.status === 'new' ? { tag: '<b class="nqtag">🙋 someone inside needs help</b>', btn: '' } : null;
  };
  N.bind = function (root, rerender) { (root || document).querySelectorAll('[data-nq]').forEach(b => b.onclick = () => { SFX.play('ui'); N.deliver(b.dataset.nq, rerender); }); };
  N.deliver = function (id, rerender) {
    const q = st().list.find(x => x.id === id); if (!q) return;
    const U = G().ui, have = q.need.every(([k, n]) => count(k) >= n), T = TYPES[q.type];
    U.sheetOpen(`<div class="kick">Return · ${esc(q.addr)}</div><h3>${esc(q.name)}</h3>
      <p class="mp">${have ? `"You actually came back... and you found it."` : `"Did you bring the ${esc(needText(q.need))}?"`}</p>
      <div class="perkline"><b>${esc(T.t)}</b><span>${q.need.map(([k, n]) => `${esc(D.ITEMS[k].n)} ${Math.min(n, count(k))}/${n}`).join(' · ')}</span></div>
      ${have ? `<button class="mbtn" id="nqGive">Hand it over</button>` : `<p class="mp dim">Find it in houses, craft it at the Workbench or buy it from Dot. It can be in your pack or your stash.</p>`}
      <div class="btnrow"><button class="mbtn sm ghost" id="nqDrop">Give up on this</button><button class="mbtn sm ghost" id="nqClose">Close</button></div>`);
    $('#nqClose').onclick = U.sheetClose;
    $('#nqDrop').onclick = () => { const b = $('#nqDrop'); if (!b.dataset.sure) { b.dataset.sure = 1; b.textContent = 'Tap again to give up'; return; } q.state = 'dropped'; release(q); G().save(); U.sheetClose(); if (rerender) rerender(); };
    if ($('#nqGive')) $('#nqGive').onclick = () => { take(q.need); reward(q); if (rerender) rerender(); };
  };
  function take(need) {
    const s = SV().survivor;
    for (const [k, n0] of need) { let n = n0; for (const list of [s.pack, s.stash]) for (let i = list.length - 1; i >= 0 && n > 0; i--) { const e = list[i]; if (e.k !== k) continue; const t = Math.min(n, e.n); e.n -= t; n -= t; if (!e.n) list.splice(i, 1); } }
  }
  function release(q) { const h = (SV().houses || []).find(x => x.id === q.house); if (h && h.npcq === q.id) delete h.npcq; }
  const BONUS = [['bandage', 1], ['meds', 1], ['ammo', 15], ['lockpick', 3], ['beans', 3], ['water', 3], ['battery', 2], ['tape', 2], ['arrow', 10]];
  function reward(q, P) {   // P = { panel, close } inside a run (crew.js), else the home sheet
    const v = SV(), S = st(), r = D.mulberry32((q.seed ^ 0x7f4a7c15) >>> 0), U = G().ui;
    q.state = 'done'; S.done = (S.done || 0) + 1; release(q);
    v.trader.caps += q.caps; const xp = 20 + Math.round(q.caps / 3); DM.Skills.addXP(xp);
    const got = [`${q.caps} caps`, `${xp} XP`];
    const b = BONUS[Math.floor(r() * BONUS.length)]; G().routeApi.toStash([{ k: b[0], n: b[1] }]); got.push(`${b[1]} ${D.ITEMS[b[0]].n.toLowerCase()}`);
    if (r() < .3 && DM.Gacha) { DM.Gacha.state().tok += 1; got.push('a capsule token'); }
    if (r() < .12) { const c = D.pickCos(['quest'], r); if (c) { G().unlockCos('cos_' + c); got.push('a cosmetic'); } }
    const join = r() < .2 && DM.Crew && DM.Crew.free && DM.Crew.free() > 0;
    G().save(); SFX.play('pick');
    const open1 = P ? P.panel : U.sheetOpen, shut = P ? P.close : U.sheetClose;
    open1(`<div class="kick">Helped · ${esc(TYPES[q.type].t)}</div><h3>"I won't forget this."</h3>
      <p class="mp">${esc(q.name)} presses something into your hands.</p><div class="perkline"><b>You got</b><span>${esc(got.join(' · '))}</span></div>
      ${join ? `<p class="mp">"...Is there room where you're staying? I can pull my weight."</p><button class="mbtn" id="nqJoin">"Come to my base."</button>` : ''}
      <button class="mbtn ghost" id="nqOk">Close</button>`);
    if ($('#nqJoin')) $('#nqJoin').onclick = () => { DM.Crew.joinHelped(q.name, q.seed); shut(); toast(`${q.name} is heading to your base`, 2.2); if (!P) G().renderHome(); };
    $('#nqOk').onclick = () => { shut(); if (!P) G().renderHome(); };
  }
  // ---------------------------------------------------------------- quest list / loot highlights (game.js)
  N.needs = function (add) { for (const q of open()) for (const [k, n] of q.need) add(k, `${q.name}: ${TYPES[q.type].t}`, n - count(k)); };
  N.listRows = () => open().map(q => `<div class="ql"><b>🙋 ${esc(q.name)} · ${esc(TYPES[q.type].t)}</b><span>${esc(q.addr)}${left(q) ? ` · walk ${fmt(left(q))} more steps` : ' · ready to return'}</span><em>Bring: ${q.need.map(([k, n]) => `${D.ITEMS[k].n.toLowerCase()} ${Math.min(n, count(k))}/${n}`).join(', ')}</em></div>`);
  N.chip = () => open().map(q => `<b>🙋 ${esc(q.name.split(' ').pop())}</b> ${q.need.map(([k, n]) => `${Math.min(n, count(k))}/${n}`).join(' ')}`).join('<i></i>');
})();
