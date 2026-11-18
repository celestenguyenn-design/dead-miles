/* Dead Miles (next) 0.28 - armor (owner: "i noticed we have no armor system").
   One body slot (survivor.armor = { k, d }). Each piece cuts the damage of every hit (red), wears down by about 60% of
   the raw hit (d, out of dur) and falls apart at 0. Heavy pieces are louder (loud: footstep noise x) and slower
   (slow: walk/run speed x). Repair at the Gear tab with cloth (padded / pads) or scrap (vest / carrier).
   Sources: coat closets + wardrobes (padded jacket), gym lockers + garages (sports pads), police lockers + armories
   (riot vest, plate carrier), horde crates, Dot (trader level 2-4), the padded-jacket blueprint. */
'use strict';
window.DM = window.DM || {};
(() => {
  const A = DM.Armor = {};
  const D = () => DM.D;
  A.def = k => { const it = D().ITEMS[k]; return it && it.armor ? it.armor : null; };
  A.worn = s => s && s.armor && A.def(s.armor.k) ? s.armor : null;
  A.dur = e => { const a = A.def(e.k); return e.d == null ? a.dur : e.d; };
  A.red = s => { const w = A.worn(s); return w ? A.def(w.k).red : 0; };
  A.loud = s => { const w = A.worn(s); return w ? A.def(w.k).loud || 1 : 1; };
  A.slow = s => { const w = A.worn(s); return w ? A.def(w.k).slow || 1 : 1; };
  A.repairMat = k => (k === 'armor_riot' || k === 'armor_plate') ? 'scrap' : 'cloth';
  // a hit: returns the damage after armor; wears the armor; tells when it breaks
  A.hit = function (s, dmg) {
    const w = A.worn(s); if (!w || dmg <= 0) return dmg;
    const a = A.def(w.k), out = Math.max(1, Math.round(dmg * (1 - a.red)));
    const was = A.dur(w); w.d = was - Math.max(1, Math.round(dmg * .6));
    if (w.d > 0 && was > a.dur * .15 && w.d <= a.dur * .15 && DM.E && DM.E.toast) DM.E.toast(`⚠ Your ${D().ITEMS[w.k].n.toLowerCase()} is about to fall apart - repair it in Gear`, 2.8);   // 0.66
    if (w.d <= 0) { const n = D().ITEMS[w.k].n; s.armor = null; if (DM.E && DM.E.toast) DM.E.toast(`Your ${n.toLowerCase()} fell apart`, 2.2); }
    return out;
  };
  const ICONS = {
    armor_pad: `<path d="M-22,-24 L-8,-28 Q0,-20 8,-28 L22,-24 L28,-4 L20,0 L20,26 L-20,26 L-20,0 L-28,-4 Z" fill="#7c9a4c" stroke="#11142f" stroke-width="2.6" stroke-linejoin="round"/>
      <path d="M-16,-6 H16 M-16,6 H16 M-16,18 H16" stroke="#5c7836" stroke-width="2.4"/><path d="M0,-22 V26" stroke="#11142f" stroke-width="2"/>`,
    armor_sport: `<g stroke="#11142f" stroke-width="2.6" stroke-linejoin="round"><path d="M-26,-16 Q-14,-30 0,-22 Q14,-30 26,-16 L22,0 Q0,-8 -22,0 Z" fill="#3a6ab8"/>
      <rect x="-14" y="0" width="28" height="24" rx="6" fill="#f6e3bb"/></g><path d="M-8,8 H8 M-8,15 H8" stroke="#3a6ab8" stroke-width="2.4"/><path d="M-18,-14 Q0,-20 18,-14" stroke="#ffffff" stroke-width="2" fill="none" opacity=".6"/>`,
    armor_riot: `<path d="M-20,-26 L-6,-26 L-4,-20 L4,-20 L6,-26 L20,-26 L24,-6 L22,26 L-22,26 L-24,-6 Z" fill="#2a2838" stroke="#11142f" stroke-width="2.6" stroke-linejoin="round"/>
      <rect x="-14" y="-6" width="28" height="10" rx="2" fill="#f6e3bb" stroke="#11142f" stroke-width="2"/><text x="0" y="2.6" font-size="8" font-weight="900" text-anchor="middle" fill="#11142f" font-family="sans-serif">POLICE</text>
      <path d="M-18,12 H18 M-18,19 H18" stroke="#4a4657" stroke-width="2.4"/>`,
    armor_plate: `<path d="M-20,-24 L-8,-26 L-6,-18 L6,-18 L8,-26 L20,-24 L24,24 L-24,24 Z" fill="#5c6a3a" stroke="#11142f" stroke-width="2.6" stroke-linejoin="round"/>
      <rect x="-15" y="-10" width="30" height="24" rx="3" fill="#7d8398" stroke="#11142f" stroke-width="2.2"/><path d="M-10,-4 H10 M-10,3 H10" stroke="#5f6580" stroke-width="2"/>
      <rect x="-20" y="16" width="10" height="7" rx="1.5" fill="#4b5635" stroke="#11142f" stroke-width="1.6"/><rect x="10" y="16" width="10" height="7" rx="1.5" fill="#4b5635" stroke="#11142f" stroke-width="1.6"/>`,
  };
  if (typeof ART !== 'undefined' && ART.addIcons) ART.addIcons(ICONS);   // ART is a top-level const (not on window)
})();
