/* Dead Miles (next) - 0.13 special infected for danger 3+ buildings (pharmacy, school, police station, mansion,
   or any house the scouts rated 3+). Which zombie is which is decided at spawn in house.js from a seeded stream over
   (house seed, zombie index), never in gen.js, so a resumed run (house.js restoreRun) meets the same zombies.
   DM.Inf.plan(L) -> { extra: n more zombies, kinds: [kind|null per zombie, gen's first, then the extras] }.
   The house list uses the same plan for its "special infected" tag. */
'use strict';
window.DM = window.DM || {};
(() => {
  const D = DM.D;
  const I = DM.Inf = {};
  // hp: health; spd: chase speed (tiles/s; a normal walker is ~1.85); dmg: hit multiplier; xp: on the kill; kb: knockback taken
  I.KINDS = {
    armored: { n: 'Armored', hp: 150, armor: 80, spd: 1.4, dmg: 1.25, xp: 12, kb: .3, tip: 'Riot gear soaks up melee hits until it cracks. Arrows find the gaps.' },
    runner: { n: 'Runner', hp: 60, spd: 3.05, dmg: .75, xp: 8, kb: 1.2, sight: 9, tip: 'Fast and fragile. It sprints the moment it sees you.' },
    bloater: { n: 'Bloater', hp: 110, spd: 1.3, dmg: 1, xp: 10, kb: .6, tip: 'Bursts into a toxic cloud when it dies. Kill it from range or dodge out.' },
    screamer: { n: 'Screamer', hp: 75, spd: 1.7, dmg: .8, xp: 10, kb: 1, tip: 'If it sees you it shrieks and the whole house comes running. Kill it first.' },
  };
  // which kinds each building leans toward
  const MIX = {
    police: { armored: 50, runner: 25, bloater: 15, screamer: 10 },
    school: { screamer: 40, runner: 35, bloater: 15, armored: 10 },
    pharmacy: { bloater: 45, runner: 30, screamer: 15, armored: 10 },
    mansion: { screamer: 35, runner: 30, bloater: 20, armored: 15 },
    other: { runner: 40, bloater: 25, screamer: 20, armored: 15 },
  };
  I.danger = L => (L && L.type && L.type !== 'tutorial' && !L.base ? (L.danger || (D.BTYPES[L.type] || {}).danger || 1) : 0);
  const rng = (L, i) => D.mulberry32(((D.hashStr(String(L.seed) + ':' + L.type + ':inf') ^ Math.imul(i + 1, 0x9E3779B1)) >>> 0));
  I.plan = function (L) {
    const dg = I.danger(L), n0 = (L && L.zombies ? L.zombies.length : 0);
    const DI = L && L.deepInf;   // 0.17 deep runs (deep.js): a deep floor sets { p, extra, mix, min } - specials on every floor, more the deeper
    if ((dg < 3 && !DI) || L.seed == null) return { extra: 0, kinds: [] };
    const r0 = rng(L, -1);
    const extra = DI ? DI.extra : dg >= 4 ? 1 + (r0() < .3 ? 1 : 0) : (r0() < .5 ? 1 : 0);   // a modest bump: +0-1 at danger 3 (half the time), +1 (sometimes 2) at 4+
    const p = DI ? DI.p : dg >= 4 ? .4 : .24, mix = (DI && DI.mix) || MIX[L.type] || MIX.other, ks = Object.keys(mix), tot = ks.reduce((a, k) => a + mix[k], 0);
    const kinds = []; let screams = 0;
    for (let i = 0; i < n0 + extra; i++) {
      const r = rng(L, i), roll = r(); let v = r() * tot, k = ks[0];
      for (const x of ks) { v -= mix[x]; if (v <= 0) { k = x; break; } }
      if (k === 'screamer' && screams) k = 'runner';   // one screamer a house is plenty
      const zd = L.zombies && L.zombies[i];
      if (roll < p && !(zd && zd.kind)) { kinds.push(k); if (k === 'screamer') screams++; } else kinds.push(null);
    }
    if (DI && DI.min) { let have = kinds.filter(Boolean).length; for (let i = 0; i < kinds.length && have < DI.min; i++) if (!kinds[i] && !(L.zombies && L.zombies[i] && L.zombies[i].kind)) { kinds[i] = ks[0]; have++; } }   // 0.17 deep floors: at least DI.min
    else if (dg >= 4 && !kinds.some(Boolean)) { const i = kinds.findIndex((k, j) => !(L.zombies && L.zombies[j] && L.zombies[j].kind)); if (i >= 0) kinds[i] = ks[0]; }   // danger 4: always at least one
    return { extra, kinds };
  };
  I.count = L => I.plan(L).kinds.filter(Boolean).length;
  // corpse loot on top of the normal zombie roll
  I.loot = function (kind, rnd = Math.random) {
    const out = [];
    if (kind === 'armored') { out.push('ammo'); if (rnd() < .35) out.push('bandage'); if (rnd() < .15) out.push(D.pickCos(['police'], rnd)); }
    else if (kind === 'bloater') { out.push(rnd() < .6 ? 'meds' : 'bandage'); if (rnd() < .3) out.push('meds'); }
    else if (kind === 'runner') { out.push(['snack', 'drink', 'coffee', 'water'][Math.floor(rnd() * 4)]); if (rnd() < .3) out.push('lockpick'); }
    else if (kind === 'screamer') { out.push(rnd() < .5 ? 'battery' : 'tape'); if (rnd() < .25) out.push('lockpick'); if (rnd() < .08) out.push('key'); }
    return out;
  };
})();
