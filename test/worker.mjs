/* Exercises the community worker against a fake KV, so its behaviour is known before
   it is ever deployed. Cloudflare is not involved; this is the real module with a stub
   for env.VOTES and the platform globals it uses. */
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const worker = (await import(pathToFileURL(join(ROOT, "worker/vote-worker.js")).href)).default;

let pass = 0, fail = 0;
const check = (ok, label, detail) => {
  console.log((ok ? "  ok   " : "  FAIL ") + label + (ok || !detail ? "" : "  -> " + detail));
  ok ? pass++ : fail++;
};

function fakeKV() {
  const m = new Map();
  return {
    _m: m,
    async get(k) { const v = m.get(k); return v === undefined ? null : v; },
    async put(k, v) { m.set(k, v); },
    async delete(k) { m.delete(k); },
    async list({ prefix, cursor }) {
      const keys = [...m.keys()].filter(k => k.startsWith(prefix)).sort().map(name => ({ name }));
      return { keys, list_complete: true, cursor: undefined };
    },
  };
}

const ORIGIN = "https://www.wardogsbuilder.com";
let env;
function call(method, path, { body, ip = "1.2.3.4", token } = {}) {
  const headers = { "Origin": ORIGIN, "CF-Connecting-IP": ip };
  if (token) headers["X-Admin-Token"] = token;
  const req = new Request("https://votes.example.dev" + path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return worker.fetch(req, env);
}
const jsonOf = r => r.json();

const CODE = "eyJ2IjoxLCJuIjoiVGVzdCIsInQiOlsiaGVzY28tc21hbGwiXSwicCI6W1swLDAsMCwwLDBdXX0";

console.log("--- submission ---");
env = { VOTES: fakeKV(), VOTE_SALT: "s", ADMIN_TOKEN: "secret" };

let r = await call("POST", "/submit", { body: { name: "My Base", author: "colom", code: CODE } });
let j = await jsonOf(r);
check(r.status === 200 && j.ok && j.status === "published", "a submission goes live on arrival");
const slug = j.slug;
check(/^my-base-[a-z0-9]{4}$/.test(slug), "slug is derived from the name", slug);

check((await call("POST", "/submit", { body: { name: "ok name", code: "not a code!!" } })).status === 400,
  "a bad share code is rejected");
check((await call("POST", "/submit", { body: { name: "x", code: CODE } })).status === 400,
  "a too-short name is rejected");

j = await jsonOf(await call("GET", "/designs"));
check(j.designs.length === 1 && j.designs[0].slug === slug,
  "and is on the public list immediately, with nobody in the way");

/* --- reporting ---
   The community takes something down, rather than one person having to let everything up.
   A report hides and never deletes, because hiding is reversible and the owner is the one
   who decides whether it stays hidden. */
console.log("\n--- reporting ---");
for (let i = 0; i < 2; i++)
  await call("POST", "/report", { body: { id: slug }, ip: "3.3.3." + i });
j = await jsonOf(await call("GET", "/designs"));
check(j.designs.length === 1, "two reports is not enough to hide anything");

let rep = await jsonOf(await call("POST", "/report", { body: { id: slug }, ip: "3.3.3.9" }));
check(rep.hidden === true, "the third report hides it");
j = await jsonOf(await call("GET", "/designs"));
check(j.designs.length === 0, "and it leaves the public list");

rep = await jsonOf(await call("POST", "/report", { body: { id: slug }, ip: "3.3.3.9" }));
check(rep.already === true, "the same reporter cannot report twice");

j = await jsonOf(await call("GET", "/admin/reported", { token: "secret" }));
check(j.designs.length === 1 && j.designs[0].reports === 3,
  "the owner can see what was reported, and the count that hid it");

await call("POST", "/admin/design", { body: { slug, action: "restore" }, token: "secret" });
j = await jsonOf(await call("GET", "/designs"));
check(j.designs.length === 1, "the owner can put it back");
j = await jsonOf(await call("GET", "/admin/reported", { token: "secret" }));
check(j.designs.length === 0,
  "and restoring clears the count, or the next single report hides it again");

console.log("\n--- moderation ---");
check((await call("GET", "/admin/pending")).status === 401, "admin needs the token");
check((await call("GET", "/admin/reported", { token: "wrong" })).status === 401, "a wrong token is refused");
j = await jsonOf(await call("GET", "/designs"));
check(j.designs[0].votes.up === 0 && j.designs[0].votes.down === 0, "it starts with no score");

console.log("\n--- voting ---");
j = await jsonOf(await call("POST", "/vote", { body: { id: slug, dir: 1 }, ip: "9.9.9.1" }));
check(j.up === 1 && j.you === 1, "an upvote counts");
j = await jsonOf(await call("POST", "/vote", { body: { id: slug, dir: 1 }, ip: "9.9.9.1" }));
check(j.up === 1, "the same person voting again does not double it");
j = await jsonOf(await call("POST", "/vote", { body: { id: slug, dir: -1 }, ip: "9.9.9.1" }));
check(j.up === 0 && j.down === 1, "changing your mind moves the vote, it does not add one");
j = await jsonOf(await call("POST", "/vote", { body: { id: slug, dir: 0 }, ip: "9.9.9.1" }));
check(j.down === 0, "taking your vote back removes it");
j = await jsonOf(await call("POST", "/vote", { body: { id: slug, dir: 1 }, ip: "9.9.9.2" }));
check(j.up === 1, "a different person votes independently");
check((await call("POST", "/vote", { body: { id: slug, dir: 5 } })).status === 400, "a nonsense direction is refused");
check(!JSON.stringify([...env.VOTES._m.keys()]).includes("9.9.9.1"), "no IP address is stored anywhere");

console.log("\n--- comments ---");
r = await call("POST", "/comment", { body: { design: slug, author: "someone", text: "Nice wall run." } });
check(r.status === 200, "a comment posts");
j = await jsonOf(await call("GET", "/comments?design=" + slug));
check(j.comments.length === 1 && j.comments[0].text === "Nice wall run.", "and reads back");
check((await call("POST", "/comment", { body: { design: "nope", text: "hi" } })).status === 404,
  "a comment on a design that does not exist is refused");
check((await call("POST", "/comment", { body: { design: slug, text: " " } })).status === 400,
  "an empty comment is refused");

const long = "x".repeat(5000);
await call("POST", "/comment", { body: { design: slug, text: long }, ip: "5.5.5.5" });
j = await jsonOf(await call("GET", "/comments?design=" + slug));
check(j.comments.some(c => c.text.length === 1500), "a very long comment is capped, not rejected");

r = await call("POST", "/comment", { body: { design: slug, text: "line1\nline2\u0007bell" }, ip: "6.6.6.6" });
j = await jsonOf(r);
check(!/[\u0000-\u001f]/.test(j.comment.text), "control characters are stripped");
check(j.comment.text === "line1 line2 bell", "and collapse to spaces", j.comment.text);

console.log("\n--- abuse limits ---");
env = { VOTES: fakeKV(), VOTE_SALT: "s", ADMIN_TOKEN: "secret" };
let blocked = 0;
for (let i = 0; i < 9; i++) {
  const rr = await call("POST", "/submit", { body: { name: "Spam " + i, code: CODE }, ip: "7.7.7.7" });
  if (rr.status === 429) blocked++;
}
check(blocked === 4, "submissions are capped per address per day (5 through, 4 blocked)", "blocked=" + blocked);

env = { VOTES: fakeKV(), VOTE_SALT: "s", ADMIN_TOKEN: "secret" };
j = await jsonOf(await call("POST", "/submit", { body: { name: "Base", code: CODE }, ip: "8.8.8.8" }));
await call("POST", "/admin/design", { body: { slug: j.slug, action: "approve" }, token: "secret" });
blocked = 0;
for (let i = 0; i < 14; i++) {
  const rr = await call("POST", "/comment", { body: { design: j.slug, text: "spam " + i }, ip: "8.8.8.9" });
  if (rr.status === 429) blocked++;
}
check(blocked === 4, "comments are capped per address per hour (10 through, 4 blocked)", "blocked=" + blocked);

console.log("\n--- deletion ---");
await call("POST", "/admin/design", { body: { slug: j.slug, action: "delete" }, token: "secret" });
const after = await jsonOf(await call("GET", "/designs"));
check(!after.designs.some(d => d.slug === j.slug), "the owner can delete a design outright");

console.log("\n--- cross-origin ---");
r = await call("GET", "/designs");
check(r.headers.get("Access-Control-Allow-Origin") === ORIGIN, "the site's own origin is allowed");
const other = await worker.fetch(new Request("https://votes.example.dev/designs",
  { headers: { Origin: "https://evil.example" } }), env);
check(other.headers.get("Access-Control-Allow-Origin") === ORIGIN,
  "another origin does not get itself echoed back");

/* ---- Discord sign-in ---- */
const enc = new TextEncoder();
const b64u = b => btoa(String.fromCharCode(...new Uint8Array(b)))
  .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
async function tokenFor(claims, secret = "s") {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const payload = b64u(enc.encode(JSON.stringify(claims)));
  return payload + "." + b64u(await crypto.subtle.sign("HMAC", key, enc.encode(payload)));
}
function callAs(token, method, path, body, ip = "1.2.3.4") {
  const headers = { Origin: ORIGIN, "CF-Connecting-IP": ip, Authorization: "Bearer " + token };
  return worker.fetch(new Request("https://votes.example.dev" + path, {
    method, headers, body: body === undefined ? undefined : JSON.stringify(body) }), env);
}

console.log("\n--- sign in: not configured ---");
env = { VOTES: fakeKV(), VOTE_SALT: "s", ADMIN_TOKEN: "secret" };
j = await jsonOf(await call("GET", "/me"));
check(j.loginEnabled === false && j.user === null, "reports itself off when unconfigured");
check((await call("POST", "/submit", { body: { name: "Open Base", code: CODE } })).status === 200,
  "and everything still works with no account");

console.log("\n--- sign in: configured ---");
env = { VOTES: fakeKV(), VOTE_SALT: "s", ADMIN_TOKEN: "secret",
        DISCORD_CLIENT_ID: "cid", DISCORD_CLIENT_SECRET: "csec" };
j = await jsonOf(await call("GET", "/me"));
check(j.loginEnabled === true, "reports itself on once configured");
check(j.needs.comment === true && j.needs.submit === true && j.needs.feedback === false,
  "comments and submissions gated, feedback left open");

r = await call("POST", "/submit", { body: { name: "Gated Base", code: CODE } });
j = await jsonOf(r);
check(r.status === 401 && j.needsLogin === true, "submitting signed out is refused");
check((await call("POST", "/feedback", { body: { kind: "bug", text: "reachable without an account" } })).status === 200,
  "feedback stays open to everyone");

const good = await tokenFor({ id: "42", name: "Tester", exp: Date.now() + 6e5 });
j = await jsonOf(await callAs(good, "GET", "/me"));
check(j.user && j.user.name === "Tester", "a valid token identifies the user");
j = await jsonOf(await callAs(good.slice(0, -4) + "aaaa", "GET", "/me"));
check(j.user === null, "a tampered signature is not signed in");
j = await jsonOf(await callAs(await tokenFor({ id: "42", name: "Old", exp: Date.now() - 1000 }), "GET", "/me"));
check(j.user === null, "an expired token is not signed in");
j = await jsonOf(await callAs(await tokenFor({ id: "9", name: "Forger", exp: Date.now() + 6e5 }, "wrong-secret"), "GET", "/me"));
check(j.user === null, "a token signed with the wrong secret is not signed in");

r = await callAs(good, "POST", "/submit", { name: "Signed Base", author: "typed-in-name", code: CODE });
j = await jsonOf(r);
check(r.status === 200, "submitting works once signed in");
// straight onto the public list now, so that is where to look for it
const filed = (await jsonOf(await call("GET", "/designs"))).designs.find(d => d.slug === j.slug);
check(filed.author === "Tester", "the account name is used, not what was typed in the form");
check(filed.by === undefined,
  "and the public list does not carry the submitter's account id");
check(filed.mine === undefined || filed.mine === false,
  "a reader who is not signed in is told nothing is theirs");
{
  const asOwner = (await jsonOf(await callAs(good, "GET", "/designs")))
    .designs.find(d => d.slug === j.slug);
  check(asOwner.mine === true, "the person who sent it is shown that it is theirs");
  check(asOwner.by === undefined, "still without handing back the account id");
  const asStranger = (await jsonOf(await callAs(
    await tokenFor({ id: "77", name: "Someone Else", exp: Date.now() + 6e5 }), "GET", "/designs")))
    .designs.find(d => d.slug === j.slug);
  check(asStranger.mine === false, "and somebody else is not");
}

/* Taking your own work back down. Publishing on arrival with no way to undo it leaves the
   person who runs the site as the only one who can remove what you posted, which makes a
   favour out of a decision that should be yours. */
{
  // its own submission, so withdrawing it does not pull the design later checks are using
  const mine = (await jsonOf(await callAs(good, "POST", "/submit",
    { name: "Mine To Remove", code: CODE }))).slug;
  check((await call("POST", "/withdraw", { body: { slug: mine } })).status === 401,
    "withdrawing signed out is refused");
  const stranger = await tokenFor({ id: "77", name: "Someone Else", exp: Date.now() + 6e5 });
  check((await callAs(stranger, "POST", "/withdraw", { slug: mine })).status === 403,
    "and somebody else cannot take down a design that is not theirs");
  check((await callAs(good, "POST", "/withdraw", { slug: "no-such-design-1" })).status === 404,
    "withdrawing something that is not there says so");

  // a comment and a vote to prove they go with it
  await callAs(good, "POST", "/comment", { design: mine, text: "mine to remove" });
  await callAs(good, "POST", "/vote", { id: mine, dir: 1 });

  check((await callAs(good, "POST", "/withdraw", { slug: mine })).status === 200,
    "the person who submitted it can take it down");
  const after = (await jsonOf(await call("GET", "/designs"))).designs.find(d => d.slug === mine);
  check(!after, "and it leaves the public list");
  check(!(await env.VOTES.get("design:" + mine)) && !(await env.VOTES.get("d:" + mine)),
    "the record and its votes are gone from storage, not just hidden");
  const leftovers = (await env.VOTES.list({ prefix: "c:" + mine + ":" })).keys.length;
  check(leftovers === 0,
    "and so are its comments, which used to be orphaned under a slug nothing could reach",
    leftovers + " left behind");
}
check((await call("POST", "/comment", { body: { design: j.slug, text: "signed out" } })).status === 401,
  "commenting signed out is refused");
check((await callAs(good, "POST", "/comment", { design: j.slug, text: "signed in" })).status === 200,
  "and works once signed in");

/* The comment list used to hand back each stored record exactly as written, which put `by`,
   the commenter's Discord id, into a response anybody could read without signing in at all.
   /designs strips that same field and says why; this route was written later and never got
   the same treatment, so the id the design list is careful about was public one route over. */
{
  const posted = await jsonOf(await callAs(good, "POST", "/comment",
    { design: j.slug, text: "who wrote this" }));
  check(posted.comment && posted.comment.by === undefined,
    "posting a comment does not echo the account id back");

  const list = await jsonOf(await call("GET", "/comments?design=" + j.slug));
  const signed = list.comments.find(c => c.text === "who wrote this");
  check(signed && signed.author === "Tester", "a signed-in comment is still credited by name");
  check(list.comments.every(c => c.by === undefined),
    "and the public comment list carries no account ids");
  check(!JSON.stringify(list).includes('"42"'),
    "the Discord id is nowhere in the response at all");
}

r = await worker.fetch(new Request(
  "https://votes.example.dev/auth/start?return=https://evil.example/steal",
  { headers: { Origin: ORIGIN } }), env);
check(r.status === 302 && /discord\.com/.test(r.headers.get("Location") || ""),
  "sign-in redirects to Discord");
const loc = new URL(r.headers.get("Location"));
check(loc.searchParams.get("scope") === "identify", "asks for identify only, never email");

const unb64u = s => {
  const p = String(s).replace(/-/g, "+").replace(/_/g, "/");
  return new TextDecoder().decode(Uint8Array.from(
    atob(p + "=".repeat((4 - p.length % 4) % 4)), c => c.charCodeAt(0)));
};
// state is payload.signature now, and the payload is JSON carrying the return address
const stateBack = state => JSON.parse(unb64u(String(state).split(".")[0])).back;
const startsAt = async back => {
  const rr = await worker.fetch(new Request(
    "https://votes.example.dev/auth/start?return=" + encodeURIComponent(back),
    { headers: { Origin: ORIGIN } }), env);
  return stateBack(new URL(rr.headers.get("Location")).searchParams.get("state"));
};
check(await startsAt("https://evil.example/steal") === ORIGIN,
  "and refuses to carry an off-site return address");

/* The return address is where the new session token gets appended, so "starts with the right
   characters" is not the same question as "is this site". Every one of these passes a prefix
   test against an allowed origin and belongs to somebody else. The first two are how you get
   handed a stranger's session: ask to be sent home, be sent next door. */
for (const bad of [
  "https://www.wardogsbuilder.com.evil.example/steal",
  "https://www.wardogsbuilder.com@evil.example/steal",
  "https://wardogsbuilder.com.evil.example/",
  "https://www.wardogsbuilder.com.evil.example",
  "javascript:alert(1)",
  "not-a-url-at-all",
]) {
  check(await startsAt(bad) === ORIGIN,
    "a lookalike return address is refused: " + bad, "kept " + await startsAt(bad));
}
check(await startsAt("https://www.wardogsbuilder.com/designs/") ===
  "https://www.wardogsbuilder.com/designs/", "a real page on the site is still carried back");

/* A callback carrying a state this worker never minted is not a sign-in that started here.
   Nothing used to tie the two together: state was the return address alone, base64url'd,
   which anyone could write for themselves. */
{
  const forged = b64u(enc.encode(JSON.stringify({ back: "https://evil.example/steal", n: "x" })))
    + ".QUFBQQ";
  const rr = await worker.fetch(new Request(
    "https://votes.example.dev/auth/callback?state=" + encodeURIComponent(forged),
    { headers: { Origin: ORIGIN } }), env);
  const where = rr.headers.get("Location") || "";
  check(where.startsWith(ORIGIN) && !where.includes("evil.example"),
    "a callback state the worker did not sign is not followed", where);
}

r = await call("OPTIONS", "/comment");
check((r.headers.get("Access-Control-Allow-Headers") || "").includes("Authorization"),
  "CORS lets the Authorization header through");

console.log("\n--- saving your own designs online ---");
env = { VOTES: fakeKV(), VOTE_SALT: "s", ADMIN_TOKEN: "secret",
        DISCORD_CLIENT_ID: "cid", DISCORD_CLIENT_SECRET: "csec" };
const me = await tokenFor({ id: "77", name: "Saver", exp: Date.now() + 6e5 });
const you = await tokenFor({ id: "88", name: "Other", exp: Date.now() + 6e5 });

check((await call("GET", "/mine")).status === 401, "saving online needs an account");

r = await callAs(me, "POST", "/mine", { name: "My FOB", code: CODE });
check(r.status === 200, "a signed-in player can save one");
j = await jsonOf(await callAs(me, "GET", "/mine"));
check(j.designs.length === 1 && j.designs[0].name === "My FOB", "and read it back");

await callAs(me, "POST", "/mine", { name: "My FOB", code: CODE });
j = await jsonOf(await callAs(me, "GET", "/mine"));
check(j.designs.length === 1, "saving the same name updates rather than duplicating");

j = await jsonOf(await callAs(you, "GET", "/mine"));
check(j.designs.length === 0, "one player cannot see another player's saves");

await callAs(me, "POST", "/mine/delete", { name: "My FOB" });
j = await jsonOf(await callAs(me, "GET", "/mine"));
check(j.designs.length === 0, "and can delete one");

for (let i = 0; i < 41; i++) await callAs(me, "POST", "/mine", { name: "Slot " + i, code: CODE });
j = await jsonOf(await callAs(me, "GET", "/mine"));
check(j.designs.length === 40, "the per-player cap holds at 40", "got " + j.designs.length);
r = await callAs(me, "POST", "/mine", { name: "One too many", code: CODE });
check(r.status === 400, "and the 41st is refused with a reason");

check((await callAs(me, "POST", "/mine", { name: "Bad", code: "nope" })).status === 400,
  "a code that will not decode is not stored");

/* --- a real base has to fit ---
   The cap was 8000 characters on the strength of a comment saying a very large base
   encodes well under it. A share code runs about 20.5 characters per piece, so that was a
   cap of roughly 390 pieces, and a real 607-piece base was refused and told it "will not
   encode" when it had encoded perfectly well. Pin the sizes that matter and pin the two
   messages apart, because sending somebody to look for a corruption that is not there is
   the part that cost an evening. */
{
  const codeOf = pieces => "A".repeat(Math.round(pieces * 20.5));
  // `me` is sitting on the 40-save cap from the block above, which would refuse these for
  // an unrelated reason and quietly prove nothing. Fresh player.
  const big2 = await tokenFor({ id: "78", name: "Bigbase", exp: Date.now() + 6e5 });
  const me = big2;

  const big = await callAs(me, "POST", "/mine", { name: "Real base", code: codeOf(607) });
  check(big.status === 200, "a 607 piece base saves online", "got " + big.status);

  const huge = await callAs(me, "POST", "/mine", { name: "Huge base", code: codeOf(4000) });
  check(huge.status === 200, "so does a 4,000 piece one", "got " + huge.status);

  const absurd = await callAs(me, "POST", "/mine", { name: "Absurd", code: codeOf(20000) });
  check(absurd.status === 400, "20,000 pieces is still refused, so the cap is a cap");
  const msg = (await jsonOf(absurd)).error || "";
  check(/too large/i.test(msg) && /limit/i.test(msg),
    "and it says the design is too large rather than blaming the encoding", msg);

  /* A v2 code carries a leading ~, which is outside the base64url alphabet on purpose so it
     can never be confused with v1. This validator was written before v2 existed and rejected
     every one of them, so the moment the planner started sending v2 no design could be saved
     online at all. The format lives in four places, not three. */
  const v2 = "~" + "A".repeat(200);
  const v2res = await callAs(me, "POST", "/mine", { name: "V2 code", code: v2 });
  check(v2res.status === 200, "a v2 code with its leading tilde is accepted", "got " + v2res.status);
  check((await jsonOf(await callAs(me, "GET", "/mine"))).designs.some(d => d.name === "V2 code"),
    "and comes back out of the store intact");
  const twoTildes = await callAs(me, "POST", "/mine", { name: "Bad tilde", code: "~~" + "A".repeat(200) });
  check(twoTildes.status === 400, "but only one tilde, and only at the front");

  const junk = (await jsonOf(await callAs(me, "POST", "/mine", { name: "Junk", code: "!!!!" }))).error || "";
  check(/does not look right/i.test(junk),
    "a malformed code gets the other message, not the size one", junk);
}

/* --- it refuses to run on a secret anybody can read ---
   The session signing key and the identity salt both used to fall back to the literal string
   "wardogs" when neither secret was set. That string is written in worker/vote-worker.js, which
   is a public file in a public repository, so a deploy that was missing its secrets signed
   sessions with a key anyone could look up, and anyone could have minted themselves a token for
   any account, the owner's included. Nothing about that deploy would have looked wrong. */
console.log("\n--- no secret configured ---");
{
  const bare = { VOTES: fakeKV(), ADMIN_TOKEN: "secret" };
  const at = (method, path, headers = {}) => worker.fetch(new Request(
    "https://votes.example.dev" + path,
    { method, headers: { Origin: ORIGIN, "CF-Connecting-IP": "1.2.3.4", ...headers } }), bare);

  check((await at("GET", "/designs")).status === 503,
    "a worker with no secret set refuses to serve rather than serving something forgeable");
  check((await at("GET", "/me")).status === 503, "including the route that says who you are");

  const forged = await tokenFor({ id: "1", name: "Forger", exp: Date.now() + 6e5 }, "wardogs");
  check((await at("GET", "/me", { Authorization: "Bearer " + forged })).status === 503,
    "and a token signed with the old public fallback gets nowhere");

  // and with a real secret set, that same token is simply not a session
  const salted = { VOTES: fakeKV(), VOTE_SALT: "s", ADMIN_TOKEN: "secret" };
  const asForger = await (await worker.fetch(new Request("https://votes.example.dev/me",
    { headers: { Origin: ORIGIN, Authorization: "Bearer " + forged } }), salted)).json();
  check(asForger.user === null, 'a token signed with "wardogs" is not signed in');
}

/* --- a body nothing has to swallow whole --- */
console.log("\n--- oversized request ---");
{
  env = { VOTES: fakeKV(), VOTE_SALT: "s", ADMIN_TOKEN: "secret" };
  const r413 = await call("POST", "/submit", { body: { name: "Huge", code: "A".repeat(700000) } });
  check(r413.status === 413, "a body past the ceiling is refused before it is parsed",
    "got " + r413.status);

  /* but the ceiling sits well clear of the largest real request, so an oversized design still
     gets the message that names its size instead of one that can only say "too much" */
  const big = await call("POST", "/submit", { body: { name: "Absurd", code: "A".repeat(410000) } });
  const msg = (await jsonOf(big)).error || "";
  check(big.status === 400 && /too large/i.test(msg) && /limit/i.test(msg),
    "and a merely oversized design still gets the message about its size", msg);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
