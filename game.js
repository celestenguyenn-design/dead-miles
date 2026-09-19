/* Dead Miles. One file of game logic; art lives in art.js. */
/* ================= utils ================= */
const VERSION='6.88';
const $=(s)=>document.querySelector(s);
const rnd=(a,b)=>a+Math.random()*(b-a);const rint=(a,b)=>Math.floor(rnd(a,b+1));
const pick=(a)=>a[Math.floor(Math.random()*a.length)];const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const fmt=(n)=>Math.round(n).toLocaleString();
function wpick(list,k){let t=0;for(const x of list)t+=x[k]||1;let r=Math.random()*t;for(const x of list){r-=x[k]||1;if(r<=0)return x;}return list[list.length-1];}
function hash(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
function mulberry(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;}}
function ago(t){const m=Math.round((Date.now()-t)/60000);if(m<1)return 'just now';if(m<60)return m+' min ago';const h=Math.round(m/60);if(h<48)return h+' h ago';return Math.round(h/24)+' days ago';}
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
  bandage:{n:'Bandages',e:'🩹',pts:8,cat:'meds',w:8,r:'common'},pain:{n:'Painkillers',e:'💊',pts:10,cat:'meds',w:6,r:'uncommon'},abx:{n:'Antibiotics',e:'💉',pts:16,cat:'meds',w:3,r:'rare'},kit:{n:'Trauma kit',e:'🧰',pts:24,cat:'meds',w:1.5,r:'epic'},adrena:{n:'Adrenaline shot',e:'⚡',pts:28,cat:'meds',w:1,r:'epic'},bloodbag:{n:'Blood bag',e:'🩸',pts:40,cat:'meds',w:0.5,r:'legendary'},
  scrap:{n:'Scrap metal',e:'🔩',pts:4,cat:'scrap',w:10,r:'common'},tape:{n:'Duct tape',e:'🧻',pts:5,cat:'scrap',w:7,r:'common'},nails:{n:'Box of nails',e:'🔨',pts:5,cat:'scrap',w:6,r:'common'},wire:{n:'Copper wire',e:'🧵',pts:4,cat:'scrap',w:6,r:'common'},battery:{n:'Car battery',e:'🔋',pts:10,cat:'scrap',w:2.5,r:'uncommon'},fuel:{n:'Fuel can',e:'⛽',pts:12,cat:'scrap',w:2,r:'rare'},
  ammo:{n:'Box of rounds (x6)',e:'📦',pts:14,cat:'ammo',w:2.5,qty:6,r:'uncommon'},shells:{n:'Shotgun shells (x4)',e:'🟥',pts:16,cat:'ammo',w:1.2,qty:4,r:'rare'},
  bolts:{n:'Bundle of bolts (x8)',e:'🎯',pts:12,cat:'ammo',w:7,qty:8,r:'common'},
  // drinks and snacks, v6.37 - each does something different
  energy:{n:'Energy drink',e:'🥤',pts:9,cat:'drink',w:5,r:'uncommon',drink:'energy'},
  soda:{n:'Can of soda',e:'🧃',pts:6,cat:'drink',w:8,r:'common',drink:'soda'},
  wine:{n:'Bottle of wine',e:'🍷',pts:14,cat:'drink',w:3,r:'rare',drink:'wine'},
  brew:{n:'Cold brew',e:'☕',pts:10,cat:'drink',w:4,r:'uncommon',drink:'brew'},
  bar:{n:'Protein bar',e:'🍫',pts:5,cat:'snack',w:9,r:'common',snack:'bar'},
  chips:{n:'Bag of chips',e:'🍟',pts:4,cat:'snack',w:9,r:'common',snack:'chips'},
  nuts:{n:'Trail mix',e:'🥜',pts:6,cat:'snack',w:7,r:'common',snack:'nuts'},
  gum:{n:'Stick of gum',e:'🍬',pts:3,cat:'snack',w:6,r:'common',snack:'gum'},
  key:{n:'Chest key',e:'🗝️',pts:0,cat:'key',w:0,r:'rare'},chest:{n:'Locked chest',e:'🧳',pts:0,cat:'chest',w:0,r:'epic'},
  handcuffs:{n:'Rusted handcuffs',e:'⛓️',pts:22,cat:'shelf',w:0.4,r:'rare'},cruiser:{n:'Cruiser keys',e:'🔑',pts:24,cat:'shelf',w:0.4,r:'rare'},cards:{n:'Rookie card',e:'🃏',pts:26,cat:'shelf',w:0.38,r:'rare'},dice:{n:'Loaded dice',e:'🎲',pts:20,cat:'shelf',w:0.42,r:'rare'},cart:{n:'Game cartridge',e:'🕹️',pts:30,cat:'shelf',w:0.3,r:'epic'},steth:{n:'Stethoscope',e:'🩺',pts:24,cat:'shelf',w:0.4,r:'rare'},xray:{n:'Chest x-ray',e:'🫁',pts:22,cat:'shelf',w:0.4,r:'rare'},pills:{n:'Labelled pill bottle',e:'💊',pts:20,cat:'shelf',w:0.44,r:'rare'},thermo:{n:'Cracked thermometer',e:'🌡️',pts:18,cat:'shelf',w:0.44,r:'rare'},plate:{n:'Licence plate',e:'🪧',pts:20,cat:'shelf',w:0.42,r:'rare'},sign:{n:'Bent road sign',e:'🛑',pts:22,cat:'shelf',w:0.4,r:'rare'},atlas:{n:'County atlas',e:'🗺️',pts:26,cat:'shelf',w:0.36,r:'rare'},jar:{n:'Jar of something',e:'🫙',pts:34,cat:'shelf',w:0.22,r:'epic'},meteor:{n:'Meteorite shard',e:'☄️',pts:45,cat:'shelf',w:0.14,r:'epic'},
  vinyl:{n:'Vinyl record',e:'💿',pts:25,cat:'shelf',w:0.45,r:'rare'},polaroid:{n:'Old polaroid',e:'📸',pts:20,cat:'shelf',w:0.5,r:'rare'},teddy:{n:'One-eyed teddy',e:'🧸',pts:18,cat:'shelf',w:0.54,r:'rare'},watch:{n:'Gold watch',e:'⌚',pts:28,cat:'shelf',w:0.32,r:'epic'},globe:{n:'Snow globe',e:'🔮',pts:30,cat:'shelf',w:0.27,r:'epic'},comic:{n:'Comic issue #1',e:'📖',pts:20,cat:'shelf',w:0.45,r:'rare'},badge:{n:'Sheriff badge',e:'⭐',pts:40,cat:'shelf',w:0.14,r:'legendary'},dogtag:{n:'Soldier dog tag',e:'🏷️',pts:35,cat:'shelf',w:0.0,r:'epic'},skull:{n:'Raider skull mask',e:'💀',pts:45,cat:'shelf',w:0.0,r:'legendary'},wanted:{n:'Wanted poster',e:'📜',pts:60,cat:'shelf',w:0.0,r:'legendary'}
};
const GEAR={
  pipe:{n:'Lead pipe',e:'🪈',slot:'melee',dmg:[8,13],dur:6,w:6,pts:10,r:'common'},bat:{n:'Baseball bat',e:'⚾',slot:'melee',dmg:[9,15],dur:5,w:5,pts:14,r:'common'},crowbar:{n:'Crowbar',e:'🔧',slot:'melee',dmg:[11,17],dur:8,w:3,pts:18,r:'uncommon'},machete:{n:'Machete',e:'🔪',slot:'melee',dmg:[14,21],dur:7,w:2,pts:26,r:'rare'},axe:{n:'Fire axe',e:'🪓',slot:'melee',dmg:[18,26],dur:6,w:1.2,pts:34,r:'rare'},sledge:{n:'Sledgehammer',e:'🔨',slot:'melee',dmg:[22,32],dur:5,w:.6,pts:40,r:'epic'},
  // melee added v6.37
  hatchet:{n:'Hatchet',e:'🪓',slot:'melee',dmg:[10,16],dur:7,w:5,pts:13,r:'common'},
  cleaver:{n:'Meat cleaver',e:'🔪',slot:'melee',dmg:[12,18],dur:6,w:4,pts:16,r:'uncommon'},
  sickle:{n:'Farm sickle',e:'🌾',slot:'melee',dmg:[13,19],dur:7,w:3.5,pts:19,r:'uncommon'},
  spear:{n:'Pipe spear',e:'🔱',slot:'melee',dmg:[15,22],dur:9,w:2.2,pts:24,r:'uncommon',quiet:true},
  barbed:{n:'Barbed bat',e:'🏏',slot:'melee',dmg:[17,27],dur:4,w:1.6,pts:30,r:'rare'},
  katana:{n:'Katana',e:'🗡️',slot:'melee',dmg:[20,29],dur:10,w:.7,pts:46,r:'epic',quiet:true},
  pistol:{n:'9mm pistol',e:'🔫',slot:'ranged',dmg:[22,30],dur:10,ammo:'ammo',w:1.2,pts:30,r:'rare'},shotgun:{n:'Pump shotgun',e:'🎯',slot:'ranged',dmg:[34,50],dur:6,ammo:'shells',w:.5,pts:45,r:'epic'},
  // ranged added v6.37 - both use bolts, and both give some of them back
  bow:{n:'Hunting bow',e:'🏹',slot:'ranged',dmg:[16,24],dur:14,ammo:'bolts',w:2.5,pts:26,r:'uncommon',quiet:true,recover:0.55},
  crossbow:{n:'Crossbow',e:'🎯',slot:'ranged',dmg:[28,38],dur:9,ammo:'bolts',w:1,pts:42,r:'rare',quiet:true,recover:0.4},
  jacket:{n:'Leather jacket',e:'🧥',slot:'armor',dr:2,w:4,pts:14,r:'common'},pads:{n:'Hockey pads',e:'🏒',slot:'armor',dr:4,w:2,pts:20,r:'uncommon'},vest:{n:'Riot vest',e:'🦺',slot:'armor',dr:6,w:.9,pts:34,r:'rare'},
  helmet:{n:'Motorcycle helmet',e:'⛑️',slot:'head',dr:2,w:2.5,pts:12,r:'common'},riot:{n:'Riot helmet',e:'🪖',slot:'head',dr:3,w:1,pts:22,r:'rare'},
  pack2:{n:'Hiking pack',e:'🎒',slot:'bag',cap:6,w:1.5,pts:16,r:'uncommon'},pack3:{n:'Military ruck',e:'🪖',slot:'bag',cap:12,w:.5,pts:28,r:'rare'},
  // legendaries: never in the normal roll, only chests and bosses
  mercy:{n:'Mercy',e:'🎯',slot:'ranged',dmg:[38,54],dur:8,ammo:'shells',w:0,pts:90,r:'legendary',legend:'Fires without a shell 35% of the time'},
  lastword:{n:'The Last Word',e:'⚾',slot:'melee',dmg:[16,24],dur:9,w:0,pts:80,r:'legendary',legend:'30% chance a hit knocks the enemy out of its next turn'},
  oldreliable:{n:'Old Reliable',e:'🔧',slot:'melee',dmg:[16,24],dur:20,w:0,pts:70,r:'legendary',legend:'20 swings between rebuilds - twice any other weapon - but the bill is the biggest in the county'},
  whisper:{n:'Whisper',e:'🔫',slot:'ranged',dmg:[24,32],dur:12,ammo:'ammo',w:0,pts:85,r:'legendary',legend:'Makes no noise'},
  nightingale:{n:'Nightingale',e:'🦺',slot:'armor',dr:4,w:0,pts:85,r:'legendary',legend:'Heals 5 HP every combat round'},
  // Four more legendaries. Five was a small pile for people who walk every day,
  // and every one of these is a different REASON to swap rather than a bigger
  // number - the point is a choice, not a ladder.
  harvest:{n:'The Harvest',e:'🌾',slot:'melee',dmg:[20,26],dur:7,w:0,pts:82,r:'legendary',legend:'Hits every enemy in the room for half damage'},
  vigil:{n:'Vigil',e:'🕯️',slot:'armor',dr:5,w:0,pts:88,r:'legendary',legend:'The first hit of every fight cannot take more than 5 HP'},
  saintjude:{n:'Saint Jude',e:'📿',slot:'melee',dmg:[14,30],dur:10,w:0,pts:84,r:'legendary',legend:'The worse your health, the harder it swings'},
  longwinter:{n:'Long Winter',e:'❄️',slot:'ranged',dmg:[20,28],dur:14,ammo:'ammo',w:0,pts:86,r:'legendary',legend:'Every hit slows the target - it loses one turn in three'},
  // HANDS and FEET (v6.72). Her ask: "we only have like 3 types of armor ...
  // we should add boots, head, chest, gloves, that way we have more things we
  // can upgrade." Four armour slots now, each with a common/uncommon/rare rung
  // and one legendary, so there is a ladder in every one of them.
  workgloves:{n:'Work gloves',    e:'🧤',slot:'hands',dr:1,w:7,  pts:7, r:'common'},
  tacgloves: {n:'Tactical gloves',e:'🧤',slot:'hands',dr:2,w:3.5,pts:15,r:'uncommon'},
  gauntlets: {n:'Welding gauntlets',e:'🧤',slot:'hands',dr:4,w:1.2,pts:26,r:'rare'},
  surefoot:  {n:'Sure Hands',     e:'🤲',slot:'hands',dr:3,w:0,  pts:80,r:'legendary',legend:'Your weapon wears out half as fast'},
  sneakers:  {n:'Old sneakers',   e:'👟',slot:'feet', dr:1,w:7,  pts:7, r:'common'},
  workboots: {n:'Work boots',     e:'🥾',slot:'feet', dr:2,w:3.5,pts:15,r:'uncommon'},
  steeltoes: {n:'Steel toecaps',  e:'🥾',slot:'feet', dr:4,w:1.2,pts:26,r:'rare'},
  longhaul:  {n:'Long Haul',      e:'🥾',slot:'feet', dr:3,w:0,  pts:80,r:'legendary',legend:'You always get away clean, and drop nothing running'}
};
const LEGEND_IDS=['mercy','lastword','oldreliable','whisper','nightingale','harvest','vigil','saintjude','longwinter','surefoot','longhaul'];
const CAT_LABEL={food:'Food',water:'Water',drink:'Drink',snack:'Snack',meds:'Meds',scrap:'Scrap',ammo:'Ammo',shelf:'Trophy',key:'Key',chest:'Chest',gear:'Gear',cosmetic:'Cosmetic',candy:'Candy'};
const byCat=(c)=>Object.entries(ITEMS).filter(([k,v])=>v.cat===c&&v.w>0).map(([k,v])=>({id:k,...v}));
function table(cats,shelfW,gearW){const out=[];for(const c of cats)out.push(...byCat(c));if(shelfW)out.push(...byCat('shelf').map(x=>({...x,w:x.w*shelfW})));if(gearW)out.push(...Object.entries(GEAR).filter(([k,v])=>v.w>0).map(([k,v])=>({id:k,gear:true,...v,w:v.w*gearW})));return out;}
function cosmeticPool(){const out=[];for(const [k,v] of Object.entries(ART.HATS))if(!v.lock)out.push({id:'hat:'+k,slot:'hat',key:k,n:v.n,r:v.r});for(const [k,v] of Object.entries(ART.TOPS))if(v.r!=='common')out.push({id:'top:'+k,slot:'top',key:k,n:v.n,r:v.r});for(const [k,v] of Object.entries(ART.ACCS))out.push({id:'acc:'+k,slot:'acc',key:k,n:v.n,r:v.r});return out;}
const COS_W={rare:3,epic:1,legendary:.2};

const LOCS=[
  {t:'house',n:['Ranch house','Two-story colonial','Duplex','Bungalow','Split-level','Farmhouse'],e:'🏠',w:38,rooms:[{n:'Kitchen',noise:32,cats:['food','water','snack','drink'],shelf:.3},{n:'Bedroom',noise:18,cats:['scrap'],shelf:2.2,gear:.3,keyish:true},{n:'Bathroom',noise:22,cats:['meds'],shelf:.2},{n:'Garage',noise:40,cats:['scrap','ammo'],shelf:.4,gear:1.4}],threat:1},
  {t:'pharmacy',n:['Corner pharmacy','Drugmart','Hollow Rx'],e:'💊',w:11,rooms:[{n:'Front counter',noise:25,cats:['meds','drink','snack'],shelf:.2},{n:'Back room',noise:30,cats:['meds'],shelf:.3,keyish:true},{n:'Storage',noise:38,cats:['meds','scrap'],shelf:.2,gear:.3}],threat:1.2},
  {t:'gas',n:['Gas & Go','Stop-N-Fuel','Pump station'],e:'⛽',w:12,rooms:[{n:'Snack shelves',noise:26,cats:['snack','drink','food','water'],shelf:.3},{n:'Pumps',noise:44,cats:['scrap'],shelf:.1},{n:'Office',noise:30,cats:['scrap'],shelf:.8,gear:.9,keyish:true}],threat:1},
  {t:'grocery',n:['Family grocery','Corner mart','Foodway'],e:'🛒',w:12,rooms:[{n:'Canned goods',noise:28,cats:['food','snack'],shelf:.2},{n:'Freezer',noise:36,cats:['food','drink'],shelf:.1},{n:'Stockroom',noise:34,cats:['scrap','food','drink','snack'],shelf:.3},{n:'Registers',noise:30,cats:['scrap'],shelf:1.4,keyish:true}],threat:1.3},
  {t:'police',n:['Police substation','Sheriff outpost'],e:'🚓',w:5,rooms:[{n:'Locker room',noise:34,cats:['ammo'],shelf:.4,gear:1.6,keyish:true},{n:'Armory cage',noise:44,cats:['ammo'],shelf:.3,gear:2.5},{n:'Break room',noise:24,cats:['drink','snack','food'],shelf:.3}],threat:1.6},
  {t:'clinic',n:['Urgent care','Hollow County clinic'],e:'🏥',w:6,rooms:[{n:'Exam room',noise:24,cats:['meds'],shelf:.3},{n:'Pharmacy cage',noise:36,cats:['meds'],shelf:.2},{n:'Supply closet',noise:34,cats:['meds','scrap'],shelf:.2,keyish:true}],threat:1.4},
  {t:'hardware',n:['Hardware store','Lumber yard'],e:'🧰',w:8,rooms:[{n:'Tool wall',noise:30,cats:['scrap','ammo'],shelf:.3,gear:1.8},{n:'Yard',noise:38,cats:['scrap','ammo'],shelf:.2},{n:'Back office',noise:26,cats:['scrap','water'],shelf:.9,keyish:true}],threat:1.1},
  {t:'surplus',n:['Army surplus','Hunting outfitter'],e:'🎖️',w:3,rooms:[{n:'Front racks',noise:30,cats:['ammo','food'],shelf:.3,gear:1.6},{n:'Gun counter',noise:40,cats:['ammo'],shelf:.2,gear:3,keyish:true},{n:'Back room',noise:34,cats:['scrap'],shelf:.5,gear:1}],threat:1.7},
  {t:'diner',n:['Burger joint','Diner','Pizza place','Taco spot'],e:'🍔',w:8,rooms:[{n:'Counter',noise:26,cats:['food','drink','snack'],shelf:.3},{n:'Kitchen',noise:34,cats:['food'],shelf:.2,gear:.4},{n:'Walk-in freezer',noise:40,cats:['food','drink'],shelf:.1},{n:'Manager\'s office',noise:24,cats:['scrap'],shelf:1,keyish:true}],threat:1.1},
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
  boss:{n:'Raider boss',hp:80,dmg:[17,25],hit:.8,xp:50,w:0,dodge:.25,human:true,boss:true},
  // SEALED-ROOM BOSSES (v6.77). Something was locked in there for a reason.
  butcher:{n:'The Butcher',  hp:150,dmg:[20,30],hit:.78,xp:110,w:0,boss:true,warden:true},
  matron: {n:'The Matron',   hp:130,dmg:[16,24],hit:.85,xp:110,w:0,boss:true,warden:true,scream:.35},
  hollow: {n:'The Hollow One',hp:120,dmg:[22,34],hit:.7,xp:120,w:0,boss:true,warden:true,dodge:.2},
  cellar: {n:'Cellar Thing', hp:175,dmg:[18,26],hit:.75,xp:120,w:0,boss:true,warden:true,burst:18}
};
const BOSS_GIMMICK={'Mad Dog Reyes':'reinforce','Sister Ash':'shield','The Butcher of Elm St':'bleed','Two-Tooth Tully':'steal','Queen Wasp':'dodgy','Preacher Cole':'heal','Ghost Delacroix':'flee','Big Sal':'slow','The Widow Marsh':'poison','Cutter Vance':'crit','The Gourd King':'reinforce'};
const GIMMICK_TEXT={reinforce:'whistles for backup at half health',shield:'starts behind a riot shield: 30 damage soaks in before you touch him',bleed:'her cleaver makes you bleed for 3 rounds',steal:'picks your pack on every hit',dodgy:'fast and slippery: dodges 45% of swings',heal:'prays back 10 HP every round',flee:'bolts at a quarter health with the bounty',slow:'moves every other round, but hits like a truck',poison:'her hits sap your strength for 3 rounds',crit:'one swing in five lands double'};
const STORY=[
 {id:'s1',t:'Static',need:s=>true,txt:'A voice on 146.52 MHz, cutting in and out: "...anyone left in Hollow County, the bridge at the Overpass is still standing. We are holding the north side. Bring what you can carry."'},
 {id:'s2',t:'Day one, again',need:s=>s.steps.total>=5000,txt:'A woman calling herself Marisol Vega: "Three weeks ago it was a fever. Two days later the clinics locked their doors. Whoever tells you this started at the hospital is lying. It started at the rail yard."'},
 {id:'s3',t:'The raiders have a name',need:s=>s.kills>=15,txt:'"They call themselves the Tolls. Every crew that crosses Main Street pays or bleeds. Their bosses rotate weekly; the one on the posters is the one running things that week."'},
 {id:'s4',t:'Main Street',need:s=>s.steps.total>=25000,txt:'"You made it past the Suburbs. Good. From here the Tolls own every intersection. Hit their strongholds and the roads open up for everyone, a week at a time."'},
 {id:'s5',t:'The first head',need:s=>!!s.bossKilled,txt:'Marisol, quieter than usual: "That was one of theirs. They will not forget it. But two crews came through the checkpoint tonight without paying. That was you."'},
 {id:'s6',t:'Old Town',need:s=>s.steps.total>=60000,txt:'"Old Town has the cathedral. The Tolls use the bell tower to watch the roads. Someone with a rifle up there would change things. Someone with a wrench could take the bell down."'},
 {id:'s7',t:'What the rail yard held',need:s=>s.kills>=80,txt:'"I found the manifest. Forty crates, medical, marked for the county hospital. They never arrived. The fever did. Draw your own line between those two facts."'},
 {id:'s8',t:'Hospital Row',need:s=>s.steps.total>=120000,txt:'"The hospital is standing. Third floor is where the crates went. The Tolls sealed it and put a boss on the door. If you get in there, you get the truth and a lot of meds."'},
 {id:'s9',t:'The Marina',need:s=>s.steps.total>=200000,txt:'"Boats. Real ones, with fuel. The Tolls are loading them. If they leave with the crates, this county stays dead. The Overpass crossing is the only road to the docks."'},
 {id:'s10',t:'The Overpass',need:s=>s.steps.total>=320000,txt:'"This is Marisol. If you can hear this, you walked the whole county. The north side is open. Come across. We could use someone who does not quit."'},
 {id:'s11',t:'Across the bridge',need:s=>s.steps.total>=420000,txt:'You cross. Marisol is shorter than she sounded. She looks at your boots, not your face. "Everyone who gets here says the same thing - that they were going to stop. Nobody stops. There is more county past this one."'},
 {id:'s12',t:'The far road',need:s=>s.steps.total>=600000,txt:'"The maps stop being useful out here. We name places after whoever found them. Walk far enough and something will end up with your name on it."'},
 {id:'s13',t:'What Nadia wanted',need:s=>s.steps.total>=800000,txt:'A page in a dead raider pocket, in Nadia handwriting: "He keeps walking. Every time we take something he just goes further out. I do not think he is running from us. I think we are in his way."'},
 {id:'s14',t:'A long walker',need:s=>s.steps.total>=1000000,txt:'A million steps. Marisol does the arithmetic out loud - four hundred miles, give or take. "People used to do this for fun," she says. "Before." She does not say it like a joke.'},
 {id:'s15',t:'Still going',need:s=>s.steps.total>=1500000,txt:'The radio is mostly quiet now. Every few weeks a new voice, somewhere further out, reading names off a list and asking if anyone is still walking. You are.'}
];
function eventNow(){const d=new Date();const m=d.getMonth()+1,day=d.getDate();if((m===10&&day>=15)||(m===11&&day<=2))return 'halloween';return '';}
const HALLOWEEN_SHOP=[{id:'hat:witch',n:'Witch hat',c:40},{id:'hat:pumpkin',n:'Pumpkin head',c:60},{id:'top:skeleton',n:'Skeleton hoodie',c:50},{id:'acc:wings',n:'Bat wings',c:80}];
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
const PETS={dog:{n:'Dog',e:'🐕',d:'Takes hits for you, and goes scavenging every night while you sleep'},cat:{n:'Cat',e:'🐈',d:'Bonus XP, and brings you gifts every morning. Sometimes a trophy.'}};
const PET_NAMES={dog:['Biscuit','Scout','Waffles','Pepper','Moose'],cat:['Mochi','Salem','Noodle','Miso','Pumpkin']};
function petLevel(){return Math.min(10,Math.floor((S.petXp||0)/4000)+1);}
function petBlock(){return 0.25+0.02*(petLevel()-1);}
function petXpMult(){return 1.15+0.01*(petLevel()-1);}
const PET_MAX=8;
function activePet(){return (S.pets||[]).find(p=>p.id===S.petActive)||null;}
function setActivePet(id){const p=(S.pets||[]).find(x=>x.id===id);if(!p)return;const cur=activePet();if(cur){cur.xp=S.petXp||0;cur.name=S.petName;}S.petActive=p.id;S.pet=p.kind;S.petCoat=p.coat;S.petName=p.name;S.petXp=p.xp||0;SFX.play('ui');save();render();pushPlayer();}
function petJoin(kind,minRarity){if(!S.pets)S.pets=[];if(S.pets.length>=PET_MAX){toast('A stray followed you, but there is no room. Eight is the limit.');return;}
  const coat=ART.randomCoat(kind,minRarity);const ci=ART.coatInfo(kind,coat);const name=pick(PET_NAMES[kind]);const p={id:uid(),kind,coat,name,xp:0,found:Date.now()};S.pets.push(p);
  const first=!S.petActive;if(first){S.petActive=p.id;S.pet=kind;S.petCoat=coat;S.petName=name;S.petXp=0;}
  log('A '+ci.n.toLowerCase()+' followed you out. It is yours now.');if(ci.r==='legendary')SFX.play('legend');else SFX.play('rare');
  openSheet(`<h2>A ${esc(ci.n.toLowerCase())}!</h2><div class="big">${ART.petSVG(kind,96,coat)}</div><p><span class="rc-${ci.r}">${RAR[ci.r].n}</span> ${PETS[kind].n.toLowerCase()}. It followed you out and will not leave. ${PETS[kind].d}.</p><input id="petNameIn" type="text" maxlength="14" value="${esc(name)}" style="width:100%;margin:8px 0"><button class="btn r wide" onclick="namePet('${p.id}',$('#petNameIn').value);closeSheet();render()">${first?'Come on, then':'Welcome to the crew'}</button>`);}
function namePet(id,n){const p=(S.pets||[]).find(x=>x.id===id);if(!p)return;n=(n||p.name).trim().slice(0,14)||p.name;p.name=n;if(S.petActive===id)S.petName=n;save();render();}
function renamePet(){const p=activePet();if(!p)return;const n=prompt('Name your '+PETS[p.kind].n.toLowerCase(),p.name);if(n&&n.trim()){namePet(p.id,n);}}
function petFetch(){if(!S.pet)return;const lvl=petLevel();const kennel=S.base&&S.base.rooms.kennel?1:0;const n=1+(lvl>=6?1:0)+kennel;const got=[];
  for(let i=0;i<n;i++){
    if(S.pet==='cat'&&Math.random()<0.35){const sh=byCat('shelf');const it=wpick(sh,'w');S.shelf.push({id:it.id,n:it.n,e:it.e});got.push(it.e+' '+it.n);continue;}
    const list=table(['food','water','meds','scrap','ammo'],0,0.04+0.03*lvl);const it=wpick(list,'w');
    if(it.gear){S.gear.push({uid:uid(),id:it.id,...GEAR[it.id]});got.push(it.e+' '+it.n);}
    else if(it.cat==='ammo'){S.stock.ammo+=it.qty||6;got.push(it.e+' '+it.n);}
    else if(S.stock[it.cat]!==undefined){S.stock[it.cat]++;got.push(it.e+' '+it.n);}}
  S.petGifts=got;S.petLast=todayStr();if(got.length){log(S.petName+' brought back '+got.join(', ')+'.');}}
function renderPet(){const el=$('#petCard');if(!el)return;if(!S.pet){el.innerHTML='<h2>Companion <span class="sub">none yet</span></h2><p class="help">Strays hide in the houses you search. Keep looting: one always turns up by your 40th room ('+Math.min(40,S.roomsSearched||0)+' searched). Nine kinds of cat and eight kinds of dog are out there, and the rare ones are rare.</p>';return;}
  const lvl=petLevel();const need=4000;const into=(S.petXp||0)-(lvl-1)*need;const p=PETS[S.pet];const ci=ART.coatInfo(S.pet,S.petCoat);const more=1+(lvl>=6?1:0)+(S.base&&S.base.rooms.kennel?1:0);
  el.innerHTML=`<h2>${esc(S.petName)} <span class="sub"><span class="rc-${ci.r}">${esc(ci.n)}</span> · level ${lvl}${lvl>=10?' (max)':''}</span></h2><div class="you"><div class="petbig">${ART.petSVG(S.pet,104,S.petCoat)}</div><div><div class="kv"><span>Bonus</span><b>${S.pet==='dog'?'blocks '+Math.round(petBlock()*100)+'% of hits':'+'+Math.round((petXpMult()-1)*100)+'% XP'}</b><span>Levels by</span><b>your steps</b><span>Brings back</span><b>${more} thing${more>1?'s':''} a morning</b></div>${lvl<10?`<div class="xp" style="margin-top:8px"><i style="width:${Math.min(100,into/need*100)}%"></i></div><p class="help">${fmt(Math.max(0,need-into))} steps to level ${lvl+1}</p>`:''}</div></div><p class="help" style="margin-top:8px">${S.petGifts&&S.petGifts.length?'This morning: '+esc(S.petGifts.join(', ')):'Nothing found yet. Sleep on it.'}</p><div class="row" style="margin-top:8px"><button class="btn sm ghost" onclick="renamePet()">Rename</button><span class="help">Only the active one walks with you, fetches, and levels.</span></div>
  <h2 style="margin-top:14px;font-size:18px">Your strays <span class="sub">${(S.pets||[]).length} of ${PET_MAX}</span></h2><div class="petrow">${(S.pets||[]).map(x=>{const c=ART.coatInfo(x.kind,x.coat);const l=Math.min(10,Math.floor((x.id===S.petActive?S.petXp:x.xp||0)/4000)+1);return `<button class="petpick${x.id===S.petActive?' on':''}" style="border-color:${RAR[c.r].c}" onclick="setActivePet('${x.id}')">${ART.petSVG(x.kind,56,x.coat,{still:x.id!==S.petActive})}<b>${esc(x.name)}</b><span class="rc-${c.r}">${esc(c.n)}</span><span class="help">L${l}</span></button>`;}).join('')}</div><p class="help" style="margin-top:6px">More strays turn up as you search rooms, clear strays on watch duty, and take down county bosses (those are rare or better).</p>`;}
const CLASSES={
  brawler:{n:'Brawler',e:'🥊',d:'Hits hard up close. Starts with a bat and a leather jacket.',kit:['bat','jacket']},
  marksman:{n:'Marksman',e:'🎯',d:'Guns and ammo. Starts with a pistol, 6 rounds and a pipe.',kit:['pistol','pipe'],ammo:6},
  scavenger:{n:'Scavenger',e:'🎒',d:'Finds more, carries more, opens locks. Starts with a crowbar and a hiking pack.',kit:['crowbar','pack2']},
  medic:{n:'Medic',e:'🩺',d:'Tough and hard to kill. Starts with a pipe, a jacket, a trauma kit and nurse scrubs.',kit:['pipe','jacket'],extra:'kit',cos:'top:scrubs'}
};
const BACKGROUNDS={
  farmer:{n:'Farmer',e:'🌾',d:'The garden gives +2 food per level and food heals more.',kit:'3 beans and 3 water in the stash'},
  engineer:{n:'Engineer',e:'⚙️',d:'Buildings cost 10% less scrap and 15% less walking.',kit:'15 scrap'},
  chef:{n:'Chef',e:'🍳',d:'Eating heals +10. Your crew eats less.',kit:'3 food and a beef jerky'},
  firefighter:{n:'Firefighter',e:'🚒',d:'+10 max HP and you start with a fire axe.',kit:'a fire axe'},
  carpenter:{n:'Carpenter',e:'🔨',d:'Walls and traps cost 20% less scrap and walking.',kit:'20 scrap'},
  mechanic:{n:'Mechanic',e:'🔧',d:'Repairs cost 1 scrap instead of 3.',kit:'a crowbar and a car battery'},
  gamer:{n:'Gamer',e:'🎮',d:'Weaker (-10 HP, -1 damage) but knows the genre: +25% XP, sees every boss gimmick before the fight, legendary chance climbs faster, contracts pay 25% more scrap.',kit:'an extra skill point'}
};
const SKILLS={
  farmer:[{id:'greenthumb',n:'Green Thumb',max:3,d:r=>'Garden gives +'+r+' more food per level'},{id:'earlyriser',n:'Early Riser',max:2,d:r=>'+'+(5*r)+' HP recovered overnight'},{id:'harvest',n:'Harvest',max:2,d:r=>'Every stash adds +'+r+' food'}],
  engineer:[{id:'efficient',n:'Efficient',max:3,d:r=>'Building takes '+(8*r)+'% less walking'},{id:'fortify',n:'Fortify',max:3,d:r=>'Each wall level gives +'+(2*r)+' more defense'},{id:'tinkerer',n:'Tinkerer',max:3,d:r=>'Repairs cost '+r+' less scrap'}],
  chef:[{id:'comfortfood',n:'Comfort Food',max:3,d:r=>'Eating heals +'+(5*r)+' more'},{id:'rationing',n:'Rationing',max:1,d:r=>'Crew eat half as much when you stash'},{id:'sharpknife',n:'Sharp Knife',max:3,d:r=>'+'+r+' melee damage'}],
  firefighter:[{id:'axeman',n:'Axeman',max:3,d:r=>'+'+(2*r)+' melee damage'},{id:'thickskin',n:'Thick Skin',max:3,d:r=>'+'+(8*r)+' max HP'},{id:'lungs',n:'Good Lungs',max:1,d:r=>'Bloater bursts hurt half as much'},{id:'brave',n:'Brave',max:1,d:r=>'You are never ambushed'}],
  carpenter:[{id:'framing',n:'Framing',max:3,d:r=>'Each wall level gives +'+(3*r)+' more defense'},{id:'trapmaker',n:'Trapmaker',max:3,d:r=>'Each trap level gives +'+(2*r)+' more defense'},{id:'boards',n:'Boarded Up',max:3,d:r=>'Raiders that break in take '+(10*r)+'% less'}],
  mechanic:[{id:'tuneup',n:'Tune-up',max:3,d:r=>'Repairs restore +'+(2*r)+' more durability'},{id:'juryrig',n:'Jury-rig',max:3,d:r=>(20*r)+'% chance a breaking weapon holds together'},{id:'gennie',n:'Generator Whisperer',max:2,d:r=>'Generator cuts raid odds another '+(5*r)+'%'}],
  gamer:[{id:'metaknowledge',n:'Meta Knowledge',max:3,d:r=>'+'+(5*r)+'% XP'},{id:'speedrunner',n:'Speedrunner',max:3,d:r=>'Places are '+(5*r)+'% closer'},{id:'lore',n:'Lore',max:2,d:r=>'Boss legendary chance climbs +'+r+'% more per phase'},{id:'rng',n:'RNG Manipulation',max:2,d:r=>'Rare finds '+(10*r)+'% more likely'}],

  brawler:[{id:'heavyhands',n:'Heavy Hands',max:3,d:r=>'+'+(2*r)+' melee damage'},{id:'irongrip',n:'Iron Grip',max:3,d:r=>(25*r)+'% chance a swing costs no durability'},{id:'secondwind',n:'Second Wind',max:3,d:r=>'Heal '+(6*r)+' HP when a fight ends'},{id:'bruiser',n:'Bruiser',max:2,d:r=>'Heavy swing hits '+(12*r)+'% more often'},{id:'cleave',n:'Cleave',max:2,d:r=>(20*r)+'% chance a swing also hits a second enemy for half'},
    {id:'intimidate',n:'Intimidate',max:2,req:6,d:r=>'Raiders and other people hit you '+(8*r)+'% less'},
    {id:'rampage',n:'Rampage',max:3,req:9,d:r=>'+'+(2*r)+' damage for every enemy already down this fight'},
    {id:'ironjaw',n:'Iron Jaw',max:1,req:14,d:r=>'Once a fight, a killing blow leaves you at 1 HP instead'}],
  marksman:[{id:'steadyaim',n:'Steady Aim',max:3,d:r=>'+'+(3*r)+' gun damage'},{id:'scrounger',n:'Scrounger',max:3,d:r=>'+'+r+' round in every ammo box you find'},{id:'silencer',n:'Silencer',max:3,d:r=>'Shots make '+(8*r)+' less noise'},{id:'headshot',n:'Headshot',max:3,d:r=>(10*r)+'% chance a shot does double damage'},{id:'quickdraw',n:'Quick Draw',max:1,d:r=>'You are never ambushed'},
    {id:'coldbarrel',n:'Cold Barrel',max:1,req:6,d:r=>'The first shot of every fight does half again as much'},
    {id:'doubletap',n:'Double Tap',max:3,req:9,d:r=>(10*r)+'% chance a shot fires twice'},
    {id:'ammosense',n:'Ammo Sense',max:2,req:13,d:r=>(12*r)+'% chance a shot uses no ammo'}],
  scavenger:[{id:'deeppockets',n:'Deep Pockets',max:3,d:r=>'+'+(2*r)+' pack capacity'},{id:'eagleeye',n:'Eagle Eye',max:3,d:r=>'Rare finds '+(15*r)+'% more likely'},{id:'lightstep',n:'Light Step',max:3,d:r=>'Every search makes '+(4*r)+' less noise'},{id:'lockpick',n:'Lockpick',max:3,d:r=>(30*r)+'% chance to open a chest with no key'},{id:'haggler',n:'Haggler',max:2,d:r=>'+'+(5*r)+'% stash value'},
    {id:'appraiser',n:'Appraiser',max:3,req:6,d:r=>'Salvage gives another '+(20*r)+'% scrap'},
    {id:'packrat',n:'Pack Rat',max:3,req:9,d:r=>'+'+(2*r)+' more pack capacity'},
    {id:'shadow',n:'Shadow',max:2,req:13,d:r=>(12*r)+'% chance to slip past a road encounter'}],
  medic:[{id:'fielddressing',n:'Field Dressing',max:3,d:r=>'Meds heal '+(10*r)+' more'},{id:'tough',n:'Tough',max:3,d:r=>'+'+(10*r)+' max HP'},{id:'triage',n:'Triage',max:3,d:r=>'Heal '+(4*r)+' HP every combat round'},{id:'adrenaline',n:'Adrenaline',max:3,d:r=>'Enemies miss you '+(6*r)+'% more'},{id:'steady',n:'Steady',max:2,d:r=>'Brace blocks '+(60+10*r)+'% instead of 50%'},
    {id:'clotting',n:'Clotting',max:2,req:6,d:r=>'Bleeding hurts '+(25*r)+'% less and bleed/poison end '+r+' round sooner'},
    {id:'transfusion',n:'Transfusion',max:3,req:9,d:r=>'Heal '+(3*r)+' HP every time an enemy goes down'},
    {id:'fieldsurgeon',n:'Field Surgeon',max:2,req:13,d:r=>'Wake at '+(40+15*r)+'% HP after going down, and keep '+(25*r)+'% of the pack'}],
  general:[{id:'longhaul',n:'Long Haul',max:2,d:r=>'+'+(10*r)+' HP recovered overnight'},{id:'pathfinder',n:'Pathfinder',max:3,d:r=>'Places are '+(6*r)+'% closer'},{id:'leader',n:'Leader',max:1,d:r=>'Active crew act as one level higher'},
    {id:'scrapper',n:'Scrapper',max:3,req:4,d:r=>'Salvage gives '+(15*r)+'% more scrap'},
    {id:'trader',n:'Trader',max:2,req:6,d:r=>'The trader charges '+(15*r)+'% less'},
    {id:'nightowl',n:'Night Owl',max:2,req:7,d:r=>'+'+(10*r)+'% loot after dark'},
    {id:'marathoner',n:'Marathoner',max:3,req:9,d:r=>'+'+(4*r)+'% stash value'},
    {id:'wellstocked',n:'Well Stocked',max:1,req:11,d:r=>'+1 watch job every day'},
    {id:'survivalist',n:'Survivalist',max:3,req:13,d:r=>'+'+(5*r)+' max HP'}]
};
const BUILD={
  walls:{n:'Walls',e:'🧱',lv:5,def:[6,12,20,30,42],labor:[1500,3000,5000,8000,12000],cost:[15,30,50,90,140],d:'Defense against raids. L4+ is concrete.'},
  tower:{n:'Watchtower',e:'🗼',lv:3,def:[5,10,16],labor:[2000,4000,7000],cost:[20,40,80],d:'Defense, you see raids coming, +1 watch job per level'},
  traps:{n:'Traps',e:'🪤',lv:3,def:[4,9,15],labor:[1000,2500,4500],cost:[12,28,60],d:'Defense; raiders sometimes die on the way in'},
  bunk:{n:'Bunkhouse',e:'🛏️',lv:3,def:[0,0,0],labor:[2000,4000,7000],cost:[25,45,80],d:'+1 active crew slot per level'},
  armory:{n:'Armory',e:'🔧',lv:1,def:[2],labor:[2500],cost:[20],d:'Repair melee gear for 3 scrap'},
  clinic:{n:'Clinic',e:'🏥',lv:1,def:[0],labor:[3000],cost:[25],d:'Stashing heals you to full for 1 meds'},
  garden:{n:'Garden',e:'🥬',lv:3,def:[0,0,0],labor:[1500,3000,5000],cost:[20,35,60],d:'+3 food per level every morning'},
  barrel:{n:'Rain barrel',e:'🛢️',lv:2,def:[0,0],labor:[1200,2600],cost:[15,30],d:'+1 water a morning per level, +3 more after rain'},
  radio:{n:'Ham radio',e:'📻',lv:1,def:[0],labor:[3000],cost:[30],d:'Rival intel and one supply drop a day'},
  generator:{n:'Generator',e:'⚡',lv:2,def:[6,10],labor:[5000,9000],cost:[40,90],d:'Lights. Zombies avoid it: -30% raid odds (L2: -45%)'},
  workshop:{n:'Workshop',e:'🪚',lv:2,def:[0,0],labor:[3500,7000],cost:[35,70],d:'Salvaged gear gives +25% scrap per level'},
  forge:{n:'Forge',e:'🔥',lv:1,def:[0],labor:[6000],cost:[60],d:'Upgrade gear with scrap: +2 damage or +1 armor per level, three levels each'},
  vault:{n:'Vault',e:'🔐',lv:2,def:[0,0],labor:[5000,9000],cost:[45,90],d:'Raiders that break in take 50% less from the stash (L2: 80% less)'},
  kennel:{n:'Kennel',e:'🐾',lv:1,def:[0],labor:[3000],cost:[30],d:'Your companion brings back one more thing each morning and levels 25% faster'},
  bell:{n:'Alarm bell',e:'🔔',lv:1,def:[3],labor:[5000],cost:[50],d:'+1 watch job per day, and the whole crew wakes for raids'}
};
const TIERS=[{n:'Drifter',e:'🔰',mult:1},{n:'Scavenger',e:'🎒',mult:1.3},{n:'Ranger',e:'🏹',mult:1.65},{n:'Warlord',e:'⚔️',mult:2.1},{n:'Legend',e:'☠️',mult:2.7}];
const RIVALS=[
  {id:'maya',n:'Maya\'s crew',av:{skin:2,hair:'bob',hairColor:0,eyes:'almond',top:'flannel',topColor:0},pace:[6800,6800,6800,6800,6800,6800,6800],blurb:'Steady. Same loop every day.'},
  {id:'theo',n:'Theo\'s crew',av:{skin:1,hair:'short',hairColor:1,eyes:'round',top:'varsity',topColor:1},pace:[9500,9000,9200,8800,8500,2500,3000],blurb:'Sprints all week, sleeps in on weekends.'},
  {id:'nadia',n:'Nadia\'s crew',av:{skin:4,hair:'curly',hairColor:0,eyes:'sparkle',top:'biker',topColor:3},pace:[4200,4500,4200,4400,5000,12500,11500],blurb:'Quiet all week, then two huge weekend hauls.'}
];
const PTS_PER_STEP=0.085;
const BASE_GRANT={pharmacy:{clinic:1},clinic:{clinic:1},gas:{generator:1},grocery:{garden:1},
  police:{armory:1,walls:1},hardware:{walls:1},surplus:{armory:1,traps:1}};
// The part that keeps paying after the free room is built. Everything not listed
// here is a one-time head start you could walk out and build yourself.
const BASE_FOREVER={
  gas:'Raiders come 30% less often, for as long as you live here. Nothing else in the game lowers raid odds.',
  hardware:'Every build here costs 10% less, forever.',
  grocery:'+3 food every morning from the garden.',
  diner:'+2 food every morning from the freezer.',
  house:'+1 HP every morning.',
  stronghold:'Raiders want it back: +40% raid odds - but the loot pile respawns every week.'};
const BASE_PERK={house:'Cozy: +1 HP recovered every morning',pharmacy:'Clinic comes pre-built',gas:'Generator pre-built - 5,000 steps of work, 6 defense, and raiders come 30% less often, forever',grocery:'Garden comes pre-built',police:'Armory and level 1 walls pre-built - 4,000 steps and 35 scrap of work, and 8 defense',clinic:'Clinic comes pre-built',hardware:'Level 1 walls pre-built, and every build here costs 10% less, forever',diner:'A full freezer: +2 food every morning',surplus:'Armory and level 1 traps pre-built - 3,500 steps and 32 scrap of work, and 6 defense',stronghold:'Raiders want it back: +40% raid odds, but the loot pile respawns weekly'};

/* ================= state ================= */
let S=null;
function fresh(){return {v:3,created:Date.now(),name:'',onboarded:false,av:ART.randomAv(),cosmetics:[],cls:'',sp:0,skills:{},sfx:true,flares:{date:'',used:0},flare:null,callsHidden:[],raidSeats:{},parts:0,gifts:{date:'',spent:0},infect:null,diff:'normal',mapSkin:'bloom',checkin:{date:'',n:0},ladder:{date:'',hit:[]},
  steps:{total:0,today:0,date:todayStr(),lastSync:0,lastSyncDate:''},
  walk:{toNext:0,dist:500,district:0,houses:0,progress:0,banked:0},
  loc:null,pack:[],run:0,hp:100,lvl:1,xp:0,kills:0,keys:0,
  gear:[],eq:{melee:null,ranged:null,armor:null,head:null,hands:null,feet:null,bag:null},
  crew:[],active:[],pet:null,
  base:null,stock:{food:5,water:5,meds:1,scrap:0,ammo:0,chests:0},shelf:[],
  goal:6000,streak:{days:0,last:''},
  league:{week:weekId(),score:0,tier:0,history:[],seen:''},
  raids:[],raidPending:null,campCleared:'',bossKilled:'',milestones:[],
  ct:{date:'',daily:[],week:'',weekly:null,pending:{}},party:{code:'',data:null,pending:{}},wx:null,
  journal:[],flags:{roadCheck:0,dropDate:'',lastRaidCheck:''},lastAnim:0,combat:null,online:{handle:'',token:'',ok:false,err:'',lastPull:0,lastPost:0}};}
function ensureState(){if(!S)return;S.bossPity=S.bossPity||0;S.bossKills=S.bossKills||0;S.petXp=S.petXp||0;S.petName=S.petName||'';if(S.pet&&!S.petName&&typeof PET_NAMES!=='undefined')S.petName=PET_NAMES[S.pet][Math.abs(hash(String(S.created||0)))%PET_NAMES[S.pet].length];
  if(!S.pets)S.pets=[];if(S.pet&&!S.pets.length){S.pets.push({id:uid(),kind:S.pet,coat:S.pet==='dog'?'mutt':'tabby',name:S.petName,xp:S.petXp||0,found:Date.now()});S.petActive=S.pets[0].id;}if(S.pet&&!S.petCoat){const ap=S.pets.find(p=>p.id===S.petActive)||S.pets[0];S.petCoat=ap?ap.coat:(S.pet==='dog'?'mutt':'tabby');}S.petGifts=S.petGifts||[];S.roomsSearched=S.roomsSearched||0;S.deals=S.deals||{};S.streakBest=S.streakBest||0;S.today=S.today||{date:'',kills:0,places:0};if(S.hydro===undefined)S.hydro=100;if(S.hydroStep===undefined)S.hydroStep=0;for(const c of (S.crew||[])){if(c.hp===undefined)c.hp=crewMax(c);if(c.hp>crewMax(c))c.hp=crewMax(c);}S.bossFightDate=S.bossFightDate||'';if(!S.steps.src)S.steps.src={phone:0,typed:0,walk:0};if(S.steps.week===undefined){S.steps.week=S.steps.today||0;S.steps.weekId=weekId();}if(!S.hidden)S.hidden=[];if(S.rival===undefined)S.rival='';S.bossFightsToday=S.bossFightsToday||0;if(!S.streak)S.streak={days:0,last:''};
  if(!S.flares)S.flares={date:'',used:0};if(S.flare===undefined)S.flare=null;if(!S.callsHidden)S.callsHidden=[];if(!S.raidSeats)S.raidSeats={};if(!S.gifts)S.gifts={date:'',spent:0};if(S.infect===undefined)S.infect=null;if(S.infect&&!S.infect.stage)S.infect.stage=1;if(!S.diff)S.diff='normal';if(!S.mapSkin)S.mapSkin='bloom';if(S.parts===undefined)S.parts=0;if(!S.stock.medkit)S.stock.medkit={};if(S.eq&&S.eq.hands===undefined)S.eq.hands=null;if(S.eq&&S.eq.feet===undefined)S.eq.feet=null;
  // free any slot a downed crew member is still sitting in (they never gave it
  // back before v6.70), so an existing save is not stuck a fighter short
  if(Array.isArray(S.active)&&Array.isArray(S.crew)){
    const down=S.crew.filter(c=>c.hp!==undefined&&c.hp<=0).map(c=>c.id);
    if(down.length)S.active=S.active.filter(id=>!down.includes(id));
  }if(S.buff===undefined)S.buff=null;
  // A temper can lower a weapon's ceiling, so never let a stored durability
  // sit above it - that renders as "9 / 7" and repairs would read as free.
  for(const g of (S.gear||[])){
    const mx=repairMax(g);
    if(mx&&g.dur===undefined)g.dur=mx;     // guns from before they could wear out
    if(mx&&g.dur>mx)g.dur=mx;
  }
  // v6.29 spent a flare before the gear check, so backing out of "no weapon
  // equipped" burned it. Hand today's back, once, to anyone upgrading.
  if(S.flareFix!==1){S.flareFix=1;S.flares.used=0;}
  if(!S.checkin)S.checkin={date:'',n:0};if(!S.ladder)S.ladder={date:'',hit:[]};
  // S.combat is saved; C is memory only. A fight whose screen never drew leaves
  // a battle that can never end - every raid and every doorway answers "Finish
  // what you are doing first" with nothing to finish.
  if(S.combat&&!C)S.combat=false;
  // A typed number used to be written into lastSync, which then blocked every
  // real phone reading below it for the rest of the day. It is display-only now,
  // so anything above what the phone has actually counted is stale - drop it.
  if(S.steps&&S.steps.lastSyncDate===S.steps.date&&S.steps.lastSync>stepsCounted())
    {S.steps.lastSync=stepsCounted();}
  if(S.flare&&S.flare.endsAt<=Date.now())S.flare=null;
  repairTypedSteps();carePackage();}
/* ONE-TIME CARE PACKAGE (v6.74). Armour subtracted a flat 2-9 against raid
   bosses swinging for 138, heals stopped keeping pace with the health bar
   around level 10, and the stash quietly melted trauma kits into bandages.
   People got ground down by our bugs rather than by the game. Anyone still in
   the hole when they open this build gets picked up off the floor, once, ever.
   Deliberately about one good day's haul - she asked for this game to be
   HARDER, so this is a make-good, not a new economy. */
function carePackage(){
  if(!S||S.carePkg===1)return;
  if(!S.onboarded)return;              // not a player yet - do NOT burn their one shot
  // The offer stays open for a week rather than being judged on whatever second
  // she happened to open the app. Someone healthy at noon who gets wrecked that
  // evening should still be caught; someone who never needs it just never sees
  // it, and after seven days it is gone so it cannot become a safety net.
  if(!S.carePkgUntil)S.carePkgUntil=Date.now()+7*86400000;
  if(Date.now()>S.carePkgUntil){S.carePkg=1;return;}
  const low=S.hp<maxHp()*0.5, bare=!medsTotal()&&(S.stock.scrap||0)<25;
  if(!(low||bare))return;              // fine right now - check again next time
  S.carePkg=1;
  S.hp=maxHp();S.hydro=100;
  medsGive('bandage',3);medsGive('abx',1);medsGive('kit',1);
  S.stock.food+=5;S.stock.water+=5;S.stock.scrap+=40;
  for(const c of (S.crew||[]))if(c.hp!==undefined&&c.hp<=0)c.hp=crewMax(c);
  setTimeout(()=>{if(typeof S==='undefined'||!S)return;
    log('A care package was waiting at the gate: patched up to full, 3 bandages, antibiotics, a trauma kit, 5 food, 5 water and 40 scrap. Armour and healing were broken against you for a while - that one is on us.');
    try{toast('Care package: back to full','l');SFX.play('legend');save();render();}catch(e){}},700);
}
/* v6.63 and earlier, "That's my total" recorded the gap between what she typed
   and what the phone had counted as steps the phone would NEVER see. It was
   only behind, so when it caught up those steps landed a second time: 15,000
   walked showed as 24,000. Her call was that this is ours to fix, not something
   her friends should have to tap a button for.

   Once per day, at the first load, if hand-typed steps are still sitting on top
   of the phone's own count, take them back out. The phone's reading is what
   survives, so this can only ever REMOVE duplication - it can never invent a
   step or wipe a walk the phone counted. Anything typed in after this has run
   is left alone, because the flag is already set for the day. */
function repairTypedSteps(){
  const s=S&&S.steps;if(!s)return;
  if(s.typedFixDate===s.date)return;
  s.typedFixDate=s.date;
  const r=(s.reads&&s.readsDate===s.date)?s.reads:null;
  if(!r||!(r.manual>0)||!((r.counted||0)>0))return;
  const truth=Math.max(r.counted||0,r.floor||0);
  const back=Math.max(0,(s.today||0)-truth);
  r.manual=0;
  if(back<=0)return;
  s.today=truth;
  s.week=Math.max(0,(s.week||0)-back);
  s.total=Math.max(0,(s.total||0)-back);
  if(s.src)s.src.typed=Math.max(0,(s.src.typed||0)-back);
  // ensureState runs before the screen exists, so say it once the game is up.
  setTimeout(()=>{if(!S||!S.onboarded)return;
    log('Fixed a counting bug: '+fmt(back)+' steps you typed in had been added on top of the same steps your phone counted. Today is '+fmt(truth)+', straight from your phone. If any of that really was a walk your phone missed, add it again with "Add these".');
    toast('Step count corrected to '+fmt(truth),'a');},900);
}
function migrate(o){
  if(!o)return null;if(o.v===3)return o;
  if(o.v===2){const f=fresh();const m=Object.assign(f,o);m.v=3;m.av=ART.randomAv();m.cosmetics=[];m.cls='';m.sp=Math.max(0,(o.lvl||1)-1);m.skills={};m.sfx=true;m.keys=0;m.milestones=[];m.ct=f.ct;m.party=f.party;m.wx=null;m.bossKilled='';
    for(const g of m.gear||[]){if(!g.r&&GEAR[g.id])g.r=GEAR[g.id].r;}
    for(const it of m.pack||[]){if(!it.r&&ITEMS[it.id])it.r=ITEMS[it.id].r;}
    return m;}
  return null;
}
function storedSave(){try{const r=localStorage.getItem('deadmiles.v3');return r?JSON.parse(r):null;}catch(e){return null;}}
/* Another copy of the game (a second tab, or the browser alongside the home-screen app) can hold an OLD
   state in memory and write it over a newer one. Never let the older copy win. */
let STALE=false;
function staleCheck(){
  if(!S||!S.onboarded)return false;const o=storedSave();if(!o||!o.onboarded)return false;
  const theirs=o.savedAt||0,mine=S.savedAt||0;
  const theirSteps=(o.steps&&o.steps.total)||0,mySteps=(S.steps&&S.steps.total)||0;
  return theirs>mine+2000||theirSteps>mySteps+50;
}
function staleStop(){
  if(STALE)return;STALE=true;
  try{openSheet('<h2>Opened somewhere else</h2><p>This copy of the game is behind a newer one, so it stopped saving rather than undo that progress. This happens when the game is open in two places at once.</p><p class="help">Reloading will pick up the newest save. Use one copy from now on, ideally the home-screen icon.</p><button class="btn r wide" onclick="location.reload()">Reload the newest save</button>',true);}catch(e){}
}
// Restore points. Recent history is fine-grained (every ~3 minutes) so "put it
// back the way it was five minutes ago" is actually possible; older ones thin
// out to roughly one an hour so the list stays short and storage stays small.
const SNAP_FINE=3*60000, SNAP_FINE_WINDOW=30*60000, SNAP_MAX=20, SNAP_BYTES=1500000;
function snapThin(arr){
  // Older points are bucketed by clock hour, not by distance from the newest.
  // Spacing them relative to each other made the long tail erode: whenever a
  // point aged out of the fine window it became the new anchor and dropped the
  // one just behind it, so after a long session nothing older than the window
  // survived. Fixed buckets keep one per hour, permanently.
  const now=Date.now();const keep=[];const seen={};
  for(const s of arr){
    if(now-s.t<SNAP_FINE_WINDOW||s.why!=='auto'){keep.push(s);continue;}
    const bucket=Math.floor(s.t/3600000);
    if(!seen[bucket]){seen[bucket]=1;keep.push(s);}
  }
  return keep.slice(0,SNAP_MAX);
}
function snapshot(why){
  let arr;
  try{arr=JSON.parse(localStorage.getItem('deadmiles.snaps')||'[]');}catch(e){arr=[];}
  if(!Array.isArray(arr))arr=[];
  try{
    if(why==='auto'&&arr[0]&&Date.now()-arr[0].t<SNAP_FINE)return;
    const copy=JSON.parse(JSON.stringify(S));copy.journal=[];delete copy.wx;if(copy.party)delete copy.party.data;
    arr.unshift({t:Date.now(),why,name:S.name,lvl:S.lvl,steps:(S.steps&&S.steps.total)||0,s:copy});
    arr=snapThin(arr);
    // Drop the oldest until it fits. Never wipe the whole history to make room -
    // that used to happen on any storage error and took every restore point with it.
    let out=JSON.stringify(arr);
    while(arr.length>1&&out.length>SNAP_BYTES){arr.pop();out=JSON.stringify(arr);}
    for(;;){
      try{localStorage.setItem('deadmiles.snaps',out);return;}
      catch(e){if(arr.length<=1)return;arr.pop();out=JSON.stringify(arr);}
    }
  }catch(e){}
}
function snapshots(){try{return JSON.parse(localStorage.getItem('deadmiles.snaps')||'[]');}catch(e){return [];}}
function restoreSnapshot(i){
  const arr=snapshots();const s=arr[i];if(!s)return;
  if(!confirm('Go back to the save from '+ago(s.t)+'? ('+(s.s.name||'Survivor')+', level '+s.lvl+', '+fmt(s.steps)+' steps.) The current one is kept as a restore point.'))return;
  snapshot('before going back');
  const keep=S.online;S=Object.assign(fresh(),s.s);S.online=(keep&&keep.ok)?keep:(s.s.online||keep);S.combat=false;ensureState();
  log('Went back to the save from '+ago(s.t)+'.');save();render();toast('Earlier save restored','z');pushPlayer();
}

// ---- cloud restore points (server-side history, v6.0) ----
let CLOUD_SNAPS=null;
async function loadCloudSnaps(){
  const o=O();const el=$('#cloudSnapList');
  if(!o.ok){if(el)el.innerHTML='<p class="help">Go online first (Base tab, Settings) and these appear.</p>';return;}
  if(el)el.innerHTML='<p class="help">Checking the server...</p>';
  try{const rows=await rpc('list_saves',{p_handle:o.handle,p_token:o.token});
    CLOUD_SNAPS=Array.isArray(rows)?rows:[];renderCloudSnaps();
  }catch(e){if(el)el.innerHTML='<p class="help">Could not reach the server: '+esc(e.message)+'</p>';}
}
function renderCloudSnaps(){
  const el=$('#cloudSnapList');if(!el)return;
  if(!CLOUD_SNAPS||!CLOUD_SNAPS.length){el.innerHTML='<p class="help">No server restore points yet. They start building up from now on.</p>';return;}
  el.innerHTML=CLOUD_SNAPS.map((r,i)=>{const t=new Date(r.at).getTime();
    return '<div class="lbrow"><div class="rk">'+(i+1)+'</div><div class="nm">Level '+(r.lvl||1)+'<small>'+fmt(r.steps_total||0)+' lifetime steps · '+esc(ago(t))+(r.why&&r.why!=='auto'?' · '+esc(r.why):'')+'</small></div><div class="sc"><button class="btn xs" onclick="restoreCloudSnap('+r.id+')">Go back</button></div></div>';}).join('');
}
async function restoreCloudSnap(id){
  const o=O();if(!o.ok)return;
  const r=(CLOUD_SNAPS||[]).find(x=>x.id===id);
  if(!confirm('Go back to the server save from '+(r?ago(new Date(r.at).getTime()):'that time')+'?'+(r?' (level '+(r.lvl||1)+', '+fmt(r.steps_total||0)+' steps.)':'')+' What is on this phone right now is kept as a restore point.'))return;
  try{const st=await rpc('get_save',{p_handle:o.handle,p_token:o.token,p_id:id});
    const cs=st&&st.public&&st.public.save;
    if(!cs||!cs.onboarded){toast('That restore point has no character in it.','d');return;}
    snapshot('before a server restore');
    const keep=S.online;S=Object.assign(fresh(),cs);S.online=keep;S.combat=false;S.journal=[];ensureState();
    log('Restored the server save from '+ago(new Date((r&&r.at)||Date.now()).getTime())+'.');
    save();render();toast('Save restored','z');pushPlayer();
  }catch(e){toast(e.message,'d');}
}

// ---- identity mirror (v6.1): who you are, kept in four places at once ----
// localStorage is the one that gets wiped. A cookie, IndexedDB and the cache
// store are separate buckets and usually survive when it does.
const ID_KEY='deadmiles.id';
function idbOpen(){return new Promise((res,rej)=>{try{const r=indexedDB.open('deadmiles',1);
  r.onupgradeneeded=()=>{try{r.result.createObjectStore('kv');}catch(e){}};
  r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);}catch(e){rej(e);}});}
function idbPut(v){idbOpen().then(db=>{const tx=db.transaction('kv','readwrite');tx.objectStore('kv').put(v,'id');}).catch(()=>{});}
function idbGet(){return idbOpen().then(db=>new Promise(res=>{try{const q=db.transaction('kv','readonly').objectStore('kv').get('id');
  q.onsuccess=()=>res(q.result||null);q.onerror=()=>res(null);}catch(e){res(null);}})).catch(()=>null);}
function identWrite(h,t){
  if(!h||!t)return;const v=JSON.stringify({h:h,t:t});
  try{localStorage.setItem(ID_KEY,v);}catch(e){}
  try{document.cookie='dm_id='+encodeURIComponent(v)+';max-age=34560000;path=/;samesite=lax';}catch(e){}
  idbPut(v);
  try{if(window.caches)caches.open('deadmiles-id').then(c=>c.put('/id',new Response(v))).catch(()=>{});}catch(e){}
}
function identLocal(){
  try{const r=localStorage.getItem(ID_KEY);if(r)return JSON.parse(r);}catch(e){}
  try{const m=document.cookie.match(/(?:^|; )dm_id=([^;]*)/);if(m)return JSON.parse(decodeURIComponent(m[1]));}catch(e){}
  return null;
}
async function identFind(){
  const a=identLocal();if(a&&a.h&&a.t)return a;
  try{const r=await idbGet();if(r){const o=JSON.parse(r);if(o&&o.h&&o.t)return o;}}catch(e){}
  try{if(window.caches){const c=await caches.open('deadmiles-id');const m=await c.match('/id');
    if(m){const o=JSON.parse(await m.text());if(o&&o.h&&o.t)return o;}}}catch(e){}
  return null;
}
// Blank launch, but something still remembers the handle: offer it straight away.
async function identBoot(){
  if(S&&S.onboarded)return false;
  const id=await identFind();if(!id)return false;
  openSheet('<h2>Welcome back</h2><p>This phone lost the game data, but it still remembers who you are: <b style="color:var(--bone)">@'+esc(id.h)+'</b>. Your character is safe on the server.</p><div class="grid2"><button class="btn ghost" onclick="closeSheet();onboard()">Start fresh instead</button><button class="btn r" id="idGo">Bring my character back</button></div>',true);
  $('#idGo').onclick=()=>{closeSheet();goOnline(id.h,id.t);};
  return true;
}

// ---- recovery PIN: six digits that get you back in from anywhere ----
function copyRecovery(){try{navigator.clipboard.writeText('Dead Miles - handle @'+O().handle+' - PIN '+(S.recovery||''));toast('Copied','z');}catch(e){}}
function makePin(){let p='';for(let i=0;i<6;i++)p+=Math.floor(Math.random()*10);return p;}
async function setRecovery(code){
  const o=O();if(!o.ok){toast('Go online first','d');return;}
  const c=String(code||'').replace(/\D/g,'');
  const warn=(m)=>{const w=$('#recovWarn');if(w){w.textContent=m;w.style.display='block';}toast(m,'d');};
  if(c.length!==6){warn('Six digits, numbers only.');return;}
  let r;
  try{r=await rpc('set_recovery',{p_handle:o.handle,p_token:o.token,p_code:c});}
  catch(e){warn(/404|not find|does not exist/i.test(e.message)
    ?'The PIN feature is not installed on the server yet. Run round eight of the setup page.'
    :'Could not reach the server: '+e.message);return;}
  if(r==='taken'){warn('Someone already uses that PIN. Pick another.');return;}
  if(r==='format'){warn('Six digits, numbers only.');return;}
  if(r==='weak'){warn('Too easy to guess. Not 123456, not all the same digit.');return;}
  if(r==='busy'){warn('Too many changes in a row. Wait an hour and try again.');return;}
  if(r===true||r===false){warn('The server still has the OLD setup installed. Round eight was updated - run the newest one and try again.');return;}
  if(r==='bad'){O().ok=false;O().err='Your account key is out of date on this device.';save();render();
    signInSheet('This copy of the game is holding an old account key, so the server would not let it save your PIN. Sign in again and it will work.');return;}
  if(r!=='ok'){warn('The server answered "'+String(r)+'", which this version does not understand. Run the newest round eight.');return;}
  S.recovery=c;identWrite(o.handle,o.token);save();renderRecov();toast('PIN saved','z');
}
function saveTypedRecovery(){const el=$('#recovInput');if(el)setRecovery(el.value);}
function suggestRecovery(){const el=$('#recovInput');if(el){el.value=makePin();el.focus();}}
// handle + PIN, from any phone. The device makes a new account key and the
// server swaps to it once the PIN checks out.
async function recoverWithPin(handle,pin){
  const h=slug(handle);const c=String(pin||'').replace(/\D/g,'');
  if(!h){toast('Type your handle','d');return false;}
  if(c.length!==6){toast('The PIN is six digits','d');return false;}
  const fresh=uid()+uid()+uid();
  let r;
  try{r=await rpc('recover_login',{p_handle:h,p_code:c,p_new_token:fresh});}
  catch(e){toast('Could not reach the server. Try again.','d');return false;}
  if(!r||!r.ok){
    const e=r&&r.error;
    if(e==='locked')toast('Too many wrong tries. Wait 15 minutes.','d');
    else if(e==='none')toast('That handle has no PIN set. Use the account key instead.','d');
    else toast('Wrong PIN'+(r&&typeof r.left==='number'?' - '+r.left+' tries left':'')+'.','d');
    return false;
  }
  const o=O();o.handle=h;o.token=fresh;o.ok=false;
  await goOnline(h,fresh);
  return true;
}
function renderRecov(){
  const el=$('#recovBody');if(!el)return;const o=O();
  if(!o.ok){el.innerHTML='<p class="help">Go online first (above) and you can set your PIN here.</p>';return;}
  const c=S.recovery||'';
  el.innerHTML='<p class="help">Six digits you will remember - not your phone passcode, and not 123456. This is how you get back in if you lose this phone.</p>'
    +(c?'<div style="margin:10px 0;padding:12px 14px;border-radius:10px;background:rgba(255,255,255,.06);border-left:4px solid var(--blood);font-size:30px;font-weight:800;letter-spacing:6px;color:var(--bone)">'+esc(c)+'</div><p class="help">Your handle: <b>@'+esc(o.handle)+'</b>. Those two, on any phone, bring your character back.</p>'
        :'<p class="help" style="color:#ffb35c">You do not have one yet. Without it, losing this phone means losing your character.</p>')
    +'<input id="recovInput" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="6" autocomplete="off" placeholder="'+(c?'a new 6-digit PIN':'6 digits')+'" style="width:100%;margin:8px 0;font-size:24px;letter-spacing:6px;text-align:center">'
    +'<p class="help" id="recovWarn" style="display:none;color:#ff8a92"></p>'
    +'<div class="row"><button class="btn sm r" onclick="saveTypedRecovery()">'+(c?'Change my PIN':'Save my PIN')+'</button>'
    +'<button class="btn sm ghost" onclick="suggestRecovery()">Pick one for me</button>'
    +(c?'<button class="btn sm ghost" onclick="copyRecovery()">Copy it</button>':'')+'</div>'
    +'<p class="help" style="margin-top:8px">Five wrong guesses locks the PIN for 15 minutes, so nobody can sit and try numbers.</p>';
}
function save(quiet){try{
  if(S&&S.pets&&S.petActive){const ap=S.pets.find(p=>p.id===S.petActive);if(ap){ap.xp=S.petXp||0;ap.name=S.petName||ap.name;}}
  if(!quiet&&staleCheck()){staleStop();return;}
  if(!quiet)S.savedAt=Date.now();
  localStorage.setItem('deadmiles.v3',JSON.stringify(S));
  if(!quiet)snapshot('auto');
  if(!quiet&&S.onboarded&&S.online&&S.online.ok&&typeof pushSoon==='function')pushSoon();
}catch(e){}}
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
      case 'step':this.noise(.04,.035);break;
      case 'thunder':this.tone(48,.9,'sawtooth',.11,-24);this.noise(.7,.05);break;
      case 'unlock':[659,880,1046].forEach((f,i)=>setTimeout(()=>this.tone(f,.18,'triangle',.07),i*110));break;
      case 'nemesis':[196,165,131].forEach((f,i)=>setTimeout(()=>this.tone(f,.35,'sawtooth',.09),i*160));break;
      case 'week':[523,659,784,1046,1318].forEach((f,i)=>setTimeout(()=>this.tone(f,.22,'triangle',.08),i*130));break;
      case 'arrive':[440,554].forEach((f,i)=>setTimeout(()=>this.tone(f,.15,'triangle',.07),i*120));break;
      case 'dead':[300,250,200,120].forEach((f,i)=>setTimeout(()=>this.tone(f,.3,'sawtooth',.08),i*180));break;
      case 'win':[523,659,784,1046].forEach((f,i)=>setTimeout(()=>this.tone(f,.18,'square',.07),i*90));break;
    }}
};

/* ================= player ================= */
function sk(id){return S.skills[id]||0;}
const MEDS={
  bandage: {n:'Bandages',       e:'🩹', pct:0.20, min:35, c:10,  d:'Patch it and keep going.'},
  pain:    {n:'Painkillers',    e:'💊', pct:0.24, min:40, c:14,  d:'Takes the edge off.'},
  abx:     {n:'Antibiotics',    e:'💉', pct:0.32, min:50, c:25,  d:'Also clears an infection on its own.'},
  kit:     {n:'Trauma kit',     e:'🧰', pct:0.55, min:70, c:45,  d:'Proper field surgery.'},
  adrena:  {n:'Adrenaline shot',e:'⚡', pct:0.35, min:55, c:60,  d:'In a fight it also keeps you on your feet for that round, whatever lands.'},
  bloodbag:{n:'Blood bag',      e:'🩸', pct:1.00, min:999,c:90,  d:'Back to full, from anywhere. The whole bag.'},
};
const MED_ORDER=['bandage','pain','abx','kit','adrena','bloodbag'];
function medHeal(id){
  const m=MEDS[id]||MEDS.bandage;
  const base=Math.max(m.min,Math.round(maxHp()*m.pct));
  return Math.min(maxHp(), base+setPerk('med')+sk('fielddressing')*10);
}
// The stash used to flatten every med into one number, so a trauma kit put away
// for later came back out worth the same as a bandage. Tiers are kept now.
function medStock(){const s=S.stock;if(!s.medkit)s.medkit={};return s.medkit;}
function medsHeld(id){return id==='bandage'?(S.stock.meds||0):(medStock()[id]||0);}
function medsTake(id){if(id==='bandage'){S.stock.meds=Math.max(0,(S.stock.meds||0)-1);}else{const m=medStock();m[id]=Math.max(0,(m[id]||0)-1);}}
function medsGive(id,n){n=n||1;if(id==='bandage'){S.stock.meds=(S.stock.meds||0)+n;}else{const m=medStock();m[id]=(m[id]||0)+n;}}
function medsTotal(){return MED_ORDER.reduce((a,id)=>a+medsHeld(id),0);}
function packMeds(id){return S.pack.filter(x=>x.cat==='meds'&&(MEDS[x.id]?x.id:'bandage')===id).length;}
function packMedsTotal(){return S.pack.filter(x=>x.cat==='meds').length;}
// Everything she can reach right now, pack first: what is on her is what she
// loses if she goes down, so it is what she should be spending.
// The one the fight will reach for: strongest first, pack before stash.
function bestMed(){
  for(let i=MED_ORDER.length-1;i>=0;i--){const id=MED_ORDER[i];if(packMeds(id)>0)return id;}
  for(let i=MED_ORDER.length-1;i>=0;i--){const id=MED_ORDER[i];if(medsHeld(id)>0)return id;}
  return 'bandage';
}
function medsAll(){return MED_ORDER.map(id=>({id,pack:packMeds(id),stock:medsHeld(id)})).filter(x=>x.pack||x.stock);}
const maxHp=()=>Math.max(30,Math.round(hydroHpMult()*(1-infectPenalty())*(100+(S.lvl-1)*10+sk('tough')*10+sk('thickskin')*8+sk('survivalist')*5+(bg('firefighter')?10:0)-(bg('gamer')?10:0))));
const eqItem=(slot)=>S.eq[slot]?S.gear.find(g=>g.uid===S.eq[slot]):null;
const ARMOR_SLOTS=['armor','head','hands','feet'];
const dr=()=>ARMOR_SLOTS.reduce((a,k)=>a+((eqItem(k)&&eqItem(k).dr)||0),0);
// A classic soak curve: every point of armour is worth less than the last, so
// it can never reach zero damage and there is always a reason for one more
// piece. Bare: 0%. One jacket (2): 8%. A full common set (5): 18%.
// A full rare set (17): 43%. Everything legendary (19): 46%.
const drSoak=()=>{const d=dr();return d/(d+22);};
const capacity=()=>10+(eqItem('bag')?eqItem('bag').cap:0)+(roleLvl('quartermaster')?3+roleLvl('quartermaster'):0)+sk('deeppockets')*2+sk('packrat')*2;
/* FISTS (fixed v6.77). baseDmg added her FULL level, and then act() added
   (lvl-1) again on top - so bare hands got her level twice while every weapon
   in the game got it once. At level 20 that is fists 42-45 against a baseball
   bat's 28-34, and fists never break, never wear out and cost nothing. Her
   words: "our fists are also OP, I can just use my fists forever."
   Fists now creep up slowly and land around the worst weapon in the game,
   which is what they are for: a fallback that saves your good weapon on a
   walker, never a reason to stop carrying one. */
const baseDmg=()=>{const g=Math.floor((S.lvl||1)/4);return [3+g,6+g];};
function addXp(n){if(setPerk('xp'))n=Math.round(n*(1+setPerk('xp')));if(S.pet==='cat')n=Math.round(n*petXpMult());if(bg('gamer'))n=Math.round(n*(1.25+sk('metaknowledge')*0.05));S.xp+=n;while(S.xp>=S.lvl*40){S.xp-=S.lvl*40;S.lvl++;S.sp++;S.hp=maxHp();log('Level '+S.lvl+'. Max HP '+maxHp()+'. +1 skill point.');toast('Level '+S.lvl+' · +1 skill point','a');SFX.play('levelup');}}
const activeCrew=()=>S.active.map(id=>S.crew.find(c=>c.id===id)).filter(c=>c&&(c.hp===undefined||c.hp>0));
const woundedCrew=()=>S.crew.filter(c=>c.hp!==undefined&&c.hp<=0);
function roleLvl(role){let b=0;for(const c of activeCrew())if(c.role===role)b=Math.max(b,c.lvl+sk('leader'));return b;}
function crewSlots(){return 1+(S.base&&S.base.rooms.bunk?S.base.rooms.bunk:0);}
function crewXp(n){for(const c of activeCrew()){c.xp+=n;if(c.xp>=c.lvl*6&&c.lvl<5){c.xp-=c.lvl*6;c.lvl++;log(c.name+' is now level '+c.lvl+'.');}}}
const HYDRO_STEPS=900;
/* ================= DRINKS AND SNACKS (v6.37) =================
   Water used to be one undifferentiated counter. These are individual things
   you find and choose to use, and each one is a small trade rather than a
   straight upgrade - the wine heals the most and makes you miss more. */
const DRINKS={
  energy:{n:'Energy drink',e:'🥤',hyd:20,buff:'wired',d:'+20 water, and you hit 15% harder in your next fight'},
  soda:  {n:'Can of soda', e:'🧃',hyd:32,buff:'sugar',d:'+32 water now, but you get thirsty faster for the rest of the day'},
  wine:  {n:'Bottle of wine',e:'🍷',hyd:12,hp:22,buff:'numb',d:'+12 water, +22 HP, and you miss more in your next fight'},
  brew:  {n:'Cold brew',   e:'☕',hyd:16,buff:'sharp',d:'+16 water, and your first hit next fight lands 50% harder'},
};
const SNACKS={
  bar:  {n:'Protein bar',e:'🍫',hp:9,d:'+9 HP'},
  nuts: {n:'Trail mix',  e:'🥜',hp:7,hyd:4,d:'+7 HP and a little water'},
  chips:{n:'Bag of chips',e:'🍟',hp:5,hyd:-6,d:'+5 HP, but salty - costs you water'},
  gum:  {n:'Stick of gum',e:'🍬',hp:2,hyd:6,d:'+2 HP, +6 water. Better than nothing'},
};
const BUFF_TEXT={wired:'Wired: +15% damage',sharp:'Sharp: your first hit lands 50% harder',
  numb:'Numb: you miss more often',sugar:'Sugar crash: thirsty faster today'};
function buffOn(k){return S.buff&&S.buff.k===k&&(S.buff.fights>0);}
function setBuff(k){S.buff={k,fights:1};}
function buffClear(){if(S.buff&&S.buff.fights>0){S.buff.fights--;if(S.buff.fights<=0)S.buff=null;}}
function useDrink(uidv){
  const it=S.pack.find(x=>x.uid===uidv);if(!it||!it.drink)return;
  const d=DRINKS[it.drink];if(!d)return;
  S.pack=S.pack.filter(x=>x.uid!==uidv);
  S.hydro=Math.max(0,Math.min(100,(S.hydro===undefined?100:S.hydro)+d.hyd));
  if(d.hp)S.hp=Math.min(maxHp(),S.hp+d.hp);
  if(d.buff==='sugar')S.sugarDay=S.steps.date; else if(d.buff)setBuff(d.buff);
  log('You drink the '+d.n.toLowerCase()+'. '+d.d);
  toast(d.n+' · '+(d.buff&&d.buff!=='sugar'?BUFF_TEXT[d.buff]:'water '+Math.round(S.hydro)+'%'),'z');
  SFX.play('ui');save();render();
}
function useSnack(uidv){
  const it=S.pack.find(x=>x.uid===uidv);if(!it||!it.snack)return;
  const k=SNACKS[it.snack];if(!k)return;
  S.pack=S.pack.filter(x=>x.uid!==uidv);
  S.hp=Math.min(maxHp(),S.hp+(k.hp||0));
  if(k.hyd)S.hydro=Math.max(0,Math.min(100,(S.hydro===undefined?100:S.hydro)+k.hyd));
  log('You eat the '+k.n.toLowerCase()+'. '+k.d);
  toast(k.n+' · +'+k.hp+' HP','z');SFX.play('ui');save();render();
}
/* ================= INFECTION (v6.45) =================
   Measured: at level 8+ an ordinary fight costs 0-11% of your health, so the
   road is scenery. The answer is not fatter walkers - it is that a bite should
   MEAN something. This is the one mechanic the genre is built on and the game
   did not have.

   Infection does not kill you outright. It takes your CEILING away: maximum
   health drops, drops further every day you leave it, and burns through you as
   you walk. Antibiotics cure it, and antibiotics are rare - which turns "I found
   loot" into "I found the RIGHT loot". */
/* ================= DIFFICULTY (v6.46) =================
   Her friends want a grind; she cannot always get out. Those are not the same
   request and no single set of numbers serves both. So it is a choice, per
   player, changeable any time - and Normal is genuinely playable on a day you
   barely move. */
const DIFF={
  normal:{n:'Survivor', d:'The county as it is meant to be. Fair on a day you barely move.',
          enemy:1,   infect:1,   scrap:0.10, meds:3, raid:1},
  hard:  {n:'Hardened', d:'Enemies hit harder, bites turn more often, death takes more.',
          enemy:1.25,infect:1.8, scrap:0.20, meds:2, raid:1.15},
  brutal:{n:'Hollow',   d:'For the people who asked for a grind. Do not pick this to relax.',
          enemy:1.5, infect:2.6, scrap:0.30, meds:1, raid:1.3},
};
/* Map skin. She asked for "cuter, kind of like Pikmin Bloom" - so Bloom is the
   default now, and the original grim night map stays as an option rather than
   being thrown away. */
// The base map is most of what the map screen LOOKS like, and the plain
// OpenStreetMap style draws every street name and every house number, which is
// what made it read as a road atlas.
//
// The fix is NOT a different tile host. CARTO's styles were tried in v6.51 and
// came back as "API key required" images - and because those arrive as a normal
// 200 with a picture in them, the tile-error fallback never fired and she was
// left looking at the error. Every good-looking free basemap is one policy
// change away from doing exactly that.
//
// So: same OpenStreetMap tiles the game has always used, and no third party at
// all. What removes the clutter is `nat` - maxNativeZoom. Street names and house
// numbers are only DRAWN into the tile at high zoom, so asking for a lower-zoom
// tile and letting Leaflet scale it up means those labels were never rendered in
// the first place. The upscale also softens the whole thing, which is the look
// she was asking for anyway.
const OSM_TILES='https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const OSM_ATTR='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
const MAPSKINS={
  bloom:{n:'Bloom',d:'Soft daylight, no address clutter.',
    tiles:OSM_TILES,max:19,nat:16,bg:'#eef3e2',attr:OSM_ATTR},
  hollow:{n:'Hollow',d:'The same map at night.',
    tiles:OSM_TILES,max:19,nat:16,bg:'#0d0d12',attr:OSM_ATTR},
  atlas:{n:'Atlas',d:'Every street name and house number, for reading.',
    tiles:OSM_TILES,max:19,bg:'#1a1c1a',attr:OSM_ATTR}};
function mapSkin(){const k=(typeof S!=='undefined'&&S&&S.mapSkin)||'bloom';return MAPSKINS[k]?k:'bloom';}
function applyMapSkin(){
  const m=$('#v-map');
  if(m)for(const k of Object.keys(MAPSKINS))m.classList.toggle('map-'+k,mapSkin()===k);
  if(typeof applyTiles==='function'){try{applyTiles();}catch(e){}}
}
function setMapSkin(k){if(!MAPSKINS[k])return;S.mapSkin=k;applyMapSkin();save();render();toast(MAPSKINS[k].n+' map','a');}
function diff(){return DIFF[(typeof S!=='undefined'&&S&&S.diff)||'normal']||DIFF.normal;}
function setDiff(k){if(!DIFF[k])return;S.diff=k;log('Difficulty set to '+DIFF[k].n+'.');toast(DIFF[k].n,'a');save();render();}
const INFECT_BASE=0.012, INFECT_PER_STEPS=600;
/* Staging used to advance on CALENDAR DAYS, which meant a player who could not
   get out for two days came back at stage 3 with a third of their health gone.
   That punishes having a life, in a game whose whole point is to make walking
   feel good. It only worsens when you get bitten AGAIN while already infected -
   driven by what you do, never by time you were away. */
function infect(){return (typeof S!=='undefined'&&S&&S.infect)||null;}
function infectStage(){const f=infect();if(!f)return 0;return Math.min(3,f.stage||1);}
function infectPenalty(){return [0,0.10,0.18,0.26][infectStage()]||0;}
function infectChance(){return INFECT_BASE*(DIFF[S.diff||'normal'].infect);}
function infectLabel(){return ['','Infected','Fevered','Failing'][infectStage()]||'';}
function catchInfection(from){
  if(sk('ironjaw')&&Math.random()<0.25)return;
  if(infect()){                                   // a second bite makes it worse
    const f=S.infect;if((f.stage||1)>=3)return;
    f.stage=(f.stage||1)+1;
    clog('Another one got through. It is turning.','hit');
    toast('Infection worse: '+infectLabel(),'d');
    return;
  }
  S.infect={at:Date.now(),stage:1,from:from||'a bite'};
  clog('That one broke the skin. It is going to fester.','hit');
  log('You were bitten. Infection is setting in - your maximum health falls until you find antibiotics.');
  toast('INFECTED. Find antibiotics.','d');SFX.play('nemesis');
}
function cureInfection(){
  if(!infect()){toast('You are not infected');return;}
  const inPack=S.pack.find(x=>x.id==='abx');
  const stockAbx=medsHeld('abx')>0;
  if(!inPack&&!stockAbx&&S.stock.meds<4){toast('Antibiotics, or four bandages from the stash, will clear it','d');return;}
  if(inPack)S.pack=S.pack.filter(x=>x!==inPack); else if(stockAbx)medsTake('abx'); else S.stock.meds-=4;
  S.infect=null;S.infectStep=0;S.hp=Math.min(maxHp(),S.hp);
  log('The fever breaks. '+(inPack?'The antibiotics did it.':'Four doses and a bad night, but it did it.'));
  toast('Infection cleared','z');SFX.play('legend');save();render();
}
function hydroState(){const h=S.hydro===undefined?100:S.hydro;return h>=60?'ok':h>=30?'thirsty':h>0?'parched':'empty';}
function hydroDmg(){const s=hydroState();return s==='ok'?1:s==='thirsty'?0.9:0.8;}
function hydroHpMult(){const s=hydroState();return (s==='parched'||s==='empty')?0.85:1;}
function hydroLabel(){const s=hydroState();return s==='ok'?'Hydrated':s==='thirsty'?'Thirsty':s==='parched'?'Parched':'Dried out';}
function drink(n){if(S.stock.water<1){toast('No water in the stash');return false;}S.stock.water--;S.hydro=Math.min(100,(S.hydro||0)+(n||35));log('You drink. Hydration '+Math.round(S.hydro)+'%.');toast('Water: '+Math.round(S.hydro)+'%','z');SFX.play('ui');save();render();return true;}
function loseHydro(n){
  if(S.sugarDay===S.steps.date)n=Math.round(n*1.25);   // soda: thirstier all day
const was=hydroState();S.hydro=Math.max(0,(S.hydro===undefined?100:S.hydro)-n);
  if(S.hydro<=10&&S.stock.water>0){S.stock.water--;S.hydro=Math.min(100,S.hydro+35);log('You stopped for water without thinking about it.');}
  const now=hydroState();if(now!==was&&now!=='ok'){toast(hydroLabel()+(now==='thirsty'?'. Drink soon.':'. Your hits are weaker.'),'d');}}
function crewMax(c){return 40+12*(c.lvl||1);}
function newCrew(role){const used=S.crew.map(c=>c.name);const names=CREW_NAMES.filter(n=>!used.includes(n));const c={id:uid(),name:names.length?pick(names):pick(CREW_NAMES),av:ART.randomAv(),role:role||pick(Object.keys(ROLES)),lvl:1,xp:0};c.hp=crewMax(c);return c;}
function hurtCrew(c,n){c.hp=Math.max(0,(c.hp===undefined?crewMax(c):c.hp)-n);
  if(c.hp<=0){clog(c.name+' goes down and drags themselves out of the fight.','hit');
    const i=S.active.indexOf(c.id);
    if(i>=0){S.active.splice(i,1);log(c.name+' was hurt badly and is out until they heal. Their slot is free - bring someone else along.');}
    else log(c.name+' was hurt badly and is out until they heal.');
    SFX.play('hurt');}
  else clog(c.name+' takes '+n+'.','hit');}
function healCrew(id){const c=S.crew.find(x=>x.id===id);if(!c)return;if(c.hp>=crewMax(c)){toast(c.name+' is fine');return;}if(medsTotal()<1){toast('No meds in the stash');return;}medsTake(MED_ORDER.find(id=>medsHeld(id)>0));c.hp=crewMax(c);log('Patched up '+c.name+'.');toast(c.name+' is back on their feet','a');SFX.play('win');save();render();}
function skillList(){return (SKILLS[S.cls]||[]).concat(SKILLS[S.bg]||[]).concat(SKILLS.general);}
const bg=(id)=>S&&S.bg===id;
function dmgBonus(){let d=sk('heavyhands')*2+sk('axeman')*2+sk('sharpknife')-(bg('gamer')?1:0);
  if(setPerk('vsHuman')&&C){const t=C.enemies[C.target];if(t&&t.human)d+=Math.max(1,Math.round((t.max||20)*setPerk('vsHuman')*0.5));}if(sk('rampage')&&C)d+=sk('rampage')*2*C.enemies.filter(e=>e.dead).length;return d;}
function learn(id){const def=skillList().find(s=>s.id===id);if(!def||S.sp<1||sk(id)>=def.max)return;if(def.req&&S.lvl<def.req){toast(def.n+' unlocks at level '+def.req);return;}S.skills[id]=sk(id)+1;S.sp--;SFX.play('ui');log('Learned '+def.n+' '+S.skills[id]+'.');save();render();}
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
// Weather already changed the numbers; nothing ever told her, so it could not
// change a decision. These are the real modifiers, written out.
function wxEffects(){
  const k=wxKind(), night=isNight(), t=(S.wx&&S.wx.temp);
  const out=[];
  if(k==='storm')out.push({good:true, t:'Loot is 30% better - nobody else is out in this'},
                          {good:false,t:'One extra walker in every encounter'});
  if(k==='snow') out.push({good:true, t:'Loot is 10% better'},
                          {good:false,t:'Places are 10% further apart'});
  if(k==='rain') out.push({good:true, t:'You move quietly - searching makes far less noise'},
                          {good:false,t:'Harder to spot trouble early'});
  if(k==='fog')  out.push({good:false,t:'Ambushes are much more likely'},
                          {good:false,t:'Harder to spot trouble early'});
  if(k==='rain'||k==='storm')out.push({good:true,t:'The rain barrel fills faster'});
  if(thirstMult()>1)out.push({good:false,t:'Hot and dry - you get thirsty about '+Math.round((thirstMult()-1)*100)+'% faster'});
  if(thirstMult()<1)out.push({good:true,t:'Cool out - your water lasts longer'});
  if(night)out.push({good:true,t:'Night: loot is 50% better'},{good:false,t:'Night: one extra walker in every encounter'});
  if(!out.length)out.push({good:true,t:'Clear and quiet. Nothing helping you, nothing against you.'});
  return out;
}
// The one genuinely new effect, and it makes water a decision: heat drains you.
function thirstMult(){
  const k=wxKind(), t=(S.wx&&typeof S.wx.temp==='number')?S.wx.temp:null;
  let m=1;
  if(dayMod().thirst)m*=dayMod().thirst;
  if(k==='rain'||k==='snow')m*=0.8;
  if(k==='storm')m*=0.9;
  if(t!==null){ if(t>=30)m*=1.5; else if(t>=25)m*=1.25; else if(t<=5)m*=0.85; }
  return Math.round(m*100)/100;
}
function lootMult(){let m=district().loot*modLoot();if(wxKind()==='snow')m*=1.1;if(wxKind()==='storm')m*=1.3;if(isNight())m*=1.5+sk('nightowl')*0.1;return m;}

/* ================= world ================= */
// ---- the road does not end (v6.20) ----
// The county used to stop at The Overpass, 320,000 steps. After that nothing
// new ever arrived again: same district, same threat, same loot, forever. So
// the road keeps going. Districts past the hand-written six are generated,
// deterministic by index, and threat and loot keep climbing. Nothing resets.
const DIST_FAR=['The Reservoir','Kestrel Flats','The Quarry','Ash Hollow','Carter Mill','The Fairgrounds',
  'North Bridge','Pinegrove','The Rail Yard','Blackwater','Sutter Ridge','The Airfield','Moss Landing',
  'Fort Hale','The Cannery','Widow Creek','Granite Pass','The Silos','Lake Verity','Dunmore'];
const DIST_STEP=100000;               // a new district every 100k beyond the county
function districtAt(i){
  if(i<DISTRICTS.length)return DISTRICTS[i];
  const k=i-DISTRICTS.length;         // 0,1,2... out past the Overpass
  const base=DISTRICTS[DISTRICTS.length-1];
  return {
    n:DIST_FAR[k%DIST_FAR.length]+(k>=DIST_FAR.length?' II':''),
    dist:[base.dist[0]+k*40, base.dist[1]+k*70],
    loot:Math.round((base.loot+(k+1)*0.15)*100)/100,
    threat:Math.round((base.threat+(k+1)*0.2)*100)/100,
    steps:base.steps+(k+1)*DIST_STEP,
    far:true};
}
const district=()=>districtAt(Math.max(0,S.walk.district|0));
function unlockedDistrict(){
  let d=0;
  for(let i=0;i<DISTRICTS.length;i++)if(S.steps.total>=DISTRICTS[i].steps)d=i;
  if(S.steps.total>=DISTRICTS[DISTRICTS.length-1].steps){
    const past=Math.floor((S.steps.total-DISTRICTS[DISTRICTS.length-1].steps)/DIST_STEP);
    d=DISTRICTS.length-1+past;
  }
  return d;
}
// A rank you carry, so the far road means something you can see.
const VET_STEP=500000;
function vetRank(){return Math.floor((S.steps.total||0)/VET_STEP);}
const VET_TITLES=['','Veteran','Ranger','Pathfinder','Outrider','Long Walker','Legend of the Road'];
function vetTitle(){const r=vetRank();return r?(VET_TITLES[Math.min(r,VET_TITLES.length-1)]+(r>=VET_TITLES.length?' '+(r-VET_TITLES.length+2):'')):'';}
function newDistance(){const d=district();let dist=rint(d.dist[0],d.dist[1]);dist=Math.round(dist*(1-sk('pathfinder')*0.06-sk('speedrunner')*0.05-setPerk('dist')));if(wxKind()==='snow')dist=Math.round(dist*1.1);S.walk.dist=dist;S.walk.progress=0;S.walk.toNext=dist;}
function bossName(){if(eventNow()==='halloween')return 'The Gourd King';return BOSS_NAMES[hash(weekId()+'boss')%BOSS_NAMES.length];}
function makeLoc(force,nameOverride){
  let type;
  if(force)type=LOCS.find(l=>l.t===force)||LOCS[0];else if(S.walk.district>=1&&Math.random()<0.12&&S.campCleared!==weekId())type=LOCS.find(l=>l.t==='stronghold');else type=wpick(LOCS.filter(l=>l.w>0),'w');
  const rooms=type.rooms.map(r=>({n:r.n,noise:r.noise,cats:r.cats,shelf:r.shelf,gear:r.gear||0,keyish:!!r.keyish,stage:r.stage||0,done:false,items:null,peek:null}));
  const loc={t:type.t,e:type.e,n:nameOverride||pick(type.n),rooms,noise:0,found:[],cleared:false,wave:0,threat:type.threat,stronghold:!!type.stronghold,stage:0};
  for(const r of rooms)r.items=rollRoom(r,loc);
  // A SEALED ROOM (v6.77). Rare on purpose - about 1 place in 40 - and never in
  // a stronghold, which already has its own boss at the end. It is not searched,
  // it is BROKEN INTO, and something is still in there.
  // Added AFTER the loot roll on purpose: it carries no categories, and
  // rollRoom on an empty category list picks from an empty table and throws.
  // Its loot comes from sealAfter(), not from the ordinary room tables.
  if(!loc.stronghold&&Math.random()<SEAL_ODDS){
    const k=pick(SEALS);
    loc.rooms.push({n:k.n,noise:0,cats:[],shelf:0,gear:0,keyish:false,stage:0,done:false,items:[],peek:null,sealed:k.id});
  }
  if(roleLvl('scout')&&wxKind()!=='fog'){const r=rooms[rint(0,rooms.length-1)];const best=r.items.slice().sort((a,b)=>b.pts-a.pts)[0];r.peek=best?best.e+' '+best.n:'looks empty';}
  return loc;
}
const SEAL_ODDS=0.025;
const SEALS=[
  {id:'butcher',n:'Padlocked meat locker', d:'A walk-in freezer, chained from the OUTSIDE. Something heavy shifts against the door when you touch it.'},
  {id:'matron', n:'Nailed-shut nursery',   d:'Every window boarded from the inside, and a chair wedged under the handle. Someone sealed themselves in here, and then stopped being someone.'},
  {id:'hollow', n:'Bricked-up stairwell',  d:'A basement door bricked over in a hurry, mortar still smeared. The brick is cold, and it is not cold outside.'},
  {id:'cellar', n:'Bolted storm cellar',   d:'Steel doors, four bolts, all of them on your side. Whoever locked this was keeping something IN.'},
];
function sealOf(id){return SEALS.find(x=>x.id===id)||SEALS[0];}
function rarW(it){const r=RAR[it.r||'common'].w;return r>=3?1+sk('eagleeye')*0.15+sk('rng')*0.1+setPerk('rare'):1;}
function rollRoom(r,loc){
  const lm=lootMult()*(loc.stronghold?1.4:1);const list=table(r.cats,r.shelf,r.gear).map(x=>({...x,w:x.w*rarW(x)}));const n=rint(1,3);const out=[];
  for(let i=0;i<n;i++){const it=wpick(list,'w');if(it.gear)out.push({id:it.id,n:it.n,e:it.e,pts:it.pts,cat:'gear',gear:true,r:it.r});else out.push({id:it.id,n:it.n,e:it.e,pts:Math.round(it.pts*lm),cat:it.cat,qty:it.qty,r:it.r});}
  if(Math.random()<0.07)out.push({id:'chest',...ITEMS.chest});
  if(Math.random()<(r.keyish?0.06:0.025))out.push({id:'key',...ITEMS.key});
  if(Math.random()<0.04){const c=rollCosmetic();if(c)out.push(c);}
  if(eventNow()==='halloween'&&Math.random()<0.3)out.push({id:'candy',n:'Halloween candy',e:'🍬',pts:3,cat:'candy',r:'uncommon',qty:rint(2,5)});
  return out;
}
function rollCosmetic(){const pool=cosmeticPool().map(c=>({...c,w:(COS_W[c.r]||1)*rarW(c)}));const c=wpick(pool,'w');return {id:c.id,n:c.n,e:c.slot==='hat'?'🎩':c.slot==='top'?'👕':'🕶️',pts:c.r==='legendary'?60:c.r==='epic'?30:18,cat:'cosmetic',r:c.r,slot:c.slot,key:c.key};}
// Ordinary enemies used to grow 0.075 per level while the player gains a flat
// +1 damage per level ON TOP of a better weapon, so the gap widened forever: by
// level 14 one swing killed a walker and a road fight cost literally 0 HP.
// These two keep the world in step with her. They are deliberately NOT applied
// to raids - raids already carry tier multipliers, and stacking both made tier 5
// unwinnable (measured: 3% win at level 12).
const WORLD_PER_LEVEL=0.13, WORLD_BASE=1.15, WORLD_CROWD_LVL=10;
function worldEnemy(k){
  const e=mk(k),lvl=S.lvl||1;
  const f=((1+Math.max(0,lvl-5)*WORLD_PER_LEVEL)/(1+Math.max(0,lvl-5)*0.075))*WORLD_BASE;
  e.hp=e.max=Math.round(e.max*f);
  e.dmg=e.dmg.map(x=>Math.round(x*f));
  return e;
}
function worldCrowd(en){
  // Past level 10 the county sends one more body. A lone walker is never a
  // threat to a grown character; three of them are.
  if((S.lvl||1)>=WORLD_CROWD_LVL&&en.length)en.push(worldEnemy(Math.random()<0.6?'walker':'runner'));
  return en;
}
function encounterFor(loc){
  const th=district().threat*loc.threat;const rng=Math.random();
  if(loc.stronghold){return strongholdStage(loc.stage+1);}
  const ambushCut=roleLvl('scout')?0.2+roleLvl('scout')*0.08:0;
  let quiet=0.27+ambushCut;if(wxKind()==='fog')quiet-=0.1;if(wxKind()==='rain')quiet-=0.08;
  if(rng<quiet)return [];
  let count=th<1.5?(Math.random()<0.3?2:1):th<2.5?rint(1,3):rint(2,3);if(isNight()||wxKind()==='storm')count++;count+=modCount();count=Math.max(1,count);count=Math.min(S.walk.district>=3?5:4,count);const out=[];
  for(let i=0;i<count;i++){if(S.walk.district>=1&&Math.random()<0.15)out.push(worldEnemy(Math.random()<0.7?'raider':'gunner'));else{const k=wpick(Object.entries(ENEMIES).filter(([k,v])=>v.w>0).map(([k,v])=>({k,w:v.w*(isNight()&&k==='runner'?2:1)})),'w').k;out.push(worldEnemy(k));}}
  return worldCrowd(out);
}
function strongholdStage(st){if(st===1)return [mk('raider'),mk('raider')];if(st===2)return [mk('raider'),mk('gunner'),mk('raider')];const b=mk('boss');b.n=bossName();b.hp=Math.round(b.hp*1.5);b.max=b.hp;b.wanted=true;b.g=BOSS_GIMMICK[b.n]||'crit';if(b.g==='shield')b.shield=30;if(b.g==='dodgy'){b.dodge=0.45;b.hp=Math.round(b.hp*0.7);b.max=b.hp;}if(b.g==='slow'){b.dmg=b.dmg.map(x=>Math.round(x*1.4));}return [mk('gunner'),b];}
function mk(k){const e=ENEMIES[k];const scale=(1+S.walk.district*0.12+S.league.tier*0.06+Math.max(0,S.lvl-5)*0.075)*diff().enemy;return {k,n:e.n,hp:Math.round(e.hp*scale),max:Math.round(e.hp*scale),dmg:e.dmg.map(x=>Math.round(x*scale)),hit:e.hit+(isNight()?0.04:0),xp:e.xp,dodge:e.dodge||0,fast:!!e.fast,burst:e.burst||0,scream:e.scream||0,human:!!e.human,boss:!!e.boss,dead:false,stun:0};}

/* ================= steps ================= */
const WATCH_JOBS={
  patrol:{n:'Patrol the block',e:'🔦',d:'Walk the fence line. A couple of dead ones, some loot they were chewing on.',enemies:()=>[mk(pick(['walker','walker','runner']))].concat(Math.random()<0.5?[mk('walker')]:[]),reward:{items:2,scrap:3}},
  bounty:{n:'Bounty: a raider',e:'🎯',d:'One of Nadia\'s people is squatting nearby. Bring back what they carry.',enemies:()=>[mk(Math.random()<0.7?'raider':'gunner')],reward:{items:1,scrap:6,key:0.25}},
  horde:{n:'Hold the corner',e:'🧟',d:'Three at once. Big payout if you are still standing.',enemies:()=>[mk('walker'),mk(pick(['walker','runner','screamer'])),mk(Math.random()<0.3?'bloater':'walker')],reward:{items:4,scrap:8}},
  strays:{n:'Clear the strays',e:'🐕',d:'Runners have been circling the base at night. Two of them, quick ones.',enemies:()=>[mk('runner'),mk('runner')],reward:{items:2,scrap:4}}
};
function watchMax(){return 3+(S.base&&S.base.rooms.tower?S.base.rooms.tower:0)+(S.base&&S.base.rooms.bell?1:0)+sk('wellstocked')+dealMod('watch');}
// The board used to post exactly 3 jobs while watchMax() allowed 3 + Watchtower
// level + Alarm bell + Well Stocked. So the counter read "of 5", only 3 jobs
// existed, and every upgrade that promises "+1 watch job per day" did nothing at
// all. She noticed because she had been doing three against a label saying five.
//
// Two traps in the fix. There are only 4 job TYPES, so filling to watchMax()
// with a unique-key loop spins forever the moment the cap passes 4 - the board
// fills with unique types first, then allows a repeat. And the list can now hold
// duplicates, so taking one must remove ONE entry, not every entry of that type.
function watchFill(jobs,n){
  const keys=Object.keys(WATCH_JOBS);
  let guard=0;
  while(jobs.length<n&&guard++<200){
    const fresh=keys.filter(k=>!jobs.includes(k));
    jobs.push(pick(fresh.length?fresh:keys));
  }
  return jobs;
}
function watchState(){
  const t=todayStr();
  if(!S.watch||S.watch.date!==t)S.watch={date:t,used:0,jobs:watchFill([],watchMax())};
  // The cap can rise mid-day - she finishes the Watchtower at noon - so top the
  // board up rather than making her wait until tomorrow for what she just built.
  const want=watchMax()-S.watch.used;
  if(S.watch.jobs.length<want)watchFill(S.watch.jobs,want);
  return S.watch;
}
function takeWatch(k){const w=watchState();if(S.loc||S.combat){toast('Finish what you are doing first');return;}if(w.used>=watchMax()){toast('No watches left today');return;}
  const j=WATCH_JOBS[k];if(!j||!w.jobs.includes(k)){return;}if(S.hp<25&&!confirm('You are at '+S.hp+' HP. Take the job anyway?'))return;
  gearCheck(()=>{const w2=watchState();const i=w2.jobs.indexOf(k);if(i<0||w2.used>=watchMax())return;w2.used++;w2.jobs.splice(i,1);save();log('Watch duty: '+j.n+'.');startCombat(j.enemies(),'watch',k);});}
function watchReward(k){const j=WATCH_JOBS[k];if(!j)return;const r=j.reward;const got=[];const list=table(['food','water','meds','scrap','ammo'],0.15,0.25);
  for(let i=0;i<r.items;i++){const it=wpick(list,'w');const item=it.gear?{id:it.id,n:it.n,e:it.e,pts:it.pts,cat:'gear',gear:true,r:it.r}:{id:it.id,n:it.n,e:it.e,pts:it.pts,cat:it.cat,qty:it.qty,uid:uid(),r:it.r};if(takeItem(item,null))got.push(it.e+' '+it.n);}
  S.stock.scrap+=r.scrap;if(r.key&&Math.random()<r.key){S.keys++;got.push('🗝️ Chest key');}
  if(k==='strays'&&Math.random()<0.1&&(S.pets||[]).length<PET_MAX){setTimeout(()=>petJoin(Math.random()<0.5?'dog':'cat'),400);}
  log('Watch paid: '+r.scrap+' scrap'+(got.length?', '+got.join(', ')+' in your pack':'')+'.');toast('Watch paid: +'+r.scrap+' scrap'+(got.length?' +'+got.length+' items':''),'a');}
function renderWatch(){const el=$('#watch');if(!el)return;const w=watchState();const left=watchMax()-w.used;$('#watchSub').textContent=left+' of '+watchMax()+' left today';
  if(left<=0){el.innerHTML='<p class="help">Nothing left to guard today. Back tomorrow'+(S.base&&(S.base.rooms.tower||0)<2?' - a Watchtower at base adds a job per level':'')+'.</p>';return;}
  el.innerHTML=w.jobs.map((k,i)=>{const j=WATCH_JOBS[k];const dup=w.jobs.indexOf(k)!==i;return `<div class="gear"><div class="e">${j.e}</div><div><div class="n">${j.n}${dup?' <span class="chip s">another one</span>':''}</div><div class="d">${j.d} Pays ${j.reward.scrap}🔩 + ${j.reward.items} item${j.reward.items>1?'s':''}${j.reward.key?' · key chance':''}.</div></div><button class="btn sm r" onclick="takeWatch('${k}')">Go</button></div>`;}).join('')||'<p class="help">The jobs are done. More tomorrow.</p>';}
const STREAK_REWARDS=[{d:3,n:'a chest key',give:()=>{S.keys++;}},{d:7,n:"the Runner's headband + a key",give:()=>{S.keys++;takeItem({id:'hat:streakband',n:"Runner's headband",e:'🎽',pts:0,cat:'cosmetic',r:'epic',slot:'hat',key:'streakband'},null);}},{d:14,n:'250 league points + 2 keys',give:()=>{S.league.score+=250;S.keys+=2;}},{d:30,n:'a LEGENDARY',give:()=>{dropLegendQuiet();}}];
function dropLegendQuiet(){const id=pick(LEGEND_IDS);S.gear.push({uid:uid(),id,...GEAR[id]});toast('Legendary: '+GEAR[id].n,'l');SFX.play('legend');log('Found the legendary '+GEAR[id].n+'.');}
// Past day 30 the track used to simply stop, so the people walking every single
// day had nothing ahead of them. It repeats every 10 days now, and every 50 is
// a legendary, so a streak is always worth keeping.
const STREAK_LOOP=10;
function streakLoopReward(d){
  if(d<=30||d%STREAK_LOOP)return null;
  return (d%50===0)
    ? {d,n:'a LEGENDARY - '+d+' days straight',give:()=>{dropLegendQuiet();S.keys+=2;}}
    : {d,n:'2 keys and 150 season points',give:()=>{S.keys+=2;seasonAdd(150);}};
}
function streakReward(){S.streakBest=Math.max(S.streakBest||0,S.streak.days);
  const r=STREAK_REWARDS.find(x=>x.d===S.streak.days)||streakLoopReward(S.streak.days);
  if(!r)return;r.give();log('Streak '+r.d+': '+r.n+'.');toast('Streak '+r.d+' days: '+r.n,'l');SFX.play('legend');}
function nextStreakReward(){
  const d=S.streak.days;
  const fixed=STREAK_REWARDS.find(x=>x.d>d);
  if(fixed)return fixed;
  // The next multiple of 10 STRICTLY above both d and 30. Day 30 exactly used to
  // land back on itself and report nothing ahead.
  const n=Math.max(40,(Math.floor(d/STREAK_LOOP)+1)*STREAK_LOOP);
  return streakLoopReward(n);}
function rollDay(){
  const t=todayStr();if(S.steps.date===t)return;
  snapshot('start of the day');
  if(S.steps.date&&S.steps.today>=0){S.steps.hist=(S.steps.hist||[]).filter(x=>x.d!==S.steps.date);
    S.steps.hist.unshift({d:S.steps.date,n:S.steps.today});S.steps.hist=S.steps.hist.slice(0,30);}
  S.steps.date=t;S.steps.today=0;S.steps.src={phone:0,typed:0,walk:0};S.steps.lastSync=0;S.steps.lastSyncDate='';S.flags.roadCheck=0;
  S.hp=Math.min(maxHp(),S.hp+Math.max(25,Math.round(maxHp()*0.30))+sk('longhaul')*10+sk('earlyriser')*5+(S.base&&S.base.t==='house'?1:0)+setPerk('morningHp'));
  if(S.base){const br=S.base.rooms.barrel||0;if(br){const w=br+(wxKind()==='rain'||wxKind()==='storm'?3:0);S.stock.water+=w;log('The rain barrel gave '+w+' water.');}
    const g=S.base.rooms.garden||0;if(g){const per=3+(bg('farmer')?2:0)+sk('greenthumb');S.stock.food+=per*g;log('The garden gave '+(per*g)+' food.');}if(S.base.t==='diner'){S.stock.food+=2;}}
  loseHydro(20);if(hydroState()==='empty'){S.hp=Math.max(1,S.hp-5);log('You woke up dried out. Find water.');}
  for(const c of S.crew){if(c.hp!==undefined&&c.hp<crewMax(c)){c.hp=Math.min(crewMax(c),c.hp+18+(S.base&&S.base.rooms.clinic?18:0));}}
  const y=new Date();y.setDate(y.getDate()-1);const yd=todayStr(y);
  if(S.streak&&S.streak.days>0&&S.streak.last!==yd&&S.streak.last!==t){const lost=Math.min(15,Math.floor(S.stock.scrap*0.1));S.stock.scrap-=lost;log('You skipped a day. Streak of '+S.streak.days+' broken'+(lost?', and a walker got into the scrap pile: -'+lost+' scrap':'')+'.');S.streak.days=0;}
  S.today={date:t,kills:0,places:0};
  petFetch();
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
  try{closeWeek();}catch(e){}
}
/* ================= gifts ================= */
// Send first, remove locally only once the server says ok - the reverse order
// loses the item if the request fails.
function giftSheet(uidv){
  const g=(S.gear||[]).find(x=>x.uid===uidv);if(!g){toast('Gone from your pack');return;}
  const o=O();if(!o.ok){toast('Go online first (Settings)','d');return;}
  const mates=(friends||[]).filter(f=>f.handle&&f.handle!==o.handle&&!(S.hidden||[]).includes(f.handle));
  if(!mates.length){openSheet('<h2>Send a gift</h2><p>Nobody on the board yet but you. Once your friends are online they show up here.</p><button class="btn r wide" onclick="closeSheet()">Close</button>',true);return;}
  const stop=giftBlocked(g);
  if(stop){
    openSheet('<h2>Cannot send that</h2><p>'+esc(stop)+'</p>'
      +'<div class="kv" style="margin-top:8px"><span>Gift allowance today</span><b>'+giftLeft()+' of '+GIFT_BUDGET+'</b>'
      +'<span>This piece costs</span><b>'+giftCost(g)+'</b></div>'
      +'<p class="help" style="margin-top:8px">A common or uncommon piece costs 1, rare 2, epic 3, legendary 5. It resets at midnight.</p>'
      +'<button class="btn r wide" style="margin-top:10px" onclick="closeSheet()">Close</button>',true);
    return;
  }
  openSheet('<h2>Send '+esc(g.n)+'</h2>'
    +'<p class="help">It leaves your pack and lands in theirs the next time they open the game. You cannot take it back.</p>'
    +'<div class="kv" style="margin-top:6px"><span>This one costs</span><b>'+giftCost(g)+' of your gift allowance</b>'
    +'<span>Left today</span><b>'+giftLeft()+' of '+GIFT_BUDGET+'</b></div>'
    +'<input id="giftNote" maxlength="120" placeholder="say something (optional)" style="width:100%;margin:8px 0">'
    +mates.slice(0,10).map(f=>'<button class="btn wide" style="margin-top:6px" onclick="sendGift(\''+esc(uidv)+'\',\''+esc(f.handle)+'\')">'
      +esc(f.name||f.handle)+' <span class="help">@'+esc(f.handle)+'</span></button>').join('')
    +'<button class="btn ghost wide" style="margin-top:10px" onclick="closeSheet()">Not now</button>',true);
}
/* ================= GIFT LIMITS (v6.43) =================
   Her words: "we can't like gift our whole ass inventory." Without a cap, two
   accounts hand the same legendary back and forth and the loot economy stops
   meaning anything. The limit is per DAY and weighted by rarity, so ordinary
   kindness - passing a spare machete to a friend who is stuck - stays free,
   and shipping your vault does not. */
const GIFT_COST={common:1,uncommon:1,rare:2,epic:3,legendary:5};
const GIFT_BUDGET=6;
function giftDay(){const d=S.gifts||(S.gifts={date:'',spent:0});if(d.date!==S.steps.date){d.date=S.steps.date;d.spent=0;}return d;}
function giftCost(g){return GIFT_COST[g&&g.r||'common']||1;}
function giftLeft(){return Math.max(0,GIFT_BUDGET-giftDay().spent);}
function giftBlocked(g){
  const c=giftCost(g);
  // Her call: a legendary stays with whoever earned it. There are nine of them,
  // they only come from chests, bosses and the season track, and handing one over
  // skips all of that. Cosmetics were never giftable - the gift button only
  // exists on gear, and the gumball machine pays into S.cosmetics - so the
  // onesie and everything else unique was already safe.
  if((g&&g.r)==='legendary')
    return 'Legendaries stay with the person who earned them. Nine exist, and they only come from chests, bosses and the season track.';
  if(c>giftLeft())return 'That is '+c+' of your gift allowance and you have '+giftLeft()+' left today.';
  if((S.gear||[]).filter(x=>x.slot===g.slot&&!x.broken).length<=1&&g.slot==='melee')
    return 'That is your only weapon. Keep it.';
  return '';
}
async function sendGift(uidv,to){
  const o=O();const g=(S.gear||[]).find(x=>x.uid===uidv);if(!g||!o.ok)return;
  const stop=giftBlocked(g);
  if(stop){toast(stop,'d');return;}
  const note=($('#giftNote')&&$('#giftNote').value||'').slice(0,120);
  closeSheet();toast('Sending...');
  let r;
  try{r=await rpc('send_gift',{p_handle:o.handle,p_token:o.token,p_to:to,p_item:g,p_note:note});}
  catch(e){toast('Could not reach the server. Nothing was sent.','d');return;}
  if(r!=='ok'){
    toast(r==='nosuch'?'No player with that handle':r==='full'?'Their pack is full of gifts already':r==='self'?'That is you':'Could not send that','d');
    return;}
  // only now does it leave your pack
  S.gear=S.gear.filter(x=>x.uid!==uidv);
  for(const k in S.eq)if(S.eq[k]===uidv)S.eq[k]=null;
  giftDay().spent+=giftCost(g);
  log('Sent '+g.n+' to @'+to+'. '+giftLeft()+' of your gift allowance left today.');
  toast(g.n+' sent · '+giftLeft()+' allowance left','z');SFX.play('chest');save();render();pushPlayer();
}
async function takeGifts(){
  const o=O();if(!o.ok)return;
  let rows;try{rows=await rpc('take_gifts',{p_handle:o.handle,p_token:o.token});}catch(e){return;}
  if(!rows||!rows.length)return;
  const got=[];
  for(const row of rows){
    const it=row.item;if(!it||!it.id)continue;
    const g=Object.assign({},it,{uid:uid()});delete g.broken;
    S.gear.push(g);got.push({n:g.n||'something',from:row.from||'someone',note:row.note||'',r:g.r||'common'});
  }
  if(!got.length)return;
  save();render();SFX.play('legend');
  openSheet('<h2>'+(got.length===1?'A gift':got.length+' gifts')+'</h2>'
    +got.map(x=>'<div style="padding:9px 0;border-bottom:1px solid var(--line)">'
      +'<div><b class="rc-'+esc(x.r)+'">'+esc(x.n)+'</b> <span class="help">from '+esc(x.from)+'</span></div>'
      +(x.note?'<div class="help" style="font-style:italic">"'+esc(x.note)+'"</div>':'')+'</div>').join('')
    +'<button class="btn r wide" style="margin-top:12px" onclick="closeSheet()">Into the pack</button>',true);
}
/* ================= the nemesis ================= */
// Nadia already existed as a name on the leaderboard and a voice in the dark.
// This gives her a memory: she levels when she beats you, scars when you beat
// her, and she takes something on her way out.
const NEM_RANKS=['scout','lieutenant','right hand','second','equal','problem'];
function nem(){return S.nem||(S.nem={lvl:1,beaten:0,lost:0,scars:0,last:'',taunt:''});}
function nemName(){const n=nem();return "Nadia's "+(NEM_RANKS[Math.min(n.lvl-1,NEM_RANKS.length-1)]);}
function nemPower(){const n=nem();return 1+(n.lvl-1)*0.22;}
function nemWon(){ // she beat you
  const n=nem();n.lvl=Math.min(6,n.lvl+1);n.lost++;n.last=todayStr();
  const took=[];
  if(S.stock.scrap>0){const g=Math.min(S.stock.scrap,5+n.lvl*3);S.stock.scrap-=g;took.push(g+' scrap');}
  if((S.pack||[]).length){const i=rint(0,S.pack.length-1);took.push(S.pack[i].n);S.pack.splice(i,1);}
  n.taunt=took.length?('She took '+took.join(' and ')+'.'):'She let you keep what you had. Worse, somehow.';
  log(nemName()+' got the better of you. '+n.taunt+' She will be back, and harder.');
  toast('Nadia levels up','d');SFX.play('nemesis');save();
}
function nemBeaten(){ // you beat her
  const n=nem();n.beaten++;n.scars++;n.last=todayStr();
  const scrap=8+n.lvl*4;S.stock.scrap+=scrap;addXp(20+n.lvl*10);
  if(n.lvl>1&&Math.random()<0.5)n.lvl--;
  n.taunt='';
  log('You beat '+nemName()+'. +'+scrap+' scrap. She backs off - for now.');
  toast('Nemesis beaten · +'+scrap+' scrap','l');SFX.play('win');save();
}
function nemCard(){
  const n=nem();const el=$('#nemCard');if(!el)return;
  if(!n.beaten&&!n.lost){el.hidden=true;return;}
  el.hidden=false;
  el.innerHTML='<h2>Nadia <span class="sub">'+esc(NEM_RANKS[Math.min(n.lvl-1,5)])+'</span></h2>'
    +'<p class="help">You have beaten her <b>'+n.beaten+'</b> time'+(n.beaten===1?'':'s')+'. She has beaten you <b>'+n.lost+'</b>.'
    +(n.taunt?' <span style="color:#ff8a92">'+esc(n.taunt)+'</span>':'')+'</p>'
    +'<div class="progress" style="margin-top:8px"><div class="bar"><i style="width:'+(n.lvl/6*100)+'%;background:linear-gradient(90deg,#8a2230,#e2503f)"></i></div>'
    +'<div class="row"><span>her crew: '+esc(NEM_RANKS[Math.min(n.lvl-1,5)])+'</span><span>'+(n.lvl>=6?'as good as you':'level '+n.lvl+' of 6')+'</span></div></div>'
    +'<p class="help" style="margin-top:6px">Her scouts hit harder every time she wins. Beat them and she pulls back.</p>';
}
/* ================= today on the road ================= */
// A reason to walk on THIS day rather than steps in general. Deterministic from
// the date, so everyone in the group gets the same one and can talk about it.
const DAY_MODS=[
  {id:'scav', n:'Picked over',   d:'Everything is 25% richer out there today.', loot:1.25},
  {id:'thin', n:'Thin crowd',    d:'One fewer walker in every encounter.',      count:-1},
  {id:'swarm',n:'Bad day',       d:'One extra walker in every encounter, but loot is up 40%.', count:1, loot:1.4},
  {id:'quiet',n:'Quiet streets', d:'Searching makes far less noise today.',      noise:0.5},
  {id:'cool', n:'Cool front',    d:'Your water lasts twice as long.',            thirst:0.5},
  {id:'hunt', n:'Bounty day',    d:'Raiders are carrying double scrap.',         raider:2},
  {id:'far',  n:'Long roads',    d:'Places are further apart, and worth more.',  dist:1.25, loot:1.3},
  {id:'calm', n:'Nothing doing', d:'An ordinary day in Hollow County.'},
];
function dayMod(){return DAY_MODS[Math.abs(hash(todayStr()+'road'))%DAY_MODS.length];}
function modLoot(){return dayMod().loot||1;}
function modCount(){return dayMod().count||0;}

/* ================= the convoy ================= */
// The board ranks everyone against each other. This is the one thing they do
// together: a weekly step target for the whole group. No server work - the
// leaderboard already carries everyone's weekly steps.
function convoy(){
  const rows=(friends||[]).filter(f=>f.pub);
  const n=Math.max(1,rows.length);
  const total=rows.reduce((a,f)=>a+((f.pub&&f.pub.steps_week)||0),0);
  const goal=n*35000;                       // 5k a day each, a real but fair ask
  return {n,total,goal,done:total>=goal,pct:Math.min(100,Math.round(total/goal*100))};
}
function claimConvoy(){
  const c=convoy();const w=weekId();
  if(!c.done){toast('Not there yet - '+fmt(c.goal-c.total)+' steps to go','d');return;}
  if(S.convoyClaimed===w){toast('Already collected this week');return;}
  S.convoyClaimed=w;S.stock.scrap+=25;S.keys+=1;addXp(60);
  log('The convoy made it. Everyone walked '+fmt(c.total)+' steps together. +25 scrap, +1 key, +60 XP.');
  toast('Convoy made it · +25 scrap, +1 key','l');SFX.play('chest');save();render();
}
function renderConvoy(){
  const el=$('#convoyCard');if(!el)return;
  if(!O().ok||!(friends||[]).length){el.hidden=true;return;}
  const c=convoy();el.hidden=false;
  el.innerHTML='<h2>The convoy <span class="sub">'+c.n+' walking</span></h2>'
    +'<p class="help">Everyone on the board, one target, every week. You get there together or not at all.</p>'
    +'<div class="progress" style="margin-top:8px"><div class="bar"><i style="width:'+c.pct+'%;background:linear-gradient(90deg,var(--rot2),var(--rot))"></i></div>'
    +'<div class="row"><span><b>'+fmt(c.total)+'</b> / '+fmt(c.goal)+'</span><span>'+(c.done?'made it':fmt(c.goal-c.total)+' to go')+'</span></div></div>'
    +(c.done?(S.convoyClaimed===weekId()
        ?'<p class="help" style="color:var(--rot);margin-top:8px">You have collected your share this week.</p>'
        :'<button class="btn r wide" style="margin-top:8px" onclick="claimConvoy()">Collect your share</button>')
      :'');
}
/* ================= the week in review ================= */
// Everything here is a delta from marks taken at the start of the week, so no
// new counters have to be maintained anywhere in the game loop.
function wkMark(){return S.wkMark||(S.wkMark={kills:S.kills||0,lvl:S.lvl||1,places:S.walk.houses||0,legends:legendCount(),week:S.league.week});}
function legendCount(){return (S.gear||[]).filter(g=>g.r==='legendary').length;}
function bestDayThisWeek(){
  const h=(S.steps&&S.steps.hist)||[];const days=[{d:S.steps.date,n:S.steps.today||0}].concat(h.slice(0,6));
  return days.reduce((b,x)=>(x&&x.n>(b?b.n:-1))?x:b,null);
}
function buildRecap(){
  const m=wkMark();const best=bestDayThisWeek();const hist=S.league.history[0];
  return {week:m.week||S.league.week,
    steps:(S.steps.weekId===weekId()?S.steps.week:S.steps.week)||0,
    best:best?{d:best.d,n:best.n}:null,
    kills:Math.max(0,(S.kills||0)-m.kills), places:Math.max(0,(S.walk.houses||0)-m.places),
    lvl:Math.max(0,(S.lvl||1)-m.lvl), lvlNow:S.lvl||1,
    legends:Math.max(0,legendCount()-m.legends),
    rank:hist?hist.rank:null, tier:hist?hist.tier:S.league.tier, delta:hist?hist.delta:0,
    streak:S.streak.days||0};
}
function recapCheck(){
  if(!S.recapDue)return;
  if($('#modal').classList.contains('on')){setTimeout(recapCheck,1500);return;}
  const r=(S.weeks||[]).find(x=>x.week===S.recapDue);S.recapDue='';save();
  if(r)recapSheet(r);
}
function recapSheet(r){SFX.play('week');
  if(!r)r=(S.weeks&&S.weeks[0])||null;
  if(!r){toast('Your first recap arrives at the end of this week');return;}
  const row=(label,val,sub)=>'<div class="kv" style="grid-template-columns:1fr auto"><span>'+label+'</span><b>'+val+'</b></div>'+(sub?'<div class="help" style="margin:-4px 0 6px">'+sub+'</div>':'');
  const medal=r.delta>0?'You went up a tier.':r.delta<0?'You dropped a tier.':'';
  openSheet('<h2>Your week</h2>'
    +'<div class="big" style="font-family:\'Bebas Neue\';font-size:46px;color:var(--rot);line-height:1">'+fmt(r.steps)+'</div>'
    +'<p class="help" style="margin-top:-4px">steps walked'+(r.best?' · best day '+fmt(r.best.n):'')+'</p>'
    +'<div style="margin-top:12px">'
    +row('Walkers put down',fmt(r.kills))
    +row('Places cleared',fmt(r.places))
    +(r.lvl?row('Levels gained','+'+r.lvl,'You are level '+r.lvlNow+' now.'):'')
    +(r.legends?row('Legendary finds',fmt(r.legends)):'')
    +(r.rank?row('League finish','#'+r.rank,medal):'')
    +(r.streak?row('Day streak',fmt(r.streak)):'')
    +'</div>'
    +'<button class="btn r wide" style="margin-top:12px" onclick="closeSheet()">Next week, then</button>',true);
}
function closeWeek(){
  const r=buildRecap();
  S.weeks=[r].concat(S.weeks||[]).slice(0,12);
  S.wkMark={kills:S.kills||0,lvl:S.lvl||1,places:S.walk.houses||0,legends:legendCount(),week:weekId()};
  S.recapDue=r.week;
}

/* ================= the gumball machines ================= */
// Steps are the only currency: S.wallet is lifetime steps you have not spent.
// Two machines, separate pity counters. Odds are printed in the game because a
// gacha that hides its rates is a gacha you should not trust.
const GACHA={
  cloth:{n:'Fits Machine', cost:4000, kind:'cloth'},
  weapon:{n:'Arms Machine', cost:6000, kind:'weapon'},
};
const GACHA_ODDS=[['common',55],['rare',30],['epic',12],['legendary',3]];
const GACHA_PITY=10;                        // every 10th crank is epic or better
function gState(k){if(!S.gacha)S.gacha={};if(!S.gacha[k])S.gacha[k]={rolls:0,pity:0};return S.gacha[k];}
function gRarity(k){
  const g=gState(k);
  if(g.pity>=GACHA_PITY-1)return Math.random()<0.22?'legendary':'epic';
  let r=Math.random()*100;
  for(const [rar,w] of GACHA_ODDS){if(r<w)return rar;r-=w;}
  return 'common';
}
function gPool(kind,rar){
  if(kind==='weapon')
    return Object.entries(GEAR).filter(([k,v])=>(v.r||'common')===rar).map(([k,v])=>({id:k,...v}));
  const owned=S.cosmetics||[];
  return cosmeticPool().filter(c=>(c.r||'common')===rar&&!owned.includes(c.id));
}
// The published odds have to be the REAL odds. There are no common cosmetics,
// so the clothes machine printed "55% common" while gPull quietly rolled that
// 55% into rare - and as she collects, whole tiers empty out and shift again.
// This folds every empty tier into the nearest tier that still has something,
// using the same order gPull's fallback walks.
function gOdds(kind){
  const order=['common','rare','epic','legendary'];
  const out={};for(const r of order)out[r]=0;
  for(const [rar,w] of GACHA_ODDS){
    let land=rar;
    if(!gPool(kind,rar).length){
      const from=order.indexOf(rar);
      const tries=order.map((r,i)=>({r,d:Math.abs(i-from)})).filter(x=>x.r!==rar)
        .sort((a,b)=>a.d-b.d||order.indexOf(a.r)-order.indexOf(b.r));
      land=(tries.find(t=>gPool(kind,t.r).length)||{}).r;
    }
    if(land)out[land]+=w;
  }
  return order.slice().reverse().filter(r=>out[r]>0).map(r=>[r,out[r]]);
}
function gPull(k){
  const m=GACHA[k];const g=gState(k);
  if((S.wallet||0)<m.cost){toast('Need '+fmt(m.cost-(S.wallet||0))+' more steps','d');return;}
  S.wallet-=m.cost;g.rolls++;g.pity++;
  let rar=gRarity(k);
  let pool=gPool(m.kind,rar);
  // If that tier is empty, try every OTHER tier - nearest first. The first cut
  // only walked downward, and there are no common cosmetics in the game, so
  // 55% of clothing cranks found nothing and silently refunded.
  if(!pool.length){
    const order=['common','rare','epic','legendary'];
    const from=order.indexOf(rar);
    const tries=order.map((r,i)=>({r,d:Math.abs(i-from)})).filter(x=>x.r!==rar)
      .sort((a,b)=>a.d-b.d||order.indexOf(a.r)-order.indexOf(b.r));
    for(const t of tries){const pl=gPool(m.kind,t.r);if(pl.length){rar=t.r;pool=pl;break;}}
  }
  if(!pool.length){S.wallet+=m.cost;g.rolls--;g.pity--;toast('You already own everything in this machine','a');save();render();return;}
  if(RAR[rar].w>=3)g.pity=0;                 // epic or better resets the counter
  const it=pool[Math.floor(Math.random()*pool.length)];
  let line='';
  if(m.kind==='weapon'){
    S.gear.push({uid:uid(),id:it.id,...GEAR[it.id]});
    line=it.n;
  }else{
    S.cosmetics.push(it.id);
    const slot=it.slot;S.av[slot]=it.key;     // put it on immediately, it is the fun part
    line=it.n;
  }
  S.stock.scrap+=rar==='common'?2:0;          // a common still gives you something
  log('Gumball machine: '+line+' ('+rar+').');
  SFX.play(rar==='legendary'?'legend':rar==='epic'?'rare':'chest');
  gachaSheet(k,{n:line,r:rar,slot:it.slot,key:it.key,id:it.id});
  save();render();pushPlayer();
}
// You cannot decide whether a machine is worth 6,000 steps without knowing what
// is in it. This lists the whole pool, by rarity, with what you already own
// ticked off and what is still catchable counted.
function poolSheet(k){
  const m=GACHA[k];const RARORDER=['legendary','epic','rare','common'];
  const owned=S.cosmetics||[];
  const rows=RARORDER.map(rar=>{
    let items,left;
    if(m.kind==='weapon'){
      items=Object.entries(GEAR).filter(([id,v])=>(v.r||'common')===rar).map(([id,v])=>({id,n:v.n,e:v.e,have:(S.gear||[]).some(g=>g.id===id),
        sub:v.slot==='melee'?(v.dmg?v.dmg[0]+'-'+v.dmg[1]+' dmg':''):v.slot==='ranged'?(v.dmg?v.dmg[0]+'-'+v.dmg[1]+' dmg':''):v.dr?('-'+v.dr+' damage taken'):v.cap?('+'+v.cap+' carry'):''}));
      left=items.length;                                  // weapons can repeat
    }else{
      // A generic shirt emoji does not tell you what a ball gown looks like,
      // and that was the whole complaint. Draw each one on her own avatar.
      items=cosmeticPool().filter(c=>(c.r||'common')===rar).map(c=>({id:c.id,n:c.n,
        e:ART.avatarSVG(Object.assign({},S.av,{[c.slot]:c.key}),40),have:owned.includes(c.id),sub:c.slot==='hat'?'head':c.slot==='acc'?'face':'outfit'}));
      left=items.filter(x=>!x.have).length;
    }
    if(!items.length)return '';
    const pct=(gOdds(m.kind).find(o=>o[0]===rar)||[0,0])[1];
    return '<div class="section-label" style="margin-top:12px;display:flex;justify-content:space-between">'
      +'<span class="rc-'+rar+'">'+rar.toUpperCase()+' · '+pct+'%</span>'
      +'<span class="help">'+(m.kind==='weapon'?items.length+' in the machine':left+' of '+items.length+' still to find')+'</span></div>'
      +'<div style="display:flex;flex-direction:column;gap:2px">'
      +items.sort((a,b)=>(a.have-b.have)||a.n.localeCompare(b.n)).map(it=>
        '<div style="display:flex;align-items:center;gap:8px;padding:5px 8px;border-radius:7px;background:'+(it.have?'rgba(255,255,255,.03)':'rgba(255,255,255,.06)')+';'+(it.have&&m.kind!=='weapon'?'opacity:.5':'')+'">'
        +'<span style="font-size:15px;display:flex;align-items:center">'+it.e+'</span>'
        +'<span style="flex:1;min-width:0"><b class="rc-'+rar+'" style="font-size:14px">'+esc(it.n)+'</b>'
        +(it.sub?' <span class="help">'+esc(it.sub)+'</span>':'')+'</span>'
        +(it.have?'<span class="help" style="color:var(--rot)">'+(m.kind==='weapon'?'owned':'✓ got it')+'</span>':'')
        +'</div>').join('')+'</div>';
  }).join('');
  const hero=m.kind==='cloth'&&!owned.includes('top:onesie_axolotl');
  openSheet('<h2>What is in the '+esc(m.n)+'</h2>'
    +'<p class="help">'+fmt(m.cost)+' steps a crank'+(gOdds(m.kind).length?' · '+gOdds(m.kind).map(([r,w])=>w+'% '+r).join(' · '):'')+' · every '+GACHA_PITY+'th is epic or better'
      +(m.kind==='cloth'?' · clothes you own never come up again':' · weapons can repeat')+'</p>'
    +(hero?'<div style="margin:10px 0;padding:10px 12px;border-radius:10px;background:rgba(245,200,66,.12);border-left:4px solid var(--amber)">'
        +'<b style="color:var(--amber)">The one everyone wants</b>'
        +'<div style="display:flex;align-items:center;gap:10px;margin-top:6px">'+ART.avatarSVG(Object.assign({},S.av,{top:'onesie_axolotl'}),66)
        +'<span><b class="rc-legendary">Axolotl onesie</b><div class="help">Pink, frilly, 3% a crank.</div></span></div></div>':'')
    +rows
    +'<div class="grid2" style="margin-top:12px"><button class="btn ghost" onclick="gachaSheet(\''+k+'\')">Back</button>'
    +'<button class="btn r" onclick="gPull(\''+k+'\')"'+((S.wallet||0)<m.cost?' disabled':'')+'>Crank · '+fmt(m.cost)+'</button></div>',true);
}
function gachaSheet(k,got){
  const m=GACHA[k];const g=gState(k);
  const col={common:'#b9b2a4',rare:'#5eadff',epic:'#be78ff',legendary:'#f5c842'}[got?got.r:'common'];
  const left=GACHA_PITY-(g.pity%GACHA_PITY);
  openSheet('<h2>'+esc(m.n)+'</h2>'
    +(got?'<div class="gpull" style="text-align:center;margin:6px 0">'
        +(m.kind==='cloth'?ART.avatarSVG(S.av,120):'<div style="font-size:52px">'+esc(GEAR[got.id]?GEAR[got.id].e:'🔩')+'</div>')
        +'<div style="font-family:\'Bebas Neue\';font-size:26px;color:'+col+';letter-spacing:.04em">'+esc(got.n)+'</div>'
        +'<div class="help rc-'+esc(got.r)+'">'+esc(got.r)+'</div></div>'
      :'<div style="text-align:center">'+ART.gachaSVG(m.kind,110)+'</div>')
    +'<div class="kv" style="margin-top:8px"><span>Your steps</span><b>'+fmt(S.wallet||0)+'</b>'
      +'<span>A crank</span><b>'+fmt(m.cost)+'</b>'
      +'<span>Cranks so far</span><b>'+g.rolls+'</b>'
      +'<span>Guaranteed epic in</span><b>'+left+'</b></div>'
    +'<div class="grid2" style="margin-top:10px">'
      +'<button class="btn ghost" onclick="poolSheet(\''+k+'\')">ⓘ Prize list</button>'
      +'<button class="btn r" onclick="gPull(\''+k+'\')"'+((S.wallet||0)<m.cost?' disabled':'')+'>Crank again · '+fmt(m.cost)+'</button></div>'
    +'<button class="btn ghost wide" style="margin-top:8px" onclick="closeSheet()">Done</button>'
    +(gOdds(m.kind).length?'<p class="help" style="margin-top:10px">Odds per crank: '+gOdds(m.kind).map(([r,w])=>w+'% '+r).join(' · ')
      +'. Every '+GACHA_PITY+'th crank is epic or better.'+(m.kind==='cloth'?' Clothes you already own never come up, so these shift as you collect.':'')+'</p>'
      :'<p class="help" style="margin-top:10px">You own everything in this machine. Cranking it would just hand your steps back.</p>'),true);
}
function renderGacha(){if(offscreen('#gachaBody'))return;
  const el=$('#gachaBody');if(!el)return;
  el.innerHTML='<p class="help">Your unspent steps go in the slot. Nothing here can be bought with money, only with walking.</p>'
    +'<div class="row" style="gap:10px;margin-top:10px;align-items:stretch">'
    +Object.entries(GACHA).map(([k,m])=>{const g=gState(k);const can=(S.wallet||0)>=m.cost;
      return '<div class="gmachine">'+ART.gachaSVG(m.kind,86)
        +'<h3>'+esc(m.n)+'</h3>'
        +'<div class="help">'+(m.kind==='cloth'?'clothes and looks':'weapons and gear')+'</div>'
        +'<button class="btn sm '+(can?'r':'')+'" style="margin-top:8px;width:100%" onclick="gachaSheet(\''+k+'\')"'+(can?'':' disabled')+'>'+fmt(m.cost)+' steps</button>'
        +'<button class="btn sm ghost" style="margin-top:6px;width:100%" onclick="poolSheet(\''+k+'\')">ⓘ What can I get?</button>'
        +'<div class="help" style="margin-top:4px">'+g.rolls+' cranked</div></div>';}).join('')
    +'</div>'
    +'<p class="help" style="margin-top:10px">Steps banked: <b style="color:var(--bone)">'+fmt(S.wallet||0)+'</b></p>';
}
/* ================= trophy sets ================= */
// Six sets of four. Trophies are deliberately rare now, so a completed set is a
// long grind - and each one pays a SMALL permanent perk. Small on purpose: this
// is a third progression system next to levels and gear, and it must not become
// the one that matters most.
const TROPHY_SETS=[
  {id:'home', n:'Home Comforts', e:'🏠', items:['teddy','globe','vinyl','polaroid'],
   perk:'+2 HP every morning', apply:{morningHp:2}},
  {id:'law',  n:'The Law',       e:'⭐', items:['badge','dogtag','wanted','handcuffs'],
   perk:'+8% damage to raiders and gunners', apply:{vsHuman:0.08}},
  {id:'rec',  n:'The Rec Room',  e:'🕹️', items:['comic','cards','dice','cart'],
   perk:'+6% XP from everything', apply:{xp:0.06}},
  {id:'care', n:'The Clinic',    e:'🩺', items:['steth','xray','pills','thermo'],
   perk:'Medkits heal 8 more', apply:{med:8}},
  {id:'road', n:'The Road',      e:'🗺️', items:['plate','sign','atlas','cruiser'],
   perk:'Places are 4% closer together', apply:{dist:0.04}},
  {id:'odd',  n:'Oddities',      e:'☄️', items:['skull','jar','meteor','globe'],
   perk:'+8% chance at rare loot', apply:{rare:0.08}},
];
function trophyCount(id){return (S.shelf||[]).filter(x=>x.id===id).length;}
function setDone(set){return set.items.every(i=>trophyCount(i)>0);}
function setsDone(){return TROPHY_SETS.filter(setDone);}
function setPerk(key){return setsDone().reduce((a,s)=>a+((s.apply&&s.apply[key])||0),0);}
// Announce a set the moment it completes, once.
function checkSets(){
  if(!S.setsSeen)S.setsSeen=[];
  for(const st of TROPHY_SETS){
    if(S.setsSeen.includes(st.id))continue;
    if(!setDone(st))continue;
    S.setsSeen.push(st.id);
    log('Set complete: '+st.n+'. '+st.perk+'.');
    toast(st.e+' '+st.n+' complete · '+st.perk,'l');SFX.play('legend');save();
  }
}
function trophySheet(){
  const all=Object.entries(ITEMS).filter(([k,v])=>v.cat==='shelf');
  const inSet={};TROPHY_SETS.forEach(st=>st.items.forEach(i=>{inSet[i]=inSet[i]||[];inSet[i].push(st.e);}));
  const found=(S.shelf||[]).length, kinds=all.filter(([k])=>trophyCount(k)>0).length;
  const card=st=>{
    const have=st.items.filter(i=>trophyCount(i)>0).length;const done=have===st.items.length;
    return '<div style="margin:10px 0;padding:10px 12px;border-radius:10px;background:'+(done?'rgba(127,191,77,.12)':'rgba(255,255,255,.04)')
      +';border-left:4px solid '+(done?'var(--rot)':'var(--line)')+'">'
      +'<div style="font-weight:800;color:var(--bone)">'+st.e+' '+esc(st.n)+' <span class="help">'+have+'/'+st.items.length+'</span></div>'
      +'<div class="help" style="margin:2px 0 6px;color:'+(done?'var(--rot)':'var(--muted)')+'">'+(done?'✓ ':'')+esc(st.perk)+'</div>'
      +'<div style="display:flex;gap:6px;flex-wrap:wrap">'+st.items.map(i=>{
          const it=ITEMS[i];const n=trophyCount(i);
          return '<div title="'+esc(it?it.n:i)+'" style="width:40px;height:40px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:20px;'
            +'background:'+(n?'rgba(255,255,255,.07)':'rgba(0,0,0,.25)')+';border:1px solid var(--line);'+(n?'':'filter:grayscale(1);opacity:.32')+'">'
            +(n?it.e:'❔')+(n>1?'<b style="font-size:9px;position:relative;top:8px;left:-6px;color:var(--amber)">'+n+'</b>':'')+'</div>';}).join('')
      +'</div></div>';};
  const loose=all.filter(([k])=>!inSet[k]);
  openSheet('<h2>Trophy room</h2>'
    +'<p class="help">'+kinds+' of '+all.length+' kinds found · '+found+' on the shelf · '+setsDone().length+' of '+TROPHY_SETS.length+' sets complete</p>'
    +TROPHY_SETS.map(card).join('')
    +(loose.length?'<div class="section-label" style="margin-top:12px">Not in a set</div><div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px">'
      +loose.map(([k,it])=>{const n=trophyCount(k);return '<div title="'+esc(it.n)+'" style="width:40px;height:40px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:20px;background:'+(n?'rgba(255,255,255,.07)':'rgba(0,0,0,.25)')+';border:1px solid var(--line);'+(n?'':'filter:grayscale(1);opacity:.32')+'">'+(n?it.e:'❔')+'</div>';}).join('')+'</div>':'')
    +'<p class="help" style="margin-top:12px">Trophies are rare on purpose. A cat brings them back more often than you find them.</p>'
    +'<button class="btn r wide" style="margin-top:10px" onclick="closeSheet()">Close</button>',true);
}
/* ================= the wall ================= */
// Motivation, not currency: nothing here gives a reward, it just remembers.
const ACHV=[
  {id:'first',   n:'First Steps',      d:'Walk 1,000 steps',            f:S=>S.steps.total>=1000},
  {id:'k10',     n:'Getting the Hang', d:'Put down 10 walkers',         f:S=>S.kills>=10},
  {id:'k100',    n:'Practised',        d:'Put down 100 walkers',        f:S=>S.kills>=100},
  {id:'k500',    n:'County Legend',    d:'Put down 500 walkers',        f:S=>S.kills>=500},
  {id:'s25k',    n:'Long Hauler',      d:'25,000 lifetime steps',       f:S=>S.steps.total>=25000},
  {id:'s100k',   n:'Six Figures',      d:'100,000 lifetime steps',      f:S=>S.steps.total>=100000},
  {id:'s250k',   n:'Quarter Million',  d:'250,000 lifetime steps',      f:S=>S.steps.total>=250000},
  {id:'day10k',  n:'Ten Thousand',     d:'10,000 steps in one day',     f:S=>(S.steps.today||0)>=10000||((S.steps.hist||[]).some(h=>h.n>=10000))},
  {id:'st7',     n:'A Full Week',      d:'7 day streak',                f:S=>(S.streakBest||S.streak.days||0)>=7},
  {id:'st30',    n:'A Full Month',     d:'30 day streak',               f:S=>(S.streakBest||S.streak.days||0)>=30},
  {id:'lvl10',   n:'Seasoned',         d:'Reach level 10',              f:S=>S.lvl>=10},
  {id:'lvl25',   n:'Hardened',         d:'Reach level 25',              f:S=>S.lvl>=25},
  {id:'base',    n:'Somewhere Safe',   d:'Claim a base',                f:S=>!!S.base},
  {id:'built',   n:'Handy',            d:'Build 5 rooms',               f:S=>S.base?Object.values(S.base.rooms||{}).reduce((a,b)=>a+b,0)>=5:false},
  {id:'legend',  n:'One of a Kind',    d:'Find a legendary',            f:S=>(S.gear||[]).some(g=>g.r==='legendary')},
  {id:'shelf10', n:'Collector',        d:'10 trophies on the shelf',    f:S=>(S.shelf||[]).length>=10},
  {id:'pet',     n:'Not Alone',        d:'Take in a companion',         f:S=>!!S.pet},
  {id:'pets3',   n:'Full House',       d:'Three companions',            f:S=>(S.pets||[]).length>=3},
  {id:'crew',    n:'A Crew',           d:'Three survivors with you',    f:S=>(S.crew||[]).length>=3},
  {id:'boss',    n:'Warden Down',      d:'Kill a county boss',          f:S=>(S.bossKills||0)>=1},
  {id:'horde',   n:'Held the Line',    d:'Survive a horde night',       f:S=>(S.hordeWins||0)>=1},
  {id:'week',    n:'A Week in the Dead',d:'Finish a full week',         f:S=>(S.weeks||[]).length>=1},
  {id:'tier',    n:'Moving Up',        d:'Climb a league tier',         f:S=>(S.league.history||[]).some(h=>h.delta>0)},
  {id:'nem',     n:'Settled It',       d:'Beat your nemesis',           f:S=>(S.nem&&S.nem.beaten)>=1},
];
function checkAchv(){
  if(!S.achv)S.achv={};let fresh=[];
  for(const a of ACHV){ if(S.achv[a.id])continue;
    let ok=false;try{ok=!!a.f(S);}catch(e){ok=false;}
    if(ok){S.achv[a.id]=todayStr();fresh.push(a);} }
  if(fresh.length){
    for(const a of fresh)log('Milestone: '+a.n+' - '+a.d+'.');
    toast(fresh.length===1?'Unlocked: '+fresh[0].n:fresh.length+' milestones unlocked','l');
    SFX.play('unlock');save();
  }
  return fresh;
}
function achvSheet(){
  if(!S.achv)S.achv={};
  const got=ACHV.filter(a=>S.achv[a.id]).length;
  const row=a=>{const on=!!S.achv[a.id];
    return '<div style="display:flex;gap:10px;align-items:center;padding:9px 0;border-bottom:1px solid var(--line);opacity:'+(on?1:.55)+'">'
      +'<div style="width:26px;text-align:center;font-size:18px">'+(on?'🏅':'🔒')+'</div>'
      +'<div style="flex:1"><div style="font-weight:700;color:'+(on?'var(--bone)':'var(--bone2)')+'">'+esc(a.n)+'</div>'
      +'<div class="help">'+esc(a.d)+(on?' · '+esc(S.achv[a.id]):'')+'</div></div></div>';};
  openSheet('<h2>The wall</h2>'
    +'<p class="help">'+got+' of '+ACHV.length+' · things you have actually done out there.</p>'
    +'<div class="progress" style="margin:8px 0 12px"><div class="bar"><i style="width:'+Math.round(got/ACHV.length*100)+'%;background:linear-gradient(90deg,var(--rot2),var(--rot))"></i></div></div>'
    +ACHV.map(row).join('')
    +'<button class="btn r wide" style="margin-top:12px" onclick="closeSheet()">Close</button>',true);
}
/* ================= DAILY CHECK-IN + TODAY'S STEP LADDER (v6.30) =================
   Three reward systems already existed and all three are LONG: lifetime step
   milestones, streak days, and the daily/weekly contracts. None of them pays
   you for opening the game, and none of them pays you DURING a walk. These two
   do, and they are deliberately small - they are the drip, not the meal.

   The check-in cycle does NOT reset when she misses a day. Her streak already
   punishes a missed day, and she works six days a week; a login gift that
   resets is a punishment for having a job. It just advances on each day she
   opens the game, and loops after the seventh. */
const CHECKIN=[
  {n:'5 scrap',           give:s=>{s.stock.scrap+=5;}},
  {n:'2 food and 2 water',give:s=>{s.stock.food+=2;s.stock.water+=2;}},
  {n:'a chest key',       give:s=>{s.keys++;}},
  {n:'12 scrap and 25 XP',give:s=>{s.stock.scrap+=12;addXp(25);}},
  {n:'2 meds',            give:s=>{s.stock.meds+=2;}},
  {n:'4 rounds of ammo',  give:s=>{s.stock.ammo+=4;}},
  {n:'a chest key and 20 scrap - day seven',give:s=>{s.keys++;s.stock.scrap+=20;addXp(50);}},
];
function checkinDay(){const c=S.checkin||(S.checkin={date:'',n:0});return c;}
function checkinReady(){rollDay();return checkinDay().date!==S.steps.date;}
function checkinNext(){return CHECKIN[checkinDay().n%CHECKIN.length];}
function claimCheckin(){
  if(!checkinReady()){toast('Already collected today');return;}
  const c=checkinDay();const gift=CHECKIN[c.n%CHECKIN.length];
  gift.give(S);c.n++;c.date=S.steps.date;
  log('Daily check-in: '+gift.n+'.');
  toast('Checked in: '+gift.n,(c.n%CHECKIN.length===0)?'l':'a');
  SFX.play((c.n%CHECKIN.length===0)?'legend':'chest');
  save();render();pushPlayer();
}

// Today's steps, paid out as you walk. Resets every night with the step count.
// 10,000 is the one she asked for by name: a weapon, not a pile of scrap.
const LADDER=[
  {s:2500, n:'5 scrap',          give:s=>{s.stock.scrap+=5;addXp(10);}},
  {s:5000, n:'2 food, 2 water',  give:s=>{s.stock.food+=2;s.stock.water+=2;addXp(15);}},
  {s:7500, n:'a chest key',      give:s=>{s.keys++;}},
  {s:10000,n:'a weapon',         weapon:true},
  {s:15000,n:'15 scrap, 40 XP',  give:s=>{s.stock.scrap+=15;addXp(40);}},
  {s:20000,n:'2 chest keys',     give:s=>{s.keys+=2;}},
  // The ladder used to end here, so the friends walking 25-30k a day got nothing
  // for the last third of their day. It keeps paying, but the rungs get further
  // apart and the rewards stay modest - a long walk should be worth something,
  // not worth more than playing.
  {s:25000,n:'25 scrap, 60 XP',  give:s=>{s.stock.scrap+=25;addXp(60);}},
  {s:30000,n:'a chest key + 60 season points', give:s=>{s.keys++;seasonAdd(60);}},
  {s:40000,n:'2 keys + 100 scrap', give:s=>{s.keys+=2;s.stock.scrap+=100;}},
];
// "Low tier" means what she said: the starter shelf, not a rare drop. Anything
// better still has to come off the road.
const LADDER_GUNS=['pipe','bat','crowbar','jacket','helmet','pads','pack2'];
function ladderDay(){const l=S.ladder||(S.ladder={date:'',hit:[]});if(l.date!==S.steps.date){l.date=S.steps.date;l.hit=[];}return l;}
function ladderNext(){const l=ladderDay();return LADDER.find(x=>!l.hit.includes(x.s));}
function checkLadder(){
  const l=ladderDay();const today=S.steps.today||0;
  for(const step of LADDER){
    if(l.hit.includes(step.s)||today<step.s)continue;
    l.hit.push(step.s);
    if(step.weapon){
      const id=LADDER_GUNS[Math.floor(Math.random()*LADDER_GUNS.length)];
      S.gear.push({uid:uid(),id,...GEAR[id]});
      log(fmt(step.s)+' steps today: '+GEAR[id].n+'. It is in your gear.');
      toast(fmt(step.s)+' steps: '+GEAR[id].n,'l');SFX.play('legend');
    }else{
      step.give(S);
      log(fmt(step.s)+' steps today: '+step.n+'.');
      toast(fmt(step.s)+' steps: '+step.n,'a');SFX.play('chest');
    }
  }
}
function renderCheckin(){
  const el=$('#checkinCard');if(!el)return;
  if(!checkinReady()){el.hidden=true;return;}
  const c=checkinDay();const g=checkinNext();const day=(c.n%CHECKIN.length)+1;
  el.hidden=false;
  el.innerHTML='<h2>Daily check-in <span class="sub">day '+day+' of '+CHECKIN.length+'</span></h2>'
    +'<p class="help">You opened the game. That is the whole requirement.</p>'
    +'<div class="row" style="gap:5px;margin:10px 0">'
    +CHECKIN.map((x,i)=>'<span class="chip'+(i<day-1?' z':i===day-1?' a':'')+'" style="flex:1;text-align:center;padding:6px 2px'+(i>day-1?';opacity:.45':'')+'">'+(i<day-1?'✓':i+1)+'</span>').join('')
    +'</div>'
    +'<button class="btn r wide" onclick="claimCheckin()">Collect '+esc(g.n)+'</button>';
}
function renderLadder(){
  const el=$('#ladderBox');if(!el)return;
  const l=ladderDay();const today=S.steps.today||0;const next=ladderNext();
  el.innerHTML='<div class="section-label">Today\'s rewards</div>'
    +'<div class="stack" style="margin-top:6px">'
    +LADDER.map(x=>{const got=l.hit.includes(x.s);const pct=Math.min(100,today/x.s*100);
      return '<div class="contract'+(got?' done':'')+'"><div><b>'+fmt(x.s)+' steps</b>'
        +'<span>'+(got?'Collected. ':'')+esc(x.n)+'</span>'
        +'<div class="bar"><i style="width:'+pct+'%"></i></div></div>'
        +'<div class="num" style="font-size:18px;color:'+(got?'var(--rot)':'var(--bone2)')+'">'+(got?'✓'
          :fmt(Math.max(0,x.s-today))+'<span class="help" style="display:block;font-size:10px;font-weight:400">to go</span>')+'</div></div>';}).join('')
    +'</div>'
    +'<p class="help" style="margin-top:6px">'+(next?fmt(Math.max(0,next.s-today))+' more steps for '+esc(next.n)+'.':'Every reward collected today. Come back tomorrow.')+' Resets at midnight with your step count.</p>';
}
// liveRaidAfter ALWAYS clears S.raidCur, win or lose. So a raidCur still sitting
// there when the game boots is a raid that started and never finished - the app
// was closed, or its screen never drew. She paid a flare for that. Give it back.
function recoverStuckRaid(){
  const cur=S&&S.raidCur;if(!cur)return;
  S.raidCur=null;S.combat=false;
  if(cur.remote&&S.flares&&S.flares.used>0){
    S.flares.used--;
    setTimeout(()=>{if(S.onboarded){log('A raid you joined never finished. Your flare is back.');toast('Flare refunded','a');}},600);
  }
}
function checkMilestones(){
  const top=unlockedDistrict();
  for(let i=1;i<=top;i++){
    if(S.milestones.includes(i))continue;
    const d=districtAt(i);
    if(S.steps.total<d.steps)continue;
    S.milestones.push(i);S.sp++;S.keys++;
    log('Milestone: '+fmt(d.steps)+' lifetime steps. '+d.n+' is open. +1 skill point, +1 key.');
    toast(d.n+' unlocked · +1 skill point','l');SFX.play('legend');
  }
  // a rank every 500,000 steps, forever
  const r=vetRank();
  if(r>(S.vet||0)){S.vet=r;S.sp++;S.keys+=2;
    log('You are a '+vetTitle()+' now. '+fmt(r*VET_STEP)+' lifetime steps. +1 skill point, +2 keys.');
    toast(vetTitle()+' · '+fmt(r*VET_STEP)+' steps','l');SFX.play('legend');}
}
function addSteps(n,src){
  n=Math.floor(n);if(!(n>0))return;rollDay();rollWeek();S.lastAnim=Date.now();
  // The in-app pedometer walks the same legs the phone counts, so it raises
  // COUNTED. Demo steps are invented, so they raise MANUAL. Either way the
  // counted+manual===today invariant survives.
  if(src==='live'){const r=syncReads();r.counted=(r.counted||0)+n;}
  if(src==='demo'){const r=syncReads();r.manual=(r.manual||0)+n;}
  if(src!=='carry'&&infect()){S.infectStep=(S.infectStep||0)+n;
    while(S.infectStep>=INFECT_PER_STEPS){S.infectStep-=INFECT_PER_STEPS;S.hp=Math.max(1,S.hp-1-infectStage());}}
  if(src!=='carry'){S.hydroStep=(S.hydroStep||0)+n;while(S.hydroStep>=HYDRO_STEPS){S.hydroStep-=HYDRO_STEPS;loseHydro(Math.max(3,Math.round(6*thirstMult())));}S.steps.total+=n;S.steps.today+=n;if(S.steps.weekId!==weekId()){S.steps.weekId=weekId();S.steps.week=0;}S.steps.week=(S.steps.week||0)+n;if(!S.steps.src)S.steps.src={phone:0,typed:0,walk:0};const bk=(src==='phone'||src==='clip'||src==='clipboard'||src==='shortcut')?'phone':(src==='sync'||src==='demo')?'typed':'walk';S.steps.src[bk]=(S.steps.src[bk]||0)+n;S.wallet=(S.wallet||0)+n;workSteps(n);checkLadder();if(S.pet)S.petXp=(S.petXp||0)+Math.round(n*(S.base&&S.base.rooms.kennel?1.25:1));ctEvent('steps',n);checkMilestones();}
  if(src!=='carry'&&S.steps.today>=S.goal&&S.streak.last!==S.steps.date){const y=new Date();y.setDate(y.getDate()-1);S.streak.days=(S.streak.last===todayStr(y))?S.streak.days+1:1;S.streak.last=S.steps.date;S.stock.food+=2;S.stock.water+=2;addXp(15);log('Daily target hit. Streak '+S.streak.days+'. +2 food, +2 water, +15 XP.');toast('Target hit. Streak '+S.streak.days,'a');streakReward();}
  if(S.loc||S.combat){S.walk.banked=(S.walk.banked||0)+n;if(src!=='carry'&&src!=='live')toast('+'+fmt(n)+' steps saved for after this stop','z');save();render();return;}
  let left=n;
  while(left>0){if(left>=S.walk.toNext){left-=S.walk.toNext;S.walk.progress=S.walk.dist;S.walk.toNext=0;arrive();break;}else{S.walk.toNext-=left;S.walk.progress=S.walk.dist-S.walk.toNext;left=0;}}
  if(left>0)S.walk.banked=(S.walk.banked||0)+left;
  if(!S.loc&&!S.combat&&S.flags.roadCheck<1&&Math.random()<Math.min(0.5,n/300*0.07*dealMod('road'))){S.flags.roadCheck++;if(Math.random()<sk('shadow')*0.12){log('Something moved in the treeline. You went around it.');save();render();return;}save();render();setTimeout(()=>startCombat(worldCrowd([worldEnemy(Math.random()<0.7?'walker':'runner')]),'road'),400);return;}
  save();render();
}
function arrive(){
  S.loc=makeLoc();S.walk.houses++;
  if(!S.loc.stronghold&&S.walk.houses>2&&Math.random()<0.12){S.loc.rival=pick(RIVALS).id;}
  log('Reached '+S.loc.n+' ('+district().n+').');toast('Reached '+S.loc.e+' '+S.loc.n,'a');SFX.play('arrive');
  if(navigator.vibrate)try{navigator.vibrate([60,40,60]);}catch(e){}
}
function rivalAct(kind){
  const loc=S.loc;if(!loc||!loc.rival)return;const r=RIVALS.find(x=>x.id===loc.rival);const first=r.n.split("'")[0];
  if(kind==='race'){const p=0.5+(S.lvl-1)*0.03+roleLvl('scout')*0.05;if(Math.random()<p){loc.rival='';loc.rooms.forEach(rm=>rm.items.forEach(it=>{if(it.pts)it.pts=Math.round(it.pts*1.3);}));log('You beat '+first+' through the door. First pick of everything.');toast('You got there first','a');SFX.play('win');}
    else{loc.rival='';loc.rooms.forEach(rm=>{rm.items=rm.items.slice(0,1);});log(first+' got in first and stripped the place. Scraps left.');toast(first+' beat you to it','d');}}
  else if(kind==='wait'){loc.rival='';loc.cleared=true;S.walk.toNext=Math.min(S.walk.dist,S.walk.toNext+150);S.walk.progress=S.walk.dist-S.walk.toNext;log('You waited out '+first+'. They cleared the walkers for you; it cost you 150 steps of daylight.');ctEvent('places',1);}
  else if(kind==='trade'){if(S.pack.filter(x=>x.cat==='food').length<3){toast('Maya wants 3 food from your pack');return;}let n=0;S.pack=S.pack.filter(x=>{if(x.cat==='food'&&n<3){n++;return false;}return true;});for(let i=0;i<2;i++)S.pack.push({id:'abx',...ITEMS.abx,uid:uid()});loc.rival='';log('Traded 3 food to Maya for 2 antibiotics.');toast('Trade done','z');}
  else if(kind==='fight'){loc.rival='';const pw=nemPower();const en=[mk('raider'),mk('raider')];
    if(nem().lvl>=4)en.push(mk('gunner'));
    en.forEach(e=>{e.n=nemName();e.hp=Math.round(e.hp*0.8*pw);e.max=e.hp;e.dmg=[Math.round(e.dmg[0]*pw),Math.round(e.dmg[1]*pw)];});
    startCombat(en,'rival');return;}
  else if(kind==='slip'){loc.rival='';S.walk.toNext=Math.min(S.walk.dist,S.walk.toNext+100);S.walk.progress=S.walk.dist-S.walk.toNext;log('You slipped past Nadia\'s scouts. Cost you 100 steps.');}
  save();render();
}
function enterLoc(){
  const loc=S.loc;if(!loc||loc.cleared)return;
  const en=encounterFor(loc);
  if(!en.length){loc.cleared=true;log(loc.n+' is quiet. You slip in.');ctEvent('places',1);save();render();return;}
  gearCheck(()=>{const l2=S.loc;if(!l2||l2.cleared)return;startCombat(en,'enter');});
}
function pushStage(){const loc=S.loc;if(!loc||!loc.stronghold||loc.stage>=3)return;
  gearCheck(()=>{const l2=S.loc;if(!l2||!l2.stronghold||l2.stage>=3)return;startCombat(strongholdStage(l2.stage+1),'enter');});}

/* ================= combat ================= */
let C=null;
function startCombat(enemies,where,job){
  C={enemies,where,job,turn:1,log:[],target:0,brace:false,over:false,fled:false};
  S.combat=true;SFX.play('growl');
  const desc=where==='rival'?'Nadia\'s scouts step out of the dark.':where==='road'?'Something is in the road.':where==='boss'?bossName()+' steps out. Phase '+(S.bossFightsToday)+' of the week\'s hunt.':where==='watch'?'Watch duty. '+(WATCH_JOBS[C.job]?WATCH_JOBS[C.job].n+'.':''):where==='seal'?(S.sealCur?'The door comes off its hinges. '+S.sealCur.n.replace(/^[A-Z]/,c=>c.toLowerCase())+' - and it is awake.':'Something was sealed in here.'):where==='wave'?'The noise brought more.':where==='raid'?'Raiders are at your walls.':where==='liveraid'?((S.raidCur?S.raidCur.n:'Something')+' is here, and it is not alone.'):where==='horde'?'Horde night. They are over the fence.':S.loc&&S.loc.stronghold?['','At the gate.','Into the yard.','The boss trailer. '+bossName()+' is home.'][S.loc.stage+1]:'They were waiting inside '+(S.loc?S.loc.n:'the dark')+'.';
  clog(desc+' '+enemies.length+' hostile'+(enemies.length>1?'s':'')+'.','sys');
  if(bg('gamer')){const bz=enemies.find(e=>e.boss&&e.g);if(bz)clog('Gamer instinct: '+bz.n+' - '+(GIMMICK_TEXT[bz.g]||bz.g)+'.','good');}
  let amb=0.15;if(wxKind()==='fog')amb+=0.1;if(roleLvl('scout')||sk('quickdraw')||sk('brave'))amb=0;
  if(where==='enter'&&Math.random()<amb){clog('Ambush! They act first.','hit');enemyPhase();}
  openCombat();
}
function clog(m,c){if(!C||!C.log)return;C.log.unshift({m,c:c||''});C.log=C.log.slice(0,14);}
function alive(){return C.enemies.filter(e=>!e.dead);}
function targetEnemy(){let t=C.enemies[C.target];if(!t||t.dead){const a=alive();t=a[0];C.target=C.enemies.indexOf(t);}return t;}
function hurt(n,src){let d=Math.max(1,Math.round((n-dr())*(1-drSoak())));
  // Vigil caps the OPENING hit of a fight. It does nothing for the rest of the
  // fight, so it is protection against being ambushed, not a damage sponge.
  {const a=eqItem('armor');
   if(a&&a.id==='vigil'&&!C.vigilUsed){C.vigilUsed=true;if(d>5){d=5;clog('Vigil takes the first blow for you.','good');}}}
  if(C.brace)d=Math.ceil(d*(1-(sk('steady')?0.6+sk('steady')*0.1:0.5)));if(S.pet==='dog'&&Math.random()<petBlock()){clog(S.petName+' lunges and takes the hit meant for you.','good');return;}if(C.adrena===C.turn&&S.hp-d<=0){d=S.hp-1;clog('The adrenaline holds you up at 1 HP.','good');}
  else if(sk('ironjaw')&&!C.jaw&&S.hp-d<=0){C.jaw=true;d=S.hp-1;clog('Iron Jaw. You stay on your feet at 1 HP.','good');}
  S.hp-=d;C.pfx={d,t:Date.now()};clog(src+' hits you for '+d+'.','hit');SFX.play('hurt');$('#sheet').classList.add('shake');setTimeout(()=>$('#sheet').classList.remove('shake'),400);}
function dealTo(t,d,label,kind){if(C.poison>0)d=Math.max(1,Math.round(d*0.8));
  if(t.plate&&!t.cracked){
    if(kind==='heavy'){t.cracked=true;clog('The heavy swing splits '+t.n+"'s plating wide open.",'good');}
    else{const soak=Math.round(d*0.55);d=Math.max(1,d-soak);clog('Most of that glanced off the plating.','');}
  }if(t.shield>0){const s=Math.min(t.shield,d);t.shield-=s;d-=s;clog('The shield soaks '+s+'.'+(t.shield<=0?' It cracks apart.':''),'');if(d<=0){t.fx={d:0,t:Date.now()};C.lunge=Date.now();return;}}t.hp-=d;t.fx={d,t:Date.now(),k:kind||'slash'};C.lunge=Date.now();if(t.warden)C.myDealt=(C.myDealt||0)+d;clog(label+' for '+d+'.','you');if(t.wanted)ctEvent('boss',d);}
// Weapons she can actually put in her hand right now: melee, not wrecked, not
// the one already equipped.
function swapOptions(){return S.gear.filter(g=>g.slot==='melee'&&!g.broken&&(g.dur===undefined||g.dur>0)&&S.eq.melee!==g.uid);}
function swapSheet(){
  if(!C||C.over)return;
  const opts=swapOptions();const cur=eqItem('melee');
  const free=!cur;                                  // nothing in hand = the swap is free
  if(!opts.length){
    openSheet('<h2>Nothing to switch to</h2>'
      +'<p>No other melee weapon in your gear that is in one piece.'
      +(cur?'':' You are fighting bare-handed - <b>Fists</b> still works, it just hits softer.')+'</p>'
      +'<button class="btn r wide" onclick="closeSheet();renderCombat()">Back to the fight</button>',true);
    return;
  }
  openSheet('<h2>Switch weapon</h2>'
    +'<p class="help">'+(free?'Your hands are empty, so this one is free.':'This takes your turn - they get a swing while you switch.')+'</p>'
    +'<div class="stack" style="margin-top:8px">'
    +opts.map(g=>'<button class="room2" onclick="doSwap(\''+g.uid+'\')"><div class="e">'+esc(g.e)+'</div>'
      +'<div class="t"><b class="rc-'+esc(g.r||'common')+'">'+esc(g.n)+'</b>'
      +'<span>'+(g.dmg?wDmg(g)[0]+'-'+wDmg(g)[1]+' dmg · ':'')+(temperOf(g)?esc(temperOf(g).n)+' · ':'')+(g.dur+' swing'+(g.dur===1?'':'s')+' left')+'</span></div></button>').join('')
    +'</div>'
    +'<button class="btn ghost wide" style="margin-top:10px" onclick="closeSheet();renderCombat()">Never mind</button>',true);
}
function doSwap(uidv){
  const g=S.gear.find(x=>x.uid===uidv);if(!g||!C||C.over)return;
  const free=!eqItem('melee');
  S.eq.melee=uidv;SFX.play('ui');save();
  closeSheet();openCombat();
  if(free){clog('You pull out the '+g.n+'.','good');renderCombat();}
  else act('swap');                                  // costs the round
}
function shootGuard(){
  const g=eqItem('ranged');
  if(g&&g.dur===1&&(g.r==='epic'||g.r==='legendary')&&C&&!C.durWarnedGun){
    C.durWarnedGun=true;
    if(!confirm('This is the last shot your '+g.n+' has in it. It will be wrecked (you keep it, but it needs rebuilding). Fire anyway?'))return;
  }
  act('shoot');
}
// Ask before a swing that would wreck something rare. `cost` is how much
// durability this particular swing burns - the heavy swing burns two.
function swingGuard(kind,cost){
  const w=eqItem('melee');
  if(w&&(w.r==='epic'||w.r==='legendary')&&w.dur>0&&w.dur<=cost&&C&&!C.durWarned){
    const line=cost>1
      ? 'A heavy swing costs TWO durability, and your '+w.n+' has '+w.dur+' left. It will be wrecked (you keep it, but it needs rebuilding). Swing anyway?'
      : 'This swing is the last one your '+w.n+' has. It will be wrecked (you keep it, but it needs rebuilding). Swing anyway?';
    if(!confirm(line))return;                 // set the flag ONLY once she says yes
    C.durWarned=true;
  }
  act(kind);
}
function attackGuard(){swingGuard('attack',1);}
function heavyGuard(){swingGuard('heavy',2);}
function breakWeapon(w){if(w.dur===undefined||w.dur>0)return;
  const slot=w.slot||'melee';                       // guns wear out too now
  const keep=(w.r==='epic'||w.r==='legendary');
  if(keep){w.broken=true;w.dur=0;if(S.eq[slot]===w.uid)S.eq[slot]=null;
    clog('The '+w.n+' is wrecked - it stays in your pack. It needs rebuilding.','sys');
    toast(w.n+' wrecked, not lost. Repair it in Gear.','d');
  }else{clog('The '+w.n+(slot==='ranged'?' jams for good.':' breaks.'),'sys');
    S.gear=S.gear.filter(g=>g.uid!==w.uid);if(S.eq[slot]===w.uid)S.eq[slot]=null;}}
function act(kind){
  if(!C||C.over)return;C.brace=false;
  const t=targetEnemy();if(!t){endCombat(true);return;}
  // "Fists" is the same swing with the weapon deliberately left out of it. She
  // asked for this so a legendary is not spent on a walker: less damage, but
  // nothing wears down.
  if(kind==='attack'||kind==='fists'){const w=kind==='fists'?null:eqItem('melee');const dm=w?wDmg(w):baseDmg();
    if(Math.random()<t.dodge){clog(t.n+' sidesteps your swing.','');SFX.play('miss');}
    else if(Math.random()<(buffOn('numb')?0.72:0.9)){let d=Math.round((rint(dm[0],dm[1])+(S.lvl-1)+(w?dmgBonus():0))*hydroDmg()*(buffOn('wired')?1.15:1));
      if(buffOn('sharp')&&!C.sharpUsed){C.sharpUsed=true;d=Math.round(d*1.5);clog('Cold brew. That one landed properly.','good');}
      // Saint Jude pays you for being nearly dead: up to +60% at 1 HP, nothing
      // at full. It is a comeback weapon, not a better weapon.
      if(w&&w.id==='saintjude'){const hurt=1-(S.hp/maxHp());d=Math.round(d*(1+0.6*hurt));if(hurt>0.4)clog('Saint Jude finds its weight.','good');}
      dealTo(t,d,'You hit '+t.n+(w?' with the '+w.n:' bare-handed'),'slash');SFX.play('hit');
      if(w&&w.id==='lastword'&&Math.random()<0.3){t.stun=1;clog(t.n+' is knocked flat. It loses its next turn.','good');}
      // The Harvest trades single-target damage for hitting the whole room.
      if(w&&w.id==='harvest'){for(const o of alive())if(o!==t)dealTo(o,Math.max(1,Math.round(d*0.5)),'The Harvest carries into '+o.n,'slash');}
      const tp=temperOf(w);
      if(tp&&tp.twice&&Math.random()<tp.twice&&!t.dead&&t.hp>0){
        const d2=Math.round(d*0.6);dealTo(t,d2,'The '+w.n+' comes back around','slash');clog('Vicious: a second cut.','good');}
      if(sk('cleave')&&Math.random()<sk('cleave')*0.2){const o=alive().find(e=>e!==t);if(o){dealTo(o,Math.round(d/2),'The swing carries into '+o.n);}}
      if(w&&!(Math.random()<sk('irongrip')*0.25)&&!(eqItem('hands')&&eqItem('hands').id==='surefoot'&&Math.random()<0.5)){w.dur--;if(w.dur<=0&&Math.random()<sk('juryrig')*0.2){w.dur=1;clog('You jury-rig the '+w.n+' back together.','good');}
        if(w.dur>0&&w.dur<=3)clog(w.n+': '+w.dur+' swing'+(w.dur===1?'':'s')+' left before it gives out.','hit');
        breakWeapon(w);}}
    else{clog('You miss.','');SFX.play('miss');}
  }
  else if(kind==='heavy'){const w=eqItem('melee');if(!w){toast('Need a melee weapon');return;}const hd=wDmg(w);
    if(Math.random()<t.dodge+0.1){clog(t.n+' ducks the big swing.','');SFX.play('miss');}
    else if(Math.random()<0.6+sk('bruiser')*0.12){const d=Math.round((rint(hd[0],hd[1])+dmgBonus())*1.6*hydroDmg())+(S.lvl-1);dealTo(t,d,'Heavy swing lands','heavy');SFX.play('hit');}
    else{clog('The heavy swing goes wide.','');SFX.play('miss');}
    w.dur=Math.max(0,w.dur-2);breakWeapon(w);
    if(S.loc)S.loc.noise=Math.min(100,S.loc.noise+(w.quiet?3:8));
  }
  else if(kind==='shoot'){const g=eqItem('ranged');if(!g){toast('No gun');return;}const ammoItem=S.pack.find(p=>p.cat==='ammo'&&p.id===g.ammo);const stockAmmo=g.ammo==='ammo'?S.stock.ammo:0;
    const free=g.id==='mercy'&&Math.random()<0.35;
    if(!free&&!ammoItem&&stockAmmo<1){toast('No '+(g.ammo==='shells'?'shells':'rounds'));return;}
    const noAmmo=Math.random()<sk('ammosense')*0.12;if(noAmmo)clog('Ammo Sense: the chamber had one you forgot about.','good');
    if(!free&&!noAmmo){if(ammoItem){ammoItem.qty--;if(ammoItem.qty<=0)S.pack=S.pack.filter(p=>p!==ammoItem);}else S.stock.ammo--;}else clog('Mercy fires on an empty chamber. Somehow.','good');
    SFX.play('shot');
    const shots=1+((Math.random()<sk('doubletap')*0.1)?1:0);if(shots>1)clog('Double tap.','good');
    for(let s=0;s<shots;s++){const tt=targetEnemy();if(!tt)break;
      if(Math.random()<(buffOn('numb')?0.74:0.92)){let d=Math.round((rint(wDmg(g)[0],wDmg(g)[1])+(S.lvl-1)+sk('steadyaim')*3)*hydroDmg()*(buffOn('wired')?1.15:1));if(sk('coldbarrel')&&!C.fired){d=Math.round(d*1.5);clog('Cold barrel. The first shot bites.','good');}if(Math.random()<sk('headshot')*0.1){d*=2;clog('Headshot.','good');}C.fired=true;tt.shot=true;C.muzzle=Date.now();dealTo(tt,d,'You fire the '+g.n,'shot');
        // Long Winter does not hit harder, it takes their turns away.
        if(g.id==='longwinter'&&!tt.dead&&Math.random()<0.34){tt.stun=1;clog(tt.n+' stiffens up. It loses its next turn.','good');}}else{C.fired=true;clog('The shot goes wide.','');}}
    if(S.loc&&g.id!=='whisper')S.loc.noise=Math.min(100,S.loc.noise+Math.round(Math.max(5,25-sk('silencer')*8)*(g.quiet?0.3:1)));
    // A bow gets most of its bolts back. That is the whole reason to carry one.
    if(g.recover&&!free){
      const back=(Math.random()<g.recover)?1:0;
      if(back){const bundle=S.pack.find(x=>x.cat==='ammo'&&x.id===g.ammo);
        if(bundle)bundle.qty++; else if(S.pack.length<capacity())S.pack.push({id:'bolts',...ITEMS.bolts,uid:uid(),qty:1,n:'Bolt (x1)'});
        clog('You pull the bolt back out.','good');}
    }
    // Guns wear like everything else now. Irongrip and jury-rig apply the same
    // way they do to a melee weapon.
    if(g.dur!==undefined&&!(Math.random()<sk('irongrip')*0.25)){
      g.dur--;
      if(g.dur<=0&&Math.random()<sk('juryrig')*0.2){g.dur=1;clog('You clear a jam and keep the '+g.n+' running.','good');}
      if(g.dur>0&&g.dur<=3)clog(g.n+': '+g.dur+' shot'+(g.dur===1?'':'s')+' before it needs work.','hit');
      breakWeapon(g);
    }
  }
  else if(kind==='brace'){C.brace=true;clog('You brace.','you');}
  else if(kind==='med'){
    // Unlimited patch-ups meant ten meds were 400 extra HP and no boss could
    // ever out-damage a pack. Two a fight (three with Field Dressing) turns
    // "do I have meds" into "when do I spend one".
    const cap=diff().meds+(sk('fielddressing')?1:0);
    if((C.meds||0)>=cap){toast('You can only patch up '+cap+' times in one fight','d');return;}
    C.meds=(C.meds||0)+1;
    // Reach for the strongest thing on her, pack first, then the stash - the
    // old code took whatever came first and healed a flat 35 for it.
    let m=null,mid='bandage';
    for(let i=MED_ORDER.length-1;i>=0&&!m;i--){const p=S.pack.find(x=>x.cat==='meds'&&x.id===MED_ORDER[i]);if(p){m=p;mid=MED_ORDER[i];}}
    if(!m){const p=S.pack.find(x=>x.cat==='meds');if(p){m=p;mid=MEDS[p.id]?p.id:'bandage';}}
    if(!m){for(let i=MED_ORDER.length-1;i>=0&&!m;i--)if(medsHeld(MED_ORDER[i])>0){m={stock:true};mid=MED_ORDER[i];}}
    if(!m){toast('No meds');return;}
    const heal=medHeal(mid);
    if(m.stock)medsTake(mid);else S.pack=S.pack.filter(p=>p!==m);
    S.hp=Math.min(maxHp(),S.hp+heal);
    if(mid==='adrena'){C.jaw=false;C.adrena=C.turn;clog('Adrenaline. Nothing puts you down this round.','good');}
    if(mid==='abx'&&S.infect){S.infect=null;S.infectStep=0;clog('The antibiotics take hold. The infection is gone.','good');}
    clog('You use the '+MEDS[mid].n.toLowerCase()+': +'+heal+' HP.','good');SFX.play('loot');}
  else if(kind==='swap'){
    // Free when you are holding nothing - that is the case she hit, standing
    // there bare-handed because her weapon just broke. Otherwise it costs the
    // round, so swapping is not a free optimisation every turn.
    clog('You get a fresh grip on the '+(eqItem('melee')?eqItem('melee').n:'weapon')+'.','good');
  }
  else if(kind==='flee'){if(C.where==='raid'||C.where==='horde'){toast('Nowhere to run. This is your base.');return;}
    const lh=eqItem('feet')&&eqItem('feet').id==='longhaul';
    if(lh){C.fled=true;C.dropped=[];clog('Long Haul. You are gone before they finish turning around, and nothing shakes loose.','good');
      endCombat(false);return;}
    if(Math.random()<0.7){C.fled=true;clog('You break away and run.','sys');
      // "I actually want to know what I dropped." Name them, in the fight log and
      // on the way-out screen, instead of just saying a quarter of the pack.
      const drop=Math.ceil(S.pack.length*0.25);const lost=[];
      for(let i=0;i<drop&&S.pack.length;i++)lost.push(S.pack.splice(rint(0,S.pack.length-1),1)[0]);
      C.dropped=lost;
      if(lost.length){const names=lost.map(x=>x.e+' '+x.n).join(', ');
        clog('Shaken loose as you go: '+names+'.','hit');
        log('Ran from a fight and lost '+names+'.');}
      endCombat(false);return;}
    else clog('You stumble. They close in.','hit');
  }
  const a=alive();
  if(a.length){const bl=roleLvl('brawler');if(bl){const tt=targetEnemy();dealTo(tt,rint(9+bl*2,15+bl*3),activeCrew().find(c=>c.role==='brawler').name+' punches '+tt.n);}
    const hl=roleLvl('hunter');if(hl&&(S.pack.some(p=>p.cat==='ammo')||S.stock.ammo>0)){const tt=targetEnemy();dealTo(tt,10+hl*3,activeCrew().find(c=>c.role==='hunter').name+' fires');}}
  const ml=roleLvl('medic');if(ml&&S.hp<maxHp()){S.hp=Math.min(maxHp(),S.hp+6+ml*3);clog(activeCrew().find(c=>c.role==='medic').name+' patches you: +'+(6+ml*3)+'.','good');}
  if(sk('triage')&&S.hp<maxHp()){S.hp=Math.min(maxHp(),S.hp+sk('triage')*4);}
  if(eqItem('armor')&&eqItem('armor').id==='nightingale'&&S.hp<maxHp()){S.hp=Math.min(maxHp(),S.hp+5);}
  for(const e of C.enemies){if(!e.dead&&e.hp<=0){e.dead=true;e.hp=0;S.kills++;addXp(e.xp);crewXp(1);ctEvent('kills',1);if(sk('transfusion')&&S.hp<maxHp()){S.hp=Math.min(maxHp(),S.hp+sk('transfusion')*3);clog('You patch up as '+e.n+' drops. +'+(sk('transfusion')*3)+' HP.','good');}clog(e.n+' goes down. +'+e.xp+' XP.','good');
    if(e.burst&&!e.shot){hurt(Math.round((e.burst+dr())*(sk('lungs')?0.5:1)),'The bloater bursts and');}
    if(e.human){if(Math.random()<0.5){const g=pick(['pipe','bat','jacket','helmet','crowbar']);S.gear.push({uid:uid(),id:g,...GEAR[g]});clog('It dropped a '+GEAR[g].n+'.','sys');}
      if(Math.random()<0.5){S.pack.push({id:'ammo',...ITEMS.ammo,uid:uid(),qty:3,n:'Rounds (x3)'});clog('You take 3 rounds off the body.','sys');}
      if(e.boss){S.keys++;S.pack.push({id:'skull',...ITEMS.skull,uid:uid()});clog('The boss mask, and a key from the belt.','sys');
        if(e.wanted&&!e.fled){S.bossKilled=weekId();S.pack.push({id:'wanted',...ITEMS.wanted,uid:uid()});clog('Bounty claimed: '+e.n+'. The poster comes off the wall.','good');ctEvent('bounty',1);if(Math.random()<0.3)dropLegend('The boss was carrying something.');}}}
    else if(Math.random()<0.06){S.pack.push({id:'dogtag',...ITEMS.dogtag,uid:uid()});clog('A dog tag around its neck. Trophy.','sys');}}}
  // Hold the fight this timer belongs to: if a new one somehow started in the
  // meantime, the old victory must not end it.
  if(!alive().length){const mine=C;renderCombat();setTimeout(()=>{if(C===mine)endCombat(true);},500);return;}
  enemyPhase();
  if(S.hp<=0){death();return;}
  renderCombat();
}
/* ================= RAID BOSS MECHANICS (v6.44) =================
   A tier 5 used to be a tier 1 with more HP, and a simulation of 300 fights per
   build won 100% of them at every tier, with a level-3 character in a machete
   beating the hardest thing in the game. Bigger numbers were never the answer -
   they make a fight LONGER, not harder. These make it ask something of you.

   Each tier adds one, and they stack:
     2+  PLATED   - 55% of damage soaks into plating until a heavy swing cracks it
     3+  ENRAGED  - under half health it hits 50% harder
     4+  CALLER   - drags in another body every third round
     5   FRENZY   - under a third health it acts twice a round
   The plating is the interesting one: it makes the heavy swing (which costs two
   durability and was previously a trap) the correct opening move. */
const RAID_MECH={
  plated: {n:'Plated',  d:'55% of damage soaks into the plating. A heavy swing cracks it.'},
  enraged:{n:'Enraged', d:'Hits 50% harder below half health.'},
  caller: {n:'Caller',  d:'Drags in another body every third round.'},
  frenzy: {n:'Frenzy',  d:'Acts twice a round below a third health.'},
};
function raidMechs(tier){
  const m=[];
  if(tier>=2)m.push('plated');
  if(tier>=3)m.push('enraged');
  if(tier>=4)m.push('caller');
  if(tier>=5)m.push('frenzy');
  return m;
}
// A boss must stay frightening at level 20, not just at level 3. Her health more
// than doubles across that span while a raid's did not move at all.
function raidScale(){return 1+Math.max(0,(S.lvl||1)-3)*0.055;}
function enemyPhase(){
  // SQUAD RAIDS: when a friend is swinging at the same raid, the rounds go
  // round the squad. On their round it turns on them and she takes nothing -
  // the boss still heals, calls and enrages, it just is not looking at her.
  C.duck=(C.where==='liveraid'&&typeof squadTarget==='function')?squadTarget():null;
  if(C.duck)clog(C.duck+' pulls it off you this round.','sys');
  for(const e of alive()){
    if(e.stun>0){e.stun--;clog(e.n+' is still down.','');continue;}
    if(e.scream&&Math.random()<e.scream){const w=mk('walker');C.enemies.push(w);clog('The screamer shrieks. Another walker shoves in.','hit');continue;}
    if(e.g){
      if(e.g==='reinforce'&&!e.called&&e.hp<e.max/2){e.called=true;C.enemies.push(mk('raider'));clog(e.n+' whistles. Another raider drops off the trailer.','hit');}
      if(e.g==='heal'&&e.hp<e.max){e.hp=Math.min(e.max,e.hp+10);clog(e.n+' mutters a prayer and stands straighter. +10.','');}
      if(e.g==='flee'&&e.hp<e.max/4){e.dead=true;e.hp=0;e.fled=true;clog(e.n+' vaults the fence and is gone. The bounty walks with him, but he dropped his bag.','sys');S.pack.push({id:'ammo',...ITEMS.ammo,uid:uid(),qty:6});S.keys++;continue;}
      if(e.g==='slow'&&C.turn%2===1){clog(e.n+' winds up.','');continue;}
    }
    if(e.enrage&&!e.enraged&&e.hp<e.max/2){e.enraged=true;e.dmg=e.dmg.map(x=>Math.round(x*1.5));
      clog(e.n+' stops holding back.','hit');SFX.play('growl');}
    // Capped at two. Uncapped, a ten-round fight spawned three extra bodies and
    // snowballed into something no amount of skill survives - the simulation put
    // a fully kitted level 15 at a 2% win rate. A threat you cannot answer is not
    // difficulty, it is a wall.
    if(e.caller&&C.turn%3===0&&(e.called||0)<2&&alive().length<5){
      e.called=(e.called||0)+1;
      const w=mk(Math.random()<0.5?'walker':'runner');C.enemies.push(w);
      clog(e.n+' bellows, and another one shoulders in.','hit');}
    const frenzied=e.frenzy&&e.hp<e.max/3;
    if(frenzied&&!e.wasFrenzied){e.wasFrenzied=true;clog(e.n+' goes berserk.','hit');SFX.play('growl');}
    const swings=(e.fast&&C.turn%2===0?2:1)+(frenzied?1:0);
    for(let i=0;i<swings;i++){if(Math.random()<e.hit-sk('adrenaline')*0.06-(e.human?sk('intimidate')*0.08:0)){let d=rint(e.dmg[0],e.dmg[1]);if(e.g==='crit'&&Math.random()<0.2){d*=2;clog('A brutal swing.','hit');}
      if(C.duck)continue;                      // it is swinging at her squadmate, not at her
      const guards=activeCrew();if(guards.length&&Math.random()<0.3){const gc=pick(guards);clog(e.n+' turns on '+gc.name+'.','hit');hurtCrew(gc,Math.max(1,d-2));continue;}
      if(!e.human&&Math.random()<infectChance())catchInfection(e.n);
      hurt(d,e.n);
        if(e.g==='bleed'){C.bleed=Math.max(1,3-sk('clotting'));}if(e.g==='poison'){C.poison=Math.max(1,3-sk('clotting'));}
        if(e.g==='steal'&&S.pack.length&&Math.random()<0.3){const it=S.pack.splice(rint(0,S.pack.length-1),1)[0];clog(e.n+' lifts your '+it.n+' mid-swing.','hit');}}
      else clog(e.n+' lunges and misses.','');}
  }
  if(C.bleed>0){C.bleed--;const bd=Math.max(1,Math.round(4*(1-sk('clotting')*0.25)));S.hp-=bd;clog('You are bleeding. -'+bd+'.','hit');}
  if(C.poison>0){C.poison--;if(C.poison===0)clog('Your strength comes back.','good');}
  C.turn++;
}
function dropLegend(why){const id=pick(LEGEND_IDS);S.gear.push({uid:uid(),id,...GEAR[id]});clog((why||'')+' LEGENDARY: '+GEAR[id].n+'. '+GEAR[id].legend+'.','good');toast('Legendary: '+GEAR[id].n,'l');SFX.play('legend');log('Found the legendary '+GEAR[id].n+'.');}
function death(){
  // A friend is still on their feet in this raid. They pull her out: she is
  // done with the fight, but a raid death with a squad costs nothing.
  if(C&&C.where==='liveraid'&&typeof squadSize==='function'&&squadSize()>1){squadDown();return;}
  C.over=true;S.combat=false;buffClear();const lost=packPts();SFX.play('dead');
  const where=C.where;if(where==='raid'&&S.raidPending){const p=S.raidPending;resolveRaid(p.power,p.hour,p.date);S.flags.lastRaidCheck=p.date;}
  if(where==='boss')bossAfter(false);if(where==='horde')resolveHorde(true,false);if(where==='rival')nemWon();
  if(where==='liveraid'&&typeof liveRaidAfter==='function')liveRaidAfter(false);
  if(where==='seal')sealAfter(false);
  const keepFrac=sk('fieldsurgeon')*0.25;const kept=keepFrac?S.pack.slice(0,Math.floor(S.pack.length*keepFrac)):[];S.pack=kept;S.run=0;S.loc=null;newDistance();S.hp=Math.round(maxHp()*(0.4+sk('fieldsurgeon')*0.15));
  const lostCrew=woundedCrew();if(lostCrew.length){const ids=lostCrew.map(c=>c.id);S.crew=S.crew.filter(c=>!ids.includes(c.id));S.active=S.active.filter(id=>!ids.includes(id));log('You went down and could not carry them out. '+lostCrew.map(c=>c.name).join(' and ')+' did not make it.');}
  // Only ordinary gear can be taken off you. An epic or legendary survives a
  // death the same way it survives breaking - anything else makes one bad fight
  // cost the rarest thing you own.
  // Death took your pack and one ordinary weapon and left the stash, keys,
  // parts, level and banked steps untouched - about one trip's worth. A fifth of
  // the scrap pile stings without undoing a week.
  const scrapLost=Math.round((S.stock.scrap||0)*diff().scrap);
  if(scrapLost>0){S.stock.scrap-=scrapLost;log('They went through the stash while you were down: -'+scrapLost+' scrap.');}
  const losable=S.gear.map((g,i)=>({g,i})).filter(x=>x.g.r!=='epic'&&x.g.r!=='legendary');
  let gearLost=null;
  if(losable.length&&Math.random()<0.5){const pick=losable[rint(0,losable.length-1)];
    gearLost=S.gear.splice(S.gear.indexOf(pick.g),1)[0];
    for(const k in S.eq)if(S.eq[k]===gearLost.uid)S.eq[k]=null;}
  log('You went down. Your crew dragged you back to base. Pack lost ('+fmt(lost)+' pts)'+(gearLost?', and your '+gearLost.n+' is gone':'')+'.');
  save();render();
  openSheet(`<h2>You went down</h2><div class="big">${ART.avatarSVG(S.av,70,{mood:'dead'})}</div><p>Your crew dragged you out before they finished you. Everything in the pack is gone${gearLost?', and you lost your '+esc(gearLost.n):''}${lostCrew.length?'. '+esc(lostCrew.map(c=>c.name).join(' and '))+' did not make it out at all':''}. You wake up at base at ${Math.round(maxHp()*0.4)} HP.</p><button class="btn r wide" onclick="closeSheet()">Get up</button>`);
  C=null;
}
function endCombat(won){
  if(!C)return;if(typeof squadStop==='function')squadStop();C.over=true;S.combat=false;buffClear();
  const where=C.where;
  if(won){SFX.play('win');if(sk('secondwind'))S.hp=Math.min(maxHp(),S.hp+sk('secondwind')*6);
    log('Cleared '+C.enemies.length+' hostiles'+(where==='enter'&&S.loc?' inside '+S.loc.n:where==='road'?' on the road':'')+'.');
    if(where==='enter'||where==='wave'){if(S.loc.stronghold&&where==='enter'){S.loc.stage++;S.loc.cleared=true;if(S.loc.stage>=3){S.campCleared=weekId();log('Stronghold cleared. The county is quieter for a while.');ctEvent('stronghold',1);}}else{S.loc.cleared=true;}if(where==='enter')ctEvent('places',1);}
    if(where==='raid'){resolveRaidFight(true);}
    if(where==='watch'){watchReward(C.job);}
    if(where==='horde'){resolveHorde(true,true);}
    if(where==='boss'){bossAfter(true);}
    if(where==='liveraid'&&typeof liveRaidAfter==='function'){liveRaidAfter(true);}
    if(where==='seal'){sealAfter(true);}
    if(where==='rival'){S.pack.push({id:'ammo',...ITEMS.ammo,uid:uid(),qty:6});for(let i=0;i<3&&S.pack.length<capacity();i++)S.pack.push({id:'scrap',...ITEMS.scrap,uid:uid()});log('They ran. You took their ammo and scrap.');nemBeaten();}
    crewXp(2);
  }else{
    if(where==='enter'){S.loc=null;S.run=0;newDistance();log('You fled and lost part of the pack.');}
    else if(where==='wave'){S.loc.rooms.forEach(r=>r.done=true);S.loc=null;newDistance();log('You fled the wave and lost part of the pack.');}
    else if(where==='boss'){bossAfter(false);log('You fell back from '+bossName()+'. The damage you dealt still counts.');}
    else if(where==='horde'){resolveHorde(true,false);}
    else if(where==='seal'){sealAfter(false);log('You got back out of the sealed room.');}
    else log('You fled the road.');
  }
  const summary=C.killHtml?C.killHtml:won?`<h2>Clear</h2><div class="big">${where==='raid'?'🧱':'💥'}</div><p>${C.log.filter(l=>l.c==='good').slice(0,4).map(l=>esc(l.m)).join('<br>')||'They are down.'}</p>`:`<h2>You got away</h2><div class="big">💨</div>`+((C.dropped&&C.dropped.length)
      ? `<p>Shaken loose on the way out:</p><div class="loot" style="justify-content:center">${C.dropped.map(g=>`<div class="item r-${g.r||'common'}"><span class="e">${g.e}</span>${esc(g.n)}</div>`).join('')}</div>`
      : `<p>Nothing in your pack to lose.</p>`);
  const carry=S.walk.banked||0;S.walk.banked=0;
  C.summaryShown=true;C=null;save();render();
  openSheet(summary+`<button class="btn r wide" onclick="closeSheet()">Continue</button>`);
  if(carry>0&&!S.loc)addSteps(carry,'carry');
}
function openCombat(){$('#modal').classList.add('on');$('#modal').dataset.lock='1';renderCombat();}
/* WHEN SHE HAS NOTHING (v6.73). Her words: "I don't have food, bandages or any
   scrap LOL". Measured from a real save - a base with its garden, nothing in
   the stash, 10% HP - she was three free mornings from full and one watch job
   from enough scrap for bandages. The way out existed the whole time and the
   game never said a word about it, which is the same failure as every other one
   this week: it knew something and kept it to itself.
   This appears ONLY when she is genuinely in trouble, and every number in it is
   read from her own save rather than written down here. */
function renderStuck(){
  const el=$('#stuckCard');if(!el)return;
  if(!S.onboarded||S.loc||S.combat){el.hidden=true;return;}
  const hurt=S.hp<maxHp()*0.35, noMeds=!medsTotal()&&!packMedsTotal(), broke=(S.stock.scrap||0)<10;
  if(!(hurt&&noMeds&&broke)){el.hidden=true;return;}
  const night=Math.max(25,Math.round(maxHp()*0.30));
  const garden=(S.base&&S.base.rooms.garden)||0;
  const per=garden?(3+(bg('farmer')?2:0)+sk('greenthumb'))*garden:0;
  const w=S.base?watchState():null;
  const jobs=w?Math.max(0,w.jobs.length-(w.used||0)):0;
  const pay=w&&w.jobs.length?(WATCH_JOBS[w.jobs[0]].reward.scrap||0):0;
  const rows=[];
  rows.push('<b>Sleep.</b> Tomorrow morning gives you <b>'+night+' HP</b> back'
    +(per?' and the garden gives <b>'+per+' food</b>':'')+'. Three mornings takes you from here to full, and it costs nothing.');
  if(S.stock.food>0)rows.push('<b>Eat.</b> You have <b>'+S.stock.food+' food</b> - that is <b>'+Math.max(15,Math.round(maxHp()*0.08))+' HP</b> each.');
  if(S.stock.water>0&&hydroState()!=='ok')rows.push('<b>Drink.</b> Being parched cuts your maximum HP by 15% on its own.');
  rows.push('<b>Walk and loot, do not fight.</b> Searching rooms costs nothing and about <b>1 in 12</b> things you find is scrap, <b>1 in 20</b> is food, <b>1 in 20</b> is meds. Leave a place before the noise brings anything.');
  if(jobs>0)rows.push('<b>Watch duty</b> at your base: <b>'+jobs+' job'+(jobs===1?'':'s')+' left today</b>, about <b>'+pay+' scrap</b> plus items each. It is a fight, so do it after you have slept.');
  if(S.base)rows.push('<b>The trader</b> sells bandages at 10 scrap, food at 5. One watch job covers it.');
  else rows.push('<b>Claim a base.</b> Clear any place and claim it - that is what brings the trader, and a garden feeds you every morning.');
  el.className='card blood';
  el.innerHTML='<h2>Low, and nothing in the stash</h2>'
    +'<p class="help">You are on '+S.hp+' / '+maxHp()+' with no meds and '+(S.stock.scrap||0)+' scrap. Here is every way out that costs nothing:</p>'
    +'<div class="stack" style="margin-top:8px">'+rows.map(r=>'<div class="note">'+r+'</div>').join('')+'</div>';
  el.hidden=false;
}
function renderCombat(){
  if(!C)return;const w=eqItem('melee'),g=eqItem('ranged');const t=targetEnemy();
  const ammoN=(g?(S.pack.filter(p=>p.cat==='ammo'&&p.id===g.ammo).reduce((a,b)=>a+(b.qty||0),0)+(g.ammo==='ammo'?S.stock.ammo:0)):0);
  const meds=S.pack.filter(p=>p.cat==='meds').length+medsTotal();
  const now=Date.now();const phurt=C.pfx&&now-C.pfx.t<600;const plunge=C.lunge&&now-C.lunge<400;const flash=C.muzzle&&now-C.muzzle<350;
  const SPARK={slash:'💢',heavy:'💥',shot:'✴️'};
  $('#sheet').innerHTML=`<h2>${C.where==='raid'?'Defend the base':C.where==='road'?'On the road':'Inside'} <span class="chip d" style="float:right">round ${C.turn}</span></h2>
  <div class="pbox${phurt?' hurt':''}"><div class="sp${plunge?' lunge':''}">${ART.avatarSVG(S.av,60,{weapon:eqItem('melee')?'melee':eqItem('ranged')?'gun':'',mood:S.hp<maxHp()*0.3?'angry':''})}${flash?'<span class="muzzle">✳️</span>':''}</div><div><div class="hplab"><span>You · DR ${dr()}</span><span>${S.hp} / ${maxHp()}</span></div><div class="hpbar"><i style="width:${S.hp/maxHp()*100}%"></i></div></div>${phurt?`<span class="dmg">-${C.pfx.d}</span>`:''}</div>
  ${C.where==='liveraid'&&typeof squadStrip==='function'?squadStrip():''}
  ${S.buff&&S.buff.fights>0?`<div class="help" style="margin-top:6px;color:var(--amber)">${esc(BUFF_TEXT[S.buff.k]||'')}</div>`:''}
  <div class="stack" style="margin:12px 0">${C.enemies.map((e,i)=>{const hit=e.fx&&now-e.fx.t<600;return `<button class="enemy${e===t?' target':''}${e.dead?' dead':''}${hit?' hit':''}" onclick="C.target=${i};renderCombat()"><div class="sp">${ART.zombieSVG(e.k,52)}${hit?`<span class="spark">${SPARK[e.fx.k||'slash']}</span>`:''}</div><div><div class="n">${esc(e.n)}${e.wanted?' · WANTED':e.boss?' ☠':''}</div><div class="hpbar en"><i style="width:${e.hp/e.max*100}%"></i></div><div class="d">${e.hp}/${e.max} · hits for ${e.dmg[0]}-${e.dmg[1]}${e.fast?' · fast':''}${e.burst?' · bursts when killed up close':''}${e.scream?' · calls more':''}${e.dodge?' · dodgy':''}${e.stun?' · down':''}${e.shield>0?' · shield '+e.shield:''}${e.plate&&!e.cracked?' · <b style="color:var(--steel)">plated - a heavy swing cracks it</b>':''}${e.enraged?' · <b style="color:#ff8a92">enraged</b>':''}${e.caller?' · calls more':''}${e.frenzy?' · frenzies low':''}${e.g?' · '+GIMMICK_TEXT[e.g]:''}</div></div>${hit?`<span class="dmg">-${e.fx.d}</span>`:''}</button>`;}).join('')}</div>
  <div class="acts">
    <button class="btn r" onclick="attackGuard()">${w?w.e+' '+esc(w.n)+(temperOf(w)?' <span class="chip s">'+esc(temperOf(w).n)+'</span>':''):'👊 Fists'}<small>${w?(wDmg(w)[0]+dmgBonus())+'-'+(wDmg(w)[1]+dmgBonus())+' · '+w.dur+' left':baseDmg()[0]+'-'+baseDmg()[1]+' dmg'}</small></button>
    <button class="btn" onclick="heavyGuard()" ${w?'':'disabled'}>💢 Heavy swing<small>x1.6 dmg · ${60+sk('bruiser')*12}% hit · costs 2 durability</small></button>
    ${w?`<button class="btn" onclick="act('fists')">👊 Fists<small>${baseDmg()[0]}-${baseDmg()[1]} dmg · saves your ${esc(w.n)}</small></button>`:''}
    <button class="btn" onclick="swapSheet()">🔄 Switch weapon<small>${swapOptions().length} in your gear${w?' · costs your turn':' · free, hands empty'}</small></button>
    <button class="btn" onclick="shootGuard()" ${g&&(ammoN||g.id==='mercy')?'':'disabled'}>${g?g.e+' '+esc(g.n)+(temperOf(g)?' <span class="chip s">'+esc(temperOf(g).n)+'</span>':''):'🔫 No gun'}<small>${g?(wDmg(g)[0]+sk('steadyaim')*3)+'-'+(wDmg(g)[1]+sk('steadyaim')*3)+' · '+ammoN+' rounds'+(g.dur!==undefined?' · '+g.dur+' left':''):'find one'}</small></button>
    <button class="btn" onclick="act('brace')">🛡️ Brace<small>${sk('steady')?60+sk('steady')*10:50}% less damage this round</small></button>
    <button class="btn" onclick="act('med')" ${meds?'':'disabled'}>${meds?MEDS[bestMed()].e:'🩹'} Patch up<small>${meds?esc(MEDS[bestMed()].n)+' · +'+Math.min(medHeal(bestMed()),maxHp()-S.hp):'no meds'}</small></button>
    <button class="btn ghost" onclick="act('flee')" ${C.where==='raid'?'disabled':''}>🏃 Run<small>70% · drop 25% pack</small></button>
  </div>
  <ul class="clog" style="margin-top:10px">${C.log.map(l=>`<li class="${l.c}">${esc(l.m)}</li>`).join('')}</ul>`;
}

/* ================= looting ================= */
function rarToast(it){const r=it.r||'common';if(r==='legendary'){toast('LEGENDARY: '+it.n,'l');SFX.play('legend');}else if(r==='epic'){toast('Epic: '+it.n,'p');SFX.play('rare');}else if(r==='rare'){toast('Rare: '+it.n,'a');SFX.play('rare');}else SFX.play('loot');}
function takeItem(it,loc){
  if(it.gear){S.gear.push({uid:uid(),id:it.id,...GEAR[it.id]});if(loc)loc.found.push({...it,ft:Date.now()});log('Found a '+it.n+'. It is in your Gear, under You - gear never goes in your pack.');rarToast(it);return true;}
  if(it.cat==='key'){S.keys++;if(loc)loc.found.push({...it,ft:Date.now()});log('Found a chest key.');rarToast(it);return true;}
  if(it.cat==='cosmetic'){if(S.cosmetics.includes(it.id)){S.stock.scrap+=10;log('Another '+it.n+'. Traded for 10 scrap.');return true;}S.cosmetics.push(it.id);if(loc)loc.found.push({...it,ft:Date.now()});log('Found '+it.n+' to wear.');rarToast(it);return true;}
  if(S.pack.length>=capacity()){toast('Pack full. Left '+it.n+' behind.','d');return false;}
  const item={...it,uid:uid()};if(item.cat==='ammo'){item.qty=(item.qty||6)+(roleLvl('hunter')?1+Math.floor(roleLvl('hunter')/2):0)+sk('scrounger');}
  S.pack.push(item);if(loc)loc.found.push({...item,ft:Date.now()});rarToast(it);return true;
}
function searchRoom(i){pushSoon();
  const loc=S.loc;if(!loc||!loc.cleared)return;const r=loc.rooms[i];if(r.done)return;
  if(r.sealed){breakSeal(i);return;}if(loc.stronghold&&r.stage>loc.stage){toast('Push deeper first');return;}r.done=true;S.roomsSearched=(S.roomsSearched||0)+1;
  for(const it of r.items)takeItem(it,loc);
  ctEvent('rooms',1);
  if(!loc.stronghold&&S.crew.length<8&&Math.random()<0.07){const c=newCrew();S.crew.push(c);if(S.active.length<crewSlots())S.active.push(c.id);log(c.name+' was hiding in the '+r.n.toLowerCase()+'. '+ROLES[c.role].n+' joins the crew.');openSheet(`<h2>Survivor</h2><div class="big">${ART.avatarSVG(c.av,80)}</div><p><b style="color:var(--bone)">${c.name}</b> was hiding in the ${esc(r.n.toLowerCase())}. ${ROLES[c.role].e} ${ROLES[c.role].n}: ${ROLES[c.role].d(1)}.</p><button class="btn r wide" onclick="closeSheet()">Welcome to the crew</button>`);}
  else if(!S.pet&&(Math.random()<0.03||(S.roomsSearched||0)>=40)){petJoin(Math.random()<0.6?'dog':'cat');}
  else if(S.pet&&(S.pets||[]).length<PET_MAX&&Math.random()<0.012){petJoin(Math.random()<0.5?'dog':'cat');}
  let noise=Math.max(4,Math.round((r.noise+rint(-6,8)-sk('lightstep')*4-(wxKind()==='rain'?10:0))*(dayMod().noise||1)));loc.noise=Math.min(100,loc.noise+noise);
  crewXp(1);save();render();
  if(loc.noise>=100){loc.noise=55;loc.wave++;setTimeout(()=>startCombat([mk('walker'),mk(Math.random()<0.4?'runner':'walker')].concat(loc.wave>1?[mk('bloater')]:[]),'wave'),350);}
}
/* ================= THE SEALED ROOM (v6.77) =================
   Her ask: "make some houses have a rare loot room ... we have to kill some
   type of zombie boss and gives good rewards. Don't make it easy but make it
   hard enough that we have to spend meds."

   So the boss is tuned against HER health bar rather than against a number
   picked out of the air: it is meant to take a real bite, which with the v6.72
   armour curve and the v6.67 heals means one or two meds, not a whole stash.
   It scales with her level through mk() like everything else, and the reward
   floor is "nothing common" so the trip is never wasted. */
function breakSeal(i){
  const loc=S.loc;if(!loc)return;const r=loc.rooms[i];if(!r||!r.sealed||r.done)return;
  const k=sealOf(r.sealed);
  const meds=medsTotal()+packMedsTotal();
  openSheet('<h2>'+esc(k.n)+'</h2>'
    +'<p>'+esc(k.d)+'</p>'
    +'<div class="note"><b>Whatever is in there is still in there.</b> Opening it starts a fight you cannot walk away from clean, and it hits far harder than anything on the street. What is behind it is worth it.</div>'
    +'<div class="kv" style="margin-top:8px"><span>You are on</span><b>'+S.hp+' / '+maxHp()+'</b>'
      +'<span>Meds you can reach</span><b'+(meds?'':' style="color:#ff8a92"')+'>'+meds+'</b></div>'
    +(meds<1?'<p class="help" style="color:#ff8a92;margin-top:6px">No meds anywhere. You can still try it.</p>':'')
    +'<div class="grid2" style="margin-top:12px">'
    +'<button class="btn ghost" onclick="closeSheet()">Leave it sealed</button>'
    +'<button class="btn r" onclick="closeSheet();sealGo('+i+')">Break it open</button>'
    +'</div>',true);
}
function sealGo(i){
  const loc=S.loc;if(!loc)return;const r=loc.rooms[i];if(!r||!r.sealed||r.done)return;
  gearCheck(()=>{
    const k=sealOf(r.sealed);
    const boss=mk(r.sealed);
    // It is not alone in there. Two of whatever else was shut in with it.
    const en=[mk(Math.random()<0.5?'walker':'runner'),boss];
    if(S.lvl>=8)en.unshift(mk('walker'));
    S.sealCur={room:i,id:r.sealed,n:k.n};
    startCombat(en,'seal');
  });
}
function sealAfter(won){
  const cur=S.sealCur;if(!cur)return;S.sealCur=null;
  const loc=S.loc;const r=loc&&loc.rooms[cur.room];
  if(!won){
    if(r)r.sealed=r.sealed;            // still sealed - it is there if she comes back
    log('You backed out of the '+cur.n.toLowerCase()+'. The door is still open, and so is whatever is behind it.');
    return;
  }
  if(r){r.done=true;r.sealed=null;}
  // Nothing common comes out of a room somebody bricked over.
  const got=[];const nItems=4+rint(0,2);
  const pool=table(['meds','ammo','scrap','food','water'],3,9).map(x=>({...x,w:x.w*rarW(x)*((RAR[x.r||'common'].w>=3)?3.2:1)}));
  for(let j=0;j<nItems;j++){
    let it=wpick(pool,'w');
    for(let g=0;g<14&&RAR[it.r||'common'].w<3;g++)it=wpick(pool,'w');
    const packed=it.gear?{id:it.id,n:it.n,e:it.e,pts:it.pts,cat:'gear',gear:true,r:it.r}
                        :{id:it.id,n:it.n,e:it.e,pts:Math.round(it.pts*lootMult()*1.5),cat:it.cat,qty:it.qty,r:it.r};
    if(takeItem(packed,loc))got.push(packed.n);
  }
  const scrap=35+rint(0,25);S.stock.scrap+=scrap;S.keys+=2;addXp(90+S.lvl*6);
  medsGive('kit',1);
  if(Math.random()<0.35)dropLegendQuiet(),got.push('a LEGENDARY');
  S.sealsOpened=(S.sealsOpened||0)+1;
  log('You cleared the '+cur.n.toLowerCase()+'. +'+scrap+' scrap, 2 keys, a trauma kit'+(got.length?', '+got.join(', '):'')+'.');
  toast('Sealed room cleared','l');SFX.play('legend');
  save();render();
}
// Stashing used to turn a locked chest into 5 scrap, silently - and a chest is
// one of only two places a legendary can come from. It goes in the stash now,
// and opens from there, so there are two ways in and one set of rewards.
function chestUnlock(){
  if(S.keys>0){S.keys--;return true;}
  if(Math.random()<sk('lockpick')*0.3){toast('Lock picked','z');return true;}
  toast(sk('lockpick')?'The pick slipped. Try again or find a key.':'Needs a key','d');SFX.play('miss');
  return false;
}
function openStashChest(){
  if(!(S.stock.chests>0)){toast('No chests in the stash');return;}
  if(!chestUnlock())return;
  S.stock.chests--;chestLoot();
}
function openChest(uidv){
  const c=S.pack.find(p=>p.uid===uidv);if(!c)return;
  if(!chestUnlock())return;
  S.pack=S.pack.filter(p=>p!==c);
  chestLoot();
}
function chestLoot(){
  SFX.play('chest');
  const list=table(['food','water','meds','scrap','ammo'],1.5,1.5).filter(x=>x.r!=='common').map(x=>({...x,w:x.w*rarW(x)}));const got=[];
  for(let i=0;i<3;i++){const it=wpick(list,'w');const item=it.gear?{id:it.id,n:it.n,e:it.e,pts:it.pts,cat:'gear',gear:true,r:it.r}:{id:it.id,n:it.n,e:it.e,pts:Math.round(it.pts*lootMult()),cat:it.cat,qty:it.qty,r:it.r};if(takeItem(item,null))got.push(item);}
  if(Math.random()<0.25){const cs=rollCosmetic();if(takeItem(cs,null))got.push(cs);}
  if(Math.random()<0.08){dropLegend('Under the false bottom:');got.push({e:'✨',n:'a legendary',r:'legendary'});}
  ctEvent('chests',1);log('Opened a chest: '+got.map(g=>g.n).join(', ')+'.');
  openSheet(`<h2>Chest opened</h2><div class="big">🧳</div><div class="loot" style="justify-content:center">${got.map(g=>`<div class="item r-${g.r||'common'}"><span class="e">${g.e}</span>${esc(g.n)}</div>`).join('')}</div><button class="btn a wide" style="margin-top:12px" onclick="closeSheet()">Nice</button>`);
  save();render();
}
function leaveLoc(){
  if(!S.loc)return;const loc=S.loc;
  if(loc.geo){if(loc.cleared)S.run++;streetState().looted[loc.geo]=Date.now();S.loc=null;log(loc.cleared?'Left '+loc.n+', cleared.':'Left '+loc.n+'. It is picked over for a day.');save();render();if(typeof updateMarkers==='function')updateMarkers();return;}
  if(loc.cleared)S.run++;S.loc=null;
  log('Left '+loc.n+'. Run x'+(1+S.run*0.1).toFixed(1)+'.');
  const maxD=unlockedDistrict();
  if(S.walk.houses%5===0&&S.walk.district<maxD){S.walk.district++;log('You crossed into '+district().n+'. Longer walks, better loot, worse company.');toast('New district: '+district().n,'a');}
  newDistance();const carry=S.walk.banked||0;S.walk.banked=0;save();render();if(carry>0){if(carry>=S.walk.toNext)toast('Your saved steps carry you straight to the next place','a');addSteps(carry,'carry');}
}

/* ================= base ================= */
// What you already sank into the base you are about to walk away from.
function roomsWorth(rooms){
  let steps=0,scrap=0,def=0;const names=[];
  for(const [k,l] of Object.entries(rooms||{})){
    if(!l||!BUILD[k])continue;
    for(let i=0;i<l;i++){steps+=BUILD[k].labor[i]||0;scrap+=BUILD[k].cost[i]||0;def+=BUILD[k].def[i]||0;}
    names.push(BUILD[k].n+(BUILD[k].lv>1?' L'+l:''));
  }
  return {steps,scrap,def,names};
}
// Raids get stronger the longer you hold one place (daysSince*0.5 inside
// checkRaids). Nobody would ever guess that from the screen, so it is printed
// on the base card and on the move screen - moving resets it to zero.
function baseDays(){return S.base?Math.floor((Date.now()-(S.base.claimed||Date.now()))/86400000):0;}
function baseAgePower(){return Math.round(baseDays()*0.5);}
function baseSunk(){
  if(!S.base)return {steps:0,scrap:0,def:0,rooms:[]};
  let steps=0,scrap=0;const rooms=[];
  for(const [k,l] of Object.entries(S.base.rooms||{})){
    if(!l||!BUILD[k])continue;
    for(let i=0;i<l;i++){steps+=BUILD[k].labor[i]||0;scrap+=BUILD[k].cost[i]||0;}
    rooms.push(BUILD[k].n+(BUILD[k].lv>1?' L'+l:''));
  }
  return {steps,scrap,def:defense(),rooms};
}
/* The move screen. It used to be a browser confirm() that named what you would
   lose and nothing else - so the one question a player actually has, "is the
   new place better than mine?", had no answer on screen. This prices the whole
   swap: what you give up, what the new building hands you free, what keeps
   paying afterwards, and the raid clock that resets. */
function moveBaseSheet(){
  const loc=S.loc;if(!loc||!loc.cleared)return;
  const first=!S.base;
  const gain=roomsWorth(BASE_GRANT[loc.t]||{});
  const lose=first?{steps:0,scrap:0,def:0,names:[]}:roomsWorth(S.base.rooms||{});
  const fwd=BASE_FOREVER[loc.t]||'';
  const now=S.base?BASE_FOREVER[S.base.t]||'':'';
  const age=baseAgePower();
  const row=(a,b)=>'<span>'+a+'</span><b>'+b+'</b>';
  openSheet('<h2>'+esc(loc.e+' '+loc.n)+'</h2>'
    +'<p class="help">'+(first?'Your first base.':'Moving from '+esc(S.base.n)+'.')+' A base type is really just the one room it hands you for free, plus anything that keeps paying.</p>'
    +(function(){
      // The one thing about a base that is about WHERE it is rather than what it
      // is: with the live map on you have to be within 60 m of it to stash, and
      // stashing is where a run turns into points. A base you rarely walk past
      // means carrying a full pack around - and a pack is lost if you go down.
      if(!(typeof STREET!=='undefined'&&STREET.on&&loc.geo))return '';
      const d=(typeof homeDistance==='function')?homeDistance():null;
      return '<div class="note" style="margin-top:8px"><b>You stash within 60 m of your base pin.</b> '
        +(d!==null?'Your current base is '+Math.round(d)+' m from here. ':'')
        +'But the perk follows the <b>building</b> and the stash spot follows the <b>pin</b>, and they do not have to match: claim this place for what it gives you, then move the pin to wherever you actually walk with "Move my base pin here" on the map. 20 scrap, keeps everything.</div>';})()
    +'<div class="section-label" style="margin-top:10px">What this place gives you</div>'
    +(gain.names.length
      ? '<div class="kv">'+row('Free right away',esc(gain.names.join(', ')))
        +row('Work that saves you',fmt(gain.steps)+' steps + '+gain.scrap+' scrap')
        +(gain.def?row('Defense',gain.def):'')+'</div>'
      : '<p class="help">No free rooms - you build everything here yourself.</p>')
    +(fwd?'<p class="note" style="margin-top:8px">'+esc(fwd)+'</p>':'')
    +(first?'':'<div class="section-label" style="margin-top:12px">What it costs you</div>'
      +(lose.names.length
        ? '<div class="kv">'+row('You lose','<span style="color:#ff8a92">'+esc(lose.names.join(', '))+'</span>')
          +row('Work thrown away',fmt(lose.steps)+' steps + '+lose.scrap+' scrap')
          +(lose.def?row('Defense lost','<span style="color:#ff8a92">-'+lose.def+'</span>'):'')
          +row('Moving fee','20 scrap')+'</div>'
          +'<p class="help" style="margin-top:6px">Nothing carries over. The new base starts with whatever that building came with, and you rebuild the rest from zero.</p>'
        : '<div class="kv">'+row('You have built nothing yet','so there is nothing to lose')+row('Moving fee','20 scrap')+'</div>')
      +(now?'<p class="help" style="margin-top:6px">You would also give up: '+esc(now)+'</p>':''))
    +(first?'':'<div class="section-label" style="margin-top:12px">The raid clock</div>'
      +'<div class="kv">'+row('Held '+esc(S.base.n),baseDays()+' day'+(baseDays()===1?'':'s'))
      +row('Raiders hitting harder by now','+'+age+' raid power')
      +row('After moving','back to 0, and one raid-free day')
      +row('Horde night','unchanged - it follows you, not the building')+'</div>'
      +'<p class="help" style="margin-top:6px">Raids get stronger the longer you stay in one place - about +0.5 power a day. Moving resets that.</p>')
    +'<p class="help" style="margin-top:10px"><b>Your base and your home are the same thing</b> - one place, and its pin on the map. If this spot is right but you only want to move the PIN, use "Move my base pin here" on the map instead: same 20 scrap, and it keeps every room.</p>'
    +'<div class="grid2" style="margin-top:12px">'
    +'<button class="btn ghost" onclick="closeSheet()">Stay put</button>'
    +(!first&&S.stock.scrap<20
      ? '<button class="btn" disabled>Need 20 scrap</button>'
      : '<button class="btn r" onclick="closeSheet();claimBase(1)">'+(first?'Claim it':'Move here')+'</button>')
    +'</div>',true);
}
function basePinOffer(){
  if(!S.base||!S.base.geo||S.loc||S.combat)return;
  openSheet('<h2>One more thing about '+esc(S.base.n)+'</h2>'
    +'<p>Its perk comes from the <b>building</b>: '+esc(BASE_PERK[S.base.t]||'what it came with')+'</p>'
    +'<p>Where you <b>stash</b> comes from its <b>pin on the map</b>, and you have to be within 60 m of that pin to stash a pack.</p>'
    +'<div class="note"><b>Those do not have to be the same spot.</b> Keep this building and everything it gives you, then move the pin to wherever you actually walk every day - your house, your work. Tap <b>Move my base pin here</b> on the map when you are standing there. It costs 20 scrap and changes nothing else.</div>'
    +'<p class="help">So pick the building for its perk, and put the pin where your life already is.</p>'
    +'<button class="btn r wide" style="margin-top:10px" onclick="closeSheet()">Got it</button>',true);
}
function claimBase(confirmed){
  const loc=S.loc;if(!loc||!loc.cleared)return;
  if(S.base&&S.stock.scrap<20){toast('Moving base costs 20 scrap');return;}
  // Moving wipes every room you built. Twenty scrap is not the price - the
  // walls are - so the swap gets priced on screen before anything happens.
  if(!confirmed){moveBaseSheet();return;}
  // The missing braces here meant S.horde=null ran on EVERY claim, not just a
  // move - so changing address restarted the seven-day horde clock AND threw
  // away how many hordes you had survived, which is what makes them get harder.
  // The horde comes for YOU. It does not care that you changed address.
  if(S.base)S.stock.scrap-=20;
  S.work=null;
  const rooms={};
  if(loc.t==='pharmacy'||loc.t==='clinic')rooms.clinic=1;if(loc.t==='gas')rooms.generator=1;if(loc.t==='grocery')rooms.garden=1;
  if(loc.t==='police'){rooms.armory=1;rooms.walls=1;}if(loc.t==='hardware')rooms.walls=1;if(loc.t==='surplus'){rooms.armory=1;rooms.traps=1;}
  S.base={t:loc.t,e:loc.e,n:loc.n,district:district().n,rooms,claimed:Date.now()};
  if(loc.geo&&typeof STREET!=='undefined'&&STREET.pos){const p=STREET.pois.find(x=>x.id===loc.geo);S.base.geo={lat:p?p.lat:STREET.pos.lat,lon:p?p.lon:STREET.pos.lon};}
  loc.rooms.forEach(r=>r.done=true);
  log('You claimed '+loc.n+' as your base. '+(BASE_PERK[loc.t]||''));toast('Base claimed','a');SFX.play('win');
  save();render();leaveLoc();pushPlayer();
  // The building with the best perk is rarely the building you walk past every
  // day, and you have to be within 60 m of your base to stash. Those pull in
  // opposite directions - so say, at the one moment it matters, that they are
  // separable: the perk follows the BUILDING, the stash spot follows the PIN.
  if(S.base.geo&&typeof STREET!=='undefined'&&STREET.on)setTimeout(basePinOffer,500);
}
function defense(){if(!S.base)return 0;let d=0;for(const [k,l] of Object.entries(S.base.rooms)){if(!l)continue;d+=BUILD[k].def[l-1]||0;}d+=(S.base.rooms.walls||0)*(sk('framing')*3+sk('fortify')*2)+(S.base.rooms.traps||0)*sk('trapmaker')*2;return d;}
function buildCost(k){const b=BUILD[k];const l=S.base.rooms[k]||0;if(l>=b.lv)return null;let c=b.cost[l];const el=roleLvl('engineer');if(el)c=Math.round(c*(1-(0.15+el*0.05)));if(S.base.t==='hardware')c=Math.round(c*0.9);if(bg('engineer'))c=Math.round(c*0.9);if(bg('carpenter')&&(k==='walls'||k==='traps'))c=Math.round(c*0.8);return c;}
function buildLabor(k){const b=BUILD[k];const l=S.base.rooms[k]||0;if(l>=b.lv)return null;let n=b.labor[l];const el=roleLvl('engineer');if(el)n=Math.round(n*(1-(0.1+el*0.05)));if(bg('engineer'))n=Math.round(n*0.85);n=Math.round(n*(1-sk('efficient')*0.08));if(bg('carpenter')&&(k==='walls'||k==='traps'))n=Math.round(n*0.8);return n;}
function build(k){if(!S.base)return;if(S.work){toast('Finish '+BUILD[S.work.k].n+' first, or cancel it');return;}const c=buildCost(k);if(c===null)return;if(S.stock.scrap<c){toast('Need '+c+' scrap');return;}
  S.stock.scrap-=c;S.work={k,lvl:(S.base.rooms[k]||0)+1,need:buildLabor(k),done:0,scrap:c,started:Date.now()};log('Started on '+BUILD[k].n+' level '+S.work.lvl+'. '+fmt(S.work.need)+' steps of work to do.');toast(BUILD[k].n+': walk '+fmt(S.work.need)+' steps to finish it','a');SFX.play('ui');save();render();}
function cancelWork(){if(!S.work)return;const w=S.work;S.stock.scrap+=w.scrap;S.work=null;log('Stopped work on '+BUILD[w.k].n+'. Scrap refunded.');save();render();}
function workSteps(n){if(!S.work||!S.base)return;S.work.done+=n;if(S.work.done>=S.work.need){const w=S.work;S.work=null;S.base.rooms[w.k]=Math.max(S.base.rooms[w.k]||0,w.lvl);log('Built '+BUILD[w.k].n+' level '+w.lvl+'.');toast(BUILD[w.k].n+' L'+w.lvl+' finished','a');SFX.play('chest');pushPlayer();}}
function packPts(){return S.pack.reduce((a,b)=>a+b.pts,0);}
const runMult=()=>1+S.run*0.1;
function bank(){
  if(S.loc||S.combat){toast('Clear out first');return;}if(!S.pack.length){toast('Nothing to stash');return;}
  if(!S.base){toast('Claim a base first: clear a place, then Claim it');return;}
  if(typeof STREET!=='undefined'&&STREET.on&&S.base.geo&&STREET.pos){const d=geoDist(S.base.geo,STREET.pos);if(d>60){toast('Walk back to your base to stash: '+Math.round(d)+' m away','d');return;}}
  const raw=packPts();const qm=roleLvl('quartermaster');const pts=Math.round(raw*runMult()*TIERS[S.league.tier].mult*(1+(qm?0.08+qm*0.04:0)+sk('haggler')*0.05+sk('marathoner')*0.04)*dealMod('pts'));
  let meds=0;for(const it of S.pack){if(it.cat==='shelf')S.shelf.push({id:it.id,n:it.n,e:it.e});else if(it.cat==='candy')S.stock.candy=(S.stock.candy||0)+(it.qty||1);else if(it.cat==='ammo')S.stock.ammo+=(it.qty||0);else if(it.cat==='chest'){S.stock.chests=(S.stock.chests||0)+1;}else if(it.cat==='meds'){const id=MEDS[it.id]?it.id:'bandage';medsGive(id==='pain'?'pain':id,1);meds++;}
    else if(S.stock[it.cat]!==undefined){S.stock[it.cat]++;}}
  rollWeek();S.league.score+=pts;ctEvent('stash',pts);if(meds)ctEvent('meds',meds);
  let eat=activeCrew().length;if(sk('rationing'))eat=Math.ceil(eat/2);S.stock.food=Math.max(0,S.stock.food-eat);if(sk('harvest'))S.stock.food+=sk('harvest');
  S.hp=Math.min(maxHp(),S.hp+Math.max(15,Math.round(maxHp()*0.10)));if(roleLvl('medic'))S.hp=Math.min(maxHp(),S.hp+Math.max(20,Math.round(maxHp()*0.13)));
  if(S.base.rooms.clinic&&medsTotal()>0&&S.hp<maxHp()){medsTake(MED_ORDER.find(id=>medsHeld(id)>0));S.hp=maxHp();}
  log('Stashed '+fmt(raw)+' x'+runMult().toFixed(1)+' = '+fmt(pts)+' league points.'+(eat?' Crew ate '+eat+' food.':''));toast('+'+fmt(pts)+' league points','a');SFX.play('win');
  S.pack=[];S.run=0;save();render();pushPlayer();
}
function supplyDrop(){if(!S.base){toast('Claim a base first');return;}if(!S.base.rooms.radio){toast(S.work&&S.work.k==='radio'?'The radio is still being built. Keep walking.':'Build a Ham radio first (30 scrap + 3,000 steps).');return;}if(S.flags.dropDate===S.steps.date){toast('Already called in today. The next drop is after midnight.');return;}S.flags.dropDate=S.steps.date;const list=table(['food','water','meds','ammo'],0.3,0.4);const got=[];for(let i=0;i<3;i++){const it=wpick(list,'w');const item=it.gear?{id:it.id,n:it.n,e:it.e,pts:it.pts,cat:'gear',gear:true,r:it.r}:{id:it.id,n:it.n,e:it.e,pts:it.pts,cat:it.cat,qty:it.qty,uid:uid(),r:it.r};if(takeItem(item,null))got.push(it.e+' '+it.n);}log('Supply drop: '+got.join(', ')+'. In your pack.');SFX.play('chest');save();render();openSheet(`<h2>Supply drop</h2><div class="big">📦</div><p>It came down two streets over. In your pack now:<br><b style="color:var(--bone)">${esc(got.join(', ')||'nothing usable')}</b></p><button class="btn a wide" onclick="closeSheet()">Grab it</button>`);}
function buyCandy(id,c){S.stock.candy=S.stock.candy||0;if(S.cosmetics.includes(id)){toast('Already yours');return;}if(S.stock.candy<c){toast('Need '+c+' candy');return;}S.stock.candy-=c;S.cosmetics.push(id);SFX.play('legend');toast('Yours. Put it on under You.','l');save();render();}
const TRADE=[{id:'bandage',n:'Bandages',e:'🩹',c:10,give:s=>s.meds++},
  {id:'abx',n:'Antibiotics',e:'💉',c:25,give:()=>medsGive('abx',1)},
  {id:'kit',n:'Trauma kit',e:'🧰',c:45,give:()=>medsGive('kit',1)},
  {id:'adrena',n:'Adrenaline shot',e:'⚡',c:60,give:()=>medsGive('adrena',1)},
  {id:'bloodbag',n:'Blood bag',e:'🩸',c:90,give:()=>medsGive('bloodbag',1)},{id:'beans',n:'Canned food',e:'🥫',c:5,give:s=>s.food++},{id:'water',n:'Water bottle',e:'💧',c:5,give:s=>s.water++},{id:'ammo',n:'Box of rounds (x6)',e:'📦',c:12,give:s=>s.ammo+=6},{id:'key',n:'Chest key',e:'🗝️',c:25,give:()=>S.keys++}];
function trade(id){const t=TRADE.find(x=>x.id===id);if(!t)return;if(!S.base){toast('The trader only comes to a base');return;}let c=t.c;c=Math.max(1,Math.round(c*(1-sk('haggler')*0.1-sk('trader')*0.15)));if(S.stock.scrap<c){toast('Need '+c+' scrap');return;}S.stock.scrap-=c;t.give(S.stock);log('Bought '+t.n+' from the trader for '+c+' scrap.');toast(t.e+' '+t.n,'a');SFX.play('chest');save();render();}
function renderTrader(){const el=$('#trader');if(!el)return;if(!S.base){el.innerHTML='<p class="help">Claim a base first. The trader only stops where there are walls.</p>';return;}
  el.innerHTML=TRADE.map(t=>{let c=Math.max(1,Math.round(t.c*(1-sk('haggler')*0.1-sk('trader')*0.15)));return `<button class="tr${S.stock.scrap<c?' off':''}" onclick="trade('${t.id}')"><span class="e">${t.e}</span><b>${t.n}</b><span class="chip a">${c}🔩</span></button>`;}).join('');}
function heal(){
  if(S.hp>=maxHp()){toast('HP is full');return;}
  const have=medsAll();
  if(!have.length){toast('No meds anywhere');return;}
  const opts=[];
  for(const x of have){if(x.pack)opts.push({id:x.id,from:'pack',n:x.pack});if(x.stock)opts.push({id:x.id,from:'stock',n:x.stock});}
  if(opts.length===1){healWith(opts[0].id,opts[0].from);return;}   // nothing to choose between
  const missing=Math.max(0,maxHp()-S.hp);
  openSheet('<h2>Patch up</h2>'
    +'<div class="kv"><span>You are on</span><b>'+S.hp+' / '+maxHp()+'</b><span>Missing</span><b>'+missing+' HP</b></div>'
    +'<div class="stack" style="margin-top:10px">'
    +opts.map(o=>{const h=Math.min(medHeal(o.id),missing);const waste=medHeal(o.id)-h;
      return '<button class="room2" onclick="closeSheet();healWith(\''+o.id+'\',\''+o.from+'\')"><div class="e">'+MEDS[o.id].e+'</div>'
        +'<div class="t"><b>'+esc(MEDS[o.id].n)+'</b> <span class="chip s">'+o.n+(o.from==='pack'?' on you':' stashed')+'</span>'
        +'<span>+'+h+' HP'+(waste>0?' · '+waste+' of it wasted right now':'')+' · '+esc(MEDS[o.id].d)+'</span></div></button>';}).join('')
    +'</div><button class="btn ghost wide" style="margin-top:10px" onclick="closeSheet()">Not now</button>',true);
}
function healWith(id,from){
  if(S.hp>=maxHp()){toast('HP is full');return;}
  // default to the pack, because those are the ones a death takes off her
  if(!from)from=packMeds(id)>0?'pack':'stock';
  if(from==='pack'){
    const it=S.pack.find(x=>x.cat==='meds'&&(MEDS[x.id]?x.id:'bandage')===id);
    if(!it){toast('None left');return;}
    S.pack=S.pack.filter(x=>x!==it);
  }else{
    if(medsHeld(id)<1){toast('None left');return;}
    medsTake(id);
  }
  const h=medHeal(id);const was=S.hp;
  S.hp=Math.min(maxHp(),S.hp+h);
  if(id==='abx'&&S.infect){S.infect=null;S.infectStep=0;log('The antibiotics cleared the infection.');}
  toast('+'+(S.hp-was)+' HP ('+MEDS[id].n.toLowerCase()+')','a');SFX.play('loot');
  save();render();
}
function eat(){if(S.hp>=maxHp()){toast('HP is full');return;}if(S.stock.food<1){toast('No food in stash');return;}S.stock.food--;S.hp=Math.min(maxHp(),S.hp+Math.max(15,Math.round(maxHp()*0.08))+sk('comfortfood')*5+(bg('chef')?10:0)+(bg('farmer')?5:0));save();render();}
function equip(uidv){const g=S.gear.find(x=>x.uid===uidv);if(!g)return;
  if(g.broken&&S.eq[g.slot]!==uidv){toast(g.n+' is wrecked. Repairing it costs '+repairCost(g)+' scrap.','d');return;}
  S.eq[g.slot]=S.eq[g.slot]===uidv?null:uidv;SFX.play('ui');save();render();}
/* ================= REPAIR, ANYWHERE (v6.32) =================
   Repair used to need an armory room or the engineer role, so for most of the
   game a wrecked weapon just sat in the pack. Her words: "it feels like
   everything breaks." Now anyone can repair with scrap, wherever they are, and
   a repair always puts the weapon back to FULL - "+3 durability for 3 scrap"
   was never a sentence anyone could plan around.

   The bench (armory or engineer) is a HALF-PRICE discount now instead of a
   gate, so building one still pays. */
/* ================= THE WORKBENCH (v6.33) =================
   Upgrading what she owns, NOT a sixth way to get new weapons - the gacha
   already does acquisition, and a crafting bench that mints weapons would make
   cranking pointless.

   Her one condition was "don't make the game too easy", so the currency is
   PARTS, and parts come from exactly one place: breaking down gear. No amount
   of walking alone buys a +3 legendary. You have to feed gear to gear.

   And a temper reroll is a GAMBLE, not a ladder. Crude is a real downgrade and
   it is the most common result. Rerolling a good temper can genuinely cost you. */
const PART_YIELD={common:1,uncommon:2,rare:4,epic:8,legendary:15};
const PART_COST={common:[2,4,7],uncommon:[2,5,9],rare:[5,10,18],epic:[9,18,32],legendary:[10,20,36]};
const TEMPERS={
  crude:   {n:'Crude',    w:22, dmg:-0.10, dur:4,  d:'Ugly, but it lasts'},
  balanced:{n:'Balanced', w:20, dmg:0.05,  dur:2,  d:'A little of both'},
  sturdy:  {n:'Sturdy',   w:18, dmg:0,     dur:5,  d:'Takes a beating'},
  keen:    {n:'Keen',     w:16, dmg:0.18,  dur:-2, d:'Sharper. Wears out faster'},
  heavy:   {n:'Heavy',    w:12, dmg:0.12,  dur:0,  d:'Hits harder'},
  vicious: {n:'Vicious',  w:8,  dmg:0.10,  dur:0, twice:0.12, d:'12% chance to strike twice'},
  perfect: {n:'Perfect',  w:4,  dmg:0.25,  dur:3,  d:'Everything went right'},
};
const TEMPER_ORDER=['perfect','vicious','heavy','keen','sturdy','balanced','crude'];
function temperOdds(){const t=Object.values(TEMPERS).reduce((a,b)=>a+b.w,0);
  return TEMPER_ORDER.map(k=>[k,Math.round(TEMPERS[k].w/t*1000)/10]);}
function temperOf(g){return (g&&g.temper&&TEMPERS[g.temper])||null;}
// Effective numbers. The temper is never baked into g.dmg, because a reroll has
// to be able to take it back off cleanly.
function wDmg(g){
  if(!g||!g.dmg)return null;
  const t=temperOf(g);if(!t||!t.dmg)return g.dmg;
  return [Math.max(1,Math.round(g.dmg[0]*(1+t.dmg))),Math.max(2,Math.round(g.dmg[1]*(1+t.dmg)))];
}
function partsHave(){return S.parts||0;}
function partsFor(g,lvl){const tbl=PART_COST[g.r||'common']||PART_COST.common;return tbl[Math.min(2,lvl)]||0;}
function upgradeParts(g){
  let c=partsFor(g,(g.up||0));
  if(S.base&&S.base.rooms.forge)c=Math.ceil(c*0.6);   // the forge is a discount now, not a gate
  return Math.max(1,c);
}
function rerollScrap(g){return {common:8,uncommon:10,rare:16,epic:24,legendary:34}[g.r||'common'];}
function rerollParts(g){let c={common:2,uncommon:3,rare:5,epic:8,legendary:12}[g.r||'common'];
  if(S.base&&S.base.rooms.forge)c=Math.ceil(c*0.6);return Math.max(1,c);}
function rollTemper(){const tot=Object.values(TEMPERS).reduce((a,b)=>a+b.w,0);let r=Math.random()*tot;
  for(const k of Object.keys(TEMPERS)){r-=TEMPERS[k].w;if(r<=0)return k;}return 'balanced';}
function benchable(g){return !!(g&&(g.dmg||g.dr!==undefined||g.cap));}

/* What a repair costs is now derived from how hard the thing hits, not from the
   word printed on it. Her rule: "the better the legendary weapon, the more scrap
   it costs; if it's not as OP as the Old Reliable then make it cost less."
   A rarity label could not express that - Whisper and Mercy are both legendary
   and one does twice the damage of the other. Power can.
   Read from the BASE gear entry so the price is a property of the weapon you can
   learn, not something that drifts as you upgrade it. */
function gearPower(g){
  const base=GEAR[g.id]||g;
  if(base.dmg)return (base.dmg[0]+base.dmg[1])/2;
  if(base.dr!==undefined)return base.dr*4;
  if(base.cap)return base.cap*1.5;
  return 5;
}
function repairPer(g){return Math.max(1,Math.min(9,Math.round(gearPower(g)/5)));}
function atBench(){return !!((S.base&&S.base.rooms.armory)||roleLvl('engineer'));}
function repairMax(g){const base=(GEAR[g.id]&&GEAR[g.id].dur)||0;if(!base)return 0;
  const t=temperOf(g);return Math.max(1,base+(t?t.dur:0));}
function repairMissing(g){return Math.max(0,repairMax(g)-Math.max(0,g.dur||0));}
function repairCost(g){
  const miss=repairMissing(g);if(!miss)return 0;
  let c=miss*repairPer(g);
  if(atBench())c=c/2;
  c-=sk('tinkerer');if(bg('mechanic'))c-=Math.ceil(c*0.4);
  return Math.max(1,Math.ceil(c));
}
function repair(uidv){
  const g=S.gear.find(x=>x.uid===uidv);if(!g)return;
  if(!repairMax(g)){toast('Nothing to repair on that');return;}
  if(!repairMissing(g)){toast(g.n+' is already in good shape');return;}
  const c=repairCost(g);
  if(S.stock.scrap<c){toast('Need '+c+' scrap to fix the '+g.n+'. You have '+fmt(S.stock.scrap)+'.','d');return;}
  S.stock.scrap-=c;delete g.broken;g.dur=repairMax(g);
  log('Repaired the '+g.n+' for '+c+' scrap. Back to '+g.dur+' swings.');
  toast(g.n+' repaired · -'+c+' scrap','z');SFX.play('chest');
  save();render();
}
// Fix everything that needs it, cheapest first, until the scrap runs out.
function repairAll(){
  const list=S.gear.filter(g=>repairMax(g)&&repairMissing(g)).sort((a,b)=>repairCost(a)-repairCost(b));
  if(!list.length){toast('Nothing needs fixing');return;}
  let spent=0,n=0;
  for(const g of list){const c=repairCost(g);if(S.stock.scrap<c)break;S.stock.scrap-=c;delete g.broken;g.dur=repairMax(g);spent+=c;n++;}
  if(!n){toast('Not enough scrap for even the cheapest repair','d');return;}
  log('Repaired '+n+' piece'+(n===1?'':'s')+' for '+spent+' scrap.');
  toast('Repaired '+n+' · -'+spent+' scrap','z');SFX.play('chest');save();render();
}
let GEAR_TAB='all';function gearTab(k){GEAR_TAB=k;SFX.play('ui');render();}
const SALV={common:3,uncommon:6,rare:12,epic:20,legendary:35};
function salvageValue(g){const ws=S.base&&S.base.rooms.workshop||0;return Math.round((SALV[g.r||'common']||3)*(1+0.25*ws+0.15*sk('scrapper')+0.2*sk('appraiser')));}
function spareGear(){return S.gear.filter(g=>S.eq[g.slot]!==g.uid&&(g.r==='common'||g.r==='uncommon'||!g.r));}
function salvage(uidv){const g=S.gear.find(x=>x.uid===uidv);if(!g)return;const v=salvageValue(g);
  if(g.r==='legendary'||g.r==='epic'){if(!confirm('Break down your '+g.n+' ('+RAR[g.r].n+') for '+v+' scrap? It is gone for good.'))return;}
  const pp=PART_YIELD[g.r||'common']||1;
  S.gear=S.gear.filter(x=>x.uid!==uidv);for(const k in S.eq)if(S.eq[k]===uidv)S.eq[k]=null;
  S.stock.scrap+=v;S.parts=(S.parts||0)+pp;
  log('Salvaged the '+g.n+' for '+v+' scrap and '+pp+' part'+(pp===1?'':'s')+'.');
  toast('+'+v+' scrap · +'+pp+' parts','a');SFX.play('chest');save();render();}
function salvageAll(){const sp=spareGear();if(!sp.length)return;let v=0,pp=0;
  for(const g of sp){v+=salvageValue(g);pp+=PART_YIELD[g.r||'common']||1;}
  const ids=new Set(sp.map(g=>g.uid));S.gear=S.gear.filter(g=>!ids.has(g.uid));
  S.stock.scrap+=v;S.parts=(S.parts||0)+pp;
  log('Salvaged '+sp.length+' spare pieces for '+v+' scrap and '+pp+' parts.');
  toast('+'+v+' scrap · +'+pp+' parts','a');SFX.play('chest');save();render();}
const UPG_COST=[10,20,35];
function upgrade(uidv){
  const g=S.gear.find(x=>x.uid===uidv);if(!g||!benchable(g))return;
  const up=g.up||0;if(up>=3){toast('Fully upgraded');return;}
  const c=UPG_COST[up], pc=upgradeParts(g);
  if(S.stock.scrap<c){toast('Need '+c+' scrap');return;}
  if(partsHave()<pc){toast('Need '+pc+' parts. Salvage gear to get them - you have '+partsHave()+'.','d');return;}
  S.stock.scrap-=c;S.parts=partsHave()-pc;g.up=up+1;
  if(g.dmg){g.dmg=[g.dmg[0]+2,g.dmg[1]+2];}else if(g.dr!==undefined){g.dr+=1;}else if(g.cap){g.cap+=2;}
  log('Worked the '+g.n+' up to +'+g.up+' ('+c+' scrap, '+pc+' parts).');
  toast(g.n+' +'+g.up,'a');SFX.play('chest');save();render();
  if($('#modal').classList.contains('on'))benchSheet(uidv);
}
// Rerolling is the gamble. Crude is the single most likely result and it is a
// real downgrade, so a good temper is something you decide whether to risk.
function reroll(uidv){
  const g=S.gear.find(x=>x.uid===uidv);if(!g||!benchable(g))return;
  const sc=rerollScrap(g), pc=rerollParts(g);
  if(S.stock.scrap<sc){toast('Need '+sc+' scrap');return;}
  if(partsHave()<pc){toast('Need '+pc+' parts. Salvage gear to get them - you have '+partsHave()+'.','d');return;}
  const old=g.temper;
  if(old&&!confirm('Reroll the '+g.n+'? Its '+TEMPERS[old].n+' temper is gone whichever way this lands, and Crude is the most likely result.'))return;
  S.stock.scrap-=sc;S.parts=partsHave()-pc;
  g.temper=rollTemper();
  const t=TEMPERS[g.temper];
  if(g.dur!==undefined)g.dur=Math.min(g.dur,repairMax(g));   // a worse temper can shrink the bar
  const better=old&&TEMPER_ORDER.indexOf(g.temper)<TEMPER_ORDER.indexOf(old);
  log('Reworked the '+g.n+': '+t.n+'. '+t.d+'.');
  toast(g.n+' is now '+t.n+(old?(better?' - better than before':g.temper===old?' - the same again':' - worse than before'):''),
        g.temper==='perfect'?'l':better||!old?'a':'d');
  SFX.play(g.temper==='perfect'?'legend':'chest');
  save();render();
  if($('#modal').classList.contains('on'))benchSheet(uidv);
}
function benchSheet(uidv){
  const g=S.gear.find(x=>x.uid===uidv);if(!g)return;
  if(!benchable(g)){toast('Nothing to work on there');return;}
  const up=g.up||0, t=temperOf(g);
  const uc=UPG_COST[up], upc=upgradeParts(g);
  const rs=rerollScrap(g), rp=rerollParts(g);
  const dm=wDmg(g);
  const forge=!!(S.base&&S.base.rooms.forge);
  const stat=g.dmg?(dm[0]+'-'+dm[1]+' dmg'+(t&&t.dmg?' <span class="help">('+(t.dmg>0?'+':'')+Math.round(t.dmg*100)+'% from '+esc(t.n)+')</span>':''))
    :g.dr!==undefined?('-'+g.dr+' damage taken'):('+'+g.cap+' carry');
  openSheet('<h2>Workbench</h2>'
    +'<div class="kv" style="margin-top:6px"><span>'+esc(g.e+' '+g.n)+'</span><b class="rc-'+esc(g.r||'common')+'">'+esc(RAR[g.r||'common'].n)+(up?' +'+up:'')+'</b>'
      +'<span>Now</span><b>'+stat+'</b>'
      +(repairMax(g)?'<span>Durability</span><b>'+Math.max(0,g.dur||0)+' / '+repairMax(g)+'</b>':'')
      +'<span>Temper</span><b>'+(t?esc(t.n)+' <span class="help">'+esc(t.d)+'</span>':'<span class="help">none yet</span>')+'</b>'
      +'<span>Your parts</span><b>'+partsHave()+'</b><span>Your scrap</span><b>'+fmt(S.stock.scrap)+'</b></div>'
    +'<div class="section-label" style="margin-top:12px">Work it up</div>'
    +'<p class="help">'+(up>=3?'This is as far as it goes.':'+2 damage (or +1 armor, +2 carry) a level, three levels. Parts only come from breaking down gear.')+'</p>'
    +(up>=3?'':'<button class="btn r wide" style="margin-top:6px" onclick="upgrade(\''+g.uid+'\')"'
        +((S.stock.scrap<uc||partsHave()<upc)?' disabled':'')+'>To +'+(up+1)+' · '+uc+'🔩 · '+upc+' parts</button>')
    +'<div class="section-label" style="margin-top:14px">Rework the temper</div>'
    +'<p class="help">A gamble, not a ladder. Whatever it has now is gone, and these are the real odds:</p>'
    +'<div style="display:flex;flex-direction:column;gap:2px;margin:6px 0">'
    +temperOdds().map(([k,pct])=>{const x=TEMPERS[k];const cur=g.temper===k;
      return '<div style="display:flex;gap:8px;padding:4px 8px;border-radius:6px;background:rgba(255,255,255,'+(cur?'.09':'.04')+')">'
        +'<b style="width:74px'+(k==='perfect'?';color:var(--amber)':k==='crude'?';color:#ff8a92':'')+'">'+esc(x.n)+'</b>'
        +'<span class="help" style="flex:1">'+esc(x.d)+'</span>'
        +'<span class="help">'+pct+'%</span>'+(cur?'<span class="chip a">now</span>':'')+'</div>';}).join('')
    +'</div>'
    +'<button class="btn wide" onclick="reroll(\''+g.uid+'\')"'+((S.stock.scrap<rs||partsHave()<rp)?' disabled':'')+'>'
      +(g.temper?'Rework':'Temper it')+' · '+rs+'🔩 · '+rp+' parts</button>'
    +'<p class="help" style="margin-top:8px">'+(forge?'Your forge is cutting the parts cost by 40%.':'A Forge at your base cuts the parts cost by 40%.')+'</p>'
    +'<button class="btn ghost wide" style="margin-top:10px" onclick="closeSheet()">Done</button>',true);
}
function dropGear(uidv){S.gear=S.gear.filter(x=>x.uid!==uidv);for(const k in S.eq)if(S.eq[k]===uidv)S.eq[k]=null;save();render();}
function toggleCrew(id){const i=S.active.indexOf(id);if(i>=0)S.active.splice(i,1);else{const c=S.crew.find(x=>x.id===id);if(c&&c.hp!==undefined&&c.hp<=0){toast('They are down. Patch them up first.','d');return;}if(S.active.length>=crewSlots()){toast('No free slot. Build a bunkhouse.');return;}S.active.push(id);}save();render();}
function shopItems(){const out=[];for(const [k,v] of Object.entries(ART.HAIR_SHOP))out.push({id:'hair:'+k,slot:'hair',key:k,n:v.n,c:v.c,r:v.c>=12000?'epic':'rare'});for(const [k,v] of Object.entries(ART.EYES_SHOP))out.push({id:'eyes:'+k,slot:'eyes',key:k,n:v.n,c:v.c,r:'epic'});for(const [k,v] of Object.entries(ART.HATS))if(v.c)out.push({id:'hat:'+k,slot:'hat',key:k,n:v.n,c:v.c,r:v.r});for(const [k,v] of Object.entries(ART.TOPS))if(v.c)out.push({id:'top:'+k,slot:'top',key:k,n:v.n,c:v.c,r:v.r});for(const [k,v] of Object.entries(ART.ACCS))if(v.c)out.push({id:'acc:'+k,slot:'acc',key:k,n:v.n,c:v.c,r:v.r});return out;}
function owns(slot,key){if(!key)return true;if(slot==='hair'&&ART.HAIR_STYLES.includes(key))return true;if(slot==='eyes'&&ART.EYES.includes(key))return true;if(slot==='top'&&key==='hoodie')return true;return S.cosmetics.includes(slot+':'+key);}
function tryOn(id){const it=shopItems().find(x=>x.id===id);if(!it)return;const av=Object.assign({},S.av);av[it.slot]=it.key;const owned=S.cosmetics.includes(id);const can=(S.wallet||0)>=it.c;
  openSheet(`<h2>${esc(it.n)}</h2><div style="text-align:center">${ART.avatarSVG(av,130)}</div><p style="text-align:center"><span class="rc-${it.r}">${RAR[it.r].n}</span> · ${owned?'yours':fmt(it.c)+' steps'}<br><span class="help">Wallet: ${fmt(S.wallet||0)} steps</span></p><div class="grid2"><button class="btn" onclick="closeSheet()">Back</button>${owned?`<button class="btn r" onclick="wear('${it.slot}','${it.key}');closeSheet()">Wear it</button>`:`<button class="btn a" onclick="buyLook('${id}')" ${can?'':'disabled'}>${can?'Buy for '+fmt(it.c):'Walk '+fmt(it.c-(S.wallet||0))+' more'}</button>`}</div>`);}
function buyLook(id){const it=shopItems().find(x=>x.id===id);if(!it||S.cosmetics.includes(id))return;if((S.wallet||0)<it.c){toast('Not enough steps yet');return;}S.wallet-=it.c;S.cosmetics.push(id);S.av[it.slot]=it.key;SFX.play('legend');log('Unlocked '+it.n+' for '+fmt(it.c)+' steps.');toast(it.n+' unlocked and on','l');save();closeSheet();render();pushPlayer();}
// render() runs on every batch of steps, and it redrew EVERY screen - including
// the Boutique's 71 cosmetics, each with its own SVG - while she was looking at
// the map. Measured at 3.65ms a call on a desktop, 30 times per 3,000 steps.
// A panel nobody is looking at does not need redrawing; the nav re-renders on
// switch, so whatever she opens is fresh.
function offscreen(sel){const el=$(sel);const v=el&&el.closest('.view');return !!(v&&!v.classList.contains('on'));}
function renderShop(){if(offscreen('#shop'))return;const el=$('#shop');if(!el)return;$('#walletSub').textContent=fmt(S.wallet||0)+' steps to spend';const items=shopItems();const groups=[['hair','Hairstyles'],['eyes','Eyes'],['hat','Hats'],['top','Outfits'],['acc','Accessories']];
  el.innerHTML=groups.map(([slot,label])=>`<div class="section-label" style="margin-top:8px">${label}</div><div class="shopgrid">${items.filter(i=>i.slot===slot).map(it=>{const av=Object.assign({},S.av);av[it.slot]=it.key;const owned=S.cosmetics.includes(it.id);return `<button class="shopit${owned?' own':''}" onclick="tryOn('${it.id}')">${ART.avatarSVG(av,54)}<b class="rc-${it.r}">${esc(it.n)}</b><span>${owned?'owned':fmt(it.c)}</span></button>`;}).join('')}</div>`).join('');}
function wear(slot,key){if(!owns(slot,key))return;S.av[slot]=key;save();render();}

/* ================= raids (real clock) ================= */
function stockValue(){return S.stock.food*5+S.stock.water*5+medsTotal()*10+S.stock.scrap*4+S.stock.ammo*3;}
function checkRaids(){
  if(!S.base)return;const t=todayStr();if(S.flags.lastRaidCheck===t)return;
  const rng=mulberry(hash(t+'raid'+S.created));
  const daysSince=Math.floor((Date.now()-S.base.claimed)/86400000);
  if(daysSince<1){S.flags.lastRaidCheck=t;return;}
  let odds=0.18+Math.min(0.4,stockValue()/600)+S.league.tier*0.05;
  if(S.base.rooms.generator)odds*=(S.base.rooms.generator>=2?0.55:0.7)*(1-sk('gennie')*0.05);if(S.base.t==='stronghold')odds*=1.4;if(S.campCleared===weekId())odds*=0.5;
  const hour=8+Math.floor(rng()*13);const now=new Date();
  if(rng()<odds){const power=Math.round((10+rng()*20+S.league.tier*6+daysSince*0.5+(S.bossKills||0)*2)*dealMod('raid'));
    if(now.getHours()>=hour){resolveRaid(power,hour,t);S.flags.lastRaidCheck=t;}
    else{S.raidPending={date:t,hour,power};}
  }else S.flags.lastRaidCheck=t;
}
function resolveRaid(power,hour,date){
  const def=defense();let stolen={};let repelled=def>=power;
  if(S.base.rooms.traps&&Math.random()<0.3){power=Math.round(power*0.7);repelled=def>=power;}
  if(!repelled){let frac=clamp((power-def)/power*0.6,0.1,0.6);const vl=S.base.rooms.vault||0;if(vl)frac*=vl>=2?0.2:0.5;frac*=1-sk('boards')*0.1;for(const k of ['food','water','meds','scrap','ammo']){const n=Math.floor(S.stock[k]*frac);if(n){S.stock[k]-=n;stolen[k]=n;}}
    if(S.base.rooms.walls&&Math.random()<0.5){S.base.rooms.walls--;stolen.walls=1;}}
  const entry={t:date+' '+String(hour).padStart(2,'0')+':00',power,def,repelled,stolen};
  S.raids.unshift(entry);S.raids=S.raids.slice(0,12);S.raidPending=null;
  log(repelled?'Raiders hit the base at '+hour+':00 and your defenses held ('+def+' vs '+power+').':'Raiders broke in at '+hour+':00 ('+power+' vs your '+def+') and took '+Object.entries(stolen).map(([k,v])=>v+' '+k).join(', ')+'.');
  toast(repelled?'Raid repelled':'Base raided','d');
}
function resolveRaidFight(won){if(!S.raidPending)return;const p=S.raidPending;S.raids.unshift({t:p.date+' '+String(p.hour).padStart(2,'0')+':00',power:p.power,def:defense(),repelled:true,stolen:{},fought:true});S.raidPending=null;S.flags.lastRaidCheck=p.date;log('You held the base yourself. Raiders driven off.');addXp(30);S.stock.scrap+=rint(4,10);}
/* ================= horde night (every 7 days) ================= */
function hordeAt(fromMs){const d=new Date(fromMs);d.setHours(21,0,0,0);d.setDate(d.getDate()+7);return d.getTime();}
function hordeState(){if(!S.base)return null;if(!S.horde||!S.horde.next){let nx=hordeAt(S.base.claimed||Date.now());while(nx<Date.now())nx=hordeAt(nx);S.horde={n:0,next:nx,pending:false};}return S.horde;}
function hordePower(){const h=hordeState();return Math.round((28+12*(h?h.n:0)+S.walk.district*10+S.league.tier*5)*dealMod('raid'));}
function hordeDefense(){return defense()+activeCrew().length*3+(S.base&&S.base.rooms.bell?activeCrew().length*2:0);}
function resolveHorde(fought,won){const h=hordeState();if(!h)return;const power=hordePower();const def=hordeDefense();const repelled=fought?won:def>=power;const stolen={};
  if(!repelled){let frac=clamp((power-Math.max(0,fought?def*0.5:def))/power*0.8,0.25,0.7);const vl=S.base.rooms.vault||0;if(vl)frac*=vl>=2?0.2:0.5;frac*=1-sk('boards')*0.1;
    for(const k of ['food','water','meds','scrap','ammo']){const n=Math.floor(S.stock[k]*frac);if(n){S.stock[k]-=n;stolen[k]=n;}}
    if(S.base.rooms.walls){S.base.rooms.walls--;stolen.walls=1;}if(S.base.rooms.traps&&Math.random()<0.5){S.base.rooms.traps--;stolen.traps=1;}}
  else if(fought){S.stock.scrap+=25;S.keys++;addXp(40);}
  S.raids.unshift({t:todayStr()+' 21:00',power,def,repelled,stolen,fought,by:'Horde night '+(h.n+1)});S.raids=S.raids.slice(0,12);
  log(repelled?(fought?'You held the walls against horde night '+(h.n+1)+' yourself. +25 scrap, +1 key.':'Horde night '+(h.n+1)+': '+def+' defense against '+power+'. The walls held.'):'Horde night '+(h.n+1)+' broke through ('+power+' vs '+def+') and took '+Object.entries(stolen).map(([k,v])=>v+' '+k).join(', ')+'.');
  toast(repelled?'Horde repelled':'The horde broke in','d');if(!repelled)SFX.play('hurt');else SFX.play('win');
  h.n++;h.next=hordeAt(h.next);h.pending=false;save();render();}
function fightHorde(){gearCheck(()=>{const h=hordeState();const n=Math.min(6,4+Math.floor(h.n/2));const en=[];for(let i=0;i<n;i++)en.push(mk(i===n-1?'bloater':i%3===2?'runner':i===1&&h.n>=2?'screamer':'walker'));startCombat(en,'horde');});}
function hordeTick(){const h=hordeState();if(!h)return;if(Date.now()<h.next)return;
  if(document.visibilityState==='visible'&&!S.combat&&!S.loc&&!$('#modal').classList.contains('on')){h.pending=true;save();
    openSheet(`<h2>Horde night</h2><div class="big">${ART.zombieSVG('walker',60)}${ART.zombieSVG('runner',60)}${ART.zombieSVG('bloater',60)}</div><p>Day ${7*(h.n+1)}. They come every seven days and they come all at once. Your walls: <b>${hordeDefense()}</b> vs the horde's <b>${hordePower()}</b>. Fight at the gate, or let the walls decide. Lose and they take the stockpile.</p><div class="grid2"><button class="btn" onclick="closeSheet();resolveHorde(false)">Let the walls decide</button><button class="btn r" onclick="closeSheet();fightHorde()">Fight at the gate</button></div>`);}
  else if(document.visibilityState!=='visible'||Date.now()-h.next>6*3600000){resolveHorde(false);}}
function hordeCountdown(){const h=hordeState();if(!h)return '';const ms=h.next-Date.now();if(ms<=0)return 'Horde night is here.';const d=Math.floor(ms/86400000),hr=Math.floor(ms%86400000/3600000);const dt=new Date(h.next);return 'Horde night '+(h.n+1)+' in '+(d?d+'d ':'')+hr+'h ('+['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][dt.getDay()]+' 9pm) · they bring '+hordePower()+', you have '+hordeDefense()+'.';}
function raidTick(){
  if(!S.raidPending)return;const p=S.raidPending;const now=new Date();
  if(todayStr()!==p.date){resolveRaid(p.power,p.hour,p.date);S.flags.lastRaidCheck=todayStr();save();return;}
  if(now.getHours()>=p.hour){ if(document.visibilityState==='visible'&&!S.combat&&!S.loc&&!$('#modal').classList.contains('on')){openSheet(`<h2>Raiders at the walls</h2><div class="big">${ART.zombieSVG('raider',70)}${ART.zombieSVG('gunner',70)}</div><p>A crew of ${p.power>25?'six':p.power>18?'four':'three'} is coming over the fence. Your defenses: ${defense()} vs their ${p.power}. Fight them yourself, or let the walls decide.</p><div class="grid2"><button class="btn" onclick="closeSheet();resolveRaid(${p.power},${p.hour},'${p.date}');S.flags.lastRaidCheck='${p.date}';save();render()">Let the walls hold</button><button class="btn d" onclick="closeSheet();fightRaid()">Fight</button></div>`,true);}
    else if(document.visibilityState!=='visible'){resolveRaid(p.power,p.hour,p.date);S.flags.lastRaidCheck=p.date;save();}}
}
function fightRaid(){gearCheck(()=>{const p=S.raidPending;const n=p.power>25?4:p.power>18?3:2;const en=[];for(let i=0;i<n;i++)en.push(mk(i===0&&p.power>22?'gunner':'raider'));startCombat(en,'raid');});}

/* ================= league ================= */
function rivalScore(r,week,now,tier){const start=new Date(week+'T00:00:00');const rng=mulberry(hash(week+r.id));const mult=TIERS[tier].mult;let total=0;
  for(let d=0;d<7;d++){const el=(now.getTime()-(start.getTime()+d*86400000))/86400000;if(el<=0)break;const pace=r.pace[d]*(0.85+rng()*0.35);const f=clamp((el-0.29)/0.63,0,1);total+=pace*f*PTS_PER_STEP*mult*(1+0.1*rng());}return Math.round(total);}
function board(){const now=new Date();const rows=RIVALS.map(r=>({id:r.id,n:r.n,av:r.av,s:rivalScore(r,S.league.week,now,S.league.tier),blurb:r.blurb}));rows.push({id:'me',n:S.name||'You',av:S.av,s:S.league.score,me:true});return rows.sort((a,b)=>b.s-a.s);}
function radioLines(){const now=new Date();const lines=[];const rng=mulberry(hash(S.league.week+todayStr()));const hrs=clamp(Math.floor((now.getHours()-7)/3),0,4);
  const verbs=['cleared a pharmacy on','fought off raiders near','stashed a big haul from','lost a man at','found a shotgun in','burned a camp under','got chased off'];const places=['Maple St','the strip mall','Old Town','the marina','Hospital Row','the overpass','5th and Pine','the rail yard'];
  for(let i=0;i<=hrs;i++){const r=RIVALS[Math.floor(rng()*3)];lines.push({t:'~'+String(8+i*3).padStart(2,'0')+':00',m:r.n+' '+verbs[Math.floor(rng()*verbs.length)]+' '+places[Math.floor(rng()*places.length)]+'.'});}
  lines.push({t:'WANTED',m:bossName()+' is holed up in a stronghold this week: '+(GIMMICK_TEXT[BOSS_GIMMICK[bossName()]]||'')+'. Bounty: a key, a trophy, and a shot at a legendary.'});
  if(S.base&&S.base.rooms.radio){const b=board().filter(x=>!x.me);lines.unshift({t:'LIVE',m:b[0].n+' leads the rivals with '+fmt(b[0].s)+' pts. '+(RIVALS.find(r=>r.id===b[0].id)||{}).blurb});}
  return lines.reverse();}

/* ================= contracts ================= */
const CT_TYPES={steps:{n:'Walk',u:'steps'},places:{n:'Clear places',u:'places'},kills:{n:'Put down hostiles',u:'kills'},rooms:{n:'Search rooms',u:'rooms'},stash:{n:'Stash points',u:'pts'},meds:{n:'Bring meds home',u:'meds'},chests:{n:'Open chests',u:'chests'},stronghold:{n:'Clear a stronghold',u:''},bounty:{n:'Claim the bounty',u:''},boss:{n:'Damage the Wanted boss',u:'dmg'}};
function makeDaily(date){const rng=mulberry(hash(date+'daily'));const pool=[{t:'steps',g:[4000,5000,6000,8000]},{t:'places',g:[2,3,4]},{t:'kills',g:[4,6,8,10]},{t:'rooms',g:[6,8,12]},{t:'stash',g:[150,250,400]},{t:'meds',g:[2,3,5]}];const out=[];const used=new Set();
  while(out.length<3){const p=pool[Math.floor(rng()*pool.length)];if(used.has(p.t))continue;used.add(p.t);const goal=p.g[Math.floor(rng()*p.g.length)];out.push({id:date+'-'+p.t,t:p.t,goal,n:0,done:false,reward:{scrap:6+Math.floor(rng()*8),xp:30+Math.floor(rng()*30),key:out.length===0&&rng()<0.5?1:0}});}
  return out;}
function makeWeekly(week){const rng=mulberry(hash(week+'weekly'));return {id:week,goals:[{t:'steps',goal:30000+Math.floor(rng()*3)*5000,n:0},{t:'kills',goal:30,n:0},{t:'bounty',goal:1,n:0}],done:false,reward:{key:1,cosmetic:1,pts:200}};}
const DEALS=[
 {id:'ammo',who:'Nadia',t:'A crate of ammo',txt:'"Six rounds and a bag of scrap, no charge. My people will be by later this week to see how you are doing with it."',take:'+6 rounds and +15 scrap now. Raids hit 40% harder all week.',refuse:'Marisol vouches for you: stash points +10% all week.',mods:{take:{raid:1.4},refuse:{pts:1.1}},give:s=>{s.stock.ammo+=6;s.stock.scrap+=15;}},
 {id:'meds',who:'The Tolls',t:'Medicine, for a cut',txt:'"Three doses of the good stuff. In return, a fifth of whatever you bring home this week goes through our checkpoint."',take:'+3 meds now. Stash points -20% all week.',refuse:'The Tolls send their boss out looking for you instead: county boss HP -15% this week.',mods:{take:{pts:0.8},refuse:{bossHp:0.85}},give:s=>{s.stock.meds+=3;}},
 {id:'key',who:'A stranger',t:'A key, for a name',txt:'"I have a chest key. It is yours if I can tell the Tolls which roads you walk."',take:'+1 chest key now. Road ambushes twice as likely all week.',refuse:'You keep your head down: +1 watch job per day this week.',mods:{take:{road:2},refuse:{watch:1}},give:s=>{s.keys++;}}
];
function dealFor(week){return DEALS[Math.abs(hash(week+'deal'))%DEALS.length];}
function dealChoice(){return (S.deals||{})[weekId()]||null;}
function dealMod(k){const c=dealChoice();const d=c&&DEALS.find(x=>x.id===c.id);const m=d?(d.mods[c.choice]||{}):{};if(k==='watch')return m.watch||0;return m[k]||1;}
function takeDeal(choice){const w=weekId();if(S.deals[w])return;const d=dealFor(w);S.deals[w]={id:d.id,choice};if(choice==='take')d.give(S);log('Radio: you '+(choice==='take'?'took':'refused')+' '+d.who+"'s offer ("+d.t+').');SFX.play(choice==='take'?'chest':'ui');save();render();}
function renderDeal(){const el=$('#dealBox');if(!el)return;const d=dealFor(weekId());const c=dealChoice();
  el.innerHTML=`<div class="dealbox"><b>${esc(d.who)}: ${esc(d.t)}</b><p style="margin:6px 0">${esc(d.txt)}</p>${c?`<p class="help">You ${c.choice==='take'?'took it':'refused'}. ${esc(c.choice==='take'?d.take:d.refuse)} New offer Monday.</p>`:`<div class="grid2"><button class="btn a" onclick="takeDeal('take')">Take it</button><button class="btn ghost" onclick="takeDeal('refuse')">Refuse</button></div><p class="help" style="margin-top:6px">Take: ${esc(d.take)}<br>Refuse: ${esc(d.refuse)}</p>`}</div>`;}
function storyCheck(){if(!S.story)S.story=[];for(const s of STORY){if(!S.story.includes(s.id)&&s.need(S)){S.story.push(s.id);log('Radio: '+s.t+'.');toast('📻 New radio message: '+s.t,'a');if(S.story.length>1)SFX.play('rare');}}}
function ctRoll(){const t=todayStr(),w=weekId();if(S.ct.date!==t){S.ct.date=t;S.ct.daily=makeDaily(t);}if(S.ct.week!==w){S.ct.week=w;S.ct.weekly=makeWeekly(w);}}
/* ================= seasons ================= */
// The people who walk most had run out of things to get: the streak track ended
// at day 30, the daily step ladder ended at 20,000, and the cosmetics are a
// finite pile. A season is the fix that keeps working - it rotates, so there is
// always a next thing, without a new system being invented every month.
//
// A season is derived from the CALENDAR, exactly like raid windows, so every
// friend is in the same season with no server involved.
const SEASONS=[
  {id:'ash',    n:'Ash Fall',      e:'🌫️', d:'The sky has not been clean for weeks.'},
  {id:'thaw',   n:'The Thaw',      e:'💧', d:'The ice lets go, and so does everything under it.'},
  {id:'green',  n:'Overgrowth',    e:'🌿', d:'The county is taking itself back.'},
  {id:'dust',   n:'Dry Season',    e:'🌵', d:'Every street is a wind tunnel.'},
  {id:'rust',   n:'Rust Month',    e:'🔩', d:'Everything metal is giving up at once.'},
  {id:'dark',   n:'Long Nights',   e:'🌑', d:'It is dark before you get home.'},
];
function seasonKey(d){d=d||new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');}
function seasonNow(d){d=d||new Date();return SEASONS[(d.getFullYear()*12+d.getMonth())%SEASONS.length];}
function seasonEnds(d){d=d||new Date();return new Date(d.getFullYear(),d.getMonth()+1,1);}
function seasonDaysLeft(d){d=d||new Date();return Math.max(0,Math.ceil((seasonEnds(d)-d)/86400000));}

// Ten rungs. The numbers are set so a steady walker who plays most days finishes
// near the end of the month and a very heavy walker still cannot finish in a
// week - see SEASON_DAILY_CAP.
const SEASON_TIERS=[
  {p:60,   n:'2 chest keys',        give:s=>{s.keys+=2;}},
  {p:150,  n:'40 scrap',            give:s=>{s.stock.scrap+=40;}},
  {p:280,  n:'the season hat',      give:s=>{seasonCosmetic('hat');}},
  {p:450,  n:'3 chest keys',        give:s=>{s.keys+=3;}},
  {p:660,  n:'300 league points',   give:s=>{s.league.score+=300;}},
  {p:900,  n:'the season jacket',   give:s=>{seasonCosmetic('top');}},
  {p:1200, n:'4 chest keys + 80 scrap', give:s=>{s.keys+=4;s.stock.scrap+=80;}},
  {p:1550, n:'a skill point',       give:s=>{s.sp+=1;}},
  {p:1950, n:'the season charm',    give:s=>{seasonCosmetic('acc');}},
  {p:2400, n:'THE SEASON LEGENDARY',give:s=>{dropLegendQuiet();}},
];
// A day's play can only move you so far up the track. Without this a friend who
// walks 30,000 a day clears the whole season in four days and is bored again.
const SEASON_DAILY_CAP=110;
function seasonState(){
  const k=seasonKey();
  if(!S.season||S.season.k!==k){
    const past=(S.season&&S.season.k)?{k:S.season.k,pts:S.season.pts,tiers:(S.season.claimed||[]).length}:null;
    S.seasonPast=(S.seasonPast||[]).concat(past?[past]:[]).slice(-12);
    S.season={k,pts:0,claimed:[],day:'',dayPts:0};
  }
  const f=S.season;
  if(f.day!==todayStr()){f.day=todayStr();f.dayPts=0;}
  return f;
}
function seasonAdd(n,why){
  if(!(n>0))return 0;
  const f=seasonState();
  const room=Math.max(0,SEASON_DAILY_CAP-(f.dayPts||0));
  const got=Math.min(room,Math.round(n));
  if(got<=0)return 0;
  f.dayPts+=got;f.pts+=got;
  const ready=SEASON_TIERS.filter((t,i)=>f.pts>=t.p&&!f.claimed.includes(i));
  if(ready.length){const b=$('#seasonCard');if(b)b.classList.add('ready');}
  return got;
}
// Tiff walks ~21,000 a day and finishes the ten rungs around day 22 - which
// would leave her with nine empty days, the exact problem seasons were meant to
// fix. Past the last rung the track keeps paying, forever, at a steeper price.
const SEASON_OVERFLOW=240;
function seasonSurplus(){const f=seasonState();const top=SEASON_TIERS[SEASON_TIERS.length-1].p;
  return Math.max(0,f.pts-top);}
function seasonOverflowDue(){
  const f=seasonState();
  if(f.claimed.length<SEASON_TIERS.length)return 0;      // finish the track first
  return Math.floor(seasonSurplus()/SEASON_OVERFLOW)-(f.over||0);
}
function seasonClaimOverflow(){
  const f=seasonState();const n=seasonOverflowDue();
  if(n<=0){toast('Nothing over the top yet');return;}
  f.over=(f.over||0)+n;
  S.keys+=2*n;S.stock.scrap+=50*n;
  const legend=Math.random()<0.2*n;
  if(legend)dropLegendQuiet();
  log('Over the top '+(f.over)+': +'+(2*n)+' keys, +'+(50*n)+' scrap'+(legend?', and a legendary':'')+'.');
  toast('Over the top x'+f.over,'l');SFX.play('legend');save();render();
}
function seasonTierReady(){const f=seasonState();return SEASON_TIERS.map((t,i)=>i).filter(i=>f.pts>=SEASON_TIERS[i].p&&!f.claimed.includes(i));}
function seasonClaim(i){
  const f=seasonState();const t=SEASON_TIERS[i];
  if(!t||f.claimed.includes(i)||f.pts<t.p){toast('Not yet');return;}
  f.claimed.push(i);t.give(S);
  log('Season reward: '+t.n+'.');toast(t.n,'l');SFX.play('legend');save();render();
}
function seasonClaimAll(){const r=seasonTierReady();if(!r.length){toast('Nothing ready yet');return;}for(const i of r)seasonClaim(i);}
// Season cosmetics are the same art, tagged with the season, so a friend can see
// WHICH season you were walking in. They are only obtainable that month.
function seasonCosmetic(slot){
  const pool=cosmeticPool().filter(c=>c.slot===slot&&!S.cosmetics.includes(c.id));
  const c=pool.length?pick(pool):null;
  if(!c){S.stock.scrap+=60;log('Nothing new in that slot, so 60 scrap instead.');return;}
  S.cosmetics.push(c.id);
  S.seasonWorn=(S.seasonWorn||{});S.seasonWorn[c.id]=seasonNow().id;
  log('Season reward: '+c.n+'.');
}
function seasonBadge(id){const k=(S.seasonWorn||{})[id];const sn=SEASONS.find(x=>x.id===k);return sn?sn.e:'';}

// How much of the season track each thing is worth. Walking alone cannot finish
// a season - you have to actually play - and playing without walking cannot
// either, because places and raids come from being out there.
const SEASON_WORTH={steps:0.004,places:6,kills:0.8,rooms:1.2,chests:10,stash:0.01,meds:2,stronghold:25,bounty:20,boss:0.05};
function ctEvent(type,n){
  if(SEASON_WORTH[type])try{seasonAdd(n*SEASON_WORTH[type]);}catch(e){}
  if(!S.ct)return;ctRoll();
  for(const c of S.ct.daily){if(c.t===type&&!c.done){c.n+=n;if(c.n>=c.goal){c.done=true;if(bg('gamer'))c.reward.scrap=Math.round(c.reward.scrap*1.25);S.stock.scrap+=c.reward.scrap;addXp(c.reward.xp);if(c.reward.key)S.keys+=c.reward.key;log('Contract done: '+CT_TYPES[c.t].n+' '+c.goal+'. +'+c.reward.scrap+' scrap, +'+c.reward.xp+' XP'+(c.reward.key?', +1 key':'')+'.');toast('Contract done: +'+c.reward.scrap+' scrap','a');SFX.play('chest');}}}
  if(type==='kills'||type==='places'){if(S.today.date!==todayStr())S.today={date:todayStr(),kills:0,places:0};S.today[type]+=n;}
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
async function goOnline(handle,token){
  const o=O();handle=slug(handle||S.name);if(!handle){toast('Pick a handle first');return;}
  if(token&&token.trim())o.token=token.trim();if(!o.token)o.token=uid()+uid()+uid();
  try{const ok=await rpc('register_player',{p_handle:handle,p_token:o.token,p_name:S.name||handle});
    if(!ok){o.ok=false;o.err='The handle "'+handle+'" is already registered. If it is yours from another browser, paste that browser\'s account key below. Otherwise pick another handle.';toast(o.err,'d');save();render();return;}
    o.handle=handle;o.ok=true;o.err='';identWrite(handle,o.token);log('Online as @'+handle+'.');toast('Online as @'+handle,'z');save();render();
    if(token&&token.trim()){try{const b=await rpc('get_base',{p_handle:handle});const cs=b&&b.public&&b.public.save;
      if(cs&&cs.onboarded){const cloudAt=cs.savedAt||0;const localAt=S.savedAt||0;const localNewer=S.onboarded&&(localAt>cloudAt+60000||(S.steps&&S.steps.total)>((cs.steps&&cs.steps.total)||0));
        if(!S.onboarded){const keep=S.online;S=Object.assign(fresh(),cs);S.online=keep;S.combat=false;S.journal=[];ensureState();log('Brought your character back from the server.');save();closeSheet();render();toast('Welcome back, '+(S.name||handle),'z');identWrite(handle,o.token);pushPlayer();return;}
        openSheet(`<h2>Found your save</h2><div class="big">${ART.avatarSVG(cs.av||S.av,70)}</div><p><b style="color:var(--bone)">${esc(cs.name||handle)}</b>, level ${cs.lvl||1}, ${fmt((cs.steps&&cs.steps.total)||0)} lifetime steps${cs.base?', base at '+esc(cs.base.n):''}.<br><span class="help">Cloud copy saved ${cloudAt?ago(cloudAt):'at an unknown time'}${S.onboarded?' · this phone saved '+(localAt?ago(localAt):'at an unknown time'):''}.</span></p>${localNewer?'<p style="color:#ff8a92"><b>Careful:</b> what is on this phone looks NEWER than the cloud copy. Restoring would roll you back. Keep this one unless you know the cloud copy is the right one.</p>':'<p>Restore it here? What is on this device right now gets replaced (a backup is kept under Settings for 7 days).</p>'}<div class="grid2"><button class="btn${localNewer?' r':''}" onclick="closeSheet();pushPlayer()">Keep this one</button><button class="btn${localNewer?'':' r'}" id="restoreBtn">Restore the cloud copy</button></div>`,true);
        $('#restoreBtn').onclick=()=>{try{localStorage.setItem('deadmiles.backup',JSON.stringify({t:Date.now(),why:'before cloud restore',s:S}));}catch(e){}const keep=S.online;S=Object.assign(fresh(),cs);S.online=keep;S.combat=false;S.journal=[];ensureState();log('Restored your save from the cloud.');save();closeSheet();render();toast('Save restored. Undo is under Settings.','z');pushPlayer();};return;}
      else if(!S.onboarded){toast('That handle and key match, but there is no saved character on the server yet.','d');return;}}catch(e){if(!S.onboarded){toast('Could not reach the server to find that save. Try again.','d');return;}}}
    await pushPlayer();await pullSteps();await loadFriends();await partySync();
  }catch(e){o.ok=false;o.err=e.message;save();render();}
}
function compactSave(){const c=JSON.parse(JSON.stringify(S));delete c.online;delete c.journal;delete c.wx;delete c.combat;if(c.party)delete c.party.data;return c;}
function publicState(){return {public:{save:compactSave(),name:S.name,av:S.av,cls:S.cls,base:S.base?{n:S.base.n,e:S.base.e,t:S.base.t,district:S.base.district,rooms:S.base.rooms}:null,defense:defense(),lvl:S.lvl,kills:S.kills,crew:activeCrew().length,weapon:eqItem('melee')?eqItem('melee').n:'fists',goal:S.goal,rival:S.rival||'',horde_next:(S.horde&&S.horde.next)||0,raid_hour:(S.raidPending&&S.raidPending.date===todayStr())?S.raidPending.hour:-1,defense:defense(),steps_today:S.steps.today,steps_week:(S.steps.weekId===weekId()?S.steps.week||0:0),steps_total:S.steps.total,src:S.steps.src||{},crowns:S.crowns||0,bossdmg:(S.boss&&S.boss.week===weekId()?S.boss.my||0:0),streak:S.streak.days,party:S.party.code,raiding:(S.raidCur?{id:S.raidCur.id,n:S.raidCur.n,tier:S.raidCur.tier,at:Date.now()}:null),flare:(S.flare&&S.flare.endsAt>Date.now())?S.flare:null},stash:{food:S.stock.food,water:S.stock.water,meds:S.stock.meds,scrap:S.stock.scrap,ammo:S.stock.ammo}};}
let pushTimer=0;let pushSoonTimer=0;function pushSoon(){clearTimeout(pushSoonTimer);pushSoonTimer=setTimeout(()=>pushPlayer(),8000);}
function pushPlayer(){const o=O();if(!o.ok||!S.onboarded||STALE)return Promise.resolve();clearTimeout(pushTimer);return new Promise(res=>{pushTimer=setTimeout(async()=>{try{rollWeek();
  const ok=await rpc('save_player',{p_handle:o.handle,p_token:o.token,p_name:S.name,p_tier:S.league.tier,p_week:S.league.week,p_score:S.league.score,p_state:publicState()});
  // save_player answers false - not an error - when the key is no longer valid.
  // Without this the game looks online forever while nothing reaches the server.
  if(ok===false){keyDead();save(true);res();return;}
  o.err='';o.lastPush=Date.now();}catch(e){o.err=e.message;}save(true);res();},400);});}
let KEY_WARNED=0;
function keyDead(){
  const o=O();o.ok=false;o.err='This device is signed out - its account key is out of date.';
  if(Date.now()-KEY_WARNED>60000){KEY_WARNED=Date.now();
    toast('Signed out: nothing was saving to the server. Sign in again in Settings.','d');}
  if(typeof C==='undefined'||!C)render();
}
async function pullSteps(){
  const o=O();if(!o.ok)return;const since=new Date();since.setHours(0,0,0,0);
  try{const rows=await rpc('get_steps',{p_handle:o.handle,p_token:o.token,p_since:since.toISOString()});o.lastPull=Date.now();
    if(rows&&rows.length){
      const v=Math.max(...rows.map(r=>r.steps));
      const t=new Date(rows[0].posted_at).getTime();if(!isNaN(t))o.lastPost=t;
      /* Keep the posts themselves. "highest = 14" is a dead end; "11:04am 14,
         12:04pm 14, 1:04pm 14" names the fault out loud. She should not have to
         read a diagnostic to me over chat for the game to say what it received. */
      o.posts=rows.slice(0,24).map(r=>({t:r.posted_at,n:r.steps}));o.postsDate=todayStr();
      syncCounted(v,'phone');          // idempotent: same reading twice changes nothing
    } else if(rows){o.posts=[];o.postsDate=todayStr();}
    o.err='';}catch(e){o.err=e.message;}
  save();if(typeof C==='undefined'||!C)render();else renderOnline();
}
let friends=[];
async function loadFriends(){const o=O();if(!o.ok)return;try{rollWeek();const fr=await rpc('get_board',{p_week:S.league.week});friends=Array.isArray(fr)?fr:[];o.err='';
    await addQuietPartyMembers();}catch(e){o.err=e.message;}renderFriends();}
/* Party members the weekly board cannot see. They are not missing, they just
   have not walked since Monday - which is a completely different thing from
   "not in the game", and the board was showing both as nothing at all. */
async function addQuietPartyMembers(){
  const mem=(S.party&&S.party.data&&S.party.data.members)||[];
  if(!mem.length)return;
  const have=new Set(friends.map(f=>(f.handle||'').toLowerCase()));
  const miss=mem.map(x=>String(x).toLowerCase()).filter(h=>h&&!have.has(h)).slice(0,8);
  for(const h of miss){
    try{const b=await rpc('get_base',{p_handle:h});
      if(b&&b.handle)friends.push({handle:b.handle,name:b.name||b.handle,score:b.score||0,
        tier:b.tier||0,pub:b.public||{},updated_at:b.updated_at,quiet:true});
    }catch(e){}
  }
}
async function testOnline(){const o=O();$('#onlineStatus').textContent='testing...';try{const t0=Date.now();await rpc('get_board',{p_week:S.league.week});o.err='';toast('Server answered in '+(Date.now()-t0)+' ms','z');}catch(e){o.err=e.message;toast('No answer: '+e.message,'d');}save();renderOnline();}
/* party: shared weekly contract + shared Wanted boss */
const PARTY_GOALS=[{t:'steps',goal:60000},{t:'places',goal:20},{t:'kills',goal:50},{t:'boss',goal:600}];
async function partyJoin(code){const o=O();if(!o.ok){toast('Go online first');return;}code=slug(code);if(!code){toast('Type a party code');return;}
  try{const r=await rpc('party_join',{p_handle:o.handle,p_token:o.token,p_code:code,p_week:weekId()});if(r&&r.error){toast(r.error,'d');return;}S.party.code=code;S.party.data=r;S.party.pending={};log('Joined party "'+code+'".');toast('Party joined','z');save();render();pushPlayer();}catch(e){toast(e.message,'d');}}
function partyLeave(){S.party.code='';S.party.data=null;S.boss=null;save();render();pushPlayer();}
let partyTimer=0;
async function partySync(){const o=O();if(!o.ok||!S.party.code)return;const w=weekId();const delta={};for(const g of PARTY_GOALS){if(S.party.pending[g.t])delta[g.t]=S.party.pending[g.t];}
  try{const r=await rpc('party_progress',{p_handle:o.handle,p_token:o.token,p_code:S.party.code,p_week:w,p_delta:delta});if(r&&!r.error){S.party.data=r;S.party.pending={};
      if(r.progress&&PARTY_GOALS.every(g=>(r.progress[g.t]||0)>=g.goal)&&S.party.claimed!==w){S.party.claimed=w;S.keys++;S.league.score+=300;log('Party contract complete. +1 key, +300 points.');toast('Party contract complete!','l');SFX.play('legend');}}
    save();renderParty();bossSync();}catch(e){}}

/* ================= self-update ================= */
/* ================= push notifications ================= */
const VAPID_PUBLIC='BDjXfxZW0UP34n25eFRp736S9ED4EInA8J-HP_0_VMz30hR06YzTEr2fyHLpmuabuU3ubSvUinRCIvM20Pmb4yw';
function b64ToU8(b){const pad='='.repeat((4-b.length%4)%4);const raw=atob((b+pad).replace(/-/g,'+').replace(/_/g,'/'));return Uint8Array.from([...raw].map(c=>c.charCodeAt(0)));}
function pushSupported(){return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;}
async function pushState(){if(!pushSupported())return 'unsupported';if(Notification.permission==='denied')return 'blocked';
  try{const reg=await navigator.serviceWorker.ready;const sub=await reg.pushManager.getSubscription();return sub?'on':'off';}catch(e){return 'off';}}
let PUSH_MSG='';
function pushSay(m){PUSH_MSG=m;renderPush();}
async function pushOn(){
  const o=O();
  if(!o.ok){pushSay('Go online first, in the Online box just below this one. Notifications are tied to your handle.');return;}
  if(!pushSupported()){pushSay(isIOS()?'On an iPhone this only works from the home-screen icon. Add the game to your home screen from the Safari share menu, then open it from the icon and try again.':'This browser does not support notifications.');return;}
  pushSay('Asking your phone for permission...');
  let perm=Notification.permission;
  try{if(perm==='default')perm=await Notification.requestPermission();}catch(e){pushSay('Your phone refused the permission prompt: '+e.message);return;}
  if(perm!=='granted'){pushSay(perm==='denied'?'You (or the phone) said no. Open your phone settings for this site and allow notifications, then come back.':'The prompt was dismissed. Tap the button again and choose Allow.');return;}
  let reg,sub;
  try{pushSay('Permission given. Setting up...');reg=await navigator.serviceWorker.ready;}
  catch(e){pushSay('The game background worker did not start: '+e.message+'. Close the app fully and reopen it.');return;}
  try{
    sub=await reg.pushManager.getSubscription();
    if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64ToU8(VAPID_PUBLIC)});
  }catch(e){pushSay('Your phone would not create the subscription: '+e.message);return;}
  const j=sub.toJSON();
  try{
    const ok=await rpc('save_push_sub',{p_handle:o.handle,p_token:o.token,p_endpoint:sub.endpoint,p_p256dh:j.keys.p256dh,p_auth:j.keys.auth,p_tz:-new Date().getTimezoneOffset()});
    if(ok){S.push=true;save();PUSH_MSG='';toast('Notifications on','z');log('Notifications turned on for this phone.');}
    else pushSay('The server said no to your handle and key. Try Go online again below, then retry.');
  }catch(e){
    const m=String(e.message||'');
    if(m.indexOf('404')>=0||m.toLowerCase().indexOf('could not find')>=0)pushSay('The notification setup has not been added to the database yet. That is the SQL paste in round six of the setup page. Everything else on your phone is ready.');
    else pushSay('The server could not be reached: '+m);
    return;
  }
  renderPush();
}
function isIOS(){return /iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);}
async function pushTest(){
  try{const reg=await navigator.serviceWorker.ready;
    await reg.showNotification('Dead Miles',{body:'This is what a nudge looks like. The real ones come from the server.',icon:'./icon.png',tag:'test'});
    pushSay('Sent a test to this phone. If you did not see it, notifications are muted for this app in your phone settings.');
  }catch(e){pushSay('Could not show a test notification: '+e.message);}
}
async function pushOff(){
  const o=O();try{const reg=await navigator.serviceWorker.ready;const sub=await reg.pushManager.getSubscription();
    if(sub){if(o.ok)await rpc('drop_push_sub',{p_handle:o.handle,p_token:o.token,p_endpoint:sub.endpoint});await sub.unsubscribe();}
  }catch(e){}
  S.push=false;save();toast('Notifications off');renderPush();
}
function renderSeason(){
  const el=$('#seasonCard');if(!el)return;
  const f=seasonState(),sn=seasonNow(),left=seasonDaysLeft();
  // The NEXT rung is the first one she has not REACHED - not the first unclaimed
  // one, which is usually sitting behind her waiting to be collected.
  const next=SEASON_TIERS.findIndex(t=>f.pts<t.p);
  const ready=seasonTierReady();
  const top=SEASON_TIERS[SEASON_TIERS.length-1].p;
  const pct=Math.min(100,Math.round(f.pts/top*100));
  const capLeft=Math.max(0,SEASON_DAILY_CAP-(f.dayPts||0));
  const rows=SEASON_TIERS.map((t,i)=>{
    const done=f.claimed.includes(i),can=!done&&f.pts>=t.p;
    return `<div class="strow${done?' done':can?' can':''}">
      <b>${t.p}</b><span>${esc(t.n)}</span>${
        done?'<i class="tick">\u2713</i>':can?`<button class="btn xs a" onclick="seasonClaim(${i})">Claim</button>`:`<i class="lock">${Math.max(0,t.p-f.pts)} to go</i>`}</div>`;}).join('');
  el.classList.toggle('ready',ready.length>0);
  el.innerHTML=`<h2>${sn.e} ${esc(sn.n)} <span class="sub">${left} day${left===1?'':'s'} left</span></h2>
    <p class="help">${esc(sn.d)} Every season is a new track. What you have already earned is yours to keep.</p>
    <div class="sbar"><i style="width:${pct}%"></i></div>
    <div class="row" style="margin-top:6px">
      <span class="chip a">${f.pts} season points</span>
      ${next<0?'<span class="chip s">track finished</span>':`<span class="chip s">next at ${SEASON_TIERS[next].p}</span>`}
      <span class="chip${capLeft?'':' s'}">${capLeft?capLeft+' more today':'today is capped'}</span>
    </div>
    ${ready.length>1?`<button class="btn a wide" style="margin-top:8px" onclick="seasonClaimAll()">Claim ${ready.length} rewards</button>`:''}
    ${(()=>{const over=seasonOverflowDue(),done=f.claimed.length>=SEASON_TIERS.length;
      if(!done)return '';
      const sur=seasonSurplus(),into=sur%SEASON_OVERFLOW;
      return `<div class="overtop"><b>Over the top${f.over?' \u00d7'+f.over:''}</b>
        <span>The track is finished. It keeps paying: 2 keys and 50 scrap every ${SEASON_OVERFLOW} points, with a chance at a legendary.</span>
        ${over>0?`<button class="btn a" onclick="seasonClaimOverflow()">Claim ${over>1?over+' lots':'it'}</button>`
                :`<i>${SEASON_OVERFLOW-into} points to the next one</i>`}</div>`;})()}
    <div class="strack" style="margin-top:10px">${rows}</div>
    <p class="help" style="margin-top:8px">Points come from walking AND from playing - places cleared, raids, chests, what you bring home. There is a daily cap, so the season lasts the month however far you walk.</p>`;
}
function goInfect(){
  if(!infect()){const b=$('#infectBar');if(b)b.hidden=true;return;}
  // The card is on the road screen, so switch there first if she is elsewhere.
  const btn=document.querySelector('.nav button[data-v="street"]');
  const onRoad=$('#v-street')&&$('#v-street').classList.contains('on');
  if(!onRoad&&btn)btn.click();
  setTimeout(()=>{const ic=$('#infectCard');if(!ic||ic.hidden)return;
    ic.scrollIntoView({behavior:(typeof reduced!=='undefined'&&reduced)?'auto':'smooth',block:'center'});
    ic.classList.remove('flashme');void ic.offsetWidth;ic.classList.add('flashme');
    setTimeout(()=>ic.classList.remove('flashme'),1600);},onRoad?0:120);
}
function renderMapSkin(){
  const el=$('#skinRow');if(!el)return;
  el.innerHTML=Object.entries(MAPSKINS).map(([k,m])=>
    '<button class="btn xs'+(mapSkin()===k?' a':' ghost')+'" onclick="setMapSkin(\''+k+'\')">'+esc(m.n)+'</button>').join('');
}
function renderDiff(){
  const el=$('#diffBody');if(!el)return;
  el.innerHTML='<p class="help">Change it whenever you like. Nothing you own is affected.</p>'
    +Object.entries(DIFF).map(([k,d])=>{const on=(S.diff||'normal')===k;
      return '<button class="btn wide'+(on?' r':' ghost')+'" style="margin-top:8px;text-align:left" onclick="setDiff(\''+k+'\')">'
        +'<b>'+esc(d.n)+(on?' · on':'')+'</b><br><span class="help">'+esc(d.d)+'</span></button>';}).join('')
    +'<p class="help" style="margin-top:10px">On '+esc(diff().n)+': enemies hit at '+Math.round(diff().enemy*100)+'%, a bite turns '
      +(diff().infect===1?'at the base rate':Math.round(diff().infect*100)+'% as often')+', death takes '+Math.round(diff().scrap*100)+'% of your scrap, and you can patch up '+diff().meds+' time'+(diff().meds===1?'':'s')+' a fight.</p>';
}
async function renderPush(){
  const el=$('#pushBody');if(!el)return;const st=await pushState();const o=O();
  const standalone=window.matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
  const note=PUSH_MSG?`<p class="help" style="color:var(--amber);border-left:3px solid var(--amber);padding-left:8px;margin:8px 0">${esc(PUSH_MSG)}</p>`:'';
  const diag=`<p class="help" style="font-size:11px;margin-top:8px;opacity:.8">v${VERSION} · ${standalone?'home-screen app':'browser tab'} · permission ${typeof Notification==='undefined'?'n/a':Notification.permission} · push ${('PushManager' in window)?'available':'missing'} · account ${o.ok?'@'+esc(o.handle):'offline'}</p>`;
  if(st==='unsupported'){el.innerHTML=`<p class="help">${isIOS()&&!standalone?'On an iPhone, notifications only work from the home-screen icon. Tap the Safari share button, Add to Home Screen, then open the game from that icon.':'This browser does not support notifications.'}</p>${note}${diag}`;return;}
  if(st==='blocked'){el.innerHTML=`<p class="help">Notifications are switched off for this app in your phone settings. On Android: long-press the icon, App info, Notifications, turn on. On iPhone: Settings, Notifications, Dead Miles, Allow.</p>${note}${diag}`;return;}
  if(!o.ok){el.innerHTML=`<p class="help">Go online in the Online box below first. Notifications are tied to your handle.</p>${note}${diag}`;return;}
  el.innerHTML=(st==='on'
    ?`<p class="help">On for this phone. You will hear about horde night an hour before, raids, a streak about to break, and your rival passing you.</p><div class="row" style="margin-top:8px"><button class="btn sm" onclick="pushTest()">Send a test</button><button class="btn sm ghost" onclick="pushOff()">Turn off</button></div>`
    :`<p class="help">Get a nudge for horde night, raids, a streak about to break, and when your rival passes you. Nothing else.</p><div class="row" style="margin-top:8px"><button class="btn sm r" onclick="pushOn()">Turn on notifications</button></div>`)+note+diag;
}
let updateReady=false;
async function applyUpdate(){try{const rs=await navigator.serviceWorker.getRegistrations();for(const r of rs)await r.unregister();const ks=await caches.keys();for(const k of ks)await caches.delete(k);}catch(e){}location.href=location.pathname+'?r='+Date.now();}
async function checkUpdate(){try{const r=await fetch('version.txt?t='+Date.now(),{cache:'no-store'});if(!r.ok)return;const v=(await r.text()).trim();if(v&&v!==VERSION){updateReady=v;const b=$('#updateBar');if(b){b.hidden=false;b.textContent='Version '+v+' is ready. Tap to update.';}}}catch(e){}}
function maybeAutoUpdate(){if(updateReady&&!C&&!$('#modal').classList.contains('on')){toast('Updating to v'+updateReady,'z');setTimeout(applyUpdate,800);}}
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
// Typing a total and the phone posting a total are two DIFFERENT readings of
// the same day, on different scales. They used to share one baseline, so typing
// 5,000 when Health said 3,200 made every later phone sync look like you had
// walked backwards - and it was refused, forever, until Health passed 5,000.
// Now each source keeps its own reading and the day's count only ever goes up.
// Two kinds of step source, and mixing them up is what broke this twice:
//   COUNTED - the phone, the Shortcut, the clipboard, the in-app pedometer.
//             They all measure the SAME legs, so we keep the highest reading.
//   MANUAL  - a number she types in. Those are steps no counter saw (phone on
//             the desk, treadmill, stroller), so they ADD on top.
// today = counted + manual, always, and that invariant is restored on every
// write. v6.22 took max() of the two: she typed 5,000, her phone counted 425,
// and the game showed 5,000 while the phone kept ticking into a number that
// could never win. Additive is what she meant both times she reported it.
function syncReads(){
  const s=S.steps;
  if(!s.reads||s.readsDate!==s.date){s.reads={counted:0,manual:0,floor:0};s.readsDate=s.date;}
  const r=s.reads;
  if(r.floor===undefined)r.floor=0;
  if(r.counted===undefined){                 // migrate a v6.22 save without losing today
    r.counted=r.phone||0;
    r.manual=Math.max(0,(s.today||0)-(r.phone||0));
    delete r.phone;delete r.typed;
  }
  return r;
}
/* ================= FLARES - the daily energy for remote raids (v6.27) =================
   Her friends do not live in her city, so a raid nobody can reach is a raid
   nobody can join. A flare lets you drop into a friend's raid from anywhere.
   It is capped per day on purpose: this is a walking game, and standing at the
   raid yourself is still FREE. You earn the extra flares by walking. */
const FLARE_BASE=3, FLARE_PER=6000, FLARE_CAP=6;
// Who is calling me to a raid right now. The invite rides on the board every
// client already polls, so this whole feature needed no new database work -
// and it expires by itself when the raid window closes.
function raidCalls(){
  const o=O();if(!o.ok)return [];
  const me=(o.handle||'').toLowerCase();const now=Date.now();const out=[];
  for(const f of (friends||[])){
    const fl=f.pub&&f.pub.flare;if(!fl||!fl.id||!fl.endsAt)continue;
    if(f.handle&&f.handle.toLowerCase()===me)continue;
    if(fl.endsAt<=now)continue;
    if(!(fl.to||[]).map(x=>String(x).toLowerCase()).includes(me))continue;
    if((S.raidsDone||{})[fl.id])continue;
    if((S.callsHidden||[]).includes(fl.id))continue;
    out.push({call:fl,from:(f.pub&&f.pub.name)||f.handle,handle:f.handle});
  }
  return out.sort((a,b)=>b.call.tier-a.call.tier||a.call.endsAt-b.call.endsAt);
}
function dismissCall(id){S.callsHidden=(S.callsHidden||[]).concat([id]).slice(-40);save();render();}
function renderCalls(){
  const el=$('#callCard');if(!el)return;
  const cs=raidCalls();const mine=S.flare&&S.flare.endsAt>Date.now()?S.flare:null;
  if(!cs.length&&!mine){el.hidden=true;return;}
  el.hidden=false;
  const left=flaresLeft(),max=flaresMax();const nxt=flareNext();
  el.innerHTML='<h2>Raid calls <span class="sub">'+left+' of '+max+' flares left</span></h2>'
    +'<p class="help">A flare drops you into a friend\'s raid from anywhere, even another city. Standing at one yourself costs nothing.'
      +(nxt?' Another flare at '+fmt(nxt)+' more steps today.':' You have all the flares the day gives.')+'</p>'
    +(mine?'<div style="margin-top:8px;padding:10px 12px;border-radius:10px;background:rgba(120,150,190,.12);border-left:4px solid var(--steel)">'
        +'<b>Your call is out to '+(mine.to||[]).length+'</b>'
        +'<div class="help">'+esc(mine.T.e+' '+mine.T.n)+' tier '+mine.tier+' at '+esc(mine.n)+' · '+Math.max(0,Math.round((mine.endsAt-Date.now())/60000))+' min left</div>'
        +'<button class="btn sm ghost" style="margin-top:8px" onclick="cancelCall()">Call it off</button></div>':'')
    +cs.map((c,i)=>{const r=c.call;const mins=Math.max(0,Math.round((r.endsAt-Date.now())/60000));
      // Stacked, not a flex row: on a phone the buttons squeezed the boss name
      // down to one word a line.
      return '<div style="margin-top:8px;padding:10px 12px;border-radius:10px;background:rgba(255,255,255,.05);border-left:4px solid '+esc(r.T.col)+'">'
        +'<b style="color:'+esc(r.T.col)+'">'+esc(c.from)+' called a tier '+r.tier+'</b>'
        +'<div style="margin-top:2px">'+esc(r.T.e+' '+r.boss)+'</div>'
        +'<div class="help">'+esc(r.n)+' · '+(mins>60?Math.floor(mins/60)+'h '+(mins%60)+'m':mins+' min')+' left · fight it from here</div>'
        +'<div class="grid2" style="margin-top:8px">'
        +'<button class="btn sm ghost" onclick="dismissCall(\''+esc(r.id)+'\')">No thanks</button>'
        +'<button class="btn sm r" onclick="openCall('+i+')"'+(left<=0?' disabled':'')+'>'+(left<=0?'No flares left':'Join · 1 flare')+'</button>'
        +'</div></div>';}).join('');
}
function flareDay(){const f=S.flares||(S.flares={date:'',used:0});if(f.date!==S.steps.date){f.date=S.steps.date;f.used=0;}return f;}
function flaresMax(){return Math.min(FLARE_CAP,FLARE_BASE+Math.floor((S.steps.today||0)/FLARE_PER));}
function flaresLeft(){return Math.max(0,flaresMax()-flareDay().used);}
function flareNext(){const n=flaresMax();if(n>=FLARE_CAP)return 0;return (n-FLARE_BASE+1)*FLARE_PER-(S.steps.today||0);}
function spendFlare(){const f=flareDay();if(flaresLeft()<=0)return false;f.used++;save();return true;}

function stepsCounted(){return syncReads().counted||0;}
// The arithmetic, on screen, before she commits to either button.
function syncMath(){const el=$('#syncMath');if(!el)return;
  const inp=$('#syncInput');const v=inp?parseInt(inp.value,10):NaN;
  const c=stepsCounted(),m=stepsManual();
  const extra=m+Math.max(0,(syncReads().floor||0)-c);
  if(!(v>0)){
    el.innerHTML=fmt(c)+' counted by your phone'+(extra?' + '+fmt(extra)+' you typed in':'')+' = <b>'+fmt(S.steps.today||0)+'</b> today.'
      +(extra?' <button class="btn xs ghost" onclick="clearManual()">Use my phone\'s count only</button>':'');
    return;}
  el.innerHTML='<b>Add these</b> makes it '+fmt((S.steps.today||0)+v)+' - use it for a walk your phone never counted at all.'
    +'<br><b>That\'s my total</b> makes it '+fmt(Math.max(S.steps.today||0,v))+' and holds it there - use it when the sync is behind. '
    +'Your phone catching up later will not add these on top again.';}
function stepsManual(){return syncReads().manual||0;}
// The one place today's number is allowed to move.
function stepsApply(src){
  const r=syncReads();
  let target=Math.max((r.counted||0)+(r.manual||0), r.floor||0);
  if(target<(S.steps.today||0)){             // steps never go down; raise the floor
    r.floor=S.steps.today||0;
    target=S.steps.today||0;
  }
  const delta=target-(S.steps.today||0);
  if(delta>0){SFX.play('step');addSteps(delta,src);}
  else{save();render();}
  return delta;
}
// A counter reported its running total for today.
function syncCounted(v,src){
  rollDay();
  v=Math.max(0,Math.round(v||0));
  const r=syncReads();const before=r.counted||0;
  r.counted=Math.max(before,v);
  S.steps.lastSync=v;S.steps.lastSyncDate=S.steps.date;
  const d=stepsApply(src);
  if(d>0)toast('+'+fmt(d)+' steps ('+src+')','z');
  else if(v<before)toast('Your '+src+' reads '+fmt(v)+', under the '+fmt(before)+' already counted today. Keeping the higher one.','a');
  else toast('Already counted up to '+fmt(before));
  return true;
}
// "Add" - steps the counter never saw. Pure addition.
function addManual(v){
  rollDay();v=Math.max(0,Math.round(v||0));if(!v){toast('Type a number first');return false;}
  const r=syncReads();r.manual=(r.manual||0)+v;
  stepsApply('sync');
  toast('+'+fmt(v)+' by hand. Today: '+fmt(S.steps.today),'z');
  return true;
}
// "That is my total" - the counter is behind or wrong. Anything walked from
// here still stacks on top, because only the offset is being set.
function setManual(v){
  rollDay();v=Math.max(0,Math.round(v||0));
  const before=S.steps.today||0;
  const r=syncReads();r.floor=Math.max(r.floor||0,v);
  const d=stepsApply('sync');
  if(d>0)toast('Today set to '+fmt(S.steps.today),'z');
  else toast('Today is already '+fmt(before)+', which is higher. Whatever you walk from here still counts on top.','a');
  return true;
}
// For anyone whose day is already inflated by hand-typed steps: take them back
// out. The phone's own count stays, so this can only ever lower today to the
// true reading, never wipe a walk.
function clearManual(){
  rollDay();const r=syncReads();const had=(r.manual||0)+Math.max(0,(r.floor||0)-(r.counted||0));
  if(!had){toast('Nothing was added by hand today');return false;}
  r.manual=0;r.floor=0;
  const t=r.counted||0;
  const back=Math.max(0,(S.steps.today||0)-t);
  // stepsApply only ever raises, so today is set down by hand here - and the
  // week and lifetime counters come down with it, or her phone and the game
  // would still disagree everywhere except the one number she just fixed.
  S.steps.today=t;
  S.steps.week=Math.max(0,(S.steps.week||0)-back);
  S.steps.total=Math.max(0,(S.steps.total||0)-back);
  if(S.steps.src)S.steps.src.typed=Math.max(0,(S.steps.src.typed||0)-back);
  save();render();syncMath();
  toast('Took back '+fmt(had)+' hand-typed steps. Today is '+fmt(t)+', straight from your phone.','a');
  log('Cleared '+fmt(had)+' hand-typed steps. Today is your phone\'s count: '+fmt(t)+'.');
  return true;
}
// kept so old call sites and the Shortcut URL keep working
function syncTotal(v,src){return syncCounted(v,src);}
/* A Shortcut can hand us one number ("3,338") or the whole list of Health
   samples ("14, 226, 98, ..."), depending on whether Calculate Statistics is in
   it and which bubble got attached at the end. Both are the same day's steps.
   The game does the arithmetic rather than making the arithmetic her problem -
   attaching the sample list instead of the Sum used to post ONE sample. */
function parseStepsParam(s){
  if(s===null||s===undefined)return NaN;
  s=String(s).trim();if(!s)return NaN;
  const parts=s.split(/[\n\r;|]+|,\s+/).map(x=>x.trim()).filter(Boolean);
  const num=x=>{const d=x.replace(/[^0-9]/g,'');return d?parseInt(d,10):NaN;};
  if(parts.length>1){let sum=0,seen=0;
    for(const x of parts){const n=num(x);if(!isNaN(n)){sum+=n;seen++;}}
    return seen?sum:NaN;}
  return num(parts[0]);
}
function urlParam(n){try{
  const q=new URLSearchParams(location.search);const h=new URLSearchParams(location.hash.replace(/^#/,''));
  return q.get(n)!==null?q.get(n):h.get(n);}catch(e){return null;}}
/* A keyed address landed on us. This copy of the game may be a blank Safari tab
   that has never been signed in - it does not matter. The key in the address is
   all the server needs, so post it and say so on screen. Her real game is a
   different copy and will pull it within the minute. */
let BEACON_DONE=false;
async function stepsBeacon(){
  if(BEACON_DONE)return false;
  const k=urlParam('k');const v=parseStepsParam(urlParam('steps'));
  if(!k||!(v>=0)||v>=1000000)return false;
  BEACON_DONE=true;
  try{history.replaceState(null,'',location.pathname);}catch(e){}
  const handle=String(k).split('|')[0].toLowerCase();
  const mine=(O().handle||'').toLowerCase()===handle;
  if(mine)try{syncTotal(v,'shortcut');}catch(e){}   // this IS her game: take it now too
  const box=document.createElement('div');
  box.id='beacon';
  box.setAttribute('style','position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;padding:24px;background:rgba(8,8,12,.94);font:16px/1.6 system-ui,sans-serif;color:#eceaf2;text-align:center');
  box.innerHTML='<div><div style="font-size:34px;font-weight:800;color:#e6a530">'+fmt(v)+'</div><div style="margin-top:6px">steps - sending to Dead Miles...</div></div>';
  document.body.appendChild(box);
  let ok=false;
  try{ok=await rpc('post_steps_link',{p:k+'|'+v});}catch(e){ok=false;}
  box.innerHTML=ok
    ? '<div><div style="font-size:34px;font-weight:800;color:#5fd08a">'+fmt(v)+' \u2713</div><div style="margin-top:6px">Sent. Your game will have it within a minute.</div><button id="bcOk" style="margin-top:16px;padding:10px 20px;border-radius:9px;border:0;background:#c2612f;color:#fff;font:600 15px system-ui">Open Dead Miles</button></div>'
    : '<div><div style="font-size:30px;font-weight:800;color:#ff5a78">Could not send</div><div style="margin-top:6px">'+fmt(v)+' steps were read off your phone, but the server would not take them. Your key may be out of date - open the game and tap <b>Fix my shortcut</b>.</div><button id="bcOk" style="margin-top:16px;padding:10px 20px;border-radius:9px;border:0;background:#c2612f;color:#fff;font:600 15px system-ui">Open Dead Miles</button></div>';
  const b=document.getElementById('bcOk');if(b)b.onclick=()=>{box.remove();try{if(O().ok)pullSteps();}catch(e){}};
  return true;
}
function autoSyncFromUrl(){try{
  const q=new URLSearchParams(location.search);const h=new URLSearchParams(location.hash.replace(/^#/,''));
  const raw=q.get('steps')!==null?q.get('steps'):h.get('steps');
  const v=parseStepsParam(raw);
  if(v>=0&&v<1000000){syncTotal(v,'shortcut');history.replaceState(null,'',location.pathname);}
}catch(e){}}
async function readClipboard(){try{const t=await navigator.clipboard.readText();const m=String(t).replace(/,/g,'').match(/\d{2,6}/);if(!m){toast('No step count on the clipboard');return;}syncTotal(parseInt(m[0],10),'clipboard');}catch(e){toast('Clipboard is blocked here. Type it in Sync.');}}

/* ================= scene ================= */
const cv=$('#cv'),ctx=cv.getContext('2d');const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let particles=[];const VIS={scroll:null,last:0,walking:false,step:0};
function realScroll(){const prog=S.walk.dist?S.walk.progress/S.walk.dist:0;return S.walk.houses*1000+prog*1000;}
function drawScene(t){
  const W=cv.width,H=cv.height;const target=realScroll();
  if(VIS.scroll===null||reduced)VIS.scroll=target;
  const dt=Math.min(50,t-(VIS.last||t));VIS.last=t;
  const gap=target-VIS.scroll;const speed=Math.max(220,Math.min(1400,Math.abs(gap)*0.9));
  if(Math.abs(gap)>1){const mv=Math.min(Math.abs(gap),speed*dt/1000);VIS.scroll+=Math.sign(gap)*mv;VIS.walking=true;VIS.step+=dt;if(VIS.step>420){VIS.step=0;if(S.sfx)SFX.tone(90,.04,'triangle',.02);}}else{VIS.scroll=target;VIS.walking=false;}
  const walking=VIS.walking&&!reduced;const scroll=VIS.scroll;const prog=S.loc?1:((scroll%1000)+1000)%1000/1000;
  const bob=walking?Math.abs(Math.sin(t/140))*6:Math.sin(t/900)*1.5;
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
  const rz=mulberry(S.walk.houses+3);for(let i=0;i<2;i++){const zx=bx+230+i*80+rz()*40;if(zx<W+40){const sway=Math.sin(t/500+i)*3;const lean=Math.sin(t/900+i)*4;drawSprite(ART.zombieSVG(i===0?'walker':'runner',100),zx+lean,300+sway,110);}}
  // crew behind, pet in front
  const ac=activeCrew();ac.slice(0,2).forEach((c,i)=>drawSprite(ART.avatarSVG(c.av,100),W*0.26-70-i*55,300-(walking?Math.abs(Math.sin(t/140+i+1))*5:Math.sin(t/800+i)*1.5),105));
  drawSprite(ART.avatarSVG(S.av,100,{weapon:eqItem('melee')?'melee':eqItem('ranged')?'gun':''}),W*0.26,296-bob,120);
  if(S.pet)drawSprite(ART.petSVG(S.pet,64,S.petCoat,{still:true}),W*0.26+70,356-(walking?Math.abs(Math.sin(t/110))*6:Math.abs(Math.sin(t/700))*1.5),62);
  // weather particles
  if(!reduced&&(k==='rain'||k==='storm'||k==='snow')){if(particles.length<(k==='snow'?80:140))particles.push({x:Math.random()*W,y:Math.random()*H,v:k==='snow'?rnd(.6,1.4):rnd(6,10),d:rnd(-1,1)});ctx.strokeStyle=k==='snow'?'rgba(255,255,255,.8)':'rgba(180,200,230,.5)';ctx.lineWidth=k==='snow'?3:1.5;ctx.lineCap='round';for(const p of particles){ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x+(k==='snow'?0:-2),p.y+(k==='snow'?2:14));ctx.stroke();p.y+=p.v*(k==='snow'?1:4);p.x+=k==='snow'?Math.sin(t/800+p.d)*.8:-1;if(p.y>H){p.y=-10;p.x=Math.random()*W;}}}
  if(k==='storm'&&!reduced&&Math.random()<0.01){ctx.fillStyle='rgba(255,255,255,.35)';ctx.fillRect(0,0,W,H);}
  const fog=ctx.createLinearGradient(0,H-110,0,H);fog.addColorStop(0,'rgba(20,18,22,0)');fog.addColorStop(1,'rgba(20,18,22,.95)');ctx.fillStyle=fog;ctx.fillRect(0,H-110,W,110);
  if(k==='fog'){ctx.fillStyle='rgba(120,120,130,.35)';ctx.fillRect(0,0,W,H);}
}
function drawSprite(svg,x,y,h){const img=ART.spriteImg(svg);if(!img.complete||!img.naturalWidth){img.onload=()=>animateOnce();return;}const w=h*img.naturalWidth/img.naturalHeight;ctx.drawImage(img,x-w/2,y,w,h);}
function drawBuilding(x,kind,emoji){const w=220,h=170,y=290-h;const col={house:'#4a3d44',pharmacy:'#2f4a5a',gas:'#5a4a2f',grocery:'#2f5a44',police:'#2f3a5a',clinic:'#5a2f3a',hardware:'#5a3f2f',surplus:'#3f4a2f',diner:'#6a3a2a',stronghold:'#5a2a22'}[kind]||'#4a3d44';
  ctx.fillStyle='#0a0a0c';ctx.fillRect(x+8,y+8,w,h);ctx.fillStyle=col;ctx.fillRect(x,y,w,h);ctx.fillStyle='#1a1719';ctx.beginPath();ctx.moveTo(x-14,y);ctx.lineTo(x+w/2,y-64);ctx.lineTo(x+w+14,y);ctx.closePath();ctx.fill();
  for(let i=0;i<3;i++)for(let j=0;j<2;j++){ctx.fillStyle=(i+j)%3===0?'#0d0c0e':'#161418';ctx.fillRect(x+24+i*66,y+28+j*66,36,36);ctx.strokeStyle='#0d0c0e';ctx.lineWidth=3;ctx.strokeRect(x+24+i*66,y+28+j*66,36,36);if((i*j)%2===1){ctx.strokeStyle='#5a4a3a';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(x+20+i*66,y+36+j*66);ctx.lineTo(x+64+i*66,y+40+j*66);ctx.stroke();}}
  ctx.fillStyle='#0d0c0e';ctx.fillRect(x+w/2-22,y+h-64,44,64);ctx.font='38px serif';ctx.textAlign='center';ctx.fillText(emoji||'',x+w/2,y-12);ctx.textAlign='start';
  if(kind==='stronghold'){ctx.fillStyle='#c22b3a';ctx.fillRect(x+w/2-3,y-110,6,50);ctx.fillRect(x+w/2,y-110,40,22);}}
let raf=0;function animate(){cancelAnimationFrame(raf);const step=(t)=>{drawScene(t);const road=$('#v-street').classList.contains('on')&&document.visibilityState==='visible';if(!reduced&&road)raf=requestAnimationFrame(step);else raf=0;};raf=requestAnimationFrame(step);}
function animateOnce(){if(!raf)animate();else drawScene(performance.now());}

/* ================= render ================= */
// Roll a number up to its new value rather than snapping. Short, eased, and it
// cancels cleanly if another update lands mid-roll.
const COUNTERS=new WeakMap();
function countTo(el,to){
  if(!el)return;
  const prev=COUNTERS.get(el);
  if(prev&&prev.to===to){el.textContent=fmt(to);return;}
  if(prev&&prev.raf)cancelAnimationFrame(prev.raf);
  const from=prev?prev.shown:(parseInt(String(el.textContent).replace(/\D/g,''),10)||0);
  if(from===to||Math.abs(to-from)<2||reduced){el.textContent=fmt(to);COUNTERS.set(el,{to,shown:to,raf:0});return;}
  const t0=performance.now(),dur=Math.min(900,300+Math.abs(to-from)/8);
  const rec={to,shown:from,raf:0};COUNTERS.set(el,rec);
  if(to>from){el.classList.remove('tick');void el.offsetWidth;el.classList.add('tick');}
  const step=(t)=>{
    const k=Math.min(1,(t-t0)/dur);const e=1-Math.pow(1-k,3);
    rec.shown=Math.round(from+(to-from)*e);el.textContent=fmt(rec.shown);
    if(k<1){rec.raf=requestAnimationFrame(step);}else{rec.raf=0;rec.shown=to;}
  };
  rec.raf=requestAnimationFrame(step);
}
function render(){
  ensureState();rollDay();rollWeek();ctRoll();checkRaids();storyCheck();
  try{renderSeason();}catch(e){}   // after ensureState - it writes to S
  $('#hpNum').textContent=S.hp+' / '+maxHp();$('#hpBar').style.width=clamp(S.hp/maxHp()*100,0,100)+'%';
  countTo($('#topSteps'),S.steps.today);
  $('#sceneTag').textContent=district().n+' · '+S.walk.houses+' places';$('#arriveTag').hidden=!S.loc;
  const wt=$('#wxTag');wt.hidden=false;wt.textContent=wxLabel()+' ⓘ';wt.onclick=wxSheet;wt.style.cursor='pointer';
  wt.title='What the weather is doing to you';
  $('#pbar').style.width=(S.loc?100:(S.walk.dist?S.walk.progress/S.walk.dist*100:0))+'%';
  $('#pleft').innerHTML=S.loc?'<b>You are here.</b>':'Next place in <b>'+fmt(S.walk.toNext)+'</b> steps';
  $('#pright').innerHTML='Run <b>x'+runMult().toFixed(1)+'</b> · Pack <b>'+fmt(packPts())+'</b> pts';
  $('#syncHint').textContent=S.steps.lastSyncDate===S.steps.date&&S.steps.lastSync?'synced at '+fmt(S.steps.lastSync):'';
  renderLoc();renderRaidCard();renderContracts();
  // Infection lives in a card down the road screen, which is easy to walk past.
  // A red strip under the header is always on screen whatever tab she is on,
  // and tapping it takes her to the card that can cure it.
  try{const ib=$('#infectBar');if(ib){
    const f=infect();
    ib.hidden=!f;
    if(f)ib.textContent='\u2623 '+infectLabel().toUpperCase()+' \u00b7 stage '+infectStage()+' of 3 \u00b7 tap to treat it';
  }}catch(e){}
  try{const ic=$('#infectCard');if(ic){
    const f=infect();
    if(!f)ic.hidden=true;
    else{ic.hidden=false;
      const st=infectStage(),abx=S.pack.some(x=>x.id==='abx');
      ic.innerHTML='<h2 style="color:#ff8a92">'+esc(infectLabel())+' <span class="sub">stage '+st+' of 3</span></h2>'
        +'<p>A bite broke the skin'+(f.from?' ('+esc(f.from)+')':'')+'. Your maximum health is down <b>'+Math.round(infectPenalty()*100)+'%</b>, and you lose health as you walk.</p>'
        +'<p class="help">It does not get worse just because time passes - only if you take another bite while it is running. Time away from the game costs you nothing.</p>'
        +'<button class="btn r wide" style="margin-top:8px" onclick="cureInfection()">'
          +(abx||medsHeld('abx')>0?'Take the antibiotics':S.stock.meds>=4?'Burn 4 bandages on it':'Need antibiotics, or 4 bandages')+'</button>'
        +'<p class="help" style="margin-top:6px">Antibiotics turn up in pharmacies and clinics.</p>';}
  }}catch(e){}
  const hs=hydroState();const hb=$('#hydroBar');if(hb){hb.style.width=Math.round(S.hydro||0)+'%';hb.style.background=hs==='ok'?'linear-gradient(90deg,#3a7ad6,#5fb3c9)':hs==='thirsty'?'linear-gradient(90deg,#c9a04a,#f5c842)':'linear-gradient(90deg,#8a2a2a,#e63e5c)';
    $('#hydroSub').textContent=hydroLabel();$('#hydroLeft').innerHTML='<b>'+Math.round(S.hydro||0)+'%</b> water · '+S.stock.water+' in the stash';$('#hydroRight').textContent=hs==='ok'?'':hs==='thirsty'?'-10% damage':'-20% damage, -15% max HP';$('#drinkBtn').disabled=S.stock.water<1||(S.hydro||0)>=100;}
  $('#goalSub').textContent='streak '+S.streak.days+' · best '+Math.max(S.streakBest||0,S.streak.days);const nsr=nextStreakReward();const sl=$('#streakLine');if(sl)sl.textContent=nsr?(nsr.d-S.streak.days)+' more day'+(nsr.d-S.streak.days===1?'':'s')+' in a row for '+nsr.n+'. Miss a day and the streak breaks (and a walker gets into the scrap).':'Every streak reward earned. Keep it alive.';(function(){const gb=$('#goalBar');gb.style.width=Math.min(100,S.steps.today/S.goal*100)+'%';
    const hit=S.steps.today>=S.goal;const card=gb.closest('.card');
    if(card){if(hit&&S.flags.goalCheer!==S.steps.date){S.flags.goalCheer=S.steps.date;card.classList.remove('goalhit');void card.offsetWidth;card.classList.add('goalhit');}
      if(!hit)card.classList.remove('goalhit');}})();$('#goalLeft').innerHTML='<b>'+fmt(S.steps.today)+'</b> / '+fmt(S.goal);$('#goalRight').textContent=S.steps.today>=S.goal?'Done. +2 food, +2 water, +15 XP.':fmt(S.goal-S.steps.today)+' to go';
  $('#journal').innerHTML=S.journal.slice(0,12).map(j=>`<li><time>${timeStr(j.t)}</time><span>${esc(j.m)}</span></li>`).join('')||'<li><span class="help">Nothing yet.</span></li>';
  // pack
  $('#packSub').textContent=S.pack.length+' / '+capacity();$('#runMult').textContent='x'+runMult().toFixed(1);$('#packPts').textContent=fmt(packPts());$('#keyCount').textContent=S.keys;
  $('#bankBtn').disabled=!!S.loc||!S.pack.length||!!S.combat;$('#bankBtn').textContent=S.base?'Stash it at '+S.base.n:'Claim a base first';
  $('#packAlert').hidden=!S.pack.some(p=>p.cat==='chest'&&(S.keys>0||sk('lockpick')));
  $('#packList').innerHTML=S.pack.length?S.pack.map(it=>{
    const act=it.cat==='chest'?`<button class="btn xs a" onclick="openChest('${it.uid}')">${S.keys>0?'Open':sk('lockpick')?'Pick':'Locked'}</button>`
      :it.drink?`<button class="btn xs" onclick="useDrink('${it.uid}')" title="${esc((DRINKS[it.drink]||{}).d||'')}">Drink</button>`
      :it.snack?`<button class="btn xs" onclick="useSnack('${it.uid}')" title="${esc((SNACKS[it.snack]||{}).d||'')}">Eat</button>`
      :`<span class="pt">+${it.pts}</span>`;
    const sub=it.drink?(DRINKS[it.drink]||{}).d:it.snack?(SNACKS[it.snack]||{}).d:'';
    return `<div class="item r-${it.r||'common'}"><span class="e">${it.e}</span><span style="flex:1;min-width:0">${esc(it.n)}${it.qty?' x'+it.qty:''}${sub?`<br><span class="help" style="font-size:11px">${esc(sub)}</span>`:''}</span>${act}</div>`;}).join(''):'<p class="help">Empty.</p>';
  const GT={all:()=>true,weapons:g=>g.slot==='melee'||g.slot==='ranged',armor:g=>ARMOR_SLOTS.includes(g.slot),bags:g=>g.slot==='bag'};
  const RORD={common:0,uncommon:1,rare:2,epic:3,legendary:4};
  const gearShown=S.gear.filter(GT[GEAR_TAB]||GT.all).sort((a,b)=>((S.eq[b.slot]===b.uid)-(S.eq[a.slot]===a.uid))||(RORD[b.r||'common']-RORD[a.r||'common']));
  const spare=spareGear();
  $('#gearTabs').innerHTML=[['all','All',S.gear.length],['weapons','Weapons',S.gear.filter(GT.weapons).length],['armor','Armor',S.gear.filter(GT.armor).length],['bags','Bags',S.gear.filter(GT.bags).length]].map(([k,n,c])=>`<button class="${GEAR_TAB===k?'on':''}" onclick="gearTab('${k}')">${n} ${c}</button>`).join('');
  $('#gearSub').textContent=S.gear.length+' pieces · '+partsHave()+' parts';
  $('#salvageAll').style.display=spare.length<2?'none':'';$('#salvageAll').textContent='Salvage '+spare.length+' spare common/uncommon for '+spare.reduce((t,x)=>t+salvageValue(x),0)+'🔩';
  const broke=S.gear.filter(g=>repairMax(g)&&repairMissing(g));
  const ra=$('#repairAll');
  if(ra){
    const bill=broke.reduce((t,x)=>t+repairCost(x),0);
    ra.style.display=broke.length<2?'none':'';
    ra.textContent='Repair '+broke.length+' worn piece'+(broke.length===1?'':'s')+' for '+bill+'🔩'+(atBench()?' (bench price)':'');
    ra.classList.toggle('off',S.stock.scrap<Math.min(...broke.map(repairCost).concat([Infinity])));
  }
  $('#gearList').innerHTML=S.gear.length?(gearShown.length?gearShown:[]).map(g=>{const eq=S.eq[g.slot]===g.uid;const d=(g.slot==='melee'||g.slot==='ranged')&&g.broken?'<b style="color:#ff8a92">WRECKED</b> · repair it to use it again':g.slot==='melee'?(g.broken?'<b style="color:#ff8a92">WRECKED</b> · repair it to use it again':wDmg(g)[0]+'-'+wDmg(g)[1]+' dmg · '+(g.dur+'/'+repairMax(g)+' durability')):g.slot==='ranged'?wDmg(g)[0]+'-'+wDmg(g)[1]+' dmg · '+g.dur+'/'+repairMax(g)+' · uses '+(g.ammo==='shells'?'shells':'rounds'):g.slot==='bag'?'+'+g.cap+' capacity':'-'+g.dr+' damage taken';const sh=(g.r==='legendary'||g.r==='epic')?' shine'+(g.r==='legendary'?' leg':''):'';
    return `<div class="gear${eq?' eq':''}${sh}" style="border-left-color:${RAR[g.r||'common'].c}"><div class="e">${g.e}</div><div><div class="n">${esc(g.n)}${g.up?' <span style="color:var(--amber)">+'+g.up+'</span>':''}${temperOf(g)?` <span class="chip${g.temper==='perfect'?' a':g.temper==='crude'?' d':''}">${esc(temperOf(g).n)}</span>`:''} <span class="chip s">${g.slot}</span>${eq?' <span class="chip a">equipped</span>':''}</div><div class="d"><span class="rc-${g.r||'common'}">${RAR[g.r||'common'].n}</span> · ${d}${g.legend?' · '+g.legend:''}</div></div><div class="stack" style="gap:4px">${g.broken?'':`<button class="btn sm ${eq?'':'r'}" onclick="equip('${g.uid}')">${eq?'Unequip':'Equip'}</button>`}${repairMax(g)&&repairMissing(g)?`<button class="btn sm${g.broken?' r':''}${S.stock.scrap<repairCost(g)?' off':''}" onclick="repair('${g.uid}')">Repair ${repairCost(g)}🔩</button>`:''}${benchable(g)?`<button class="btn sm" onclick="benchSheet('${g.uid}')">🛠️ Workbench</button>`:''}<button class="btn sm ghost${giftBlocked(g)?' off':''}" onclick="giftSheet('${g.uid}')">Gift ${giftCost(g)}</button><button class="btn sm ghost" onclick="salvage('${g.uid}')">Salvage ${salvageValue(g)}🔩</button></div></div>`;}).join('')||'<p class="help">Nothing in this tab.</p>':'<p class="help">Bare hands. Garages, hardware stores and the police station have gear.</p>';
  // you
  $('#youAv').innerHTML=ART.avatarSVG(S.av,110,{weapon:eqItem('melee')?'melee':eqItem('ranged')?'gun':''});$('#youName').textContent=(S.name||'Survivor')+' · '+(CLASSES[S.cls]?CLASSES[S.cls].n:'')+' '+S.lvl;
  $('#youKv').innerHTML=`<span>HP</span><b>${S.hp} / ${maxHp()}</b><span>Damage</span><b>${eqItem('melee')?(eqItem('melee').dmg[0]+dmgBonus())+'-'+(eqItem('melee').dmg[1]+dmgBonus()):baseDmg()[0]+'-'+baseDmg()[1]} +${S.lvl-1}</b><span>Damage reduction</span><b>${dr()}</b><span>Kills</span><b>${S.kills}</b><span>Lifetime steps</span><b>${fmt(S.steps.total)}</b>${S.pet?`<span>Companion</span><b>${PETS[S.pet].e} ${PETS[S.pet].n}</b>`:''}`;$('#youXp').style.width=(S.xp/(S.lvl*40)*100)+'%';
  $('#cosmeticCount').textContent=S.cosmetics.length+' looks unlocked';
  $('#spSub').textContent=S.sp+' point'+(S.sp===1?'':'s')+' to spend';$('#youAlert').hidden=!S.sp;$('#clsDesc').textContent=(CLASSES[S.cls]?CLASSES[S.cls].e+' '+CLASSES[S.cls].n:'')+(S.bg&&BACKGROUNDS[S.bg]?' · '+BACKGROUNDS[S.bg].e+' '+BACKGROUNDS[S.bg].n+' background':'')+'. One point per level and per county milestone. General skills are open to every class.';
  const skAll=skillList();const skOpen=skAll.filter(s=>!s.req||S.lvl>=s.req);const skLocked=skAll.filter(s=>s.req&&S.lvl<s.req).sort((a,b)=>a.req-b.req);
  const skRow=(s,locked)=>{const r=sk(s.id);const can=!locked&&S.sp>0&&r<s.max;return `<div class="skill${r>=s.max?' max':''}${locked?' locked':''}"><div><b>${s.n} ${SKILLS.general.includes(s)?'<span class="chip" style="font-size:10px">general</span>':''}${locked?'<span class="chip a" style="font-size:10px">level '+s.req+'</span>':''}</b><span>${s.d(Math.max(1,r))}${r?' · now: '+s.d(r):''}</span><div class="pips">${Array.from({length:s.max},(_,i)=>`<i class="${i<r?'on':''}"></i>`).join('')}</div></div><button class="btn sm ${can?'a':''}" onclick="learn('${s.id}')" ${can?'':'disabled'}>${locked?'🔒':r>=s.max?'Max':'+'}</button></div>`;};
  const spent=Object.values(S.skills||{}).reduce((a,b)=>a+b,0);const total=skAll.reduce((a,s)=>a+s.max,0);
  $('#skills').innerHTML=skOpen.map(s=>skRow(s,false)).join('')+(skLocked.length?`<div class="section-label" style="margin-top:12px">Locked · keep levelling</div>`+skLocked.map(s=>skRow(s,true)).join(''):'')+`<p class="help" style="margin-top:10px">${spent} of ${total} ranks learned${skLocked.length?' · next unlock at level '+skLocked[0].req:''}.</p>`;
  {const down=S.crew.filter(c=>c.hp!==undefined&&c.hp<=0).length;
   $('#crewSub').textContent=S.active.length+' / '+crewSlots()+' active · '+S.crew.length+' total'+(down?' · '+down+' down':'');}
  $('#crewList').innerHTML=S.crew.length?S.crew.map(c=>{const act=S.active.includes(c.id);return `<div class="crew${act?' active':''}"><div class="av">${ART.avatarSVG(c.av,70)}</div><div><div class="nm">${esc(c.name)} <span class="chip a">Lv ${c.lvl}</span></div><div class="role">${ROLES[c.role].e} ${ROLES[c.role].n}</div><div class="tr">${ROLES[c.role].d(c.lvl+sk('leader'))}</div><div class="hpbar2" style="margin-top:6px"><i style="width:${Math.max(0,(c.hp===undefined?crewMax(c):c.hp)/crewMax(c)*100)}%"></i></div><div class="help" style="font-size:11px;margin-top:3px">${(c.hp||0)<=0?'<b style="color:#ff8a92">Down. Cannot fight.</b> Mends '+(18+(S.base&&S.base.rooms.clinic?18:0))+' HP a night, or patch them up now.':'HP '+(c.hp===undefined?crewMax(c):c.hp)+' / '+crewMax(c)+((c.hp===undefined?crewMax(c):c.hp)<crewMax(c)?' · mends '+(18+(S.base&&S.base.rooms.clinic?18:0))+' a night'+(S.base&&S.base.rooms.clinic?' (clinic)':''):'')}</div>
    <div class="xp" style="margin-top:6px"><i style="width:${Math.min(100,c.lvl>=5?100:c.xp/(c.lvl*6)*100)}%"></i></div><div class="help" style="font-size:11px;margin-top:3px">${c.lvl>=5?'Fully trained':'Experience '+c.xp+' / '+(c.lvl*6)+' to level '+(c.lvl+1)}</div>
    <div class="a2">${(c.hp||0)<=0?`<button class="btn sm r" onclick="healCrew('${c.id}')">Patch up (1 meds)</button>${S.active.length<crewSlots()?'<div class="help" style="font-size:11px;margin-top:4px">Their slot is free - bring someone else along meanwhile.</div>':''}`:`<button class="btn sm ${act?'':'r'}" onclick="toggleCrew('${c.id}')">${act?'Leave at base':'Bring along'}</button>${(c.hp===undefined?crewMax(c):c.hp)<crewMax(c)?`<button class="btn sm ghost" style="margin-top:4px" onclick="healCrew('${c.id}')">Patch up (1 meds)</button>`:''}`}</div></div></div>`;}).join(''):'<p class="help">Nobody yet. Survivors hide in the places you search.</p>';
  // base
  const bh=$('#baseHead');
  if(!S.base){bh.className='card blood';bh.innerHTML='<h2>No base yet</h2><p>Clear any place, then tap <b>Claim as base</b> on it. Where you set up matters: a police station comes with an armory and walls, a pharmacy with a clinic, a gas station with a generator. You can move later for 20 scrap.</p>';}
  else{bh.className='card';bh.innerHTML=`<h2>${S.base.e} ${esc(S.base.n)} <span class="sub">${esc(S.base.district)}</span></h2>${baseScene()}<p>${BASE_PERK[S.base.t]||''}</p><div class="def" style="margin-top:10px"><div class="big">${defense()}</div><div><div class="section-label">Defense</div><div class="help">${S.raidPending?(S.base.rooms.tower?'Watchtower spotted raiders. They hit at '+S.raidPending.hour+':00 today with strength '+S.raidPending.power+'.':'Something feels off today.'):'Raiders scale with your stash. Walls, towers and traps hold them off.'}</div><div class="help" style="margin-top:4px;color:var(--amber)">${hordeCountdown()}</div>
    <div class="help" style="margin-top:4px">Held ${baseDays()} day${baseDays()===1?'':'s'}${baseAgePower()?` · raiders hit ${baseAgePower()} harder for it. Moving resets that.`:''}</div>
    <div class="help" style="margin-top:4px">${S.base.geo?'This is also your <b>home</b> on the live map - same place, one pin. Stand within 60 m of it to stash.':'No map pin yet. Set one from the live map if you want to stash out walking.'}</div></div></div>`;}
  $('#baseAlert').hidden=!(S.raidPending&&S.base&&S.base.rooms.tower);
  $('#stock').innerHTML=['food','water','meds','scrap','ammo'].concat(eventNow()==='halloween'?['candy']:[]).map(k=>`<div class="s"><div class="e">${{food:'🥫',water:'💧',meds:'💊',scrap:'🔩',ammo:'📦',candy:'🍬'}[k]}</div><b>${k==='meds'?medsTotal():(S.stock[k]||0)}</b><span>${CAT_LABEL[k]||'Candy'}</span></div>`).join('')+`<div class="s"><div class="e">🛡️</div><b>${defense()}</b><span>Defense</span></div>`
  // Break the med pile out by tier and say what each is worth against HER bar
  // right now, so a trauma kit is visibly not a bandage.
  {const el=$('#medRow');if(el){const have=medsAll();
    const chip=(id,k,lbl)=>`<span class="chip${id==='bloodbag'||id==='adrena'?' l':id==='kit'?' a':''}">${MEDS[id].e} ${esc(MEDS[id].n)} <b>x${k}</b>${lbl?' <span class="sub">'+lbl+'</span>':''} · +${Math.min(medHeal(id),maxHp())}</span>`;
    el.innerHTML=have.length
      ? '<div class="section-label">Your meds</div><div class="row" style="margin-top:4px">'
        +have.map(x=>(x.pack?chip(x.id,x.pack,'on you'):'')+(x.stock?chip(x.id,x.stock,'stashed'):'')).join('')
        +'</div>'
        +(packMedsTotal()?'<p class="help" style="margin-top:4px">Meds <b>on you</b> are in your pack - you lose them if you go down, so spend those first.</p>':'')
      : '<p class="help">No meds. The trader sells everything from bandages to a blood bag.</p>';}}
    +(S.stock.chests>0?`<button class="s chestbtn" onclick="openStashChest()"><div class="e">🧳</div><b>${S.stock.chests}</b><span>${S.keys>0?'Open one':sk('lockpick')?'Pick one':'Locked'}</span></button>`:'');
  $('#dropRow').hidden=!(S.base&&S.base.rooms.radio);const used=S.flags.dropDate===S.steps.date;$('#dropBtn').textContent=used?'📻 Drop used today':'📻 Call in today\'s supply drop';$('#dropBtn').classList.toggle('ghost',used);$('#dropHelp').textContent=used?'Next one after midnight.':'Three free items into your pack.';
  const wk=S.work;$('#workCard').hidden=!(S.base&&wk);if(S.base&&wk){$('#workCard').innerHTML=`<h2>Under construction <span class="sub">${BUILD[wk.k].e} ${BUILD[wk.k].n} L${wk.lvl}</span></h2><div class="progress" style="margin-top:8px"><div class="bar"><i style="width:${Math.min(100,wk.done/wk.need*100)}%;background:linear-gradient(90deg,var(--amber),#ffd166)"></i></div><div class="row"><span><b>${fmt(Math.min(wk.done,wk.need))}</b> / ${fmt(wk.need)} steps of work</span><span>${fmt(Math.max(0,wk.need-wk.done))} to go</span></div></div><p class="help" style="margin-top:6px">Every step you walk is labor on it. Bigger builds take more walking. One job at a time.</p><div class="row" style="margin-top:6px"><button class="btn sm ghost" onclick="cancelWork()">Cancel (refund ${wk.scrap} scrap)</button></div>`;}
  $('#build').innerHTML=S.base?Object.entries(BUILD).map(([k,b])=>{const l=S.base.rooms[k]||0;const c=buildCost(k);const lb=buildLabor(k);const busy=!!S.work;return `<div class="room2${l?' own':''}"><div class="e">${b.e}</div><div class="t"><b>${b.n}${l?' L'+l:''}${b.def[l-1]?' · +'+b.def[l-1]+' def':''}</b><span>${b.d}${c!==null?' · next: '+c+' scrap + '+fmt(lb)+' steps':' · maxed'}</span></div>${c!==null?(busy&&S.work.k===k?'<span class="chip a">building</span>':`<button class="btn sm a" onclick="build('${k}')"${busy?' disabled':''}>Build</button>`):'<span class="chip z">max</span>'}</div>`;}).join(''):'<p class="help">Claim a base to build.</p>';
  $('#raidLog').innerHTML=S.raids.length?S.raids.map(r=>`<li><time>${r.t.slice(5)}</time><span>${r.by?esc(r.by)+': ':''}${r.repelled?(r.fought?'You fought them off yourself.':'Held: '+r.def+' def vs '+r.power+'.'):'Broke in ('+r.power+' vs '+r.def+'). Took '+Object.entries(r.stolen).map(([k,v])=>v+' '+k).join(', ')+'.'}</span></li>`).join(''):'<li><span class="help">No raids yet. They start the day after you claim a base.</span></li>';
  $('#shelfSub').textContent=S.shelf.length+' found';const shelfIds=Object.entries(ITEMS).filter(([k,v])=>v.cat==='shelf');const owned=S.shelf.reduce((m,x)=>{m[x.id]=(m[x.id]||0)+1;return m;},{});
  $('#shelf').innerHTML=shelfIds.map(([k,v])=>`<div class="it${owned[k]?'':' locked'}"><div class="e">${v.e}</div><span class="rc-${v.r}">${v.n}${owned[k]>1?' x'+owned[k]:''}</span></div>`).join('');
  $('#goalInput').value=S.goal;$('#nameInput').value=S.name;$('#sfxBtn').textContent=S.sfx?'On':'Off';const vs=$('#verSub');if(vs)vs.textContent='v'+VERSION;const bi=backupInfo();const ub=$('#undoRow');if(ub){ub.hidden=!bi;if(bi)$('#undoBtn').textContent='Undo restore (put back the save from '+ago(bi.t)+')';}
  const snList=snapshots();const snEl=$('#snapList');if(snEl)snEl.innerHTML=snList.length?snList.map((s,i)=>`<div class="lbrow"><div class="rk">${i+1}</div><div class="nm">${esc(s.name||'Survivor')} · level ${s.lvl}<small>${fmt(s.steps)} lifetime steps · ${esc(ago(s.t))}${s.why&&s.why!=='auto'?' · '+esc(s.why):''}</small></div><div class="sc"><button class="btn xs" onclick="restoreSnapshot(${i})">Go back</button></div></div>`).join(''):'<p class="help">None yet. One every few minutes while you play, thinning to about one an hour further back, plus one before anything risky.</p>';if(CLOUD_SNAPS===null&&O().ok)loadCloudSnaps();else renderCloudSnaps();renderRecov();renderStepSync();
  // county
  renderMap();renderParty();renderBoss();renderDeal();renderEvent();renderStory();renderShop();renderPet();renderStuck();
  const tier=TIERS[S.league.tier];$('#tierBadge').textContent=tier.e;$('#tierName').textContent=tier.n;$('#tierSub').textContent='Tier '+(S.league.tier+1)+' of '+TIERS.length+' · stash x'+tier.mult;
  const end=new Date(weekStart());end.setDate(end.getDate()+7);const left=Math.max(0,end-Date.now());$('#weekChip').textContent='Week of '+S.league.week;$('#resetChip').textContent=Math.floor(left/86400000)+'d '+Math.floor(left%86400000/3600000)+'h left';
  const b=board();$('#board').innerHTML=b.map((r,i)=>`<div class="lbrow${r.me?' me':''}"><div class="rk">${i+1}</div><div class="av">${ART.avatarSVG(r.av,40)}</div><div class="nm">${esc(r.n)}${r.me?' (you)':''}<small>${r.me?'stash runs to score':esc(r.blurb)}</small></div><div class="sc">${fmt(r.s)}</div></div>`).join('');
  const myRank=b.findIndex(r=>r.me)+1;const lead=b[0].me?b[1]:b[0];$('#boardHelp').textContent=myRank===1?'You are in first. Hold it through Sunday night to move up.':'You are #'+myRank+', '+fmt(lead.s-S.league.score)+' behind '+lead.n+'. They keep walking while you sleep.';
  $('#radio').innerHTML=radioLines().map(l=>`<li><time>${l.t}</time><span>${esc(l.m)}</span></li>`).join('');
  $('#seasons').innerHTML=S.league.history.length?S.league.history.map(h=>`<li><time>${h.week.slice(5)}</time><span>#${h.rank} · ${fmt(h.score)} pts · ${TIERS[h.tier].n}${h.delta>0?' → promoted':h.delta<0?' → dropped':' → held'}</span></li>`).join(''):'<li><span class="help">First week still running.</span></li>';
  if(S.league.history.length&&S.league.seen!==S.league.history[0].week&&!S.combat){const h=S.league.history[0];S.league.seen=h.week;save();openSheet(`<h2>Week over</h2><div class="big">${h.delta>0?'🏆':h.delta<0?'📉':'⚔️'}</div><p>Week of ${h.week}: <b>#${h.rank}</b> with ${fmt(h.score)} points in ${TIERS[h.tier].n}. ${h.delta>0?'Promoted to '+TIERS[S.league.tier].n+'. Rivals and raiders get harder.':h.delta<0?'Dropped to '+TIERS[S.league.tier].n+'.':'You held your tier.'}</p><button class="btn r wide" onclick="closeSheet()">New week</button>`);}
  renderOnline();renderFriends();renderPush();rivalRow();renderTrader();renderWatch();if(typeof renderStreet==='function')renderStreet();animate();raidTick();hordeTick();
}
function renderLoc(){
  const el=$('#locCard');const loc=S.loc;if(!loc){el.hidden=true;return;}el.hidden=false;el.className='card amber';
  if(loc.stronghold){
    const stageNames=['the gate','the yard','the boss trailer'];const next=loc.stage<3?stageNames[loc.stage]:null;
    el.innerHTML=`<h2>🏴 ${esc(loc.n)} <span class="sub">stage ${loc.stage}/3</span></h2><p><b style="color:var(--bone)">WANTED: ${esc(bossName())}</b>. Fires, tents, a trailer with a padlock. Fight through ${next?next:'nothing, it is yours'}${loc.stage<3?', or take what you have and go':''}. Every stage you clear opens its loot.</p>
    ${loc.stage>0?`<div class="row" style="margin:8px 0 4px;justify-content:space-between"><span class="section-label">Noise</span></div><div class="noise"><i style="width:${loc.noise}%"></i></div><div class="rooms" style="margin-top:12px">${loc.rooms.map((r,i)=>`<button class="room${r.done?' done':''}" onclick="searchRoom(${i})" ${r.done||r.stage>loc.stage?'disabled':''}><span class="n">${esc(r.n)}</span><span class="m">${r.done?'searched':r.stage>loc.stage?'locked: stage '+r.stage:'noise +'+r.noise}</span></button>`).join('')}</div>`:''}
    ${loc.found.length?`<div class="section-label" style="margin-top:12px">Found here</div><div class="loot" style="margin-top:6px">${loc.found.map(it=>`<div class="item r-${it.r||'common'}"><span class="e">${it.e}</span>${esc(it.n)}<span class="pt">+${it.pts}</span></div>`).join('')}</div>`:''}
    ${bankedLine()}<div class="grid2" style="margin-top:12px">${next?`<button class="btn d" onclick="pushStage()">Push to ${next}</button>`:`<button class="btn" onclick="claimBase()">${S.base?'Move base here · compare first':'Claim as base'}</button>`}<button class="btn ${next?'':'r'}" onclick="leaveLoc()">${loc.stage?'Take the loot and go':'Keep walking'}</button></div>`;return;}
  if(loc.rival){const r=RIVALS.find(x=>x.id===loc.rival);const first=r.n.split("'")[0];
    const body=loc.rival==='theo'?`<p><b style="color:var(--bone)">${esc(r.n)}</b> is jogging up the other side of the street toward the same door. Theo grins at you.</p><div class="grid2" style="margin-top:12px"><button class="btn r" onclick="rivalAct('race')">Race them in (${Math.round((0.5+(S.lvl-1)*0.03+roleLvl('scout')*0.05)*100)}%)</button><button class="btn" onclick="rivalAct('wait')">Let them go first</button></div><p class="help" style="margin-top:8px">Win the race: first pick, 30% more loot. Lose: scraps. Wait: they clear the walkers for you, costs 150 steps.</p>`
      :loc.rival==='maya'?`<p><b style="color:var(--bone)">${esc(r.n)}</b> has a fire going out front. Maya waves you over: "Three food for two antibiotics. Fair?"</p><div class="grid2" style="margin-top:12px"><button class="btn a" onclick="rivalAct('trade')">Trade (3 food → 2 antibiotics)</button><button class="btn" onclick="S.loc.rival='';save();render()">No thanks</button></div>`
      :`<p><b style="color:var(--bone)">${esc(r.n)}</b>. Two of Nadia's scouts are watching the door from a truck bed. They have seen you.</p><div class="grid2" style="margin-top:12px"><button class="btn d" onclick="rivalAct('fight')">Take them on</button><button class="btn" onclick="rivalAct('slip')">Slip past (100 steps)</button></div><p class="help" style="margin-top:8px">Beat them: their ammo and scrap are yours.</p>`;
    el.innerHTML=`<h2>${loc.e} ${esc(loc.n)} <span class="sub">rival crew</span></h2>`+body;return;}
  if(!loc.cleared){el.innerHTML=`<h2>${loc.e} ${esc(loc.n)} <span class="sub">unknown</span></h2><p>Door is ajar. No telling what is inside. Threat here: ${'☠'.repeat(Math.min(5,Math.round(district().threat*loc.threat+(isNight()?1:0))))}${isNight()?' · horde night':''}</p>${bankedLine()}<div class="grid2" style="margin-top:12px"><button class="btn r" onclick="enterLoc()">Go in</button><button class="btn" onclick="leaveLoc()">Keep walking</button></div>`;return;}
  const done=loc.rooms.every(r=>r.done);
  el.innerHTML=`<h2>${loc.e} ${esc(loc.n)} <span class="sub">${loc.rooms.filter(r=>r.done).length}/${loc.rooms.length} searched</span></h2>
  <div class="row" style="margin:8px 0 4px;justify-content:space-between"><span class="section-label">Noise</span><span class="help">${loc.noise>=70?'Something is stirring':loc.noise>=40?'Keep it down':'Quiet'}</span></div><div class="noise"><i style="width:${loc.noise}%"></i></div>
  <div class="rooms" style="margin-top:12px">${loc.rooms.map((r,i)=>`<button class="room${r.done?' done':''}" onclick="searchRoom(${i})" ${r.done?'disabled':''}><span class="n">${r.sealed?'🔒 ':''}${esc(r.n)}</span><span class="m">${r.done?'searched':r.sealed?'<b style="color:var(--blood)">SEALED - something is in there</b>':'noise +'+r.noise}</span>${r.peek&&!r.done?`<span class="peek">🔭 ${esc(r.peek)}</span>`:''}</button>`).join('')}</div>
  ${loc.found.length?`<div class="section-label" style="margin-top:12px">Found here</div><div class="loot" style="margin-top:6px">${loc.found.map(it=>`<div class="item r-${it.r||'common'}"><span class="e">${it.e}</span>${esc(it.n)}<span class="pt">+${it.pts}</span></div>`).join('')}</div>`:''}
  ${bankedLine()}<div class="grid2" style="margin-top:12px"><button class="btn ${done?'r':''}" onclick="leaveLoc()">${done?'Move on':'Leave the rest'}</button><button class="btn" onclick="claimBase()">${S.base?'Move base here · compare first':'Claim as base'}</button></div>`;
}
function bankedLine(){const b=S.walk.banked||0;if(!b)return '';const d=district();const avg=(d.dist[0]+d.dist[1])/2;const n=Math.floor(b/avg);return `<p class="help" style="margin-top:10px">🚶 <b style="color:var(--bone)">${fmt(b)} steps saved</b> while you stop here. They carry you onward the moment you leave${n>=1?' (about '+n+' more place'+(n>1?'s':'')+' already reached)':''}.</p>`;}
function baseScene(st){st=st||S;if(!st.base)return '';
  const r=st.base.rooms||{};const night=isNight();const col={house:'#4a3d44',pharmacy:'#2f4a5a',gas:'#5a4a2f',grocery:'#2f5a44',police:'#2f3a5a',clinic:'#5a2f3a',hardware:'#5a3f2f',surplus:'#3f4a2f',stronghold:'#5a2a22'}[st.base.t]||'#4a3d44';
  let s=`<svg viewBox="0 0 360 170" style="width:100%;display:block;border-radius:8px;margin-top:10px;background:${night?'#0b0b10':'#22202a'}" role="img" aria-label="Your base">`;
  s+=`<rect x="0" y="120" width="360" height="50" fill="${night?'#17151a':'#2b2528'}"/>`;
  if(r.generator)s+=`<circle cx="180" cy="60" r="140" fill="#e6a530" opacity=".07"><animate attributeName="opacity" values=".07;.05;.08;.07" dur="3.1s" repeatCount="indefinite"/></circle>`;
  s+=`<rect x="120" y="40" width="120" height="82" fill="${col}"/><path d="M110 40 L180 8 L250 40z" fill="#1a1719"/><rect x="168" y="86" width="24" height="36" fill="#0d0c0e"/><rect x="136" y="56" width="20" height="18" fill="${r.generator?'#ffd98a':'#161418'}"/><rect x="204" y="56" width="20" height="18" fill="${r.generator?'#ffd98a':'#161418'}"/>`;
  s+=`<text x="180" y="34" text-anchor="middle" font-size="16">${st.base.e}</text>`;
  const tro=(st.shelf||[]).slice(-6);if(tro.length){s+=`<rect x="124" y="82" width="112" height="3" fill="#7a6a5a"/>`;tro.forEach((it,i)=>{s+=`<text x="${131+i*18}" y="80" font-size="11">${it.e}</text>`;});}
  if(r.bell)s+=`<g><animateTransform attributeName="transform" type="rotate" values="-8 180 4;8 180 4;-8 180 4" dur="2.2s" repeatCount="indefinite"/><path d="M176 6 q4 -6 8 0 v6 h-8z" fill="#e6a530"/><circle cx="180" cy="13" r="1.5" fill="#5a3a1a"/></g>`;
  if(r.forge)s+=`<rect x="96" y="90" width="18" height="30" fill="#3a2a2a"/><circle cx="105" cy="100" r="4" fill="#ff7a30"><animate attributeName="r" values="3.5;5;4;5.5;3.5" dur="0.9s" repeatCount="indefinite"/></circle><circle cx="105" cy="100" r="9" fill="#ff7a30" opacity=".18"><animate attributeName="opacity" values=".12;.28;.12" dur="0.9s" repeatCount="indefinite"/></circle><circle cx="103" cy="84" r="2" fill="#777" opacity=".5"><animate attributeName="cy" values="86;66" dur="2.4s" repeatCount="indefinite"/><animate attributeName="opacity" values=".5;0" dur="2.4s" repeatCount="indefinite"/></circle>`;
  if(r.workshop)s+=`<rect x="60" y="98" width="30" height="22" fill="#4a3f34"/><path d="M58 98 l17 -10 l17 10z" fill="#2a2320"/>`;
  if(r.kennel)s+=`<rect x="250" y="102" width="22" height="18" fill="#6a4a2a"/><path d="M248 102 l13 -9 l13 9z" fill="#3a2a1a"/><rect x="257" y="110" width="8" height="10" fill="#1a1410"/>`;
  if(r.vault)s+=`<rect x="206" y="100" width="16" height="16" fill="#555a66"/><circle cx="214" cy="108" r="3" fill="#2a2a30"/>`;
  const wl=r.walls||0;if(wl){const hh=10+wl*8;for(let x=8;x<352;x+=16){if(x>110&&x<250)continue;s+=`<rect x="${x}" y="${120-hh}" width="10" height="${hh}" fill="${wl>=3?'#6a6a74':'#5a4a3a'}"/>`;}s+=`<rect x="0" y="${120-hh-3}" width="112" height="4" fill="#3a3a44"/><rect x="248" y="${120-hh-3}" width="112" height="4" fill="#3a3a44"/>`;}
  if(r.tower){const th=(r.tower||1)*22+30;s+=`<rect x="300" y="${120-th}" width="8" height="${th}" fill="#5a4a3a"/><rect x="292" y="${120-th-14}" width="24" height="16" fill="#3a3335"/><circle cx="304" cy="${120-th-8}" r="3" fill="#ffd166"><animate attributeName="opacity" values="1;.4;1" dur="2.8s" repeatCount="indefinite"/></circle>`;}
  if(r.traps){for(let i=0;i<r.traps*4;i++){const x=20+i*14;s+=`<path d="M${x} 120 l4 -9 l4 9z" fill="#8a8a94"/>`;}}
  if(r.garden){for(let i=0;i<r.garden*3;i++){const x=258+i*16;s+=`<rect x="${x}" y="108" width="12" height="12" fill="#3a2a1a"/><circle cx="${x+6}" cy="106" r="5" fill="#7fbf4d"/>`;}}
  if(r.radio)s+=`<path d="M232 40 v-30 M226 16 h12 M228 24 h8" stroke="#8fb3c9" stroke-width="2"/><circle cx="232" cy="10" r="2" fill="#ff5a6a"><animate attributeName="opacity" values="1;0.2;1" dur="1.6s" repeatCount="indefinite"/></circle>`;
  if(r.generator)s+=`<rect x="96" y="104" width="22" height="16" fill="#3a3a44"/><rect x="100" y="98" width="6" height="8" fill="#555"/>`;
  if(r.bunk)s+=`<path d="M40 120 l18 -22 l18 22z" fill="#4a5a44"/><rect x="54" y="106" width="8" height="14" fill="#1a1a1e"/>`;
  if(r.clinic)s+=`<rect x="126" y="44" width="10" height="10" fill="#e8f4f8"/><path d="M131 45 v8 M127 49 h8" stroke="#c22b3a" stroke-width="2"/>`;
  if(r.armory)s+=`<rect x="256" y="104" width="18" height="16" fill="#5a4a3a"/><path d="M256 112 h18" stroke="#2a1a0a" stroke-width="2"/>`;
  const crew=(st===S?activeCrew():((st.active||[]).map(id=>(st.crew||[]).find(c=>c.id===id)).filter(Boolean))).slice(0,3);crew.forEach((c,i)=>{s+=`<svg x="${28+i*30}" y="86" width="26" height="34" viewBox="0 0 100 130"><g><animateTransform attributeName="transform" type="translate" values="0 0;0 -3;0 0" dur="${(2.2+i*0.4).toFixed(1)}s" repeatCount="indefinite"/>${ART.avatarSVG(c.av,100).replace(/<svg[^>]*>|<\/svg>/g,'')}</g></svg>`;});
  s+=`<svg x="150" y="80" width="30" height="40" viewBox="0 0 100 130"><g><animateTransform attributeName="transform" type="translate" values="0 0;0 -3;0 0" dur="2.6s" repeatCount="indefinite"/>${ART.avatarSVG(st.av,100).replace(/<svg[^>]*>|<\/svg>/g,'')}</g></svg>`;
  if(st.pet)s+=`<svg x="185" y="100" width="20" height="20" viewBox="0 0 64 64">${ART.petSVG(st.pet,64,st.petCoat,{still:true}).replace(/<svg[^>]*>|<\/svg>/g,'')}</svg>`;
  if(night)s+=`<circle cx="40" cy="26" r="12" fill="#e8e0d0" opacity=".8"/>`;
  s+='</svg>';return s;
}
function renderEvent(){const el=$('#eventCard');if(!el)return;const ev=eventNow();if(ev!=='halloween'){el.hidden=true;return;}el.hidden=false;el.className='card amber';const candy=S.stock.candy||0;
  el.innerHTML=`<h2>🎃 Hollow-een <span class="sub">until Nov 2</span></h2><p>Candy turns up in rooms all event long, and the Gourd King holds every stronghold. Spend candy on costumes that stay forever.</p><div class="row" style="margin:8px 0"><span class="chip a">🍬 ${candy} candy</span></div><div class="stack">${HALLOWEEN_SHOP.map(x=>`<div class="room2${S.cosmetics.includes(x.id)?' own':''}"><div class="e">🎃</div><div class="t"><b>${x.n}</b><span>${S.cosmetics.includes(x.id)?'yours':x.c+' candy'}</span></div>${S.cosmetics.includes(x.id)?'<span class="chip z">owned</span>':`<button class="btn sm a" onclick="buyCandy('${x.id}',${x.c})">Buy</button>`}</div>`).join('')}</div>`;}
function renderStory(){const el=$('#story');if(!el)return;const got=STORY.filter(s=>(S.story||[]).includes(s.id));el.innerHTML=got.length?got.slice().reverse().map(s=>`<li><time>${esc(s.t)}</time><span>${esc(s.txt)}</span></li>`).join(''):'<li><span class="help">Only static so far.</span></li>';$('#storySub').textContent=got.length+' / '+STORY.length;}
function renderRaidCard(){const el=$('#raidCard');if(!S.raidPending||!S.base||!S.base.rooms.tower){el.hidden=true;return;}el.hidden=false;el.className='card blood';el.innerHTML=`<h2>🗼 Raiders spotted</h2><p>The watchtower saw a crew heading for ${esc(S.base.n)}. Expected around ${S.raidPending.hour}:00 today, strength ${S.raidPending.power} against your ${defense()} defense. Build now, or be home to fight.</p>`;}
function renderContracts(){
  const d=S.ct.daily||[];const w=S.ct.weekly;$('#contractsSub').textContent=d.filter(c=>c.done).length+'/'+d.length+' today';
  const row=(t,n,goal,done,reward)=>`<div class="contract${done?' done':''}"><div><b>${CT_TYPES[t].n}${goal>1?' '+fmt(goal)+' '+CT_TYPES[t].u:''}</b><span>${done?'Done. ':''}${reward}</span><div class="bar"><i style="width:${Math.min(100,n/goal*100)}%"></i></div></div><div class="num" style="font-size:20px;color:${done?'var(--rot)':'var(--bone2)'}">${done?'✓':fmt(Math.min(n,goal))+'/'+fmt(goal)}</div></div>`;
  let html=d.map(c=>row(c.t,c.n,c.goal,c.done,'+'+c.reward.scrap+' scrap, +'+c.reward.xp+' XP'+(c.reward.key?', +1 key':''))).join('');
  if(w){const left=w.goals.filter(g=>g.n<g.goal).length;
    html+=`<div class="section-label" style="margin-top:10px">This week${w.done?' - done':''}</div>`
      +`<p class="help" style="margin:0 0 6px">All three by Sunday night: +1 chest key, a cosmetic, +200 points.</p>`
      +w.goals.map(g=>row(g.t,g.n,g.goal,g.n>=g.goal,g.n>=g.goal?'Done.':(left===1?'Last one this week.':left+' left this week'))).join('');}
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
// ---- What's new: the game tells everyone itself (v6.2) ----
// Newest first. Every player sees the entries they have not read yet, once,
// the next time they open the game. Nobody has to be told anything by hand.
const NEWS=[
 {v:'6.88',d:'Sep 19',t:'Get Contents of URL is the one to use, and the setup guide now builds it',
  i:['YOU ASKED WHICH IS BETTER AND THE ANSWER IS GET CONTENTS OF URL. It posts your steps and finishes. The Open URLs kind <b>opens the game every single time it runs</b> - on a daily automation that is your phone launching a game by itself, and it only ever existed to dodge a timeout whose real cause was Fill Missing, which is already off.',
     'The setup guide was still walking you through building the Open URLs one. It now builds the direct one, with Fill Missing called out in the step it lives in. The Open URLs recipe is still there in a fold if you want fewer taps.',
     'And if yours currently says Open URLs, the Steps card now has the steps to switch it over - only the last action changes, the first two stay exactly as they are.']},
 {v:'6.87',d:'Sep 19',t:'The card asks which shortcut you have before telling you to change it',
  i:['YOU SAID IT WORKED UNTIL WE STARTED CHANGING IT, AND THAT IS THE ANSWER. The <b>Get Contents of URL</b> shortcut posts straight to the server and never opens a browser, so it cannot misdeliver your steps. It is the shape that worked. The only reason it was replaced was a timeout, and the real cause of that turned out to be <b>Fill Missing</b> being on - which is already off now.',
     'So the Steps card now asks which last action you have FIRST, and shows only the instructions for that one. If yours says Get Contents of URL there is no address to replace and there never was - that card was about the other kind of shortcut the whole time.',
     'Each branch carries the test that can say something about it: <b>Test my key</b> makes the exact call your Get Contents of URL shortcut makes and prints the answer on the card, and <b>Test this address</b> opens the link the way an Open URLs shortcut would.']},
 {v:'6.86',d:'Sep 19',t:'A button that tests the address without the shortcut',
  i:['NOTHING POPPED UP IN SAFARI, and I could not tell you whether that was the address, the key, the shortcut or my own code. So now you can find out in one tap.',
     '<b>Test this address</b> on the Steps card opens the link exactly the way your shortcut would, with 7 steps standing in for your real count. A black screen with a green tick means the address and your key are both fine and whatever is still wrong lives inside the shortcut. Nothing at all means it is mine.',
     'ALSO WORTH CHECKING: scroll to the LAST action in your shortcut. If it says <b>Get Contents of URL</b> rather than <b>Open URLs</b>, you have the other kind - it posts straight to the server and never opens Safari at all, so there is no address to replace and nothing was ever going to pop up. That one just needs Fill Missing off.']},
 {v:'6.85',d:'Sep 19',t:'The notice was hidden inside two closed folds',
  i:['I PUT YESTERDAY\'S FIX WHERE YOU COULD NOT SEE IT. The "your address changed" box went into a collapsed section inside another collapsed section, so the one person who needed it never found it. That is not a small thing - the fix was useless until you could reach it.',
     'The new address is now the first thing on the Steps card, with its own Copy button, and <b>Fix my shortcut</b> - the button that was already sitting there - now hands you the same address and the three steps to paste it in.']},
 {v:'6.84',d:'Sep 19',t:'"Nothing came back" was wrong, and it was my fault',
  i:['THE DIALOG WAS LYING TO YOU. Yesterday\'s shortcut ends in Open URLs, and on an iPhone that hands the link to SAFARI - never to the app on your home screen. Those are two separate copies of the game with two separate saves. So the number was read off your phone correctly, opened Safari correctly, and landed in a blank copy of Dead Miles that has never been signed in. Your real game never saw it, and then told you nothing came back.',
     'It gets worse: the game sat there polling the server for 16 seconds while iOS had switched you to Safari. It could not have seen anything no matter what happened. It was describing its own blindness as your failure, which is the exact opposite of useful.',
     'FIXED. The address now carries your key. Whichever copy of the game opens it - Safari, the home screen, a browser you have never used - it posts the number to the SERVER, shows you a green tick, and your real game picks it up within the minute. It no longer matters where iOS decides to open the link.',
     'YOU HAVE TO REPLACE THE ADDRESS INSIDE YOUR SHORTCUT ONCE. Settings has the new one with a Copy button. Nothing else about the shortcut changes - same three actions, same Sum bubble at the end.',
     'And the dialog now keeps quiet when the shortcut took you out of the app, instead of accusing it of doing nothing.']},
 {v:'6.83',d:'Sep 19',t:'The game now shows you what your phone actually sent',
  i:['YOUR HEALTH SAYS 3,338 AND THE GAME SAYS 14. Those steps are on your phone, so the break is somewhere between Health and here - and until now the game only ever reported the HIGHEST number it had received, which cannot tell "it never ran" apart from "it ran and sent the wrong number". Those two have opposite fixes.',
     'The Steps card and the sync check now list every post your phone has made today, with the time each one arrived. Nothing listed means iOS never delivered anything - that is a Shortcut or a Health permission problem, not a game one. Posts listed but all carrying the SAME number means your Shortcut is running fine and sending a fixed value instead of your step count, and the game now says that in those words.',
     'A FIXED VALUE USUALLY MEANS THE WRONG BUBBLE. If the thing attached at the end of your Shortcut is the Health Samples themselves rather than the Sum from Calculate Statistics, iOS sends one sample - a couple of minutes of walking - instead of your day.',
     'So the game stopped depending on it. The address now accepts the whole list of samples and adds them up itself: 14, 226, 98 becomes 338. Either bubble works now, and a single number like 3,338 still reads as 3,338.',
     'None of this can inflate you. A repeat of a number you already have changes nothing, and a lower one never drags your total down.']},
 {v:'6.81',d:'Sep 19',t:'A Shortcut that cannot time out',
  i:['FILL MISSING was the bug. Your Find Health Samples action had it switched on, which tells Health to invent an entry for every gap it can find - so it grinds through your whole history instead of reading today. That is why Group by Day changed nothing: the slow part was never the grouping. Turn it OFF and the existing shortcut should stop timing out.',
     'Your triggers were also stacked hourly - At 22:00 or At 21:00 or At 20:00, all the way down. That is why the failure notification kept coming back all day: it was running every hour and failing every hour.',
     'AND THE REAL FIX: the setup now builds a shortcut with NO SERVER CALL IN IT. Find Health Samples, Sum, and Open URLs pointing at the game with the number in the address. There is nothing to wait for, so there is nothing that can time out. The game takes the number the moment it opens and sends it on itself, over the connection your leaderboard already uses.',
     'It works whether the game was closed or already open, the same number twice does not double, and a lower number never drags your total down.',
     'The old direct-to-server version is still in Settings under a fold if you want it.']},
 {v:'6.80',d:'Sep 19',t:'The sync check now times the exact thing your Shortcut waits on',
  i:['"Server answers in 120 ms" was never the right measurement. Your Shortcut does not talk to that function - its last action sits on the STEP endpoint until that returns, and nothing was timing it.',
     'The check now probes that endpoint directly with a deliberately invalid key, so it refuses instantly and writes nothing, and reports the round trip in milliseconds. Under 1.5 seconds and it tells you this is not your problem. Over, and it says so plainly, because iOS gives a Shortcut only a few seconds when it runs on a schedule.',
     'Run "Why aren\'t my steps syncing?" on the Steps card and read the new line.']},
 {v:'6.79',d:'Sep 19',t:'The Shortcut button tells you when nothing came back',
  i:['Tapping the button asked iOS to run your Shortcut, said "Opening Shortcuts...", quietly checked four times, and then said NOTHING if nothing arrived. A deep link to a Shortcut that has been renamed or deleted does not fail - iOS just ignores it. So the button looked like it stopped working, with no way to tell which end was broken.',
     'If no steps arrive within 16 seconds it now says so, names the three things it can be - your Shortcut has a different name, it lost its Health permission after an iOS update, or it is sending the wrong key - and puts "Check my sync" and "Rename my shortcut" one tap away.',
     'When it works, it stays quiet.',
     'The game side was checked end to end and is fine: given steps on the server it takes them correctly. "Why aren\'t my steps syncing?" on the Steps card already tells you exactly which link in the chain is broken - it is worth running first.']},
 {v:'6.78',d:'Sep 19',t:'Your new gloves and boots were invisible',
  i:['Gear has never gone in your pack - it goes straight to GEAR, under You. But when v6.72 added the Hands and Feet slots, the Armor tab kept its own old list of what counts as armour, so gauntlets and boots were filed correctly and then filtered out of the only screen you would look for them on. The tab count was wrong too.',
     'They are all there and they have been the whole time. The Armor tab now reads from the one list of armour slots, so this cannot drift again.',
     'And the message when you find gear now tells you where it went, instead of leaving you to hunt through your bag for something that was never going to be in it.']},
 {v:'6.77',d:'Sep 19',t:'Sealed rooms, fists that are no longer better than a katana, and the friend the board was hiding',
  i:['SEALED ROOMS. About 1 place in 40 now has a door somebody locked from the OUTSIDE - a chained meat locker, a nailed-shut nursery, a bricked-up stairwell, a bolted storm cellar. It is not searched, it is broken into, and one of four named things is still awake in there. Clearing one pays around 50 scrap, 2 keys, half a dozen rare-or-better items, a trauma kit and a 35% legendary roll. You can always leave it sealed.',
     'YOUR FISTS WERE BETTER THAN A KATANA. baseDmg added your full level, and then the swing added your level AGAIN - so bare hands got it twice while every weapon got it once. At level 22 that was fists 48 against a katana\'s 46, and fists never break and cost nothing. Fists now land around the worst weapon in the game, which is what they are for: saving your good weapon on a walker.',
     'FRIENDS WHO HAVE NOT WALKED THIS WEEK WERE VANISHING. The leaderboard only ever asked for this week\'s rows, so anyone in your party who had not been out since Monday showed up as nothing at all - no name, no steps. Party members are now filled in from their own record and marked "not out this week", listed after everyone who is actually walking.']},
 {v:'6.76',d:'Sep 19',t:'Horde night stopped restarting every time you claimed a base',
  i:['Claiming or moving a base wiped your horde clock - a missing pair of braces meant it ran on EVERY claim, not just a move. The seven days started over, and the count of hordes you had survived went to zero with it, which is the thing that makes them get harder each time.',
     'That is why the countdown looked frozen: it was not stuck, it was being reset.',
     'The horde comes for YOU, not for the building. Your clock and your record now follow you when you move, and the move screen says so.',
     'The countdown itself was fine - checked across a full week, it ticks down to "Horde night is here" exactly as it should.']},
 {v:'6.75',d:'Sep 19',t:'The map fix from yesterday never actually reached your phone',
  i:['v6.69 fixed the map throwing away the buildings closest to you. It did not work for anyone, and the reason is embarrassing: places are cached on your phone per area for SEVEN DAYS, and the cache had no version on it. So every one of you kept being handed yesterday\'s broken list. A fix that cannot reach a cached phone is not a fix.',
     'The cache is stamped now. Anything built by a query we have since changed is thrown out the moment you open the map, and this can never happen again - every future map change carries a new stamp with it.',
     'Reproduced with her own cached list: 1 of the 6 buildings within reach showing, and 6 of 6 after the stamp discards it.',
     'You do not have to do anything. If you want it this second, Refresh places on the map still forces it.']},
 {v:'6.74',d:'Sep 19',t:'A care package, because the last few weeks were our fault',
  i:['Armour subtracted a flat 2 to 9 while raid bosses swung for 138. Healing stopped keeping pace with your health bar somewhere around level 10. Your stash quietly turned trauma kits into bandages. If you have been getting ground down lately, that was us, not the game being hard.',
     'So: open the game and if you are in the hole you get patched up to full, plus 3 bandages, antibiotics, a trauma kit, 5 food, 5 water and 40 scrap. Anyone in your crew who was down is back on their feet.',
     'Once, ever, and only if you actually need it - under half health, or out of meds with almost no scrap. The offer stays open a week so it catches you whenever the bad day lands, and then it is gone. It is about one good day\'s haul, not a fortune, because the game is still meant to be hard.']},
 {v:'6.73',d:'Sep 19',t:'When you have nothing, the game now tells you how to get out of it',
  i:['"I don\'t have food, bandages or any scrap." The way out existed the whole time and nothing said a word about it - which is the same failure as every other one this week.',
     'Low health, no meds anywhere and under 10 scrap now puts a card on your road screen listing every way out that costs nothing, with the numbers read from YOUR save: what tomorrow morning gives you back, what your garden feeds you, how many watch jobs are left today and what they pay, and what the trader charges.',
     'Measured from a real save at 10% HP with an empty stash: three free mornings to full, and one watch job is more than enough scrap for bandages.',
     'It only shows when all three are true at once, and never over a fight or inside a building.']},
 {v:'6.72',d:'Sep 19',t:'Four armour slots, and armour that actually stops a tier 5',
  i:['GLOVES AND BOOTS. Armour is four pieces now - Head, Chest, Hands, Feet - each with a common, uncommon and rare rung plus a legendary, so there is a ladder in every slot instead of two things to find.',
     'ARMOUR NEVER KEPT UP. It subtracted a flat 2 to 9 while enemy damage grows with your level AND the raid tier, so a tier 5 hitting for 138 lost 9 to a full set. Six per cent. Armour now also buys a percentage, and every point is worth slightly less than the last so it can never reach zero.',
     'At level 20 against that same 138: bare 138 · jacket and helmet 113 · full common set 104 · full uncommon 88 · FULL RARE SET 68. Measured over 300 tier-5 fights, a full rare set takes you from 8 rounds alive to 16.',
     'A TIER 5 IS PLATED, which eats 55% of an ordinary swing - that is your "we hit it for 6". A HEAVY SWING cracks the plating open and it stays cracked. Ordinary 18, heavy 40, against the same target. The fight screen now says so on the enemy instead of just printing the word "plated" at you.',
     'Two new legendaries: SURE HANDS (your weapon wears out half as fast) and LONG HAUL (you always get away clean, and drop nothing running).']},
 {v:'6.71',d:'Sep 19',t:'Being broke is no longer a dead end - food and sleep keep up with you too',
  i:['v6.67 scaled MEDS to your health bar and left everything else flat, which is how you end up at 10% HP with no meds and no scrap and nothing you can actually do. At level 20 a meal was 6% of your bar, stashing 6%, and a WHOLE NIGHT 10%. Ten nights to sleep off one bad fight.',
     'A meal, a stash run and a night\'s sleep are now shares of your bar too, floored at the old numbers so nothing is ever worse than before. A night is 30%: THREE NIGHTS from near-death to full at every level, instead of ten.',
     'That also kills something ugly. Dying revives you at 40%, so at 10% with an empty stash the best move in the game was to go and get yourself killed. One night now heals exactly what dying does, and costs you nothing.',
     'If you are stuck right now: EAT (food is the one thing you always have), DRINK if you are parched - being dried out cuts your maximum HP by 15% on its own - and sleep. Walking still earns, and watch duty at your base pays scrap.']},
 {v:'6.70',d:'Sep 19',t:'A crew member who is down no longer holds their slot',
  i:['When someone in your crew went down they kept their place in your party - but they cannot fight, so the slot was spent on nobody. And their card swapped "Leave at base" for "Patch up", so there was no way to put anyone else in. With one slot and a hurt friend you fought alone until you spent a med on them.',
     'Going down now hands the slot straight back. Bring someone else along while they mend, and put them back when they are patched up.',
     'Saves already stuck like this are fixed when you open the game - the slot is freed for you.',
     'You still cannot send a downed crew member out, and the crew screen now says how many are down and tells you when a slot has come free.']},
 {v:'6.69',d:'Sep 19',t:'The map was throwing away the buildings closest to you',
  i:['"Houses all around but not where I am." That was real, and it was the worst possible bug: the map asked the building server for the first 120 it could find, and a city block has 300+. Which 120 you got was decided by the order somebody happened to draw them in years ago - nothing to do with where you are standing.',
     'Measured on a real-shaped block: SIX buildings within walking reach of her, THREE of them on her screen. The gap right under your feet was the cut half.',
     'The cap is gone. The whole block comes back now and YOUR PHONE picks the nearest ones, because it is the only thing that knows where you are. Same test: six in reach, six on screen. The search radius went from 200 m to 220 m and the map keeps 55 buildings instead of 40.',
     'PINS NOW SHRINK WHEN YOU ZOOM OUT. Row houses sit about 7 m apart, which at the default zoom is a few pixels, so a whole street used to mash into one blob of overlapping icons. On a real block that is 8 overlapping pairs down to none, and nothing is hidden to get there - every house stays.',
     'The map status line now tells you how far the nearest place is, so an empty patch around you can never look like a healthy map again.']},
 {v:'6.68',d:'Sep 19',t:'Meds you are CARRYING now show up, and you can use them',
  i:['A trauma kit picked up as loot sits in your PACK until you stash it, and the meds list only ever read your STASH. So you could be carrying a trauma kit while the game told you you had one bandage. That is the "trauma kit does not even show up in my inventory" - it was real.',
     'Your meds now list both, labelled: <b>on you</b> for what is in your pack, <b>stashed</b> for what is at base.',
     'PATCH UP COULD ONLY SPEND FROM THE STASH, so a trauma kit in your pack was unusable outside a fight - you had to walk home and stash it first. It can spend either now, and defaults to the ones on you, because those are the ones you lose if you go down.',
     'The Patch up button in a fight now names what it is about to use and how much it will heal, instead of just counting meds.',
     'One thing no update can fix: meds you stashed BEFORE v6.67 were already merged into one pile, so old trauma kits cannot be told apart from old bandages any more. Anything you pick up or buy from here on keeps its kind.']},
 {v:'6.67',d:'Sep 19',t:'Healing keeps up with you now, and there is a proper ladder of it',
  i:['A heal was a FLAT number while your health grows 10 a level, so it quietly got worse the whole game: 40 HP is 40% of your bar at level 1 and 10% of it at level 30. Every heal is a SHARE of your bar now - bandages 20%, antibiotics 32%, trauma kit 55% - and never less than it used to be, so low levels are untouched and high levels stop feeling useless.',
     'YOUR STASH WAS EATING YOUR GOOD MEDS. Everything you put away became one generic pile, so a trauma kit you saved for an emergency came back out healing the same as a bandage. Meds keep their kind now. At level 20 that is a 160 HP kit next to a 58 HP bandage - you have been throwing those away without being told.',
     'TWO NEW ONES. ADRENALINE SHOT heals hard and nothing can put you down for that round - use it as you are about to go under, not after. BLOOD BAG puts you back to FULL from any health, from anywhere.',
     'THE TRADER NOW SELLS ALL OF IT: bandages 10, antibiotics 25, trauma kit 45, adrenaline 60, blood bag 90 scrap. Scrap turns into healing, so running dry is now something you can buy your way out of.',
     'Patch up asks WHICH med you want instead of spending one blind, and tells you what each is worth against your bar right now and how much of it would be wasted. Antibiotics from the stash clear an infection on their own. In a fight you automatically reach for the strongest thing you are carrying.']},
 {v:'6.66',d:'Sep 18',t:'Moving your base now tells you whether it is worth it',
  i:['"Move base here" used to be a yes/no box that named what you would lose and nothing else - so the one question you actually have, IS THE NEW PLACE BETTER THAN MINE, had no answer on screen.',
     'It is now a full comparison: the room the new building hands you free and what that would have cost you in steps and scrap, anything about it that keeps paying forever, everything you would demolish, and the defense you would drop.',
     'THE RAID CLOCK, which the game has never once mentioned: raiders hit HARDER the longer you stay in one place, about +0.5 power a day. Forty days in one base is +20. Moving resets it to zero and buys you a raid-free day. Your base card now shows how long you have held it and what that is costing you.',
     'What a base type really is: one free room, plus anything permanent. Only three are permanent - a GAS STATION is the only thing in the game that lowers how often you get raided (-30%, forever), HARDWARE takes 10% off every build forever, and a GROCERY, DINER or HOUSE pays you a little every morning. Every other base is a head start you could walk out and build yourself.',
     'WHERE your base sits matters too, and only for one reason: with the live map on you have to be within 60 m of it to STASH. Stashing is where a run turns into league points, heals you and feeds your crew - so put your base somewhere you walk past anyway. Nothing else cares where it is; you can build, work and fight from anywhere. The move screen now says this and shows how far the new spot is from your current base.',
     'YOUR BASE AND YOUR HOME ARE THE SAME PLACE. The game had been calling one thing by two names, which is nobody\'s fault but ours. It is a BASE everywhere now - the map chip says Base, the map button says "Move my base pin here", and the base card says outright that it is also your pin on the map.',
     'Two buttons, one place: "Move base here" changes which BUILDING you live in and destroys the rooms you built. "Move my base pin here" moves only WHERE ON THE MAP it sits, for 20 scrap, and keeps every room.',
     'WHICH SOLVES THE REAL PROBLEM: the building with the best perk is almost never the building you walk past every day, and you have to be within 60 m of your base to stash. You do not have to choose. The PERK follows the building, the STASH SPOT follows the pin. Claim the gas station across town for its generator, then stand in your own kitchen and tap "Move my base pin here" - you keep the gas station and everything in it, and you stash at home from then on.',
     'The game now offers this the moment you claim a base on the live map, instead of leaving you to work it out.']},
 {v:'6.65',d:'Sep 18',t:'Your step count fixes itself now',
  i:['v6.64 stopped the double-counting, but it left anyone already inflated to tap a button. That was our bug, not yours to clean up.',
     'Open the game and it repairs itself: hand-typed steps that were sitting on top of the same steps your phone counted come back out, and today, this week and your lifetime total all land on your phone\'s own reading. It says in your log exactly how many it took back.',
     'It can only ever remove double-counting - it cannot invent a step or lose a walk your phone counted. It runs once, so anything you type in afterwards stays.',
     'If your sync happens to be running behind at that moment, you will drop to your phone\'s current number and climb back as it catches up.']},
 {v:'6.64',d:'Sep 18',t:'"That\'s my total" was being added on top of your phone, not used instead of it',
  i:['Tiff and Wing both had the game showing far more steps than their phone. It was real, and it was this: when the sync looked stuck and you typed your real total, the game recorded the difference as EXTRA steps your phone had not seen - and then added them again when your phone caught up.',
     'Walk 15,000, see the sync stuck at 6,000, type 15,000, and once your phone caught up the game showed 24,000. Reproduced exactly.',
     'THAT\'S MY TOTAL now means what it says: today is at least this number, and it keeps meaning that as your phone catches up. Nothing gets added twice. Anything you walk afterwards still counts on top, as it always did.',
     'If your day was already inflated, v6.65 fixes it for you when you open the game - nothing to tap.',
     'ADD THESE is unchanged and still adds: it is for a walk your phone never counted at all, like a treadmill with your phone on the table. The card now spells out the difference between the two buttons.']},
 {v:'6.63',d:'Sep 18',t:'Raid together: it has to split its attention now',
  i:['SQUAD RAIDS. Walk into the same raid as a friend, or flare into theirs, and you fight it as a SQUAD - no lobby, no waiting, no invite to accept. The moment they land a hit you are in it together.',
     'IT TAKES TURNS ON YOU. One round it comes for you, the next it turns on your squadmate. Two of you and it swings at you half as often. Three of you and it is a third. That is the whole point: a raid that was killing you alone is survivable together.',
     'THE HEALTH BAR MOVES WHILE YOU FIGHT. Your friends\' hits now land on your screen as they happen, named, instead of the bar sitting still until the fight ends.',
     'GOING DOWN BESIDE A FRIEND COSTS YOU NOTHING. They drag you out. You keep your pack, your gear and your scrap, and the damage you did stays on its health bar. Going down alone still costs you everything it always did.',
     'The raid screen shows who is in there right now before you commit, so you can time it together.',
     'Nothing to set up and no new party to join - if you are already in a party, your raid calls still go to them first.']},
 {v:'6.62',d:'Sep 18',t:'Raids: dying now counts, and levelling up no longer makes you weaker',
  i:['LOSING A RAID POSTED A FLAT NUMBER. Whatever you actually did, a loss put the same 400-per-tier on the shared health bar - so dying in round two and dying with the boss nearly down counted exactly the same, and against a big pool the bar barely moved. It now posts the damage you really did, and pays scrap and XP in proportion. Land no hits at all and it posts nothing.',
     'AND THE BOSS WAS SCALED BY YOUR LEVEL TWICE. Once in the normal enemy scaling, then again on top. At level 25 it hit five and a half times as hard as base while your health only doubled - so every level you gained made raids HARDER. It went from surviving about 4.6 hits at level 4 to 2.3 at level 25.',
     'Now it is a flat five hits at every level. Tier 5 is still a real fight you can lose - it is meant to be - but it is not a death sentence for being high level any more.']},
 {v:'6.61',d:'Sep 18',t:'You cannot miss being infected now',
  i:['A RED STRIP sits under the header the whole time you are infected, on every screen, saying which stage you are at. Tap it and it takes you straight down to the card that cures it and flashes it.',
     'The card itself has not moved - it is still on the road screen where it was.']},
 {v:'6.60',d:'Sep 18',t:'It should stop telling you that you are in a car',
  i:['WALKING WAS BEING READ AS DRIVING. Two reasons. A single GPS reading was enough to lock you out for over a minute - and phones glitch constantly. And when your phone does not report its own speed, the game worked it out from two positions without caring how accurate they were; walking past tall buildings a reading can jump 60 metres, which looks like 30 m/s.',
     'It now needs three fast readings in a row before it believes you, it ignores movement smaller than the GPS error bars, and it measures over five seconds instead of one so a real car still stands out. The lockout is 45 seconds instead of 75.',
     'Tested against a walk with 90-metre GPS jumps, a walk with no reported speed, and a walk with one freak reading - none of them lock you out now, and a real car still does.']},
 {v:'6.59',d:'Sep 18',t:'Pick your gear from a list instead of a wall of buttons',
  i:['THE BARE HANDS PROMPT now has one dropdown per slot - weapon, gun, armour, head, bag - instead of a stack of buttons.',
     'AND IT WAS HIDING YOUR GEAR. It only ever offered the first four weapons and the first three pieces of armour, so if you owned more than that the rest could not be equipped from there at all. Every piece you own is in the list now, best first.',
     'A wrecked piece is still listed but greyed out, and slots you own nothing for are left out entirely.']},
 {v:'6.59b',d:'Sep 18',t:'You can see what you dropped running away',
  i:['RUNNING FROM A FIGHT used to say "dropped a quarter of the pack on the way out" and leave you to work out what was gone.',
     'It names them now - on the way-out screen, in the fight log, and in your journal. If your pack was empty it says so instead of implying you lost something.']},
 {v:'6.58',d:'Sep 18',t:'Dragging and pinching the map should be smoother',
  i:['ON THE BLOOM MAP every pin gently bobs, and each one carries three layers of shadow. With 44 places around you that is 44 things the phone repaints constantly - and it costs the most exactly while you are dragging or pinching, because the whole map is moving under them at the same time.',
     'The bobbing now stops for the length of the gesture and comes back when the map settles. It looks the same when you are not touching it, which is the only time you can see a 2px bob anyway.',
     'If it is still slow, tap HOLLOW on the map screen - that skin has no bobbing at all. Tell me whether that fixes it, because it tells me whether I am looking in the right place.']},
 {v:'6.57',d:'Sep 18',t:'Your character is back on the road',
  i:['IF YOU WERE WEARING A ONESIE, you disappeared from the road scene - your pet stayed, your character did not.',
     'The hood needs an internal name to cut its shape out, and that name was being changed every single time you were drawn. The game keeps drawings by name, so it never recognised you twice, made a brand new picture sixty times a second, and none of them ever finished loading. The name is fixed now.',
     'Only hooded outfits were affected, and only in the road scene - which is why a hat made you reappear.']},
 {v:'6.56',d:'Sep 18',t:'The map should stop stuttering',
  i:['TWO THINGS WERE WASTING WORK, both measured. Every GPS reading threw away and rebuilt all 44 map pins, even though nothing about them had changed - and each rebuilt pin restarted its little bounce, which is what the stutter actually was. A pin is only redrawn now when something about it is genuinely different. 880 rebuilds per twenty readings became zero.',
     'And every batch of steps redrew EVERY screen, including the Boutique with all 71 pieces of clothing and their drawings, while you were looking at the map. Screens you are not looking at are left alone now, and refresh when you open them. That is about three quarters less work per step.',
     'Nothing about how the map looks or behaves has changed.']},
 {v:'6.55',d:'Sep 18',t:'Watch duty was short two jobs a day',
  i:['THE COUNTER SAID 5, THE BOARD POSTED 3. Watch duty always put up exactly three jobs, while the number of watches you are allowed is 3 plus your Watchtower level, plus the Alarm bell, plus Well Stocked.',
     'So every upgrade that promises "+1 watch job per day" raised the allowance and added nothing to the board. The Watchtower, the bell and the skill were all doing nothing for watch duty. That is fixed - the board now posts as many jobs as you are allowed.',
     'If you finish a Watchtower partway through the day, the extra job appears today rather than tomorrow.',
     'There are only four kinds of watch job, so past four the board will offer a second one of a kind, marked "another one".']},
 {v:'6.55b',d:'Sep 18',t:'Legendaries cannot be gifted',
  i:['A LEGENDARY NOW STAYS with whoever earned it. Nine exist and they only come from chests, bosses and the season track - handing one over skipped all of that.',
     'Everything from the gumball machine, the onesie included, was already safe: the gift button only exists on gear, and clothes live somewhere else entirely with no gift path at all.',
     'Ordinary gear is still giftable on the same daily allowance as before.']},
 {v:'6.54',d:'Sep 18',t:'The county fights back',
  i:['ORDINARY FIGHTS WERE FREE. Measured: a kitted player lost 0 HP on a road fight and 0 on a house, at every level - because your damage grew every level while the walkers barely did, so one swing killed anything.',
     'The world now keeps pace with you. A walker at level 18 is 78 HP hitting 16-30, not 40 hitting 8-15, and past level 10 the county sends one more body. A normal fight now costs about 7% of your health at level 12, 23% at level 18 and 39% at level 25.',
     'NEW PLAYERS ARE NOT TOUCHED - below level 10 it is exactly as it was. And RAIDS are not touched either: they already had their own difficulty, and stacking both made tier 5 unwinnable when I tried it.',
     'OVER THE TOP: if you finish the whole season track, it keeps paying - 2 keys and 50 scrap every 240 points, with a shot at a legendary. Walking 20k a day finishes the track around day 22, and this is what the rest of the month is for.']},
 {v:'6.53',d:'Sep 18',t:'SEASONS - something to chase every month',
  i:['A SEASON runs for a calendar month and everyone is in the same one. This month is Overgrowth. There is a ten-rung track on the You screen: keys, scrap, a skill point, three season-only pieces of clothing, and a LEGENDARY at the top.',
     'Points come from walking AND from playing - places cleared, raids, chests, what you bring home. There is a daily cap, so the season lasts the month no matter how far you walk. Nobody clears it in a weekend.',
     'When the month turns over the track resets but everything you earned stays yours, and the clothes are tagged with the season you got them in.',
     'FOUR NEW LEGENDARIES, nine in total, and each one is a different reason to swap rather than a bigger number: The Harvest hits everything in the room, Vigil caps the first hit of a fight, Saint Jude hits harder the worse your health is, and Long Winter takes the enemy turns away.',
     'The streak no longer stops at 30 days - it keeps paying every 10, with a legendary every 50. The daily step ladder no longer stops at 20,000 either; there are rungs at 25k, 30k and 40k.']},
 {v:'6.52',d:'Sep 18',t:'Map fixed - sorry about that',
  i:['THE MAP WAS BROKEN and showing "API key required" tiles. That is on me: the last update switched to a prettier map service that turns out to need a paid key. Fixed.',
     'It is back on the same OpenStreetMap the game has always used, with no other company involved, so this cannot happen again.',
     'The address numbers and street names are still gone on Bloom and Hollow. They are removed a different way now - the map asks for a wider view of the tile and zooms in on it, and those labels are only ever drawn on the close-up version. It also looks softer, which suits the game.',
     'ATLAS is still there if you want every label back.']},
 {v:'6.51',d:'Sep 18',t:'A better looking map, and the houses are back',
  i:['THE MAP ITSELF is what changes here. Bloom and Hollow now load a different base map instead of tinting the plain street map, so the address numbers and most of the labels are simply not drawn any more. Bloom is soft daylight; Hollow is a real night map rather than a day map turned inside out.',
     'THE HOUSE PINS ARE BACK exactly as they were. Shrinking them in the last update was a misread on my part - sorry.',
     'There is a third choice, ATLAS, which is the plain street map with every label and house number, in case you ever want to read it like a map.',
     'If a map style cannot load for any reason, it drops back to Atlas and tells you, instead of leaving you with an empty grid.']},
 {v:'6.50',d:'Sep 18',t:'Stashing a locked chest no longer destroys it',
  i:['THIS WAS A BUG, AND A BAD ONE. Stashing a locked chest quietly broke it down for 5 scrap. A chest is one of only two places a legendary can come from, so that was the worst thing in your pack to lose, and the game never said a word about it.',
     'A chest you stash now goes into the stash and stays there. There is a chest tile on your base screen - tap it to open one with a key, same rewards as opening it in the pack.',
     'A chest in the stash also survives dying. A chest in your pack still does not.']},
 {v:'6.49',d:'Sep 18',t:'You can see the map again',
  i:['THE HOUSES WERE BURYING THE MAP. In a dense neighbourhood every building is a place you can loot, so you had forty identical white house pins packed edge to edge - you could not see the streets, your own character, or which pin was a shop and which was just a lot.',
     'A house you cannot reach yet is now a small quiet dot. Walk into range and it opens into a full pin you can tap. Shops, raids, strongholds and your base always draw in full, so the things worth walking to are the things that stand out.',
     'Dots that would overlap collapse into one with a number on it, and they re-collapse as you zoom, so the map never turns back into a pile.',
     'Nothing was removed - every place is still there and still lootable.']},
 {v:'6.48',d:'Sep 17',t:'Facial hair',
  i:['SEVEN FACIAL HAIR STYLES - stubble, moustache, goatee, mutton chops, boxed beard, full beard, or clean shaven. Your look, under Hair colour.',
     'Facial hair follows your hair colour by default, and there is a colour row if you want it to differ.',
     'Requested by one of your friends.']},
 {v:'6.47',d:'Sep 17',t:'The map is cute now',
  i:['A BLOOM MAP SKIN, and it is the new default. Warm daylight instead of the cold inverted night map, soft cream streets, and chunky rounded pins in white with a proper drop shadow so they sit ON the world instead of floating over it.',
     'Your character stands on a little shadow puddle, and the pins breathe with a slow bob. Reduced-motion settings are respected.',
     'The old look is still there as HOLLOW - there is a Bloom / Hollow switch right on the map screen, above the buttons. Pick whichever you like; it is remembered.',
     'It is a treatment of the same OpenStreetMap tiles rather than a different map provider, so nothing got slower and nothing new is downloaded.']},
 {v:'6.46',d:'Sep 17',t:'A DIFFICULTY SETTING, and infection that never punishes time away',
  i:['You were right twice. Infection was too common AND it got worse just because days passed - so someone who could not get out for two days came back with a third of their health gone. That punishes having a life, in a game whose whole point is making walking feel good.',
     'IT NO LONGER WORSENS WITH TIME. Ever. It only turns worse if you take ANOTHER bite while it is running. A week away costs you nothing.',
     'It is also rarer and gentler: about 1% of a single-walker fight, 5% of a real scrap, and the health penalty is 10/18/26% instead of 15/25/35%.',
     'AND THERE IS A DIFFICULTY SETTING NOW, in Settings. SURVIVOR is the county as it should be, fair on a day you barely move. HARDENED hits 25% harder, bites turn nearly twice as often, death takes more, and you get two patch-ups a fight. HOLLOW is for the people who asked for a grind: enemies at 150%, bites turn 2.6x as often, one patch-up a fight.',
     'Change it whenever you like, and nothing you own is affected. Your friends can run Hollow while you run Survivor - the raids are still shared.',
     'A RAID YOU HAVE CLEARED IS GREYED OUT now, both in the list and on the map - the pin goes grey with a tick instead of glowing at you, and it sinks to the bottom of the list. It stays visible because your friends may still want it.']},
 {v:'6.45',d:'Sep 17',t:'INFECTION, and death that costs something',
  i:['I measured the ordinary game the same way I measured raids. At level 8 and up, a walker costs you ZERO health and a raider costs eleven percent. The road had stopped being dangerous years before you noticed.',
     'INFECTION. A bite from the dead can infect you - about 1 in 10 of a rough fight, never from a raider, they are not dead. It does not kill you outright. It takes your CEILING: maximum health down 15%, then 25% tomorrow, then 35%, and it bleeds you as you walk.',
     'ANTIBIOTICS CURE IT, and antibiotics are rare - pharmacies and clinics. Four ordinary meds will do it too, grudgingly. So finding loot is no longer the same as finding the RIGHT loot.',
     'DEATH COSTS SOMETHING NOW. It used to take your pack and one ordinary weapon and leave the stash, keys, parts, level and banked steps untouched - about one trip. It also takes a fifth of your scrap pile.',
     'Enemies keep pace with you. Your health more than doubles from level 3 to 15 and theirs barely moved; they scale nearly twice as fast now.',
     'Your legendaries are still safe from death, and your steps are never touched. Those two rules are not going anywhere.']},
 {v:'6.44',d:'Sep 17',t:'Raids fight back now',
  i:['You were right and it was worse than you thought. I simulated 300 fights per tier: a LEVEL 3 character with a machete and no armour beat a tier 5 raid 100% of the time. The old numbers looked fine because dying and respawning was being scored as a win.',
     'RAID BOSSES HAVE MECHANICS NOW, and they stack by tier. PLATED (tier 2+): 55% of your damage soaks into the plating until a HEAVY SWING cracks it open - the heavy swing is now the correct opening move, not a trap. ENRAGED (3+): hits 50% harder below half health. CALLER (4+): drags in another body every third round, up to two. FRENZY (5): acts twice a round below a third health.',
     'YOU CAN ONLY PATCH UP TWICE IN A FIGHT (three times with Field Dressing). Ten meds used to be four hundred free health and no boss could out-damage a backpack.',
     'THE SHARED HEALTH BAR IS REAL. You now face what is LEFT of it, not a fresh boss. Every attempt sticks for two hours, so friends chip the same pool - and losing still pays scrap and XP, and your seat stays paid.',
     'A TIER 5 IS NO LONGER A SOLO FIGHT. Alone you will almost certainly lose the first few goes. That is the point. Bring people, or wear it down over the two hours.',
     'Raid bosses scale their DAMAGE with your level rather than their health, so they stay dangerous at level 20 without turning into ten-minute slogs.']},
 {v:'6.43',d:'Sep 17',t:'Readable raid list, on foot only, and a gift limit',
  i:['THE LIVE RAID LIST WAS UNREADABLE. It was borrowing the leaderboard\'s layout, which is a four-column grid for rank, avatar, name and score - so a raid\'s name landed in the 44-pixel avatar slot and wrapped one word per line. It has its own layout now: tier badge, name, address, time left, and what you can do about it.',
     'ON FOOT ONLY. Driving to a raid no longer counts. Above 32 km/h the game marks you as in a vehicle, and you need about 75 seconds back on foot before you can join a raid or search a place. A hard run and a bicycle are both well under the line, so nothing you do on your own legs trips it.',
     'Joining from home with a flare is unaffected - you are not driving TO that one.',
     'A GIFT LIMIT. Six points of gift allowance a day: a common or uncommon piece costs 1, rare 2, epic 3, legendary 5. So one legendary a day, or a handful of spares, but not your whole inventory. You also cannot gift what you are wearing, or your only weapon.']},
 {v:'6.42',d:'Sep 17',t:'A Brooklyn block full of buildings said "no places found"',
  i:['The old lookup asked for shops AND parks AND every building in ONE request. On a dense city block the building half alone is hundreds of buildings, so the whole thing hit the server\'s time limit and came back empty - taking the pharmacy across the road down with it.',
     'It is two separate requests now. A slow building lookup can no longer wipe out the shops, and you get whichever half succeeded.',
     'THE BUILDING FILTER WAS THE OTHER HALF. It listed eight exact tags, so anything a city labelled differently - commercial, retail, mixed-use, the row houses of Brooklyn - did not exist to the game. Any building is somewhere to loot now, minus sheds and garages.',
     'The status line tells you what actually went wrong instead of one message for every cause, and says how many shops versus buildings it found.']},
 {v:'6.41',d:'Sep 17',t:'THE step sync bug, found and fixed',
  i:['This is the one. If you ever typed a step count, that number was written into a "highest reading seen" marker that was only ever meant to hold what your PHONE had sent.',
     'From that moment the game asked, for every real reading your phone posted: "is 495 bigger than 5,425?" No. So it threw your phone\'s steps away, silently, for the rest of the day. Fourteen posts arrived on the server and the game counted zero of them.',
     'That check was never needed - taking the same reading twice already changes nothing - so it is gone. A typed number can never block your phone again.',
     'If your save still has a poisoned marker it is cleared the moment you open the game, and your phone\'s steps land on your next sync.',
     'Thank you for running the check and pasting it. Those six lines found in one message what four guesses could not.']},
 {v:'6.40',d:'Sep 17',t:'An empty live map could stay empty for a week',
  i:['When the map server was busy it sometimes answered "here are your buildings" with an empty list - and the game CACHED that empty list for seven days. One bad moment and your whole area had nothing to loot until the cache expired. Empty answers are never cached now.',
     'There is a second map server as a backup, so one being rate-limited no longer means no places at all.',
     '"Refresh places" now really refetches instead of handing you the same cached list back.',
     'The chip at the top tells you WHICH kind of empty you are looking at: "no places found here" (the lookup failed), "all cleared - they come back tomorrow" (you already looted them), or "walk toward a marker" (they are there, just not in arm\'s reach yet).',
     'Worth knowing: you can only loot a place within about 35-70 metres, so having nothing in reach while standing still is normal. Zero markers on the map is not.']},
 {v:'6.39',d:'Sep 17',t:'The game can now tell you WHY your steps are not syncing',
  i:['There is a button on the Steps card: "Why aren\'t my steps syncing?" It walks the whole chain - your Shortcut, the server, the game, today\'s number - and names the link that is broken instead of leaving you to guess.',
     'It shows the real data at each step: how many step posts the server actually received today, the biggest one, how long ago it arrived, and what the game did with it.',
     'The most useful line is whether the server received ANYTHING today. If it did not, the problem is your Shortcut and no amount of tapping Sync in the game will help. If it did, there is a "Take them now" button right there.',
     '"Copy this" puts the whole report on your clipboard so you can paste it to me instead of describing it.']},
 {v:'6.38',d:'Sep 17',t:'The heavy swing that ate a legendary without asking',
  i:['A HEAVY SWING COSTS TWO DURABILITY and never warned you about it. A legendary sitting on 2 died to a single tap with no confirmation - that is your friend\'s "it swung two times and it broke". It was one swing that counted as two.',
     'The heavy swing now asks first when it would wreck something rare, and the button says "costs 2 durability" so you can see it coming.',
     'SAYING NO USED TO DISARM THE WARNING. The one-warning-per-fight flag was set before you answered, so declining meant your very next tap destroyed the weapon in silence. It is only armed when you say yes.',
     'A heavy swing can no longer push durability below zero.',
     'Not a bug, for the record: a Vicious double strike costs only ONE durability, and a Keen temper genuinely lowers a weapon\'s maximum by 2 - so its bar drops when you fit it.']},
 {v:'6.37',d:'Sep 17',t:'Eight new weapons, drinks that do things, and snacks',
  i:['NEW MELEE: Hatchet, Meat cleaver, Farm sickle, Pipe spear, Barbed bat, and a KATANA. The katana is epic - 20-29 damage, ten swings, and quiet.',
     'NEW RANGED: a Hunting bow and a Crossbow. Both use BOLTS, both are quiet, and both give bolts back - the bow gets 55% of them back, the crossbow 40%. That is the reason to carry one over a gun.',
     'QUIET WEAPONS make far less noise indoors: the katana, spear, bow and crossbow. Noise is what brings more of them.',
     'DRINKS, and they are not all the same. Energy drink: +20 water and you hit 15% harder next fight. Soda: +32 water now, but you get thirsty faster all day. Wine: +12 water, +22 HP, and you miss more next fight. Cold brew: your first hit next fight lands 50% harder.',
     'SNACKS for small top-ups: protein bar +9 HP, trail mix +7 and a little water, chips +5 but salty so they cost you water, gum +2 and a sip.',
     'Find them in kitchens, snack shelves, freezers, break rooms and counters. Everything sits in your pack with a Drink or Eat button and says what it does.']},
 {v:'6.36',d:'Sep 17',t:'Moving your base tells you what it costs',
  i:['MOVING YOUR BASE HAS ALWAYS DESTROYED EVERY ROOM YOU BUILT. It never said so - the button just read "Move base here (20 scrap)". Twenty scrap is not the price. The walls are.',
     'It now warns you first, listing exactly what you lose: the rooms, the steps and scrap they took, and the defense. A base with level 4 walls is over 26,000 steps of work.',
     'The button says "lose what you built" when you have something to lose, and stays quiet when you do not.',
     'Every base type now states what its free rooms are actually worth, so you can compare. The Gas station is the most valuable claim in the game (5,000 steps of work and 30% fewer raids, forever), not the police station.']},
 {v:'6.35',d:'Sep 17',t:'No weapon has infinite hits, and repair prices follow power',
  i:['GUNS WEAR OUT NOW. They never did - the 9mm, the shotgun, Mercy and Whisper could fire forever. Every weapon in the game has a use count: Mercy 8 shots, Whisper 12, the 9mm 10, the shotgun 6.',
     'REPAIR PRICES NOW FOLLOW HOW HARD A WEAPON HITS, not the word printed on it. Two legendaries can be very different weapons - Mercy does 46 damage a shot and Whisper does 28 - so charging them the same was wrong.',
     'Weakest to dearest: a Lead pipe is 2 scrap a swing, a Machete 4, the shotgun 8, Mercy 9. Nothing strong is ever cheaper to run than something weaker than it.',
     'Old Reliable is unchanged at 20 swings for 80 scrap, still the biggest single bill in the county.',
     'A rare gun that runs out is GONE. An epic or legendary one only wrecks and waits in your pack for the rebuild, same as melee. You will be warned before a legendary fires its last shot.',
     'If you already own a gun, it starts at full durability when you update.']},
 {v:'6.34',d:'Sep 17',t:'Old Reliable is not an answer any more',
  i:['Your friends were right: a weapon that NEVER breaks makes every other weapon in the game decoration. Old Reliable now has 20 swings before it needs rebuilding - still twice any other weapon, but no longer infinite.',
     'The rebuild is 80 scrap, 40 at an armory: by far the biggest single bill in the county.',
     'It hits harder to make up for it - 16-24, up from 12-19 - because at its old damage it would have been a legendary losing to a Fire axe.',
     'It still cannot be LOST. It wrecks and waits in your pack like any legendary, it never disappears.',
     'If you already own one, its durability drops to 20 when you update. Nothing is taken away from you.']},
 {v:'6.33',d:'Sep 17',t:'The Workbench, and raids that pay properly',
  i:['THE WORKBENCH. Every weapon and piece of armour has a 🛠️ Workbench button in Gear. Work it up to +3, or rework its TEMPER.',
     'PARTS are the new currency, and they come from exactly one place: breaking down gear. Walking does not earn them. A +3 legendary costs 66 parts - about nine epics fed into it - or 40 with a Forge. The Forge is now a 40% discount instead of a requirement.',
     'A TEMPER is a permanent personality for a weapon: Keen hits 18% harder but wears out faster, Sturdy lasts far longer, Vicious strikes twice 12% of the time, Perfect is all upside and 4% likely. CRUDE is the most common result and it is a real downgrade, so rerolling something good is a genuine gamble. The odds are printed on the bench.',
     'RAIDS TELL YOU WHAT THEY PAY before you commit - items, scrap, keys, XP, and the legendary chance.',
     'WALKING TO A RAID NOW BEATS FLARING IN: an extra item, 50% more scrap, an extra key at tier 3+, and a better legendary roll. A tier 5 you walked to is a 70% legendary chance against 50% for a remote seat.',
     'You can patch up a hurt crew member with meds BEFORE they collapse - the button used to appear only once they were already down. They also mend 18 HP a night on their own, 36 with a clinic.']},
 {v:'6.32',d:'Sep 17',t:'Repair anything, punch anything, swap mid-fight',
  i:['REPAIR WITH SCRAP, ANYWHERE. You no longer need an armory. A repair always puts a weapon back to FULL, and the price is on the button. An armory (or the engineer role) is now a HALF-PRICE discount instead of a gate. There is a "Repair all" button in Gear too.',
     'A wrecked legendary is a repair bill, not a loss. The Last Word costs 36 scrap to bring back, 18 at a bench.',
     'FISTS ARE A CHOICE NOW. A new button in every fight, next to your weapon. It hits softer but your weapon takes no wear at all - stop spending a legendary on a walker.',
     'SWITCH WEAPON mid-fight. If your hands are empty because your weapon just broke, the switch is FREE. Otherwise it costs the round.',
     'LOSING A RAID PAYS SOMETHING. Your damage stays on the shared health bar, so being driven off now gives scrap and XP instead of nothing. And your flare buys your SEAT in that raid, not one attempt - going back in costs no second flare.']},
 {v:'6.31',d:'Sep 17',t:'The raid that took your flare and never started',
  i:['Joining a raid call could take the flare, start the fight in the background, and never draw the fight on your screen - leaving you stuck on "finish what you are doing first" with nothing to finish.',
     'The cause was the raid call sheet refreshing itself when the server answered. On a slow connection that answer landed AFTER the fight had begun and painted the old screen back over it, again and again.',
     'IF THIS HAPPENED TO YOU, YOUR FLARE COMES BACK on your next open. A raid that never finished is now always detected and refunded.',
     'A fight can also no longer get stuck across an app restart.']},
 {v:'6.30',d:'Sep 17',t:'Daily check-in and a reward ladder for today\'s steps',
  i:['DAILY CHECK-IN. Open the game, tap once, get something. Seven days in the cycle: scrap, food and water, a chest key, meds, ammo, and a bigger day seven, then it loops.',
     'MISSING A DAY DOES NOT RESET IT. Your streak already punishes a missed day and you work six days a week. The check-in just picks up where it left off.',
     'TODAY\'S REWARDS ladder, in the Steps card. 2,500 gives scrap · 5,000 food and water · 7,500 a chest key · 10,000 A WEAPON · 15,000 scrap and XP · 20,000 two keys. It resets at midnight with your step count, and it shows how far you are from the next one.',
     'The weekly quest was already in the game and easy to miss - it is in Contracts under "This week". Walk 35,000, put down 30 hostiles, claim a bounty, and you get a key, a cosmetic and 200 points.']},
 {v:'6.29',d:'Sep 17',t:'Flares are not spent until the fight starts',
  i:['Joining a raid bare-handed showed the "no weapon equipped" warning - and took your flare anyway, even if you backed out. The raid never happened and the flare was gone.',
     'A flare is now only spent when the fight actually begins. Back out at the weapon warning and it costs you nothing, and the raid is still there to try again.',
     'Everyone gets today\'s flares handed back, once, since the bug ate them.']},
 {v:'6.28',d:'Sep 17',t:'A way out of every screen, and honest odds',
  i:['The gumball machine had no exit - only "Prize list" and "Crank again". Every popup in the game now has an X in the corner as well, so a screen can never trap you again.',
     'THE ODDS WERE WRONG. The clothes machine said "55% common", but there are no common clothes - those cranks were quietly rolling into rare. It now prints what it actually does: 3% legendary, 12% epic, 85% rare.',
     'The odds shift as you collect, because clothes you own never come up again, and the machine shows the real number every time you open it.']},
 {v:'6.27',d:'Sep 17',t:'Raid from anywhere, and typed steps that ADD',
  i:['RAID CALLS. Standing at a raid your friend found is no longer the only way in. Hit "Invite a friend" at a raid and everyone in your party (or everyone on your board) gets a Raid call on their home screen and a notification - wherever they live.',
     'FLARES are the daily energy for that. You get 3 a day plus one for every 6,000 steps you walk, up to 6. A remote seat costs one flare. Standing at the raid yourself is still FREE, because this is a walking game.',
     'Everyone who joins hits the SAME health bar, and your loot is your own - it does not split.',
     'TYPED STEPS ARE FIXED. They used to fight your phone for the same number, so typing 5,000 froze you at 5,000 while your phone kept counting. Now there are two buttons: "Add these" puts your number on top of what the phone counted, and "That\'s my total" sets the total. The line underneath shows the arithmetic before you tap.',
     'A step count can never go down, and anything you walk after typing always counts on top.']},
 {v:'6.26',d:'Sep 17',t:'See what is in the machines',
  i:['Each gumball machine has an "ⓘ What can I get?" button. It lists everything inside, grouped by rarity, with the odds for each tier.',
     'Clothes you already own are ticked off and greyed, and it counts how many are still out there. Weapons show their damage.',
     'The Axolotl onesie gets its own card at the top until you get it.']},
 {v:'6.25',d:'Sep 17',t:'Your body is not a box any more',
  i:['The torso was literally a rounded rectangle, which is why everyone looked boxy. It is a real silhouette now - shoulders, a waist, hips.',
     'FOUR BUILDS in the character editor: Straight, Curvy, Athletic, Slim. Arms and legs follow whichever you pick.',
     'Long, wavy and bob hair used to fall as a solid block twice the width of the body. They taper into side locks now, so you can actually see your shape.']},
 {v:'6.24',d:'Sep 17',t:'Onesies have hoods now',
  i:['Onesies used to stick ears on top of your hair, so they read as hair with ears rather than a costume. They have a proper hood now, in the costume colour, with your face framed in it and your fringe showing.',
     'The axolotl grew real gills - three feathery stalks a side instead of two little dots.',
     'Your hair is tucked in under the hood, so nothing hangs out the bottom any more.']},
 {v:'6.23',d:'Sep 17',t:'Gumball machines, and trophies that matter',
  i:['TWO MACHINES on the Base tab. Your unspent steps go in the slot - nothing here costs money, only walking. The Fits Machine gives clothes, the Arms Machine gives weapons.',
     'Odds are printed on the machine: 55/30/12/3. Every 10th crank is guaranteed epic or better. Clothes you already own never come up.',
     'New legendary: the AXOLOTL ONESIE. Pink, frilly, and the best thing in the game.',
     'TROPHIES NOW DO SOMETHING. Six sets of four - Home Comforts, The Law, The Rec Room, The Clinic, The Road, Oddities. Complete a set and keep a small permanent perk forever.',
     '14 new trophies, and every trophy is now MUCH rarer. It is a grind on purpose. Base tab, Trophies, Trophy room.']},
 {v:'6.22',d:'Sep 17',t:'Typing your steps no longer freezes them',
  i:['Typing a total and your phone sending a total are two different readings of the same day. They used to share one baseline, so typing 5,000 when your phone had 3,200 made every later sync look like you had walked backwards - and it was refused until your phone caught up.',
     'Each now keeps its own reading and the day only ever goes up. Type 5,000, walk 200, and it says 5,200.',
     'If one reading is still ahead of the other, the game says so instead of pretending nothing happened.']},
 {v:'6.21',d:'Sep 17',t:'LIVE RAIDS',
  i:['Real places near you host raids for two hours at a time. Walk to one, tap it, fight it.',
     'Five tiers: Stray pack, Nest, Swarm, Bloated horror, and The Tall One. Tier 3 and up guarantee rare gear; tier 4 and 5 can drop a legendary.',
     'Everyone standing at the same place in the same two hours sees the SAME raid and chips the SAME health bar. Your loot is your own - it does not split.',
     'Invite a friend sends them the place and the timer. Raids show on the live map with their tier colour.',
     'You can only fight a given raid once, and only if you are actually there.']},
 {v:'6.20',d:'Sep 17',t:'The road does not end any more',
  i:['The county used to stop at The Overpass, 320,000 steps. After that nothing new ever arrived again. Now the road keeps going - new districts every 100,000 steps, forever, each one richer and meaner than the last.',
     'Every 500,000 steps you earn a rank you carry: Veteran, Ranger, Pathfinder, Outrider, Long Walker. It shows on the road screen.',
     'TODAY ON THE ROAD: every day has its own condition - richer loot, thinner crowds, quiet streets, bounty day. Everyone in your group gets the same one.',
     'THE CONVOY: one weekly step target for everyone on the board together. Hit it and you all collect. League tab.',
     'And the radio keeps talking - five new transmissions out past the county, the last one at a million steps.']},
 {v:'6.19',d:'Sep 17',t:'A tidier Base page',
  i:['Settings is one line again instead of ten cards, and opens into five groups: Account and backup, Steps, Notifications, Game, and Danger.',
     'Build, Trader, Raid log and Trophies fold away too. Each one tells you what is inside without opening it - how much scrap you have, how many rooms, how many trophies.',
     'Nothing moved out of reach. Everything is where it was, just behind one tap.']},
 {v:'6.18',d:'Sep 17',t:'Give something to a friend',
  i:['Every item in your pack has a Gift button. Pick a friend, add a note, and it lands in their pack the next time they open the game.',
     'It leaves your pack only once the server confirms it - if the send fails, you keep it.',
     'Needs round twelve of the setup page run once.']},
 {v:'6.17',d:'Sep 17',t:'Something to keep you going',
  i:['THE WALL: 24 milestones for things you have actually done. You tab, Your record. Nothing gives a reward - it just remembers.',
     'YOUR WEEK: when a week ends the game shows you what you did - steps, best day, walkers, places, levels, league finish. It appears on its own the next time you open the game.',
     'NADIA IS REAL NOW: beat her scouts and she pulls back. Lose and she levels up, takes something of yours, and comes back harder. Six ranks.',
     'WEATHER MEANS SOMETHING: tap the weather on the road to see exactly what it is doing to you today. Heat makes you thirsty faster, so water is now a real decision.',
     'Also: dying can no longer take an epic or legendary off you, only ordinary gear.']},
 {v:'6.16',d:'Sep 17',t:'Things move now',
  i:['Your step count rolls up to its new number instead of snapping, and flashes green as it lands.',
     'Epic and legendary gear catches the light in your pack.',
     'Hitting your daily target pulses the card. Switching tabs, the cards arrive one after another.',
     'All of it turns itself off if your phone is set to reduce motion.']},
 {v:'6.15',d:'Sep 17',t:'See your last seven days of steps',
  i:['The Steps card now shows a week of daily totals, so a zero is never ambiguous - you can see at a glance whether it is a fresh day or something is stuck.',
     'Tap any bar to see that day exact number. Today is the one with the ring.',
     'When nothing has arrived yet it also tells you what you finished on yesterday.']},
 {v:'6.14',d:'Sep 17',t:'Good weapons are never destroyed outright',
  i:['An epic or legendary weapon hitting zero durability used to be deleted. Now it is wrecked instead: it stays in your pack and you repair it at the armory. Commons and rares still break for good.',
     'The combat log warns you at three swings left, then two, then one.',
     'If your next swing is the last one a good weapon has, it asks first - once per fight, so a stray tap cannot burn it.']},
 {v:'6.13',d:'Sep 17',t:'Go back five minutes, not a whole hour',
  i:['Restore points used to be taken once an hour, so the closest you could get was up to an hour ago. Now one is taken every few minutes while you play, thinning to about one an hour further back.',
     'Settings, Restore points: pick any of them and tap Go back.',
     'Also fixed: a storage error used to delete every restore point you had. It now drops the oldest one and keeps the rest.']},
 {v:'6.12',d:'Sep 17',t:'The equip check works on normal fights too',
  i:['Walking into a house with no weapon equipped now warns you, the same as horde nights and boss fights already did. That was the fight it was missing - the one you have fifty times a day.',
     'Tap Fight anyway and it stays quiet for the rest of the day, until your gear actually changes. No nagging at every doorway.']},
 {v:'6.11',d:'Sep 17',t:'Shortcut setup without the fiddly bit',
  i:['The shortcut used to put your code and your step number in one box, so you had to edit around a blue bubble without deleting it. That was the worst part of the whole setup.',
     'Now it can be two boxes: c holds your code, n holds nothing but the Sum bubble. Each one you replace whole - nothing to edit around.',
     'Settings, Phone step sync, Fix my shortcut has both. Shortcuts that already work keep working.']},
 {v:'6.10',d:'Sep 17',t:'Everything for the shortcut in one place',
  i:['Settings now has a Phone step sync card that is always there: run the shortcut, fix its code, or rename it.',
     'Before this, Fix my shortcut only appeared when you were signed in and nothing had arrived - so it hid exactly when you needed it.']},
 {v:'6.9',d:'Sep 17',t:'Your shortcut gets a key that never changes',
  i:['Your phone shortcut carries a code proving the steps are yours - and that code used to be your account key, so recovering your account quietly broke step syncing. The shortcut kept firing every hour and kept getting turned away, with nothing to tell you.',
     'It now has its own permanent code that nothing ever changes. Update your shortcut once and it is done forever.',
     'Steps card, Fix my shortcut: it hands you the code and the exact steps.']},
 {v:'6.8',d:'Sep 17',t:'Run your Health shortcut from inside the game',
  i:['The game is not allowed to read Apple Health - your shortcut reads it and sends the number, and the game only reads what the server already has.',
     'So when nothing has arrived today, the Steps card now offers a Run my Health shortcut button. One tap, it runs, your steps land.',
     'Typing your Health total into the box and tapping Sync always works too.',
     'To make it automatic: Shortcuts app, Automation tab, Time of Day, a few times a day, Run Immediately.']},
 {v:'6.7',d:'Sep 17',t:'The game notices when it is signed out',
  i:['If a copy of the game is holding an old account key, saves quietly went nowhere and it still looked online. Now it notices, says so, and shows the way back in.',
     'Your 6-digit PIN works in that box too, so you never have to keep the long key anywhere.']},
 {v:'6.6',d:'Sep 17',t:'Sign in again without starting over',
  i:['Settings, Online: a Re-enter my key button. If a copy of the game is holding an old account key, nothing it does reaches the server - now you can fix it in one step instead of resetting.',
     'If saving your PIN fails because of that, the game opens the sign-in box for you and says why.']},
 {v:'6.4',d:'Sep 17',t:'Set your 6-digit PIN',
  i:['Settings, Recovery code: pick six digits. Your handle plus that PIN gets your character back on any phone, forever.',
     'Five wrong guesses locks it for 15 minutes, so nobody can sit there trying numbers.',
     'PINs are unique. If someone already uses yours, the game tells you to pick another.',
     'Do this once. It is the difference between losing a phone and losing your character.']},
 {v:'6.2',d:'Sep 17',t:'Steps sync the moment you open the game',
  i:['Reopening the game now checks the server straight away. No more waiting, and no reason to ever delete the home-screen icon.',
     'The Steps card shows when it last checked and when your phone last sent anything, with a Sync my steps now button right there.',
     'This screen. The game tells you what changed instead of someone having to message you.']},
 {v:'6.1',d:'Sep 17',t:'You can never be locked out again',
  i:['Settings has a Recovery code: four words. Write them down. Typing your handle and those four words on ANY phone or browser brings your whole character back.',
     'The game now remembers who you are in four separate places, so one of them being wiped is survivable. If it ever launches blank it offers to bring your character back before anything else.',
     'Go make your recovery code now. It takes one tap: Base, Settings, Recovery code.']},
 {v:'6.0',d:'Sep 16',t:'Restore points in the cloud',
  i:['The server keeps up to 24 older copies of your character - one an hour, plus one every time something tries to save over you with a smaller character.',
     'Settings, Restore points (cloud): tap any of them to go back. Survives losing your phone.']},
 {v:'5.9',d:'Sep 16',t:'Save to a file',
  i:['Settings, Save to a file: keeps a copy in your Files or photos that nothing can touch.']},
 {v:'5.5',d:'Sep 15',t:'Notifications',
  i:['Settings, Notifications: the game can nudge you about horde night, a raid on your base, a streak about to break, or a rival passing you.']},
];
function newsHtml(list,title){
  return '<h2>'+esc(title)+'</h2>'+list.map(n=>
    '<div style="margin:0 0 16px"><div style="font-weight:800;color:var(--bone);font-size:17px">'+esc(n.t)+'</div>'
    +'<div class="help" style="margin-bottom:6px">version '+esc(n.v)+' · '+esc(n.d)+'</div>'
    +'<ul style="margin:0;padding-left:20px">'+n.i.map(x=>'<li style="margin:5px 0">'+esc(x)+'</li>').join('')+'</ul></div>').join('');
}
function newsSheet(){openSheet(newsHtml(NEWS,"What's new")+'<button class="btn r wide" onclick="closeSheet()">Close</button>',true);}
function newsCheck(){
  if(!S||!S.onboarded)return;
  if($('#modal').classList.contains('on')){setTimeout(newsCheck,1500);return;}
  const seen=S.newsSeen||'';
  if(seen===VERSION)return;
  // First time we have ever done this: show the latest entry only, not five.
  const fresh=seen?NEWS.filter(n=>cmpVer(n.v,seen)>0):NEWS.slice(0,1);
  S.newsSeen=VERSION;save();
  if(!fresh.length)return;
  openSheet(newsHtml(fresh,fresh.length>1?"What's new since you last played":"What's new")
    +'<button class="btn r wide" onclick="closeSheet()">Got it</button>',true);
}
function cmpVer(a,b){const x=String(a).split('.').map(Number),y=String(b).split('.').map(Number);
  for(let i=0;i<Math.max(x.length,y.length);i++){const d=(x[i]||0)-(y[i]||0);if(d)return d;}return 0;}
// A web page cannot read Apple Health. The Shortcut does that and posts the
// number; the game only reads what the server already has. So when the server
// has nothing for today, offer to RUN the Shortcut instead of checking again.
const SC_NAME='Dead Miles Steps';
/* ================= WHY AREN'T MY STEPS SYNCING (v6.39) =================
   Four times this session the answer to "my steps are not syncing" has been a
   different link in the chain, and every time we found it by guessing. The chain
   is: your Shortcut -> the server -> this game -> today's number. This walks all
   four and names the one that is broken, with the real data at each step. */
async function syncDoctor(){
  const o=O();const out=[];let verdict='';
  const row=(ok,label,detail)=>out.push({ok,label,detail});
  openSheet('<h2>Checking your step sync</h2><p class="help">Talking to the server...</p>',true);

  // 1. signed in
  if(!o.ok){
    row(false,'Signed in','No. The game cannot receive steps while it is signed out.');
    verdict='You are signed out. Open Settings and sign in with your handle and key, then run this again.';
  } else row(true,'Signed in','as @'+o.handle);

  // 2. server reachable
  let reach=false;
  if(o.ok){
    try{const t0=Date.now();await rpc('get_board',{p_week:S.league.week});reach=true;
      row(true,'Server answers','yes, in '+(Date.now()-t0)+' ms');
    }catch(e){row(false,'Server answers','no - '+e.message);
      if(!verdict)verdict='The game cannot reach the server at all. Check your signal, then run this again.';}
  }

  // 2b. THE ENDPOINT THE SHORTCUT ACTUALLY WAITS ON. get_board answering fast
  // says nothing about post_steps_link: different function, and the Shortcut's
  // last action sits on THAT one until it returns. Probe it with a deliberately
  // invalid key - it refuses in the same code path, writes nothing, and the
  // number that comes back is the round trip her phone is really waiting for.
  if(o.ok&&reach){
    try{
      const t0=Date.now();
      await rpc('post_steps_link',{p:o.handle+'|latency-probe-not-a-key|0'});
      const ms=Date.now()-t0;
      if(ms<1500)row(true,'The step endpoint','answers in '+ms+' ms - fast enough, this is not what times your Shortcut out');
      else{row(false,'The step endpoint','took '+ms+' ms. Your Shortcut waits on this, and iOS gives it only a few seconds when it runs on a schedule.');
        if(!verdict)verdict='The server took '+ms+' ms to answer. That is slow enough to time your Shortcut out, especially when it runs on a schedule rather than when you tap it.';}
    }catch(e){row(false,'The step endpoint','could not be reached - '+e.message);
      if(!verdict)verdict='The game can reach the server but the step endpoint itself would not answer. That is the link your Shortcut posts to.';}
  }

  // 3. the key the Shortcut uses
  if(o.ok&&reach){
    try{await fetchStepKey();}catch(e){}
    if(o.stepKey)row(true,'Your Shortcut key','present');
    else{row(false,'Your Shortcut key','missing');
      if(!verdict)verdict='The game has no Shortcut key, so nothing your phone sends can be matched to you. Settings has a Fix my shortcut link.';}
  }

  // 4. what the server actually has for today - the link nobody could see
  let rows=null;
  if(o.ok&&reach){
    const since=new Date();since.setHours(0,0,0,0);
    try{rows=await rpc('get_steps',{p_handle:o.handle,p_token:o.token,p_since:since.toISOString()});}
    catch(e){row(false,'Steps on the server','could not read them - '+e.message);}
    if(rows){
      if(!rows.length){
        row(false,'Steps on the server','NOTHING has arrived today');
        if(!verdict)verdict='The server has not received a single step from your phone today. That means your Shortcut did not run, or it is sending the wrong key. This is the broken link - the game is fine.';
      }else{
        o.posts=rows.slice(0,24).map(r=>({t:r.posted_at,n:r.steps}));o.postsDate=todayStr();
        const best=Math.max(...rows.map(r=>r.steps));
        const newest=new Date(rows[0].posted_at);
        const mins=Math.round((Date.now()-newest.getTime())/60000);
        row(true,'Steps on the server',rows.length+' arrived today · highest '+fmt(best)+' · newest '+(mins<1?'just now':mins<60?mins+' min ago':Math.round(mins/60)+'h ago'));
        /* Posts arriving, all carrying the same value, is a WORKING shortcut
           sending the WRONG number - the opposite fix from "it never ran", and
           the two were indistinguishable while only the highest was reported. */
        if(rows.length>2&&rows.every(r=>r.steps===rows[0].steps)){
          row(false,'The number itself','every one of the '+rows.length+' posts says '+fmt(best)+' - that is a fixed value, not a step count');
          if(!verdict)verdict='Your shortcut is running and reaching the server, but it sends the same number every time. The bubble at the end of it is the wrong one: it has to be the Sum from Calculate Statistics, not the samples themselves.';}
        // 5. did the game take it?
        const c=stepsCounted();
        if(c>=best)row(true,'The game took it','counted '+fmt(c)+', which is everything the server has');
        else{row(false,'The game took it','the game only counted '+fmt(c)+' of the '+fmt(best)+' on the server');
          if(!verdict)verdict='The server HAS your steps but the game had not taken them. Tap "Take them now" below.';}
      }
    }
  }

  const c=stepsCounted(),m=stepsManual();
  row(true,"Today's number",fmt(c)+' from your phone + '+fmt(m)+' you typed = '+fmt(S.steps.today||0));
  if(!verdict)verdict='Everything in the chain looks right. If the number still looks wrong, the arithmetic is on the Steps card - tell me the three numbers on that line.';

  openSheet('<h2>Step sync check</h2>'
    +'<div class="stack" style="margin-top:8px">'
    +out.map(r=>'<div style="display:flex;gap:8px;padding:7px 9px;border-radius:8px;background:rgba(255,255,255,.05);border-left:4px solid '+(r.ok?'var(--rot)':'var(--blood)')+'">'
      +'<span>'+(r.ok?'✓':'✗')+'</span><span style="flex:1;min-width:0"><b>'+esc(r.label)+'</b><div class="help">'+esc(r.detail)+'</div></span></div>').join('')
    +'</div>'
    +stepPostLog()
    +'<div style="margin-top:12px;padding:10px 12px;border-radius:10px;background:rgba(230,165,48,.12);border-left:4px solid var(--amber)">'
    +'<b style="color:var(--amber)">What to do</b><div style="margin-top:4px">'+esc(verdict)+'</div></div>'
    +'<div class="grid2" style="margin-top:10px">'
    +'<button class="btn ghost" onclick="copyText($(\'#sheet\').innerText,\'\');toast(\'Copied - paste it to Claude\',\'z\')">Copy this</button>'
    +'<button class="btn r" onclick="pullSteps();toast(\'Taking them now\')">Take them now</button></div>'
    +'<button class="btn ghost wide" style="margin-top:8px" onclick="runShortcut()">Run my Shortcut</button>'
    +'<button class="btn ghost wide" style="margin-top:8px" onclick="closeSheet()">Close</button>',true);
}
async function fetchStepKey(){
  const o=O();if(!o.ok)return null;
  try{const k=await rpc('get_step_key',{p_handle:o.handle,p_token:o.token});
    if(k&&k!==o.stepKey){o.stepKey=k;save(true);renderOnline();}
    return k;}catch(e){return null;}
}
function stepCode(){const o=O();return o.handle+'|'+(o.stepKey||o.token)+'|';}
// THE SHORTCUT THAT CANNOT TIME OUT (v6.81). "Get Contents of URL" sits and
// waits for the server to answer, so anything slow anywhere between her phone
// and Supabase becomes "Dead Miles Steps took too long to run". Opening the
// GAME with the number in the address waits for nothing: the game takes it the
// moment it opens and posts it itself, over the same connection that already
// works for her leaderboard.
/* THE ADDRESS HAS TO CARRY THE KEY (v6.84). On iOS a Shortcut's "Open URLs"
   hands the link to SAFARI, never to the home-screen app - and a home-screen
   PWA has its own storage. v6.81 put the bare number in the address, so it
   landed in whatever empty copy of the game Safari opened, and her real game,
   with her real save, never saw a thing. With the key in the address, any copy
   that opens the link posts the number to the SERVER, and every copy of her
   game picks it up on its next pull. */
function stepOpenUrl(){const o=O();const k=o.handle+'|'+(o.stepKey||o.token);
  return location.origin+location.pathname+'?k='+encodeURIComponent(k)+'&steps=';}
function runShortcut(){
  toast('Opening Shortcuts...');
  // A deep link to a Shortcut that has been renamed, deleted, or simply does
  // not run does NOT throw - iOS just does nothing. So the button said
  // "Opening Shortcuts...", polled four times in silence, and left her looking
  // at the same number with no idea which end was broken. Her words: "the
  // button was working before, now it isn't."
  // Remember what the game had before, and if nothing has arrived by the last
  // poll, say so and put the check one tap away.
  const was=stepsCounted();
  /* THE DIALOG WAS FIRING ON A WORKING SHORTCUT (fixed v6.84). The Open URLs
     shortcut leaves this app entirely - iOS switches to Safari, the number goes
     to the server from there, and this timer runs the whole time she is looking
     at another screen. Polling here and then announcing "nothing came back" was
     describing our own blindness as her failure. If the app was backgrounded at
     any point, the Shortcut plainly did something: stay quiet and let the pull
     on resume do its job. */
  let leftApp=false;
  const watch=()=>{if(document.visibilityState==='hidden')leftApp=true;};
  document.addEventListener('visibilitychange',watch);
  [2000,5000,9000,15000,22000].forEach(t=>setTimeout(()=>{if(O().ok)pullSteps();},t));
  setTimeout(()=>{
    document.removeEventListener('visibilitychange',watch);
    if(!O().ok||S.loc||S.combat)return;
    if(leftApp)return;                            // it ran and took us elsewhere
    if(stepsCounted()>was)return;                 // it worked, say nothing
    openSheet('<h2>Nothing came back</h2>'
      +'<p>The game asked iOS to run <b>'+esc(S.scName||SC_NAME)+'</b> and no steps arrived in the 24 seconds after. <b>Check my sync</b> below tests every link and tells you which one it is - it is usually the first of these:</p>'
      +'<div class="stack" style="margin-top:8px">'
      +'<div class="note"><b style="color:var(--blood)">Most likely: your shortcut has the old address.</b> Until v6.84 it had no key in it, so the steps went into a blank copy of the game in Safari instead of into your save. Settings has the new address - copy it and replace the old one inside the shortcut.</div>'
      +'<div class="note">It ran but took too long and iOS killed it. In <b>Find Health Samples</b>, <b>Fill Missing</b> must be OFF - it makes Health invent an entry for every gap it can find.</div>'
      +'<div class="note">It ran but could not read Health - the permission gets dropped after an iOS update.</div>'
      +'<div class="note">It ran and sent the wrong key, so the server could not match it to you.</div>'
      +'<div class="note">Or the name no longer matches <b>'+esc(S.scName||SC_NAME)+'</b> exactly - rare, but iOS ignores the link silently when it happens.</div>'
      +'</div>'
      +'<div class="grid2" style="margin-top:12px">'
      +'<button class="btn r" onclick="closeSheet();syncDoctor()">Check my sync</button>'
      +'<button class="btn" onclick="closeSheet();renameShortcut()">Rename my shortcut</button>'
      +'</div>'
      +'<button class="btn ghost wide" style="margin-top:8px" onclick="closeSheet()">Not now</button>',true);
  },24000);
  try{location.href='shortcuts://run-shortcut?name='+encodeURIComponent(S.scName||SC_NAME);}
  catch(e){toast('Could not open Shortcuts','d');}
}
/* Every number her phone has actually sent today, with the time it arrived.
   This is the one screen that separates "iOS never ran it" from "it ran and
   sent the wrong number" - and those two have completely different fixes. */
function stepPostLog(){
  const o=O();
  // undefined = never read the server today, which is not the same as "nothing
  // arrived" and must not be reported as it.
  if(!o.ok||!o.posts||o.postsDate!==todayStr())return '';
  const ps=o.posts;
  if(!ps.length)return '<div class="note" style="margin-top:8px"><b style="color:#ffb35c">Your phone has sent nothing today.</b> Not a wrong number - nothing at all. That is iOS: the shortcut did not run, or it could not read Health.</div>';
  const same=ps.length>2&&ps.every(x=>x.n===ps[0].n);
  const rows=ps.slice(0,8).map(x=>{const d=new Date(x.t);
    return '<span>'+esc(isNaN(d)?'?':timeStr(d.getTime()))+'</span><b>'+fmt(x.n)+'</b>';}).join('');
  return '<div style="margin-top:8px"><div class="section-label">What your phone has sent today</div>'
    +'<div class="kv" style="margin-top:4px">'+rows+'</div>'
    +(ps.length>8?'<span class="help">'+(ps.length-8)+' more earlier.</span>':'')
    +(same?'<div class="note" style="margin-top:8px"><b style="color:#ffb35c">Every post is the same number.</b> Your shortcut is sending a fixed value, not your step count - the bubble at the end of it is the wrong one. It should be the <b>Sum</b> from Calculate Statistics.</div>':'')
    +'</div>';
}
/* One tap that does exactly what the Shortcut's last action does, minus the
   Shortcut. It splits the problem in half: black screen with a tick = the
   address and the key are good and the fault is inside iOS; nothing = ours. */
function testStepLink(){
  const o=O();if(!o.ok){toast('Go online first','d');return;}
  const u=stepOpenUrl()+'7';
  toast('Opening the address - look for a black screen with a green tick');
  try{const w=window.open(u,'_blank');if(!w)location.href=u;}
  catch(e){location.href=u;}
}
/* v6.87 - the OTHER half of the test. testStepLink() above opens the address
   the way an Open URLs shortcut would, and proves the Safari hand-off and the
   beacon. It cannot say anything about a Get Contents of URL shortcut, which
   never opens a browser at all - that one POSTs p = handle|stepKey|steps
   straight to post_steps_link. So that branch gets the test that matches it:
   the same call, with her real key, and a verdict that discriminates.

   The verdict is STATE, not innerHTML. Written straight into the div it looked
   right and then vanished, because this function ends by calling pullSteps(),
   which re-renders the whole Steps card and wipes the div it had just written
   to. Only clicking the button on a real page showed that. */
let STEP_TEST='';
function stepTestSay(h){STEP_TEST=h;const el=$('#stepTestOut');if(el)el.innerHTML=h;}
async function testStepKey(){
  const o=O();
  if(!o.ok){stepTestSay('<b style="color:var(--blood)">Sign in first.</b> The game has to be online to test the key.');return;}
  stepTestSay('<span class="help">Sending a test to the server...</span>');
  try{await fetchStepKey();}catch(e){}
  const key=(O().stepKey||O().token||'');
  if(!key){stepTestSay('<b style="color:var(--blood)">No key.</b> The game has no shortcut key yet, so nothing your phone sends can be matched to you. Go offline and back online in Settings, then test again.');return;}
  let ok=false,err='';const t0=Date.now();
  try{ok=await rpc('post_steps_link',{p:o.handle+'|'+key+'|1'});}catch(e){ok=false;err=e.message||String(e);}
  const ms=Date.now()-t0;
  if(err){stepTestSay('<b style="color:var(--blood)">The server would not answer.</b>'
      +'<div class="help" style="margin-top:4px">'+esc(err.slice(0,140))+'</div>'
      +'<div class="help" style="margin-top:6px">This is not your shortcut - the game itself cannot reach the step endpoint right now. Check your signal and test again.</div>');return;}
  if(!ok){stepTestSay('<b style="color:var(--blood)">The server refused the key.</b>'
      +'<div class="help" style="margin-top:4px">It answered in '+ms+' ms, so the connection is fine - it does not recognise <b>'+esc(o.handle)+'</b> with this key. That happens after you recover your account. Sign out and back in, then copy the code out of this card again.</div>');return;}
  stepTestSay('<b style="color:#5fd08a">Your key works.</b>'
    +'<div class="help" style="margin-top:4px">The server took a test step with it and answered in '+ms+' ms, so the code in the box below is correct.</div>'
    +'<div class="help" style="margin-top:6px">If your real steps still are not arriving, the fault is inside the shortcut: it is not running, or the <b>p</b> field does not match the box below. Copy it out again and paste it in - and check <b>Fill Missing</b> is OFF.</div>');
  try{await pullSteps();}catch(e){}
  stepTestSay(STEP_TEST);
}
/* v6.87 - THE CARD STILL LED WITH A SHORTCUT SHE MAY NOT HAVE.
   v6.86 added the "if it says Get Contents of URL" sentence, but it sits at the
   end of a paragraph under a card whose headline is "Your shortcut needs this
   new address" - and if hers is that other kind, there IS no address to
   replace and the whole card is about someone else's problem. Her words: "the
   shortcuts and syncing worked really well up until this point of having to
   change it". That is a bisection result: the Get Contents of URL shortcut is
   the shape that worked, it POSTs straight to the server, and no browser
   hand-off can misdeliver it. So the card asks which one she has FIRST, and
   each branch carries the test that can actually say anything about it. */
function renderStepSync(){
  const el=$('#stepSyncBody');if(!el)return;const o=O();
  if(!o.ok){el.innerHTML='<p class="help">Sign in above first. Your shortcut code lives on the server, so the game has to be online to show it to you.</p>';return;}
  const posted=o.lastPost?('Your phone last sent steps at <b>'+esc(timeStr(o.lastPost))+'</b>.')
    :'<span style="color:#ffb35c">Your phone has not sent any steps today.</span>';
  const nu=stepOpenUrl();const pre=stepCode();
  el.innerHTML='<div class="note" style="border-left-color:var(--blood)"><b style="color:var(--blood)">First: which shortcut do you have?</b>'
    +'<div class="help" style="margin-top:4px">Open <b>'+esc(S.scName||SC_NAME)+'</b> in the Shortcuts app and scroll to the <b>last action</b>. Use the box below that matches it and ignore the other one - they need opposite things.</div></div>'

    +'<details open style="margin-top:10px"><summary style="cursor:pointer"><b>Last action says "Get Contents of URL"</b></summary>'
    +'<div class="note" style="margin-top:6px">'
    +'<div class="help">This is the kind that worked before, and it is the one to keep. It posts straight to the server and never opens a browser, so your steps cannot land in a blank copy of the game. <b>There is no address to replace in this one.</b></div>'
    +'<div class="help" style="margin-top:6px">Two things to check. First, in <b>Find Health Samples</b>, <b>Fill Missing</b> must be OFF - that is what was timing it out. Second, tap the <b>Get Contents of URL</b> action and open the Request Body field named <b>p</b>. It must hold exactly this code, then the blue <b>Sum</b> bubble, and nothing else:</div>'
    +'<input id="syncCodeCard" readonly value="'+esc(pre)+'" style="width:100%;margin:8px 0 6px;font-size:11px">'
    +'<div class="row"><button class="btn sm r" onclick="copyText($(\'#syncCodeCard\').value,\'syncCodeCard\')">Copy the code</button>'
    +'<button class="btn sm" onclick="testStepKey()">Test my key</button></div>'
    +'<div id="stepTestOut" style="margin-top:8px">'+STEP_TEST+'</div>'
    +'<div class="help" style="margin-top:6px">Delete everything in <b>p</b> except the blue Sum bubble, put the cursor in front of the bubble and paste. The code already ends in a <b>|</b> - do not add another.</div>'
    +'<details style="margin-top:8px"><summary class="help" style="cursor:pointer">Mine says Open URLs - how do I switch it to this one?</summary><div style="margin-top:6px">'
    +'<div class="help">Worth doing: this kind posts and finishes, so it never opens the game. The Open URLs kind opens the game every single time it runs, which on a daily automation means your phone launching a game by itself.</div>'
    +'<div class="help" style="margin-top:6px">Keep the first two actions exactly as they are. Only the last one changes:</div>'
    +'<ol style="padding-left:20px;margin:6px 0;line-height:1.7">'
    +'<li>Press and hold the <b>Open URLs</b> action, <b>Delete</b>.</li>'
    +'<li>Search <b>Get Contents of URL</b> and add it. Paste this address into it:</li>'
    +'</ol>'
    +'<input id="syncUrl3" readonly value="'+esc(SB.url+'/rest/v1/rpc/post_steps_link?apikey='+SB.key)+'" style="width:100%;margin:4px 0 6px;font-size:11px">'
    +'<button class="btn sm ghost" onclick="copyText($(\'#syncUrl3\').value,\'syncUrl3\')">Copy the address</button>'
    +'<ol start="3" style="padding-left:20px;margin:6px 0;line-height:1.7">'
    +'<li>Tap <b>Show More</b>. Method <b>POST</b>, Request Body <b>JSON</b>.</li>'
    +'<li><b>Add new field</b> &rarr; <b>Text</b>, Key <b>p</b>. Paste the code from above into its value, then tap the <b>Statistic</b> bubble over the keyboard so it sits right after the last <b>|</b>.</li>'
    +'<li>Done. Tap play - nothing should open, and your number appears here.</li>'
    +'</ol></div></details>'
    +'</div></details>'

    +'<details style="margin-top:8px"><summary style="cursor:pointer"><b>Last action says "Open URLs"</b></summary>'
    +'<div class="note" style="margin-top:6px">'
    +'<div class="help">This one hands the link to Safari, so it needs the address with your key in it. Select the old address inside the action and paste this over it, leaving the blue <b>Sum</b> bubble at the end where it is.</div>'
    +'<input id="syncUrlCard" readonly value="'+esc(nu)+'" style="width:100%;margin:8px 0 6px;font-size:11px">'
    +'<div class="row"><button class="btn sm r" onclick="copyText($(\'#syncUrlCard\').value,\'syncUrlCard\')">Copy the address</button>'
    +'<button class="btn sm" onclick="testStepLink()">Test this address</button></div>'
    +'<div class="help" style="margin-top:6px"><b>Test it first.</b> That button opens the address exactly the way this shortcut would, with 7 steps instead of your real count. A black screen with a green tick means the address works and anything still broken is inside the shortcut. Nothing at all means it is mine to fix - tell me.</div>'
    +'</div></details>'

    +'<p class="help" style="margin-top:10px">The game cannot read Apple Health - your <b>'+esc(S.scName||SC_NAME)+'</b> shortcut reads it and sends the number here. '+posted+'</p>'
    +'<div class="row" style="margin-top:8px"><button class="btn sm r" onclick="runShortcut()">Run it now</button>'
    +'<button class="btn sm" onclick="syncDoctor()">Check my sync</button>'
    +'<button class="btn sm ghost" onclick="renameShortcut()">Rename</button></div>'
    +stepPostLog();
}
function fixShortcut(){
  const o=O();if(!o.ok){toast('Go online first','d');return;}
  fetchStepKey().then(()=>{
    openSheet('<h2>Fix my shortcut</h2>'
      +'<p>What to replace depends on how your shortcut ends. Open <b>'+esc(S.scName||SC_NAME)+'</b> and read the <b>last action</b>.</p>'
      +'<div style="padding:10px 12px;border-radius:8px;background:rgba(230,62,92,.12);border-left:4px solid var(--blood)">'
      +'<b style="color:var(--bone)">If it says "Get Contents of URL"</b>'
      +'<div class="help" style="margin-top:4px">Keep this one - it is the kind that worked. No address to change. Tap it, open the Request Body field named <b>p</b>, delete everything in it <b>except the blue Sum bubble</b>, put the cursor before the bubble and paste this. It already ends in a <b>|</b>. Also make sure <b>Fill Missing</b> is OFF in Find Health Samples.</div>'
      +'<input id="fixCode" readonly value="'+esc(stepCode())+'" style="width:100%;margin:8px 0 6px;font-size:11px">'
      +'<button class="btn sm r" onclick="copyText($(\'#fixCode\').value,\'fixCode\')">Copy the code</button>'
      +'</div>'
      +'<div style="margin-top:10px;padding:10px 12px;border-radius:8px;background:rgba(94,173,255,.10);border-left:4px solid #5eadff">'
      +'<b style="color:var(--bone)">If it says "Open URLs"</b>'
      +'<div class="help" style="margin-top:4px">Select the old address and paste this over it. Leave the blue <b>Sum</b> bubble at the end where it is.</div>'
      +'<input id="fixUrl" readonly value="'+esc(stepOpenUrl())+'" style="width:100%;margin:8px 0 6px;font-size:11px">'
      +'<button class="btn sm" onclick="copyText($(\'#fixUrl\').value,\'fixUrl\')">Copy the address</button>'
      +'</div>'
      +'<p class="help" style="margin-top:12px">Then close this and use the test button on that same branch of the Steps card - it says on screen whether the server takes it.</p>'
      +'<button class="btn wide ghost" style="margin-top:12px" onclick="closeSheet()">Close</button>',true);
  });
}
function renameShortcut(){
  const n=prompt('What is your Shortcut called, exactly as it appears in the Shortcuts app?',S.scName||SC_NAME);
  if(n===null)return;S.scName=n.trim()||SC_NAME;save();render();toast('Saved','z');
}
function syncNow(){
  const o=O();if(!o.ok){toast('Go online first (Settings)','d');return;}
  toast('Checking the server...');
  Promise.resolve(pullSteps()).then(()=>{loadFriends();partySync();bossSync();checkUpdate();
    if(!o.lastPost)toast('Still nothing from your phone. The game cannot read Health - run your shortcut, or type the total.','d');});
}
// iPhone keeps a home-screen app frozen for days. Resuming it used to show
// yesterday's numbers until a timer happened to fire, which is why deleting and
// re-adding the icon "fixed" it. Now every resume pulls immediately.
let LAST_ACTIVE=Date.now();
function onResume(){
  const away=Date.now()-LAST_ACTIVE;LAST_ACTIVE=Date.now();
  try{stepsBeacon();autoSyncFromUrl();}catch(e){}   // a Shortcut may have just opened us with ?steps=
  if(away>6*3600000){location.reload();return;}
  if(O().ok){pullSteps();loadFriends();partySync();bossSync();takeGifts();}
  if(typeof C==='undefined'||!C)render();
  checkUpdate();
}
// Seven days of steps. One series, so no legend - the heading names it. Today
// is marked by a ring and a label, never by a different hue: colour follows the
// thing being measured, not its position.
const STEP_BAR='#4e8a2a';
function stepDays(){
  const out=[];const hist=(S.steps&&S.steps.hist)||[];
  const d=new Date();d.setHours(12,0,0,0);
  for(let i=6;i>=0;i--){
    const x=new Date(d);x.setDate(d.getDate()-i);
    const key=x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(x.getDate()).padStart(2,'0');
    const rec=hist.find(h=>h.d===key);
    out.push({key,letter:'SMTWTFS'[x.getDay()],
      n:i===0?(S.steps.today||0):(rec?rec.n:null),
      today:i===0, known:i===0||!!rec});
  }
  return out;
}
let STEP_PICK=-1;
function pickDay(i){STEP_PICK=STEP_PICK===i?-1:i;renderStepHist();}
function wxSheet(){
  const k=wxKind(),t=(S.wx&&S.wx.temp);
  const name={clear:'Clear',rain:'Rain',storm:'Storm',snow:'Snow',fog:'Fog'}[k]||'Out there';
  openSheet('<h2>'+esc(name)+(typeof t==='number'?' · '+t+'\u00b0':'')+(isNight()?' · night':'')+'</h2>'
    +'<p class="help">What the weather is doing to you right now.</p>'
    +wxEffects().map(e=>'<div style="display:flex;gap:9px;padding:7px 0;border-bottom:1px solid var(--line)">'
      +'<span style="color:'+(e.good?'var(--rot)':'#ff8a92')+';font-weight:800">'+(e.good?'+':'-')+'</span>'
      +'<span>'+esc(e.t)+'</span></div>').join('')
    +'<button class="btn r wide" style="margin-top:12px" onclick="closeSheet()">Got it</button>',true);
}
function renderStepHist(){
  syncMath();try{renderLadder();}catch(e){}
  const el=$('#stepHist');if(!el)return;
  const days=stepDays();const known=days.filter(d=>d.known&&d.n!==null);
  if(known.length<2&&!(S.steps.today>0)){el.innerHTML='<p class="help">Your day-by-day history starts building from today.</p>';return;}
  const max=Math.max(1,...known.map(d=>d.n));
  const sel=days[STEP_PICK];
  const bars=days.map((d,i)=>{
    const h=d.n===null?0:Math.max(3,Math.round(d.n/max*54));
    const ring=d.today?'box-shadow:0 0 0 2px var(--ash2),0 0 0 4px rgba(232,224,208,.45);':'';
    return '<button onclick="pickDay('+i+')" aria-label="'+esc(d.key)+': '+(d.n===null?'no record':fmt(d.n)+' steps')+'"'
      +' style="flex:1;background:none;border:0;padding:0;display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer">'
      +'<span style="height:56px;display:flex;align-items:flex-end;width:100%;justify-content:center">'
      +(d.n===null
        ? '<span style="width:70%;height:3px;border-radius:2px;background:var(--line)"></span>'
        : '<span style="width:70%;height:'+h+'px;border-radius:4px 4px 0 0;background:'+STEP_BAR+';'+ring+'"></span>')
      +'</span>'
      +'<span class="help" style="font-size:11px;'+(d.today?'color:var(--bone);font-weight:700':'')+'">'+d.letter+'</span>'
      +'</button>';
  }).join('');
  // selective labels only: today, and whichever day you tap
  const todayN=days[6].n||0;
  const yday=days[5];
  let line='<b style="color:var(--bone)">'+fmt(todayN)+'</b> today';
  if(yday.n!==null)line+=' · <b>'+fmt(yday.n)+'</b> yesterday';
  if(sel&&sel.n!==null&&!sel.today)line=esc(sel.key)+': <b style="color:var(--bone)">'+fmt(sel.n)+'</b> steps';
  el.innerHTML='<div class="section-label">Last 7 days</div>'
    +'<div style="display:flex;gap:2px;align-items:flex-end;margin:6px 0 2px">'+bars+'</div>'
    +'<p class="help" style="margin:2px 0 0">'+line+'</p>';
}
function renderOnline(){if(offscreen('#onlineStatus'))return;
  const o=O();const st=$('#onlineStatus');if(!st)return;
  st.textContent=o.ok?'@'+o.handle:(o.err?'error':'off');
  let body='';
  if(!o.ok){body=`${o.err?`<div style="margin-bottom:10px;padding:10px 12px;border-radius:8px;background:rgba(230,62,92,.18);border-left:4px solid #e63e5c"><b style="color:#ff8a92">${esc(o.err)}</b><div class="help" style="margin-top:4px">Sign back in with your handle and your 6-digit PIN, or your account key. Your character on this phone is not touched.</div><button class="btn sm r" style="margin-top:8px" onclick="signInSheet()">Sign in again</button></div>`:''}<div class="row"><input id="handleInput" type="text" maxlength="20" placeholder="handle, e.g. celeste" value="${esc(o.handle||slug(S.name))}" style="flex:1;min-width:140px"><button class="btn r" onclick="goOnline($('#handleInput').value,$('#tokenInput').value)">Go online</button></div><input id="tokenInput" type="text" placeholder="account key (only if moving from another browser)" style="margin-top:8px;font-size:12px">${o.err?`<p class="help" style="color:#ff8a92">${esc(o.err)}</p>`:''}`;}
  else{body=`<div class="kv"><span>Handle</span><b>@${esc(o.handle)}</b><span>Last phone sync</span><b>${o.lastPost?timeStr(o.lastPost)+' today':'none yet'}</b><span>Server</span><b>${o.err?'<span style="color:#ff8a92">'+esc(o.err)+'</span>':'ok'}</b></div><div class="row" style="margin-top:8px"><button class="btn sm" onclick="pullSteps();loadFriends();partySync();toast('Syncing')">Sync now</button><button class="btn sm ghost" onclick="testOnline()">Test connection</button><button class="btn sm ghost" onclick="copyText(O().token,'')">Copy account key</button><button class="btn sm ghost" onclick="signInSheet()">Re-enter my key</button></div><p class="help">Account key = how to move to another browser or phone. There, type this handle, paste the key, and your save comes with it.</p>`;}
  $('#onlineBody').innerHTML=body;
  try{checkAchv();checkSets();}catch(e){}
  // fold summaries carry the live state, so a closed fold still tells you something
  try{const bf=$('#buildFold');
    if(bf){const rooms=S.base?Object.values(S.base.rooms||{}).reduce((a,b)=>a+b,0):0;
      bf.textContent=!S.base?'claim a base first':(S.work?('building '+BUILD[S.work.k].n+'...'):(rooms+' room'+(rooms===1?'':'s')+' · '+fmt(S.stock.scrap)+' scrap'));}
    const tf=$('#traderFold');
    if(tf)tf.textContent=S.base?(fmt(S.stock.scrap)+' scrap to spend'):'needs a base';
    const sf=$('#shelfSubFold');if(sf)sf.textContent=setsDone().length+'/'+TROPHY_SETS.length+' sets';
    renderGacha();
    const sl=$('#setsLine');if(sl)sl.textContent=setsDone().length?setsDone().map(x=>x.e).join(' ')+' complete':'no sets yet';
  }catch(e){}
  try{const got=Object.keys(S.achv||{}).length;const ws=$('#wallSub');if(ws)ws.textContent=got+'/'+ACHV.length;
    const wl=$('#wallLine');if(wl){const last=(S.weeks||[])[0];
      wl.textContent=last?('Last week: '+fmt(last.steps)+' steps, '+fmt(last.kills)+' walkers, '+fmt(last.places)+' places.')
        :'Your first weekly recap lands when this week ends.';}
    nemCard();}catch(e){}
  try{const dm=dayMod();const dc=$('#dayModCard');
    if(dc)dc.innerHTML='<h2>Today on the road <span class="sub">'+esc(dm.n)+'</span></h2>'
      +'<p class="help" style="margin-top:4px">'+esc(dm.d)+'</p>'
      +(vetRank()?'<p class="help" style="margin-top:6px;color:var(--amber)">'+esc(vetTitle())+' · '+fmt(S.steps.total)+' lifetime steps · '+esc(district().n)+'</p>':'');
    renderConvoy();}catch(e){}
  try{renderCheckin();renderCalls();}catch(e){}
  renderStepHist();
  const sHelp=$('#stepsHelp');
  if(sHelp){
    if(!o.ok){sHelp.innerHTML='<span style="color:#ffb35c">The game is signed out, so steps cannot arrive.</span> Open <b>Base</b>, then <b>Settings</b>, and sign in - then <b>Phone step sync</b> there has everything for your shortcut.';}
    else{const t=o.lastPull||0;const mins=t?Math.round((Date.now()-t)/60000):-1;
      const when=mins<0?'not yet this session':(mins<1?'just now':mins+' min ago');
      if(!o.lastPost){
        sHelp.innerHTML='<div style="padding:10px 12px;border-radius:8px;background:rgba(255,165,0,.14);border-left:4px solid #ffa500">'
          +'<b style="color:var(--bone)">Nothing from your phone today.</b>'
          +(function(){const y=stepDays()[5];return y&&y.n!==null
             ? '<div class="help" style="margin-top:4px">Your count resets at midnight - yesterday you finished on <b>'+fmt(y.n)+'</b>. So a zero this early is normal; it only means trouble if it stays zero after you have walked.</div>'
             : '';})()
          +'<div class="help" style="margin-top:4px">The game is not allowed to read Apple Health. Your <b>'+esc(S.scName||SC_NAME)+'</b> shortcut reads it and sends the number. Run it and your steps land here.</div>'
          +'<div class="help" style="margin-top:6px">If it runs and nothing arrives, the code inside it is out of date - that happens after you recover your account. <a href="#" onclick="fixShortcut();return false;" style="color:var(--steel);text-decoration:underline">Fix my shortcut</a></div>'
          +'<div class="row" style="margin-top:8px"><button class="btn sm r" onclick="runShortcut()">Run my Health shortcut</button>'
          +'<button class="btn sm ghost" onclick="syncNow()">Just check again</button></div>'
          +'<div class="help" style="margin-top:6px">Or type today\'s total from the Health app in the box above and tap Sync - that always works. '
          +'<a href="#" onclick="renameShortcut();return false;" style="color:var(--steel);text-decoration:underline">Shortcut named something else?</a></div></div>'
          +'<span class="help" style="display:block;margin-top:6px">Checked the server '+esc(when)+'. To make this automatic: Shortcuts app, Automation tab, Time of Day, a few times a day, Run Immediately.</span>';
      }else{
        sHelp.innerHTML='<b style="color:var(--bone)">Checked the server '+esc(when)+'.</b> Your phone last sent steps at '+esc(timeStr(o.lastPost))+'.'
          +'<div class="row" style="margin-top:8px"><button class="btn sm r" onclick="syncNow()">Sync my steps now</button>'
          +'<button class="btn sm ghost" onclick="runShortcut()">Run my Health shortcut</button></div>'
          +'<span class="help">It checks on its own every minute and the moment you open the game. You never need to delete the icon. <a href="#" onclick="fixShortcut();return false;" style="color:var(--steel);text-decoration:underline">Fix my shortcut</a></span>';
      }}
  }
  /* v6.88 - THE SETUP GUIDE STILL BUILT THE WRONG ONE.
     v6.87 fixed the Steps card but this guide, one layer down, was still
     walking a new player through building the Open URLs shortcut. Two reasons
     that is the wrong default, and the second is the decisive one:
       1. it depends on iOS handing the link to the copy of the game she
          actually plays, which is the v6.84 bug;
       2. IT OPENS THE GAME EVERY TIME IT RUNS. On a daily or hourly
          automation that is a phone that launches a game by itself all day.
          A background sync that yanks you into an app is not a background
          sync.
     Get Contents of URL posts and finishes. Nothing opens. It is the default
     again, and the only thing that ever made it time out - Fill Missing - is
     called out in the step where it lives. */
  const sh=$('#shortcutHelp');if(sh){const openUrl=stepOpenUrl();const url=SB.url+'/rest/v1/rpc/post_steps_link?apikey='+SB.key;const prefix=stepCode();if(o.ok&&!o.stepKey)fetchStepKey();sh.innerHTML=o.ok?`
  <b>iPhone, one time.</b> Three actions. This one posts your steps and finishes - it never opens the game, so it can run on a schedule without interrupting you.
  <div class="section-label" style="margin-top:8px">The address</div><input id="syncUrl" readonly value="${esc(url)}" style="margin:6px 0;font-size:11px"><button class="btn sm a" onclick="copyText($('#syncUrl').value,'syncUrl')">Copy address</button>
  <div class="section-label" style="margin-top:8px">Your code</div><input id="syncPrefix" readonly value="${esc(prefix)}" style="margin:6px 0;font-size:11px"><button class="btn sm a" onclick="copyText($('#syncPrefix').value,'syncPrefix')">Copy code</button>
  <ol style="padding-left:20px;margin:10px 0">
  <li><b>Shortcuts</b> app &rarr; <b>+</b>. Add three actions with the search box: <b>Find Health Samples</b>, <b>Calculate Statistics</b>, <b>Get Contents of URL</b>.</li>
  <li><b>Find Health Samples</b>: Type is <b>Steps</b>, and one filter - <b>Start Date is today</b>. Then scroll down inside that action and make sure <b style="color:var(--blood)">Fill Missing is OFF</b> and <b>Limit is off</b>. Fill Missing makes Health invent an entry for every gap it can find, and that one setting is enough on its own to hang the whole shortcut. It is the only thing that has ever made this kind time out.</li>
  <li><b>Calculate Statistics</b>: <b>Sum</b> of <b>Health Samples</b>.</li>
  <li><b>Get Contents of URL</b>: paste the address above. Tap <b>Show More</b>. Set <b>Method</b> to <b>POST</b>, <b>Request Body</b> to <b>JSON</b>, then <b>Add new field</b> &rarr; <b>Text</b>, Key <b>p</b>. In its value paste your code above, and with the cursor right after the last <b>|</b> tap the <b>Statistic</b> bubble over the keyboard.</li>
  <li>Name it <b>Dead Miles Steps</b>, Done, then tap play. Nothing will open - come back here and the number is in.</li>
  <li><b>Automation</b> tab &rarr; <b>+</b> &rarr; <b>Time of Day</b> &rarr; a time, Daily, <b>Run Immediately</b> &rarr; <b>Next</b> &rarr; tap <b>Dead Miles Steps</b>. Make a few (noon, 4 pm, 8 pm, 11 pm). Do not stack one every hour - it just fails every hour if anything is wrong.</li>
  </ol>
  <div class="note"><b>If yours already exists and keeps timing out, check this before rebuilding it.</b> In <b>Find Health Samples</b>, turn <b>Fill Missing OFF</b>. Then check the triggers at the very top: an hourly stack (At 22:00 or At 21:00 or At 20:00...) means it runs all day and fails all day, one notification each time.</div>
  <details style="margin-top:8px"><summary class="help">The Open URLs version, if you would rather not edit a POST body</summary><div style="margin-top:6px">
  <input id="syncUrl2" readonly value="${esc(openUrl)}" style="margin:6px 0;font-size:11px"><button class="btn sm ghost" onclick="copyText($('#syncUrl2').value,'syncUrl2')">Copy address</button>
  <p class="help">Use <b>Open URLs</b> as the last action instead: paste this address, then with the cursor right after the <b>=</b> tap the <b>Statistic</b> bubble. It is fewer taps to build and it cannot time out, because it waits for nothing. The cost is that <b>it opens the game every single time it runs</b>, and it depends on iOS handing the link to the copy of the game you actually play.</p>
  </div></details>
  <b>Android:</b> install the tiny companion app <a href="./DeadMilesSteps.apk">DeadMilesSteps.apk</a> (Android asks once to allow installs from your browser), paste the handle <b>${esc(o.handle)}</b> and token <b style="word-break:break-all">${esc(o.token)}</b> into it, tap Allow reading steps, then Save. It posts your Health Connect steps every hour on its own.`:'Go online first, then your personal sync address and code appear here.';}
}
function visitFriend(i){const f=friends[i];if(!f)return;const pub=f.pub||{};const sv=pub.save||{};const st={base:sv.base||(pub.base?{...pub.base}:null),shelf:sv.shelf||[],av:sv.av||pub.av||S.av,pet:sv.pet||null,petCoat:sv.petCoat||null,active:sv.active||[],crew:sv.crew||[]};
  openSheet(`<h2>${esc(f.name)}'s place</h2>${st.base?baseScene(st):'<p class="help">No base claimed yet.</p>'}<div class="kv" style="margin-top:10px"><span>Level</span><b>${pub.lvl||1}</b><span>Kills</span><b>${fmt(pub.kills||0)}</b><span>Defense</span><b>${pub.defense||0}</b><span>Streak</span><b>${pub.streak||0}</b><span>Trophies</span><b>${st.shelf.length}</b><span>Companion</span><b>${st.pet?(sv.petName||PETS[st.pet].n)+' the '+ART.coatInfo(st.pet,st.petCoat).n.toLowerCase()+' L'+Math.min(10,Math.floor((sv.petXp||0)/4000)+1)+((sv.pets||[]).length>1?' (+'+((sv.pets||[]).length-1)+' more)':''):'none'}</b><span>Weapon</span><b>${esc(pub.weapon||'fists')}</b></div><button class="btn r wide" style="margin-top:10px" onclick="closeSheet()">Head back</button>`);}
let LB_TAB='today';function lbTab(t){LB_TAB=t;SFX.play('ui');render();}
function hideFriend(h){if(!S.hidden.includes(h))S.hidden.push(h);if(S.rival===h)S.rival='';save();render();}
function unhideFriend(h){S.hidden=S.hidden.filter(x=>x!==h);save();render();}
function setRival(h){S.rival=S.rival===h?'':h;SFX.play('ui');save();render();}
const LB_TABS=[['today','Steps today',f=>(f.pub||{}).steps_today||0],['week','This week',f=>(f.pub||{}).steps_week||0],['score','League pts',f=>f.score||0],['kills','Kills',f=>(f.pub||{}).kills||0]];
function lbVal(f){return (LB_TABS.find(t=>t[0]===LB_TAB)||LB_TABS[0])[2](f);}
function typedShare(pub){const s=pub.src||{};const tot=(s.phone||0)+(s.typed||0)+(s.walk||0);if(!tot)return null;return {typed:s.typed||0,pct:Math.round((s.typed||0)/tot*100)};}
function rivalRow(){const el=$('#rivalCard');if(!el)return;const o=O();
  if(!o.ok||!S.rival){el.hidden=true;return;}
  const f=friends.find(x=>x.handle===S.rival);if(!f){el.hidden=true;return;}
  el.hidden=false;const pub=f.pub||{};const mine=S.steps.today,theirs=pub.steps_today||0;const mw=(S.steps.weekId===weekId()?S.steps.week||0:0),tw=pub.steps_week||0;
  const ahead=mine-theirs,aheadW=mw-tw;
  el.innerHTML=`<h2>You vs ${esc(f.name)} <span class="sub">${ahead===0?'dead even today':ahead>0?'you lead by '+fmt(ahead):'behind by '+fmt(-ahead)}</span></h2>
  <div class="vs"><div class="side"><div>${ART.avatarSVG(S.av,54)}</div><b>You</b><span class="num">${fmt(mine)}</span><span class="help">${fmt(mw)} this week</span></div>
  <div class="vsmid">${ahead>0?'🥇':ahead<0?'🥈':'🤝'}</div>
  <div class="side"><div>${pub.av?ART.avatarSVG(pub.av,54):'🧍'}</div><b>${esc(f.name)}</b><span class="num">${fmt(theirs)}</span><span class="help">${fmt(tw)} this week</span></div></div>
  <div class="bar" style="height:8px;border-radius:4px;background:var(--ash2);overflow:hidden;margin-top:8px"><i style="display:block;height:100%;width:${mine+theirs?Math.round(mine/(mine+theirs)*100):50}%;background:linear-gradient(90deg,var(--rot2),var(--rot))"></i></div>
  <p class="help" style="margin-top:6px">This week: ${aheadW===0?'level':aheadW>0?'you are '+fmt(aheadW)+' ahead':'you are '+fmt(-aheadW)+' behind'}. Tap their name on the County tab to change rival.</p>`;}
function renderFriends(){
  const o=O();const el=$('#friends');if(!el)return;const sub=$('#friendsSub');const help=$('#friendsHelp');
  if(!o.ok){sub.textContent='offline';help.textContent='Go online in Settings to see who else is walking Hollow County.';el.innerHTML='';return;}
  const shown=friends.filter(f=>!S.hidden.includes(f.handle)).slice()
    .sort((a,b)=>(a.quiet?1:0)-(b.quiet?1:0)||lbVal(b)-lbVal(a));   // quiet ones last, never mixed in
  const hid=friends.filter(f=>S.hidden.includes(f.handle));
  sub.textContent=shown.length+' on the board';help.textContent='Tap a name to make them your rival. Hide anyone you do not want on your board.';
  $('#lbTabs').innerHTML=LB_TABS.map(([k,n])=>`<button class="${LB_TAB===k?'on':''}" onclick="lbTab('${k}')">${n}</button>`).join('');
  el.innerHTML=shown.map((f)=>{const me=f.handle===o.handle;const pub=f.pub||{};const idx=friends.indexOf(f);const ts=typedShare(pub);
    return `<div class="lbrow${me?' me':''}${S.rival===f.handle?' rival':''}"><div class="rk">${shown.indexOf(f)+1}</div><div class="av">${pub.av?ART.avatarSVG(pub.av,40):'🧍'}</div>
    <div class="nm"><button class="linkish" onclick="${me?'':`setRival('${f.handle}')`}">${esc(f.name)}${me?' (you)':''}${pub.crowns?' 👑'+pub.crowns:''}${S.rival===f.handle?' · rival':''}${f.quiet?' <span class="chip s">not out this week</span>':''}</button><small>@${esc(f.handle)} · lvl ${pub.lvl||1} · ${fmt(pub.steps_today||0)} today · ${fmt(pub.steps_week||0)} this week${pub.streak?' · streak '+pub.streak:''}${ts&&ts.typed?` · <span style="color:var(--amber)">${fmt(ts.typed)} typed in (${ts.pct}%)</span>`:ts?' · phone-synced':''}</small></div>
    <div class="sc">${fmt(lbVal(f))}${me?'':`<br><button class="btn xs" onclick="visitFriend(${idx})">Visit</button><br><button class="btn xs ghost" onclick="hideFriend('${f.handle}')">Hide</button>`}</div></div>`;}).join('')||'<p class="help">Nobody yet.</p>';
  if(hid.length)el.innerHTML+=`<div class="section-label" style="margin-top:12px">Hidden</div>`+hid.map(f=>`<div class="lbrow" style="opacity:.6"><div class="rk">·</div><div class="av">🚫</div><div class="nm">${esc(f.name)}<small>@${esc(f.handle)}</small></div><div class="sc"><button class="btn xs" onclick="unhideFriend('${f.handle}')">Unhide</button></div></div>`).join('');
}
function openSheet(html,lock){
  $('#sheet').innerHTML='<button class="sheetx" onclick="sheetX()" aria-label="Close">✕</button>'+html;
  $('#modal').classList.add('on');$('#modal').dataset.lock=lock?'1':'';}
// The X answers out loud when it will not close, instead of looking broken.
function sheetX(){if(C&&!C.over){toast('Finish the fight first');return;}closeSheet();}
function closeSheet(){if(C&&!C.over)return;$('#modal').classList.remove('on');}
$('#modal').addEventListener('click',e=>{if(e.target.id==='modal'&&!$('#modal').dataset.lock)closeSheet();});

/* ================= look editor ================= */
function lookSheet(onDone){
  const av=S.av;const own=(slot,key)=>S.cosmetics.includes(slot+':'+key);
  const draw=()=>{
    const sw=(arr,cur,set)=>arr.map((c,i)=>`<button class="swatch${cur===i?' on':''}" style="background:${c}" data-set="${set}" data-v="${i}" aria-label="${set} ${i+1}"></button>`).join('');
    const opt=(arr,cur,set,label)=>arr.map(v=>`<button class="${cur===v?'on':''}" data-set="${set}" data-v="${v}">${label?label(v):v}</button>`).join('');
    const hats=[['',{n:'None',r:'common'}]].concat(Object.entries(ART.HATS));const tops=Object.entries(ART.TOPS);const accs=[['',{n:'None',r:'common'}]].concat(Object.entries(ART.ACCS));
    // Go through openSheet so the look editor gets the universal corner X like
    // every other sheet - writing #sheet directly skipped it.
    openSheet(`<h2>Your look</h2><div style="text-align:center">${ART.avatarSVG(av,120)}</div>
    <div class="section-label">Build</div><div class="opts" style="margin:6px 0 10px">${Object.entries(ART.BUILDS).map(([k,b])=>`<button class="${(av.build||'neutral')===k?'on':''}" data-set="build" data-v="${k}">${b.name}</button>`).join('')}</div>
    <div class="section-label">Skin</div><div class="opts" style="margin:6px 0 10px">${sw(ART.SKINS,av.skin,'skin')}</div>
    <div class="section-label">Hair <span class="help">more in the Boutique</span></div><div class="opts" style="margin:6px 0 10px">${opt(ART.HAIR_STYLES.concat(Object.keys(ART.HAIR_SHOP).filter(k=>own('hair',k))),av.hair,'hair',v=>(ART.HAIR_SHOP[v]||{}).n||v)}</div>
    <div class="section-label">Hair color</div><div class="opts" style="margin:6px 0 10px">${sw(ART.HAIR_COLORS,av.hairColor,'hairColor')}</div>
    <div class="section-label">Facial hair</div><div class="opts" style="margin:6px 0 10px">${Object.entries(ART.BEARDS).map(([k,n])=>`<button class="${(av.beard||'')===k?'on':''}" data-set="beard" data-v="${k}">${n}</button>`).join('')}</div>
    ${av.beard?`<div class="section-label">Facial hair color</div><div class="opts" style="margin:6px 0 10px"><button class="${av.beardColor===undefined?'on':''}" data-set="beardColor" data-v="">Same as hair</button>${sw(ART.HAIR_COLORS,av.beardColor,'beardColor')}</div>`:''}
    <div class="section-label">Eyes</div><div class="opts" style="margin:6px 0 10px">${opt(ART.EYES.concat(Object.keys(ART.EYES_SHOP).filter(k=>own('eyes',k))),av.eyes,'eyes',v=>(ART.EYES_SHOP[v]||{}).n||v)}</div>
    <div class="section-label">Hoodie color</div><div class="opts" style="margin:6px 0 10px">${sw(ART.TOP_COLORS,av.topColor,'topColor')}</div>
    <div class="section-label">Outfit <span class="help">found in the world or bought with steps</span></div><div class="opts" style="margin:6px 0 10px">${tops.map(([k,v])=>`<button class="${av.top===k?'on':''}${k!=='hoodie'&&!own('top',k)?' locked':''}" data-set="top" data-v="${k}"><span class="rc-${v.r}">${v.n}</span></button>`).join('')}</div>
    <div class="section-label">Hat</div><div class="opts" style="margin:6px 0 10px">${hats.map(([k,v])=>`<button class="${(av.hat||'')===k?'on':''}${k&&!own('hat',k)?' locked':''}" data-set="hat" data-v="${k}"><span class="rc-${v.r}">${v.n}</span></button>`).join('')}</div>
    <div class="section-label">Accessory</div><div class="opts" style="margin:6px 0 10px">${accs.map(([k,v])=>`<button class="${(av.acc||'')===k?'on':''}${k&&!own('acc',k)?' locked':''}" data-set="acc" data-v="${k}"><span class="rc-${v.r}">${v.n}</span></button>`).join('')}</div>
    <div class="grid2"><button class="btn" id="lookRandom">Random</button><button class="btn r" id="lookDone">Done</button></div>`,true);
    $('#sheet').querySelectorAll('[data-set]').forEach(b=>b.onclick=()=>{const set=b.dataset.set;let v=b.dataset.v;
      if(b.classList.contains('locked')){toast('Find it in the world first');return;}
      // "Same as hair" is the ABSENCE of a beard colour, not colour zero - +'' is 0,
      // which would silently pin the beard to the first swatch.
      if(set==='beardColor'&&v===''){delete av.beardColor;SFX.play('ui');draw();return;}
      if(['skin','hairColor','topColor','beardColor'].includes(set))v=+v;
      av[set]=v;SFX.play('ui');draw();});
    $('#lookRandom').onclick=()=>{Object.assign(av,ART.randomAv());draw();};
    $('#lookDone').onclick=()=>{save();closeSheet();render();pushPlayer();if(onDone)onDone();};
  };
  draw();$('#modal').classList.add('on');$('#modal').dataset.lock='1';
}

/* ================= onboarding ================= */
function signInSheet(msg){
  const o=O();
  openSheet('<h2>Sign in again</h2>'
    +(msg?'<p style="color:#ff8a92">'+esc(msg)+'</p>':'')
    +'<p>Type your handle and your account key (or your 6-digit PIN if you have one set). Your character on this device is not touched.</p>'
    +'<input id="rsHandle" type="text" maxlength="20" placeholder="handle" value="'+esc(o.handle||'')+'" style="width:100%;margin:6px 0">'
    +'<input id="rsKey" type="text" placeholder="6-digit PIN, or account key" style="width:100%;margin:6px 0 12px;font-size:12px">'
    +'<div class="grid2"><button class="btn ghost" onclick="closeSheet()">Cancel</button>'
    +'<button class="btn r" onclick="signInGo()">Sign in</button></div>',true);
}
async function signInGo(){
  const h=$('#rsHandle').value,k=($('#rsKey').value||'').trim();
  const before=S.onboarded;
  closeSheet();
  if(/^\d{6}$/.test(k))await recoverWithPin(h,k); else await goOnline(h,k);
  if(O().ok){toast('Signed in','z');if(before)renderRecov();}
}
function restoreGo(){const h=$('#rsHandle').value,k=($('#rsKey').value||'').trim();
  if(/^\d{6}$/.test(k))return recoverWithPin(h,k);
  return goOnline(h,k);}
function restoreSheet(){openSheet(`<h2>Restore a save</h2><p>Type the handle you played under and type your <b>6-digit PIN</b> (Base tab, Settings, Recovery code). The long <b>account key</b> works here too if you still have it.</p><input id="rsHandle" type="text" maxlength="20" placeholder="handle, e.g. bel" style="width:100%;margin:6px 0"><input id="rsKey" type="text" placeholder="6-digit PIN, or account key" style="width:100%;margin:6px 0 12px;font-size:12px"><div class="grid2"><button class="btn ghost" onclick="onboard()">Back</button><button class="btn r" onclick="restoreGo()">Find my save</button></div>`,true);}
function onboard(){
  let cls='brawler';let bgSel='farmer';
  const draw=()=>{$('#sheet').innerHTML=`<h2>Hollow County</h2><p>The county fell three weeks ago. Every real step you take is a step down the road: houses to loot, walkers inside them, raiders who want what you carry. Pick a class.</p>
  <div class="starter">${Object.entries(CLASSES).map(([k,c])=>`<button class="${k===cls?'on':''}" data-k="${k}"><span class="av">${c.e}</span><b>${c.n}</b><span class="help">${c.d}</span></button>`).join('')}</div>
  <div class="section-label" style="margin-top:12px">What were you before? <span class="help">a bonus, a gift, and three extra skills</span></div>${bgGrid(bgSel)}
  <label class="section-label" style="display:block;margin-top:12px">Your name</label><input id="obName" type="text" maxlength="18" placeholder="e.g. Celeste" style="margin:6px 0 12px" value="${esc($('#obName')?$('#obName').value:'')}"><button class="btn r wide" id="obGo">Next: your look</button><button class="btn ghost wide" style="margin-top:8px" onclick="restoreSheet()">I already have a character on another phone or browser</button>`;
    $('#sheet').querySelectorAll('.starter button[data-k]').forEach(b=>b.onclick=()=>{cls=b.dataset.k;draw();});$('#sheet').querySelectorAll('[data-bg]').forEach(b=>b.onclick=()=>{bgSel=b.dataset.bg;draw();});
    $('#obGo').onclick=()=>{S.name=($('#obName').value||'Survivor').trim();S.cls=cls;S.sp=1;const k=CLASSES[cls];for(const id of k.kit){const g={uid:uid(),id,...GEAR[id]};S.gear.push(g);S.eq[g.slot]=g.uid;}if(k.ammo)S.stock.ammo=k.ammo;if(k.extra)S.pack.push({id:k.extra,...ITEMS[k.extra],uid:uid()});if(k.cos){S.cosmetics.push(k.cos);S.av.top=k.cos.split(':')[1];}
      S.bg=bgSel;giveBgKit(bgSel);S.onboarded=true;newDistance();log('You left the shelter as a '+k.n.toLowerCase()+' who used to be a '+BACKGROUNDS[bgSel].n.toLowerCase()+'.');save();lookSheet(()=>{render();});};};
  draw();$('#modal').classList.add('on');$('#modal').dataset.lock='1';
}
function giveBgKit(id){if(S.bgKit)return;S.bgKit=true;const k=id;
  if(k==='farmer'){S.stock.food+=3;S.stock.water+=3;}else if(k==='engineer'){S.stock.scrap+=15;}else if(k==='chef'){S.stock.food+=3;if(S.pack.length<capacity())S.pack.push({id:'jerky',...ITEMS.jerky,uid:uid()});}
  else if(k==='firefighter'){const g={uid:uid(),id:'axe',...GEAR.axe};S.gear.push(g);if(!S.eq.melee)S.eq.melee=g.uid;}else if(k==='carpenter'){S.stock.scrap+=20;}else if(k==='mechanic'){const g={uid:uid(),id:'crowbar',...GEAR.crowbar};S.gear.push(g);if(!S.eq.melee)S.eq.melee=g.uid;S.stock.scrap+=10;}else if(k==='gamer'){S.sp+=1;}}
function setBackground(id,first){const old=S.bg;if(!BACKGROUNDS[id])return;if(old&&old!==id){for(const s of SKILLS[old]||[]){S.sp+=sk(s.id);delete S.skills[s.id];}}S.bg=id;if(first){S.sp+=1;giveBgKit(id);}
  S.hp=Math.min(S.hp,maxHp());log('Background: '+BACKGROUNDS[id].n+'.');save();render();pushPlayer();}
function bgGrid(sel){return `<div class="starter">${Object.entries(BACKGROUNDS).map(([k,c])=>`<button class="${k===sel?'on':''}" data-bg="${k}"><span class="av">${c.e}</span><b>${c.n}</b><span class="help">${c.d}</span></button>`).join('')}</div>`;}
function bgSheet(first){let sel=S.bg||'farmer';const draw=()=>{$('#sheet').innerHTML=`<h2>${first?'What were you before?':'Change background'}</h2><p>${first?'Your class is how you fight. Your background is what you did before the county fell: a bonus, a starter gift, and three extra skills. Plus a skill point for choosing.':'Costs 30 scrap. Points spent on your old background come back to you. No new gift.'}</p>${bgGrid(sel)}<button class="btn r wide" style="margin-top:12px" id="bgGo">${first?'That was me':'Change (30 scrap)'}</button>${first?'':'<button class="btn ghost wide" style="margin-top:8px" onclick="closeSheet()">Never mind</button>'}`;
    $('#sheet').querySelectorAll('[data-bg]').forEach(b=>b.onclick=()=>{sel=b.dataset.bg;draw();});
    $('#bgGo').onclick=()=>{if(!first){if(sel===S.bg){closeSheet();return;}if(S.stock.scrap<30){toast('Need 30 scrap');return;}S.stock.scrap-=30;}setBackground(sel,first);closeSheet();toast(BACKGROUNDS[sel].e+' '+BACKGROUNDS[sel].n,'a');};};
  draw();$('#modal').classList.add('on');$('#modal').dataset.lock=first?'1':'';}
function classSheet(){let cls='brawler';const draw=()=>{$('#sheet').innerHTML=`<h2>Pick a class</h2><p>Your save is from before classes existed. Choose one; your skill points are waiting.</p><div class="starter">${Object.entries(CLASSES).map(([k,c])=>`<button class="${k===cls?'on':''}" data-k="${k}"><span class="av">${c.e}</span><b>${c.n}</b><span class="help">${c.d.split('.')[0]}.</span></button>`).join('')}</div><button class="btn r wide" style="margin-top:12px" id="clsGo">Done</button>`;
  $('#sheet').querySelectorAll('.starter button').forEach(b=>b.onclick=()=>{cls=b.dataset.k;draw();});$('#clsGo').onclick=()=>{S.cls=cls;S.sp+=1;if(CLASSES[cls].cos&&!S.cosmetics.includes(CLASSES[cls].cos))S.cosmetics.push(CLASSES[cls].cos);save();closeSheet();lookSheet();};};draw();$('#modal').classList.add('on');$('#modal').dataset.lock='1';}

/* ================= wiring ================= */
function wire(){
  document.querySelectorAll('.nav button').forEach(b=>b.onclick=()=>{SFX.play('ui');if(typeof STREET!=='undefined'&&STREET.on){STREET.on=false;if(STREET.watch!==null){navigator.geolocation.clearWatch(STREET.watch);STREET.watch=null;}clearInterval(STREET.timer);$('#v-street').insertBefore($('#locCard'),$('#raidCard'));}document.querySelectorAll('.nav button').forEach(x=>x.classList.toggle('on',x===b));document.querySelectorAll('.view').forEach(v=>{const on=v.id==='v-'+b.dataset.v;v.classList.toggle('on',on);
      v.classList.remove('tabin');if(on&&!reduced){void v.offsetWidth;v.classList.add('tabin');}});$('#main').scrollTop=0;render();if(b.dataset.v==='street')animate();});
  // Two buttons instead of one, because "5,000" meant "add 5,000" to her and
  // "my total is 5,000" to the code, and nothing on screen said which.
  $('#syncInput').oninput=syncMath;syncMath();
  $('#syncAdd').onclick=()=>{const v=parseInt($('#syncInput').value,10);if(!(v>0)){toast('Type a number first');return;}if(addManual(v)){$('#syncInput').value='';syncMath();}};
  $('#syncSet').onclick=()=>{const v=parseInt($('#syncInput').value,10);if(!(v>=0)){toast('Type a number first');return;}if(setManual(v)){$('#syncInput').value='';syncMath();}};
  $('#pedoBtn').onclick=pedoToggle;$('#clipBtn').onclick=readClipboard;$('#bankBtn').onclick=bank;$('#healBtn').onclick=heal;$('#eatBtn').onclick=eat;$('#dropBtn').onclick=supplyDrop;$('#drinkBtn').onclick=()=>drink();
  $('#lookBtn').onclick=()=>lookSheet();$('#respecBtn').onclick=respec;$('#bgBtn').onclick=()=>bgSheet(false);$('#sfxBtn').onclick=()=>{S.sfx=!S.sfx;save();render();if(S.sfx)SFX.play('ui');};
  $('#demoBtn').onclick=()=>{toast('+300 demo steps','z');addSteps(300,'demo');};$('#shareBtn').onclick=shareCard;
  $('#streetBtn').onclick=streetStart;$('#mapBack').onclick=streetStop;$('#homeBtn').onclick=setHomeHere;$('#refreshPois').onclick=()=>{if(STREET.pos){STREET.lastFetch=null;try{Object.keys(localStorage).filter(k=>k.startsWith('dm.pois.')).forEach(k=>localStorage.removeItem(k));}catch(e){}fetchPois(STREET.pos,true);}else toast('Waiting for GPS first','a');};
  $('#updateBtn').onclick=()=>{toast('Fetching the latest version');applyUpdate();};$('#updateBar').onclick=applyUpdate;
  $('#undoBtn').onclick=undoRestore;$('#resetBtn').onclick=()=>{openSheet('<h2>Reset everything?</h2><p>Base, crew, gear, skills and league history on this device will be gone.</p><div class="grid2"><button class="btn" onclick="closeSheet()">Keep playing</button><button class="btn d" onclick="hardReset()">Reset</button></div>');};
  $('#goalInput').onchange=()=>{const v=parseInt($('#goalInput').value,10);if(v>=1000){S.goal=v;save();render();}};
  $('#nameInput').onchange=()=>{S.name=$('#nameInput').value.trim().slice(0,18);save();render();pushPlayer();};
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){render();fetchWeather();if(O().ok){pullSteps();partySync();}maybeAutoUpdate();checkUpdate();}});
  document.addEventListener('pointerdown',()=>SFX.init(),{once:true});
}
function backupInfo(){try{const b=JSON.parse(localStorage.getItem('deadmiles.backup')||'null');if(b&&b.s&&Date.now()-b.t<7*86400000)return b;}catch(e){}return null;}
function undoRestore(){const b=backupInfo();if(!b)return;if(!confirm('Put back the save from '+ago(b.t)+' ('+(b.s.name||'Survivor')+', level '+(b.s.lvl||1)+', '+fmt((b.s.steps&&b.s.steps.total)||0)+' steps)? The current one becomes the backup instead.'))return;
  try{localStorage.setItem('deadmiles.backup',JSON.stringify({t:Date.now(),why:'before undo',s:S}));}catch(e){}const keep=S.online;S=Object.assign(fresh(),b.s);S.online=(keep&&keep.ok)?keep:(b.s.online||keep);S.combat=false;ensureState();log('Put back the earlier save.');save();render();toast('Earlier save is back','z');pushPlayer();}
function exportSave(){
  try{
    const data=JSON.stringify({game:'dead-miles',v:VERSION,at:Date.now(),save:S},null,0);
    const blob=new Blob([data],{type:'application/json'});
    const name='dead-miles-'+(S.name||'survivor').toLowerCase().replace(/[^a-z0-9]+/g,'-')+'-'+todayStr()+'.json';
    const f=new File([blob],name,{type:'application/json'});
    if(navigator.canShare&&navigator.canShare({files:[f]})){navigator.share({files:[f],title:'Dead Miles save'}).catch(()=>{});return;}
    const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),4000);
    toast('Save file made. Keep it somewhere safe.','a');
  }catch(e){toast('Could not make the file: '+e.message,'d');}
}
function importSave(input){
  const file=input&&input.files&&input.files[0];if(!file)return;
  const r=new FileReader();
  r.onload=()=>{
    let o=null;try{o=JSON.parse(r.result);}catch(e){toast('That file is not a Dead Miles save.','d');return;}
    const s=o&&(o.save||(o.onboarded?o:null));
    if(!s||!s.onboarded){toast('That file does not have a character in it.','d');return;}
    if(!confirm('Load '+(s.name||'Survivor')+', level '+(s.lvl||1)+', '+fmt((s.steps&&s.steps.total)||0)+' lifetime steps? What is on this phone now becomes a restore point.'))return;
    snapshot('before loading a file');
    const keep=S.online;S=Object.assign(fresh(),s);S.online=(keep&&keep.ok)?keep:(s.online||keep);S.combat=false;ensureState();
    S.savedAt=Date.now();log('Loaded a save from a file.');save();render();toast('Save loaded','z');pushPlayer();
  };
  r.readAsText(file);input.value='';
}
function hardReset(){try{if(S&&S.onboarded)localStorage.setItem('deadmiles.backup',JSON.stringify({t:Date.now(),why:'before reset',s:S}));localStorage.removeItem('deadmiles.v3');localStorage.removeItem('deadmiles.v2');}catch(e){}S=fresh();$('#modal').classList.remove('on');render();onboard();}
/* ================= county boss (shared with the party, own loot each) ================= */
const BOSS_FIGHTS_PER_DAY=2;
function bossMembers(){const d=S.party&&S.party.data;return S.party&&S.party.code?Math.max(1,(d&&d.members||[]).length):1;}
function bossMaxHp(){const m=bossMembers();const base=m>1?900+700*m:1400;return Math.round(base*(1+0.15*(S.bossKills||0))*dealMod('bossHp'));}
function bossState(){const w=weekId();if(!S.boss||S.boss.week!==w){S.boss={week:w,hp:bossMaxHp(),max:bossMaxHp(),my:0,killed:false,claimed:false,hits:{},killer:null,srv:false};}
  if(S.bossFightDate!==todayStr()){S.bossFightDate=todayStr();S.bossFightsToday=0;}return S.boss;}
function bossChance(){return Math.min(1,0.06+(0.03+(bg('gamer')?0.01:0)+sk('lore')*0.01)*(S.bossPity||0));}
function bossPhaseHp(){return 110+S.walk.district*35+(S.bossKills||0)*15;}
let PENDING_FIGHT=null;
function runPending(){const f=PENDING_FIGHT;PENDING_FIGHT=null;if(f)f();}
// Her words: "it only shows like four weapons and three armor... we should be
// able to choose like a drop down." She was right twice over - it was not just
// long, it was CAPPED at slice(0,4) and slice(0,3), so anything past the fourth
// weapon could not be equipped from here at all. One line per slot now, and
// every piece you own is in it.
const GEAR_SLOTS=[
  {k:'melee', n:'Weapon',    v:'Bare hands'},
  {k:'ranged',n:'Gun or bow',v:'Nothing ranged'},
  {k:'armor', n:'Armour',    v:'No armour'},
  {k:'head',  n:'Head',      v:'Nothing on your head'},
  {k:'hands', n:'Hands',     v:'Bare hands'},
  {k:'feet',  n:'Feet',      v:'Nothing on your feet'},
  {k:'bag',   n:'Bag',       v:'No bag'},
];
function gearLabel(g){
  const t=temperOf(g);
  const what=g.dmg?`${g.dmg[0]}-${g.dmg[1]} dmg`:(g.dr!==undefined?`-${g.dr} damage`:(g.cap?`+${g.cap} room`:''));
  const dur=(g.dur!==undefined&&repairMax(g))?` · ${g.dur} left`:'';
  return `${g.e} ${g.n}${t?' ('+t.n+')':''}${what?' - '+what:''}${dur}${g.broken?' - WRECKED':''}`;
}
function gearPicker(){
  return GEAR_SLOTS.map(sl=>{
    const mine=(S.gear||[]).filter(x=>x.slot===sl.k);
    if(!mine.length)return '';
    // best first, so the top of the list is the one she probably wants
    mine.sort((x,y)=>(y.broken?-1:1)-(x.broken?-1:1)||gearPower(y)-gearPower(x));
    const cur=S.eq[sl.k]||'';
    return `<label class="gpick"><span>${sl.n}</span>
      <select onchange="pickGear('${sl.k}',this.value)">
        <option value=""${cur?'':' selected'}>${esc(sl.v)}</option>
        ${mine.map(g=>`<option value="${g.uid}"${cur===g.uid?' selected':''}${g.broken?' disabled':''}>${esc(gearLabel(g))}</option>`).join('')}
      </select></label>`;
  }).join('');
}
// equip() toggles, which is wrong for a dropdown - choosing the thing that is
// already on would take it off.
function pickGear(slot,uidv){
  if(!uidv){S.eq[slot]=null;SFX.play('ui');save();render();}
  else if(S.eq[slot]!==uidv)equip(uidv);
  const msg=$('#sheet')&&$('#sheet').querySelector('#gcMsg');
  if(msg){const g=(S.gear||[]).find(x=>x.uid===uidv);
    msg.textContent=g?g.n+' equipped.':'Taken off.';}
}
function gearCheck(then){const w=eqItem('melee');const armor=eqItem('armor')||eqItem('head');const owned=S.gear.filter(x=>x.slot==='melee'&&S.eq.melee!==x.uid);const ownedArmor=S.gear.filter(x=>(x.slot==='armor'||x.slot==='head')&&S.eq[x.slot]!==x.uid);
  if(w&&(armor||!ownedArmor.length)){then();return;}
  // She has already said "fight anyway" for this exact gear situation today.
  const sig=todayStr()+':'+(w?w.id:'none')+':'+(armor?armor.id:'none')+':'+owned.length+':'+ownedArmor.length;
  if(S.gcOk===sig){then();return;}
  S.gcSig=sig;
  PENDING_FIGHT=then;
  const nothing=!w&&!owned.length;
  openSheet(`<h2>${w?'No armor on':'Bare hands'}</h2>`
    +`<p>${w?'You have a weapon but nothing protecting you.':'You have no weapon equipped.'}`
    +`${nothing?' You do not own one yet. Garages, hardware stores and the police station carry them.':''}</p>`
    +gearPicker()
    +`<p class="help" id="gcMsg" style="margin-top:8px"></p>`
    +`<div class="grid2" style="margin-top:10px">`
    +`<button class="btn" onclick="S.gcOk=S.gcSig;save();closeSheet();runPending()">Fight anyway</button>`
    +`<button class="btn r" onclick="closeSheet();runPending()">Go</button></div>`
    +`<button class="btn wide ghost" style="margin-top:8px" onclick="PENDING_FIGHT=null;closeSheet()">Not yet</button>`,true);
}
function fightBoss(){const b=bossState();if(S.loc||S.combat){toast('Finish what you are doing first');return;}if(b.killed){toast(bossName()+' is already down this week');return;}
  if(S.bossFightsToday>=BOSS_FIGHTS_PER_DAY){toast('No boss fights left today. Two a day.');return;}
  if(S.hp<30&&!confirm('You are at '+S.hp+' HP. The boss hits hard. Go anyway?'))return;
  gearCheck(()=>{const b2=bossState();if(b2.killed||S.bossFightsToday>=BOSS_FIGHTS_PER_DAY)return;
  S.bossFightsToday++;const st=strongholdStage(3);const boss=st[1];boss.warden=true;const remaining=Math.max(1,b.hp);boss.hp=boss.max=Math.min(remaining,bossPhaseHp());
  const en=bossMembers()>1?[mk('raider'),boss]:[boss];save();startCombat(en,'boss');});}
function bossAfter(won){if(!C||C.bossDone||C.where!=='boss')return;C.bossDone=true;const boss=C.enemies.find(e=>e.warden);if(!boss)return;const dmg=Math.max(0,boss.max-Math.max(0,boss.hp));const b=bossState();
  if(dmg>0){b.my+=dmg;ctEvent('boss',dmg);}else{S.bossFightsToday=Math.max(0,S.bossFightsToday-1);clog('You never touched the boss. That fight is not counted.','sys');log('Left the boss fight without landing a hit. It did not count.');}
  if(won){S.bossPity=(S.bossPity||0)+1;S.stock.scrap+=4;const list=table(['food','water','meds','scrap','ammo'],0.1,0.2);const it=wpick(list,'w');const item=it.gear?{id:it.id,n:it.n,e:it.e,pts:it.pts,cat:'gear',gear:true,r:it.r}:{id:it.id,n:it.n,e:it.e,pts:it.pts,cat:it.cat,qty:it.qty,uid:uid(),r:it.r};takeItem(item,null);clog('Phase done: +4 scrap, '+it.n+'. Legendary chance now '+Math.round(bossChance()*100)+'%.','good');}
  if(S.party&&S.party.code&&O().ok){bossPost(dmg);}
  else{b.hp=Math.max(0,b.hp-dmg);if(b.hp<=0&&!b.killed){b.killed=true;b.killer='you';bossKill(true);}}
  save();}
async function bossPost(dmg){const o=O();const b=bossState();try{const r=await rpc('boss_hit',{p_handle:o.handle,p_token:o.token,p_code:S.party.code,p_week:weekId(),p_dmg:Math.round(dmg),p_members:bossMembers()});if(r&&!r.error)bossApply(r);else if(r&&r.error)toast('Boss server: '+r.error,'d');}catch(e){toast('Could not reach the boss server. Damage kept locally.','d');b.hp=Math.max(0,b.hp-dmg);}save();renderBoss();}
function bossApply(r){const b=bossState();b.srv=true;b.hp=r.hp;b.max=r.max;b.hits=r.hits||{};b.killer=r.killer||null;const me=O().handle;if(b.hits[me])b.my=Math.max(b.my,b.hits[me]);
  if(b.hp<=0&&!b.killed){b.killed=true;if(b.my>0)bossKill(b.killer===me);else log(bossName()+' went down this week, but you never hit it. No loot.');}}
async function bossSync(){if(!(S.party&&S.party.code&&O().ok))return;const o=O();try{const r=await rpc('boss_hit',{p_handle:o.handle,p_token:o.token,p_code:S.party.code,p_week:weekId(),p_dmg:0,p_members:bossMembers()});if(r&&!r.error){bossApply(r);save();renderBoss();}}catch(e){}}
function bossKill(lastHit){const b=bossState();if(b.claimed)return;b.claimed=true;S.bossKills=(S.bossKills||0)+1;S.bossKilled=weekId();ctEvent('bounty',1);
  const got=[];const chance=bossChance()+(lastHit?0.15:0);let legend=false;
  if(Math.random()<chance){legend=true;const id=pick(LEGEND_IDS);S.gear.push({uid:uid(),id,...GEAR[id]});got.push('LEGENDARY '+GEAR[id].n);S.bossPity=0;SFX.play('legend');}
  else{const pool=Object.entries(GEAR).filter(([k,v])=>v.r==='rare'||v.r==='epic').map(([k,v])=>({id:k,...v,w:v.r==='epic'?4:6}));const it=wpick(pool,'w');S.gear.push({uid:uid(),id:it.id,...GEAR[it.id]});got.push(it.e+' '+it.n);}
  S.keys++;got.push('🗝️ chest key');S.stock.scrap+=12;got.push('12 scrap');if(Math.random()<0.3){const cs=rollCosmetic();takeItem(cs,null);got.push(cs.n);}
  if(lastHit){S.keys++;S.stock.scrap+=10;got.push('last hit: +1 key, +10 scrap');}
  if(Math.random()<0.2&&(S.pets||[]).length<PET_MAX){setTimeout(()=>petJoin(Math.random()<0.5?'dog':'cat','rare'),400);got.push('a stray followed you home');}
  S.league.score+=150;log(bossName()+' is down. Your share: '+got.join(', ')+'.');
  const html=`<h2>${esc(bossName())} is down</h2><div class="big">${legend?'🌟':'💀'}</div><p>${lastHit?'You landed the last hit. ':''}Your share of the loot:<br><b style="color:var(--bone)">${esc(got.join(' · '))}</b></p><p class="help">${legend?'The legendary chance resets to 6%.':'No legendary this time. Every boss phase you fight raises the chance by 3%. Next kill: '+Math.round(bossChance()*100)+'%.'} The next boss has ${Math.round(15*S.bossKills)}% more HP.</p>`;
  if(C&&C.where==='boss'&&!C.summaryShown)C.killHtml=html;else openSheet(html+`<button class="btn r wide" onclick="closeSheet()">Take it</button>`);}
function renderBoss(){const el=$('#bossBody');if(!el)return;const b=bossState();const left=BOSS_FIGHTS_PER_DAY-S.bossFightsToday;const party=S.party&&S.party.code;$('#bossSub').textContent=b.killed?'down this week':(party?'shared with your party':'solo');
  const hits=Object.entries(b.hits||{}).sort((a,c)=>c[1]-a[1]);
  el.innerHTML=`<div class="row"><b style="font-family:'Bebas Neue';font-size:22px;letter-spacing:1px">${esc(bossName())}</b><span class="chip d">HP ${fmt(Math.max(0,b.hp))} / ${fmt(b.max)}</span></div><div class="hpbar2" style="margin:8px 0"><i style="width:${Math.max(0,b.hp)/b.max*100}%"></i></div>
  <div class="row"><span class="chip a">Your damage ${fmt(b.my)}</span><span class="chip s">Legendary chance ${Math.round(bossChance()*100)}%</span><span class="chip">${left} of ${BOSS_FIGHTS_PER_DAY} fights left today</span></div>
  ${hits.length?`<div class="row" style="margin-top:6px">${hits.map(([h,d])=>`<span class="chip">@${esc(h)} ${fmt(d)}</span>`).join('')}</div>`:''}
  <p class="help" style="margin-top:8px">${party?'One health bar for the whole party. Everyone who lands damage gets their own loot roll when it dies; last hit gets extra.':'Join a party under Party and the boss gets bigger but you split the work. '}Each fight is one phase of about ${bossPhaseHp()} HP. Every phase you win raises your legendary chance by 3% until one drops. New boss every Monday${S.bossKills?', '+Math.round(15*S.bossKills)+'% tougher for every one you have killed':''}.</p>
  ${b.killed?`<p class="help">Down. ${b.killer?'Last hit: @'+esc(b.killer)+'. ':''}Back Monday with more HP.</p>`:`<button class="btn r wide" style="margin-top:8px" onclick="fightBoss()">Fight ${esc(bossName())}</button>`}`;}
/* ================= share card ================= */
async function shareCard(){const W=720,H=400;const cv=document.createElement('canvas');cv.width=W;cv.height=H;const x=cv.getContext('2d');
  const gr=x.createLinearGradient(0,0,W,H);gr.addColorStop(0,'#1b1b22');gr.addColorStop(1,'#2a1a1f');x.fillStyle=gr;x.fillRect(0,0,W,H);
  x.fillStyle='#e63e5c';x.fillRect(0,0,W,8);
  const img=ART.spriteImg(ART.avatarSVG(S.av,220,{weapon:eqItem('melee')?'melee':eqItem('ranged')?'gun':''}));await new Promise(r=>{if(img.complete&&img.naturalWidth)r();else{img.onload=r;img.onerror=r;}});
  try{x.drawImage(img,40,90,220,286);}catch(e){}
  if(S.pet){const p=ART.spriteImg(ART.petSVG(S.pet,90,S.petCoat,{still:true}));await new Promise(r=>{if(p.complete&&p.naturalWidth)r();else{p.onload=r;p.onerror=r;}});try{x.drawImage(p,230,290,90,90);}catch(e){}}
  x.fillStyle='#e8e0d0';x.font='bold 40px Georgia,serif';x.fillText('Dead Miles',300,70);x.font='16px system-ui,sans-serif';x.fillStyle='#b9b2a4';x.fillText('Hollow County · '+district().n+' · '+todayStr(),300,96);
  x.fillStyle='#e8e0d0';x.font='bold 26px system-ui,sans-serif';x.fillText((S.name||'Survivor')+' · '+(CLASSES[S.cls]?CLASSES[S.cls].n:'')+' '+S.lvl,300,140);
  const rows=[['🚶 '+fmt(S.steps.today)+' steps today','#7fbf4d'],['🏚️ '+(S.today.places||0)+' places cleared','#e6a530'],['💀 '+(S.today.kills||0)+' hostiles put down','#ff5a6a'],['🔥 streak '+S.streak.days+' day'+(S.streak.days===1?'':'s')+' · best '+(S.streakBest||S.streak.days),'#8fb3c9']];
  x.font='bold 24px system-ui,sans-serif';rows.forEach((r,i)=>{x.fillStyle=r[0];x.fillStyle=r[1];x.fillText(r[0],300,190+i*44);});
  x.fillStyle='#6f6a7a';x.font='14px system-ui,sans-serif';x.fillText('celestenguyenn-design.github.io/dead-miles',300,376);
  const blob=await new Promise(r=>cv.toBlob(r,'image/png'));if(!blob){toast('Could not make the card','d');return;}
  const file=new File([blob],'dead-miles-'+todayStr()+'.png',{type:'image/png'});
  if(navigator.canShare&&navigator.canShare({files:[file]})){try{await navigator.share({files:[file],title:'Dead Miles',text:(S.name||'Survivor')+' walked '+fmt(S.steps.today)+' steps in Hollow County today.'});return;}catch(e){if(e.name==='AbortError')return;}}
  const url=URL.createObjectURL(blob);openSheet(`<h2>Today's card</h2><img src="${url}" style="width:100%;border-radius:8px"><p class="help">Press and hold the picture to save or share it.</p><button class="btn r wide" onclick="closeSheet()">Done</button>`);}
function whileYouWereOut(){
  const last=S.lastOpen||0;const away=Date.now()-last;S.lastOpen=Date.now();
  if(!last||away<4*3600000)return;
  const items=S.journal.filter(j=>j.t>last).map(j=>j.m).slice(0,8);
  const b=board();const rank=b.findIndex(r=>r.me)+1;const lead=b[0].me?null:b[0];
  if(S.lastRank&&rank>S.lastRank&&lead)items.unshift(lead.n+' passed you in the league. You are #'+rank+'.');else if(S.lastRank&&rank<S.lastRank)items.unshift('You climbed to #'+rank+' in the league.');
  S.lastRank=rank;
  const hrs=Math.round(away/3600000);const w=wxLabel();
  const ct=(S.ct.daily||[]).filter(c=>!c.done).length;
  openSheet(`<h2>While you were out</h2><p class="help">${hrs} hours away · ${esc(w)}</p><ul class="journal" style="margin:8px 0 12px">${items.length?items.map(m=>`<li><span>${esc(m)}</span></li>`).join(''):'<li><span>Quiet night. Nothing came over the fence.</span></li>'}</ul><p>${ct?ct+' contract'+(ct>1?'s':'')+' open today. ':''}${S.raidPending?'Raiders are expected today at '+S.raidPending.hour+':00. ':''}${S.base?hordeCountdown()+' ':''}The Wanted boss this week is ${esc(bossName())}.</p><button class="btn r wide" onclick="closeSheet()">Back to the road</button>`);
}
function start(){
  S=load()||fresh();recoverStuckRaid();S.combat=false;ensureState();if(!S.walk.dist)newDistance();if(S.wallet===undefined){S.wallet=S.steps.total||0;}
  wire();render();fetchWeather();
  try{if(navigator.storage&&navigator.storage.persist)navigator.storage.persist().catch(()=>{});}catch(e){}
  // A keyed address is handled before anything else: this copy may be a blank
  // Safari tab that would otherwise try to onboard her instead of delivering.
  stepsBeacon();
  if(!S.onboarded){identBoot().then(found=>{if(!found)onboard();});}else{if(!S.cls)classSheet();else if(!S.bg)bgSheet(true);else{whileYouWereOut();newsCheck();recapCheck();}autoSyncFromUrl();}
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'){LAST_ACTIVE=Date.now();S.lastOpen=Date.now();const bb=board();S.lastRank=bb.findIndex(r=>r.me)+1;save();}else{onResume();}});
  window.addEventListener('pageshow',e=>{if(e.persisted)onResume();});
  window.addEventListener('focus',()=>{if(Date.now()-LAST_ACTIVE>30000)onResume();});
  if(O().ok){identWrite(O().handle,O().token);fetchStepKey();pullSteps();loadFriends();partySync();pushPlayer();bossSync();takeGifts();}
  setInterval(()=>{if(document.visibilityState==='visible'&&!C){render();if(O().ok){pullSteps();partySync();}}},60000);
  setInterval(()=>{if(document.visibilityState==='visible'&&O().ok){loadFriends();pushPlayer();}},180000);
  if('serviceWorker' in navigator){navigator.serviceWorker.register('sw.js').catch(()=>{});}
  checkUpdate();setInterval(checkUpdate,600000);
}
start();
