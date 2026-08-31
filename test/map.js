/* The walk test for the edit map in map/.
 *
 * An ICM is validated by walking it cold: an agent with no memory of this repo must be able
 * to orient, act, and know what a change hits, from the files alone. The failure mode this
 * guards is not a broken link, which tools/check-build.js already catches. It is the map
 * quietly growing into something you have to read all of, which is the exact problem it was
 * built to solve.
 *
 * Budget is the load-bearing check. Entry plus hub plus one card has to stay small enough
 * that reading it is cheaper than reading the code it describes.
 */
const ROOT = require("path").resolve(__dirname, "..");
const fs = require("fs"), path = require("path");

let pass = 0, fail = 0;
const check = (ok, label, detail) => {
  console.log((ok ? "PASS  " : "FAIL  ") + label + (ok || !detail ? "" : ": " + detail));
  ok ? pass++ : fail++;
};

const MAP = path.join(ROOT, "map");
const read = p => fs.readFileSync(path.join(MAP, p), "utf8");
// close enough for a budget, and it never disagrees with itself
const tokens = s => Math.round(s.length / 4);

const cards = [];
(function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (f.endsWith(".md")) cards.push(p);
  }
})(MAP);

/* 1. the map is one hop from the front door */
{
  const root = fs.readFileSync(path.join(ROOT, "CLAUDE.md"), "utf8");
  check(root.includes("map/CLAUDE.md"), "the repo entry file links straight to the map");
  check(root.split("\n").length <= 60,
    "the repo entry file routes rather than explains (under 60 lines)",
    root.split("\n").length + " lines");
}

/* 2. the catalog routes, it does not carry payload */
{
  const entry = read("CLAUDE.md");
  check(entry.split("\n").length <= 60, "map/CLAUDE.md stays a catalog (under 60 lines)",
    entry.split("\n").length + " lines");
  check(/name collisions|CONTEXT\.md/.test(entry),
    "the catalog points at where the colliding names are explained");
  const hub = read("CONTEXT.md");
  check(/Universes/i.test(hub) && /collision/i.test(hub),
    "the hub carries the universes and the name collisions");
}

/* 3. every object card carries the sections that make it worth opening */
{
  const objects = cards.filter(p => p.includes(path.sep + "objects" + path.sep) &&
    !p.endsWith("_index.md") && !p.endsWith("CONTEXT.md"));
  check(objects.length >= 5, `${objects.length} object cards`);
  const missing = [];
  for (const p of objects) {
    const s = fs.readFileSync(p, "utf8");
    const rel = path.relative(MAP, p).replace(/\\/g, "/");
    for (const section of ["## Why this shape", "## Shape", "## Connected to",
                           "## If you change this", "## Surfaces", "## See"]) {
      if (!s.includes(section)) missing.push(rel + " missing " + section);
    }
    // the waterfall is the reason the card exists; both halves or neither
    if (!/\*\*Hits:\*\*/.test(s) || !/\*\*Does not hit:\*\*/.test(s)) {
      missing.push(rel + " has no Hits / Does not hit");
    }
    // a card claiming verified has to cite something
    if (/status: verified/.test(s) && !/`[^`]+\.(js|json|html|ps1|mjs)[^`]*`/.test(s)) {
      missing.push(rel + " is marked verified but cites no source file");
    }
  }
  check(missing.length === 0, "every object card is complete and cites source",
    missing.slice(0, 3).join(" | "));
}

/* 4. the change-impact index answers both directions */
{
  const fx = read("effects/CONTEXT.md");
  check(/points in from outside/i.test(fx),
    "the effects index also records what points INTO the tree from outside");
  check(/Discord/.test(fx) && /Pages/.test(fx),
    "and names the external consumers that break silently");
}

/* 5. the budget: entry + hub + the fattest card */
{
  const entry = tokens(read("CLAUDE.md"));
  const hub = tokens(read("CONTEXT.md"));
  const fattest = cards
    .filter(p => p.includes(path.sep + "objects" + path.sep) || p.includes(path.sep + "processes" + path.sep))
    .map(p => ({ p, t: tokens(fs.readFileSync(p, "utf8")) }))
    .sort((a, b) => b.t - a.t)[0];
  const walkCost = entry + hub + fattest.t;
  console.log(`  entry ${entry} + hub ${hub} + ${path.basename(fattest.p)} ${fattest.t}` +
              ` = ~${walkCost} tokens`);
  check(walkCost <= 8000, "a cold walk lands inside the 8k budget", walkCost + " tokens");

  /* The size budget counts the map, which means the things that describe how the repo is
     shaped now. Two kinds of file are deliberately not in it.
     AGENTS.md and routing.md are byte-identical generated twins of CLAUDE.md, so counting
     all three charged one document three times.
     CHANGES.md is a log. It grows with every commit forever, while the cards only grow when
     the architecture does, so holding them to one number means a busy week eats the budget
     for the next real card. That is not theoretical: this constant was written on 30 August
     against a 12.8k map that had no changelog in it, and within nine hours a changelog that
     did not exist when the number was chosen had taken 28 percent of it, which was then paid
     for by deleting reasoning out of older entries. The log gets its own ceiling below. */
  const GENERATED_TWINS = ["AGENTS.md", "routing.md"];
  const LOGS = ["CHANGES.md"];
  const mapOnly = cards.filter(p => {
    const base = path.basename(p);
    const atRoot = path.dirname(p) === MAP;
    return !(atRoot && (GENERATED_TWINS.includes(base) || LOGS.includes(base)));
  });
  const mapSize = tokens(mapOnly.map(p => fs.readFileSync(p, "utf8")).join(""));
  console.log(`  map ${mapSize} + log ${tokens(read("CHANGES.md"))}`);
  check(mapSize < 30000, "the map stays smaller than the code it describes",
    mapSize + " tokens");

  /* When this fires the fix is to condense the oldest entries, which carry commit hashes so
     `git show` still has the full story, and never to raise the ceiling. A changelog nobody
     prunes stops being the shorter record it says it is in its own first line. */
  check(tokens(read("CHANGES.md")) < 12000, "the changelog is pruned rather than sprawled",
    tokens(read("CHANGES.md")) + " tokens");
}

console.log("\n" + pass + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);
