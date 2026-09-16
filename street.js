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
function streetState(){if(!S.street)S.street={looted:{},visits:0};return S.street;}
function reachRadius(){const acc=STREET.pos&&STREET.pos.acc||20;return Math.min(70,Math.max(35,acc+15));}

/* ---------- open / close ---------- */
function streetStart(){
  if(typeof L==='undefined'){toast('The map library did not load. Check your connection.','d');return;}
  if(!navigator.geolocation){toast('This browser has no location access.','d');return;}
  STREET.on=true;
  document.querySelectorAll('.view').forEach(v=>v.classList.toggle('on',v.id==='v-map'));document.querySelectorAll('.nav button').forEach(x=>x.classList.remove('on'));
  $('#v-map').appendChild($('#locCard'));
  if(!STREET.map){
    STREET.map=L.map('map',{zoomControl:false,attributionControl:true}).setView([40.71,-74.0],17);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',{maxZoom:19,subdomains:'abcd',attribution:'&copy; OpenStreetMap &copy; CARTO'}).addTo(STREET.map);
  }
  setTimeout(()=>{STREET.map.invalidateSize();if(STREET.pos)STREET.map.setView([STREET.pos.lat,STREET.pos.lon],17);},50);
  $('#mapStatus').textContent=STREET.pos?STREET.pois.length+' places nearby':'Finding you...';
  if(navigator.wakeLock)navigator.wakeLock.request('screen').then(w=>STREET.wake=w).catch(()=>{});
  STREET.watch=navigator.geolocation.watchPosition(onPos,e=>{STREET.err=e.message;$('#mapStatus').textContent=e.code===1?'Location is blocked. Allow it for this site in Settings > Safari > Location (or the site settings) and reopen.':'Waiting for GPS: '+e.message;},{enableHighAccuracy:true,maximumAge:5000,timeout:20000});
  STREET.timer=setInterval(zombieTick,4000);
  render();
}
function streetStop(){
  STREET.on=false;if(STREET.watch!==null){navigator.geolocation.clearWatch(STREET.watch);STREET.watch=null;}
  clearInterval(STREET.timer);if(STREET.wake){try{STREET.wake.release();}catch(e){}STREET.wake=null;}
  $('#v-street').insertBefore($('#locCard'),$('#raidCard'));
  document.querySelectorAll('.view').forEach(v=>v.classList.toggle('on',v.id==='v-street'));document.querySelectorAll('.nav button').forEach(x=>x.classList.toggle('on',x.dataset.v==='street'));
  render();
}

/* ---------- position ---------- */
function onPos(p){
  const pos={lat:p.coords.latitude,lon:p.coords.longitude,acc:p.coords.accuracy||20};const first=!STREET.pos;STREET.pos=pos;
  if(!STREET.me){STREET.me=L.marker([pos.lat,pos.lon],{icon:L.divIcon({className:'me-icon',html:ART.avatarSVG(S.av,44),iconSize:[44,57],iconAnchor:[22,54]}),zIndexOffset:1000}).addTo(STREET.map);
    STREET.accC=L.circle([pos.lat,pos.lon],{radius:pos.acc,color:'#8fb3c9',weight:1,fillOpacity:.08}).addTo(STREET.map);}
  else{STREET.me.setLatLng([pos.lat,pos.lon]);STREET.accC.setLatLng([pos.lat,pos.lon]).setRadius(pos.acc);}
  if(first){STREET.map.setView([pos.lat,pos.lon],17);spawnZombies(true);}
  if(!STREET.lastFetch||geoDist(STREET.lastFetch,pos)>250)fetchPois(pos);else if(STREET.pois.length)$('#mapStatus').textContent=STREET.pois.length+' places nearby';
  drawBase();updateMarkers();renderStreet();
}

/* ---------- places from OpenStreetMap ---------- */
async function fetchPois(pos){
  STREET.lastFetch=pos;const cell=(Math.round(pos.lat/0.004)*0.004).toFixed(3)+','+(Math.round(pos.lon/0.004)*0.004).toFixed(3);
  try{const c=JSON.parse(localStorage.getItem('dm.pois.'+cell)||'null');if(c&&Date.now()-c.t<7*86400000){STREET.pois=c.pois;updateMarkers();$('#mapStatus').textContent=STREET.pois.length+' places nearby';return;}}catch(e){}
  $('#mapStatus').textContent='Looking up the buildings around you...';
  const q=`[out:json][timeout:25];(nwr(around:350,${pos.lat},${pos.lon})[amenity~"^(pharmacy|police|fuel|hospital|clinic|doctors|dentist|veterinary|fast_food|restaurant|cafe|bar|pub|ice_cream|school|college)$"];nwr(around:350,${pos.lat},${pos.lon})[shop~"^(supermarket|convenience|grocery|greengrocer|bakery|deli|hardware|doityourself|sports|hunting|weapons|outdoor)$"];nwr(around:400,${pos.lat},${pos.lon})[leisure=park];way(around:220,${pos.lat},${pos.lon})[building~"^(house|residential|apartments|detached|semidetached_house|terrace|yes|bungalow)$"];);out center 140;`;
  try{
    const r=await fetch('https://overpass-api.de/api/interpreter',{method:'POST',body:'data='+encodeURIComponent(q),headers:{'Content-Type':'application/x-www-form-urlencoded'}});
    const j=await r.json();const pois=[];
    for(const el of j.elements||[]){const lat=el.lat||(el.center&&el.center.lat),lon=el.lon||(el.center&&el.center.lon);if(lat==null)continue;const tg=el.tags||{};
      let kind=POI_KIND[tg.amenity]||POI_KIND[tg.shop]||(tg.leisure==='park'?POI_KIND.park:null);let housey=false;
      if(!kind){if(tg.building&&HOUSE_KINDS.includes(tg.building)){kind=[tg.building==='apartments'?'house':'house',tg.building==='apartments'?'🏢':'🏠'];housey=true;}else continue;}
      const name=tg.name||tg.brand||(housey?(tg['addr:housenumber']&&tg['addr:street']?tg['addr:housenumber']+' '+tg['addr:street']:(tg.building==='apartments'?'Apartment building':'House'))+'':kind[0]);
      pois.push({id:el.type+'/'+el.id,lat,lon,t:kind[0],e:kind[1],n:name.slice(0,40),house:housey});}
    // keep every real business, plus the nearest 40 houses
    const biz=pois.filter(p=>!p.house);const houses=pois.filter(p=>p.house).sort((a,b)=>geoDist(a,pos)-geoDist(b,pos)).slice(0,40);
    STREET.pois=biz.concat(houses);
    try{localStorage.setItem('dm.pois.'+cell,JSON.stringify({t:Date.now(),pois:STREET.pois}));}catch(e){}
    $('#mapStatus').textContent=STREET.pois.length+' places nearby';
  }catch(e){$('#mapStatus').textContent='Could not load the buildings around you (no connection?). Try Refresh.';}
  updateMarkers();
}
function poiState(p){const st=streetState();const t=st.looted[p.id];if(t&&Date.now()-t<24*3600000)return 'looted';if(!STREET.pos)return 'far';return geoDist(p,STREET.pos)<=reachRadius()?'near':'far';}
function updateMarkers(){
  if(!STREET.map)return;const seen=new Set();
  for(const p of STREET.pois){seen.add(p.id);const st=poiState(p);const html=`<div class="poi ${st}${p.t==='stronghold'?' sh':''}"><span>${p.e}</span></div>`;
    if(!STREET.markers[p.id]){const m=L.marker([p.lat,p.lon],{icon:L.divIcon({className:'poi-wrap',html,iconSize:[34,34],iconAnchor:[17,17]})}).addTo(STREET.map);m.on('click',()=>tapPoi(p.id));STREET.markers[p.id]=m;}
    else STREET.markers[p.id].setIcon(L.divIcon({className:'poi-wrap',html,iconSize:[34,34],iconAnchor:[17,17]}));}
  for(const id of Object.keys(STREET.markers)){if(!seen.has(id)){STREET.map.removeLayer(STREET.markers[id]);delete STREET.markers[id];}}
  const near=STREET.pois.filter(p=>poiState(p)==='near').length;const n=$('#mapNear');if(n)n.textContent=near?near+' within reach':'Walk toward a marker';
}
function drawBase(){if(!S.base||!S.base.geo||!STREET.map)return;if(!STREET.baseMarker){STREET.baseMarker=L.marker([S.base.geo.lat,S.base.geo.lon],{icon:L.divIcon({className:'poi-wrap',html:'<div class="poi base"><span>🏚️</span></div>',iconSize:[40,40],iconAnchor:[20,20]})}).addTo(STREET.map);}else STREET.baseMarker.setLatLng([S.base.geo.lat,S.base.geo.lon]);}

/* ---------- looting a real place ---------- */
function tapPoi(id){
  const p=STREET.pois.find(x=>x.id===id);if(!p)return;const st=poiState(p);
  if(S.loc&&S.loc.geo!==id){toast('Finish or leave '+S.loc.n+' first');return;}
  if(st==='looted'){const t=streetState().looted[id];const h=Math.ceil((24*3600000-(Date.now()-t))/3600000);toast(p.n+' is picked clean. Resets in '+h+'h');return;}
  if(st==='far'){toast(p.n+': walk closer ('+Math.round(geoDist(p,STREET.pos))+' m)');return;}
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
function renderStreet(){
  if(!STREET.on)return;const hd=homeDistance();
  const el=$('#mapInfo');if(!el)return;
  el.innerHTML=`<span class="chip s">GPS ±${STREET.pos?Math.round(STREET.pos.acc):'?'} m</span><span class="chip" id="mapNear">${(n=>n?n+' within reach':'Walk toward a marker')(STREET.pois.filter(p=>poiState(p)==='near').length)}</span>${hd!==null?`<span class="chip a">Home ${Math.round(hd)} m</span>`:'<span class="chip">No home set</span>'}<span class="chip d">${STREET.zombies.length} on the street</span>`;
}
