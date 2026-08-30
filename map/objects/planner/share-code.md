---
type: object
cluster: planner
universe: live
status: verified 2026-08-30
entity: src/app-template.html
---

# Share code

The wire format that carries a whole base inside a URL fragment. Positional arrays, JSON,
base64url. This is how a design travels between people without a file or an account.

## Why this shape

Positional arrays rather than objects, and a type table indexed by number, because the
string has to survive being pasted into a chat message. Roughly a third the characters of
the obvious encoding; a 500-piece base still encodes to under 12,000 characters, which
`test/share-links.js` pins.

**The dangerous part: there are two implementations of one format.** The planner encodes in
the browser with `btoa`; the site generator encodes in Node with `Buffer`, so a community
design page can carry a code the planner will read back. Nothing structural keeps them
honest, because they cannot share a module: one ships inside a standalone HTML file, the
other runs at build time.

They had already drifted. An unnamed design encoded to a different string on each side,
latent only because every community design happens to have a name. Found on 2026-08-30 by
diffing the two, fixed by aligning the generator, and now guarded: `test/share-links.js`
encodes the same four designs through both and requires identical output.

## Shape

- `{ v: 1, n: name, t: [types], p: [[typeIdx, x*2, y*2, rot, level, zone?]] }`
- coordinates are doubled so half-cell offsets survive as integers
- the FOB row carries a sixth element, its build-zone size

Citations: planner `src/app-template.html:2489`; generator `tools/site/context.js:49`;
parity checked at the end of `test/share-links.js`.

## Connected to

- **owns:** `#d=` links, the Copy link button, every community design page
- **joins:** [planner-app](planner-app.md), [site-context](../site/site-context.md),
  [vote-worker](../service/vote-worker.md), which stores codes but never parses them
- **looks-like-but-is-not:** the cloud save. That stores the same code against an account;
  it is transport, not a second format.

## If you change this

- **Hits:** *both* encoders, always, in the same change. Then every share link ever
  published, unless `v` is bumped and the decoder keeps reading `v: 1`. Then
  `data/community.json`, whose stored codes were produced by the old encoder.
- **Does not hit:** the worker. It treats a code as an opaque string and never decodes one,
  so a format change needs no deploy.

## Surfaces

| Surface | Role |
|---|---|
| players | read and write, by pasting links |
| `tools/site/context.js` | writes, for community pages |
| `worker/vote-worker.js` | stores, never parses |

## See

- Source: `src/app-template.html:2489`, `tools/site/context.js:49`
