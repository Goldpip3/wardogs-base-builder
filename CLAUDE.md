# WARDOGS Builder

A fan-made FOB planner and reference for WARDOGS, live at www.wardogsbuilder.com. One
offline HTML planner, a generated static site around it, and one Cloudflare Worker.

This file routes. It holds no content.

## Where things are

| I want to | Go to |
|---|---|
| understand the codebase before changing it | [map/CLAUDE.md](map/CLAUDE.md) |
| know what a change will break | [map/effects/CONTEXT.md](map/effects/CONTEXT.md) |
| pick up where the last session stopped | [map/OPEN.md](map/OPEN.md) |
| orient as a human, not an agent | [README.md](README.md) |
| change a number | `data/`, never the markup |
| change the planner | `src/app-template.html` |
| change or add a page | `tools/site/pages/` |
| change accounts, votes, saves | `worker/vote-worker.js` |

## Build and test

```
powershell -File build.ps1     # inlines, generates, checks, tests. Never push without it
node test/run.js               # the eight suites on their own, about half a second
```

`build.ps1` fails on any broken check. That is intended: nothing ships past it.

## Four things that catch people

1. **`docs/` is generated.** Every file under it is overwritten. Edit the generator.
2. **The planner ships twice** from one source, and the downloadable copy must have no
   network access at all. Two checks enforce it.
3. **`git push` does not deploy the worker.** That is `wrangler deploy`, from `worker/`.
4. **A number lives in one place.** Duplicating it into markup has drifted three times.

## Working style

No em dashes anywhere, in code, comments, commits or prose. The build fails on them.

When a class of bug gets out, add a check rather than only fixing the instance, and prove
the check fails on that bug before trusting it.
