---
type: object
cluster: data
universe: live
status: verified 2026-08-30
entity: data/community.json
---

# Build config

Two small files that are not data but **switches**: they change what the build emits.
`data/community.json` carries `voteApi`; `data/ads.json` carries `publisherId` and slots.

## Why this shape

Both default to empty, and empty means the feature does not ship at all rather than shipping
broken. With no `voteApi` there is no sign-in, no account page, no moderation page, and the
planner has no cloud save. With no `publisherId` there is no ad script, no slot, no reserved
space, and `docs/ads.txt` is actively deleted, because an ads.txt naming nobody is worse
than none.

`publisherId` is in its own file for one specific reason: the buildables catalog is inlined
whole into the downloadable planner, so anything in it travels inside the file people keep.
An advertising identity has no business in an offline tool. `tools/check-build.js` asserts
the planner carries no publisher id, which is what stops that being re-merged by accident.

## Shape

- `community.json`: `voteApi` (worker origin), `designs[]` (slug + share code)
- `ads.json`: `publisherId`, `slots{}`

Citations: `build.ps1:44` reads `voteApi`; injected at `build.ps1:61` and only there.

## Connected to

- **owns:** whether the hosted planner can save online; whether ads exist
- **joins:** [vote-worker](../service/vote-worker.md), [planner-app](../planner/planner-app.md)
- **looks-like-but-is-not:** [buildables-catalog](buildables-catalog.md). That is data the
  product is about; this is configuration the build reads.

## If you change this

- **Hits:** setting `voteApi` turns on `/account/` and `/moderate/` (both `noindex`), the
  header sign-in on every page, and cloud save in the hosted planner only. Setting
  `publisherId` writes `docs/ads.txt` and adds the ad script to content pages.
- **Does not hit:** `WardogsBaseBuilder.html`. The downloadable build gets an empty string
  for the API and no ad code, always, and two checks enforce it. Adding designs to
  `community.json` also does not touch the worker, which stores votes separately.

## Surfaces

| Surface | Role |
|---|---|
| `build.ps1` | reads both, injects into the hosted build only |
| `tools/pull-community.js` | writes approved designs into `community.json` |
| `tools/check-build.js` | asserts the offline build stayed clean |

## See

- Source: `data/community.json`, `data/ads.json`
