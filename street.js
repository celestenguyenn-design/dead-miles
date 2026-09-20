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
    STREET.map.on('zoomend',poiScale);poiScale();
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
// BUMP THIS whenever the Overpass query, the radius, or the pick-the-nearest
// logic changes, or players keep the old results for up to a week.
const POI_CACHE_V=2;
async function fetchPois(pos,force){
  STREET.lastFetch=pos;const cell=(Math.round(pos.lat/0.004)*0.004).toFixed(3)+','+(Math.round(pos.lon/0.004)*0.004).toFixed(3);
  if(force)try{localStorage.removeItem('dm.pois.'+cell);}catch(e){}
  else try{const c=JSON.parse(localStorage.getItem('dm.pois.'+cell)||'null');
    if(c&&c.v===POI_CACHE_V&&c.pois&&c.pois.length&&Date.now()-c.t<7*86400000){
      STREET.pois=c.pois;updateMarkers();
      const near=STREET.pos?Math.round(Math.min(...STREET.pois.map(x=>geoDist(x,STREET.pos)))):null;
      $('#mapStatus').textContent=STREET.pois.length+' places nearby'+(near!==null?' · nearest '+near+' m':'');
      return;}
    // an older stamp means the list was built by a query we have since fixed
    if(c&&c.v!==POI_CACHE_V)localStorage.removeItem('dm.pois.'+cell);}catch(e){}
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
  const around=(r,body)=>`[out:json][timeout:60];(${body});out center 300;`;
  const bizQ=around(0,
    `nwr(around:350,${pos.lat},${pos.lon})[amenity~"^(pharmacy|police|fuel|hospital|clinic|doctors|dentist|veterinary|fast_food|restaurant|cafe|bar|pub|ice_cream|school|college)$"];`
   +`nwr(around:350,${pos.lat},${pos.lon})[shop];`
   +`nwr(around:400,${pos.lat},${pos.lon})[leisure=park]`);
  const bldQ=`[out:json][timeout:60];(way(around:220,${pos.lat},${pos.lon})[building];);out center 900;`;

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

  // HOUSE DENSITY FOLLOWS DISTANCE FROM BASE (v7.21). Her words: "there should
  // only be a bunch of houses to loot if you're by your house... but if you're
  // actually walking away from your base pin, can be houses to loot" - fewer,
  // and worth more. A wall of identical houses next to the base is the whole
  // point of being able to play at home; the same wall a mile out is what made
  // walking pointless. Shops and landmarks are never trimmed.
  const shops=pois.filter(p=>!p.house);
  const bt=(S.base&&S.base.geo)?farTierFor(geoDist(S.base.geo,pos)):FAR_TIERS[1];
  const CAP=[55,55,16,9][bt.k];
  const houses=pois.filter(p=>p.house).sort((a,b)=>geoDist(a,pos)-geoDist(b,pos)).slice(0,CAP);
  STREET.pois=shops.concat(houses);

  if(STREET.pois.length){
    try{localStorage.setItem('dm.pois.'+cell,JSON.stringify({v:POI_CACHE_V,t:Date.now(),pois:STREET.pois}));}catch(e){}
    const near=STREET.pos?Math.round(Math.min(...STREET.pois.map(x=>geoDist(x,STREET.pos)))):null;
    $('#mapStatus').textContent=STREET.pois.length+' places nearby ('+shops.length+' shops, '+houses.length+' buildings)'
      +(near!==null?' · nearest '+near+' m':'');
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
// Pin size follows the zoom so a dense street reads as houses instead of a pile.
// Nothing is ever hidden - she asked for every house to stay on the map.
function poiScale(){
  if(!STREET.map)return;
  const z=STREET.map.getZoom();
  const px=z>=19?34:z>=18?30:z>=17?24:z>=16?19:15;
  document.documentElement.style.setProperty('--poiSize',px+'px');
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
      : (function(){
          // A landmark must be findable at a glance - that is the whole point of
          // putting it on a map. Every house stays visible (she asked for that);
          // the landmark just wears a ring so a direction is obvious.
          const ch=cacheAt(p);
          if(ch&&!cacheTaken(ch))return `<div class="poi ${st} cache"><span>${ch.keep.e}</span></div>`;
          const lm=landmarkOf(p);
          const tt=poiTierOf(p);
          const tc=(S.base&&S.base.geo&&tt)?' t'+tt.k:'';
          if(lm)return `<div class="poi ${st} lmk${tc}"><span>${lm.e}</span></div>`;
          return `<div class="poi ${st}${p.t==='stronghold'?' sh':''}${tc}"><span>${p.e}</span></div>`;
        })();
    const had=STREET.markers[p.id];
    if(!had){const m=L.marker([p.lat,p.lon],{icon:L.divIcon({className:'poi-wrap',html,iconSize:[34,34],iconAnchor:[17,17]})}).addTo(STREET.map);m.on('click',()=>{const cc=cacheAt(p);if(cc&&!cacheTaken(cc)){cacheCollect(p.id);return;}const rr=raidAt(p);if(rr)openRaid(p.id);else tapPoi(p.id);});m._dmHtml=html;STREET.markers[p.id]=m;}
    // setIcon THROWS AWAY the element and builds a new one. This ran on every pin
    // on every GPS ping - 44 rebuilds a second while walking, for pins that had
    // not changed - and each new element restarts its bob animation, which is
    // what the stutter actually was. Only redraw a pin when its html differs.
    else if(had._dmHtml!==html){had.setIcon(L.divIcon({className:'poi-wrap',html,iconSize:[34,34],iconAnchor:[17,17]}));had._dmHtml=html;}}
  for(const id of Object.keys(STREET.markers)){if(!seen.has(id)){STREET.map.removeLayer(STREET.markers[id]);delete STREET.markers[id];}}
}
function drawBase(){if(!S.base||!S.base.geo||!STREET.map)return;if(!STREET.baseMarker){STREET.baseMarker=L.marker([S.base.geo.lat,S.base.geo.lon],{icon:L.divIcon({className:'poi-wrap',html:'<div class="poi base"><span>🏚️</span></div>',iconSize:[40,40],iconAnchor:[20,20]})}).addTo(STREET.map);}else STREET.baseMarker.setLatLng([S.base.geo.lat,S.base.geo.lon]);}

/* ---------- looting a real place ---------- */
/* ================= LANDMARKS (v7.19) =================
   Her ask, in her words: "if im not home everything with better loot should be
   spread out and have landmarks of some sort that can tell you what can be
   found". So a landmark is three things at once:
     - FAR. Only tier 2+ places can host one, so it is always a real walk.
     - NAMED and FIXED. Chosen by a hash of the OSM id, so the same building is
       the same landmark every time she opens the map, forever, with no server.
     - HONEST ABOUT ITS CONTENTS before she goes. That is the whole point - a
       reason to pick a direction, not a lottery ticket.
   Restock is 12h against a normal place's 24h, because a landmark is the thing
   worth building a walk around. */
const LANDMARKS=[
  {id:'depot',  n:'The rail depot',   e:'\u{1F689}', pay:'Tools, fuel and shells. Always a chest key.',   give:{key:1,scrap:[25,45],cats:['scrap','ammo']}},
  {id:'ward',   n:'The flooded ward', e:'\u{1F3E5}', pay:'Antibiotics and a trauma kit. Meds you cannot buy.', give:{med:'kit',scrap:[10,20],cats:['meds']}},
  {id:'armoury',n:'The armoury',      e:'\u{1F396}', pay:'Ammunition, and a weapon worth carrying.',      give:{gear:true,scrap:[15,30],cats:['ammo']}},
  {id:'water',  n:'The water tower',  e:'\u{1F5FC}', pay:'A clear view: marks every raid on your map for the day.', give:{scout:true,scrap:[20,35],cats:['water','food']}},
  {id:'yard',   n:'The scrapyard',    e:'\u{1F6E0}', pay:'Scrap by the armful, and parts for the bench.',  give:{parts:[2,4],scrap:[55,90],cats:['scrap']}},
];
// A place hosts a landmark when its own id hashes into the slot. 1 in 20 of the
// FAR buildings - measured at 1 in 9 first, which put ~55 of them in a 400-
// building field, and a landmark every other block is not a destination.
function landmarkOf(p){
  if(!p||p.house===undefined)return null;
  const t=poiTierOf(p); if(!t||t.k<2)return null;
  const h=rhash('lm:'+p.id);
  if(h%20!==0)return null;
  // NOT h % LANDMARKS.length. h is a multiple of 20 by the line above, and 20 is
  // a multiple of 5, so that expression is ALWAYS 0 - every landmark in the world
  // came out "the rail depot". Caught by reading the rendered list rather than
  // trusting the selector. A second, independent hash has no such relationship.
  return LANDMARKS[rhash('kind:'+p.id)%LANDMARKS.length];
}
function poiTierOf(p){
  const b=S.base&&S.base.geo;
  if(!b||!p)return (typeof farTierFor==='function')?farTierFor(null):null;
  return farTierFor(geoDist(p,b));
}
function landmarkFresh(p){
  const st=streetState();const t=st.looted[p.id];
  return !(t&&Date.now()-t<12*3600000);
}
// Everything within reach or not, sorted by how far she would have to walk.
function landmarksNear(){
  const out=[];
  for(const p of STREET.pois){
    const lm=landmarkOf(p); if(!lm)continue;
    const d=STREET.pos?Math.round(geoDist(p,STREET.pos)):null;
    out.push({p,lm,d,tier:poiTierOf(p),fresh:landmarkFresh(p)});
  }
  return out.sort((a,b)=>(a.d===null?1e9:a.d)-(b.d===null?1e9:b.d));
}
function renderLandmarks(){
  const el=$('#landmarkCard');if(!el)return;
  if(!STREET.on||!S.base||!S.base.geo){el.hidden=true;return;}
  const list=landmarksNear();
  if(!list.length){el.hidden=true;return;}
  el.hidden=false;el.className='card steel';
  el.innerHTML='<h2>\u{1F5FA}\uFE0F Landmarks <span class="sub">worth the walk</span></h2>'
    +'<p class="help">Far enough out that nobody has been. Each one says what is in it before you go.</p>'
    +'<div class="stack" style="margin-top:8px">'
    +list.slice(0,6).map(x=>
      '<button class="room2'+(x.fresh?'':' off')+'" onclick="panTo(\''+x.p.id+'\')">'
      +'<div class="e">'+x.lm.e+'</div>'
      +'<div class="t"><b>'+esc(x.lm.n)+'</b> '
      +'<span class="chip'+(x.tier.k>=3?' a':'')+'">'+esc(x.tier.n)+'</span>'
      +(x.d!==null?'<span class="chip s">'+(x.d>=1000?(x.d/1000).toFixed(1)+' km':x.d+' m')+'</span>':'')
      +'<span>'+esc(x.fresh?x.lm.pay:'Cleared. Restocks within 12 hours.')+'</span>'
      +'<span class="help" style="font-size:11px">'+esc(x.p.n)+'</span></div></button>').join('')
    +'</div>';
}
function panTo(id){
  const p=STREET.pois.find(x=>x.id===id);if(!p||!STREET.map)return;
  STREET.map.setView([p.lat,p.lon],18);
  const d=STREET.pos?Math.round(geoDist(p,STREET.pos)):null;
  toast(p.n+(d!==null?' \u00b7 '+(d>=1000?(d/1000).toFixed(1)+' km':d+' m')+' away':''),'l');
}
// Paid once, when the last room of a landmark is searched - so the declared
// contents are a promise the place keeps, not a roll it might miss.
function landmarkPayout(loc){
  if(!loc||!loc.landmark||loc.lmPaid)return;
  if(loc.rooms.some(r=>!r.done))return;
  const lm=LANDMARKS.find(x=>x.id===loc.landmark);if(!lm)return;
  loc.lmPaid=true;const g=lm.give;const got=[];
  if(g.scrap){const n=rint(g.scrap[0],g.scrap[1]);S.stock.scrap+=n;got.push(n+' scrap');}
  if(g.key){S.keys+=g.key;got.push(g.key+' chest key'+(g.key===1?'':'s'));}
  if(g.parts){const n=rint(g.parts[0],g.parts[1]);S.parts=(S.parts||0)+n;got.push(n+' parts');}
  if(g.med){medsGive(g.med,1);got.push(ITEMS[g.med]?ITEMS[g.med].n:'meds');}
  if(g.gear){const pool=table([],0,1).filter(x=>x.gear&&RAR[x.r||'common'].w>=3);
    if(pool.length){let it=wpick(pool,'w');
      for(let t=0;t<10&&RAR[it.r||'common'].w<4;t++)it=wpick(pool,'w');
      if(takeItem({id:it.id,n:it.n,e:it.e,pts:it.pts,cat:'gear',gear:true,r:it.r},loc))got.push(it.n);}}
  if(g.scout){S.lmScout=todayStr();got.push('every raid on the map marked for today');}
  log(lm.n+' paid out: '+got.join(', ')+'.');
  toast(lm.e+' '+lm.n+' cleared','l');SFX.play('legend');
  save();render();
}
function tapPoi(id){
  const p=STREET.pois.find(x=>x.id===id);if(!p)return;const st=poiState(p);
  if(S.loc&&S.loc.geo!==id){toast('Finish or leave '+S.loc.n+' first');return;}
  if(st==='looted'){const t=streetState().looted[id];const h=Math.ceil((24*3600000-(Date.now()-t))/3600000);toast(p.n+' is picked clean. Resets in '+h+'h');return;}
  if(st==='far'){toast(p.n+': walk closer ('+Math.round(geoDist(p,STREET.pos))+' m)');return;}
  if(!onFootCheck('search a place'))return;   // looting from a moving car does not count
  if(S.loc&&S.loc.geo===id){$('#locCard').scrollIntoView({behavior:'smooth'});return;}
  const tier=poiTierOf(p)||farTierFor(null);
  const lm=landmarkOf(p);
  const loc=makeLoc(p.t,lm?lm.n:p.n,tier?tier.k:1);loc.geo=id;loc.e=lm?lm.e:p.e;
  if(lm)loc.landmark=lm.id;
  S.loc=loc;streetState().visits++;
  log('Reached '+(lm?lm.n+' ('+p.n+')':p.n)+' \u00b7 '+(tier?tier.n:'')+'. '+(tier?tier.d:''));
  if(lm)toast(lm.e+' '+lm.n,'l');
  SFX.play(lm?'rare':'arrive');save();render();$('#locCard').scrollIntoView({behavior:'smooth'});
}
function setHomeHere(){
  if(!STREET.pos){toast('Waiting for GPS');return;}
  if(S.base&&S.base.geo&&S.stock.scrap<20){toast('Moving your base pin costs 20 scrap');return;}
  if(S.base&&S.base.geo)S.stock.scrap-=20;
  if(!S.base)S.base={t:'house',e:'🏠',n:'Base camp',district:district().n,rooms:{},claimed:Date.now()};
  S.base.geo={lat:STREET.pos.lat,lon:STREET.pos.lon};S.base.n=S.base.n||'Base camp';
  // This is NOT the same button as "Move base here". This moves the map pin
  // only and keeps every room; that one changes the base TYPE and destroys them.
  // They read almost identically, so each now says which it is.
  log('Your base pin moved to where you are standing. Same base, same rooms - this only changes where you walk back to in order to stash.');
  toast('Base pin moved. Nothing you built was lost.','a');SFX.play('win');save();drawBase();render();pushPlayer();
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

// What band the ground under her feet is in. Without this the tiers are real but
// invisible: she opens the map, sees the same houses as before, and has no way
// to know which ones changed. Her question, exactly: "how do you really know if
// I'm home in an area".
function hereTier(){
  if(!S.base||!S.base.geo||!STREET.pos)return null;
  return farTierFor(geoDist(S.base.geo,STREET.pos));
}
function tierLegend(){
  // No base pin means NOTHING is tiered - farTierFor(null) answers "Nearby" for
  // the whole map and the feature quietly does nothing. That must be loud, not
  // silent, because the pin is the thing that defines where "home" is.
  if(!S.base||!S.base.geo)
    return '<div class="note" style="margin-top:8px"><b>No base pin yet.</b> Distance is measured from it, '
      +'so until you drop one every place counts as ordinary. Tap <b>Move my base pin here</b> while you are at home.</div>';
  const t=hereTier();const d=homeDistance();
  return '<div class="note" style="margin-top:8px"><b>'+esc(t?t.n:'\u2014')+'</b>'
    +(d!==null?' \u00b7 '+(d>=1000?(d/1000).toFixed(1)+' km':Math.round(d)+' m')+' from your base':'')
    +'<br><span class="help">'+esc(t?t.d:'')+'</span>'
    +'<div class="row" style="margin-top:6px;gap:6px;flex-wrap:wrap">'
    +FAR_TIERS.map(x=>'<span class="chip tl t'+x.k+(t&&t.k===x.k?' a':'')+'">'+esc(x.n)+'</span>').join('')
    +'</div></div>';
}
function renderStreet(){
  if(!STREET.on)return;const hd=homeDistance();
  try{renderRaidList();}catch(e){}
  try{renderLandmarks();}catch(e){}
  try{renderCaches();}catch(e){}
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
    +`${hd!==null?`<span class="chip a">Base ${Math.round(hd)} m</span>`:'<span class="chip">No base yet</span>'}`
    +`<span class="chip d">${STREET.zombies.length} on the street</span>`
    +tierLegend();
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
  // 15 -> 6. Raid existence must stay GLOBAL: if it depended on distance from
  // MY base, two people on the same street would see different raids and could
  // not join each other from the map. So raids get scarcer everywhere, and the
  // reason to walk out lives in landmarks, loot tiers and caches instead.
  if(rhash(p.id+'|'+w+'|raid')%100>=6)return null;
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
// Her words: "I can still be like a block away from a raid and it'll still count
// as me close enough to raid it". It was reachRadius()*2 - up to 140 m, which is
// a block. A raid is now the same reach as anything else you have to stand at.
function raidNear(r){const p=STREET.pois.find(x=>x.id===r.poi);return p&&STREET.pos?geoDist(p,STREET.pos)<=reachRadius():false;}

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
    +(function(){const h=raidHere(r);return h.length
        ?'<div class="squad"><div class="row"><span class="chip l">In there now</span>'+h.map(x=>'<span class="chip">'+esc(x)+'</span>').join('')+'</div>'
          +'<div class="help" style="margin-top:4px">Go in while they are fighting and you are a squad: it splits its attention between you, and if you go down they pull you out instead of it costing you the pack.</div></div>'
        :'<p class="help" style="margin-top:6px">Go in at the same time as a friend and you fight it as a squad - it takes turns on you, so it hits each of you half as often.</p>';})()
    +raidPayout(r.tier,near)
    +'<div class="grid2" style="margin-top:10px">'
    +(partyHandles().length>1
       ?'<button class="btn a" onclick="callParty(\''+esc(r.poi)+'\')">Call the party</button>'
       :'<button class="btn ghost" onclick="shareRaid(\''+esc(r.poi)+'\')">Invite a friend</button>')
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
    // mk() ALREADY scales damage with her level. Multiplying by raidScale() on
    // top scaled it twice, so the boss hit 5.5x as hard at level 25 while her
    // health only grew 2.6x - levelling up made her weaker, and hits-to-kill
    // fell from 4.6 to 2.3. That is the "we go in and just die" she reported.
    // One level scale, plus the tier, and nothing else.
    boss.dmg=boss.dmg.map(x=>Math.round(x*T.dmg));
    // THE SHARED BAR IS NOW REAL. You face what is LEFT of it, not a fresh boss.
    // Solo at tier 5 you cannot take it in one go - but every attempt sticks, and
    // friends who join chip the same pool. This is what makes a raid co-op
    // instead of a private fight with a cosmetic group total.
    const shared=(st&&st.max>0&&st.hp>=0)?Math.max(0.08,st.hp/st.max):1;
    boss.hp=Math.max(1,Math.round(boss.max*shared));
    // Remember what it had when she walked in, so a loss can report the damage
    // she ACTUALLY did rather than a flat guess.
    boss.startHp=boss.hp;

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
    C.myDealt=0;
    squadStart(r,st);
    pushPlayer();
  });
}
// called from the combat resolver
function liveRaidAfter(won){
  const cur=S.raidCur;if(!cur)return;S.raidCur=null;
  if(!S.raidsDone)S.raidsDone={};
  const p=STREET.pois.find(x=>x.id===cur.poi);
  const r=(p&&raidAt(p))||(cur.r?Object.assign({},cur.r,{T:RAID_TIERS[cur.r.tier-1]}):null);
  // A loss used to post a flat 400 x tier no matter what happened, so dying in
  // round two and dying with the boss on its last legs counted the same - and
  // against a big shared pool it barely moved the bar. Post what she really did.
  let dealt=9999;
  if(!won){
    const boss=(typeof C!=='undefined'&&C&&C.enemies)?C.enemies.find(e=>e.warden):null;
    // C.myDealt counts only her own swings. startHp-hp would also count the
    // damage a squadmate did to the same boss, and post it a second time under
    // her handle - the bar would fall twice as fast as the fight earned.
    dealt=(C&&C.myDealt!==undefined)?C.myDealt:(boss?Math.max(0,(boss.startHp||boss.max)-Math.max(0,boss.hp)):0);
    // squadPoll has been posting as the fight went on; send only what is left
    // over, or every mid-fight swing gets counted a second time here.
    dealt=Math.max(0,Math.round(dealt-(SQUAD.posted||0)));
  }
  if(r&&dealt>0)raidSync(r,dealt);
  if(!won){
    // You still put damage on the shared bar. Pay for that, or a lost raid is a
    // flare spent on nothing.
    // Pay for the damage done, not just for turning up - so a fight you nearly
    // won is worth more than one you lost immediately.
    const bossMax=(typeof C!=='undefined'&&C&&C.enemies&&(C.enemies.find(e=>e.warden)||{}).max)||1;
    const share=Math.max(0, Math.min(1, dealt/bossMax));
    const scrap=4+cur.tier*3+Math.round(cur.tier*12*share), xp=15*cur.tier+Math.round(cur.tier*20*share);
    S.stock.scrap+=scrap;addXp(xp);
    log('The raid at '+cur.n+' beat you back, but you took '+fmt(dealt)+' off it: +'+scrap+' scrap, +'+xp+' XP. That damage stays on its health bar.');
    toast('Driven off - but you did '+fmt(dealt)+' damage','a');
    if(cur.remote)log('Your seat in this raid is paid for. Going back in costs no flare.');
    // Come off the board as "in this raid" on a loss too, or friends keep seeing
    // her standing in a fight she has already been driven out of.
    save();render();pushPlayer();return;
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

/* ================= FIELD CACHES (v7.21) =================
   Her ask, in her words: "there should also be some type of like collectible
   like you know like Pokemon Go Pikmin Bloom - you walk to an area, bloom the
   flowers, go to the Pokestop and it'll give you a collectible of some sort."

   A cache is the small, certain, repeatable reward for being somewhere. It is
   deliberately NOT a fight and NOT a loot table: you walk to it, you tap it, you
   get something, and it is gone until tomorrow. That is the whole loop, and it
   is the only content in the game that pays purely for having walked.

   FAR ONLY. Caches never spawn inside the home block - if they did they would be
   one more reason to stand still, which is the thing all of this is fixing.

   They reset DAILY rather than on the raid's two-hour window, so a walk she does
   every day pays every day, and she cannot farm one spot by waiting.           */
const KEEPSAKES=[
  {id:'tag',   n:'Dog tag',        e:'\u{1FAAA}', d:'A name, a blood type, and a date that stops.'},
  {id:'photo', n:'Creased photo',  e:'\u{1F5BC}️', d:'Four people at a lake. Somebody folded it small enough to carry.'},
  {id:'key',   n:'House key',      e:'\u{1F511}', d:'Still on a lanyard from a school nobody attends.'},
  {id:'ring',  n:'Wedding ring',   e:'\u{1F48D}', d:'Engraved inside. You do not read it out loud.'},
  {id:'letter',n:'Unsent letter',  e:'✉️', d:'Addressed, stamped, never posted.'},
  {id:'toy',   n:'Plastic soldier',e:'\u{1FA96}', d:'Chewed. Somebody loved this thing.'},
  {id:'cass',  n:'Mixtape',        e:'\u{1F4FC}', d:'Side A is labelled in three different pens.'},
  {id:'compass',n:'Brass compass', e:'\u{1F9ED}', d:'Still points north. Still the only thing that does.'},
];
function cacheDay(){return (typeof todayStr==='function')?todayStr():String(new Date().getDate());}
// Deterministic per place per day, and only out past the home block.
function cacheAt(p){
  if(!p)return null;
  const t=poiTierOf(p); if(!t||t.k<2)return null;
  if(!S.base||!S.base.geo)return null;
  const h=rhash('cache:'+p.id+'|'+cacheDay());
  if(h%100>=14)return null;
  return {id:'c:'+p.id+':'+cacheDay(), poi:p.id, keep:KEEPSAKES[rhash('keep:'+p.id+'|'+cacheDay())%KEEPSAKES.length]};
}
function cacheTaken(c){return !!((S.caches||{})[c.id]);}
function cacheCollect(poiId){
  const p=STREET.pois.find(x=>x.id===poiId);if(!p)return;
  const c=cacheAt(p);if(!c){toast('Nothing here');return;}
  if(cacheTaken(c)){toast('You already took this one today');return;}
  if(!STREET.pos||geoDist(p,STREET.pos)>reachRadius()){
    toast('Walk to it · '+(STREET.pos?Math.round(geoDist(p,STREET.pos)):'?')+' m away');return;}
  if(!onFootCheck('open a cache'))return;
  if(!S.caches)S.caches={};
  S.caches[c.id]=Date.now();
  // keep the map of taken caches from growing forever
  const ks=Object.keys(S.caches);
  if(ks.length>400)ks.sort((a,b)=>S.caches[a]-S.caches[b]).slice(0,ks.length-400).forEach(k=>delete S.caches[k]);
  const t=poiTierOf(p);
  const scrap=8+rint(0,7)+Math.round((t.k-1)*6);
  const parts=Math.random()<0.45?1:0;
  S.stock.scrap+=scrap;if(parts)S.parts=(S.parts||0)+parts;
  if(!S.keeps)S.keeps={};
  const first=!S.keeps[c.keep.id];
  S.keeps[c.keep.id]=(S.keeps[c.keep.id]||0)+1;
  S.keepsTotal=(S.keepsTotal||0)+1;
  log('Cache at '+p.n+': '+c.keep.e+' '+c.keep.n+', +'+scrap+' scrap'+(parts?', +1 part':'')+'.');
  toast(c.keep.e+' '+c.keep.n+(first?' · NEW':''),first?'l':'a');
  SFX.play(first?'unlock':'loot');
  save();render();updateMarkers();
  if(first)openSheet('<h2>'+c.keep.e+' '+esc(c.keep.n)+'</h2>'
    +'<p class="help" style="font-style:italic">'+esc(c.keep.d)+'</p>'
    +'<p>Found at '+esc(p.n)+'. It goes on the shelf at your base.</p>'
    +'<button class="btn r wide" onclick="closeSheet()">Keep it</button>');
}
function cachesNear(){
  const out=[];
  for(const p of STREET.pois){
    const c=cacheAt(p);if(!c||cacheTaken(c))continue;
    out.push({p,c,d:STREET.pos?Math.round(geoDist(p,STREET.pos)):null});
  }
  return out.sort((a,b)=>(a.d===null?1e9:a.d)-(b.d===null?1e9:b.d));
}
function renderCaches(){
  const el=$('#cacheCard');if(!el)return;
  if(!STREET.on){el.hidden=true;return;}
  const found=Object.keys(S.keeps||{}).length;
  const list=cachesNear();
  if(!list.length&&!found){el.hidden=true;return;}
  el.hidden=false;el.className='card';
  el.innerHTML='<h2>\u{1F9ED} Caches <span class="sub">'+found+'/'+KEEPSAKES.length+' keepsakes</span></h2>'
    +(list.length
      ?'<p class="help">Out past the home block somebody left something. Walk to it and take it - once each, per day.</p>'
        +'<div class="stack" style="margin-top:8px">'
        +list.slice(0,4).map(x=>{
          const inReach=x.d!==null&&x.d<=reachRadius();
          return '<button class="room2'+(inReach?'':' off')+'" onclick="cacheCollect(\''+esc(x.p.id)+'\')">'
            +'<div class="e">'+x.c.keep.e+'</div>'
            +'<div class="t"><b>'+esc(x.p.n)+'</b>'
            +(x.d!==null?'<span class="chip'+(inReach?' a':' s')+'">'+(x.d>=1000?(x.d/1000).toFixed(1)+' km':x.d+' m')+'</span>':'')
            +'<span>'+(inReach?'In reach - tap to take it':'Walk to it')+'</span></div></button>';}).join('')
        +'</div>'
      :'<p class="help">Nothing out here right now. Caches sit past the home block and reset every day.</p>')
    +(found?'<div class="row" style="margin-top:10px;flex-wrap:wrap;gap:6px">'
      +KEEPSAKES.map(k=>(S.keeps&&S.keeps[k.id])
        ?'<span class="chip a" title="'+esc(k.d)+'">'+k.e+' '+esc(k.n)+' ×'+S.keeps[k.id]+'</span>'
        :'<span class="chip s" style="opacity:.45">'+k.e+' ?</span>').join('')
      +'</div>':'');
}

/* ================= THE MUSTER (v7.20) =================
   Her report, three times over: "they join too late", "there has to be a way
   where we're basically partied up and go into a raid together".

   It was never a bug. There was no START GATE. You tapped a raid and your fight
   began, locally, immediately; your friend tapped whenever they next looked at
   their phone and THEIR fight began. The server summed damage under each handle
   and that was the whole of "together". Nothing existed to join, which is why
   posting damage every 6 s (v7.5) fixed the reporting and could not fix this.

   A muster is the gate. The host calls it, everyone in the party gets a card
   with a READY button and a 90-second clock, and NOBODY'S COMBAT STARTS until
   everyone ready is in - then all clients begin against the same boss HP with
   the same roster.

   No new SQL: the muster rides on public state and the board everyone already
   polls, exactly like the flare does. It polls fast (4 s) only while a muster is
   open, instead of the normal 3 minutes.                                      */
const MUSTER_WINDOW=90000;      // the host's clock: go with whoever is ready
const MUSTER_POLL=4000;
let MUSTER_TIMER=0;

function musterMe(){return squadMe();}
function partyHandles(){
  return ((S.party&&S.party.data&&S.party.data.members)||[]).map(x=>String(x).toLowerCase()).filter(Boolean);
}
// Everyone's muster entry for the same raid - mine plus whatever the board says.
function musterAll(){
  const m=S.muster;if(!m||!m.id)return null;
  const me=musterMe();
  const rows=[{handle:me,name:S.name||me,ready:!!m.ready,host:m.host===me,at:m.at}];
  for(const f of (typeof friends!=='undefined'?friends:[])){
    const h=(f.handle||'').toLowerCase();if(!h||h===me)continue;
    const fm=f.pub&&f.pub.muster;
    if(!fm||fm.id!==m.id)continue;
    rows.push({handle:h,name:(f.pub&&f.pub.name)||h,ready:!!fm.ready,host:fm.host===h,at:fm.at});
  }
  return rows;
}
function musterOpen(){
  const m=S.muster;
  if(!m||!m.id||m.started)return false;
  if(m.endsAt&&m.endsAt<=Date.now())return false;      // the raid itself expired
  return true;
}
function musterDeadline(){
  const rows=musterAll();if(!rows)return 0;
  const host=rows.find(r=>r.host)||rows[0];
  return (host.at||Date.now())+MUSTER_WINDOW;
}
// Start when everyone who turned up is ready, or the host's clock runs out.
// "Everyone who turned up" is deliberately not "everyone in the party": a
// party member who has not opened the game must never be able to hold the
// fight hostage.
function musterShouldGo(){
  if(!musterOpen())return false;
  const rows=musterAll();if(!rows)return false;
  const mine=rows.find(r=>r.handle===musterMe());
  if(!mine||!mine.ready)return false;                  // I have not pressed Ready
  // NOBODY ELSE HAS TURNED UP ON THE BOARD YET. "everyone is ready" is
  // trivially true when everyone is one person - and callParty() marks the host
  // ready the moment they call it, so on the very first 4-second tick the host
  // was alone, unanimously ready, and the raid started by itself. Her report:
  // "the party ended up starting on its own." A muster whose entire purpose is
  // to WAIT must never read an empty room as consensus; alone it waits out the
  // clock instead, which is the only honest meaning of "nobody else came".
  if(rows.length<2)return Date.now()>=musterDeadline();
  if(Date.now()>=musterDeadline())return true;
  return rows.every(r=>r.ready);
}
// The roster is sorted, so every client independently computes the SAME order
// with nothing to arbitrate. That is what makes the turn rotation agree across
// phones without a server refereeing it.
function musterRoster(){
  const rows=musterAll()||[];
  return rows.filter(r=>r.ready).map(r=>({handle:r.handle,name:r.name})).sort((a,b)=>a.handle<b.handle?-1:1);
}
function callParty(poiId){
  const p=STREET.pois.find(x=>x.id===poiId);const r=p&&raidAt(p);if(!r)return;
  const o=O();
  if(!o.ok){toast('Go online first - a muster needs your handle','d');return;}
  const party=partyHandles();
  if(party.length<2){toast('Join a party first (Party card, under You)','d');return;}
  S.muster={id:r.id,poi:r.poi,n:r.n,w:r.w,tier:r.tier,boss:r.boss,endsAt:r.endsAt,
            host:musterMe(),at:Date.now(),ready:true,started:false};
  // keep the old flare too, so people outside the party still get the call
  shareRaid(poiId);
  save();pushPlayer();render();musterStartPolling();
  log('Called a muster on the tier '+r.tier+' raid at '+r.n+'. Nobody goes in until everyone is ready.');
  toast('Muster called · waiting on the party','l');
}
// Joining someone else's muster from the board.
function musterAccept(id){
  const me=musterMe();
  for(const f of (typeof friends!=='undefined'?friends:[])){
    const fm=f.pub&&f.pub.muster;
    if(!fm||fm.id!==id)continue;
    S.muster={id:fm.id,poi:fm.poi,n:fm.n,w:fm.w,tier:fm.tier,boss:fm.boss,endsAt:fm.endsAt,
              host:fm.host,at:fm.at,ready:false,started:false,remote:true};
    save();pushPlayer();render();musterStartPolling();
    toast('Joined the muster · tap Ready','a');
    return;
  }
  toast('That muster is gone','d');
}
function musterReady(){
  if(!S.muster)return;
  S.muster.ready=true;save();pushPlayer();render();
  musterStartPolling();musterTick();
}
function musterLeave(){
  S.muster=null;save();pushPlayer();render();musterStopPolling();toast('Left the muster');
}
function musterStartPolling(){
  if(MUSTER_TIMER)return;
  MUSTER_TIMER=setInterval(musterTick,MUSTER_POLL);
}
function musterStopPolling(){if(MUSTER_TIMER)clearInterval(MUSTER_TIMER);MUSTER_TIMER=0;}
async function musterTick(){
  if(!S.muster||S.muster.started){musterStopPolling();renderMuster();return;}
  if(!musterOpen()){S.muster=null;save();pushPlayer();musterStopPolling();render();return;}
  if(typeof loadFriends==='function')try{await loadFriends();}catch(e){}
  renderMuster();
  if(musterShouldGo())musterGo();
}
// Everyone starts here, against the same boss, with the same roster.
async function musterGo(){
  const m=S.muster;if(!m||m.started)return;
  m.started=true;save();musterStopPolling();
  const roster=musterRoster();
  const r={id:m.id,poi:m.poi,n:m.n,w:m.w,tier:m.tier,boss:m.boss,endsAt:m.endsAt,T:RAID_TIERS[m.tier-1]};
  // seed from ONE shared read so nobody opens on a fresh boss while a squadmate
  // is already halfway through it
  const st=await raidSync(r,0);
  const names=roster.map(x=>x.name).join(', ');
  log('Muster complete – going in with '+names+'.');
  toast('Going in together · '+roster.length+' of you','l');
  MUSTER_ROSTER=roster;
  S.muster=null;save();pushPlayer();
  enterRaid(r,!raidNear(r));
}
let MUSTER_ROSTER=null;
function renderMuster(){
  const el=$('#musterCard');if(!el)return;
  // an invitation from somebody else that I have not accepted yet
  if(!S.muster){
    const me=musterMe();let inv=null;
    for(const f of (typeof friends!=='undefined'?friends:[])){
      const fm=f.pub&&f.pub.muster;
      if(!fm||!fm.id||fm.started)continue;
      if((f.handle||'').toLowerCase()===me)continue;
      if(!partyHandles().includes((f.handle||'').toLowerCase()))continue;
      if(fm.endsAt&&fm.endsAt<=Date.now())continue;
      if((S.raidsDone||{})[fm.id])continue;
      if((fm.at||0)+MUSTER_WINDOW<=Date.now())continue;
      inv={fm,from:(f.pub&&f.pub.name)||f.handle};break;
    }
    if(!inv){el.hidden=true;return;}
    el.hidden=false;el.className='card blood';
    const left=Math.max(0,Math.round(((inv.fm.at||0)+MUSTER_WINDOW-Date.now())/1000));
    el.innerHTML='<h2>\u{1F4E3} '+esc(inv.from)+' is calling the party</h2>'
      +'<p><b style="color:var(--bone)">'+esc(inv.fm.boss||'A raid')+'</b> · tier '+inv.fm.tier+' at '+esc(inv.fm.n||'')+'</p>'
      +'<p class="help">Nobody goes in until everyone is ready. <b>'+left+'s</b> left.</p>'
      +'<div class="grid2" style="margin-top:10px">'
      +'<button class="btn ghost" onclick="S.callsHidden=(S.callsHidden||[]).concat([\''+esc(inv.fm.id)+'\']);save();render()">Not now</button>'
      +'<button class="btn r" onclick="musterAccept(\''+esc(inv.fm.id)+'\')">Join the muster</button></div>';
    return;
  }
  const m=S.muster,rows=musterAll()||[];
  el.hidden=false;el.className='card blood';
  const left=Math.max(0,Math.round((musterDeadline()-Date.now())/1000));
  const readyN=rows.filter(r=>r.ready).length;
  el.innerHTML='<h2>\u{1F4E3} Muster <span class="sub">tier '+m.tier+'</span></h2>'
    +'<p><b style="color:var(--bone)">'+esc(m.boss||'')+'</b> · '+esc(m.n||'')+'</p>'
    +'<div class="row" style="margin-top:8px;flex-wrap:wrap">'
    +rows.map(r=>'<span class="chip'+(r.ready?' a':'')+'">'+(r.ready?'✓ ':'… ')+esc(r.name)+(r.host?' (host)':'')+'</span>').join('')
    +'</div>'
    +'<p class="help" style="margin-top:8px">'
    +(rows.length<2
      ? '<b>Waiting for your party to see this.</b> Nobody has picked it up yet · going in '+left+'s if nobody does.'
      : '<b>'+readyN+' of '+rows.length+' ready</b> · going in '
        +(readyN===rows.length?'now':'in '+left+'s whatever happens')+'. Nobody starts before the rest.')
    +'</p>'
    +'<div class="grid2" style="margin-top:10px">'
    +'<button class="btn ghost" onclick="musterLeave()">Leave</button>'
    +(m.ready?'<button class="btn" disabled>Ready – waiting</button>'
             :'<button class="btn r" onclick="musterReady()">Ready</button>')
    +'</div>';
}

/* ================= SQUAD RAIDS (v6.63) =================
   Her ask: the people she actually walks with should be able to fight the same
   raid together, taking turns, "that way it's not as hard."

   No new SQL. boss_hit already returns `hits` - a map of handle -> total damage
   on this raid - on every single sync. So a squadmate announces themselves by
   the only thing that could possibly matter: landing a hit. A handle whose
   number GOES UP while she is in the fight is someone swinging beside her right
   now. An hour-old entry never counts, because only the CHANGE counts, which
   means presence needs no table, no heartbeat and no timeout.

   What being in a squad changes, on each client independently:
     - The boss's swings rotate. Two of you and the rounds alternate: one is
       hers to eat, the next it turns on her squadmate. Incoming damage divides
       by the size of the squad. That is the whole ask.
     - Her health bar drops live as her friends chip it, their hits named in the
       log, instead of a bar that looks frozen until the fight ends.
     - Going down while a squadmate is still up is NOT a death. They drag her
       out. Pack, gear and scrap all stay.

   Every client applies the split to itself, so nothing has to be arbitrated
   between them: there is no turn that can time out, and putting the phone down
   cannot stall anybody else's fight. That is the trade that makes this work
   over a polling connection instead of real netcode. */
const SQUAD_FRESH=210000;                  // a mate is "still in it" 3.5 min after their last hit
const SQUAD={on:false,base:{},mates:{},seen:{},timer:0,r:null,posted:0};
function squadMe(){const o=(typeof O==='function')?O():null;return ((o&&o.handle)||'').toLowerCase();}
function squadStart(r,st){
  squadStop();
  SQUAD.on=true;SQUAD.r=r;SQUAD.mates={};SQUAD.seen={};SQUAD.posted=0;
  SQUAD.base=(st&&st.hits)?Object.assign({},st.hits):{};
  // A MUSTERED raid knows its roster before a single blow lands, so the squad is
  // real from round one. Without this the split only began once a squadmate's
  // damage was first seen on the board - up to 6 s in, and the rounds before it
  // were fought alone. That delay is what "they join too late" felt like from
  // inside the fight, even after the reporting was fixed.
  if(typeof MUSTER_ROSTER!=='undefined'&&MUSTER_ROSTER&&MUSTER_ROSTER.length>1){
    const me=squadMe();const now=Date.now();
    for(const p of MUSTER_ROSTER){
      if(p.handle===me)continue;
      SQUAD.mates[p.handle]={name:p.name,last:now,dmg:0,mustered:true};
    }
    C.roster=MUSTER_ROSTER.map(p=>p.handle);
    C.turnOf=C.roster.indexOf(me);
  }
  MUSTER_ROSTER=null;
  SQUAD.timer=setInterval(squadPoll,6000);
}
function squadStop(){if(SQUAD.timer)clearInterval(SQUAD.timer);SQUAD.timer=0;SQUAD.on=false;SQUAD.r=null;}
/* v7.5 - SQUAD PRESENCE COULD NOT ARRIVE UNTIL THE OTHER PERSON HAD FINISHED.
   v6.63 built presence on "a handle whose damage goes up while you are fighting
   is someone swinging beside you", which is a good mechanic and was never able
   to fire: the ONLY call that posted damage was liveRaidAfter(), at the end of
   the fight. So each client hammered the boss locally for minutes and told the
   server nothing until it was over. Her report, exactly:
     "he actually ended up coming in the raid really late ... he also completed
      it already. So I think when he completed it, then I saw him join."
   The poll now sends the damage done since the last poll, so the shared bar and
   everyone's hit counter move every 6 seconds while the fight is happening. */
async function squadPoll(){
  if(!SQUAD.on||typeof C==='undefined'||!C||C.over||C.where!=='liveraid'){squadStop();return;}
  const send=Math.max(0,Math.round((C.myDealt||0)-(SQUAD.posted||0)));
  const res=await raidSync(SQUAD.r,send);
  if(res&&!res.error){
    if(send>0)SQUAD.posted=(SQUAD.posted||0)+send;   // only bank it once the server took it
    squadApply(res);
  }
}
function squadName(h){
  const f=(typeof friends!=='undefined'?friends:[]||[]).find(x=>(x.handle||'').toLowerCase()===h);
  return (f&&((f.pub&&f.pub.name)||f.name||f.handle))||h;
}
function squadApply(res){
  if(!C||C.over)return;
  const me=squadMe(),now=Date.now(),hits=res.hits||{};let news=false;
  for(const h in hits){
    if(h===me)continue;
    const was=(SQUAD.seen[h]!==undefined)?SQUAD.seen[h]:(SQUAD.base[h]||0);
    const d=Math.max(0,(hits[h]|0)-was);
    SQUAD.seen[h]=hits[h]|0;
    if(d<=0)continue;
    const m=SQUAD.mates[h]||(SQUAD.mates[h]={dmg:0,last:0,name:h});
    const first=!m.last;
    m.dmg+=d;m.last=now;m.name=squadName(h);
    clog(m.name+' hits '+((SQUAD.r&&SQUAD.r.boss)||'it')+' for '+d+'.','good');
    if(first){clog(m.name+' is in the fight with you. It has to split its attention now.','sys');
      if(typeof toast==='function')toast(m.name+' joined your raid','l');}
    news=true;
  }
  // Pull the shared bar down to what the server says is left, minus the damage
  // she has done in this fight but not yet posted. Never let it go back UP: a
  // poll that crosses her own swing would otherwise heal the boss on screen.
  const boss=C.enemies.find(e=>e.warden);
  if(boss&&res.max>0){
    // Only the damage the server has NOT been told about yet. Subtracting the
    // full myDealt once the poll started posting would take it off twice and
    // the bar would fall at double speed - the same trap liveRaidAfter names.
    const unposted=Math.max(0,(C.myDealt||0)-(SQUAD.posted||0));
    const hp=Math.max(0,Math.round(boss.max*(Math.max(0,res.hp)/res.max))-unposted);
    if(hp<boss.hp){boss.hp=hp;news=true;}
    if(boss.hp<=0&&!boss.dead){boss.dead=true;boss.hp=0;clog('Between you, it goes down.','good');}
  }
  if(news&&typeof renderCombat==='function')renderCombat();
}
function squadLive(){if(!SQUAD.on)return [];const now=Date.now();
  return Object.keys(SQUAD.mates).filter(h=>now-SQUAD.mates[h].last<SQUAD_FRESH).sort();}
function squadSize(){return 1+squadLive().length;}
// Whose round is this? Round one is hers, then it goes round the squad. Each
// client runs its own rotation - they do not need to agree, they only need to
// each be taking one round in N.
function squadTarget(){
  const live=squadLive();if(!live.length)return null;
  const idx=(Math.max(1,C.turn)-1)%(live.length+1);
  if(idx===0)return null;
  const m=SQUAD.mates[live[idx-1]];
  return (m&&m.name)||live[idx-1];
}
/* v7.1 - "LANDING A HIT ONLY IS CONFUSING", AND SHE IS RIGHT. Presence before
   the fight already existed: entering a raid sets S.raidCur and pushes it, so
   the raid card lists who is "In there now" before you commit. But the strip
   INSIDE the fight was built purely on confirmed damage, so it read
   "Fighting alone" while your friend was standing right beside you with their
   first swing still loading. The only thing that told you a squad had formed
   was a hit landing - which is the mechanic she called confusing.
   The board knows they are there. Show it.
   The turn rotation stays hit-based on purpose: a mate who is present but has
   not swung (walked off, phone in a pocket) must not halve her incoming damage,
   and the strip now says so in as many words instead of leaving it a mystery. */
function squadHere(){
  if(!SQUAD.on||!SQUAD.r||typeof raidHere!=='function')return [];
  const swinging=new Set(squadLive().map(h=>String(SQUAD.mates[h].name||h).toLowerCase()));
  try{return raidHere(SQUAD.r).filter(n=>!swinging.has(String(n).toLowerCase()));}catch(e){return [];}
}
function squadStrip(){
  if(!SQUAD.on)return '';
  const live=squadLive(), here=squadHere();
  if(!live.length){
    if(here.length){
      const w=here.map(n=>'<span class="chip">'+esc(n)+'</span>').join('');
      return '<div class="squad"><div class="row"><span class="chip l">In here with you</span>'+w+'</div>'
        +'<div class="help" style="margin-top:4px">'+(here.length===1?esc(here[0])+' is':'They are')+' in this raid but '
        +(here.length===1?'has':'have')+' not swung yet. <b>The moment '+(here.length===1?'they land a hit':'one of them lands a hit')
        +' it starts taking turns</b> and stops coming for you every round.</div></div>';
    }
    return '<div class="help" style="margin-top:6px">Fighting alone. If a friend joins this raid you will take turns and it will hit half as often.</div>';
  }
  const who=live.map(h=>esc(SQUAD.mates[h].name)+' <b>'+fmt(SQUAD.mates[h].dmg)+'</b>');
  const t=squadTarget();
  return '<div class="squad"><div class="row"><span class="chip l">Squad of '+(live.length+1)+'</span>'+who.map(w=>'<span class="chip">'+w+'</span>').join('')
    +here.map(n=>'<span class="chip" style="opacity:.6">'+esc(n)+' · not swung</span>').join('')+'</div>'
    +'<div class="help" style="margin-top:4px">'+(t?'This round it turns on <b>'+esc(t)+'</b>.':'This round it comes for <b>you</b>.')
    +(here.length?' <span style="opacity:.75">'+esc(here.join(', '))+' will join the rotation once '+(here.length===1?'they hit':'they hit')+' it.</span>':'')
    +'</div></div>';
}
// Who the board says is standing in this raid right now - so she can see the
// squad forming BEFORE she commits to the fight.
function raidHere(r){
  const now=Date.now(),me=squadMe();
  return (typeof friends!=='undefined'?friends:[]||[]).filter(f=>{
    const q=f.pub&&f.pub.raiding;
    return q&&q.id===r.id&&(now-q.at)<25*60000&&(f.handle||'').toLowerCase()!==me;
  }).map(f=>(f.pub&&f.pub.name)||f.handle);
}
// Going down with a friend still swinging. They drag you out; it costs nothing.
function squadDown(){
  const names=squadLive().map(h=>SQUAD.mates[h].name);
  const who=names.length>1?names.slice(0,-1).join(', ')+' and '+names[names.length-1]:(names[0]||'Your squad');
  C.over=true;S.combat=false;buffClear();SFX.play('hurt');
  liveRaidAfter(false);
  squadStop();
  S.hp=Math.max(1,Math.round(maxHp()*0.35));
  log(who+' dragged you out of the raid before it finished you. You lost nothing.');
  C=null;save();render();
  openSheet('<h2>They pulled you out</h2><div class="big">'+ART.avatarSVG(S.av,70,{mood:'dead'})+'</div>'
    +'<p><b>'+esc(who)+'</b> got you clear before it finished you. You are out of this raid, but the damage you did stays on its health bar, and you kept your pack, your gear and your scrap.</p>'
    +'<p class="help">Going down alone costs you a lot. Going down with someone there costs you nothing - that is what a squad is for.</p>'
    +'<button class="btn r wide" onclick="closeSheet()">Get up</button>');
}
