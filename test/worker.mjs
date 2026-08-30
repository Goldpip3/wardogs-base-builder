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
check(r.status === 200 && j.ok && j.status === "pending", "a submission is accepted as pending");
const slug = j.slug;
check(/^my-base-[a-z0-9]{4}$/.test(slug), "slug is derived from the name", slug);

check((await call("POST", "/submit", { body: { name: "ok name", code: "not a code!!" } })).status === 400,
  "a bad share code is rejected");
check((await call("POST", "/submit", { body: { name: "x", code: CODE } })).status === 400,
  "a too-short name is rejected");

j = await jsonOf(await call("GET", "/designs"));
check(j.designs.length === 0, "a pending design is NOT public");

console.log("\n--- moderation ---");
check((await call("GET", "/admin/pending")).status === 401, "admin needs the token");
check((await call("GET", "/admin/pending", { token: "wrong" })).status === 401, "a wrong token is refused");
j = await jsonOf(await call("GET", "/admin/pending", { token: "secret" }));
check(j.designs.length === 1 && j.designs[0].slug === slug, "the owner can see what is pending");

await call("POST", "/admin/design", { body: { slug, action: "approve" }, token: "secret" });
j = await jsonOf(await call("GET", "/designs"));
check(j.designs.length === 1 && j.designs[0].slug === slug, "once approved it is public");
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
const filed = (await jsonOf(await call("GET", "/admin/pending", { token: "secret" })))
  .designs.find(d => d.slug === j.slug);
check(filed.author === "Tester", "the account name is used, not what was typed in the form");
check(filed.by === "42", "and the record says which account sent it");

await call("POST", "/admin/design", { body: { slug: j.slug, action: "approve" }, token: "secret" });
check((await call("POST", "/comment", { body: { design: j.slug, text: "signed out" } })).status === 401,
  "commenting signed out is refused");
check((await callAs(good, "POST", "/comment", { design: j.slug, text: "signed in" })).status === 200,
  "and works once signed in");

r = await worker.fetch(new Request(
  "https://votes.example.dev/auth/start?return=https://evil.example/steal",
  { headers: { Origin: ORIGIN } }), env);
check(r.status === 302 && /discord\.com/.test(r.headers.get("Location") || ""),
  "sign-in redirects to Discord");
const loc = new URL(r.headers.get("Location"));
check(loc.searchParams.get("scope") === "identify", "asks for identify only, never email");
const backTo = new TextDecoder().decode(Uint8Array.from(
  atob(loc.searchParams.get("state").replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0)));
check(!backTo.includes("evil.example"),
  "and refuses to carry an off-site return address", backTo);

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

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
