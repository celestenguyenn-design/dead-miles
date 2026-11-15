/* Dead Miles (next) 0.26.9 - "Add to home screen" as step 1 (owner: "how do we get it to be a homescreen app for androids"
   -> "that should be step 1"). Before a new player makes a character - on a phone, not already opened from the icon -
   a screen shows how to put Dead Miles on the home screen for THIS phone: Android Chrome gets a one-tap Install button
   when the browser offers one (beforeinstallprompt), else the menu steps; Samsung Internet its menu steps; iPhone the Share
   steps, with a warning that Safari and the home-screen app keep separate saves. "Continue in the browser" is a small way
   past it. DM.Install.gate(cb) shows it (or calls cb at once), DM.Install.standalone(), DM.Install.html() for the tour. */
'use strict';
window.DM = window.DM || {};
(() => {
  const I = DM.Install = {};
  let deferred = null;
  addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; const b = document.getElementById('inGo'); if (b) b.style.display = ''; });
  addEventListener('appinstalled', () => { deferred = null; const t = document.getElementById('inMsg'); if (t) t.innerHTML = '<b>Installed!</b> Open <b>Dead Miles</b> from your home screen and carry on there.'; });
  const ua = navigator.userAgent || '';
  const ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const android = /Android/i.test(ua), samsung = /SamsungBrowser/i.test(ua);
  I.standalone = () => (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
  I.phone = () => ios || android;
  I.needed = () => I.phone() && !I.standalone();
  I.steps = function () {
    if (ios) return `<ol><li>This must be <b>Safari</b> (other iPhone browsers cannot add apps).</li><li>Tap the <b>Share</b> button <span class="inico">⬆︎</span> (bottom middle, or top right on iPad).</li><li>Scroll down and tap <b>Add to Home Screen</b>, then <b>Add</b>.</li><li>Close Safari and open <b>Dead Miles</b> from your home screen.</li></ol>
      <p class="inwarn">Do this BEFORE you make your survivor: on iPhone the home-screen app keeps its own save, separate from Safari.</p>`;
    if (samsung) return `<ol><li>Tap the <b>≡</b> menu (bottom right).</li><li>Tap <b>Add page to</b> → <b>Home screen</b> → <b>Add</b>.</li><li>Open <b>Dead Miles</b> from your home screen.</li></ol>`;
    if (android) return `<ol><li>Tap <b>⋮</b> (top right in Chrome).</li><li>Tap <b>Add to home screen</b> (or <b>Install app</b>) → <b>Install</b>.</li><li>Open <b>Dead Miles</b> from your home screen.</li></ol>`;
    return '<p>Open this page on your phone, then add it to your home screen from the browser menu.</p>';
  };
  I.html = () => `<div class="insteps">${I.steps()}</div>`;
  let css = false;
  function style() {
    if (css) return; css = true;
    const s = document.createElement('style');
    s.textContent = `#instep { position: fixed; inset: 0; z-index: 70; display: grid; place-items: center; padding: 18px; background: rgba(8,6,22,.86); }
      #instep .incard { width: 100%; max-width: 400px; max-height: 92vh; overflow: auto; padding: 18px; border-radius: 22px; background: #1c1538; border: 3px solid #11142f; box-shadow: 0 5px 0 #f07b3c; color: #f6e3bb; }
      #instep .ink { font-size: 11px; letter-spacing: .08em; text-transform: uppercase; color: #f07b3c; font-weight: 900; }
      #instep h3 { margin: 4px 0 8px; font-size: 22px; } #instep p { font-size: 14px; line-height: 1.45; color: #e6dcc8; margin: 0 0 10px; }
      #instep ol { margin: 6px 0 12px; padding-left: 22px; font-size: 15px; line-height: 1.55; } #instep li { margin: 4px 0; }
      #instep .inwarn { padding: 8px 10px; border-radius: 10px; background: #2a1f4a; color: #ffd27a; font-size: 13px; }
      #instep .inico { display: inline-block; padding: 0 5px; border-radius: 6px; background: #3d2d61; }
      #instep .inlater { display: block; width: 100%; margin-top: 10px; background: none; border: 0; color: #9d90bf; text-decoration: underline; font: inherit; font-size: 13px; padding: 6px; }`;
    document.head.appendChild(s);
  }
  // cb runs when there is nothing to do, or once they choose to carry on in the browser
  I.gate = function (cb) {
    if (!I.needed() || sessionStorage.getItem('dm-next-inskip')) { cb(); return; }
    style();
    const el = document.createElement('div'); el.id = 'instep';
    el.innerHTML = `<div class="incard"><div class="ink">Step 1 · before anything else</div><h3>Put Dead Miles on your home screen</h3>
      <p>It then opens full screen like a real app, step sync and notifications work best, and you will not lose it in your browser tabs.</p>
      <div id="inMsg">${I.steps()}</div>
      <button class="mbtn" id="inGo" style="${deferred ? '' : 'display:none'}">Install Dead Miles</button>
      <button class="inlater" id="inLater">Continue in the browser instead</button></div>`;
    document.body.appendChild(el);
    el.querySelector('#inGo').onclick = async () => { if (!deferred) return; deferred.prompt(); try { await deferred.userChoice; } catch (e) { /* ignore */ } deferred = null; el.querySelector('#inGo').style.display = 'none'; };
    el.querySelector('#inLater').onclick = () => { if (ios && !confirm('Carry on in Safari? If you add Dead Miles to your home screen later, your survivor will not be there until you sign in on it.')) return; try { sessionStorage.setItem('dm-next-inskip', '1'); } catch (e) { /* ignore */ } el.remove(); cb(); };
  };
})();
