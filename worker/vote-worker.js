/* Community service for wardogsbuilder.com: submissions, votes and comments.
 *
 * The site itself is static (GitHub Pages), so it cannot store anything. This is the one
 * moving part: a Cloudflare Worker backed by a KV namespace. No framework, no database,
 * no accounts. A player pastes a share link and it is up.
 *
 * Deploy (from worker/, free Cloudflare account):
 *
 *   npm install -g wrangler
 *   wrangler login
 *   wrangler kv namespace create VOTES
 *   # paste the id it prints into wrangler.toml
 *   wrangler secret put ADMIN_TOKEN     # any long random string, for moderation
 *   wrangler secret put VOTE_SALT       # any long random string
 *   wrangler deploy
 *
 * Then put the deployed URL into data/community.json -> voteApi and rebuild.
 *
 * Identity: there are no accounts, so a voter is a salted hash of their IP plus the thing
 * being voted on. The address itself is never stored and cannot be recovered from the
 * hash. That stops the same browser voting fifty times; it does not stop somebody
 * determined with a VPN, which is the right trade for a community list.
 *
 * KV layout
 *   design:<slug>   the design record
 *   d:<slug>        {up,down} tally
 *   v:<hash>        one voter's choice, expires after a year
 *   c:<slug>:<ts>   one comment
 *   rate:<hash>     write counter, expires
 */

const ALLOWED = ["https://www.wardogsbuilder.com", "https://wardogsbuilder.com"];
// Local origins are allowed too, so the whole loop can be exercised before deploying.
const isLocal = o => /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(o);

const LIMITS = {
  name: 60,
  author: 32,
  code: 8000,      // a very large base still encodes well under this
  comment: 1500,
  submitsPerDay: 5,
  commentsPerHour: 10,
  feedback: 4000,
  feedbackPerHour: 6,
};

/* What a piece of feedback is about. Anything else is filed as "other" rather than
   rejected, because guessing wrong should not cost somebody their message. */
const FEEDBACK_KINDS = ["idea", "bug", "data", "other"];

function cors(origin) {
  const allow = (ALLOWED.includes(origin) || isLocal(origin)) ? origin : ALLOWED[0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,X-Admin-Token",
    "Vary": "Origin",
  };
}
const json = (body, origin, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...cors(origin) },
  });

async function hash(env, ...parts) {
  const data = new TextEncoder().encode([env.VOTE_SALT || "wardogs", ...parts].join(":"));
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].slice(0, 12)
    .map(b => b.toString(16).padStart(2, "0")).join("");
}
const ipOf = request => request.headers.get("CF-Connecting-IP") || "0.0.0.0";

const okSlug = s => typeof s === "string" && /^[a-z0-9-]{1,64}$/.test(s);

/* Share codes are base64url. Anything else is not a design and should not be stored. */
const okCode = c => typeof c === "string" && c.length > 20 && c.length <= LIMITS.code &&
  /^[A-Za-z0-9_-]+$/.test(c);

/* Text arriving from strangers gets its control characters stripped and its length
   capped before it is ever stored, so nothing downstream has to think about it. */
function clean(s, max) {
  return String(s == null ? "" : s)
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function slugify(name, stamp) {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
  return (base || "design") + "-" + stamp.toString(36).slice(-4);
}

/* Simple fixed-window counter. Not exact under concurrency, which does not matter for
   something whose only job is to make bulk posting tedious. */
async function overLimit(env, key, max, ttl) {
  const n = Number(await env.VOTES.get(key)) || 0;
  if (n >= max) return true;
  await env.VOTES.put(key, String(n + 1), { expirationTtl: ttl });
  return false;
}

async function listDesigns(env, status) {
  const out = [];
  let cursor;
  do {
    const page = await env.VOTES.list({ prefix: "design:", cursor });
    for (const k of page.keys) {
      const raw = await env.VOTES.get(k.name);
      if (!raw) continue;
      const d = JSON.parse(raw);
      if (!status || d.status === status) out.push(d);
    }
    cursor = page.cursor;
    if (page.list_complete) break;
  } while (cursor);
  return out;
}

async function tallies(env, slugs) {
  const out = {};
  await Promise.all(slugs.map(async s => {
    const raw = await env.VOTES.get("d:" + s);
    out[s] = raw ? JSON.parse(raw) : { up: 0, down: 0 };
  }));
  return out;
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";
    const admin = () => !!env.ADMIN_TOKEN &&
      request.headers.get("X-Admin-Token") === env.ADMIN_TOKEN;

    if (request.method === "OPTIONS") return new Response(null, { headers: cors(origin) });

    let body = {};
    if (request.method === "POST") {
      try { body = await request.json(); }
      catch { return json({ error: "bad json" }, origin, 400); }
    }

    /* ---------------- designs ---------------- */

    // GET /designs -> approved designs, newest first, with their scores
    if (request.method === "GET" && path === "/designs") {
      const designs = await listDesigns(env, "approved");
      const votes = await tallies(env, designs.map(d => d.slug));
      designs.forEach(d => { d.votes = votes[d.slug]; });
      designs.sort((a, b) =>
        (b.votes.up - b.votes.down) - (a.votes.up - a.votes.down) ||
        b.submitted - a.submitted);
      return json({ designs }, origin);
    }

    // POST /submit {name, author, code, note}
    if (request.method === "POST" && path === "/submit") {
      const rk = "rate:sub:" + await hash(env, ipOf(request));
      if (await overLimit(env, rk, LIMITS.submitsPerDay, 86400))
        return json({ error: "You have submitted a few already today. Try tomorrow." }, origin, 429);

      const name = clean(body.name, LIMITS.name);
      const author = clean(body.author, LIMITS.author) || "anonymous";
      const note = clean(body.note, 300);
      const code = String(body.code || "").trim();

      if (name.length < 3) return json({ error: "Give it a name." }, origin, 400);
      if (!okCode(code)) return json({ error: "That share code does not look right. Copy the whole link from Share." }, origin, 400);

      const stamp = Date.now();
      const slug = slugify(name, stamp);
      const record = { slug, name, author, note, code, submitted: stamp, status: "pending" };
      await env.VOTES.put("design:" + slug, JSON.stringify(record));
      return json({ ok: true, slug, status: "pending" }, origin);
    }

    /* ---------------- votes ---------------- */

    // GET /votes?ids=a,b,c
    if (request.method === "GET" && path === "/votes") {
      const ids = (url.searchParams.get("ids") || "").split(",").filter(okSlug).slice(0, 100);
      return json(await tallies(env, ids), origin);
    }

    // POST /vote {id, dir} where dir is 1, -1, or 0 to take it back
    if (request.method === "POST" && path === "/vote") {
      const { id, dir } = body;
      if (!okSlug(id) || ![1, -1, 0].includes(dir))
        return json({ error: "bad request" }, origin, 400);

      const vk = "v:" + await hash(env, ipOf(request), id);
      const prev = Number(await env.VOTES.get(vk)) || 0;
      const raw = await env.VOTES.get("d:" + id);
      const tally = raw ? JSON.parse(raw) : { up: 0, down: 0 };
      if (prev === dir) return json({ ...tally, you: dir }, origin);

      if (prev === 1) tally.up = Math.max(0, tally.up - 1);
      if (prev === -1) tally.down = Math.max(0, tally.down - 1);
      if (dir === 1) tally.up++;
      if (dir === -1) tally.down++;

      await env.VOTES.put("d:" + id, JSON.stringify(tally));
      await env.VOTES.put(vk, String(dir), { expirationTtl: 60 * 60 * 24 * 365 });
      return json({ ...tally, you: dir }, origin);
    }

    /* ---------------- comments ---------------- */

    // GET /comments?design=slug
    if (request.method === "GET" && path === "/comments") {
      const slug = url.searchParams.get("design");
      if (!okSlug(slug)) return json({ error: "bad design" }, origin, 400);
      const out = [];
      let cursor;
      do {
        const page = await env.VOTES.list({ prefix: "c:" + slug + ":", cursor });
        for (const k of page.keys) {
          const raw = await env.VOTES.get(k.name);
          if (raw) out.push(JSON.parse(raw));
        }
        cursor = page.cursor;
        if (page.list_complete) break;
      } while (cursor);
      out.sort((a, b) => a.at - b.at);
      return json({ comments: out.filter(c => !c.removed) }, origin);
    }

    // POST /comment {design, author, text, replyTo}
    if (request.method === "POST" && path === "/comment") {
      const slug = body.design;
      if (!okSlug(slug)) return json({ error: "bad design" }, origin, 400);
      if (!await env.VOTES.get("design:" + slug))
        return json({ error: "no such design" }, origin, 404);

      const rk = "rate:com:" + await hash(env, ipOf(request));
      if (await overLimit(env, rk, LIMITS.commentsPerHour, 3600))
        return json({ error: "Slow down a moment." }, origin, 429);

      const text = clean(body.text, LIMITS.comment);
      if (text.length < 2) return json({ error: "Say something." }, origin, 400);

      const at = Date.now();
      const c = {
        id: at.toString(36) + Math.random().toString(36).slice(2, 6),
        design: slug,
        author: clean(body.author, LIMITS.author) || "anonymous",
        text,
        replyTo: okSlug(String(body.replyTo || "")) ? String(body.replyTo) : null,
        at,
      };
      await env.VOTES.put("c:" + slug + ":" + at + c.id, JSON.stringify(c));
      return json({ ok: true, comment: c }, origin);
    }

    /* ---------------- feedback ----------------
       Write only from the public side. Nothing sent in is ever displayed on the site, so
       there is nothing here for a spammer to gain an audience with, and no moderation
       queue to keep on top of. It is a suggestion box. */

    // POST /feedback {kind, text, contact}
    if (request.method === "POST" && path === "/feedback") {
      const rk = "rate:fb:" + await hash(env, ipOf(request));
      if (await overLimit(env, rk, LIMITS.feedbackPerHour, 3600))
        return json({ error: "That is a few in a row. Try again a bit later." }, origin, 429);

      const text = clean(body.text, LIMITS.feedback);
      if (text.length < 4) return json({ error: "Tell me a bit more than that." }, origin, 400);

      const at = Date.now();
      const rec = {
        at,
        kind: FEEDBACK_KINDS.includes(body.kind) ? body.kind : "other",
        text,
        // optional, and only so the owner can reply. Nothing is sent to it automatically.
        contact: clean(body.contact, 120),
        page: clean(body.page, 200),
      };
      await env.VOTES.put("fb:" + at + Math.random().toString(36).slice(2, 6),
                          JSON.stringify(rec));
      return json({ ok: true }, origin);
    }

    /* ---------------- moderation ----------------
       Everything below needs the admin token, which only the site owner has. Submissions
       stay invisible until one of these calls approves them, so the public list can never
       be filled with junk faster than it can be cleared. */

    if (path.startsWith("/admin")) {
      if (!admin()) return json({ error: "not authorised" }, origin, 401);

      if (request.method === "GET" && path === "/admin/pending")
        return json({ designs: await listDesigns(env, "pending") }, origin);

      if (request.method === "POST" && path === "/admin/design") {
        const { slug, action } = body;
        if (!okSlug(slug)) return json({ error: "bad slug" }, origin, 400);
        const raw = await env.VOTES.get("design:" + slug);
        if (!raw) return json({ error: "not found" }, origin, 404);
        if (action === "delete") {
          await env.VOTES.delete("design:" + slug);
          await env.VOTES.delete("d:" + slug);
          return json({ ok: true, deleted: slug }, origin);
        }
        if (action !== "approve" && action !== "reject")
          return json({ error: "bad action" }, origin, 400);
        const d = JSON.parse(raw);
        d.status = action === "approve" ? "approved" : "rejected";
        await env.VOTES.put("design:" + slug, JSON.stringify(d));
        return json({ ok: true, slug, status: d.status }, origin);
      }

      if (request.method === "POST" && path === "/admin/comment") {
        const { key } = body;
        if (typeof key !== "string" || !key.startsWith("c:"))
          return json({ error: "bad key" }, origin, 400);
        await env.VOTES.delete(key);
        return json({ ok: true, deleted: key }, origin);
      }

      // Everything anyone has sent in, newest first, as one JSON blob. Deliberately not
      // paginated: the point is to be able to take the lot somewhere else and read it.
      if (request.method === "GET" && path === "/admin/feedback") {
        const out = [];
        let cursor;
        do {
          const page = await env.VOTES.list({ prefix: "fb:", cursor });
          for (const k of page.keys) {
            const raw = await env.VOTES.get(k.name);
            if (raw) out.push({ key: k.name, ...JSON.parse(raw) });
          }
          cursor = page.cursor;
          if (page.list_complete) break;
        } while (cursor);
        out.sort((a, b) => b.at - a.at);
        return json({ feedback: out }, origin);
      }

      if (request.method === "POST" && path === "/admin/feedback/delete") {
        const { key } = body;
        if (typeof key !== "string" || !key.startsWith("fb:"))
          return json({ error: "bad key" }, origin, 400);
        await env.VOTES.delete(key);
        return json({ ok: true, deleted: key }, origin);
      }
    }

    return json({ error: "not found" }, origin, 404);
  },
};
