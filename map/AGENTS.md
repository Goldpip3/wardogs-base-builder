<!-- Generated from map/CLAUDE.md by tools/sync-map-twins.js. Do not edit. -->
# Map: WARDOGS Base Builder

The edit map for this repo. Nouns, movements, and what a change hits. The code is the
source of truth; this map cites it and never restates it.

**Read [CONTEXT.md](CONTEXT.md) before walking.** It carries the universes and the name
collisions that will otherwise mislead you.

## Where do I go for

| I want to | Open |
|---|---|
| change a cost, size, price or damage figure | [objects/data/](objects/data/) |
| change the planner itself | [objects/planner/](objects/planner/) |
| add or change a website page | [objects/site/page-module.md](objects/site/page-module.md) |
| add, refresh or join up an item icon | [objects/data/game-icons.md](objects/data/game-icons.md) |
| touch accounts, votes, comments, saves | [objects/service/vote-worker.md](objects/service/vote-worker.md) |
| know what a change breaks | [effects/CONTEXT.md](effects/CONTEXT.md) |
| know what is unfinished, and pick something up | [OPEN.md](OPEN.md) |
| know why something is the way it is, before undoing it | [CHANGES.md](CHANGES.md) |
| know how the build runs, and what it checks | [processes/build.md](processes/build.md) |
| know why a check exists | [objects/guards/verification.md](objects/guards/verification.md) |
| harden something, or know what cannot be hardened | [processes/security.md](processes/security.md) |
| find every noun at a glance | [objects/_index.md](objects/_index.md) |

## Movements

[build](processes/build.md) · [add-a-page](processes/add-a-page.md) ·
[derive-data](processes/derive-data.md) · [deploy](processes/deploy.md) ·
[publish-a-design](processes/publish-a-design.md) · [security](processes/security.md)

Verifying is not a separate movement. `build.ps1` runs every check, so there is no way to
ship having skipped them. See [objects/guards/verification.md](objects/guards/verification.md).

## The four things that catch people

1. **`docs/` is generated, apart from two committed asset trees.** Every page under it is
   overwritten by `build.ps1`, so editing one is work you will lose; change the generator.
   The exceptions are `docs/game-icons/` and `docs/maps/tiles/`, which are committed art
   nothing regenerates. They are most of the files under `docs/` by count, so "everything
   here is disposable" is the wrong instinct to bring to that directory.
2. **The planner ships twice** from one source, and the two builds differ only by what
   `build.ps1` injects into each: the API, the build stamp, the ad markup, and the site
   banner with its stylesheet. The downloadable copy gets none of those, which is what makes
   the offline promise true. See [objects/planner/planner-app.md](objects/planner/planner-app.md).
3. **A number lives in exactly one place**, `data/`. Anything duplicated into markup drifts,
   and has, three separate times.
4. **A generated data file can be committed without the generator that made it.** That
   happened to `data/armory.json` and would have stripped every icon off the loadout page
   at the next regeneration. `build.ps1` now runs `tools/build-armory.js --check`, which
   refuses rather than overwrites, because overwriting is what hid it.

## Not in this map

The written prose of the site (page copy) is content, not structure. It lives in
the page modules. `README.md` is the human-facing
orientation; this map is the agent-facing one. Where they overlap, README is the summary
and the cards carry the citations.
