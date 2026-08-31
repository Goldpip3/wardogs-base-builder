/* sitemap.xml, robots.txt and ads.txt.
   Body sits at column zero deliberately. Indenting it would add whitespace inside
   these template literals, and that whitespace is page content. */
module.exports = ctx => {
  const { fs, path, DOCS, SITE, ADS, adsOn, page, write, written, withStats } = ctx;

const urls = ctx.urls = ["/", "/planner/", "/designs/", "/buildables/", "/armory/", "/ballistics/", "/artillery/", "/loadouts/", "/feedback/", "/privacy/"]
  .concat(withStats.map(d => `/designs/${d.slug}/`));
write("sitemap.xml",
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  urls.map(u => `  <url><loc>${SITE}${u}</loc></url>`).join("\n") + `\n</urlset>\n`);
/* robots.txt, and what it is honestly worth.
   This is a request, not a control. Every crawler named below can ignore the whole file, and
   the ones worth worrying about do. Nothing here protects the icons or the map tiles: their
   addresses are worked out from data/game-icons.json and the tiles block in
   data/artillery-maps.json, both of which ship in the page, and GitHub Pages will serve any
   of them to anybody who asks. Real limits need something in front of the site that can turn
   a request away, which is map/processes/security.md.
   It is still worth writing, for the one thing it does do: the training crawlers below are run
   by outfits that publish an opt-out and largely honour it, so this is the site taking it. */
const SCRAPERS = ["GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-User",
  "Claude-SearchBot", "anthropic-ai", "CCBot", "Google-Extended", "Applebot-Extended",
  "meta-externalagent", "FacebookBot", "Bytespider", "Amazonbot", "PerplexityBot", "Omgilibot",
  "Diffbot", "ImagesiftBot", "Timpibot", "Webzio-Extended", "PanguBot", "Kangaroo Bot",
  "Scrapy", "cohere-ai", "cohere-training-data-crawler"];
write("robots.txt",
  SCRAPERS.map(a => `User-agent: ${a}\nDisallow: /\n`).join("\n") +
  `\nUser-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);

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
