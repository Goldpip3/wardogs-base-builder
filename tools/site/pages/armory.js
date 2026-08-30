/* The item catalogue, the loadout calculator and the vehicle list.
   Body sits at column zero deliberately. Indenting it would add whitespace inside
   these template literals, and that whitespace is page content. */
module.exports = ctx => {
  const { esc, ARMORY, page, write } = ctx;

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

  /* ---------- armory: browse the lot ---------- */
  const rows = withSlots.map(function (it) {
    return '<tr data-cat="' + it.cat + '" data-name="' + esc(it.name.toLowerCase()) +
      '" data-price="' + (it.price === null ? -1 : it.price) + '">' +
      "<td><b>" + esc(it.name) + "</b></td>" +
      "<td>" + esc((A.categories.find(function (c) { return c.id === it.cat; }) || {}).name || it.cat) +
        (it.slot && it.slot !== "other" ? ' <span class="fine">' + it.slot + "</span>" : "") + "</td>" +
      '<td class="n">' + priceCell(it) + "</td></tr>";
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
      '<div class="chips" style="margin-top:26px">' +
        '<button class="chip" data-cat="" aria-pressed="true">All<small>' + A.items.length + "</small></button>" +
        A.categories.map(function (c) {
          return '<button class="chip" data-cat="' + c.id + '" aria-pressed="false">' + esc(c.name) +
            "<small>" + A.items.filter(function (i) { return i.cat === c.id; }).length + "</small></button>";
        }).join("") +
      "</div>" +
      '<p style="margin:16px 0 0"><input id="q" type="search" placeholder="Search the catalogue" ' +
      'style="width:100%;max-width:420px;padding:10px 12px;background:var(--panel);color:var(--text);' +
      'border:1px solid var(--line);font-family:var(--ui)"></p>' +
      '<p class="fine" id="count" style="margin:10px 0 0"></p>' +
      '<table id="cat"><thead><tr><th class="sortable" data-sort="name" data-dir="asc">Item</th>' +
      '<th>Category</th><th class="n sortable" data-sort="price">Price</th></tr></thead>' +
      "<tbody>" + rows + "</tbody></table>" +
      '<p style="margin-top:34px"><a class="btn primary" href="/ballistics/">Damage calculator</a> ' +
      '<a class="btn" href="/loadouts/">Price up a loadout</a></p>' +
      "</div></section>" +
      '<script>(function(){' +
      'var tb=document.querySelector("#cat tbody");' +
      'var all=Array.prototype.slice.call(tb.querySelectorAll("tr"));' +
      'var cat="",q="",sort="name",dir=1;' +
      'function apply(){' +
      ' var shown=0;' +
      ' all.forEach(function(tr){' +
      '  var okc=!cat||tr.getAttribute("data-cat")===cat;' +
      '  var okq=!q||tr.getAttribute("data-name").indexOf(q)>=0;' +
      '  tr.style.display=(okc&&okq)?"":"none";if(okc&&okq)shown++;});' +
      /* Category and search are an AND, so a search that looks like it should hit can come
         back empty because a category is still on. Say which, rather than leaving a bare
         zero on screen. */
      ' var msg=shown+" of "+all.length+" items";' +
      ' if(!shown&&cat&&q)msg+=". Nothing in that category matches that search.";' +
      ' document.getElementById("count").textContent=msg;}' +
      'function resort(){' +
      ' var rows=all.slice().sort(function(a,b){' +
      '  if(sort==="price"){' +
      '   var pa=+a.getAttribute("data-price"),pb=+b.getAttribute("data-price");' +
      /* an unconfirmed price sorts to the bottom whichever way the column is pointing,
         because "we do not know" is not a small number */
      '   if(pa<0&&pb<0)return 0;if(pa<0)return 1;if(pb<0)return -1;' +
      '   return (pa-pb)*dir;}' +
      '  return a.getAttribute("data-name").localeCompare(b.getAttribute("data-name"))*dir;});' +
      ' rows.forEach(function(r){tb.appendChild(r);});}' +
      'Array.prototype.forEach.call(document.querySelectorAll("[data-cat]"),function(b){' +
      ' if(b.tagName!=="BUTTON")return;' +
      ' b.addEventListener("click",function(){' +
      '  Array.prototype.forEach.call(document.querySelectorAll("button[data-cat]"),function(o){' +
      '   o.setAttribute("aria-pressed",o===b?"true":"false");});' +
      '  cat=b.getAttribute("data-cat");apply();});});' +
      'document.getElementById("q").addEventListener("input",function(e){' +
      ' q=e.target.value.toLowerCase().trim();apply();});' +
      'Array.prototype.forEach.call(document.querySelectorAll("th.sortable"),function(th){' +
      ' th.addEventListener("click",function(){' +
      '  var s=th.getAttribute("data-sort");' +
      '  dir=(s===sort)?-dir:1;sort=s;' +
      '  Array.prototype.forEach.call(document.querySelectorAll("th.sortable"),function(o){' +
      '   o.removeAttribute("data-dir");});' +
      '  th.setAttribute("data-dir",dir>0?"asc":"desc");' +
      '  resort();});});' +
      'apply();' +
      '}());<\/script>',
  }));

  /* ---------- loadouts: what one death costs ---------- */
  const opts = function (list, blank) {
    return '<option value="">' + blank + "</option>" + list.map(function (it) {
      return '<option value="' + esc(it.name) + '" data-price="' + (it.price === null ? 0 : it.price) +
        '"' + (it.price === null ? " data-unknown=1" : "") + ">" + esc(it.name) +
        (it.price === null ? " (price unknown)" : it.price === 0 ? " (free)" : " " + money(it.price)) +
        "</option>";
    }).join("");
  };
  const byCat = function (id) { return withSlots.filter(function (i) { return i.cat === id; }); };
  const attSlot = function (s) {
    return byCat("attachments").filter(function (i) { return i.slot === s; });
  };
  const nameHas = function (list, s) {
    return list.filter(function (i) { return i.name.toLowerCase().indexOf(s) >= 0; });
  };

  const slot = function (id, label, list, blank) {
    return '<p style="margin:0 0 14px"><label class="fine" style="display:block;margin-bottom:4px">' +
      esc(label) + "</label>" +
      '<select id="' + id + '" style="width:100%;max-width:460px">' + opts(list, blank) + "</select></p>";
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
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:0 34px;margin-top:30px">' +
      "<div>" +
      slot("w", "Weapon", byCat("weapons"), "No weapon") +
      slot("mag", "Magazine", attSlot("magazine"), "None") +
      slot("opt", "Optic", attSlot("optic"), "None") +
      slot("muz", "Muzzle", attSlot("muzzle"), "None") +
      slot("grip", "Grip or bipod", attSlot("grip"), "None") +
      "</div><div>" +
      slot("hel", "Helmet", nameHas(byCat("armour"), "helmet").concat(nameHas(byCat("armour"), "headwear")), "Bare head") +
      slot("arm", "Body armour", byCat("armour").filter(function (i) {
        const n = i.name.toLowerCase();
        return n.indexOf("helmet") < 0 && n.indexOf("headwear") < 0;
      }), "No armour") +
      slot("bag", "Backpack", nameHas(byCat("storage"), "backpack"), "None") +
      slot("vest", "Rig", nameHas(byCat("storage"), "tac vest").concat(nameHas(byCat("storage"), "pouch")), "None") +
      '<p style="margin:0 0 14px"><label class="fine" style="display:block;margin-bottom:4px">Ammunition</label>' +
      '<select id="ammo" style="width:100%;max-width:340px"></select> ' +
      '<label class="fine">&times; <input id="mags" type="number" min="0" max="20" value="3" ' +
      'style="width:64px;padding:6px;background:var(--panel);color:var(--text);border:1px solid var(--line)"> ' +
      "magazines</label></p>" +
      "</div></div>" +

      '<h2 style="margin-top:34px">Extras</h2>' +
      '<div class="chips" style="margin-top:10px">' +
        byCat("throwables").concat(byCat("medical")).concat(byCat("equipment"))
          .filter(function (i) { return i.price !== null; })
          .map(function (i) {
            return '<button class="chip" data-extra="' + esc(i.name) + '" data-price="' + i.price +
              '" aria-pressed="false">' + esc(i.name) + "<small>" + money(i.price) + "</small></button>";
          }).join("") +
      "</div>" +

      '<div class="empty" style="margin-top:40px;text-align:left">' +
        '<h3 style="margin:0">Cost per life</h3>' +
        '<p id="total" style="font-family:var(--display);font-size:44px;line-height:1;margin:10px 0 6px;' +
        'color:var(--red-hot)">$0</p>' +
        '<p class="fine" id="breakdown" style="margin:0"></p>' +
        '<p class="fine" id="warn" style="margin:10px 0 0"></p>' +
      "</div>" +
      '<p style="margin-top:34px"><a class="btn" href="/armory/">Browse the armory</a> ' +
      '<a class="btn" href="/ballistics/">Check what it kills</a></p>' +
      "</div></section>" +

      '<script>(function(){' +
      'var AMMO=' + JSON.stringify(byCat("ammunition").map(function (i) {
        return { name: i.name, price: i.price, per: i.per };
      })) + ';' +
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
      'var sel=["w","mag","opt","muz","grip","hel","arm","bag","vest"];' +
      'var extras={};' +
      'function el(id){return document.getElementById(id);}' +
      'function priceOf(id){' +
      ' var s=el(id),o=s.options[s.selectedIndex];' +
      ' if(!o||!o.value)return {p:0,unknown:false};' +
      ' return {p:+o.getAttribute("data-price")||0,unknown:!!o.getAttribute("data-unknown")};}' +
      'function fillAmmo(){' +
      ' var w=el("w").value,cal=CAL[w],s=el("ammo"),keep=s.value;' +
      ' var list=AMMO.filter(function(a){' +
      '  return a.price!==null&&(!cal||a.name.indexOf(cal)===0);});' +
      ' if(!list.length)list=AMMO.filter(function(a){return a.price!==null;});' +
      /* Built with DOM calls rather than an innerHTML string. Option markup needs a quote
         inside a quote inside a quote by the time it has crossed this file's template
         literal, and that is exactly the nesting that has shipped broken twice. */
      ' s.textContent="";' +
      ' var none=document.createElement("option");' +
      ' none.value="";none.textContent="None";s.appendChild(none);' +
      ' list.forEach(function(a){' +
      '  var o=document.createElement("option");' +
      '  o.value=a.name;' +
      '  o.setAttribute("data-price",a.price);' +
      '  o.setAttribute("data-per",a.per);' +
      '  o.textContent=a.name+" $"+a.price+" / "+a.per;' +
      '  s.appendChild(o);});' +
      ' if(keep)s.value=keep;}' +
      'function ammoCost(){' +
      ' var s=el("ammo"),o=s.options[s.selectedIndex];' +
      ' if(!o||!o.value)return {cost:0,rounds:0};' +
      ' var per=+o.getAttribute("data-per")||1,price=+o.getAttribute("data-price")||0;' +
      ' var size=MAGSIZE[el("mag").value]||30;' +
      ' var rounds=size*(+el("mags").value||0);' +
      /* You buy rounds in packs, so a part pack still costs a whole one. */
      ' return {cost:Math.ceil(rounds/per)*price,rounds:rounds};}' +
      'function render(){' +
      ' var total=0,unknown=0,parts=[];' +
      ' sel.forEach(function(id){var r=priceOf(id);total+=r.p;if(r.unknown)unknown++;});' +
      ' var a=ammoCost();total+=a.cost;' +
      ' Object.keys(extras).forEach(function(k){total+=extras[k];});' +
      ' el("total").textContent="$"+total.toLocaleString("en-US");' +
      ' if(a.rounds)parts.push(a.rounds+" rounds for $"+a.cost.toLocaleString("en-US"));' +
      ' var ne=Object.keys(extras).length;' +
      ' if(ne)parts.push(ne+" extra"+(ne>1?"s":""));' +
      ' el("breakdown").textContent=parts.join(" \u00b7 ");' +
      ' el("warn").textContent=unknown?' +
      '  unknown+" item"+(unknown>1?"s have":" has")+" no confirmed price yet and counts as zero."' +
      '  :"";}' +
      'sel.forEach(function(id){el(id).addEventListener("change",function(){' +
      ' if(id==="w")fillAmmo();render();});});' +
      'el("ammo").addEventListener("change",render);' +
      'el("mags").addEventListener("input",render);' +
      'Array.prototype.forEach.call(document.querySelectorAll("[data-extra]"),function(b){' +
      ' b.addEventListener("click",function(){' +
      '  var k=b.getAttribute("data-extra");' +
      '  if(extras[k]!==undefined){delete extras[k];b.setAttribute("aria-pressed","false");}' +
      '  else{extras[k]=+b.getAttribute("data-price");b.setAttribute("aria-pressed","true");}' +
      '  render();});});' +
      'fillAmmo();render();' +
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
