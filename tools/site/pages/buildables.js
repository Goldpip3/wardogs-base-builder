/* The buildable catalogue: costs, sizes and what stacks on what.
   Body sits at column zero deliberately. Indenting it would add whitespace inside
   these template literals, and that whitespace is page content. */
module.exports = ctx => {
  const { catalog, esc, adSlot, page, write } = ctx;

const TIER_ORDER = { small: 1, medium: 2, large: 3 };
const rows = catalog.buildables.slice().sort((a, b) =>
  (TIER_ORDER[a.tier] - TIER_ORDER[b.tier]) || a.name.localeCompare(b.name));
const ROLE_LABEL = {
  cover: "Walls & cover", entry: "Entryways", offense: "Offensive", antiair: "Anti-air",
  antivehicle: "Anti-vehicle",
  denial: "Area denial", support: "Support", objective: "Objective",
};

/* These were base64 in the markup, on the theory that a row and its picture should arrive
   together. Twenty of them is 585 KB of art, which made this the second heaviest page on
   the site behind the planner, and the default view showed none of it: the icons only
   appeared if you switched to Grid. They are files under /build-icons/ now, lazily loaded
   the way the armory loads its 331, so the page carries the art it actually paints.
   build.ps1 copies the folder; check-build.js holds every reference against it. */
const iconSrc = b => (b.icon ? "/build-icons/" + b.icon : "");

/* One set of attributes for the card and the row, so the filter and the sort read the same
   values whichever view is showing and switching view never reshuffles the list. */
const attrs = b => ` data-role="${b.role}" data-name="${esc(b.name.toLowerCase())}"` +
  ` data-desc="${esc((b.desc || "").toLowerCase())}" data-cost="${b.cost}"` +
  ` data-tier="${TIER_ORDER[b.tier] || 0}"` +
  ` data-size="${b.footprint.w * b.footprint.d * b.height}"`;

const roleCounts = {};
for (const b of catalog.buildables) roleCounts[b.role] = (roleCounts[b.role] || 0) + 1;

write("buildables/index.html", page({
  title: `WARDOGS Buildables: All ${catalog.buildables.length} Structures and Build Supply Costs`,
  desc: `Every WARDOGS buildable with its Build Supply cost, size, height and hammer tier. Filter by what it is for, search by name, sort by cost. Hesco, Bremer walls, gates, bunkers, mortars, AA and the Stingray.`,
  canonical: "/buildables/",
  body: `<section><div class="wrap">
  <span class="eyebrow">Reference</span>
  <h1>Buildables</h1>
  <p class="lede">Every structure you can build, what it costs in Build Supplies, and which
  hammer you need. Sizes are in Hesco blocks, and one block is about 1.2 m.</p>

  ${/* Eight purposes were eight filled chips in a full width band, with the chosen one a
        solid yellow slab, above a second band holding one small search box and a third
        holding two view buttons: three stripes across the page, all different heights,
        each trailing dead space off its right. The armory hit the same wall at ten
        categories and answered it with a rail, so this is that answer, not a second one.
        Purposes read down one column with their counts aligned, and the search, the view
        and the sort sit on two lines beside the list they act on. */""}
  <div class="cat-layout">
    <nav class="cat-rail" aria-label="Filter by purpose">
      <button class="rail-item" data-filter="" aria-pressed="true">
        <span>All</span><b>${catalog.buildables.length}</b></button>
      ${Object.keys(ROLE_LABEL).filter(r => roleCounts[r]).map(r =>
        `<button class="rail-item" data-filter="${r}" aria-pressed="false">
        <span>${ROLE_LABEL[r]}</span><b>${roleCounts[r]}</b></button>`).join("")}
    </nav>
    <div class="cat-main">
      <div class="cat-top">
        <input class="cat-search" id="q" type="search" placeholder="Search name or description">
        <div class="view-toggle" role="group" aria-label="View">
          <button class="chip" data-view="grid" aria-pressed="true">Grid</button>
          <button class="chip" data-view="table" aria-pressed="false">Table</button>
        </div>
      </div>
      <div class="cat-meta">
        <p class="fine" id="count"></p>
        <div class="cat-sorts" role="group" aria-label="Sort">
          <span>Sort</span>
          <button data-sort="name" aria-pressed="true">Name</button>
          <button data-sort="cost" aria-pressed="false">Supplies</button>
          <button data-sort="size" aria-pressed="false">Size</button>
        </div>
      </div>

      ${/* The grid leads because every buildable has its art and a picture is how you
            recognise a thing you have seen in game. The table stays because a column of
            costs is how you compare twenty of them. Same elements, same attributes, one
            filter and one sort driving both. */""}
      <div id="catGrid" class="cat-grid">
        ${rows.map(b => `<div class="cat-card"${attrs(b)}>
          ${iconSrc(b) ? `<img src="${iconSrc(b)}" alt="" width="52" height="52" loading="lazy" decoding="async">` : ""}
          <div>
            <h3>${esc(b.name)}</h3>
            <div class="facts"><span>cost</span>${b.cost} <span>size</span>${b.footprint.w}&times;${b.footprint.d}&times;${b.height}
              <span>hammer</span>${b.tier}</div>
            <p>${b.requiresFob === false ? "<strong>No FOB needed.</strong> " : ""}${esc((b.desc || "").split(".")[0])}.</p>
          </div>
        </div>`).join("")}
      </div>

      <div id="catTable" class="cat-tablebox" hidden>
      <table>
        <thead><tr>
          <th class="sortable" data-sort="name" data-dir="asc">Buildable</th>
          <th class="sortable" data-sort="tier">Hammer</th>
          <th class="n sortable" data-sort="cost">Supplies</th>
          <th class="n sortable" data-sort="size">W&times;D&times;H</th>
          <th>What it is for</th>
        </tr></thead>
        <tbody>${rows.map(b => `<tr${attrs(b)}>
          <td><strong>${esc(b.name)}</strong></td>
          <td><span class="tag">${b.tier}</span></td>
          <td class="n">${b.cost}</td>
          <td class="n">${b.footprint.w}&times;${b.footprint.d}&times;${b.height}</td>
          <td>${b.requiresFob === false ? "<strong>No FOB needed.</strong> " : ""}${esc((b.desc || "").split(".")[0])}.</td>
        </tr>`).join("")}</tbody>
      </table>
      </div>
      <p class="cat-empty" id="catEmpty" hidden>Nothing matches that.</p>
    </div>
  </div>

  <div class="note"><strong>Where these numbers come from.</strong>
  BULKHEAD has not published a build table, so every cost and size here was read frame by
  frame from the in-game radial menu and checked in play testing. You can correct any of
  them yourself inside the planner and the change sticks for every piece of that type. If
  you spot one that is off, <a href="/feedback/">say so</a> and it gets fixed for everyone.</div>

  ${adSlot("inArticle")}

  <h2>How supplies actually move</h2>
  <p>Structures draw <strong>Build Supplies</strong> from the FOB, not from your pocket. A
  Build Supply Pallet holds ${catalog.logistics.suppliesPerPallet.toLocaleString()} and costs
  ${catalog.logistics.palletCash ? "$" + catalog.logistics.palletCash : "about $400"}. A truck carries
  ${catalog.logistics.vehicles[0].pallets} pallets a trip, a helicopter
  ${catalog.logistics.vehicles[1].pallets}. A fresh FOB lands with
  ${catalog.fob.startingSupplies.toLocaleString()} already inside, so only what a design costs
  beyond that has to be driven in. The planner turns any design into pallets and trips
  for you.</p>
  <p><a class="btn" href="/planner/">Open the planner</a></p>
</div></section>
<script>
(function(){
  var role="", q="", sortKey="name", sortDir=1;
  var tblBox=document.getElementById("catTable"), grid=document.getElementById("catGrid");
  var tb=tblBox.querySelector("tbody"), empty=document.getElementById("catEmpty");
  var count=document.getElementById("count");
  var rows=[].slice.call(tb.querySelectorAll("tr"));
  var cards=[].slice.call(grid.querySelectorAll(".cat-card"));

  function matches(el){
    if(role && el.getAttribute("data-role")!==role) return false;
    if(!q) return true;
    return el.getAttribute("data-name").indexOf(q)>=0
        || el.getAttribute("data-desc").indexOf(q)>=0;
  }
  /* Name compares as text and the rest as numbers. Sorting a cost of 100 against one of 61
     as strings put 100 first, which is the sort of wrong that looks right until you read it. */
  function cmp(a,b){
    if(sortKey==="name")
      return a.getAttribute("data-name").localeCompare(b.getAttribute("data-name"))*sortDir;
    return (+a.getAttribute("data-"+sortKey) - +b.getAttribute("data-"+sortKey))*sortDir;
  }
  function apply(){
    [rows,cards].forEach(function(set){
      set.forEach(function(el){ el.hidden=!matches(el); });
    });
    var shown=rows.filter(matches).length;
    // sort both views the same way so switching does not reshuffle
    [[rows,tb],[cards,grid]].forEach(function(pair){
      pair[0].slice().sort(cmp).forEach(function(el){ pair[1].appendChild(el); });
    });
    empty.hidden=shown>0;
    count.textContent=shown===rows.length
      ? shown+" buildables"
      : shown+" of "+rows.length+" buildables";
  }
  function press(sel,on){
    [].forEach.call(document.querySelectorAll(sel),function(b){
      b.setAttribute("aria-pressed",b===on?"true":"false");
    });
  }
  /* The sort tabs and the table headers are two controls over one order, so each drives the
     same state and repaints the other. They fell out of step when they kept their own. */
  function setSort(key){
    sortDir=(key===sortKey)?-sortDir:1; sortKey=key;
    var dir=sortDir>0?"asc":"desc";
    /* Clear every arrow before setting one. Leaving the old control marked put two arrows
       on the page pointing different ways, only one of which was the order you were in. */
    [].forEach.call(document.querySelectorAll(".cat-sorts [data-sort],th.sortable"),
      function(o){ o.removeAttribute("data-dir"); });
    var tab=document.querySelector('.cat-sorts [data-sort="'+key+'"]');
    press(".cat-sorts [data-sort]",tab);
    if(tab) tab.setAttribute("data-dir",dir);
    var th=document.querySelector('th.sortable[data-sort="'+key+'"]');
    if(th) th.setAttribute("data-dir",dir);
    apply();
  }

  document.addEventListener("click",function(e){
    var t=e.target; if(!t||!t.closest) return;
    var f=t.closest("[data-filter]");
    if(f){ role=f.getAttribute("data-filter"); press("[data-filter]",f); apply(); return; }
    var v=t.closest("[data-view]");
    if(v){ var want=v.getAttribute("data-view"); press("[data-view]",v);
      grid.hidden=want!=="grid"; tblBox.hidden=want!=="table"; return; }
    var s=t.closest(".cat-sorts [data-sort]");
    if(s){ setSort(s.getAttribute("data-sort")); return; }
    var th=t.closest("th.sortable");
    if(th){ setSort(th.getAttribute("data-sort")); return; }
  });
  document.getElementById("q").addEventListener("input",function(e){
    q=e.target.value.trim().toLowerCase(); apply();
  });
  apply();
})();
</script>`,
}));


// --- designs index + detail pages ---
};
