/* How the Designs page orders itself.
 *
 * Two complaints pull in opposite directions and the curve has to satisfy both. Ranking by
 * raw score ranks by age, so a good new design can never catch an old one. Dividing by age
 * with the usual 1.5 exponent overcorrects and buries good old work: a month-old design
 * with sixty votes came out below a two-minute-old one with a single vote.
 *
 * The constants were picked by trying them against these cases, so these cases are the
 * reason the constants are what they are. Retuning without running this is how the site
 * quietly goes back to burying things.
 */
const ROOT = require("path").resolve(__dirname, "..");
const fs = require("fs"), path = require("path");

let pass = 0, fail = 0;
const check = (ok, label, detail) => {
  console.log((ok ? "PASS  " : "FAIL  ") + label + (ok || !detail ? "" : ": " + detail));
  ok ? pass++ : fail++;
};

/* the real formula, lifted out of what ships rather than copied */
const src = fs.readFileSync(path.join(ROOT, "tools/site/client-scripts.js"), "utf8");
const m = src.match(/hot:\s*function\(d\)\{([\s\S]*?)\n\s*\},/);
if (!m) throw new Error("could not find the hot ranking in client-scripts.js");
const hot = new Function("d", m[1]);

const H = 3600000, now = Date.now();
const D = (name, up, down, hoursOld) =>
  ({ name, votes: { up, down }, submitted: now - hoursOld * H });

const cases = [
  D("month-old favourite, 60", 60, 0, 30 * 24),
  D("week-old solid, 25", 25, 0, 7 * 24),
  D("two days old, 12", 12, 0, 48),
  D("today, 8", 8, 0, 6),
  D("an hour ago, 3", 3, 0, 1),
  D("brand new, 1", 1, 0, 0.03),
  D("today but disliked, -4", 1, 5, 6),
];
const ranked = cases.slice().sort((a, b) => hot(b) - hot(a));
const at = name => ranked.findIndex(d => d.name === name);
console.log("  order: " + ranked.map(d => d.name.split(",")[0]).join(" > "));

/* --- the first complaint: a good new design must be able to win --- */
check(at("today, 8") === 0,
  "a well-liked design from today ranks first, ahead of everything older");

/* --- the second complaint: a good old design must not be buried --- */
check(at("month-old favourite, 60") < at("brand new, 1"),
  "a month-old favourite still outranks a two-minute-old design with one vote");
check(at("month-old favourite, 60") < cases.length - 2,
  "and is not dumped at the bottom just for being old",
  "it sits at position " + (at("month-old favourite, 60") + 1));

/* --- unproven things stay low, which is what New is for --- */
check(at("brand new, 1") > at("today, 8"),
  "one vote does not spike a brand new design over a proven one from the same day");

/* --- and dislike sinks, whatever the age --- */
check(at("today but disliked, -4") === ranked.length - 1,
  "a design people voted down goes last");

/* --- the cost of overtaking, stated so a retune has to face it --- */
{
  const old = hot(D("x", 60, 0, 30 * 24));
  let day = 1; while (hot(D("x", day, 0, 24)) < old) day++;
  let hour = 1; while (hot(D("x", hour, 0, 1)) < old) hour++;
  console.log("  to top a month-old 60 vote favourite: " + day +
              " net votes in a day, or " + hour + " in an hour");
  check(day >= 4 && day <= 15,
    "a day-old design needs a real number of votes to overtake, not one and not fifty",
    day + " votes");
  check(hour >= 2,
    "and a single vote in the first hour is never enough", hour + " votes");
}

/* --- New has to exist, or nothing ever gets a first vote --- */
check(/"new":\s*function\(d\)\{\s*return d\.submitted/.test(src),
  "a New tab sorts by recency, so a design with no votes is still findable");
check(/data-sort="new"/.test(src) || /\["hot","new","top"\]/.test(src),
  "and it is offered in the tabs, not just implemented");

console.log("\n" + pass + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);
