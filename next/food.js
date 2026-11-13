/* Dead Miles (next) - hunger and thirst (0.8). Survival-lite: two bars, 0-100, that drain with REAL time
   (worked out from timestamps, so they keep draining while the app is closed) and a little faster during runs.
   Food items carry hu (hunger) / th (thirst) in data.js. Effects are gentle; starving never kills you.
   State lives on the survivor: s.food = { h, t, at, acc, xb } (added in 0.8; older saves start at 80/80). */
'use strict';
window.DM = window.DM || {};
(() => {
  const D = DM.D;
  const F = DM.Food = {};
  const DAY = 864e5;
  F.RATE = { h: 45, t: 70 };   // points per real day: about one meal and two drinks
  F.LOW = 30;                   // below this: Hungry / Thirsty
  F.FULL = 80;                  // both above this: well fed (+10% scavenging XP)
  F.START = 80;                 // existing survivors (pre-0.8 saves) start here
  F.NEW = 90;                   // a brand-new survivor
  F.FLOOR = 10;                 // starvation alone never takes HP below this
  F.RUNCAP = 5;                 // the extra drain from one run never costs more than this per bar

  const num = (v, d) => (typeof v === 'number' && isFinite(v) ? v : d);
  F.norm = function (s, fresh) {
    if (!s) return;
    const f = s.food && typeof s.food === 'object' ? s.food : (s.food = {});
    const v = fresh ? F.NEW : F.START;
    f.h = Math.max(0, Math.min(100, num(f.h, v)));
    f.t = Math.max(0, Math.min(100, num(f.t, v)));
    f.at = num(f.at, Date.now());
    f.acc = Math.max(0, num(f.acc, 0));
    f.xb = Math.max(0, num(f.xb, 0));
    if (f.tip == null) f.tip = 0;
  };

  // Catch up the bars to `now`. Returns the new HP (starving: 1 HP per real hour while either bar is
  // empty, never below FLOOR). The caller decides where that HP goes (the survivor, or the run's player).
  F.tick = function (s, hp, now = Date.now()) {
    if (!s || !s.food) return hp;
    const f = s.food, days = (now - f.at) / DAY;
    if (!(days > 0)) { if (days < 0) f.at = now; return hp; }   // clock went backwards: just restart from now
    const empty = Math.min(f.h / F.RATE.h, f.t / F.RATE.t);      // days until the first bar hits 0
    f.h = Math.max(0, f.h - F.RATE.h * days);
    f.t = Math.max(0, f.t - F.RATE.t * days);
    f.at = now;
    const starving = Math.max(0, days - empty);
    if (starving > 0) {
      f.acc += starving * 24;
      const n = Math.floor(f.acc); f.acc -= n;
      if (n && hp > F.FLOOR) hp = Math.max(F.FLOOR, hp - n);
    } else f.acc = 0;
    return hp;
  };

  const S = () => DM.S;
  F.hungry = (s = S()) => !!(s && s.food && s.food.h < F.LOW);
  F.thirsty = (s = S()) => !!(s && s.food && s.food.t < F.LOW);
  F.wellFed = (s = S()) => !!(s && s.food && s.food.h > F.FULL && s.food.t > F.FULL);
  F.regenMul = (s = S()) => (F.hungry(s) ? .6 : 1);       // Hungry: stamina refills 40% slower
  F.staMax = (s = S()) => (F.thirsty(s) ? 80 : 100);      // Thirsty: stamina max -20
  F.searchMul = (s = S()) => (F.thirsty(s) ? 1.2 : 1);    // Thirsty: searches take 20% longer
  // Well fed and hydrated: +10% scavenging XP. Fractions carry over so small gains still add up.
  F.xpBonus = function (n, s = S()) {
    if (!F.wellFed(s) || !(n > 0)) return 0;
    const f = s.food; f.xb += n * .1; const b = Math.floor(f.xb); f.xb -= b; return b;
  };

  // During house / base runs: a small extra drain (more while sprinting and fighting), capped per run.
  function drain(s, G, dh, dt) {
    if (!s || !s.food || !G) return;
    const r = G.food || (G.food = { h: 0, t: 0 });
    const a = Math.max(0, Math.min(dh, F.RUNCAP - r.h)), b = Math.max(0, Math.min(dt, F.RUNCAP - r.t));
    r.h += a; r.t += b; s.food.h = Math.max(0, s.food.h - a); s.food.t = Math.max(0, s.food.t - b);
  }
  F.runDrain = (dt, running, G, s = S()) => drain(s, G, dt * (.0075 + (running ? .02 : 0)), dt * (.011 + (running ? .03 : 0)));
  F.fight = (G, s = S()) => drain(s, G, .05, .07);

  // ---- items
  F.isFood = k => { const it = D.ITEMS[k]; return !!(it && (it.hu || it.th)); };
  F.eat = function (s, k) { // adds hunger/thirst only; returns the label ("+30 hunger · +40 thirst")
    const it = D.ITEMS[k], f = s.food; if (!it || !f) return '';
    if (it.hu) f.h = Math.min(100, f.h + it.hu);
    if (it.th) f.t = Math.min(100, f.t + it.th);
    return F.label(k);
  };
  F.label = k => { const it = D.ITEMS[k]; if (!it) return ''; return [it.hu ? `+${it.hu} hunger` : '', it.th ? `+${it.th} thirst` : ''].filter(Boolean).join(' · '); };
  F.verb = k => { const it = D.ITEMS[k]; return it && it.use === 'Drink' ? 'Drank' : 'Ate'; };

  // ---- look
  F.ICON = {
    h: '<svg viewBox="0 0 24 24" class="nico"><g transform="rotate(-45 12 12)"><path d="M12 2.6c4 0 6.6 2.9 6.6 6.4 0 3.2-2.3 5.3-4.4 6v3.2h-4.4V15C7.7 14.3 5.4 12.2 5.4 9c0-3.5 2.6-6.4 6.6-6.4z" fill="#d9772e" stroke="#11142f" stroke-width="1.9" stroke-linejoin="round"/><path d="M8.7 7.4c.6-1.4 1.9-2.3 3.4-2.4" stroke="#f0b06a" stroke-width="1.7" fill="none" stroke-linecap="round"/><rect x="10.3" y="17.6" width="3.4" height="3.6" fill="#f6e3bb" stroke="#11142f" stroke-width="1.6"/><circle cx="9.6" cy="21.4" r="1.8" fill="#f6e3bb" stroke="#11142f" stroke-width="1.5"/><circle cx="14.4" cy="21.4" r="1.8" fill="#f6e3bb" stroke="#11142f" stroke-width="1.5"/></g></svg>',
    t: '<svg viewBox="0 0 24 24" class="nico"><path d="M12 2.4C8.6 6.9 5.6 10.4 5.6 14.2a6.4 6.4 0 0 0 12.8 0c0-3.8-3-7.3-6.4-11.8z" fill="#5fb3d9" stroke="#11142f" stroke-width="1.9" stroke-linejoin="round"/><path d="M9 14.6c.1 1.7 1.2 2.9 2.7 3.2" stroke="#d6f0fb" stroke-width="1.8" fill="none" stroke-linecap="round"/></svg>',
  };
  F.lvl = v => (v < 15 ? 'crit' : v < F.LOW ? 'low' : v < 50 ? 'mid' : 'ok');
  F.status = function (s = S()) { // short line for the home card
    if (!s || !s.food) return '';
    const out = [];
    if (s.food.h <= 0 || s.food.t <= 0) out.push(['bad', s.food.t <= 0 && s.food.h <= 0 ? 'Starving and parched' : s.food.h <= 0 ? 'Starving' : 'Parched']);
    else { if (F.hungry(s)) out.push(['bad', 'Hungry']); if (F.thirsty(s)) out.push(['bad', 'Thirsty']); }
    if (F.wellFed(s)) out.push(['good', 'Well fed · +10% XP']);
    return out;
  };
  F.effects = function (s = S()) { // the long version, for the food sheet
    const out = [];
    if (F.hungry(s)) out.push('Hungry: stamina refills 40% slower and no overnight healing.');
    if (F.thirsty(s)) out.push('Thirsty: searches take 20% longer and max stamina is 80.');
    if (s.food.h <= 0 || s.food.t <= 0) out.push(`Empty: you lose 1 HP an hour (never below ${F.FLOOR} from this alone).`);
    if (F.wellFed(s)) out.push('Well fed and hydrated: +10% scavenging XP.');
    if (!out.length) out.push('Fine. Keep both bars above 30 to stay sharp; above 80 both gives +10% XP.');
    return out;
  };
  // the two compact bars (home card); in runs house.js updates its own #needs bars
  F.barsHTML = function (s = S()) {
    const f = s.food, row = (k, v, n) => `<div class="need ${k} ${F.lvl(v)}" title="${n}">${F.ICON[k]}<div class="nbar"><i style="width:${Math.max(0, Math.min(100, v))}%"></i></div><b>${Math.round(v)}</b></div>`;
    return `<button class="needs" id="mNeeds" aria-label="Hunger and thirst">${row('h', f.h, 'Hunger')}${row('t', f.t, 'Thirst')}</button>`;
  };
})();
