/* Dead Miles art: chibi SVG sprites. Everything is generated, no image files. */
const ART=(()=>{
const SKINS=['#ffe0c8','#f4c9a5','#e0a97e','#c68a5d','#9a6543','#6b4530'];
const HAIR_COLORS=['#2a1b14','#5a3a24','#a86a3a','#e0b45a','#d94f3a','#e8e0d0','#7a4aa8','#3a7ad6','#ff8ab8','#58c7a0'];
const HAIR_STYLES=['short','bob','ponytail','bun','curly','buzz','long','spiky'];
const HAIR_SHOP={twintails:{n:'Twin tails',c:6000},braid:{n:'Side braid',c:7000},spacebuns:{n:'Space buns',c:8000},wavy:{n:'Beach waves',c:9000},mohawk:{n:'Mohawk',c:9000},afro:{n:'Afro',c:10000},wolfcut:{n:'Wolf cut',c:12000},hime:{n:'Hime cut',c:15000}};
const EYES=['round','almond','sparkle'];
const EYES_SHOP={heart:{n:'Heart eyes',c:12000},star:{n:'Star eyes',c:12000},sleepy:{n:'Sleepy eyes',c:8000},cat:{n:'Cat eyes',c:10000}};
const TOP_COLORS=['#8a3a2a','#3a5a8a','#4a7a4a','#6a4a8a','#c9a04a','#3a3a44'];
const HATS={streakband:{n:"Runner's headband",r:'epic',lock:'streak'},beanie:{n:'Beanie',r:'rare'},cap:{n:'Ball cap',r:'rare'},cowboy:{n:'Cowboy hat',r:'epic'},catears:{n:'Cat-ear hood',r:'epic'},bandana:{n:'Bandana',r:'rare'},halo:{n:'Halo',r:'legendary'},crown:{n:'Tin crown',r:'legendary'},helmet:{n:'Bike helmet',r:'rare'},beret:{n:'Beret',r:'rare',c:8000},bunny:{n:'Bunny ears',r:'epic',c:14000},flowers:{n:'Flower crown',r:'epic',c:12000},headphones:{n:'Headphones',r:'rare',c:9000},party:{n:'Party hat',r:'rare',c:6000},bearhood:{n:'Bear hood',r:'epic',c:16000},tiara:{n:'Tiara',r:'legendary',c:25000},witch:{n:'Witch hat',r:'epic'},pumpkin:{n:'Pumpkin head',r:'legendary'}};
const TOPS={hoodie:{n:'Hoodie',r:'common'},varsity:{n:'Varsity jacket',r:'rare'},raincoat:{n:'Yellow raincoat',r:'rare'},biker:{n:'Biker jacket',r:'epic'},scrubs:{n:'Nurse scrubs',r:'epic'},flannel:{n:'Flannel shirt',r:'rare'},tux:{n:'Ruined tuxedo',r:'epic'},sweater:{n:'Cozy sweater',r:'rare',c:9000},overalls:{n:'Overalls',r:'rare',c:10000},sailor:{n:'Sailor top',r:'epic',c:14000},sundress:{n:'Sundress',r:'epic',c:15000,kind:'dress',c1:'#ff8ab8',dots:'#fff'},dress_black:{n:'Little black dress',r:'rare',kind:'dress',c1:'#1c1c22'},dress_floral:{n:'Floral dress',r:'rare',kind:'dress',c1:'#5fb3c9',dots:'#fff5a0'},dress_plaid:{n:'Plaid pinafore',r:'epic',kind:'dress',c1:'#a83a2a',plaid:true},dress_nurse:{n:'Nurse dress',r:'epic',kind:'dress',c1:'#f6f2ea',cross:true},dress_gown:{n:'Ball gown',r:'legendary',kind:'dress',c1:'#b38cff',gown:true},pajamas:{n:'Pajamas',r:'rare',c:8000},labcoat:{n:'Lab coat',r:'epic',c:18000},skeleton:{n:'Skeleton hoodie',r:'epic'},
  onesie_cow:{n:'Cow onesie',r:'rare',kind:'onesie',base:'#f4f0ea',belly:'#f6b3c3',pat:'cow',ears:'round',earIn:'#f6b3c3'},
  onesie_frog:{n:'Frog onesie',r:'rare',kind:'onesie',base:'#6fbf5a',belly:'#d8f0c0',ears:'frogeyes'},
  onesie_bear:{n:'Bear onesie',r:'rare',kind:'onesie',base:'#8a5a3a',belly:'#d9b48a',ears:'round',earIn:'#d9b48a'},
  onesie_bunny:{n:'Bunny onesie',r:'epic',kind:'onesie',base:'#ffd6e4',belly:'#fff',ears:'long',earIn:'#ff8ab8'},
  onesie_shark:{n:'Shark onesie',r:'epic',kind:'onesie',base:'#6a8aa8',belly:'#e8f0f6',ears:'fin',teeth:true},
  onesie_axolotl:{n:'Axolotl onesie',r:'legendary',kind:'onesie',base:'#ffb3d1',belly:'#fff0f6',ears:'frills',earIn:'#ff6fa8'},
  onesie_dino:{n:'Dino onesie',r:'epic',kind:'onesie',base:'#5aa86a',belly:'#e0d890',ears:'spikes'},
  onesie_snowfox:{n:'Snow fox onesie',r:'epic',kind:'onesie',base:'#f4f0ea',belly:'#fff',ears:'pointy',earIn:'#ff9ab0'},
  onesie_sparkmouse:{n:'Sparkmouse onesie',r:'legendary',kind:'onesie',base:'#f5d642',belly:'#f5d642',ears:'longblack',earIn:'#f5d642',cheeks:'#e63e3e',bolt:true},
  onesie_flamefox:{n:'Flamefox onesie',r:'legendary',kind:'onesie',base:'#f08a3a',belly:'#fbe3b8',ears:'pointy',earIn:'#fbe3b8',flame:true},
  // Hollow-een only (v7.34). `event` keeps it out of the gumball machines and loot.
  onesie_bones:{n:'Bones onesie',r:'epic',kind:'onesie',base:'#1e1e26',belly:'#1e1e26',ribs:true,event:'halloween'}};
function outfitKind(top){const t=TOPS[top];return t&&t.kind||'top';}
const ACCS={glasses:{n:'Round glasses',r:'rare'},scarf:{n:'Striped scarf',r:'rare'},eyepatch:{n:'Eyepatch',r:'epic'},shades:{n:'Aviators',r:'epic'},mask:{n:'Gas mask',r:'legendary'},bandaid:{n:'Cheek bandage',r:'rare',c:5000},choker:{n:'Choker',r:'rare',c:6000},stars:{n:'Star glasses',r:'epic',c:11000},flower:{n:'Hair flower',r:'rare',c:6000},blush:{n:'Extra blush',r:'rare',c:4000},freckles:{n:'Freckles',r:'rare',c:4000},wings:{n:'Bat wings',r:'legendary'}};

/* ---------- head geometry (viewBox 0 0 100 130): head spans x 12-88, y 10-82; eyes at (35,55) and (65,55) ---------- */
const CAP='M10 56 Q8 8 50 8 Q92 8 90 56';
const SIDES=`M10 54 q-2 12 4 20 l8 -4 q-4 -8 -2 -16z M90 54 q2 12 -4 20 l-8 -4 q4 -8 2 -16z`;
function hairBack(style,c){
  const dome=`<path d="M10 58 q0 -50 40 -50 q40 0 40 50 v10 h-80z" fill="${c}"/>`;
  switch(style){
    case 'buzz':return '';
    case 'mohawk':return '';
    case 'bob':return `<path d="M10 58 q0 -50 40 -50 q40 0 40 50 v14 q0 10 -5 14 q-4 3 -7 -1 q-3 -5 -2 -13 h-52 q1 8 -2 13 q-3 4 -7 1 q-5 -4 -5 -14z" fill="${c}"/>`;
    case 'long':return `<path d="M10 58 q0 -50 40 -50 q40 0 40 50 v12 q0 26 -5 42 q-3 8 -9 6 q-5 -2 -4 -8 q4 -20 3 -40 h-50 q1 20 -3 40 q-1 6 -6 8 q-6 2 -9 -6 q-5 -16 -5 -42z" fill="${c}"/>`;
    case 'wavy':return `<path d="M10 58 q0 -50 40 -50 q40 0 40 50 v10 q0 24 -4 38 q-4 9 -9 2 q-4 -5 -1 -12 q5 -14 4 -30 h-50 q1 16 4 30 q3 7 -1 12 q-5 7 -9 -2 q-4 -14 -4 -38z" fill="${c}"/>`;
    case 'wolfcut':return `<path d="M10 58 q0 -50 40 -50 q40 0 40 50 v30 l-7 10 l-6 -10 l-7 10 l-6 -10 l-7 10 l-7 -10 l-7 10 l-6 -10 l-7 10 l-6 -10 l-7 10 l-7 -10z" fill="${c}"/>`;
    case 'hime':return `<path d="M10 58 q0 -50 40 -50 q40 0 40 50 v62 h-14 v-48 h-52 v48 h-14z" fill="${c}"/>`;
    case 'ponytail':return dome+`<path d="M86 50 q20 8 14 40 q-4 12 -12 10 q6 -22 -6 -40z" fill="${c}"/>`;
    case 'bun':return dome+`<circle cx="50" cy="6" r="13" fill="${c}"/>`;
    case 'spacebuns':return dome+`<circle cx="14" cy="14" r="13" fill="${c}"/><circle cx="86" cy="14" r="13" fill="${c}"/>`;
    case 'twintails':return dome+`<path d="M12 50 q-18 12 -10 48 q8 -6 14 2 q6 -26 4 -50z M88 50 q18 12 10 48 q-8 -6 -14 2 q-6 -26 -4 -50z" fill="${c}"/><circle cx="12" cy="56" r="5" fill="#ff8ab8"/><circle cx="88" cy="56" r="5" fill="#ff8ab8"/>`;
    case 'braid':return `<path d="M10 58 q0 -50 40 -50 q40 0 40 50 v20 q0 8 -8 8 h-64 q-8 0 -8 -8z" fill="${c}"/><path d="M80 60 q14 12 8 40 q-2 12 -10 14 q6 -18 -2 -36z" fill="${c}"/><path d="M82 70 l5 4 M80 82 l5 4 M78 94 l5 4" stroke="rgba(0,0,0,.3)" stroke-width="2.5"/>`;
    case 'afro':return `<circle cx="50" cy="40" r="46" fill="${c}"/><circle cx="14" cy="50" r="14" fill="${c}"/><circle cx="86" cy="50" r="14" fill="${c}"/><circle cx="26" cy="12" r="14" fill="${c}"/><circle cx="74" cy="12" r="14" fill="${c}"/>`;
    case 'curly':return `<path d="M8 58 q0 -52 42 -52 q42 0 42 52 q6 10 -2 18 q-8 6 -12 -2 q-6 10 -14 4 q-8 8 -14 0 q-8 8 -14 0 q-8 8 -14 -2 q-8 6 -12 -4 q-8 -6 0 -14z" fill="${c}"/>`;
    default:return dome;
  }
}
function hairFront(style,c){
  const short=`<path d="${CAP} Q84 46 76 48 Q68 36 60 46 Q52 34 44 46 Q36 36 28 48 Q18 46 10 56z" fill="${c}"/><path d="${SIDES}" fill="${c}"/>`;
  const straight=`<path d="${CAP} L86 48 Q50 40 14 48z" fill="${c}"/><path d="${SIDES}" fill="${c}"/>`;
  const swept=`<path d="${CAP} Q80 44 62 46 Q40 40 20 50z" fill="${c}"/><path d="${SIDES}" fill="${c}"/>`;
  switch(style){
    case 'buzz':return `<path d="M14 50 Q14 14 50 14 Q86 14 86 50 Q50 40 14 50z" fill="${c}" opacity=".75"/>`;
    case 'bob':case 'long':case 'wavy':case 'wolfcut':case 'braid':return straight;
    case 'hime':return `<path d="${CAP} L86 46 Q50 40 14 46z" fill="${c}"/><path d="M10 48 v34 h12 v-30z M90 48 v34 h-12 v-30z" fill="${c}"/>`;
    case 'ponytail':case 'bun':case 'spacebuns':return swept;
    case 'curly':return `<path d="${CAP} q-5 -8 -10 0 q-5 -8 -10 0 q-5 -8 -10 0 q-5 -8 -10 0 q-5 -8 -10 0 q-5 -8 -10 0 q-5 -8 -10 0 q-5 -8 -10 0z" fill="${c}"/><path d="${SIDES}" fill="${c}"/>`;
    case 'spiky':return `<path d="M12 40 l6 -26 l10 14 l6 -24 l8 16 l8 -22 l8 16 l6 -22 l8 16 l6 -18 l6 26 v14 Q50 40 12 54z" fill="${c}"/><path d="${SIDES}" fill="${c}"/>`;
    case 'mohawk':return `<path d="M14 50 Q14 14 50 14 Q86 14 86 50 Q50 40 14 50z" fill="${c}" opacity=".35"/><path d="M40 36 l3 -34 l7 12 l7 -12 l3 34z" fill="${c}"/>`;
    case 'afro':return short;
    default:return short;
  }
}
function eyes(style,mood){
  const L=35,R=65,Y=55;
  if(mood==='dead')return `<path d="M${L-7} ${Y-7} l14 14 m0 -14 l-14 14 M${R-7} ${Y-7} l14 14 m0 -14 l-14 14" stroke="#1a1020" stroke-width="3.5" stroke-linecap="round" fill="none"/>`;
  if(mood==='angry')return `<ellipse cx="${L}" cy="${Y}" rx="8" ry="8" fill="#fff"/><ellipse cx="${R}" cy="${Y}" rx="8" ry="8" fill="#fff"/><circle cx="${L+1}" cy="${Y+1}" r="4.5" fill="#c22b3a"/><circle cx="${R-1}" cy="${Y+1}" r="4.5" fill="#c22b3a"/><path d="M${L-10} ${Y-13} l18 6 M${R+10} ${Y-13} l-18 6" stroke="#1a1020" stroke-width="3.5" stroke-linecap="round"/>`;
  if(mood==='glow')return `<circle cx="${L}" cy="${Y}" r="8" fill="#ffd166"/><circle cx="${R}" cy="${Y}" r="8" fill="#ffd166"/><circle cx="${L}" cy="${Y}" r="3" fill="#1a1020"/><circle cx="${R}" cy="${Y}" r="3" fill="#1a1020"/>`;
  const lash=`<path d="M${L-9} ${Y-9} q9 -7 18 0 M${R-9} ${Y-9} q9 -7 18 0" stroke="#2a1a14" stroke-width="2.5" fill="none" stroke-linecap="round"/>`;
  if(style==='heart')return `<path d="M${L} ${Y+9} l-11 -11 a6.5 6.5 0 0 1 11 -7 a6.5 6.5 0 0 1 11 7z M${R} ${Y+9} l-11 -11 a6.5 6.5 0 0 1 11 -7 a6.5 6.5 0 0 1 11 7z" fill="#ff5a8a"/><circle cx="${L-4}" cy="${Y-6}" r="2" fill="#fff"/><circle cx="${R-4}" cy="${Y-6}" r="2" fill="#fff"/>`;
  if(style==='star')return `<path d="M${L} ${Y-11} l3.5 8 l8.5 0.5 l-6.5 5.5 l2.5 8.5 l-8 -5 l-8 5 l2.5 -8.5 l-6.5 -5.5 l8.5 -0.5z M${R} ${Y-11} l3.5 8 l8.5 0.5 l-6.5 5.5 l2.5 8.5 l-8 -5 l-8 5 l2.5 -8.5 l-6.5 -5.5 l8.5 -0.5z" fill="#ffd166"/><circle cx="${L}" cy="${Y+1}" r="2.5" fill="#1a1020"/><circle cx="${R}" cy="${Y+1}" r="2.5" fill="#1a1020"/>`;
  if(style==='sleepy')return `<path d="M${L-9} ${Y+1} q9 8 18 0 M${R-9} ${Y+1} q9 8 18 0" stroke="#2a1a14" stroke-width="3.5" fill="none" stroke-linecap="round"/>`+lash;
  if(style==='cat')return `<ellipse cx="${L}" cy="${Y}" rx="9" ry="11" fill="#ffd166"/><ellipse cx="${R}" cy="${Y}" rx="9" ry="11" fill="#ffd166"/><ellipse cx="${L}" cy="${Y}" rx="2.6" ry="9" fill="#1a1020"/><ellipse cx="${R}" cy="${Y}" rx="2.6" ry="9" fill="#1a1020"/><circle cx="${L-3}" cy="${Y-5}" r="2" fill="#fff"/><circle cx="${R-3}" cy="${Y-5}" r="2" fill="#fff"/>`+lash;
  if(style==='almond')return `<path d="M${L-11} ${Y+1} q11 -14 22 0 q-11 10 -22 0z M${R-11} ${Y+1} q11 -14 22 0 q-11 10 -22 0z" fill="#fff"/><circle cx="${L+1}" cy="${Y}" r="5.5" fill="#2a1a14"/><circle cx="${R-1}" cy="${Y}" r="5.5" fill="#2a1a14"/><circle cx="${L-1}" cy="${Y-2.5}" r="2" fill="#fff"/><circle cx="${R-3}" cy="${Y-2.5}" r="2" fill="#fff"/>`+lash;
  if(style==='sparkle')return `<ellipse cx="${L}" cy="${Y}" rx="9.5" ry="11.5" fill="#fff"/><ellipse cx="${R}" cy="${Y}" rx="9.5" ry="11.5" fill="#fff"/><ellipse cx="${L+0.5}" cy="${Y+1}" rx="7" ry="9" fill="#3a5aa8"/><ellipse cx="${R-0.5}" cy="${Y+1}" rx="7" ry="9" fill="#3a5aa8"/><ellipse cx="${L+0.5}" cy="${Y+3}" rx="4" ry="5.5" fill="#1a1020"/><ellipse cx="${R-0.5}" cy="${Y+3}" rx="4" ry="5.5" fill="#1a1020"/><circle cx="${L-3}" cy="${Y-4}" r="3.2" fill="#fff"/><circle cx="${R-3}" cy="${Y-4}" r="3.2" fill="#fff"/><circle cx="${L+4}" cy="${Y+5}" r="1.6" fill="#fff"/><circle cx="${R+4}" cy="${Y+5}" r="1.6" fill="#fff"/>`+lash;
  return `<ellipse cx="${L}" cy="${Y}" rx="9" ry="11" fill="#fff"/><ellipse cx="${R}" cy="${Y}" rx="9" ry="11" fill="#fff"/><ellipse cx="${L+0.5}" cy="${Y+1}" rx="6" ry="8.5" fill="#2a1a14"/><ellipse cx="${R-0.5}" cy="${Y+1}" rx="6" ry="8.5" fill="#2a1a14"/><circle cx="${L-2.5}" cy="${Y-3}" r="2.6" fill="#fff"/><circle cx="${R-2.5}" cy="${Y-3}" r="2.6" fill="#fff"/><circle cx="${L+3}" cy="${Y+4}" r="1.3" fill="#fff"/><circle cx="${R+3}" cy="${Y+4}" r="1.3" fill="#fff"/>`+lash;
}
/* Facial hair. Requested by one of her friends, and the avatar had no way to
   read as masculine at all beyond a buzz cut - every option was hair, eyes and
   clothes. The head is an ellipse at cx50 cy49 rx31.5 ry30, so the face runs
   x18.5-81.5 and y19-79 and every shape below is drawn to that jaw. It renders
   under the mouth, so lips still show through a full beard. */
const BEARDS={'':'Clean shaven',stubble:'Stubble',moustache:'Moustache',goatee:'Goatee',
  chops:'Mutton chops',boxed:'Boxed beard',full:'Full beard'};
const BEARD_KEYS=Object.keys(BEARDS);
function beard(kind,c){
  if(!kind||!BEARDS[kind])return '';
  const jaw='M21 55 q1 25 29 25 q28 0 29 -25';
  // Geometry notes, learned the hard way by rendering a contact sheet:
  // the eyes run x32-68 / y50-60 and the mouth is y69-74. Anything narrower
  // than the eye span sitting at y62 reads as a NOSE, not a moustache, because
  // it lands in the gap between two huge chibi eyes. A moustache has to be
  // WIDER than the eyes and finish above 69, or it swallows the mouth.
  const mo='M31 61 q19 -6 38 0 q-2 8 -9 7 q-5 -1 -10 -2 q-5 1 -10 2 q-7 1 -9 -7z';
  switch(kind){
    case 'stubble':
      return `<path d="${jaw} q-5 14 -29 14 q-24 0 -29 -14z" fill="${c}" opacity=".38"/>`;
    case 'moustache':
      return `<path d="${mo}" fill="${c}"/>`;
    case 'goatee':
      // Chin patch stays ON the chin (jaw bottoms out at y79) - any lower and
      // it dangles onto the neck like a goat's actual beard.
      return `<path d="M36 62 q14 -5 28 0 q-2 7 -8 6 q-6 -1 -6 -1 q0 0 -6 1 q-6 1 -8 -6z" fill="${c}"/>`
        +`<path d="M43 71 q7 -3 14 0 q-1 7 -7 8 q-6 -1 -7 -8z" fill="${c}"/>`;
    case 'chops':
      // Sideburns: start at the hairline, hug the head curve down to the jaw,
      // and widen onto the CHEEK as they go. Hugging the edge only, they
      // disappear under the fringe; as a thin spike they read as fangs.
      return `<path d="M22 44 q0 18 8 30 q8 2 12 -3 q-10 -6 -14 -15 q-4 -7 -6 -12z" fill="${c}"/>`
        +`<path d="M78 44 q0 18 -8 30 q-8 2 -12 -3 q10 -6 14 -15 q4 -7 6 -12z" fill="${c}"/>`;
    case 'boxed':
      return `<path d="${jaw} q-4 11 -13 14 v-9 q-16 5 -32 0 v9 q-9 -3 -13 -14z" fill="${c}"/>`
        +`<path d="${mo}" fill="${c}"/>`;
    case 'full':
      return `<path d="M20 50 q0 22 8 32 q6 8 22 8 q16 0 22 -8 q8 -10 8 -32 q-4 16 -12 20 v-6 q-18 7 -36 0 v6 q-8 -4 -12 -20z" fill="${c}"/>`
        +`<path d="${mo}" fill="${c}"/>`;
  }
  return '';
}
function mouth(mood){
  if(mood==='dead')return `<path d="M42 72 q8 -5 16 0" stroke="#1a1020" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M45 68 l3 7 M52 68 l3 7" stroke="#1a1020" stroke-width="2"/>`;
  if(mood==='scream')return `<ellipse cx="50" cy="73" rx="7" ry="8" fill="#3a0a10"/><path d="M45 68 h10" stroke="#fff" stroke-width="2"/>`;
  if(mood==='angry')return `<path d="M42 73 q8 -6 16 0" stroke="#1a1020" stroke-width="2.5" fill="none" stroke-linecap="round"/>`;
  return `<path d="M45 69 q5 5 10 0" stroke="#7a3a3a" stroke-width="2.5" fill="none" stroke-linecap="round"/>`;
}
// The torso was a rounded rectangle, which is why everyone read as boxy. This
// is a real silhouette: shoulders, a waist, hips. `build` chooses the numbers,
// so it is one shape function rather than three sets of hand-drawn clothes.
const BUILDS={
  neutral:{sh:40,wa:37,hip:40,name:'Straight'},
  curvy:  {sh:36,wa:28,hip:46,name:'Curvy'},
  athletic:{sh:43,wa:33,hip:37,name:'Athletic'},
  slim:   {sh:32,wa:27,hip:33,name:'Slim'},
};
let AV_BUILD='neutral';
function setBuild(b){if(BUILDS[b])AV_BUILD=b;}
function buildOf(av){return BUILDS[(av&&av.build)||AV_BUILD]||BUILDS.neutral;}
// y76 shoulders -> y95 waist -> y110 hips
function torsoSil(b,pad){
  pad=pad||0;
  const S=b.sh/2+pad, W=b.wa/2+pad, H=b.hip/2+pad;
  const r=Math.min(8,S-2);
  return `M${(50-S).toFixed(1)} 83 q0 -7 ${r} -7 h${(2*S-2*r).toFixed(1)} q${r} 0 ${r} 7`
    +` C${(50+S).toFixed(1)} 89 ${(50+W).toFixed(1)} 90 ${(50+W).toFixed(1)} 96`
    +` C${(50+W).toFixed(1)} 102 ${(50+H).toFixed(1)} 103 ${(50+H).toFixed(1)} 109`
    +` q0 5 -6 5 h${(-(2*H-12)).toFixed(1)} q-6 0 -6 -5`
    +` C${(50-H).toFixed(1)} 103 ${(50-W).toFixed(1)} 102 ${(50-W).toFixed(1)} 96`
    +` C${(50-W).toFixed(1)} 90 ${(50-S).toFixed(1)} 89 ${(50-S).toFixed(1)} 83z`;
}
let TOP_AV=null;
function topShape(top,c){
  const bd=buildOf(TOP_AV);
  const base=`<path d="${torsoSil(bd)}" fill="${c}"/>`;
  const t=TOPS[top];
  if(t&&t.kind==='dress'){const w=t.gown?60:52;const S=bd.sh/2,W=bd.wa/2;
    let s=`<path d="M${50-S} 83 q0 -7 7 -7 h${2*S-14} q7 0 7 7 C${50+S} 89 ${50+W} 90 ${50+W} 96 L${50+w/2} 118 h${-w} L${50-W} 96 C${50-W} 90 ${50-S} 89 ${50-S} 83z" fill="${t.c1}"/><path d="M40 76 q10 6 20 0" stroke="rgba(0,0,0,.25)" stroke-width="3" fill="none"/>`;
    if(t.dots)s+=`<circle cx="42" cy="90" r="2" fill="${t.dots}"/><circle cx="56" cy="98" r="2" fill="${t.dots}"/><circle cx="48" cy="106" r="2" fill="${t.dots}"/><circle cx="60" cy="110" r="2" fill="${t.dots}"/>`;
    if(t.plaid)s+=`<path d="M30 88 h40 M28 100 h44 M42 76 v40 M56 76 v40" stroke="rgba(0,0,0,.35)" stroke-width="2"/><rect x="40" y="76" width="20" height="10" fill="#f6f2ea"/>`;
    if(t.cross)s+=`<rect x="44" y="84" width="12" height="12" fill="#fff" stroke="#ddd"/><path d="M50 86 v8 M46 90 h8" stroke="#c22b3a" stroke-width="2.4"/><path d="M32 76 h36" stroke="#5fb3c9" stroke-width="4"/>`;
    if(t.gown)s+=`<path d="M25 116 q25 -10 50 0" stroke="#fff" stroke-width="2" fill="none" opacity=".7"/><path d="M50 78 l3 6 l6 1 l-4 4 l1 6 l-6 -3 l-6 3 l1 -6 l-4 -4 l6 -1z" fill="#fff" opacity=".9"/><path d="M27 104 q23 -8 46 0" stroke="#fff" stroke-width="1.5" fill="none" opacity=".5"/>`;
    return s;}
  if(t&&t.kind==='onesie'){let s=`<path d="${torsoSil(bd,3)}" fill="${t.base}"/><ellipse cx="50" cy="98" rx="12" ry="13" fill="${t.belly}"/><path d="M50 78 v12" stroke="rgba(0,0,0,.25)" stroke-width="2"/>`;
    if(t.pat==='cow')s+=`<ellipse cx="35" cy="86" rx="5" ry="4" fill="#2c2c36"/><ellipse cx="64" cy="102" rx="5" ry="4" fill="#2c2c36"/>`;
    if(t.teeth)s+=`<path d="M40 80 l3 5 l3 -5 l3 5 l3 -5 l3 5 l3 -5 l3 5 l3 -5" stroke="#fff" stroke-width="2" fill="none"/>`;
    if(t.bolt)s+=`<path d="M52 84 l-6 10 h5 l-3 9 l8 -12 h-5 l3 -7z" fill="#8a5a1a"/>`;
    if(t.ribs)s+=`<path d="M50 80 v27" stroke="#e8e0d0" stroke-width="2.5"/><path d="M41 85 q9 -4 18 0 M40 91 q10 -4 20 0 M41 97 q9 -4 18 0 M43 103 q7 -3 14 0" stroke="#e8e0d0" stroke-width="2.6" fill="none" stroke-linecap="round"/>`;
    if(t.flame)s+=`<path d="M50 84 q-6 6 0 12 q6 -6 0 -12z" fill="#ff5a3a"/><path d="M50 88 q-3 3 0 6 q3 -3 0 -6z" fill="#ffd166"/>`;
    return s;}
  switch(top){
    case 'varsity':return `<rect x="30" y="76" width="40" height="32" rx="9" fill="#2a3a6a"/><rect x="30" y="80" width="10" height="26" rx="5" fill="#e8e0d0"/><rect x="60" y="80" width="10" height="26" rx="5" fill="#e8e0d0"/><text x="50" y="98" font-size="10" text-anchor="middle" fill="#e8e0d0" font-family="sans-serif" font-weight="700">H</text>`;
    case 'raincoat':return `<rect x="28" y="76" width="44" height="34" rx="10" fill="#f2c230"/><path d="M50 76 v34" stroke="#c99a10" stroke-width="2"/><circle cx="50" cy="86" r="1.8" fill="#8a6a00"/><circle cx="50" cy="96" r="1.8" fill="#8a6a00"/>`;
    case 'biker':return `<rect x="30" y="76" width="40" height="32" rx="9" fill="#1a1a1e"/><path d="M40 76 l10 14 l10 -14" stroke="#555" stroke-width="2" fill="none"/><path d="M34 84 h8 M58 84 h8" stroke="#bbb" stroke-width="2"/>`;
    case 'scrubs':return `<rect x="30" y="76" width="40" height="32" rx="9" fill="#5fb3c9"/><path d="M42 76 l8 8 l8 -8" stroke="#3a7a8a" stroke-width="2" fill="none"/><rect x="56" y="88" width="9" height="9" rx="1" fill="#e8f4f8"/><path d="M60.5 89.5 v6 M57.5 92.5 h6" stroke="#c22b3a" stroke-width="1.6"/>`;
    case 'flannel':return `<rect x="30" y="76" width="40" height="32" rx="9" fill="#a83a2a"/><path d="M30 86 h40 M30 96 h40 M40 76 v32 M50 76 v32 M60 76 v32" stroke="#4a1a14" stroke-width="2" opacity=".6"/>`;
    case 'tux':return `<rect x="30" y="76" width="40" height="32" rx="9" fill="#1a1a1e"/><path d="M42 76 l8 12 l8 -12z" fill="#fff"/><path d="M46 80 l4 4 l4 -4 l-4 -2z" fill="#c22b3a"/>`;
    case 'sweater':return `<rect x="28" y="76" width="44" height="34" rx="11" fill="#d9b48a"/><path d="M28 86 h44 M28 94 h44 M28 102 h44" stroke="rgba(0,0,0,.12)" stroke-width="3"/><path d="M40 76 q10 8 20 0" stroke="#b58a5a" stroke-width="4" fill="none"/>`;
    case 'overalls':return `<rect x="30" y="76" width="40" height="32" rx="9" fill="#f2c230"/><rect x="34" y="84" width="32" height="24" rx="4" fill="#3a5a8a"/><rect x="36" y="76" width="6" height="12" fill="#3a5a8a"/><rect x="58" y="76" width="6" height="12" fill="#3a5a8a"/><rect x="44" y="92" width="12" height="8" rx="2" fill="#2a4a7a"/>`;
    case 'sailor':return `<rect x="30" y="76" width="40" height="32" rx="9" fill="#f6f2ea"/><path d="M30 76 h40 l-10 14 h-20z" fill="#2a3a6a"/><path d="M46 84 l4 6 l4 -6" fill="#c22b3a"/><path d="M30 104 h40" stroke="#2a3a6a" stroke-width="3"/>`;
    case 'sundress':return `<path d="M32 76 h36 l6 40 h-48z" fill="#ff8ab8"/><circle cx="42" cy="90" r="2" fill="#fff"/><circle cx="56" cy="98" r="2" fill="#fff"/><circle cx="48" cy="106" r="2" fill="#fff"/><path d="M40 76 q10 6 20 0" stroke="#c9557f" stroke-width="3" fill="none"/>`;
    case 'pajamas':return `<rect x="30" y="76" width="40" height="32" rx="9" fill="#5fb3c9"/><circle cx="40" cy="84" r="2.5" fill="#fff"/><circle cx="60" cy="88" r="2.5" fill="#fff"/><circle cx="46" cy="98" r="2.5" fill="#fff"/><circle cx="58" cy="102" r="2.5" fill="#fff"/><path d="M50 78 v28" stroke="rgba(255,255,255,.5)" stroke-width="2"/>`;
    case 'labcoat':return `<rect x="28" y="76" width="44" height="36" rx="8" fill="#f6f2ea"/><path d="M42 76 l8 10 l8 -10" stroke="#5fb3c9" stroke-width="3" fill="none"/><rect x="54" y="90" width="10" height="8" fill="#5fb3c9"/><path d="M50 86 v26" stroke="#ddd" stroke-width="1.5"/>`;
    case 'skeleton':return `<rect x="30" y="76" width="40" height="32" rx="9" fill="#1a1a1e"/><path d="M50 78 v28 M36 84 h28 M38 92 h24 M40 100 h20" stroke="#e8e0d0" stroke-width="3" stroke-linecap="round"/>`;
    default:return base+`<path d="M38 76 q12 8 24 0" stroke="rgba(0,0,0,.25)" stroke-width="3" fill="none"/>`;
  }
}
function hatShape(hat,hairC){const g=hatRaw(hat,hairC);return g?`<g transform="translate(50,40) scale(1.14) translate(-50,-42)">${g}</g>`:'';}
function hatRaw(hat,hairC){
  switch(hat){
    case 'streakband':return `<path d="M18 38 q32 -8 64 0 v8 q-32 -6 -64 0z" fill="#ff5a6a"/><path d="M80 44 l12 -6 l-2 11z" fill="#ff5a6a"/><path d="M22 41 q28 -5 56 0" stroke="#ffd166" stroke-width="2" fill="none"/>`;
    case 'beanie':return `<path d="M20 40 q2 -26 30 -26 q28 0 30 26 v4 h-60z" fill="#c22b3a"/><rect x="18" y="38" width="64" height="9" rx="4" fill="#8a1a26"/><circle cx="50" cy="13" r="5" fill="#e8e0d0"/>`;
    case 'cap':return `<path d="M20 40 q2 -26 30 -26 q28 0 30 26 v2 h-60z" fill="#2a3a6a"/><path d="M14 42 h56 q4 0 4 4 q-30 -4 -60 0 q0 -4 0 -4z" fill="#1a2a5a"/>`;
    case 'cowboy':return `<path d="M26 40 q2 -20 24 -20 q22 0 24 20z" fill="#6a4a2a"/><path d="M8 42 q42 -6 84 0 q-6 8 -42 8 q-36 0 -42 -8z" fill="#5a3a1a"/><path d="M26 38 h48" stroke="#2a1a0a" stroke-width="3"/>`;
    case 'catears':return `<path d="M22 40 l6 -26 l16 16z M78 40 l-6 -26 l-16 16z" fill="#3a3a44"/><path d="M27 36 l4 -14 l9 10z M73 36 l-4 -14 l-9 10z" fill="#ff8ab8"/><path d="M20 42 q2 -24 30 -24 q28 0 30 24 v4 h-60z" fill="#3a3a44"/>`;
    case 'bandana':return `<path d="M20 42 q2 -24 30 -24 q28 0 30 24 v2 h-60z" fill="#c22b3a"/><path d="M78 42 l10 -8 l-4 12z" fill="#c22b3a"/>`;
    case 'halo':return `<ellipse cx="50" cy="8" rx="20" ry="5" fill="none" stroke="#ffd166" stroke-width="3"/>`;
    case 'crown':return `<path d="M28 40 v-14 l8 8 l8 -12 l6 12 l6 -12 l8 12 l8 -8 v14z" fill="#e6a530"/><circle cx="50" cy="30" r="2.5" fill="#c22b3a"/>`;
    case 'beret':return `<path d="M18 40 q6 -24 36 -22 q28 2 30 20 q-6 -4 -14 -1 q-16 -6 -34 0 q-10 -2 -18 3z" fill="#c22b3a"/><circle cx="52" cy="17" r="3" fill="#8a1a26"/>`;
    case 'bunny':return `<path d="M28 40 q-8 -40 4 -46 q10 4 8 44z M72 40 q8 -40 -4 -46 q-10 4 -8 44z" fill="#f6f2ea"/><path d="M31 36 q-4 -28 2 -34 q4 6 4 32z M69 36 q4 -28 -2 -34 q-4 6 -4 32z" fill="#ff8ab8"/>`;
    case 'flowers':return `<path d="M18 40 q32 -10 64 0" stroke="#4a7a2a" stroke-width="4" fill="none"/><circle cx="24" cy="40" r="5" fill="#ff8ab8"/><circle cx="38" cy="35" r="5" fill="#ffd166"/><circle cx="52" cy="33" r="5" fill="#ff8ab8"/><circle cx="66" cy="35" r="5" fill="#fff"/><circle cx="78" cy="40" r="5" fill="#ffd166"/>`;
    case 'headphones':return `<path d="M18 48 q0 -36 32 -36 q32 0 32 36" stroke="#3a3a44" stroke-width="5" fill="none"/><rect x="12" y="42" width="12" height="18" rx="4" fill="#3a3a44"/><rect x="76" y="42" width="12" height="18" rx="4" fill="#3a3a44"/><rect x="14" y="46" width="8" height="10" rx="2" fill="#ff8ab8"/><rect x="78" y="46" width="8" height="10" rx="2" fill="#ff8ab8"/>`;
    case 'party':return `<path d="M50 -2 l16 44 h-32z" fill="#7a4aa8"/><path d="M42 30 h16 M38 40 h24" stroke="#ffd166" stroke-width="3"/><circle cx="50" cy="0" r="4" fill="#ff8ab8"/>`;
    case 'bearhood':return `<path d="M16 44 q2 -32 34 -32 q32 0 34 32 v4 h-68z" fill="#8a6a4a"/><circle cx="22" cy="18" r="10" fill="#8a6a4a"/><circle cx="78" cy="18" r="10" fill="#8a6a4a"/><circle cx="22" cy="18" r="5" fill="#d9b48a"/><circle cx="78" cy="18" r="5" fill="#d9b48a"/>`;
    case 'tiara':return `<path d="M26 40 v-8 l8 4 l8 -12 l8 8 l8 -8 l8 12 l8 -4 v8z" fill="#e8e0d0"/><circle cx="50" cy="28" r="3" fill="#5aa9e6"/><circle cx="34" cy="34" r="2" fill="#ff8ab8"/><circle cx="66" cy="34" r="2" fill="#ff8ab8"/>`;
    case 'witch':return `<path d="M16 44 q34 -6 68 0 q-4 6 -34 6 q-30 0 -34 -6z" fill="#1a1a1e"/><path d="M28 42 l18 -40 l16 40z" fill="#1a1a1e"/><path d="M30 40 h40" stroke="#7a4aa8" stroke-width="4"/>`;
    case 'pumpkin':return `<ellipse cx="50" cy="46" rx="36" ry="30" fill="#e8842a"/><path d="M50 16 v-10" stroke="#4a7a2a" stroke-width="5" stroke-linecap="round"/><path d="M30 40 l8 -8 l4 8z M70 40 l-8 -8 l-4 8z" fill="#1a1a1e"/><path d="M34 56 l6 6 l6 -6 l4 6 l4 -6 l6 6 l6 -6" stroke="#1a1a1e" stroke-width="3" fill="none"/>`;
    case 'helmet':return `<path d="M18 44 q2 -30 32 -30 q30 0 32 30 v2 h-64z" fill="#3a7ad6"/><path d="M18 44 h64" stroke="#1a3a7a" stroke-width="3"/><path d="M30 24 q20 -10 40 0" stroke="#fff" stroke-width="2" fill="none" opacity=".5"/>`;
    default:return '';
  }
}
function accShape(acc){
  switch(acc){
    case 'glasses':return `<circle cx="35" cy="55" r="11" fill="none" stroke="#2a1a14" stroke-width="2.2"/><circle cx="65" cy="55" r="11" fill="none" stroke="#2a1a14" stroke-width="2.2"/><path d="M46 55 h8" stroke="#2a1a14" stroke-width="2.2"/>`;
    case 'shades':return `<path d="M23 49 h24 v10 q-12 7 -24 0z M53 49 h24 v10 q-12 7 -24 0z" fill="#1a1a1e"/><path d="M47 51 h6" stroke="#1a1a1e" stroke-width="2"/>`;
    case 'scarf':return `<rect x="28" y="76" width="44" height="11" rx="5" fill="#c22b3a"/><rect x="32" y="79" width="36" height="2.5" fill="#e8e0d0"/><rect x="60" y="84" width="10" height="22" rx="4" fill="#c22b3a"/>`;
    case 'eyepatch':return `<ellipse cx="65" cy="55" rx="10" ry="9" fill="#1a1a1e"/><path d="M14 40 q36 -8 76 10" stroke="#1a1a1e" stroke-width="2.2" fill="none"/>`;
    case 'mask':return `<path d="M22 58 q28 -16 56 0 v14 q-28 14 -56 0z" fill="#3a3a44"/><circle cx="37" cy="66" r="6" fill="#8a8a94"/><circle cx="63" cy="66" r="6" fill="#8a8a94"/>`;
    case 'bandaid':return `<rect x="62" y="64" width="16" height="7" rx="2.5" fill="#d9b48a" transform="rotate(-20 70 67)"/><path d="M65 67 h10" stroke="#c9a070" stroke-width="1.2" transform="rotate(-20 70 67)"/>`;
    case 'choker':return `<rect x="32" y="79" width="36" height="5" rx="2.5" fill="#1a1a1e"/><circle cx="50" cy="81.5" r="2.8" fill="#ff8ab8"/>`;
    case 'stars':return `<path d="M35 43 l4 9 l9 0.5 l-7 6 l2.5 9 l-8.5 -5.5 l-8.5 5.5 l2.5 -9 l-7 -6 l9 -0.5z M65 43 l4 9 l9 0.5 l-7 6 l2.5 9 l-8.5 -5.5 l-8.5 5.5 l2.5 -9 l-7 -6 l9 -0.5z" fill="none" stroke="#ff8ab8" stroke-width="2.5"/><path d="M46 54 h8" stroke="#ff8ab8" stroke-width="2"/>`;
    case 'flower':return `<circle cx="80" cy="22" r="8" fill="#ff8ab8"/><circle cx="80" cy="22" r="3.5" fill="#ffd166"/>`;
    case 'blush':return `<circle cx="24" cy="66" r="8" fill="#ff8ab8" opacity=".55"/><circle cx="76" cy="66" r="8" fill="#ff8ab8" opacity=".55"/>`;
    case 'freckles':return `<circle cx="22" cy="64" r="1.3" fill="#a8704a"/><circle cx="28" cy="68" r="1.3" fill="#a8704a"/><circle cx="20" cy="70" r="1.3" fill="#a8704a"/><circle cx="78" cy="64" r="1.3" fill="#a8704a"/><circle cx="72" cy="68" r="1.3" fill="#a8704a"/><circle cx="80" cy="70" r="1.3" fill="#a8704a"/>`;
    case 'wings':return `<path d="M30 86 q-28 -22 -30 4 q10 -6 15 4 q6 -8 15 0z M70 86 q28 -22 30 4 q-10 -6 -15 4 q-6 -8 -15 0z" fill="#2a1a3a" stroke="#7a4aa8" stroke-width="1.5"/>`;
    default:return '';
  }
}
// av = {skin,hair,hairColor,eyes,top,topColor,hat,acc}
let AV_STYLE='sticker';
function setStyle(s){AV_STYLE=s;}
function bodyParts(style,skin,tc,top,weapon){
  // returns {back, body} : back = things drawn behind the head (legs, torso, arms), body-level sleeves included
  const wpn=weapon==='melee'?`<path d="M75 100 l14 -30" stroke="#7a5a3a" stroke-width="5" stroke-linecap="round"/><path d="M87 74 l4 -8" stroke="#555" stroke-width="7" stroke-linecap="round"/>`:weapon==='gun'?`<rect x="73" y="90" width="20" height="7" rx="2" fill="#333"/><rect x="75" y="96" width="6" height="8" rx="2" fill="#333"/>`:'';
  const dressy=['sundress','onesie'].includes(top)||String(top).startsWith('dress')||String(top).startsWith('onesie');
  if(style==='plush'){
    const legs=`<rect x="37" y="100" width="12" height="18" rx="6" fill="${dressy?skin:'#2a2a30'}"/><rect x="51" y="100" width="12" height="18" rx="6" fill="${dressy?skin:'#2a2a30'}"/><path d="M34 114 h16 v8 q0 4 -4 4 h-8 q-4 0 -4 -4z M50 114 h16 v8 q0 4 -4 4 h-8 q-4 0 -4 -4z" fill="#1a1a1e"/>`;
    const arms=`<rect x="19" y="80" width="13" height="20" rx="6.5" fill="${tc}"/><rect x="68" y="80" width="13" height="20" rx="6.5" fill="${tc}"/><circle cx="25.5" cy="101" r="5.5" fill="${skin}"/><circle cx="74.5" cy="101" r="5.5" fill="${skin}"/>`;
    return {back:legs+topShape(top,tc)+arms+wpn,head:`<path d="M12 50 q0 -40 38 -40 q38 0 38 40 v8 q0 24 -38 24 q-38 0 -38 -24z" fill="${skin}"/><ellipse cx="25" cy="67" rx="7" ry="4.5" fill="#ff8ab8" opacity=".5"/><ellipse cx="75" cy="67" rx="7" ry="4.5" fill="#ff8ab8" opacity=".5"/><path d="M48 63 q2 2 4 0" stroke="#d09080" stroke-width="1.6" fill="none" stroke-linecap="round"/>`};
  }
  if(style==='bean'){
    const o='stroke="#2a1a14" stroke-width="1.6"';
    const legs=`<rect x="39" y="98" width="10" height="16" rx="5" fill="${dressy?skin:'#2a2a30'}" ${o}/><rect x="51" y="98" width="10" height="16" rx="5" fill="${dressy?skin:'#2a2a30'}" ${o}/><ellipse cx="43" cy="116" rx="8" ry="4" fill="#1a1a1e" ${o}/><ellipse cx="57" cy="116" rx="8" ry="4" fill="#1a1a1e" ${o}/>`;
    const torso=`<g ${o}>${topShape(top,tc).replace(/<rect x="30" y="76" width="40" height="32" rx="9"/g,'<rect x="33" y="78" width="34" height="26" rx="10"')}</g>`;
    const arms=`<rect x="23" y="80" width="11" height="17" rx="5.5" fill="${tc}" ${o}/><rect x="66" y="80" width="11" height="17" rx="5.5" fill="${tc}" ${o}/><circle cx="28.5" cy="98" r="4.5" fill="${skin}" ${o}/><circle cx="71.5" cy="98" r="4.5" fill="${skin}" ${o}/>`;
    return {back:legs+torso+arms+wpn,head:`<path d="M12 50 q0 -40 38 -40 q38 0 38 40 v6 q0 26 -38 26 q-38 0 -38 -26z" fill="${skin}" ${o}/><ellipse cx="24" cy="66" rx="6.5" ry="4" fill="#ff8ab8" opacity=".55"/><ellipse cx="76" cy="66" rx="6.5" ry="4" fill="#ff8ab8" opacity=".55"/><path d="M48 62 l2 2 l2 -2" stroke="#b07868" stroke-width="1.5" fill="none" stroke-linecap="round"/>`};
  }
  if(style==='sticker'){
    const o='stroke="#1e1418" stroke-width="2.6" stroke-linejoin="round"';const kind=outfitKind(top);const od=TOPS[top]||{};
    const legCol=kind==='onesie'?od.base:kind==='dress'?skin:'#2a2a30';
    const _lb=buildOf(TOP_AV);const _lg=Math.round(50-_lb.hip/4-6),_rg=Math.round(50+_lb.hip/4-6);
    const legs=kind==='onesie'?`<rect x="${_lg}" y="100" width="12" height="20" rx="6" fill="${od.base}" ${o}/><rect x="${_rg}" y="100" width="12" height="20" rx="6" fill="${od.base}" ${o}/><ellipse cx="42" cy="121" rx="9" ry="5" fill="${od.belly}" ${o}/><ellipse cx="58" cy="121" rx="9" ry="5" fill="${od.belly}" ${o}/>`
      :`<rect x="36" y="100" width="12" height="18" rx="6" fill="${legCol}" ${o}/><rect x="52" y="100" width="12" height="18" rx="6" fill="${legCol}" ${o}/><path d="M33 113 h17 v9 q0 4 -4 4 h-9 q-4 0 -4 -4z M50 113 h17 v9 q0 4 -4 4 h-9 q-4 0 -4 -4z" fill="${kind==='dress'?'#3a2a44':'#1a1a1e'}" ${o}/>`;
    const torso=`<g ${o}>${topShape(top,tc)}</g>`;
    const sleeve=kind==='onesie'?od.base:kind==='dress'?skin:tc;const hand=kind==='onesie'?od.belly:skin;
    const _b=buildOf(TOP_AV);const _ax=50-_b.sh/2-12,_bx=50+_b.sh/2-2;
    const arms=`<rect x="${_ax}" y="79" width="14" height="21" rx="7" fill="${sleeve}" ${o}/><rect x="${_bx}" y="79" width="14" height="21" rx="7" fill="${sleeve}" ${o}/><circle cx="${_ax+7}" cy="101" r="6" fill="${hand}" ${o}/><circle cx="${_bx+7}" cy="101" r="6" fill="${hand}" ${o}/>`;
    return {back:legs+torso+arms+`<g ${o}>${wpn}</g>`,head:`<path d="M12 50 q0 -40 38 -40 q38 0 38 40 v7 q0 25 -38 25 q-38 0 -38 -25z" fill="${skin}" ${o}/><ellipse cx="24" cy="67" rx="7" ry="4.5" fill="#ff8ab8" opacity=".6"/><ellipse cx="76" cy="67" rx="7" ry="4.5" fill="#ff8ab8" opacity=".6"/><path d="M20 26 l2 -5 l2 5 l5 2 l-5 2 l-2 5 l-2 -5 l-5 -2z" fill="#fff" opacity=".9"/>`};
  }
  // classic
  return {back:`<rect x="36" y="100" width="11" height="22" rx="5" fill="#2a2a30"/><rect x="53" y="100" width="11" height="22" rx="5" fill="#2a2a30"/><rect x="34" y="118" width="15" height="8" rx="4" fill="#1a1a1e"/><rect x="51" y="118" width="15" height="8" rx="4" fill="#1a1a1e"/>${topShape(top,tc)}<rect x="21" y="82" width="11" height="22" rx="5" fill="${skin}"/><rect x="68" y="82" width="11" height="22" rx="5" fill="${skin}"/>${wpn}`,
    head:`<path d="M12 50 q0 -40 38 -40 q38 0 38 40 v6 q0 26 -38 26 q-38 0 -38 -26z" fill="${skin}"/><circle cx="24" cy="66" r="6" fill="#ff8ab8" opacity=".45"/><circle cx="76" cy="66" r="6" fill="#ff8ab8" opacity=".45"/>`};
}
// The hood's clip shape is the SAME ellipse for every character, so one shared
// id is safe and, crucially, STABLE. It used to be a counter, which meant a
// hooded avatar produced a different SVG string on every single call - and
// spriteImg() caches on that string, so the road scene made a brand new Image
// 60 times a second and none of them ever finished loading. The character in a
// onesie simply never appeared. A hat hid the bug by turning the hood off.
const AV_CLIP='dmhood';
// The ears used to sit straight on the hair, so a onesie read as "hair with
// ears stuck on" rather than a costume. A onesie needs a HOOD: a dome in the
// costume's colour, over the hair, with a face hole cut out of it. Everything
// about these reading as cute follows from that one shape.
function onesieHood(top,o){
  const t=TOPS[top];if(!t||t.kind!=='onesie')return '';
  const b=t.base,i=t.earIn||t.belly||'#fff';
  return `<g ${o}>
    <path fill-rule="evenodd" fill="${b}" d="M3 60 q0 -56 47 -56 q47 0 47 56 q0 21 -9 31 q-14 -15 -38 -15 q-24 0 -38 15 q-9 -10 -9 -31z
      M50 19 a31.5 30 0 1 0 0.1 0z"/>
  </g>
  <path fill="#000" opacity=".13" d="M21 42 q4 -24 29 -24 q25 0 29 24 q-6 -17 -29 -17 q-23 0 -29 17z"/>`;
}
function onesieEars(top,o){const t=TOPS[top];if(!t||t.kind!=='onesie')return '';const b=t.base,i=t.earIn||t.belly;
  switch(t.ears){
    case 'round':return `<g ${o}><circle cx="19" cy="17" r="9" fill="${b}"/><circle cx="19" cy="17" r="4.5" fill="${i}"/><circle cx="81" cy="17" r="9" fill="${b}"/><circle cx="81" cy="17" r="4.5" fill="${i}"/></g>`;
    case 'long':return `<g ${o}><ellipse cx="27" cy="6" rx="6.5" ry="15" fill="${b}"/><ellipse cx="27" cy="7" rx="3" ry="10" fill="${i}"/><ellipse cx="73" cy="6" rx="6.5" ry="15" fill="${b}"/><ellipse cx="73" cy="7" rx="3" ry="10" fill="${i}"/></g>`;
    case 'longblack':return `<g ${o}><path d="M22 20 l-6 -26 l14 18z" fill="${b}"/><path d="M17 -2 l-1 -4 l7 9z" fill="#1e1418"/><path d="M78 20 l6 -26 l-14 18z" fill="${b}"/><path d="M83 -2 l1 -4 l-7 9z" fill="#1e1418"/><path d="M18 2 l-2 -8 l8 10z M82 2 l2 -8 l-8 10z" fill="#1e1418"/></g>`;
    case 'pointy':return `<g ${o}><path d="M18 22 l-2 -18 l14 12z" fill="${b}"/><path d="M20 18 l-1 -9 l7 6z" fill="${i}"/><path d="M82 22 l2 -18 l-14 12z" fill="${b}"/><path d="M80 18 l1 -9 l-7 6z" fill="${i}"/></g>`;
    case 'fin':return `<g ${o}><path d="M44 12 q6 -16 14 -4 l-2 8z" fill="${b}"/></g>`;
    case 'spikes':return `<g ${o}><path d="M30 14 l5 -12 l6 10z M46 10 l5 -12 l6 10z M62 14 l5 -12 l6 10z" fill="${t.belly}"/></g>`;
    case 'frills':{
      // Three feathery gill stalks per side, fanning out and up off the hood -
      // small tidy fronds just read as "pink ears", which is the thing she
      // said she did not want.
      const gill=(x,y,dir,len,ang)=>{
        const ex=x+dir*len*Math.cos(ang), ey=y-len*Math.sin(ang);
        return `<path d="M${x} ${y} Q${x+dir*len*0.45} ${y-len*0.75} ${ex.toFixed(1)} ${ey.toFixed(1)}"
                 stroke="${i}" stroke-width="4" fill="none" stroke-linecap="round"/>`
             + `<circle cx="${ex.toFixed(1)}" cy="${ey.toFixed(1)}" r="5" fill="${i}"/>`
             + `<circle cx="${(x+dir*len*0.5).toFixed(1)}" cy="${(y-len*0.42).toFixed(1)}" r="3.6" fill="${i}"/>`;
      };
      const side=(x,dir)=>gill(x,44,dir,17,0.15)+gill(x,34,dir,19,0.55)+gill(x,25,dir,16,1.0);
      return `<g ${o}>${side(16,-1)}${side(84,1)}</g>`;
    }
    case 'frogeyes':return `<g ${o}><circle cx="30" cy="12" r="8" fill="${b}"/><circle cx="30" cy="12" r="4.5" fill="#fff"/><circle cx="31" cy="12" r="2.2" fill="#1e1418"/><circle cx="70" cy="12" r="8" fill="${b}"/><circle cx="70" cy="12" r="4.5" fill="#fff"/><circle cx="69" cy="12" r="2.2" fill="#1e1418"/></g>`;
  }return '';}
// A gumball machine. `spin` tilts the crank, `drop` sends a capsule down the
// chute - both are pure CSS classes on the wrapper, so nothing animates unless
// the caller asks and reduced-motion still wins.
function gachaSVG(kind,size,opts){
  opts=opts||{};const s=size||120;
  const body=kind==='weapon'?'#8a2230':'#2d5faa';
  const trim=kind==='weapon'?'#e2503f':'#5eadff';
  const caps=['#ff8ab8','#ffd166','#7fbf4d','#5eadff','#ffa500','#be78ff','#e8e0d0'];
  let balls='';
  for(let i=0;i<22;i++){
    const a=(i*137.5)%360, r=6+((i*7)%20);
    const x=50+Math.cos(a*Math.PI/180)*r, y=40+Math.sin(a*Math.PI/180)*r*0.82;
    balls+=`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="5" fill="${caps[i%caps.length]}"/>`;
  }
  return `<svg viewBox="0 0 100 130" width="${s}" height="${s*1.3}" class="gacha${opts.spin?' spin':''}" aria-hidden="true">
    <ellipse cx="50" cy="125" rx="34" ry="5" fill="rgba(0,0,0,.35)"/>
    <rect x="18" y="86" width="64" height="34" rx="6" fill="${body}"/>
    <rect x="18" y="86" width="64" height="6" rx="3" fill="${trim}"/>
    <circle cx="50" cy="42" r="32" fill="#cfe6f5" opacity=".18"/>
    <g clip-path="url(#gd${kind})">${balls}</g>
    <clipPath id="gd${kind}"><circle cx="50" cy="42" r="31"/></clipPath>
    <circle cx="50" cy="42" r="32" fill="none" stroke="${trim}" stroke-width="3"/>
    <ellipse cx="40" cy="28" rx="11" ry="7" fill="#fff" opacity=".28" transform="rotate(-25 40 28)"/>
    <rect x="16" y="72" width="68" height="10" rx="4" fill="${body}"/>
    <rect x="38" y="100" width="24" height="16" rx="3" fill="#0e0e12"/>
    <rect x="38" y="100" width="24" height="16" rx="3" fill="none" stroke="${trim}" stroke-width="2"/>
    <g class="crank"><circle cx="76" cy="96" r="7" fill="${trim}"/><rect x="74.5" y="89" width="3" height="8" rx="1.5" fill="#e8e0d0"/></g>
    ${opts.drop?`<circle class="cap" cx="50" cy="60" r="6" fill="${opts.drop}"/>`:''}
    <text x="50" y="112" text-anchor="middle" font-size="7" fill="#e8e0d0" opacity=".8" font-family="monospace">${kind==='weapon'?'ARMS':'FITS'}</text>
  </svg>`;
}
function avatarSVG(av,size,opts){
  av=av||{};opts=opts||{};const skin=SKINS[av.skin||0]||SKINS[0];const hc=HAIR_COLORS[av.hairColor||0]||HAIR_COLORS[0];const style=av.hair||'short';const tc=TOP_COLORS[av.topColor||0]||TOP_COLORS[0];
  const mood=opts.mood||'';const weapon=opts.weapon||'';const bs=opts.style||AV_STYLE;
  const w=size||100,h=Math.round((size||100)*1.3);TOP_AV=av;const bp=bodyParts(bs,skin,tc,av.top||'hoodie',weapon);
  const o=bs==='sticker'?'stroke="#1e1418" stroke-width="2.2" stroke-linejoin="round"':bs==='bean'?'stroke="#2a1a14" stroke-width="1.4" stroke-linejoin="round"':'';
  const ot=TOPS[av.top||'hoodie'];const hooded=!av.hat&&ot&&ot.kind==='onesie';const uid=AV_CLIP;
  // opts.alive makes the figure breathe and blink. It adds NOTHING to the
  // drawing - every shape, colour and coordinate is identical either way, and
  // with the flag off the output string is byte-for-byte what it always was.
  // Only DOM-inserted SVG animates; an <img src="data:..."> (which is how the
  // road scene draws sprites through spriteImg) does not run SMIL, so the flag
  // is only worth passing where the avatar is rendered as real markup.
  const alive=opts.alive&&mood!=='dead';
  const liveA=alive?`<g><animateTransform attributeName="transform" type="translate" values="0 0;0 -1.3;0 0" dur="${(3.1+(opts.phase||0)*0.7).toFixed(1)}s" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.6 1;0.4 0 0.6 1" keyTimes="0;0.5;1"/>`:'';
  const liveB=alive?'</g>':'';
  // Blink: squash the eyes vertically about their own centre line (y=55) for a
  // few frames. Scaling in SMIL is about the origin, hence the translate pair.
  const blinkA=alive?`<g transform="translate(0,55)"><g><animateTransform attributeName="transform" type="scale" values="1 1;1 1;1 0.08;1 1" keyTimes="0;${(0.93-(opts.phase||0)*0.04).toFixed(2)};${(0.96-(opts.phase||0)*0.04).toFixed(2)};1" dur="${(4.4+(opts.phase||0)*1.3).toFixed(1)}s" repeatCount="indefinite"/><g transform="translate(0,-55)">`:'';
  const blinkB=alive?'</g></g></g>':'';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -8 100 138" width="${w}" height="${h}" ${opts.attrs||''} aria-hidden="true">
  ${liveA}${hooded?'':(o?`<g ${o}>${hairBack(style,hc)}</g>`:hairBack(style,hc))}
  ${bp.back}
  ${bp.head}
  ${av.beard?beard(av.beard,HAIR_COLORS[av.beardColor===undefined?(av.hairColor||0):av.beardColor]||hc):''}
  ${blinkA}${eyes(av.eyes||'round',mood)}${blinkB}
  ${mouth(mood)}
  ${hooded?`<clipPath id="fh${uid}"><ellipse cx="50" cy="49" rx="31.5" ry="30"/></clipPath><g clip-path="url(#fh${uid})">${hairFront(style,hc)}</g>`
    :(o?`<g ${o}>${hairFront(style,hc)}</g>`:hairFront(style,hc))}
  ${hooded?onesieHood(av.top,o):''}
  ${av.hat?'':onesieEars(av.top||'hoodie',o)}
  ${o?`<g ${o}>${hatShape(av.hat,hc)}</g>`:hatShape(av.hat,hc)}
  ${accShape(av.acc)}${liveB}
  </svg>`;
}
// zombies + raiders
function zombieSVG(kind,size){
  const w=size||100,h=Math.round((size||100)*1.3);
  const skin={walker:'#8fae6a',runner:'#a6c27a',bloater:'#8a9a6a',screamer:'#9fb27a',raider:'#e0a97e',gunner:'#c68a5d',boss:'#9a6543'}[kind]||'#8fae6a';
  const human=kind==='raider'||kind==='gunner'||kind==='boss';
  const body=kind==='bloater'?`<ellipse cx="50" cy="96" rx="30" ry="20" fill="#5a6a4a"/><path d="M30 92 q10 -6 20 0 q10 6 20 0" stroke="#3a4a2a" stroke-width="2" fill="none"/>`:
    human?`<rect x="30" y="78" width="40" height="30" rx="9" fill="${kind==='boss'?'#1a1a1e':'#4a3a2a'}"/>${kind==='boss'?'<path d="M32 80 l4 -6 l4 6 M44 80 l4 -6 l4 6 M56 80 l4 -6 l4 6" stroke="#bbb" stroke-width="2" fill="none"/>':''}`:
    `<rect x="30" y="78" width="40" height="30" rx="9" fill="#5a5a6a"/><path d="M34 102 l6 8 l4 -8 l6 8 l4 -8 l6 8 l4 -8" fill="#5a5a6a"/><path d="M40 82 l6 10 l6 -10" stroke="#3a3a4a" stroke-width="2" fill="none"/>`;
  const arms=human?`<rect x="21" y="82" width="11" height="22" rx="5" fill="${skin}"/><rect x="68" y="82" width="11" height="22" rx="5" fill="${skin}"/>`:
    `<rect x="12" y="86" width="26" height="10" rx="5" fill="${skin}" transform="rotate(-10 25 91)"/><rect x="62" y="86" width="26" height="10" rx="5" fill="${skin}" transform="rotate(10 75 91)"/>`;
  const zhair=`<path d="M10 56 Q8 8 50 8 Q92 8 90 56 Q80 42 70 46 Q60 34 50 46 Q40 34 30 46 Q20 42 10 56z" fill="#3a4a2a" opacity=".9"/>`;
  const face=kind==='boss'?`<path d="M16 50 q0 -34 34 -34 q34 0 34 34 v10 q-4 16 -34 16 q-30 0 -34 -16z" fill="#e8e0d0"/><ellipse cx="36" cy="54" rx="9" ry="10" fill="#1a1a1e"/><ellipse cx="64" cy="54" rx="9" ry="10" fill="#1a1a1e"/><path d="M50 62 l-4 7 h8z" fill="#1a1a1e"/><path d="M36 73 h28 M41 71 v7 M50 71 v7 M59 71 v7" stroke="#1a1a1e" stroke-width="2"/>`:
    (kind==='raider'||kind==='gunner')?`${eyes('almond','angry')}<path d="M20 62 q30 -12 60 0 v12 q-30 12 -60 0z" fill="${kind==='gunner'?'#3a3a44':'#c22b3a'}"/>`:
    `${eyes('round',kind==='runner'?'angry':kind==='screamer'?'glow':'dead')}${mouth(kind==='screamer'?'scream':'dead')}`;
  const extra=kind==='gunner'?`<rect x="73" y="90" width="22" height="7" rx="2" fill="#333"/><rect x="75" y="96" width="6" height="8" rx="2" fill="#333"/>`:kind==='raider'?`<path d="M77 100 l12 -30" stroke="#888" stroke-width="4" stroke-linecap="round"/>`:kind==='boss'?`<path d="M77 100 l14 -34" stroke="#7a5a3a" stroke-width="5" stroke-linecap="round"/><path d="M89 70 l6 -10" stroke="#aaa" stroke-width="9" stroke-linecap="round"/>`:'';
  const wound=!human?`<path d="M24 64 l7 4" stroke="#7a2a2a" stroke-width="2.5"/><circle cx="72" cy="40" r="3.5" fill="#7a2a2a" opacity=".7"/>`:'';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 130" width="${w}" height="${h}" aria-hidden="true">
  ${human&&kind!=='boss'?hairBack('short','#2a1b14'):''}
  <rect x="36" y="100" width="11" height="22" rx="5" fill="#2a2a30"/><rect x="53" y="100" width="11" height="22" rx="5" fill="#2a2a30"/>
  <rect x="34" y="118" width="15" height="8" rx="4" fill="#1a1a1e"/>${kind==='walker'?'':'<rect x="51" y="118" width="15" height="8" rx="4" fill="#1a1a1e"/>'}
  ${body}${arms}${extra}
  <path d="M12 50 q0 -40 38 -40 q38 0 38 40 v6 q0 26 -38 26 q-38 0 -38 -26z" fill="${skin}"/>
  ${wound}${face}
  ${!human?zhair:''}
  ${kind==='raider'?hatShape('bandana'):kind==='gunner'?hatShape('beanie'):''}
  </svg>`;
}
const CAT_COATS={
  tabby:{n:'Orange tabby',r:'common',base:'#e8a04a',dark:'#c2782a',belly:'#fbe3b8',eye:'#5aa04a',pat:'stripes'},
  gray:{n:'Gray tabby',r:'uncommon',base:'#9a9aa6',dark:'#6a6a78',belly:'#dcdce4',eye:'#e0b040',pat:'stripes'},
  black:{n:'Black cat',r:'uncommon',base:'#2c2c36',dark:'#17171d',belly:'#2c2c36',eye:'#f0c040',pat:'none'},
  white:{n:'White cat',r:'rare',base:'#f4f0ea',dark:'#d6d0c8',belly:'#ffffff',eye:'#5ab0e0',pat:'none'},
  tuxedo:{n:'Tuxedo cat',r:'rare',base:'#2c2c36',dark:'#17171d',belly:'#ffffff',eye:'#7ad070',pat:'tuxedo'},
  calico:{n:'Calico',r:'rare',base:'#f4f0ea',dark:'#e8a04a',belly:'#ffffff',eye:'#e0b040',pat:'patches',dark2:'#2c2c36'},
  siamese:{n:'Siamese',r:'epic',base:'#efe2cf',dark:'#5a3c2e',belly:'#f7ede0',eye:'#5ab0e0',pat:'points'},
  tortie:{n:'Tortoiseshell',r:'epic',base:'#3a2a24',dark:'#e08a3a',belly:'#3a2a24',eye:'#e0b040',pat:'patches',dark2:'#c9602a'},
  void:{n:'Void cat',r:'legendary',base:'#101018',dark:'#06060a',belly:'#101018',eye:'#ff5a6a',pat:'glow'}
};
const DOG_COATS={
  mutt:{n:'Mutt',r:'common',base:'#b58a5a',dark:'#8a6a3a',belly:'#eadcbf',eye:'#3a2a1a',ears:'floppy',pat:'none'},
  lab:{n:'Black lab',r:'uncommon',base:'#2c2c36',dark:'#17171d',belly:'#2c2c36',eye:'#3a2a1a',ears:'floppy',pat:'none'},
  golden:{n:'Golden retriever',r:'uncommon',base:'#e6c070',dark:'#c9a050',belly:'#f6e6c0',eye:'#3a2a1a',ears:'floppy',pat:'none'},
  corgi:{n:'Corgi',r:'rare',base:'#e09a4a',dark:'#c2782a',belly:'#ffffff',eye:'#3a2a1a',ears:'pointy',pat:'mask'},
  husky:{n:'Husky',r:'rare',base:'#8a8a96',dark:'#4a4a56',belly:'#ffffff',eye:'#5ab0e0',ears:'pointy',pat:'mask'},
  dalmatian:{n:'Dalmatian',r:'epic',base:'#f4f0ea',dark:'#2c2c36',belly:'#ffffff',eye:'#3a2a1a',ears:'floppy',pat:'spots'},
  shiba:{n:'Shiba',r:'epic',base:'#e6924a',dark:'#c2782a',belly:'#ffffff',eye:'#3a2a1a',ears:'pointy',pat:'mask'},
  ghost:{n:'Ghost dog',r:'legendary',base:'#cfe6f2',dark:'#9cc4d8',belly:'#eef8ff',eye:'#ff5a6a',ears:'pointy',pat:'glow'}
};
const COAT_W={common:40,uncommon:22,rare:10,epic:4,legendary:1};
function randomCoat(kind,minRarity){const src=kind==='dog'?DOG_COATS:CAT_COATS;const order=['common','uncommon','rare','epic','legendary'];const min=order.indexOf(minRarity||'common');
  const pool=Object.entries(src).filter(([k,v])=>order.indexOf(v.r)>=min);let t=0;for(const [k,v] of pool)t+=COAT_W[v.r];let r=Math.random()*t;for(const [k,v] of pool){r-=COAT_W[v.r];if(r<=0)return k;}return pool[pool.length-1][0];}
function coatInfo(kind,coat){const src=kind==='dog'?DOG_COATS:CAT_COATS;return src[coat]||src[kind==='dog'?'mutt':'tabby'];}
function petSVG(kind,size,coat,opts){
  const w=size||64;opts=opts||{};const c=coatInfo(kind,coat);const anim=opts.still?false:true;const id='p'+Math.floor(Math.random()*1e9);
  const blink=anim?`<animate attributeName="ry" values="3.4;3.4;3.4;0.3;3.4" keyTimes="0;0.6;0.92;0.95;1" dur="4.3s" repeatCount="indefinite"/>`:'';
  const wag=anim?`<animateTransform attributeName="transform" type="rotate" values="-14 ${kind==='dog'?14:50} 44;14 ${kind==='dog'?14:50} 44;-14 ${kind==='dog'?14:50} 44" dur="${kind==='dog'?'0.7s':'2.4s'}" repeatCount="indefinite"/>`:'';
  const glow=c.pat==='glow'?`<defs><filter id="${id}g" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.2"/></filter></defs><ellipse cx="32" cy="40" rx="24" ry="20" fill="${c.eye}" opacity=".16" filter="url(#${id}g)">${anim?`<animate attributeName="opacity" values=".1;.26;.1" dur="2.6s" repeatCount="indefinite"/>`:''}</ellipse>`:'';
  let s=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="${w}" height="${w}" aria-hidden="true">${glow}`;
  if(kind==='dog'){
    // tail (behind body), body, legs, belly
    s+=`<g>${wag}<path d="M14 44 q-9 -6 -4 -16" stroke="${c.base}" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M11 30 q-1 -3 2 -4" stroke="${c.belly}" stroke-width="3" fill="none" stroke-linecap="round"/></g>`;
    s+=`<ellipse cx="30" cy="47" rx="17" ry="12" fill="${c.base}"/><ellipse cx="30" cy="52" rx="10" ry="6" fill="${c.belly}"/>`;
    if(c.pat==='spots')s+=`<circle cx="22" cy="42" r="2.6" fill="${c.dark}"/><circle cx="34" cy="40" r="2" fill="${c.dark}"/><circle cx="27" cy="50" r="1.6" fill="${c.dark}"/><circle cx="40" cy="46" r="2.2" fill="${c.dark}"/>`;
    if(c.pat==='mask')s+=`<path d="M14 44 q16 -14 32 -2 q-6 -8 -16 -8 q-10 0 -16 10z" fill="${c.dark}" opacity=".85"/>`;
    s+=`<rect x="17" y="52" width="7" height="10" rx="3.5" fill="${c.dark}"/><rect x="26" y="54" width="7" height="9" rx="3.5" fill="${c.base}"/><rect x="36" y="52" width="7" height="10" rx="3.5" fill="${c.dark}"/><rect x="44" y="54" width="7" height="9" rx="3.5" fill="${c.base}"/>`;
    // collar
    if(opts.collar!==false)s+=`<path d="M30 36 q12 -4 24 0" stroke="#c22b3a" stroke-width="3.2" fill="none"/><circle cx="43" cy="37" r="2.2" fill="#f5c842"/>`;
    // head
    const ears=c.ears==='floppy'?`<path d="M28 20 q-10 -2 -8 14 q4 2 8 -2z" fill="${c.dark}"/><path d="M56 20 q10 -2 8 14 q-4 2 -8 -2z" fill="${c.dark}"/>`:`<path d="M29 22 l-3 -14 l12 8z" fill="${c.dark}"/><path d="M55 22 l3 -14 l-12 8z" fill="${c.dark}"/><path d="M30 20 l-1 -8 l7 5z M54 20 l1 -8 l-7 5z" fill="#f6b3c3" opacity=".8"/>`;
    s+=ears+`<circle cx="42" cy="28" r="15" fill="${c.base}"/>`;
    if(c.pat==='mask')s+=`<path d="M27 26 q15 -18 30 0 q-6 -10 -15 -10 q-9 0 -15 10z" fill="${c.dark}" opacity=".85"/>`;
    if(c.pat==='spots')s+=`<circle cx="34" cy="20" r="2.4" fill="${c.dark}"/><circle cx="50" cy="34" r="1.8" fill="${c.dark}"/>`;
    // muzzle, eyes, nose, tongue, brows
    s+=`<ellipse cx="44" cy="35" rx="7" ry="5" fill="${c.belly}" opacity=".9"/>`;
    s+=`<ellipse cx="36" cy="27" rx="3.6" ry="3.4" fill="#fff"><g/></ellipse><ellipse cx="48" cy="27" rx="3.6" ry="3.4" fill="#fff"/>`;
    s+=`<ellipse cx="36.6" cy="27.6" rx="2.4" ry="2.6" fill="${c.eye}">${blink}</ellipse><ellipse cx="48.6" cy="27.6" rx="2.4" ry="2.6" fill="${c.eye}">${blink}</ellipse><circle cx="37.5" cy="26.4" r=".9" fill="#fff"/><circle cx="49.5" cy="26.4" r=".9" fill="#fff"/>`;
    s+=`<ellipse cx="44" cy="33" rx="3" ry="2.2" fill="#2a1a14"/><path d="M44 35 q0 3 3 3" stroke="#5a2a2a" stroke-width="1.4" fill="none" stroke-linecap="round"/><path d="M42 38 q2 4 5 1" fill="#ff7a8a"/>`;
    s+=`<circle cx="33" cy="30" r="1.6" fill="#ff9ab0" opacity=".55"/><circle cx="53" cy="31" r="1.6" fill="#ff9ab0" opacity=".55"/>`;
  }else{
    s+=`<g>${wag}<path d="M48 46 q12 -4 8 -16" stroke="${c.pat==='points'?c.dark:c.base}" stroke-width="6" fill="none" stroke-linecap="round"/></g>`;
    s+=`<ellipse cx="32" cy="47" rx="15" ry="12" fill="${c.base}"/>`;
    if(c.pat==='tuxedo')s+=`<ellipse cx="32" cy="50" rx="8" ry="8" fill="${c.belly}"/>`;
    if(c.pat==='stripes')s+=`<path d="M22 41 q6 -4 12 0 M20 48 q8 -5 16 0 M24 55 q6 -3 12 0" stroke="${c.dark}" stroke-width="2.2" fill="none" stroke-linecap="round"/>`;
    if(c.pat==='patches')s+=`<ellipse cx="24" cy="44" rx="6" ry="5" fill="${c.dark}"/><ellipse cx="40" cy="50" rx="5" ry="4" fill="${c.dark2||c.dark}"/>`;
    s+=`<rect x="20" y="52" width="6" height="9" rx="3" fill="${c.pat==='points'?c.dark:c.pat==='tuxedo'?c.belly:c.base}"/><rect x="28" y="54" width="6" height="8" rx="3" fill="${c.pat==='points'?c.dark:c.base}"/><rect x="36" y="54" width="6" height="8" rx="3" fill="${c.pat==='points'?c.dark:c.base}"/><rect x="43" y="52" width="6" height="9" rx="3" fill="${c.pat==='points'?c.dark:c.pat==='tuxedo'?c.belly:c.base}"/>`;
    if(opts.collar!==false)s+=`<path d="M20 38 q12 5 24 0" stroke="#c22b3a" stroke-width="3" fill="none"/><circle cx="32" cy="41" r="2.2" fill="#f5c842"/>`;
    // ears with inner pink, twitch
    const twitch=anim?`<animateTransform attributeName="transform" type="rotate" values="0 20 20;-8 20 20;0 20 20;0 20 20" keyTimes="0;0.05;0.1;1" dur="5.1s" repeatCount="indefinite"/>`:'';
    s+=`<g>${twitch}<path d="M17 18 l6 -12 l8 11z" fill="${c.pat==='points'?c.dark:c.base}"/><path d="M20 17 l3.5 -7 l4.5 6.5z" fill="#f6b3c3"/></g><path d="M47 18 l-6 -12 l-8 11z" fill="${c.pat==='points'?c.dark:c.base}"/><path d="M44 17 l-3.5 -7 l-4.5 6.5z" fill="#f6b3c3"/>`;
    s+=`<circle cx="32" cy="27" r="15" fill="${c.base}"/>`;
    if(c.pat==='stripes')s+=`<path d="M26 15 q6 -3 12 0 M23 20 q3 -2 6 0 M35 20 q3 -2 6 0" stroke="${c.dark}" stroke-width="2" fill="none" stroke-linecap="round"/>`;
    if(c.pat==='patches')s+=`<path d="M18 22 q6 -12 16 -8 q-8 2 -10 12z" fill="${c.dark}"/><path d="M36 14 q8 2 9 12 q-6 -2 -9 -12z" fill="${c.dark2||c.dark}"/>`;
    if(c.pat==='points')s+=`<ellipse cx="32" cy="33" rx="8" ry="6" fill="${c.dark}" opacity=".85"/>`;
    if(c.pat==='tuxedo')s+=`<ellipse cx="32" cy="34" rx="7" ry="5" fill="${c.belly}"/>`;
    s+=`<ellipse cx="26" cy="27" rx="3.6" ry="3.8" fill="#fff"/><ellipse cx="38" cy="27" rx="3.6" ry="3.8" fill="#fff"/>`;
    s+=`<ellipse cx="26.5" cy="27.5" rx="2.2" ry="3" fill="${c.eye}">${blink}</ellipse><ellipse cx="38.5" cy="27.5" rx="2.2" ry="3" fill="${c.eye}">${blink}</ellipse><ellipse cx="26.5" cy="27.8" rx=".8" ry="2.2" fill="#1a1020"/><ellipse cx="38.5" cy="27.8" rx=".8" ry="2.2" fill="#1a1020"/><circle cx="27.6" cy="26" r=".9" fill="#fff"/><circle cx="39.6" cy="26" r=".9" fill="#fff"/>`;
    s+=`<path d="M30.5 33 l3 0 l-1.5 1.8z" fill="#f08a9a"/><path d="M32 35 q-2 3 -4 1 M32 35 q2 3 4 1" stroke="${c.pat==='glow'?'#ff5a6a':'#3a2a24'}" stroke-width="1.1" fill="none" stroke-linecap="round"/>`;
    s+=`<path d="M12 31 l10 1 M12 35 l10 -1 M52 31 l-10 1 M52 35 l-10 -1" stroke="${c.pat==='glow'?'#5a5a6a':'#e8e0d0'}" stroke-width="1" opacity=".8"/>`;
    s+=`<circle cx="22" cy="31" r="1.6" fill="#ff9ab0" opacity=".5"/><circle cx="42" cy="31" r="1.6" fill="#ff9ab0" opacity=".5"/>`;
  }
  return s+'</svg>';
}
const imgCache=new Map();
function spriteImg(svg){let i=imgCache.get(svg);if(i)return i;i=new Image();i.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);imgCache.set(svg,i);if(imgCache.size>60){const k=imgCache.keys().next().value;imgCache.delete(k);}return i;}
function randomAv(){return {skin:Math.floor(Math.random()*SKINS.length),hair:HAIR_STYLES[Math.floor(Math.random()*HAIR_STYLES.length)],hairColor:Math.floor(Math.random()*HAIR_COLORS.length),eyes:EYES[Math.floor(Math.random()*EYES.length)],top:'hoodie',topColor:Math.floor(Math.random()*TOP_COLORS.length),hat:'',acc:'',beard:Math.random()<0.28?BEARD_KEYS[1+Math.floor(Math.random()*(BEARD_KEYS.length-1))]:''};}
return {gachaSVG,BEARDS,BEARD_KEYS,beard,BUILDS,setBuild,SKINS,HAIR_COLORS,HAIR_STYLES,HAIR_SHOP,EYES,EYES_SHOP,TOP_COLORS,HATS,TOPS,ACCS,CAT_COATS,DOG_COATS,randomCoat,coatInfo,avatarSVG,setStyle,bodyParts,zombieSVG,petSVG,spriteImg,randomAv};
})();
