/* Pulls approved designs out of the community worker into data/community.json, so the
 * next build turns them into real static pages.
 *
 *   node tools/pull-community.js
 *
 * Why this exists: submitted designs appear on /designs/ immediately, fetched from the
 * worker by the browser. That is good for the person who just submitted and useless for
 * search, because there is no page for Google to index. Running this promotes the
 * approved ones to static pages with their own URL, title and costs worked out.
 *
 * Safe to run whenever. It only ever adds or updates; nothing is deleted here, because a
 * design vanishing from the API should not silently delete a page that is already ranking.
 * Removing one is a deliberate act: delete it in the worker, then drop it from this file.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const FILE = path.join(ROOT, "data/community.json");

(async () => {
  const community = JSON.parse(fs.readFileSync(FILE, "utf8"));
  const api = (community.voteApi || "").replace(/\/$/, "");
  if (!api) {
    console.log("No voteApi set in data/community.json. Nothing to pull.");
    process.exit(0);
  }

  let designs;
  try {
    const r = await fetch(api + "/designs");
    if (!r.ok) throw new Error("HTTP " + r.status);
    ({ designs } = await r.json());
  } catch (e) {
    console.error("Could not reach the community service: " + e.message);
    process.exit(1);
  }

  const existing = new Map((community.designs || []).map(d => [d.slug, d]));
  let added = 0, updated = 0;

  for (const d of designs) {
    const entry = {
      slug: d.slug,
      name: d.name,
      author: d.author || "anonymous",
      tagline: d.note || "",
      code: d.code,
      submitted: new Date(d.submitted).toISOString().slice(0, 10),
    };
    const was = existing.get(d.slug);
    if (!was) { added++; }
    else if (JSON.stringify(was) !== JSON.stringify(entry)) { updated++; }
    existing.set(d.slug, entry);
  }

  community.designs = [...existing.values()]
    .sort((a, b) => String(b.submitted).localeCompare(String(a.submitted)));
  fs.writeFileSync(FILE, JSON.stringify(community, null, 2) + "\n");

  console.log(`${community.designs.length} design(s) in data/community.json ` +
              `(${added} new, ${updated} changed). Run build.ps1 to publish them.`);
})();
