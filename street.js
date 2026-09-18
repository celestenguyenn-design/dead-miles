/* Dead Miles Street mode: a real map of where you are, real nearby buildings as loot spots.
   Needs Leaflet (index.html loads it) and the game globals from game.js. */
const STREET={on:false,map:null,me:null,accC:null,watch:null,pos:null,pois:[],markers:{},zombies:[],lastFetch:null,timer:0,baseMarker:null,wake:null,err:''};
const POI_KIND={pharmacy:['pharmacy','💊'],police:['police','🚓'],fuel:['gas','⛽'],hospital:['clinic','🏥'],clinic:['clinic','🏥'],doctors:['clinic','🏥'],dentist:['clinic','🏥'],veterinary:['clinic','🏥'],
  fast_food:['diner','🍔'],restaurant:['diner','🍔'],cafe:['diner','☕'],bar:['diner','🍺'],pub:['diner','🍺'],ice_cream:['diner','🍦'],
  supermarket:['grocery','🛒'],convenience:['grocery','🛒'],grocery:['grocery','🛒'],greengrocer:['grocery','🛒'],bakery:['grocery','🥖'],deli:['grocery','🥪'],
  hardware:['hardware','🧰'],doityourself:['hardware','🧰'],sports:['surplus','🎖️'],hunting:['surplus','🎖️'],weapons:['surplus','🎖️'],outdoor:['surplus','🎖️'],
  school:['stronghold','🏴'],park:['stronghold','🏴'],college:['stronghold','🏴']};
const HOUSE_KINDS=['house','residential','apartments','detached','semidetached_house','terrace','yes','bungalow'];
function geoDist(a,b){const R=6371000,dLat=(b.lat-a.lat)*Math.PI/180,dLon=(b.lon-a.lon)*Math.PI/180;const x=Math.sin(dLat/2)**2+Math.cos(a.lat*Math.PI/180)*Math.cos(b.lat*Math.PI/180)*Math.sin(dLon/2)**2;return 2*R*Math.asin(Math.sqrt(x));}
/* ================= ON FOOT ONLY (v6.43) =================
   Her rule: driving to a raid should not count. The whole game is a walking
   game, and a car turns "walk to the corner" into "drive past it".

   Thresholds chosen so that nothing a human does on foot trips it. A fast walk
   is about 1.5 m/s, a hard run 4-5, a bike 5-7. VEHICLE is 9 m/s (32 km/h),
   which nobody reaches without an engine. Below that, play is untouched.

   Being in a car is not a punishment, it is a pause: once you are back under
   walking speed, a short settle and you are playing again. That way a bus ride
   past a raid costs nothing, and driving to one buys you nothing. */
// Her friend was walking and the game told her she was in a car. Two reasons,
// both fixed here.
//
// 1. ONE reading was enough to lock her out for 75 seconds. GPS glitches all the
//    time; a single bad sample should never be believed.
// 2. When the phone does not report its own speed, the fallback differenced two
//    fixes and IGNORED how accurate they were. Walking between tall buildings a
//    fix can jump 60 m with 80 m of uncertainty - that is not travel, it is the
//    phone guessing, and it reads as 30 m/s.
const VEHICLE_MS=9, SETTLE_MS=45000, FAST_HITS=3;
function speedNow(){
  const h=STREET.spd||[];if(h.length<2)return 0;
  const b=h[h.length-1];
  // Measure against the OLDEST fix in the window rather than the previous one.
  // Over one second a car covers ~15 m, which is less than the GPS error, so
  // subtracting the error hid real driving. Over five seconds the distance grows
  // while the uncertainty does not, and a car separates cleanly from a jumpy
  // walk instead of both looking like noise.
  const a=h[0];
  const dt=(b.t-a.t)/1000;if(dt<1)return STREET.lastSpd||0;
  const d=geoDist(a,b);
  const slop=(a.acc||0)+(b.acc||0);
  if(d<=slop)return 0;
  return (d-slop)/dt;
}
function noteSpeed(pos,gps){
  if(!STREET.spd)STREET.spd=[];
  STREET.spd.push({lat:pos.lat,lon:pos.lon,t:Date.now(),acc:pos.acc||20});
  if(STREET.spd.length>6)STREET.spd.shift();
  // Trust the GPS chip's own speed when it gives one - it is far steadier than
  // differencing two fixes, which a jumpy urban position makes look like 30 m/s.
  const measured=(typeof gps==='number'&&gps>=0)?gps:speedNow();
  STREET.lastSpd=measured;
  // Three fast readings in a row before we call it a car. A car stays fast for
  // minutes; a glitch does not.
  STREET.fastRun=(measured>=VEHICLE_MS)?(STREET.fastRun||0)+1:0;
  if(STREET.fastRun>=FAST_HITS)STREET.lastFast=Date.now();
}
function drivingLock(){
  if(!STREET.lastFast)return 0;
  const left=SETTLE_MS-(Date.now()-STREET.lastFast);
  return left>0?Math.ceil(left/1000):0;
}
// One gate, used by everything that is supposed to require being there on foot.
function onFootCheck(what){
  const left=drivingLock();
  if(!left)return true;
  toast('You are moving too fast to '+what+'. On foot in '+left+'s.','d');
  return false;
}
function streetState(){if(!S.street)S.street={looted:{},visits:0};return S.street;}
function reachRadius(){const acc=STREET.pos&&STREET.pos.acc||20;return Math.min(70,Math.max(35,acc+15));}

/* ---------- open / close ---------- */
// Each map skin brings its own tiles (see MAPSKINS). Swapping the layer rather
// than filtering one base is the only way to lose the house numbers - a CSS
// filter can dim a label but it cannot remove it.
function applyTiles(){
  if(!STREET.map||typeof MAPSKINS==='undefined')return;
  const k=(typeof mapSkin==='function')?mapSkin():'bloom';
  if(STREET.tileSkin===k&&STREET.tiles)return;
  const spec=MAPSKINS[k]||MAPSKINS.atlas;
  if(STREET.tiles){try{STREET.map.removeLayer(STREET.tiles);}catch(e){}STREET.tiles=null;}
  STREET.tileSkin=k;
  const layer=L.tileLayer(spec.tiles,{maxZoom:spec.max||19,maxNativeZoom:spec.nat||spec.max||19,
    subdomains:spec.sub||'abc',attribution:spec.attr,className:'dm-tiles'});
  // If the tile host cannot be reached, drop back to the plain street map rather
  // than leaving her looking at an empty grid with no idea why.
  let bad=0;
  layer.on('tileerror',()=>{
    if(k==='atlas'||++bad<8||STREET.tileSkin!==k)return;
    STREET.tileSkin='';
    toast('Those map tiles would not load - using the plain street map','d');
    if(typeof setMapSkin==='function')setMapSkin('atlas');
  });
  STREET.tiles=layer.addTo(STREET.map);
}
function streetStart(){
  if(typeof L==='undefined'){toast('The map library did not load. Check your connection.','d');return;}
  if(!navigator.geolocation){toast('This browser has no location access.','d');return;}
  STREET.on=true;
  document.querySelectorAll('.view').forEach(v=>v.classList.toggle('on',v.id==='v-map'));document.querySelectorAll('.nav button').forEach(x=>x.classList.remove('on'));
  $('#v-map').appendChild($('#locCard'));
  if(!STREET.map){
    STREET.map=L.map('map',{zoomControl:false,attributionControl:true}).setView([40.71,-74.0],17);
    applyTiles();
    // In Bloom every pin bobs forever and carries three shadow layers. While you
    // drag or pinch, Leaflet is transforming the whole pane underneath 44 of
    // them, and the browser has to keep repainting each one. Freeze the motion
    // for the length of the gesture - it looks identical when the map is still,
    // which is the only time you can see a 2px bob anyway.
    const moving=(on)=>{const m=$('#v-map');if(m)m.classList.toggle('moving',on);};
    STREET.map.on('movestart zoomstart dragstart',()=>moving(true));
    STREET.map.on('moveend zoomend',()=>moving(false));
  }
  setTimeout(()=>{STREET.map.invalidateSize();if(STREET.pos)STREET.map.setView([STREET.pos.lat,STREET.pos.lon],17);},50);
  try{applyMapSkin();renderMapSkin();}catch(e){}
  $('#mapStatus').textContent=STREET.pos?STREET.pois.length+' places nearby':'Finding you...';
  if(navigator.wakeLock)navigator.wakeLock.request('screen').then(w=>STREET.wake=w).catch(()=>{});
  STREET.watch=navigator.geolocation.watchPosition(onPos,e=>{STREET.err=e.message;$('#mapStatus').textContent=e.code===1?'Location is blocked. Allow it for this site in Settings > Safari > Location (or the site settings) and reopen.':'Waiting for GPS: '+e.message;},{enableHighAccuracy:true,maximumAge:5000,timeout:20000});
  STREET.timer=setInterval(zombieTick,4000);
  STREET.lockTimer=setInterval(()=>{if(STREET.on&&drivingLock())renderStreet();},2000);
  render();
}
function streetStop(){
  STREET.on=false;if(STREET.watch!==null){navigator.geolocation.clearWatch(STREET.watch);STREET.watch=null;}
  clearInterval(STREET.timer);clearInterval(STREET.lockTimer);if(STREET.wake){try{STREET.wake.release();}catch(e){}STREET.wake=null;}
  $('#v-street').insertBefore($('#locCard'),$('#raidCard'));
  document.querySelectorAll('.view').forEach(v=>v.classList.toggle('on',v.id==='v-street'));document.querySelectorAll('.nav button').forEach(x=>x.classList.toggle('on',x.dataset.v==='street'));
  render();
}

/* ---------- position ---------- */
function onPos(p){
  const pos={lat:p.coords.latitude,lon:p.coords.longitude,acc:p.coords.accuracy||20};const first=!STREET.pos;
  noteSpeed(pos,p.coords.speed);STREET.pos=pos;
  if(!STREET.me){STREET.me=L.marker([pos.lat,pos.lon],{icon:L.divIcon({className:'me-icon',html:ART.avatarSVG(S.av,44),iconSize:[44,57],iconAnchor:[22,54]}),zIndexOffset:1000}).addTo(STREET.map);
    STREET.accC=L.circle([pos.lat,pos.lon],{radius:pos.acc,color:'#8fb3c9',weight:1,fillOpacity:.08}).addTo(STREET.map);}
  else{STREET.me.setLatLng([pos.lat,pos.lon]);STREET.accC.setLatLng([pos.lat,pos.lon]).setRadius(pos.acc);}
  if(first){STREET.map.setView([pos.lat,pos.lon],17);spawnZombies(true);}
  if(!STREET.lastFetch||geoDist(STREET.lastFetch,pos)>250)fetchPois(pos);else if(STREET.pois.length)$('#mapStatus').textContent=STREET.pois.length+' places nearby';
  drawBase();updateMarkers();renderStreet();
}

/* ---------- places from OpenStreetMap ---------- */
async function fetchPois(pos,force){
  STREET.lastFetch=pos;const cell=(Math.round(pos.lat/0.004)*0.004).toFixed(3)+','+(Math.round(pos.lon/0.004)*0.004).toFixed(3);
  if(force)try{localStorage.removeItem('dm.pois.'+cell);}catch(e){}
  else try{const c=JSON.parse(localStorage.getItem('dm.pois.'+cell)||'null');
    if(c&&c.pois&&c.pois.length&&Date.now()-c.t<7*86400000){STREET.pois=c.pois;updateMarkers();$('#mapStatus').textContent=STREET.pois.length+' places nearby';return;}}catch(e){}
  $('#mapStatus').textContent='Looking up the buildings around you...';

  /* Two separate requests, not one.
     The old query asked for shops AND parks AND every building in one statement.
     In a dense city block the building half alone is hundreds of ways, so the
     whole thing hit Overpass's 25s ceiling and came back with NOTHING - killing
     the shop results too, which would have taken milliseconds on their own.
     Split, they fail independently: a slow building lookup can no longer wipe
     out the pharmacy across the road.

     The building filter is also a blacklist now instead of a whitelist. It used
     to name eight values, and anything a city tagged differently - commercial,
     retail, mixed-use, the row houses of Brooklyn - simply did not exist. Any
     building is somewhere to loot; only the ones you cannot walk into are cut. */
  const around=(r,body)=>`[out:json][timeout:60];(${body});out center 120;`;
  const bizQ=around(0,
    `nwr(around:350,${pos.lat},${pos.lon})[amenity~"^(pharmacy|police|fuel|hospital|clinic|doctors|dentist|veterinary|fast_food|restaurant|cafe|bar|pub|ice_cream|school|college)$"];`
   +`nwr(around:350,${pos.lat},${pos.lon})[shop];`
   +`nwr(around:400,${pos.lat},${pos.lon})[leisure=park]`);
  const bldQ=`[out:json][timeout:60];(way(around:200,${pos.lat},${pos.lon})[building];);out center 120;`;

  const MIRRORS=['https://overpass-api.de/api/interpreter','https://overpass.kumi.systems/api/interpreter'];
  const ask=async(q)=>{
    let lastErr=null;
    for(const url of MIRRORS){
      try{
        const r=await fetch(url,{method:'POST',body:'data='+encodeURIComponent(q),headers:{'Content-Type':'application/x-www-form-urlencoded'}});
        if(!r.ok){lastErr=new Error('server said '+r.status);continue;}
        const got=await r.json();
        if(got&&(got.elements||[]).length)return {els:got.elements};
        lastErr=lastErr||new Error('empty');
      }catch(e){lastErr=e;}
    }
    return {els:[],err:lastErr};
  };

  const [biz,bld]=await Promise.all([ask(bizQ),ask(bldQ)]);
  const SKIP_BUILDING=['no','roof','carport','shed','garage','garages','bridge','construction','ruins','greenhouse','silo','tank','bunker'];
  const pois=[];
  const add=(el,forceHouse)=>{
    const lat=el.lat||(el.center&&el.center.lat),lon=el.lon||(el.center&&el.center.lon);
    if(lat==null)return;const tg=el.tags||{};
    let kind=POI_KIND[tg.amenity]||POI_KIND[tg.shop]||(tg.leisure==='park'?POI_KIND.park:null);
    let housey=false;
    if(!kind){
      if(!forceHouse||!tg.building||SKIP_BUILDING.includes(tg.building))return;
      const apt=tg.building==='apartments'||tg.building==='residential';
      kind=['house',apt?'🏢':'🏠'];housey=true;
    }
    const addr=tg['addr:housenumber']&&tg['addr:street']?tg['addr:housenumber']+' '+tg['addr:street']:'';
    const name=tg.name||tg.brand||addr||(housey?(tg.building==='apartments'?'Apartment building':'House'):kind[0]);
    pois.push({id:el.type+'/'+el.id,lat,lon,t:kind[0],e:kind[1],n:String(name).slice(0,40),house:housey});
  };
  for(const el of biz.els)add(el,false);
  const seen=new Set(pois.map(x=>x.id));
  for(const el of bld.els){if(!seen.has(el.type+'/'+el.id))add(el,true);}

  const shops=pois.filter(p=>!p.house);
  const houses=pois.filter(p=>p.house).sort((a,b)=>geoDist(a,pos)-geoDist(b,pos)).slice(0,40);
  STREET.pois=shops.concat(houses);

  if(STREET.pois.length){
    try{localStorage.setItem('dm.pois.'+cell,JSON.stringify({t:Date.now(),pois:STREET.pois}));}catch(e){}
    $('#mapStatus').textContent=STREET.pois.length+' places nearby ('+shops.length+' shops, '+houses.length+' buildings)';
  }else{
    STREET.lastFetch=null;                     // retry on the next GPS ping
    // Say what actually went wrong. "Found nothing" was the same message whether
    // the server was down, rate-limited, or the area is genuinely bare.
    const why=(biz.err&&biz.err.message)||(bld.err&&bld.err.message)||'empty';
    $('#mapStatus').textContent=why==='empty'
      ? 'Both map servers answered with nothing. They are probably busy - tap Refresh places in a minute.'
      : 'The map servers would not answer ('+why+'). Tap Refresh places in a minute.';
  }
  updateMarkers();renderStreet();
}
function poiState(p){const st=streetState();const t=st.looted[p.id];if(t&&Date.now()-t<24*3600000)return 'looted';if(!STREET.pos)return 'far';return geoDist(p,STREET.pos)<=reachRadius()?'near':'far';}
let RAID_WIN_SEEN=-1;
function updateMarkers(){
  if(!STREET.map)return;const seen=new Set();
  // a new two-hour window means every marker is potentially a different thing
  const w=raidWindow();
  if(w!==RAID_WIN_SEEN){RAID_WIN_SEEN=w;for(const k in STREET.markers){STREET.map.removeLayer(STREET.markers[k]);delete STREET.markers[k];}}
  for(const p of STREET.pois){seen.add(p.id);const st=poiState(p);const rd=raidAt(p);
    const rdone=rd&&(S.raidsDone||{})[rd.id];
    const html=rd
      ? `<div class="poi ${st} raid t${rd.tier}${rdone?' rdone':''}" style="--rc:${rdone?'#6b6b74':rd.T.col}"><span>${rd.T.e}</span><b>${rdone?'✓':rd.tier}</b></div>`
      : `<div class="poi ${st}${p.t==='stronghold'?' sh':''}"><span>${p.e}</span></div>`;
    const had=STREET.markers[p.id];
    if(!had){const m=L.marker([p.lat,p.lon],{icon:L.divIcon({className:'poi-wrap',html,iconSize:[34,34],iconAnchor:[17,17]})}).addTo(STREET.map);m.on('click',()=>{const rr=raidAt(p);if(rr)openRaid(p.id);else tapPoi(p.id);});m._dmHtml=html;STREET.markers[p.id]=m;}
    // setIcon THROWS AWAY the element and builds a new one. This ran on every pin
    // on every GPS ping - 44 rebuilds a second while walking, for pins that had
    // not changed - and each new element restarts its bob animation, which is
    // what the stutter actually was. Only redraw a pin when its html differs.
    else if(had._dmHtml!==html){had.setIcon(L.divIcon({className:'poi-wrap',html,iconSize:[34,34],iconAnchor:[17,17]}));had._dmHtml=html;}}
  for(const id of Object.keys(STREET.markers)){if(!seen.has(id)){STREET.map.removeLayer(STREET.markers[id]);delete STREET.markers[id];}}
}
function drawBase(){if(!S.base||!S.base.geo||!STREET.map)return;if(!STREET.baseMarker){STREET.baseMarker=L.marker([S.base.geo.lat,S.base.geo.lon],{icon:L.divIcon({className:'poi-wrap',html:'<div class="poi base"><span>🏚️</span></div>',iconSize:[40,40],iconAnchor:[20,20]})}).addTo(STREET.map);}else STREET.baseMarker.setLatLng([S.base.geo.lat,S.base.geo.lon]);}

/* ---------- looting a real place ---------- */
function tapPoi(id){
  const p=STREET.pois.find(x=>x.id===id);if(!p)return;const st=poiState(p);
  if(S.loc&&S.loc.geo!==id){toast('Finish or leave '+S.loc.n+' first');return;}
  if(st==='looted'){const t=streetState().looted[id];const h=Math.ceil((24*3600000-(Date.now()-t))/3600000);toast(p.n+' is picked clean. Resets in '+h+'h');return;}
  if(st==='far'){toast(p.n+': walk closer ('+Math.round(geoDist(p,STREET.pos))+' m)');return;}
  if(!onFootCheck('search a place'))return;   // looting from a moving car does not count
  if(S.loc&&S.loc.geo===id){$('#locCard').scrollIntoView({behavior:'smooth'});return;}
  const loc=makeLoc(p.t,p.n);loc.geo=id;loc.e=p.e;S.loc=loc;streetState().visits++;
  log('Reached '+p.n+' (on your street).');SFX.play('arrive');save();render();$('#locCard').scrollIntoView({behavior:'smooth'});
}
function setHomeHere(){
  if(!STREET.pos){toast('Waiting for GPS');return;}
  if(S.base&&S.base.geo&&S.stock.scrap<20){toast('Moving home costs 20 scrap');return;}
  if(S.base&&S.base.geo)S.stock.scrap-=20;
  if(!S.base)S.base={t:'house',e:'🏠',n:'Home',district:district().n,rooms:{},claimed:Date.now()};
  S.base.geo={lat:STREET.pos.lat,lon:STREET.pos.lon};S.base.n=S.base.n||'Home';
  log('Home is set to where you are standing. Stash by walking back here.');toast('Home set. Walk back here to stash.','a');SFX.play('win');save();drawBase();render();pushPlayer();
}
function homeDistance(){if(!S.base||!S.base.geo||!STREET.pos)return null;return geoDist(S.base.geo,STREET.pos);}

/* ---------- zombies on the street ---------- */
function spawnZombies(reset){
  if(!STREET.pos)return;if(reset)STREET.zombies.forEach(z=>STREET.map.removeLayer(z.m));if(reset)STREET.zombies=[];
  const want=(isNight()?5:3)-STREET.zombies.length;
  for(let i=0;i<want;i++){const a=Math.random()*Math.PI*2,d=70+Math.random()*110;const lat=STREET.pos.lat+Math.cos(a)*d/111320,lon=STREET.pos.lon+Math.sin(a)*d/(111320*Math.cos(STREET.pos.lat*Math.PI/180));
    const k=Math.random()<0.7?'walker':'runner';const m=L.marker([lat,lon],{icon:L.divIcon({className:'z-icon',html:ART.zombieSVG(k,34),iconSize:[34,44],iconAnchor:[17,40]})}).addTo(STREET.map);
    STREET.zombies.push({lat,lon,k,m});}
}
function zombieTick(){
  if(!STREET.on||!STREET.pos||S.combat||S.loc)return;
  if(STREET.zombies.length<(isNight()?5:3)&&Math.random()<0.15)spawnZombies(false);
  for(const z of STREET.zombies){const d=geoDist(z,STREET.pos);const step=z.k==='runner'?3:1.6;if(d>1){z.lat+=(STREET.pos.lat-z.lat)/d*step;z.lon+=(STREET.pos.lon-z.lon)/d*step;z.m.setLatLng([z.lat,z.lon]);}
    if(d<=14){STREET.map.removeLayer(z.m);STREET.zombies=STREET.zombies.filter(x=>x!==z);toast('A '+z.k+' got to you','d');startCombat([mk(z.k)],'road');break;}}
}
function renderRaidList(){
  const el=$('#raidList');if(!el)return;
  const rs=liveRaids();
  if(!rs.length){el.hidden=true;return;}
  el.hidden=false;
  // nearest playable first: in reach, then by tier, then by what is closest
  rs.sort((a,b)=>{
    const an=raidNear(a)?0:1,bn=raidNear(b)?0:1;
    const ad=(S.raidsDone||{})[a.id]?1:0,bd=(S.raidsDone||{})[b.id]?1:0;
    return ad-bd||an-bn||b.tier-a.tier;
  });
  const inReach=rs.filter(r=>raidNear(r)&&!(S.raidsDone||{})[r.id]).length;
  el.innerHTML='<h2>Live raids <span class="sub">'+(inReach?inReach+' in reach':rs.length+' nearby')+'</span></h2>'
    +'<p class="help">Two hours each. Everyone standing at the same place fights the same one.</p>'
    +rs.slice(0,6).map(r=>{
      const near=raidNear(r),done=(S.raidsDone||{})[r.id];
      const mins=Math.max(0,Math.round((r.endsAt-Date.now())/60000));
      const left=mins>=60?Math.floor(mins/60)+'h '+(mins%60)+'m':mins+' min';
      const tag=done?['done','Cleared']:near?['near','Fight']:['far','Walk closer'];
      return '<button class="raidrow'+(done?' rdone':'')+'" style="--rc:'+(done?'#6b6b74':r.T.col)+'" onclick="openRaid(\''+esc(r.poi)+'\')">'
        +'<span class="tb"><span class="e">'+r.T.e+'</span><span class="t">T'+r.tier+'</span></span>'
        +'<span class="mid"><b>'+esc(r.T.n)+'</b>'
          +'<span class="where">'+esc(r.n)+'</span>'
          +'<span class="when">'+left+' left</span></span>'
        +'<span class="go '+tag[0]+'">'+tag[1]+'</span>'
      +'</button>';}).join('');
}

function renderStreet(){
  if(!STREET.on)return;const hd=homeDistance();
  try{renderRaidList();}catch(e){}
  const el=$('#mapInfo');if(!el)return;
  const near=STREET.pois.filter(p=>poiState(p)==='near').length;
  const lootedNear=STREET.pois.filter(p=>poiState(p)==='looted').length;
  const lock=drivingLock();
  // "Nothing to loot" has several causes and they need different actions, and
  // being locked out for speed must never look like one of them.
  const nearTxt=lock?'🚗 in a vehicle · on foot in '+lock+'s'
    :near?near+' within reach'
    :!STREET.pois.length?'no places found here'
    :lootedNear?'all cleared - they come back tomorrow'
    :'walk toward a marker';
  const sp=STREET.lastSpd||0;
  el.innerHTML=`<span class="chip s">GPS ±${STREET.pos?Math.round(STREET.pos.acc):'?'} m${sp>1.2?' · '+(sp*3.6).toFixed(0)+' km/h':''}</span>`
    +`<span class="chip${(lock||!near)?' d':''}" id="mapNear">${nearTxt}</span>`
    +`${hd!==null?`<span class="chip a">Home ${Math.round(hd)} m</span>`:'<span class="chip">No home set</span>'}`
    +`<span class="chip d">${STREET.zombies.length} on the street</span>`;
}

/* ================= LIVE RAIDS (v6.21) =================
   A raid is a real place, for two hours, that everyone sees the same way.
   Nothing schedules them: tier and boss are hashed from (place id + time
   window), so two people standing at the same corner in the same window get
   the same raid without the server being asked anything. The shared HP bar
   rides on boss_hit, which already takes an arbitrary code - so live raids
   needed no new SQL at all. */
const RAID_WINDOW=2*3600000;                 // a raid lives two hours
const RAID_TIERS=[
  {t:1,n:'Stray pack',    e:'🧟', hp:1,  dmg:0.9, loot:1,   col:'#7fbf4d'},
  {t:2,n:'Nest',          e:'🧟‍♂️',hp:2, dmg:1.1, loot:1.6, col:'#8fb3c9'},
  {t:3,n:'Swarm',         e:'☣️', hp:3,  dmg:1.35,loot:2.4, col:'#e6a530'},
  {t:4,n:'Bloated horror',e:'💀', hp:4,  dmg:1.6, loot:3.4, col:'#d0602e'},
  {t:5,n:'The Tall One',  e:'👹', hp:6,  dmg:2.0, loot:5,   col:'#c22b3a'},
];
const RAID_NAMES=['Crawler','Husk','Screamer','Bruiser','Shambler','Wretch','Gorger','Pale Thing','Hollow Man','The Quiet'];
// hash() is fine for picking one of a handful of things, but its low bits are
// not uniform mod 100: the first cut of this put tier 5 at 0.3% instead of 5%,
// so the best raid in the game would effectively never appear. One murmur-style
// avalanche before the modulo fixes the spread.
function rhash(str){
  let h=Math.abs(hash(str))|0;
  h^=h>>>13; h=Math.imul(h,0x5bd1e995); h^=h>>>15; h=Math.imul(h,0x27d4eb2d); h^=h>>>16;
  return (h>>>0);
}
function raidWindow(t){return Math.floor((t||Date.now())/RAID_WINDOW);}
function raidId(poiId,w){return 'r:'+poiId+':'+(w===undefined?raidWindow():w);}
// ~1 in 7 places hosts a raid in a given window; the rare tiers stay rare.
function raidAt(p,w){
  w=(w===undefined)?raidWindow():w;
  if(rhash(p.id+'|'+w+'|raid')%100>=15)return null;
  const roll=rhash(p.id+'|'+w+'|tier')%100;
  const tier=roll<35?1:roll<63?2:roll<83?3:roll<95?4:5;
  const T=RAID_TIERS[tier-1];
  return {id:raidId(p.id,w),poi:p.id,n:p.n,w,tier,T,
    boss:RAID_NAMES[rhash(p.id+'|'+w+'|name')%RAID_NAMES.length]+' of '+p.n,
    endsAt:(w+1)*RAID_WINDOW};
}
function liveRaids(){
  if(!STREET.on||!STREET.pois.length)return [];
  return STREET.pois.map(p=>raidAt(p)).filter(Boolean);
}
function raidNear(r){const p=STREET.pois.find(x=>x.id===r.poi);return p&&STREET.pos?geoDist(p,STREET.pos)<=reachRadius()*2:false;}

let RAID_STATE=null;                          // last known shared HP for the open raid
async function raidSync(r,dmg){
  const o=O();if(!o.ok)return null;
  try{const res=await rpc('boss_hit',{p_handle:o.handle,p_token:o.token,p_code:r.id,p_week:String(r.w),
        p_dmg:Math.max(0,Math.round(dmg||0)),p_members:r.T.hp});
    if(res&&!res.error){RAID_STATE=res;return res;}
  }catch(e){}
  return null;
}
// What a raid actually pays, spelled out before she spends anything on it.
function raidPayout(tier,here){
  const n=1+tier+(here?1:0);
  const scrap=Math.round(6*tier*(here?1.5:1));
  const keys=(tier>=4?2:1)+(here&&tier>=3?1:0);
  const leg=tier>=4?Math.round((tier===5?50:22)*(here?1.4:1)):0;
  return '<div class="kv" style="margin-top:8px">'
    +'<span>If you win</span><b>'+n+' item'+(n===1?'':'s')+' · '+scrap+'🔩 · '+keys+' key'+(keys===1?'':'s')+' · '+(40*tier)+' XP</b>'
    +(leg?'<span>Legendary chance</span><b style="color:var(--amber)">'+leg+'%</b>':'')
    +'<span>Item quality</span><b>'+(tier>=3?'nothing common':'better than the street')+'</b>'
    +'<span>If you lose</span><b>'+(4+tier*3)+'🔩 · '+(15*tier)+' XP for the damage you did</b></div>'
    +'<p class="help" style="margin-top:6px">Your loot is your own - it does not split, and everyone hits the same health bar.'
    +(here?' <b style="color:var(--rot)">You walked here, so this one pays the boots-on-the-ground bonus.</b>'
          :' Walking to a raid yourself pays more than flaring in.')+'</p>';
}
function raidSheet(r){
  const near=raidNear(r);const mine=(S.raidsDone||{})[r.id];
  const left=Math.max(0,r.endsAt-Date.now());
  const mins=Math.round(left/60000);
  const hp=RAID_STATE?RAID_STATE.hp:null, max=RAID_STATE?RAID_STATE.max:null;
  const dead=hp===0;
  openSheet('<h2>'+esc(r.T.e+' '+r.T.n)+' <span class="sub">tier '+r.tier+'</span></h2>'
    +'<p><b style="color:'+r.T.col+'">'+esc(r.boss)+'</b></p>'
    +'<p class="help">'+esc(r.n)+' · '+(mins>60?Math.floor(mins/60)+'h '+(mins%60)+'m':mins+' min')+' left'
      +(near?' · you are here':' · walk closer to join')+'</p>'
    +(hp!==null?'<div class="progress" style="margin-top:8px"><div class="bar"><i style="width:'+Math.round(hp/max*100)+'%;background:linear-gradient(90deg,#8a2230,'+r.T.col+')"></i></div>'
        +'<div class="row"><span>'+fmt(hp)+' / '+fmt(max)+'</span><span>'+(dead?'down':'everyone hits the same one')+'</span></div></div>':'')
    +(RAID_STATE&&RAID_STATE.hits?'<p class="help" style="margin-top:6px">'+Object.keys(RAID_STATE.hits).length+' survivor'+(Object.keys(RAID_STATE.hits).length===1?'':'s')+' have hit it.</p>':'')
    +raidPayout(r.tier,near)
    +'<div class="grid2" style="margin-top:10px">'
    +'<button class="btn ghost" onclick="shareRaid(\''+esc(r.poi)+'\')">Invite a friend</button>'
    +(mine?'<button class="btn" disabled>You fought this one</button>'
      :dead?'<button class="btn" disabled>Already down</button>'
      :near?'<button class="btn r" onclick="joinRaid(\''+esc(r.poi)+'\')">Join the raid</button>'
      :'<button class="btn" disabled>Too far away</button>')
    +'</div>'
    +'<button class="btn ghost wide" style="margin-top:8px" onclick="closeSheet()">Back</button>',true);
}
async function openRaid(poiId){
  const p=STREET.pois.find(x=>x.id===poiId);if(!p)return;
  const r=raidAt(p);if(!r){toast('Nothing here now');return;}
  RAID_STATE=null;raidSheet(r);
  await raidSync(r,0);                       // read the shared bar without hitting it
  if(!C&&!S.combat&&$('#modal').classList.contains('on'))raidSheet(r);
}
// Sending the call. The invite rides on the board every client already polls,
// so nobody has to paste a link and no new database table was needed.
function shareRaid(poiId){
  const p=STREET.pois.find(x=>x.id===poiId);const r=p&&raidAt(p);if(!r)return;
  const o=O();
  const party=((S.party&&S.party.data&&S.party.data.members)||[]).map(x=>String(x).toLowerCase());
  const mates=(friends||[]).map(f=>(f.handle||'').toLowerCase()).filter(Boolean);
  const pick=party.length>1?party:mates;
  const to=[...new Set(pick)].filter(h=>h&&h!==(o.handle||'').toLowerCase()).slice(0,40);
  const mins=Math.max(0,Math.round((r.endsAt-Date.now())/60000));
  const txt='Dead Miles raid: '+r.T.e+' '+r.T.n+' (tier '+r.tier+') at '+r.n+', '+mins+' min left. Open the game - it is in your Raid calls, no travel needed.';
  if(!o.ok||!to.length){
    if(navigator.share){navigator.share({text:txt}).catch(()=>{});return;}
    copyText(txt,'');toast(o.ok?'Nobody on your board yet - copied it instead':'Go online to call people in. Copied instead.','a');
    return;
  }
  S.flare={id:r.id,poi:r.poi,n:r.n,w:r.w,tier:r.tier,T:r.T,boss:r.boss,endsAt:r.endsAt,to:to,at:Date.now()};
  save();pushPlayer();render();
  log('Called '+to.length+' '+(party.length>1?'party member':'survivor')+(to.length===1?'':'s')+' to the tier '+r.tier+' raid at '+r.n+'.');
  toast('Called '+to.length+' in'+(party.length>1?' from your party':'')+'. They can join from anywhere.','l');
  closeSheet();
}
function cancelCall(){S.flare=null;save();pushPlayer();render();toast('Call off');}
// Opening someone else's call. The raid is rebuilt from the invite, so this
// client never needs their map.
function openCall(i){
  const c=raidCalls()[i];if(!c){render();return;}
  const f=c.call;const r=Object.assign({},f,{T:RAID_TIERS[f.tier-1]});
  const mins=Math.max(0,Math.round((r.endsAt-Date.now())/60000));
  const left=flaresLeft();
  RAID_STATE=null;
  openSheet('<h2>'+esc(r.T.e+' '+r.T.n)+' <span class="sub">tier '+r.tier+'</span></h2>'
    +'<p class="help">'+esc(c.from)+' called you in.</p>'
    +'<p><b style="color:'+esc(r.T.col)+'">'+esc(r.boss)+'</b></p>'
    +'<p class="help">'+esc(r.n)+' · '+(mins>60?Math.floor(mins/60)+'h '+(mins%60)+'m':mins+' min')+' left · you fight it from here</p>'
    +raidPayout(r.tier,false)
    +'<div class="kv" style="margin-top:8px"><span>Flares left today</span><b>'+left+' of '+flaresMax()+'</b><span>This seat costs</span><b>1 flare</b></div>'
    +'<div class="grid2" style="margin-top:10px">'
    +'<button class="btn ghost" onclick="closeSheet()">Not now</button>'
    +(left>0?'<button class="btn r" onclick="openCallGo('+i+')">Join · 1 flare</button>'
            :'<button class="btn" disabled>No flares left</button>')
    +'</div>',true);
  const mark='call-'+r.id+'-'+Date.now();SHEET_MARK=mark;
  raidSync(r,0).then(()=>{
    if(C||S.combat)return;                     // a fight started; never draw over it
    if(SHEET_MARK!==mark)return;               // she moved on, or a newer sheet is up
    if(!$('#modal').classList.contains('on'))return;
    SHEET_MARK='';openCall(i);                 // redraw once, with the health bar filled in
  }).catch(()=>{});
}
let SHEET_MARK='';
function openCallGo(i){
  const c=raidCalls()[i];if(!c)return;
  joinRemote(Object.assign({},c.call,{T:RAID_TIERS[c.call.tier-1]}));
}
async function joinRaid(poiId){
  const p=STREET.pois.find(x=>x.id===poiId);const r=p&&raidAt(p);if(!r)return;
  if(!raidNear(r)){toast('Walk closer to join');return;}
  if(!onFootCheck('join a raid'))return;      // driving past does not count
  return enterRaid(r,false);
}
// The same fight, entered from anywhere in the world. Her friends do not live
// in her city; a raid only she can reach is not co-op. A remote seat costs one
// flare, standing there costs nothing - walking is still the better deal.
async function joinRemote(r){
  if(flaresLeft()<=0){toast('Out of flares until tomorrow. Walk more today to earn another.','d');return;}
  return enterRaid(r,true);
}
async function enterRaid(r,remote){
  if(!r)return;
  if((S.raidsDone||{})[r.id]){toast('You already fought this one');return;}
  if(S.loc||S.combat){toast('Finish what you are doing first');return;}
  const st=await raidSync(r,0);
  if(st&&st.hp===0){toast('Someone already put it down');if(remote)render();else raidSheet(r);return;}
  // Only CHECK the flare here. gearCheck can still stop the fight - she backs
  // out at "no weapon equipped" and the raid never happens - so the flare is
  // not spent until the fight actually starts, below.
  if(remote&&!(S.raidSeats||{})[r.id]&&flaresLeft()<=0){toast('Out of flares until tomorrow','d');return;}
  SHEET_MARK='';                              // cancel any sheet refresh still in flight
  closeSheet();
  gearCheck(()=>{
    const seats=S.raidSeats||(S.raidSeats={});
    if(remote&&!seats[r.id]){
      if(!spendFlare()){toast('Out of flares until tomorrow','d');return;}
      seats[r.id]=Date.now();
      // Trim the oldest, but never the seat just paid for - whatever the clock says.
      const ids=Object.keys(seats).filter(k=>k!==r.id).sort((a,b)=>seats[a]-seats[b]);
      while(ids.length>39)delete seats[ids.shift()];
    }
    const T=r.T;
    const boss=mk('bloater');
    boss.n=r.boss;boss.raid=r.id;boss.warden=true;
    // scales with HER now, not just with the tier
    // Scale the THREAT with her level, not the boss's health pool. Her HP more
    // than doubles from level 3 to 15 while her damage barely moves, so scaling
    // health just made fights longer - and a longer fight against several
    // enemies is one she loses to attrition, not to skill.
    boss.max=Math.round(boss.max*(1+T.hp*0.55));
    boss.dmg=boss.dmg.map(x=>Math.round(x*T.dmg*raidScale()));
    // THE SHARED BAR IS NOW REAL. You face what is LEFT of it, not a fresh boss.
    // Solo at tier 5 you cannot take it in one go - but every attempt sticks, and
    // friends who join chip the same pool. This is what makes a raid co-op
    // instead of a private fight with a cosmetic group total.
    const shared=(st&&st.max>0&&st.hp>=0)?Math.max(0.08,st.hp/st.max):1;
    boss.hp=Math.max(1,Math.round(boss.max*shared));

    for(const m of raidMechs(T.t)){
      if(m==='plated')boss.plate=true;
      if(m==='enraged')boss.enrage=true;
      if(m==='caller')boss.caller=true;
      if(m==='frenzy')boss.frenzy=true;
    }
    const en=[boss];
    if(T.t>=3)en.unshift(mk('runner'));
    if(T.t>=4)en.unshift(mk('walker'));
    if(T.t>=5)en.unshift(mk('gunner'));
    // Carry the raid itself, not just its poi id: a remote raider has no POI
    // list to look it up in afterwards.
    S.raidCur={id:r.id,tier:T.t,loot:T.loot,n:r.boss,poi:r.poi,r:{id:r.id,poi:r.poi,n:r.n,w:r.w,tier:r.tier,boss:r.boss,endsAt:r.endsAt},remote:!!remote};
    startCombat(en,'liveraid');
  });
}
// called from the combat resolver
function liveRaidAfter(won){
  const cur=S.raidCur;if(!cur)return;S.raidCur=null;
  if(!S.raidsDone)S.raidsDone={};
  const p=STREET.pois.find(x=>x.id===cur.poi);
  const r=(p&&raidAt(p))||(cur.r?Object.assign({},cur.r,{T:RAID_TIERS[cur.r.tier-1]}):null);
  const dealt=won?9999:Math.round(400*cur.tier);
  if(r)raidSync(r,dealt);
  if(!won){
    // You still put damage on the shared bar. Pay for that, or a lost raid is a
    // flare spent on nothing.
    const scrap=4+cur.tier*3, xp=15*cur.tier;
    S.stock.scrap+=scrap;addXp(xp);
    log('The raid at '+cur.n+' beat you back, but you hurt it: +'+scrap+' scrap, +'+xp+' XP. Your damage stays on its health bar.');
    toast('Driven off. +'+scrap+' scrap for the damage you did','a');
    if(cur.remote)log('Your seat in this raid is paid for. Going back in costs no flare.');
    save();render();return;
  }
  S.raidsDone[cur.id]=Date.now();
  // trim old entries so the save does not grow forever
  const keys=Object.keys(S.raidsDone);if(keys.length>60)keys.sort((a,b)=>S.raidsDone[a]-S.raidsDone[b]).slice(0,keys.length-60).forEach(k=>delete S.raidsDone[k]);
  // Raid loot uses the game's own tables, just weighted hard toward gear and
  // rerolled for rarity - a tier 5 should feel like a tier 5 without inventing
  // a second item system that can drift from the first.
  const here=!cur.remote;                       // she physically walked to this one
  const got=[];const n=1+cur.tier+(here?1:0);
  const pool=table(['meds','ammo','scrap','food','water'], 2, 4+cur.tier*3)
    .map(x=>({...x, w:x.w*rarW(x)*((RAR[x.r||'common'].w>=3)?(1+cur.tier*0.9):1)}));
  for(let i=0;i<n;i++){
    let it=wpick(pool,'w');
    // tier 3+ will not hand you a common: reroll until it clears the floor
    const floor=cur.tier>=3?3:cur.tier>=2?2:1;
    for(let k=0;k<12&&RAR[it.r||'common'].w<floor;k++)it=wpick(pool,'w');
    const packed=it.gear
      ? {id:it.id,n:it.n,e:it.e,pts:it.pts,cat:'gear',gear:true,r:it.r}
      : {id:it.id,n:it.n,e:it.e,pts:Math.round(it.pts*cur.loot),cat:it.cat,qty:it.qty,r:it.r};
    if(takeItem(packed,null))got.push(packed.n);
  }
  if(cur.tier>=4&&Math.random()<(cur.tier===5?0.5:0.22)*(here?1.4:1)){dropLegendQuiet();got.push('a LEGENDARY');}
  const scrap=Math.round(6*cur.tier*(here?1.5:1));
  S.stock.scrap+=scrap;S.keys+=(cur.tier>=4?2:1)+(here&&cur.tier>=3?1:0);addXp(40*cur.tier);
  ctEvent('kills',1);
  log('Raid cleared: '+cur.n+' (tier '+cur.tier+'). +'+scrap+' scrap, +'+((cur.tier>=4?2:1)+(here&&cur.tier>=3?1:0))+' keys, +'+(40*cur.tier)+' XP'+(got.length?', '+got.join(', '):'')+'.'+(here?' Walked-in bonus applied.':''));
  toast('Tier '+cur.tier+' raid cleared','l');SFX.play('legend');
  save();render();pushPlayer();
}
