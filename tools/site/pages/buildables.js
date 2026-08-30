/* The buildable catalogue: costs, sizes and what stacks on what.
   Body sits at column zero deliberately. Indenting it would add whitespace inside
   these template literals, and that whitespace is page content. */
module.exports = ctx => {
  const { fs, path, ROOT, catalog, esc, adSlot, page, write } = ctx;

const TIER_ORDER = { small: 1, medium: 2, large: 3 };
const rows = catalog.buildables.slice().sort((a, b) =>
  (TIER_ORDER[a.tier] - TIER_ORDER[b.tier]) || a.name.localeCompare(b.name));
const ROLE_LABEL = {
  cover: "Walls & cover", entry: "Entryways", offense: "Offensive", antiair: "Anti-air",
  denial: "Area denial", support: "Support", objective: "Objective",
};

/* Icons are inlined so a row and its picture arrive together; there are twenty of them
   and they are a couple of KB each. */
const iconData = {};
for (const b of catalog.buildables) {
  const f = path.join(ROOT, "assets/icons", b.icon || "");
  if (b.icon && fs.existsSync(f)) {
    const mime = b.icon.endsWith(".webp") ? "image/webp" : "image/svg+xml";
    iconData[b.id] = "data:" + mime + ";base64," + fs.readFileSync(f).toString("base64");
  }
}

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

  <div class="cat-bar">
    <div class="chips" role="group" aria-label="Filter by purpose">
      <button class="chip" data-role="" aria-pressed="true">All <small>${catalog.buildables.length}</small></button>
      ${Object.keys(ROLE_LABEL).filter(r => roleCounts[r]).map(r =>
        `<button class="chip" data-role="${r}" aria-pressed="false">${ROLE_LABEL[r]} <small>${roleCounts[r]}</small></button>`).join("")}
    </div>
    <input class="cat-search" id="catSearch" type="search" placeholder="Search name or description...">
    <div class="view-toggle">
      <button class="chip" data-view="table" aria-pressed="true">Table</button>
      <button class="chip" data-view="grid" aria-pressed="false">Grid</button>
    </div>
  </div>
  <div class="cat-count" id="catCount"></div>

  <div id="catTable">
  <table>
    <thead><tr>
      <th class="sortable" data-sort="name" data-dir="asc">Buildable</th>
      <th class="sortable" data-sort="tier">Hammer</th>
      <th class="n sortable" data-sort="cost">Supplies</th>
      <th class="n sortable" data-sort="size">W&times;D&times;H</th>
      <th>What it is for</th>
    </tr></thead>
    <tbody>${rows.map(b => `<tr data-role="${b.role}" data-name="${esc(b.name.toLowerCase())}"
        data-desc="${esc((b.desc || "").toLowerCase())}"
        data-cost="${b.cost}" data-tier="${TIER_ORDER[b.tier] || 0}"
        data-size="${b.footprint.w * b.footprint.d * b.height}">
      <td><strong>${esc(b.name)}</strong></td>
      <td><span class="tag">${b.tier}</span></td>
      <td class="n">${b.cost}</td>
      <td class="n">${b.footprint.w}&times;${b.footprint.d}&times;${b.height}</td>
      <td>${b.requiresFob === false ? "<strong>No FOB needed.</strong> " : ""}${esc((b.desc || "").split(".")[0])}.</td>
    </tr>`).join("")}</tbody>
  </table>
  </div>

  <div id="catGrid" class="cat-grid" style="display:none">
    ${rows.map(b => `<div class="cat-card" data-role="${b.role}" data-name="${esc(b.name.toLowerCase())}"
        data-desc="${esc((b.desc || "").toLowerCase())}"
        data-cost="${b.cost}" data-tier="${TIER_ORDER[b.tier] || 0}"
        data-size="${b.footprint.w * b.footprint.d * b.height}">
      ${iconData[b.id] ? `<img src="${iconData[b.id]}" alt="">` : ""}
      <div>
        <h3>${esc(b.name)}</h3>
        <div class="facts"><span>cost</span>${b.cost} <span>size</span>${b.footprint.w}&times;${b.footprint.d}&times;${b.height}
          <span>hammer</span>${b.tier}</div>
        <p>${b.requiresFob === false ? "<strong>No FOB needed.</strong> " : ""}${esc((b.desc || "").split(".")[0])}.</p>
      </div>
    </div>`).join("")}
  </div>
  <div class="cat-empty" id="catEmpty" style="display:none">Nothing matches that.</div>

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
  var table=document.getElementById("catTable"), grid=document.getElementById("catGrid");
  var empty=document.getElementById("catEmpty"), count=document.getElementById("catCount");
  var rows=[].slice.call(table.querySelectorAll("tbody tr"));
  var cards=[].slice.call(grid.querySelectorAll(".cat-card"));

  function matches(el){
    if(role && el.dataset.role!==role) return false;
    if(!q) return true;
    return el.dataset.name.indexOf(q)>=0 || el.dataset.desc.indexOf(q)>=0;
  }
  function keyOf(el){
    return sortKey==="name" ? el.dataset.name : +el.dataset[sortKey];
  }
  function apply(){
    var shown=0;
    [rows,cards].forEach(function(set){
      set.forEach(function(el){
        var ok=matches(el);
        el.style.display=ok?"":"none";
      });
    });
    shown=rows.filter(matches).length;
    // sort both views the same way so switching does not reshuffle
    [[rows,table.querySelector("tbody")],[cards,grid]].forEach(function(pair){
      pair[0].slice().sort(function(a,b){
        var x=keyOf(a), y=keyOf(b);
        return (x<y?-1:x>y?1:0)*sortDir;
      }).forEach(function(el){ pair[1].appendChild(el); });
    });
    empty.style.display=shown?"none":"";
    count.textContent=shown===rows.length
      ? shown+" buildables"
      : shown+" of "+rows.length+" buildables";
  }

  document.querySelectorAll(".chip[data-role]").forEach(function(c){
    c.addEventListener("click",function(){
      document.querySelectorAll(".chip[data-role]").forEach(function(o){o.setAttribute("aria-pressed","false")});
      c.setAttribute("aria-pressed","true");
      role=c.dataset.role; apply();
    });
  });
  document.querySelectorAll(".chip[data-view]").forEach(function(c){
    c.addEventListener("click",function(){
      document.querySelectorAll(".chip[data-view]").forEach(function(o){o.setAttribute("aria-pressed","false")});
      c.setAttribute("aria-pressed","true");
      var g=c.dataset.view==="grid";
      grid.style.display=g?"":"none";
      table.style.display=g?"none":"";
    });
  });
  document.getElementById("catSearch").addEventListener("input",function(e){
    q=e.target.value.trim().toLowerCase(); apply();
  });
  table.querySelectorAll("th.sortable").forEach(function(th){
    th.addEventListener("click",function(){
      if(sortKey===th.dataset.sort){ sortDir=-sortDir; }
      else { sortKey=th.dataset.sort; sortDir=1; }
      table.querySelectorAll("th.sortable").forEach(function(o){o.removeAttribute("data-dir")});
      th.setAttribute("data-dir",sortDir>0?"asc":"desc");
      apply();
    });
  });
  apply();
})();
</script>`,
}));


// --- designs index + detail pages ---
};
