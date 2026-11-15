/* Dead Miles (next) 0.35 - the Codex: a zombie bestiary + achievements with titles (owner: "i love all the ideas").
   Bestiary: every kind of zombie you kill is counted. 10 / 50 / 200 kills of a kind = +5 / +10 / +15% damage against
   it (house.js hitZombie asks DM.Codex.dmgVs). Kinds you have never killed show as ???.
   Achievements: goals across the whole game; each pays caps once and unlocks a title you can show under your name
   (picked in Walks > Your title, alongside the walking titles).
   Save: SV.codex = { kills: { kind: n }, wk: { weapon: n }, flags: { name: n }, got: { id: time } }. */
'use strict';
window.DM = window.DM || {};
(() => {
  const C = DM.Codex = {};
  const G = () => DM.Game, SV = () => DM.Game && DM.Game.data();
  const toast = (m, s) => DM.E && DM.E.toast && DM.E.toast(m, s || 2.6);
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = n => Math.round(n).toLocaleString('en-US');
  function st() { const v = SV(); if (!v) return null; v.codex = v.codex || {}; const c = v.codex; c.kills = c.kills || {}; c.wk = c.wk || {}; c.flags = c.flags || {}; c.got = c.got || {}; return c; }
  C.st = st;

  // ---------------------------------------------------------------- bestiary
  const BEASTS = [
    { k: 'walker', n: 'Walker', g: '🧟', d: 'The everyday dead. Slow, loud, and never alone for long.' },
    { k: 'runner', n: 'Runner', g: '🏃', d: 'Fast and fragile. It sprints the moment it sees you.' },
    { k: 'bloater', n: 'Bloater', g: '🤢', d: 'Bursts into a toxic cloud when it dies. Kill it from range or dodge out.' },
    { k: 'screamer', n: 'Screamer', g: '😱', d: 'If it sees you it shrieks and the whole house comes running. Kill it first.' },
    { k: 'armored', n: 'Armored', g: '🛡️', d: 'Riot gear soaks up melee hits until it cracks. Arrows and bullets find the gaps.' },
    { k: 'turkey', n: 'Zombie turkey', g: '🦃', d: 'A Thanksgiving horror. Darts, pecks, and does not flinch mid-peck.', ev: 1 },
    { k: 'krampus', n: 'Krampus walker', g: '🎅', d: 'A big one in a Santa hat. Hits hard and barely budges.', ev: 1 },
  ];
  const TIERS = [10, 50, 200], BONUS = [0, .05, .10, .15];
  const kindOf = z => z.kind && BEASTS.some(b => b.k === z.kind) ? z.kind : z.kind ? null : 'walker';
  C.tier = k => { const n = (st() || { kills: {} }).kills[k] || 0; return TIERS.filter(t => n >= t).length; };
  C.dmgVs = z => { const k = kindOf(z); return k ? 1 + BONUS[C.tier(k)] : 1; };

  // ---------------------------------------------------------------- achievements
  const S = () => SV(), stats = () => (S().stats || {}), cosOwned = () => Object.keys((S().survivor.wardrobe || {}).own || {}).length;
  const built = () => { const b = S().base && S().base.built; return b ? Object.values(b).reduce((a, n) => a + (+n || 0), 0) : 0; };
  const ACH = [
    { id: 'blood', t: 'Fresh Meat', d: 'Kill your first zombie.', v: () => stats().kills, need: 1, caps: 10 },
    { id: 'slayer', t: 'Slayer', d: 'Kill 250 zombies.', v: () => stats().kills, need: 250, caps: 60 },
    { id: 'reaper', t: 'Grim Reaper', d: 'Kill 1,000 zombies.', v: () => stats().kills, need: 1000, caps: 150 },
    { id: 'looter', t: 'Looter', d: 'Go into 25 houses yourself.', v: () => stats().runs, need: 25, caps: 50 },
    { id: 'snoop', t: 'Snoop', d: 'Find 10 secret spots.', v: () => stats().secrets, need: 10, caps: 50 },
    { id: 'zoo', t: 'Zoologist', d: 'Reach bestiary tier 1 (10 kills) on all 5 everyday kinds.', v: () => BEASTS.filter(b => !b.ev && C.tier(b.k) >= 1).length, need: 5, caps: 80 },
    { id: 'bonk', t: 'Bonk Master', d: 'Kill 25 zombies with a frying pan.', v: () => st().wk.pan || 0, need: 25, caps: 40 },
    { id: 'squeak', t: 'Squeak Squad', d: 'Kill 25 zombies with the squeaky turkey.', v: () => st().wk.turkeysq || 0, need: 25, caps: 40 },
    { id: 'guns', t: 'Gunslinger', d: 'Kill 50 zombies with guns.', v: () => (st().wk.pistol || 0) + (st().wk.shotgun || 0) + (st().wk.nailgun || 0), need: 50, caps: 60 },
    { id: 'gate', t: 'Gatekeeper', d: 'Win 3 base raids.', v: () => st().flags.raids || 0, need: 3, caps: 60 },
    { id: 'samaritan', t: 'Good Samaritan', d: 'Finish 5 map quests.', v: () => (DM.MapQ && DM.MapQ._st ? DM.MapQ._st().total : 0) || 0, need: 5, caps: 60 },
    { id: 'coast', t: 'Signal Keeper', d: 'Finish the 3-day story "The Coast Signal" (map quests).', v: () => ((DM.MapQ && DM.MapQ._st().story) || {}).coast || 0, need: 3, caps: 80 },
    { id: 'courier', t: 'Courier\'s Friend', d: 'Finish the legendary Courier\'s long delivery.', v: () => (DM.MapQ && DM.MapQ._st().legDone) || 0, need: 1, caps: 80 },
    { id: 'cat', t: 'Cat Whisperer', d: 'Share a snack with the bodega cat (map encounter).', v: () => st().flags.cat || 0, need: 1, caps: 20 },
    { id: 'drip', t: 'Fashionista', d: 'Own 15 cosmetics.', v: cosOwned, need: 15, caps: 50 },
    { id: 'arch', t: 'Architect', d: 'Build 10 tiers of base pieces.', v: built, need: 10, caps: 60 },
    { id: 'holly', t: 'Holly Jolly', d: 'Open all 24 advent doors in one December.', v: () => (S().advent && S().advent.open ? S().advent.open.length : 0), need: 24, caps: 100 },
  ];
  C.ACH = ACH;
  C.titles = () => { const c = st(); return c ? ACH.filter(a => c.got[a.id]).map(a => a.t) : []; };
  // check everything; pays and toasts what is new. Cheap: called on kills and when the home screen draws
  C.check = function (quiet) {
    const c = st(); if (!c || !S().survivor) return 0; let n = 0;
    for (const a of ACH) {
      if (c.got[a.id]) continue;
      let v = 0; try { v = +a.v() || 0; } catch (e) { v = 0; }
      if (v < a.need) continue;
      c.got[a.id] = Date.now(); S().trader.caps += a.caps; n++;
      if (!quiet) { setTimeout(() => toast(`🏆 ${a.t}! ${a.d} +${a.caps} caps, new title`, 3.4), n * 900); try { DM.E.SFX.play('pick'); } catch (e) { /* ignore */ } }
    }
    if (n && G().save) G().save();
    return n;
  };
  C.flag = (k, n = 1) => { const c = st(); if (!c) return; c.flags[k] = (c.flags[k] || 0) + n; C.check(); };

  // count kills (wraps Game.onKill, which house.js calls for every kill she makes)
  function hook() {
    const Gm = G(); if (!Gm || !Gm.onKill || Gm.onKill._codex) return;
    const orig = Gm.onKill;
    Gm.onKill = function (z) {
      try {
        const c = st(), k = kindOf(z);
        if (c && k) { const t0 = C.tier(k); c.kills[k] = (c.kills[k] || 0) + 1; const t1 = C.tier(k); if (t1 > t0) toast(`📖 Bestiary: ${BEASTS.find(b => b.k === k).n} tier ${t1} - +${Math.round(BONUS[t1] * 100)}% damage against them`, 3); }
        const h = S().survivor.hands; if (c && h) c.wk[h.k] = (c.wk[h.k] || 0) + 1;
        if (c && (c.kills[k] || 0) % 5 === 0) C.check();
      } catch (e) { /* never break a kill */ }
      return orig.apply(this, arguments);
    };
    Gm.onKill._codex = 1;
  }
  C.hook = hook;

  // ---------------------------------------------------------------- the sheet
  let tab = 'beasts';
  C.tile = () => { const c = st(); if (!c) return null; const got = Object.keys(c.got).length, seen = BEASTS.filter(b => c.kills[b.k]).length; return { k: 'codex', c: '#b98cf0', n: 'Codex', sub: `${seen}/${BEASTS.length} zombies · ${got}/${ACH.length} feats`, hot: '' }; };
  C.html = function () {
    const c = st();
    const tabs = `<div class="cxtabs"><button data-cx="beasts" class="${tab === 'beasts' ? 'on' : ''}">Bestiary</button><button data-cx="ach" class="${tab === 'ach' ? 'on' : ''}">Feats &amp; titles</button></div>`;
    if (tab === 'beasts') {
      return `<div class="kick">Codex</div><h3>Bestiary</h3>${tabs}<p class="mp dim">Kill ${TIERS.join(' / ')} of a kind for +5 / +10 / +15% damage against it.</p><div class="cxlist">${BEASTS.map(b => {
        const n = c.kills[b.k] || 0, t = C.tier(b.k), nx = TIERS[t], known = n > 0;
        return `<div class="cxrow${known ? '' : ' unk'}"><i>${known ? b.g : '❔'}</i><div><b>${known ? esc(b.n) : '???'}${b.ev ? ' <em>event</em>' : ''}</b><span>${known ? esc(b.d) : 'Kill one to learn about it.'}</span>
          <div class="cxbar"><i style="width:${nx ? Math.min(100, n / nx * 100) : 100}%"></i></div><small>${fmt(n)} killed · tier ${t}/3${t ? ` · +${Math.round(BONUS[t] * 100)}% damage` : ''}${nx ? ` · next at ${fmt(nx)}` : ' · maxed'}</small></div></div>`;
      }).join('')}</div>`;
    }
    return `<div class="kick">Codex</div><h3>Feats &amp; titles</h3>${tabs}<p class="mp dim">Each feat pays caps once and unlocks a title. Show a title under your name: Walks tab &gt; Your title.</p><div class="cxlist">${ACH.map(a => {
      let v = 0; try { v = +a.v() || 0; } catch (e) { v = 0; }
      const got = !!c.got[a.id];
      return `<div class="cxrow${got ? ' got' : ''}"><i>${got ? '🏆' : '🔒'}</i><div><b>${esc(a.t)}</b><span>${esc(a.d)}</span>${got ? '<small>Done · title unlocked</small>' : `<div class="cxbar"><i style="width:${Math.min(100, v / a.need * 100)}%"></i></div><small>${fmt(Math.min(v, a.need))}/${fmt(a.need)} · ${a.caps} caps</small>`}</div></div>`;
    }).join('')}</div>`;
  };
  C.bind = function (root) {
    root.querySelectorAll('[data-cx]').forEach(b => b.onclick = () => { tab = b.dataset.cx; try { DM.E.SFX.play('ui'); } catch (e) { /* ignore */ } root.innerHTML = C.html(); C.bind(root); });
  };
  const css = document.createElement('style'); css.textContent = `
    .cxtabs { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin: 6px 0 8px; } .cxtabs button { height: 36px; border-radius: 11px; border: 2.5px solid var(--plum, #3d2d61); background: rgba(17,20,47,.6); color: var(--mute, #9d90bf); font: 900 13px Inter, system-ui, sans-serif; }
    .cxtabs button.on { background: var(--crm, #f6e3bb); color: #11142f; border-color: #11142f; }
    .cxlist { display: grid; gap: 7px; margin: 6px 0 10px; } .cxrow { display: flex; gap: 10px; padding: 9px 10px; border-radius: 14px; background: rgba(17,20,47,.65); border: 2px solid #3d2d61; }
    .cxrow > i { font-style: normal; font-size: 24px; width: 34px; flex: none; text-align: center; } .cxrow > div { flex: 1; min-width: 0; }
    .cxrow b { display: block; font-size: 14px; font-weight: 900; color: var(--crm, #f6e3bb); } .cxrow b em { font-style: normal; font-size: 9px; padding: 1px 5px; border-radius: 5px; background: #d9483a; color: #fff; vertical-align: 2px; }
    .cxrow span { display: block; font-size: 12px; font-weight: 700; color: var(--mute, #9d90bf); line-height: 1.35; } .cxrow small { display: block; margin-top: 3px; font-size: 11px; font-weight: 800; color: #b98cf0; }
    .cxrow.got { border-color: #e0b94a; } .cxrow.got small { color: #7fd49a; } .cxrow.unk { opacity: .7; }
    .cxbar { height: 6px; margin-top: 5px; border-radius: 4px; background: #11142f; overflow: hidden; } .cxbar i { display: block; height: 100%; background: #b98cf0; }`;
  document.head.appendChild(css);
  hook();
})();
