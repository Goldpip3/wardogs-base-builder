---
type: object
cluster: data
universe: live
status: verified 2026-08-31
entity: data/game-icons.json
---

# Game icons

`data/game-icons.json` and the PNGs under `docs/game-icons/`, both written by
`tools/pull-game-icons.js`. Manual like `pull-community.js`, never part of the build,
which stays offline.

## Why this shape

Committed straight into `docs/`, the map-tiles single-copy pattern: `docs/` is itself
committed, so an `assets/` staging copy would store every PNG twice.

`tools/build-armory.js` joins items to slugs by name, with hand-kept `ICON_OVERRIDES` for
the rest. An override to `null` is an honest gap, the wiki having no icon nameable as that
item without guessing (most mounted guns).

## Shape

- `items[]`: `slug`, `name`, `cat`, `hasIcon`. 565 items, 495 with a file, 70 with none
- `docs/game-icons/<slug>.png`, 25 MB for the set
- A matched `data/armory.json` item carries `icon`. 323 of 331 do

## Refresh

`pull-game-icons.js --refresh`, then `build-armory.js`, then `build.ps1`. The catalog only
adds or updates; removing an icon is done by hand, entry and file together.

## Connected to

- **feeds:** [derived-data](derived-data.md), which owns `data/armory.json`

## If you change this

- **Hits:** `/loadouts/`, an icon per slot, and `/ballistics/`, the weapon art and the
  ranking rows. Check 3e in `tools/check-build.js` fails on a slug with no file, a page
  reference with no file, a file outside the catalog, or a catalog entry claiming a file
  that is absent.
- **Does not hit:** the planner, which must never name one. Also 3e: a planner fetching an
  image is a planner that is no longer offline.

## Surfaces

| Surface | Role |
|---|---|
| `tools/pull-game-icons.js` | fetches, catalogs |
| `tools/build-armory.js` | joins items to slugs |
| `tools/site/pages/armory.js` | renders |

## See

- Catalog `data/game-icons.json`, files `docs/game-icons/`
- Source: the wardogs.zone wiki, `/game/icons/<slug>.png`
