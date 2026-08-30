/* The front page.
   Body sits at column zero deliberately. Indenting it would add whitespace inside
   these template literals, and that whitespace is page content. */
module.exports = ctx => {
  const { catalog, esc, run, GUIDES, page, write, withStats, designCard, ranked, FORWARD_SHARED } = ctx;


// --- home ---
write("index.html", page({
  title: "WARDOGS Base Builder: plan your FOB before the match",
  desc: "Free WARDOGS base planner and buildable cost database. Lay out walls, gates and gun pits, see the Build Supply cost and supply runs, and browse designs built by other players.",
  canonical: "/",
  body: `${FORWARD_SHARED}
<section class="hero"><div class="wrap">
  <h1>Count the pallets<br>before you haul them</h1>
  <p class="lede">Lay the whole FOB out first, down to the last hesco block. You get the
  Build Supply total, what that is in pallets, and how many truck runs it takes to get
  there. ${catalog.logistics.suppliesPerPallet.toLocaleString()} supplies to a pallet, two
  pallets to a truck.</p>
  <div class="actions">
    <a class="btn primary" href="/planner/">Open the planner</a>
    <a class="btn" href="/designs/">Community designs</a>
  </div>
  <div class="hero-rule"></div>
</div></section>

<section><div class="wrap">
  <div class="section-head">
    <div><span class="eyebrow">Community</span><h2 class="display">Designs from players</h2></div>
    ${withStats.length ? `<a class="btn sm" href="/designs/">See all</a>` : ""}
  </div>
  ${withStats.length
    ? `<div class="grid">${ranked.slice(0, 6).map(designCard).join("")}</div>`
    : `<div class="empty">
        <h3>Nobody has submitted one yet</h3>
        <p>This list is built by players, not by me. Make something in the planner, hit
        Share, and paste the link on the designs page. The whole design travels inside the
        URL, so there is nothing to upload.</p>
        <a class="btn primary" href="/designs/">Submit the first design</a>
      </div>`}
</div></section>

<section><div class="wrap">
  <span class="eyebrow">The tool</span>
  <h2 class="display">What the planner does</h2>
  <div class="grid" style="margin-top:14px">
    <div class="card"><h3>Every buildable, real costs</h3><p>All ${catalog.buildables.length}
      structures from the Large Hammer, with Build Supply costs read from the in-game radial menu.</p></div>
    <div class="card"><h3>Drag to lay a wall</h3><p>Pieces sit edge to edge with a live count
      and cost as you drag, so a perimeter takes seconds.</p></div>
    <div class="card"><h3>Build upwards</h3><p>Drop a CIWS onto a Hesco platform and it stacks
      automatically. Lower storeys stay visible underneath.</p></div>
    <div class="card"><h3>Know the supply run</h3><p>Total supplies, pallets, and how many truck
      or helicopter trips that actually is.</p></div>
    <div class="card"><h3>Catches mistakes</h3><p>Anything outside the build zone, overlaps,
      gates off the ground, weapons with no sky, pieces floating with nothing under them.</p></div>
    <div class="card"><h3>Share a design as a link</h3><p>The whole layout travels in the URL.
      Post it and it opens ready to inspect. no account, nothing to install.</p></div>
  </div>
</div></section>

<section><div class="wrap">
  <span class="eyebrow">Reference</span>
  <h2 class="display">Guides</h2>
  <div class="grid" style="margin-top:14px">
    ${GUIDES.map(g => `<a class="card" href="/guides/${g.slug}/"><h3>${esc(g.title)}</h3>
      <p>${esc(g.blurb)}</p></a>`).join("")}
  </div>
</div></section>`,
}));

// --- buildables reference ---
};
