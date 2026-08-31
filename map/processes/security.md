---
type: process
status: verified 2026-08-31
consumes: [vote-worker, page-module, planner-app]
produces: []
---

# security

What protects this site, what cannot, and the one change that would raise the ceiling.

## Input → Movement → Output

Two surfaces, and they are not equally exposed.

The **site** is static files on GitHub Pages. It takes no input, stores nothing, and runs no
code that anybody else can reach. Its whole security story is "there is nothing there to
break into".

The **worker** is the entire dynamic surface: it is the only thing that authenticates people,
holds data, and accepts writes. Everything worth attacking is behind
`worker/vote-worker.js`, which is why that is where the work went.

## Why this shape

### The worker fails closed

The signing key for sessions and the salt for identity hashes both used to end in
`|| "wardogs"`. A deploy missing its secrets therefore came up fine and signed every session
with a key written in a public file, so anybody who read the repo could mint a token for any
account, the owner's included, and nothing about that deploy looked wrong from outside.

Missing secrets now return 503 for every route. A service that is plainly down gets fixed; one
that is quietly forgeable does not. `VOTE_SALT` is required, not optional.
`tools/check-build.js` fails the build if any `env.SECRET || "literal"` reappears, because a
default is exactly what is tempting to write the next time a deploy will not come up.

### Sign-in only hands the token back to this site

The post-login return address was checked with `back.startsWith(allowedOrigin)`, and the fresh
session token is appended to whatever comes out of that check.
`https://www.wardogsbuilder.com.example.net/` passes a prefix test and belongs to somebody
else, so asking to be sent home got you sent next door with a token in your hand. Origins are
parsed and compared now, and the `state` parameter is signed so a callback the worker did not
start is not followed.

### Private fields are listed, not deleted

`GET /designs` stripped the submitter's Discord id. `GET /comments`, written later, did not,
so the field one route was careful about was public one route over. Both now go out through a
projection that names the fields that leave, so the next field added to a stored record is
private until somebody decides otherwise.

## What this cannot do

GitHub Pages cannot set a response header. Not one. So the site has no
Content-Security-Policy, no HSTS, no `X-Frame-Options`, no hotlink rule and no rate limit, and
no amount of editing the generator will change that. `tools/site/shell.js` sets `referrer`,
which is one of the few a meta tag actually carries, and deliberately sets nothing else: a
meta CSP this markup could satisfy would have to allow `'unsafe-inline'` and would be a policy
in name only, and the rest do nothing from a meta tag at all.

Asset protection is in the same position and is worth less than it looks. `docs/game-icons/`
and `docs/maps/tiles/` are 132 MB of the game's own art, held here so the project does not
hotlink anyone (`data/artillery-maps.json:3`). Every address is enumerable from data that
ships in the page. The only original artwork, `assets/icons/`, is base64 inlined into the
planner and is never served as a file at all, which is the one asset measure that actually
holds. `docs/robots.txt` asks the training crawlers to stay out; that is a request to parties
who mostly honour it, not a control, and it is written down as such in
`tools/site/pages/sitemap.js`.

## The follow-up, not yet run

Cloudflare already runs the worker and holds the DNS for `wardogsbuilder.com`, but the records
are DNS-only, so nothing sits in front of GitHub Pages. Proxying them is the single change
that lifts every limit above, and it needs dashboard work rather than a commit, which is why
it is written here rather than done.

1. Flip the `www` and apex records to proxied (orange cloud). GitHub Pages stays the origin.
2. Add a Response Header Transform Rule for `Strict-Transport-Security`,
   `X-Content-Type-Options`, `X-Frame-Options: DENY` and `Permissions-Policy`.
3. Content-Security-Policy needs the inline scripts audited first. Every page ships inline
   `<style>` and several inline `<script>` blocks, so this means either hashes or an
   edge-injected nonce. Do not ship a policy with `'unsafe-inline'` and call it done.
4. Hotlink protection scoped to `/game-icons/*` and `/maps/tiles/*`, and a rate-limiting rule.
5. Optionally route the worker at `www.wardogsbuilder.com/api/*`. This removes the
   cross-origin token-in-the-fragment handoff and stops publishing the `workers.dev` origin.
   It touches `data/community.json`, the CORS allowlist in `worker/vote-worker.js`, and the
   share format's four homes, so it is its own change and not a side effect of step 1.

Step 1 reintroduces a caching layer in front of a site that already catches people out with
GitHub's ten minute `max-age` (`CLAUDE.md`). Expect to purge the Cloudflare cache as well as
wait, and keep checking the live `build.txt` against `docs/build.txt` before believing a fix
has shipped.

## Verified by

`test/worker.mjs` covers the lot: the 503 when no secret is set, a token signed with the old
public fallback getting nowhere, six lookalike return addresses being refused, an unsigned
callback state not being followed, the comment list carrying no account ids, and an oversized
body being turned away before it is parsed. Each of those was watched failing against the
unfixed code before it was trusted, per
[objects/guards/verification.md](../objects/guards/verification.md).
