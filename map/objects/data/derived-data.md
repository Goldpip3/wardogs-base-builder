---
type: object
cluster: data
universe: live
status: verified 2026-08-30
entity: data/ballistics.json
---

# Derived data

`data/ballistics.json` (28 weapons, 12 calibres) and `data/armory.json` (331 vendor items).
Both are **generated and checked**, not hand-maintained. Editing either by hand is a change
the next build will either overwrite or refuse.

## Why this shape

Vendor prices are transcribed, so `tools/build-armory.js` holds the transcription as plain
lines and emits the JSON. Lines are hard to break; three hundred hand-written JSON objects
are not, and a missing comma in the middle is a silent corruption.

Damage is not transcribed at all. Shots-to-kill is a *bound*, not a value, so
`tools/solve-ballistics.js` intersects the bounds from five armour tiers to pin each
weapon's damage, then proves the result three ways: two figures published in a different
table must land inside their derived intervals, all 140 published shots-to-kill numbers must
reproduce, and fire rates must reproduce the published times to kill. `build.ps1:83` fails
the build if any of that stops holding.

That is the load-bearing part. The numbers are only publishable because the derivation is
falsifiable, so **never loosen a check to make a number fit**.

## Shape

- `ballistics.json`: `health`, `rounds[].blocks` (armour), `calibres[]`, `zones[].mult`,
  `weapons[]` with `torso`, `range` (the derived interval) and `rpm`; plus `unsolved[]`
- `armory.json`: `categories[]`, `items[]` with `price` (`null` when unconfirmed) and `per`

Citations: `tools/solve-ballistics.js`, `tools/build-armory.js`, gated at `build.ps1:83`.

## Connected to

- **owns:** `/ballistics/`, `/armory/`, `/loadouts/`, `/vehicles/`
- **owned-by:** the public sources named in `docs/ballistics-sources.md`
- **joins:** [page-module](../site/page-module.md)
- **looks-like-but-is-not:** [buildables-catalog](buildables-catalog.md), which *is*
  hand-edited. Opposite rule, same folder.

## If you change this

- **Hits:** run the generator, not the file. `node tools/build-armory.js` for armory;
  edit the transcription block inside it, never the JSON. For ballistics, edit the published
  rows in `tools/solve-ballistics.js` and let the checks re-derive.
- **Does not hit:** the planner. Neither file is inlined into it, and the downloadable
  planner does not know these exist.

## Surfaces

| Surface | Role |
|---|---|
| `tools/build-armory.js` | writes `armory.json` |
| `tools/solve-ballistics.js` | verifies `ballistics.json`, does not write it |
| `tools/site/pages/ballistics.js`, `armory.js` | read |

## See

- Source: `tools/solve-ballistics.js`, `tools/build-armory.js`
- Derivation and its two open holes: `docs/ballistics-sources.md`
