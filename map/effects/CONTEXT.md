# If you are changing X, open these

A catalog, not a waterfall. It says which cards to read; the cards carry the detail. If this
index and a card disagree, **fix the card** and then fix this.

## Inside the tree

| Changing | Open | The thing people miss |
|---|---|---|
| a cost, size or stacking rule | [buildables-catalog](../objects/data/buildables-catalog.md) | It is inlined into both planners. A browser holding an old copy keeps the old number until the update chip fires. |
| a firing table or a platform envelope | [artillery-data](../objects/data/artillery-data.md) | Three sources disagree about the mortar's range. The file carries the argument rather than hiding it, so do not quietly pick a side in code. |
| damage, prices, vehicles | [derived-data](../objects/data/derived-data.md), [derive-data](../processes/derive-data.md) | Do not edit the JSON. Edit the tool and re-run it, or the next build overwrites you. |
| the planner's drawing or rules | [planner-app](../objects/planner/planner-app.md) | Five suites read the **built** file, so they see nothing until you rebuild. |
| the share URL format | [share-code](../objects/planner/share-code.md) | **Four** places, not two: the planner, the site generator, the worker's validator, and the hash regex in the planner. v2 added a leading `~` and the worker rejected every save for a day because only three were changed. And every link ever published breaks unless the decoder still reads v1. |
| a site page | [page-module](../objects/site/page-module.md), [add-a-page](../processes/add-a-page.md) | The sitemap is a separate hand-kept list. The build fails if you forget it, which is the only reason it is a nuisance and not a silent loss. |
| anything in `tools/site/context.js` | [site-context](../objects/site/site-context.md) | Every page is handed this object, including the shell. A rename can blank part of the header on all fifteen pages. |
| accounts, votes, comments, saves | [vote-worker](../objects/service/vote-worker.md), [deploy](../processes/deploy.md) | `build.ps1` does not touch the worker and `git push` does not deploy it. `wrangler deploy`, separately. |
| turning ads or accounts on | [build-config](../objects/data/build-config.md) | Empty means the feature does not ship at all, which is deliberate. |
| adding a check | [verification](../objects/guards/verification.md) | Prove the new check fails on the bug it is for. One added on 2026-08-30 was a false positive first time. |

## Two rules that are not on any one card

**`docs/` is output.** Everything under it is overwritten by `build.ps1`. Editing a file
there is work you will lose, and it will pass every check on the way out.

**A number has one home.** `data/`. Anything copied into markup drifts, and has, three times
with the pallet size alone. A check now fails the build over it.

## What points in from outside

This index walks outward. These point **inward**, and nothing in the repo references them, so
no card would name them unless someone went looking. They break silently.

| External | Holds a path or key into this repo | Breaks if |
|---|---|---|
| GitHub Pages | serves `docs/` from `main` | `docs/` stops being committed, or `docs/CNAME` claims a domain whose DNS does not resolve, which takes the site offline rather than degrading it |
| Cloudflare Worker | the deployed copy of `worker/vote-worker.js`, plus its Discord client secret in worker secrets | the worker is edited and not deployed |
| Discord developer portal | an OAuth redirect URI hardcoding the worker's `/auth/callback` | the worker URL or the site domain changes |
| Cloudflare DNS | `www.wardogsbuilder.com` | the CNAME and DNS disagree |
| Google AdSense | reads `docs/ads.txt`, matched against the publisher id | the id changes and `ads.txt` does not, or an `ads.txt` naming nobody is left behind |
| `migrate.ps1` | moves the repo to another GitHub account | the remote or the Pages source moves without it |

Anything else that hardcodes a path in here, a scheduled job, a bookmark, another repo, is
unknown to this map. Add it to this table when you find one.
