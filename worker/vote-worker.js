/* Vote service for community designs.
 *
 * The site itself is static (GitHub Pages), so it cannot count anything. This is the
 * one moving part: a Cloudflare Worker backed by a KV namespace. It is deliberately
 * tiny - two routes, no framework, no database.
 *
 * Deploy (from the worker/ directory, needs a free Cloudflare account):
 *
 *   npm install -g wrangler
 *   wrangler login
 *   wrangler kv namespace create VOTES
 *   # paste the returned id into wrangler.toml, then:
 *   wrangler deploy
 *
 * Then put the deployed URL into data/community.json -> voteApi and rebuild.
 *
 * Voter identity: there are no accounts, so a vote is keyed by a salted hash of the
 * caller's IP and the design id. That stops the same browser stuffing one design and
 * lets somebody change their mind, without storing an address anywhere. It is not
 * proof against a determined person with a VPN - it is proof against the accident and
 * the idle click-spammer, which is what a community list actually needs.
 */

const ALLOWED = ["https://www.wardogsbuilder.com", "https://wardogsbuilder.com"];

function cors(origin) {
  const allow = ALLOWED.includes(origin) ? origin : ALLOWED[0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin",
  };
}

const json = (body, origin, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...cors(origin) },
  });

async function voterKey(request, env, id) {
  const ip = request.headers.get("CF-Connecting-IP") || "0.0.0.0";
  const data = new TextEncoder().encode(`${env.VOTE_SALT || "wardogs"}:${ip}:${id}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return "v:" + [...new Uint8Array(digest)].slice(0, 12)
    .map(b => b.toString(16).padStart(2, "0")).join("");
}

// ids are slugs we generate, so keep them boring on the way in
const okId = id => typeof id === "string" && /^[a-z0-9-]{1,64}$/.test(id);

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const url = new URL(request.url);

    if (request.method === "OPTIONS") return new Response(null, { headers: cors(origin) });

    // ---- GET /votes?ids=a,b,c -> { a: {up,down}, ... } ----
    if (request.method === "GET" && url.pathname === "/votes") {
      const ids = (url.searchParams.get("ids") || "").split(",").filter(okId).slice(0, 100);
      const out = {};
      await Promise.all(ids.map(async id => {
        const raw = await env.VOTES.get("d:" + id);
        out[id] = raw ? JSON.parse(raw) : { up: 0, down: 0 };
      }));
      return json(out, origin);
    }

    // ---- POST /vote { id, dir } where dir is 1, -1 or 0 to clear ----
    if (request.method === "POST" && url.pathname === "/vote") {
      let body;
      try { body = await request.json(); } catch { return json({ error: "bad json" }, origin, 400); }
      const { id, dir } = body || {};
      if (!okId(id) || ![1, -1, 0].includes(dir)) return json({ error: "bad request" }, origin, 400);

      const vk = await voterKey(request, env, id);
      const prev = Number(await env.VOTES.get(vk)) || 0;
      if (prev === dir) {
        const raw = await env.VOTES.get("d:" + id);
        return json({ ...(raw ? JSON.parse(raw) : { up: 0, down: 0 }), you: dir }, origin);
      }

      const raw = await env.VOTES.get("d:" + id);
      const tally = raw ? JSON.parse(raw) : { up: 0, down: 0 };
      if (prev === 1) tally.up = Math.max(0, tally.up - 1);
      if (prev === -1) tally.down = Math.max(0, tally.down - 1);
      if (dir === 1) tally.up++;
      if (dir === -1) tally.down++;

      await env.VOTES.put("d:" + id, JSON.stringify(tally));
      // remember this voter for a year, so the button can show what they picked
      await env.VOTES.put(vk, String(dir), { expirationTtl: 60 * 60 * 24 * 365 });
      return json({ ...tally, you: dir }, origin);
    }

    return json({ error: "not found" }, origin, 404);
  },
};
