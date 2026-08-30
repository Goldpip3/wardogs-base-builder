/* Runs every behavioural suite and returns one exit code.
 *
 *   node test/run.js            all of them
 *   node test/run.js planner    just the ones whose name contains "planner"
 *
 * These test behaviour: the geometry, the issue rules, the encoding, the worker. The
 * structural checks that run on every build live in tools/check-build.js instead, because
 * they are about whether the built files are intact rather than whether the logic is right.
 * Both matter, and they catch different things.
 */
const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const HERE = __dirname;
const filter = process.argv[2] || "";

const suites = fs.readdirSync(HERE)
  .filter(f => (f.endsWith(".js") || f.endsWith(".mjs")) && f !== "run.js")
  .filter(f => !filter || f.includes(filter))
  .sort();

if (!suites.length) {
  console.error(filter ? "no suite matches " + filter : "no suites found");
  process.exit(1);
}

let failed = 0;
const lines = [];
for (const s of suites) {
  let out = "", ok = true;
  try {
    out = execFileSync(process.execPath, [path.join(HERE, s)], { encoding: "utf8" });
  } catch (e) {
    ok = false;
    out = (e.stdout || "") + (e.stderr || "");
    failed++;
  }
  // each suite prints its own tally on the last non-empty line
  const tail = out.trim().split("\n").filter(Boolean).pop() || "(no output)";
  lines.push([ok, s, tail.trim()]);
  if (!ok) console.log("\n--- " + s + " ---\n" + out.trim() + "\n");
}

console.log("");
for (const [ok, name, tail] of lines) {
  console.log((ok ? "  ok   " : "  FAIL ") + name.padEnd(18) + tail);
}
console.log("");
console.log(failed
  ? failed + " of " + suites.length + " suites failed"
  : "all " + suites.length + " suites pass");
process.exit(failed ? 1 : 0);
