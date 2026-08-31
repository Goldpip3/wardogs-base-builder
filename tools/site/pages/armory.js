/* The item catalogue, the loadout calculator and the vehicle list.
   Body sits at column zero deliberately. Indenting it would add whitespace inside
   these template literals, and that whitespace is page content. */
module.exports = ctx => {
  const { esc, ARMORY, adSlot, page, write } = ctx;

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
      '<div class="cat-bar">' +
        '<div class="chips" role="group" aria-label="Filter by category">' +
          '<button class="chip" data-filter="" aria-pressed="true">All<small>' + A.items.length + "</small></button>" +
          A.categories.map(function (c) {
            return '<button class="chip" data-filter="' + c.id + '" aria-pressed="false">' + esc(c.name) +
              "<small>" + A.items.filter(function (i) { return i.cat === c.id; }).length + "</small></button>";
          }).join("") +
        "</div>" +
        '<input class="cat-search" id="q" type="search" placeholder="Search the catalogue">' +
        '<div class="view-toggle" role="group" aria-label="View">' +
          '<button class="chip" data-view="grid" aria-pressed="true">Grid</button>' +
          '<button class="chip" data-view="table" aria-pressed="false">Table</button>' +
        "</div>" +
      "</div>" +
      '<div class="cat-sorts chips sorts" role="group" aria-label="Sort">' +
        '<button class="chip" data-sort="name" aria-pressed="true">Name</button>' +
        '<button class="chip" data-sort="price" aria-pressed="false">Price</button>' +
      "</div>" +
      '<p class="fine" id="count" style="margin:10px 0 0"></p>' +
      '<div id="catGrid" class="acards">' + cards + "</div>" +
      '<div id="catTable" hidden>' +
      '<table id="cat"><thead><tr><th class="sortable" data-sort="name" data-dir="asc">Item</th>' +
      '<th>Category</th><th class="n sortable" data-sort="price">Price</th></tr></thead>' +
      "<tbody>" + rows + "</tbody></table></div>" +
      '<p class="cat-empty" id="catEmpty" hidden>Nothing matches that.</p>' +
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
  const slot = function (id, label, blank) {
    return '<div class="vslot" id="' + id + '-slot" data-on="0">' +
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
              slot("opt", "Optic", "None") +
              slot("muz", "Muzzle", "None") +
              slot("grip", "Grip or bipod", "None") +
            "</div>" +
            /* The game builds a loaded magazine in front of you: pick the mag, pick the
               round, and it shows you what you end up with. The sum was always here, it
               was just written as a sentence under a dropdown. */
            '<div class="veq">' +
              '<div class="veq-step">' +
                '<span class="veq-note">Step 1 // magazine</span>' +
                slot("mag", "Magazine", "None") +
              "</div>" +
              '<span class="veq-op" aria-hidden="true">+</span>' +
              '<div class="veq-step">' +
                '<span class="veq-note">Step 2 // round</span>' +
                slot("ammo", "Ammunition", "None") +
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
            picker("w", "Primary weapon", byCat("weapons"), "No weapon") +
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

          '<div class="vend-panel" data-panel="items" hidden>' +
            '<p class="vend-head">Items</p>' +
            '<div class="vgrid">' +
              byCat("throwables").concat(byCat("medical")).concat(byCat("equipment"))
                .filter(function (i) { return i.price !== null; })
                .map(function (i) {
                  return '<button class="vcard" data-extra="' + esc(i.name) + '" data-price="' + i.price +
                    '" aria-pressed="false">' +
                    '<span class="vcard-tag">' + money(i.price) + "</span>" +
                    '<span class="vcard-art">' +
                    (i.icon ? '<img src="/game-icons/' + i.icon + '.png" alt="" width="52" height="52" loading="lazy">' : "") +
                    "</span>" +
                    '<span class="vcard-name">' + esc(i.name) + "</span></button>";
                }).join("") +
            "</div>" +
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
      'var SLOTS=["w","opt","muz","grip","mag","ammo","hel","arm","bag","vest"];' +
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
      '  n++;' +
      '  var li=document.createElement("li");' +
      '  var b=document.querySelector("[data-extra=\\""+k.replace(/"/g,"")+"\\"]");' +
      '  var im0=b&&b.querySelector("img");' +
      '  if(im0){var im=document.createElement("img");im.src=im0.src;im.alt="";' +
      '   im.width=26;im.height=26;li.appendChild(im);}' +
      '  var nm=document.createElement("span");nm.textContent=k;li.appendChild(nm);' +
      '  var pr=document.createElement("b");pr.textContent=money(extras[k]);' +
      '  li.appendChild(pr);ul.appendChild(li);});' +
      ' el("packcount").textContent=n?n+(n>1?" items":" item"):"Empty";}' +

      'function render(){' +
      ' var total=0,unknown=0,parts=[];' +
      ' SLOTS.forEach(function(id){' +
      '  if(id==="ammo")return;' +
      '  var c=chosen[id];if(!c)return;' +
      '  total+=+attr(c,"data-price")||0;if(attr(c,"data-unknown"))unknown++;});' +
      ' var a=ammoCost();total+=a.cost;' +
      ' Object.keys(extras).forEach(function(k){total+=extras[k];});' +
      ' el("total").textContent=money(total);' +
      ' el("ready").textContent=a.rounds?a.rounds+" rounds loaded, "+money(a.cost):"Nothing loaded";' +
      ' el("ready").setAttribute("data-on",a.rounds?"1":"0");' +
      ' if(a.rounds)parts.push(a.rounds+" rounds for "+money(a.cost));' +
      ' var ne=Object.keys(extras).length;' +
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
      '  setSlot(id,p);if(id==="w")filterAmmo();' +
      '  closePicker();render();return;}' +
      ' var x=t.closest("[data-extra]");' +
      ' if(x){var k=x.getAttribute("data-extra");' +
      '  if(extras[k]!==undefined){delete extras[k];x.setAttribute("aria-pressed","false");}' +
      '  else{extras[k]=+x.getAttribute("data-price");x.setAttribute("aria-pressed","true");}' +
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
      'filterAmmo();render();' +
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
