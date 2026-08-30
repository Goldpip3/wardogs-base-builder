/* Indirect fire: a firing solution from two map coordinates, plus the platform reference.
 *
 * Written with string concatenation rather than multi-line template literals, so this file
 * can be indented normally. The older page modules sit at column zero because their bodies
 * were moved verbatim out of one big file and re-indenting them would have changed the
 * whitespace inside their template literals, which is page content. That does not apply to
 * a file written from scratch that has no multi-line literals in it.
 *
 * There is no map here on purpose. Two other community sites already have a good one over
 * the real terrain, complete with assets this project has no business copying. What the
 * game actually shows a player is an X/Y readout, so that is the input: type what is on your
 * screen. The part worth adding is on the planner, where a mortar's reach can be drawn over
 * a base you designed, which nobody else can do because nobody else has your layout.
 */
module.exports = ctx => {
  const { esc, page, write, ARTILLERY, byId } = ctx;
  const A = ARTILLERY;

  const num = n => n.toLocaleString("en-US");

  /* The grouping angle is the one number on this page that can be checked rather than
     taken on trust. Spread is range times the angle in radians, and that reproduces all
     four of the spreads the source publishes, so the relationship is not in doubt even
     though what it bounds is. */
  const spreadAt = (dist, moa) => dist * (moa / 60) * Math.PI / 180;

  const platformCard = p => {
    const rows = [
      ["Range", num(p.minRange) + " to " + num(p.maxRange) + " m"],
      ["Arcs", p.arcs.length > 1 ? "Low and high" : "High only"],
      ["Reload", p.reloadSeconds + " s"],
      ["Shell", p.damage + " damage, " + p.blastRadius + " m blast"],
      ["Grouping", p.moa + " MOA, so " + spreadAt(p.maxRange, p.moa).toFixed(1) +
        " m across at maximum range"],
      ["Round", esc(p.roundName) + ", $" + num(p.roundCost) + " each"],
    ];
    if (p.lowArcFrom) rows.splice(2, 0, ["Low arc from", num(p.lowArcFrom) + " m"]);
    return '<div class="card" style="text-align:left">' +
      "<h3>" + esc(p.name) + '</h3><p class="fine" style="margin:0 0 12px">' +
      esc(p.kind) + " &middot; " + esc(p.calibre) + "</p>" +
      "<table style=\"margin:0\"><tbody>" +
      rows.map(function (r) {
        return "<tr><td>" + r[0] + '</td><td class="n">' + r[1] + "</td></tr>";
      }).join("") +
      "</tbody></table>" +
      p.notes.map(function (n) {
        return '<p class="fine" style="margin:12px 0 0">' + esc(n) + "</p>";
      }).join("") +
      "</div>";
  };

  const tableFor = p => {
    if (!p.table) {
      return '<div class="empty" style="text-align:left">' +
        '<span class="wip">No table published</span>' +
        "<h3>" + esc(p.name) + " has no elevation table here</h3>" +
        "<p>Its envelope is known and its bearing, distance and spread are on the" +
        " calculator above, because those need no table. What is not published anywhere is" +
        " the elevation for a given range. Two endpoints and a straight line between them" +
        " would look like an answer and would be wrong, because the arc is not a straight" +
        " line and turns over near maximum range. So it is not here.</p>" +
        '<p class="fine" style="margin:10px 0 0">Elevation runs ' + num(p.minElevationMil) +
        " to " + num(p.maxElevationMil) + " mil across that envelope. That is the whole of" +
        " what is known.</p></div>";
    }
    return "<table><thead><tr><th>Dial (mil)</th><th class=\"n\">Range (m)</th>" +
      "<th class=\"n\">Spread</th></tr></thead><tbody>" +
      p.table.map(function (r) {
        return "<tr><td>" + r.mils + '</td><td class="n">' + num(r.dist) + '</td>' +
          '<td class="n"><span class="fine">&plusmn;' +
          spreadAt(r.dist, p.moa).toFixed(1) + " m</span></td></tr>";
      }).join("") + "</tbody></table>";
  };

  const mortar = A.platforms.find(function (p) { return p.buildableId; });
  const mortarDef = mortar && byId[mortar.buildableId];

  write("artillery/index.html", page({
    title: "WARDOGS Artillery Calculator: L81 Mortar and SPH-2",
    desc: "Firing solutions for WARDOGS indirect fire. Type the game's own X/Y for your gun and your target and get bearing, range, elevation and spread, with the firing table and where every number came from.",
    canonical: "/artillery/",
    body: '<section><div class="wrap">' +
      '<span class="eyebrow">Indirect fire, checked ' + esc(A.checkedOn) + "</span>" +
      "<h1>Artillery</h1>" +
      '<p class="lede">Put in the coordinates the game shows you for your gun and your' +
      " target. Out comes the bearing to traverse to, the range, what to dial, and how wide" +
      " the shells will land.</p>" +

      '<div class="chips" style="margin-top:26px">' +
      A.platforms.map(function (p, i) {
        return '<button class="chip" data-plat="' + esc(p.id) + '" aria-pressed="' +
          (i === 0 ? "true" : "false") + '">' + esc(p.name) + "</button>";
      }).join("") + "</div>" +

      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));' +
      'gap:0 30px;margin-top:24px">' +
      ["gun", "tgt"].map(function (which) {
        const label = which === "gun" ? "Your gun" : "The target";
        return "<div><p class=\"fine\" style=\"margin:0 0 6px\">" + label + "</p>" +
          ["x", "y"].map(function (ax) {
            return '<label class="fine" style="display:inline-block;margin:0 14px 10px 0">' +
              ax.toUpperCase() + " " +
              '<input id="' + which + ax + '" type="number" step="0.01" ' +
              'style="width:104px;padding:8px;background:var(--panel);color:var(--text);' +
              'border:1px solid var(--line);font-family:var(--num)"></label>';
          }).join("") + "</div>";
      }).join("") + "</div>" +
      '<p class="fine" style="margin:0">One coordinate unit is ' + A.grid.unitMetres +
      " m, so 0.01 is a metre. Y counts north. The readable grid runs about X " +
      A.grid.playableX[0] + " to " + A.grid.playableX[1] + ", Y " + A.grid.playableY[0] +
      " to " + A.grid.playableY[1] + ".</p>" +

      '<div class="empty" id="sol" style="margin-top:30px;text-align:left"></div>' +

      '<h2 style="margin-top:52px">The platforms</h2>' +
      '<div class="grid" style="margin-top:18px">' +
      A.platforms.map(platformCard).join("") + "</div>" +

      '<h2 style="margin-top:52px">What this means for a base</h2>' +
      "<p>A mortar in your FOB is not a way to defend your FOB. Its minimum range is " +
      num(mortar.minRange) + " m, and everything closer than that is unreachable from that" +
      " position no matter how the crew dials it. Your own wire, your own gate and anyone" +
      " already at your walls are all inside that circle.</p>" +
      "<p>So it is an offensive tube. Put it where it covers the ground you want to deny," +
      " an approach, a road, an objective, and accept that it does nothing for a fight that" +
      " has already reached you. If you want the mortar to cover a point, the gun has to be" +
      " at least " + num(mortar.minRange) + " m from it and no more than " +
      num(mortar.maxRange) + " m.</p>" +
      '<p class="fine">The planner deliberately does not draw these as rings on your plan.' +
      " Doing that needs a conversion from a plan cell to a metre, and nothing published" +
      " establishes one. The catalog marks the FOB build radius unconfirmed for the same" +
      " reason. A ring drawn at the wrong scale would be worse than no ring, because it" +
      " would look like an answer.</p>" +

      '<h2 style="margin-top:52px">Firing table</h2>' +
      '<div id="tables">' + A.platforms.map(function (p, i) {
        return '<div data-table="' + esc(p.id) + '"' + (i ? ' hidden' : '') + ">" +
          tableFor(p) + "</div>";
      }).join("") + "</div>" +

      '<div class="empty" style="margin-top:52px;text-align:left">' +
      '<span class="wip">Read this before you trust a number</span>' +
      "<h3>" + esc(A.dispute.what) + "</h3>" +
      "<p>" + esc(A.dispute.detail) + "</p>" +
      '<h3 style="margin-top:24px">What the table does not account for</h3>' +
      "<ul style=\"max-width:66ch\">" + A.caveats.map(function (c) {
        return "<li>" + esc(c) + "</li>";
      }).join("") + "</ul>" +
      '<h3 style="margin-top:24px">Still open</h3>' +
      "<p>Six things about WARDOGS artillery are not settled. They are listed here rather" +
      " than papered over, and each one says what would close it, because most of them need" +
      " somebody with the game open rather than more reading.</p>" +
      "<dl style=\"max-width:66ch\">" + A.open.map(function (o) {
        return '<dt style="font-weight:600;margin-top:14px">' + esc(o.what) + "</dt>" +
          '<dd style="margin:4px 0 0"><span class="fine">' + esc(o.why) + "</span><br>" +
          '<span class="fine" style="color:var(--good)">Closed by: ' + esc(o.close) +
          "</span></dd>";
      }).join("") + "</dl>" +

      '<p class="fine" style="margin:14px 0 0">Measured by the community, not published by' +
      " BULKHEAD. Sources: " + A.sources.map(function (s) {
        return '<a href="' + esc(s.url) + '" rel="nofollow noopener">' + esc(s.name) + "</a>";
      }).join(", ") + ". The mortar table is MIT licensed and used with attribution.</p>" +
      "</div>" +

      (mortarDef ? '<p style="margin-top:34px">The ' + esc(mortarDef.name) +
        " costs " + num(mortarDef.cost) + " Build Supplies to put up. " +
        '<a class="btn" href="/planner/">Plan where it goes</a></p>' : "") +
      "</div></section>" +

      "<script>(function(){" +
      "var P=" + JSON.stringify(A.platforms.map(function (p) {
        return { id: p.id, name: p.name, minRange: p.minRange, maxRange: p.maxRange,
                 moa: p.moa, table: p.table, arcs: p.arcs,
                 lowArcFrom: p.lowArcFrom || null, reloadSeconds: p.reloadSeconds,
                 roundCost: p.roundCost, roundName: p.roundName };
      })) + ";" +
      "var UNIT=" + A.grid.unitMetres + ";" +
      "var cur=P[0];" +
      "function el(id){return document.getElementById(id);}" +
      "function val(id){var v=parseFloat(el(id).value);return isNaN(v)?null:v;}" +
      /* Straight linear interpolation down the table, the same way the source calculator
         does it. The table is the model; there is no curve to fit. */
      "function dial(d,t){" +
      " if(!t||!t.length||d>t[0].dist)return null;" +
      " for(var i=0;i<t.length-1;i++){var a=t[i],b=t[i+1];" +
      "  if(d<=a.dist&&d>=b.dist){var r=a.dist-b.dist;" +
      "   var f=r>0?(a.dist-d)/r:0;return a.mils+f*(b.mils-a.mils);}}" +
      " return null;}" +
      "function line(k,v,note){" +
      " return '<tr><td>'+k+'</td><td class=n><b>'+v+'</b>'+" +
      "  (note?' <span class=fine>'+note+'</span>':'')+'</td></tr>';}" +
      "function render(){" +
      " var gx=val('gunx'),gy=val('guny'),tx=val('tgtx'),ty=val('tgty');" +
      " var box=el('sol');" +
      " if(gx===null||gy===null||tx===null||ty===null){" +
      "  box.innerHTML='<h3 style=\"margin:0\">Waiting on four numbers</h3>'+" +
      "   '<p class=fine style=\"margin:8px 0 0\">Read your gun and your target off the" +
      " game map and type them in.</p>';return;}" +
      " var dx=(tx-gx)*UNIT, dy=(ty-gy)*UNIT;" +
      " var dist=Math.sqrt(dx*dx+dy*dy);" +
      " var az=(Math.atan2(dx,dy)*180/Math.PI+360)%360;" +
      " var spread=dist*(cur.moa/60)*Math.PI/180;" +
      " var rows=line('Bearing',az.toFixed(1)+'&deg;','from north');" +
      " rows+=line('Range',Math.round(dist)+' m');" +
      " var warn='';" +
      " if(dist<cur.minRange){" +
      "  rows+=line('Dial','no solution','inside the dead zone');" +
      "  warn='That is '+Math.round(cur.minRange-dist)+' m inside the closest this gun can" +
      " drop a round. No elevation reaches it. Move the gun.';" +
      " } else if(dist>cur.maxRange){" +
      "  rows+=line('Dial','no solution','out of range');" +
      "  warn='Target is '+Math.round(dist-cur.maxRange)+' m beyond maximum range.';" +
      " } else if(!cur.table){" +
      "  rows+=line('Dial','not published','see below');" +
      "  warn='The '+cur.name+' has no published elevation table. Bearing and range above" +
      " are still right; the number to dial is not something this page will guess at.';" +
      " } else {" +
      /* No snapping to a round number. The table's own elevations are 290, 340, 390 and so
         on, which are not multiples of fifty, so rounding to the nearest fifty moves the
         answer off a measured point and onto one nobody has ever fired. The source
         calculator this table comes from does exactly that: ask it for 500 m, which is a
         row in its own table at 490 mil, and it answers 500. Report the interpolated mil
         and say whether it landed on a measured row. */
      "  var m=dial(dist,cur.table);" +
      "  if(m===null){rows+=line('Dial','no solution');}" +
      "  else{var mm=Math.round(m);" +
      "   var onTable=cur.table.some(function(r){return r.mils===mm;});" +
      "   rows+=line('Dial',mm+' mil'," +
      "    onTable?'a measured point':'interpolated between two measured points');}" +
      " }" +
      " rows+=line('Spread','&plusmn;'+spread.toFixed(1)+' m','at '+cur.moa+' MOA');" +
      " rows+=line('Reload',cur.reloadSeconds+' s','$'+cur.roundCost+' a round');" +
      " box.innerHTML='<h3 style=\"margin:0 0 12px\">Firing solution</h3>'+" +
      "  '<table style=\"margin:0\"><tbody>'+rows+'</tbody></table>'+" +
      "  (warn?'<p class=fine style=\"margin:14px 0 0;color:var(--red-hot)\">'+warn+'</p>':'');" +
      "}" +
      "Array.prototype.forEach.call(document.querySelectorAll('[data-plat]'),function(b){" +
      " b.addEventListener('click',function(){" +
      "  Array.prototype.forEach.call(document.querySelectorAll('[data-plat]'),function(o){" +
      "   o.setAttribute('aria-pressed',o===b?'true':'false');});" +
      "  var id=b.getAttribute('data-plat');" +
      "  for(var i=0;i<P.length;i++)if(P[i].id===id)cur=P[i];" +
      "  Array.prototype.forEach.call(document.querySelectorAll('[data-table]'),function(t){" +
      "   t.hidden=t.getAttribute('data-table')!==id;});" +
      "  render();});});" +
      "['gunx','guny','tgtx','tgty'].forEach(function(id){" +
      " el(id).addEventListener('input',render);});" +
      "render();" +
      "}());<\/script>",
  }));
};
