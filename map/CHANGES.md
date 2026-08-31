# What changed, and why

`git log` is the full record. This is the shorter one: the decisions a later reader is most
likely to undo by accident, each with the reason that does not fit in a diff and the check
that pins it. If this file and the code disagree, the code is right and this is stale.

Newest first. One entry per decision, not per commit.

## 2026-08-30

### A way in is a run, and only where somebody can stand (`e9868d9`)

"Can they get in" counted every low piece in the design and called each block its own
section, so a closed base reported its own courtyard walls as ways in, in the hundreds. Two
rules replaced that.

Touching pieces with the same verdict are grouped into runs, and a run counts once however
many blocks built it. `climbRuns` in `src/app-template.html`.

`reachableFromOutside` rasterises the ground at half a cell and floods the outside in from
beyond the design's own bounds. Walls, gates, emplacements and the FOB stop the flood.
Barbed wire and hedgehogs do not, deliberately: a line of wire in front of a wall does not
make the wall unreachable, and treating it as solid would hide a whole perimeter behind it.
What the flood cannot touch is marked `inside` and is not a way in. A design too large for
the cell budget gives up and calls everything reachable, because over-reporting is the safe
way to be wrong about a way in.

Pinned in `test/planner.js`: a sealed courtyard wall is not a way in, a sixteen quad
perimeter is one section, a gap in the perimeter brings the courtyard back, and wire in
front of a wall does not hide it.

### A gap you cannot see is named, not merged away (`e9868d9`)

Two walls a tenth of a cell apart look joined at any zoom worth building at. The seam code
was right to refuse to join them, and nothing on screen said why, so the plan read as
broken. Widening the merge tolerance would have made the plan lie about a hole in a wall,
so the distance is stated instead: `hairlineGap` raises an issue naming the exact gap, and
the complaint carries every piece of the run it broke, so one Align to grid closes all of
them. Aligning only the two blocks either side moves the gap along one place.

`HAIRLINE` also widens the spatial index. A rule about pieces that do not touch cannot be
answered by an index that only pairs pieces that do, and a near miss either side of a bucket
boundary was never compared at all.

Anything past `HAIRLINE` is a gap somebody meant, a firing slit or a doorway, and is left
alone. Pinned in `test/issues.js`, alongside the equivalence loop.

### The panel leads with pallets, and stopped asking (`592ad7c`, with the ballistics work)

The right panel opened with a box asking how many supplies you had in the FOB, pre-filled
with the catalog figure and almost never touched. It is gone. A fresh FOB lands with its own
stock, so only what a design costs beyond that is hauled, and that is the headline number
now: `pallets = ceil((supplies - startingSupplies) / suppliesPerPallet)`.

`tools/site/context.js` computes the same figure the same way for community design pages,
because the planner and the design page describing the same base must not disagree.

Ongoing supplies names the emplacements that keep drawing and states no conversion into
shells, because how much a reload takes is not published. That is an open question in
[OPEN.md](OPEN.md), not an omission.

While in there: the help text said a pallet holds 1,900 and the catalog said 1,800, and had
for months. Prose interpolates both figures now, and `tools/check-build.js` fails on any
supply figure spelled out with a thousands comma that the catalog does not state.

### One wall draws as one wall (`615fab9`, completed by `41488cb`)

Seams merged only pieces of the same buildable, and nobody lays a perimeter that way: it is
quads with single blocks wedged in to close the gaps, and every wedge got its own border.
`seamFamily` merges anything tagged `wall` with any other wall of its role, which is the set
that already shares a colour. A gate stays separate, and so does a bunker or a tower, which
carry the cover role without being walls. The Sandbag Wall gained the `wall` tag in
`data/buildables.json` for the same reason.

Labels and height badges key off the same buildable, not the family, so a block of a
different height mid-run keeps its badge instead of being smoothed over.

That fixed square-on runs and not rotated ones. `41488cb` found the other half: seam bits
are worked out in world space and every edge is drawn inside `ctx.rotate()`, so a wall
turned ninety degrees suppressed the wrong pair of edges. Read that commit before touching
either.

Also here: the icon cap moved from a flat 66px to about two cells, because a pixel cap
shrinks the art against its own piece the further you zoom in, and a 4x4 mortar at working
zoom was a stamp in a field of flat colour.

### The front page says what the site is for (`c5e57bf`)

The hero was a slogan about pallets. It says what this is instead: a planner and reference,
the base builder being the part worked on now, with the rest filling in along the top.

Guides were removed in full, generator and prose and sitemap entries, so `/guides/` and the
four guide URLs return 404. That was a deliberate call, not an oversight.

The six planner features were panels in an auto-fill grid, so four columns left two lit
empty boxes. They are a bordered list capped at three columns now, and an unfilled row reads
as a list ending rather than a hole.

## Where the rest lives

- what a change will break: [effects/CONTEXT.md](effects/CONTEXT.md)
- what is unfinished: [OPEN.md](OPEN.md)
- why a check exists: [objects/guards/verification.md](objects/guards/verification.md)
- the planner itself: [objects/planner/planner-app.md](objects/planner/planner-app.md)
