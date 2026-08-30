/* The guides index, and a page per guide.
   Body sits at column zero deliberately. Indenting it would add whitespace inside
   these template literals, and that whitespace is page content. */
module.exports = ctx => {
  const { esc, GUIDES, page, write } = ctx;

write("guides/index.html", page({
  title: "WARDOGS Building Guides",
  desc: "Guides to building in WARDOGS: FOB placement and build order, build costs and supply runs, anti-climb walls, and which hammer to carry.",
  canonical: "/guides/",
  body: `<section><div class="wrap">
  <h1>WARDOGS building guides</h1>
  <p class="lede">What actually works, from closed beta footage and play testing.</p>
  <div class="grid" style="margin-top:20px">${GUIDES.map(g =>
    `<a class="card" href="/guides/${g.slug}/"><h3>${esc(g.title)}</h3><p>${esc(g.blurb)}</p></a>`).join("")}</div>
</div></section>`,
}));

for (const g of GUIDES) {
  write(`guides/${g.slug}/index.html`, page({
    title: g.title,
    desc: g.blurb,
    canonical: `/guides/${g.slug}/`,
    body: `<section><div class="wrap" style="max-width:760px">
  <p style="font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:var(--dim)">
    <a href="/guides/">Guides</a></p>
  <h1>${esc(g.title)}</h1>
  <p class="lede">${esc(g.blurb)}</p>
  ${g.body}
  <p style="margin-top:28px"><a class="btn" href="/planner/">Open the planner</a></p>
</div></section>`,
  }));
}

};
