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

## Build, test, deploy

```
powershell -File build.ps1     # inlines, generates, checks, tests. Never push without it
node test/run.js               # the suites on their own, about half a second
```

`build.ps1` fails on any broken check. That is intended: nothing ships past it.

Two deploys, and they are separate. `git push` publishes the site; the worker ships only
with wrangler and the owner runs it. Command, and the cmd.exe gotcha that has bitten a
handover once: [map/processes/deploy.md](map/processes/deploy.md).

## Six things that catch people

1. **`docs/` is generated.** Every file under it is overwritten. Edit the generator.
2. **The planner ships twice** from one source, and the downloadable copy must have no
   network access at all. Checks enforce it.
3. **`git push` does not deploy the worker.** That has been got wrong three times.
4. **A number lives in one place.** Duplicating it into markup has drifted three times.
5. **`wrangler kv` reads a local emulated store unless you pass `--remote`.** Without it the
   real namespace looks empty and you will diagnose a bug that is not there. That cost a
   whole diagnosis once: submissions were landing correctly the entire time.

6. **The share format lives in four places**, not two, and one of them is the worker.
   [share-code.md](map/objects/planner/share-code.md) has the list; miss one and saves fail
   silently, which they did for a day.

## Working style

No em dashes anywhere, in code, comments, commits or prose. The build fails on them.

When a class of bug gets out, add a check rather than only fixing the instance, and prove
the check fails on that bug before trusting it.

Numbers get measured, not assumed. A figure that cannot be worked out honestly is left out
and said so on the page, never filled with a plausible guess.
