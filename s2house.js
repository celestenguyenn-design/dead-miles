/* ======================================================================
   DEAD MILES - SEASON 2 HOUSE SEARCH ("Spooky flat", Style B)
   "Your character is in the house... you go into the room, your character
   follows... takes a little bit of time to loot that cabinet, then it opens
   up and you can see if there's anything you want to pick up."

   A cutaway of the house. Tap a room, then a piece of furniture: your survivor
   walks over, searches (a progress bar), the cabinet opens and you pick what to
   keep. Each spot makes noise; enough noise and the dead come (the same wave
   rules as before). Loot, crew and stray finds all run through game.js.
   Loaded after s2art.js and before game.js. Nothing here runs at load time
   except defining functions and injecting CSS.
   ====================================================================== */
const HV={open:false,room:-1,spot:-1,phase:'house',t0:0,dur:0,sel:[],raf:0,me:{x:195,y:312,flip:false}};
const HVW=390,HVH=344;
const HC={INK:'#11142f',PLUM:'#3d2d61',ORA:'#f07b3c',ORAD:'#c95f2c',CRM:'#f6e3bb',WALL:'#2a1f4a',SHAD:'#1a1336',LIL:'#5a4a86',LILD:'#4a3c70',NAVY:'#262a52',MUTE:'#9d90bf',GRN:'#93a86c',RED:'#e0452e'};

/* ---------- which locations use it ---------- */
function hvEligible(loc){return !!(loc&&scoutOn()&&!loc.stronghold&&!loc.rival&&!loc.geo&&loc.cleared&&loc.rooms&&loc.rooms.length);}
function hvActive(){return HV.open&&hvEligible(S.loc)&&!C;}

/* ---------- furniture per room ---------- */
const HV_SPOTS=[
  [/kitchen|break room/i,[['Pantry','pantry'],['Fridge','fridge',1],['Drawers','drawers']]],
  [/bedroom/i,[['Dresser','drawers'],['Closet','closet'],['Under the bed','bed']]],
  [/bath/i,[['Medicine cabinet','cabinet'],['Tub','tub']]],
  [/garage|tool|engine|shed|dock/i,[['Workbench','bench',1],['Shelves','shelves'],['Toolbox','crate']]],
  [/office|exam|vestry/i,[['Desk','desk'],['Filing cabinet','locker',1]]],
  [/locker|armory|gun/i,[['Lockers','locker',1],['Bench','bench']]],
  [/freezer/i,[['Chest freezer','fridge',1],['Boxes','crate']]],
  [/counter|register|pharmacy|front/i,[['Counter','counter'],['Shelves','shelves']]],
  [/./,[['Shelves','shelves'],['Boxes','crate'],['Counter','counter']]]];
function hvSpotsFor(r){for(const [re,list] of HV_SPOTS)if(re.test(r.n))return list.map(([n,k,loud])=>({n,k,loud:!!loud,items:null,done:false}));return [];}

/* ---------- geometry ---------- */
function hvLayout(loc){
  const n=loc.rooms.length;const floors=n<=2?1:2;
  const up=floors===1?0:Math.floor(n/2),down=n-up;
  const top=floors===1?150:76,mid=floors===1?150:194,bot=312,L=18,Rr=HVW-18;
  const rows=floors===1?[{i0:0,n:down,y0:150,y1:bot}]:[{i0:0,n:up,y0:top,y1:mid-4},{i0:up,n:down,y0:mid,y1:bot}];
  const rooms=[];
  for(const row of rows){const w=(Rr-L)/row.n;for(let k=0;k<row.n;k++){rooms.push({x0:L+k*w,x1:L+(k+1)*w,y0:row.y0,y1:row.y1});}}
  return {rooms,floors,top:floors===1?150:top};
}
function hvSpotX(box,j,n){const w=box.x1-box.x0;return box.x0+w*(n===1?0.5:(0.22+0.56*j/(n-1)));}

/* ---------- drawing ---------- */
const hO=(d,fill,sw=2.6,e='')=>`<path d="${d}" fill="${fill}" stroke="${HC.INK}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round" ${e}/>`;
const hR=(x,y,w,h)=>`M${x},${y} L${x+w},${y} L${x+w},${y+h} L${x},${y+h} Z`;
function hvFurn(k,x,y,open,loud){ // x = centre, y = floor
  const c=open?HC.SHAD:HC.LIL;let s='';
  if(k==='fridge'){s=hO(hR(x-15,y-62,30,62),'#7f8fb5')+hO(hR(x-15,y-62,30,22),'#8e9dc0')+`<path d="M${x+9},${y-56} v10 M${x+9},${y-34} v14" stroke="${HC.INK}" stroke-width="3" stroke-linecap="round"/>`;if(open)s+=hO(hR(x-13,y-38,26,36),HC.SHAD,2);}
  else if(k==='pantry'||k==='closet'||k==='locker'){const w=k==='locker'?24:30,h=k==='closet'?68:60;s=hO(hR(x-w/2,y-h,w,h),k==='locker'?'#6c7aa3':'#6b4f8f');
    if(open)s+=hO(hR(x-w/2+3,y-h+4,w-6,h-8),HC.SHAD,2)+hO(`M${x-w/2},${y-h} L${x-w/2-12},${y-h+6} L${x-w/2-12},${y-6} L${x-w/2},${y} Z`,k==='locker'?'#7d8ab0':'#7d5a9e',2.2)+`<path d="M${x-w/2+4},${y-h*0.5} h${w-8} M${x-w/2+4},${y-h*0.75} h${w-8}" stroke="${HC.LIL}" stroke-width="2"/>`;
    else s+=`<path d="M${x},${y-h} v${h}" stroke="${HC.INK}" stroke-width="2"/><circle cx="${x+4}" cy="${y-h/2}" r="2" fill="${HC.CRM}"/>`+(k==='locker'?`<path d="M${x-8},${y-h+8} h6 M${x-8},${y-h+12} h6" stroke="${HC.INK}" stroke-width="1.6"/>`:'');}
  else if(k==='drawers'||k==='desk'||k==='counter'){const w=k==='counter'?48:40,h=k==='desk'?30:34;s=hO(hR(x-w/2,y-h,w,h),k==='counter'?'#7d5a9e':'#8a6a4a')+hO(hR(x-w/2-3,y-h-4,w+6,5),HC.LILD,2);
    for(let q=0;q<2;q++)s+=hO(hR(x-w/2+4,y-h+4+q*14+(open&&q===0?4:0),w-8,10),open&&q===0?HC.SHAD:'#9b7a58',1.8);}
  else if(k==='bed'){s=hO(hR(x-30,y-22,60,16),'#4d3f78')+hO(hR(x-30,y-30,16,10),HC.CRM,2)+hO(hR(x-32,y-34,4,34),HC.LILD,2)+(open?hO(hR(x-26,y-6,52,6),HC.SHAD,1.6):'');}
  else if(k==='tub'){s=hO(`M${x-26},${y-24} L${x+26},${y-24} L${x+22},${y-4} Q${x},${y+2} ${x-22},${y-4} Z`,'#c9cde0')+`<path d="M${x+20},${y-24} v-12 h-6" stroke="${HC.INK}" stroke-width="3" fill="none"/>`;}
  else if(k==='bench'){s=hO(hR(x-28,y-30,56,7),'#a8794a')+hO(hR(x-25,y-23,4,23),HC.INK,1.6)+hO(hR(x+21,y-23,4,23),HC.INK,1.6)+hO(hR(x-20,y-44,14,14),'#8e93a6',2)+hO(hR(x+2,y-40,18,10),HC.ORAD,2);}
  else if(k==='shelves'){s=hO(hR(x-22,y-64,44,64),'#5b4687');for(let q=1;q<4;q++)s+=`<path d="M${x-22},${y-64+q*16} h44" stroke="${HC.INK}" stroke-width="2.4"/>`;if(!open)s+=hO(hR(x-16,y-60,8,12),HC.ORA,1.6)+hO(hR(x+4,y-44,10,12),HC.CRM,1.6)+hO(hR(x-12,y-28,12,12),'#8e93a6',1.6);}
  else if(k==='cabinet'){s=hO(hR(x-16,y-70,32,30),'#c9cde0')+(open?hO(hR(x-13,y-67,26,24),HC.SHAD,1.8):`<path d="M${x},${y-70} v30" stroke="${HC.INK}" stroke-width="2"/>`)+hO(hR(x-18,y-36,36,36),'#7d5a9e');}
  else {s=hO(hR(x-20,y-28,40,28),'#c9945a')+hO(hR(x-22,y-34,44,7),'#e2b77e')+(open?hO(hR(x-16,y-27,32,6),HC.SHAD,1.4):'');}
  if(loud&&!open)s+=`<text x="${x}" y="${y-74}" text-anchor="middle" font-size="9" font-weight="800" fill="${HC.ORA}" font-family="Inter,sans-serif">LOUD</text>`;
  if(open)s+=`<g opacity=".95"><circle cx="${x+18}" cy="${y-60}" r="8" fill="${HC.GRN}" stroke="${HC.INK}" stroke-width="2"/><path d="M${x+14},${y-60} l3,3 l5,-6" stroke="${HC.INK}" stroke-width="2.2" fill="none" stroke-linecap="round"/></g>`;
  return s;
}
function hvSceneSvg(loc){
  const L=hvLayout(loc);const roofY=L.top-14;
  let s=`<rect width="${HVW}" height="${HVH}" fill="${HC.PLUM}"/>`;
  for(const [x,y] of [[30,30],[70,14],[150,36],[226,20],[372,40],[290,52]])s+=`<circle cx="${x}" cy="${y}" r="1.6" fill="${HC.CRM}" opacity=".8"/>`;
  s+=`<circle cx="330" cy="${Math.max(36,roofY-10)}" r="44" fill="${HC.CRM}"/><circle cx="314" cy="${Math.max(36,roofY-10)-8}" r="7" fill="#ead2a4"/><circle cx="342" cy="${Math.max(36,roofY-10)+12}" r="5" fill="#ead2a4"/>`;
  s+=`<path d="M0,${HVH-30} L0,${roofY+40} L40,${roofY+40} L40,${roofY+24} L66,${roofY+24} L66,${HVH}" fill="${HC.INK}" opacity=".7"/>`;
  // house shell + crooked gable
  s+=hO(`M10,${HVH-26} L10,${roofY} L${HVW/2-20},${roofY-2} L${HVW/2+6},${roofY-30} L${HVW/2+30},${roofY+1} L${HVW-10},${roofY} L${HVW-10},${HVH-26} Z`,HC.WALL,3.2);
  s+=`<circle cx="${HVW/2+6}" cy="${roofY-12}" r="6" fill="${HC.ORA}" stroke="${HC.INK}" stroke-width="2.4"/>`;
  loc.rooms.forEach((r,i)=>{const b=L.rooms[i];const on=HV.room===i;const done=r.done;
    s+=`<g onclick="hvTapRoom(${i})" style="cursor:pointer">`;
    s+=hO(hR(b.x0+3,b.y0,b.x1-b.x0-6,b.y1-b.y0),done?'#2b2148':(on?'#4f3f7c':'#45376f'),2.8);
    // window
    const wx=b.x0+14,wy=b.y0+16;s+=hO(`M${wx},${wy+26} L${wx},${wy+8} Q${wx+9},${wy-4} ${wx+18},${wy+8} L${wx+18},${wy+26} Z`,i%2?HC.INK:HC.ORA,2.2);
    if(i%2===0)s+=`<path d="M${wx+9},${wy+1} v25 M${wx},${wy+16} h18" stroke="${HC.ORAD}" stroke-width="2"/>`;
    // label
    const lab=esc(r.n.toUpperCase());s+=`<rect x="${b.x0+38}" y="${b.y0+8}" width="${Math.min(b.x1-b.x0-44,lab.length*8.1+18)}" height="18" rx="9" fill="${HC.INK}" opacity=".85"/><text x="${b.x0+46}" y="${b.y0+21}" font-family="Inter,sans-serif" font-weight="800" font-size="10.5" letter-spacing=".6" fill="${done?HC.MUTE:HC.CRM}">${lab}${done?' ✓':''}</text>`;
    if(r.sealed&&!done)s+=`<text x="${(b.x0+b.x1)/2}" y="${b.y1-40}" text-anchor="middle" font-size="22">🔒</text>`;
    const sp=(r.s2&&r.s2.spots)||hvSpotsFor(r);
    if(!r.sealed)sp.forEach((p,j)=>{const x=hvSpotX(b,j,sp.length);s+=`<g onclick="event.stopPropagation();hvTapSpot(${i},${j})">${hvFurn(p.k,x,b.y1-2,p.done||done,p.loud)}</g>`;});
    if(done)s+=`<rect x="${b.x0+3}" y="${b.y0}" width="${b.x1-b.x0-6}" height="${b.y1-b.y0}" fill="${HC.INK}" opacity=".35" pointer-events="none"/>`;
    s+=`</g>`;});
  // floors + stoop
  s+=`<path d="M10,${HVH-26} L${HVW-10},${HVH-26}" stroke="${HC.INK}" stroke-width="4"/>`;
  s+=hO(hR(0,HVH-24,HVW,24),HC.SHAD,0);
  return s;
}
function hvMeSvg(){return `<g id="hvMe" style="transform:translate(${HV.me.x}px,${HV.me.y}px);transition:transform .8s ease-in-out"><g id="hvMeFlip" style="transform:scale(${HV.me.flip?-0.4:0.4},0.4);transition:transform .2s"><g class="hvBob">${S2ART.survivor}</g></g></g>`;}
function hvZombieSvg(loc){
  const L=hvLayout(loc);const nz=loc.noise||0;if(nz<35)return '';
  let i=loc.rooms.findIndex((r,k)=>k!==HV.room&&!r.done);if(i<0)i=loc.rooms.findIndex((r,k)=>k!==HV.room);if(i<0)return '';
  const b=L.rooms[i];const x=b.x1-40,y=b.y1-2;
  return `<g style="transform:translate(${x}px,${y}px)"><g class="${nz>=70?'hvShake':'hvSway'}" style="transform:scale(-0.36,0.36)">${S2ART.zombie}</g></g><text x="${x+14}" y="${b.y0+44}" font-family="Inter,sans-serif" font-weight="900" font-size="${nz>=70?20:15}" fill="${nz>=70?HC.RED:HC.CRM}">${nz>=70?'!!':'z z'}</text>`;
}

/* ---------- item icons ---------- */
const HV_ICON={food:'beans',water:'water',meds:'meds',snack:'snack',drink:'drink',scrap:'scrap',ammo:'ammo',gear:'gear',key:'key',chest:'box',shelf:'shelf',cosmetic:'box'};
function hvIcon(it,size){const k=it.gear?'gear':(it.id==='chest'?'box':HV_ICON[it.cat]);const v=k&&S2ART.icons[k];
  if(!v)return `<span style="font-size:${Math.round(size*0.6)}px">${it.e||'❔'}</span>`;
  return `<svg width="${size}" height="${size}" viewBox="-30 -30 60 60">${v}</svg>`;}

/* ---------- flow ---------- */
function hvOpen(){if(!hvEligible(S.loc))return;HV.open=true;HV.room=-1;HV.spot=-1;HV.phase='house';HV.me={x:HVW/2,y:HVH-4,flip:false};hvMount();hvRender();}
function hvClose(){HV.open=false;cancelAnimationFrame(HV.raf);const el=document.getElementById('hv');if(el)el.remove();}
function hvLeave(){hvClose();leaveLoc();}
function hvTapRoom(i){const loc=S.loc;if(!loc||HV.phase==='search')return;const r=loc.rooms[i];
  if(r.done){toast('Already searched');return;}
  searchRoom(i);}       // routes back into hvEnterRoom (searchRoom intercepts), so locks/traps/seals still work
function hvEnterRoom(i){
  const loc=S.loc;const r=loc.rooms[i];if(!r||r.done)return;
  if(r.sealed){breakSeal(i);return;}
  if(!r.s2){
    if(roomTagBefore(i)){if(C||S.combat)hvClose();return;}   // a lock sheet, or something that was not dead
    const tl=roomTagLoot(r);const spots=hvSpotsFor(r);
    spots.forEach(p=>p.items=[]);tl.items.forEach((it,k)=>spots[(k*7+3)%spots.length].items.push(it));
    r.s2={spots,tlNoise:tl.noise};save();
  }
  HV.room=i;HV.phase='room';
  const b=hvLayout(loc).rooms[i];hvWalk((b.x0+b.x1)/2,b.y1-2);hvRender();
}
function hvTapSpot(i,j){if(HV.phase==='search'||HV.phase==='loot')return;
  if(HV.room!==i||!(S.loc.rooms[i].s2)){hvTapRoom(i);if(HV.room!==i)return;}
  const r=S.loc.rooms[i];const p=r.s2.spots[j];if(!p||p.done)return;
  const b=hvLayout(S.loc).rooms[i];const x=hvSpotX(b,j,r.s2.spots.length);
  HV.spot=j;HV.phase='walk';hvRender();
  const side=j<(r.s2.spots.length-1)/2||j===0?1:-1;const sx=Math.max(b.x0+22,Math.min(b.x1-22,x+side*34));
  hvWalk(sx,b.y1-2,()=>{hvFace(side<0);HV.phase='search';HV.t0=performance.now();HV.dur=1300+p.items.length*450+(p.loud?400:0);SFX.play('ui');hvRender();hvTick();});
}
function hvWalk(x,y,done){
  const me=document.getElementById('hvMe'),fl=document.getElementById('hvMeFlip');
  HV.me.flip=x<HV.me.x;const dist=Math.hypot(x-HV.me.x,y-HV.me.y);HV.me.x=x;HV.me.y=y;
  const ms=Math.max(250,Math.min(1100,dist*5));
  if(fl)fl.style.transform=`scale(${HV.me.flip?-0.4:0.4},0.4)`;
  if(me){me.style.transitionDuration=ms+'ms';me.style.transform=`translate(${x}px,${y}px)`;me.classList.add('walking');}
  setTimeout(()=>{if(me)me.classList.remove('walking');if(done)done();},ms+30);
}
function hvFace(left){HV.me.flip=left;const fl=document.getElementById('hvMeFlip');if(fl)fl.style.transform=`scale(${left?-0.4:0.4},0.4)`;}
function hvTick(){cancelAnimationFrame(HV.raf);
  const step=()=>{if(HV.phase!=='search')return;const k=Math.min(1,(performance.now()-HV.t0)/HV.dur);
    const bar=document.getElementById('hvProg');if(bar)bar.style.width=Math.round(k*100)+'%';const pc=document.getElementById('hvPct');if(pc)pc.textContent=Math.round(k*100)+'%';
    if(k>=1){hvFound();return;}HV.raf=requestAnimationFrame(step);};
  HV.raf=requestAnimationFrame(step);}
function hvFound(){
  const loc=S.loc;const r=loc.rooms[HV.room];const p=r.s2.spots[HV.spot];
  // the noise of this spot: its share of the room's noise, louder for loud furniture
  const share=roomNoise(r,r.s2.tlNoise)/r.s2.spots.length*(p.loud?1.6:0.8);
  loc.noise=Math.min(100,Math.round(loc.noise+share));
  SFX.play(p.items.length?'chest':'ui');
  const left=Math.max(0,capacity()-S.pack.length);let free=left;
  HV.sel=p.items.map(it=>{const fits=it.gear||it.cat==='key'||it.cat==='cosmetic'||free>0;if(fits&&!(it.gear||it.cat==='key'||it.cat==='cosmetic'))free--;return fits;});
  HV.phase='loot';save();hvRender();
  if(noiseWave(loc)){p.done=true;hvSpotDone(true);hvClose();}
}
function hvToggle(k){HV.sel[k]=!HV.sel[k];hvRender();}
function hvTake(all){
  const loc=S.loc;const r=loc.rooms[HV.room];const p=r.s2.spots[HV.spot];
  p.items.forEach((it,k)=>{if(all!==false&&HV.sel[k])takeItem(it,loc);});
  p.items=[];p.done=true;hvSpotDone(false);}
function hvSpotDone(wave){
  const loc=S.loc;const r=loc.rooms[HV.room];
  if(r.s2.spots.every(q=>q.done)){roomAfter(loc,r,0,true);HV.phase='house';HV.room=-1;}
  else HV.phase='room';
  HV.spot=-1;save();if(!wave){render();hvRender();}
}

/* ---------- render ---------- */
function hvMount(){
  if(document.getElementById('hv'))return;
  if(!document.getElementById('hvCss')){const st=document.createElement('style');st.id='hvCss';st.textContent=HV_CSS;document.head.appendChild(st);}
  const el=document.createElement('div');el.id='hv';
  el.innerHTML=`<svg width="0" height="0" style="position:absolute"><defs>${S2ART.defs}</defs></svg>
  <div class="hvTop"><div><b id="hvName"></b><span id="hvSub"></span></div><button class="hvX" onclick="hvClose()" aria-label="Back">✕</button></div>
  <div class="hvScene"><svg id="hvHouse" viewBox="0 0 ${HVW} ${HVH}"></svg><svg id="hvActors" viewBox="0 0 ${HVW} ${HVH}"><g id="hvZ"></g>${hvMeSvg()}</svg></div>
  <div class="hvPanel" id="hvPanel"></div>`;
  document.body.appendChild(el);
}
function hvRender(){
  const loc=S.loc;if(!HV.open||!hvEligible(loc)){if(HV.open&&!(S.loc&&S.loc.rooms))hvClose();return;}
  hvMount();
  $('#hvName').textContent=loc.n;
  const nd=loc.rooms.filter(r=>r.done).length;$('#hvSub').textContent=' · '+nd+' of '+loc.rooms.length+' rooms searched';
  $('#hvHouse').innerHTML=hvSceneSvg(loc);$('#hvZ').innerHTML=hvZombieSvg(loc);
  const f=packFill();const nz=loc.noise||0;
  const meters=`<div class="hvMeters"><div class="hvMeter"><div class="hvRow"><span class="hvCap">PACK</span><b>${f.n} / ${f.c}</b></div><div class="hvBar"><i style="width:${Math.round(f.pct*100)}%;background:${f.left<=0?HC.RED:HC.CRM}"></i></div><span class="hvHint">${f.left<=0?'full - new finds stay behind':f.left+' space'+(f.left===1?'':'s')+' left'}</span></div>
    <div class="hvMeter"><div class="hvRow"><span class="hvCap">NOISE</span><span class="hvNoise">${[0,1,2,3,4,5,6].map(k=>`<i style="height:${6+k*3}px;background:${nz>=(k+1)*14?(k>=4?HC.RED:HC.ORA):'#1c1840'}"></i>`).join('')}</span></div><span class="hvHint" style="color:${nz>=70?HC.RED:nz>=40?HC.ORA:HC.MUTE}">${nz>=70?'⚠ the dead are coming':nz>=40?'something is stirring':'quiet'}</span></div></div>`;
  let body='';
  if(HV.phase==='house'){
    body=`<div class="hvKick">${loc.e} ${esc(loc.n)}</div><div class="hvTitle">Pick a room</div><p class="hvP">Tap a room in the house. Your survivor walks in, then tap the furniture to search it.</p>
    <div class="hvChips">${loc.rooms.map((r,i)=>`<button class="hvChip${r.done?' done':''}" ${r.done?'disabled':''} onclick="hvTapRoom(${i})">${esc(r.n)}${r.done?' ✓':r.sealed?' 🔒':''}</button>`).join('')}</div>`;
  }else{
    const r=loc.rooms[HV.room];const sp=r.s2?r.s2.spots:[];const p=sp[HV.spot];
    if(HV.phase==='room'||HV.phase==='walk'){
      body=`<div class="hvKick">${esc(r.n.toUpperCase())}</div><div class="hvTitle">${HV.phase==='walk'&&p?'Walking to the '+esc(p.n.toLowerCase())+'...':'Search something'}</div>
      <div class="hvChips">${sp.map((q,j)=>`<button class="hvChip${q.done?' done':''}${q.loud?' loud':''}" ${q.done?'disabled':''} onclick="hvTapSpot(${HV.room},${j})">${esc(q.n)}${q.loud&&!q.done?' · loud':''}${q.done?' ✓':''}</button>`).join('')}</div>
      <button class="hvBtn ghost" style="margin-top:10px" onclick="HV.phase='house';HV.room=-1;hvRender()">Other rooms</button>`;
    }else if(HV.phase==='search'){
      body=`<div class="hvKick">${esc(r.n.toUpperCase())} · SEARCHING</div><div class="hvRow"><div class="hvTitle">${esc(p.n)}</div><b class="hvPct" id="hvPct">0%</b></div><div class="hvBar big"><i id="hvProg" style="width:0%;background:${HC.ORA}"></i></div>
      <div class="hvSlots">${[0,1,2,3].map(()=>`<div class="hvSlot wait"><svg width="40" height="40" viewBox="-30 -30 60 60">${S2ART.icons.looking}</svg><span>still looking...</span></div>`).join('')}</div>`;
    }else if(HV.phase==='loot'){
      const n=HV.sel.filter(Boolean).length;
      body=`<div class="hvKick">${esc(r.n.toUpperCase())} · ${p.items.length?'FOUND':'EMPTY'}</div><div class="hvTitle">${esc(p.n)}</div>
      ${p.items.length?`<div class="hvSlots">${p.items.map((it,k)=>`<button class="hvSlot${HV.sel[k]?' on':''} r-${it.r||'common'}" onclick="hvToggle(${k})">${HV.sel[k]?'<b class="hvTick">✓</b>':''}${hvIcon(it,44)}<span>${esc(it.n)}</span><small>${it.gear?'gear':it.r&&it.r!=='common'?esc(RAR[it.r].n.toLowerCase()):esc(it.cat||'')}</small></button>`).join('')}</div>`
        :`<p class="hvP">Picked clean. Someone got here first.</p>`}
      <div class="hvBtns"><button class="hvBtn" onclick="hvTake(true)">${p.items.length?(n?'Take '+n+' item'+(n>1?'s':''):'Take nothing'):'Okay'}</button>${p.items.length?`<button class="hvBtn ghost" onclick="hvTake(false)">Leave it</button>`:''}</div>`;
    }
  }
  $('#hvPanel').innerHTML=body+meters+(HV.phase==='search'||HV.phase==='loot'?'':`<button class="hvBtn ghost wide" onclick="hvLeave()">${loc.rooms.every(r=>r.done)?'Done here - keep walking':'Leave the house'}</button>`);
  if(HV.phase==='search'){const bar=$('#hvProg');if(bar){const k=Math.min(1,(performance.now()-HV.t0)/HV.dur);bar.style.width=Math.round(k*100)+'%';}}
}
const HV_CSS=`
#hv{position:fixed;inset:0;z-index:60;background:${HC.INK};color:${HC.CRM};display:flex;flex-direction:column;overflow-y:auto;font-family:Inter,system-ui,sans-serif;max-width:520px;margin:0 auto}
#hv .hvTop{display:flex;align-items:center;justify-content:space-between;padding:calc(env(safe-area-inset-top) + 10px) 14px 8px;background:${HC.PLUM}}
#hv .hvTop b{font-weight:900;letter-spacing:.06em;text-transform:uppercase;font-size:15px}#hv .hvTop span{color:${HC.MUTE};font-size:12px}
#hv .hvX{background:${HC.INK};color:${HC.CRM};border:2px solid ${HC.LIL};border-radius:12px;width:36px;height:36px;font-size:16px}
#hv .hvScene{position:relative;width:100%;aspect-ratio:${HVW}/${HVH};flex:none}
#hv .hvScene svg{position:absolute;inset:0;width:100%;height:100%}#hv #hvActors{pointer-events:none}
#hv .hvBob{animation:hvBob 2.4s ease-in-out infinite}#hv .walking .hvBob{animation:hvStep .32s ease-in-out infinite}
@keyframes hvBob{50%{transform:translateY(-3px)}}@keyframes hvStep{50%{transform:translateY(-9px) rotate(2deg)}}
#hv .hvSway{animation:hvSway 3s ease-in-out infinite}#hv .hvShake{animation:hvShake .25s linear infinite}
@keyframes hvSway{50%{transform:scale(-0.36,0.36) rotate(-3deg)}}@keyframes hvShake{50%{transform:scale(-0.36,0.36) translateX(4px)}}
#hv .hvPanel{flex:1;background:#1c1840;border-top:3px solid ${HC.INK};padding:14px 16px calc(env(safe-area-inset-bottom) + 16px);display:flex;flex-direction:column;gap:10px;box-shadow:0 -6px 0 ${HC.PLUM} inset}
#hv .hvKick{color:${HC.ORA};font-weight:800;font-size:11px;letter-spacing:.14em}
#hv .hvTitle{font-weight:900;font-size:24px;line-height:1.1}#hv .hvP{color:${HC.MUTE};font-size:13px;margin:0}
#hv .hvRow{display:flex;justify-content:space-between;align-items:center;gap:8px}#hv .hvPct{color:${HC.ORA};font-size:22px;font-weight:900}
#hv .hvBar{height:8px;border-radius:5px;background:#1c1840;overflow:hidden}#hv .hvBar.big{height:12px}#hv .hvBar i{display:block;height:100%;border-radius:5px}
#hv .hvChips{display:flex;flex-wrap:wrap;gap:8px}
#hv .hvChip{background:${HC.PLUM};color:${HC.CRM};border:2px solid ${HC.LIL};border-radius:20px;padding:8px 14px;font-weight:800;font-size:14px}
#hv .hvChip.loud{border-color:${HC.ORA};color:${HC.ORA}}#hv .hvChip.done{opacity:.45}
#hv .hvSlots{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
#hv .hvSlot{position:relative;background:${HC.PLUM};border:2px solid ${HC.LIL};border-radius:14px;padding:8px 4px;display:flex;flex-direction:column;align-items:center;gap:2px;color:${HC.CRM};min-height:104px;font-family:inherit}
#hv .hvSlot span{font-weight:800;font-size:12px;text-align:center;line-height:1.15}#hv .hvSlot small{color:${HC.MUTE};font-size:10.5px}
#hv .hvSlot.on{border-color:${HC.ORA};box-shadow:0 0 0 2px ${HC.ORA} inset}#hv .hvSlot.wait{border-style:dashed;opacity:.7}
#hv .hvSlot.r-rare{border-color:#5fa9cc}#hv .hvSlot.r-epic{border-color:#b07ae0}#hv .hvSlot.r-legendary{border-color:#f6c14a}
#hv .hvTick{position:absolute;top:-8px;right:-6px;background:${HC.ORA};color:${HC.INK};border:2px solid ${HC.INK};border-radius:50%;width:22px;height:22px;font-size:13px;line-height:18px}
#hv .hvMeters{display:grid;grid-template-columns:1fr 1fr;gap:8px}
#hv .hvMeter{background:${HC.PLUM};border-radius:14px;padding:10px 12px;display:flex;flex-direction:column;gap:6px}
#hv .hvCap{color:${HC.MUTE};font-weight:800;font-size:11px;letter-spacing:.12em}#hv .hvHint{font-size:12px;font-weight:700;color:${HC.MUTE}}
#hv .hvNoise{display:flex;align-items:flex-end;gap:3px;height:24px}#hv .hvNoise i{display:block;width:6px;border-radius:2px}
#hv .hvBtns{display:grid;grid-template-columns:1.6fr 1fr;gap:10px}
#hv .hvBtn{background:${HC.ORA};color:${HC.INK};border:none;border-radius:16px;padding:14px;font-weight:900;font-size:17px;font-family:inherit}
#hv .hvBtn.ghost{background:transparent;color:${HC.CRM};border:2px solid ${HC.CRM}}#hv .hvBtn.wide{width:100%}
`;
