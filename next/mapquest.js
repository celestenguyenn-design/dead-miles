/* Dead Miles (next) 0.31 - quests on the real map (owner: "add interactive questing on the map ... if you walk to a
   certain area, you can do a quest").
   - Survivors: up to 2 a day, a survivor (❗) waits at a real place 150-450 m away. Walk up to them (~30 m) and they
     tell you what they need. Say yes and the quest walks you around real places (❓ markers): find clues, make a call
     at a dangerous spot, bring an item from your stash, then (sometimes) walk back to them. One quest at a time; it
     keeps across days until done or dropped (the map card has Drop quest).
   - Encounters: the first time each day she walks up to a marked place (pharmacy, school, police, shop...), there is a
     chance of a short encounter with two choices. At most 3 a day, rolled once per place per day (walking back and
     forth does not reroll).
   Rewards go into the save (stash, caps, XP, capsule tokens). Places stay on this phone (localStorage dm-next-mapq),
   like the rest of the map. Needs map.js (DM.Map._M places) and mapfx.js (spots, marks, rewards). */
'use strict';
window.DM = window.DM || {};
(() => {
  const Q = DM.MapQ = {};
  const KEY = 'dm-next-mapq', NEAR = 30;
  const FX = () => DM.MapFX, SV = () => DM.Game && DM.Game.data();
  const toast = (m, s) => DM.E && DM.E.toast && DM.E.toast(m, s || 2.6);
  const sfx = k => { try { DM.E.SFX.play(k); } catch (e) { /* ignore */ } };
  const buzz = p => { if (navigator.vibrate) try { navigator.vibrate(p); } catch (e) { /* ignore */ } };
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const today = () => { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };
  const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  const rng = seed => DM.D.mulberry32(seed >>> 0);
  let S = null;
  function st() {
    if (S) return S;
    try { S = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { S = null; }
    S = Object.assign({ day: '', givers: [], made: 0, active: null, done: 0, seen: {}, enc: 0, total: 0 }, S || {});
    return S;
  }
  let saveT = 0; const save = () => { clearTimeout(saveT); saveT = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* full */ } }, 300); };
  function newDay() { const s = st(), t = today(); if (s.day !== t) { s.day = t; s.givers = []; s.made = 0; s.seen = {}; s.enc = 0; save(); } }

  // ---------------------------------------------------------------- rewards
  const G = () => DM.Game;
  function hurt(n) { const s = SV().survivor; s.hp = Math.max(10, s.hp - n); return `-${n} HP`; }
  function payout(r) {   // r = { caps, xp, items: [[k, n]], loot: [table, rolls], token: chance }
    const parts = [], X = FX();
    if (r.caps) { SV().trader.caps += r.caps; parts.push(r.caps + ' caps'); }
    if (r.xp && DM.Skills && DM.Skills.addXP) { DM.Skills.addXP(r.xp); parts.push(r.xp + ' XP'); }
    let items = (r.items || []).map(([k, n]) => [k === 'bp_*' ? DM.D.pickBP(Math.random) : k, n]); if (r.loot) items = items.concat(X.rollItems(r.loot[0], r.loot[1]));
    if (items.length) { const t = X.give(items); if (t) parts.push(t); }
    if (r.token && DM.Gacha && Math.random() < r.token) { DM.Gacha.state().tok++; parts.push('a capsule token'); }
    G().save(); sfx('pick'); setTimeout(() => sfx('open'), 200); buzz([80, 50, 120]);
    return parts.join(', ');
  }
  const has = (k, n) => G().countItem(k) >= n;

  // ---------------------------------------------------------------- the quests
  // step kinds: go (walk to a new place lo-hi m from the last point; text on arrival), choice (at a new place: 2 options,
  // each { t, p: success chance, win, lose, hurt, r: reward }), item (at a new place: hand over one of need[]), back
  // (walk back to the survivor). The last step pays r.
  const QUESTS = {
    dog: { who: 'Mrs. Alvarez', face: '👵', title: 'Pepper is missing',
      ask: 'My dog Pepper slipped her collar when the horde came through. She\'s all I have left. Please, look for her?',
      steps: [
        { k: 'go', lo: 120, hi: 320, goal: 'Look for clues', arrive: 'A red collar by an overturned bin. Little paw prints in the ash lead off down the block.' },
        { k: 'choice', lo: 150, hi: 350, goal: 'Follow the paw prints', arrive: 'There she is - Pepper, backed into a doorway, growling at two walkers.',
          opts: [{ t: 'Charge in', p: .7, win: 'You drop both walkers. Pepper leaps into your arms.', lose: 'One gets its teeth in your arm before it goes down. Pepper is safe, though.', hurt: 15 },
                 { t: 'Whistle and run', p: 1, win: 'Pepper bolts after you and the walkers lose the scent.' }] },
        { k: 'back', goal: 'Bring Pepper home', arrive: 'Mrs. Alvarez cries into Pepper\'s fur. "Take this. It was my husband\'s. He\'d want it used."', r: { caps: 60, xp: 40, loot: ['lockedroom', 1] } },
      ] },
    meds: { who: 'Teo', face: '🧔', title: 'Fever',
      ask: 'My daughter has a fever that won\'t break. She\'s holed up a few streets over, and my leg is shot. Could you bring her medicine?',
      steps: [
        { k: 'item', lo: 220, hi: 480, goal: 'Bring medicine to Teo\'s daughter', need: [['meds', 1], ['antibio', 1], ['bandage', 3]],
          arrive: 'A girl peeks through the chained door. She\'s burning up.', gave: 'She swallows the pills with a grimace. "Tell Dad I\'m okay." She slips you something from under her cot.',
          missing: 'You don\'t have anything to give her. Bring painkillers, antibiotics or 3 bandages (pack or stash) and come back.', r: { caps: 70, xp: 45, items: [['bp_*', 1]] } },
      ] },
    radio: { who: 'Kez', face: '🧑‍🔧', title: 'Signal',
      ask: 'I\'m building a radio to reach the people on the coast. I need batteries and somewhere high. You in?',
      steps: [
        { k: 'item', lo: 150, hi: 380, goal: 'Take 2 batteries to the roof access', need: [['battery', 2]], arrive: 'A fire escape climbs to a flat roof. Kez\'s antenna is already up there.',
          gave: 'You wire the batteries in. The set hums.', missing: 'The radio needs 2 batteries (pack or stash). Come back with them.' },
        { k: 'choice', lo: 150, hi: 380, goal: 'Find a clear spot for the signal', arrive: 'Static... then a voice! Coordinates, a cache. And groans coming up the stairwell.',
          opts: [{ t: 'Hold the line', p: .6, win: 'You scribble down every number before the door gives. Worth it.', lose: 'You get the numbers, but a walker claws your leg on the way down.', hurt: 12, r: { caps: 40, xp: 40, loot: ['hordecrate', 1], token: .6 } },
                 { t: 'Unplug and run', p: 1, win: 'You get half the message and all your limbs.', r: { caps: 25, xp: 25, token: .25 } }] },
      ] },
    list: { who: 'Ray (Dot\'s cousin)', face: '🧢', title: 'The shopping list',
      ask: 'Dot\'s got me running a supply list. Three stops, and my knees are done. Split the haul?',
      steps: [
        { k: 'go', lo: 150, hi: 350, goal: 'Stop 1 on Ray\'s list', arrive: 'Behind the counter: a roll of tape and some scrap. Check.', r: { items: [['tape', 1], ['scrap', 2]] } },
        { k: 'go', lo: 150, hi: 350, goal: 'Stop 2 on Ray\'s list', arrive: 'A stockroom nobody found yet. Cans!', r: { items: [['beans', 2]] } },
        { k: 'go', lo: 150, hi: 350, goal: 'Stop 3 on Ray\'s list', arrive: 'The last stop. A first-aid kit taped under a desk.', r: { items: [['bandage', 2]] } },
        { k: 'back', goal: 'Bring the list back to Ray', arrive: '"You\'re a legend. Dot\'ll hear about this."', r: { caps: 55, xp: 35 } },
      ] },
    vex: { who: 'Vex', face: '🦹', title: 'Somebody else\'s stash',
      ask: 'My old crew left a stash nearby. The Tin Can gang is sniffing around. Get there first and we split it. Deal?',
      steps: [
        { k: 'choice', lo: 250, hi: 500, goal: 'Find the stash before the Tin Cans', arrive: 'A loose vent cover, a bag behind it. Footsteps somewhere close.',
          opts: [{ t: 'Grab it and go', p: .55, win: 'You\'re around the corner before they show.', lose: 'They spot you. A bottle catches you on the way out, but you keep the bag.', hurt: 18, r: { caps: 30, xp: 35, loot: ['safe', 1] } },
                 { t: 'Wait them out', p: .8, win: 'They give up and leave. You take your time.', lose: 'They take half before they go. Better than nothing.', r: { caps: 20, xp: 30, loot: ['wallcache', 1] } }] },
      ] },
  };
  // encounters at marked places (by building type), two choices each
  const ENC = {
    pharmacy: { t: 'The back door is ajar', d: 'The pharmacy\'s back door creaks in the wind. Something shuffles inside.', opts: [
      { t: 'Slip in', p: .6, win: 'Two boxes of pills behind the counter.', lose: 'A walker was waiting by the shelves. You get out bleeding.', hurt: 14, r: { items: [['meds', 1]], xp: 10 } }, { t: 'Leave it', p: 1, win: 'Not today.' }] },
    police: { t: 'An abandoned cruiser', d: 'A police car, door hanging open, the radio still crackling.', opts: [
      { t: 'Check the trunk', p: .5, win: 'An ammo box rolls out.', lose: 'The alarm whoops. You run before anything comes.', r: { items: [['ammo', 8]], xp: 10 }, rare: [['pistol', .12], ['shells', .3]] }, { t: 'Grab the radio', p: 1, win: 'You pocket a fresh battery from it.', r: { items: [['battery', 1]] } }] },
    school: { t: 'Kids\' drawings in the window', d: 'Crayon suns and stick families. A backpack hangs on the fence.', opts: [
      { t: 'Check the backpack', p: .85, win: 'Snacks and a paperback, still dry.', lose: 'A cat hisses out of it. Just a cat.', r: { items: [['snack', 2], ['book', 1]] } }, { t: 'Leave a note for whoever comes back', p: 1, win: 'It feels right. You feel a little braver.', r: { xp: 15 } }] },
    bodega: { t: 'The bodega cat', d: 'A one-eyed orange cat sits on the counter like it owns the place. It probably does.', opts: [
      { t: 'Share a snack', p: 1, win: 'It purrs and knocks something off a shelf for you.', cost: ['snack', 1], r: { items: [['battery', 1], ['tape', 1]], xp: 8 } }, { t: 'Pet it and go', p: .7, win: 'Best cat.', lose: 'It scratches you. Fair.', hurt: 3 }] },
    laundro: { t: 'Lost and found', d: 'A bin of clothes nobody came back for.', opts: [
      { t: 'Dig through it', p: .9, win: 'Clean rags, and something shiny at the bottom.', lose: 'Moths. So many moths.', r: { items: [['cloth', 3]], loot: ['wardrobe', 1] } }, { t: 'Leave it', p: 1, win: 'Fine.' }] },
    garage: { t: 'A half-fixed car', d: 'Hood up, tools everywhere. Someone left in a hurry.', opts: [
      { t: 'Take the tools', p: .75, win: 'Scrap, tape and a wrench.', lose: 'The jack slips. You jump back with a bruised hand.', hurt: 8, r: { items: [['scrap', 3], ['tape', 1]], xp: 10 } }, { t: 'Siphon the battery', p: 1, win: 'Two good batteries.', r: { items: [['battery', 2]] } }] },
    mansion: { t: 'The gate intercom', d: 'The intercom buzzes. A thin voice: "Are you... real?"', opts: [
      { t: 'Talk to them', p: .7, win: 'An old man passes a pouch through the bars. "For the company."', lose: 'He panics and sets off a siren. You leave fast.', r: { caps: 40, items: [['jewelry', 1]] } }, { t: 'Walk on', p: 1, win: 'Not your business.' }] },
    other: { t: 'A survivor\'s sign', d: '"TRADE - KNOCK TWICE" painted on a door.', opts: [
      { t: 'Knock twice', p: .8, win: 'A hand swaps you a fair trade through the slot.', lose: 'Nobody answers. Something inside does, though. You back off.', r: { loot: ['storage', 1], xp: 8 } }, { t: 'Leave a can by the door', p: 1, win: 'Someone will be glad.', cost: ['beans', 1], r: { xp: 20 } }] },
  };

  // ---------------------------------------------------------------- dialog (inside the map screen)
  function dlg(html, wire) {
    const mv = document.getElementById('mapv'); if (!mv) return;
    let el = document.getElementById('mqDlg');
    if (!el) {
      el = document.createElement('div'); el.id = 'mqDlg'; mv.appendChild(el);
      const css = document.createElement('style'); css.textContent = `
      #mqDlg { position: absolute; inset: 0; z-index: 40; display: none; align-items: flex-end; background: rgba(9,8,26,.6); }
      #mqDlg.on { display: flex; }
      #mqDlg .mqc { width: 100%; max-height: 100%; overflow-y: auto; padding: 18px 18px calc(18px + env(safe-area-inset-bottom)); background: #1c1538; border-top: 3px solid #11142f; border-radius: 22px 22px 0 0; box-shadow: 0 -4px 0 #3d2d61, 0 0 0 2px #f07b3c inset; color: #f6e3bb; font-family: Inter, system-ui, sans-serif; }
      #mqDlg .mqk { font-size: 11px; font-weight: 900; letter-spacing: .12em; text-transform: uppercase; color: #f07b3c; }
      #mqDlg .mqh { display: flex; align-items: center; gap: 12px; margin: 6px 0 8px; } #mqDlg .mqf { font-size: 34px; width: 52px; height: 52px; flex: none; display: grid; place-items: center; border-radius: 50%; background: #2a1f4a; border: 3px solid #11142f; }
      #mqDlg h3 { margin: 0; font-size: 20px; font-weight: 900; line-height: 1.15; } #mqDlg .mqw { font-size: 12px; font-weight: 800; color: #9d90bf; }
      #mqDlg p { margin: 0 0 10px; font-size: 14.5px; font-weight: 700; line-height: 1.45; } #mqDlg p.mqr { color: #7fd49a; } #mqDlg p.mqbad { color: #ff8a7a; }
      #mqDlg .mqb { display: grid; gap: 8px; margin-top: 12px; }
      #mqDlg .mqb button { height: 46px; border-radius: 14px; font: 900 15px Inter, system-ui, sans-serif; background: #f07b3c; color: #11142f; border: 2.5px solid #11142f; box-shadow: 0 3px 0 #11142f; }
      #mqDlg .mqb button.g { background: transparent; color: #f6e3bb; border-color: #5a4a86; box-shadow: none; } #mqDlg .mqb button:disabled { opacity: .45; }`;
      document.head.appendChild(css);
    }
    el.innerHTML = `<div class="mqc">${html}</div>`; el.classList.add('on');
    sfx('alert'); buzz([90, 50, 90]);
    if (wire) wire(el);
  }
  const close = () => { const el = document.getElementById('mqDlg'); if (el) el.classList.remove('on'); };
  Q.dialogOpen = () => { const el = document.getElementById('mqDlg'); return !!el && el.classList.contains('on'); };
  function head(kick, face, title, who) { return `<div class="mqk">${esc(kick)}</div><div class="mqh"><span class="mqf">${face}</span><div><h3>${esc(title)}</h3>${who ? `<span class="mqw">${esc(who)}</span>` : ''}</div></div>`; }
  function resultCard(kick, face, title, text, reward, bad) {
    dlg(head(kick, face, title) + `<p class="${bad ? 'mqbad' : ''}">${esc(text)}</p>${reward ? `<p class="mqr">+ ${esc(reward)}</p>` : ''}<div class="mqb"><button id="mqOk">OK</button></div>`, el => { el.querySelector('#mqOk').onclick = close; });
  }
  // a two-way choice: o = { t, p, win, lose, hurt, r, cost, rare }; seed makes the outcome fixed for this spot
  function choose(o, seed) {
    if (o.cost && !has(o.cost[0], o.cost[1])) return { text: `You need ${o.cost[1]} ${DM.D.ITEMS[o.cost[0]].n.toLowerCase()} for that.`, bad: 1, keep: 1 };
    if (o.cost) G().takeItems(o.cost[0], o.cost[1]);
    const r = rng(seed), ok = r() < o.p;
    let text = ok ? o.win : o.lose, bad = !ok, rw = '';
    if (!ok && o.hurt) text += ` (${hurt(o.hurt)})`;
    const pay = o.r ? Object.assign({}, o.r) : null;
    if (pay && o.rare) for (const [k, c] of o.rare) if (ok && r() < c) pay.items = (pay.items || []).concat([[k, 1]]);
    if (pay && (ok || o.hurt)) rw = payout(pay);   // a hurt fail still gets the goods (you paid in blood)
    return { text, bad: bad && !rw, rw };
  }

  // ---------------------------------------------------------------- quest flow
  const spotFrom = (from, lo, hi, avoid) => { const sp = FX().spots(from, lo, hi).filter(([pl]) => !avoid.includes(pl.id)); if (!sp.length) return null; const [pl] = sp[Math.floor(Math.random() * sp.length)]; return { lat: pl.lat, lon: pl.lon, at: pl.name, id: pl.id }; };
  function placeStep(a) {   // pick the real place for the current step (when it starts, so it is near where she is)
    const q = QUESTS[a.q], sp = q.steps[a.i];
    if (sp.k === 'back') { a.pt = a.giver; return true; }
    const from = a.pt || a.giver, pt = spotFrom(from, sp.lo, sp.hi, a.used) || spotFrom(from, sp.lo * .5, sp.hi * 1.6, a.used);
    if (!pt) return false;
    a.pt = pt; a.used.push(pt.id); return true;
  }
  function accept(g) {
    const s = st(); s.givers = s.givers.filter(x => x !== g);
    const a = { q: g.q, giver: { lat: g.lat, lon: g.lon, at: g.at }, i: 0, used: [g.id], pt: null, seed: hash(g.id + s.day) };
    if (!placeStep(a)) { toast('No good spot for this nearby - try again in a bit', 2.4); s.givers.push(g); return; }
    s.active = a; save(); sfx('pick');
    toast(`❓ ${QUESTS[a.q].steps[0].goal}: ${a.pt.at}`, 3.4);
  }
  function arrive(a, pos) {
    const q = QUESTS[a.q], sp = q.steps[a.i], s = st(), last = a.i === q.steps.length - 1;
    const next = extra => {
      if (last) { s.active = null; s.done++; s.total++; save(); return; }
      a.i++; a.pt = a.i < q.steps.length && q.steps[a.i].k === 'back' ? null : a.pt;
      if (!placeStep(a)) { a.pt = null; a.wait = 1; }   // no place yet: retried on the next fix
      save(); if (extra !== false) setTimeout(() => toast(`❓ ${q.steps[a.i].goal}: ${a.pt ? a.pt.at : 'keep walking'}`, 3.2), 600);
    };
    const kick = `${q.title} · ${a.i + 1}/${q.steps.length}`;
    if (sp.k === 'go' || sp.k === 'back') { const rw = sp.r ? payout(sp.r) : ''; resultCard(last ? 'Quest complete' : kick, q.face, a.pt.at, sp.arrive, rw); next(); return; }
    if (sp.k === 'item') {
      const got = sp.need.find(([k, n]) => has(k, n));
      if (!got) { a.nag = Date.now(); save(); resultCard(kick, q.face, a.pt.at, sp.arrive + ' ' + sp.missing, '', 1); return; }
      G().takeItems(got[0], got[1]); const rw = sp.r ? payout(sp.r) : '';
      resultCard(last ? 'Quest complete' : kick, q.face, a.pt.at, `${sp.arrive} You hand over ${got[1]} ${DM.D.ITEMS[got[0]].n.toLowerCase()}. ${sp.gave}`, rw); next(); return;
    }
    if (sp.k === 'choice') {
      a.busy = 1;
      dlg(head(kick, q.face, a.pt.at) + `<p>${esc(sp.arrive)}</p><div class="mqb">${sp.opts.map((o, j) => `<button data-o="${j}"${j ? ' class="g"' : ''}>${esc(o.t)}</button>`).join('')}</div>`, el => {
        el.querySelectorAll('[data-o]').forEach(b => b.onclick = () => {
          const o = sp.opts[+b.dataset.o], res = choose(o, a.seed + a.i * 31 + +b.dataset.o); a.busy = 0;
          resultCard(last ? 'Quest complete' : kick, q.face, a.pt.at, res.text, res.rw, res.bad); next();
        });
      });
    }
  }
  function meetGiver(g) {
    const q = QUESTS[g.q]; g.met = 1; save();
    dlg(head(`Survivor at ${g.at}`, q.face, q.title, q.who) + `<p>"${esc(q.ask)}"</p><p class="mqw">${q.steps.length} step${q.steps.length > 1 ? 's' : ''} around real places nearby${q.steps.some(x => x.k === 'item') ? ' · needs an item from your pack or stash' : ''}</p>
      <div class="mqb"><button id="mqYes">I'll help</button><button id="mqNo" class="g">Not now</button></div>`, el => {
      el.querySelector('#mqYes').onclick = () => { close(); if (st().active) { toast('Finish or drop your current quest first (map card)', 2.6); return; } accept(g); };
      el.querySelector('#mqNo').onclick = () => { close(); toast(`${q.who} will wait here until midnight`, 2); };
    });
  }
  function encounter(pl, pos) {
    const E = ENC[pl.type] || ENC.other, s = st(), seed = hash(pl.id + s.day);
    s.enc++; save();
    dlg(head(`Encounter · ${pl.name}`, '❗', E.t) + `<p>${esc(E.d)}</p><div class="mqb">${E.opts.map((o, j) => `<button data-o="${j}"${j ? ' class="g"' : ''}>${esc(o.t)}${o.cost ? ` (${o.cost[1]} ${esc(DM.D.ITEMS[o.cost[0]].n.toLowerCase())})` : ''}</button>`).join('')}</div>`, el => {
      el.querySelectorAll('[data-o]').forEach(b => b.onclick = () => {
        const res = choose(E.opts[+b.dataset.o], seed + +b.dataset.o * 7);
        if (res.keep) { toast(res.text, 2); return; }
        resultCard('Encounter', '❗', E.t, res.text, res.rw, res.bad);
      });
    });
  }

  // ---------------------------------------------------------------- per position fix (called by mapfx.js)
  Q.onPos = function (pos, walked) {
    if (!pos || pos.acc > 60 || !SV() || !SV().survivor || !FX()) return;
    newDay(); const s = st(), reach = NEAR + Math.min(15, pos.acc / 2), now = Date.now();
    if (Q.dialogOpen()) return;
    // survivors with quests: 1 on the map at a time, 2 a day
    if (!s.givers.length && s.made < 2 && !s.active) {
      const sp = FX().spots(pos, 150, 450); if (sp.length) {
        const [pl] = sp[Math.floor(Math.random() * sp.length)], ks = Object.keys(QUESTS), last = s.lastQ;
        const q = ks.filter(k => k !== last)[Math.floor(Math.random() * (ks.length - 1))];
        s.givers.push({ id: pl.id, lat: pl.lat, lon: pl.lon, at: pl.name, q }); s.made++; s.lastQ = q; save();
        toast(`❗ ${QUESTS[q].who} is waving from ${pl.name}. Walk over to talk.`, 3.6);
      }
    }
    for (const g of s.givers) if (dist(g, pos) <= reach && !g.met) { meetGiver(g); return; }
    for (const g of s.givers) if (g.met && dist(g, pos) > reach * 2) g.met = 0;   // walked off: she asks again next time
    // the active quest
    const a = s.active;
    if (a) {
      if (!a.pt && a.wait && placeStep(a)) { a.wait = 0; save(); toast(`❓ ${QUESTS[a.q].steps[a.i].goal}: ${a.pt.at}`, 3); }
      if (a.pt && !a.busy && dist(a.pt, pos) <= reach && (!a.nag || now - a.nag > 90000)) { arrive(a, pos); return; }
      if (a.busy && a.pt && dist(a.pt, pos) <= reach) { a.busy = 0; arrive(a, pos); return; }   // the choice was closed: show it again
    }
    // encounters at marked places (not houses): rolled once per place per day, 3 a day
    if (s.enc < 3) {
      const M = DM.Map && DM.Map._M; if (!M) return;
      for (const pl of Object.values(M.places)) {
        if (pl.house || s.seen[pl.id] || dist(pl, pos) > reach) continue;
        s.seen[pl.id] = 1; save();
        if (rng(hash(pl.id + s.day + 'enc'))() < .45 && !(a && a.pt && a.pt.id === pl.id)) { encounter(pl, pos); return; }
      }
    }
  };
  const dist = (a, b) => { const R = 6371000, r = Math.PI / 180, dLa = (b.lat - a.lat) * r, dLo = (b.lon - a.lon) * r; const q = Math.sin(dLa / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLo / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(q)); };
  const fmtD = d => d < 1000 ? Math.max(5, Math.round(d / 5) * 5) + ' m' : (d / 1000).toFixed(1) + ' km';

  // ---------------------------------------------------------------- map card lines, markers, drop
  Q.active = () => !!st().active;
  Q.drop = () => { const s = st(); if (!s.active) return; toast(`Dropped "${QUESTS[s.active.q].title}"`, 2); s.active = null; save(); };
  Q.lines = function (pos) {
    const s = st(), out = []; if (!pos) return out; newDay();
    const a = s.active; if (a) { const sp = QUESTS[a.q].steps[a.i]; out.push({ t: `❓ ${sp.goal}${a.pt ? ' · ' + a.pt.at : ''}`, s: a.pt ? fmtD(dist(a.pt, pos)) : 'keep walking', hot: 1 }); }
    for (const g of s.givers) out.push({ t: `❗ ${QUESTS[g.q].who} · ${g.at}`, s: fmtD(dist(g, pos)) });
    return out;
  };
  Q.drawMarks = function (x, t, SX, SY, wx, wy) {
    const s = st(), mark = FX().mark;
    for (const g of s.givers) mark(x, SX(wx(g.lon)), SY(wy(g.lat)), '❗', '#f0c23d', t, QUESTS[g.q].who.split(' ')[0]);
    if (s.active && s.active.pt) mark(x, SX(wx(s.active.pt.lon)), SY(wy(s.active.pt.lat)), '❓', '#b98cf0', t, QUESTS[s.active.q].title);
  };
  Q._st = st; Q.QUESTS = QUESTS; Q.ENC = ENC;   // tests
})();
