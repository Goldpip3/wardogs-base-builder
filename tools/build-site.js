// Generates the static site around the planner.
//
//   node tools/build-site.js
//
// One page per thing somebody actually searches for: the buildable costs, each design,
// each guide. Everything comes from the files in data/ so the numbers can never drift out
// of sync with the planner itself.
//
// This file is the running order and nothing else. Shared helpers live in
// tools/site/context.js; every page is a module in tools/site/pages/ that takes the
// context and writes its own files. To add a page: write the module, add it to the list
// below, and add its URL to tools/site/pages/sitemap.js. tools/check-build.js will fail
// the build if you forget the sitemap.
const ctx = require("./site/context")();

for (const name of [
  "home",
  "buildables",
  "designs",
  "guides",
  "ballistics",
  "holding",
  "armory",
  "community",
  "sitemap",
  "legal",
]) {
  require("./site/pages/" + name)(ctx);
}

/* A design that stops being published does not delete its own page, so anything left from
   a previous run has to be swept. Runs last, once everything that should exist does. */
ctx.sweepDesignPages();

console.log(`site: ${ctx.urls.length} pages`);
for (const d of ctx.withStats)
  console.log(`  ${d.slug.padEnd(24)} ${String(d.s.supplies).padStart(5)} supplies, ${String(d.s.pieces).padStart(3)} pieces, code ${d.code.length} chars`);
