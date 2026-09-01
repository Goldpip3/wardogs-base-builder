/* The design tag vocabulary, and the four places that have to agree about it.
 *
 * The list itself lives in data/community.json and nowhere else. From there it reaches the
 * site's filter bar and pills through tools/site/context.js, the planner's submit picker
 * through a build.ps1 replacement, and the community worker not at all: the worker is
 * deployed on its own and validates shape rather than membership, so a tag added to the
 * data file works at the next build with no deploy behind it.
 *
 * That freedom costs one convention, and this suite is what holds it up: every tag in the
 * required group starts with map-, because that prefix is the only thing the worker can
 * check without a copy of the list.
 */
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..");
const read = f => fs.readFileSync(path.join(ROOT, f), "utf8");

let pass = 0, fail = 0;
const check = (ok, label, detail) => {
  console.log((ok ? "  ok   " : "  FAIL ") + label + (ok || !detail ? "" : "  -> " + detail));
  ok ? pass++ : fail++;
};

const COMMUNITY = JSON.parse(read("data/community.json"));
const GROUPS = (COMMUNITY.designTags || {}).groups || [];
const ALL = [];
GROUPS.forEach(g => (g.tags || []).forEach(t => ALL.push({ ...t, group: g.id })));

console.log("--- the vocabulary ---");
check(GROUPS.length >= 2, "there are at least two groups to filter across", GROUPS.length + " group(s)");
check(ALL.length >= 6, "and enough tags to be worth a bar", ALL.length + " tag(s)");

{
  const thin = GROUPS.filter(g => (g.tags || []).length < 2).map(g => g.id);
  check(thin.length === 0, "every group offers a choice rather than one chip", thin.join(", "));
  const unlabelled = GROUPS.filter(g => !g.id || !g.label).map(g => g.id || "(no id)");
  check(unlabelled.length === 0, "every group has an id and a label", unlabelled.join(", "));
  const noLabel = ALL.filter(t => !t.label).map(t => t.id);
  check(noLabel.length === 0, "and every tag has one to draw", noLabel.join(", "));
}

{
  const seen = {}, dupes = [];
  ALL.forEach(t => { if (seen[t.id]) dupes.push(t.id); seen[t.id] = true; });
  check(dupes.length === 0, "no tag id appears in two groups", dupes.join(", "));
}

/* The pattern the worker enforces, lifted out of the worker rather than written again here.
   If it tightens, this fails before a tag the site offers starts being refused on arrival. */
{
  const src = read("worker/vote-worker.js");
  const m = src.match(/typeof t !== "string" \|\| !\/(.+?)\/\.test\(t\)/);
  check(!!m, "the worker still validates tag ids with one regex");
  if (m) {
    const re = new RegExp(m[1]);
    const bad = ALL.filter(t => !re.test(t.id)).map(t => t.id);
    check(bad.length === 0, "every tag the site offers is one the worker accepts: " + m[1],
      bad.join(", "));
  }
  const cap = (src.match(/tags: (\d+),/) || [])[1];
  check(cap && ALL.length <= +cap * 2,
    "the per-design cap of " + cap + " is below the whole vocabulary, so nobody tags everything");
}

console.log("\n--- where it works ---");
{
  const required = GROUPS.filter(g => g.required);
  check(required.length === 1, "exactly one group has to be answered",
    required.map(g => g.id).join(", "));
  const g = required[0];
  if (g) {
    const stray = (g.tags || []).filter(t => t.id.slice(0, 4) !== "map-").map(t => t.id);
    /* The whole reason the worker can enforce "say where it works" without knowing which
       maps exist. A tag in this group without the prefix would be offered by the site and
       count for nothing on the server. */
    check(stray.length === 0, "every tag in it carries the map- prefix the worker checks for",
      stray.join(", "));
    const others = GROUPS.filter(x => x !== g)
      .flatMap(x => x.tags || []).filter(t => t.id.slice(0, 4) === "map-").map(t => t.id);
    check(others.length === 0, "and no other group borrows that prefix", others.join(", "));
    check((g.tags || []).some(t => t.exclusive),
      "one of them is the answer that rules out the rest");
  }
}

/* A map in the game with no tag is a map nobody can say their base is for. This is the
   check that notices when a third one is added to the artillery data and stops there. */
{
  const maps = JSON.parse(read("data/artillery-maps.json")).maps || [];
  const missing = maps.filter(m => !ALL.some(t => t.id === "map-" + m.id)).map(m => m.id);
  check(missing.length === 0,
    maps.length + " map(s) in the artillery data, each with a tag of its own", missing.join(", "));
}

console.log("\n--- what ships ---");
/* Everything under groups is re-serialised into the planner by build.ps1, so a comment key
   left in there travels to every player who downloads the file. */
{
  const leaked = [];
  GROUPS.forEach(g => {
    Object.keys(g).forEach(k => { if (k.charAt(0) === "_") leaked.push(g.id + "." + k); });
    (g.tags || []).forEach(t =>
      Object.keys(t).forEach(k => { if (k.charAt(0) === "_") leaked.push(t.id + "." + k); }));
  });
  check(leaked.length === 0, "no comment key inside groups, which is inlined wholesale",
    leaked.join(", "));
}

/* The built files, not the generators: what actually reaches a browser is the thing worth
   asserting, and the planner's copy arrives through a PowerShell replacement that no
   JavaScript test would otherwise touch. */
for (const f of ["docs/planner/index.html", "WardogsBaseBuilder.html"]) {
  let app;
  try { app = read(f); } catch (e) { check(false, f + " is built"); continue; }
  const m = app.match(/const DESIGN_TAGS = (\[.*?\]);\n/s);
  if (!m) { check(false, f + " carries the tag vocabulary"); continue; }
  let got = null;
  try { got = JSON.parse(m[1]); } catch (e) {}
  const ids = got ? got.flatMap(g => (g.tags || []).map(t => t.id)) : [];
  check(ids.join(",") === ALL.map(t => t.id).join(","),
    f + " carries the same tags in the same order", ids.join(","));
}

{
  const designs = read("docs/designs/index.html");
  const missing = ALL.filter(t => !designs.includes(t.id)).map(t => t.id);
  check(missing.length === 0, "the designs page knows every tag it may have to draw",
    missing.join(", "));
  check(/class="tagfilter"/.test(designs) || /tagfilter/.test(designs),
    "and builds a filter bar for them");
  /* The home page shows the same list without the tabs. A filter bar there would be a
     control over a list capped at a handful of cards. */
  check(!/tagfilter/.test(read("docs/index.html")) || read("docs/index.html").includes("data-notabs"),
    "the home page list stays a list");
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
