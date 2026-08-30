/* Damage, shots to kill and what armour stops.
   Body sits at column zero deliberately. Indenting it would add whitespace inside
   these template literals, and that whitespace is page content. */
module.exports = ctx => {
  const { esc, BALLISTICS, page, write, written } = ctx;

/* ---------- ballistics ----------
   The one page on this site with numbers nobody at BULKHEAD has published. Every figure is
   either transcribed from a public table or solved back out of one, the derivation is in
   docs/ballistics-sources.md, and tools/solve-ballistics.js fails the build if the two
   cross-checks stop passing. What could not be derived honestly is listed as unsolved
   rather than filled in, because a calculator that quietly guesses is worse than a gap. */
{
  const B = BALLISTICS;
  const roundNames = B.rounds.map(function (r) { return r.id; });
  const classes = [];
  B.weapons.forEach(function (w) { if (classes.indexOf(w.class) < 0) classes.push(w.class); });
  classes.sort();

  const calById = {};
  B.calibres.forEach(function (c) { calById[c.id] = c; });

  const ammoRows = B.calibres.map(function (c) {
    return "<tr><td><b>" + esc(c.name) + "</b></td>" +
      "<td class=n>" + (c.pellets ? c.perPellet + " &times; " + c.pellets : c.damage) + "</td>" +
      "<td class=n>" + (c.velocity[0] === c.velocity[1]
        ? c.velocity[0] + " m/s" : c.velocity[0] + "&ndash;" + c.velocity[1] + " m/s") + "</td>" +
      "<td class=n>" + c.mass.toFixed(1) + " g</td>" +
      "<td class=n>" + c.bullet.toFixed(1) + " mm</td>" +
      "<td>" + c.rounds.join(", ") + "</td>" +
      "<td class=fine>" + esc(B.weapons.filter(function (w) { return w.calibre === c.id; })
        .map(function (w) { return w.name; }).join(", ")) + "</td></tr>";
  }).join("");

  const armourRows = B.rounds.map(function (r) {
    return "<tr><td><b>" + esc(r.name) + "</b> <span class=fine>" + esc(r.long) + "</span></td>" +
      r.blocks.map(function (b) {
        return "<td class=n>" + b + "%<br><span class=fine>keeps " +
          (Math.round((100 - b) * 100) / 100) + "%</span></td>";
      }).join("") + "</tr>";
  }).join("");

  write("ballistics/index.html", page({
    title: "WARDOGS Ballistics: damage, shots to kill and armour",
    desc: "What every WARDOGS round does to every armour tier, per hit zone, with shots to kill and time to kill. Derived from published tables, with the working shown.",
    canonical: "/ballistics/",
    body: '<section><div class="wrap">' +
      '<span class="eyebrow">Pre-launch, checked ' + esc(B.checkedOn) + '</span>' +
      '<h1>Ballistics</h1>' +
      '<p class="lede">What each round does to each armour tier, where you hit, and how many' +
      ' of them it takes. Point blank, because range falloff is the one thing nobody has' +
      ' published enough of to work out honestly.</p>' +

      '<div class="chips" style="margin-top:26px">' +
        roundNames.map(function (r, i) {
          return '<button class="chip" data-round="' + r + '" aria-pressed="' +
            (i === 0 ? "true" : "false") + '">' + r + '</button>';
        }).join("") +
      '</div>' +
      '<div class="chips" style="margin-top:8px">' +
        [0, 1, 2, 3, 4].map(function (a) {
          return '<button class="chip" data-armour="' + a + '" aria-pressed="' +
            (a === 0 ? "true" : "false") + '">' +
            (a === 0 ? "No armour" : "Level " + a) + '</button>';
        }).join("") +
      '</div>' +
      '<div class="chips" style="margin-top:8px">' +
        '<button class="chip" data-cls="" aria-pressed="true">All</button>' +
        classes.map(function (c) {
          return '<button class="chip" data-cls="' + esc(c) + '" aria-pressed="false">' +
            esc(c) + '</button>';
        }).join("") +
      '</div>' +
      '<p style="margin:16px 0 0"><label class="fine">Hit zone &nbsp;' +
        '<select id="zone">' + B.zones.map(function (z, i) {
          return '<option value="' + z.id + '"' + (z.id === "upper-torso" ? " selected" : "") +
            '>' + esc(z.name) + (z.armour ? " (" + z.armour + ")" : "") + '</option>';
        }).join("") + '</select></label></p>' +

      '<table id="ball"><thead><tr>' +
        '<th class="sortable" data-sort="ttk" data-dir="asc">Weapon</th>' +
        '<th>Calibre</th><th class="n">Damage</th><th class="n">Shots</th>' +
        '<th class="n">Time to kill</th><th class="n">Rounds/min</th>' +
      '</tr></thead><tbody></tbody></table>' +
      '<p class="fine" id="ballnote"></p>' +

      '<h2 style="margin-top:52px">Ammo chart</h2>' +
      '<p>Per calibre, so every weapon chambering the same round starts from the same number.</p>' +
      '<table><thead><tr><th>Calibre</th><th class="n">Damage</th><th class="n">Velocity</th>' +
      '<th class="n">Mass</th><th class="n">Bullet</th><th>Loads</th><th>Chambered by</th></tr></thead>' +
      '<tbody>' + ammoRows + '</tbody></table>' +

      '<h2 style="margin-top:52px">What armour stops</h2>' +
      '<p>How much of a hit each armour tier takes off, by round type. This is the table the' +
      ' rest of the page is built on, and it is the one part three separate sources agree on.</p>' +
      '<table><thead><tr><th>Round</th><th class="n">Level 1</th><th class="n">Level 2</th>' +
      '<th class="n">Level 3</th><th class="n">Level 4</th></tr></thead>' +
      '<tbody>' + armourRows + '</tbody></table>' +

      '<div class="empty" style="margin-top:52px;text-align:left">' +
        '<span class="wip">Not solved yet</span>' +
        '<h3>Two things on this page are missing on purpose</h3>' +
        '<ul style="max-width:64ch">' + B.unsolved.map(function (u) {
          return "<li>" + esc(u) + "</li>";
        }).join("") + '</ul>' +
        '<p class="fine" style="margin:14px 0 0">Health is 100. Per-weapon damage is solved' +
        ' back out of published shots-to-kill figures rather than copied, which means it' +
        ' arrives with error bars: hover a damage figure to see the interval it came from.' +
        ' The full working, and the two checks it has to pass, are written up in' +
        ' docs/ballistics-sources.md in the repository.</p>' +
      '</div>' +

      '<p style="margin-top:34px"><a class="btn" href="/planner/">Open the planner</a></p>' +
      '</div></section>' +

      '<script>(function(){' +
      'var B=' + JSON.stringify({
        health: B.health, rounds: B.rounds, calibres: B.calibres,
        zones: B.zones, weapons: B.weapons,
      }) + ';' +
      'var calById={},zoneById={},roundById={};' +
      'B.calibres.forEach(function(c){calById[c.id]=c});' +
      'B.zones.forEach(function(z){zoneById[z.id]=z});' +
      'B.rounds.forEach(function(r){roundById[r.id]=r});' +
      'var round="FMJ",armour=0,cls="",zone="upper-torso";' +
      'function pick(w){' +
      ' var cal=calById[w.calibre];' +
      ' if(cal.rounds.indexOf(round)>=0)return round;' +
      ' return cal.rounds[0];}' +
      /* A round only reduces where the armour actually covers. Hit an unarmoured neck and
         the tier does not matter, which is the whole reason the zone picker is here. */
      'function calc(w){' +
      ' var z=zoneById[zone],r=roundById[pick(w)];' +
      ' var base=w.torso*z.mult;' +
      ' var keep=(armour>0&&z.armour)?(100-r.blocks[armour-1])/100:1;' +
      ' var dmg=base*keep;' +
      ' var stk=dmg>0?Math.ceil(B.health/dmg):Infinity;' +
      ' var ttk=(stk>1&&w.rpm)?(stk-1)/(w.rpm/60):0;' +
      ' return {dmg:dmg,stk:stk,ttk:ttk,round:r.id,keep:keep};}' +
      'function fmt(n){return n>=100?Math.round(n):Math.round(n*10)/10;}' +
      'function render(){' +
      ' var rows=B.weapons.filter(function(w){return !cls||w.class===cls;})' +
      '   .map(function(w){var c=calc(w);return {w:w,c:c};})' +
      '   .sort(function(a,b){return (a.c.ttk-b.c.ttk)||(a.c.stk-b.c.stk);});' +
      ' var tb=document.querySelector("#ball tbody");tb.innerHTML="";' +
      ' rows.forEach(function(row){' +
      '  var w=row.w,c=row.c,tr=document.createElement("tr");' +
      '  tr.innerHTML="<td><b>"+w.name+"</b> <span class=fine>"+w.class+"</span></td>"' +
      '   +"<td>"+calById[w.calibre].name+" <span class=fine>"+c.round+"</span></td>"' +
      /* Single quotes on the attribute so nothing here needs escaping. This line has
         already shipped broken once by way of a double quote that survived one layer of
         nesting and not the next. */
      '   +"<td class=n title=\'solved from shots to kill: "+w.range[0].toFixed(1)+" to "' +
      '     +w.range[1].toFixed(1)+" at the torso\'>"+fmt(c.dmg)+"</td>"' +
      '   +"<td class=n>"+c.stk+"</td>"' +
      '   +"<td class=n>"+(c.stk===1?"one shot":c.ttk.toFixed(2)+"s")+"</td>"' +
      '   +"<td class=n>"+(w.rpm||"&mdash;")+"</td>";' +
      '  tb.appendChild(tr);});' +
      ' var z=zoneById[zone];' +
      ' document.getElementById("ballnote").textContent=' +
      '  z.armour?(armour?"Level "+armour+" "+z.armour+" is taking a share of every hit here.":' +
      '   "This zone is covered by the "+z.armour+", so armour will matter once you set a tier.")' +
      '  :"Nothing covers this zone, so the armour tier changes nothing.";}' +
      'function group(attr,set){' +
      ' Array.prototype.forEach.call(document.querySelectorAll("[data-"+attr+"]"),function(b){' +
      '  b.addEventListener("click",function(){' +
      '   Array.prototype.forEach.call(document.querySelectorAll("[data-"+attr+"]"),function(o){' +
      '    o.setAttribute("aria-pressed",o===b?"true":"false");});' +
      '   set(b.getAttribute("data-"+attr));render();});});}' +
      'group("round",function(v){round=v;});' +
      'group("armour",function(v){armour=+v;});' +
      'group("cls",function(v){cls=v;});' +
      'document.getElementById("zone").addEventListener("change",function(e){' +
      ' zone=e.target.value;render();});' +
      'render();' +
      '}());<\/script>',
  }));
}

/* ---------- sections waiting on the game ----------
   Armory, Loadouts and Vehicles are all real plans, but every number in them has to be
   read off the game and the game is between tests. They ship as structure now so the
   pages exist, are linked, and are indexed - and so filling them in later is a data job
   rather than a build job. */
};
