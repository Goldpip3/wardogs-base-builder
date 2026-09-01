---
type: object
cluster: planner
universe: live
status: verified 2026-08-30
entity: src/app-template.html
---

# Planner app

The tool itself: one HTML file, no framework, no dependency. Called "the planner", "the
app" or "the builder" in conversation; `src/app-template.html` on disk. **It is a template,
not the thing that ships.** Two different files are built from it.

## Why this shape

The offline promise is the product. A file you can download and open with no network is only
worth something if it really has no network, so the API endpoint is *injected at build time*
rather than compiled in, and the downloadable copy gets an empty string.

| Built file | API | Can save online | Ads |
|---|---|---|---|
| `WardogsBaseBuilder.html` | `""` | no | never |
| `docs/planner/index.html` | the worker origin | yes | never |

Same source. One injected string apart. That is exactly the sort of difference that breaks
quietly, so three checks in `tools/check-build.js` hold it: the offline copy has no API
configured, it therefore cannot reach the network, and the hosted copy does have one.

## Shape

- `/*__CATALOG__*/` at `src/app-template.html:477`: the whole buildables catalog, inlined
- `/*__API__*/` at `:490` and `/*__BUILD__*/` at `:491`: injected per build
- `/*__ICONS__*/`, `/*__FONTS__*/`: base64 art and woff2, inlined so nothing is fetched
- `drawNow` at `:1007` branches to the 3D view; `drawRect` at `:1157` draws one piece
- `computeClimb` at `:1619` classifies what can be vaulted or driven over, over a reachable
  set from `reachableFromOutside` at `:1525`: the ground is rasterised at half a cell and the
  outside flooded in, so a wall sealed behind the perimeter is not a way in. `climbRuns`
  groups what is left, because one wall is one weak point however many blocks long
- `computeSeams` at `:1670` decides which touching pieces draw as one wall, and which stay
  distinct. `seamFamily` is the rule: anything tagged `wall` merges with any other wall of
  its role, so a quad and a wedged block are one body. The same-type mask it also returns
  is what the name and the height badge key off, so an odd piece mid-run still speaks

The walkthrough is its own block, `WALK_*` and `walk*`, drawing into a second canvas over
the plan one. Hand written WebGL1, one cube and one shader, because the planner downloads as
a single offline file and a library would be paid for on every download.

- `cycleView` steps plan, 3D, walk. One button with three states, because the toolbar is
  capped at ten and the isometric view already fills it
- `CELL_M` is metres per cell, and every walk dimension is worked out from it. It has to
  agree with the figure the status bar prints at `:477`, which `test/planner-tools.js` pins
- `walkPush` is collision: a circle against a rotated rect, not an axis-aligned box, since
  angled wall runs are the case this view exists to look at
- `walkSolids` rebuilds every frame off `standHeights`, so raised pieces sit at their storey
- `walkLeaves` swings an entry open. A leaf is a rect like any other, so collision and
  drawing both get the swing for free from `walkSolids`. It is `WALK_LEAF` thick, **not the
  footprint depth**: a footprint's depth is the wall the entry sits in, and swinging all of
  it lands back across the corner of its own doorway. That is invisible on the 4 wide Gate
  and impassable on the 1 wide Door
- `walkDoors` opens them on approach, not on a key, because the Door's description says
  "Auto-closes". Two distances, so a door you stand in does not chatter
- Open state lives in `walk.doors` and is deliberately **not** in the design. A door left
  ajar is not something anyone meant to save, and the share format is already in four places
- `walkReach` is how high you get onto something in one move, and it returns
  **`VAULT_HEIGHT`**, the constant `computeClimb` grades wall runs by. Deliberately the
  same number: the panel says which walls are a way in and this view is where that claim
  gets checked, so the two must not be able to disagree
- `walkFloor` is what is under the feet, `walkRise` is step, climb and fall. `walkLadder`
  is a `climbable` piece you are pressed against. Climbable pieces stay **solid**; giving
  one an unlimited step turns it into a hole you walk through
- `anti-climb` and `climbable` come off the catalog tags, not from height. `walkClimbable`
  is the rule, and it is a function so the suite tests it rather than a restatement of it.
  `climb-inside` means climbed into, not onto: the Recon Tower keeps `climbable` because
  that is true of it, and stays solid here because a roof you can stand on is a way over

Citations: substitution at `build.ps1:34`, outputs at `build.ps1:52` and `:60`.

## Connected to

- **owns:** everything a player interacts with
- **owned-by:** [buildables-catalog](../data/buildables-catalog.md), inlined into it
- **joins:** [share-code](share-code.md), [build-config](../data/build-config.md)
- **looks-like-but-is-not:** `docs/planner/index.html` and `src/artifact.html`. Both are
  **output**. Editing either is work you lose on the next build.

## If you change this

- **Hits:** both built planners; `test/planner.js`, `test/planner-tools.js`,
  `test/elevation.js`, `test/issues.js` and `test/share-links.js`, all of which lift real
  functions out of the *built* file, so they only see a change after a rebuild.
- **Does not hit:** the site pages. They share the design language and the catalog but no
  code. Changing the planner never changes `/buildables/`.

## Surfaces

| Surface | Role |
|---|---|
| players | read, in a browser |
| `build.ps1` | reads the template, writes two builds |
| `test/*.js` | read the built file |

## See

- Source: `src/app-template.html`
- Why the plan is flat and the 3D view exists: `docs/3d-view-design.md`
