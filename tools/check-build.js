/* Fast structural checks on the built planner, run after build.ps1.
 *
 * These exist because of two bugs that shipped silently:
 *   1. Markup was deleted but the JS that reached for it stayed. getElementById
 *      returned null, the boot threw, and the whole app came up blank — no design
 *      loaded, no zoom-to-fit, the empty-state stuck over a 62-piece base.
 *   2. build.ps1 read UTF-8 sources under Windows PowerShell 5.1, which assumes the
 *      ANSI codepage, and every arrow, dash and × in the app turned to mojibake.
 *
 * Neither showed up in the behavioural suites, because both broke the page rather
 * than the logic. Cheap to check, so check on every build.
 */
const fs = require("fs");
const path = require("path");

const proj = path.resolve(__dirname, "..");
const app = fs.readFileSync(path.join(proj, "docs/planner/index.html"), "utf8");
const catalog = JSON.parse(fs.readFileSync(path.join(proj, "data/buildables.json"), "utf8"));

let fail = 0;
const check = (ok, label, detail) => {
  console.log((ok ? "  ok   " : "  FAIL ") + label + (ok || !detail ? "" : " — " + detail));
  if (!ok) fail++;
};

// -- 1. every element the script reaches for actually exists in the markup --
const ids = new Set([...app.matchAll(/\bid="([A-Za-z0-9_-]+)"/g)].map(m => m[1]));
const looked = [...new Set([...app.matchAll(/getElementById\("([A-Za-z0-9_-]+)"\)/g)].map(m => m[1]))];
const orphans = looked.filter(id => !ids.has(id));
check(orphans.length === 0, `all ${looked.length} getElementById targets exist`, orphans.join(", "));

// -- 2. text survived the build as UTF-8 --
const mojibake = app.match(/Ã.|â€.|â‡.|Â./g);
check(!mojibake, "no mojibake from a codepage mismatch",
  mojibake && [...new Set(mojibake)].slice(0, 6).join(" "));

// -- 3. every catalog icon was actually inlined --
const missingIcons = catalog.buildables
  .map(b => b.icon)
  .filter(icon => icon && !app.includes('"' + icon + '":"data:'));
check(missingIcons.length === 0,
  `all ${catalog.buildables.length} buildable icons inlined`, missingIcons.join(", "));

// -- 4. nothing reaches the network: offline is the whole promise --
const remote = [...app.matchAll(/(?:src|href)="(https?:\/\/[^"]+)"/g)]
  .map(m => m[1])
  .filter(u => !/schema\.org|og:|^https?:\/\/www\.wardogsbuilder\.com/.test(u));
check(remote.length === 0, "no external resource loads", remote.slice(0, 3).join(", "));

// -- 5. the estimate question marks the user asked us to drop are gone --
check(!/[>\s]\?<\/span>/.test(app), "no leftover '?' estimate badges");

console.log(fail ? `\n${fail} structural check(s) failed` : "\nbuild looks structurally sound");
process.exit(fail ? 1 : 0);
