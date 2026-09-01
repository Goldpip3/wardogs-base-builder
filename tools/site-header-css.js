/* The site's banner, lifted out of the site's own stylesheet for the planner to use.
 *
 * The planner is a single self-contained page with its own <style> block, built by
 * build.ps1 before tools/build-site.js ever runs, so it cannot link the site's stylesheet
 * and must carry its own copy of the header rules. A copy typed by hand is a copy that
 * drifts: the owner asked for the exact same banner, and "exact" that has to be maintained
 * by remembering to edit two files is exact for about a week.
 *
 * So nothing is typed here. This reads tools/site/css.js, pulls out the rules that draw the
 * header, resolves the custom properties they use, and prints the result. build.ps1 runs it
 * and injects the output into the planner; tools/check-build.js runs it again and fails if
 * what is in the built planner is not what this prints.
 *
 * The properties have to be re-declared on header.site rather than left to :root, because
 * the planner's :root is a different palette with different names: it calls the yellow
 * --accent and its --border is #2e2e2e where the site's --line is #242424. Scoping them to
 * the header means the banner draws in the site's colours inside a page that does not have
 * them, and nothing else in the planner is touched.
 */
const path = require("path");
const CSS = require(path.join(__dirname, "site", "css.js"));

/* Selectors that draw the banner. A rule is kept when its selector list mentions any of
   these, so `nav.site a.cta:hover` and the responsive overrides come along without being
   listed one by one. */
const WANTED = ["header.site", "nav.site", ".brand"];
/* .wrap is the column every page on the site is poured into, and the header is one of them:
   without it the banner runs the full width of the window and the wordmark sits against the
   glass. Only the bare rule is wanted, not `.hero.has-video .wrap` and the rest, so it is
   matched exactly rather than by mention. */
const WANTED_EXACT = [".wrap"];

/* CSS split into top level blocks, at-rules kept whole so a @media wrapper can be reopened
   around whatever inside it survives the filter. A regex cannot do this: the header rules
   live inside two media queries and a naive split on } would cut them in half. */
function blocks(css) {
  const out = [];
  let i = 0;
  while (i < css.length) {
    const open = css.indexOf("{", i);
    if (open < 0) break;
    let depth = 0, j = open;
    for (; j < css.length; j++) {
      if (css[j] === "{") depth++;
      else if (css[j] === "}") { depth--; if (depth === 0) break; }
    }
    const head = css.slice(i, open).trim();
    out.push({
      selector: head,
      /* The comments above a rule travel with it, which is the point: they are the reason
         the rule is the way it is and the planner should carry them too. They must not be
         matched on, though, or a rule is kept because its comment mentions the header, and
         a @media whose comment comes first stops looking like a @media at all. That is
         exactly what dropped every responsive override the first time. */
      at: head.replace(/\/\*[\s\S]*?\*\//g, "").trim(),
      body: css.slice(open + 1, j),
      whole: css.slice(i, j + 1).trim(),
    });
    i = j + 1;
  }
  return out;
}

const wants = sel =>
  WANTED.some(w => sel.includes(w)) || WANTED_EXACT.includes(sel);

function headerRules() {
  const kept = [];
  for (const b of blocks(CSS)) {
    if (b.at.startsWith("@media")) {
      const inner = blocks(b.body).filter(r => wants(r.at));
      if (inner.length) {
        kept.push(b.at + "{" + inner.map(r => r.whole).join("") + "}");
      }
      continue;
    }
    if (b.at.startsWith("@")) continue;
    if (wants(b.at)) kept.push(b.whole);
  }
  return kept.join("\n");
}

/* Every custom property the kept rules reach for, resolved from the site's :root, and then
   whatever those values reach for in turn. --y-600 is only ever named by another property,
   so a single pass would leave it undefined and the box would lose its border. */
function tokensFor(rules) {
  const root = blocks(CSS).find(b => b.at === ":root");
  const declared = {};
  root.body.replace(/(--[a-z0-9-]+)\s*:\s*([^;]+);/gi, (_, k, v) => {
    declared[k] = v.trim().replace(/\s*\/\*[\s\S]*?\*\/\s*/g, " ").trim();
    return "";
  });

  const need = new Set();
  const walk = text => {
    for (const m of text.matchAll(/var\((--[a-z0-9-]+)/gi)) {
      if (declared[m[1]] && !need.has(m[1])) { need.add(m[1]); walk(declared[m[1]]); }
    }
  };
  walk(rules);
  return [...need].sort().map(k => k + ":" + declared[k] + ";").join("");
}

/* What the banner inherits rather than states.
   On the site it sits inside a body set to 16px Chakra Petch at 1.6, and its links get their
   colour from a global `a` rule. The planner's body is 13px at 1.45 and has its own idea of
   what a link looks like, so lifting the header rules alone produced boxes that were right
   to the pixel around a wordmark rendering as a blue underlined link. Both come out of the
   site's own stylesheet too, scoped to the banner so nothing else in the planner moves. */
function inherited() {
  const rule = sel => (blocks(CSS).find(b => b.at === sel) || { body: "" }).body;
  const keep = ["font-family", "font-size", "line-height", "color", "letter-spacing"];
  const body = rule("body").split(";")
    .map(d => d.trim())
    .filter(d => keep.includes(d.split(":")[0].trim()))
    .join(";");
  return {
    body: body,
    links: "header.site a{" + rule("a").trim() + "}\n" +
      "header.site a:hover{" + rule("a:hover").trim() + "}",
  };
}

const rules = headerRules();
const inh = inherited();
const out = "header.site{" + tokensFor(rules + inh.body + inh.links) +
  inh.body + "}\n" + rules + "\n" + inh.links + "\n";

if (require.main === module) process.stdout.write(out);
module.exports = out;
