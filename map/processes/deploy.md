---
type: process
status: verified 2026-08-30
consumes: [page-module, planner-app, vote-worker]
produces: []
---

# deploy

Two separate deploys that people keep assuming are one.

## Input → Movement → Output

Pushing to `main` ships the site, because GitHub Pages serves `docs/` from the default
branch. The worker ships only when you run `wrangler deploy`, from `worker/`. Neither
triggers the other.

## Why this shape

There is no CI. `build.ps1` runs on the machine you are sitting at, and `docs/` is committed
output, so **a push ships whatever `docs/` was last built with**. Pushing without building
publishes stale pages that pass every check, because the checks already ran against the old
output.

Telling someone a worker change needs no deploy has been wrong twice in this project. If
`worker/vote-worker.js` changed, it needs `wrangler deploy` or nothing you changed is live.

## Steps

1. `powershell -File build.ps1`. Never push without this.
2. `git push`. Pages picks up `docs/` within a minute or two.
3. Only if `worker/` changed, one command, no `cd`:

   ```
   wrangler deploy --config "C:\Users\colom\Claude Projects\Wardogs builder\worker\wrangler.toml"
   ```

   The owner's terminal is **cmd.exe**, where `;` is not a separator, so a `cd X; y`
   one-liner is read as a single path and fails with "the system cannot find the path
   specified". That has been handed over wrong once. Give cmd-safe commands, one per block.
   `wrangler deploy --dry-run --config <same>` builds without shipping, which is worth
   running before handing the real one over.
4. Verify against the live URL, not localhost, and bypass the cache. A stale render in a
   browser tab has twice looked like a broken deploy when the served bytes were correct.

## If you change this

- **Hits:** `docs/CNAME` claims `www.wardogsbuilder.com`. Claiming a domain whose DNS does
  not resolve makes Pages redirect the working `github.io` URL into a dead end and takes the
  whole site offline. Leave it empty until DNS is live.
- **Does not hit:** the downloadable planner. Anyone holding a copy keeps it working
  regardless of what happens here.

## Surfaces

| Surface | Role |
|---|---|
| GitHub Pages | serves `docs/` |
| Cloudflare | runs the worker |

## See

- Objects: [vote-worker](../objects/service/vote-worker.md), [build-config](../objects/data/build-config.md)
- Source: `build.ps1`, `worker/wrangler.toml`
