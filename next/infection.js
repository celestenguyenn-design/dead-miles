/* Dead Miles (next) - light infection (0.18). Not the special infected (that is infected.js).
   Owner: "infection seems cool but don't do too much of it". So it is small on purpose:
   - About 10% of zombie hits that land infect her (15% from special infected). Never raiders, never the weekly
     boss or an event boss. Field medic (Survival rank 2) halves the chance. A bite while infected does nothing more.
   - While infected her max HP is 5 lower, then 5 more each real day, down to -25 at most. It never kills her
     (max HP stays 75+ and current HP is only clamped down to the new max), there is no permadeath.
   - The one symptom: hunger drains 15% faster (food.js asks DM.Infect.hungerMul).
   - Antibiotics (data.js 'antibio') cure it at once and max HP comes straight back. Left alone she fights it off
     after 5 real days.
   State: survivor.inf = { at: ms infected (0 = healthy), n: times infected, seen: first-infection note shown }.
   Old saves have no inf: they are simply healthy. */
'use strict';
window.DM = window.DM || {};
(() => {
  const D = DM.D, DAY = 864e5;
  const I = DM.Infect = {};
  I.CHANCE = .10;        // per zombie hit that lands
  I.CHANCE_SPECIAL = .15; // per special infected hit
  I.STEP = 5;            // max HP lost per real day (the first 5 at once)
  I.FLOOR = 25;          // never more than this
  I.CLEARS = 5;          // days until she fights it off by herself
  I.HUNGER = 1.15;       // hunger drains this much faster while infected
  I.now = () => Date.now() + (I.devOffset || 0);

  const S = () => DM.S;
  const inf = s => (s && s.inf && s.inf.at > 0 ? s.inf : null);
  I.is = (s = S()) => !!inf(s);
  I.days = (s = S()) => { const f = inf(s); return f ? Math.max(0, (I.now() - f.at) / DAY) : 0; };
  // max HP lost right now
  I.hpLoss = (s = S()) => { const f = inf(s); if (!f) return 0; return Math.min(I.FLOOR, I.STEP * (1 + Math.floor(I.days(s)))); };
  I.hungerMul = (s = S()) => (inf(s) ? I.HUNGER : 1);
  I.chance = (z, s = S()) => (z && z.special ? I.CHANCE_SPECIAL : I.CHANCE) * (DM.Skills && DM.Skills.has('surv', 2, s) ? .5 : 1);

  // Catch up: fought off after CLEARS days; current HP never above the (lower) max. Returns a message if it cleared.
  I.tick = function (s = S()) {
    const f = inf(s); if (!f) return '';
    if (I.days(s) >= I.CLEARS) { f.at = 0; return 'You fought off the infection. Max HP is back.'; }
    s.hp = Math.min(s.hp, D.maxHp(s));
    return '';
  };
  // A zombie hit landed (house.js hurtPlayer). Returns true if it just infected her.
  I.bite = function (z, s = S(), rnd = Math.random) {
    if (!s || !z || z.raider || z.boss || z.kind === 'wboss' || inf(s)) return false;
    if (rnd() >= I.chance(z, s)) return false;
    s.inf = s.inf && typeof s.inf === 'object' ? s.inf : {};
    s.inf.at = I.now(); s.inf.n = (s.inf.n || 0) + 1;
    return true;
  };
  I.cure = function (s = S()) {
    if (!inf(s)) return '';
    s.inf.at = 0;
    return 'Antibiotics: the infection is gone. Max HP back to ' + D.maxHp(s) + '.';
  };
  // the first infection explains itself once (game.js / house.js show it)
  I.firstNote = s => { if (!s || !s.inf || s.inf.seen) return false; s.inf.seen = 1; return true; };
  I.NOTE = ['Infected', 'That bite broke the skin. While infected your max HP is 5 lower, and 5 more each day (never more than 25), and you get hungry a bit faster. It will not kill you. Antibiotics cure it at once (rare in pharmacies, nurse offices and medicine cabinets; Dot sells them from trader level 2). Left alone you fight it off in about 5 days.'];
  // short label for the home card / run HUD
  I.label = (s = S()) => { const f = inf(s); if (!f) return ''; return 'Infected · -' + I.hpLoss(s) + ' max HP'; };
  I.status = (s = S()) => (inf(s) ? [['bad inf', I.label(s)]] : []);
  I.effects = (s = S()) => (inf(s) ? [`Infected: max HP -${I.hpLoss(s)} (5 more each day, up to 25), hunger drains 15% faster. Antibiotics cure it; otherwise it clears in about ${Math.max(1, Math.ceil(I.CLEARS - I.days(s)))} day${Math.ceil(I.CLEARS - I.days(s)) > 1 ? 's' : ''}.`] : []);
})();
