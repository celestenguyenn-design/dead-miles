/* Dead Miles (next) 0.73 - "NEW FOR YOU" (owner said yes to "a New for you card on Home that teaches one hidden
   feature a day"; her friend "didn't know the campsites existed", she "didn't know where to use tribute points").
   One tile at the top of Home's Today row: today's feature you have unlocked but never used, in plain words, with a
   "Take me there" button. "Got it" retires that tip for good; a new one comes the next day. Nothing left = no tile.
   Save: SV.tips = { seen: { id: 1 }, day, pick }. */
'use strict';
window.DM = window.DM || {};
(() => {
  const TP = DM.Tips = {};
  const G = () => DM.Game, SV = () => DM.Game && DM.Game.data();
  const today = () => { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };
  const ls = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const net = () => window.NET && NET.ok;
  // id: [title, body, used?, open (feature sheet key or a function), unlock key]
  const TIPS = [
    ['twists', 'Houses with a twist', 'Some houses now have a twist on their card: 🔦 no power, 🧟 infested, 😢 someone crying inside, 🔥 on fire (get out in time), 💣 a trapped safe, ☠️ a named zombie with a trophy. Riskier - and better loot.', () => false, 'loot'],
    ['map', 'Your real streets', 'Open the Map and walk: real pharmacies, schools and stores near you become bonus houses, supply crates drop, and enemy camps 🏴 sit in your neighbourhood.', () => !!ls('dm-next-mapintro2'), 'map'],
    ['cards', 'Field cards', 'Every 10,000 steps you walk gives you a card pack. Doubles star a card up, and 3 cards in your deck give you perks everywhere. Your first pack always has an epic.', v => !!(v.cards && (v.cards.opened || Object.keys(v.cards.own || {}).length)), 'cards'],
    ['camps', 'Camps', 'Twelve enemy camps hide in your neighbourhood (red 🏴 on the Map). Walk to one, win the fight, and it pays you tribute every day - until someone takes it back.', v => !!(v.camps && (v.camps.prev && v.camps.prev.length || v.camps.marks)), 'camps', 'camps', () => net()],
    ['chest', 'The War chest', 'Tribute marks from your camps buy extra backpack and stash slots, plated armor and Masterwork weapons. Find it at the bottom of the Camps screen.', v => !!(v.camps && v.camps.buys && (v.camps.buys.pack || v.camps.buys.stash)), 'camps', 'camps', v => net() && v.camps && v.camps.marks > 0],
    ['collect', 'Collections', 'Cards, records, snow globes and more hide in furniture. They file themselves at home, and doubles now star them up and pay you.', v => !!(v.col && Object.keys(v.col.got || {}).length), 'collect'],
    ['crew', 'Crew', 'Survivors hide in closets and secret rooms. Talk to one and they move into your base - and can search houses for you with the Crew button.', v => !!(v.crew && v.crew.list && v.crew.list.length), 'crew', 'crew'],
    ['boss', 'Weekly boss', 'A giant zombie every week. Walk to reach it, then fight it in short rounds - with your party if you have one.', v => !!(v.boss && v.boss.my), 'boss', 'boss'],
    ['deep', 'Deep runs', 'Floor after floor of one big building. The deeper you go, the better it gets - but you only keep it if you get out.', v => !!(v.deep && (v.deep.run || v.deep.best || v.deep.runs)), 'deep', 'deep'],
    ['codex', 'The Codex', 'Kill more of one kind of zombie and you hit that kind harder. Feats pay caps and unlock titles.', () => false, 'codex', 'codex'],
  ];
  function st() { const v = SV(); if (!v) return null; v.tips = v.tips || { seen: {} }; v.tips.seen = v.tips.seen || {}; return v.tips; }
  function cands() {
    const v = SV(), s = st(); if (!v || !s || !v.tutorialDone) return [];
    return TIPS.filter(([id, , , used, , unk, ok]) => !s.seen[id] && !(used && used(v)) && (!unk || !G().unl || G().unl(unk)) && (!ok || ok(v)));
  }
  TP.current = function () {
    const s = st(); if (!s) return null;
    const c = cands(); if (!c.length) return null;
    if (s.day !== today() || !c.some(x => x[0] === s.pick)) { s.day = today(); s.pick = c[0][0]; }
    return c.find(x => x[0] === s.pick) || null;
  };
  TP.has = k => k === 'tip';
  TP.tile = function () { const t = TP.current(); return t ? { k: 'tip', c: '#f0c64a', n: '✨ New for you', sub: t[1], hot: 'Learn' } : null; };
  TP.html = function () {
    const t = TP.current(); if (!t) return '<p class="mp">You know everything for now. Go for a walk!</p>';
    return `<div class="kick">✨ New for you</div><h3>${t[1]}</h3><p class="mp">${t[2]}</p>
      <div class="btnrow"><button class="mbtn sm ghost" id="tpGot">Got it</button><button class="mbtn sm" id="tpGo">Take me there</button></div>`;
  };
  TP.bind = function (root, close, openSheet) {
    const t = TP.current(); if (!t) return;
    const done = () => { st().seen[t[0]] = 1; G().save(); };
    const g = root.querySelector('#tpGot'); if (g) g.onclick = () => { done(); close(); G().renderHome(); };
    const go = root.querySelector('#tpGo'); if (go) go.onclick = () => {
      done(); close();
      const where = t[4];
      if (where === 'map' || where === 'loot') G().goView(where); else setTimeout(() => openSheet(where), 80);
    };
  };
})();
