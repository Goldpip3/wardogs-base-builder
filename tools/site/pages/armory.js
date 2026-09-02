/* The item catalogue, the loadout calculator and the vehicle list.
   Body sits at column zero deliberately. Indenting it would add whitespace inside
   these template literals, and that whitespace is page content. */
module.exports = ctx => {
  const { esc, ARMORY, ARMORY_STATS, ITEM_STATS, MEASURED, BALLISTICS,
          classLabel, classRank, ladderLabel, adSlot, page, write } = ctx;

/* ---------- armory, loadouts and vehicles ----------
   One transcribed vendor catalogue behind all three. The armory browses it, the loadout
   calculator adds it up, and the vehicles page is the slice of it you can drive. Prices are
   read off the public database rather than derived, and an item the source has not
   confirmed shows as blank instead of a guess. */
{
  const A = ARMORY;
  /* Weight, footprint, stack and unlock, joined by exact name. Every key in the file is a
     catalogue name, which tools/check-build.js holds it to, so a lookup that misses means
     the source simply publishes nothing for that item rather than that the join broke. */
  const ST = ITEM_STATS;
  const statOf = function (name) { return ST[name] || {}; };
  const slotsIn = function (grid) { return grid ? grid[0] * grid[1] : 0; };
  const money = function (n) { return "$" + n.toLocaleString("en-US"); };
  const priceCell = function (it) {
    if (it.price === null) return "&mdash;";
    if (it.price === 0) return "Free";
    return money(it.price) + (it.per > 1 ? ' <span class="fine">/ ' + it.per + '</span>' : "");
  };

  /* Attachments only become usable in a loadout once you know what slot they fill, and the
     source does not say. The names do: a thing called a suppressor goes on the muzzle. */
  const slotOf = function (name) {
    const n = name.toLowerCase();
    if (n.indexOf("magazine") >= 0 || n.indexOf("mag") >= 0 || n.indexOf("drum") >= 0 ||
        n.indexOf(" box") >= 0) return "magazine";
    if (n.indexOf("suppressor") >= 0 || n.indexOf("brake") >= 0 || n.indexOf("flash hider") >= 0 ||
        n.indexOf("compensator") >= 0 || n.indexOf("choke") >= 0 || n.indexOf("muzzle") >= 0) return "muzzle";
    if (n.indexOf("grip") >= 0 || n.indexOf("bipod") >= 0 || n.indexOf("handguard") >= 0) return "grip";
    if (n.indexOf("scope") >= 0 || n.indexOf("sight") >= 0 || n.indexOf("reflex") >= 0 ||
        n.indexOf("optic") >= 0 || n.indexOf("prism") >= 0 || n.indexOf("red dot") >= 0 ||
        n.indexOf("hybrid") >= 0 || n.indexOf("lpvo") >= 0 || n.indexOf("pgo") >= 0 ||
        n.indexOf("kobra") >= 0 || n.indexOf("spectr") >= 0 || n.indexOf("spitfire") >= 0 ||
        n.indexOf("holographic") >= 0 || n.indexOf("10x") === 0 || n.indexOf("4x") === 0) return "optic";
    return "other";
  };

  /* The vendor's own slot for an attachment, pulled into data/armory-stats.json, with the
     name guess kept for the nine it says nothing about. The guess put things in the wrong
     shelf and the wrong gun: an AK was offered GGX magazines, because a name is not a
     fitment and reading one as the other was always going to end there. */
  const SLOT_FROM_PULL = {
    Sight: "optic", Muzzle: "muzzle", Underbarrel: "grip", Magazine: "magazine",
    Barrel: "other", Stock: "other", Grip: "other", Handguard: "other",
    DustCover: "other", CantedSight: "other", Pistolgrip: "other",
  };
  const slotFor = function (name) {
    const pulled = (ITEM_STATS[name] || {}).slot;
    if (pulled) return SLOT_FROM_PULL[pulled] || "other";
    return slotOf(name);
  };
  const withSlots = A.items.map(function (it) {
    return it.cat === "attachments" ? Object.assign({}, it, { slot: slotFor(it.name) }) : it;
  });
  const byCat = function (id) { return withSlots.filter(function (i) { return i.cat === id; }); };

  /* ---------- what is actually known about one item ----------
     The catalogue carries a name, a price and an icon. Everything else worth saying is in
     data/ballistics.json under a different key, so this is the join, done once here rather
     than in the three places that want it.

     Every join is by exact name and every one of them lands: 28 figured weapons, the 6 that
     are named as unfigurable, 8 armour pieces and 30 ammunition items, checked in
     tools/check-build.js rather than assumed. That is 72 of 331. The other 259 get a price
     and their category and are told plainly that nothing else is published, because the
     alternative is a panel of empty rows that reads like missing data rather than like
     absent data. A vehicle has no published figures at all and says so. */
  const wStat = {}, wUnfigured = {}, aStat = {}, ammoStat = {};
  BALLISTICS.weapons.forEach(function (w) { wStat[w.name] = w; });
  (BALLISTICS.unfiguredWeapons || []).forEach(function (w) { wUnfigured[w.name] = w; });
  BALLISTICS.armour.forEach(function (a) {
    (a.vendor || []).forEach(function (n) { aStat[n] = a; });
  });
  BALLISTICS.calibres.forEach(function (c) {
    Object.keys(c.vendor || {}).forEach(function (roundId) {
      const round = BALLISTICS.rounds.find(function (r) { return r.id === roundId; });
      ammoStat[c.vendor[roundId]] = { cal: c, round: round };
    });
  });

  const ARMOUR_TIERS = ["Level 1", "Level 2", "Level 3", "Level 4"];
  /* Ground or air is the vendor's own word for it now, pulled into data/armory-stats.json,
     rather than a regex over the names. The regex only held while every airframe happened
     to be called AH, MH, UH or Havoc, and it is kept as the fallback for a vehicle the
     source says nothing about rather than as the answer. */
  const vehClass = function (n) {
    const c = statOf(n).class;
    if (c === "Air" || c === "Ground") return c;
    return /AH-6|MH-6|UH-1|Havoc/.test(n) ? "Air" : "Ground";
  };
  const vehCount = function (kind) {
    return byCat("vehicles").filter(function (i) { return vehClass(i.name) === kind; }).length;
  };
  /* What it takes to be allowed to buy the thing, which is a different question from the
     price and is the one that decides whether a shelf is real for you yet. A tank is
     $500,000 and level 35, and the level is the part you cannot pay your way past. */
  const unlockText = function (name) {
    const u = statOf(name).unlock;
    if (u && u.starter) return "Nothing: it is there from the first match";
    if (!u || !u.role) return "";
    return ladderLabel(u.role) + (u.level ? " level " + u.level : " ladder, level not read yet") +
      (u.cash ? ", " + money(u.cash) : "");
  };

  /* The two weapon lists spell a calibre differently and only one of them is readable.
     A figured weapon stores the id, so an M4 carries "556" and a Kar98 carries "762x54";
     an unfigured one stores the label already, "7.62x51mm". Printing the id straight put
     "556" on the panel where the rest of the site says "5.56mm". Ids resolve, labels pass
     through, and an unfigured weapon with no calibre at all keeps the row off the panel
     rather than showing a blank one. */
  const calName = function (c) {
    if (!c) return "";
    const hit = BALLISTICS.calibres.find(function (x) { return x.id === c; });
    return hit ? hit.name : c;
  };

  /* One row is a label and a value. The value is already formatted here so the client
     script only ever prints strings and cannot round a number a second time. */
  const detailOf = function (it) {
    const rows = [], notes = [];
    const w = wStat[it.name], u = wUnfigured[it.name];
    const a = aStat[it.name], am = ammoStat[it.name];

    if (w) {
      rows.push(["Class", w.class], ["Calibre", calName(w.calibre)]);
      if (w.rpm) rows.push(["Rate of fire", w.rpm + " rpm"]);
      if (w.torso) rows.push(["Torso damage", w.torso + " per shot"]);
      if (w.range) rows.push(["Effective range", w.range[0] + " to " + w.range[1] + " m"]);
      notes.push({ kind: "link", text: "Full damage by armour tier and hit zone", href: "/ballistics/" });
    } else if (u) {
      rows.push(["Kind", u.kind]);
      if (u.calibre) rows.push(["Calibre", calName(u.calibre)]);
    }

    if (a) {
      rows.push(["Protects", a.covers.join(", ")]);
      rows.push(["Tiers", ARMOUR_TIERS.length + ", Level 1 to Level 4"]);
      if (a.note) notes.push({ kind: "note", text: a.note });
    }

    if (am) {
      const c = am.cal, r = am.round;
      if (c.damage) rows.push(["Base damage", String(c.damage)]);
      if (c.pellets) rows.push(["Pellets", c.pellets + " at " + c.perPellet + " each"]);
      if (c.velocity) rows.push(["Muzzle velocity", c.velocity[0] + " to " + c.velocity[1] + " m/s"]);
      if (c.mass) rows.push(["Mass", c.mass + " g"]);
      if (r && r.blocks) {
        /* The stored figure is the percentage armour takes, so what gets through is the
           complement. Printing the stored number straight would say a hollow point is at
           its best against a level 4 vest, which is the exact opposite of true. */
        rows.push(["Gets through L1 armour", (100 - r.blocks[0]).toFixed(1) + "%"]);
        rows.push(["Gets through L4 armour", (100 - r.blocks[3]).toFixed(1) + "%"]);
      }
      if (r && r.note) notes.push({ kind: "note", text: r.note });
      notes.push({ kind: "link", text: "Compare every load in the damage calculator", href: "/ballistics/" });
    }

    if (it.cat === "vehicles") {
      rows.push(["Type", vehClass(it.name) === "Air" ? "Air" : "Ground"]);
    }
    if (it.cat === "mounted" && statOf(it.name).class) {
      rows.push(["Kind", statOf(it.name).class]);
    }

    /* The unlock goes on every category that has one, not just vehicles. It is the last
       row on purpose: it is what stands between you and the item rather than a fact about
       the item. An item the source is silent on says so, because a missing row on a panel
       that is otherwise full reads as "there is no unlock" and for a tank that would be a
       lie somebody plans around. */
    const un = unlockText(it.name);
    if (un) rows.push(["Unlocks at", un]);
    else if (it.cat === "vehicles") {
      notes.push({ kind: "note", text: "No unlock level or cost is published for this one yet." });
    }

    if (it.cat === "attachments" && it.slot && it.slot !== "other") {
      rows.push(["Slot", it.slot]);
    }

    return { rows: rows, notes: notes };
  };


  /* What an attachment fits, where the source says so. It does not carry a compatibility
     field, so the only honest signal is the label, and the label is often explicit: 36 of
     the 49 magazines are named for their weapon outright, and four muzzle devices name a
     calibre. Read those and nothing else.

     The longest weapon name wins, or "Bushmaster M17S 20 RND" would resolve to the M17 as
     well as to the M17S. On this catalogue that ambiguity happens 0 times, and the rule is
     here so it stays 0 when weapons are added.

     Anything the label does not speak for is left unowned, which the filter reads as
     unknown rather than as incompatible. Most optics are genuinely universal, and a
     wrongly hidden attachment is a worse error than a wrongly offered one. */
  const attOwner = (function () {
    const flat = function (s) { return String(s).toLowerCase().replace(/[^a-z0-9]/g, ""); };
    const weapons = A.items.filter(function (i) { return i.cat === "weapons"; });
    const calibres = weapons.map(function (w) { return w.calibre; })
      .filter(function (c, i, all) { return c && all.indexOf(c) === i; });

    /* An attachment often drops the rest of the weapon's name: the M249 SAW's belt is a
       "M249 200 RND Box", and Mosin Nagant magazines say Mosin. A leading token is only
       usable when it points at exactly one weapon, which is why GGX magazines stay unowned:
       there is a GGX 17 and a GGX 18, and the label does not say which. */
    const lead = {};
    weapons.forEach(function (w) {
      const t = flat(w.name.split(" ")[0]);
      if (t.length > 2) (lead[t] = lead[t] || []).push(w.name);
    });
    const solo = Object.keys(lead).filter(function (t) { return lead[t].length === 1; });

    const out = {};
    A.items.filter(function (i) { return i.cat === "attachments"; }).forEach(function (it) {
      const k = flat(it.name);
      let best = null;
      weapons.forEach(function (w) {
        const wk = flat(w.name);
        if (wk.length > 2 && k.indexOf(wk) >= 0 && (!best || wk.length > flat(best).length)) best = w.name;
      });
      if (!best) {
        const t = solo.filter(function (x) { return k.indexOf(x) === 0; })
          .sort(function (a, b) { return b.length - a.length; })[0];
        if (t) best = lead[t][0];
      }
      if (best) { out[it.name] = { w: best }; return; }
      const cal = calibres.filter(function (c) {
        return flat(c).length >= 3 && k.indexOf(flat(c)) >= 0;
      });
      if (cal.length === 1) out[it.name] = { c: cal[0] };
    });
    return out;
  }());

  /* Which of the four attachment slots a weapon has at all.

     A missile launcher was being offered a drum magazine, a foregrip and a rifle optic,
     because the name filter treats anything it cannot place as unknown and shows unknowns.
     That default is right for optics on a rifle and absurd on a tube.

     Nothing here is invented. data/ballistics.json already classes the 28 figured weapons
     and gives the other six a kind, and Launcher and Anti-air are the two that take none of
     this: they are aimed down an integral sight and loaded with a rocket. A bow takes no
     magazine and no muzzle for the same sort of reason. Everything else keeps all four and
     is filtered by label as before. */
  const weaponKind = {};
  BALLISTICS.weapons.forEach(function (w) { weaponKind[w.name] = w.class; });
  (BALLISTICS.unfiguredWeapons || []).forEach(function (w) { weaponKind[w.name] = w.kind; });

  /* A loadout is a primary, a sidearm and a specialist item, and handguns were sitting in
     the primary shelf alongside the rifles. These five are named as sidearms by
     gamewatcher.com/wardogs/weapons, which is the only list found that draws the line: the
     three handguns plus the two GGX machine pistols. Kept here rather than in armory.json
     because that file is generated by tools/build-armory.js and a hand-added field would be
     overwritten on the next pull. */
  const SIDEARMS = ["Deagle", "M1911", "Judge", "GGX 17", "GGX 18"];
  const isSidearm = function (n) { return SIDEARMS.indexOf(n) >= 0; };

  const ALL_SLOTS = ["opt", "muz", "grip", "mag"];
  const slotsFor = function (name) {
    const k = weaponKind[name];
    if (k === "Launcher" || k === "Anti-air") return [];
    if (k === "Bow") return ["opt"];
    return ALL_SLOTS;
  };
  const weaponSlots = {};
  ARMORY.items.forEach(function (it) {
    if (it.cat === "weapons") weaponSlots[it.name] = slotsFor(it.name);
  });

  /* ---------- armory: browse the lot ----------
     Two views over one list. The grid is the default because every item has its own art
     now and a picture is how you recognise a thing you have seen in game; the table is
     still there because a column of prices is how you compare forty of them. Both carry
     the same data attributes so one filter and one sort drive both, and switching view
     never reshuffles what you were looking at. */
  const catName = function (id) {
    return (A.categories.find(function (c) { return c.id === id; }) || {}).name || id;
  };
  /* Every item is indexed, so the dialog is opened by position rather than by name. Names
     carry quotes and ampersands and would have to survive an attribute and a JSON string on
     the way to the lookup; an integer does not. */
  const itemAttrs = function (it, i) {
    return ' data-item="' + i + '" data-cat="' + it.cat + '" data-name="' + esc(it.name.toLowerCase()) +
      '" data-price="' + (it.price === null ? -1 : it.price) + '"' +
      /* Ground and air are two different fleets that happen to share a vendor tab, so the
         rail can narrow to one of them. Only vehicles carry it; the filter treats a missing
         one as "this row is not in that sub-list at all". */
      (it.cat === "vehicles" ? ' data-sub="' + vehClass(it.name) + '"' : "");
  };
  /* A card and a row are both the control that opens the detail, so both have to be
     reachable from the keyboard and announce that they do something. A div with a click
     handler is neither. */
  const openAttrs = ' role="button" tabindex="0"';
  const rows = withSlots.map(function (it, i) {
    return "<tr" + itemAttrs(it, i) + openAttrs + ">" +
      "<td><b>" + esc(it.name) + "</b></td>" +
      "<td>" + esc(catName(it.cat)) +
        (it.slot && it.slot !== "other" ? ' <span class="fine">' + it.slot + "</span>" : "") + "</td>" +
      '<td class="n">' + priceCell(it) + "</td></tr>";
  }).join("");
  const cards = withSlots.map(function (it, i) {
    return '<div class="acard"' + itemAttrs(it, i) + openAttrs + ">" +
      '<span class="acard-art">' +
      (it.icon ? '<img src="/game-icons/' + it.icon + '.png" alt="" width="64" height="64" loading="lazy">' : "") +
      "</span>" +
      '<span class="acard-body"><b>' + esc(it.name) + "</b>" +
      '<span class="acard-cat">' + esc(catName(it.cat)) +
        (it.slot && it.slot !== "other" ? " &middot; " + it.slot : "") + "</span></span>" +
      '<span class="acard-price">' + priceCell(it) + "</span></div>";
  }).join("");

  /* The payload the dialog reads, parallel to the two lists above and in the same order.
     Only what the markup does not already carry: the art at full size, the price as it
     should read, and the joined stats. */
  const DETAIL = withSlots.map(function (it) {
    const d = detailOf(it);
    return {
      n: it.name,
      c: catName(it.cat),
      p: it.price === null ? null : it.price,
      per: it.per > 1 ? it.per : 0,
      i: it.icon || "",
      r: d.rows,
      o: d.notes,
    };
  });

  write("armory/index.html", page({
    title: "WARDOGS Armory: every item and what it costs",
    desc: "Every WARDOGS weapon, attachment, round, armour piece and vehicle with its vendor price. Search and sort the whole catalogue.",
    canonical: "/armory/",
    body: '<section><div class="wrap">' +
      '<span class="eyebrow">Vendor prices, checked ' + esc(A.checkedOn) + '</span>' +
      "<h1>Armory</h1>" +
      '<p class="lede">All ' + A.items.length + ' items the vendor sells, with the price' +
      ' on each and its art at full size when you open it.</p>' +
      '<p class="lede sub" style="margin-top:12px">Prices only. For what a weapon and a' +
      ' load actually do to somebody, and to what they are wearing, the' +
      ' <a href="/ballistics/" style="text-decoration:underline">damage calculator</a>' +
      ' takes the same catalogue and shoots people with it.</p>' +
      /* Ten categories were ten filled chips wrapping onto two rows, and the selected one
         was a solid yellow slab, so the loudest thing on a page of 331 items was the filter
         you had already chosen. They are a rail now: one column you read down, counts right
         aligned so they compare, and the selection marked by an edge. Same attributes, so
         the filter script did not have to change. */
      '<div class="cat-layout">' +
        '<nav class="cat-rail" aria-label="Filter by category">' +
          '<button class="rail-item" data-filter="" aria-pressed="true">' +
            "<span>All</span><b>" + A.items.length + "</b></button>" +
          A.categories.map(function (c) {
            const item = '<button class="rail-item" data-filter="' + c.id + '" aria-pressed="false">' +
              "<span>" + esc(c.name) + "</span><b>" +
              A.items.filter(function (i) { return i.cat === c.id; }).length + "</b></button>";
            /* A Bobcat and a Havoc are not two entries in one list, they are two fleets,
               and the only way to see either on its own used to be to read past the other.
               The split hangs off the category rather than sitting beside it because
               choosing Ground is choosing Vehicles first. */
            if (c.id !== "vehicles") return item;
            return item + ["Ground", "Air"].map(function (k) {
              return '<button class="rail-item rail-sub" data-filter="vehicles" data-sub="' +
                k + '" aria-pressed="false"><span>' + k + "</span><b>" + vehCount(k) +
                "</b></button>";
            }).join("");
          }).join("") +
        "</nav>" +
        '<div class="cat-main">' +
          '<div class="cat-top">' +
            '<input class="cat-search" id="q" type="search" placeholder="Search the catalogue">' +
            '<div class="view-toggle" role="group" aria-label="View">' +
              '<button class="chip" data-view="grid" aria-pressed="true">Grid</button>' +
              '<button class="chip" data-view="table" aria-pressed="false">Table</button>' +
            "</div>" +
          "</div>" +
          '<div class="cat-meta">' +
            '<p class="fine" id="count"></p>' +
            '<div class="cat-sorts" role="group" aria-label="Sort">' +
              "<span>Sort</span>" +
              '<button data-sort="name" aria-pressed="true">Name</button>' +
              '<button data-sort="price" aria-pressed="false">Price</button>' +
            "</div>" +
          "</div>" +
          '<div id="catGrid" class="acards">' + cards + "</div>" +
          '<div id="catTable" hidden>' +
          '<table id="cat"><thead><tr><th class="sortable" data-sort="name" data-dir="asc">Item</th>' +
          '<th>Category</th><th class="n sortable" data-sort="price">Price</th></tr></thead>' +
          "<tbody>" + rows + "</tbody></table></div>" +
          '<p class="cat-empty" id="catEmpty" hidden>Nothing matches that.</p>' +
        "</div>" +
      "</div>" +

      /* A native dialog, so Escape, the backdrop and the focus trap are the browser's job
         rather than three more things to get wrong. It is empty in the markup and filled on
         open: 331 detail panels in the HTML would be most of the page, and only one is ever
         on screen. */
      '<dialog id="detail" class="idlg" aria-labelledby="dlgName">' +
        '<button type="button" class="idlg-x" data-dlg-close aria-label="Close">Close</button>' +
        '<div class="idlg-head">' +
          '<span class="idlg-art"><img id="dlgArt" alt="" hidden></span>' +
          '<div><span class="idlg-cat" id="dlgCat"></span>' +
          '<h2 id="dlgName"></h2>' +
          '<p class="idlg-price" id="dlgPrice"></p></div>' +
        "</div>" +
        '<dl class="idlg-stats" id="dlgStats"></dl>' +
        '<div class="idlg-notes" id="dlgNotes"></div>' +
      "</dialog>" +

      '<p style="margin-top:34px"><a class="btn primary" href="/ballistics/">Damage calculator</a> ' +
      '<a class="btn" href="/loadouts/">Price up a loadout</a></p>' +
      adSlot("inArticle") +

      /* The vehicles page used to say these three things and nothing else that was not
         already a row in the table above, so it was folded in here rather than kept alive
         as a page that repeated the catalogue. */
      '<h2 style="margin-top:44px">Vehicles and mounted weapons</h2>' +
      '<p>The rail splits the ' + byCat("vehicles").length + " vehicles into " +
      "<strong>Ground</strong>, " + vehCount("Ground") + " of them, and <strong>Air</strong>, " +
      vehCount("Air") + ". <strong>Mounted</strong> is the " + byCat("mounted").length +
      " weapons that sit on top of them and on your emplacements, most with no vendor price" +
      " of their own because they arrive attached to something.</p>" +
      /* The price is not the gate people hit. Two figures decide whether you can have a
         vehicle at all and neither of them is what it says on the shelf. */
      "<p>What it costs is not what it takes. " +
      byCat("vehicles").filter(function (i) { return unlockText(i.name); }).length + " of the " +
      byCat("vehicles").length + " carry an unlock as well as a price, and the unlock is the" +
      " bigger number: the L2A6 is " + money(
        (A.items.find(function (i) { return i.name === "L2A6"; }) || { price: 0 }).price) +
      " at the vendor and " + (function (u) {
        return esc(u.role.toLowerCase() + " level " + u.level) + " plus " + money(u.cash);
      }(statOf("L2A6").unlock)) + " to open in the first place." +
      " Open any vehicle for its own. The ones nothing is published for say that rather" +
      " than showing a blank.</p>" +
      "<p>A Havoc costs what " + Math.round(
        (A.items.find(function (i) { return i.name === "Havoc"; }) || { price: 18000 }).price /
        (A.items.find(function (i) { return i.name === "Bobcat"; }) || { price: 500 }).price) +
      " Bobcats cost.</p>" +
      "</div></section>" +
      '<script>(function(){' +
      'var grid=document.getElementById("catGrid"),tblBox=document.getElementById("catTable");' +
      'var tb=tblBox.querySelector("tbody"),empty=document.getElementById("catEmpty");' +
      'var rows=Array.prototype.slice.call(tb.querySelectorAll("tr"));' +
      'var cards=Array.prototype.slice.call(grid.querySelectorAll(".acard"));' +
      'var cat="",sub="",q="",sort="name",dir=1;' +
      'function keep(el){' +
      ' if(cat&&el.getAttribute("data-cat")!==cat)return false;' +
      ' if(sub&&el.getAttribute("data-sub")!==sub)return false;' +
      ' if(!q)return true;' +
      ' return el.getAttribute("data-name").indexOf(q)>=0;}' +
      /* Price sorts as a number and name as text, and an unconfirmed price is -1 in the
         markup so it would lead every ascending sort. It is pushed to the bottom in both
         directions instead: a blank is not the cheapest thing on the shelf, it is a thing
         nobody has priced, and sorting by price should not open with a wall of them. */
      'function cmp(a,b){' +
      ' if(sort==="price"){' +
      '  var x=+a.getAttribute("data-price"),y=+b.getAttribute("data-price");' +
      '  if(x<0&&y<0)return 0;if(x<0)return 1;if(y<0)return -1;' +
      '  return (x-y)*dir;}' +
      ' return a.getAttribute("data-name").localeCompare(b.getAttribute("data-name"))*dir;}' +
      'function apply(){' +
      ' var shown=0;' +
      ' [rows,cards].forEach(function(set){set.forEach(function(el){' +
      '  var ok=keep(el);el.hidden=!ok;});});' +
      ' shown=rows.filter(keep).length;' +
      /* Both views are sorted the same way so switching between them never reshuffles
         what you were just looking at. */
      ' [[rows,tb],[cards,grid]].forEach(function(p){' +
      '  p[0].slice().sort(cmp).forEach(function(el){p[1].appendChild(el);});});' +
      ' empty.hidden=shown>0;' +
      ' document.getElementById("count").textContent=' +
      '  shown===rows.length?shown+" items":shown+" of "+rows.length+" items";}' +
      'function press(sel,on){' +
      ' Array.prototype.forEach.call(document.querySelectorAll(sel),function(b){' +
      '  b.setAttribute("aria-pressed",b===on?"true":"false");});}' +
      'document.addEventListener("click",function(e){' +
      ' var t=e.target;if(!t||!t.closest)return;' +
      ' var f=t.closest("[data-filter]");' +
      /* Clicking Vehicles clears the sub-list rather than keeping whichever of Ground or
         Air was last on, so the parent always means all of it. */
      ' if(f){cat=f.getAttribute("data-filter");sub=f.getAttribute("data-sub")||"";' +
      '  press("[data-filter]",f);apply();return;}' +
      ' var v=t.closest("[data-view]");' +
      ' if(v){var want=v.getAttribute("data-view");press("[data-view]",v);' +
      '  grid.hidden=want!=="grid";tblBox.hidden=want!=="table";return;}' +
      ' var s=t.closest(".cat-sorts [data-sort]");' +
      ' if(s){var k=s.getAttribute("data-sort");' +
      '  dir=(k===sort)?-dir:1;sort=k;press(".cat-sorts [data-sort]",s);' +
      '  s.setAttribute("data-dir",dir>0?"asc":"desc");apply();return;}' +
      ' var th=t.closest("th.sortable");' +
      ' if(th){var tk=th.getAttribute("data-sort");' +
      '  dir=(tk===sort)?-dir:1;sort=tk;' +
      '  Array.prototype.forEach.call(document.querySelectorAll("th.sortable"),function(o){' +
      '   o.removeAttribute("data-dir");});' +
      '  th.setAttribute("data-dir",dir>0?"asc":"desc");' +
      '  press(".cat-sorts [data-sort]",document.querySelector(".cat-sorts [data-sort=\\""+tk+"\\"]"));' +
      '  apply();return;}});' +
      'document.getElementById("q").addEventListener("input",function(e){' +
      ' q=e.target.value.toLowerCase().trim();apply();});' +

      /* ---------- the detail dialog ----------
         Everything below builds DOM nodes rather than assigning innerHTML. Item names carry
         quotes and ampersands, the notes carry apostrophes, and this string crosses two
         layers of quoting on its way into the page; textContent cannot be broken by any of
         that, and an escape has been eaten on this route twice before. */
      'var D=' + JSON.stringify(DETAIL).replace(/</g, "\\u003c") + ';' +
      'var dlg=document.getElementById("detail"),opener=null;' +
      'function gid(id){return document.getElementById(id);}' +
      'function cash(n){return "$"+n.toLocaleString("en-US");}' +
      'function priceText(d){' +
      ' if(d.p===null)return "";' +
      ' if(d.p===0)return "Free";' +
      /* A pack price is the number on the shelf and the number you compare with is the one
         per round, so both are given. It divides exactly on all 46 packs in this catalogue,
         and is rounded to the cent rather than trusted to be whole in case that changes. */
      ' if(d.per>1)return cash(d.p)+" for a pack of "+d.per+"  ("+cash(+(d.p/d.per).toFixed(2))+" each)";' +
      ' return cash(d.p);}' +
      'function fill(i){' +
      ' var d=D[i];if(!d)return false;' +
      ' gid("dlgCat").textContent=d.c;' +
      ' gid("dlgName").textContent=d.n;' +
      ' gid("dlgPrice").textContent=priceText(d);' +
      ' var art=gid("dlgArt");' +
      ' if(d.i){art.src="/game-icons/"+d.i+".png";art.alt="";art.hidden=false;}' +
      ' else{art.removeAttribute("src");art.hidden=true;}' +
      ' var dl=gid("dlgStats");dl.textContent="";' +
      ' d.r.forEach(function(row){' +
      '  var dt=document.createElement("dt");dt.textContent=row[0];' +
      '  var dd=document.createElement("dd");dd.textContent=row[1];' +
      '  dl.appendChild(dt);dl.appendChild(dd);});' +
      ' dl.hidden=!d.r.length;' +
      ' var nb=gid("dlgNotes");nb.textContent="";' +
      ' d.o.forEach(function(n){' +
      '  var p=document.createElement("p");' +
      '  if(n.kind==="link"){var a=document.createElement("a");a.href=n.href;' +
      '   a.textContent=n.text;p.className="idlg-more";p.appendChild(a);}' +
      '  else{p.className=n.kind==="gap"?"idlg-gap":"idlg-note";' +
      '   p.textContent=n.text;}' +
      '  nb.appendChild(p);});' +
      ' return true;}' +
      /* Closing is done here rather than left to the element, because one half of what
         <dialog> is supposed to give you for free was measured not working.

         What was actually observed, in the browser this was built against: showModal opens
         the panel and moves focus into it, and close() closes it, but the close event never
         fires. That was checked on its own, calling showModal and close from a script with
         a listener attached and nothing else involved: zero events. So the focus restore
         cannot hang off that event alone, and shut() does it directly.

         Escape was not testable in that browser at all, because it delivers no key events
         to the page, so nothing is claimed about it either way. It gets an explicit handler
         for the same reason: an engine where it works loses nothing, since closing twice is
         a no-op, and an engine where it does not is otherwise a panel with no way out but
         the button.

         Focus goes back to the card you opened. Without that, closing drops you at the top
         of the document and a 331 item grid has lost your place. */
      'function shut(){if(!dlg.open)return;dlg.close();' +
      ' if(opener&&opener.isConnected)opener.focus();opener=null;}' +
      'function openItem(i,from){if(!fill(i))return;opener=from||null;dlg.showModal();}' +
      'dlg.addEventListener("close",function(){' +
      ' if(opener&&opener.isConnected)opener.focus();opener=null;});' +
      /* A click landing on the dialog element itself is a click on the backdrop: the panel
         is padded, so its own content never reports as the target. */
      'dlg.addEventListener("click",function(e){' +
      ' if(e.target===dlg||e.target.closest("[data-dlg-close]"))shut();});' +
      'document.addEventListener("keydown",function(e){' +
      ' if(e.key==="Escape"&&dlg.open){e.preventDefault();shut();}});' +
      'document.addEventListener("click",function(e){' +
      ' var t=e.target;if(!t||!t.closest||t.closest("#detail"))return;' +
      ' var it=t.closest("[data-item]");' +
      ' if(it)openItem(+it.getAttribute("data-item"),it);});' +
      'document.addEventListener("keydown",function(e){' +
      ' if(e.key!=="Enter"&&e.key!==" ")return;' +
      ' var t=e.target;if(!t||!t.closest)return;' +
      ' var it=t.closest("[data-item]");if(!it)return;' +
      /* Space scrolls the page by default, which would have moved the grid underneath the
         dialog that just opened over it. */
      ' e.preventDefault();openItem(+it.getAttribute("data-item"),it);});' +
      'apply();' +
      '}());<\/script>',
  }));

  /* ---------- loadouts: what one death costs ----------
     You pick by clicking the thing you want, the way the vendor works. A dropdown hides
     every option until you open it and shows them as a list of words, which for a shelf of
     items that all have a picture is the wrong control: you cannot see what you are buying
     and you cannot compare two of them side by side. */
  const vcard = function (it, slotId, cls) {
    return '<button type="button" class="vcard" data-pick="' + slotId + '"' +
      (cls ? ' data-pclass="' + esc(cls) + '"' : "") +
      ' data-name="' + esc(it.name) + '"' +
      ' data-price="' + (it.price === null ? 0 : it.price) + '"' +
      (it.price === null ? ' data-unknown="1"' : "") +
      (it.icon ? ' data-icon="' + it.icon + '"' : "") +
      (it.per ? ' data-per="' + it.per + '"' : "") +
      ' aria-pressed="false">' +
      '<span class="vcard-tag">' +
        (it.price === null ? "no price" : it.price === 0 ? "free" : money(it.price)) + "</span>" +
      /* What it takes to have the thing at all, which the price does not say: a $2,800 M4
         is level 20 on a ladder and $100,000 to open. Only the level goes on the card,
         because the card is a shelf and the ladder is the part that decides whether the
         shelf is real for you yet. */
      (function (u) {
        return u && u.level
          ? '<span class="vcard-lvl" title="' +
            esc(ladderLabel(u.role) + " level " + u.level + (u.cash ? ", " + money(u.cash) + " to unlock" : "")) +
            '">Lv ' + u.level + "</span>"
          : "";
      }(statOf(it.name).unlock)) +
      '<span class="vcard-art">' +
      (it.icon ? '<img src="/game-icons/' + it.icon + '.png" alt="" width="52" height="52" loading="lazy">' : "") +
      "</span>" +
      '<span class="vcard-name">' + esc(it.name) + "</span>" +
      /* How much a bag holds, on the card you choose it from. Without it the only way to
         compare two bags was to pick one, read the count, pick the other and read it again,
         which is how three bags that really are 15 slots read as "they are all the same".
         It also puts a wrong figure where somebody can see it: the whole point of measuring
         these is that the pulled ones are suspect. */
      (function (st) {
        if (!st.storage) return "";
        const n = st.storage[0] * st.storage[1];
        const seen = st.measured && st.measured.storage;
        return '<span class="vcard-sub"' + (seen ? ' data-measured="1"' : "") +
          ' title="' + (seen ? "Measured in game " + esc(seen) : "From the item database, not measured") +
          '">' + st.storage[0] + "x" + st.storage[1] + ", " + n + " slots</span>";
      }(statOf(it.name))) +
      "</button>";
  };
  const noneCard = function (slotId, label) {
    return '<button type="button" class="vcard vcard-none" data-pick="' + slotId + '"' +
      ' data-name="" data-price="0" aria-pressed="true">' +
      '<span class="vcard-art"></span>' +
      '<span class="vcard-name">' + esc(label) + "</span></button>";
  };
  /* The source marks a handful of items unfinished, and an unfinished one fits nothing and
     goes on nothing: the AT4 Mag was being offered on every weapon in the game because it
     names no fitment, which is the same silence as an item nobody has documented. A shelf
     is a list of what you can buy, so they come off it. They stay in the armory, where the
     catalogue is the point. */
  const shelfReady = function (i) { return !(ITEM_STATS[i.name] || {}).wip; };
  const attSlot = function (s) {
    return byCat("attachments").filter(function (i) { return i.slot === s && shelfReady(i); });
  };
  const nameHas = function (list, s) {
    return list.filter(function (i) { return i.name.toLowerCase().indexOf(s) >= 0; });
  };

  /* What you carry it in, split the way the game splits it.

     The Pouch was on the rig shelf beside the tac vests, on the reading that a pouch is a
     small thing you wear. It is not: it is the bag you start with, it is what everything
     else on that shelf replaces, and standing it next to the vests meant the backpack shelf
     opened with nothing free in it and the free option was two slots away under a name
     nobody was looking for. Cheapest first, so the shelf reads as a ladder from the thing
     you already own to the thing you are saving for.

     Sorting by price is a stand-in for sorting by how much each holds, which is the figure
     this shelf actually wants and which nobody has measured. It is in data/todo.json under
     confirm; when it exists, sort on it and say the capacity on the card. */
  /* Cheapest first, which is the order you come to them in: the free Pouch, then up. The
     unlock level is on each card rather than deciding the order, because two of these bags
     have no level published and sorting on a missing figure put a $15,000 bag third. Where
     both are known the two orders agree anyway. */
  const bags = nameHas(byCat("storage"), "backpack")
    .concat(nameHas(byCat("storage"), "pouch"))
    .sort(function (a, b) { return (a.price || 0) - (b.price || 0); });
  const rigs = nameHas(byCat("storage"), "tac vest")
    .sort(function (a, b) { return (a.price || 0) - (b.price || 0); });
  /* The rest of the storage category is crates and supply pallets, which are things you
     drive to a base rather than things you wear. They belong to the planner, not to a kit,
     and neither shelf offers them. */

  /* A vendor slot: the art box with its price tag, and a button that opens the shelf for
     that slot underneath. Shaped after the equipment slots the game shows you. */
  const slot = function (id, label, blank, needs) {
    return '<div class="vslot" id="' + id + '-slot" data-on="0"' +
      (needs ? ' data-needs="' + needs + '"' : "") + '>' +
      '<span class="vslot-role">' + esc(label) + "</span>" +
      '<span class="vslot-tag" id="' + id + '-tag" hidden></span>' +
      '<span class="vslot-art"><img id="' + id + '-icon" alt="" width="72" height="72" hidden></span>' +
      '<button type="button" class="vslot-btn" data-open="' + id + '"' +
      ' aria-expanded="false" aria-controls="' + id + '-grid">' +
      '<span id="' + id + '-name" data-blank="' + esc(blank) + '">' + esc(blank) + "</span></button>" +
      "</div>";
  };
  /* The shelf itself, one per slot, closed until its slot is clicked. Rendered into the
     page rather than built on demand so the whole catalogue is in the HTML either way. */
  /* Carried in a quantity, so the card holds a stepper rather than reading as pressed or
     not. The card body is a plus as well, because the common case is wanting one more of
     something you can already see. */
  const itemCard = function (i) {
    return '<div class="vcard vcard-item" data-extra="' + esc(i.name) + '"' +
      ' data-price="' + i.price + '" data-qty="0">' +
      '<span class="vcard-tag">' + money(i.price) + "</span>" +
      '<span class="vcard-art">' +
      (i.icon ? '<img src="/game-icons/' + i.icon + '.png" alt="" width="52" height="52" loading="lazy">' : "") +
      "</span>" +
      '<span class="vcard-name">' + esc(i.name) + "</span>" +
      '<span class="vitem-step">' +
        '<button type="button" class="vstep-b" data-step="-1"' +
        ' aria-label="One fewer ' + esc(i.name) + '">&minus;</button>' +
        '<b class="vitem-n">0</b>' +
        '<button type="button" class="vstep-b" data-step="1"' +
        ' aria-label="One more ' + esc(i.name) + '">+</button>' +
      "</span></div>";
  };

  /* What the vendor files a weapon under, from the pull. Anything with no class sits under
     Other rather than off the shelf: a weapon nobody can reach is worse than one in a bin. */
  const classOf = function (it) { return (ITEM_STATS[it.name] || {}).class || "Other"; };

  const picker = function (id, label, list, blank, split) {
    /* Thirty-four weapons in one grid is a wall you read rather than a shelf you pick from,
       which is what the damage page's own shelf was fixed for. Same treatment: a row of
       classes across the top, in the shared order, and the grid opens on the first of them.
       Only the shelves worth cutting get it, so the three tac vests stay one row. */
    var chips = "", tag = "";
    if (split) {
      const seen = [];
      list.forEach(function (it) {
        const c = classOf(it);
        if (seen.indexOf(c) < 0) seen.push(c);
      });
      seen.sort(function (x, y) { return classRank(x) - classRank(y) || x.localeCompare(y); });
      chips = '<div class="chips" role="group" aria-label="Filter by class"' +
        ' style="margin-bottom:12px">' +
        seen.map(function (c, i) {
          return '<button type="button" class="chip" data-pcls="' + id + '|' + esc(c) + '"' +
            ' aria-pressed="' + (i === 0 ? "true" : "false") + '">' +
            esc(classLabel(c)) + "</button>";
        }).join("") + "</div>";
      tag = seen.length ? seen[0] : "";
    }
    return '<div class="vpicker" id="' + id + '-grid" hidden' +
      (split ? ' data-split="' + esc(tag) + '"' : "") + ">" +
      '<p class="vpicker-head">' + esc(label) +
      '<button type="button" class="vpicker-x" data-close="' + id + '">Close</button></p>' +
      chips +
      '<div class="vgrid">' + noneCard(id, blank) +
      list.map(function (it) {
        return split ? vcard(it, id, classOf(it)) : vcard(it, id);
      }).join("") + "</div></div>";
  };

  write("loadouts/index.html", page({
    title: "WARDOGS Loadout Cost Calculator",
    desc: "Price up a full WARDOGS kit: weapon, attachments, armour, ammunition and gear, and see what one death actually costs you.",
    canonical: "/loadouts/",
    body: '<section><div class="wrap">' +
      '<span class="eyebrow">Vendor prices, checked ' + esc(A.checkedOn) + '</span>' +
      "<h1>Loadout calculator</h1>" +
      '<p class="lede">Build a kit and watch the number climb. Everything here is what you are' +
      " writing off the moment the kit does not come home.</p>" +
      '<div class="vend">' +

      '<div class="vend-top">' +
        '<span class="vend-mark" aria-hidden="true"></span>' +
        '<span class="vend-title">Equipment vendor</span>' +
        '<span class="vend-tabs" role="tablist">' +
          '<button class="vend-tab" role="tab" data-tab="equipment" aria-selected="true">Equipment</button>' +
          '<button class="vend-tab" role="tab" data-tab="gear" aria-selected="false">Gear</button>' +
          '<button class="vend-tab" role="tab" data-tab="items" aria-selected="false">Items</button>' +
        "</span>" +
        '<span class="vend-cash"><i>Weight</i><b id="weight">--</b></span>' +
        '<span class="vend-cash"><i>Cost per life</i><b id="total">$0</b></span>' +
      "</div>" +

      '<div class="vend-body">' +
        '<span class="vend-rail" aria-hidden="true">// Vendor_</span>' +

        '<div class="vend-main">' +

          '<div class="vend-panel" data-panel="equipment">' +
            '<p class="vend-head">Equipment slots<span class="vend-hint">Click a slot to open the shelf</span></p>' +
            '<div class="vslots">' +
              slot("w", "Primary", "No weapon") +
              slot("sec", "Sidearm", "None") +
              slot("opt", "Optic", "None", "w") +
              slot("muz", "Muzzle", "None", "w") +
              slot("grip", "Grip or bipod", "None", "w") +
            "</div>" +
            /* The game builds a loaded magazine in front of you: pick the mag, pick the
               round, and it shows you what you end up with. The sum was always here, it
               was just written as a sentence under a dropdown. */
            '<div class="veq">' +
              '<div class="veq-step">' +
                '<span class="veq-note">Step 1 // magazine</span>' +
                slot("mag", "Magazine", "None", "w") +
              "</div>" +
              '<span class="veq-op" aria-hidden="true">+</span>' +
              '<div class="veq-step">' +
                '<span class="veq-note">Step 2 // round</span>' +
                slot("ammo", "Ammunition", "None", "w") +
              "</div>" +
              '<span class="veq-op" aria-hidden="true">&times;</span>' +
              '<div class="veq-step veq-qty">' +
                '<span class="veq-note">Step 3 // how many</span>' +
                '<div class="vstep"><button type="button" class="vstep-b" data-mags="-1"' +
                ' aria-label="One magazine fewer">&minus;</button>' +
                '<input id="mags" type="number" min="0" max="20" value="3" aria-label="Magazines">' +
                '<button type="button" class="vstep-b" data-mags="1"' +
                ' aria-label="One magazine more">+</button></div>' +
              "</div>" +
              '<span class="veq-op" aria-hidden="true">=</span>' +
              '<div class="veq-step">' +
                '<span class="veq-note">Loaded</span>' +
                '<div class="vready" id="ready">Nothing loaded</div>' +
              "</div>" +
            "</div>" +
            picker("w", "Primary weapon", byCat("weapons").filter(function (i) {
              return !isSidearm(i.name);
            }), "No weapon", true) +
            picker("sec", "Sidearm", byCat("weapons").filter(function (i) {
              return isSidearm(i.name);
            }), "None") +
            picker("opt", "Optic", attSlot("optic"), "None") +
            picker("muz", "Muzzle", attSlot("muzzle"), "None") +
            picker("grip", "Grip or bipod", attSlot("grip"), "None") +
            picker("mag", "Magazine", attSlot("magazine"), "None") +
            picker("ammo", "Ammunition", byCat("ammunition").filter(function (i) {
              return i.price !== null;
            }), "None") +
          "</div>" +

          '<div class="vend-panel" data-panel="gear" hidden>' +
            '<p class="vend-head">Gear<span class="vend-hint">Click a slot to open the shelf</span></p>' +
            '<div class="vslots">' +
              slot("hel", "Helmet", "Bare head") +
              slot("arm", "Body armour", "No armour") +
              slot("vest", "Rig", "None") +
            "</div>" +
            picker("hel", "Helmet", nameHas(byCat("armour"), "helmet").concat(nameHas(byCat("armour"), "headwear")), "Bare head") +
            picker("arm", "Body armour", byCat("armour").filter(function (i) {
              const n = i.name.toLowerCase();
              return n.indexOf("helmet") < 0 && n.indexOf("headwear") < 0;
            }), "No armour") +
            picker("vest", "Rig", rigs, "None") +
          "</div>" +

          /* Three shelves, not one wall. Throwables, medical and equipment were a single
             undifferentiated grid of 29 cards, which is a list you scan rather than a shelf
             you shop from.

             Each carries a count rather than an on or off. This page exists to say what a
             life costs, and a life with four frags in it costs a good deal more than a life
             with one, which the toggle could not express at all. */
          '<div class="vend-panel" data-panel="items" hidden>' +
            '<p class="vend-head">Items<span class="vend-hint">Set how many of each you carry</span></p>' +
            [["throwables", "Throwables"], ["medical", "Medical"], ["equipment", "Equipment"]]
              .map(function (g) {
                const list = byCat(g[0]).filter(function (i) { return i.price !== null; });
                if (!list.length) return "";
                return '<p class="vitem-group">' + esc(g[1]) +
                  "<span>" + list.length + "</span></p>" +
                  '<div class="vgrid">' + list.map(itemCard).join("") + "</div>";
              }).join("") +
          "</div>" +

        "</div>" +

        /* Storage, in its own column beside the slots rather than under them, because
           that is where the game puts it and because it is not equipment: a helmet is worn
           and a backpack is what everything else goes into. The grid under it is the bag,
           filled as you build the kit: one cell per magazine and one per item, the way the
           game lays its own out. Nothing goes in until a bag is chosen, which is the rule
           this column exists to make visible. */
        '<div class="vend-pack">' +
          '<p class="vend-head">Storage<span class="vend-hint">What it all goes in</span></p>' +
          slot("bag", "Backpack", "None") +
          '<div class="vcells" id="cells" data-locked="1"></div>' +
          '<p class="vpack-foot"><span id="packcount">Empty</span>' +
          '<span id="packnote">Pick a backpack</span></p>' +
        "</div>" +

        /* The bag shelf spans the whole width under both columns. The column it belongs to
           is 268px wide and ten backpacks in it would be a column of ten rows you scroll,
           which is the dropdown this page was built to stop being. */
        '<div class="vend-shelf" hidden>' + picker("bag", "Backpack", bags, "None") + "</div>" +

      "</div>" +

      '<div class="vend-foot">' +
        '<span class="fine" id="breakdown"></span>' +
        '<span class="fine" id="warn"></span>' +
      "</div>" +

      "</div>" +

      /* Two figures this screen wants and nobody has. Saying so is the point: a weight of
         0.0 kg and a bag that never fills would both look like answers, and the second one
         is the sort of thing somebody plans a kit around. */
      /* Where the numbers on this screen come from, said once, because two of them are a
         different kind of thing from the prices: read in bulk off the same database rather
         than typed off it, and neither has been checked against the game. */
      '<p class="fine" style="margin-top:18px;max-width:70ch">Weight, how much room a thing' +
      " takes, how many go in a slot and what unlocks it are transcribed from the same item" +
      " database as the prices, read on " + esc(ARMORY_STATS.readOn) + ". They are not" +
      " measured in game: a bag is counted as squares, and the game packs shapes, so a bag" +
      " with room left in it can still refuse a long item. A kit that carries something the" +
      " database has no weight for says so with a plus on the total rather than quietly" +
      " leaving it out. Anything somebody has since counted in game is marked on its card" +
      " and used ahead of the database.</p>" +

      adSlot("inArticle") +

      '<p style="margin-top:34px"><a class="btn" href="/armory/">Browse the armory</a> ' +
      '<a class="btn" href="/ballistics/">Check what it kills</a></p>' +
      "</div></section>" +

      '<script>(function(){' +
      'var CAL=' + JSON.stringify(byCat("weapons").reduce(function (m, w) {
        if (w.calibre) m[w.name] = w.calibre; return m;
      }, {})) + ';' +
      'var MAGSIZE=' + JSON.stringify((function () {
        /* A magazine's name states how many rounds it holds, which is the only way to turn
           "three magazines" into a number of rounds to pay for. */
        const out = {};
        attSlot("magazine").forEach(function (m) {
          const n = m.name.match(/(\d+)\s*RND/i);
          if (n) out[m.name] = Number(n[1]);
        });
        return out;
      }())) + ';' +
      /* Which weapons an attachment actually goes on, by name, from the pull. Absent means
         the source says nothing and the shelf offers it, since a wrongly hidden attachment
         is worse than a wrongly offered one. */
      'var ATTFIT=' + JSON.stringify(A.items.reduce(function (m, it) {
        if (it.cat !== "attachments") return m;
        const st = ITEM_STATS[it.name] || {};
        if (st.fits) m[it.name] = { w: st.fits };
        return m;
      }, {})) + ';' +
      'var WSLOTS=' + JSON.stringify(weaponSlots) + ';' +
      /* ---- what the source publishes about each item, beyond its price ----
         Weight, footprint, stack size and the grid a bag holds, all from the one pull in
         data/armory-stats.json. The page had none of these a day ago and said so; they are
         a transcription rather than a measurement, and the note under the vendor says which
         it is. */
      /* How many of a thing go in one slot before it takes another, straight from the source
         rather than from a rule of thumb. It is not five across the board: a bandage stacks
         five, a C4 charge and an adrenaline pen three, and rounds stack by calibre, 80 of
         5.56 and 24 of 12 gauge. A grenade does not stack at all, which the guess of "five
         for anything throwable" had wrong. Absent means one to a slot. */
      'var STACK=' + JSON.stringify(A.items.reduce(function (m, i) {
        const st = statOf(i.name);
        if (st.stack) m[i.name] = st.stack;
        return m;
      }, {})) + ';' +
      /* The room a thing takes, as its own footprint rather than a count: a rifle magazine
         is 1x2 and a drum is 2x2, so two magazines do not cost what two grenades cost, and
         the tile drawn for it is the shape the game draws. Anything the source is silent
         about is left out and treated as one square, which is the least it can be. */
      'var TAKES=' + JSON.stringify(A.items.reduce(function (m, i) {
        const g = statOf(i.name).grid;
        if (g && slotsIn(g) > 1) m[i.name] = g;
        return m;
      }, {})) + ';' +
      /* The grid a bag gives you, not just how many squares it comes to: the Pouch is 3x2
         and the Arsenal 5x6, and the shape is what the picture is drawn on. */
      'var BAGGRID=' + JSON.stringify(A.items.reduce(function (m, i) {
        const g = statOf(i.name).storage;
        if (g) m[i.name] = g;
        return m;
      }, {})) + ';' +
      'var KG=' + JSON.stringify(A.items.reduce(function (m, i) {
        const st = statOf(i.name);
        if (typeof st.kg === "number") m[i.name] = st.kg;
        return m;
      }, {})) + ';' +
      'var SLOTS=["w","sec","opt","muz","grip","mag","ammo","hel","arm","bag","vest"];' +
      'var extras={},chosen={},openSlot=null,hadBag=false;' +
      'function el(id){return document.getElementById(id);}' +
      'function money(n){return "$"+n.toLocaleString("en-US");}' +
      'function attr(c,a){return c?c.getAttribute(a):null;}' +
      'function nameOf(id){return chosen[id]?attr(chosen[id],"data-name"):"";}' +

      /* One shelf open at a time. Two open at once and the slots they belong to are off
         the top of the screen, which is how a picker stops looking like it belongs to
         anything. */
      /* A shelf that lives in its own full width row has to take the row with it, or the
         grid keeps drawing an empty band and the hairline above it. */
      'function shelfOf(g){return g&&g.parentNode&&' +
      ' g.parentNode.className.indexOf("vend-shelf")>=0?g.parentNode:null;}' +
      'function closePicker(){' +
      ' if(!openSlot)return;' +
      ' var g=el(openSlot+"-grid");if(g){g.hidden=true;' +
      '  var sh=shelfOf(g);if(sh)sh.hidden=true;}' +
      ' var b=document.querySelector("[data-open="+openSlot+"]");' +
      ' if(b)b.setAttribute("aria-expanded","false");' +
      ' openSlot=null;}' +
      /* A split shelf shows one class at a time. It opens on the class of what is already
         in the slot, so pressing Change on an SMG shows the other SMGs rather than the top
         of the list, and on an empty slot it opens on the first class in the order. */
      'function splitTo(id,cls){' +
      ' var g=el(id+"-grid");if(!g)return;' +
      ' g.setAttribute("data-split",cls);' +
      ' Array.prototype.forEach.call(g.querySelectorAll("[data-pcls]"),function(b){' +
      '  b.setAttribute("aria-pressed",' +
      '   b.getAttribute("data-pcls")===id+"|"+cls?"true":"false");});' +
      ' Array.prototype.forEach.call(g.querySelectorAll("[data-pclass]"),function(c){' +
      '  c.hidden=c.getAttribute("data-pclass")!==cls;});}' +
      'function splitFor(id){' +
      ' var g=el(id+"-grid");if(!g||!g.hasAttribute("data-split"))return;' +
      ' var have=chosen[id]&&attr(chosen[id],"data-pclass");' +
      ' if(!have){' +
      '  var first=g.querySelector("[data-pcls]");' +
      '  have=first?first.getAttribute("data-pcls").split("|")[1]:"";}' +
      ' splitTo(id,have);}' +
      'function openPicker(id){' +
      ' var was=openSlot;closePicker();' +
      ' if(was===id)return;' +
      ' var g=el(id+"-grid");if(!g)return;' +
      ' splitFor(id);' +
      ' g.hidden=false;openSlot=id;' +
      ' var sh2=shelfOf(g);if(sh2)sh2.hidden=false;' +
      ' var b=document.querySelector("[data-open="+id+"]");' +
      ' if(b)b.setAttribute("aria-expanded","true");' +
      ' var f=g.querySelector(".vcard:not([hidden])");if(f)f.focus();}' +

      /* A slot carries the art, the price tag, the name and whether it reads as filled.
         They are set together so a slot can never show one and not the others. */
      'function setSlot(id,card){' +
      ' var pick=card&&attr(card,"data-name")?card:null;' +
      ' chosen[id]=pick;' +
      ' var grid=el(id+"-grid");' +
      ' if(grid)Array.prototype.forEach.call(grid.querySelectorAll(".vcard"),function(c){' +
      '  var on=pick?c===pick:c.className.indexOf("vcard-none")>=0;' +
      '  c.setAttribute("aria-pressed",on?"true":"false");});' +
      ' var box=el(id+"-slot"),tag=el(id+"-tag"),ic=el(id+"-icon"),nm=el(id+"-name");' +
      ' box.setAttribute("data-on",pick?"1":"0");' +
      ' nm.textContent=pick?attr(pick,"data-name"):nm.getAttribute("data-blank");' +
      ' if(pick){' +
      '  var slug=attr(pick,"data-icon");' +
      '  if(slug){ic.src="/game-icons/"+slug+".png";ic.hidden=false;}' +
      '  else{ic.hidden=true;ic.removeAttribute("src");}' +
      '  tag.textContent=attr(pick,"data-unknown")?"no price":money(+attr(pick,"data-price")||0);' +
      '  tag.hidden=false;}' +
      ' else{ic.hidden=true;ic.removeAttribute("src");tag.hidden=true;}}' +

      /* The shelf only shows rounds the chosen weapon can chamber, which is the filtering
         the old dropdown did when it was rebuilt on every weapon change. A weapon whose
         calibre is not in the chart gets the whole shelf rather than an empty one. */
      'function filterAmmo(){' +
      ' var grid=el("ammo-grid");if(!grid)return;' +
      ' var cal=CAL[nameOf("w")],any=false;' +
      ' var cards=grid.querySelectorAll(".vcard");' +
      ' Array.prototype.forEach.call(cards,function(c){' +
      '  if(c.className.indexOf("vcard-none")>=0){c.hidden=false;return;}' +
      '  var ok=!cal||attr(c,"data-name").indexOf(cal)===0;' +
      '  c.hidden=!ok;if(ok)any=true;});' +
      ' if(!any)Array.prototype.forEach.call(cards,function(c){c.hidden=false;});' +
      ' if(chosen.ammo&&chosen.ammo.hidden)setSlot("ammo",null);}' +

      /* An optic on no rifle is not a decision anybody can make, so the four slots that
         hang off the weapon stay shut until there is one. Picking a different weapon, or
         clearing it, empties them rather than leaving an AK magazine sitting under a
         shotgun. */
      /* Three states, not two. No weapon at all, a weapon that has no such slot, and a
         weapon that does. The middle one is why a launcher was wearing a foregrip. */
      'function setGates(){' +
      ' var w=nameOf("w");' +
      ' var has=w?(WSLOTS[w]||["opt","muz","grip","mag"]):null;' +
      ' Array.prototype.forEach.call(document.querySelectorAll("[data-needs]"),function(box){' +
      '  var id=box.id.replace("-slot","");' +
      '  var ok=!!w&&(id==="ammo"||has.indexOf(id)>=0);' +
      '  box.setAttribute("data-locked",ok?"0":"1");' +
      '  var b=box.querySelector(".vslot-btn");if(b)b.disabled=!ok;' +
      '  if(!ok){' +
      '   if(chosen[id])setSlot(id,null);' +
      '   var nm=el(id+"-name");' +
      '   if(nm)nm.textContent=w?"Not on this weapon":"Pick a weapon first";}' +
      /* A slot that unlocks has to take its own label back. Without this it kept whatever
         the last weapon left on it, so every slot on an M4 read "Not on this weapon". */
      '  else if(!chosen[id]){var n2=el(id+"-name");' +
      '   if(n2)n2.textContent=n2.getAttribute("data-blank");}});}' +

      /* Same rule the ammunition shelf already follows: hide what the label says belongs to
         something else, show everything it does not speak for, and if that leaves nothing
         show the lot rather than an empty shelf. */
      /* Hide what the label says belongs to something else, show what it does not speak
         for. Magazines were briefly strict, on the reasoning that a magazine is cut for one
         weapon, and that took the M4 to zero: its magazines are STANAG, which name a
         standard rather than a rifle. The absurd case that strictness was aimed at is the
         launcher, and the slot map above already answers that one properly. */
      'function fits(name){' +
      ' var o=ATTFIT[name];if(!o)return true;' +
      ' var w=nameOf("w");if(!w)return true;' +
      ' return o.w.indexOf(w)>=0;}' +
      'function filterAtts(){' +
      ' ["opt","muz","grip","mag"].forEach(function(id){' +
      '  var grid=el(id+"-grid");if(!grid)return;' +
      '  var cards=grid.querySelectorAll(".vcard"),any=false;' +
      '  Array.prototype.forEach.call(cards,function(c){' +
      '   if(c.className.indexOf("vcard-none")>=0){c.hidden=false;return;}' +
      '   var ok=fits(attr(c,"data-name"));c.hidden=!ok;if(ok)any=true;});' +
      '  if(!any)Array.prototype.forEach.call(cards,function(c){c.hidden=false;});' +
      '  if(chosen[id]&&chosen[id].hidden)setSlot(id,null);});}' +

      'function ammoCost(){' +
      ' var c=chosen.ammo;if(!c)return{cost:0,rounds:0};' +
      ' var per=+attr(c,"data-per")||1,price=+attr(c,"data-price")||0;' +
      ' var size=MAGSIZE[nameOf("mag")]||30;' +
      ' var rounds=size*(+el("mags").value||0);' +
      /* You buy rounds in packs, so a part pack still costs a whole one. */
      ' return {cost:Math.ceil(rounds/per)*price,rounds:rounds};}' +

      /* ---- the bag itself ----
         The old version listed the whole kit back as words, weapon and helmet included,
         which is a receipt rather than a bag: the rifle is in your hands and the helmet is
         on your head, and neither is taking up room in anything. This draws what the game
         draws on the right of that screen, in cells: a cell per magazine with its round
         count, and a cell per item you are carrying with how many.

         Icons come from the cards already on the page rather than from a second table of
         slugs, so a cell can never show art the shelf does not. */
      'function cell(src,label,sub,w,h){' +
      ' var d=document.createElement("div");d.className="vcell";' +
      ' if(w>1)d.style.gridColumn="span "+w;' +
      ' if(h>1)d.style.gridRow="span "+h;' +
      ' if(src){var im=document.createElement("img");im.src=src;im.alt="";' +
      '  im.loading="lazy";d.appendChild(im);}' +
      ' if(sub){var b=document.createElement("b");b.textContent=sub;d.appendChild(b);}' +
      ' d.title=label;' +
      ' var s=document.createElement("span");s.textContent=label;d.appendChild(s);' +
      ' return d;}' +
      'function iconOf(c){var g=c&&attr(c,"data-icon");' +
      ' return g?"/game-icons/"+g+".png":"";}' +
      /* A thing's footprint, as the game gives it: 1x2 for a rifle magazine, 2x2 for a drum,
         1x1 for a grenade. Anything the source says nothing about takes one square, which
         is the smallest thing it could be and so the least the bag can be made to look. */
      'function foot(name){var g=TAKES[name];return g?g:[1,1];}' +
      'function fillCells(){' +
      ' var box=el("cells");box.textContent="";' +
      ' var bag=chosen.bag,n=0,used=0;' +
      ' box.setAttribute("data-locked",bag?"0":"1");' +
      ' if(!bag){' +
      '  var p=document.createElement("p");p.className="vcells-none";' +
      '  p.textContent="Nothing can be carried until you pick a backpack.";' +
      '  box.appendChild(p);box.style.removeProperty("--cols");' +
      '  el("packcount").textContent="Empty";' +
      '  el("packnote").textContent="Pick a backpack";' +
      '  return;}' +
      /* The bag is drawn on its own grid, the shape the game gives it: three across for a
         Pouch, five for an Arsenal. Tiles are laid dense, so a tall magazine and a square
         drum pack the way they do in the game rather than each taking a row. */
      ' var grid=BAGGRID[nameOf("bag")]||[3,2];' +
      ' var cols=grid[0],room=grid[0]*grid[1];' +
      ' box.style.setProperty("--cols",cols);' +
      /* One tile per magazine, labelled with what is in it: three magazines of one round
         and three of another cannot be said in a single line of text. */
      ' var mags=+el("mags").value||0,mc=chosen.mag,ac=chosen.ammo;' +
      ' if(mc&&mags){' +
      '  var mn=nameOf("mag"),size=MAGSIZE[mn]||30,f=foot(mn);' +
      '  var load=ac?nameOf("ammo"):"empty";' +
      '  for(var i=0;i<mags;i++){n++;used+=f[0]*f[1];' +
      '   box.appendChild(cell(iconOf(mc),mn+", "+load,size+"/"+size,f[0],f[1]));}}' +
      ' else if(ac&&mags){' +
      '  var r=ammoCost().rounds,an=nameOf("ammo"),fa=foot(an),per=STACK[an]||1;' +
      '  var left=r;' +
      '  while(left>0){var here=Math.min(per,left);left-=here;n++;used+=fa[0]*fa[1];' +
      '   box.appendChild(cell(iconOf(ac),an,String(here),fa[0],fa[1]));}}' +
      /* Stacks come off the source rather than a rule of thumb: five bandages to a slot,
         three charges, eighty rounds of 5.56, and a grenade on its own because a grenade
         does not stack at all. */
      ' Object.keys(extras).forEach(function(k){' +
      '  var q=extras[k].q;n+=q;' +
      '  var card=document.querySelector("[data-extra=\\""+k.replace(/"/g,"")+"\\"]");' +
      '  var im0=card&&card.querySelector("img");' +
      '  var per=STACK[k]||1,f=foot(k),left=q;' +
      '  while(left>0){var here=Math.min(per,left);left-=here;used+=f[0]*f[1];' +
      '   box.appendChild(cell(im0?im0.src:"",k,here>1?String(here):"",f[0],f[1]));}});' +
      /* The rest of the bag, drawn empty. A bag is a picture of how much room is left, and
         a grid that stopped at the last thing in it would not be one. */
      ' for(var j=0;j<Math.max(0,room-used);j++){var e=document.createElement("div");' +
      '  e.className="vcell vcell-empty";box.appendChild(e);}' +
      ' box.setAttribute("data-over",used>room?"1":"0");' +
      ' el("packcount").textContent=used?used+" of "+room+" slots":"Empty";' +
      ' el("packnote").textContent=used>room?"More than it holds":nameOf("bag");}' +

      'function render(){' +
      ' var total=0,unknown=0,parts=[];' +
      ' SLOTS.forEach(function(id){' +
      '  if(id==="ammo")return;' +
      '  var c=chosen[id];if(!c)return;' +
      '  total+=+attr(c,"data-price")||0;if(attr(c,"data-unknown"))unknown++;});' +
      ' var a=ammoCost();total+=a.cost;' +
      ' Object.keys(extras).forEach(function(k){total+=extras[k].q*extras[k].p;});' +
      ' el("total").textContent=money(total);' +
      ' el("ready").textContent=a.rounds?a.rounds+" rounds loaded, "+money(a.cost):"Nothing loaded";' +
      ' el("ready").setAttribute("data-on",a.rounds?"1":"0");' +
      ' if(a.rounds)parts.push(a.rounds+" rounds for "+money(a.cost));' +
      ' var ne=0;Object.keys(extras).forEach(function(k){ne+=extras[k].q;});' +
      ' if(ne)parts.push(ne+" item"+(ne>1?"s":""));' +
      ' el("breakdown").textContent=parts.join(" \u00b7 ");' +
      ' el("warn").textContent=unknown?' +
      '  unknown+" item"+(unknown>1?"s have":" has")+" no confirmed price yet and counts as zero."' +
      '  :"";' +
      ' weigh();fillCells();}' +

      /* The other number the game puts at the top of this screen, and the one that decides
         how fast you move under the kit. Nothing has a measured weight yet, so this says so
         instead of adding up an empty set and printing a confident 0.0 kg. The sum is
         written anyway and works the moment a single kg exists: what it will not do is
         report a total while some of the kit has no figure, since a light total and an
         unweighed rifle look identical on a readout. */
      'function weigh(){' +
      ' var out=el("weight");' +
      ' var have=0,miss=0,kg=0;' +
      ' var add=function(name,q){ if(!name)return;' +
      '  if(typeof KG[name]==="number"){have++;kg+=KG[name]*q;} else miss++; };' +
      /* Three magazines weigh three magazines. The slot says which one is chosen and the
         stepper says how many are in the bag, and counting the slot once had a kit carrying
         ninety rounds report the weight of thirty. */
      ' SLOTS.forEach(function(id){ if(id!=="ammo"&&id!=="mag")add(nameOf(id),1); });' +
      ' add(nameOf("mag"),+el("mags").value||0);' +
      ' Object.keys(extras).forEach(function(k){ add(k,extras[k].q); });' +
      ' if(!have){out.textContent=miss?"work in progress":"--";' +
      '  out.setAttribute("data-soft","1");out.title="";return;}' +
      ' out.removeAttribute("data-soft");' +
      /* A total with a plus on it rather than no total at all. The source has a weight for
         most of the catalogue and not all of it, and a kit with one unweighed piece in it
         still tells you more as "12.2 kg and a bit" than as a shrug. The plus is the part
         that stops it being a lie, and the tooltip says which piece. */
      ' out.textContent=(Math.round(kg*10)/10)+" kg"+(miss?" +":"");' +
      ' out.title=miss?miss+" thing"+(miss>1?"s have":" has")+" no published weight, so the '+
      'real figure is higher":"";}' +

      /* ---- nothing is bought that nothing can carry ----
         The items shelf sold grenades and bandages to somebody with no bag, which is a kit
         that cannot exist: in the game they go in the backpack and there is no backpack.
         The shelf locks until one is chosen, and choosing None again empties what was in it
         rather than leaving paid-for items floating with nowhere to be. Spare magazines are
         the same thing under a different name, so the magazine count locks with it.

         The weapon, the sidearm, the helmet, the armour and the rig are deliberately not
         gated: they are held or worn, not carried, and a rifle in your hands does not need
         a bag to exist. */
      'function gateBag(){' +
      ' var open=!!chosen.bag;' +
      ' var panel=document.querySelector("[data-panel=items]");' +
      ' if(panel){panel.setAttribute("data-locked",open?"0":"1");' +
      '  Array.prototype.forEach.call(panel.querySelectorAll("button"),function(b){' +
      '   b.disabled=!open;});' +
      '  var hint=panel.querySelector(".vend-hint");' +
      '  if(hint)hint.textContent=open?"Set how many of each you carry"' +
      '   :"Pick a backpack before you buy any of this";}' +
      ' var mg=el("mags");if(mg)mg.disabled=!open;' +
      ' Array.prototype.forEach.call(document.querySelectorAll("[data-mags]"),function(b){' +
      '  b.disabled=!open;});' +
      ' var step=document.querySelector(".veq-qty");' +
      ' if(step)step.setAttribute("data-locked",open?"0":"1");' +
      /* Emptying the bag happens when a bag is taken away, not merely whenever there is
         none. Clearing on every call meant the page loaded with no bag, wiped the three
         magazines the markup starts with, and handed the first person to choose a backpack
         a kit with no ammunition in it and no sign of why. */
      ' if(!open&&hadBag){' +
      '  Object.keys(extras).forEach(function(k){delete extras[k];});' +
      '  Array.prototype.forEach.call(document.querySelectorAll("[data-extra]"),function(c){' +
      '   c.setAttribute("data-qty","0");' +
      '   var n=c.querySelector(".vitem-n");if(n)n.textContent="0";});' +
      '  el("mags").value="0";}' +
      ' hadBag=open;}' +

      /* One listener for the whole vendor. Every control says what it is in an attribute,
         so adding a slot or an item is markup and nothing here has to learn about it. */
      'document.addEventListener("click",function(e){' +
      ' var t=e.target;if(!t||!t.closest)return;' +
      ' var pc=t.closest("[data-pcls]");' +
      ' if(pc){var bits=pc.getAttribute("data-pcls").split("|");' +
      '  splitTo(bits[0],bits[1]);return;}' +
      ' var o=t.closest("[data-open]");' +
      ' if(o){openPicker(o.getAttribute("data-open"));return;}' +
      ' if(t.closest("[data-close]")){closePicker();return;}' +
      ' var p=t.closest("[data-pick]");' +
      ' if(p){var id=p.getAttribute("data-pick");' +
      '  setSlot(id,p);if(id==="w"){setGates();filterAtts();filterAmmo();}' +
      '  if(id==="bag")gateBag();' +
      '  closePicker();render();return;}' +
      /* The stepper is read before the card, because both are under the cursor when the
         minus is clicked and the card would otherwise add one while the minus took one
         away. Clicking the card itself is the plus, which is what wanting another grenade
         usually looks like. */
      ' var q=t.closest("[data-step]"),x=t.closest("[data-extra]");' +
      ' if(x){var k=x.getAttribute("data-extra"),p=+x.getAttribute("data-price")||0;' +
      '  var cur=extras[k]?extras[k].q:0;' +
      '  var next=Math.max(0,Math.min(20,cur+(q?+q.getAttribute("data-step"):1)));' +
      '  if(next)extras[k]={q:next,p:p};else delete extras[k];' +
      '  x.setAttribute("data-qty",String(next));' +
      '  var nEl=x.querySelector(".vitem-n");if(nEl)nEl.textContent=String(next);' +
      '  render();return;}' +
      ' var m=t.closest("[data-mags]");' +
      ' if(m){var i=el("mags");' +
      '  i.value=Math.max(0,Math.min(20,(+i.value||0)+(+m.getAttribute("data-mags"))));' +
      '  render();return;}' +
      ' var tab=t.closest(".vend-tab");' +
      ' if(tab){var want=tab.getAttribute("data-tab");closePicker();' +
      '  Array.prototype.forEach.call(document.querySelectorAll(".vend-tab"),function(b){' +
      '   b.setAttribute("aria-selected",b===tab?"true":"false");});' +
      '  Array.prototype.forEach.call(document.querySelectorAll("[data-panel]"),function(pn){' +
      '   pn.hidden=pn.getAttribute("data-panel")!==want;});}});' +
      'document.addEventListener("keydown",function(e){' +
      ' if(e.key==="Escape"&&openSlot){var b=document.querySelector("[data-open="+openSlot+"]");' +
      '  closePicker();if(b)b.focus();}});' +
      'el("mags").addEventListener("input",render);' +
      'SLOTS.forEach(function(id){setSlot(id,null);});' +
      'setGates();gateBag();filterAtts();filterAmmo();render();' +
      '}());<\/script>',
  }));

  /* ---------- /vehicles/, which is now a doorway rather than a page ----------
     It listed the vehicles category and the mounted category in two tables, split ground
     from air, and carried one note about fuel. The armory holds all four of those now: the
     rail filters to either category, the detail panel gives the ground or air split per
     vehicle, and the note is on the armory page. A second page repeating the catalogue was
     the reason it read as thin.

     Deleting the URL was the other option and is the wrong one. GitHub Pages cannot serve a
     301, so a removed page is a 404 for everyone holding the link and for anything that
     indexed it, permanently and with no way to say where it went. A zero-delay meta refresh
     is the redirect a static host can do; the canonical points at the armory so the ranking
     consolidates there, and noindex keeps this stub itself out of the index and out of the
     sitemap check. The prose is for the person who arrives with JavaScript off and gets no
     refresh at all: they still get a working link rather than a blank page. */
  write("vehicles/index.html", page({
    title: "WARDOGS Vehicles: now in the Armory",
    desc: "Every WARDOGS ground and air vehicle, with its vendor price, now lives in the Armory alongside the rest of the catalogue.",
    canonical: "/armory/",
    noindex: true,
    head: '<meta http-equiv="refresh" content="0; url=/armory/">',
    body: '<section><div class="wrap">' +
      '<span class="eyebrow">Moved</span>' +
      "<h1>Vehicles moved to the Armory</h1>" +
      '<p class="lede">All ' + byCat("vehicles").length + " vehicles and the " +
      byCat("mounted").length + " mounted weapons are in the Armory now, priced beside" +
      " everything else, ground and air on their own filters, and what each one takes to" +
      " unlock on its panel.</p>" +
      '<p><a class="btn primary" href="/armory/">Go to the Armory</a></p>' +
      "</div></section>",
  }));
}
};
