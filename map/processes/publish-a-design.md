---
type: process
status: verified 2026-08-31
consumes: [vote-worker, share-code]
produces: [page-module]
---

# publish-a-design

A player's base joins the public list, without anybody's permission.

## Input → Movement → Output

A signed-in player sends a share code to the worker, from the planner's Submit button or
from the card in **Your designs** on `/designs/`. The worker stores it published, and the
next reader of `/designs/` fetches it. Nothing is built, and nothing is written into the
repo: a submission never touches `data/community.json`.

## Why this shape

There used to be a queue and a human gate at `/moderate/`. It made one person the bottleneck
on everybody else's work, and what is being published is a base layout, which cannot say
anything; the only free text is the name. Reporting covers that, three reports hide a design,
and `/moderate/` is now where the complaints land rather than where everything waits.

Sign-in and a cap of five a day are what stop this being a firehose.

Votes deliberately do **not** live in the repo. They come from the worker at runtime, so the
ranking cannot be quietly edited by whoever owns the repository.

## Steps

1. Save a design against your account: planner, **Designs**, **Save this design online**.
   That is private, and it is what `/designs/` shows you under the public list.
2. Send it up. Either the planner's **Submit for voting**, or the card's **Put it up for
   voting** on `/designs/`, which asks for one optional line and the tags, and posts the same
   `/submit`. **A submission has to name a map**: the card says so before sending, and the
   worker refuses one that does not, which is the only rule about tags it can enforce without
   a copy of the vocabulary in `data/community.json`.
3. It is live immediately. The page reloads the public list so it appears above, and the
   card stops offering to send it and says it is up for voting.
4. Take it down whenever: **Take it down** on your own card in the public list. That deletes
   it, and its votes and comments with it.

## If you change this

- **Hits:** both lists on `/designs/` read one `/designs` answer, cached in the page. A
  publish must clear that cache before either is redrawn, or the list gains the design while
  the card under it still offers to send it. That is what `reloadCommunity()` is for.
- **Hits:** the two places that submit are the planner's panel and the card on
  `/designs/`, and both have to ask for tags. `test/site.js` pins the card's picker and the
  tags in its request body, because the card was built before tags existed and sent none: the
  worker answered with a refusal nobody could act on.
- **Hits:** `data/community.json` still holds a `designs` array, and the build still turns
  each entry into its own page and sweeps removed ones. It is empty and stays empty, because
  a submission goes to the worker. Do not wire submissions back into it.
- **Does not hit:** the votes. They stay in the worker whatever the repo says.

## Surfaces

| Surface | Role |
|---|---|
| players | save, send up, vote, comment, report |
| the owner | reads reports at `/moderate/` |
| `worker/vote-worker.js` | `/submit`, `/designs`, `/mine`, `/withdraw` |

## See

- Objects: [vote-worker](../objects/service/vote-worker.md), [share-code](../objects/planner/share-code.md)
- Source: `tools/site/client-scripts.js`, `tools/site/pages/designs.js`, `worker/vote-worker.js`
