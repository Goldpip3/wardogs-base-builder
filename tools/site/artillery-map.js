/* The interactive map for /artillery/: a vector map in the game's own coordinates, with
   the gun and the target as draggable markers and the weapon's reach drawn as rings.

   Everything drawn here comes from data/: the firing tables and envelopes from
   artillery.json, the bounds, towers and spawn zones from artillery-maps.json. There is
   no terrain imagery on purpose. Other community sites render captured tiles; those are
   their assets and the game's, not ours. Positions are facts and the drawing is ours, so
   the map is grid, bounds, zones and markers, which is everything a firing solution needs.

   The script below is built inside a template literal, so it must contain no backslash
   and no dollar-brace: an escape written here would be eaten at this layer instead of
   shipping to the page, which is the exact bug that once broke sign-in. That is why there
   are no regexes and no template literals in the client code, and why the degree sign is
   an HTML entity. tools/check-build.js parses the shipped result on every build. */

module.exports = ctx => {
  const { esc, ARTILLERY, ARTILLERY_MAPS } = ctx;
  const A = ARTILLERY;

  const platforms = A.platforms.map(p => ({
    id: p.id, name: p.name, minRange: p.minRange, maxRange: p.maxRange,
    moa: p.moa, table: p.table || null, tableLow: p.tableLow || null,
    tableHigh: p.tableHigh || null, lowArcFrom: p.lowArcFrom || null,
    reloadSeconds: p.reloadSeconds, roundCost: p.roundCost,
  }));

  const maps = ARTILLERY_MAPS.maps.map(m => ({
    id: m.id, name: m.name, extent: m.extentUnits, bounds: m.bounds,
    towers: m.towers, spawns: m.spawns, tiles: m.tiles || null,
  }));

  const html =
    '<style>' +
    '.amap{display:grid;grid-template-columns:300px 1fr;gap:1px;background:var(--line);' +
    'border:1px solid var(--line);margin-top:26px}' +
    '@media(max-width:900px){.amap{grid-template-columns:1fr}}' +
    '.amap-side{background:var(--panel);padding:18px;display:flex;flex-direction:column;gap:14px}' +
    '.amap-stage{background:#0a0a0a;position:relative;min-height:420px}' +
    '.amap-stage canvas{display:block;width:100%;height:100%;cursor:crosshair;touch-action:none}' +
    '.amap-hint{position:absolute;left:10px;bottom:8px;font-size:11px;color:var(--dim);' +
    'font-family:var(--num);pointer-events:none}' +
    '.amap-status{font-family:var(--num);font-size:12px;padding:6px 10px;border:1px solid var(--line2)}' +
    '.amap-row{display:flex;gap:8px;flex-wrap:wrap}' +
    '.amap-side input{width:100%;padding:8px;background:var(--panel2);color:var(--text);' +
    'border:1px solid var(--line2);font-family:var(--num)}' +
    '.amap-side label{flex:1;min-width:90px;font-size:12px;color:var(--dim2)}' +
    '.amap-btn{background:var(--panel2);color:var(--dim2);border:1px solid var(--line2);' +
    'cursor:pointer;font-family:var(--ui);font-size:11px;text-transform:uppercase;' +
    'letter-spacing:.08em;padding:8px 12px}' +
    '.amap-btn:hover{color:var(--text);background:var(--line)}' +
    '.amap-btn[aria-pressed="true"]{background:var(--red);border-color:var(--red);color:#fff}' +
    '</style>' +

    '<div class="amap" id="amap">' +
    '<div class="amap-side">' +
    '<div class="chips" style="margin:0">' +
    maps.map((m, i) =>
      '<button class="chip" data-map="' + esc(m.id) + '" aria-pressed="' +
      (i === 0 ? 'true' : 'false') + '">' + esc(m.name) + '</button>').join('') +
    '</div>' +
    '<div id="amap-status" class="amap-status">Place the gun</div>' +
    '<div class="amap-row">' +
    '<button class="amap-btn" id="pick-gun" aria-pressed="true">Artillery</button>' +
    '<button class="amap-btn" id="pick-tgt" aria-pressed="false">Target</button>' +
    '</div>' +
    '<div class="amap-row">' +
    '<label>Gun X<input id="gunx" type="number" step="0.01"></label>' +
    '<label>Gun Y<input id="guny" type="number" step="0.01"></label>' +
    '</div>' +
    '<div class="amap-row">' +
    '<label>Target X<input id="tgtx" type="number" step="0.01"></label>' +
    '<label>Target Y<input id="tgty" type="number" step="0.01"></label>' +
    '</div>' +
    '<div class="empty" id="sol" style="text-align:left;padding:16px"></div>' +
    '<div class="amap-row">' +
    '<button class="amap-btn" id="amap-fit">Fit map</button>' +
    '<button class="amap-btn" id="amap-swap">Swap</button>' +
    '<button class="amap-btn" id="amap-reset">Reset</button>' +
    '<button class="amap-btn" id="amap-share">Copy link</button>' +
    '</div>' +
    '<p class="fine" style="margin:0">Solid ring is maximum range, dashed is the dead zone' +
    ' inside minimum range. The faint third ring on the SPH-2 is where the low arc starts' +
    ' reaching. Coordinates are the X/Y the game shows you.</p>' +
    '</div>' +
    '<div class="amap-stage" id="amap-stage"><canvas id="amap-canvas"></canvas>' +
    '<div class="amap-hint">click to place &middot; drag markers &middot; scroll to zoom' +
    ' &middot; drag map to pan</div>' +
    '</div></div>';

  /* No backslash, no dollar-brace below: see the header comment. */
  const script = '<script>(function(){' +
    '"use strict";' +
    'var P=' + JSON.stringify(platforms) + ';' +
    'var MAPS=' + JSON.stringify(maps) + ';' +
    'var UNIT=' + A.grid.unitMetres + ';' +
`
var cur=P[0], map=MAPS[0];
var gun=null, tgt=null, active="gun";
var cam={x:0,y:0,k:5};
var canvas=document.getElementById("amap-canvas");
var stage=document.getElementById("amap-stage");
var g2=canvas.getContext("2d");
function el(id){return document.getElementById(id);}

/* ---------- firing solution ---------- */
/* Interpolation only ever walks between two adjacent measured rows. desc is the mortar
   and the high arc, where more elevation is less range; asc is the low arc. */
function dialDesc(d,t){
 if(!t||!t.length||d>t[0].dist||d<t[t.length-1].dist)return null;
 for(var i=0;i<t.length-1;i++){var a=t[i],b=t[i+1];
  if(d<=a.dist&&d>=b.dist){var r=a.dist-b.dist;
   return a.mils+(r>0?(a.dist-d)/r:0)*(b.mils-a.mils);}}
 return null;}
function dialAsc(d,t){
 if(!t||!t.length||d<t[0].dist||d>t[t.length-1].dist)return null;
 for(var i=0;i<t.length-1;i++){var a=t[i],b=t[i+1];
  if(d>=a.dist&&d<=b.dist){var r=b.dist-a.dist;
   return a.mils+(r>0?(d-a.dist)/r:0)*(b.mils-a.mils);}}
 return null;}
function onRow(t,mm){if(!t)return false;
 for(var i=0;i<t.length;i++)if(t[i].mils===mm)return true;return false;}
function spreadAt(d){return d*(cur.moa/60)*Math.PI/180;}

function line(k,v,note){
 return "<tr><td>"+k+"</td><td class=n><b>"+v+"</b>"+
  (note?" <span class=fine>"+note+"</span>":"")+"</td></tr>";}
function dialLine(label,m,t){
 var mm=Math.round(m);
 return line(label,mm+" mil",
  onRow(t,mm)?"a measured point":"interpolated between two measured points");}

function solution(){
 var box=el("sol"), status=el("amap-status");
 if(!gun||!tgt){
  box.innerHTML="<h3 style='margin:0'>Waiting on two points</h3>"+
   "<p class=fine style='margin:8px 0 0'>Click the map or type coordinates. Artillery"+
   " first, then the target.</p>";
  status.textContent=gun?"Place the target":"Place the gun";
  status.style.color="";return;}
 var dx=(tgt.x-gun.x)*UNIT, dy=(tgt.y-gun.y)*UNIT;
 var dist=Math.sqrt(dx*dx+dy*dy);
 var az=(Math.atan2(dx,dy)*180/Math.PI+360)%360;
 var rows=line("Bearing",az.toFixed(1)+"&deg;","from north");
 rows+=line("Range",Math.round(dist)+" m");
 var warn="";
 if(dist<cur.minRange){
  rows+=line("Dial","no solution","inside the dead zone");
  warn="That is "+Math.round(cur.minRange-dist)+" m inside the closest this gun can"+
   " drop a round. No elevation reaches it. Move the gun.";
  status.textContent="DEAD ZONE";status.style.color="var(--red-hot)";
 } else if(dist>cur.maxRange){
  rows+=line("Dial","no solution","out of range");
  warn="Target is "+Math.round(dist-cur.maxRange)+" m beyond maximum range.";
  status.textContent="OUT OF RANGE";status.style.color="var(--red-hot)";
 } else {
  status.textContent="IN RANGE  "+Math.round(dist)+" m";status.style.color="var(--good)";
  if(cur.table){
   var m=dialDesc(dist,cur.table);
   if(m===null)rows+=line("Dial","no solution");
   else rows+=dialLine("Dial",m,cur.table);
  } else if(cur.tableLow||cur.tableHigh){
   var lo=dialAsc(dist,cur.tableLow), hi=dialDesc(dist,cur.tableHigh);
   if(lo!==null)rows+=dialLine("Dial, low arc",lo,cur.tableLow);
   if(hi!==null)rows+=dialLine("Dial, high arc",hi,cur.tableHigh);
   if(lo===null&&hi===null)rows+=line("Dial","no solution");
   else if(lo===null)warn="Inside "+cur.lowArcFrom+" m only the high arc reaches."+
    " It hangs longer, so lead a moving target accordingly.";
  } else {
   rows+=line("Dial","not published","see below");
  }
 }
 rows+=line("Spread","&plusmn;"+spreadAt(dist).toFixed(1)+" m","at "+cur.moa+" MOA");
 rows+=line("Reload",cur.reloadSeconds+" s","$"+cur.roundCost+" a round");
 box.innerHTML="<h3 style='margin:0 0 12px'>Firing solution</h3>"+
  "<table style='margin:0'><tbody>"+rows+"</tbody></table>"+
  (warn?"<p class=fine style='margin:14px 0 0;color:var(--red-hot)'>"+warn+"</p>":"");
}

/* ---------- camera ---------- */
function w2sX(x){return (x-cam.x)*cam.k+canvas.clientWidth/2;}
function w2sY(y){return canvas.clientHeight/2-(y-cam.y)*cam.k;}
function s2wX(sx){return (sx-canvas.clientWidth/2)/cam.k+cam.x;}
function s2wY(sy){return cam.y-(sy-canvas.clientHeight/2)/cam.k;}
function fit(){
 var b=map.bounds,w=canvas.clientWidth,h=canvas.clientHeight;
 cam.x=(b.minX+b.maxX)/2;cam.y=(b.minY+b.maxY)/2;
 cam.k=Math.min(w/(b.maxX-b.minX+8),h/(b.maxY-b.minY+8));
 draw();}

/* ---------- terrain tiles ----------
   Optional, and absent ships a vector map rather than a broken one. A map gains imagery
   by getting a tiles block in data/artillery-maps.json and a pyramid under docs/; until
   then every draw below runs unchanged.

   The scheme is the ordinary one: zoom Z is a 2^Z square of tiles spanning the map's
   whole extent, so a tile covers extent/2^Z units and row 0 is the north edge. Choosing
   the zoom whose tile is nearest tileSize on screen keeps the imagery near 1:1, so it
   neither blurs nor downloads detail that cannot be seen. */
var TILE={}, TILEBAD={};
/* A pyramid is calibrated to a box in game coordinates, which is not exactly the map
   extent: the imagery was captured against its own edges and lands a few metres off the
   round number. Without bounds the whole layer sits skewed, so it is carried per map and
   falls back to the extent only when absent. */
function tileBox(){
 return map.tiles.bounds||{minX:0,maxX:map.extent,minY:0,maxY:map.extent};}
function tileZoomFor(){
 var t=map.tiles, tb=tileBox();
 var z=Math.round(Math.log((tb.maxX-tb.minX)*cam.k/t.tileSize)/Math.LN2);
 return Math.max(t.minZoom,Math.min(t.maxZoom,z));}
function getTile(z,x,y){
 var key=map.id+":"+z+":"+x+":"+y;
 if(TILEBAD[key])return null;
 var img=TILE[key];
 if(img)return (img.complete&&img.naturalWidth)?img:null;
 img=new Image();
 img.onload=function(){draw();};
 img.onerror=function(){TILEBAD[key]=true;};
 img.src=map.tiles.path+"/zoom_"+z+"/"+x+"_"+y+"."+map.tiles.extension;
 TILE[key]=img;
 return null;}
function drawTiles(){
 if(!map.tiles)return;
 var tb=tileBox();
 var z=tileZoomFor(), n=Math.pow(2,z);
 var sx=(tb.maxX-tb.minX)/n, sy=(tb.maxY-tb.minY)/n;
 var w=canvas.clientWidth,h=canvas.clientHeight;
 var x0=Math.max(0,Math.floor((s2wX(0)-tb.minX)/sx));
 var x1=Math.min(n-1,Math.floor((s2wX(w)-tb.minX)/sx));
 /* tile rows count south from the north edge, world y counts north */
 var y0=Math.max(0,Math.floor((tb.maxY-s2wY(0))/sy));
 var y1=Math.min(n-1,Math.floor((tb.maxY-s2wY(h))/sy));
 for(var x=x0;x<=x1;x++)for(var y=y0;y<=y1;y++){
  var img=getTile(z,x,y);
  if(!img)continue;
  /* +1 closes the hairline seam that rounding leaves between neighbours */
  g2.drawImage(img,w2sX(tb.minX+x*sx),w2sY(tb.maxY-y*sy),
   sx*cam.k+1,sy*cam.k+1);}}

/* ---------- drawing ---------- */
function ring(x,y,rUnits,color,width,dash){
 g2.beginPath();g2.arc(w2sX(x),w2sY(y),rUnits*cam.k,0,Math.PI*2);
 g2.strokeStyle=color;g2.lineWidth=width;g2.setLineDash(dash||[]);
 g2.stroke();g2.setLineDash([]);}
function draw(){
 var w=canvas.clientWidth,h=canvas.clientHeight;
 g2.clearRect(0,0,w,h);
 g2.fillStyle="#0a0a0a";g2.fillRect(0,0,w,h);
 var b=map.bounds;
 if(map.tiles)drawTiles();
 else{
  g2.fillStyle="#121212";
  g2.fillRect(w2sX(b.minX),w2sY(b.maxY),(b.maxX-b.minX)*cam.k,(b.maxY-b.minY)*cam.k);}
 /* the grid has to stay legible over imagery without hiding it */
 var gridMajor=map.tiles?"rgba(255,247,234,.28)":"#242424";
 var gridMinor=map.tiles?"rgba(255,247,234,.12)":"#181818";
 /* grid: a major line every 10 units is a kilometre, a minor every unit is 100 m */
 var x0=Math.floor(s2wX(0)),x1=Math.ceil(s2wX(w)),y0=Math.floor(s2wY(h)),y1=Math.ceil(s2wY(0));
 x0=Math.max(x0,0);y0=Math.max(y0,0);
 x1=Math.min(x1,map.extent);y1=Math.min(y1,map.extent);
 g2.font="10px Cascadia Mono,Consolas,monospace";
 for(var x=x0;x<=x1;x++){
  var major=x%10===0;
  if(!major&&cam.k<14)continue;
  g2.strokeStyle=major?gridMajor:gridMinor;g2.lineWidth=1;
  g2.beginPath();g2.moveTo(w2sX(x),0);g2.lineTo(w2sX(x),h);g2.stroke();
  if(major){g2.fillStyle="rgba(255,247,234,.35)";
   g2.fillText(x.toFixed(0),w2sX(x)+3,h-6);}}
 for(var y=y0;y<=y1;y++){
  var majorY=y%10===0;
  if(!majorY&&cam.k<14)continue;
  g2.strokeStyle=majorY?gridMajor:gridMinor;g2.lineWidth=1;
  g2.beginPath();g2.moveTo(0,w2sY(y));g2.lineTo(w,w2sY(y));g2.stroke();
  if(majorY){g2.fillStyle="rgba(255,247,234,.35)";
   g2.fillText(y.toFixed(0),4,w2sY(y)-3);}}
 /* playable bounds */
 g2.strokeStyle="#3a3a3a";g2.lineWidth=1.5;
 g2.strokeRect(w2sX(b.minX),w2sY(b.maxY),(b.maxX-b.minX)*cam.k,(b.maxY-b.minY)*cam.k);
 /* spawn zones */
 var zoneColors={VALKYRA:"#d4553a",MANTICORE:"#86ad55",LONESTAR:"#6b93b8"};
 g2.font="11px Barlow,system-ui,sans-serif";
 map.spawns.forEach(function(z){
  var c=zoneColors[z.label]||"#888";
  g2.beginPath();
  z.points.forEach(function(p,i){
   if(i===0)g2.moveTo(w2sX(p.x),w2sY(p.y));else g2.lineTo(w2sX(p.x),w2sY(p.y));});
  g2.closePath();
  g2.globalAlpha=.12;g2.fillStyle=c;g2.fill();g2.globalAlpha=1;
  g2.setLineDash([5,4]);g2.strokeStyle=c;g2.lineWidth=1.2;g2.stroke();g2.setLineDash([]);
  var mx=0,my=0;z.points.forEach(function(p){mx+=p.x;my+=p.y;});
  mx/=z.points.length;my/=z.points.length;
  g2.fillStyle=c;g2.textAlign="center";
  g2.fillText(z.label+" spawn",w2sX(mx),w2sY(my));g2.textAlign="left";});
 /* towers */
 map.towers.forEach(function(t){
  var sx=w2sX(t.x),sy=w2sY(t.y);
  g2.fillStyle="rgba(255,247,234,.75)";
  g2.beginPath();g2.moveTo(sx,sy-4);g2.lineTo(sx+4,sy);g2.lineTo(sx,sy+4);
  g2.lineTo(sx-4,sy);g2.closePath();g2.fill();
  if(cam.k>9){g2.fillStyle="rgba(255,247,234,.55)";
   g2.font="10px Cascadia Mono,Consolas,monospace";
   g2.fillText(t.label,sx+7,sy+3);}});
 /* range rings around the gun */
 if(gun){
  var outer=cur.maxRange/UNIT,inner=cur.minRange/UNIT;
  g2.beginPath();
  g2.arc(w2sX(gun.x),w2sY(gun.y),outer*cam.k,0,Math.PI*2);
  g2.arc(w2sX(gun.x),w2sY(gun.y),inner*cam.k,0,Math.PI*2,true);
  g2.globalAlpha=.05;g2.fillStyle="#f30000";g2.fill("evenodd");g2.globalAlpha=1;
  ring(gun.x,gun.y,outer,"rgba(243,0,0,.85)",1.6);
  ring(gun.x,gun.y,inner,"rgba(243,0,0,.7)",1.1,[6,5]);
  if(cur.lowArcFrom)
   ring(gun.x,gun.y,cur.lowArcFrom/UNIT,"rgba(255,247,234,.35)",1,[2,4]);
 }
 /* the shot */
 if(gun&&tgt){
  g2.strokeStyle="rgba(255,247,234,.5)";g2.lineWidth=1;g2.setLineDash([3,4]);
  g2.beginPath();g2.moveTo(w2sX(gun.x),w2sY(gun.y));
  g2.lineTo(w2sX(tgt.x),w2sY(tgt.y));g2.stroke();g2.setLineDash([]);
  var dm=Math.sqrt(Math.pow((tgt.x-gun.x)*UNIT,2)+Math.pow((tgt.y-gun.y)*UNIT,2));
  ring(tgt.x,tgt.y,spreadAt(dm)/UNIT,"rgba(255,247,234,.45)",1,[2,3]);
 }
 if(gun)marker(gun,"#f30000","GUN");
 if(tgt)marker(tgt,"#fff7ea","TGT");
}
function marker(p,color,label){
 var sx=w2sX(p.x),sy=w2sY(p.y);
 g2.strokeStyle=color;g2.lineWidth=1.5;
 g2.beginPath();g2.arc(sx,sy,6,0,Math.PI*2);g2.stroke();
 g2.beginPath();g2.moveTo(sx-9,sy);g2.lineTo(sx-3,sy);g2.moveTo(sx+3,sy);g2.lineTo(sx+9,sy);
 g2.moveTo(sx,sy-9);g2.lineTo(sx,sy-3);g2.moveTo(sx,sy+3);g2.lineTo(sx,sy+9);g2.stroke();
 g2.fillStyle=color;g2.font="10px Cascadia Mono,Consolas,monospace";
 g2.fillText(label,sx+9,sy-8);}

/* ---------- state plumbing ---------- */
function syncInputs(){
 el("gunx").value=gun?gun.x.toFixed(2):"";
 el("guny").value=gun?gun.y.toFixed(2):"";
 el("tgtx").value=tgt?tgt.x.toFixed(2):"";
 el("tgty").value=tgt?tgt.y.toFixed(2):"";}
function writeHash(){
 var parts=["m="+map.id,"w="+cur.id];
 if(gun)parts.push("g="+gun.x.toFixed(2)+","+gun.y.toFixed(2));
 if(tgt)parts.push("t="+tgt.x.toFixed(2)+","+tgt.y.toFixed(2));
 history.replaceState(null,"","#"+parts.join("&"));}
function update(){syncInputs();solution();draw();writeHash();}
function readHash(){
 var h=location.hash.slice(1);if(!h)return;
 h.split("&").forEach(function(kv){
  var i=kv.indexOf("=");if(i<0)return;
  var k=kv.slice(0,i),v=kv.slice(i+1);
  if(k==="m")MAPS.forEach(function(m){if(m.id===v)map=m;});
  if(k==="w")P.forEach(function(p){if(p.id===v)cur=p;});
  if(k==="g"||k==="t"){var xy=v.split(",");
   var x=parseFloat(xy[0]),y=parseFloat(xy[1]);
   if(isFinite(x)&&isFinite(y)){if(k==="g")gun={x:x,y:y};else tgt={x:x,y:y};}}});}

/* ---------- pointer handling ----------
   One pointer does three jobs: drag a marker if it lands on one, pan if it moves off
   empty ground, place a point if it never moves far enough to be a pan. */
var drag=null;
function hit(p,sx,sy){if(!p)return false;
 var dx=w2sX(p.x)-sx,dy=w2sY(p.y)-sy;return dx*dx+dy*dy<144;}
canvas.addEventListener("pointerdown",function(e){
 var r=canvas.getBoundingClientRect(),sx=e.clientX-r.left,sy=e.clientY-r.top;
 canvas.setPointerCapture(e.pointerId);
 if(hit(gun,sx,sy))drag={what:"gun"};
 else if(hit(tgt,sx,sy))drag={what:"tgt"};
 else drag={what:"pan",sx:sx,sy:sy,cx:cam.x,cy:cam.y,moved:false};});
canvas.addEventListener("pointermove",function(e){
 if(!drag)return;
 var r=canvas.getBoundingClientRect(),sx=e.clientX-r.left,sy=e.clientY-r.top;
 if(drag.what==="pan"){
  var dx=sx-drag.sx,dy=sy-drag.sy;
  if(Math.abs(dx)+Math.abs(dy)>4)drag.moved=true;
  if(drag.moved){cam.x=drag.cx-dx/cam.k;cam.y=drag.cy+dy/cam.k;draw();}
 } else {
  var p={x:s2wX(sx),y:s2wY(sy)};
  if(drag.what==="gun")gun=p;else tgt=p;
  syncInputs();solution();draw();}});
canvas.addEventListener("pointerup",function(e){
 if(!drag)return;
 var r=canvas.getBoundingClientRect(),sx=e.clientX-r.left,sy=e.clientY-r.top;
 if(drag.what==="pan"&&!drag.moved){
  var p={x:s2wX(sx),y:s2wY(sy)};
  if(active==="gun"){gun=p;setActive("tgt");}
  else{tgt=p;}
 }
 drag=null;update();});
canvas.addEventListener("wheel",function(e){
 e.preventDefault();
 var r=canvas.getBoundingClientRect(),sx=e.clientX-r.left,sy=e.clientY-r.top;
 var wx=s2wX(sx),wy=s2wY(sy);
 cam.k*=e.deltaY<0?1.2:1/1.2;
 cam.k=Math.max(1,Math.min(cam.k,400));
 cam.x=wx-(sx-canvas.clientWidth/2)/cam.k;
 cam.y=wy+(sy-canvas.clientHeight/2)/cam.k;
 draw();},{passive:false});

/* ---------- controls ---------- */
function setActive(which){active=which;
 el("pick-gun").setAttribute("aria-pressed",which==="gun"?"true":"false");
 el("pick-tgt").setAttribute("aria-pressed",which==="tgt"?"true":"false");}
el("pick-gun").addEventListener("click",function(){setActive("gun");});
el("pick-tgt").addEventListener("click",function(){setActive("tgt");});
el("amap-fit").addEventListener("click",fit);
el("amap-swap").addEventListener("click",function(){
 var t=gun;gun=tgt;tgt=t;update();});
el("amap-reset").addEventListener("click",function(){
 gun=null;tgt=null;setActive("gun");update();fit();});
el("amap-share").addEventListener("click",function(){
 var b=el("amap-share");
 function done(ok){b.textContent=ok?"Copied":"Copy failed";
  setTimeout(function(){b.textContent="Copy link";},1500);}
 if(navigator.clipboard&&navigator.clipboard.writeText)
  navigator.clipboard.writeText(location.href).then(function(){done(true);},
   function(){done(false);});
 else done(false);});
[["gunx","guny","gun"],["tgtx","tgty","tgt"]].forEach(function(io){
 [io[0],io[1]].forEach(function(id){
  el(id).addEventListener("input",function(){
   var x=parseFloat(el(io[0]).value),y=parseFloat(el(io[1]).value);
   if(isFinite(x)&&isFinite(y)){
    var p={x:x,y:y};
    if(io[2]==="gun")gun=p;else tgt=p;
    solution();draw();writeHash();}});});});
Array.prototype.forEach.call(document.querySelectorAll("[data-map]"),function(b){
 b.addEventListener("click",function(){
  Array.prototype.forEach.call(document.querySelectorAll("[data-map]"),function(o){
   o.setAttribute("aria-pressed",o===b?"true":"false");});
  MAPS.forEach(function(m){if(m.id===b.getAttribute("data-map"))map=m;});
  fit();update();});});
Array.prototype.forEach.call(document.querySelectorAll("[data-plat]"),function(b){
 b.addEventListener("click",function(){
  Array.prototype.forEach.call(document.querySelectorAll("[data-plat]"),function(o){
   o.setAttribute("aria-pressed",o===b?"true":"false");});
  var id=b.getAttribute("data-plat");
  P.forEach(function(p){if(p.id===id)cur=p;});
  Array.prototype.forEach.call(document.querySelectorAll("[data-table]"),function(t){
   t.hidden=t.getAttribute("data-table")!==id;});
  update();});});

/* ---------- boot ---------- */
function size(){
 var dpr=window.devicePixelRatio||1;
 var w=stage.clientWidth,h=Math.max(420,Math.min(640,Math.round(w*.62)));
 stage.style.height=h+"px";
 canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);
 g2.setTransform(dpr,0,0,dpr,0,0);}
window.addEventListener("resize",function(){size();fit();});
function applyState(){
 Array.prototype.forEach.call(document.querySelectorAll("[data-map]"),function(b){
  b.setAttribute("aria-pressed",b.getAttribute("data-map")===map.id?"true":"false");});
 Array.prototype.forEach.call(document.querySelectorAll("[data-plat]"),function(b){
  b.setAttribute("aria-pressed",b.getAttribute("data-plat")===cur.id?"true":"false");});
 Array.prototype.forEach.call(document.querySelectorAll("[data-table]"),function(t){
  t.hidden=t.getAttribute("data-table")!==cur.id;});
 if(gun&&tgt)setActive("tgt");}
/* a shared link pasted into a page that is already open still has to land */
window.addEventListener("hashchange",function(){
 readHash();applyState();fit();update();});
readHash();applyState();
size();fit();update();
` + '}());<\/script>';

  return { html, script };
};
