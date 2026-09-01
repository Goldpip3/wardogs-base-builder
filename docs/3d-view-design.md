# A 3D view for the planner

## The problem

The plan view fakes height by drawing a shaded copy of each piece offset down and to the
right. It reads fine for one block. It falls apart the moment pieces of different heights
sit next to each other: a tall piece's fake side is drawn over its neighbour, a short
piece's is drawn under, and neither is occluded correctly because nothing knows what is in
front of what. That is the clipping that looks wrong. It is not a bug in the offsets, it is
that a 2D plan has no depth to sort by.

## What it has to do

1. Show a base so height and stacking are unambiguous at a glance.
2. Never draw a far piece over a near one.
3. Stay fast on a thousand pieces, because bases get that big.
4. Add no dependency. The planner is one file that has to work offline, so no WebGL
   library, no loader, nothing fetched.
5. Not replace the plan. Placing pieces precisely is a top-down job and always will be.

## The approach

**Axonometric projection, painter's algorithm, Canvas 2D.** The same projection the icons
already use, so the whole product reads as one thing.

    screen.x = ox + (x - y) * cos30 * unit
    screen.y = oy + (x + y) * unit / 2 - z * unit

Every piece is an axis-aligned box: its footprint on the ground, its base at its storey,
its top at storey plus height. Three faces are ever visible, so each box is three
quadrilaterals with one shade each, and depth comes from draw order rather than from a
z-buffer.

**Why not WebGL.** It would give real occlusion for free, and it would cost a dependency,
a shader pipeline, and a fallback path for machines without it. For axis-aligned boxes on
a grid the sort below is exact, so WebGL would buy correctness we can already have.

## Depth order

For axis-aligned boxes on a grid, drawing far to near is exact, and far to near is:

    sort by (x + y) ascending, then by storey ascending

**That was wrong, and it shipped for months.** "A box further from the camera has a smaller
`x + y`" is only true of its own middle, and a piece is not its middle. A four cell wall
reaches two cells past its centre, so a single bremer standing behind one end of a hesco run
had the larger `x + y` and was drawn in front of the whole wall, painting over it. On screen
that is a notch bitten out of the wall. It was reported as the wall not carrying on through,
and the reporter was right.

Sorting by any one number cannot answer this, because the answer is an order and not a
value. For boxes standing square on the world axes the rule is exact: A is behind B if A lies
wholly on the far side of B along one axis, meaning B is nearer along x, or nearer along y,
or sits above it. Which end of an axis is the far end is read off the camera direction, so
the rule holds at any angle rather than only at the square ones. `paintOrder` builds that as
a graph and walks it, seeding from the depth order so ties stay stable and the result does
not flicker as the camera moves.

Two boxes that only touch are separated along two planes at once, each naming the other the
far one. Neither answer is wrong, because a shared boundary hides nothing, and the graph
takes whichever it asks about first.

## How high a piece stands

**A storey is a count, not a height, and this view read it as one.** `p.level` is the number
of things stacked under a piece, so a gun dropped on a two block hesco wall is on storey 1
and was drawn at z=1, sunk a block into the wall holding it up. Two boxes running through
each other have no draw order that is right about both, so the wall was painted over the gun.
Reported from a real base as a Vanguard CIWS on a wall coming out broken.

`standHeights` resolves it instead: work up the storeys, and a piece starts at the tallest
top among the pieces it overlaps on any storey below. It is cached against the design, like
the issues and the seams, because it only changes when the design does. The FOB is not
something you stack on, the same rule `autoLevelAt` places by, and a piece with nothing under
it stands on the ground, because a storey number on its own says nothing about how high it is.

Only pairs that overlap on screen are asked, found through a coarse screen grid, so the cost
tracks what the base looks like rather than the square of how many pieces are in it. Measured
at 0.7 ms for 117 pieces and 3.2 ms for 624, against a sixteen millisecond frame.

Two honest limits remain. A piece rotated off ninety degrees is compared by the box around
it, which is the same approximation this view makes everywhere else, so it can still order
wrongly against a close neighbour. And interlocking pieces can form a loop that no order
satisfies; whatever the graph cannot drain falls back to depth order. Past `PAINT_MAX`
pieces the whole thing is skipped, because being slightly wrong is better than being slow
while somebody is dragging the view, and a base that size is read on the plan anyway.

`test/elevation.js` audits the real ordering against that rule on every overlapping pair, at
every angle the view turns to. Reverting to the old sort fails six of its checks, and reading
the storey as a height fails five more.

## Rotation

A yaw in degrees, in fifteen degree steps, applied to the world before projection:

    rx = x cos t + y sin t    ry = -x sin t + y cos t

It was four orientations a quarter turn apart. Four angles are all square on, so a wall that
runs along an axis is either flat to the camera or edge on and never shows its length and its
face at once, and the one thing you go into this view to read is how a wall stands. Fifteen
degrees is fine enough to look around a corner, coarse enough that a whole number of clicks
always comes back to square, and it costs the sort nothing: the rule above asks the camera
which way it is looking rather than assuming a quarter turn.

Q and E turn it, and so do the two buttons the top bar shows only in 3D. Snap goes the other
way while they are there, because it is a placing setting and nothing is placed in 3D, so the
bar swaps one button for two rather than growing past the ten it is capped at.

Turned to exactly a corner, 45 degrees and its multiples, a square-on piece shows one side
and the two beside it project to nothing. That is not a bug to fix; it is what standing on
the diagonal looks like, and drawing a sliver of a face nobody can see is how a renderer ends
up with stray triangles in it.

## Picking

Click testing walks the drawn boxes in reverse order and returns the first whose top face
contains the point. Reverse order means the nearest match wins, which is what the eye
expects. Only the top face is tested: the sides of a box are almost never what somebody is
aiming at, and testing them makes tall pieces greedy about clicks meant for the floor
behind them.

## Scope

**In:** viewing, rotating, zooming, selecting, and the same colour and climb marking the
plan uses, so the two views agree.

**Out, for now:** placing and dragging. Placing in 3D means projecting a screen ray onto
the ground plane, which is doable, but a piece dropped in 3D lands where the eye guessed
rather than where the grid is, and this tool exists to be exact. Place in plan, inspect in
3D.

## Cost

About 200 lines and no new files. The per-frame work is one sort plus three filled paths
per visible piece, which is the same order as the plan view already does.
