/* The artillery map: a full-screen tool, laid out like the planner.
 *
 * It fills the viewport on arrival because that is what the job needs. A firing solution is
 * read off terrain, and a map squeezed into a column of an article is a map you cannot read.
 * The reference material still sits below it for anyone who scrolls, but the tool is what
 * loads. Same reason the planner is a page and not a widget.
 *
 * Everything drawn comes from data/: firing tables and envelopes from artillery.json, the
 * terrain, towers, spawns and the control zone from artillery-maps.json.
 *
 * The script below is built inside a template literal, so it must contain no backslash and
 * no dollar-brace: an escape written here is eaten at this layer instead of shipping to the
 * page, which is the exact bug that once broke sign-in. That is why there are no regexes
 * and no template literals in the client code, and why degrees are an HTML entity.
 * tools/check-build.js parses the shipped result on every build.
 */

module.exports = ctx => {
  const { esc, ARTILLERY, ARTILLERY_MAPS, adSlot } = ctx;
  const A = ARTILLERY;

  /* The tables' own ends, which is where the stated mil envelope comes from too. Derived
     rather than read off a second field, so there is one place it can be wrong. */
  const milEnds = p => {
    const all = [].concat(p.table || [], p.tableLow || [], p.tableHigh || [])
      .map(r => r.mils);
    return [Math.min.apply(null, all), Math.max.apply(null, all)];
  };

  const platforms = A.platforms.map(p => ({
    id: p.id, name: p.name, minRange: p.minRange, maxRange: p.maxRange,
    table: p.table || null, tableLow: p.tableLow || null,
    tableHigh: p.tableHigh || null, lowArcFrom: p.lowArcFrom || null,
    confidence: p.confidence,
    milFrom: milEnds(p)[0], milTo: milEnds(p)[1],
  }));

  const maps = ARTILLERY_MAPS.maps.map(m => ({
    id: m.id, name: m.name, extent: m.extentUnits, bounds: m.bounds,
    towers: m.towers, spawns: m.spawns, tiles: m.tiles || null,
    zone: m.controlZone || null,
  }));

  /* Empty string when no slot id is configured, and then nothing at all is emitted: no
     wrapper, no reserved height, no gap at the foot of the column. */
  const sideAdUnit = adSlot("artillery");
  const sideAd = sideAdUnit ? '<div class="amap-ad">' + sideAdUnit + "</div>" : "";

  /* The right rail. Same rule: with no id there is no aside, and the body has to go back to
     two columns or the map gets a 300px strip of nothing beside it, so the layout is a class
     rather than a fixed grid. Owner's call, 2026-08-31: the map has width to spare that a
     firing solution does not need, so the spare width earns instead of sitting empty. */
  const railAdUnit = adSlot("artilleryRight");
  const railAd = railAdUnit ? '<aside class="amap-rail">' + railAdUnit + "</aside>" : "";

  const barBtn = (id, label) =>
    '<button class="amap-btn" id="' + id + '">' + label + "</button>";

  /* The browser's own number spinner is a different widget on every engine and looks like
     none of this page on any of them. It is turned off in css.js and these replace it: two
     buttons that call the input's own stepUp and stepDown, so a click still moves one
     hundredth of a unit, the same as the arrow keys and the same as the spinner did. */
  const coord = (id, label) =>
    "<label>" + label + '<span class="amap-num">' +
    '<input id="' + id + '" type="number" step="0.01">' +
    '<span class="amap-spin">' +
    '<button type="button" class="amap-up" data-for="' + id + '" data-dir="1"' +
    ' aria-label="' + label + ' up"></button>' +
    '<button type="button" class="amap-down" data-for="' + id + '" data-dir="-1"' +
    ' aria-label="' + label + ' down"></button>' +
    "</span></span></label>";

  const html =
    '<div class="amap-app" id="amap">' +

    '<div class="amap-bar">' +
    '<div class="chips">' +
    maps.map((m, i) =>
      '<button class="chip" data-map="' + esc(m.id) + '" aria-pressed="' +
      (i === 0 ? "true" : "false") + '">' + esc(m.name) + "</button>").join("") +
    "</div>" +
    '<div class="chips">' +
    A.platforms.map((p, i) =>
      '<button class="chip" data-plat="' + esc(p.id) + '" aria-pressed="' +
      (i === 0 ? "true" : "false") + '">' + esc(p.name) + "</button>").join("") +
    "</div>" +
    '<span class="amap-sep"></span>' +
    barBtn("amap-fit", "Fit") +
    barBtn("amap-zone", "Control zone") +
    barBtn("amap-swap", "Swap") +
    barBtn("amap-reset", "Reset") +
    barBtn("amap-share", "Copy link") +
    '<span class="amap-sep"></span>' +
    '<span class="amap-layers">' +
    /* No Spawns toggle. Where the three factions come in is not a preference about the
       drawing, it is part of reading the map: a gun position is chosen against it, and the
       one thing turning it off achieved was hiding that. It is simply always on. */
    [["terrain", "Terrain"], ["grid", "Grid"], ["zone", "Zone"],
     ["towers", "Towers"]].map(l =>
      '<button class="amap-lay" data-layer="' + l[0] + '" aria-pressed="true">' +
      l[1] + "</button>").join("") +
    "</span>" +
    "</div>" +

    '<div class="amap-body' + (railAd ? " has-rail" : "") + '">' +
    '<aside class="amap-side">' +

    '<div class="amap-pick">' +
    '<button class="amap-btn" id="pick-gun" aria-pressed="true">Artillery</button>' +
    '<button class="amap-btn" id="pick-tgt" aria-pressed="false">Target</button>' +
    "</div>" +

    '<div class="amap-row">' + coord("gunx", "Gun X") + coord("guny", "Gun Y") + "</div>" +
    '<div class="amap-row">' + coord("tgtx", "Target X") + coord("tgty", "Target Y") +
    "</div>" +

    /* The gestures belong beside the inputs they describe, and above the solution rather
       than under it. They used to be pinned to the foot of the column by margin-top:auto,
       which read fine on arrival and then fell off the bottom the moment a solution was
       computed: the solution block roughly triples and the zone note grows with it, so the
       one thing a first-time visitor needed was the first thing to scroll out of reach. */
    '<p class="fine" style="margin:0 0 4px">Left click places, drag moves a marker, scroll' +
    " zooms, drag the map to pan. Solid ring is maximum range, dashed is the dead zone" +
    " inside minimum range.</p>" +

    '<div id="sol" class="amap-sol"></div>' +

    '<div class="amap-note" id="zoneNote"></div>' +

    /* The foot of the column, and margin-top:auto rather than a fixed position, so it takes
       the slack that is there on arrival and is simply pushed down once a solution fills the
       column. That is the right way round: the impression happens on load, before anyone has
       placed a marker, and the tool reclaims the space exactly when it starts needing it. */
    sideAd +
    "</aside>" +

    '<div class="amap-stage" id="amap-stage"><canvas id="amap-canvas"></canvas></div>' +

    /* After the stage in the markup as well as beside it on screen, so that when the grid
       collapses on a narrow window the rail lands under the map rather than between the
       controls and it. */
    railAd +
    "</div>" +

    '<div class="amap-status">' +
    '<span id="amap-cursor">&mdash;</span>' +
    '<span id="amap-range">Place the gun</span>' +
    '<span id="amap-scale"></span>' +
    '<span id="amap-zoom"></span>' +
    "</div>" +
    "</div>";

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
var LAYER={terrain:true,grid:true,zone:true,towers:true};
var canvas=document.getElementById("amap-canvas");
var stage=document.getElementById("amap-stage");
var g2=canvas.getContext("2d");
function el(id){return document.getElementById(id);}

/* ---------- firing solution ----------
   Interpolation only ever walks between two adjacent measured rows. desc is the mortar and
   the high arc, where more elevation is less range; asc is the low arc. */
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

function line(k,v,note){
 return "<tr><td>"+k+"</td><td class=n><b>"+v+"</b>"+
  (note?" <span class=fine>"+note+"</span>":"")+"</td></tr>";}

/* A label anyone can hover, tap or tab to and be told what the number is. The explanation
   sits in the panel rather than in prose further down the page, because the moment somebody
   wants to know what a mil is, is the moment they are looking at one. */
function why(label,text){
 return "<span class=amap-why tabindex=0>"+label+"<span class=amap-tip>"+text+
  "</span></span>";}

function mil(){
 return "Barrel elevation, in the mils these firing tables are written in: "+cur.milFrom+
  " to "+cur.milTo+" on this gun. What its sight actually reads has not been checked"+
  " against them, and the mil scale is one of the things still open at the foot of this"+
  " page."+
  (/unfired/.test(cur.confidence||"")
   ? " These tables are transcribed from one source and nobody here has fired a row of"+
     " them."
   : "")+
  " Range with a round before you trust the number.";}
function dialLine(label,m,t,tip){
 var mm=Math.round(m);
 return line(why(label,tip),mm+" mil",
  onRow(t,mm)?"a measured point":"interpolated between two measured points");}

function solution(){
 var box=el("sol"), status=el("amap-range");
 if(!gun||!tgt){
  box.innerHTML="<h3 style='margin:0 0 8px'>Waiting on two points</h3>"+
   "<p class=fine style='margin:0'>Click the map or type coordinates. Artillery first,"+
   " then the target.</p>";
  status.textContent=gun?"Place the target":"Place the gun";
  status.className="";return;}
 var dx=(tgt.x-gun.x)*UNIT, dy=(tgt.y-gun.y)*UNIT;
 var dist=Math.sqrt(dx*dx+dy*dy);
 var az=(Math.atan2(dx,dy)*180/Math.PI+360)%360;
 var rows=line(why("Bearing","Which way to point the gun: degrees clockwise from north."+
  " 0 is north, 90 east, 180 south, 270 west. Traverse to this first, then set the dial."),
  az.toFixed(1)+"&deg;","from north");
 rows+=line(why("Range","Flat map distance from gun to target. Every table on this page"+
  " assumes both ends sit at the same height, and this ground is a river valley: a shot up"+
  " onto high ground falls short of the table, a shot down off a ridge carries past it."),
  Math.round(dist)+" m");
 var warn="", inRange=false;
 if(dist<cur.minRange){
  rows+=line("Dial","no solution","inside the dead zone");
  warn="That is "+Math.round(cur.minRange-dist)+" m inside the closest this gun can drop a"+
   " round. No elevation reaches it. Move the gun.";
  status.textContent="DEAD ZONE";status.className="bad";
 } else if(dist>cur.maxRange){
  rows+=line("Dial","no solution","out of range");
  warn="Target is "+Math.round(dist-cur.maxRange)+" m beyond maximum range.";
  status.textContent="OUT OF RANGE";status.className="bad";
 } else {
  status.textContent="IN RANGE  "+Math.round(dist)+" m";status.className="good";
  inRange=true;
  if(cur.table){
   var m=dialDesc(dist,cur.table);
   if(m===null)rows+=line("Dial","no solution");
   else rows+=dialLine("Dial",m,cur.table,mil()+" This gun has one trajectory and it is"+
    " already past the top of its throw, so more mils lands shorter, not further. If the"+
    " round falls long, dial up.");
  } else if(cur.tableLow||cur.tableHigh){
   var lo=dialAsc(dist,cur.tableLow), hi=dialDesc(dist,cur.tableHigh);
   if(lo!==null)rows+=dialLine("Dial, low arc",lo,cur.tableLow,mil()+" The low arc throws"+
    " flat and fast, so the round arrives sooner. Here more mils is more range. It needs"+
    " the sky between you and the target to be clear.");
   if(hi!==null)rows+=dialLine("Dial, high arc",hi,cur.tableHigh,mil()+" The high arc lobs"+
    " the round up and over, so it clears a ridge but hangs in the air longer. Here more"+
    " mils lands shorter. Either dial reaches this target: pick one.");
   if(lo===null&&hi===null)rows+=line("Dial","no solution");
   else if(lo===null)warn="Inside "+cur.lowArcFrom+" m only the high arc reaches. It hangs"+
    " longer, so lead a moving target accordingly.";
  } else {
   rows+=line("Dial","not published","see below");
  }
 }
 /* No spread row. The one source for the grouping angle never said where it got it, the
    game deals in no such unit, and the metres were arithmetic on top of that. What a
    shell does either side of the aim point is unmeasured, and the open list says so. */
 var detail="";
 if(inRange)
  detail="<p class=fine style='margin:10px 0 0'>How far a round lands from the aim point"+
   " is unmeasured. Send one to range with, watch where it falls, correct, then fire.</p>";

 box.innerHTML="<h3 style='margin:0 0 4px'>Firing solution</h3>"+
  "<p class=fine style='margin:0 0 10px'>Hover or tap a label for what it means.</p>"+
  "<table style='margin:0'><tbody>"+rows+"</tbody></table>"+detail+
  (warn?"<p class=fine style='margin:12px 0 0;color:var(--red-hot)'>"+warn+"</p>":"");
}

/* the gun's relationship to the objective is the thing a player actually wants to know */
function zoneNote(){
 var box=el("zoneNote");
 if(!map.zone||!gun){box.innerHTML="";return;}
 var z=map.zone;
 var d=Math.sqrt(Math.pow((z.centre.x-gun.x)*UNIT,2)+Math.pow((z.centre.y-gun.y)*UNIT,2));
 var near=Math.max(0,d-z.radiusMetres), far=d+z.radiusMetres;
 var covers = near<=cur.maxRange && far>=cur.minRange;
 var all = far<=cur.maxRange && near>=cur.minRange;
 box.innerHTML="<h3 style='margin:0 0 6px'>Against the control zone</h3>"+
  "<p class=fine style='margin:0'>Gun is "+Math.round(d)+" m from the centre. "+
  (all?"Every part of the zone is in range.":
   covers?"Part of the zone is in range, from "+Math.max(Math.round(near),cur.minRange)+
    " to "+Math.min(Math.round(far),cur.maxRange)+" m out.":
   "No part of the zone is in range from here.")+"</p>";
}

/* ---------- terrain tiles ----------
   A pyramid is calibrated to a box in game coordinates, which is not exactly the map
   extent: the imagery was captured against its own edges and lands a few metres off the
   round number. Without bounds the whole layer sits skewed. */
var TILE={}, TILEBAD={}, TILEQ=[];
function tileBox(){
 return map.tiles.bounds||{minX:0,maxX:map.extent,minY:0,maxY:map.extent};}
/* Two things decide how sharp the terrain looks, and both were wrong.
   Rounding picked a level whose tiles could be up to 1.4x coarser than the screen, so the
   imagery was upscaled about half the time: ceil never gives back fewer pixels than are
   being drawn. And cam.k is in CSS pixels while the canvas is rendered at device pixels,
   so on any 2x display every tile was stretched to twice its size before it was drawn.
   Multiplying by the ratio is the whole difference between crisp and soft on a laptop. */
function tileZoomFor(){
 var t=map.tiles, tb=tileBox();
 var dpr=window.devicePixelRatio||1;
 var z=Math.ceil(Math.log((tb.maxX-tb.minX)*cam.k*dpr/t.tileSize)/Math.LN2);
 return Math.max(t.minZoom,Math.min(t.maxZoom,z));}
/* A tile that fails is nearly always a request the browser cancelled, not a file that is
   not there: zoom quickly and a hundred loads start and some are dropped. Marking those
   dead for the session is what left the two black squares on the map, because nothing ever
   asked for them again. Three tries, backing off, then it gives up for real. */
function tileUrl(z,x,y){
 return map.tiles.path+"/zoom_"+z+"/"+x+"_"+y+"."+map.tiles.extension;}
/* Read only. Answers with a tile that is already here and never starts a request, which is
   what lets the coarse fallback below look upwards without paying for the look. */
function cachedTile(z,x,y){
 var img=TILE[map.id+":"+z+":"+x+":"+y];
 return (img&&img.complete&&img.naturalWidth)?img:null;}
function getTile(z,x,y){
 var key=map.id+":"+z+":"+x+":"+y;
 if(TILEBAD[key]>=3)return null;
 var img=TILE[key];
 if(img)return (img.complete&&img.naturalWidth)?img:null;
 img=new Image();
 /* Decode off the main thread. A tile decoded inline blocks the frame it lands in, which
    on a burst of twenty is the difference between the map easing in and the page hitching. */
 img.decoding="async";
 img.onload=function(){requestDraw();};
 img.onerror=function(){
  var n=(TILEBAD[key]||0)+1;TILEBAD[key]=n;
  if(n<3)setTimeout(function(){delete TILE[key];requestDraw();},300*n);};
 img.src=tileUrl(z,x,y);
 TILE[key]=img;TILEQ.push(key);
 evictTiles();
 return null;}
/* The cache used to grow for as long as the tab was open. Both terrains together are 10,922
   tiles and a decoded 256 square costs about a quarter of a megabyte, so panning around at
   full zoom could hold a few hundred megabytes of imagery nobody is looking at. It keeps the
   most recent CAP and drops the oldest, never touching the base level below, which is the
   one thing that has to stay resident to be worth priming. */
var TILECAP=360;
function evictTiles(){
 while(TILEQ.length>TILECAP){
  var key=TILEQ.shift();
  if(BASEKEY[key]){TILEQ.push(key);
   /* everything left is base: stop rather than spin */
   if(TILEQ.length<=BASECOUNT)return;
   continue;}
  delete TILE[key];delete TILEBAD[key];}}
/* One coarse level, fetched once per terrain, so there is always something to draw under a
   tile that has not landed. This replaces the old behaviour, which was to ask for a tile's
   coarser ancestors the moment it was missing: that read well and cost badly, because every
   one of the twenty odd tiles on screen asked for up to three more, and a fast zoom turned
   that into the request storm the retry logic above exists to survive. Measured on a first
   paint of Bakurani: 24 tiles on screen fetched 12 ancestors nobody displayed. The base is
   21 tiles, fetched once, and the amplification is gone. */
var BASEKEY={},BASECOUNT=0;
function primeBase(){
 if(!map.tiles)return;
 BASEKEY={};BASECOUNT=0;
 var lo=map.tiles.minZoom,hi=Math.min(map.tiles.maxZoom,lo+1);
 for(var z=lo;z<=hi;z++){
  var n=Math.pow(2,z);
  for(var x=0;x<n;x++)for(var y=0;y<n;y++){
   BASEKEY[map.id+":"+z+":"+x+":"+y]=true;BASECOUNT++;
   getTile(z,x,y);}}}

/* Nothing loaded for this square yet, so draw the piece of a coarser tile that covers it.
   That is what stops the terrain blinking out on the way between zoom levels: the map goes
   soft for a moment instead of going black, and sharpens when the real tile lands. It only
   ever looks at what is already cached, so a miss costs nothing but a lookup. */
function drawTileAt(z,x,y,dx,dy,dw,dh){
 var img=getTile(z,x,y);
 if(img){g2.drawImage(img,dx,dy,dw,dh);return;}
 var zz=z,xx=x,yy=y,f=1;
 while(zz>map.tiles.minZoom){
  zz--;xx=Math.floor(xx/2);yy=Math.floor(yy/2);f*=2;
  var up=cachedTile(zz,xx,yy);
  if(up){
   var t=up.naturalWidth/f;
   if(t<1)return;
   g2.drawImage(up,(x-xx*f)*t,(y-yy*f)*t,t,t,dx,dy,dw,dh);
   return;}}}
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
 for(var x=x0;x<=x1;x++)for(var y=y0;y<=y1;y++)
  /* +1 closes the hairline seam that rounding leaves between neighbours */
  drawTileAt(z,x,y,w2sX(tb.minX+x*sx),w2sY(tb.maxY-y*sy),sx*cam.k+1,sy*cam.k+1);}

/* A wheel sends events faster than the screen refreshes, and a tile that lands calls back
   whenever it lands. Both used to redraw the whole canvas on the spot, so a quick zoom ran
   several full draws inside one frame and the map juddered. They ask for a frame instead,
   and the frame draws once. */
var pendingDraw=false;
function requestDraw(){
 if(pendingDraw)return;
 pendingDraw=true;
 requestAnimationFrame(function(){pendingDraw=false;draw();});}

/* ---------- camera ---------- */
function w2sX(x){return (x-cam.x)*cam.k+canvas.clientWidth/2;}
function w2sY(y){return canvas.clientHeight/2-(y-cam.y)*cam.k;}
function s2wX(sx){return (sx-canvas.clientWidth/2)/cam.k+cam.x;}
function s2wY(sy){return cam.y-(sy-canvas.clientHeight/2)/cam.k;}
/* Zooming out stops when the whole terrain is on screen, and the terrain cannot be dragged
   off its own canvas. Past that point there is nothing left to reveal: the map is already
   entirely visible and every further notch just adds black around it, which reads as the
   map having got lost rather than as the map being fully shown. On an axis where the
   terrain is narrower than the canvas there is nowhere to pan to, so it is centred and
   held there rather than sliding about in the margin. */
function minK(){
 var b=map.bounds,w=canvas.clientWidth,h=canvas.clientHeight;
 return Math.min(w/(b.maxX-b.minX+6),h/(b.maxY-b.minY+6));}
function clampCam(){
 var b=map.bounds,w=canvas.clientWidth,h=canvas.clientHeight;
 cam.k=Math.max(minK(),Math.min(cam.k,600));
 var halfW=w/2/cam.k,halfH=h/2/cam.k;
 if(halfW*2>=b.maxX-b.minX)cam.x=(b.minX+b.maxX)/2;
 else cam.x=Math.max(b.minX+halfW,Math.min(b.maxX-halfW,cam.x));
 if(halfH*2>=b.maxY-b.minY)cam.y=(b.minY+b.maxY)/2;
 else cam.y=Math.max(b.minY+halfH,Math.min(b.maxY-halfH,cam.y));}
function fit(){
 var b=map.bounds;
 cam.x=(b.minX+b.maxX)/2;cam.y=(b.minY+b.maxY)/2;
 cam.k=minK();
 clampCam();draw();}
/* A shared link already says where the interesting ground is, so open on the shot rather
   than on the whole terrain, where two markers 600 m apart are a few pixels of each other. */
function fitPoints(){
 var pts=[];if(gun)pts.push(gun);if(tgt)pts.push(tgt);
 if(!pts.length){toZone();return;}
 var minX=pts[0].x,maxX=pts[0].x,minY=pts[0].y,maxY=pts[0].y;
 pts.forEach(function(p){
  minX=Math.min(minX,p.x);maxX=Math.max(maxX,p.x);
  minY=Math.min(minY,p.y);maxY=Math.max(maxY,p.y);});
 var pad=Math.max(2.5,(maxX-minX)*0.4,(maxY-minY)*0.4);
 cam.x=(minX+maxX)/2;cam.y=(minY+maxY)/2;
 cam.k=Math.min(canvas.clientWidth/((maxX-minX)+pad*2),
                canvas.clientHeight/((maxY-minY)+pad*2));
 clampCam();
 draw();}
/* the control zone is where the match happens, so it is one button away at all times */
function toZone(){
 if(!map.zone){fit();return;}
 var r=map.zone.radiusMetres/UNIT;
 cam.x=map.zone.centre.x;cam.y=map.zone.centre.y;
 cam.k=Math.min(canvas.clientWidth,canvas.clientHeight)/(r*2*1.6);
 clampCam();
 draw();}

/* ---------- drawing ---------- */
function ring(x,y,rUnits,color,width,dash){
 g2.beginPath();g2.arc(w2sX(x),w2sY(y),rUnits*cam.k,0,Math.PI*2);
 g2.strokeStyle=color;g2.lineWidth=width;g2.setLineDash(dash||[]);
 g2.stroke();g2.setLineDash([]);}

/* The tower is the objective, so it gets the game's own glyph rather than a dot: a mast
   with two signal arcs. Drawn rather than an image so it stays crisp at every zoom. */
function drawTower(t){
 var sx=w2sX(t.x), sy=w2sY(t.y);
 g2.strokeStyle="rgba(255,247,234,.92)";g2.lineWidth=1.4;g2.lineJoin="round";
 g2.beginPath();
 g2.moveTo(sx-5,sy+7);g2.lineTo(sx,sy-5);g2.lineTo(sx+5,sy+7);
 g2.moveTo(sx-3,sy+1);g2.lineTo(sx+3,sy+1);
 g2.stroke();
 g2.beginPath();g2.arc(sx,sy-5,4.5,Math.PI*1.15,Math.PI*1.85);g2.stroke();
 g2.beginPath();g2.arc(sx,sy-5,7.5,Math.PI*1.2,Math.PI*1.8);g2.stroke();
 if(cam.k>7){
  g2.fillStyle="rgba(255,247,234,.72)";
  g2.font="10px Cascadia Mono,Consolas,monospace";
  g2.textAlign="center";g2.fillText(t.label,sx,sy+20);g2.textAlign="left";}}

function draw(){
 var w=canvas.clientWidth,h=canvas.clientHeight;
 g2.clearRect(0,0,w,h);
 g2.fillStyle="#0a0a0a";g2.fillRect(0,0,w,h);
 var b=map.bounds;
 var hasArt=map.tiles&&LAYER.terrain;
 if(hasArt)drawTiles();
 else{
  g2.fillStyle="#121212";
  g2.fillRect(w2sX(b.minX),w2sY(b.maxY),(b.maxX-b.minX)*cam.k,(b.maxY-b.minY)*cam.k);}

 /* the grid has to stay legible over imagery without hiding it */
 var gridMajor=hasArt?"rgba(255,247,234,.28)":"#242424";
 var gridMinor=hasArt?"rgba(255,247,234,.12)":"#181818";
 if(LAYER.grid){
  var x0=Math.max(Math.floor(s2wX(0)),0),x1=Math.min(Math.ceil(s2wX(w)),map.extent);
  var y0=Math.max(Math.floor(s2wY(h)),0),y1=Math.min(Math.ceil(s2wY(0)),map.extent);
  g2.font="10px Cascadia Mono,Consolas,monospace";
  for(var x=x0;x<=x1;x++){
   var major=x%10===0;
   if(!major&&cam.k<14)continue;
   g2.strokeStyle=major?gridMajor:gridMinor;g2.lineWidth=1;
   g2.beginPath();g2.moveTo(w2sX(x),0);g2.lineTo(w2sX(x),h);g2.stroke();
   if(major){g2.fillStyle="rgba(255,247,234,.4)";g2.fillText(x.toFixed(0),w2sX(x)+3,h-6);}}
  for(var y=y0;y<=y1;y++){
   var majorY=y%10===0;
   if(!majorY&&cam.k<14)continue;
   g2.strokeStyle=majorY?gridMajor:gridMinor;g2.lineWidth=1;
   g2.beginPath();g2.moveTo(0,w2sY(y));g2.lineTo(w,w2sY(y));g2.stroke();
   if(majorY){g2.fillStyle="rgba(255,247,234,.4)";g2.fillText(y.toFixed(0),4,w2sY(y)-3);}}}

 g2.strokeStyle="#3a3a3a";g2.lineWidth=1.5;
 g2.strokeRect(w2sX(b.minX),w2sY(b.maxY),(b.maxX-b.minX)*cam.k,(b.maxY-b.minY)*cam.k);

 /* the three faction spawns, always drawn: no toggle, see the bar above */
 {
  var zc={VALKYRA:"#d4553a",MANTICORE:"#86ad55",LONESTAR:"#6b93b8"};
  g2.font="11px Chakra Petch,system-ui,sans-serif";
  map.spawns.forEach(function(z){
   var c=zc[z.label]||"#888";
   g2.beginPath();
   z.points.forEach(function(p,i){
    if(i===0)g2.moveTo(w2sX(p.x),w2sY(p.y));else g2.lineTo(w2sX(p.x),w2sY(p.y));});
   g2.closePath();
   g2.globalAlpha=.12;g2.fillStyle=c;g2.fill();g2.globalAlpha=1;
   g2.setLineDash([5,4]);g2.strokeStyle=c;g2.lineWidth=1.2;g2.stroke();g2.setLineDash([]);
   var mx=0,my=0;z.points.forEach(function(p){mx+=p.x;my+=p.y;});
   mx/=z.points.length;my/=z.points.length;
   g2.fillStyle=c;g2.textAlign="center";
   g2.fillText(z.label+" spawn",w2sX(mx),w2sY(my));g2.textAlign="left";});}

 /* the control zone: the ring the match is fought inside */
 if(LAYER.zone&&map.zone){
  var z=map.zone, zr=z.radiusMetres/UNIT;
  g2.beginPath();g2.arc(w2sX(z.centre.x),w2sY(z.centre.y),zr*cam.k,0,Math.PI*2);
  g2.globalAlpha=.10;g2.fillStyle="#6b93b8";g2.fill();g2.globalAlpha=1;
  ring(z.centre.x,z.centre.y,zr,"rgba(120,170,220,.85)",1.8);
  if(cam.k>4){
   g2.fillStyle="rgba(150,195,240,.8)";
   g2.font="11px Chakra Petch,system-ui,sans-serif";g2.textAlign="center";
   g2.fillText("CONTROL ZONE",w2sX(z.centre.x),w2sY(z.centre.y+zr)-8);
   g2.textAlign="left";}}

 if(LAYER.towers)map.towers.forEach(drawTower);

 if(gun){
  var outer=cur.maxRange/UNIT,inner=cur.minRange/UNIT;
  g2.beginPath();
  g2.arc(w2sX(gun.x),w2sY(gun.y),outer*cam.k,0,Math.PI*2);
  g2.arc(w2sX(gun.x),w2sY(gun.y),inner*cam.k,0,Math.PI*2,true);
  g2.globalAlpha=.05;g2.fillStyle="#f30000";g2.fill("evenodd");g2.globalAlpha=1;
  ring(gun.x,gun.y,outer,"rgba(243,0,0,.85)",1.6);
  ring(gun.x,gun.y,inner,"rgba(243,0,0,.7)",1.1,[6,5]);
  if(cur.lowArcFrom)
   ring(gun.x,gun.y,cur.lowArcFrom/UNIT,"rgba(255,247,234,.35)",1,[2,4]);}

 if(gun&&tgt){
  g2.strokeStyle="rgba(255,247,234,.5)";g2.lineWidth=1;g2.setLineDash([3,4]);
  g2.beginPath();g2.moveTo(w2sX(gun.x),w2sY(gun.y));
  g2.lineTo(w2sX(tgt.x),w2sY(tgt.y));g2.stroke();g2.setLineDash([]);}

 if(gun)marker(gun,"#f30000","GUN");
 if(tgt)marker(tgt,"#fff7ea","TGT");
 status();
}
function marker(p,color,label){
 var sx=w2sX(p.x),sy=w2sY(p.y);
 g2.strokeStyle=color;g2.lineWidth=1.5;
 g2.beginPath();g2.arc(sx,sy,6,0,Math.PI*2);g2.stroke();
 g2.beginPath();g2.moveTo(sx-9,sy);g2.lineTo(sx-3,sy);g2.moveTo(sx+3,sy);g2.lineTo(sx+9,sy);
 g2.moveTo(sx,sy-9);g2.lineTo(sx,sy-3);g2.moveTo(sx,sy+3);g2.lineTo(sx,sy+9);g2.stroke();
 g2.fillStyle=color;g2.font="10px Cascadia Mono,Consolas,monospace";
 g2.fillText(label,sx+9,sy-8);}

function status(){
 /* a scale bar in words: how much ground one hundred pixels covers */
 el("amap-scale").textContent=Math.round(100/cam.k*UNIT)+" m per 100 px";
 el("amap-zoom").textContent=cam.k.toFixed(1)+" px per unit";}

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
function update(){syncInputs();solution();zoneNote();draw();writeHash();}
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

/* ---------- pointer ----------
   One pointer does three jobs: drag a marker if it lands on one, pan if it moves off empty
   ground, place a point if it never moves far enough to be a pan. */
var drag=null;
function hit(p,sx,sy){if(!p)return false;
 var dx=w2sX(p.x)-sx,dy=w2sY(p.y)-sy;return dx*dx+dy*dy<144;}
/* The middle button belongs to the browser, which reads it as autoscroll: the pointer turns
   into the four way arrow, the page starts creeping down, and the map the user was working
   in scrolls out from under them. Panning is the left button only, and the middle button is
   swallowed on the canvas so the browser never starts that gesture in the first place. */
canvas.addEventListener("mousedown",function(e){if(e.button===1)e.preventDefault();});
canvas.addEventListener("auxclick",function(e){if(e.button===1)e.preventDefault();});
canvas.addEventListener("pointerdown",function(e){
 if(e.button!==0)return;
 var r=canvas.getBoundingClientRect(),sx=e.clientX-r.left,sy=e.clientY-r.top;
 /* Capture keeps a drag alive when the pointer leaves the canvas, which is worth having
    and not worth losing the drag over: it throws if the id is not an active pointer, and
    an exception here would abort before the drag is even set, killing pan and both
    markers. */
 try{canvas.setPointerCapture(e.pointerId);}catch(err){}
 if(hit(gun,sx,sy))drag={what:"gun"};
 else if(hit(tgt,sx,sy))drag={what:"tgt"};
 else drag={what:"pan",sx:sx,sy:sy,cx:cam.x,cy:cam.y,moved:false};});
canvas.addEventListener("pointermove",function(e){
 var r=canvas.getBoundingClientRect(),sx=e.clientX-r.left,sy=e.clientY-r.top;
 el("amap-cursor").textContent="X "+s2wX(sx).toFixed(2)+"   Y "+s2wY(sy).toFixed(2);
 if(!drag)return;
 if(drag.what==="pan"){
  var dx=sx-drag.sx,dy=sy-drag.sy;
  if(Math.abs(dx)+Math.abs(dy)>4)drag.moved=true;
  if(drag.moved){cam.x=drag.cx-dx/cam.k;cam.y=drag.cy+dy/cam.k;clampCam();requestDraw();}
 } else {
  var p={x:s2wX(sx),y:s2wY(sy)};
  if(drag.what==="gun")gun=p;else tgt=p;
  syncInputs();solution();zoneNote();requestDraw();}});
canvas.addEventListener("pointerup",function(e){
 if(!drag)return;
 var r=canvas.getBoundingClientRect(),sx=e.clientX-r.left,sy=e.clientY-r.top;
 if(drag.what==="pan"&&!drag.moved){
  var p={x:s2wX(sx),y:s2wY(sy)};
  if(active==="gun"){gun=p;setActive("tgt");}else{tgt=p;}}
 drag=null;update();});
canvas.addEventListener("wheel",function(e){
 e.preventDefault();
 var r=canvas.getBoundingClientRect(),sx=e.clientX-r.left,sy=e.clientY-r.top;
 var wx=s2wX(sx),wy=s2wY(sy);
 /* Zoom followed the notch, a flat 1.2 either way, so a trackpad's stream of small deltas
    stepped the map 20 percent at a time and a fast scroll arrived as a stack of jumps.
    Scaling by how far the wheel actually turned makes a notch land in the same place and a
    trackpad glide continuous. deltaMode 1 is lines, 2 is pages; both are converted. */
 var d=e.deltaY;
 if(e.deltaMode===1)d*=16;else if(e.deltaMode===2)d*=canvas.clientHeight;
 cam.k*=Math.pow(1.0018,-Math.max(-240,Math.min(240,d)));
 cam.x=wx-(sx-canvas.clientWidth/2)/cam.k;
 cam.y=wy+(sy-canvas.clientHeight/2)/cam.k;
 clampCam();
 requestDraw();},{passive:false});

/* ---------- controls ---------- */
function setActive(which){active=which;
 el("pick-gun").setAttribute("aria-pressed",which==="gun"?"true":"false");
 el("pick-tgt").setAttribute("aria-pressed",which==="tgt"?"true":"false");}
el("pick-gun").addEventListener("click",function(){setActive("gun");});
el("pick-tgt").addEventListener("click",function(){setActive("tgt");});
el("amap-fit").addEventListener("click",fit);
el("amap-zone").addEventListener("click",toZone);
el("amap-swap").addEventListener("click",function(){var t=gun;gun=tgt;tgt=t;update();});
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
Array.prototype.forEach.call(document.querySelectorAll("[data-layer]"),function(b){
 b.addEventListener("click",function(){
  var k=b.getAttribute("data-layer");
  LAYER[k]=!LAYER[k];
  b.setAttribute("aria-pressed",LAYER[k]?"true":"false");
  draw();});});
/* wired through the input event the coordinate boxes already listen for, so stepping a
   value takes the same path as typing one */
Array.prototype.forEach.call(document.querySelectorAll(".amap-spin button"),function(b){
 b.addEventListener("click",function(){
  var i=el(b.getAttribute("data-for"));
  if(b.getAttribute("data-dir")==="1")i.stepUp();else i.stepDown();
  i.dispatchEvent(new Event("input",{bubbles:true}));});});
[["gunx","guny","gun"],["tgtx","tgty","tgt"]].forEach(function(io){
 [io[0],io[1]].forEach(function(id){
  el(id).addEventListener("input",function(){
   var x=parseFloat(el(io[0]).value),y=parseFloat(el(io[1]).value);
   if(isFinite(x)&&isFinite(y)){
    if(io[2]==="gun")gun={x:x,y:y};else tgt={x:x,y:y};
    solution();zoneNote();draw();writeHash();}});});});
Array.prototype.forEach.call(document.querySelectorAll("[data-map]"),function(b){
 b.addEventListener("click",function(){
  Array.prototype.forEach.call(document.querySelectorAll("[data-map]"),function(o){
   o.setAttribute("aria-pressed",o===b?"true":"false");});
  MAPS.forEach(function(m){if(m.id===b.getAttribute("data-map"))map=m;});
  primeBase();fit();update();});});
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
 var w=stage.clientWidth,h=stage.clientHeight;
 canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);
 canvas.style.width=w+"px";canvas.style.height=h+"px";
 g2.setTransform(dpr,0,0,dpr,0,0);}
window.addEventListener("resize",function(){size();draw();});
/* Framing has to wait for a real canvas. The stage is a grid cell inside a flex column
   sized off the viewport, so on first script run it can still measure a couple of pixels
   wide, and a camera fitted to that opens the map at a useless zoom. Frame once, the first
   time the element actually has a size, and never re-frame after: a resize must not throw
   away wherever the user has panned to. */
var framed=false;
function ensureFramed(){
 if(framed)return;
 if(!stage.clientWidth||!stage.clientHeight)return;
 framed=true;
 size();
 /* opening on the control zone rather than the whole terrain: that is where the match is */
 if(gun||tgt)fitPoints(); else toZone();
 update();}
if(window.ResizeObserver)
 new ResizeObserver(function(){size();ensureFramed();draw();}).observe(stage);
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
 readHash();applyState();primeBase();
 if(gun||tgt)fitPoints(); else toZone();
 update();});
readHash();applyState();
size();primeBase();ensureFramed();update();
` + '}());<\/script>';

  return { html, script };
};
