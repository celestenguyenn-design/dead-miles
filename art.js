/* Dead Miles art: chibi SVG sprites. Everything is generated, no image files. */
const ART=(()=>{
const SKINS=['#ffe0c8','#f4c9a5','#e0a97e','#c68a5d','#9a6543','#6b4530'];
const HAIR_COLORS=['#2a1b14','#5a3a24','#a86a3a','#e0b45a','#d94f3a','#e8e0d0','#7a4aa8','#3a7ad6','#ff8ab8','#58c7a0'];
const HAIR_STYLES=['short','bob','ponytail','bun','curly','buzz','long','spiky'];
const EYES=['round','almond','sparkle'];
const TOP_COLORS=['#8a3a2a','#3a5a8a','#4a7a4a','#6a4a8a','#c9a04a','#3a3a44'];
const HATS={beanie:{n:'Beanie',r:'rare'},cap:{n:'Ball cap',r:'rare'},cowboy:{n:'Cowboy hat',r:'epic'},catears:{n:'Cat-ear hood',r:'epic'},bandana:{n:'Bandana',r:'rare'},halo:{n:'Halo',r:'legendary'},crown:{n:'Tin crown',r:'legendary'},helmet:{n:'Bike helmet',r:'rare'}};
const TOPS={hoodie:{n:'Hoodie',r:'common'},varsity:{n:'Varsity jacket',r:'rare'},raincoat:{n:'Yellow raincoat',r:'rare'},biker:{n:'Biker jacket',r:'epic'},scrubs:{n:'Nurse scrubs',r:'epic'},flannel:{n:'Flannel shirt',r:'rare'},tux:{n:'Ruined tuxedo',r:'epic'}};
const ACCS={glasses:{n:'Round glasses',r:'rare'},scarf:{n:'Striped scarf',r:'rare'},eyepatch:{n:'Eyepatch',r:'epic'},shades:{n:'Aviators',r:'epic'},mask:{n:'Gas mask',r:'legendary'}};

function hairBack(style,c){
  switch(style){
    case 'bob':return `<path d="M18 40 q0 -30 32 -30 q32 0 32 30 v24 q0 8 -8 8 h-48 q-8 0 -8 -8z" fill="${c}"/>`;
    case 'long':return `<path d="M18 40 q0 -30 32 -30 q32 0 32 30 v48 q0 8 -8 8 h-48 q-8 0 -8 -8z" fill="${c}"/>`;
    case 'ponytail':return `<path d="M20 40 q0 -30 30 -30 q30 0 30 30 v14 h-60z" fill="${c}"/><path d="M76 44 q16 6 12 34 q-2 10 -8 8 q4 -20 -6 -34z" fill="${c}"/>`;
    case 'curly':return `<path d="M16 42 q2 -32 34 -32 q32 0 34 32 q6 10 -2 18 q-6 6 -10 0 q-4 8 -12 4 q-8 6 -12 0 q-6 6 -12 0 q-6 8 -12 2 q-8 6 -10 -4 q-8 -6 -2 -20z" fill="${c}"/>`;
    case 'bun':return `<path d="M20 40 q0 -30 30 -30 q30 0 30 30 v14 h-60z" fill="${c}"/><circle cx="50" cy="8" r="10" fill="${c}"/>`;
    case 'spiky':return `<path d="M20 44 l4 -22 l8 12 l6 -22 l8 14 l6 -20 l6 16 l6 -14 l4 22 l6 -8 l2 26 h-58z" fill="${c}"/>`;
    default:return `<path d="M20 42 q0 -30 30 -30 q30 0 30 30 v12 h-60z" fill="${c}"/>`;
  }
}
function hairFront(style,c){
  switch(style){
    case 'buzz':return `<path d="M22 36 q4 -20 28 -20 q24 0 28 20 q-14 -10 -28 -8 q-14 -2 -28 8z" fill="${c}" opacity=".8"/>`;
    case 'curly':return `<path d="M20 40 q4 -22 30 -22 q26 0 30 22 q-6 -8 -12 -2 q-6 -8 -12 -2 q-6 -8 -12 -2 q-6 -8 -12 -2 q-6 -6 -12 8z" fill="${c}"/>`;
    case 'spiky':return `<path d="M22 40 q6 -18 28 -18 q22 0 28 18 q-8 -6 -14 2 q-6 -8 -14 -2 q-8 -6 -14 2 q-8 -4 -14 -2z" fill="${c}"/>`;
    case 'bob':case 'long':return `<path d="M20 42 q2 -24 30 -24 q28 0 30 24 q-10 -10 -20 -6 q-10 -8 -20 -2 q-10 -6 -20 8z" fill="${c}"/>`;
    default:return `<path d="M20 42 q2 -24 30 -24 q28 0 30 24 q-8 -10 -16 -8 q-8 -8 -16 -4 q-10 -6 -14 6 q-6 -8 -14 6z" fill="${c}"/>`;
  }
}
function eyes(style,mood){
  if(mood==='dead')return `<path d="M32 44 l8 8 m0 -8 l-8 8 M60 44 l8 8 m0 -8 l-8 8" stroke="#1a1020" stroke-width="3" stroke-linecap="round" fill="none"/>`;
  if(mood==='angry')return `<ellipse cx="37" cy="48" rx="6" ry="6" fill="#fff"/><ellipse cx="63" cy="48" rx="6" ry="6" fill="#fff"/><circle cx="38" cy="49" r="3.4" fill="#c22b3a"/><circle cx="62" cy="49" r="3.4" fill="#c22b3a"/><path d="M29 40 l14 5 M71 40 l-14 5" stroke="#1a1020" stroke-width="3" stroke-linecap="round"/>`;
  if(mood==='glow')return `<circle cx="37" cy="48" r="6" fill="#ffd166"/><circle cx="63" cy="48" r="6" fill="#ffd166"/><circle cx="37" cy="48" r="2.4" fill="#1a1020"/><circle cx="63" cy="48" r="2.4" fill="#1a1020"/>`;
  if(style==='almond')return `<path d="M29 48 q8 -8 16 0 q-8 6 -16 0z M55 48 q8 -8 16 0 q-8 6 -16 0z" fill="#fff"/><circle cx="37" cy="47.5" r="3.4" fill="#2a1a14"/><circle cx="63" cy="47.5" r="3.4" fill="#2a1a14"/><circle cx="38.5" cy="46" r="1.2" fill="#fff"/><circle cx="64.5" cy="46" r="1.2" fill="#fff"/>`;
  if(style==='sparkle')return `<ellipse cx="37" cy="48" rx="7" ry="8" fill="#fff"/><ellipse cx="63" cy="48" rx="7" ry="8" fill="#fff"/><ellipse cx="37.5" cy="49" rx="4.6" ry="5.6" fill="#3a5aa8"/><ellipse cx="63.5" cy="49" rx="4.6" ry="5.6" fill="#3a5aa8"/><circle cx="35.5" cy="46" r="2" fill="#fff"/><circle cx="61.5" cy="46" r="2" fill="#fff"/><circle cx="39.5" cy="51" r="1" fill="#fff"/><circle cx="65.5" cy="51" r="1" fill="#fff"/>`;
  return `<ellipse cx="37" cy="48" rx="6.5" ry="7.5" fill="#fff"/><ellipse cx="63" cy="48" rx="6.5" ry="7.5" fill="#fff"/><ellipse cx="37.5" cy="49" rx="4" ry="5" fill="#2a1a14"/><ellipse cx="63.5" cy="49" rx="4" ry="5" fill="#2a1a14"/><circle cx="36" cy="46.5" r="1.6" fill="#fff"/><circle cx="62" cy="46.5" r="1.6" fill="#fff"/>`;
}
function mouth(mood){
  if(mood==='dead')return `<path d="M42 62 q8 -4 16 0" stroke="#1a1020" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M44 58 l3 6 M52 58 l3 6" stroke="#1a1020" stroke-width="2"/>`;
  if(mood==='scream')return `<ellipse cx="50" cy="63" rx="7" ry="9" fill="#3a0a10"/><path d="M45 58 h10" stroke="#fff" stroke-width="2"/>`;
  if(mood==='angry')return `<path d="M42 63 q8 -5 16 0" stroke="#1a1020" stroke-width="2.5" fill="none" stroke-linecap="round"/>`;
  return `<path d="M44 60 q6 6 12 0" stroke="#7a3a3a" stroke-width="2.5" fill="none" stroke-linecap="round"/>`;
}
function topShape(top,c){
  const base=`<rect x="30" y="76" width="40" height="32" rx="9" fill="${c}"/>`;
  switch(top){
    case 'varsity':return `<rect x="30" y="76" width="40" height="32" rx="9" fill="#2a3a6a"/><rect x="30" y="80" width="10" height="26" rx="5" fill="#e8e0d0"/><rect x="60" y="80" width="10" height="26" rx="5" fill="#e8e0d0"/><text x="50" y="98" font-size="10" text-anchor="middle" fill="#e8e0d0" font-family="sans-serif" font-weight="700">H</text>`;
    case 'raincoat':return `<rect x="28" y="76" width="44" height="34" rx="10" fill="#f2c230"/><path d="M50 76 v34" stroke="#c99a10" stroke-width="2"/><circle cx="50" cy="86" r="1.8" fill="#8a6a00"/><circle cx="50" cy="96" r="1.8" fill="#8a6a00"/>`;
    case 'biker':return `<rect x="30" y="76" width="40" height="32" rx="9" fill="#1a1a1e"/><path d="M40 76 l10 14 l10 -14" stroke="#555" stroke-width="2" fill="none"/><path d="M34 84 h8 M58 84 h8" stroke="#bbb" stroke-width="2"/>`;
    case 'scrubs':return `<rect x="30" y="76" width="40" height="32" rx="9" fill="#5fb3c9"/><path d="M42 76 l8 8 l8 -8" stroke="#3a7a8a" stroke-width="2" fill="none"/><rect x="56" y="88" width="9" height="9" rx="1" fill="#e8f4f8"/><path d="M60.5 89.5 v6 M57.5 92.5 h6" stroke="#c22b3a" stroke-width="1.6"/>`;
    case 'flannel':return `<rect x="30" y="76" width="40" height="32" rx="9" fill="#a83a2a"/><path d="M30 86 h40 M30 96 h40 M40 76 v32 M50 76 v32 M60 76 v32" stroke="#4a1a14" stroke-width="2" opacity=".6"/>`;
    case 'tux':return `<rect x="30" y="76" width="40" height="32" rx="9" fill="#1a1a1e"/><path d="M42 76 l8 12 l8 -12z" fill="#fff"/><path d="M46 80 l4 4 l4 -4 l-4 -2z" fill="#c22b3a"/>`;
    default:return base+`<path d="M38 76 q12 8 24 0" stroke="rgba(0,0,0,.25)" stroke-width="3" fill="none"/>`;
  }
}
function hatShape(hat,hairC){
  switch(hat){
    case 'beanie':return `<path d="M20 40 q2 -26 30 -26 q28 0 30 26 v4 h-60z" fill="#c22b3a"/><rect x="18" y="38" width="64" height="9" rx="4" fill="#8a1a26"/><circle cx="50" cy="13" r="5" fill="#e8e0d0"/>`;
    case 'cap':return `<path d="M20 40 q2 -26 30 -26 q28 0 30 26 v2 h-60z" fill="#2a3a6a"/><path d="M14 42 h56 q4 0 4 4 q-30 -4 -60 0 q0 -4 0 -4z" fill="#1a2a5a"/>`;
    case 'cowboy':return `<path d="M26 40 q2 -20 24 -20 q22 0 24 20z" fill="#6a4a2a"/><path d="M8 42 q42 -6 84 0 q-6 8 -42 8 q-36 0 -42 -8z" fill="#5a3a1a"/><path d="M26 38 h48" stroke="#2a1a0a" stroke-width="3"/>`;
    case 'catears':return `<path d="M22 40 l6 -26 l16 16z M78 40 l-6 -26 l-16 16z" fill="#3a3a44"/><path d="M27 36 l4 -14 l9 10z M73 36 l-4 -14 l-9 10z" fill="#ff8ab8"/><path d="M20 42 q2 -24 30 -24 q28 0 30 24 v4 h-60z" fill="#3a3a44"/>`;
    case 'bandana':return `<path d="M20 42 q2 -24 30 -24 q28 0 30 24 v2 h-60z" fill="#c22b3a"/><path d="M78 42 l10 -8 l-4 12z" fill="#c22b3a"/>`;
    case 'halo':return `<ellipse cx="50" cy="8" rx="20" ry="5" fill="none" stroke="#ffd166" stroke-width="3"/>`;
    case 'crown':return `<path d="M28 40 v-14 l8 8 l8 -12 l6 12 l6 -12 l8 12 l8 -8 v14z" fill="#e6a530"/><circle cx="50" cy="30" r="2.5" fill="#c22b3a"/>`;
    case 'helmet':return `<path d="M18 44 q2 -30 32 -30 q30 0 32 30 v2 h-64z" fill="#3a7ad6"/><path d="M18 44 h64" stroke="#1a3a7a" stroke-width="3"/><path d="M30 24 q20 -10 40 0" stroke="#fff" stroke-width="2" fill="none" opacity=".5"/>`;
    default:return '';
  }
}
function accShape(acc){
  switch(acc){
    case 'glasses':return `<circle cx="37" cy="48" r="9" fill="none" stroke="#2a1a14" stroke-width="2"/><circle cx="63" cy="48" r="9" fill="none" stroke="#2a1a14" stroke-width="2"/><path d="M46 48 h8" stroke="#2a1a14" stroke-width="2"/>`;
    case 'shades':return `<path d="M27 44 h20 v8 q-10 6 -20 0z M53 44 h20 v8 q-10 6 -20 0z" fill="#1a1a1e"/><path d="M47 46 h6" stroke="#1a1a1e" stroke-width="2"/>`;
    case 'scarf':return `<rect x="30" y="70" width="40" height="10" rx="5" fill="#c22b3a"/><rect x="34" y="72" width="32" height="2" fill="#e8e0d0"/><rect x="58" y="76" width="9" height="20" rx="4" fill="#c22b3a"/>`;
    case 'eyepatch':return `<circle cx="63" cy="48" r="8" fill="#1a1a1e"/><path d="M22 36 q30 -6 62 8" stroke="#1a1a1e" stroke-width="2" fill="none"/>`;
    case 'mask':return `<path d="M26 52 q24 -14 48 0 v12 q-24 12 -48 0z" fill="#3a3a44"/><circle cx="38" cy="58" r="5" fill="#8a8a94"/><circle cx="62" cy="58" r="5" fill="#8a8a94"/>`;
    default:return '';
  }
}
// av = {skin,hair,hairColor,eyes,top,topColor,hat,acc}
function avatarSVG(av,size,opts){
  av=av||{};opts=opts||{};const skin=SKINS[av.skin||0]||SKINS[0];const hc=HAIR_COLORS[av.hairColor||0]||HAIR_COLORS[0];const style=av.hair||'short';const tc=TOP_COLORS[av.topColor||0]||TOP_COLORS[0];
  const mood=opts.mood||'';const weapon=opts.weapon||'';
  const w=size||100,h=Math.round((size||100)*1.3);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 130" width="${w}" height="${h}" ${opts.attrs||''} aria-hidden="true">
  ${hairBack(style,hc)}
  <rect x="35" y="104" width="12" height="22" rx="5" fill="#2a2a30"/><rect x="53" y="104" width="12" height="22" rx="5" fill="#2a2a30"/>
  <rect x="33" y="120" width="16" height="8" rx="4" fill="#1a1a1e"/><rect x="51" y="120" width="16" height="8" rx="4" fill="#1a1a1e"/>
  ${topShape(av.top||'hoodie',tc)}
  <rect x="22" y="80" width="11" height="24" rx="5" fill="${skin}"/><rect x="67" y="80" width="11" height="24" rx="5" fill="${skin}"/>
  ${weapon==='melee'?`<path d="M74 100 l14 -30" stroke="#7a5a3a" stroke-width="5" stroke-linecap="round"/><path d="M86 74 l4 -8" stroke="#555" stroke-width="7" stroke-linecap="round"/>`:''}
  ${weapon==='gun'?`<rect x="72" y="88" width="20" height="7" rx="2" fill="#333"/><rect x="74" y="94" width="6" height="8" rx="2" fill="#333"/>`:''}
  <path d="M18 46 q0 -34 32 -34 q32 0 32 34 v8 q0 22 -32 22 q-32 0 -32 -22z" fill="${skin}"/>
  <circle cx="30" cy="58" r="4.5" fill="#ff8ab8" opacity=".45"/><circle cx="70" cy="58" r="4.5" fill="#ff8ab8" opacity=".45"/>
  ${eyes(av.eyes||'round',mood)}
  ${mouth(mood)}
  ${hairFront(style,hc)}
  ${hatShape(av.hat,hc)}
  ${accShape(av.acc)}
  </svg>`;
}
// zombies + raiders
function zombieSVG(kind,size){
  const w=size||100,h=Math.round((size||100)*1.3);
  const skin={walker:'#8fae6a',runner:'#a6c27a',bloater:'#8a9a6a',screamer:'#9fb27a',raider:'#e0a97e',gunner:'#c68a5d',boss:'#9a6543'}[kind]||'#8fae6a';
  const human=kind==='raider'||kind==='gunner'||kind==='boss';
  const body=kind==='bloater'?`<ellipse cx="50" cy="94" rx="30" ry="20" fill="#5a6a4a"/><path d="M30 90 q10 -6 20 0 q10 6 20 0" stroke="#3a4a2a" stroke-width="2" fill="none"/>`:
    human?`<rect x="30" y="76" width="40" height="32" rx="9" fill="${kind==='boss'?'#1a1a1e':'#4a3a2a'}"/>${kind==='boss'?'<path d="M32 78 l4 -6 l4 6 M44 78 l4 -6 l4 6 M56 78 l4 -6 l4 6" stroke="#bbb" stroke-width="2" fill="none"/>':''}`:
    `<rect x="30" y="76" width="40" height="32" rx="9" fill="#5a5a6a"/><path d="M34 100 l6 8 l4 -8 l6 8 l4 -8 l6 8 l4 -8" fill="#5a5a6a"/><path d="M40 80 l6 10 l6 -10" stroke="#3a3a4a" stroke-width="2" fill="none"/>`;
  const arms=human?`<rect x="22" y="80" width="11" height="24" rx="5" fill="${skin}"/><rect x="67" y="80" width="11" height="24" rx="5" fill="${skin}"/>`:
    `<rect x="14" y="84" width="24" height="10" rx="5" fill="${skin}" transform="rotate(-10 26 89)"/><rect x="62" y="84" width="24" height="10" rx="5" fill="${skin}" transform="rotate(10 74 89)"/>`;
  const hair=human?(kind==='boss'?'':hairBack('short','#2a1b14')):`<path d="M22 40 q4 -20 28 -20 q24 0 28 20 q-10 -6 -18 -2 q-8 -8 -14 0 q-8 -6 -12 4 q-6 -8 -12 -2z" fill="#3a4a2a" opacity=".9"/>`;
  const face=kind==='boss'?`<path d="M22 44 q0 -24 28 -24 q28 0 28 24 v14 q-4 12 -28 12 q-24 0 -28 -12z" fill="#e8e0d0"/><ellipse cx="38" cy="50" rx="7" ry="8" fill="#1a1a1e"/><ellipse cx="62" cy="50" rx="7" ry="8" fill="#1a1a1e"/><path d="M50 58 l-4 6 h8z" fill="#1a1a1e"/><path d="M38 68 h24 M42 66 v6 M50 66 v6 M58 66 v6" stroke="#1a1a1e" stroke-width="2"/>`:
    (kind==='raider'||kind==='gunner')?`${eyes('almond','angry')}<path d="M24 56 q26 -10 52 0 v12 q-26 10 -52 0z" fill="${kind==='gunner'?'#3a3a44':'#c22b3a'}"/>`:
    `${eyes('round',kind==='runner'?'angry':kind==='screamer'?'glow':'dead')}${mouth(kind==='screamer'?'scream':'dead')}`;
  const extra=kind==='gunner'?`<rect x="72" y="88" width="22" height="7" rx="2" fill="#333"/><rect x="74" y="94" width="6" height="8" rx="2" fill="#333"/>`:kind==='raider'?`<path d="M76 100 l12 -30" stroke="#888" stroke-width="4" stroke-linecap="round"/>`:kind==='boss'?`<path d="M76 100 l14 -34" stroke="#7a5a3a" stroke-width="5" stroke-linecap="round"/><path d="M88 70 l6 -10" stroke="#aaa" stroke-width="9" stroke-linecap="round"/>`:'';
  const wound=!human?`<path d="M28 60 l6 4" stroke="#7a2a2a" stroke-width="2"/><circle cx="66" cy="40" r="3" fill="#7a2a2a" opacity=".7"/>`:'';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 130" width="${w}" height="${h}" aria-hidden="true">
  ${hair}
  <rect x="35" y="104" width="12" height="22" rx="5" fill="#2a2a30"/><rect x="53" y="104" width="12" height="22" rx="5" fill="#2a2a30"/>
  <rect x="33" y="120" width="16" height="8" rx="4" fill="#1a1a1e"/>${kind==='walker'?'':'<rect x="51" y="120" width="16" height="8" rx="4" fill="#1a1a1e"/>'}
  ${body}${arms}${extra}
  <path d="M18 46 q0 -34 32 -34 q32 0 32 34 v8 q0 22 -32 22 q-32 0 -32 -22z" fill="${skin}"/>
  ${wound}${face}
  ${!human&&kind!=='boss'?`<path d="M22 40 q4 -20 28 -20 q24 0 28 20 q-10 -6 -18 -2 q-8 -8 -14 0 q-8 -6 -12 4 q-6 -8 -12 -2z" fill="#3a4a2a" opacity=".9"/>`:''}
  ${kind==='raider'?hatShape('bandana'):kind==='gunner'?hatShape('beanie'):''}
  </svg>`;
}
function petSVG(kind,size){
  const w=size||64;
  if(kind==='dog')return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="${w}" height="${w}" aria-hidden="true"><ellipse cx="30" cy="46" rx="18" ry="12" fill="#b58a5a"/><rect x="16" y="50" width="7" height="10" rx="3" fill="#8a6a3a"/><rect x="36" y="50" width="7" height="10" rx="3" fill="#8a6a3a"/><path d="M12 42 q-10 -4 -6 -14" stroke="#b58a5a" stroke-width="5" fill="none" stroke-linecap="round"/><circle cx="42" cy="30" r="14" fill="#b58a5a"/><path d="M30 24 q-6 -12 2 -14 q4 6 6 12z M54 24 q6 -12 -2 -14 q-4 6 -6 12z" fill="#8a6a3a"/><ellipse cx="38" cy="30" rx="3" ry="3.5" fill="#fff"/><ellipse cx="48" cy="30" rx="3" ry="3.5" fill="#fff"/><circle cx="38.5" cy="31" r="1.8" fill="#1a1020"/><circle cx="48.5" cy="31" r="1.8" fill="#1a1020"/><ellipse cx="44" cy="38" rx="4" ry="3" fill="#2a1a14"/><path d="M44 41 q0 4 4 4" stroke="#7a3a3a" stroke-width="1.5" fill="none"/><rect x="34" y="42" width="18" height="4" rx="2" fill="#c22b3a"/></svg>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="${w}" height="${w}" aria-hidden="true"><path d="M50 44 q10 -2 8 -12" stroke="#e0954a" stroke-width="6" fill="none" stroke-linecap="round"/><ellipse cx="32" cy="46" rx="16" ry="13" fill="#e0954a"/><path d="M22 40 q6 -4 12 0 M20 48 q8 -5 16 0" stroke="#b8702a" stroke-width="2.4" fill="none" stroke-linecap="round"/><path d="M18 14 l8 10 l-12 2z M46 14 l-8 10 l12 2z" fill="#e0954a"/><path d="M20 16 l5 7 l-8 1z M44 16 l-5 7 l8 1z" fill="#f6b3c3"/><circle cx="32" cy="28" r="15" fill="#e0954a"/><path d="M24 18 q8 -3 16 0" stroke="#b8702a" stroke-width="2" fill="none" stroke-linecap="round"/><ellipse cx="26" cy="27" rx="3.2" ry="3.8" fill="#fff"/><ellipse cx="38" cy="27" rx="3.2" ry="3.8" fill="#fff"/><ellipse cx="26.5" cy="27.5" rx="2" ry="2.8" fill="#3a7a3a"/><ellipse cx="38.5" cy="27.5" rx="2" ry="2.8" fill="#3a7a3a"/><circle cx="25.5" cy="26" r="1" fill="#fff"/><circle cx="37.5" cy="26" r="1" fill="#fff"/><path d="M30 33 l2 2 l2 -2z" fill="#f6b3c3"/><path d="M32 35 q-2 3 -4 2 M32 35 q2 3 4 2" stroke="#8a5a2a" stroke-width="1.2" fill="none" stroke-linecap="round"/><path d="M10 30 l12 2 M10 35 l12 0 M54 30 l-12 2 M54 35 l-12 0" stroke="#fff" stroke-width="1" opacity=".6"/><rect x="24" y="36" width="16" height="3" rx="1.5" fill="#c22b3a"/></svg>`;
}
const imgCache=new Map();
function spriteImg(svg){let i=imgCache.get(svg);if(i)return i;i=new Image();i.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);imgCache.set(svg,i);if(imgCache.size>60){const k=imgCache.keys().next().value;imgCache.delete(k);}return i;}
function randomAv(){return {skin:Math.floor(Math.random()*SKINS.length),hair:HAIR_STYLES[Math.floor(Math.random()*HAIR_STYLES.length)],hairColor:Math.floor(Math.random()*HAIR_COLORS.length),eyes:EYES[Math.floor(Math.random()*EYES.length)],top:'hoodie',topColor:Math.floor(Math.random()*TOP_COLORS.length),hat:'',acc:''};}
return {SKINS,HAIR_COLORS,HAIR_STYLES,EYES,TOP_COLORS,HATS,TOPS,ACCS,avatarSVG,zombieSVG,petSVG,spriteImg,randomAv};
})();
