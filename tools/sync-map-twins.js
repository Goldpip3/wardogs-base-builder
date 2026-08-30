/* Generates map/AGENTS.md and map/routing.md as byte-identical twins of map/CLAUDE.md.
 *
 * Different tools look for different entry filenames. Keeping three by hand is how they
 * drift, and two entry files that disagree is worse than one, because the reader has no way
 * to know which is current. So one is written and the others are generated.
 *
 * Run by build.ps1. tools/check-build.js fails the build if the twins are out of date,
 * which is what stops someone hand-editing one and it quietly winning.
 */
const fs = require("fs");
const path = require("path");

const MAP = path.join(__dirname, "..", "map");
const SOURCE = path.join(MAP, "CLAUDE.md");
const TWINS = ["AGENTS.md", "routing.md"];

const banner = "<!-- Generated from map/CLAUDE.md by tools/sync-map-twins.js. Do not edit. -->\n";
const body = fs.readFileSync(SOURCE, "utf8");

let wrote = 0;
for (const t of TWINS) {
  const p = path.join(MAP, t);
  const want = banner + body;
  if (!fs.existsSync(p) || fs.readFileSync(p, "utf8") !== want) {
    fs.writeFileSync(p, want);
    wrote++;
  }
}
if (require.main === module) {
  console.log(wrote ? "  map twins updated (" + wrote + ")" : "  map twins already current");
}
module.exports = { MAP, SOURCE, TWINS, banner };
