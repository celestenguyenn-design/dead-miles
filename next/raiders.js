/* Dead Miles (next) - 0.15 raiders: a rare random event during a house run.
   Two or three hostile survivors walk in off the stoop to loot the same house. They head for containers she has
   not searched and empty them into their bags, attack her on sight (melee; sometimes one has a pistol with a slow,
   telegraphed shot), fight zombies that get in their way, and run for the door when badly hurt.
   Killing one drops part of what it stole plus its own kit. Those who get away are simply gone.

   Whether a house gets raided, how many come and when is seeded from the house (DM.Raid.plan), so it is the same on a
   resumed run. The run save only records that the raid happened (so it never fires twice); on resume the raiders are
   gone, but the containers they emptied stay empty (house.js FKEEP).

   Raiders live in house.js G.zs next to the zombies (flag z.raider) so her swings, arrows and the crowd-separation
   code treat them like any other body. house.js hands this file its internals through DM.Raid.bind(H). */
'use strict';
window.DM = window.DM || {};
(() => {
  const D = DM.D;
  const R = DM.Raid = { force: false };
  // hp; spd walk / chase / flee (tiles/s; she walks 2.75, sprints 4.5); dmg melee hit; reach to start a swing (tiles)
  R.KINDS = {
    brute: { n: 'Raider', hp: 90, walk: 2.0, chase: 2.45, flee: 2.9, dmg: [12, 16], wind: .45, rec: .55, zdmg: 30, xp: 14 },
    gunner: { n: 'Raider (pistol)', hp: 70, walk: 2.0, chase: 2.3, flee: 2.9, dmg: [8, 11], wind: .4, rec: .6, zdmg: 18, xp: 16,
      shot: 18, aim: 1.05, lock: .45, cd: 2.4, bullet: 9, range: 8, keep: [3.2, 5.6] },
  };
  R.SIGHT = 7.5;          // tiles, times her Stealth sight multiplier
  R.LOOT_T = [3.5, 5];    // seconds per container
  R.MAX_BAG = 10;
  R.LEAVE = ['key', 'pole', 'note', 'parcel'];   // never stolen
  // looks for the survivor rig (art.js LOOK): dark, muted coats, every one masked - a red bandana or a gas mask
  R.LOOKS = [
    { body: 'm', skin: 2, hair: 5, hairC: 0, hood: false, coat: 10, pants: 3, cos: { face: 'bandana', back: 'camo' } },
    { body: 'f', skin: 4, hair: 1, hairC: 3, hood: true, coat: 3, pants: 1, cos: { face: 'gasmask' } },
    { body: 'm', skin: 0, hair: 3, hairC: 1, hood: false, coat: 9, pants: 5, cos: { hat: 'beanie', face: 'bandana' } },
    { body: 'f', skin: 3, hair: 2, hairC: 0, hood: false, coat: 4, pants: 1, cos: { hat: 'cap', face: 'bandana', back: 'patched' } },
  ];
  const MELEE = ['machete', 'bat', 'crowbar', 'spikedbat'];

  const danger = L => (DM.Inf ? DM.Inf.danger(L) : (L.danger || 1));
  // chance a run gets raided, by danger: about 3-5% of runs overall, more in big/rich buildings
  R.CHANCE = [0, .03, .04, .06, .08];
  R.chance = L => R.CHANCE[Math.min(4, danger(L))] || 0;
  // plan(L, opts) -> null, or { n, kinds[], wpn[], looks[], at (seconds in), pct (share of the house searched) }
  R.plan = function (L, opts = {}) {
    if (!L || !opts.raid || L.base || L.type === 'tutorial' || L.seed == null || !L.stoop) return null;
    const rnd = D.mulberry32((D.hashStr(String(L.seed) + ':' + L.type + ':raid') >>> 0)), dg = danger(L);
    const roll = rnd();
    if (!(R.force || roll < R.chance(L))) return null;
    const n = 2 + (dg >= 3 && rnd() < .45 ? 1 : 0), gun = rnd() < (dg >= 3 ? .7 : .4);
    const kinds = [], wpn = [], looks = [], off = Math.floor(rnd() * R.LOOKS.length);
    for (let i = 0; i < n; i++) { const g = gun && i === n - 1; kinds.push(g ? 'gunner' : 'brute'); wpn.push(g ? 'pistol' : MELEE[Math.floor(rnd() * MELEE.length)]); looks.push((off + i) % R.LOOKS.length); }
    return { n, kinds, wpn, looks, at: 45 + rnd() * 75, pct: .4 };
  };
  const rigName = i => 'raider_' + i;
  const rigP = {};
  R.ensureRigs = plan => { if (!plan) return; for (const i of plan.looks) if (!rigP[i]) rigP[i] = ART.buildRig('survivor', DM.E.rigRes || 1.4, ART.LOOK.recolor(R.LOOKS[i]), rigName(i), ART.LOOK.patch(R.LOOKS[i])).catch(() => { delete rigP[i]; }); };

  // what a dead raider carries: part of what it stole, plus its own kit (seeded per raider so a test can repeat it)
  R.dropFor = function (z, rnd = Math.random) {
    const bag = z.bag.slice();
    for (let i = bag.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [bag[i], bag[j]] = [bag[j], bag[i]]; }
    const out = bag.slice(0, Math.ceil(bag.length * .6));
    if (z.rk === 'gunner') { out.push('ammo', 'ammo'); } else if (rnd() < .5) out.push('ammo');
    out.push(rnd() < .6 ? 'bandage' : 'meds'); if (rnd() < .25) out.push('meds');
    if (rnd() < .35) out.push(['snack', 'water', 'beans', 'drink'][Math.floor(rnd() * 4)]);
    if (z.rk === 'brute' && rnd() < .4) out.push(z.wpn);
    if (rnd() < .3) out.push('lockpick');
    if (rnd() < .07) out.push(D.pickCos(['corpse', 'police'], rnd));
    return out.filter(k => D.ITEMS[k]);
  };

  // ---------------------------------------------------------------- runtime (needs house.js internals)
  let H = null;
  R.bind = h => { H = h; };
  const T = () => H.T;
  const alive = e => e && !e.dead && !e.gone;
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  // start the raid: they step in off the street just below the stoop
  R.spawn = function (plan) {
    const G = H.G(), L = H.L(), t = T();
    R.ensureRigs(plan);
    const out = [];
    for (let i = 0; i < plan.n; i++) {
      const K = R.KINDS[plan.kinds[i]];
      let x = (L.stoop.x + (i - (plan.n - 1) / 2) * .9) * t, y = (L.streetY + 1.9 + (i % 2) * .4) * t;
      if (H.hit({ hw: 12, hh: 8 }, x, y)) { x = L.stoop.x * t; y = (L.streetY + 1.5) * t; }
      const z = H.mk(x, y, 'goto', H.street());
      Object.assign(z, { raider: 1, rk: plan.kinds[i], wpn: plan.wpn[i], look: plan.looks[i], hp: K.hp, maxHp: K.hp, bag: [], looted: 0, maxLoot: 3 + (i % 2) + (Math.random() < .4 ? 1 : 0),
        delay: i * .7, thinkT: Math.random() * .2, lostT: 0, aggro: 0, fled: 0, flip: false, fx: 0, fy: -1, seen: 0 });
      G.zs.push(z); out.push(z);
    }
    G.raid.on = true; G.raid.ents = out; G.raid.t0 = G.t;
    H.banner('RAIDERS!', 'voices at the front door');
    H.toast('Voices at the front door... raiders!', 3);
    if (H.SFX.ac) { H.SFX.play('thunk'); setTimeout(() => H.SFX.play('thunk'), 160); setTimeout(() => H.SFX.play('creak'), 520); H.SFX.tone('square', 240, 180, .18, .04, .7); H.SFX.tone('square', 300, 200, .14, .035, .95); }
    H.SFX.play('alert');
    return out;
  };

  // ---- containers they go for: unsearched, unlocked, ordinary rooms (never secrets, locked rooms, cars)
  function targets(G, L) {
    const p = G.p, cur = p.search && p.search.it && p.search.it.obj;
    return G.furn.filter(f => f.lootable && !f.searched && !f.locked && !f.keyLock && !f.secretLoot && !f.car && !f.keyRoom && !f.claim && f !== cur
      && f.room && f.room !== H.street() && !(L.rooms[f.room] && (L.rooms[f.room].hidden || L.rooms[f.room].isolated)));
  }
  function frontCells(f) {
    const c = [];
    for (let x = f.tx; x < f.tx + f.tw; x++) c.push([x, f.ty + f.th]);
    if (!f.wall) { for (let x = f.tx; x < f.tx + f.tw; x++) c.push([x, f.ty - 1]); for (let y = f.ty; y < f.ty + f.th; y++) c.push([f.tx - 1, y], [f.tx + f.tw, y]); }
    return c;
  }
  function pickTarget(z) {
    const G = H.G(), L = H.L(), [cx, cy] = H.cellOf(z), field = H.bfs(cx, cy), MW = H.MW();
    let best = null, bd = 1e9;
    for (const f of targets(G, L)) for (const [x, y] of frontCells(f)) {
      if (x < 0 || y < 0 || x >= MW || y >= H.MH()) continue;
      const d = field[y * MW + x]; if (d < 0) continue;
      const score = d + (f.pre && f.pre.length ? 0 : 3) + Math.random() * 2;   // they can't see inside, but a bit of noise spreads them out
      if (score < bd) { bd = score; best = { f, x, y }; }
    }
    if (z.goal && z.goal.f) z.goal.f.claim = null;
    z.goal = best; if (best) best.f.claim = z;
    z.path = null;
    return best;
  }
  function release(z) { if (z.goal && z.goal.f && z.goal.f.claim === z) z.goal.f.claim = null; }
  // walk along a bfs field toward a cell; returns a unit direction or null when there
  function stepTo(z, cx, cy, px, py) {
    const key = cy * H.MW() + cx;
    if (!z.path || z.pathKey !== key) { z.path = H.bfs(cx, cy); z.pathKey = key; }
    const st = H.nextStep(z, z.path), tg = st.same ? { x: px, y: py } : st;
    const dx = tg.x - z.x, dy = tg.y - z.y, d = Math.hypot(dx, dy);
    if (st.same && d < 6) return null;
    return { x: dx / (d || 1), y: dy / (d || 1) };
  }
  function exitPoint() { const L = H.L(), t = T(); return { x: L.stoop.x * t, y: (L.streetY + 1.7) * t }; }

  function seesPlayer(z) {
    const p = H.G().p; if (p.st === 'down') return false;
    const dx = p.x - z.x, dy = p.y - z.y, d = Math.hypot(dx, dy) / T();
    if (d > R.SIGHT * H.sightMul()) return false;
    const facing = (dx < 0) === z.flip || Math.abs(dx) < 8;
    if (d > 3 && !facing) return false;
    return H.los(z.x, z.y - 30, p.x, p.y - 30);
  }
  // a zombie close by (or one that is already after this raider) becomes its target
  function zombieThreat(z) {
    const G = H.G(), t = T(); let best = null, bd = 1e9;
    for (const o of G.zs) {
      if (o.raider || o.dead || o.boss || o.st === 'sleep' || o.st === 'rise') continue;
      const d = dist(o, z), lim = o.foe === z ? 2.6 * t : 1.6 * t;
      if (d < lim && d < bd && H.los(z.x, z.y - 30, o.x, o.y - 30)) { bd = d; best = o; }
    }
    return best;
  }
  // zombies that can see a raider go for it (noise from their looting brings them over first)
  function pokeZombies(z) {
    const G = H.G(), p = G.p, t = T();
    for (const o of G.zs) {
      if (o.raider || o.dead || o.boss || o.st === 'sleep' || o.st === 'rise' || o.st === 'shriek') continue;
      const d = dist(o, z); if (d > 5 * t) continue;
      const dp = dist(o, p), busy = o.st === 'chase' || o.st === 'windup' || o.st === 'lunge' || o.st === 'recover' || o.st === 'hurt';
      if (o.foe && alive(o.foe) && busy) continue;
      if (busy && dp < d * 1.6) continue;   // already after her and she is about as close
      if (!H.los(o.x, o.y - 30, z.x, z.y - 30)) continue;
      o.foe = z; if (!busy) { o.st = 'chase'; o.stT = 0; o.lostT = 0; o.alertT = .7; }
    }
  }

  function startSwing(z, tg) { z.st = 'windup'; z.stT = 0; z.tgt = tg; z.swHit = false; H.SFX.play('alert'); }
  function face(z, dx) { if (Math.abs(dx) > 2) { z.flip = dx < 0; z.fx = Math.sign(dx); } }

  R.update = function (z, dt) {
    const G = H.G(), p = G.p, t = T(), K = R.KINDS[z.rk];
    z.stT += dt; z.flash = Math.max(0, z.flash - dt * 6); z.alertT = Math.max(0, z.alertT - dt); z.cd = Math.max(0, z.cd - dt);
    if (z.dead) {
      z.rot += ((z.fallDir || 1) * Math.PI / 2 - z.rot) * Math.min(1, dt * 9); if (Math.abs(z.rot) > 1.5) z.rot = (z.fallDir || 1) * Math.PI / 2;
      return;
    }
    if (z.delay > 0) { z.delay -= dt; return; }
    const [zx, zy] = H.cellOf(z); z.roomNow = H.roomAt(zx, zy);
    let vx = 0, vy = 0, spd = 0;
    const busy = z.st === 'windup' || z.st === 'strike' || z.st === 'recover' || z.st === 'aim' || z.st === 'hurt';
    z.thinkT -= dt;
    if (z.thinkT <= 0) {
      z.thinkT = .25;
      z.zt = zombieThreat(z);
      if (seesPlayer(z)) {
        if (!z.aggro) { z.alertT = 1.1; if (!G.raid.spotted) { G.raid.spotted = 1; H.toast('A raider spotted you!', 1.6); } }
        z.aggro = 1; z.lastSeen = { x: p.x, y: p.y }; z.lostT = 0; z.seen = 1;
      }
      pokeZombies(z);
    }
    if (!z.fled && z.hp <= z.maxHp * .3 && !busy) {
      z.fled = 1; z.st = 'flee'; z.stT = 0; release(z); z.path = null; z.alertT = 1;
      H.toast('A raider is running for the door!', 1.6);
    }
    const tgt = () => (alive(z.zt) ? z.zt : z.aggro && p.st !== 'down' ? p : null);
    switch (z.st) {
      case 'goto': {
        if (tgt()) { release(z); z.st = 'fight'; z.stT = 0; break; }
        if (!z.goal || z.goal.f.searched) { if (!pickTarget(z)) { z.st = 'leave'; z.path = null; break; } }
        const g = z.goal, gx = (g.x + .5) * t, gy = (g.y + .6) * t;
        const d = stepTo(z, g.x, g.y, gx, gy);
        if (!d || Math.hypot(gx - z.x, gy - z.y) < .45 * t) { z.st = 'loot'; z.stT = 0; z.dur = R.LOOT_T[0] + Math.random() * (R.LOOT_T[1] - R.LOOT_T[0]); z.noiseT = 0; break; }
        spd = K.walk * t; vx = d.x; vy = d.y; face(z, vx);
        if (z.stT > 25) { z.stT = 0; pickTarget(z); }   // stuck: try somewhere else
        break;
      }
      case 'loot': {
        if (tgt()) { release(z); z.st = 'fight'; z.stT = 0; break; }
        const f = z.goal && z.goal.f;
        if (!f || f.searched) { z.st = 'goto'; z.goal = null; break; }
        face(z, f.x + f.w / 2 - z.x);
        z.noiseT -= dt;
        if (z.noiseT <= 0) { z.noiseT = 1; H.noise(z.x, z.y, 3, false, true); H.SFX.play('rummage'); }
        if (Math.random() < dt * 6) H.puff(f.x + f.w / 2 + (Math.random() - .5) * f.w * .6, f.y + f.h + 2, 10 + Math.random() * 30, 2, ['#f6e3bb', '#9d90bf', '#f07b3c'][Math.random() * 3 | 0], 70, .5, 2.6, 300);
        if (z.stT >= z.dur) {
          // they leave what only matters to her (brass keys, the hook pole, notes, Dot's parcel), so no secret or quest is lost
          const pre = f.pre || [], keep = pre.filter(k => R.LEAVE.includes(k)), took = pre.filter(k => !R.LEAVE.includes(k)).slice(0, Math.max(0, R.MAX_BAG - z.bag.length));
          z.bag.push(...took);
          f.searched = true; f.raided = 1; f.loot0 = D.toStacks(keep); f._key = null; f.claim = null;
          for (const e of f.loot0) if (e.k === 'note') e.d = { addr: H.L().address, text: H.L().note || '' };
          z.looted++; G.raid.stolen = (G.raid.stolen || 0) + took.length;
          H.num(f.x + f.w / 2, f.y - 10, took.length ? 'stolen!' : 'empty', '#ff8a7a');
          if (G.fog[f.room] < .5 && !G.raid.toldLoot) { G.raid.toldLoot = 1; H.toast(`They're cleaning out the ${String(f.name || 'cupboards').toLowerCase()}!`, 1.8); }
          z.goal = null;
          z.st = z.looted >= z.maxLoot || z.bag.length >= R.MAX_BAG ? 'leave' : 'goto'; z.stT = 0; z.path = null;
        }
        break;
      }
      case 'fight': {
        const tg = tgt();
        if (!tg) { z.st = z.looted >= z.maxLoot ? 'leave' : 'goto'; z.stT = 0; z.path = null; break; }
        const dx = tg.x - z.x, dy = tg.y - z.y, d = Math.hypot(dx, dy), see = H.los(z.x, z.y - 30, tg.x, tg.y - 30);
        if (tg === p) {
          if (!see) z.lostT += dt; else z.lostT = 0;
          if (z.lostT > 5) { z.aggro = 0; z.lostT = 0; z.st = 'goto'; z.stT = 0; break; }
        }
        face(z, dx);
        if (z.rk === 'gunner' && tg === p && d > 1.6 * t) {
          if (see && d < K.range * t && z.cd <= 0) { z.st = 'aim'; z.stT = 0; z.aimX = p.x; z.aimY = p.y; H.SFX.tone && H.SFX.ac && H.SFX.tone('triangle', 900, 1200, .08, .03); break; }
          // keep a middle distance: back off when she is close, close in when she is far or out of sight
          let mx = 0, my = 0;
          if (!see || d > K.keep[1] * t) { const s = stepTo(z, ...H.cellOf(p), p.x, p.y); if (s) { mx = s.x; my = s.y; } }
          else if (d < K.keep[0] * t) { mx = -dx / d; my = -dy / d; }
          else { mx = -dy / d * .5; my = dx / d * .5; if (Math.sin(G.t + z.id * 9) < 0) { mx = -mx; my = -my; } }
          spd = (d < K.keep[0] * t ? K.walk : K.chase) * t; vx = mx; vy = my;
          break;
        }
        if (d < 1.15 * t && see && z.cd <= 0) { startSwing(z, tg); break; }
        let mx, my;
        if (tg !== p || (see && d < 3.2 * t)) { mx = dx / (d || 1); my = dy / (d || 1); }
        else { const s = stepTo(z, ...H.cellOf(p), p.x, p.y); if (!s) { mx = dx / (d || 1); my = dy / (d || 1); } else { mx = s.x; my = s.y; } }
        spd = (d < .8 * t ? 0 : K.chase) * t; vx = mx; vy = my;
        break;
      }
      case 'windup': {
        const tg = z.tgt; if (!alive(tg) && tg !== p) { z.st = 'fight'; break; }
        face(z, tg.x - z.x);
        if (z.stT >= K.wind) { const dx = tg.x - z.x, dy = tg.y - z.y, d = Math.hypot(dx, dy) || 1; z.lunge = { x: dx / d, y: dy / d }; z.st = 'strike'; z.stT = 0; H.SFX.play('swing'); }
        break;
      }
      case 'strike': {
        const tg = z.tgt, Lg = z.lunge; spd = 4 * t * Math.max(0, 1 - z.stT / .22); vx = Lg.x; vy = Lg.y;
        if (!z.swHit && tg && !tg.dead) {
          const d = Math.hypot(tg.x - z.x, (tg.y - z.y) * 1.2);
          if (d < 1 * t) {
            z.swHit = true;
            if (tg === p) { if (p.inv <= 0 && p.st !== 'down') H.hurtPlayer(K.dmg[0] + Math.round(Math.random() * (K.dmg[1] - K.dmg[0])), Lg.x, Lg.y, z); }
            else H.hitZombie(tg, Math.atan2(Lg.y, Lg.x), K.zdmg, z);
          }
        }
        if (z.stT >= .24) { z.st = 'recover'; z.stT = 0; }
        break;
      }
      case 'recover':
        if (z.stT > K.rec) { z.st = z.fled ? 'flee' : 'fight'; z.stT = 0; z.cd = .35; }
        break;
      case 'aim': { // 0.15 gunner: a red line tracks her, then locks for the last moment - dodge out of it
        if (z.stT < K.aim - K.lock) { z.aimX += (p.x - z.aimX) * Math.min(1, dt * 8); z.aimY += (p.y - z.aimY) * Math.min(1, dt * 8); }
        face(z, z.aimX - z.x);
        if (z.stT >= K.aim) { fire(z); z.st = 'fight'; z.stT = 0; z.cd = K.cd; }
        break;
      }
      case 'hurt':
        if (z.stT > .3) { z.st = z.fled ? 'flee' : 'fight'; z.stT = 0; }
        break;
      case 'flee': case 'leave': {
        if (z.st === 'leave' && tgt()) { z.st = 'fight'; z.stT = 0; break; }
        if (z.st === 'flee' && alive(z.zt) && dist(z.zt, z) < 1 * t && z.cd <= 0) { startSwing(z, z.zt); break; }   // cornered by a zombie
        const ex = exitPoint(), [cx, cy] = H.cellOf(ex);
        const d = stepTo(z, cx, cy, ex.x, ex.y);
        if (!d || Math.hypot(ex.x - z.x, ex.y - z.y) < .7 * t) { gone(z); return; }
        spd = (z.st === 'flee' ? K.flee : K.walk) * t; vx = d.x; vy = d.y; face(z, vx);
        if (z.stT > 40) { gone(z); return; }
        break;
      }
    }
    const k = 1 - Math.exp(-10 * dt);
    z.vx += (vx * spd - z.vx) * k; z.vy += (vy * spd - z.vy) * k;
    const ox = z.x, oy = z.y;
    H.move(z, (z.vx + z.kbx) * dt, (z.vy + z.kby) * dt);
    z.kbx *= Math.exp(-9 * dt); z.kby *= Math.exp(-9 * dt);
    z.ph += Math.hypot(z.x - ox, z.y - oy) / (t * .42) * Math.PI * .5;
  };
  function gone(z) {
    const G = H.G(); z.gone = true; release(z);
    const i = G.zs.indexOf(z); if (i >= 0) G.zs.splice(i, 1);
    G.raid.away = (G.raid.away || 0) + 1;
    if (z.bag.length && z.seen) H.toast(`A raider got away with ${z.bag.length} thing${z.bag.length === 1 ? '' : 's'}`, 2);
  }

  // ---- damage taken (from her, a zombie, or another raider's stray bullet)
  // by: null = her, else the zombie/raider that hit it
  R.damage = function (z, dmg, fa, by, sneak) {
    if (z.dead) return;
    const G = H.G(), t = T(), K = R.KINDS[z.rk];
    z.hp -= dmg; z.flash = 1; z.hurtDir = Math.cos(fa) >= 0 ? 1 : -1;
    z.kbx = Math.cos(fa) * 4.5 * t; z.kby = Math.sin(fa) * 4.5 * t * .8;
    H.num(z.x + 20 * (Math.random() < .5 ? -1 : 1), z.y - 96, Math.round(dmg), by ? '#c6b8e8' : sneak ? '#f07b3c' : '#f6e3bb');
    H.splat(z.x, z.y, fa, z.hp <= 0);
    H.SFX.play(z.hp <= 0 ? 'kill' : 'hit');
    if (!by) { z.aggro = 1; z.lostT = 0; z.seen = 1; z.lastSeen = { x: G.p.x, y: G.p.y }; }
    else if (!by.raider) z.zt = by;
    if (z.hp <= 0) {
      z.dead = true; z.st = 'dead'; z.stT = 0; z.fallDir = z.hurtDir; z.rot = 0; release(z);
      z.drop = R.dropFor(z);
      G.raid.killed = (G.raid.killed || 0) + 1;
      if (!by) { G.stats.raiders = (G.stats.raiders || 0) + 1; H.xp(K.xp, z.x, z.y); }
      if (G.raid.ents.every(e => e.dead || e.gone)) H.banner('RAID OVER', G.raid.killed === G.raid.ents.length ? 'their packs are yours' : 'the rest got away');
      return;
    }
    if (z.st !== 'strike' && z.st !== 'flee') { z.st = 'hurt'; z.stT = 0; }
    release(z);
  };

  // ---- pistol shots: slow enough to dodge
  function fire(z) {
    const G = H.G(), t = T(), K = R.KINDS.gunner, dir = z.flip ? -1 : 1;
    const sx = z.x + dir * 22, sy = z.y - 4;
    const dx = z.aimX - sx, dy = z.aimY - sy, d = Math.hypot(dx, dy) || 1;
    G.shots = G.shots || [];
    G.shots.push({ x: sx, y: sy, vx: dx / d * K.bullet * t, vy: dy / d * K.bullet * t, life: 1.3, from: z });
    H.puff(sx, sy, 44, 6, '#ffd27a', 120, .2, 2.4);
    if (H.SFX.ac) { H.SFX.noise(.18, 'lowpass', 3200, 200, .45, 1); H.SFX.tone('square', 160, 40, .14, .12); }
    H.noise(z.x, z.y, 7, true, true);   // a gunshot brings the house running
    G.shake = Math.max(G.shake, 4);
  }
  R.updateShots = function (dt) {
    const G = H.G(); if (!G.shots || !G.shots.length) return;
    const p = G.p;
    for (const s of G.shots) {
      for (let i = 0; i < 3 && s.life > 0; i++) {
        s.x += s.vx * dt / 3; s.y += s.vy * dt / 3;
        if (p.st !== 'down' && Math.hypot(p.x - s.x, (p.y - s.y) * 1.3) < 18) {
          if (p.inv <= 0) { const d = Math.hypot(s.vx, s.vy) || 1; H.hurtPlayer(R.KINDS.gunner.shot - 2 + Math.round(Math.random() * 4), s.vx / d, s.vy / d, s.from); }
          else H.num(p.x, p.y - 100, 'dodged', '#9fe0e6');
          s.life = 0; break;
        }
        const hz = G.zs.find(o => o !== s.from && !o.dead && !o.gone && Math.hypot(o.x - s.x, (o.y - s.y) * 1.3) < 20);
        if (hz) { const fa = Math.atan2(s.vy, s.vx); if (hz.raider) R.damage(hz, 25, fa, s.from); else H.hitZombie(hz, fa, 40, s.from); s.life = 0; break; }
        if (H.hit({ hw: 2, hh: 2 }, s.x, s.y)) { s.life = 0; H.SFX.play('thunk'); H.puff(s.x, s.y, 20, 5, '#ffd27a', 90, .25, 2); break; }
      }
      s.life -= dt;
    }
    G.shots = G.shots.filter(s => s.life > 0);
  };
  R.drawShots = function (ctx) {
    const G = H.G(); if (!G.shots) return;
    for (const s of G.shots) {
      const a = Math.atan2(s.vy, s.vx);
      ctx.save(); ctx.translate(s.x, s.y - 34); ctx.rotate(a);
      ctx.strokeStyle = 'rgba(255,210,122,.45)'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-22, 0); ctx.lineTo(0, 0); ctx.stroke();
      ctx.fillStyle = '#fff1cf'; ctx.strokeStyle = '#11142f'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(0, 0, 5, 3, 0, 0, 6.28); ctx.fill(); ctx.stroke();
      ctx.restore();
    }
  };

  // ---------------------------------------------------------------- drawing: the survivor rig, masked, in raider colours
  R.draw = function (ctx, z) {
    const G = H.G(), E = DM.E, dir = z.flip ? -1 : 1, K = R.KINDS[z.rk];
    if (z.delay > 0) return;
    const parts = {}; let rot = 0, yo = 0, sy = 1;
    const walkAmp = Math.min(1, Math.hypot(z.vx, z.vy) / (2.4 * T())), s = Math.sin(z.ph * 2);
    parts.legB = { r: s * .5 * walkAmp }; parts.legF = { r: -s * .5 * walkAmp };
    yo = -Math.abs(Math.cos(z.ph * 2)) * 3 * walkAmp;
    const armR = -s * .18 * walkAmp; parts.arm = { r: armR }; parts.bat = { r: armR };
    if (walkAmp < .1) sy = 1 + Math.sin(G.t * 2.6 + z.id * 5) * .012;
    if (z.st === 'windup') { const k = Math.min(1, z.stT / K.wind); parts.arm = parts.bat = { r: -2.3 * k }; rot = -.08 * dir; }
    else if (z.st === 'strike') { const k = Math.min(1, z.stT / .12); parts.arm = parts.bat = { r: -2.3 + 3.2 * k }; rot = .12 * dir; }
    else if (z.st === 'recover') { const k = Math.min(1, z.stT / K.rec); parts.arm = parts.bat = { r: .9 * (1 - k) }; }
    else if (z.st === 'aim' || (z.rk === 'gunner' && z.st === 'fight' && z.aggro)) { parts.arm = parts.bat = { r: -1.35 }; rot = -.04 * dir; }
    else if (z.st === 'loot') { const a = -1 + Math.sin(z.stT * 15) * .35; parts.arm = { r: a }; parts.bat = { r: .25 }; rot = .1 * dir; yo = Math.sin(z.stT * 15) * 1.2; }
    else if (z.st === 'hurt') rot = -.22 * dir;
    else if (z.st === 'flee') rot = .12 * dir;
    let x = z.x, y = z.y + yo;
    if (z.dead) { rot = z.rot; y = z.y + 6; }
    // shadow
    ctx.fillStyle = `rgba(8,6,22,${z.dead ? .3 : .42})`; ctx.beginPath(); ctx.ellipse(z.x, z.y + 1, z.dead ? 24 : 18, (z.dead ? 24 : 18) * .36, 0, 0, 6.28); ctx.fill();
    const rig = ART.rigs[rigName(z.look)] ? rigName(z.look) : 'survivor';
    if (!ART.rigs[rigName(z.look)]) R.ensureRigs({ looks: [z.look] });
    const pose = { rot, sy, parts, alpha: 1, weapon: z.dead ? 'fists' : z.wpn };
    z._pose = [x, y, E.PSCALE, z.flip, pose]; z._rig = rig;
    ART.drawRig(ctx, rig, x, y, E.PSCALE, z.flip, Object.assign({}, pose, { flash: z.flash, flashRed: true }));
  };
  // overlays: the always-on health bar with a raider tag, alert marks, the gunner's aim line
  R.drawOver = function (ctx, z) {
    const G = H.G(), P = ART.P;
    if (z.dead || z.delay > 0) return;
    const rm = z.roomNow || H.street(); if ((G.fog[rm] || 0) > .7) return;
    if (z.st === 'aim') {
      const K = R.KINDS.gunner, lock = z.stT >= K.aim - K.lock, dir = z.flip ? -1 : 1, sx = z.x + dir * 22, sy = z.y - 34;
      const dx = z.aimX - sx, dy = z.aimY - 34 - sy, d = Math.hypot(dx, dy) || 1, len = K.range * T();
      ctx.save(); ctx.globalAlpha = lock ? .65 + .3 * Math.sin(G.t * 40) : .35; ctx.strokeStyle = '#ff5a48'; ctx.lineWidth = lock ? 3 : 2; ctx.setLineDash(lock ? [] : [8, 6]);
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + dx / d * len, sy + dy / d * len); ctx.stroke(); ctx.restore();
    }
    if (z.alertT > 0 || z.st === 'windup' || z.st === 'aim') {
      const red = z.st === 'windup' || z.st === 'aim', x = z.x, y = z.y - 104, sc = red ? 1 + Math.sin(G.t * 30) * .08 : 1;
      ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc);
      ctx.fillStyle = red ? P.RED : P.ORA; ctx.beginPath(); ctx.arc(0, 0, 11, 0, 6.28); ctx.fill(); ctx.lineWidth = 2.4; ctx.strokeStyle = P.INK; ctx.stroke();
      ctx.fillStyle = P.CRM; ctx.font = '900 15px system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.fillText(red ? '!!' : '!', 0, 5.5); ctx.restore();
    }
    const w = 44, bx = z.x - w / 2, by = z.y - 88;
    ctx.fillStyle = P.INK; ART.rr(ctx, bx - 2, by - 2, w + 4, 9, 4); ctx.fill();
    ctx.fillStyle = '#e8574a'; ART.rr(ctx, bx, by, w * Math.max(0, z.hp) / z.maxHp, 5, 2.5); ctx.fill();
    ctx.font = '900 8.5px system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.strokeStyle = P.INK;
    const lbl = z.st === 'loot' ? 'RAIDER · looting' : z.st === 'flee' ? 'RAIDER · fleeing' : 'RAIDER';
    ctx.strokeText(lbl, z.x, by - 4); ctx.fillStyle = '#ff8a7a'; ctx.fillText(lbl, z.x, by - 4);
  };
})();
