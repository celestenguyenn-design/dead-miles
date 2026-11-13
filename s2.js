/* ======================================================================
   DEAD MILES - SEASON 2
   Loaded BEFORE game.js. Everything here is a plain function that game.js
   calls at runtime, so nothing at the top level may touch game.js globals.

   What the owner asked for, in her words:
   - "start fresh if it's a new game"
   - walkers (Wing, Tiff) should not race ahead; it should not be too slow for her
   - "I want a game where I can move around, walk, but I'm not stopping"
   - search the houses properly, later
   - Oura: sleep, pickleball, daily walks
   - a shared camp with friends who are not online at the same time
   - gifts, but not "basically anything"
   ====================================================================== */
const SEASON=2;

/* ---------------- 1. FRESH START ----------------
   Any save from before Season 2 is archived (this phone + the cloud keeps its own
   restore points) and replaced by a new character. Kept: name, look, every
   cosmetic, the strays (back to level 1), class and background, online identity. */
const S2_KEEP=['name','av','cosmetics','online','pets','pet','petName','petCoat','petActive','sfx','mapSkin','hidden','rival','created','town','cls','bg','goal','music'];
function seasonize(o){
  if(!o||o.era===SEASON)return o;
  if(!o.onboarded){o.era=SEASON;return o;}
  try{localStorage.setItem('deadmiles.s1',JSON.stringify({t:Date.now(),s:o}));}catch(e){}
  const n=fresh();
  for(const k of S2_KEEP)if(o[k]!==undefined)n[k]=JSON.parse(JSON.stringify(o[k]));
  for(const p of (n.pets||[]))p.xp=0;
  n.petXp=0;
  n.era=SEASON;n.onboarded=true;n.s2Kit=false;n.s2Intro=true;
  n.s1={lvl:o.lvl||1,steps:(o.steps&&o.steps.total)||0,kills:o.kills||0,legend:(o.gear||[]).filter(g=>g.r==='legendary').length};
  return n;
}
// Runs once the new save is live (needs S): the class and background starter kit.
function season2Kit(){
  if(!S||S.era!==SEASON||S.s2Kit)return;S.s2Kit=true;
  const k=CLASSES[S.cls];
  if(k){for(const id of k.kit){const g={uid:uid(),id,...GEAR[id]};S.gear.push(g);if(!S.eq[g.slot])S.eq[g.slot]=g.uid;}if(k.ammo)S.stock.ammo=k.ammo;if(k.extra&&ITEMS[k.extra])S.pack.push({id:k.extra,...ITEMS[k.extra],uid:uid()});S.sp=1;}
  if(S.bg){S.bgKit=false;try{giveBgKit(S.bg);}catch(e){}S.sp=(S.sp||0)+1;}
  try{newDistance();}catch(e){}
  log('Season 2. A new road, the same county.');
}
function season2Intro(){
  if(!S||!S.s2Intro)return false;
  const s1=S.s1||{};
  openSheet(`<h2>Season 2</h2><div class="big">🏮</div>
  <p>Everyone starts over. Your old character is archived, not deleted.</p>
  <div class="kv"><span>Kept</span><b>your name, look, every cosmetic, your strays</b><span>Season 1</span><b>level ${s1.lvl||1} · ${fmt(s1.steps||0)} steps</b></div>
  <h3 style="margin-top:12px">What changed</h3>
  <ul class="journal" style="margin-top:6px">
   <li><b>You never stop walking.</b> Houses you pass are scouted and wait for you. Search them later, from the couch.</li>
   <li><b>Every day counts the same.</b> Your first 7,000 steps count fully, then less, so big walkers cannot run away with it.</li>
   <li><b>Slow grind.</b> Rare things are rare again. Raids and the weekly boss are where the good gear is.</li>
   <li><b>Your ring counts.</b> Morning check-in with your sleep and readiness, and pickleball or any workout trains you.</li>
   <li><b>Shared camp.</b> Your party builds one camp together, whenever each of you walks.</li>
  </ul>
  <button class="btn r wide" style="margin-top:12px" onclick="S.s2Intro=false;save();closeSheet();render();">Start walking</button>`,true);
  return true;
}

/* ---------------- 2. PACING ----------------
   Steps are counted honestly (leaderboard, story, the phone sync) but what they are
   WORTH for progress tapers through the day. 7k = 7k. 15k = 11k. 25k = 12.5k.
   Typed-in steps count half, and only the first 4,000 typed a day count at all. */
const PACE=[[7000,1],[15000,0.5],[Infinity,0.15]];
const TYPED_MAX=4000;
function paceDay(){const t=todayStr();if(!S.pace||S.pace.date!==t)S.pace={date:t,raw:0,typed:0,eff:0,frac:0};return S.pace;}
function effSteps(n,typed){
  const p=paceDay();
  if(typed){const room=Math.max(0,TYPED_MAX-p.typed);const t=Math.min(n,room);p.typed+=n;n=Math.floor(t*0.5);if(!n)return 0;}
  let out=0,left=n,at=p.raw;
  for(const [cap,m] of PACE){if(at>=cap)continue;const take=Math.min(left,cap-at);out+=take*m;at+=take;left-=take;if(left<=0)break;}
  p.raw=at;out+=p.frac||0;const whole=Math.floor(out);p.frac=out-whole;p.eff+=whole;
  S.steps.eff=(S.steps.eff||0)+whole;
  return whole;
}
function paceRate(){const p=paceDay();for(const [cap,m] of PACE)if(p.raw<cap)return m;return PACE[PACE.length-1][1];}
function paceLine(){const p=paceDay();const r=paceRate();
  return 'Worth '+fmt(p.eff)+' today'+(r<1?' · steps now count '+Math.round(r*100)+'%':'')+(p.typed?' · '+fmt(Math.min(p.typed,TYPED_MAX))+' typed counted at half':'');}

/* ---------------- 3. SCOUTING ----------------
   "Dead Miles currently is, you kind of walk and you kind of have to stop to loot
   every house." Now arriving at a place does not stop the walk: the place goes on
   a list and the road keeps going. Search them later, one at a time. */
const SCOUT_MAX=10;
const S2_DIST=1.6;           // houses ~1.6x further apart: about 9 a day at 7k
function scoutList(){if(!S.scout)S.scout=[];return S.scout;}
function scoutOn(){return S&&S.era===SEASON;}
// Called from arrive(). Returns true if the place was scouted (no stop).
function scoutAdd(loc){
  if(!scoutOn()||loc.quest)return false;
  const L=scoutList();
  if(L.length>=scoutMax()){S.stock.scrap+=1;S.scoutOverflow=(S.scoutOverflow||0)+1;return true;}
  loc.scouted=Date.now();loc.district=S.walk.district;loc.id=uid();
  L.push(loc);
  return true;
}
function scoutSearch(id){
  if(S.loc||S.combat){toast('Finish where you are first');return;}
  const L=scoutList();const i=L.findIndex(x=>x.id===id);if(i<0)return;
  S.loc=L[i];L.splice(i,1);S.loc.scoutedVisit=true;
  log('Went back to '+S.loc.n+'.');SFX.play('arrive');save();render();
}
function scoutDrop(id){const L=scoutList();const i=L.findIndex(x=>x.id===id);if(i<0)return;L.splice(i,1);S.stock.scrap+=1;toast('Let it go. +1 scrap from the curb');save();render();}
function renderScout(){
  const el=$('#scoutCard');if(!el)return;
  if(!scoutOn()){el.hidden=true;return;}
  const L=scoutList();el.hidden=false;
  const over=S.scoutOverflow||0;
  el.innerHTML=`<h2>Scouted <span class="sub">${L.length} of ${scoutMax()} waiting</span></h2>
  <p class="help">${L.length?'Places you walked past. Search them whenever you sit down.':'Walk and the places you pass land here. You do not have to stop.'}${over?' The list was full, so you picked '+over+' scrap off the curb instead.':''}</p>
  <div class="stack" style="margin-top:8px">${L.map(x=>`<div class="row" style="align-items:center;gap:8px"><span style="font-size:22px">${x.e}</span><div style="flex:1"><b>${esc(x.n)}</b><br><span class="help">${esc(districtAt(x.district||0).n)} · ${x.rooms.length} rooms${x.stronghold?' · stronghold':''}${x.rival?' · someone is inside':''} · ${ago(x.scouted)}</span></div><button class="btn sm r" onclick="scoutSearch('${x.id}')">Search</button><button class="btn xs ghost" onclick="scoutDrop('${x.id}')" aria-label="Skip">✕</button></div>`).join('')}</div>
  <p class="help" style="margin-top:6px">${esc(paceLine())}</p>`;
}

/* ---------------- 4. MORNING CHECK-IN (Oura) ----------------
   She checks her ring every morning anyway. Type the two numbers (or let the
   Shortcut send them: ?sleep=82&ready=76&workout=60) and the day is set:
     Readiness 85+  Well rested: +15% XP today, +20 HP now
     70-84          Steady: +10 HP now
     under 70       Lay low: you take 25% less damage today (a bad night is not punished)
   Workouts (pickleball, a walk, anything) train you: every 10 minutes is a point,
   up to 9 a day. Training slowly raises max HP and damage. */
function cond(){const t=todayStr();if(!S.cond||S.cond.date!==t)S.cond={date:t,sleep:null,ready:null,tier:'',work:0};return S.cond;}
function condTier(ready,sleep){const v=ready!=null?ready:sleep;if(v==null)return '';return v>=85?'rested':v>=70?'steady':'low';}
const COND_TXT={rested:['😴✨','Well rested','+15% XP today'],steady:['🙂','Steady','a normal day'],low:['🛋️','Lay low','you take 25% less damage today']};
function condSet(sleep,ready,quiet){
  const c=cond();const first=!c.tier;
  if(sleep!=null&&!isNaN(sleep))c.sleep=Math.max(0,Math.min(100,Math.round(sleep)));
  if(ready!=null&&!isNaN(ready))c.ready=Math.max(0,Math.min(100,Math.round(ready)));
  c.tier=condTier(c.ready,c.sleep);
  if(first&&c.tier){const heal=c.tier==='rested'?20:c.tier==='steady'?10:0;if(heal)S.hp=Math.min(maxHp(),S.hp+heal);
    const t=COND_TXT[c.tier];log('Morning check-in: '+t[1]+'. '+t[2]+(heal?', +'+heal+' HP':'')+'.');if(!quiet)toast(t[0]+' '+t[1]+' · '+t[2],'a');}
  save();render();
}
function condWorkout(min,quiet){
  min=Math.round(min||0);if(!(min>0))return;const c=cond();
  const before=Math.floor((c.work||0)/10);c.work=Math.min(90,(c.work||0)+min);const pts=Math.floor(c.work/10)-before;
  if(pts>0){S.train=(S.train||0)+pts;log('Trained '+min+' minutes. +'+pts+' training ('+S.train+' total).');if(!quiet)toast('💪 +'+pts+' training','a');}
  else if(!quiet)toast('Training is capped at 90 minutes a day');
  save();render();
}
function s2XpMult(){return (S&&S.cond&&S.cond.date===todayStr()&&S.cond.tier==='rested')?1.15:1;}
function s2Guard(){return (S&&S.cond&&S.cond.date===todayStr()&&S.cond.tier==='low')?0.75:1;}
function s2HpBonus(){return S?Math.min(40,Math.floor((S.train||0)/5)):0;}
function s2DmgBonus(){return S?Math.min(8,Math.floor((S.train||0)/25)):0;}
function condSheet(){const c=cond();
  openSheet(`<h2>Morning check-in</h2><p>Open your Oura app and copy two numbers. It takes ten seconds.</p>
  <label class="section-label">Sleep score</label><input id="cSleep" type="number" inputmode="numeric" min="0" max="100" placeholder="e.g. 82" value="${c.sleep??''}" style="margin:6px 0">
  <label class="section-label">Readiness score</label><input id="cReady" type="number" inputmode="numeric" min="0" max="100" placeholder="e.g. 76" value="${c.ready??''}" style="margin:6px 0">
  <label class="section-label">Workout minutes today <span class="help">pickleball, a class, a run</span></label><input id="cWork" type="number" inputmode="numeric" min="0" max="300" placeholder="e.g. 60" style="margin:6px 0">
  <p class="help">85+ readiness: well rested, +15% XP. 70-84: steady. Under 70: lay low, you take less damage. Workouts: 10 minutes = 1 training, up to 9 a day.</p>
  <button class="btn r wide" style="margin-top:8px" onclick="condSave()">Save</button>`);}
function condSave(){const n=id=>{const v=parseFloat(($('#'+id)||{}).value);return isNaN(v)?null:v;};
  const s=n('cSleep'),r=n('cReady'),w=n('cWork');closeSheet();
  if(s!=null||r!=null)condSet(s,r);if(w)condWorkout(w);}
function renderCond(){
  const el=$('#condCard');if(!el)return;if(!scoutOn()){el.hidden=true;return;}
  const c=cond();el.hidden=false;const t=COND_TXT[c.tier];
  el.innerHTML=t?`<h2>${t[0]} ${t[1]} <span class="sub">${c.ready!=null?'readiness '+c.ready:''}${c.sleep!=null?' · sleep '+c.sleep:''}</span></h2><p class="help">${t[2]}. Training ${S.train||0}: +${s2HpBonus()} max HP, +${s2DmgBonus()} damage.${c.work?' Worked out '+c.work+' min today.':''}</p><button class="btn xs ghost" style="margin-top:6px" onclick="condSheet()">Log a workout</button>`
   :`<h2>☀️ Morning check-in <span class="sub">from your ring</span></h2><p class="help">Your sleep and readiness set how today goes. Workouts like pickleball train you.</p><button class="btn sm r" style="margin-top:6px" onclick="condSheet()">Check in</button>`;
}
function condFromUrl(){try{
  const q=new URLSearchParams(location.search);const h=new URLSearchParams(location.hash.replace(/^#/,''));
  const g=k=>{const v=q.get(k)!==null?q.get(k):h.get(k);if(v===null)return null;const n=parseFloat(String(v).replace(/[^0-9.]/g,''));return isNaN(n)?null:n;};
  const s=g('sleep'),r=g('ready'),w=g('workout');
  if(s!=null||r!=null)condSet(s,r);if(w)condWorkout(w);
}catch(e){}}

/* ---------------- 5. SHARED CAMP ----------------
   One camp per party, forever (not per week). Everyone's steps go in whenever they
   walk - nobody has to be online together. Projects unlock in order and each one
   gives the whole party a permanent perk. Server: camp_get / camp_add (additive,
   new table, nothing else touched). */
const CAMP_PROJECTS=[
  {k:'fire',  n:'Campfire',      e:'🔥',need:30000,  d:'Everyone heals 5 HP each morning'},
  {k:'tarp',  n:'Rain tarp',     e:'⛺',need:60000,  d:'+1 scouted slot each'},
  {k:'radio', n:'Camp radio',    e:'📻',need:100000, d:'+5% XP for everyone'},
  {k:'garden',n:'Shared garden', e:'🥕',need:160000, d:'+1 food each morning'},
  {k:'watch', n:'Watchtower',    e:'🗼',need:240000, d:'Weekly boss takes +10% damage'},
  {k:'lights',n:'String lights', e:'🏮',need:350000, d:'+1 more scouted slot each'},
  {k:'work',  n:'Workbench',     e:'🛠️',need:500000, d:'Repairs cost 15% less'},
];
const CAMP_SHARE=0.25;   // a quarter of your counted steps go to the camp; you still keep all of them
function campState(){if(!S.camp)S.camp={pend:0,data:null,at:0};return S.camp;}
function campFeed(eff){if(!scoutOn()||!(S.party&&S.party.code))return;const c=campState();c.pend+=eff*CAMP_SHARE;}
function campTotal(){const c=campState();return ((c.data&&c.data.total)||0)+Math.floor(c.pend);}
function campDone(k){let t=campTotal(),acc=0;for(const p of CAMP_PROJECTS){acc+=p.need;if(p.k===k)return t>=acc;}return false;}
async function campSync(){
  if(!scoutOn()||!(S.party&&S.party.code&&O().ok))return;
  const c=campState();const o=O();const add=Math.floor(c.pend);
  try{const r=await rpc(add>0?'camp_add':'camp_get',add>0?{p_handle:o.handle,p_token:o.token,p_code:S.party.code,p_steps:add}:{p_code:S.party.code});
    if(r&&!r.error){c.data=r;if(add>0)c.pend-=add;c.at=Date.now();save();renderCamp();}}catch(e){}
}
function renderCamp(){
  const el=$('#campCard');if(!el)return;if(!scoutOn()){el.hidden=true;return;}el.hidden=false;
  const sendBtn=O().ok?`<button class="btn sm wide" style="margin-top:8px" ${supplyGiftLeft()?'':'disabled'} onclick="supplyGiftSheet()">🎁 Send supplies to a friend${supplyGiftLeft()?'':' · sent today'}</button>`:'';
  if(!(S.party&&S.party.code)){el.innerHTML='<h2>🏕️ Shared camp</h2><p class="help">Join a party (below) and you build a camp together. Everyone adds steps whenever they walk, so nobody has to be online at the same time.</p>'+sendBtn;return;}
  const c=campState();const tot=campTotal();let acc=0,cur=null,curAt=0;
  const rows=CAMP_PROJECTS.map(p=>{const start=acc;acc+=p.need;const done=tot>=acc;if(!done&&!cur){cur=p;curAt=tot-start;}return `<span title="${esc(p.d)}" style="opacity:${done?1:.35};font-size:22px">${p.e}</span>`;}).join(' ');
  const who=(c.data&&c.data.by)||{};
  const names=Object.entries(who).sort((a,b)=>b[1]-a[1]).map(([h,v])=>esc(h)+' '+fmt(v)).join(' · ');
  el.innerHTML=`<h2>🏕️ Shared camp <span class="sub">${fmt(tot)} steps in</span></h2><div style="margin-top:6px">${rows}</div>
  ${cur?`<p style="margin-top:8px"><b>Building: ${cur.e} ${cur.n}</b> · ${esc(cur.d)}</p><div class="xp" style="margin-top:6px"><i style="width:${Math.min(100,curAt/cur.need*100)}%"></i></div><p class="help">${fmt(cur.need-curAt)} steps to go. A quarter of everyone's counted steps go in, and nobody loses any.</p>`:'<p>Every project is built. More are coming.</p>'}
  ${names?`<p class="help" style="margin-top:6px">Who built it: ${names}</p>`:''}${sendBtn}`;
}
// perks
function campMorning(){if(!scoutOn())return;const t=todayStr();if(S.campMorning===t)return;S.campMorning=t;
  if(campDone('fire'))S.hp=Math.min(maxHp(),S.hp+5);if(campDone('garden'))S.stock.food+=1;}
function scoutMax(){return SCOUT_MAX+(campDone('tarp')?1:0)+(campDone('lights')?1:0);}

/* ---------------- 6. SUPPLY GIFTS ----------------
   "Sending things to each other seems good too, but not like how Dead Miles had
   it, where we could send like basically anything." One gift a day, supplies only,
   and a friend can only take 5 gifts a week. */
const GIFT_SUPPLIES=[
  {k:'food', n:'2 food', e:'🥫',q:2},{k:'water',n:'2 water',e:'💧',q:2},
  {k:'meds', n:'1 meds', e:'🩹',q:1},{k:'scrap',n:'5 scrap',e:'🔩',q:5},{k:'ammo',n:'4 ammo',e:'🔫',q:4}];
const GIFT_TAKE_WEEK=5;
function supplyGiftLeft(){return S.sgift===todayStr()?0:1;}
function supplyGiftSheet(){
  const o=O();if(!o.ok){toast('Go online first (Settings)','d');return;}
  const mates=(friends||[]).filter(f=>f.handle&&f.handle!==o.handle&&!(S.hidden||[]).includes(f.handle));
  if(!supplyGiftLeft()){toast('One gift a day. Back tomorrow.');return;}
  if(!mates.length){toast('Nobody on your board yet');return;}
  openSheet(`<h2>Send supplies</h2><p class="help">One gift a day, supplies only. It comes out of your stash.</p>
  <label class="section-label">To</label><select id="sgTo" style="margin:6px 0;width:100%">${mates.map(f=>`<option value="${esc(f.handle)}">${esc(f.name||f.handle)}</option>`).join('')}</select>
  <div class="stack" style="margin-top:6px">${GIFT_SUPPLIES.map(g=>`<button class="btn sm wide" ${(S.stock[g.k]||0)<g.q?'disabled':''} onclick="sendSupply('${g.k}')">${g.e} ${g.n} <span class="help">(you have ${S.stock[g.k]||0})</span></button>`).join('')}</div>
  <input id="giftNote" maxlength="80" placeholder="A note (optional)" style="margin-top:8px">`);
}
async function sendSupply(k){
  const g=GIFT_SUPPLIES.find(x=>x.k===k);const o=O();if(!g||!o.ok)return;
  if(!supplyGiftLeft()||(S.stock[k]||0)<g.q)return;
  const to=$('#sgTo').value;const note=($('#giftNote')&&$('#giftNote').value||'').slice(0,80);
  closeSheet();let r;
  try{r=await rpc('send_gift',{p_handle:o.handle,p_token:o.token,p_to:to,p_item:{supply:k,q:g.q,n:g.n,e:g.e,season:SEASON},p_note:note});}
  catch(e){toast('Could not reach the server. Nothing was sent.','d');return;}
  if(r!=='ok'){toast(r==='full'?'Their gift box is full':'Could not send that','d');return;}
  S.stock[k]-=g.q;S.sgift=todayStr();log('Sent '+g.n+' to @'+to+'.');toast('Sent '+g.e+' '+g.n,'z');save();render();
}
// Called by takeGifts for every incoming row in Season 2. Returns a line, or null if refused.
function receiveSupply(row){
  const it=row.item||{};const wk=weekId();
  if(!S.sgot||S.sgot.week!==wk)S.sgot={week:wk,n:0};
  if(!it.supply||!GIFT_SUPPLIES.some(g=>g.k===it.supply)){S.stock.scrap+=2;return {n:'2 scrap (old-style gift, broken down)',from:row.from};}
  if(S.sgot.n>=GIFT_TAKE_WEEK){S.stock.scrap+=1;return {n:'1 scrap (gift limit reached this week)',from:row.from};}
  const g=GIFT_SUPPLIES.find(x=>x.k===it.supply);S.sgot.n++;S.stock[g.k]=(S.stock[g.k]||0)+g.q;
  return {n:g.e+' '+g.n,from:row.from,note:row.note||''};
}

/* ---------------- 7. MUSIC ----------------
   "If I can change the music that I want." Built-in tracks are generated live in
   the browser (WebAudio), so they are ours outright - fine for a public release.
   "My own song" plays a file from her phone; it is stored on the phone only and
   never uploaded. */
const MUSIC_TRACKS={
  off:{n:'Off'},
  campfire:{n:'Campfire',d:'slow, warm, a guitar by the fire',bpm:68,root:57,scale:[0,2,4,7,9],chords:[[0,4,7],[-3,0,4],[5,9,12],[7,11,14]],wave:'triangle',pad:'sine'},
  rain:{n:'Rainy walk',d:'soft and sleepy, lo-fi',bpm:74,root:55,scale:[0,3,5,7,10],chords:[[0,3,7,10],[5,8,12],[3,7,10],[-2,2,5]],wave:'sine',pad:'triangle',rain:true},
  dusk:{n:'Dusk road',d:'a little eerie, still cute',bpm:84,root:52,scale:[0,2,3,7,8],chords:[[0,3,7],[8,12,15],[5,8,12],[7,10,14]],wave:'square',pad:'sine'},
  own:{n:'My own song',d:'a file from your phone'},
};
const MUSIC={ctx:null,gain:null,timer:null,beat:0,el:null,url:null,noise:null};
function musicPick(){return (S&&S.music)||'off';}
function musicStop(){clearInterval(MUSIC.timer);MUSIC.timer=null;if(MUSIC.el){MUSIC.el.pause();}if(MUSIC.noise){try{MUSIC.noise.stop();}catch(e){}MUSIC.noise=null;}if(MUSIC.gain){try{MUSIC.gain.gain.setTargetAtTime(0,MUSIC.ctx.currentTime,0.3);}catch(e){}}}
function musicNote(t,midi,dur,type,vol){const c=MUSIC.ctx;const o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.value=440*Math.pow(2,(midi-69)/12);
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+0.02);g.gain.exponentialRampToValueAtTime(0.0001,t+dur);o.connect(g);g.connect(MUSIC.gain);o.start(t);o.stop(t+dur+0.05);}
function musicRain(){const c=MUSIC.ctx;const b=c.createBuffer(1,c.sampleRate*2,c.sampleRate);const d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*0.5;
  const s=c.createBufferSource();s.buffer=b;s.loop=true;const f=c.createBiquadFilter();f.type='lowpass';f.frequency.value=1200;const g=c.createGain();g.gain.value=0.05;s.connect(f);f.connect(g);g.connect(MUSIC.gain);s.start();MUSIC.noise=s;}
function musicPlay(){
  musicStop();const k=musicPick();if(k==='off'||document.visibilityState==='hidden')return;
  if(k==='own'){musicOwnPlay();return;}
  const tr=MUSIC_TRACKS[k];if(!tr)return;
  try{if(!MUSIC.ctx){MUSIC.ctx=new (window.AudioContext||window.webkitAudioContext)();MUSIC.gain=MUSIC.ctx.createGain();MUSIC.gain.connect(MUSIC.ctx.destination);}}catch(e){return;}
  const c=MUSIC.ctx;if(c.state==='suspended')c.resume();MUSIC.gain.gain.cancelScheduledValues(c.currentTime);MUSIC.gain.gain.setTargetAtTime(0.35,c.currentTime,0.5);
  if(tr.rain)musicRain();
  const spb=60/tr.bpm;MUSIC.beat=0;let next=c.currentTime+0.1;
  MUSIC.timer=setInterval(()=>{
    while(next<c.currentTime+0.5){
      const bar=Math.floor(MUSIC.beat/8)%tr.chords.length,step=MUSIC.beat%8,ch=tr.chords[bar];
      if(step===0)for(const n of ch)musicNote(next,tr.root+n,spb*8,tr.pad,0.05);
      if(step===0||step===4)musicNote(next,tr.root-12+ch[0],spb*2,'sine',0.09);
      if(Math.random()<(step%2?0.35:0.7)){const deg=tr.scale[Math.floor(Math.random()*tr.scale.length)];musicNote(next,tr.root+12+deg,spb*1.5,tr.wave,tr.wave==='square'?0.018:0.05);}
      MUSIC.beat++;next+=spb/2;}
  },120);
}
function musicDb(mode,fn){return idbOpen().then(db=>new Promise(res=>{try{const tx=db.transaction('kv',mode);const q=fn(tx.objectStore('kv'));if(q){q.onsuccess=()=>res(q.result||null);q.onerror=()=>res(null);}else tx.oncomplete=()=>res(true);}catch(e){res(null);}})).catch(()=>null);}
async function musicOwnPlay(){
  const f=await musicDb('readonly',st=>st.get('song'));if(!f){toast('Pick a song file first (Settings, Music)');return;}
  if(MUSIC.url)URL.revokeObjectURL(MUSIC.url);MUSIC.url=URL.createObjectURL(f.blob||f);
  if(!MUSIC.el){MUSIC.el=new Audio();MUSIC.el.loop=true;}MUSIC.el.src=MUSIC.url;MUSIC.el.volume=0.6;MUSIC.el.play().catch(()=>{});
}
function musicSet(k){if(!MUSIC_TRACKS[k])return;S.music=k;save();musicPlay();renderMusic();}
function musicFile(inp){const f=inp.files&&inp.files[0];if(!f)return;if(f.size>25e6){toast('That file is over 25 MB','d');return;}
  musicDb('readwrite',st=>{st.put({blob:f,name:f.name},'song');}).then(()=>{S.musicName=f.name;musicSet('own');toast('Playing '+f.name,'z');});}
function renderMusic(){const el=$('#musicBox');if(!el)return;const k=musicPick();
  el.innerHTML=Object.entries(MUSIC_TRACKS).map(([id,t])=>`<button class="btn sm${k===id?' r':' ghost'}" style="margin:3px" onclick="musicSet('${id}')" title="${esc(t.d||'')}">${esc(t.n)}</button>`).join('')
   +`<div class="help" style="margin-top:6px">${k==='own'?'Playing '+esc(S.musicName||'your song')+'. ':''}Your own song stays on this phone. <label class="btn xs ghost" style="cursor:pointer">Choose a song file<input type="file" accept="audio/*" hidden onchange="musicFile(this)"></label></div>`;}
document.addEventListener('pointerdown',()=>{if(S&&musicPick()!=='off'&&!MUSIC.timer&&!(MUSIC.el&&!MUSIC.el.paused))musicPlay();});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')musicStop();else if(S&&musicPick()!=='off')musicPlay();});
