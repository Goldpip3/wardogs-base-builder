---
type: object
cluster: service
universe: live
status: verified 2026-08-30
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

## Shape

18 routes at `worker/vote-worker.js:223`, dispatched off a trimmed pathname:

- public: `/me`, `/auth/start`, `/auth/callback`, `/designs`, `/votes`, `/comments`
- signed in: `/submit`, `/vote`, `/comment`, `/feedback`, `/mine`, `/mine/delete`
- admin: `/admin/pending`, `/admin/design`, `/admin/comment`, `/admin/feedback`, `/admin/feedback/delete`

Rate limits: 5 submits a day, 10 comments an hour, 6 feedback an hour, 40 saved designs
per account.

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
