# Nouns

One line each. Open the card, not this file, to act.

## data: I want to change a number

| Noun | Owns | Status |
|---|---|---|
| [buildables-catalog](data/buildables-catalog.md) | `data/buildables.json`, 20 buildables | verified 2026-08-30 |
| [derived-data](data/derived-data.md) | `data/ballistics.json`, `data/armory.json` | verified 2026-08-30 |
| [build-config](data/build-config.md) | `data/community.json`, `data/ads.json` | verified 2026-08-30 |
| [artillery-data](data/artillery-data.md) | `data/artillery.json`, one firing table | verified 2026-08-30 |

## planner: I want to change the tool

| Noun | Owns | Status |
|---|---|---|
| [planner-app](planner/planner-app.md) | `src/app-template.html` | verified 2026-08-30 |
| [share-code](planner/share-code.md) | the design URL format, in two homes | verified 2026-08-30 |

## site: I want to change the website

| Noun | Owns | Status |
|---|---|---|
| [site-context](site/site-context.md) | `tools/site/context.js` | verified 2026-08-30 |
| [page-module](site/page-module.md) | `tools/site/pages/*.js`, 10 of them | verified 2026-08-30 |

## service: I want to change something with a server

| Noun | Owns | Status |
|---|---|---|
| [vote-worker](service/vote-worker.md) | `worker/vote-worker.js`, 18 routes | verified 2026-08-30 |

## guards: why did the build fail

| Noun | Owns | Status |
|---|---|---|
| [verification](guards/verification.md) | `tools/check-build.js`, `test/` | verified 2026-08-30 |

## Deliberately not carded

- `assets/icons/`: art. Referenced by id from the catalog; no behaviour of its own.
- `tools/make-icons.js`, `tools/make-cover.ps1`: one-off asset tools, not on the build path.
- `migrate.ps1`: moves the repo to another GitHub account. Run once, if ever.
- `docs/`: output. See [planner-app](planner/planner-app.md) and [page-module](site/page-module.md).
