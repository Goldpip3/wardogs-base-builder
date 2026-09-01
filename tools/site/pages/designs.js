/* The community designs index, and a page per design.
   Body sits at column zero deliberately. Indenting it would add whitespace inside
   these template literals, and that whitespace is page content. */
module.exports = ctx => {
  const { catalog, byId, esc, page, write, withStats, designCard, ranked, tagPills,
          VOTE_API, COMMUNITY_SCRIPT } = ctx;

write("designs/index.html", page({
  title: "WARDOGS Base Designs, built and rated by players",
  desc: "Player-built WARDOGS FOB designs, ranked by vote. Every one opens straight in the planner, fully editable, with its real Build Supply cost and supply runs worked out.",
  canonical: "/designs/",
  body: `<section><div class="wrap">
  <span class="eyebrow">Community</span>
  <h1>Base designs</h1>
  <p class="lede">Builds submitted by players, ranked by whoever found them useful.
  Every one opens in the planner, fully editable.</p>

  <h2 class="display" id="community" style="margin-top:52px">From the community</h2>
  <p class="lede" style="font-size:17px">Published and being voted on. Narrow it to the map
  you are playing and what you need the base to stop, then open one in the planner, vote on
  it, or say something about it.</p>

  <div id="designList" style="margin-top:26px">
    ${withStats.length
      ? `<div class="grid design-grid">${ranked.map(designCard).join("")}</div>`
      : `<div class="empty">
          <h3>Nothing here yet</h3>
          <p>This list is built by players. Make something in the planner, save it, and
          send it up from your own designs below. The whole build travels inside the URL,
          so there is nothing to upload.</p>
        </div>`}
  </div>

  ${VOTE_API ? `
  <!-- Your own saved designs, under the published ones and clearly not among them. This
       used to be a paragraph telling you to go and do it in the planner: the planner still
       has that button, but coming back to a page of other people's work and being told your
       own is elsewhere is the wrong shape. Everything you have saved is here, and the one
       button on each card is the one that moves it into the list above.

       The block is rendered by the same script that draws the list above it, and it is the
       same one the account page uses. Two lists of your designs, written twice, would be
       the drift this codebase keeps getting caught by. -->
  <h2 class="display" id="yours" style="margin-top:72px">Your designs</h2>
  <p class="lede" style="font-size:17px">Saved from the planner and private to your account.
  Nobody sees one until you send it up, and you can take it down again afterwards.</p>
  <div id="mineList" style="margin-top:26px">Checking...</div>` : `
  <div class="note" style="margin-top:40px"><strong>Submissions are briefly closed.</strong>
  The service that stores designs is not answering, so the form is hidden rather than
  taking builds it would drop. Try again shortly.</div>`}
</div></section>${COMMUNITY_SCRIPT}`,
}));


for (const d of withStats) {
  const s = d.s;
  write(`designs/${d.slug}/index.html`, page({
    title: `${d.name}. WARDOGS base design`,
    desc: `${d.tagline} ${s.supplies} build supplies, ${s.pallets} pallets, ${s.hammer}.`,
    canonical: `/designs/${d.slug}/`,
    body: `<section><div class="wrap">
  <p style="font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:var(--dim)">
    <a href="/designs/">Designs</a> / ${esc(d.name)}</p>
  <h1>${esc(d.name)}</h1>
  <p class="lede">${esc(d.tagline)}</p>
  ${tagPills(d.tags)}
  <p style="margin:18px 0"><a class="btn" href="/planner/#d=${esc(d.code)}">Open in the planner</a></p>
  <div class="statbar">
    <div><b>${s.supplies.toLocaleString()}</b><span>build supplies</span></div>
    <div><b>${s.pallets}</b><span>pallets</span></div>
    <div><b>${s.truck}</b><span>truck trips</span></div>
    <div><b>${s.heli}</b><span>heli trips</span></div>
    <div><b>${s.pieces}</b><span>pieces</span></div>
  </div>
  <table>
    <tbody>
      <tr><td>Hammer needed</td><td class="n">${s.hammer}</td></tr>
      <tr><td>Vendor cash for supplies</td><td class="n">$${s.cash.toLocaleString()}</td></tr>
      <tr><td>Cost if bought as pallets</td><td class="n">$${s.palletCash.toLocaleString()}</td></tr>
      ${s.fobs ? `<tr><td>FOB item</td><td class="n">${s.fobs} × $${catalog.fob.vendorPrice.toLocaleString()}</td></tr>` : ""}
      ${s.resupply.length ? `<tr><td>Ongoing resupply</td><td class="n">${s.resupply.join(", ")}</td></tr>` : ""}
      ${s.cover ? `<tr><td>Cover above vaulting height</td><td class="n">${s.cover - s.vault} of ${s.cover}</td></tr>` : ""}
    </tbody>
  </table>
  <h2>Why it is built this way</h2>
  <p>${d.body}</p>
  <h2>What it is made of</h2>
  <table>
    <thead><tr><th>Buildable</th><th class="n">Qty</th><th class="n">Supplies</th></tr></thead>
    <tbody>${s.counts.map(([id, n]) => `<tr><td>${esc(byId[id].name)}</td>
      <td class="n">${n}</td><td class="n">${(n * byId[id].cost).toLocaleString()}</td></tr>`).join("")}
    </tbody>
  </table>
  <p><a class="btn" href="/planner/#d=${esc(d.code)}">Open in the planner</a></p>
</div></section>`,
  }));
}

};
