---
type: process
status: verified 2026-08-30
consumes: [vote-worker, share-code]
produces: [build-config, page-module]
---

# publish-a-design

A player's base becomes a page on the site, through a person.

## Input → Movement → Output

Someone signed in submits a share link. It sits pending in the worker until approved at
`/moderate/`. Approved designs are pulled into `data/community.json`, and the next build
turns each into its own page with votes and comments.

## Why this shape

The human gate is the whole point. Anything that reaches the site is something a person
chose to put there, so the worst case for spam is a queue nobody has emptied rather than
rubbish on the site. Discord sign-in makes submitting cost something; rate limits cap it at
five a day.

Votes deliberately do **not** live in the repo. They come from the worker at runtime, so the
ranking cannot be quietly edited by whoever owns the repository.

## Steps

1. Player submits at `/designs/`, signed in. Worker stores it pending.
2. Owner reviews at `/moderate/` and approves. The page is `noindex` and unlinked; the admin
   token is typed in and kept in that browser, and the worker is what actually checks it.
3. `node tools/pull-community.js` writes approved designs into `data/community.json`.
4. `powershell -File build.ps1` generates a page per design and sweeps any that were removed.

## If you change this

- **Hits:** removing a design from `community.json` must go through the build, because
  `sweepDesignPages()` is what deletes the old page. Deleting the entry alone leaves the
  page live, reachable and indexed.
- **Does not hit:** the votes. They stay in the worker whatever the repo says, so
  unpublishing a design does not erase its history.

## Surfaces

| Surface | Role |
|---|---|
| players | submit, vote, comment |
| the owner | approves |
| `tools/pull-community.js` | writes `community.json` |

## See

- Objects: [vote-worker](../objects/service/vote-worker.md), [share-code](../objects/planner/share-code.md)
- Source: `tools/pull-community.js`, `worker/vote-worker.js`
