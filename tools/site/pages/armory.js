/* The item catalogue, the loadout calculator and the vehicle list.
   Body sits at column zero deliberately. Indenting it would add whitespace inside
   these template literals, and that whitespace is page content. */
module.exports = ctx => {
  const { esc, ARMORY, BALLISTICS, adSlot, page, write } = ctx;

/* ---------- armory, loadouts and vehicles ----------
   One transcribed vendor catalogue behind all three. The armory browses it, the loadout
   calculator adds it up, and the vehicles page is the slice of it you can drive. Prices are
   read off the public database rather than derived, and an item the source has not
   confirmed shows as blank instead of a guess. */
{
  const A = ARMORY;
  const money = function (n) { return "$" + n.toLocaleString("en-US"); };
  const priceCell = function (it) {
    if (it.price === null) return '<span class="fine">not confirmed</span>';
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

  const withSlots = A.items.map(function (it) {
    return it.cat === "attachments" ? Object.assign({}, it, { slot: slotOf(it.name) }) : it;
  });

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
  const itemAttrs = function (it) {
    return ' data-item="1" data-cat="' + it.cat + '" data-name="' + esc(it.name.toLowerCase()) +
      '" data-price="' + (it.price === null ? -1 : it.price) + '"';
  };
  const rows = withSlots.map(function (it) {
    return "<tr" + itemAttrs(it) + ">" +
      "<td><b>" + esc(it.name) + "</b></td>" +
      "<td>" + esc(catName(it.cat)) +
        (it.slot && it.slot !== "other" ? ' <span class="fine">' + it.slot + "</span>" : "") + "</td>" +
      '<td class="n">' + priceCell(it) + "</td></tr>";
  }).join("");
  const cards = withSlots.map(function (it) {
    return '<div class="acard"' + itemAttrs(it) + ">" +
      '<span class="acard-art">' +
      (it.icon ? '<img src="/game-icons/' + it.icon + '.png" alt="" width="64" height="64" loading="lazy">' : "") +
      "</span>" +
      '<span class="acard-body"><b>' + esc(it.name) + "</b>" +
      '<span class="acard-cat">' + esc(catName(it.cat)) +
        (it.slot && it.slot !== "other" ? " &middot; " + it.slot : "") + "</span></span>" +
      '<span class="acard-price">' + priceCell(it) + "</span></div>";
  }).join("");

  write("armory/index.html", page({
    title: "WARDOGS Armory: every item and what it costs",
    desc: "Every WARDOGS weapon, attachment, round, armour piece and vehicle with its vendor price. Search and sort the whole catalogue.",
    canonical: "/armory/",
    body: '<section><div class="wrap">' +
      '<span class="eyebrow">Vendor prices, checked ' + esc(A.checkedOn) + '</span>' +
      "<h1>Armory</h1>" +
      '<p class="lede">Every item you can buy, and what the vendor wants for it. ' +
      A.items.filter(function (i) { return i.price !== null; }).length +
      " of " + A.items.length + " have a confirmed price; the rest are blank rather than guessed.</p>" +
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
            return '<button class="rail-item" data-filter="' + c.id + '" aria-pressed="false">' +
              "<span>" + esc(c.name) + "</span><b>" +
              A.items.filter(function (i) { return i.cat === c.id; }).length + "</b></button>";
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
      '<p style="margin-top:34px"><a class="btn primary" href="/ballistics/">Damage calculator</a> ' +
      '<a class="btn" href="/loadouts/">Price up a loadout</a></p>' +
      adSlot("inArticle") +
      "</div></section>" +
      '<script>(function(){' +
      'var grid=document.getElementById("catGrid"),tblBox=document.getElementById("catTable");' +
      'var tb=tblBox.querySelector("tbody"),empty=document.getElementById("catEmpty");' +
      'var rows=Array.prototype.slice.call(tb.querySelectorAll("tr"));' +
      'var cards=Array.prototype.slice.call(grid.querySelectorAll(".acard"));' +
      'var cat="",q="",sort="name",dir=1;' +
      'function keep(el){' +
      ' if(cat&&el.getAttribute("data-cat")!==cat)return false;' +
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
      ' if(f){cat=f.getAttribute("data-filter");press("[data-filter]",f);apply();return;}' +
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
      'apply();' +
      '}());<\/script>',
  }));

  /* ---------- loadouts: what one death costs ----------
     You pick by clicking the thing you want, the way the vendor works. A dropdown hides
     every option until you open it and shows them as a list of words, which for a shelf of
     items that all have a picture is the wrong control: you cannot see what you are buying
     and you cannot compare two of them side by side. */
  const vcard = function (it, slotId) {
    return '<button type="button" class="vcard" data-pick="' + slotId + '"' +
      ' data-name="' + esc(it.name) + '"' +
      ' data-price="' + (it.price === null ? 0 : it.price) + '"' +
      (it.price === null ? ' data-unknown="1"' : "") +
      (it.icon ? ' data-icon="' + it.icon + '"' : "") +
      (it.per ? ' data-per="' + it.per + '"' : "") +
      ' aria-pressed="false">' +
      '<span class="vcard-tag">' +
        (it.price === null ? "no price" : it.price === 0 ? "free" : money(it.price)) + "</span>" +
      '<span class="vcard-art">' +
      (it.icon ? '<img src="/game-icons/' + it.icon + '.png" alt="" width="52" height="52" loading="lazy">' : "") +
      "</span>" +
      '<span class="vcard-name">' + esc(it.name) + "</span></button>";
  };
  const noneCard = function (slotId, label) {
    return '<button type="button" class="vcard vcard-none" data-pick="' + slotId + '"' +
      ' data-name="" data-price="0" aria-pressed="true">' +
      '<span class="vcard-art"></span>' +
      '<span class="vcard-name">' + esc(label) + "</span></button>";
  };
  const byCat = function (id) { return withSlots.filter(function (i) { return i.cat === id; }); };
  const attSlot = function (s) {
    return byCat("attachments").filter(function (i) { return i.slot === s; });
  };
  const nameHas = function (list, s) {
    return list.filter(function (i) { return i.name.toLowerCase().indexOf(s) >= 0; });
  };

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

  const picker = function (id, label, list, blank) {
    return '<div class="vpicker" id="' + id + '-grid" hidden>' +
      '<p class="vpicker-head">' + esc(label) +
      '<button type="button" class="vpicker-x" data-close="' + id + '">Close</button></p>' +
      '<div class="vgrid">' + noneCard(id, blank) +
      list.map(function (it) { return vcard(it, id); }).join("") + "</div></div>";
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
            }), "No weapon") +
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
              slot("bag", "Backpack", "None") +
              slot("vest", "Rig", "None") +
            "</div>" +
            picker("hel", "Helmet", nameHas(byCat("armour"), "helmet").concat(nameHas(byCat("armour"), "headwear")), "Bare head") +
            picker("arm", "Body armour", byCat("armour").filter(function (i) {
              const n = i.name.toLowerCase();
              return n.indexOf("helmet") < 0 && n.indexOf("headwear") < 0;
            }), "No armour") +
            picker("bag", "Backpack", nameHas(byCat("storage"), "backpack"), "None") +
            picker("vest", "Rig", nameHas(byCat("storage"), "tac vest").concat(nameHas(byCat("storage"), "pouch")), "None") +
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

        '<div class="vend-pack">' +
          '<p class="vend-head">Backpack<span id="packcount">Empty</span></p>' +
          '<ul class="vpack" id="pack"></ul>' +
        "</div>" +

      "</div>" +

      '<div class="vend-foot">' +
        '<span class="fine" id="breakdown"></span>' +
        '<span class="fine" id="warn"></span>' +
      "</div>" +

      "</div>" +

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
      'var ATTFIT=' + JSON.stringify(attOwner) + ';' +
      'var WSLOTS=' + JSON.stringify(weaponSlots) + ';' +
      'var SLOTS=["w","sec","opt","muz","grip","mag","ammo","hel","arm","bag","vest"];' +
      'var extras={},chosen={},openSlot=null;' +
      'function el(id){return document.getElementById(id);}' +
      'function money(n){return "$"+n.toLocaleString("en-US");}' +
      'function attr(c,a){return c?c.getAttribute(a):null;}' +
      'function nameOf(id){return chosen[id]?attr(chosen[id],"data-name"):"";}' +

      /* One shelf open at a time. Two open at once and the slots they belong to are off
         the top of the screen, which is how a picker stops looking like it belongs to
         anything. */
      'function closePicker(){' +
      ' if(!openSlot)return;' +
      ' var g=el(openSlot+"-grid");if(g)g.hidden=true;' +
      ' var b=document.querySelector("[data-open="+openSlot+"]");' +
      ' if(b)b.setAttribute("aria-expanded","false");' +
      ' openSlot=null;}' +
      'function openPicker(id){' +
      ' var was=openSlot;closePicker();' +
      ' if(was===id)return;' +
      ' var g=el(id+"-grid");if(!g)return;' +
      ' g.hidden=false;openSlot=id;' +
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
      ' if(o.w)return o.w===w;' +
      ' if(o.c)return CAL[w]===o.c;' +
      ' return true;}' +
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

      /* The kit listed back to you, the way the vendor shows what is going in the bag. */
      'function fillPack(){' +
      ' var ul=el("pack");ul.textContent="";var n=0;' +
      ' SLOTS.forEach(function(id){' +
      '  var c=chosen[id];if(!c)return;' +
      '  n++;' +
      '  var li=document.createElement("li");' +
      '  var slug=attr(c,"data-icon");' +
      '  if(slug){var im=document.createElement("img");im.src="/game-icons/"+slug+".png";' +
      '   im.alt="";im.width=26;im.height=26;li.appendChild(im);}' +
      '  var nm=document.createElement("span");nm.textContent=attr(c,"data-name");' +
      '  li.appendChild(nm);' +
      '  var pr=document.createElement("b");' +
      '  pr.textContent=attr(c,"data-unknown")?"?":money(+attr(c,"data-price")||0);' +
      '  li.appendChild(pr);ul.appendChild(li);});' +
      ' Object.keys(extras).forEach(function(k){' +
      '  n+=extras[k].q;' +
      '  var li=document.createElement("li");' +
      '  var b=document.querySelector("[data-extra=\\""+k.replace(/"/g,"")+"\\"]");' +
      '  var im0=b&&b.querySelector("img");' +
      '  if(im0){var im=document.createElement("img");im.src=im0.src;im.alt="";' +
      '   im.width=26;im.height=26;li.appendChild(im);}' +
      '  var nm=document.createElement("span");' +
      '  nm.textContent=(extras[k].q>1?extras[k].q+" × ":"")+k;li.appendChild(nm);' +
      '  var pr=document.createElement("b");pr.textContent=money(extras[k].q*extras[k].p);' +
      '  li.appendChild(pr);ul.appendChild(li);});' +
      ' el("packcount").textContent=n?n+(n>1?" items":" item"):"Empty";}' +

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
      ' fillPack();}' +

      /* One listener for the whole vendor. Every control says what it is in an attribute,
         so adding a slot or an item is markup and nothing here has to learn about it. */
      'document.addEventListener("click",function(e){' +
      ' var t=e.target;if(!t||!t.closest)return;' +
      ' var o=t.closest("[data-open]");' +
      ' if(o){openPicker(o.getAttribute("data-open"));return;}' +
      ' if(t.closest("[data-close]")){closePicker();return;}' +
      ' var p=t.closest("[data-pick]");' +
      ' if(p){var id=p.getAttribute("data-pick");' +
      '  setSlot(id,p);if(id==="w"){setGates();filterAtts();filterAmmo();}' +
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
      'setGates();filterAtts();filterAmmo();render();' +
      '}());<\/script>',
  }));

  /* ---------- vehicles ---------- */
  const isAir = function (n) {
    return /AH-6|MH-6|UH-1|Havoc/.test(n);
  };
  const vehRows = function (list) {
    return list.map(function (v) {
      return "<tr><td><b>" + esc(v.name) + "</b></td><td class=n>" + priceCell(v) + "</td></tr>";
    }).join("");
  };
  const veh = byCat("vehicles");
  const air = veh.filter(function (v) { return isAir(v.name); });
  const ground = veh.filter(function (v) { return !isAir(v.name); });

  write("vehicles/index.html", page({
    title: "WARDOGS Vehicles: ground, air and what they cost",
    desc: "Every WARDOGS ground and air vehicle with its vendor price, plus the mounted weapons that go on them.",
    canonical: "/vehicles/",
    body: '<section><div class="wrap">' +
      '<span class="eyebrow">Vendor prices, checked ' + esc(A.checkedOn) + '</span>' +
      "<h1>Vehicles</h1>" +
      '<p class="lede">What each one costs to put on the field. A Havoc is thirty-six Bobcats,' +
      " which is the sort of thing worth knowing before you drive it into a Gepard.</p>" +
      '<h2 style="margin-top:36px">Ground</h2>' +
      '<table><thead><tr><th>Vehicle</th><th class="n">Price</th></tr></thead><tbody>' +
      vehRows(ground) + "</tbody></table>" +
      '<h2 style="margin-top:44px">Air</h2>' +
      '<table><thead><tr><th>Aircraft</th><th class="n">Price</th></tr></thead><tbody>' +
      vehRows(air) + "</tbody></table>" +
      '<h2 style="margin-top:44px">Mounted weapons</h2>' +
      "<p>What sits on top of them, and on your emplacements. Most of these have no vendor" +
      " price of their own because they arrive attached to something.</p>" +
      '<table><thead><tr><th>Weapon</th><th class="n">Price</th></tr></thead><tbody>' +
      vehRows(byCat("mounted")) + "</tbody></table>" +
      '<p class="fine" style="margin-top:26px">Fuel and repair costs are not in the public' +
      " database yet. A fuel can is " + money(150) + " and a fuel supply pallet is " + money(400) +
      ", which is as close as anyone can honestly get until launch.</p>" +
      '<p style="margin-top:34px"><a class="btn" href="/planner/">Open the planner</a></p>' +
      "</div></section>",
  }));
}
};
