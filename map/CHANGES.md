# What changed, and why

`git log` is the full record. This is the shorter one: the decisions a later reader is most
likely to undo by accident, each with the reason that does not fit in a diff and the check
that pins it. If this file and the code disagree, the code is right and this is stale.

Newest first. One entry per decision, not per commit.

## 2026-08-31

### The update chip can hand back the build it was replacing

Ctrl+V was reported as still broken after it had been fixed and deployed, and pressing it on
the live site pasted. The copy in the reporter browser was the old one. GitHub Pages serves
the planner with `max-age=600`, so for ten minutes after a deploy a browser can answer
`location.reload()` out of its own cache without asking the server: the chip that says
"Update available" could hand back the same old build and make a fix look unfixed. It
refetches the page with cache "reload" first now, then reloads onto that. The address is
never rewritten, because the hash carries the design.

The check also only ran four seconds after load and on visibility change, so a tab left open
across a deploy was never told. It runs on focus and every five minutes as well.

This is the reason CLAUDE.md now says to compare the live `build.txt` against the local one
before believing a bug report on a fresh deploy.

### Ctrl+V pastes

Reported as a hotkey clash: V toggled the 3D view and Ctrl+V is paste. It was worse than a
clash. The plain letters were matched before the Ctrl combinations in the same if-else chain,
and holding Ctrl did not stop them, so Ctrl+V hit the plain "v" branch and toggled the 3D
view without ever pasting. Ctrl+R turned the selection on its way to reloading the page, and
Ctrl+B toggled snap.

Modified keys are handled first now, in their own block that returns. Order alone would not
have been enough: without the return a plain branch further down still catches any modified
key the block above does not list. The 3D view moved from V to 3, which nothing else wants.

Pinned in `test/planner-tools.js`: the modifier block comes first, it returns, each Ctrl
key reaches the function it should, and nothing in the markup still tells anyone to press V.

### Fewer buttons up top

Fifteen controls on the top bar, four of which were the one job of getting a design out.
Share, Export and PNG are now Share, with copy link, save picture and save file under it.
Import moved in with Designs, which is where a design comes from. The catalog editor moved
into Help: it is a power tool for correcting costs and sizes, and almost nobody opens it.
Nine buttons show on the bar now, and nothing was removed, only moved.

`test/planner-tools.js` counts what shows on the bar rather than only checking names,
because buttons creep back one at a time and each one looks reasonable on its own.

### Turning a selection turns the group, and nothing is stranded pending

`rotateSelection` spun every piece where it stood. That is right for one piece and useless
for several: a corner copied and turned came back as the same corner with its blocks facing
a different way, so there was no way to build the matching half of a base. It turns the
selection about its own centre now, so copy, paste, turn gives the mirrored half. The centre
is the average of the pieces, which a turn maps to itself, so four quarter turns land exactly
back; it is put on the grid first so a quarter turn goes grid to grid. One piece is its own
centre, so single-piece turning is unchanged. Pinned in `test/planner-tools.js`.

In the worker, `/designs` listed what was once approved. Three real submissions were left
stranded in the old queue state when the queue was removed, with no page left that could
release them. It lists what is not hidden instead, which frees them and cannot strand
anything again. Needs a wrangler deploy; `git push` does not ship the worker.

### A run steps along the piece, not down the drag

Three separate things all made a diagonal wall come out ragged, and fixing the first two was
not enough, so the whole path is written down here.

**Where a click lands.** `snapVal` rounded every placement to the world half-cell grid. A
1x1 turned forty five degrees has to step 0.707 to meet its neighbour and 0.707 is not on
that grid, so each block sat about an eighth of a cell out. `snapPoint` snaps in the
piece own frame instead. At 0, 90, 180 and 270 that is the world grid, so square-on
placement is unchanged.

**Which line it lands on.** The frame snap left the sideways axis on half cells, and half a
cell sideways is invisible on a diagonal until the wall is built. `snapPlace` measures from
the nearest piece of the same kind and angle and steps by that piece own footprint, and
treats leaving the line as something you have to mean: three quarters of a block off it, not
the half a block plain rounding asks for. Only for pieces turned off square.

**How a drag lays a run.** `stampPositions` spaced pieces by their extent along the drag,
which gets the distance right and the wall wrong. Unless the piece happened to sit square-on
to the drag, the blocks met at one corner and the run was a chain of points. Only a piece
turned to exactly match the drag ever came out solid. It now walks the two moves the piece
can make and still touch, a whole width along its own length or a whole depth across it,
picking whichever keeps the run closest to the drag line: a staircase. A run stops when the
best move would put it further off the line than its longest leg, which is what used to make
the last few pieces crab off sideways.

**And the complaint about it.** `wallGap` measured upright bounding boxes, so a genuinely
flush turned wall read as a third of a cell apart and the plan reported a break that was not
there. `hairlineGapOf` measures the real rectangles when either piece is turned.

Pinned in `test/runs.js`: a 1x1 at seven different rotations dragged diagonally must make a
solid wall, hand-placed diagonals must not staircase, square-on placement must land exactly
where it always did, and a deliberate second row must still start. Three of those checks
also assert the old behaviour fails, because the first two fixes each looked right and were
not.

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
