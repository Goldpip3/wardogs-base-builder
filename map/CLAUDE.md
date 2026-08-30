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
| touch accounts, votes, comments, saves | [objects/service/vote-worker.md](objects/service/vote-worker.md) |
| know what a change breaks | [effects/CONTEXT.md](effects/CONTEXT.md) |
| know what is unfinished, and pick something up | [OPEN.md](OPEN.md) |
| know how the build runs, and what it checks | [processes/build.md](processes/build.md) |
| know why a check exists | [objects/guards/verification.md](objects/guards/verification.md) |
| find every noun at a glance | [objects/_index.md](objects/_index.md) |

## Movements

[build](processes/build.md) · [add-a-page](processes/add-a-page.md) ·
[derive-data](processes/derive-data.md) · [deploy](processes/deploy.md) ·
[publish-a-design](processes/publish-a-design.md)

Verifying is not a separate movement. `build.ps1` runs every check, so there is no way to
ship having skipped them. See [objects/guards/verification.md](objects/guards/verification.md).

## The three things that catch people

1. **`docs/` is generated.** Every file under it is overwritten by `build.ps1`. Editing one
   is work you will lose. Change the generator instead.
2. **The planner ships twice** from one source, and the two builds differ by one injected
   string. See [objects/planner/planner-app.md](objects/planner/planner-app.md).
3. **A number lives in exactly one place**, `data/`. Anything duplicated into markup drifts,
   and has, three separate times.

## Not in this map

The written prose of the site (page copy) is content, not structure. It lives in
the page modules. `README.md` is the human-facing
orientation; this map is the agent-facing one. Where they overlap, README is the summary
and the cards carry the citations.
