/* Indirect fire: a firing solution from a map you can click, plus the platform reference.
 *
 * Written with string concatenation rather than multi-line template literals, so this file
 * can be indented normally. The older page modules sit at column zero because their bodies
 * were moved verbatim out of one big file and re-indenting them would have changed the
 * whitespace inside their template literals, which is page content. That does not apply to
 * a file written from scratch that has no multi-line literals in it.
 *
 * The map is a vector drawing of data/artillery-maps.json, not terrain imagery. Other
 * community calculators render captured tiles; those are their assets and the game's, and
 * this project draws its own map from measured positions instead. The interactive part
 * lives in tools/site/artillery-map.js; this file is the page around it.
 */
module.exports = ctx => {
  const { esc, page, write, ARTILLERY, byId, adSlot } = ctx;
  const A = ARTILLERY;
  const mapApp = require("../artillery-map")(ctx);

  const num = n => n.toLocaleString("en-US");

  /* The grouping angle is the one number on this page that can be checked rather than
     taken on trust. Spread is range times the angle in radians, and that reproduces all
     four of the spreads the source publishes, so the relationship is not in doubt even
     though what it bounds is. */
  const spreadAt = (dist, moa) => dist * (moa / 60) * Math.PI / 180;

  const platformCard = p => {
    /* A third entry is a note, set under the figure rather than beside it. Numeric cells
       are nowrap on purpose across the site, so a sentence parked in one runs straight out
       of the card and gets clipped. The figure stays in the cell; the sentence goes below. */
    const rows = [
      ["Range", num(p.minRange) + " to " + num(p.maxRange) + " m"],
      ["Arcs", p.arcs.length > 1 ? "Low and high" : "High only"],
      ["Reload", p.reloadSeconds + " s"],
      ["Shell", p.damage + " damage", p.blastRadius + " m blast radius"],
      ["Grouping", p.moa + " MOA",
        spreadAt(p.maxRange, p.moa).toFixed(1) + " m across at maximum range"],
      ["Round", "$" + num(p.roundCost) + " each", esc(p.roundName)],
    ];
    if (p.lowArcFrom) rows.splice(2, 0, ["Low arc from", num(p.lowArcFrom) + " m"]);
    return '<div class="card" style="text-align:left">' +
      "<h3>" + esc(p.name) + '</h3><p class="fine" style="margin:0 0 12px">' +
      esc(p.kind) + " &middot; " + esc(p.calibre) + "</p>" +
      "<table style=\"margin:0;width:100%;table-layout:fixed\"><tbody>" +
      rows.map(function (r) {
        return "<tr><td>" + r[0] + '</td><td class="n">' + r[1] +
          /* the cell is nowrap so the figure never breaks; the note has to opt back out
             of that or it runs off the card exactly like the sentence it replaced */
          (r[2] ? '<span class="fine" style="display:block;white-space:normal">' +
            r[2] + "</span>" : "") + "</td></tr>";
      }).join("") +
      "</tbody></table>" +
      p.notes.map(function (n) {
        return '<p class="fine" style="margin:12px 0 0">' + esc(n) + "</p>";
      }).join("") +
      "</div>";
  };

  const milTable = (rows, moa) =>
    "<table><thead><tr><th>Dial (mil)</th><th class=\"n\">Range (m)</th>" +
    "<th class=\"n\">Spread</th></tr></thead><tbody>" +
    rows.map(function (r) {
      return "<tr><td>" + r.mils + '</td><td class="n">' + num(r.dist) + '</td>' +
        '<td class="n"><span class="fine">&plusmn;' +
        spreadAt(r.dist, moa).toFixed(1) + " m</span></td></tr>";
    }).join("") + "</tbody></table>";

  const tableFor = p => {
    if (p.table) return milTable(p.table, p.moa);
    if (p.tableLow || p.tableHigh) {
      return '<p class="fine" style="margin:0 0 14px">' + esc(p.tableSource || "") +
        " Below " + num(p.lowArcFrom) + " m only the high arc reaches; from there to" +
        " maximum range both do, and both dials are listed.</p>" +
        '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));' +
        'gap:30px">' +
        '<div><h3>Low arc</h3>' + milTable(p.tableLow, p.moa) + "</div>" +
        '<div><h3>High arc</h3>' + milTable(p.tableHigh, p.moa) + "</div>" +
        "</div>";
    }
    return '<div class="empty" style="text-align:left">' +
      '<span class="wip">No table published</span>' +
      "<h3>" + esc(p.name) + " has no elevation table here</h3>" +
      "<p>Its envelope is known and its bearing, distance and spread are on the" +
      " calculator above, because those need no table. What is not published anywhere is" +
      " the elevation for a given range, so it is not here.</p></div>";
  };

  const mortar = A.platforms.find(function (p) { return p.buildableId; });
  const mortarDef = mortar && byId[mortar.buildableId];

  write("artillery/index.html", page({
    title: "WARDOGS Artillery Calculator: L81 Mortar and SPH-2",
    desc: "Interactive map calculator for WARDOGS indirect fire. Place your gun and your target on Bakurani or Ozeti and get bearing, range, elevation for both arcs and spread, with range rings, the firing tables and where every number came from.",
    canonical: "/artillery/",
    body: '<section style="padding:0">' +

      /* The tool loads, not an article about the tool, and it sits outside the wrap so it
         gets the whole width of the screen rather than the 1180px a column of prose wants.
         It opens framed on the control zone, because that is the only ground the match is
         fought over. Everything below is reference for whoever scrolls. */
      mapApp.html +

      '<div class="wrap" style="padding-top:20px">' +
      '<p class="fine" style="margin:0 0 10px">One coordinate unit is ' + A.grid.unitMetres +
      " m, so 0.01 is a metre. Y counts north. Azimuth: 0&deg; north, 90&deg; east." +
      " The link in your address bar carries the whole picture, so copy it to hand a" +
      " fire mission to someone else.</p>" +

      '<span class="eyebrow" style="margin-top:40px">Indirect fire, checked ' +
      esc(A.checkedOn) + "</span>" +
      "<h1>Artillery</h1>" +
      '<p class="lede">Place your gun and your target on the map above, or type the' +
      " coordinates the game shows you. Out comes the bearing to traverse to, the range," +
      " what to dial on each arc that reaches, and how wide the shells will land.</p>" +

      '<h2 style="margin-top:52px">The platforms</h2>' +
      /* The shared .grid is auto-fill at 270px, which lays four tracks across a 1180px
         wrap and then leaves two of them empty, because there are only ever two
         platforms. Worse, each card then holds a stat table wider than the track, so the
         values were clipped. These two want half the width each. */
      '<div class="grid" style="margin-top:18px;' +
      'grid-template-columns:repeat(auto-fit,minmax(420px,1fr))">' +
      A.platforms.map(platformCard).join("") + "</div>" +

      adSlot("inArticle") +

      '<h2 style="margin-top:52px">What this means for a base</h2>' +
      "<p>A mortar in your FOB is not a way to defend your FOB. Its minimum range is " +
      num(mortar.minRange) + " m, and everything closer than that is unreachable from that" +
      " position no matter how the crew dials it. Your own wire, your own gate and anyone" +
      " already at your walls are all inside that circle. On the map above that circle is" +
      " the dashed ring.</p>" +
      "<p>So it is an offensive tube. Put it where it covers the ground you want to deny," +
      " an approach, a road, an objective, and accept that it does nothing for a fight that" +
      " has already reached you. If you want the mortar to cover a point, the gun has to be" +
      " at least " + num(mortar.minRange) + " m from it and no more than " +
      num(mortar.maxRange) + " m.</p>" +
      '<p class="fine">The rings live here, on the world map, because these coordinates' +
      " are the game&#39;s own and a metre here is a metre. The planner still draws no" +
      " rings on your plan: that needs a conversion from a plan cell to a metre, nothing" +
      " published establishes one, and a ring at the wrong scale would look like an answer" +
      " while being wrong. Early Access settles the scale, and then the two views can" +
      " join up: your plan placed on this map, with its mortar&#39;s reach drawn around" +
      " it.</p>" +

      '<h2 style="margin-top:52px">Firing tables</h2>' +
      '<div id="tables">' + A.platforms.map(function (p, i) {
        return '<div data-table="' + esc(p.id) + '"' + (i ? ' hidden' : '') + ">" +
          tableFor(p) + "</div>";
      }).join("") + "</div>" +

      '<div class="empty" style="margin-top:52px;text-align:left">' +
      '<span class="wip">Read this before you trust a number</span>' +
      "<h3>" + esc(A.dispute.what) + "</h3>" +
      "<p>" + esc(A.dispute.detail) + "</p>" +
      '<h3 style="margin-top:24px">What the tables do not account for</h3>' +
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
      }).join(", ") + ". The mortar table is MIT licensed and used with attribution; the" +
      " SPH-2 tables and map positions are transcribed from wardogs-artillery.com with" +
      " attribution. Terrain imagery is from WARDOGS and remains the property of" +
      " BULKHEAD; this is an unofficial fan project and claims no ownership of it.</p>" +
      "</div>" +

      (mortarDef ? '<p style="margin-top:34px">The ' + esc(mortarDef.name) +
        " costs " + num(mortarDef.cost) + " Build Supplies to put up. " +
        '<a class="btn" href="/planner/">Plan where it goes</a></p>' : "") +
      "</div></section>" +

      mapApp.script,
  }));
};
