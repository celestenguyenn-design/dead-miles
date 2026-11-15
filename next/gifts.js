/* Dead Miles (next) 0.41 - friend gifts and trading (owner liked "friend gifts and trading").
   Any item in your pack or stash (not quest items) can be sent to another player: tap it, "Gift to a friend", pick a
   friend from the board (or type their handle), how many, and a short note. Trading = gifting both ways.
   Gifts arrive the next time their game checks the inbox (opening the home screen, at most once a minute) and go
   straight into their stash. Server: next/gifts.sql (next_gift_send, next_gift_inbox; claim on read).
   Save: SV.gifts = { log: [{ dir: 'in'|'out', who, what, at }] } (last 20). */
'use strict';
window.DM = window.DM || {};
(() => {
  const GF = DM.Gifts = {};
  const G = () => DM.Game, SV = () => DM.Game && DM.Game.data(), N = () => window.NET, D = () => DM.D;
  const toast = (m, s) => DM.E && DM.E.toast && DM.E.toast(m, s || 2.6);
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const st = () => { const v = SV(); v.gifts = v.gifts || { log: [] }; return v.gifts; };
  const log = (dir, who, what) => { const l = st().log; l.unshift({ dir, who, what, at: Date.now() }); l.length = Math.min(l.length, 20); };
  const what = items => items.map(e => `${e.n > 1 ? e.n + ' ' : ''}${(D().ITEMS[e.k] || { n: e.k }).n.toLowerCase()}`).join(', ');
  GF.can = () => { const n = N(); return !!(n && n.ok && n.handle); };
  // ---------------------------------------------------------------- inbox (claim on read)
  let lastCheck = 0, checking = false;
  GF.check = async function (force) {
    const n = N(); if (!GF.can() || checking || (!force && Date.now() - lastCheck < 60e3)) return;
    checking = true; lastCheck = Date.now();
    try {
      const r = await n.rpc('next_gift_inbox', { p_handle: n.handle, p_token: n.token });
      if (r && r.ok && r.gifts && r.gifts.length) {
        for (const g of r.gifts) {
          const items = (g.items || []).filter(e => D().ITEMS[e.k]);
          const lost = G().routeApi.toStash(items.map(e => Object.assign({}, e)));
          log('in', g.name || g.from, what(items));
          toast(`🎁 ${g.name || g.from} sent you ${what(items)}${g.note ? ` - "${g.note}"` : ''}${lost && lost.length ? ' (stash full - some left behind)' : ''}`, 4.2);
        }
        try { DM.E.SFX.play('pick'); } catch (e) { /* ignore */ }
        G().save(); if (G().renderHome && !DM.scene) G().renderHome();
      }
    } catch (e) { /* offline: try later */ }
    checking = false;
  };
  // ---------------------------------------------------------------- send
  const ERR = { auth: 'Sign in again first', to: 'Pick someone else', nobody: 'No player with that handle', items: 'That cannot be sent', limit: 'You sent 15 gifts today - try tomorrow', full: 'Their gift box is full', format: 'That cannot be sent', offline: 'You are offline' };
  // e = the stack, list = where it lives (pack / stash), done = refresh the caller
  GF.open = function (e, list, done) {
    const n = N(), it = D().ITEMS[e.k]; if (!GF.can()) return toast('Sign in to send gifts (Settings > Account & friends)', 2.4);
    const friends = ((n.boardRows || []).map(r => ({ h: r.handle, name: r.name || r.handle }))).filter(f => f.h !== n.handle).slice(0, 20);
    let to = '', cnt = e.n;
    const ui = G().ui;
    ui.sheetOpen(`<div class="kick">Gift to a friend</div><h3>${esc(it.n)}${e.n > 1 ? ' x' + e.n : ''}</h3>
      <p class="mp dim">It goes straight into their stash the next time they open the game. Trading? Gift each other.</p>
      <div class="kick sect">To</div><div class="chips" id="gfTo">${friends.map(f => `<button class="chip" data-h="${esc(f.h)}">${esc(f.name)}</button>`).join('') || '<span class="mp dim">No friends on the board yet - type a handle.</span>'}</div>
      <input id="gfHandle" placeholder="or type their handle" maxlength="24" autocapitalize="off" autocorrect="off" spellcheck="false" style="display:block;width:100%;box-sizing:border-box;margin:6px 0 8px;height:42px;border-radius:12px;border:2.5px solid #3d2d61;background:#11142f;color:#f6e3bb;padding:0 12px;font:700 15px Inter,system-ui,sans-serif">
      ${e.n > 1 ? `<div class="kick sect">How many</div><div class="chips" id="gfN">${[1, Math.ceil(e.n / 2), e.n].filter((v, i, a) => a.indexOf(v) === i).map(v => `<button class="chip${v === e.n ? ' on' : ''}" data-n="${v}">${v === e.n ? 'All ' + v : v}</button>`).join('')}</div>` : ''}
      <input id="gfNote" placeholder="a short note (optional)" maxlength="80" style="display:block;width:100%;box-sizing:border-box;margin:8px 0;height:42px;border-radius:12px;border:2.5px solid #3d2d61;background:#11142f;color:#f6e3bb;padding:0 12px;font:700 15px Inter,system-ui,sans-serif">
      <div class="btnrow"><button class="mbtn sm ghost" id="gfNo">Cancel</button><button class="mbtn sm" id="gfGo">Send</button></div>`);
    const $ = s => document.querySelector(s);
    document.querySelectorAll('#gfTo [data-h]').forEach(b => b.onclick = () => { to = b.dataset.h; $('#gfHandle').value = ''; document.querySelectorAll('#gfTo .chip').forEach(x => x.classList.toggle('on', x === b)); });
    document.querySelectorAll('#gfN [data-n]').forEach(b => b.onclick = () => { cnt = +b.dataset.n; document.querySelectorAll('#gfN .chip').forEach(x => x.classList.toggle('on', x === b)); });
    $('#gfNo').onclick = () => ui.sheetClose();
    $('#gfGo').onclick = async function () {
      const who = ($('#gfHandle').value || to).trim().toLowerCase().replace(/^@/, '');
      if (!who) return toast('Pick a friend or type a handle', 1.6);
      if (list.indexOf(e) < 0 || e.n < cnt) return toast('That item moved - try again', 1.6);
      this.disabled = true; this.textContent = 'Sending...';
      const item = { k: e.k, n: cnt }; if (e.q != null) item.q = e.q; if (e.d != null) item.d = e.d;
      let r; try { r = await n.rpc('next_gift_send', { p_handle: n.handle, p_token: n.token, p_to: who, p_items: [item], p_note: $('#gfNote').value || '' }); } catch (x) { r = { ok: false, error: 'offline' }; }
      if (!r || !r.ok) { this.disabled = false; this.textContent = 'Send'; return toast(ERR[r && r.error] || 'Could not send it', 2.2); }
      const i = list.indexOf(e); if (i >= 0) { e.n -= cnt; if (e.n <= 0) list.splice(i, 1); }
      log('out', who, what([item])); G().save(); ui.sheetClose(); try { DM.E.SFX.play('pick'); } catch (x) { /* ignore */ }
      toast(`🎁 Sent ${what([item])} to ${who}`, 2.4); if (done) done();
    };
  };
  GF.logHTML = () => { const l = st().log; return l.length ? `<div class="solist">${l.slice(0, 8).map(x => `<div><span>${x.dir === 'in' ? '🎁 from' : '📤 to'} ${esc(x.who)}</span><b>${esc(x.what)}</b></div>`).join('')}</div>` : ''; };
})();
