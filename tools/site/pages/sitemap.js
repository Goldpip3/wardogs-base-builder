/* sitemap.xml, robots.txt and ads.txt.
   Body sits at column zero deliberately. Indenting it would add whitespace inside
   these template literals, and that whitespace is page content. */
module.exports = ctx => {
  const { fs, path, DOCS, SITE, ADS, adsOn, GUIDES, page, write, written, withStats } = ctx;

const urls = ctx.urls = ["/", "/planner/", "/designs/", "/buildables/", "/armory/", "/ballistics/", "/artillery/", "/loadouts/", "/vehicles/", "/guides/", "/feedback/", "/privacy/"]
  .concat(withStats.map(d => `/designs/${d.slug}/`))
  .concat(GUIDES.map(g => `/guides/${g.slug}/`));
write("sitemap.xml",
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  urls.map(u => `  <url><loc>${SITE}${u}</loc></url>`).join("\n") + `\n</urlset>\n`);
write("robots.txt", `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);

/* ads.txt tells ad exchanges which publisher is allowed to sell this domain's inventory.
   Without it a lot of buyers will not bid, and AdSense flags the site. It is only written
   once there is a publisher id to claim - an ads.txt naming nobody is worse than none. */
if (adsOn) {
  const pub = ADS.publisherId.replace(/^ca-/, "");
  write("ads.txt", `google.com, ${pub}, DIRECT, f08c47fec0942fa0\n`);
} else {
  // Turning ads off has to actually remove the claim. A leftover ads.txt keeps telling
  // every exchange that a publisher may sell this domain long after that stopped being
  // true, and nothing on the page would show it.
  const stale = path.join(DOCS, "ads.txt");
  if (fs.existsSync(stale)) { fs.rmSync(stale); console.log("  removed stale ads.txt"); }
}
};
