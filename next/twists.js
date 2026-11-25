/* Dead Miles (next) 0.73 - HOUSE TWISTS (owner: "looking at this from a perspective of a gamer ... how can I make this
   better and not repetitive?" -> "build everything you stated": every house is a little different).
   About 1 in 3 houses your steps scout gets one twist, picked from the house seed when it is scouted (game.js addHouse ->
   DM.Twist.tag), shown on its house card before you go in:
   - 🔦 No power: dark inside, you only see what your flashlight lights up. Better finds in the dark.
   - 🧟 Infested: five more zombies inside, and more loot in most furniture.
   - 😢 Someone crying: a survivor is hiding in there. Find them within 3 minutes or the crying stops.
   - 🔥 On fire: smoke and heat. 2:30 before the roof comes down (you are pulled out with what you carry). Loot is rich.
   - 💣 Booby-trapped safe: one container holds a jackpot and a tripwire (25 damage and a loud bang; a Thief disarms it).
   - ☠️ A named zombie: somebody who used to live here, tougher than the rest. Put them down for a trophy.
   Never on named houses, quests, daily, tutorial or landmark houses. Timers count in-game seconds and ride on the house
   (h.tw), so closing the app mid-run picks up where it left off. */
'use strict';
window.DM = window.DM || {};
(() => {
  const TW = DM.Twist = {};
  const D = DM.D, G = () => DM.Game, SV = () => DM.Game && DM.Game.data();
  const toast = (m, s) => DM.E && DM.E.toast && DM.E.toast(m, s || 2.6);
  const sfx = k => { try { DM.E.SFX.play(k); } catch (e) { /* ignore */ } };
  const RATE = 1 / 3, FIRE_S = 150, CRY_S = 180;
  const pickOf = (a, r) => a[Math.floor(r() * a.length)];
  const NAMES = ['Big Earl', 'Mrs. Henderson', 'The Mailman', 'Coach Dwyer', 'Officer Pratt', 'Grandpa Lou', 'The Bride', 'Tiny', 'Uncle Sal', 'Nurse Joy', 'Pizza Guy', 'Mr. Kowalski'];
  const KINDS = {
    dark: { n: 'No power', g: '🔦', c: '#9d90bf', d: 'The lights are out. You only see what your flashlight hits - but nobody has picked this place over in the dark.',
      each: r => r() < .3 ? [pickOf(['battery', 'battery', 'ammo', 'meds', 'lockpick', 'tape', 'bandage'], r)] : [], jack: r => [D.pickBP(r), 'battery'] },
    infested: { n: 'Infested', g: '🧟', c: '#93a86c', z: 5, d: 'Something drew every dead thing on the block in here. Twice the zombies, twice the stuff they were guarding.',
      each: r => r() < .45 ? [pickOf(['ammo', 'scrap', 'bandage', 'tape', 'battery', 'cloth', 'shells', 'nails'], r)] : [], jack: r => [pickOf(['machete', 'axe', 'pistol', 'shotgun', 'crowbar'], r)] },
    survivor: { n: 'Someone crying inside', g: '😢', c: '#5fb3d9', d: 'You can hear someone crying in there. Find them before they go quiet - you have 3 minutes.' },
    fire: { n: 'On fire', g: '🔥', c: '#f07b3c', d: 'Smoke is pouring out of the windows. 2:30 before the roof comes down - grab what you can.',
      each: r => r() < .55 ? [pickOf(['ammo', 'meds', 'battery', 'tape', 'jewelry', 'watch', 'scrap', 'lockpick'], r)] : [], jack: r => [pickOf(['jewelry', 'watch'], r), D.pickBP(r)] },
    trap: { n: 'Booby-trapped safe', g: '💣', c: '#e0b94a', d: 'Somebody rigged their stash. One container in here holds a jackpot - and a tripwire.',
      jack: r => [D.pickBP(r), pickOf(['katana', 'crossbow', 'shotgun', 'pistol', 'axe'], r), 'jewelry', pickOf(['cache5', 'antibio', 'armor_sport'], r)] },
    named: { n: 'A named zombie', g: '☠️', c: '#ff8a7a', d: 'Whoever used to live here is still home - and tougher than the rest. Put them down for a trophy.' },
  };
  TW.KINDS = KINDS;
  // ---------------------------------------------------------------- the trophy
  D.ITEMS.ztrophy = { n: 'Zombie trophy', i: 'ztrophy', tag: 'proof you put down a named one · Dot pays well' };
  D.VALUE.ztrophy = 45;
  if (typeof ART !== 'undefined' && ART.addIcons) ART.addIcons({ ztrophy: `<path d="M-14,-22 h28 v10 a14,14 0 0 1 -28,0 z" fill="#e0b94a" stroke="#11142f" stroke-width="2.6"/>
    <path d="M-14,-18 h-7 a6,6 0 0 0 7,10 M14,-18 h7 a6,6 0 0 1 -7,10" fill="none" stroke="#11142f" stroke-width="2.4"/><rect x="-4" y="1" width="8" height="10" fill="#c99a32" stroke="#11142f" stroke-width="2"/>
    <rect x="-13" y="11" width="26" height="8" rx="2" fill="#8a5a36" stroke="#11142f" stroke-width="2.4"/><circle cx="-4" cy="-13" r="2.2" fill="#11142f"/><circle cx="4" cy="-13" r="2.2" fill="#11142f"/><path d="M-4,-7 h8" stroke="#11142f" stroke-width="2"/>` });

  // ---------------------------------------------------------------- scouting
  TW.tag = function (h) {
    if (!h || h.twist || h.named || h.type === 'tutorial' || h.quest || h.daily || h.landmark || h.npcq) return h;
    const r = D.mulberry32((h.seed ^ 0x7a157c0d) >>> 0);
    if (r() >= RATE) return h;
    h.twist = pickOf(Object.keys(KINDS), r);
    if (h.twist === 'named') h.twName = pickOf(NAMES, r);
    return h;
  };
  TW.title = h => h && KINDS[h.twist] ? (h.twist === 'named' ? `${h.twName} lives here` : KINDS[h.twist].n) : null;
  TW.tagHTML = h => { const K = KINDS[h.twist]; return K ? `<b class="twtag" style="--tc:${K.c}">${K.g} ${TW.title(h)}</b>` : ''; };
  TW.intro = h => { const K = KINDS[h.twist]; return K ? `${K.g} ${TW.title(h)}: ${K.d}` : ''; };
  // the crew never goes into a burning house or one with a named zombie; the rest they can search as usual
  TW.noCrew = h => h && (h.twist === 'fire' || h.twist === 'named' || h.twist === 'survivor');

  // ---------------------------------------------------------------- before the run: extras into the furniture
  TW.prepRun = function (h, L) {
    const K = KINDS[h.twist]; if (!K) return L.furn;
    L.namedZ = K.z || 0;
    if (L._twist === h.id + ':' + h.twist) return L.furn;
    const r = D.mulberry32((h.seed ^ 0x51a7e) >>> 0);
    const furn = L.furn.map(f => Object.assign({}, f)), cs = furn.filter(f => f.loot && f.lootable !== false && !f.secretLoot && D.LOOT[f.loot]);
    if (K.each) for (const f of cs) { const x = K.each(r).filter(k => D.ITEMS[k]); if (x.length) { f.extra = (f.extra || []).concat(x); f.noEmpty = 1; } }
    if (K.jack && cs.length) { const f = cs[Math.floor(r() * cs.length)]; f.extra = (f.extra || []).concat(K.jack(r).filter(k => D.ITEMS[k])); f.noEmpty = 1; if (h.twist === 'trap') f.trap = 1; }
    L._twist = h.id + ':' + h.twist;
    return furn;
  };
  // the survivor twist always has someone hiding (crew.js C.forHouse)
  TW.hide = function (h, L) {
    if (h.twist !== 'survivor' || !DM.Crew) return null;
    const f0 = DM.Crew.forceNpc; DM.Crew.forceNpc = true;
    try { return DM.Crew.forHouse(h, L); } finally { DM.Crew.forceNpc = f0; }
  };

  // ---------------------------------------------------------------- during the run
  TW.wrap = function (h, o) {
    const K = KINDS[h.twist]; if (!K) return o;
    const st = h.tw = h.tw || {};
    if (h.twist === 'fire' && st.left == null) st.left = FIRE_S;
    if (h.twist === 'survivor' && st.left == null) st.left = CRY_S;
    let warned = 0, named = null, saveT = 0;
    const O = Object.assign({}, o);
    const H = () => DM.House;
    O.hint = `${K.g} ${TW.title(h)} · ${o.hint || ''}`;
    O.tick = (dt, g) => {
      if (o.tick) o.tick(dt, g);
      if (!g || g.over || g.paused) return;
      saveT += dt;
      if (h.twist === 'fire' && st.left > 0 && g.entered) {   // the clock starts once she is through the door
        st.left -= dt;
        if (Math.random() < dt * 3) H().puff && H().puff(g.p.x + (Math.random() - .5) * 400, g.p.y - 40 - Math.random() * 120, 10, 3, '#5a4a5a', 25, 1.4, 6, -20);
        if (st.left <= 60 && warned < 1) { warned = 1; H().banner('ONE MINUTE', 'the ceiling is cracking'); sfx('break'); }
        if (st.left <= 20 && warned < 2) { warned = 2; H().banner('GET OUT', '20 seconds'); }
        if (st.left <= 0) { st.left = 0; toast('🔥 The roof came down - you got out with what you were carrying.', 3.4); sfx('break'); setTimeout(() => H().exit('leave'), 0); return; }
      }
      if (h.twist === 'survivor' && st.left > 0 && g.entered) {
        const found = DM.Crew && DM.Crew.npcFound && DM.Crew.npcFound();
        if (found) { st.left = 0; st.saved = 1; }
        else {
          st.left -= dt;
          if (st.left <= 60 && warned < 1) { warned = 1; toast('😢 The crying is getting weaker...', 2.4); }
          if (st.left <= 0) { st.left = 0; if (DM.Crew && DM.Crew.npcLost) DM.Crew.npcLost(); toast('The crying stopped. Whoever it was is gone.', 3); }
        }
      }
      if (h.twist === 'trap') for (const f of g.furn) if (f.trap && f.searched && !st.sprung) {
        st.sprung = 1;
        const S = SV() && SV().survivor;
        if (S && S.job === 'thief') { H().banner('TRIPWIRE', 'you spotted it and cut it'); toast('💣 You found the tripwire and cut it. The stash is yours.', 2.6); }
        else { H().banner('BOOM', 'a tripwire'); sfx('break'); H().hurtPlayer(25, 0, 1, null); H().noise(f.x + f.w / 2, f.y + f.h / 2, 12, true); toast('💣 Tripwire! The whole street heard that. The stash is yours - if you get out.', 3); }
      }
      if (h.twist === 'named' && !st.killed) {
        if (!named) named = g.zs.find(z => z.twNamed) || spawnNamed(g);
        if (named && named.dead) {
          st.killed = 1; g.drops.push({ k: 'ztrophy', n: 1, x: named.x, y: named.y, t: .5 });
          H().banner(h.twName.toUpperCase(), 'put down for good');
          if (DM.Skills && DM.Skills.addXP) DM.Skills.addXP(60);
          if (DM.Journal) DM.Journal.note(`Put down ${h.twName} at ${h.address}.`);
          toast(`☠️ ${h.twName} is down. They dropped a trophy - pick it up. +60 XP`, 3);
        }
      }
      if (saveT > 2) { saveT = 0; G().save(); }
    };
    O.drawOver = (c, g) => {
      if (o.drawOver) o.drawOver(c, g);
      if (!g) return;
      const p = g.p;
      if (h.twist === 'dark') {   // a flashlight cone of light around her, everything else black
        const gr = c.createRadialGradient(p.x, p.y - 20, 50, p.x, p.y - 20, 230);
        gr.addColorStop(0, 'rgba(6,5,16,0)'); gr.addColorStop(.55, 'rgba(6,5,16,.55)'); gr.addColorStop(1, 'rgba(6,5,16,.94)');
        c.fillStyle = gr; c.fillRect(p.x - 3000, p.y - 3000, 6000, 6000);
      }
      if (h.twist === 'fire' && st.left > 0) {
        const k = 1 - st.left / FIRE_S;
        c.fillStyle = `rgba(240,110,40,${.1 + .22 * k + .05 * Math.sin(g.t * 6)})`; c.fillRect(p.x - 3000, p.y - 3000, 6000, 6000);
      }
      if ((h.twist === 'fire' || h.twist === 'survivor') && st.left > 0) {   // the countdown floats over her head
        const t = `${K.g} ${Math.floor(st.left / 60)}:${String(Math.floor(st.left % 60)).padStart(2, '0')}`, low = st.left <= 30;
        c.save(); c.font = '900 16px system-ui,sans-serif'; c.textAlign = 'center'; c.lineWidth = 5; c.strokeStyle = '#11142f'; c.fillStyle = low && Math.sin(g.t * 10) > 0 ? '#ff6b5a' : '#f6e3bb';
        c.strokeText(t, p.x, p.y - 104); c.fillText(t, p.x, p.y - 104); c.restore();
      }
      if (h.twist === 'named' && named && !named.dead) {
        c.save(); c.font = '900 13px system-ui,sans-serif'; c.textAlign = 'center'; c.lineWidth = 4; c.strokeStyle = '#11142f'; c.fillStyle = '#ff8a7a';
        c.strokeText(h.twName, named.x, named.y - 98); c.fillText(h.twName, named.x, named.y - 98); c.restore();
      }
    };
    const ex = o.onExit; O.onExit = res => { if (ex) ex(res); };
    return O;
    function spawnNamed(g) {
      const pool = g.zs.filter(z => !z.dead && !z.raider && !z.boss && !z.special);
      const o0 = pool.length ? pool[Math.floor(Math.random() * pool.length)] : null; if (!o0) return null;
      const z = H().spawn(o0.x + 20, o0.y, { st: 'idle', twNamed: 1, boss: 1 });
      z.hp = z.maxHp = Math.round((o0.maxHp || 100) * 5); z.dmgMul = 1.6; z.kind = o0.kind;
      return z;
    }
  };
  const css = document.createElement('style'); css.textContent = `.twtag { color: var(--tc, #e0b94a); font-weight: 900; }`;
  document.head.appendChild(css);
})();
