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

// -- 0. the app's script actually parses --
// A bulk find-and-replace across the template once ate the tail of a template literal
// and every check below still passed, because the page was structurally fine and simply
// did not run. Parse it.
{
  const s = app.indexOf("<script>", app.indexOf("</style>"));
  const e = app.lastIndexOf("</script>");
  let err = null;
  try { new (require("vm").Script)(app.slice(s + "<script>".length, e)); }
  catch (ex) { err = ex.message; }
  check(!err, "planner script parses", err);
}

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

// -- 6. figures the user has corrected must not be hardcoded in the markup --
// Pallet size and FOB starting stock have each been corrected several times; twice the
// catalog was updated and a duplicate in the HTML was not, and the app shipped the old
// number anyway. They are only allowed to come from the catalog now.
{
  const stale = [];
  if (/id="palletSize"[^>]*value=/.test(app)) stale.push("palletSize has a hardcoded value");
  if (/id="supplyStock"[^>]*value=/.test(app)) stale.push("supplyStock has a hardcoded value");
  check(stale.length === 0, "supply figures come from the catalog, not the markup", stale.join("; "));

  const pallet = catalog.logistics && catalog.logistics.suppliesPerPallet;
  const stock = catalog.fob && catalog.fob.startingSupplies;
  check(app.includes('"suppliesPerPallet": ' + pallet), "catalog pallet size (" + pallet + ") is inlined");
  check(app.includes('"startingSupplies": ' + stock), "catalog FOB stock (" + stock + ") is inlined");
}

// -- 7. nothing removed from the catalog is still named in the prose --
{
  const gone = ["Refuel Station", "Repair Station"]
    .filter(n => !catalog.buildables.some(b => b.name === n) && app.includes(n));
  check(gone.length === 0, "removed buildables are not still mentioned", gone.join(", "));
}

console.log(fail ? `\n${fail} structural check(s) failed` : "\nbuild looks structurally sound");
process.exit(fail ? 1 : 0);
