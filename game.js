/* Dead Miles. One file of game logic; art lives in art.js. */
/* ================= utils ================= */
const $=(s)=>document.querySelector(s);
const rnd=(a,b)=>a+Math.random()*(b-a);const rint=(a,b)=>Math.floor(rnd(a,b+1));
const pick=(a)=>a[Math.floor(Math.random()*a.length)];const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const fmt=(n)=>Math.round(n).toLocaleString();
function wpick(list,k){let t=0;for(const x of list)t+=x[k]||1;let r=Math.random()*t;for(const x of list){r-=x[k]||1;if(r<=0)return x;}return list[list.length-1];}
function hash(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
function mulberry(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;}}
function todayStr(d=new Date()){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function weekStart(d=new Date()){const x=new Date(d);x.setHours(0,0,0,0);x.setDate(x.getDate()-(x.getDay()+6)%7);return x;}
function weekId(d=new Date()){return todayStr(weekStart(d));}
function timeStr(ts){const d=new Date(ts);return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');}
const uid=()=>Math.random().toString(36).slice(2,9);
const esc=(s)=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

/* ================= data ================= */
const RAR={common:{n:'Common',c:'var(--r-common)',w:1},uncommon:{n:'Uncommon',c:'var(--r-uncommon)',w:2},rare:{n:'Rare',c:'var(--r-rare)',w:3},epic:{n:'Epic',c:'var(--r-epic)',w:4},legendary:{n:'Legendary',c:'var(--r-legendary)',w:5}};
const ITEMS={
  beans:{n:'Canned beans',e:'🥫',pts:6,cat:'food',w:10,r:'common'},ramen:{n:'Instant ramen',e:'🍜',pts:5,cat:'food',w:9,r:'common'},jerky:{n:'Beef jerky',e:'🥩',pts:8,cat:'food',w:5,r:'uncommon'},mre:{n:'MRE ration',e:'🍱',pts:12,cat:'food',w:2,r:'rare'},
  water:{n:'Water bottle',e:'💧',pts:5,cat:'water',w:10,r:'common'},tablets:{n:'Purification tablets',e:'🧂',pts:9,cat:'water',w:3,r:'uncommon'},coffee:{n:'Ground coffee',e:'☕',pts:7,cat:'water',w:4,r:'uncommon'},
  bandage:{n:'Bandages',e:'🩹',pts:8,cat:'meds',w:8,r:'common'},pain:{n:'Painkillers',e:'💊',pts:10,cat:'meds',w:6,r:'uncommon'},abx:{n:'Antibiotics',e:'💉',pts:16,cat:'meds',w:3,r:'rare'},kit:{n:'Trauma kit',e:'🧰',pts:24,cat:'meds',w:1.5,r:'epic'},
  scrap:{n:'Scrap metal',e:'🔩',pts:4,cat:'scrap',w:10,r:'common'},tape:{n:'Duct tape',e:'🧻',pts:5,cat:'scrap',w:7,r:'common'},nails:{n:'Box of nails',e:'🔨',pts:5,cat:'scrap',w:6,r:'common'},wire:{n:'Copper wire',e:'🧵',pts:4,cat:'scrap',w:6,r:'common'},battery:{n:'Car battery',e:'🔋',pts:10,cat:'scrap',w:2.5,r:'uncommon'},fuel:{n:'Fuel can',e:'⛽',pts:12,cat:'scrap',w:2,r:'rare'},
  ammo:{n:'Box of rounds (x6)',e:'📦',pts:14,cat:'ammo',w:2.5,qty:6,r:'uncommon'},shells:{n:'Shotgun shells (x4)',e:'🟥',pts:16,cat:'ammo',w:1.2,qty:4,r:'rare'},
  key:{n:'Chest key',e:'🗝️',pts:0,cat:'key',w:0,r:'rare'},chest:{n:'Locked chest',e:'🧳',pts:0,cat:'chest',w:0,r:'epic'},
  vinyl:{n:'Vinyl record',e:'💿',pts:25,cat:'shelf',w:1,r:'rare'},polaroid:{n:'Old polaroid',e:'📸',pts:20,cat:'shelf',w:1.1,r:'rare'},teddy:{n:'One-eyed teddy',e:'🧸',pts:18,cat:'shelf',w:1.2,r:'rare'},watch:{n:'Gold watch',e:'⌚',pts:28,cat:'shelf',w:.7,r:'epic'},globe:{n:'Snow globe',e:'🔮',pts:30,cat:'shelf',w:.6,r:'epic'},comic:{n:'Comic issue #1',e:'📖',pts:20,cat:'shelf',w:1,r:'rare'},badge:{n:'Sheriff badge',e:'⭐',pts:40,cat:'shelf',w:.3,r:'legendary'},dogtag:{n:'Soldier dog tag',e:'🏷️',pts:35,cat:'shelf',w:0,r:'epic'},skull:{n:'Raider skull mask',e:'💀',pts:45,cat:'shelf',w:0,r:'legendary'},wanted:{n:'Wanted poster',e:'📜',pts:60,cat:'shelf',w:0,r:'legendary'}
};
const GEAR={
  pipe:{n:'Lead pipe',e:'🪈',slot:'melee',dmg:[8,13],dur:6,w:6,pts:10,r:'common'},bat:{n:'Baseball bat',e:'⚾',slot:'melee',dmg:[9,15],dur:5,w:5,pts:14,r:'common'},crowbar:{n:'Crowbar',e:'🔧',slot:'melee',dmg:[11,17],dur:8,w:3,pts:18,r:'uncommon'},machete:{n:'Machete',e:'🔪',slot:'melee',dmg:[14,21],dur:7,w:2,pts:26,r:'rare'},axe:{n:'Fire axe',e:'🪓',slot:'melee',dmg:[18,26],dur:6,w:1.2,pts:34,r:'rare'},sledge:{n:'Sledgehammer',e:'🔨',slot:'melee',dmg:[22,32],dur:5,w:.6,pts:40,r:'epic'},
  pistol:{n:'9mm pistol',e:'🔫',slot:'ranged',dmg:[22,30],ammo:'ammo',w:1.2,pts:30,r:'rare'},shotgun:{n:'Pump shotgun',e:'🎯',slot:'ranged',dmg:[34,50],ammo:'shells',w:.5,pts:45,r:'epic'},
  jacket:{n:'Leather jacket',e:'🧥',slot:'armor',dr:2,w:4,pts:14,r:'common'},pads:{n:'Hockey pads',e:'🏒',slot:'armor',dr:4,w:2,pts:20,r:'uncommon'},vest:{n:'Riot vest',e:'🦺',slot:'armor',dr:6,w:.9,pts:34,r:'rare'},
  helmet:{n:'Motorcycle helmet',e:'⛑️',slot:'head',dr:2,w:2.5,pts:12,r:'common'},riot:{n:'Riot helmet',e:'🪖',slot:'head',dr:3,w:1,pts:22,r:'rare'},
  pack2:{n:'Hiking pack',e:'🎒',slot:'bag',cap:6,w:1.5,pts:16,r:'uncommon'},pack3:{n:'Military ruck',e:'🪖',slot:'bag',cap:12,w:.5,pts:28,r:'rare'},
  // legendaries: never in the normal roll, only chests and bosses
  mercy:{n:'Mercy',e:'🎯',slot:'ranged',dmg:[38,54],ammo:'shells',w:0,pts:90,r:'legendary',legend:'Fires without a shell 35% of the time'},
  lastword:{n:'The Last Word',e:'⚾',slot:'melee',dmg:[16,24],dur:9,w:0,pts:80,r:'legendary',legend:'30% chance a hit knocks the enemy out of its next turn'},
  oldreliable:{n:'Old Reliable',e:'🔧',slot:'melee',dmg:[12,19],dur:99,w:0,pts:70,r:'legendary',legend:'Never breaks'},
  whisper:{n:'Whisper',e:'🔫',slot:'ranged',dmg:[24,32],ammo:'ammo',w:0,pts:85,r:'legendary',legend:'Makes no noise'},
  nightingale:{n:'Nightingale',e:'🦺',slot:'armor',dr:4,w:0,pts:85,r:'legendary',legend:'Heals 5 HP every combat round'}
};
const LEGEND_IDS=['mercy','lastword','oldreliable','whisper','nightingale'];
const CAT_LABEL={food:'Food',water:'Water',meds:'Meds',scrap:'Scrap',ammo:'Ammo',shelf:'Trophy',key:'Key',chest:'Chest',gear:'Gear',cosmetic:'Cosmetic'};
const byCat=(c)=>Object.entries(ITEMS).filter(([k,v])=>v.cat===c&&v.w>0).map(([k,v])=>({id:k,...v}));
function table(cats,shelfW,gearW){const out=[];for(const c of cats)out.push(...byCat(c));if(shelfW)out.push(...byCat('shelf').map(x=>({...x,w:x.w*shelfW})));if(gearW)out.push(...Object.entries(GEAR).filter(([k,v])=>v.w>0).map(([k,v])=>({id:k,gear:true,...v,w:v.w*gearW})));return out;}
function cosmeticPool(){const out=[];for(const [k,v] of Object.entries(ART.HATS))out.push({id:'hat:'+k,slot:'hat',key:k,n:v.n,r:v.r});for(const [k,v] of Object.entries(ART.TOPS))if(v.r!=='common')out.push({id:'top:'+k,slot:'top',key:k,n:v.n,r:v.r});for(const [k,v] of Object.entries(ART.ACCS))out.push({id:'acc:'+k,slot:'acc',key:k,n:v.n,r:v.r});return out;}
const COS_W={rare:3,epic:1,legendary:.2};

const LOCS=[
  {t:'house',n:['Ranch house','Two-story colonial','Duplex','Bungalow','Split-level','Farmhouse'],e:'🏠',w:38,rooms:[{n:'Kitchen',noise:32,cats:['food','water'],shelf:.3},{n:'Bedroom',noise:18,cats:['scrap'],shelf:2.2,gear:.3,keyish:true},{n:'Bathroom',noise:22,cats:['meds'],shelf:.2},{n:'Garage',noise:40,cats:['scrap'],shelf:.4,gear:1.4}],threat:1},
  {t:'pharmacy',n:['Corner pharmacy','Drugmart','Hollow Rx'],e:'💊',w:11,rooms:[{n:'Front counter',noise:25,cats:['meds','water'],shelf:.2},{n:'Back room',noise:30,cats:['meds'],shelf:.3,keyish:true},{n:'Storage',noise:38,cats:['meds','scrap'],shelf:.2,gear:.3}],threat:1.2},
  {t:'gas',n:['Gas & Go','Stop-N-Fuel','Pump station'],e:'⛽',w:12,rooms:[{n:'Snack shelves',noise:26,cats:['food','water'],shelf:.3},{n:'Pumps',noise:44,cats:['scrap'],shelf:.1},{n:'Office',noise:30,cats:['scrap'],shelf:.8,gear:.9,keyish:true}],threat:1},
  {t:'grocery',n:['Family grocery','Corner mart','Foodway'],e:'🛒',w:12,rooms:[{n:'Canned goods',noise:28,cats:['food'],shelf:.2},{n:'Freezer',noise:36,cats:['food','water'],shelf:.1},{n:'Stockroom',noise:34,cats:['scrap','food'],shelf:.3},{n:'Registers',noise:30,cats:['scrap'],shelf:1.4,keyish:true}],threat:1.3},
  {t:'police',n:['Police substation','Sheriff outpost'],e:'🚓',w:5,rooms:[{n:'Locker room',noise:34,cats:['ammo'],shelf:.4,gear:1.6,keyish:true},{n:'Armory cage',noise:44,cats:['ammo'],shelf:.3,gear:2.5},{n:'Break room',noise:24,cats:['food','water'],shelf:.3}],threat:1.6},
  {t:'clinic',n:['Urgent care','Hollow County clinic'],e:'🏥',w:6,rooms:[{n:'Exam room',noise:24,cats:['meds'],shelf:.3},{n:'Pharmacy cage',noise:36,cats:['meds'],shelf:.2},{n:'Supply closet',noise:34,cats:['meds','scrap'],shelf:.2,keyish:true}],threat:1.4},
  {t:'hardware',n:['Hardware store','Lumber yard'],e:'🧰',w:8,rooms:[{n:'Tool wall',noise:30,cats:['scrap'],shelf:.3,gear:1.8},{n:'Yard',noise:38,cats:['scrap'],shelf:.2},{n:'Back office',noise:26,cats:['scrap','water'],shelf:.9,keyish:true}],threat:1.1},
  {t:'surplus',n:['Army surplus','Hunting outfitter'],e:'🎖️',w:3,rooms:[{n:'Front racks',noise:30,cats:['ammo','food'],shelf:.3,gear:1.6},{n:'Gun counter',noise:40,cats:['ammo'],shelf:.2,gear:3,keyish:true},{n:'Back room',noise:34,cats:['scrap'],shelf:.5,gear:1}],threat:1.7},
  {t:'stronghold',n:['Raider stronghold'],e:'🏴',w:0,rooms:[{n:'Tents',noise:36,cats:['food','water','ammo'],shelf:.8,gear:1.2,stage:1},{n:'Loot pile',noise:40,cats:['scrap','meds','ammo'],shelf:2,gear:2,stage:2,keyish:true},{n:'Boss trailer',noise:44,cats:['ammo','meds'],shelf:3,gear:2.5,stage:3,keyish:true}],threat:3,stronghold:true}
];
const DISTRICTS=[
  {n:'Suburbs',dist:[350,650],loot:1,threat:1,steps:0},{n:'Main Street',dist:[450,800],loot:1.15,threat:1.25,steps:25000},{n:'Old Town',dist:[500,900],loot:1.3,threat:1.5,steps:60000},
  {n:'Hospital Row',dist:[600,1000],loot:1.5,threat:1.8,steps:120000},{n:'The Marina',dist:[700,1200],loot:1.75,threat:2.1,steps:200000},{n:'The Overpass',dist:[800,1400],loot:2,threat:2.5,steps:320000}
];
const ENEMIES={
  walker:{n:'Walker',hp:24,dmg:[5,9],hit:.7,xp:8,w:10},
  runner:{n:'Runner',hp:18,dmg:[6,10],hit:.8,xp:12,w:4,fast:true},
  bloater:{n:'Bloater',hp:55,dmg:[11,16],hit:.65,xp:22,w:2,burst:12},
  screamer:{n:'Screamer',hp:26,dmg:[5,9],hit:.7,xp:16,w:2,scream:.4},
  raider:{n:'Raider',hp:44,dmg:[11,17],hit:.8,xp:20,w:0,dodge:.2,human:true},
  gunner:{n:'Raider gunner',hp:38,dmg:[15,22],hit:.7,xp:26,w:0,dodge:.1,human:true},
  boss:{n:'Raider boss',hp:80,dmg:[17,25],hit:.8,xp:50,w:0,dodge:.25,human:true,boss:true}
};
const BOSS_NAMES=['Mad Dog Reyes','Sister Ash','The Butcher of Elm St','Two-Tooth Tully','Queen Wasp','Preacher Cole','Ghost Delacroix','Big Sal','The Widow Marsh','Cutter Vance'];
const ROLES={
  brawler:{n:'Brawler',e:'🥊',d:(l)=>'Throws a '+(9+l*2)+'-'+(15+l*3)+' damage punch every round'},
  medic:{n:'Medic',e:'🩺',d:(l)=>'Patches you for '+(6+l*3)+' HP every round, and heals 20 when you stash'},
  scout:{n:'Scout',e:'🔭',d:(l)=>'You always strike first, ambushes drop by '+(20+l*8)+'%, and one room is scouted before you enter'},
  engineer:{n:'Engineer',e:'🛠️',d:(l)=>'Builds cost '+(15+l*5)+'% less scrap; repairs melee gear at base'},
  hunter:{n:'Hunter',e:'🏹',d:(l)=>'Finds '+(1+Math.floor(l/2))+' extra round(s) per ammo box and shoots for '+(10+l*3)+' every round if you carry ammo'},
  quartermaster:{n:'Quartermaster',e:'📦',d:(l)=>'+'+(3+l)+' pack capacity and +'+(8+l*4)+'% stash value'}
};
const CREW_NAMES=['Jules','Dev','Marisol','Kenji','Ada','Booker','Tam','Rosa','Isaiah','Yuki','Cal','Nadine','Omar','Sasha','Wren','Elias','Priya','Dom','Lena','Rook'];
const PETS={dog:{n:'Dog',e:'🐕',d:'Takes a hit for you 25% of the time and growls raiders off'},cat:{n:'Cat',e:'🐈',d:'+15% XP. Does nothing else. Worth it.'}};
const CLASSES={
  brawler:{n:'Brawler',e:'🥊',d:'Hits hard up close. Starts with a bat and a leather jacket.',kit:['bat','jacket']},
  marksman:{n:'Marksman',e:'🎯',d:'Guns and ammo. Starts with a pistol, 6 rounds and a pipe.',kit:['pistol','pipe'],ammo:6},
  scavenger:{n:'Scavenger',e:'🎒',d:'Finds more, carries more, opens locks. Starts with a crowbar and a hiking pack.',kit:['crowbar','pack2']},
  medic:{n:'Medic',e:'🩺',d:'Tough and hard to kill. Starts with a pipe, a jacket, a trauma kit and nurse scrubs.',kit:['pipe','jacket'],extra:'kit',cos:'top:scrubs'}
};
const SKILLS={
  brawler:[{id:'heavyhands',n:'Heavy Hands',max:3,d:r=>'+'+(2*r)+' melee damage'},{id:'irongrip',n:'Iron Grip',max:3,d:r=>(25*r)+'% chance a swing costs no durability'},{id:'secondwind',n:'Second Wind',max:3,d:r=>'Heal '+(6*r)+' HP when a fight ends'},{id:'bruiser',n:'Bruiser',max:2,d:r=>'Heavy swing hits '+(12*r)+'% more often'},{id:'cleave',n:'Cleave',max:2,d:r=>(20*r)+'% chance a swing also hits a second enemy for half'}],
  marksman:[{id:'steadyaim',n:'Steady Aim',max:3,d:r=>'+'+(3*r)+' gun damage'},{id:'scrounger',n:'Scrounger',max:3,d:r=>'+'+r+' round in every ammo box you find'},{id:'silencer',n:'Silencer',max:3,d:r=>'Shots make '+(8*r)+' less noise'},{id:'headshot',n:'Headshot',max:3,d:r=>(10*r)+'% chance a shot does double damage'},{id:'quickdraw',n:'Quick Draw',max:1,d:r=>'You are never ambushed'}],
  scavenger:[{id:'deeppockets',n:'Deep Pockets',max:3,d:r=>'+'+(2*r)+' pack capacity'},{id:'eagleeye',n:'Eagle Eye',max:3,d:r=>'Rare finds '+(15*r)+'% more likely'},{id:'lightstep',n:'Light Step',max:3,d:r=>'Every search makes '+(4*r)+' less noise'},{id:'lockpick',n:'Lockpick',max:3,d:r=>(30*r)+'% chance to open a chest with no key'},{id:'haggler',n:'Haggler',max:2,d:r=>'+'+(5*r)+'% stash value'}],
  medic:[{id:'fielddressing',n:'Field Dressing',max:3,d:r=>'Meds heal '+(10*r)+' more'},{id:'tough',n:'Tough',max:3,d:r=>'+'+(10*r)+' max HP'},{id:'triage',n:'Triage',max:3,d:r=>'Heal '+(4*r)+' HP every combat round'},{id:'adrenaline',n:'Adrenaline',max:3,d:r=>'Enemies miss you '+(6*r)+'% more'},{id:'steady',n:'Steady',max:2,d:r=>'Brace blocks '+(60+10*r)+'% instead of 50%'}],
  general:[{id:'longhaul',n:'Long Haul',max:2,d:r=>'+'+(10*r)+' HP recovered overnight'},{id:'pathfinder',n:'Pathfinder',max:3,d:r=>'Places are '+(6*r)+'% closer'},{id:'leader',n:'Leader',max:1,d:r=>'Active crew act as one level higher'}]
};
const BUILD={
  walls:{n:'Walls',e:'🧱',lv:3,def:[6,12,20],cost:[15,30,50],d:'Defense against raids'},
  tower:{n:'Watchtower',e:'🗼',lv:2,def:[5,10],cost:[20,40],d:'Defense, and you see raids coming'},
  traps:{n:'Traps',e:'🪤',lv:2,def:[4,9],cost:[12,28],d:'Defense; raiders sometimes die on the way in'},
  bunk:{n:'Bunkhouse',e:'🛏️',lv:2,def:[0,0],cost:[25,45],d:'+1 active crew slot per level'},
  armory:{n:'Armory',e:'🔧',lv:1,def:[2],cost:[20],d:'Repair melee gear for 3 scrap'},
  clinic:{n:'Clinic',e:'🏥',lv:1,def:[0],cost:[25],d:'Stashing heals you to full for 1 meds'},
  garden:{n:'Garden',e:'🥬',lv:2,def:[0,0],cost:[20,35],d:'+3 food per level every morning'},
  radio:{n:'Ham radio',e:'📻',lv:1,def:[0],cost:[30],d:'Rival intel and one supply drop a day'},
  generator:{n:'Generator',e:'⚡',lv:1,def:[6],cost:[40],d:'Lights. Zombies avoid it: -30% raid odds'}
};
const TIERS=[{n:'Drifter',e:'🔰',mult:1},{n:'Scavenger',e:'🎒',mult:1.3},{n:'Ranger',e:'🏹',mult:1.65},{n:'Warlord',e:'⚔️',mult:2.1},{n:'Legend',e:'☠️',mult:2.7}];
const RIVALS=[
  {id:'maya',n:'Maya\'s crew',av:{skin:2,hair:'bob',hairColor:0,eyes:'almond',top:'flannel',topColor:0},pace:[6800,6800,6800,6800,6800,6800,6800],blurb:'Steady. Same loop every day.'},
  {id:'theo',n:'Theo\'s crew',av:{skin:1,hair:'short',hairColor:1,eyes:'round',top:'varsity',topColor:1},pace:[9500,9000,9200,8800,8500,2500,3000],blurb:'Sprints all week, sleeps in on weekends.'},
  {id:'nadia',n:'Nadia\'s crew',av:{skin:4,hair:'curly',hairColor:0,eyes:'sparkle',top:'biker',topColor:3},pace:[4200,4500,4200,4400,5000,12500,11500],blurb:'Quiet all week, then two huge weekend hauls.'}
];
const PTS_PER_STEP=0.085;
const BASE_PERK={house:'Cozy: +1 HP recovered every morning',pharmacy:'Clinic comes pre-built',gas:'Generator comes pre-built',grocery:'Garden comes pre-built',police:'Armory comes pre-built and walls start at level 1',clinic:'Clinic comes pre-built',hardware:'Walls start at level 1 and builds cost 10% less',surplus:'Armory comes pre-built, traps start at level 1',stronghold:'Raiders want it back: +40% raid odds, but the loot pile respawns weekly'};

/* ================= state ================= */
let S=null;
function fresh(){return {v:3,created:Date.now(),name:'',onboarded:false,av:ART.randomAv(),cosmetics:[],cls:'',sp:0,skills:{},sfx:true,
  steps:{total:0,today:0,date:todayStr(),lastSync:0,lastSyncDate:''},
  walk:{toNext:0,dist:500,district:0,houses:0,progress:0,banked:0},
  loc:null,pack:[],run:0,hp:100,lvl:1,xp:0,kills:0,keys:0,
  gear:[],eq:{melee:null,ranged:null,armor:null,head:null,bag:null},
  crew:[],active:[],pet:null,
  base:null,stock:{food:5,water:5,meds:1,scrap:0,ammo:0},shelf:[],
  goal:6000,streak:{days:0,last:''},
  league:{week:weekId(),score:0,tier:0,history:[],seen:''},
  raids:[],raidPending:null,campCleared:'',bossKilled:'',milestones:[],
  ct:{date:'',daily:[],week:'',weekly:null,pending:{}},party:{code:'',data:null,pending:{}},wx:null,
  journal:[],flags:{roadCheck:0,dropDate:'',lastRaidCheck:''},lastAnim:0,combat:null,online:{handle:'',token:'',ok:false,err:'',lastPull:0,lastPost:0}};}
function migrate(o){
  if(!o)return null;if(o.v===3)return o;
  if(o.v===2){const f=fresh();const m=Object.assign(f,o);m.v=3;m.av=ART.randomAv();m.cosmetics=[];m.cls='';m.sp=Math.max(0,(o.lvl||1)-1);m.skills={};m.sfx=true;m.keys=0;m.milestones=[];m.ct=f.ct;m.party=f.party;m.wx=null;m.bossKilled='';
    for(const g of m.gear||[]){if(!g.r&&GEAR[g.id])g.r=GEAR[g.id].r;}
    for(const it of m.pack||[]){if(!it.r&&ITEMS[it.id])it.r=ITEMS[it.id].r;}
    return m;}
  return null;
}
function save(){try{localStorage.setItem('deadmiles.v3',JSON.stringify(S));}catch(e){}}
function load(){try{let r=localStorage.getItem('deadmiles.v3');if(r){const o=JSON.parse(r);if(o&&o.v===3)return o;}r=localStorage.getItem('deadmiles.v2');if(r){const o=migrate(JSON.parse(r));if(o)return o;}}catch(e){}return null;}
function log(m){S.journal.unshift({t:Date.now(),m});S.journal=S.journal.slice(0,40);}
function toast(m,c){const t=document.createElement('div');t.className='toast'+(c?' '+c:'');t.textContent=m;$('#toasts').appendChild(t);setTimeout(()=>t.remove(),2600);}

/* ================= sound ================= */
const SFX={ctx:null,
  init(){if(this.ctx)return;try{this.ctx=new (window.AudioContext||window.webkitAudioContext)();}catch(e){}},
  tone(f,d,type,vol,slide){if(!S||!S.sfx||!this.ctx)return;const c=this.ctx;const o=c.createOscillator();const g=c.createGain();o.type=type||'square';o.frequency.setValueAtTime(f,c.currentTime);if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(20,f+slide),c.currentTime+d);g.gain.setValueAtTime(vol||.08,c.currentTime);g.gain.exponentialRampToValueAtTime(.0001,c.currentTime+d);o.connect(g);g.connect(c.destination);o.start();o.stop(c.currentTime+d);},
  noise(d,vol){if(!S||!S.sfx||!this.ctx)return;const c=this.ctx;const b=c.createBuffer(1,c.sampleRate*d,c.sampleRate);const data=b.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*(1-i/data.length);const s=c.createBufferSource();s.buffer=b;const g=c.createGain();g.gain.value=vol||.1;s.connect(g);g.connect(c.destination);s.start();},
  play(n){this.init();if(!this.ctx)return;if(this.ctx.state==='suspended')this.ctx.resume();
    switch(n){
      case 'hit':this.noise(.12,.15);this.tone(140,.12,'square',.1,-80);break;
      case 'miss':this.tone(300,.1,'sine',.05,-150);break;
      case 'hurt':this.tone(110,.25,'sawtooth',.1,-60);this.noise(.2,.08);break;
      case 'shot':this.noise(.08,.3);this.tone(90,.15,'square',.12,-60);break;
      case 'loot':this.tone(660,.08,'square',.06);setTimeout(()=>this.tone(880,.12,'square',.06),70);break;
      case 'rare':[523,659,784].forEach((f,i)=>setTimeout(()=>this.tone(f,.15,'triangle',.08),i*80));break;
      case 'legend':[523,659,784,1046,1318].forEach((f,i)=>setTimeout(()=>this.tone(f,.25,'triangle',.09),i*90));break;
      case 'levelup':[392,523,659,784].forEach((f,i)=>setTimeout(()=>this.tone(f,.2,'square',.07),i*100));break;
      case 'growl':this.tone(70,.5,'sawtooth',.09,-30);this.noise(.4,.06);break;
      case 'chest':this.tone(200,.1,'square',.06);setTimeout(()=>this.tone(300,.1,'square',.06),100);setTimeout(()=>this.tone(600,.3,'triangle',.08),200);break;
      case 'ui':this.tone(500,.05,'sine',.04);break;
      case 'arrive':[440,554].forEach((f,i)=>setTimeout(()=>this.tone(f,.15,'triangle',.07),i*120));break;
      case 'dead':[300,250,200,120].forEach((f,i)=>setTimeout(()=>this.tone(f,.3,'sawtooth',.08),i*180));break;
      case 'win':[523,659,784,1046].forEach((f,i)=>setTimeout(()=>this.tone(f,.18,'square',.07),i*90));break;
    }}
};

/* ================= player ================= */
function sk(id){return S.skills[id]||0;}
const maxHp=()=>100+(S.lvl-1)*10+sk('tough')*10;
const eqItem=(slot)=>S.eq[slot]?S.gear.find(g=>g.uid===S.eq[slot]):null;
const dr=()=>(eqItem('armor')?eqItem('armor').dr:0)+(eqItem('head')?eqItem('head').dr:0);
const capacity=()=>10+(eqItem('bag')?eqItem('bag').cap:0)+(roleLvl('quartermaster')?3+roleLvl('quartermaster'):0)+sk('deeppockets')*2;
const baseDmg=()=>[3+S.lvl,6+S.lvl];
function addXp(n){if(S.pet==='cat')n=Math.round(n*1.15);S.xp+=n;while(S.xp>=S.lvl*40){S.xp-=S.lvl*40;S.lvl++;S.sp++;S.hp=maxHp();log('Level '+S.lvl+'. Max HP '+maxHp()+'. +1 skill point.');toast('Level '+S.lvl+' · +1 skill point','a');SFX.play('levelup');}}
const activeCrew=()=>S.active.map(id=>S.crew.find(c=>c.id===id)).filter(Boolean);
function roleLvl(role){let b=0;for(const c of activeCrew())if(c.role===role)b=Math.max(b,c.lvl+sk('leader'));return b;}
function crewSlots(){return 1+(S.base&&S.base.rooms.bunk?S.base.rooms.bunk:0);}
function crewXp(n){for(const c of activeCrew()){c.xp+=n;if(c.xp>=c.lvl*6&&c.lvl<5){c.xp-=c.lvl*6;c.lvl++;log(c.name+' is now level '+c.lvl+'.');}}}
function newCrew(role){const used=S.crew.map(c=>c.name);const names=CREW_NAMES.filter(n=>!used.includes(n));return {id:uid(),name:names.length?pick(names):pick(CREW_NAMES),av:ART.randomAv(),role:role||pick(Object.keys(ROLES)),lvl:1,xp:0};}
function skillList(){return (SKILLS[S.cls]||[]).concat(SKILLS.general);}
function learn(id){const def=skillList().find(s=>s.id===id);if(!def||S.sp<1||sk(id)>=def.max)return;S.skills[id]=sk(id)+1;S.sp--;SFX.play('ui');log('Learned '+def.n+' '+S.skills[id]+'.');save();render();}
function respec(){if(S.stock.scrap<15){toast('Need 15 scrap');return;}S.stock.scrap-=15;S.sp+=Object.values(S.skills).reduce((a,b)=>a+b,0);S.skills={};toast('Skills reset');save();render();}

/* ================= weather (real sky over New York) ================= */
const WX_CODES=(c)=>c===0?'clear':c<=3?'cloudy':(c===45||c===48)?'fog':(c>=51&&c<=67)||(c>=80&&c<=82)?'rain':(c>=71&&c<=77)||c===85||c===86?'snow':c>=95?'storm':'cloudy';
async function fetchWeather(){
  const w=S.wx;if(w&&Date.now()-w.t<30*60000)return;
  let lat=40.71,lon=-74.01;
  try{const u='https://api.open-meteo.com/v1/forecast?latitude='+lat+'&longitude='+lon+'&current=weather_code,temperature_2m,is_day&temperature_unit=fahrenheit&timezone=America%2FNew_York';
    const r=await fetch(u);const j=await r.json();const c=j.current;S.wx={t:Date.now(),code:c.weather_code,kind:WX_CODES(c.weather_code),temp:Math.round(c.temperature_2m),day:!!c.is_day};save();render();}catch(e){}
}
function isNight(){const h=new Date().getHours();return h>=20||h<6||(S.wx&&!S.wx.day&&h>=18);}
function wxKind(){return S.wx?S.wx.kind:'clear';}
function wxLabel(){const k=wxKind();const e={clear:'☀️',cloudy:'☁️',fog:'🌫️',rain:'🌧️',snow:'❄️',storm:'⛈️'}[k];let fx=[];if(k==='rain')fx.push('noise -10');if(k==='snow')fx.push('loot +10%, longer walks');if(k==='fog')fx.push('ambush +10%');if(k==='storm')fx.push('horde: +1 enemy, loot x1.3');if(isNight())fx.push('horde night: +1 enemy, loot x1.5');return (isNight()?'🌙 ':'')+e+' '+(S.wx?S.wx.temp+'°F ':'')+(k==='clear'?'':k)+(fx.length?' · '+fx.join(' · '):'');}
function lootMult(){let m=district().loot;if(wxKind()==='snow')m*=1.1;if(wxKind()==='storm')m*=1.3;if(isNight())m*=1.5;return m;}

/* ================= world ================= */
const district=()=>DISTRICTS[Math.min(S.walk.district,DISTRICTS.length-1)];
function unlockedDistrict(){let d=0;for(let i=0;i<DISTRICTS.length;i++)if(S.steps.total>=DISTRICTS[i].steps)d=i;return d;}
function newDistance(){const d=district();let dist=rint(d.dist[0],d.dist[1]);dist=Math.round(dist*(1-sk('pathfinder')*0.06));if(wxKind()==='snow')dist=Math.round(dist*1.1);S.walk.dist=dist;S.walk.progress=0;S.walk.toNext=dist;}
function bossName(){return BOSS_NAMES[hash(weekId()+'boss')%BOSS_NAMES.length];}
function makeLoc(){
  let type;
  if(S.walk.district>=1&&Math.random()<0.12&&S.campCleared!==weekId())type=LOCS.find(l=>l.t==='stronghold');else type=wpick(LOCS.filter(l=>l.w>0),'w');
  const rooms=type.rooms.map(r=>({n:r.n,noise:r.noise,cats:r.cats,shelf:r.shelf,gear:r.gear||0,keyish:!!r.keyish,stage:r.stage||0,done:false,items:null,peek:null}));
  const loc={t:type.t,e:type.e,n:pick(type.n),rooms,noise:0,found:[],cleared:false,wave:0,threat:type.threat,stronghold:!!type.stronghold,stage:0};
  for(const r of rooms)r.items=rollRoom(r,loc);
  if(roleLvl('scout')&&wxKind()!=='fog'){const r=rooms[rint(0,rooms.length-1)];const best=r.items.slice().sort((a,b)=>b.pts-a.pts)[0];r.peek=best?best.e+' '+best.n:'looks empty';}
  return loc;
}
function rarW(it){const r=RAR[it.r||'common'].w;return r>=3?1+sk('eagleeye')*0.15:1;}
function rollRoom(r,loc){
  const lm=lootMult()*(loc.stronghold?1.4:1);const list=table(r.cats,r.shelf,r.gear).map(x=>({...x,w:x.w*rarW(x)}));const n=rint(1,3);const out=[];
  for(let i=0;i<n;i++){const it=wpick(list,'w');if(it.gear)out.push({id:it.id,n:it.n,e:it.e,pts:it.pts,cat:'gear',gear:true,r:it.r});else out.push({id:it.id,n:it.n,e:it.e,pts:Math.round(it.pts*lm),cat:it.cat,qty:it.qty,r:it.r});}
  if(Math.random()<0.07)out.push({id:'chest',...ITEMS.chest});
  if(Math.random()<(r.keyish?0.06:0.025))out.push({id:'key',...ITEMS.key});
  if(Math.random()<0.04){const c=rollCosmetic();if(c)out.push(c);}
  return out;
}
function rollCosmetic(){const pool=cosmeticPool().map(c=>({...c,w:(COS_W[c.r]||1)*rarW(c)}));const c=wpick(pool,'w');return {id:c.id,n:c.n,e:c.slot==='hat'?'🎩':c.slot==='top'?'👕':'🕶️',pts:c.r==='legendary'?60:c.r==='epic'?30:18,cat:'cosmetic',r:c.r,slot:c.slot,key:c.key};}
function encounterFor(loc){
  const th=district().threat*loc.threat;const rng=Math.random();
  if(loc.stronghold){return strongholdStage(loc.stage+1);}
  const ambushCut=roleLvl('scout')?0.2+roleLvl('scout')*0.08:0;
  let quiet=0.32+ambushCut;if(wxKind()==='fog')quiet-=0.1;if(wxKind()==='rain')quiet-=0.08;
  if(rng<quiet)return [];
  let count=th<1.5?(Math.random()<0.3?2:1):th<2.5?rint(1,3):rint(2,3);if(isNight()||wxKind()==='storm')count++;count=Math.min(4,count);const out=[];
  for(let i=0;i<count;i++){if(S.walk.district>=1&&Math.random()<0.15)out.push(mk(Math.random()<0.7?'raider':'gunner'));else{const k=wpick(Object.entries(ENEMIES).filter(([k,v])=>v.w>0).map(([k,v])=>({k,w:v.w*(isNight()&&k==='runner'?2:1)})),'w').k;out.push(mk(k));}}
  return out;
}
function strongholdStage(st){if(st===1)return [mk('raider'),mk('raider')];if(st===2)return [mk('raider'),mk('gunner'),mk('raider')];const b=mk('boss');b.n=bossName();b.hp=Math.round(b.hp*1.5);b.max=b.hp;b.wanted=true;return [mk('gunner'),b];}
function mk(k){const e=ENEMIES[k];const scale=1+S.walk.district*0.12;return {k,n:e.n,hp:Math.round(e.hp*scale),max:Math.round(e.hp*scale),dmg:e.dmg.map(x=>Math.round(x*scale)),hit:e.hit,xp:e.xp,dodge:e.dodge||0,fast:!!e.fast,burst:e.burst||0,scream:e.scream||0,human:!!e.human,boss:!!e.boss,dead:false,stun:0};}

/* ================= steps ================= */
function rollDay(){
  const t=todayStr();if(S.steps.date===t)return;
  S.steps.date=t;S.steps.today=0;S.steps.lastSync=0;S.steps.lastSyncDate='';S.flags.roadCheck=0;
  S.hp=Math.min(maxHp(),S.hp+25+sk('longhaul')*10+(S.base&&S.base.t==='house'?1:0));
  if(S.base){const g=S.base.rooms.garden||0;if(g){S.stock.food+=3*g;log('The garden gave '+(3*g)+' food.');}}
  log('Morning in Hollow County. You slept some.');
}
function rollWeek(){
  const w=weekId();if(S.league.week===w)return;
  const end=new Date(new Date(S.league.week+'T00:00:00').getTime()+7*86400000);
  const rows=RIVALS.map(r=>({n:r.n,s:rivalScore(r,S.league.week,end,S.league.tier)}));
  const all=[{n:'You',s:S.league.score,me:true},...rows].sort((a,b)=>b.s-a.s);const rank=all.findIndex(x=>x.me)+1;
  let delta=0;if(rank===1&&S.league.tier<TIERS.length-1)delta=1;else if(rank===all.length&&S.league.tier>0)delta=-1;
  S.league.history.unshift({week:S.league.week,score:S.league.score,rank,tier:S.league.tier,delta});
  S.league.tier+=delta;S.league.week=w;S.league.score=0;S.league.seen='';
}
function checkMilestones(){for(let i=1;i<DISTRICTS.length;i++){if(S.steps.total>=DISTRICTS[i].steps&&!S.milestones.includes(i)){S.milestones.push(i);S.sp++;S.keys++;log('Milestone: '+fmt(DISTRICTS[i].steps)+' lifetime steps. '+DISTRICTS[i].n+' is open. +1 skill point, +1 key.');toast(DISTRICTS[i].n+' unlocked · +1 skill point','l');SFX.play('legend');}}}
function addSteps(n,src){
  n=Math.floor(n);if(!(n>0))return;rollDay();rollWeek();
  S.steps.total+=n;S.steps.today+=n;S.lastAnim=Date.now();ctEvent('steps',n);checkMilestones();
  if(S.steps.today>=S.goal&&S.streak.last!==S.steps.date){const y=new Date();y.setDate(y.getDate()-1);S.streak.days=(S.streak.last===todayStr(y))?S.streak.days+1:1;S.streak.last=S.steps.date;S.stock.food+=2;S.stock.water+=2;addXp(15);log('Daily target hit. Streak '+S.streak.days+'. +2 food, +2 water, +15 XP.');toast('Target hit. Streak '+S.streak.days,'a');}
  if(S.loc||S.combat){S.walk.banked=(S.walk.banked||0)+n;save();render();return;}
  let left=n;
  while(left>0){if(left>=S.walk.toNext){left-=S.walk.toNext;S.walk.progress=S.walk.dist;S.walk.toNext=0;arrive();break;}else{S.walk.toNext-=left;S.walk.progress=S.walk.dist-S.walk.toNext;left=0;}}
  if(left>0)S.walk.banked=(S.walk.banked||0)+left;
  if(!S.loc&&!S.combat&&S.flags.roadCheck<1&&Math.random()<Math.min(0.4,n/300*0.07)){S.flags.roadCheck++;save();render();setTimeout(()=>startCombat([mk(Math.random()<0.7?'walker':'runner')],'road'),400);return;}
  save();render();
}
function arrive(){
  S.loc=makeLoc();S.walk.houses++;
  log('Reached '+S.loc.n+' ('+district().n+').');toast('Reached '+S.loc.e+' '+S.loc.n,'a');SFX.play('arrive');
  if(navigator.vibrate)try{navigator.vibrate([60,40,60]);}catch(e){}
}
function enterLoc(){
  const loc=S.loc;if(!loc||loc.cleared)return;
  const en=encounterFor(loc);
  if(!en.length){loc.cleared=true;log(loc.n+' is quiet. You slip in.');ctEvent('places',1);save();render();return;}
  startCombat(en,'enter');
}
function pushStage(){const loc=S.loc;if(!loc||!loc.stronghold||loc.stage>=3)return;startCombat(strongholdStage(loc.stage+1),'enter');}

/* ================= combat ================= */
let C=null;
function startCombat(enemies,where){
  C={enemies,where,turn:1,log:[],target:0,brace:false,over:false,fled:false};
  S.combat=true;SFX.play('growl');
  const desc=where==='road'?'Something is in the road.':where==='wave'?'The noise brought more.':where==='raid'?'Raiders are at your walls.':S.loc&&S.loc.stronghold?['','At the gate.','Into the yard.','The boss trailer. '+bossName()+' is home.'][S.loc.stage+1]:'They were waiting inside '+S.loc.n+'.';
  clog(desc+' '+enemies.length+' hostile'+(enemies.length>1?'s':'')+'.','sys');
  let amb=0.15;if(wxKind()==='fog')amb+=0.1;if(roleLvl('scout')||sk('quickdraw'))amb=0;
  if(where==='enter'&&Math.random()<amb){clog('Ambush! They act first.','hit');enemyPhase();}
  openCombat();
}
function clog(m,c){C.log.unshift({m,c:c||''});C.log=C.log.slice(0,14);}
function alive(){return C.enemies.filter(e=>!e.dead);}
function targetEnemy(){let t=C.enemies[C.target];if(!t||t.dead){const a=alive();t=a[0];C.target=C.enemies.indexOf(t);}return t;}
function hurt(n,src){let d=Math.max(1,n-dr());if(C.brace)d=Math.ceil(d*(1-(sk('steady')?0.6+sk('steady')*0.1:0.5)));if(S.pet==='dog'&&Math.random()<0.25){clog('Your dog lunges and takes the hit meant for you.','good');return;}S.hp-=d;clog(src+' hits you for '+d+'.','hit');SFX.play('hurt');$('#sheet').classList.add('shake');setTimeout(()=>$('#sheet').classList.remove('shake'),400);}
function dealTo(t,d,label){t.hp-=d;clog(label+' for '+d+'.','you');if(t.wanted)ctEvent('boss',d);}
function breakWeapon(w){if(w.id==='oldreliable')return;if(w.dur<=0){clog('The '+w.n+' breaks.','sys');S.gear=S.gear.filter(g=>g.uid!==w.uid);S.eq.melee=null;}}
function act(kind){
  if(!C||C.over)return;C.brace=false;
  const t=targetEnemy();if(!t){endCombat(true);return;}
  if(kind==='attack'){const w=eqItem('melee');const dm=w?w.dmg:baseDmg();
    if(Math.random()<t.dodge){clog(t.n+' sidesteps your swing.','');SFX.play('miss');}
    else if(Math.random()<0.9){let d=rint(dm[0],dm[1])+(S.lvl-1)+(w?sk('heavyhands')*2:0);dealTo(t,d,'You hit '+t.n+(w?' with the '+w.n:' bare-handed'));SFX.play('hit');
      if(w&&w.id==='lastword'&&Math.random()<0.3){t.stun=1;clog(t.n+' is knocked flat. It loses its next turn.','good');}
      if(sk('cleave')&&Math.random()<sk('cleave')*0.2){const o=alive().find(e=>e!==t);if(o){dealTo(o,Math.round(d/2),'The swing carries into '+o.n);}}
      if(w&&!(Math.random()<sk('irongrip')*0.25)){w.dur--;breakWeapon(w);}}
    else{clog('You miss.','');SFX.play('miss');}
  }
  else if(kind==='heavy'){const w=eqItem('melee');if(!w){toast('Need a melee weapon');return;}
    if(Math.random()<t.dodge+0.1){clog(t.n+' ducks the big swing.','');SFX.play('miss');}
    else if(Math.random()<0.6+sk('bruiser')*0.12){const d=Math.round((rint(w.dmg[0],w.dmg[1])+sk('heavyhands')*2)*1.6)+(S.lvl-1);dealTo(t,d,'Heavy swing lands');SFX.play('hit');}
    else{clog('The heavy swing goes wide.','');SFX.play('miss');}
    w.dur-=2;breakWeapon(w);
    if(S.loc)S.loc.noise=Math.min(100,S.loc.noise+8);
  }
  else if(kind==='shoot'){const g=eqItem('ranged');if(!g){toast('No gun');return;}const ammoItem=S.pack.find(p=>p.cat==='ammo'&&p.id===g.ammo);const stockAmmo=g.ammo==='ammo'?S.stock.ammo:0;
    const free=g.id==='mercy'&&Math.random()<0.35;
    if(!free&&!ammoItem&&stockAmmo<1){toast('No '+(g.ammo==='shells'?'shells':'rounds'));return;}
    if(!free){if(ammoItem){ammoItem.qty--;if(ammoItem.qty<=0)S.pack=S.pack.filter(p=>p!==ammoItem);}else S.stock.ammo--;}else clog('Mercy fires on an empty chamber. Somehow.','good');
    SFX.play('shot');
    if(Math.random()<0.92){let d=rint(g.dmg[0],g.dmg[1])+(S.lvl-1)+sk('steadyaim')*3;if(Math.random()<sk('headshot')*0.1){d*=2;clog('Headshot.','good');}t.shot=true;dealTo(t,d,'You fire the '+g.n);}else clog('The shot goes wide.','');
    if(S.loc&&g.id!=='whisper')S.loc.noise=Math.min(100,S.loc.noise+Math.max(5,25-sk('silencer')*8));
  }
  else if(kind==='brace'){C.brace=true;clog('You brace.','you');}
  else if(kind==='med'){const m=S.pack.find(p=>p.cat==='meds')||(S.stock.meds>0?{stock:true}:null);if(!m){toast('No meds');return;}const heal=(m.id==='kit'?70:m.id==='abx'?45:35)+sk('fielddressing')*10;if(m.stock)S.stock.meds--;else S.pack=S.pack.filter(p=>p!==m);S.hp=Math.min(maxHp(),S.hp+heal);clog('You patch up: +'+heal+' HP.','good');SFX.play('loot');}
  else if(kind==='flee'){if(C.where==='raid'){toast('Nowhere to run. This is your base.');return;}
    if(Math.random()<0.7){C.fled=true;clog('You break away and run.','sys');const drop=Math.ceil(S.pack.length*0.25);for(let i=0;i<drop&&S.pack.length;i++)S.pack.splice(rint(0,S.pack.length-1),1);endCombat(false);return;}
    else clog('You stumble. They close in.','hit');
  }
  const a=alive();
  if(a.length){const bl=roleLvl('brawler');if(bl){const tt=targetEnemy();dealTo(tt,rint(9+bl*2,15+bl*3),activeCrew().find(c=>c.role==='brawler').name+' punches '+tt.n);}
    const hl=roleLvl('hunter');if(hl&&(S.pack.some(p=>p.cat==='ammo')||S.stock.ammo>0)){const tt=targetEnemy();dealTo(tt,10+hl*3,activeCrew().find(c=>c.role==='hunter').name+' fires');}}
  const ml=roleLvl('medic');if(ml&&S.hp<maxHp()){S.hp=Math.min(maxHp(),S.hp+6+ml*3);clog(activeCrew().find(c=>c.role==='medic').name+' patches you: +'+(6+ml*3)+'.','good');}
  if(sk('triage')&&S.hp<maxHp()){S.hp=Math.min(maxHp(),S.hp+sk('triage')*4);}
  if(eqItem('armor')&&eqItem('armor').id==='nightingale'&&S.hp<maxHp()){S.hp=Math.min(maxHp(),S.hp+5);}
  for(const e of C.enemies){if(!e.dead&&e.hp<=0){e.dead=true;e.hp=0;S.kills++;addXp(e.xp);crewXp(1);ctEvent('kills',1);clog(e.n+' goes down. +'+e.xp+' XP.','good');
    if(e.burst&&!e.shot){hurt(e.burst+dr(),'The bloater bursts and');}
    if(e.human){if(Math.random()<0.5){const g=pick(['pipe','bat','jacket','helmet','crowbar']);S.gear.push({uid:uid(),id:g,...GEAR[g]});clog('It dropped a '+GEAR[g].n+'.','sys');}
      if(Math.random()<0.5){S.pack.push({id:'ammo',...ITEMS.ammo,uid:uid(),qty:3,n:'Rounds (x3)'});clog('You take 3 rounds off the body.','sys');}
      if(e.boss){S.keys++;S.pack.push({id:'skull',...ITEMS.skull,uid:uid()});clog('The boss mask, and a key from the belt.','sys');
        if(e.wanted){S.bossKilled=weekId();S.pack.push({id:'wanted',...ITEMS.wanted,uid:uid()});clog('Bounty claimed: '+e.n+'. The poster comes off the wall.','good');ctEvent('bounty',1);if(Math.random()<0.3)dropLegend('The boss was carrying something.');}}}
    else if(Math.random()<0.06){S.pack.push({id:'dogtag',...ITEMS.dogtag,uid:uid()});clog('A dog tag around its neck. Trophy.','sys');}}}
  if(!alive().length){renderCombat();setTimeout(()=>endCombat(true),500);return;}
  enemyPhase();
  if(S.hp<=0){death();return;}
  renderCombat();
}
function enemyPhase(){
  for(const e of alive()){
    if(e.stun>0){e.stun--;clog(e.n+' is still down.','');continue;}
    if(e.scream&&Math.random()<e.scream){const w=mk('walker');C.enemies.push(w);clog('The screamer shrieks. Another walker shoves in.','hit');continue;}
    const swings=e.fast&&C.turn%2===0?2:1;
    for(let i=0;i<swings;i++){if(Math.random()<e.hit-sk('adrenaline')*0.06)hurt(rint(e.dmg[0],e.dmg[1]),e.n);else clog(e.n+' lunges and misses.','');}
  }
  C.turn++;
}
function dropLegend(why){const id=pick(LEGEND_IDS);S.gear.push({uid:uid(),id,...GEAR[id]});clog((why||'')+' LEGENDARY: '+GEAR[id].n+'. '+GEAR[id].legend+'.','good');toast('Legendary: '+GEAR[id].n,'l');SFX.play('legend');log('Found the legendary '+GEAR[id].n+'.');}
function death(){
  C.over=true;S.combat=false;const lost=packPts();SFX.play('dead');
  const where=C.where;if(where==='raid'&&S.raidPending){const p=S.raidPending;resolveRaid(p.power,p.hour,p.date);S.flags.lastRaidCheck=p.date;}
  S.pack=[];S.run=0;S.loc=null;newDistance();S.hp=Math.round(maxHp()*0.4);
  const gearLost=S.gear.length&&Math.random()<0.5?S.gear.splice(rint(0,S.gear.length-1),1)[0]:null;if(gearLost){for(const k in S.eq)if(S.eq[k]===gearLost.uid)S.eq[k]=null;}
  log('You went down. Your crew dragged you back to base. Pack lost ('+fmt(lost)+' pts)'+(gearLost?', and your '+gearLost.n+' is gone':'')+'.');
  save();render();
  openSheet(`<h2>You went down</h2><div class="big">${ART.avatarSVG(S.av,70,{mood:'dead'})}</div><p>Your crew dragged you out before they finished you. Everything in the pack is gone${gearLost?', and you lost your '+esc(gearLost.n):''}. You wake up at base at ${Math.round(maxHp()*0.4)} HP.</p><button class="btn r wide" onclick="closeSheet()">Get up</button>`);
  C=null;
}
function endCombat(won){
  if(!C)return;C.over=true;S.combat=false;
  const where=C.where;
  if(won){SFX.play('win');if(sk('secondwind'))S.hp=Math.min(maxHp(),S.hp+sk('secondwind')*6);
    log('Cleared '+C.enemies.length+' hostiles'+(where==='enter'&&S.loc?' inside '+S.loc.n:where==='road'?' on the road':'')+'.');
    if(where==='enter'||where==='wave'){if(S.loc.stronghold&&where==='enter'){S.loc.stage++;S.loc.cleared=true;if(S.loc.stage>=3){S.campCleared=weekId();log('Stronghold cleared. The county is quieter for a while.');ctEvent('stronghold',1);}}else{S.loc.cleared=true;}if(where==='enter')ctEvent('places',1);}
    if(where==='raid'){resolveRaidFight(true);}
    crewXp(2);
  }else{
    if(where==='enter'){S.loc=null;S.run=0;newDistance();log('You fled and lost part of the pack.');}
    else if(where==='wave'){S.loc.rooms.forEach(r=>r.done=true);S.loc=null;newDistance();log('You fled the wave and lost part of the pack.');}
    else log('You fled the road.');
  }
  const summary=won?`<h2>Clear</h2><div class="big">${where==='raid'?'🧱':'💥'}</div><p>${C.log.filter(l=>l.c==='good').slice(0,4).map(l=>esc(l.m)).join('<br>')||'They are down.'}</p>`:`<h2>You got away</h2><div class="big">💨</div><p>Dropped a quarter of the pack on the way out.</p>`;
  const carry=S.walk.banked||0;S.walk.banked=0;
  C=null;save();render();
  openSheet(summary+`<button class="btn r wide" onclick="closeSheet()">Continue</button>`);
  if(carry>0&&!S.loc)addSteps(carry,'carry');
}
function openCombat(){$('#modal').classList.add('on');$('#modal').dataset.lock='1';renderCombat();}
function renderCombat(){
  if(!C)return;const w=eqItem('melee'),g=eqItem('ranged');const t=targetEnemy();
  const ammoN=(g?(S.pack.filter(p=>p.cat==='ammo'&&p.id===g.ammo).reduce((a,b)=>a+(b.qty||0),0)+(g.ammo==='ammo'?S.stock.ammo:0)):0);
  const meds=S.pack.filter(p=>p.cat==='meds').length+S.stock.meds;
  $('#sheet').innerHTML=`<h2>${C.where==='raid'?'Defend the base':C.where==='road'?'On the road':'Inside'} <span class="chip d" style="float:right">round ${C.turn}</span></h2>
  <div class="hplab"><span>You · DR ${dr()}</span><span>${S.hp} / ${maxHp()}</span></div><div class="hpbar"><i style="width:${S.hp/maxHp()*100}%"></i></div>
  <div class="stack" style="margin:12px 0">${C.enemies.map((e,i)=>`<button class="enemy${e===t?' target':''}${e.dead?' dead':''}" onclick="C.target=${i};renderCombat()"><div class="sp">${ART.zombieSVG(e.k,52)}</div><div><div class="n">${esc(e.n)}${e.wanted?' · WANTED':e.boss?' ☠':''}</div><div class="hpbar en"><i style="width:${e.hp/e.max*100}%"></i></div><div class="d">${e.hp}/${e.max} · hits for ${e.dmg[0]}-${e.dmg[1]}${e.fast?' · fast':''}${e.burst?' · bursts when killed up close':''}${e.scream?' · calls more':''}${e.dodge?' · dodgy':''}${e.stun?' · down':''}</div></div></button>`).join('')}</div>
  <div class="acts">
    <button class="btn r" onclick="act('attack')">${w?w.e+' '+esc(w.n):'👊 Fists'}<small>${w?(w.dmg[0]+sk('heavyhands')*2)+'-'+(w.dmg[1]+sk('heavyhands')*2)+' · '+(w.id==='oldreliable'?'∞':w.dur)+' left':baseDmg()[0]+'-'+baseDmg()[1]+' dmg'}</small></button>
    <button class="btn" onclick="act('heavy')" ${w?'':'disabled'}>💢 Heavy swing<small>x1.6 dmg · ${60+sk('bruiser')*12}% hit · noisy</small></button>
    <button class="btn" onclick="act('shoot')" ${g&&(ammoN||g.id==='mercy')?'':'disabled'}>${g?g.e+' '+esc(g.n):'🔫 No gun'}<small>${g?(g.dmg[0]+sk('steadyaim')*3)+'-'+(g.dmg[1]+sk('steadyaim')*3)+' · '+ammoN+' rounds':'find one'}</small></button>
    <button class="btn" onclick="act('brace')">🛡️ Brace<small>${sk('steady')?60+sk('steady')*10:50}% less damage this round</small></button>
    <button class="btn" onclick="act('med')" ${meds?'':'disabled'}>🩹 Patch up<small>${meds} meds</small></button>
    <button class="btn ghost" onclick="act('flee')" ${C.where==='raid'?'disabled':''}>🏃 Run<small>70% · drop 25% pack</small></button>
  </div>
  <ul class="clog" style="margin-top:10px">${C.log.map(l=>`<li class="${l.c}">${esc(l.m)}</li>`).join('')}</ul>`;
}

/* ================= looting ================= */
function rarToast(it){const r=it.r||'common';if(r==='legendary'){toast('LEGENDARY: '+it.n,'l');SFX.play('legend');}else if(r==='epic'){toast('Epic: '+it.n,'p');SFX.play('rare');}else if(r==='rare'){toast('Rare: '+it.n,'a');SFX.play('rare');}else SFX.play('loot');}
function takeItem(it,loc){
  if(it.gear){S.gear.push({uid:uid(),id:it.id,...GEAR[it.id]});if(loc)loc.found.push({...it});log('Found a '+it.n+'.');rarToast(it);return true;}
  if(it.cat==='key'){S.keys++;if(loc)loc.found.push({...it});log('Found a chest key.');rarToast(it);return true;}
  if(it.cat==='cosmetic'){if(S.cosmetics.includes(it.id)){S.stock.scrap+=10;log('Another '+it.n+'. Traded for 10 scrap.');return true;}S.cosmetics.push(it.id);if(loc)loc.found.push({...it});log('Found '+it.n+' to wear.');rarToast(it);return true;}
  if(S.pack.length>=capacity()){toast('Pack full. Left '+it.n+' behind.','d');return false;}
  const item={...it,uid:uid()};if(item.cat==='ammo'){item.qty=(item.qty||6)+(roleLvl('hunter')?1+Math.floor(roleLvl('hunter')/2):0)+sk('scrounger');}
  S.pack.push(item);if(loc)loc.found.push(item);rarToast(it);return true;
}
function searchRoom(i){
  const loc=S.loc;if(!loc||!loc.cleared)return;const r=loc.rooms[i];if(r.done)return;if(loc.stronghold&&r.stage>loc.stage){toast('Push deeper first');return;}r.done=true;
  for(const it of r.items)takeItem(it,loc);
  ctEvent('rooms',1);
  if(!loc.stronghold&&S.crew.length<8&&Math.random()<0.07){const c=newCrew();S.crew.push(c);if(S.active.length<crewSlots())S.active.push(c.id);log(c.name+' was hiding in the '+r.n.toLowerCase()+'. '+ROLES[c.role].n+' joins the crew.');openSheet(`<h2>Survivor</h2><div class="big">${ART.avatarSVG(c.av,80)}</div><p><b style="color:var(--bone)">${c.name}</b> was hiding in the ${esc(r.n.toLowerCase())}. ${ROLES[c.role].e} ${ROLES[c.role].n}: ${ROLES[c.role].d(1)}.</p><button class="btn r wide" onclick="closeSheet()">Welcome to the crew</button>`);}
  else if(!S.pet&&Math.random()<0.03){S.pet=Math.random()<0.6?'dog':'cat';log('A '+PETS[S.pet].n.toLowerCase()+' followed you out. It is yours now.');openSheet(`<h2>A ${PETS[S.pet].n.toLowerCase()}!</h2><div class="big">${ART.petSVG(S.pet,90)}</div><p>It followed you out and will not leave. ${PETS[S.pet].d}.</p><button class="btn r wide" onclick="closeSheet()">Come on, then</button>`);SFX.play('rare');}
  let noise=Math.max(4,r.noise+rint(-6,8)-sk('lightstep')*4-(wxKind()==='rain'?10:0));loc.noise=Math.min(100,loc.noise+noise);
  crewXp(1);save();render();
  if(loc.noise>=100){loc.noise=55;loc.wave++;setTimeout(()=>startCombat([mk('walker'),mk(Math.random()<0.4?'runner':'walker')].concat(loc.wave>1?[mk('bloater')]:[]),'wave'),350);}
}
function openChest(uidv){
  const c=S.pack.find(p=>p.uid===uidv);if(!c)return;
  if(S.keys>0){S.keys--;}else if(Math.random()<sk('lockpick')*0.3){toast('Lock picked','z');}else{toast(sk('lockpick')?'The pick slipped. Try again or find a key.':'Needs a key','d');SFX.play('miss');return;}
  S.pack=S.pack.filter(p=>p!==c);SFX.play('chest');
  const list=table(['food','water','meds','scrap','ammo'],1.5,1.5).filter(x=>x.r!=='common').map(x=>({...x,w:x.w*rarW(x)}));const got=[];
  for(let i=0;i<3;i++){const it=wpick(list,'w');const item=it.gear?{id:it.id,n:it.n,e:it.e,pts:it.pts,cat:'gear',gear:true,r:it.r}:{id:it.id,n:it.n,e:it.e,pts:Math.round(it.pts*lootMult()),cat:it.cat,qty:it.qty,r:it.r};if(takeItem(item,null))got.push(item);}
  if(Math.random()<0.25){const cs=rollCosmetic();if(takeItem(cs,null))got.push(cs);}
  if(Math.random()<0.08){dropLegend('Under the false bottom:');got.push({e:'✨',n:'a legendary',r:'legendary'});}
  ctEvent('chests',1);log('Opened a chest: '+got.map(g=>g.n).join(', ')+'.');
  openSheet(`<h2>Chest opened</h2><div class="big">🧳</div><div class="loot" style="justify-content:center">${got.map(g=>`<div class="item r-${g.r||'common'}"><span class="e">${g.e}</span>${esc(g.n)}</div>`).join('')}</div><button class="btn a wide" style="margin-top:12px" onclick="closeSheet()">Nice</button>`);
  save();render();
}
function leaveLoc(){
  if(!S.loc)return;const loc=S.loc;if(loc.cleared)S.run++;S.loc=null;
  log('Left '+loc.n+'. Run x'+(1+S.run*0.1).toFixed(1)+'.');
  const maxD=unlockedDistrict();
  if(S.walk.houses%5===0&&S.walk.district<maxD){S.walk.district++;log('You crossed into '+district().n+'. Longer walks, better loot, worse company.');toast('New district: '+district().n,'a');}
  newDistance();const carry=S.walk.banked||0;S.walk.banked=0;save();render();if(carry>0)addSteps(carry,'carry');
}

/* ================= base ================= */
function claimBase(){
  const loc=S.loc;if(!loc||!loc.cleared)return;
  if(S.base&&S.stock.scrap<20){toast('Moving base costs 20 scrap');return;}
  if(S.base)S.stock.scrap-=20;
  const rooms={};
  if(loc.t==='pharmacy'||loc.t==='clinic')rooms.clinic=1;if(loc.t==='gas')rooms.generator=1;if(loc.t==='grocery')rooms.garden=1;
  if(loc.t==='police'){rooms.armory=1;rooms.walls=1;}if(loc.t==='hardware')rooms.walls=1;if(loc.t==='surplus'){rooms.armory=1;rooms.traps=1;}
  S.base={t:loc.t,e:loc.e,n:loc.n,district:district().n,rooms,claimed:Date.now()};
  loc.rooms.forEach(r=>r.done=true);
  log('You claimed '+loc.n+' as your base. '+(BASE_PERK[loc.t]||''));toast('Base claimed','a');SFX.play('win');
  save();render();leaveLoc();pushPlayer();
}
function defense(){if(!S.base)return 0;let d=0;for(const [k,l] of Object.entries(S.base.rooms)){if(!l)continue;d+=BUILD[k].def[l-1]||0;}return d;}
function buildCost(k){const b=BUILD[k];const l=S.base.rooms[k]||0;if(l>=b.lv)return null;let c=b.cost[l];const el=roleLvl('engineer');if(el)c=Math.round(c*(1-(0.15+el*0.05)));if(S.base.t==='hardware')c=Math.round(c*0.9);return c;}
function build(k){if(!S.base)return;const c=buildCost(k);if(c===null)return;if(S.stock.scrap<c){toast('Need '+c+' scrap');return;}S.stock.scrap-=c;S.base.rooms[k]=(S.base.rooms[k]||0)+1;log('Built '+BUILD[k].n+' level '+S.base.rooms[k]+'.');toast(BUILD[k].n+' L'+S.base.rooms[k],'a');SFX.play('chest');save();render();pushPlayer();}
function packPts(){return S.pack.reduce((a,b)=>a+b.pts,0);}
const runMult=()=>1+S.run*0.1;
function bank(){
  if(S.loc||S.combat){toast('Clear out first');return;}if(!S.pack.length){toast('Nothing to stash');return;}
  if(!S.base){toast('Claim a base first: clear a place, then Claim it');return;}
  const raw=packPts();const qm=roleLvl('quartermaster');const pts=Math.round(raw*runMult()*TIERS[S.league.tier].mult*(1+(qm?0.08+qm*0.04:0)+sk('haggler')*0.05));
  let meds=0;for(const it of S.pack){if(it.cat==='shelf')S.shelf.push({id:it.id,n:it.n,e:it.e});else if(it.cat==='ammo')S.stock.ammo+=(it.qty||0);else if(it.cat==='chest'){S.stock.scrap+=5;}else if(S.stock[it.cat]!==undefined){S.stock[it.cat]++;if(it.cat==='meds')meds++;}}
  rollWeek();S.league.score+=pts;ctEvent('stash',pts);if(meds)ctEvent('meds',meds);
  const eat=activeCrew().length;S.stock.food=Math.max(0,S.stock.food-eat);
  S.hp=Math.min(maxHp(),S.hp+15);if(roleLvl('medic'))S.hp=Math.min(maxHp(),S.hp+20);
  if(S.base.rooms.clinic&&S.stock.meds>0&&S.hp<maxHp()){S.stock.meds--;S.hp=maxHp();}
  log('Stashed '+fmt(raw)+' x'+runMult().toFixed(1)+' = '+fmt(pts)+' league points.'+(eat?' Crew ate '+eat+' food.':''));toast('+'+fmt(pts)+' league points','a');SFX.play('win');
  S.pack=[];S.run=0;save();render();pushPlayer();
}
function supplyDrop(){if(!S.base||!S.base.rooms.radio||S.flags.dropDate===S.steps.date)return;S.flags.dropDate=S.steps.date;const list=table(['food','water','meds','ammo'],0.3,0.4);const got=[];for(let i=0;i<3;i++){const it=wpick(list,'w');const item=it.gear?{id:it.id,n:it.n,e:it.e,pts:it.pts,cat:'gear',gear:true,r:it.r}:{id:it.id,n:it.n,e:it.e,pts:it.pts,cat:it.cat,qty:it.qty,uid:uid(),r:it.r};if(takeItem(item,null))got.push(it.e+' '+it.n);}log('Supply drop: '+got.join(', ')+'. In your pack.');toast('Supply drop landed','z');save();render();}
function heal(){if(S.hp>=maxHp()){toast('HP is full');return;}if(S.stock.meds<1){toast('No meds in stash');return;}S.stock.meds--;S.hp=Math.min(maxHp(),S.hp+40+sk('fielddressing')*10);save();render();}
function eat(){if(S.hp>=maxHp()){toast('HP is full');return;}if(S.stock.food<1){toast('No food in stash');return;}S.stock.food--;S.hp=Math.min(maxHp(),S.hp+15);save();render();}
function equip(uidv){const g=S.gear.find(x=>x.uid===uidv);if(!g)return;S.eq[g.slot]=S.eq[g.slot]===uidv?null:uidv;SFX.play('ui');save();render();}
function repair(uidv){const g=S.gear.find(x=>x.uid===uidv);if(!g)return;if(!((S.base&&S.base.rooms.armory)||roleLvl('engineer')))return;if(S.stock.scrap<3){toast('Need 3 scrap');return;}S.stock.scrap-=3;g.dur=Math.min(GEAR[g.id].dur,g.dur+3);toast(g.n+' repaired');save();render();}
function dropGear(uidv){S.gear=S.gear.filter(x=>x.uid!==uidv);for(const k in S.eq)if(S.eq[k]===uidv)S.eq[k]=null;save();render();}
function toggleCrew(id){const i=S.active.indexOf(id);if(i>=0)S.active.splice(i,1);else{if(S.active.length>=crewSlots()){toast('No free slot. Build a bunkhouse.');return;}S.active.push(id);}save();render();}
function wear(slot,key){if(key&&!(slot==='top'&&key==='hoodie')&&!S.cosmetics.includes(slot+':'+key))return;S.av[slot]=key;save();render();}

/* ================= raids (real clock) ================= */
function stockValue(){return S.stock.food*5+S.stock.water*5+S.stock.meds*10+S.stock.scrap*4+S.stock.ammo*3;}
function checkRaids(){
  if(!S.base)return;const t=todayStr();if(S.flags.lastRaidCheck===t)return;
  const rng=mulberry(hash(t+'raid'+S.created));
  const daysSince=Math.floor((Date.now()-S.base.claimed)/86400000);
  if(daysSince<1){S.flags.lastRaidCheck=t;return;}
  let odds=0.18+Math.min(0.4,stockValue()/600)+S.league.tier*0.05;
  if(S.base.rooms.generator)odds*=0.7;if(S.base.t==='stronghold')odds*=1.4;if(S.campCleared===weekId())odds*=0.5;
  const hour=8+Math.floor(rng()*13);const now=new Date();
  if(rng()<odds){const power=Math.round(10+rng()*20+S.league.tier*6+daysSince*0.5);
    if(now.getHours()>=hour){resolveRaid(power,hour,t);S.flags.lastRaidCheck=t;}
    else{S.raidPending={date:t,hour,power};}
  }else S.flags.lastRaidCheck=t;
}
function resolveRaid(power,hour,date){
  const def=defense();let stolen={};let repelled=def>=power;
  if(S.base.rooms.traps&&Math.random()<0.3){power=Math.round(power*0.7);repelled=def>=power;}
  if(!repelled){const frac=clamp((power-def)/power*0.6,0.1,0.6);for(const k of ['food','water','meds','scrap','ammo']){const n=Math.floor(S.stock[k]*frac);if(n){S.stock[k]-=n;stolen[k]=n;}}
    if(S.base.rooms.walls&&Math.random()<0.5){S.base.rooms.walls--;stolen.walls=1;}}
  const entry={t:date+' '+String(hour).padStart(2,'0')+':00',power,def,repelled,stolen};
  S.raids.unshift(entry);S.raids=S.raids.slice(0,12);S.raidPending=null;
  log(repelled?'Raiders hit the base at '+hour+':00 and your defenses held ('+def+' vs '+power+').':'Raiders broke in at '+hour+':00 ('+power+' vs your '+def+') and took '+Object.entries(stolen).map(([k,v])=>v+' '+k).join(', ')+'.');
  toast(repelled?'Raid repelled':'Base raided','d');
}
function resolveRaidFight(won){if(!S.raidPending)return;const p=S.raidPending;S.raids.unshift({t:p.date+' '+String(p.hour).padStart(2,'0')+':00',power:p.power,def:defense(),repelled:true,stolen:{},fought:true});S.raidPending=null;S.flags.lastRaidCheck=p.date;log('You held the base yourself. Raiders driven off.');addXp(30);S.stock.scrap+=rint(4,10);}
function raidTick(){
  if(!S.raidPending)return;const p=S.raidPending;const now=new Date();
  if(todayStr()!==p.date){resolveRaid(p.power,p.hour,p.date);S.flags.lastRaidCheck=todayStr();save();return;}
  if(now.getHours()>=p.hour){ if(document.visibilityState==='visible'&&!S.combat&&!S.loc&&!$('#modal').classList.contains('on')){openSheet(`<h2>Raiders at the walls</h2><div class="big">${ART.zombieSVG('raider',70)}${ART.zombieSVG('gunner',70)}</div><p>A crew of ${p.power>25?'six':p.power>18?'four':'three'} is coming over the fence. Your defenses: ${defense()} vs their ${p.power}. Fight them yourself, or let the walls decide.</p><div class="grid2"><button class="btn" onclick="closeSheet();resolveRaid(${p.power},${p.hour},'${p.date}');S.flags.lastRaidCheck='${p.date}';save();render()">Let the walls hold</button><button class="btn d" onclick="closeSheet();fightRaid()">Fight</button></div>`,true);}
    else if(document.visibilityState!=='visible'){resolveRaid(p.power,p.hour,p.date);S.flags.lastRaidCheck=p.date;save();}}
}
function fightRaid(){const p=S.raidPending;const n=p.power>25?4:p.power>18?3:2;const en=[];for(let i=0;i<n;i++)en.push(mk(i===0&&p.power>22?'gunner':'raider'));startCombat(en,'raid');}

/* ================= league ================= */
function rivalScore(r,week,now,tier){const start=new Date(week+'T00:00:00');const rng=mulberry(hash(week+r.id));const mult=TIERS[tier].mult;let total=0;
  for(let d=0;d<7;d++){const el=(now.getTime()-(start.getTime()+d*86400000))/86400000;if(el<=0)break;const pace=r.pace[d]*(0.85+rng()*0.35);const f=clamp((el-0.29)/0.63,0,1);total+=pace*f*PTS_PER_STEP*mult*(1+0.1*rng());}return Math.round(total);}
function board(){const now=new Date();const rows=RIVALS.map(r=>({id:r.id,n:r.n,av:r.av,s:rivalScore(r,S.league.week,now,S.league.tier),blurb:r.blurb}));rows.push({id:'me',n:S.name||'You',av:S.av,s:S.league.score,me:true});return rows.sort((a,b)=>b.s-a.s);}
function radioLines(){const now=new Date();const lines=[];const rng=mulberry(hash(S.league.week+todayStr()));const hrs=clamp(Math.floor((now.getHours()-7)/3),0,4);
  const verbs=['cleared a pharmacy on','fought off raiders near','stashed a big haul from','lost a man at','found a shotgun in','burned a camp under','got chased off'];const places=['Maple St','the strip mall','Old Town','the marina','Hospital Row','the overpass','5th and Pine','the rail yard'];
  for(let i=0;i<=hrs;i++){const r=RIVALS[Math.floor(rng()*3)];lines.push({t:'~'+String(8+i*3).padStart(2,'0')+':00',m:r.n+' '+verbs[Math.floor(rng()*verbs.length)]+' '+places[Math.floor(rng()*places.length)]+'.'});}
  lines.push({t:'WANTED',m:bossName()+' is holed up in a stronghold this week. Bounty: a key, a trophy, and a shot at a legendary.'});
  if(S.base&&S.base.rooms.radio){const b=board().filter(x=>!x.me);lines.unshift({t:'LIVE',m:b[0].n+' leads the rivals with '+fmt(b[0].s)+' pts. '+(RIVALS.find(r=>r.id===b[0].id)||{}).blurb});}
  return lines.reverse();}

/* ================= contracts ================= */
const CT_TYPES={steps:{n:'Walk',u:'steps'},places:{n:'Clear places',u:'places'},kills:{n:'Put down hostiles',u:'kills'},rooms:{n:'Search rooms',u:'rooms'},stash:{n:'Stash points',u:'pts'},meds:{n:'Bring meds home',u:'meds'},chests:{n:'Open chests',u:'chests'},stronghold:{n:'Clear a stronghold',u:''},bounty:{n:'Claim the bounty',u:''},boss:{n:'Damage the Wanted boss',u:'dmg'}};
function makeDaily(date){const rng=mulberry(hash(date+'daily'));const pool=[{t:'steps',g:[4000,5000,6000,8000]},{t:'places',g:[2,3,4]},{t:'kills',g:[4,6,8,10]},{t:'rooms',g:[6,8,12]},{t:'stash',g:[150,250,400]},{t:'meds',g:[2,3,5]}];const out=[];const used=new Set();
  while(out.length<3){const p=pool[Math.floor(rng()*pool.length)];if(used.has(p.t))continue;used.add(p.t);const goal=p.g[Math.floor(rng()*p.g.length)];out.push({id:date+'-'+p.t,t:p.t,goal,n:0,done:false,reward:{scrap:6+Math.floor(rng()*8),xp:30+Math.floor(rng()*30),key:out.length===0&&rng()<0.5?1:0}});}
  return out;}
function makeWeekly(week){const rng=mulberry(hash(week+'weekly'));return {id:week,goals:[{t:'steps',goal:30000+Math.floor(rng()*3)*5000,n:0},{t:'kills',goal:30,n:0},{t:'bounty',goal:1,n:0}],done:false,reward:{key:1,cosmetic:1,pts:200}};}
function ctRoll(){const t=todayStr(),w=weekId();if(S.ct.date!==t){S.ct.date=t;S.ct.daily=makeDaily(t);}if(S.ct.week!==w){S.ct.week=w;S.ct.weekly=makeWeekly(w);}}
function ctEvent(type,n){
  if(!S.ct)return;ctRoll();
  for(const c of S.ct.daily){if(c.t===type&&!c.done){c.n+=n;if(c.n>=c.goal){c.done=true;S.stock.scrap+=c.reward.scrap;addXp(c.reward.xp);if(c.reward.key)S.keys+=c.reward.key;log('Contract done: '+CT_TYPES[c.t].n+' '+c.goal+'. +'+c.reward.scrap+' scrap, +'+c.reward.xp+' XP'+(c.reward.key?', +1 key':'')+'.');toast('Contract done: +'+c.reward.scrap+' scrap','a');SFX.play('chest');}}}
  const w=S.ct.weekly;if(w&&!w.done){for(const g of w.goals)if(g.t===type)g.n+=n;if(w.goals.every(g=>g.n>=g.goal)){w.done=true;S.keys+=1;S.league.score+=200;const cs=rollCosmetic();takeItem(cs,null);log('Weekly contract done. +1 key, +200 points, and '+cs.n+'.');toast('Weekly contract done','l');SFX.play('legend');}}
  const pp=S.party.pending;pp[type]=(pp[type]||0)+n;
}

/* ================= online (Supabase) ================= */
const SB={url:'https://edejxfcsjqwedbgulygi.supabase.co',key:'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkZWp4ZmNzanF3ZWRiZ3VseWdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk0NTExMzEsImV4cCI6MjEwNTAyNzEzMX0.Z0T954DSwTVlRM37i_fJLVtu_x2IrdOoJMx6ImInVKI'};
async function rpc(fn,args){
  const r=await fetch(SB.url+'/rest/v1/rpc/'+fn,{method:'POST',headers:{apikey:SB.key,Authorization:'Bearer '+SB.key,'Content-Type':'application/json'},body:JSON.stringify(args||{})});
  const t=await r.text();if(!r.ok)throw new Error(fn+' failed ('+r.status+'): '+t.slice(0,160));return t?JSON.parse(t):null;
}
const O=()=>S.online||(S.online={handle:'',token:'',ok:false,err:'',lastPull:0,lastPost:0});
async function copyText(t,id){try{await navigator.clipboard.writeText(t);toast('Copied','z');}catch(e){const i=$('#'+(id||'syncUrl'));if(i){i.focus();i.select();try{document.execCommand('copy');toast('Copied','z');}catch(e2){toast('Long-press the box, Select All, Copy');}}}}
function slug(s){return String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,20);}
async function goOnline(handle){
  const o=O();handle=slug(handle||S.name);if(!handle){toast('Pick a handle first');return;}
  if(!o.token)o.token=uid()+uid()+uid();
  try{const ok=await rpc('register_player',{p_handle:handle,p_token:o.token,p_name:S.name||handle});
    if(!ok){o.ok=false;o.err='The handle "'+handle+'" is taken by someone else. Pick another.';toast(o.err,'d');save();render();return;}
    o.handle=handle;o.ok=true;o.err='';log('Online as @'+handle+'.');toast('Online as @'+handle,'z');save();render();
    await pushPlayer();await pullSteps();await loadFriends();await partySync();
  }catch(e){o.ok=false;o.err=e.message;save();render();}
}
function publicState(){return {public:{name:S.name,av:S.av,cls:S.cls,base:S.base?{n:S.base.n,e:S.base.e,t:S.base.t,district:S.base.district,rooms:S.base.rooms}:null,defense:defense(),lvl:S.lvl,kills:S.kills,crew:activeCrew().length,weapon:eqItem('melee')?eqItem('melee').n:'fists',steps_today:S.steps.today,streak:S.streak.days,party:S.party.code},stash:{food:S.stock.food,water:S.stock.water,meds:S.stock.meds,scrap:S.stock.scrap,ammo:S.stock.ammo}};}
let pushTimer=0;
function pushPlayer(){const o=O();if(!o.ok)return Promise.resolve();clearTimeout(pushTimer);return new Promise(res=>{pushTimer=setTimeout(async()=>{try{rollWeek();await rpc('save_player',{p_handle:o.handle,p_token:o.token,p_name:S.name,p_tier:S.league.tier,p_week:S.league.week,p_score:S.league.score,p_state:publicState()});o.err='';}catch(e){o.err=e.message;}save();res();},400);});}
async function pullSteps(){
  const o=O();if(!o.ok)return;const since=new Date();since.setHours(0,0,0,0);
  try{const rows=await rpc('get_steps',{p_handle:o.handle,p_token:o.token,p_since:since.toISOString()});o.lastPull=Date.now();
    if(rows&&rows.length){const v=Math.max(...rows.map(r=>r.steps));if(v>(S.steps.lastSyncDate===S.steps.date?S.steps.lastSync:-1)){o.lastPost=new Date(rows[0].posted_at).getTime();syncTotal(v,'phone');}}
    o.err='';}catch(e){o.err=e.message;}
  save();renderOnline();
}
let friends=[];
async function loadFriends(){const o=O();if(!o.ok)return;try{rollWeek();friends=(await rpc('get_board',{p_week:S.league.week}))||[];o.err='';}catch(e){o.err=e.message;}renderFriends();}
async function testOnline(){const o=O();$('#onlineStatus').textContent='testing...';try{const t0=Date.now();await rpc('get_board',{p_week:S.league.week});o.err='';toast('Server answered in '+(Date.now()-t0)+' ms','z');}catch(e){o.err=e.message;toast('No answer: '+e.message,'d');}save();renderOnline();}
/* party: shared weekly contract + shared Wanted boss */
const PARTY_GOALS=[{t:'steps',goal:60000},{t:'places',goal:20},{t:'kills',goal:50},{t:'boss',goal:600}];
async function partyJoin(code){const o=O();if(!o.ok){toast('Go online first');return;}code=slug(code);if(!code){toast('Type a party code');return;}
  try{const r=await rpc('party_join',{p_handle:o.handle,p_token:o.token,p_code:code,p_week:weekId()});if(r&&r.error){toast(r.error,'d');return;}S.party.code=code;S.party.data=r;S.party.pending={};log('Joined party "'+code+'".');toast('Party joined','z');save();render();pushPlayer();}catch(e){toast(e.message,'d');}}
function partyLeave(){S.party.code='';S.party.data=null;save();render();pushPlayer();}
let partyTimer=0;
async function partySync(){const o=O();if(!o.ok||!S.party.code)return;const w=weekId();const delta={};for(const g of PARTY_GOALS){if(S.party.pending[g.t])delta[g.t]=S.party.pending[g.t];}
  try{const r=await rpc('party_progress',{p_handle:o.handle,p_token:o.token,p_code:S.party.code,p_week:w,p_delta:delta});if(r&&!r.error){S.party.data=r;S.party.pending={};
      if(r.progress&&PARTY_GOALS.every(g=>(r.progress[g.t]||0)>=g.goal)&&S.party.claimed!==w){S.party.claimed=w;S.keys++;S.league.score+=300;log('Party contract complete. +1 key, +300 points.');toast('Party contract complete!','l');SFX.play('legend');}}
    save();renderParty();}catch(e){}}

/* ================= pedometer + sync ================= */
let pedo={on:false,last:0,filt:0,count:0,got:false,wake:null};
function pedoToggle(){
  if(pedo.on){pedoStop();return;}const DM=window.DeviceMotionEvent;
  if(!DM){$('#pedoStatus').textContent='No motion sensors in this browser.';return;}
  const start=()=>{pedo.on=true;pedo.count=0;pedo.got=false;window.addEventListener('devicemotion',onMotion);$('#pedoBtn').textContent='Stop walk mode';$('#pedoStatus').textContent='Listening. Keep the screen on.';
    if(navigator.wakeLock)navigator.wakeLock.request('screen').then(w=>pedo.wake=w).catch(()=>{});
    setTimeout(()=>{if(pedo.on&&!pedo.got){$('#pedoStatus').textContent='Motion data is blocked here. Use the shortcut or Sync.';pedoStop(true);}},4000);};
  if(typeof DM.requestPermission==='function'){DM.requestPermission().then(r=>{if(r==='granted')start();else $('#pedoStatus').textContent='Motion permission denied.';}).catch(()=>{$('#pedoStatus').textContent='Motion permission is blocked in this view.';});}else start();
}
function onMotion(e){pedo.got=true;const a=e.accelerationIncludingGravity;if(!a)return;const mag=Math.sqrt((a.x||0)**2+(a.y||0)**2+(a.z||0)**2);pedo.filt=pedo.filt*0.8+mag*0.2;const now=Date.now();
  if(mag-pedo.filt>2.2&&now-pedo.last>280){pedo.last=now;pedo.count++;if(pedo.count%10===0)addSteps(10,'live');$('#pedoStatus').textContent='Counting: '+pedo.count+' steps this walk';}}
function pedoStop(silent){pedo.on=false;window.removeEventListener('devicemotion',onMotion);const rem=pedo.count%10;if(rem)addSteps(rem,'live');if(pedo.wake){try{pedo.wake.release();}catch(e){}pedo.wake=null;}$('#pedoBtn').textContent='Walk mode';if(!silent)$('#pedoStatus').textContent=pedo.count?'Walk saved: '+pedo.count+' steps.':'';}
function syncTotal(v,src){rollDay();let delta=(S.steps.lastSyncDate===S.steps.date)?v-S.steps.lastSync:v-S.steps.today;
  if(delta<0){toast('That is fewer than the last sync ('+fmt(S.steps.lastSync)+').');return false;}
  S.steps.lastSync=v;S.steps.lastSyncDate=S.steps.date;if(delta===0){toast('Already synced to '+fmt(v));save();render();return true;}
  toast('+'+fmt(delta)+' steps ('+src+')','z');addSteps(delta,src);return true;}
function autoSyncFromUrl(){try{const q=new URLSearchParams(location.search);const h=new URLSearchParams(location.hash.replace(/^#/,''));const v=parseInt(q.get('steps')||h.get('steps'),10);if(v>=0){syncTotal(v,'shortcut');history.replaceState(null,'',location.pathname);}}catch(e){}}
async function readClipboard(){try{const t=await navigator.clipboard.readText();const m=String(t).replace(/,/g,'').match(/\d{2,6}/);if(!m){toast('No step count on the clipboard');return;}syncTotal(parseInt(m[0],10),'clipboard');}catch(e){toast('Clipboard is blocked here. Type it in Sync.');}}

/* ================= scene ================= */
const cv=$('#cv'),ctx=cv.getContext('2d');const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let particles=[];
function drawScene(t){
  const W=cv.width,H=cv.height;const prog=S.walk.dist?S.walk.progress/S.walk.dist:0;const walking=!reduced&&Date.now()-S.lastAnim<3500&&!S.loc;const bob=walking?Math.abs(Math.sin(t/140))*6:0;const scroll=S.walk.houses*1000+prog*1000;
  const night=isNight();const k=wxKind();
  const sky=ctx.createLinearGradient(0,0,0,H);if(night){sky.addColorStop(0,'#07070c');sky.addColorStop(.6,'#15121c');sky.addColorStop(1,'#2a1c22');}else if(k==='rain'||k==='storm'){sky.addColorStop(0,'#1a1c22');sky.addColorStop(.6,'#2e3038');sky.addColorStop(1,'#3e3a3a');}else if(k==='snow'){sky.addColorStop(0,'#2a2c34');sky.addColorStop(.6,'#464852');sky.addColorStop(1,'#5a5560');}else{sky.addColorStop(0,'#0e0e12');sky.addColorStop(.55,'#2a2226');sky.addColorStop(1,'#4a3126');}ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
  ctx.fillStyle=night?'#e8e0d0':'#d9c9a6';ctx.globalAlpha=.85;ctx.beginPath();ctx.arc(W-150,90,40,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;if(night){ctx.fillStyle='#0e0e12';ctx.beginPath();ctx.arc(W-136,80,34,0,Math.PI*2);ctx.fill();}
  const r0=mulberry(3);ctx.fillStyle='rgba(60,50,55,.5)';for(let i=0;i<5;i++){let x=(i*260-scroll*0.15);x=((x%(W+300))+(W+300))%(W+300)-150;const dy=Math.sin(t/2000+i)*6;ctx.beginPath();ctx.ellipse(x,120+dy,50+r0()*30,22,0,0,Math.PI*2);ctx.fill();}
  ctx.fillStyle='#17151a';const r2=mulberry(11);for(let i=0;i<14;i++){const bw=60+r2()*80,bh=60+r2()*130;let x=(i*140-scroll*0.25);x=((x%(W+200))+(W+200))%(W+200)-100;ctx.fillRect(x,290-bh,bw,bh);if(r2()<.3){ctx.fillStyle='#e0a530';ctx.globalAlpha=.5;ctx.fillRect(x+10,290-bh+20,8,8);ctx.globalAlpha=1;ctx.fillStyle='#17151a';}}
  ctx.fillStyle=k==='snow'?'#8a8a90':'#2b2528';ctx.fillRect(0,290,W,H-290);ctx.fillStyle=k==='snow'?'#b8b8c0':'#3a3335';ctx.fillRect(0,320,W,18);ctx.fillStyle='#1c1a1d';ctx.fillRect(0,338,W,H-338);
  ctx.fillStyle='#5a5240';for(let i=0;i<12;i++){let x=(i*120-scroll)%(W+120);x=((x%(W+120))+(W+120))%(W+120)-60;ctx.fillRect(x,410,60,5);}
  const r3=mulberry(S.walk.houses+21);for(let i=0;i<2;i++){let x=(i*520+r3()*300-scroll);x=((x%(W+300))+(W+300))%(W+300)-150;ctx.fillStyle=['#5b3a3a','#3a4a5b','#5b5240'][Math.floor(r3()*3)];ctx.fillRect(x,372,110,34);ctx.fillRect(x+20,356,60,20);ctx.fillStyle='#111';ctx.fillRect(x+12,400,20,10);ctx.fillRect(x+78,400,20,10);}
  ctx.fillStyle='#3d3538';for(let i=0;i<40;i++){let x=(i*34-scroll*0.6);x=((x%(W+40))+(W+40))%(W+40)-20;ctx.fillRect(x,282,7,40);}ctx.fillRect(0,290,W,4);
  const bx=W*0.55+(1-prog)*W*0.7;drawBuilding(bx,S.loc?S.loc.t:'house',S.loc?S.loc.e:'');
  const rz=mulberry(S.walk.houses+3);for(let i=0;i<2;i++){const zx=bx+230+i*80+rz()*40;if(zx<W+40){const sway=Math.sin(t/500+i)*3;drawSprite(ART.zombieSVG(i===0?'walker':'runner',100),zx,300+sway,110);}}
  // crew behind, pet in front
  const ac=activeCrew();ac.slice(0,2).forEach((c,i)=>drawSprite(ART.avatarSVG(c.av,100),W*0.26-70-i*55,300-(walking?Math.abs(Math.sin(t/140+i+1))*5:0),105));
  drawSprite(ART.avatarSVG(S.av,100,{weapon:eqItem('melee')?'melee':eqItem('ranged')?'gun':''}),W*0.26,296-bob,120);
  if(S.pet)drawSprite(ART.petSVG(S.pet,64),W*0.26+70,356-(walking?Math.abs(Math.sin(t/110))*6:0),62);
  // weather particles
  if(!reduced&&(k==='rain'||k==='storm'||k==='snow')){if(particles.length<(k==='snow'?80:140))particles.push({x:Math.random()*W,y:Math.random()*H,v:k==='snow'?rnd(.6,1.4):rnd(6,10),d:rnd(-1,1)});ctx.strokeStyle=k==='snow'?'rgba(255,255,255,.8)':'rgba(180,200,230,.5)';ctx.lineWidth=k==='snow'?3:1.5;ctx.lineCap='round';for(const p of particles){ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x+(k==='snow'?0:-2),p.y+(k==='snow'?2:14));ctx.stroke();p.y+=p.v*(k==='snow'?1:4);p.x+=k==='snow'?Math.sin(t/800+p.d)*.8:-1;if(p.y>H){p.y=-10;p.x=Math.random()*W;}}}
  if(k==='storm'&&!reduced&&Math.random()<0.01){ctx.fillStyle='rgba(255,255,255,.35)';ctx.fillRect(0,0,W,H);}
  const fog=ctx.createLinearGradient(0,H-110,0,H);fog.addColorStop(0,'rgba(20,18,22,0)');fog.addColorStop(1,'rgba(20,18,22,.95)');ctx.fillStyle=fog;ctx.fillRect(0,H-110,W,110);
  if(k==='fog'){ctx.fillStyle='rgba(120,120,130,.35)';ctx.fillRect(0,0,W,H);}
}
function drawSprite(svg,x,y,h){const img=ART.spriteImg(svg);if(!img.complete||!img.naturalWidth){img.onload=()=>animateOnce();return;}const w=h*img.naturalWidth/img.naturalHeight;ctx.drawImage(img,x-w/2,y,w,h);}
function drawBuilding(x,kind,emoji){const w=220,h=170,y=290-h;const col={house:'#4a3d44',pharmacy:'#2f4a5a',gas:'#5a4a2f',grocery:'#2f5a44',police:'#2f3a5a',clinic:'#5a2f3a',hardware:'#5a3f2f',surplus:'#3f4a2f',stronghold:'#5a2a22'}[kind]||'#4a3d44';
  ctx.fillStyle='#0a0a0c';ctx.fillRect(x+8,y+8,w,h);ctx.fillStyle=col;ctx.fillRect(x,y,w,h);ctx.fillStyle='#1a1719';ctx.beginPath();ctx.moveTo(x-14,y);ctx.lineTo(x+w/2,y-64);ctx.lineTo(x+w+14,y);ctx.closePath();ctx.fill();
  for(let i=0;i<3;i++)for(let j=0;j<2;j++){ctx.fillStyle=(i+j)%3===0?'#0d0c0e':'#161418';ctx.fillRect(x+24+i*66,y+28+j*66,36,36);ctx.strokeStyle='#0d0c0e';ctx.lineWidth=3;ctx.strokeRect(x+24+i*66,y+28+j*66,36,36);if((i*j)%2===1){ctx.strokeStyle='#5a4a3a';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(x+20+i*66,y+36+j*66);ctx.lineTo(x+64+i*66,y+40+j*66);ctx.stroke();}}
  ctx.fillStyle='#0d0c0e';ctx.fillRect(x+w/2-22,y+h-64,44,64);ctx.font='38px serif';ctx.textAlign='center';ctx.fillText(emoji||'',x+w/2,y-12);ctx.textAlign='start';
  if(kind==='stronghold'){ctx.fillStyle='#c22b3a';ctx.fillRect(x+w/2-3,y-110,6,50);ctx.fillRect(x+w/2,y-110,40,22);}}
let raf=0;function animate(){cancelAnimationFrame(raf);const step=(t)=>{drawScene(t);const k=wxKind();if(!reduced&&(Date.now()-S.lastAnim<3500||k==='rain'||k==='storm'||k==='snow'))raf=requestAnimationFrame(step);};raf=requestAnimationFrame(step);}
function animateOnce(){if(!raf)animate();else drawScene(performance.now());}

/* ================= render ================= */
function render(){
  rollDay();rollWeek();ctRoll();checkRaids();
  $('#hpNum').textContent=S.hp+' / '+maxHp();$('#hpBar').style.width=clamp(S.hp/maxHp()*100,0,100)+'%';
  $('#topSteps').textContent=fmt(S.steps.today);
  $('#sceneTag').textContent=district().n+' · '+S.walk.houses+' places';$('#arriveTag').hidden=!S.loc;
  const wt=$('#wxTag');wt.hidden=false;wt.textContent=wxLabel();
  $('#pbar').style.width=(S.loc?100:(S.walk.dist?S.walk.progress/S.walk.dist*100:0))+'%';
  $('#pleft').innerHTML=S.loc?'<b>You are here.</b>':'Next place in <b>'+fmt(S.walk.toNext)+'</b> steps';
  $('#pright').innerHTML='Run <b>x'+runMult().toFixed(1)+'</b> · Pack <b>'+fmt(packPts())+'</b> pts';
  $('#syncHint').textContent=S.steps.lastSyncDate===S.steps.date&&S.steps.lastSync?'synced at '+fmt(S.steps.lastSync):'';
  renderLoc();renderRaidCard();renderContracts();
  $('#goalSub').textContent='streak '+S.streak.days;$('#goalBar').style.width=Math.min(100,S.steps.today/S.goal*100)+'%';$('#goalLeft').innerHTML='<b>'+fmt(S.steps.today)+'</b> / '+fmt(S.goal);$('#goalRight').textContent=S.steps.today>=S.goal?'Done. +2 food, +2 water, +15 XP.':fmt(S.goal-S.steps.today)+' to go';
  $('#journal').innerHTML=S.journal.slice(0,12).map(j=>`<li><time>${timeStr(j.t)}</time><span>${esc(j.m)}</span></li>`).join('')||'<li><span class="help">Nothing yet.</span></li>';
  // pack
  $('#packSub').textContent=S.pack.length+' / '+capacity();$('#runMult').textContent='x'+runMult().toFixed(1);$('#packPts').textContent=fmt(packPts());$('#keyCount').textContent=S.keys;
  $('#bankBtn').disabled=!!S.loc||!S.pack.length||!!S.combat;$('#bankBtn').textContent=S.base?'Stash it at '+S.base.n:'Claim a base first';
  $('#packAlert').hidden=!S.pack.some(p=>p.cat==='chest'&&(S.keys>0||sk('lockpick')));
  $('#packList').innerHTML=S.pack.length?S.pack.map(it=>`<div class="item r-${it.r||'common'}"><span class="e">${it.e}</span>${esc(it.n)}${it.qty?' x'+it.qty:''}${it.cat==='chest'?`<button class="btn xs a" onclick="openChest('${it.uid}')">${S.keys>0?'Open':sk('lockpick')?'Pick':'Locked'}</button>`:`<span class="pt">+${it.pts}</span>`}</div>`).join(''):'<p class="help">Empty.</p>';
  const canRepair=(S.base&&S.base.rooms.armory)||roleLvl('engineer');
  $('#gearList').innerHTML=S.gear.length?S.gear.map(g=>{const eq=S.eq[g.slot]===g.uid;const d=g.slot==='melee'?g.dmg[0]+'-'+g.dmg[1]+' dmg · '+(g.id==='oldreliable'?'never breaks':g.dur+'/'+GEAR[g.id].dur+' durability'):g.slot==='ranged'?g.dmg[0]+'-'+g.dmg[1]+' dmg · uses '+(g.ammo==='shells'?'shells':'rounds'):g.slot==='bag'?'+'+g.cap+' capacity':'-'+g.dr+' damage taken';return `<div class="gear${eq?' eq':''}" style="border-left-color:${RAR[g.r||'common'].c}"><div class="e">${g.e}</div><div><div class="n">${esc(g.n)} <span class="chip s">${g.slot}</span>${eq?' <span class="chip a">equipped</span>':''}</div><div class="d"><span class="rc-${g.r||'common'}">${RAR[g.r||'common'].n}</span> · ${d}${g.legend?' · '+g.legend:''}</div></div><div class="stack" style="gap:4px"><button class="btn sm ${eq?'':'r'}" onclick="equip('${g.uid}')">${eq?'Unequip':'Equip'}</button>${g.slot==='melee'&&canRepair&&g.dur<GEAR[g.id].dur&&g.id!=='oldreliable'?`<button class="btn sm" onclick="repair('${g.uid}')">Repair 3🔩</button>`:''}<button class="btn sm ghost" onclick="dropGear('${g.uid}')">Drop</button></div></div>`;}).join(''):'<p class="help">Bare hands. Garages, hardware stores and the police station have gear.</p>';
  // you
  $('#youAv').innerHTML=ART.avatarSVG(S.av,110,{weapon:eqItem('melee')?'melee':eqItem('ranged')?'gun':''});$('#youName').textContent=(S.name||'Survivor')+' · '+(CLASSES[S.cls]?CLASSES[S.cls].n:'')+' '+S.lvl;
  $('#youKv').innerHTML=`<span>HP</span><b>${S.hp} / ${maxHp()}</b><span>Damage</span><b>${eqItem('melee')?(eqItem('melee').dmg[0]+sk('heavyhands')*2)+'-'+(eqItem('melee').dmg[1]+sk('heavyhands')*2):baseDmg()[0]+'-'+baseDmg()[1]} +${S.lvl-1}</b><span>Damage reduction</span><b>${dr()}</b><span>Kills</span><b>${S.kills}</b><span>Lifetime steps</span><b>${fmt(S.steps.total)}</b>${S.pet?`<span>Companion</span><b>${PETS[S.pet].e} ${PETS[S.pet].n}</b>`:''}`;$('#youXp').style.width=(S.xp/(S.lvl*40)*100)+'%';
  $('#cosmeticCount').textContent=S.cosmetics.length+' cosmetics found';
  $('#spSub').textContent=S.sp+' point'+(S.sp===1?'':'s')+' to spend';$('#youAlert').hidden=!S.sp;$('#clsDesc').textContent=CLASSES[S.cls]?CLASSES[S.cls].e+' '+CLASSES[S.cls].n+'. One point per level and per county milestone. General skills are open to every class.':'';
  $('#skills').innerHTML=skillList().map(s=>{const r=sk(s.id);return `<div class="skill${r>=s.max?' max':''}"><div><b>${s.n} ${SKILLS.general.includes(s)?'<span class="chip" style="font-size:10px">general</span>':''}</b><span>${s.d(Math.max(1,r))}${r?' · now: '+s.d(r):''}</span><div class="pips">${Array.from({length:s.max},(_,i)=>`<i class="${i<r?'on':''}"></i>`).join('')}</div></div><button class="btn sm ${S.sp>0&&r<s.max?'a':''}" onclick="learn('${s.id}')" ${S.sp>0&&r<s.max?'':'disabled'}>${r>=s.max?'Max':'+'}</button></div>`;}).join('');
  $('#crewSub').textContent=S.active.length+' / '+crewSlots()+' active · '+S.crew.length+' total';
  $('#crewList').innerHTML=S.crew.length?S.crew.map(c=>{const act=S.active.includes(c.id);return `<div class="crew${act?' active':''}"><div class="av">${ART.avatarSVG(c.av,70)}</div><div><div class="nm">${esc(c.name)} <span class="chip a">Lv ${c.lvl}</span></div><div class="role">${ROLES[c.role].e} ${ROLES[c.role].n}</div><div class="tr">${ROLES[c.role].d(c.lvl+sk('leader'))}</div><div class="xp"><i style="width:${Math.min(100,c.xp/(c.lvl*6)*100)}%"></i></div><div class="a2"><button class="btn sm ${act?'':'r'}" onclick="toggleCrew('${c.id}')">${act?'Leave at base':'Bring along'}</button></div></div></div>`;}).join(''):'<p class="help">Nobody yet. Survivors hide in the places you search.</p>';
  // base
  const bh=$('#baseHead');
  if(!S.base){bh.className='card blood';bh.innerHTML='<h2>No base yet</h2><p>Clear any place, then tap <b>Claim as base</b> on it. Where you set up matters: a police station comes with an armory and walls, a pharmacy with a clinic, a gas station with a generator. You can move later for 20 scrap.</p>';}
  else{bh.className='card';bh.innerHTML=`<h2>${S.base.e} ${esc(S.base.n)} <span class="sub">${esc(S.base.district)}</span></h2><p>${BASE_PERK[S.base.t]||''}</p><div class="def" style="margin-top:10px"><div class="big">${defense()}</div><div><div class="section-label">Defense</div><div class="help">${S.raidPending?(S.base.rooms.tower?'Watchtower spotted raiders. They hit at '+S.raidPending.hour+':00 today with strength '+S.raidPending.power+'.':'Something feels off today.'):'Raiders scale with your stash. Walls, towers and traps hold them off.'}</div></div></div>`;}
  $('#baseAlert').hidden=!(S.raidPending&&S.base&&S.base.rooms.tower);
  $('#stock').innerHTML=['food','water','meds','scrap','ammo'].map(k=>`<div class="s"><div class="e">${{food:'🥫',water:'💧',meds:'💊',scrap:'🔩',ammo:'📦'}[k]}</div><b>${S.stock[k]}</b><span>${CAT_LABEL[k]}</span></div>`).join('')+`<div class="s"><div class="e">🛡️</div><b>${defense()}</b><span>Defense</span></div>`;
  $('#dropRow').hidden=!(S.base&&S.base.rooms.radio);$('#dropBtn').disabled=S.flags.dropDate===S.steps.date;$('#dropHelp').textContent=S.flags.dropDate===S.steps.date?'Used today.':'Three free items into your pack.';
  $('#build').innerHTML=S.base?Object.entries(BUILD).map(([k,b])=>{const l=S.base.rooms[k]||0;const c=buildCost(k);return `<div class="room2${l?' own':''}"><div class="e">${b.e}</div><div class="t"><b>${b.n}${l?' L'+l:''}${b.def[l-1]?' · +'+b.def[l-1]+' def':''}</b><span>${b.d}${c!==null?' · next: '+c+' scrap':' · maxed'}</span></div>${c!==null?`<button class="btn sm a" onclick="build('${k}')">Build</button>`:'<span class="chip z">max</span>'}</div>`;}).join(''):'<p class="help">Claim a base to build.</p>';
  $('#raidLog').innerHTML=S.raids.length?S.raids.map(r=>`<li><time>${r.t.slice(5)}</time><span>${r.by?esc(r.by)+': ':''}${r.repelled?(r.fought?'You fought them off yourself.':'Held: '+r.def+' def vs '+r.power+'.'):'Broke in ('+r.power+' vs '+r.def+'). Took '+Object.entries(r.stolen).map(([k,v])=>v+' '+k).join(', ')+'.'}</span></li>`).join(''):'<li><span class="help">No raids yet. They start the day after you claim a base.</span></li>';
  $('#shelfSub').textContent=S.shelf.length+' found';const shelfIds=Object.entries(ITEMS).filter(([k,v])=>v.cat==='shelf');const owned=S.shelf.reduce((m,x)=>{m[x.id]=(m[x.id]||0)+1;return m;},{});
  $('#shelf').innerHTML=shelfIds.map(([k,v])=>`<div class="it${owned[k]?'':' locked'}"><div class="e">${v.e}</div><span class="rc-${v.r}">${v.n}${owned[k]>1?' x'+owned[k]:''}</span></div>`).join('');
  $('#goalInput').value=S.goal;$('#nameInput').value=S.name;$('#sfxBtn').textContent=S.sfx?'On':'Off';
  // county
  renderMap();renderParty();
  const tier=TIERS[S.league.tier];$('#tierBadge').textContent=tier.e;$('#tierName').textContent=tier.n;$('#tierSub').textContent='Tier '+(S.league.tier+1)+' of '+TIERS.length+' · stash x'+tier.mult;
  const end=new Date(weekStart());end.setDate(end.getDate()+7);const left=Math.max(0,end-Date.now());$('#weekChip').textContent='Week of '+S.league.week;$('#resetChip').textContent=Math.floor(left/86400000)+'d '+Math.floor(left%86400000/3600000)+'h left';
  const b=board();$('#board').innerHTML=b.map((r,i)=>`<div class="lbrow${r.me?' me':''}"><div class="rk">${i+1}</div><div class="av">${ART.avatarSVG(r.av,40)}</div><div class="nm">${esc(r.n)}${r.me?' (you)':''}<small>${r.me?'stash runs to score':esc(r.blurb)}</small></div><div class="sc">${fmt(r.s)}</div></div>`).join('');
  const myRank=b.findIndex(r=>r.me)+1;const lead=b[0].me?b[1]:b[0];$('#boardHelp').textContent=myRank===1?'You are in first. Hold it through Sunday night to move up.':'You are #'+myRank+', '+fmt(lead.s-S.league.score)+' behind '+lead.n+'. They keep walking while you sleep.';
  $('#radio').innerHTML=radioLines().map(l=>`<li><time>${l.t}</time><span>${esc(l.m)}</span></li>`).join('');
  $('#seasons').innerHTML=S.league.history.length?S.league.history.map(h=>`<li><time>${h.week.slice(5)}</time><span>#${h.rank} · ${fmt(h.score)} pts · ${TIERS[h.tier].n}${h.delta>0?' → promoted':h.delta<0?' → dropped':' → held'}</span></li>`).join(''):'<li><span class="help">First week still running.</span></li>';
  if(S.league.history.length&&S.league.seen!==S.league.history[0].week&&!S.combat){const h=S.league.history[0];S.league.seen=h.week;save();openSheet(`<h2>Week over</h2><div class="big">${h.delta>0?'🏆':h.delta<0?'📉':'⚔️'}</div><p>Week of ${h.week}: <b>#${h.rank}</b> with ${fmt(h.score)} points in ${TIERS[h.tier].n}. ${h.delta>0?'Promoted to '+TIERS[S.league.tier].n+'. Rivals and raiders get harder.':h.delta<0?'Dropped to '+TIERS[S.league.tier].n+'.':'You held your tier.'}</p><button class="btn r wide" onclick="closeSheet()">New week</button>`);}
  renderOnline();renderFriends();animate();raidTick();
}
function renderLoc(){
  const el=$('#locCard');const loc=S.loc;if(!loc){el.hidden=true;return;}el.hidden=false;el.className='card amber';
  if(loc.stronghold){
    const stageNames=['the gate','the yard','the boss trailer'];const next=loc.stage<3?stageNames[loc.stage]:null;
    el.innerHTML=`<h2>🏴 ${esc(loc.n)} <span class="sub">stage ${loc.stage}/3</span></h2><p><b style="color:var(--bone)">WANTED: ${esc(bossName())}</b>. Fires, tents, a trailer with a padlock. Fight through ${next?next:'nothing, it is yours'}${loc.stage<3?', or take what you have and go':''}. Every stage you clear opens its loot.</p>
    ${loc.stage>0?`<div class="row" style="margin:8px 0 4px;justify-content:space-between"><span class="section-label">Noise</span></div><div class="noise"><i style="width:${loc.noise}%"></i></div><div class="rooms" style="margin-top:12px">${loc.rooms.map((r,i)=>`<button class="room${r.done?' done':''}" onclick="searchRoom(${i})" ${r.done||r.stage>loc.stage?'disabled':''}><span class="n">${esc(r.n)}</span><span class="m">${r.done?'searched':r.stage>loc.stage?'locked: stage '+r.stage:'noise +'+r.noise}</span></button>`).join('')}</div>`:''}
    ${loc.found.length?`<div class="section-label" style="margin-top:12px">Found here</div><div class="loot" style="margin-top:6px">${loc.found.map(it=>`<div class="item r-${it.r||'common'}"><span class="e">${it.e}</span>${esc(it.n)}<span class="pt">+${it.pts}</span></div>`).join('')}</div>`:''}
    <div class="grid2" style="margin-top:12px">${next?`<button class="btn d" onclick="pushStage()">Push to ${next}</button>`:`<button class="btn" onclick="claimBase()">${S.base?'Move base here (20 scrap)':'Claim as base'}</button>`}<button class="btn ${next?'':'r'}" onclick="leaveLoc()">${loc.stage?'Take the loot and go':'Keep walking'}</button></div>`;return;}
  if(!loc.cleared){el.innerHTML=`<h2>${loc.e} ${esc(loc.n)} <span class="sub">unknown</span></h2><p>Door is ajar. No telling what is inside. Threat here: ${'☠'.repeat(Math.min(5,Math.round(district().threat*loc.threat+(isNight()?1:0))))}${isNight()?' · horde night':''}</p><div class="grid2" style="margin-top:12px"><button class="btn r" onclick="enterLoc()">Go in</button><button class="btn" onclick="leaveLoc()">Keep walking</button></div>`;return;}
  const done=loc.rooms.every(r=>r.done);
  el.innerHTML=`<h2>${loc.e} ${esc(loc.n)} <span class="sub">${loc.rooms.filter(r=>r.done).length}/${loc.rooms.length} searched</span></h2>
  <div class="row" style="margin:8px 0 4px;justify-content:space-between"><span class="section-label">Noise</span><span class="help">${loc.noise>=70?'Something is stirring':loc.noise>=40?'Keep it down':'Quiet'}</span></div><div class="noise"><i style="width:${loc.noise}%"></i></div>
  <div class="rooms" style="margin-top:12px">${loc.rooms.map((r,i)=>`<button class="room${r.done?' done':''}" onclick="searchRoom(${i})" ${r.done?'disabled':''}><span class="n">${esc(r.n)}</span><span class="m">${r.done?'searched':'noise +'+r.noise}</span>${r.peek&&!r.done?`<span class="peek">🔭 ${esc(r.peek)}</span>`:''}</button>`).join('')}</div>
  ${loc.found.length?`<div class="section-label" style="margin-top:12px">Found here</div><div class="loot" style="margin-top:6px">${loc.found.map(it=>`<div class="item r-${it.r||'common'}"><span class="e">${it.e}</span>${esc(it.n)}<span class="pt">+${it.pts}</span></div>`).join('')}</div>`:''}
  <div class="grid2" style="margin-top:12px"><button class="btn ${done?'r':''}" onclick="leaveLoc()">${done?'Move on':'Leave the rest'}</button><button class="btn" onclick="claimBase()">${S.base?'Move base here (20 scrap)':'Claim as base'}</button></div>`;
}
function renderRaidCard(){const el=$('#raidCard');if(!S.raidPending||!S.base||!S.base.rooms.tower){el.hidden=true;return;}el.hidden=false;el.className='card blood';el.innerHTML=`<h2>🗼 Raiders spotted</h2><p>The watchtower saw a crew heading for ${esc(S.base.n)}. Expected around ${S.raidPending.hour}:00 today, strength ${S.raidPending.power} against your ${defense()} defense. Build now, or be home to fight.</p>`;}
function renderContracts(){
  const d=S.ct.daily||[];const w=S.ct.weekly;$('#contractsSub').textContent=d.filter(c=>c.done).length+'/'+d.length+' today';
  const row=(t,n,goal,done,reward)=>`<div class="contract${done?' done':''}"><div><b>${CT_TYPES[t].n}${goal>1?' '+fmt(goal)+' '+CT_TYPES[t].u:''}</b><span>${done?'Done. ':''}${reward}</span><div class="bar"><i style="width:${Math.min(100,n/goal*100)}%"></i></div></div><div class="num" style="font-size:20px;color:${done?'var(--rot)':'var(--bone2)'}">${done?'✓':fmt(Math.min(n,goal))+'/'+fmt(goal)}</div></div>`;
  let html=d.map(c=>row(c.t,c.n,c.goal,c.done,'+'+c.reward.scrap+' scrap, +'+c.reward.xp+' XP'+(c.reward.key?', +1 key':''))).join('');
  if(w){html+=`<div class="section-label" style="margin-top:6px">This week</div>`+w.goals.map(g=>row(g.t,g.n,g.goal,g.n>=g.goal,'Weekly: +1 key, a cosmetic, +200 pts')).join('');}
  $('#contracts').innerHTML=html;
}
function renderMap(){
  const ud=unlockedDistrict();$('#mapSub').textContent=(ud+1)+'/'+DISTRICTS.length+' regions';
  const pts=[[60,150],[170,110],[280,140],[390,90],[500,130],[610,80]];
  let svg=`<svg class="map" viewBox="0 0 680 200" role="img" aria-label="Map of Hollow County"><defs><pattern id="g" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0 H0 V20" fill="none" stroke="#252825" stroke-width="1"/></pattern></defs><rect width="680" height="200" fill="url(#g)"/><path d="M40 160 C120 120,140 90,190 110 S260 150,290 140 S340 80,390 90 S460 140,500 130 S570 70,620 80" fill="none" stroke="#3a3335" stroke-width="14" stroke-linecap="round"/><path d="M40 160 C120 120,140 90,190 110 S260 150,290 140 S340 80,390 90 S460 140,500 130 S570 70,620 80" fill="none" stroke="#5a5240" stroke-width="2" stroke-dasharray="6 8"/>`;
  DISTRICTS.forEach((d,i)=>{const [x,y]=pts[i];const open=i<=ud;const here=i===S.walk.district;svg+=`<g opacity="${open?1:.35}"><circle cx="${x}" cy="${y}" r="${here?18:14}" fill="${open?(i===S.walk.district?'#e6a530':'#7fbf4d'):'#3a3a44'}" stroke="${here?'#fff':'#1a1a1e'}" stroke-width="3"/><text x="${x}" y="${y+5}" text-anchor="middle" font-size="14" font-family="sans-serif">${open?['🏘️','🏙️','🏚️','🏥','⚓','🌉'][i]:'🔒'}</text><text x="${x}" y="${y+34}" text-anchor="middle" font-size="11" font-weight="700" fill="#e8e0d0" font-family="sans-serif">${d.n}</text><text x="${x}" y="${y+46}" text-anchor="middle" font-size="9" fill="#b9b2a4" font-family="sans-serif">${open?(i===0?'start':fmt(d.steps)+' steps'):fmt(d.steps)+' lifetime steps'}</text></g>`;});
  if(S.base){const bi=DISTRICTS.findIndex(d=>d.n===S.base.district);if(bi>=0){const [x,y]=pts[bi];svg+=`<text x="${x+16}" y="${y-12}" font-size="14">🏚️</text>`;}}
  svg+='</svg>';$('#mapBox').innerHTML=svg;
  const next=DISTRICTS[ud+1];$('#mapHelp').textContent=next?'You are in '+district().n+'. '+next.n+' opens at '+fmt(next.steps)+' lifetime steps ('+fmt(Math.max(0,next.steps-S.steps.total))+' to go). Each region opened is +1 skill point and +1 key. The Wanted boss this week: '+bossName()+'.':'Every region is open. The Overpass is the end of the road, for now.';
}
function renderParty(){
  const o=O();const el=$('#partyBody');const sub=$('#partySub');
  if(!o.ok){sub.textContent='offline';el.innerHTML='<p class="help">Go online in Settings, then join a party with the same code as your partner. Your steps, kills and boss damage add together on one weekly contract.</p>';return;}
  if(!S.party.code){sub.textContent='none';el.innerHTML=`<p class="help">Pick any code (like your names mashed together) and both of you type the same one.</p><div class="row" style="margin-top:8px"><input id="partyInput" type="text" maxlength="20" placeholder="party code" style="flex:1;min-width:120px"><button class="btn r" onclick="partyJoin($('#partyInput').value)">Join</button></div>`;return;}
  const d=S.party.data||{};const prog=d.progress||{};const members=d.members||[];const w=weekId();
  sub.textContent=members.length+' in party';
  el.innerHTML=`<div class="row"><span class="chip s">code: <b>${esc(S.party.code)}</b></span>${members.map(m=>`<span class="chip">${esc(m)}</span>`).join('')}<button class="btn xs ghost" onclick="partyLeave()">Leave</button></div><div class="stack" style="margin-top:10px">${PARTY_GOALS.map(g=>{const n=(prog[g.t]||0)+(S.party.pending[g.t]||0);const done=n>=g.goal;return `<div class="contract${done?' done':''}"><div><b>${CT_TYPES[g.t].n} ${fmt(g.goal)} ${CT_TYPES[g.t].u}</b><span>${g.t==='boss'?'Damage to '+bossName()+' from anyone in the party counts':'Everyone\'s progress adds up'}</span><div class="bar"><i style="width:${Math.min(100,n/g.goal*100)}%"></i></div></div><div class="num" style="font-size:20px;color:${done?'var(--rot)':'var(--bone2)'}">${fmt(Math.min(n,g.goal))}/${fmt(g.goal)}</div></div>`;}).join('')}</div><p class="help" style="margin-top:8px">Finish all four before Sunday night: +1 key and +300 points for everyone. Resets weekly (${w}).</p>`;
}
function renderOnline(){
  const o=O();const st=$('#onlineStatus');if(!st)return;
  st.textContent=o.ok?'@'+o.handle:(o.err?'error':'off');
  let body='';
  if(!o.ok){body=`<div class="row"><input id="handleInput" type="text" maxlength="20" placeholder="handle, e.g. celeste" value="${esc(o.handle||slug(S.name))}" style="flex:1;min-width:140px"><button class="btn r" onclick="goOnline($('#handleInput').value)">Go online</button></div>${o.err?`<p class="help" style="color:#ff8a92">${esc(o.err)}</p>`:''}`;}
  else{body=`<div class="kv"><span>Handle</span><b>@${esc(o.handle)}</b><span>Last phone sync</span><b>${o.lastPost?timeStr(o.lastPost)+' today':'none yet'}</b><span>Server</span><b>${o.err?'<span style="color:#ff8a92">'+esc(o.err)+'</span>':'ok'}</b></div><div class="row" style="margin-top:8px"><button class="btn sm" onclick="pullSteps();loadFriends();partySync();toast('Syncing')">Sync now</button><button class="btn sm ghost" onclick="testOnline()">Test connection</button></div>`;}
  $('#onlineBody').innerHTML=body;
  const sh=$('#shortcutHelp');if(sh){const url=SB.url+'/rest/v1/rpc/post_steps_link?apikey='+SB.key;const prefix=o.handle+'|'+o.token+'|';sh.innerHTML=o.ok?`<b>iPhone, one time.</b> Two things to copy:<br>
  <div class="section-label" style="margin-top:8px">A. The address</div><input id="syncUrl" readonly value="${esc(url)}" style="margin:6px 0;font-size:11px"><button class="btn sm a" onclick="copyText($('#syncUrl').value,'syncUrl')">Copy address</button>
  <div class="section-label" style="margin-top:10px">B. Your code</div><input id="syncPrefix" readonly value="${esc(prefix)}" style="margin:6px 0;font-size:11px"><button class="btn sm a" onclick="copyText($('#syncPrefix').value,'syncPrefix')">Copy code</button>
  <ol style="padding-left:20px;margin:10px 0">
  <li><b>Shortcuts</b> app → <b>Shortcuts</b> tab → <b>+</b>. Add three actions with the search: <b>Find Health Samples</b> (Type: Steps, filter Start Date is today), <b>Calculate Statistics</b> (Sum of Health Samples), <b>Get Contents of URL</b>.</li>
  <li>In <b>Get Contents of URL</b>: paste the <b>address</b> (A) in the URL box. Tap <b>Show More</b>. Set <b>Method</b> to <b>POST</b>. Set <b>Request Body</b> to <b>JSON</b>. Tap <b>Add new field</b> → <b>Text</b>. In the <b>Key</b> box type the single letter <b>p</b>. In the <b>Text</b> box paste your <b>code</b> (B), then with the cursor right after the last <b>|</b> tap the <b>Sum</b> bubble above the keyboard.</li>
  <li>Name it <b>Dead Miles Steps</b>, tap Done, tap play to test. It should end with <b>true</b>.</li>
  <li><b>Automation</b> tab → <b>+</b> → <b>Time of Day</b> → a time, Daily, Run Immediately → <b>Next</b> → tap <b>Dead Miles Steps</b>. Make a few (noon, 4 pm, 8 pm, 11 pm).</li>
  </ol>
  <b>Android:</b> install the tiny companion app <a href="./DeadMilesSteps.apk">DeadMilesSteps.apk</a> (Android asks once to allow installs from your browser), paste the handle <b>${esc(o.handle)}</b> and token <b style="word-break:break-all">${esc(o.token)}</b> into it, tap Allow reading steps, then Save. It posts your Health Connect steps every hour on its own.`:'Go online first, then your personal sync address and code appear here.';}
}
function renderFriends(){
  const o=O();const el=$('#friends');if(!el)return;const sub=$('#friendsSub');const help=$('#friendsHelp');
  if(!o.ok){sub.textContent='offline';help.textContent='Go online in Settings to see who else is walking Hollow County.';el.innerHTML='';return;}
  sub.textContent=friends.length+' online';help.textContent=friends.length>1?'Everyone on your server this week.':'Share the link. Anyone who goes online shows up here.';
  el.innerHTML=friends.map((f,i)=>{const me=f.handle===o.handle;const pub=f.pub||{};return `<div class="lbrow${me?' me':''}"><div class="rk">${i+1}</div><div class="av">${pub.av?ART.avatarSVG(pub.av,40):'🧍'}</div><div class="nm">${esc(f.name)}${me?' (you)':''}<small>@${esc(f.handle)} · lvl ${pub.lvl||1} · ${pub.base?esc(pub.base.n):'no base'} · def ${pub.defense||0}${pub.party?' · party '+esc(pub.party):''}</small></div><div class="sc">${fmt(f.score)}</div></div>`;}).join('')||'<p class="help">Nobody yet.</p>';
}
function openSheet(html,lock){$('#sheet').innerHTML=html;$('#modal').classList.add('on');$('#modal').dataset.lock=lock?'1':'';}
function closeSheet(){if(C&&!C.over)return;$('#modal').classList.remove('on');}
$('#modal').addEventListener('click',e=>{if(e.target.id==='modal'&&!$('#modal').dataset.lock)closeSheet();});

/* ================= look editor ================= */
function lookSheet(onDone){
  const av=S.av;const own=(slot,key)=>S.cosmetics.includes(slot+':'+key);
  const draw=()=>{
    const sw=(arr,cur,set)=>arr.map((c,i)=>`<button class="swatch${cur===i?' on':''}" style="background:${c}" data-set="${set}" data-v="${i}" aria-label="${set} ${i+1}"></button>`).join('');
    const opt=(arr,cur,set,label)=>arr.map(v=>`<button class="${cur===v?'on':''}" data-set="${set}" data-v="${v}">${label?label(v):v}</button>`).join('');
    const hats=[['',{n:'None',r:'common'}]].concat(Object.entries(ART.HATS));const tops=Object.entries(ART.TOPS);const accs=[['',{n:'None',r:'common'}]].concat(Object.entries(ART.ACCS));
    $('#sheet').innerHTML=`<h2>Your look</h2><div style="text-align:center">${ART.avatarSVG(av,120)}</div>
    <div class="section-label">Skin</div><div class="opts" style="margin:6px 0 10px">${sw(ART.SKINS,av.skin,'skin')}</div>
    <div class="section-label">Hair</div><div class="opts" style="margin:6px 0 10px">${opt(ART.HAIR_STYLES,av.hair,'hair')}</div>
    <div class="section-label">Hair color</div><div class="opts" style="margin:6px 0 10px">${sw(ART.HAIR_COLORS,av.hairColor,'hairColor')}</div>
    <div class="section-label">Eyes</div><div class="opts" style="margin:6px 0 10px">${opt(ART.EYES,av.eyes,'eyes')}</div>
    <div class="section-label">Hoodie color</div><div class="opts" style="margin:6px 0 10px">${sw(ART.TOP_COLORS,av.topColor,'topColor')}</div>
    <div class="section-label">Outfit <span class="help">found in the world</span></div><div class="opts" style="margin:6px 0 10px">${tops.map(([k,v])=>`<button class="${av.top===k?'on':''}${k!=='hoodie'&&!own('top',k)?' locked':''}" data-set="top" data-v="${k}"><span class="rc-${v.r}">${v.n}</span></button>`).join('')}</div>
    <div class="section-label">Hat</div><div class="opts" style="margin:6px 0 10px">${hats.map(([k,v])=>`<button class="${(av.hat||'')===k?'on':''}${k&&!own('hat',k)?' locked':''}" data-set="hat" data-v="${k}"><span class="rc-${v.r}">${v.n}</span></button>`).join('')}</div>
    <div class="section-label">Accessory</div><div class="opts" style="margin:6px 0 10px">${accs.map(([k,v])=>`<button class="${(av.acc||'')===k?'on':''}${k&&!own('acc',k)?' locked':''}" data-set="acc" data-v="${k}"><span class="rc-${v.r}">${v.n}</span></button>`).join('')}</div>
    <div class="grid2"><button class="btn" id="lookRandom">Random</button><button class="btn r" id="lookDone">Done</button></div>`;
    $('#sheet').querySelectorAll('[data-set]').forEach(b=>b.onclick=()=>{const set=b.dataset.set;let v=b.dataset.v;if(['skin','hairColor','topColor'].includes(set))v=+v;if(b.classList.contains('locked')){toast('Find it in the world first');return;}av[set]=v;SFX.play('ui');draw();});
    $('#lookRandom').onclick=()=>{Object.assign(av,ART.randomAv());draw();};
    $('#lookDone').onclick=()=>{save();closeSheet();render();pushPlayer();if(onDone)onDone();};
  };
  draw();$('#modal').classList.add('on');$('#modal').dataset.lock='1';
}

/* ================= onboarding ================= */
function onboard(){
  let cls='brawler';
  const draw=()=>{$('#sheet').innerHTML=`<h2>Hollow County</h2><p>The county fell three weeks ago. Every real step you take is a step down the road: houses to loot, walkers inside them, raiders who want what you carry. Pick a class.</p>
  <div class="starter">${Object.entries(CLASSES).map(([k,c])=>`<button class="${k===cls?'on':''}" data-k="${k}"><span class="av">${c.e}</span><b>${c.n}</b><span class="help">${c.d}</span></button>`).join('')}</div>
  <label class="section-label" style="display:block;margin-top:12px">Your name</label><input id="obName" type="text" maxlength="18" placeholder="e.g. Celeste" style="margin:6px 0 12px" value="${esc($('#obName')?$('#obName').value:'')}"><button class="btn r wide" id="obGo">Next: your look</button>`;
    $('#sheet').querySelectorAll('.starter button').forEach(b=>b.onclick=()=>{cls=b.dataset.k;draw();});
    $('#obGo').onclick=()=>{S.name=($('#obName').value||'Survivor').trim();S.cls=cls;S.sp=1;const k=CLASSES[cls];for(const id of k.kit){const g={uid:uid(),id,...GEAR[id]};S.gear.push(g);S.eq[g.slot]=g.uid;}if(k.ammo)S.stock.ammo=k.ammo;if(k.extra)S.pack.push({id:k.extra,...ITEMS[k.extra],uid:uid()});if(k.cos){S.cosmetics.push(k.cos);S.av.top=k.cos.split(':')[1];}
      S.onboarded=true;newDistance();log('You left the shelter as a '+k.n.toLowerCase()+'.');save();lookSheet(()=>{render();});};};
  draw();$('#modal').classList.add('on');$('#modal').dataset.lock='1';
}
function classSheet(){let cls='brawler';const draw=()=>{$('#sheet').innerHTML=`<h2>Pick a class</h2><p>Your save is from before classes existed. Choose one; your skill points are waiting.</p><div class="starter">${Object.entries(CLASSES).map(([k,c])=>`<button class="${k===cls?'on':''}" data-k="${k}"><span class="av">${c.e}</span><b>${c.n}</b><span class="help">${c.d.split('.')[0]}.</span></button>`).join('')}</div><button class="btn r wide" style="margin-top:12px" id="clsGo">Done</button>`;
  $('#sheet').querySelectorAll('.starter button').forEach(b=>b.onclick=()=>{cls=b.dataset.k;draw();});$('#clsGo').onclick=()=>{S.cls=cls;S.sp+=1;if(CLASSES[cls].cos&&!S.cosmetics.includes(CLASSES[cls].cos))S.cosmetics.push(CLASSES[cls].cos);save();closeSheet();lookSheet();};};draw();$('#modal').classList.add('on');$('#modal').dataset.lock='1';}

/* ================= wiring ================= */
function wire(){
  document.querySelectorAll('.nav button').forEach(b=>b.onclick=()=>{SFX.play('ui');document.querySelectorAll('.nav button').forEach(x=>x.classList.toggle('on',x===b));document.querySelectorAll('.view').forEach(v=>v.classList.toggle('on',v.id==='v-'+b.dataset.v));$('#main').scrollTop=0;});
  $('#syncBtn').onclick=()=>{const v=parseInt($('#syncInput').value,10);if(!(v>=0))return;if(syncTotal(v,'sync'))$('#syncInput').value='';};
  $('#pedoBtn').onclick=pedoToggle;$('#clipBtn').onclick=readClipboard;$('#bankBtn').onclick=bank;$('#healBtn').onclick=heal;$('#eatBtn').onclick=eat;$('#dropBtn').onclick=supplyDrop;
  $('#lookBtn').onclick=()=>lookSheet();$('#respecBtn').onclick=respec;$('#sfxBtn').onclick=()=>{S.sfx=!S.sfx;save();render();if(S.sfx)SFX.play('ui');};
  $('#demoBtn').onclick=()=>{toast('+300 demo steps','z');addSteps(300,'demo');};
  $('#resetBtn').onclick=()=>{openSheet('<h2>Reset everything?</h2><p>Base, crew, gear, skills and league history on this device will be gone.</p><div class="grid2"><button class="btn" onclick="closeSheet()">Keep playing</button><button class="btn d" onclick="hardReset()">Reset</button></div>');};
  $('#goalInput').onchange=()=>{const v=parseInt($('#goalInput').value,10);if(v>=1000){S.goal=v;save();render();}};
  $('#nameInput').onchange=()=>{S.name=$('#nameInput').value.trim().slice(0,18);save();render();pushPlayer();};
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){render();fetchWeather();if(O().ok){pullSteps();partySync();}}});
  document.addEventListener('pointerdown',()=>SFX.init(),{once:true});
}
function hardReset(){try{localStorage.removeItem('deadmiles.v3');localStorage.removeItem('deadmiles.v2');}catch(e){}S=fresh();$('#modal').classList.remove('on');render();onboard();}
function start(){
  S=load()||fresh();S.combat=false;if(!S.walk.dist)newDistance();
  wire();render();fetchWeather();
  if(!S.onboarded)onboard();else{if(!S.cls)classSheet();autoSyncFromUrl();}
  if(O().ok){pullSteps();loadFriends();partySync();pushPlayer();}
  setInterval(()=>{if(document.visibilityState==='visible'&&!C){render();if(O().ok){pullSteps();partySync();}}},60000);
  setInterval(()=>{if(document.visibilityState==='visible'&&O().ok){loadFriends();}},180000);
  if('serviceWorker' in navigator){navigator.serviceWorker.register('sw.js').catch(()=>{});}
}
start();
