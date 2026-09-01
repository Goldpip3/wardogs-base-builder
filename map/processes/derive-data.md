---
type: process
status: verified 2026-08-30
consumes: []
produces: [derived-data]
---

# derive-data

Regenerate the two data files nobody edits by hand.

## Input → Movement → Output

Edit the transcription or the published rows *inside the tool*, run it, and the JSON is
rewritten and re-checked. Editing the JSON directly gets it overwritten, or caught.

```bash
node tools/build-armory.js      # rewrites data/armory.json
node tools/solve-ballistics.js  # re-derives and checks data/ballistics.json
```

## Why this shape

Vendor prices are transcribed, so they live as plain lines that are hard to break rather
than as three hundred hand-written JSON objects where a missing comma is silent.

Damage is not transcribed at all. It is solved out of published shots-to-kill bounds, and it
is only publishable because the derivation can be proved wrong. The solver checks three
ways: two independently published figures must land inside their derived intervals, all 140
published shots-to-kill numbers must reproduce, and the fire rates must reproduce the
published times to kill. `build.ps1:83` fails the build if any stops holding.

**Never loosen a check to make a number fit.** If reality changed, change the published rows
in the solver and let it re-derive.

## Steps

1. Armory: edit the `RAW` block in `tools/build-armory.js`, run it. It refuses to write on a
   duplicate, an unparseable price or an empty category. A line is `Name|price`, and takes an
   optional weight after it: `M4|$2,800|3.4kg`. No line carries one yet, which is why
   `/loadouts/` says weight is not measured rather than adding up an empty set; writing the
   kg here is the whole job and nothing downstream changes.
2. Ballistics: edit the `ROWS` table in `tools/solve-ballistics.js`, then update
   `data/ballistics.json` to match what it derives, and run it again until it passes.
3. `powershell -File build.ps1`.

## If you change this

- **Hits:** `/armory/`, `/loadouts/`, `/vehicles/`, `/ballistics/`.
- **Does not hit:** the planner or `data/buildables.json`. Vendor cash and Build Supplies
  are different economies and share no code.

## Surfaces

| Surface | Role |
|---|---|
| a human with the game or a source open | writes the transcription |
| `build.ps1` | re-checks on every build |

## See

- Objects: [derived-data](../objects/data/derived-data.md)
- Working and its two open holes: `docs/ballistics-sources.md`
