---
type: object
cluster: service
universe: live
status: verified 2026-08-31
entity: worker/vote-worker.js
---

# Vote worker

The only moving part. A Cloudflare Worker over KV carrying sign-in, community submissions,
votes, comments, feedback, per-account design saves and moderation. Named for votes; it long
ago stopped being only that.

## Why this shape

Everything else in this repo is static files on GitHub Pages. Anything needing state needs a
server, and this is the smallest one that does the job: one worker, one KV namespace, no
database.

Sessions are **HMAC-signed tokens in localStorage, sent as a Bearer header, not cookies.**
The site and the worker are different origins and third-party cookies are blocked, so a
cookie session would work in testing and fail for real users. The token comes back from
Discord OAuth in the URL *fragment*, so it never reaches a server log.

Discord sign-in exists to make submission cost something. `identify` scope only: no email,
no guilds.

**It refuses to run without its secrets.** `VOTE_SALT` is required. With neither it nor
`SESSION_SECRET` set, every route answers 503. Both used to fall back to a string written in
the worker itself, which is a public file, so a deploy that had lost its secrets signed
sessions with a key anybody could read. See [security](../../processes/security.md).

**`OWNER_DISCORD_ID` says which account is the owner's, and authorises nothing.** `/me`
returns `owner: true` to that Discord id alone, which is what puts Moderate and To do in the
account menu and what opens `/todo/`. It is deliberately an identity and not a credential:
an admin route still wants `ADMIN_TOKEN`, and `test/worker.mjs` holds it to that. Unset, and
nobody is the owner, so an unconfigured deploy shows the owner's pages to no one rather than
to everyone.

The comparison is on the id, never on the display name. `/todo/` used to compare names, and
a Discord name is something anybody can change to yours in seconds.

## Shape

Routes dispatched off a trimmed pathname in `fetch` at `worker/vote-worker.js:382`:

- open to anyone: `/me`, `/auth/start`, `/auth/callback`, `/designs`, `/votes`, `/comments`,
  `/report`, `/vote`, `/feedback`
- needs an account: `/submit`, `/comment`, `/withdraw`, `/mine`, `/mine/delete`
- admin: `/admin/reported`, `/admin/pending`, `/admin/design`, `/admin/comment`,
  `/admin/feedback`, `/admin/feedback/delete`

`/feedback` is open on purpose (`NEEDS_LOGIN.feedback` is `false`): nothing sent through it is
ever published, so there is no audience for a spammer, and a login in front of a bug report is
how you stop hearing about bugs.

Rate limits: 5 submits a day, 10 comments an hour, 6 feedback an hour, 40 saved designs
per account. A request body over `LIMITS.bodyBytes` is refused before it is parsed.

Responses name the fields that go out rather than deleting the ones that must not. `by`, the
Discord id on a design or a comment, never leaves.

## Connected to

- **owns:** all server-side state
- **owned-by:** [build-config](../data/build-config.md); its origin is `voteApi`
- **joins:** [share-code](../planner/share-code.md), stored opaque and never parsed
- **looks-like-but-is-not:** `data/community.json`. That is the *published* list, in the
  repo. The worker holds what has been submitted and how it was voted on. They are synced
  deliberately, by [publish-a-design](../../processes/publish-a-design.md).

## If you change this

- **Hits:** nothing until you deploy it. `build.ps1` does not touch the worker and pushing
  to GitHub does not either. It ships with `wrangler deploy`, from `worker/`, separately.
  Telling someone "no deploy needed" after changing this file has been wrong twice.
- **Does not hit:** the downloadable planner, which cannot reach it at all. A broken worker
  degrades the site; it cannot break the offline tool.

## Surfaces

| Surface | Role |
|---|---|
| hosted planner, site pages | read and write over HTTPS |
| `tools/pull-community.js` | reads approved designs |
| `test/worker.mjs` | checks against a fake KV, no Cloudflare involved |

## Looking inside it

```
wrangler kv key list --namespace-id <id> --remote --config worker/wrangler.toml
wrangler kv key get "design:<slug>" --namespace-id <id> --remote --config worker/wrangler.toml
```

**`--remote` is not optional.** Without it wrangler reads a local emulated store, which on
a machine that has never run `wrangler dev` is empty, and reports that emptiness with no
warning. That happened: a submission that had worked perfectly was diagnosed as never having
reached storage, on the strength of a listing that was reading nothing at all. If a KV query
says empty, check the flag before you believe it.

`wrangler deployments list` and `wrangler secret list` are the other two read-only ways to
see what is actually live. Neither needs `--remote`.

## See

- Source: `worker/vote-worker.js`, config `worker/wrangler.toml`
