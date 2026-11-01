/* Dead Miles: Homestead - the night run. A short roguelite: a map of seven
   floors, card fights, events, a boss. About 5-8 minutes. Everything you
   find comes home; fall and you still keep half. */
'use strict';
const FLOORS = 7;   // 0..5 + boss on 6

/* ================= setup ================= */
let PICK = { region: 'outskirts', heat: 0, meal: '', keep: '' };
function renderRunPick() {
  if (!regionOpen(PICK.region)) PICK.region = 'outskirts';
  const night = tonight(); const R = REGIONS.find(r => r.id === PICK.region);
  let h = `<div class="card night"><h2>${night.e} Tonight: ${night.n}</h2><p>${night.d}</p><p class="help">🔥 ${plural(S.torches, 'torch', 'torches')}. One run each. Free one every morning (up to ${TORCH_FREE_CAP}), and up to ${TORCH_GRIT.length} more a day for moving.</p></div>`;
  h += `<div class="card"><h2>Where to?</h2><p class="help">Travel is free. Beat a region's boss to open the next one.</p><div class="stack">` + REGIONS.map((r, i) => {
    const open = regionOpen(r.id);
    return `<button class="region ${PICK.region === r.id ? 'on' : ''} ${open ? '' : 'locked'}" ${open ? `onclick="PICK.region='${r.id}';PICK.heat=Math.min(PICK.heat,heatMax('${r.id}'));render()"` : 'disabled'} style="--rc:${r.color}"><span class="pe">${open ? r.e : '🔒'}</span><span style="flex:1"><b>${r.n}</b>${S.beaten[r.id] ? ' <span class="chip a">cleared</span>' : ''}<small>${open ? r.d : 'Beat ' + BOSSES[REGIONS[i - 1].boss].n + ' in ' + REGIONS[i - 1].n + ' first.'}</small></span></button>`;
  }).join('') + `</div></div>`;
  // heat
  const hm = heatMax(R.id);
  if (hm) h += `<div class="card"><h2>🌡️ Heat <span class="sub">${PICK.heat}/${hm}</span></h2><p class="help">Harder enemies, +15% loot per level. Beat the boss at your top heat to unlock the next.</p><div class="row">` + Array.from({ length: hm + 1 }, (_, i) => `<button class="btn sm ${PICK.heat === i ? 'r' : 'ghost'}" onclick="PICK.heat=${i};render()">${i}</button>`).join('') + `</div></div>`;
  // meal
  const meals = MEAL_ORDER.filter(m => S.meals[m] > 0);
  h += `<div class="card"><h2>🍽️ Eat before you go</h2>${meals.length ? `<div class="stack"><button class="pickrow ${!PICK.meal ? 'on' : ''}" onclick="PICK.meal='';render()"><span class="pe">🚫</span><span style="flex:1"><b>Nothing</b></span></button>` + meals.map(m => `<button class="pickrow ${PICK.meal === m ? 'on' : ''}" onclick="PICK.meal='${m}';render()"><span class="pe">${MEALS[m].e}</span><span style="flex:1"><b>${MEALS[m].n}</b> ×${S.meals[m]}<small>${MEALS[m].d}</small></span></button>`).join('') + `</div>` : '<p class="help">No meals. Cook in the Kitchen on the Farm tab for a run bonus.</p>'}</div>`;
  // keepsake
  if (S.keepsakes.length) h += `<div class="card"><h2>🎒 Bring a keepsake</h2><div class="chips"><button class="chip btnchip ${!PICK.keep ? 'a' : ''}" onclick="PICK.keep='';render()">none</button>` + S.keepsakes.map(k => `<button class="chip btnchip ${PICK.keep === k ? 'a' : ''}" onclick="PICK.keep='${k}';render()" title="${esc(CHARMS[k].d)}">${CHARMS[k].e} ${CHARMS[k].n}</button>`).join('') + `</div>${PICK.keep ? `<p class="help">${esc(CHARMS[PICK.keep].d)}</p>` : ''}</div>`;
  h += `<button class="btn r wide big" ${S.torches ? '' : 'disabled'} onclick="startRun()">${S.torches ? 'Head out into ' + R.n + ' 🔥' : 'No torches left tonight'}</button>`;
  if (!S.torches) h += `<p class="help center">A free torch comes every morning. Moving earns more: ${TORCH_GRIT.map(t => t + ' grit').join(', ')}.</p>`;
  return h;
}

/* ================= map ================= */
function genMap(night, r) {
  const map = [];
  for (let f = 0; f < FLOORS - 1; f++) {
    const row = [];
    for (let l = 0; l < 3; l++) {
      let t;
      if (f === 0) t = l === 2 ? 'event' : 'fight';
      else if (f === 5) t = 'rest';
      else if (f === 3 && l === 1) t = 'rest';
      else {
        const W = [{ t: 'fight', w: 44 + (night.fights ? 25 : 0) }, { t: 'event', w: night.fights ? 12 : 26 }, { t: 'elite', w: f >= 2 ? 14 : 0 }, { t: 'cache', w: 9 }, { t: 'shop', w: f >= 2 ? 8 : 0 }];
        t = wpick(W, r).t;
      }
      row.push({ t, l, done: false });
    }
    map.push(row);
  }
  if (night.cache) { map[1][rint(0, 2, r)].t = 'cache'; map[4][rint(0, 2, r)].t = 'cache'; }
  if (night.shop) { map[2][rint(0, 2, r)].t = 'shop'; map[4][rint(0, 2, r)].t = 'shop'; }
  // guarantee one elite somewhere in floors 2-4
  if (!map.slice(2, 5).some(row => row.some(n => n.t === 'elite'))) map[rint(2, 4, r)][rint(0, 2, r)].t = 'elite';
  map.push([{ t: 'boss', l: 1, done: false }]);
  return map;
}
const NODE = { fight: ['🧟', 'Fight'], elite: ['💀', 'Elite'], event: ['❔', 'Event'], rest: ['🔥', 'Rest'], shop: ['🧳', 'Trader'], cache: ['📦', 'Cache'], boss: ['👑', 'Boss'] };
function reachable(f, l) {
  const R = S.run; if (f !== R.floor + 1) return false;
  if (f === FLOORS - 1) return true;
  return R.floor < 0 || Math.abs(l - R.lane) <= 1;
}

/* ================= start / end ================= */
function startRun() {
  if (S.run) { go('run'); return; }
  if (S.torches < 1) { toast('No torches'); return; }
  const R = REGIONS.find(r => r.id === PICK.region); if (!R || !regionOpen(R.id)) return;
  const night = tonight();
  S.torches--;
  const charms = []; if (PICK.keep && S.keepsakes.includes(PICK.keep)) charms.push(PICK.keep);
  for (const c of campCharms()) if (!charms.includes(c)) charms.push(c);
  let meal = '';
  if (PICK.meal && S.meals[PICK.meal] > 0) { meal = PICK.meal; S.meals[meal]--; }
  const mf = meal ? MEALS[meal].fx : {}; const mm = charms.includes('ladle') ? 1.5 : 1;
  let maxhp = baseMaxHp() + Math.round((mf.maxhp || 0) * mm);
  const med = S.surv.filter(s => s.job === 'medic'); if (med.length) maxhp += 5 + Math.max(...med.map(s => s.hearts));
  if (charms.includes('locket')) maxhp += 10;
  maxhp += 2 * Math.floor(roadSkill('train').lvl / 5);
  const deck = STARTER_DECK.map(id => ({ id, u: uid() }));
  const pet = activePet(); if (pet) deck.push({ id: pet.kind === 'dog' ? 'sicem' : 'pounce', u: uid() });
  const seed = hash(todayStr() + R.id + S.stats.runs + S.created);
  S.run = {
    region: R.id, heat: PICK.heat || 0, night: night.id, seed, floor: -1, lane: 1, map: genMap(night, mulberry(seed)),
    hp: Math.round(maxhp * (night.startHp || 1)), maxhp, deck, charms, meal, mm,
    loot: { scrap: 0, wood: 0, seeds: {}, surv: [], pets: [], charms: [] },
    view: 'map', fight: null, reward: null, evt: null, pickMode: null, candle: false, kills: 0, elites: 0, fights: 0, startedAt: Date.now(), log: [],
  };
  S.stats.runs++; PICK.meal = '';
  log('Headed out into ' + R.n + ' (' + night.n.toLowerCase() + ').');
  SFX.play('ui'); save(); TAB = 'run'; render();
}
function runNight() { return NIGHTS.find(n => n.id === S.run.night) || NIGHTS[0]; }
function runRegion() { return REGIONS.find(r => r.id === S.run.region); }
function has(c) { return S.run && S.run.charms.includes(c); }
function mealFx(k) { const R = S.run; if (!R.meal) return 0; return (MEALS[R.meal].fx[k] || 0) * (R.mm || 1); }
function lootMult() { const R = S.run, n = runNight(); let m = (1 + 0.15 * R.heat) * (1 + (n.scrap || 0)); if (has('rabbit')) m *= 1.2; if (has('magpie')) m *= 1.25; const p = activePet(); if (p && p.kind === 'cat') m *= 1.15; m *= 1 + mealFx('scrap'); return m; }
function endRun(kind) {
  const R = S.run; if (!R || R.summary) return; const L = R.loot; const keep = kind === 'dead' ? 0.5 : 1;
  const got = { scrap: Math.floor(L.scrap * keep), wood: Math.floor(L.wood * keep), seeds: {} };
  for (const [k, v] of Object.entries(L.seeds)) { const n = Math.floor(v * keep) || (kind !== 'dead' ? v : 0); if (n) got.seeds[k] = n; }
  S.scrap += got.scrap; S.wood += got.wood;
  for (const [k, v] of Object.entries(got.seeds)) S.seeds[k] = (S.seeds[k] || 0) + v;
  const people = L.surv.map(s => { addSurvivor(s); return s.name; });
  const pets = L.pets.map(k => petJoin(k).name);
  const newKeeps = L.charms.filter(c => !S.keepsakes.includes(c)); newKeeps.forEach(c => S.keepsakes.push(c));
  let xp = R.kills * 5 + R.elites * 10 + Math.max(0, R.floor) * 4 + (kind === 'win' ? 40 : 0); addXp(xp);
  S.stats.best = Math.max(S.stats.best, R.floor + 1);
  if (kind !== 'dead') S.stats.wins++;
  const reg = runRegion();
  let unlocked = '';
  if (kind === 'win') {
    S.stats.bosses++;
    const first = !S.beaten[reg.id]; S.beaten[reg.id] = true; S.heat[reg.id] = Math.max(S.heat[reg.id] || 0, R.heat);
    if (first) { const i = REGIONS.findIndex(r => r.id === reg.id); if (REGIONS[i + 1]) unlocked = REGIONS[i + 1].n; }
  }
  R.view = 'end';
  R.summary = { kind, got, people, pets, newKeeps, xp, unlocked, keep };
  log(kind === 'win' ? 'Beat ' + BOSSES[reg.boss].n + '!' : kind === 'home' ? 'Made it home from ' + reg.n + '.' : 'Fell in ' + reg.n + ' on floor ' + (R.floor + 1) + '. Hattie dragged you home.');
  save(); render();
}
function closeRun() { S.run = null; save(); TAB = 'today'; render(); }
function headHome(sure) { if (!S.run) return; if (!sure) { openSheet(`<h2>Head home?</h2><p>You keep everything you found tonight. The boss will still be here tomorrow.</p><div class="row"><button class="btn r" onclick="closeSheet();headHome(true)">Head home</button><button class="btn ghost" onclick="closeSheet()">Keep going</button></div>`); return; } endRun('home'); }

/* ================= entering nodes ================= */
function enterNode(f, l) {
  const R = S.run; if (!reachable(f, l)) return;
  const node = f === FLOORS - 1 ? R.map[f][0] : R.map[f][l];
  R.floor = f; R.lane = node.l; node.done = true;
  bountyProg('floor', f + 1);
  const rr = mulberry(R.seed + f * 31 + l);
  if (node.t === 'fight') startFight('fight', rr);
  else if (node.t === 'elite') startFight('elite', rr);
  else if (node.t === 'boss') startFight('boss', rr);
  else if (node.t === 'event') { const E = pick(EVENTS.filter(e => !(R.seen || []).includes(e.id)), rr) || EVENTS[0]; R.seen = (R.seen || []).concat(E.id); R.evt = { id: E.id, res: null }; R.view = 'event'; }
  else if (node.t === 'rest') { R.view = 'rest'; R.restDone = false; }
  else if (node.t === 'shop') { R.shop = makeShop(rr); R.view = 'shop'; }
  else if (node.t === 'cache') { const sc = Math.round(rint(8, 14, rr) * lootMult()), wd = rint(2, 5, rr); const sd = pick(runRegion().seeds, rr); R.loot.scrap += sc; R.loot.wood += wd; R.loot.seeds[sd] = (R.loot.seeds[sd] || 0) + 1; R.reward = { lines: ['⚙️ ' + sc + ' scrap', '🪵 ' + wd + ' wood', CROPS[sd].e + ' ' + CROPS[sd].n + ' seed'], cards: null, charms: rr() < 0.25 ? charmChoice(1) : null, title: 'Supply cache' }; R.view = 'reward'; }
  SFX.play('ui'); save(); render();
}

/* ================= combat ================= */
function cardFx(c) { const D = CARDS[c.id]; return c.up ? Object.assign({}, D.fx, D.up || {}) : D.fx; }
function cardName(c) { return CARDS[c.id].n + (c.up ? '+' : ''); }
function cardDesc(c) {
  const fx = cardFx(c); let d = CARDS[c.id].d;
  d = d.replace(/\{(\w+)\?\}(.*?)\{\/\}/g, (m, k, inner) => fx[k] ? inner : '');
  d = d.replace(/\{(\w+)%\}/g, (m, k) => Math.round((fx[k] || 0) * 100) + '%');
  d = d.replace(/\{(\w+)\}/g, (m, k) => {
    if (k === 'dmg') { let v = fx.dmg; if (c.id === 'strike' && has('whet')) v += 3; if (c.id === 'kick' && has('boots')) v += 2; return v; }
    if (k === 'expose' && c.id === 'kick' && has('boots')) return (fx.expose || 0) + 1;
    return fx[k];
  });
  return d;
}
function scaleFor(kind) {
  const R = S.run, reg = runRegion(), n = runNight();
  const hp = (1 + 0.14 * (reg.lvl - 1)) * (1 + 0.045 * Math.max(0, R.floor)) * (1 + 0.1 * R.heat) * (1 + (n.hp || 0));
  const dmg = Math.floor((reg.lvl - 1) * 0.6) + Math.floor(R.heat / 3) + (R.floor >= 4 && kind !== 'boss' ? 1 : 0);
  return { hp, dmg };
}
function mkEnemy(key, kind, r) {
  const D = kind === 'boss' ? BOSSES[key] : ENEMIES[key]; const sc = scaleFor(kind);
  const base = kind === 'boss' ? D.hp * (1 + 0.1 * S.run.heat) * (1 + (runNight().hp || 0)) : rint(D.hp[0], D.hp[1], r) * sc.hp;
  const hp = Math.round(base);
  return { key, kind, n: D.n, hp, max: hp, block: 0, st: { str: 0, weak: 0, expose: 0, bleed: 0 }, mi: 0, last: [], intent: null, acted: false, dmgAdd: sc.dmg, u: uid() };
}
function startFight(kind, r) {
  const R = S.run, reg = runRegion();
  let es = [];
  if (kind === 'boss') es = [mkEnemy(reg.boss, 'boss', r)];
  else if (kind === 'elite') es = [mkEnemy(pick(reg.elites, r), 'elite', r)];
  else {
    const n = R.floor < 1 ? 1 : R.floor < 3 ? (r() < 0.5 ? 2 : 1) : (reg.lvl >= 5 && r() < 0.25 ? 3 : r() < 0.6 ? 2 : 1);
    for (let i = 0; i < n; i++) es.push(mkEnemy(pick(reg.foes, r), 'fight', r));
    if (n > 1) es.forEach(e => { e.hp = e.max = Math.round(e.max * (n === 2 ? 0.72 : 0.55)); });
  }
  const deck = R.deck.map(c => ({ ...c }));
  const F = { kind, enemies: es, draw: shuffle(deck), hand: [], disc: [], exh: [], energy: 0, block: 0, st: { str: 0, weak: 0, expose: 0, bleed: 0, plate: 0, thorns: 0 }, turn: 0, target: 0, firstAtk: true, log: [], dog: 0, won: false };
  if (has('lantern')) F.draw.splice(rint(0, F.draw.length, r), 0, { id: 'wound', u: uid() });
  // start-of-fight effects
  F.st.str += mealFx('str') + (has('medal') ? 1 : 0);
  F.startBlock = (has('kneepads') ? 5 : 0) + Math.round(mealFx('block')) + (has('badge') ? 3 : 0);
  const pet = activePet(); if (pet && pet.kind === 'dog') F.dog = 4 + 3 * (S.build.kennel || 0);
  for (const e of es) { if (has('bell')) e.st.expose = 1; if (mealFx('weakAll')) e.st.weak = 1; }
  if ((kind === 'elite' || kind === 'boss') && has('stetho')) R.hp = Math.min(R.maxhp, R.hp + 5);
  R.fight = F; R.view = 'fight'; R.fights++;
  if (kind === 'boss') clog(BOSSES[reg.boss].line, 'sys');
  startTurn(true);
}
function clog(m, c) { const F = S.run.fight; if (!F) return; F.log.unshift({ m, c }); F.log = F.log.slice(0, 6); }
function alive() { return S.run.fight.enemies.filter(e => e.hp > 0); }
function drawCards(n) {
  const F = S.run.fight;
  for (let i = 0; i < n; i++) {
    if (!F.draw.length) { if (!F.disc.length) break; F.draw = shuffle(F.disc); F.disc = []; }
    if (F.hand.length >= 10) break;
    F.hand.push(F.draw.pop());
  }
}
function pickIntent(e) {
  const D = e.kind === 'boss' ? BOSSES[e.key] : ENEMIES[e.key];
  let m;
  if (D.cycle) { m = D.moves[e.mi % D.moves.length]; e.mi++; }
  else { let tries = 0; do { m = wpick(D.moves); tries++; } while (tries < 5 && e.last.length >= 2 && e.last.slice(-2).every(x => x === m)); }
  if (m.summon && alive().length >= 4) m = D.moves.find(x => x.a) || m;
  e.last.push(m); e.last = e.last.slice(-3); e.intent = m;
}
function startTurn(first) {
  const R = S.run, F = R.fight; F.turn++;
  // bleed ticks on you
  if (F.st.bleed > 0) { R.hp -= F.st.bleed; clog('You bleed for ' + F.st.bleed + '.', 'bad'); F.st.bleed--; if (checkDeath()) return; }
  F.block = F.st.plate || 0; if (first) F.block += F.startBlock || 0;
  F.energy = 3 + (has('lantern') ? 1 : 0) + Math.round(mealFx('energy')) + (first && has('watch') ? 1 : 0);
  drawCards(5 + (first ? (has('walkman') ? 2 : 0) + Math.round(mealFx('draw1')) : 0));
  for (const e of alive()) pickIntent(e);
  F.target = Math.max(0, F.enemies.findIndex(e => e.hp > 0));
}
function dmgToEnemy(e, base, card) {
  const F = S.run.fight; let v = base + F.st.str;
  if (card && card.id === 'strike' && has('whet')) v += 3;
  if (card && card.id === 'kick' && has('boots')) v += 2;
  if (F.firstAtk && has('axehead')) v += 5;
  if (F.st.weak > 0) v *= 0.75;
  if (e.st.expose > 0) v *= 1.5;
  v = Math.max(0, Math.floor(v));
  const absorbed = Math.min(e.block, v); e.block -= absorbed; e.hp -= (v - absorbed);
  return v - absorbed;
}
function playCard(i) {
  const R = S.run, F = R.fight; if (!F || F.won) return;
  const c = F.hand[i]; if (!c) return; const D = CARDS[c.id];
  if (D.t === 'curse') { toast('A bite wound. It just sits there.'); return; }
  if (D.c > F.energy) { toast('Not enough energy'); return; }
  const fx = cardFx(c);
  let tgts = alive(); if (!tgts.length) return;
  let tgt = F.enemies[F.target]; if (!tgt || tgt.hp <= 0) tgt = tgts[0];
  const targets = D.tgt === 'all' ? tgts : [tgt];
  F.energy -= D.c; F.hand.splice(i, 1);
  S.stats.cards++; bountyProg('cards', 1);
  let killScrap = 0;
  if (fx.dmg) {
    const hits = fx.hits || 1;
    for (const t of targets) {
      let total = 0;
      for (let h = 0; h < hits; h++) {
        if (t.hp <= 0) break;
        let base = fx.dmg; if (fx.exposeX && t.st.expose > 0) base *= fx.exposeX;
        total += dmgToEnemy(t, base, c);
        if (t.hp <= 0 && fx.scrapKill) killScrap += fx.scrapKill;
      }
      if (fx.bleed && t.hp > 0) t.st.bleed += fx.bleed;
      clog(cardName(c) + ' hits ' + t.n + ' for ' + total + '.', 'good');
    }
    F.firstAtk = false; SFX.play('hit'); flash('e' + targets[0].u);
  }
  for (const t of targets) { if (t.hp <= 0) continue; if (fx.expose) t.st.expose += fx.expose + (c.id === 'kick' && has('boots') ? 1 : 0); if (fx.weak) t.st.weak += fx.weak; }
  if (fx.block) { F.block += fx.block; SFX.play('block'); }
  if (fx.blockMissing) F.block += Math.floor((R.maxhp - R.hp) * fx.blockMissing);
  if (D.t === 'skill' && has('mitts')) F.block += 1;
  if (fx.heal) { const was = R.hp; R.hp = Math.min(R.maxhp, R.hp + fx.heal); clog('Healed ' + (R.hp - was) + '.', 'good'); }
  if (fx.energy) F.energy += fx.energy;
  if (fx.str) F.st.str += fx.str;
  if (fx.plate) F.st.plate += fx.plate;
  if (fx.thorns) F.st.thorns += fx.thorns;
  if (fx.draw) drawCards(fx.draw);
  if (killScrap) { R.loot.scrap += killScrap; clog('+' + killScrap + ' scrap from the body.', 'good'); }
  if (fx.exhaust || D.t === 'power') F.exh.push(c); else F.disc.push(c);
  afterDamage();
  save(); render();
}
function afterDamage() {
  const R = S.run, F = R.fight;
  for (const e of F.enemies) {
    if (e.hp <= 0 && !e.dead) {
      e.dead = true; e.hp = 0; R.kills++; S.stats.kills++; clog(e.n + ' goes down.', 'good');
      const D = ENEMIES[e.key];
      if (D && D.death && D.death.aoe) { hitPlayer(D.death.aoe, e, true); clog('It bursts! ' + D.death.aoe + ' to you.', 'bad'); }
    }
  }
  if (!alive().length && !F.won) { F.won = true; setTimeout(() => { if (S.run && S.run.fight === F) winFight(); }, 450); }
  else if (F.enemies[F.target] && F.enemies[F.target].hp <= 0) F.target = Math.max(0, F.enemies.findIndex(e => e.hp > 0));
  checkDeath();
}
function hitPlayer(v, src, noThorns) {
  const R = S.run, F = R.fight;
  if (F.st.expose > 0) v = Math.floor(v * 1.5);
  if (F.dog > 0 && v > 0) { const b = Math.min(F.dog, v); v -= b; F.dog = 0; const p = activePet(); clog((p ? p.name : 'Your dog') + ' takes ' + b + ' of the hit.', 'good'); }
  const ab = Math.min(F.block, v); F.block -= ab; v -= ab;
  R.hp -= v; if (v > 0) flash('me');
  if (!noThorns && F.st.thorns && src && src.hp > 0) { src.hp -= F.st.thorns; }
  return v;
}
function endTurn() {
  const R = S.run, F = R.fight; if (!F || F.won) return;
  // discard hand
  while (F.hand.length) F.disc.push(F.hand.pop());
  // your weak/expose wear off
  if (F.st.weak > 0) F.st.weak--; if (F.st.expose > 0) F.st.expose--;
  for (const e of F.enemies.slice()) {
    if (e.hp <= 0) continue;
    e.block = 0;
    const m = e.intent || {}; e.acted = true;
    if (m.a) {
      const hits = m.hits || 1; let tot = 0;
      for (let h = 0; h < hits; h++) { let v = m.a + e.dmgAdd + e.st.str; if (e.st.weak > 0) v = Math.floor(v * 0.75); tot += hitPlayer(Math.max(0, v), e); if (R.hp <= 0) break; }
      clog(e.n + (m.n ? ' - ' + m.n : '') + ': ' + tot + ' damage.', 'bad'); SFX.play('hit');
    }
    if (m.b) { e.block += m.b; if (!m.a) clog(e.n + ' braces (' + m.b + ').'); }
    if (m.bleed) F.st.bleed += m.bleed;
    if (m.weak) { F.st.weak += m.weak; clog('You are Weakened.', 'bad'); }
    if (m.expose) F.st.expose += m.expose;
    if (m.str) { e.st.str += m.str; clog(e.n + ' gets stronger.'); }
    if (m.heal) { e.hp = Math.min(e.max, e.hp + m.heal); clog(e.n + ' recovers ' + m.heal + '.'); }
    if (m.shout) { alive().forEach(x => x.st.str += 1); clog(e.n + ' screams. Everything gets angrier.', 'bad'); }
    if (m.wound) { const w = { id: 'wound', u: uid() }; F.disc.push(w); R.deck.push({ id: 'wound', u: w.u }); clog('A bite wound. It will slow you down until you rest.', 'bad'); }
    if (m.summon && alive().length < 4) { const ne = mkEnemy(m.summon, 'fight', Math.random); ne.hp = ne.max = Math.round(ne.max * 0.7); F.enemies.push(ne); pickIntent(ne); clog('Another ' + ne.n.toLowerCase() + ' arrives.', 'bad'); }
    // bleed on them, statuses wear off
    if (e.st.bleed > 0) { e.hp -= e.st.bleed; e.st.bleed--; }
    if (e.st.weak > 0) e.st.weak--; if (e.st.expose > 0) e.st.expose--;
    if (R.hp <= 0) break;
  }
  afterDamage();
  if (checkDeath() || F.won) { save(); render(); return; }
  startTurn(false);
  if (checkDeath()) { save(); render(); return; }
  save(); render();
}
function checkDeath() {
  const R = S.run; if (!R || R.view === 'end') return true; if (R.hp > 0) return false;
  if (has('candle') && !R.candle) { R.candle = true; R.hp = Math.round(R.maxhp * 0.3); clog('The candle flickers. You get back up.', 'good'); toast('🕯️ Vigil Candle: back on your feet', 'l'); return false; }
  R.hp = 0; SFX.play('lose'); R.fight = null; endRun('dead'); return true;
}
function flash(id) { setTimeout(() => { const el = document.getElementById(id); if (el) { el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); } }, 10); }
function setTarget(i) { const F = S.run.fight; if (F && F.enemies[i] && F.enemies[i].hp > 0) { F.target = i; render(); } }

/* ================= rewards ================= */
function cardPool(rare) {
  const ws = S.build.workshop || 0; const maxTier = 1 + ws;
  const pool = Object.entries(CARDS).filter(([k, v]) => v.tier >= 1 && v.tier <= maxTier).map(([k, v]) => ({ id: k, w: rare ? v.tier * v.tier : (v.tier === 1 ? 4 : 3 - Math.min(2, v.tier - 2)) }));
  return pool;
}
function cardChoice(n, rare) {
  const pool = cardPool(rare), out = [], up = runNight().upCards;
  let guard = 0;
  while (out.length < n && guard++ < 50) { const p = wpick(pool); if (out.some(c => c.id === p.id)) continue; out.push({ id: p.id, u: uid(), up: up || Math.random() < 0.08 }); }
  return out;
}
function charmChoice(n) {
  const R = S.run; const avail = Object.keys(CHARMS).filter(k => CHARMS[k].r !== 'gift' && !R.charms.includes(k));
  const W = { common: 6, uncommon: 4, rare: 2 };
  const out = []; let guard = 0;
  while (out.length < n && avail.length && guard++ < 50) { const p = wpick(avail.map(k => ({ k, w: W[CHARMS[k].r] || 1 }))).k; if (!out.includes(p)) out.push(p); }
  return out.length ? out : null;
}
function winFight() {
  const R = S.run, F = R.fight; if (!F) return;
  const reg = runRegion(), n = runNight(), m = lootMult();
  const lines = [];
  let sc = F.kind === 'boss' ? 40 + 20 * reg.lvl : F.kind === 'elite' ? rint(14, 20) : rint(5, 9) + (F.enemies.length - 1) * 3;
  sc = Math.round(sc * m); R.loot.scrap += sc; lines.push('⚙️ ' + sc + ' scrap');
  let wd = (n.wood || 0) + (F.kind === 'boss' ? 15 : F.kind === 'elite' ? rint(4, 6) : (Math.random() < 0.3 ? rint(1, 3) : 0));
  if (wd) { R.loot.wood += wd; lines.push('🪵 ' + wd + ' wood'); }
  const seedN = F.kind === 'boss' ? 3 : F.kind === 'elite' ? 1 : (has('pouch') || Math.random() < 0.3 ? 1 : 0);
  for (let i = 0; i < seedN; i++) { const s = F.kind === 'boss' && i === 0 ? pick(reg.seeds.filter(x => CROPS[x].r !== 'common').concat(reg.seeds.slice(-1))) : pick(reg.seeds); R.loot.seeds[s] = (R.loot.seeds[s] || 0) + 1; lines.push(CROPS[s].e + ' ' + CROPS[s].n + ' seed'); }
  let heal = (has('thermos') ? 3 : 0) + Math.round(mealFx('heal'));
  if (heal) { const was = R.hp; R.hp = Math.min(R.maxhp, R.hp + heal); if (R.hp > was) lines.push('❤️ healed ' + (R.hp - was)); }
  if (F.kind === 'elite') { R.elites++; bountyProg('elite', 1); }
  bountyProg('fights', 1);
  R.fight = null;
  if (F.kind === 'boss') { R.reward = { title: BOSSES[reg.boss].n + ' is down', lines, cards: null, charms: null, boss: true }; R.view = 'reward'; SFX.play('win'); save(); render(); return; }
  R.reward = { title: F.kind === 'elite' ? 'Elite down' : 'Fight won', lines, cards: cardChoice(3, F.kind === 'elite'), charms: F.kind === 'elite' ? charmChoice(n.eliteCharm ? 2 : 1) : null };
  R.view = 'reward'; SFX.play('coin'); save(); render();
}
function takeCard(i) { const R = S.run, rw = R.reward; if (!rw || !rw.cards) return; const c = rw.cards[i]; R.deck.push({ id: c.id, u: uid(), up: c.up }); rw.cards = null; toast('Added ' + cardName(c), 'z'); save(); render(); }
function skipCards() { S.run.reward.cards = null; save(); render(); }
function takeCharm(k) { const R = S.run; if (!R.reward || !R.reward.charms) return; R.charms.push(k); if (!R.loot.charms.includes(k)) R.loot.charms.push(k); R.reward.charms = null; toast(CHARMS[k].e + ' ' + CHARMS[k].n, 'l'); if (k === 'candle') { } save(); render(); }
function continueRun() {
  const R = S.run;
  if (R.reward && R.reward.boss) { R.reward = null; endRun('win'); return; }
  if (R.pendingFight) { const k = R.pendingFight; R.pendingFight = null; R.reward = null; R.evt = null; startFight(k, Math.random); save(); render(); return; }
  R.reward = null; R.evt = null; R.view = 'map'; save(); render();
}

/* ================= events / rest / shop ================= */
function haveScrap(n) { return S.run.loot.scrap + S.scrap >= n; }
function spendScrap(n) { const L = S.run.loot; const a = Math.min(L.scrap, n); L.scrap -= a; S.scrap -= (n - a); }
function eventChoice(i) {
  const R = S.run, E = EVENTS.find(e => e.id === R.evt.id), ch = E.ch[i]; if (!ch || R.evt.res) return;
  if (ch.need && ch.need.scrap && !haveScrap(ch.need.scrap)) { toast('You need ' + ch.need.scrap + ' scrap'); return; }
  let fx = ch.fx; if (fx.roll) { let v = Math.random(); for (const [p, o] of fx.roll) { v -= p; if (v <= 0) { fx = o; break; } } if (fx.roll) fx = fx.roll[fx.roll.length - 1][1]; }
  const lines = []; const reg = runRegion();
  if (fx.heal) { const was = R.hp; R.hp = Math.min(R.maxhp, R.hp + fx.heal); lines.push('❤️ +' + (R.hp - was) + ' HP'); }
  if (fx.dmg) { R.hp = Math.max(1, R.hp - fx.dmg); lines.push('💔 -' + fx.dmg + ' HP'); }
  if (fx.scrap > 0) { const v = Math.round(fx.scrap * lootMult()); R.loot.scrap += v; lines.push('⚙️ +' + v + ' scrap'); }
  if (fx.scrap < 0) { spendScrap(-fx.scrap); lines.push('⚙️ -' + (-fx.scrap) + ' scrap'); }
  if (fx.wood) { R.loot.wood += fx.wood; lines.push('🪵 +' + fx.wood + ' wood'); }
  if (fx.seeds) for (let k = 0; k < fx.seeds; k++) { const s = pick(reg.seeds); R.loot.seeds[s] = (R.loot.seeds[s] || 0) + 1; lines.push(CROPS[s].e + ' ' + CROPS[s].n + ' seed'); }
  if (fx.survivor) { const s = newSurvivor(); R.loot.surv.push(s); lines.push('🙋 ' + s.name + ' is coming home with you'); }
  if (fx.pet) { if (S.pets.length + R.loot.pets.length < 8) { R.loot.pets.push(fx.pet); lines.push(PETS[fx.pet].e + ' a new ' + PETS[fx.pet].n.toLowerCase() + '!'); } else lines.push('Your camp is full of pets. It wanders off happy.'); }
  R.evt.res = { txt: fx.txt || '', lines };
  R.reward = { title: E.n, lines, cards: fx.card ? cardChoice(3, !!fx.rare) : null, charms: fx.charm ? charmChoice(1) : null, txt: fx.txt };
  if (fx.fight) R.pendingFight = 'fight';
  if (fx.upgrade) R.pickMode = 'upgrade';
  if (fx.remove) R.pickMode = 'remove';
  R.view = 'reward'; SFX.play('ui'); save(); render();
}
function restAct(k) {
  const R = S.run; if (R.restDone) return; const n = runNight();
  if (k === 'heal') { const amt = Math.round(R.maxhp * 0.3 * (n.rest || 1) * (has('compass') ? 1.5 : 1)); const was = R.hp; R.hp = Math.min(R.maxhp, R.hp + amt); toast('❤️ +' + (R.hp - was), 'z'); R.restDone = true; }
  if (k === 'train') { R.pickMode = 'upgrade'; R.restDone = true; }
  if (k === 'clean') { R.deck = R.deck.filter(c => c.id !== 'wound'); R.hp = Math.min(R.maxhp, R.hp + 5); toast('Wounds cleaned', 'z'); R.restDone = true; }
  save(); render();
}
function makeShop(r) {
  const cheap = 1 - (runNight().cheap || 0);
  const cards = cardChoice(3, r() < 0.5).map(c => ({ ...c, price: Math.round((10 + CARDS[c.id].tier * 6 + (c.up ? 8 : 0)) * cheap) }));
  const ch = charmChoice(1);
  return { cards, charm: ch ? { k: ch[0], price: Math.round((CHARMS[ch[0]].r === 'rare' ? 55 : CHARMS[ch[0]].r === 'uncommon' ? 42 : 32) * cheap) } : null, remove: Math.round(18 * cheap), heal: Math.round(10 * cheap), removed: false, healed: false };
}
function shopBuy(kind, i) {
  const R = S.run, sh = R.shop;
  if (kind === 'card') { const c = sh.cards[i]; if (!c || c.sold) return; if (!haveScrap(c.price)) { toast('Not enough scrap'); return; } spendScrap(c.price); c.sold = true; R.deck.push({ id: c.id, u: uid(), up: c.up }); toast('Bought ' + cardName(c), 'z'); }
  if (kind === 'charm') { const c = sh.charm; if (!c || c.sold) return; if (!haveScrap(c.price)) { toast('Not enough scrap'); return; } spendScrap(c.price); c.sold = true; R.charms.push(c.k); if (!R.loot.charms.includes(c.k)) R.loot.charms.push(c.k); toast(CHARMS[c.k].e + ' ' + CHARMS[c.k].n, 'l'); }
  if (kind === 'remove') { if (sh.removed) return; if (!haveScrap(sh.remove)) { toast('Not enough scrap'); return; } spendScrap(sh.remove); sh.removed = true; R.pickMode = 'remove'; }
  if (kind === 'heal') { if (sh.healed) return; if (!haveScrap(sh.heal)) { toast('Not enough scrap'); return; } spendScrap(sh.heal); sh.healed = true; R.hp = Math.min(R.maxhp, R.hp + 12); }
  SFX.play('coin'); save(); render();
}
function pickCard(u) {
  const R = S.run; const c = R.deck.find(x => x.u === u); if (!c) return;
  if (R.pickMode === 'upgrade') { if (c.up || !CARDS[c.id].up) { toast('Can\'t upgrade that one'); return; } c.up = true; toast('Upgraded ' + cardName(c), 'z'); }
  if (R.pickMode === 'remove') { R.deck = R.deck.filter(x => x.u !== u); toast('Removed ' + CARDS[c.id].n, 'z'); }
  R.pickMode = null; save(); render();
}

/* ================= run UI ================= */
function cardHTML(c, i, opts = {}) {
  const D = CARDS[c.id]; const F = S.run && S.run.fight; const cant = opts.hand && F && (D.t === 'curse' || D.c > F.energy);
  return `<button class="cc t-${D.t} ${c.up ? 'up' : ''} ${cant ? 'cant' : ''}" ${opts.click ? `onclick="${opts.click}"` : ''}><span class="cost">${D.t === 'curse' ? '✕' : D.c}</span><b>${cardName(c)}</b><small>${cardDesc(c)}</small>${opts.price ? `<em>${opts.price} ⚙️</em>` : ''}</button>`;
}
function stHTML(st) {
  const b = []; if (st.str) b.push(`<span class="st str" title="Strength: +${st.str} damage">💪${st.str}</span>`);
  if (st.weak) b.push(`<span class="st weak" title="Weak: deals 25% less for ${st.weak} turns">🌀${st.weak}</span>`);
  if (st.expose) b.push(`<span class="st exp" title="Exposed: takes 50% more for ${st.expose} turns">🎯${st.expose}</span>`);
  if (st.bleed) b.push(`<span class="st bleed" title="Bleeding: loses ${st.bleed} HP a turn">🩸${st.bleed}</span>`);
  if (st.plate) b.push(`<span class="st plate" title="Gains ${st.plate} block every turn">🧱${st.plate}</span>`);
  if (st.thorns) b.push(`<span class="st thorns" title="Deals ${st.thorns} back when hit">🌵${st.thorns}</span>`);
  return b.join('');
}
function intentHTML(e) {
  if (runNight().id === 'fog' && !e.acted) return '<span class="intent">❓</span>';
  const m = e.intent || {}; const F = S.run.fight; const out = [];
  if (m.a) { let v = m.a + e.dmgAdd + e.st.str; if (e.st.weak > 0) v = Math.floor(v * 0.75); if (F.st.expose > 0) v = Math.floor(v * 1.5); out.push('⚔️' + v + (m.hits > 1 ? '×' + m.hits : '')); }
  if (m.b) out.push('🛡️' + m.b);
  if (m.str || m.shout) out.push('💪');
  if (m.weak || m.expose || m.bleed) out.push('🌀');
  if (m.wound) out.push('🦷');
  if (m.heal) out.push('✚' + m.heal);
  if (m.summon) out.push('📯');
  return `<span class="intent" title="${esc(m.n || '')}">${out.join(' ')}</span>`;
}
function enemySVG(e) {
  if (e.kind === 'boss') return ART.bossSVG(BOSSES[e.key].boss, 86);
  const map = { shambler: 'walker', hollow: 'stalker', matron: 'screamer', butcher: 'boss', cellar: 'crawler', brute: 'bloater' };
  const z = ENEMIES[e.key].z; return ART.zombieSVG(map[e.key] || map[z] || z, e.kind === 'elite' ? 84 : 66);
}
function runHeader() {
  const R = S.run, reg = runRegion(), n = runNight();
  return `<div class="runhead" style="--rc:${reg.color}"><div><b>${reg.e} ${reg.n}</b><small>${n.e} ${n.n}${R.heat ? ' · 🌡️' + R.heat : ''} · floor ${Math.max(1, R.floor + 1)}/${FLOORS}</small></div>
    <div class="rhp">❤️ ${R.hp}/${R.maxhp}${bar(R.hp, R.maxhp, 'hp')}</div>
    <div class="rloot">⚙️${R.loot.scrap} 🪵${R.loot.wood}</div></div>
    <div class="rcharms">${R.charms.map(k => `<span title="${esc(CHARMS[k].n + ': ' + CHARMS[k].d)}" onclick="toast('${esc(CHARMS[k].n)}: ${esc(CHARMS[k].d).replace(/'/g, '')}')">${CHARMS[k].e}</span>`).join('')}${R.meal ? `<span title="${esc(MEALS[R.meal].d)}" onclick="toast('${esc(MEALS[R.meal].n)}: ${esc(MEALS[R.meal].d)}')">${MEALS[R.meal].e}</span>` : ''}<button class="linkish" onclick="showDeck()">🂠 ${R.deck.length} cards</button></div>`;
}
function showDeck() { const R = S.run; openSheet(`<h2>Your deck</h2><div class="cards">` + R.deck.slice().sort((a, b) => a.id.localeCompare(b.id)).map(c => cardHTML(c)).join('') + `</div>`, true); }
function renderRun() {
  const R = S.run; let h = runHeader();
  if (R.pickMode) {
    const list = R.deck.filter(c => R.pickMode === 'remove' || (!c.up && CARDS[c.id].up));
    return h + `<div class="card"><h2>${R.pickMode === 'upgrade' ? 'Upgrade a card' : 'Remove a card'}</h2><div class="cards">` + list.map(c => cardHTML(c, 0, { click: `pickCard('${c.u}')` })).join('') + `</div><button class="btn ghost" onclick="S.run.pickMode=null;save();render()">Skip</button></div>`;
  }
  if (R.view === 'map') return h + renderMap();
  if (R.view === 'fight') return h + renderFight();
  if (R.view === 'reward') return h + renderReward();
  if (R.view === 'event') return h + renderEvent();
  if (R.view === 'rest') return h + renderRest();
  if (R.view === 'shop') return h + renderShop();
  if (R.view === 'end') return renderEnd();
  return h;
}
function renderMap() {
  const R = S.run; let h = `<div class="map">`;
  for (let f = FLOORS - 1; f >= 0; f--) {
    h += `<div class="mrow ${f === R.floor + 1 ? 'next' : ''}">`;
    const row = R.map[f];
    for (const node of row) {
      const can = reachable(f, node.l), here = f === R.floor && node.l === R.lane;
      const [e, nm] = NODE[node.t];
      h += `<button class="mnode t-${node.t} ${can ? 'can' : ''} ${node.done ? 'done' : ''} ${here ? 'here' : ''}" ${can ? `onclick="enterNode(${f},${node.l})"` : 'disabled'}><span>${node.done && !here ? '·' : e}</span><small>${nm}</small></button>`;
    }
    h += `</div>`;
  }
  h += `</div><p class="help center">Pick the next stop. You can move one lane left or right each floor.</p>`;
  return h;
}
function renderFight() {
  const R = S.run, F = R.fight;
  let h = `<div class="arena"><div class="foes">` + F.enemies.map((e, i) => e.hp <= 0 ? '' : `<button class="foe ${i === F.target && alive().length > 1 ? 'tgt' : ''} k-${e.kind}" id="e${e.u}" onclick="setTarget(${i})">${intentHTML(e)}<div class="fsvg">${enemySVG(e)}</div><b>${esc(e.n)}</b>${bar(e.hp, e.max, 'hp')}<small>${e.hp}/${e.max}${e.block ? ' · 🛡️' + e.block : ''}</small><div class="sts">${stHTML(e.st)}</div></button>`).join('') + `</div>`;
  const pet = activePet();
  h += `<div class="me" id="me"><div class="mesvg">${ART.avatarSVG(S.av, 56)}${pet ? `<span class="mepet">${petSVG(pet, 34)}</span>` : ''}</div><div style="flex:1">${bar(R.hp, R.maxhp, 'hp')}<small>❤️ ${R.hp}/${R.maxhp}${F.block ? ' · 🛡️ ' + F.block : ''}${F.dog ? ' · 🐕 ' + F.dog : ''}</small><div class="sts">${stHTML(F.st)}</div></div><div class="energy">${'<i class="on"></i>'.repeat(Math.max(0, F.energy))}<span>${F.energy}</span></div></div>`;
  h += `<div class="hand">` + F.hand.map((c, i) => cardHTML(c, i, { hand: true, click: `playCard(${i})` })).join('') + `</div>`;
  h += `<div class="row fightbar"><span class="sub">draw ${F.draw.length} · discard ${F.disc.length}</span><button class="btn r" onclick="endTurn()">End turn</button></div>`;
  h += `<div class="clog">${F.log.slice(0, 4).map(l => `<p class="${l.c || ''}">${esc(l.m)}</p>`).join('')}</div></div>`;
  return h;
}
function renderReward() {
  const R = S.run, rw = R.reward; if (!rw) { R.view = 'map'; return renderMap(); }
  let h = `<div class="card reward"><h2>${esc(rw.title)}</h2>${rw.txt ? `<p>${esc(rw.txt)}</p>` : ''}${rw.lines.length ? `<div class="chips">${rw.lines.map(l => `<span class="chip">${esc(l)}</span>`).join('')}</div>` : ''}`;
  if (rw.charms) h += `<h3>Take a charm</h3><div class="stack">` + rw.charms.map(k => `<button class="pickrow" onclick="takeCharm('${k}')"><span class="pe">${CHARMS[k].e}</span><span style="flex:1"><b>${CHARMS[k].n}</b> <span class="chip r-${CHARMS[k].r === 'common' ? 'common' : CHARMS[k].r === 'uncommon' ? 'uncommon' : 'rare'}">${CHARMS[k].r}</span><small>${CHARMS[k].d}</small></span></button>`).join('') + `</div>`;
  if (rw.cards) h += `<h3>Add a card to your deck</h3><div class="cards">` + rw.cards.map((c, i) => cardHTML(c, i, { click: `takeCard(${i})` })).join('') + `</div><button class="btn ghost sm" onclick="skipCards()">Skip</button>`;
  if (!rw.cards && !rw.charms) h += `<button class="btn r wide" onclick="continueRun()">${rw.boss ? 'Head home victorious' : R.pendingFight ? 'Fight!' : 'Continue'}</button>`;
  return h + `</div>`;
}
function renderEvent() {
  const R = S.run, E = EVENTS.find(e => e.id === R.evt.id);
  const odds = fx => fx.roll ? ' <small class="sub">(' + fx.roll.map(([p, o]) => Math.round(p * 100) + '%: ' + (o.heal ? '+' + o.heal + ' HP' : o.dmg ? '-' + o.dmg + ' HP' : o.card ? 'a card' : o.charm ? 'a charm' : o.scrap ? o.scrap + ' scrap' : '?')).join(', ') + ')</small>' : '';
  return `<div class="card event"><div class="evbig">${E.e}</div><h2>${esc(E.n)}</h2><p>${esc(E.d)}</p><div class="stack">` + E.ch.map((c, i) => { const ok = !(c.need && c.need.scrap && !haveScrap(c.need.scrap)); return `<button class="pickrow ${ok ? '' : 'locked'}" onclick="eventChoice(${i})"><span style="flex:1"><b>${esc(c.t)}</b>${has('compass') ? odds(c.fx) : ''}</span></button>`; }).join('') + `</div></div>`;
}
function renderRest() {
  const R = S.run, n = runNight(); const amt = Math.round(R.maxhp * 0.3 * (n.rest || 1) * (has('compass') ? 1.5 : 1)); const wounds = R.deck.filter(c => c.id === 'wound').length;
  return `<div class="card rest"><div class="evbig">🔥</div><h2>A safe place to rest</h2><p>A locked church basement. A fire you can risk for an hour.</p>${R.restDone ? '<p class="help">You rested.</p>' : `<div class="stack">
    <button class="pickrow" onclick="restAct('heal')"><span class="pe">❤️</span><span style="flex:1"><b>Sleep</b><small>Heal ${amt} HP</small></span></button>
    <button class="pickrow" onclick="restAct('train')"><span class="pe">🔧</span><span style="flex:1"><b>Sharpen up</b><small>Upgrade a card</small></span></button>
    ${wounds ? `<button class="pickrow" onclick="restAct('clean')"><span class="pe">🩹</span><span style="flex:1"><b>Clean your wounds</b><small>Remove ${plural(wounds, 'Bite Wound')} and heal 5</small></span></button>` : ''}</div>`}
    <div class="row" style="margin-top:12px">${R.restDone ? `<button class="btn r" onclick="continueRun()">Keep going</button>` : ''}<button class="btn ghost" onclick="headHome()">Head home with your loot</button></div>
    <p class="help">Going home now keeps everything. The boss waits at floor ${FLOORS}.</p></div>`;
}
function renderShop() {
  const R = S.run, sh = R.shop;
  return `<div class="card shop"><div class="evbig">🧳</div><h2>Trader</h2><p class="help">You have ${R.loot.scrap} scrap from tonight${S.scrap ? ' and ' + S.scrap + ' back home (runs out last)' : ''}.</p>
    <div class="cards">` + sh.cards.map((c, i) => c.sold ? '' : cardHTML(c, i, { price: c.price, click: `shopBuy('card',${i})` })).join('') + `</div>
    <div class="stack">${sh.charm && !sh.charm.sold ? `<button class="pickrow" onclick="shopBuy('charm')"><span class="pe">${CHARMS[sh.charm.k].e}</span><span style="flex:1"><b>${CHARMS[sh.charm.k].n}</b><small>${CHARMS[sh.charm.k].d}</small></span><span class="sub">${sh.charm.price} ⚙️</span></button>` : ''}
    ${!sh.removed ? `<button class="pickrow" onclick="shopBuy('remove')"><span class="pe">✂️</span><span style="flex:1"><b>Lighten your pack</b><small>Remove a card</small></span><span class="sub">${sh.remove} ⚙️</span></button>` : ''}
    ${!sh.healed ? `<button class="pickrow" onclick="shopBuy('heal')"><span class="pe">🩹</span><span style="flex:1"><b>First aid kit</b><small>Heal 12</small></span><span class="sub">${sh.heal} ⚙️</span></button>` : ''}</div>
    <button class="btn r wide" style="margin-top:10px" onclick="continueRun()">Leave</button></div>`;
}
function renderEnd() {
  const R = S.run, s = R.summary, reg = runRegion();
  const t = s.kind === 'win' ? '👑 Victory' : s.kind === 'home' ? '🏡 Made it home' : '💀 You fell';
  const sub = s.kind === 'win' ? BOSSES[reg.boss].n + ' will not trouble ' + reg.n + ' again. For a while.' : s.kind === 'home' ? 'Smart. Everything you found is in the barn.' : 'Hattie found you at the treeline and dragged you home. You kept half of what you carried.';
  const seeds = Object.entries(s.got.seeds).map(([k, v]) => CROPS[k].e + v).join(' ');
  return `<div class="card endcard ${s.kind}"><h1>${t}</h1><p>${sub}</p>
    <div class="chips"><span class="chip">⚙️ ${s.got.scrap}</span><span class="chip">🪵 ${s.got.wood}</span>${seeds ? `<span class="chip">${seeds}</span>` : ''}<span class="chip">+${s.xp} XP</span><span class="chip">${R.kills} kills</span></div>
    ${s.people.length ? `<p>🙋 ${s.people.map(esc).join(', ')} came home with you.</p>` : ''}
    ${s.pets.length ? `<p>🐾 ${s.pets.map(esc).join(', ')} followed you home.</p>` : ''}
    ${s.newKeeps.length ? `<p>🎒 New keepsakes: ${s.newKeeps.map(k => CHARMS[k].e + ' ' + CHARMS[k].n).join(', ')}. You can bring one on any run now.</p>` : ''}
    ${s.unlocked ? `<p class="unlock">🗺️ <b>${esc(s.unlocked)}</b> is open.</p>` : ''}
    ${s.kind === 'win' && heatMax(reg.id) > R.heat ? `<p class="help">🌡️ Heat ${R.heat + 1} unlocked for ${reg.n}.</p>` : ''}
    <button class="btn r wide" onclick="closeRun()">Back to camp</button></div>`;
}
