/* Ballistics: the damage calculator and the ranking, on one page.
 *
 * Two jobs, deliberately joined. Pick a weapon, a load and what the target is wearing and
 * the top half tells you what one shot does and where. The bottom half then ranks every
 * weapon in the game under those same settings, so "what should I be carrying" and "what
 * does this do" stop being two different pages that quietly disagree.
 *
 * The arithmetic is not in this file. It lives in tools/site/ballistics-model.js, which is
 * read off disk and inlined below and required by test/ballistics.js, so the suite tests
 * the code the browser actually runs rather than a second copy of it.
 *
 * Written with string concatenation and normal indentation, like tools/site/pages/artillery.js.
 * The older modules sit at column zero because their bodies were moved verbatim out of one
 * big file and re-indenting them would have changed whitespace that is page content.
 *
 * Colour. Two systems, doing two different jobs, which is why neither is decorative:
 *   round type   identity. Which load is this. Five fixed hues from the reference palette,
 *                validated as a set, and every mark that wears one also states its round
 *                in text, so a reader who cannot separate the aqua from the magenta loses
 *                nothing.
 *   time to kill state. Fast through very slow. The reserved status scale, always beside
 *                its own label and the number itself. It is never a sixth series.
 * Bar length carries time to kill as well, so the ranking survives being printed in grey.
 */
module.exports = ctx => {
  const { fs, path, ROOT, esc, BALLISTICS, ARMORY, adSlot, page, write } = ctx;
  const B = BALLISTICS;
  const MODEL = fs.readFileSync(path.join(ROOT, "tools/site/ballistics-model.js"), "utf8");

  const roundById = {};
  B.rounds.forEach(r => { roundById[r.id] = r; });
  const calById = {};
  B.calibres.forEach(c => { calById[c.id] = c; });
  const zoneById = {};
  B.zones.forEach(z => { zoneById[z.id] = z; });

  const classes = [];
  B.weapons.forEach(w => { if (classes.indexOf(w.class) < 0) classes.push(w.class); });
  classes.sort();

  const chamberedBy = id => B.weapons.filter(w => w.calibre === id).map(w => w.name);

  /* ---------- what a round costs ----------
     Prices live in data/armory.json and only there. Joining them here rather than copying
     a number across is the whole rule of this repo: a figure that exists twice drifts, and
     it has three times. The join is by exact vendor name, listed per calibre in the data,
     because the shelf and the damage tables do not use the same names for the same thing.
     Matching on a prefix instead looked tidier and quietly lost buckshot its price. */
  const ammoByName = {};
  ARMORY.items.forEach(it => { if (it.cat === "ammunition") ammoByName[it.name] = it; });
  const weaponByName = {};
  ARMORY.items.forEach(it => { if (it.cat === "weapons") weaponByName[it.name] = it; });

  const priceOf = {};        // priceOf[calibreId][roundId] = dollars per single round
  B.calibres.forEach(c => {
    priceOf[c.id] = {};
    Object.keys(c.vendor || {}).forEach(rid => {
      const it = ammoByName[c.vendor[rid]];
      if (it && it.price !== null) priceOf[c.id][rid] = it.price / (it.per || 1);
    });
  });

  const money = n => n >= 10 ? "$" + Math.round(n) : "$" + n.toFixed(2);

  /* ---------- the body ----------
     A schematic, not an anatomy drawing. It exists so that "the vest does not cover the
     pelvis" is something you see rather than something you read, which is the single most
     expensive thing to get wrong in this game. Armoured zones carry a hatch, and the hatch
     appears only when that armour is actually set. */
  const mirror = pts => pts.map(p => [200 - p[0], p[1]]);
  const poly = pts => pts.map(p => p[0] + "," + p[1]).join(" ");
  /* Traced off the reference the owner supplied on 2026-08-31: a plated figure, faceted
     rather than rounded, each zone its own armour panel with a dark seam between. Torso in
     three bands, hips as a brief with a notch, a pauldron cap flaring off the top of each
     upper arm, mitten hands and wedge boots.

     An earlier pass copied the figure off a different fan site on the understanding it came
     from the game. It did not, and this replaces it. */
  const FIGURE = [
    ["head",         [[[82, 10], [118, 10], [124, 23], [124, 46], [113, 60], [87, 60], [76, 46], [76, 23]]]],
    ["neck",         [[[89, 62], [111, 62], [111, 78], [89, 78]]]],
    ["upper-torso",  [[[64, 79], [136, 79], [139, 128], [61, 128]]]],
    ["middle-torso", [[[62, 131], [138, 131], [136, 161], [64, 161]]]],
    ["lower-torso",  [[[64, 163], [136, 163], [133, 198], [67, 198]]]],
    ["pelvis",       [[[67, 200], [133, 200], [130, 222], [100, 233], [70, 222]]]],
    ["upper-arm",    [[[40, 88], [48, 80], [64, 79], [66, 152], [44, 157]]]],
    ["lower-arm",    [[[44, 159], [66, 154], [64, 206], [42, 212]]]],
    ["hand",         [[[42, 214], [64, 208], [62, 240], [52, 252], [41, 246]]]],
    ["upper-leg",    [[[68, 235], [99, 237], [97, 303], [73, 303]]]],
    ["lower-leg",    [[[74, 305], [96, 305], [93, 389], [77, 389]]]],
    ["foot",         [[[70, 391], [93, 391], [95, 412], [80, 423], [70, 414]]]],
  ];
  const SYMMETRIC = ["upper-arm", "lower-arm", "hand", "upper-leg", "lower-leg", "foot"];

  const figureSvg = () => {
    let out = '<svg class="body" viewBox="0 0 200 432" role="img" ' +
      'aria-label="Hit zones. Pick one to see what a shot there does.">' +
      '<defs><pattern id="plate" width="6" height="6" patternUnits="userSpaceOnUse" ' +
      'patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" ' +
      'stroke="var(--text)" stroke-width="1.4" opacity=".5"/></pattern>' +
      /* The game frames its soldier on a grid, and without one the figure floats in a
         panel with nothing to sit against. */
      '<pattern id="bgrid" width="18" height="18" patternUnits="userSpaceOnUse">' +
      '<path d="M18 0H0V18" fill="none" stroke="var(--line2)" stroke-width="1"/>' +
      "</pattern></defs>" +
      '<rect width="200" height="432" fill="url(#bgrid)" opacity=".45" pointer-events="none"/>';
    FIGURE.forEach(entry => {
      const id = entry[0];
      const shapes = entry[1].slice();
      if (SYMMETRIC.indexOf(id) >= 0) shapes.push(mirror(entry[1][0]));
      const zone = zoneById[id];
      shapes.forEach((pts, i) => {
        const label = zone.name + (SYMMETRIC.indexOf(id) >= 0 ? (i ? " (right)" : " (left)") : "");
        out += '<polygon class="bz" data-zone="' + id + '" points="' + poly(pts) + '" ' +
          'tabindex="0" role="button" aria-label="' + esc(label) + '"><title>' +
          esc(label) + "</title></polygon>";
        if (zone.armour) {
          out += '<polygon class="bp" data-plate="' + zone.armour + '" points="' + poly(pts) +
            '" fill="url(#plate)" pointer-events="none"/>';
        }
      });
    });
    return out + "</svg>";
  };

  /* ---------- static tables ---------- */
  const roundSwatch = r =>
    '<span class="rd" style="--rd:' + r.tint + '">' + esc(r.name) + "</span>";

  const armourRows = B.rounds.map(r =>
    "<tr><td>" + roundSwatch(r) + ' <span class="fine">' + esc(r.long) + "</span></td>" +
    r.blocks.map(b =>
      '<td class="n">' + b + '%<br><span class="fine">' +
      (Math.round((100 - b) * 100) / 100) + "% gets through</span></td>").join("") +
    "</tr>").join("");

  const ammoRows = B.calibres.map(c => {
    /* Each load is one unbreakable unit. Left to wrap freely, a line break lands between
       "AP" and its price and the table starts quoting the wrong number at the reader. */
    const loads = c.rounds.map(id => {
      const p = priceOf[c.id][id];
      return '<span class="load">' + roundSwatch(roundById[id]) +
        (p ? ' <span class="fine">' + money(p) + "</span>" : "") + "</span>";
    }).join("");
    return '<tr data-cal="' + c.id + '">' +
      "<td><b>" + esc(c.name) + "</b>" +
      (c.pellets ? ' <span class="fine">' + c.pellets + " pellets</span>" : "") + "</td>" +
      '<td class="n">' + (c.pellets ? c.perPellet + " &times; " + c.pellets : c.damage) + "</td>" +
      '<td class="n">' + (c.velocity[0] === c.velocity[1]
        ? c.velocity[0] : c.velocity[0] + "&ndash;" + c.velocity[1]) + " m/s</td>" +
      '<td class="n">' + c.mass.toFixed(1) + " g</td>" +
      '<td class="n">' + c.bullet.toFixed(1) + " mm</td>" +
      "<td>" + loads + "</td>" +
      '<td class="fine">' + esc(chamberedBy(c.id).join(", ")) + "</td></tr>";
  }).join("");

  const gapRows = B.unfiguredLoads.map(l =>
    "<tr><td><b>" + esc(l.name) + "</b></td>" +
    "<td>" + roundSwatch(roundById[l.round]) + "</td>" +
    "<td>" + esc(l.chamberedBy) + "</td>" +
    '<td class="fine">' + esc(l.why) + "</td></tr>").join("");

  const gapWeaponRows = B.unfiguredWeapons.map(w =>
    "<tr><td><b>" + esc(w.name) + "</b></td>" +
    "<td>" + esc(w.kind) + "</td>" +
    "<td>" + esc(w.calibre || "not stated") + "</td>" +
    '<td class="fine">' + esc(w.why) + "</td></tr>").join("");

  const tierChips = slot => {
    const a = B.armour.filter(x => x.slot === slot)[0];
    return [0, 1, 2, 3, 4].map(t =>
      '<button class="chip" data-' + slot + '="' + t + '" aria-pressed="' +
      (t === 0 ? "true" : "false") + '">' +
      (t === 0 ? "None" : "L" + t) + "</button>").join("") +
      '<span class="chip-note fine">' + esc(a.name) + "</span>";
  };

  const legend = B.rounds.map(r =>
    '<span class="lg"><i style="background:' + r.tint + '"></i>' + esc(r.name) +
    ' <span class="fine">' + esc(r.long) + "</span></span>").join("") +
    '<span class="lg-sep"></span>' +
    B.ttkBands.map(b =>
      '<span class="lg"><i class="sq" style="background:' + b.tint + '"></i>' +
      esc(b.name) + "</span>").join("");

  write("ballistics/index.html", page({
    title: "WARDOGS Damage Calculator and Ammo Chart",
    desc: "Pick a weapon, a load and what the target is wearing, and see damage, shots to kill and time to kill per hit zone, with every weapon in the game ranked underneath. Plus the full ammo chart and armour table.",
    canonical: "/ballistics/",
    body: '<section><div class="wrap">' +
      '<span class="eyebrow">Pre-launch, checked ' + esc(B.checkedOn) + "</span>" +
      "<h1>Damage</h1>" +
      '<p class="lede">What a round does, where it lands, and what the man in front of you' +
      " is wearing. Set it up once and the ranking underneath re-sorts every weapon in the" +
      " game to match.</p>" +
      '<p class="lede sub">Point blank, because range falloff is the one thing nobody has' +
      " published enough of to work out honestly. The rest is derived from published tables" +
      " with the working shown, and what could not be derived is listed as a gap rather" +
      " than filled in.</p>" +

      /* ---------- the calculator ---------- */
      /* The shelf sits inside this wrapper and on top of the calculator rather than after
         it. As a sibling in the flow it added its own height to the page every time it
         opened, shoved everything below it down, and then scrolled to itself, so choosing a
         weapon moved the page twice and put the numbers you were reading somewhere else. */
      '<div class="calc-wrap">' +
      '<div class="calc" id="calc">' +
        '<div class="calc-body">' + figureSvg() +
          '<p class="fine" id="cover"></p>' +
        "</div>" +

        '<div class="calc-ctl">' +
          /* The weapon is chosen by picking the weapon, not by reading its name in a list.
             The shelf opens under the calculator with every gun's art, filtered by class. */
          '<p class="ctl"><label>Weapon</label></p>' +
          '<button type="button" class="wpn-open" id="wpnOpen" aria-expanded="false"' +
          ' aria-controls="wpnShelf"><b id="wpnName">M4</b><span>Change weapon</span></button>' +
          /* The gun you are reading the numbers for, shown the way the vendor shows it.
             An option list cannot carry a picture, so the picture sits beside it. */
          '<p class="wpn-art"><img id="wpnart" alt="" width="150" height="60" hidden></p>' +
          '<p class="ctl"><label>Load</label><span class="chips" id="rounds"></span></p>' +
          '<p class="ctl"><label>Helmet</label><span class="chips">' + tierChips("helmet") + "</span></p>" +
          '<p class="ctl"><label>Body armour</label><span class="chips">' + tierChips("vest") + "</span></p>" +
          '<p class="ctl" id="pelletrow" hidden><label for="pellets">Pellets on target</label>' +
            '<input id="pellets" type="range" min="1" max="8" value="8"> ' +
            '<span class="n" id="pelletn">8 of 8</span></p>' +
          '<p class="ctl"><label for="dist">Distance</label>' +
            '<input id="dist" type="range" min="0" max="400" step="10" value="50"> ' +
            '<span class="n" id="distn">50 m</span></p>' +
        "</div>" +

        '<div class="calc-out">' +
          '<div class="hero"><b id="dmg">0</b><span>damage per shot</span></div>' +
          '<div class="hero"><b id="stk">0</b><span>shots to kill</span></div>' +
          '<div class="hero"><b id="ttk">0</b><span>time to kill</span></div>' +
          '<p class="fine" id="chain"></p>' +
          '<p class="fine" id="armnote"></p>' +
          '<p class="fine" id="flight"></p>' +
          '<p style="margin-top:14px"><button class="btn sm" id="copy">Copy this setup as a link</button></p>' +
        "</div>" +
      "</div>" +

      '<div class="vpicker" id="wpnShelf" hidden>' +
        '<p class="vpicker-head">Pick a weapon' +
        '<button type="button" class="vpicker-x" id="wpnClose">Close</button></p>' +
        '<div class="chips" role="group" aria-label="Filter by class" style="margin-bottom:12px">' +
          '<button class="chip" data-wcls="" aria-pressed="true">All</button>' +
          classes.map(function (c) {
            return '<button class="chip" data-wcls="' + esc(c) + '" aria-pressed="false">' +
              esc(c) + "</button>";
          }).join("") +
        "</div>" +
        '<div class="vgrid">' +
          B.weapons.map(function (w) {
            const it = weaponByName[w.name];
            return '<button type="button" class="vcard" data-wpick="' + esc(w.name) + '"' +
              ' data-wclass="' + esc(w.class) + '"' +
              ' aria-pressed="' + (w.name === "M4" ? "true" : "false") + '">' +
              '<span class="vcard-tag">' + esc(w.calibre) + "</span>" +
              '<span class="vcard-art">' +
              (it && it.icon ? '<img src="/game-icons/' + it.icon + '.png" alt="" width="52" height="52" loading="lazy">' : "") +
              "</span>" +
              '<span class="vcard-name">' + esc(w.name) + "</span></button>";
          }).join("") +
        "</div>" +
      "</div>" +
      "</div>" +

      '<h2 style="margin-top:16px">Every zone, this weapon, this armour</h2>' +
      '<div style="overflow-x:auto"><table id="zt"><thead><tr><th>Zone</th>' +
      '<th class="n">Damage</th><th class="n">Shots</th><th class="n">Time to kill</th>' +
      '<th class="n">Armour took</th></tr></thead><tbody></tbody></table></div>' +

      "</div></section>" +

      /* ---------- the ranking ---------- */
      '<section><div class="wrap">' +
      "<h2>Ranking</h2>" +
      '<p>Every weapon under the settings above. A weapon that cannot chamber the load you' +
      " picked falls back to what it does chamber, and says so.</p>" +
      '<div class="lgs">' + legend + "</div>" +
      '<div class="chips" style="margin-top:18px">' +
        '<button class="chip" data-cls="" aria-pressed="true">All</button>' +
        classes.map(c => '<button class="chip" data-cls="' + esc(c) + '" aria-pressed="false">' +
          esc(c) + "</button>").join("") +
      "</div>" +
      '<div class="chips" style="margin-top:8px">' +
        '<button class="chip" data-by="ttk" aria-pressed="true">By time to kill</button>' +
        '<button class="chip" data-by="dmg" aria-pressed="false">By damage</button>' +
        '<button class="chip" data-by="stk" aria-pressed="false">By shots</button>' +
        '<button class="chip" data-by="rpm" aria-pressed="false">By fire rate</button>' +
      "</div>" +
      '<div class="rank" id="rank"></div>' +
      '<p class="fine" id="ranknote"></p>' +
      adSlot("inArticle") +
      "</div></section>" +

      /* ---------- the reference tables ---------- */
      '<section><div class="wrap">' +
      "<h2>Ammo chart</h2>" +
      "<p>Per calibre, so every weapon chambering the same round starts from the same" +
      " number. Prices are per single round, worked out from the vendor's pack price.</p>" +
      '<div style="overflow-x:auto"><table><thead><tr><th>Calibre</th><th class="n">Damage</th>' +
      '<th class="n">Velocity</th><th class="n">Mass</th><th class="n">Bullet</th>' +
      "<th>Loads and what they cost</th><th>Chambered by</th></tr></thead>" +
      "<tbody>" + ammoRows + "</tbody></table></div>" +

      '<h2 style="margin-top:52px">What armour stops</h2>' +
      "<p>How much of a hit each tier takes off, by load. This is the table the whole page" +
      " is built on, and it is the one part three separate sources agree on. Read it" +
      " across: flesh damage is the best round in the game against a bare zone and the" +
      " worst by a mile against a plate.</p>" +
      '<div style="overflow-x:auto"><table><thead><tr><th>Load</th><th class="n">Level 1</th>' +
      '<th class="n">Level 2</th><th class="n">Level 3</th><th class="n">Level 4</th>' +
      "</tr></thead><tbody>" + armourRows + "</tbody></table></div>" +
      B.rounds.map(r => '<p class="fine" style="margin:8px 0 0">' + roundSwatch(r) + " " +
        esc(r.note) + "</p>").join("") +

      "</div></section>" +

      /* ---------- how it works ---------- */
      '<section><div class="wrap">' +
      "<h2>How a shot resolves</h2>" +
      '<p class="lede sub" style="margin-top:0">Four things happen, in this order, and' +
      " nothing else does. Knowing the order is most of knowing the game.</p>" +
      '<div class="features">' +
        "<div><h3>1. The weapon</h3><p>Every weapon has one damage figure, measured at the" +
        " upper torso at point blank. Two rifles in the same calibre are not necessarily" +
        " the same weapon: an M4 and a Galil both fire 5.56 and one of them hits harder." +
        " That figure is derived, not copied, and hovering one on this page shows the" +
        " interval it was solved out of.</p></div>" +

        "<div><h3>2. Where it lands</h3><p>The zone multiplies it. A head is 2.17 times an" +
        " upper torso, a hand is 0.27. The multiplier belongs to the body and not to the" +
        " gun, which is why one profile covers every weapon, and it is measured off the" +
        " assault rifle column with the caveat noted below.</p></div>" +

        "<div><h3>3. What is covering it</h3><p>Armour only counts on the zones it covers." +
        " A helmet covers the head. A vest covers the three torso zones. Nothing covers the" +
        " neck, the pelvis, the arms or the legs, so a level 4 vest changes precisely" +
        " nothing about a shot to the hip. The hatching on the figure above is the armour" +
        " you have set, drawn where it actually is.</p></div>" +

        "<div><h3>4. Penetration is the load</h3><p>There is no separate penetration stat." +
        " What gets through is decided by which of the five loads you fired and which tier" +
        " it hit, and that is the whole of it. Armour piercing keeps two thirds of itself" +
        " through level 4. Flesh damage keeps three quarters of one percent. Standard sits" +
        " between them and costs a quarter of what AP does.</p></div>" +

        "<div><h3>Flesh damage, honestly</h3><p>HP is the round this page is least sure" +
        " about. Its armour figures are published and used here. Its damage against a bare" +
        " zone is not published anywhere, so the calculator treats it as equal to standard," +
        " which is a floor and almost certainly low: the vendor charges nearly twice as" +
        " much for it. Do not read an unarmoured HP number here as a measurement.</p></div>" +

        "<div><h3>Buckshot is eight things</h3><p>A 12g shell is eight pellets, each" +
        " carrying an eighth of the hit, and they spread. Every shotgun figure here assumes" +
        " all eight land, which is true at a doorway and a fantasy at thirty metres. The" +
        " pellet slider in the calculator is there so you can be honest with" +
        " yourself.</p></div>" +
      "</div>" +

      '<h2 style="margin-top:52px">Sold, but not on the chart</h2>' +
      "<p>Ammunition the vendor stocks that this page cannot put a damage figure on. Listed" +
      " rather than dropped, because a load missing from a chart reads as a load that does" +
      " not exist.</p>" +
      '<div style="overflow-x:auto"><table><thead><tr><th>Load</th><th>Type</th>' +
      "<th>Chambered by</th><th>Why it is not on the chart</th></tr></thead>" +
      "<tbody>" + gapRows + "</tbody></table></div>" +

      '<h2 style="margin-top:44px">Weapons with no damage row</h2>' +
      "<p>In the armory, not in the ranking, and here is why for each one.</p>" +
      '<div style="overflow-x:auto"><table><thead><tr><th>Weapon</th><th>Kind</th>' +
      "<th>Calibre</th><th>Why</th></tr></thead>" +
      "<tbody>" + gapWeaponRows + "</tbody></table></div>" +

      '<div class="empty" style="margin-top:52px;text-align:left">' +
        '<span class="wip">Not solved yet</span>' +
        "<h3>Three things on this page are missing on purpose</h3>" +
        '<ul style="max-width:64ch">' +
        B.unsolved.map(u => "<li>" + esc(u) + "</li>").join("") + "</ul>" +
        '<p class="fine" style="margin:14px 0 0">Health is 100. Per-weapon damage is solved' +
        " back out of published shots-to-kill figures rather than copied, which means it" +
        " arrives with error bars: hover a damage figure to see the interval it came from." +
        " The full working, and the checks it has to pass on every build, are written up in" +
        " docs/ballistics-sources.md in the repository.</p>" +
      "</div>" +

      '<p style="margin-top:34px"><a class="btn" href="/armory/">Price these up</a> ' +
      '<a class="btn" href="/loadouts/">Cost a full kit</a></p>' +
      "</div></section>" +

      "<script>" + MODEL + "\n(function(){" + client() + "}());<\/script>",
  }));

  /* ---------- the client ----------
     Kept in its own function so the markup above reads as markup. Everything it needs
     arrives in one blob; nothing is re-stated here that data/ballistics.json already says. */
  function client() {
    const blob = {
      health: B.health,
      rounds: B.rounds,
      calibres: B.calibres,
      zones: B.zones,
      weapons: B.weapons,
      armour: B.armour,
      bands: B.ttkBands,
      /* Weapon name to icon slug, joined off the armory the same way prices are. The slug
         is never written down here: it lives on the armory item, and a weapon the wiki has
         no icon for simply does not appear, which is what keeps this honest. */
      icon: B.weapons.reduce((m, w) => {
        const it = weaponByName[w.name];
        if (it && it.icon) m[w.name] = it.icon;
        return m;
      }, {}),
    };
    return "" +
      "var B=" + JSON.stringify(blob) + ";" +
      "var calById={},zoneById={},roundById={};" +
      "B.calibres.forEach(function(c){calById[c.id]=c});" +
      "B.zones.forEach(function(z){zoneById[z.id]=z});" +
      "B.rounds.forEach(function(r){roundById[r.id]=r});" +
      "var byName={};B.weapons.forEach(function(w){byName[w.name]=w});" +

      "var S={w:'M4',r:'FMJ',helmet:0,vest:0,zone:'upper-torso',pellets:8,dist:50,cls:'',by:'ttk'};" +

      /* the fragment is the setup, so a solution is a link. Same idea as the artillery
         page: nothing is stored, and pasting the URL to somebody reproduces the screen. */
      "function readHash(){" +
      " var h=location.hash.replace('#','');if(!h)return;" +
      " h.split('&').forEach(function(kv){" +
      "  var i=kv.indexOf('='),k=kv.slice(0,i),v=decodeURIComponent(kv.slice(i+1));" +
      "  if(k==='w'&&byName[v])S.w=v;" +
      "  else if(k==='r'&&roundById[v])S.r=v;" +
      "  else if(k==='z'&&zoneById[v])S.zone=v;" +
      "  else if(k==='h')S.helmet=Math.max(0,Math.min(4,+v||0));" +
      "  else if(k==='v')S.vest=Math.max(0,Math.min(4,+v||0));" +
      "  else if(k==='p')S.pellets=Math.max(1,Math.min(8,+v||8));" +
      "  else if(k==='d')S.dist=Math.max(0,Math.min(400,+v||0));});}" +
      "function writeHash(){" +
      " var h='w='+encodeURIComponent(S.w)+'&r='+S.r+'&h='+S.helmet+'&v='+S.vest+" +
      "  '&z='+S.zone+'&d='+S.dist+(shotgun()?'&p='+S.pellets:'');" +
      " history.replaceState(null,'','#'+h);}" +

      "function el(id){return document.getElementById(id);}" +
      "function weapon(){return byName[S.w];}" +
      "function cal(){return calById[weapon().calibre];}" +
      "function shotgun(){return !!cal().pellets;}" +
      "function loadFor(w){" +
      " var c=calById[w.calibre];" +
      " return roundFor(c,S.r,roundById);}" +
      "function pellets(w){" +
      " var c=calById[w.calibre];" +
      " return c.pellets?{hit:(w.name===S.w?S.pellets:c.pellets),of:c.pellets}:null;}" +
      "function tiers(){return {helmet:S.helmet,vest:S.vest};}" +

      "function fmt(n){return n>=100?String(Math.round(n)):String(Math.round(n*10)/10);}" +
      "function secs(stk,ttk){return stk===1?'one shot':ttk.toFixed(2)+' s';}" +

      /* ---------- the calculator ---------- */
      "function renderRounds(){" +
      " var c=cal(),box=el('rounds');box.textContent='';" +
      " c.rounds.forEach(function(id){" +
      "  var r=roundById[id],b=document.createElement('button');" +
      "  b.className='chip rd-chip';b.style.setProperty('--rd',r.tint);" +
      "  b.setAttribute('data-round',id);" +
      "  b.setAttribute('aria-pressed',id===S.r?'true':'false');" +
      "  b.textContent=r.name;" +
      "  var s=document.createElement('small');s.textContent=r.long;b.appendChild(s);" +
      "  b.addEventListener('click',function(){S.r=id;render();});" +
      "  box.appendChild(b);});" +
      /* A weapon that cannot chamber the picked round still has to show something pressed,
         so the chips say what is actually loaded rather than what was asked for. */
      " if(c.rounds.indexOf(S.r)<0){" +
      "  var sub=c.rounds[0];" +
      "  Array.prototype.forEach.call(box.children,function(b){" +
      "   b.setAttribute('aria-pressed',b.getAttribute('data-round')===sub?'true':'false');});}}" +

      "function renderBody(){" +
      " var w=weapon(),r=loadFor(w);" +
      " Array.prototype.forEach.call(document.querySelectorAll('.bz'),function(p){" +
      "  var z=zoneById[p.getAttribute('data-zone')];" +
      "  var s=shot(w,z,r,tiers(),pellets(w));" +
      "  var k=toKill(s.damage,w.rpm,B.health);" +
      "  var band=bandFor(B.bands,k.stk,k.ttk);" +
      /* Only the zone you picked wears its time to kill. Colouring all twelve at once put
         four hues on the figure at all times and it read as a heat map of nothing in
         particular, when the zone table underneath already gives every zone its number.
         The rest stay the plate colour, so the figure looks like the target and the one
         thing you asked about is the one thing lit up. */
      "  var on=z.id===S.zone;" +
      "  p.style.fill=on?band.tint:'';" +
      "  p.setAttribute('data-on',on?'1':'0');" +
      "  var t=p.querySelector('title');" +
      "  if(t)t.textContent=z.name+': '+fmt(s.damage)+' damage, '+k.stk+' shot'+" +
      "   (k.stk===1?'':'s')+', '+secs(k.stk,k.ttk);});" +
      " Array.prototype.forEach.call(document.querySelectorAll('.bp'),function(p){" +
      "  p.style.display=S[p.getAttribute('data-plate')]?'':'none';});" +
      " var worn=[];" +
      " if(S.helmet)worn.push('Level '+S.helmet+' helmet over the head');" +
      " if(S.vest)worn.push('Level '+S.vest+' armour over the three torso zones');" +
      " el('cover').textContent=worn.length?('Hatched: '+worn.join(', ')+'. Everything else is bare.')" +
      "  :'No armour. Every zone is bare, so the load barely matters and the zone is everything.';}" +

      "function renderCalc(){" +
      " var w=weapon(),c=cal(),z=zoneById[S.zone],r=loadFor(w);" +
      " var art=el('wpnart'),slug=B.icon[S.w];" +
      " if(slug){art.src='/game-icons/'+slug+'.png';art.alt=S.w;art.hidden=false;}" +
      " else{art.hidden=true;art.removeAttribute('src');}" +
      " var s=shot(w,z,r,tiers(),pellets(w));" +
      " var k=toKill(s.damage,w.rpm,B.health);" +
      " var band=bandFor(B.bands,k.stk,k.ttk);" +
      " el('dmg').textContent=fmt(s.damage);" +
      " el('dmg').title='solved from shots to kill: '+w.range[0].toFixed(1)+' to '+" +
      "  w.range[1].toFixed(1)+' at the torso';" +
      " el('stk').textContent=isFinite(k.stk)?k.stk:'never';" +
      " el('ttk').textContent=secs(k.stk,k.ttk);" +
      " el('ttk').style.color=band.tint;" +
      " el('ttk').parentNode.title=band.name;" +
      " var chain=w.name+' does '+fmt(w.torso)+' at the upper torso. The '+" +
      "  z.name.toLowerCase()+' multiplies that by '+z.mult+', giving '+fmt(s.base)+'.';" +
      " if(s.pelletFraction<1)chain+=' '+S.pellets+' of '+c.pellets+' pellets land, so '+" +
      "  fmt(s.base*s.pelletFraction)+' arrives.';" +
      " el('chain').textContent=chain;" +
      " var an;" +
      " if(!s.slot)an='Nothing covers the '+z.name.toLowerCase()+'. Armour is irrelevant here"+
      "  and every tier gives the same number.';" +
      " else if(!s.tier)an='The '+s.slot+' covers this zone, so a tier here would matter.'+" +
      "  ' Set one and watch it drop.';" +
      " else an='Level '+s.tier+' '+s.slot+' takes '+fmt(s.absorbed)+' off, leaving '+" +
      "  fmt(s.damage)+'. '+r.name+' keeps '+(Math.round(s.keep*1000)/10)+'% through it.';" +
      " el('armnote').textContent=an;" +
      " var ft=flightTime(c,S.dist);" +
      " el('flight').textContent=S.dist?('At '+S.dist+' m the round is in the air at least '+" +
      "  ft.toFixed(2)+' s, off a muzzle velocity of '+c.velocity[c.velocity.length-1]+" +
      "  ' m/s. That is a floor: a bullet slows down, and how fast is not published.')" +
      "  :'Point blank. Every damage figure on this page is point blank.';}" +

      "function renderZones(){" +
      " var w=weapon(),r=loadFor(w),tb=document.querySelector('#zt tbody');tb.textContent='';" +
      " B.zones.forEach(function(z){" +
      "  var s=shot(w,z,r,tiers(),pellets(w));" +
      "  var k=toKill(s.damage,w.rpm,B.health);" +
      "  var band=bandFor(B.bands,k.stk,k.ttk);" +
      "  var tr=document.createElement('tr');" +
      "  if(z.id===S.zone)tr.setAttribute('data-on','1');" +
      "  tr.innerHTML='<td>'+z.name+(z.armour?' <span class=fine>'+z.armour+'</span>':'')+'</td>'" +
      "   +'<td class=n>'+fmt(s.damage)+'</td>'" +
      "   +'<td class=n>'+k.stk+'</td>'" +
      "   +'<td class=n><span class=band style=\"--bd:'+band.tint+'\">'+secs(k.stk,k.ttk)+'</span></td>'" +
      "   +'<td class=n>'+(s.tier?fmt(s.absorbed):'&mdash;')+'</td>';" +
      "  tr.addEventListener('click',function(){S.zone=z.id;render();});" +
      "  tb.appendChild(tr);});}" +

      /* ---------- the ranking ----------
         Bar length is the measure, so the chart still reads with the colour thrown away.
         Fill is the load, which is identity and never magnitude, and the load is written on
         every row as well. */
      "function renderRank(){" +
      " var z=zoneById[S.zone],box=el('rank');" +
      " var rows=B.weapons.filter(function(w){return !S.cls||w.class===S.cls;})" +
      "  .map(function(w){" +
      "   var r=loadFor(w),s=shot(w,z,r,tiers(),pellets(w));" +
      "   var k=toKill(s.damage,w.rpm,B.health);" +
      "   return {w:w,r:r,s:s,k:k,band:bandFor(B.bands,k.stk,k.ttk)};});" +
      " var by=S.by;" +
      " rows.sort(function(a,b){" +
      "  if(by==='dmg')return b.s.damage-a.s.damage;" +
      "  if(by==='stk')return (a.k.stk-b.k.stk)||(a.k.ttk-b.k.ttk);" +
      "  if(by==='rpm')return (b.w.rpm||0)-(a.w.rpm||0);" +
      "  return (a.k.ttk-b.k.ttk)||(a.k.stk-b.k.stk);});" +
      " var val=function(o){" +
      "  return by==='dmg'?o.s.damage:by==='stk'?(isFinite(o.k.stk)?o.k.stk:0):" +
      "   by==='rpm'?(o.w.rpm||0):o.k.ttk;};" +
      " var max=0;rows.forEach(function(o){var v=val(o);if(isFinite(v)&&v>max)max=v;});" +
      " box.textContent='';" +
      " rows.forEach(function(o){" +
      "  var v=val(o),pct=max>0&&isFinite(v)?Math.max(1.5,(v/max)*100):1.5;" +
      "  var row=document.createElement('div');row.className='rrow';" +
      "  var sub=o.r.id!==S.r?(' <em class=\"fine\">no '+S.r+'</em>'):'';" +
      "  var ic=B.icon[o.w.name];" +
      "  row.innerHTML='<span class=\"rname\">'" +
      "   +(ic?'<img class=\"ricon\" src=\"/game-icons/'+ic+'.png\" alt=\"\" width=\"34\"'" +
      "    +' height=\"20\" loading=\"lazy\">':'')" +
      "   +o.w.name+' <span class=\"fine\">'+o.w.class" +
      "    +'</span></span>'" +
      "   +'<span class=\"rtrack\"><span class=\"rbar\" style=\"width:'+pct.toFixed(1)" +
      "    +'%;background:'+o.r.tint+'\"></span></span>'" +
      "   +'<span class=\"rload\" style=\"--rd:'+o.r.tint+'\">'+o.r.name+sub+'</span>'" +
      "   +'<span class=\"n rdmg\" title=\"solved from shots to kill: '+o.w.range[0].toFixed(1)" +
      "    +' to '+o.w.range[1].toFixed(1)+' at the torso\">'+fmt(o.s.damage)+'</span>'" +
      "   +'<span class=\"n rstk\">'+o.k.stk+(o.k.stk===1?' shot':' shots')+'</span>'" +
      "   +'<span class=\"n rttk\"><span class=\"band\" style=\"--bd:'+o.band.tint+'\">'" +
      "    +secs(o.k.stk,o.k.ttk)+' '+o.band.name.toLowerCase()+'</span></span>';" +
      "  row.addEventListener('click',function(){setWeapon(o.w.name);render();});" +
      "  box.appendChild(row);});" +
      " var unit=by==='dmg'?'damage at the '+z.name.toLowerCase():" +
      "  by==='stk'?'shots to kill':by==='rpm'?'rounds per minute':" +
      "  'time to kill at the '+z.name.toLowerCase();" +
      " el('ranknote').textContent='Bar length is '+unit+'. '+rows.length+" +
      "  ' weapons. Colour says which load, never how good. Click a row to load that weapon" +
      " into the calculator.';}" +

      /* The chips are markup, so they start pressed on whatever the markup said. A setup
         arriving in the fragment has to move them, or the page shows a level 3 vest in the
         figure and "None" on the button, which is the sort of disagreement that makes a
         reader stop trusting the whole page. */
      "function syncChips(){" +
      " [['helmet',String(S.helmet)],['vest',String(S.vest)],['cls',S.cls],['by',S.by]]" +
      "  .forEach(function(pair){" +
      "   Array.prototype.forEach.call(" +
      "    document.querySelectorAll('button[data-'+pair[0]+']'),function(b){" +
      "     b.setAttribute('aria-pressed'," +
      "      b.getAttribute('data-'+pair[0])===pair[1]?'true':'false');});});}" +

      "function render(){" +
      " syncChips();" +
      " renderRounds();renderBody();renderCalc();renderZones();renderRank();" +
      " el('pelletrow').hidden=!shotgun();" +
      " el('pelletn').textContent=S.pellets+' of '+(cal().pellets||8);" +
      " el('distn').textContent=S.dist+' m';" +
      " writeHash();}" +

      /* ---------- wiring ---------- */
      "function group(attr,set){" +
      " Array.prototype.forEach.call(document.querySelectorAll('[data-'+attr+']'),function(b){" +
      "  if(b.tagName!=='BUTTON')return;" +
      "  b.addEventListener('click',function(){" +
      "   Array.prototype.forEach.call(document.querySelectorAll('button[data-'+attr+']'),function(o){" +
      "    o.setAttribute('aria-pressed',o===b?'true':'false');});" +
      "   set(b.getAttribute('data-'+attr));render();});});}" +
      "group('helmet',function(v){S.helmet=+v;});" +
      "group('vest',function(v){S.vest=+v;});" +
      "group('cls',function(v){S.cls=v;});" +
      "group('by',function(v){S.by=v;});" +
      /* Picking a weapon is a click on the weapon. setWeapon is the one way S.w changes, so
         the shelf, the name and the art can never disagree about what is equipped. */
      "function setWeapon(n){" +
      " if(!byName[n])return;" +
      " S.w=n;S.pellets=calById[byName[n].calibre].pellets||8;" +
      " el('wpnName').textContent=n;" +
      " Array.prototype.forEach.call(document.querySelectorAll('[data-wpick]'),function(b){" +
      "  b.setAttribute('aria-pressed',b.getAttribute('data-wpick')===n?'true':'false');});}" +
      "function shelf(open){" +
      " el('wpnShelf').hidden=!open;" +
      " el('wpnOpen').setAttribute('aria-expanded',open?'true':'false');" +
      " if(open){var f=el('wpnShelf').querySelector('[data-wpick]');if(f)f.focus({preventScroll:true});}}" +
      "el('wpnOpen').addEventListener('click',function(){shelf(el('wpnShelf').hidden);});" +
      "el('wpnClose').addEventListener('click',function(){shelf(false);el('wpnOpen').focus();});" +
      "document.addEventListener('keydown',function(e){" +
      " if(e.key==='Escape'&&!el('wpnShelf').hidden){shelf(false);el('wpnOpen').focus();}});" +
      "Array.prototype.forEach.call(document.querySelectorAll('[data-wpick]'),function(b){" +
      " b.addEventListener('click',function(){" +
      "  setWeapon(b.getAttribute('data-wpick'));shelf(false);render();});});" +
      /* Class chips narrow the shelf. Same hidden versus display trap as the vendor: .vcard
         is display:flex, so .vcard[hidden] in the stylesheet is what makes this work. */
      "Array.prototype.forEach.call(document.querySelectorAll('[data-wcls]'),function(b){" +
      " b.addEventListener('click',function(){" +
      "  var want=b.getAttribute('data-wcls');" +
      "  Array.prototype.forEach.call(document.querySelectorAll('[data-wcls]'),function(o){" +
      "   o.setAttribute('aria-pressed',o===b?'true':'false');});" +
      "  Array.prototype.forEach.call(document.querySelectorAll('[data-wpick]'),function(c){" +
      "   c.hidden=!!want&&c.getAttribute('data-wclass')!==want;});});});" +
      "el('pellets').addEventListener('input',function(e){S.pellets=+e.target.value;render();});" +
      "el('dist').addEventListener('input',function(e){S.dist=+e.target.value;render();});" +
      "Array.prototype.forEach.call(document.querySelectorAll('.bz'),function(p){" +
      " p.addEventListener('click',function(){S.zone=p.getAttribute('data-zone');render();});" +
      " p.addEventListener('keydown',function(e){" +
      "  if(e.key==='Enter'||e.key===' '){e.preventDefault();" +
      "   S.zone=p.getAttribute('data-zone');render();}});});" +
      "el('copy').addEventListener('click',function(){" +
      " var url=location.href;" +
      " var done=function(){el('copy').textContent='Copied';" +
      "  setTimeout(function(){el('copy').textContent='Copy this setup as a link';},1600);};" +
      " if(navigator.clipboard&&navigator.clipboard.writeText)" +
      "  navigator.clipboard.writeText(url).then(done,done);" +
      " else done();});" +

      /* A setup arriving in the fragment of a tab that is already open is not a page load,
         so nothing would happen without this. Pasting a link into the address bar of the
         open page, and the back button, both land here. */
      "window.addEventListener('hashchange',function(){" +
      " readHash();setWeapon(S.w);render();});" +

      "readHash();" +
      "setWeapon(S.w);" +
      "render();";
  }
};
