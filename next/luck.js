/* Dead Miles (next) 0.73 - BAD-LUCK STORIES (owner said yes to "bad luck should be interesting too - a failed run could
   still give you a story moment").
   When you go down in a house you lose half your bag (house.js showDeath). Now, 6 times in 10, the next day a little
   story brings some of it back: a stray dog on your step with it in its mouth, a kid from down the street, Auntie Dot
   buying it off a scavenger's cart, a note pinned to your door. Up to two of the lost stacks (half of each, rounded up)
   go to your stash, and the story goes in the journal.
   Save: SV.luck = { due: dayKey, items: [{ k, n, d, q }], where, kind }. */
'use strict';
window.DM = window.DM || {};
(() => {
  const LK = DM.Luck = {};
  const D = DM.D, G = () => DM.Game, SV = () => DM.Game && DM.Game.data();
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const today = () => { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };
  const CHANCE = .6;
  const STORIES = {
    dog: { g: '🐕', t: 'A stray at your door', s: (it, w) => `A scruffy stray dog was sitting on your step this morning, tail going like mad. In its mouth: your ${it}. It must have followed your scent all the way from ${w}. It let you take it, licked your hand, and trotted off.` },
    kid: { g: '🧒', t: 'A knock at dawn', s: (it, w) => `A kid from down the street knocked at dawn. "You dropped these by ${w}," she said, and pushed your ${it} into your hands. She ran off before you could thank her.` },
    dot: { g: '🧕', t: 'Auntie Dot looked out for you', s: (it, w) => `Auntie Dot spotted your ${it} on a scavenger's cart near ${w} and bought them back. "Don't make a habit of it, sugar. This one's on me."` },
    note: { g: '📌', t: 'A note on your door', s: (it, w) => `Somebody pinned a note to your door: "Found these outside ${w}. Figured you'd want them back. Stay alive. - a neighbour". Your ${it} were in a bag underneath.` },
  };
  const list = items => items.map(e => D.ITEMS[e.k] ? D.ITEMS[e.k].n.toLowerCase() + (e.n > 1 ? ' x' + e.n : '') : e.k).join(' and ');
  // called when a house run ends with her going down (game.js loot onExit)
  LK.onLoss = function (lost, where) {
    const v = SV(); if (!v || !lost || !lost.length || v.luck) return;
    if (Math.random() >= CHANCE) return;
    const pickable = lost.filter(e => D.ITEMS[e.k] && !D.ITEMS[e.k].quest && e.k !== 'note' && e.k !== 'parcel');
    if (!pickable.length) return;
    const items = pickable.sort((a, b) => (D.valueOf(b.k, b.d, b.q) * b.n) - (D.valueOf(a.k, a.d, a.q) * a.n)).slice(0, 2)
      .map(e => ({ k: e.k, n: Math.max(1, Math.ceil(e.n / 2)), d: e.d, q: e.q }));
    const kinds = Object.keys(STORIES);
    v.luck = { from: today(), items, where: String(where || 'that house').slice(0, 60), kind: kinds[Math.floor(Math.random() * kinds.length)] };
    G().save();
  };
  // the next day, on the home screen
  LK.check = function () {
    const v = SV(); if (!v || !v.luck || DM.scene || v.luck.from === today() || document.querySelector('#msheet.on')) return;
    const L = v.luck; v.luck = null;
    const S = STORIES[L.kind] || STORIES.dog, it = list(L.items);
    const left = G().routeApi.toStash(L.items.map(e => Object.assign({}, e)));
    G().save();
    if (DM.Journal) DM.Journal.note(`${S.t}: got my ${it} back.`);
    const U = G().ui; if (!U) return;
    U.sheetOpen(`<div class="kick">${S.g} Something good happened</div><h3>${esc(S.t)}</h3><p class="mp">${esc(S.s(it, L.where))}</p>
      <div class="jlist">${L.items.map(e => `<div class="jrow">${U.icon(e.k)}<span>${esc(D.ITEMS[e.k].n)}${e.n > 1 ? ' x' + e.n : ''}</span></div>`).join('')}</div>
      <p class="mp dim">${left.length ? 'Your stash was full - some of it is gone again.' : 'It is in your stash.'}</p>
      <div class="btnrow"><button class="mbtn sm" id="lkOk">Lucky</button></div>`);
    const b = document.getElementById('lkOk'); if (b) b.onclick = () => U.sheetClose();
  };
})();
