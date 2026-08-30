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

A box further from the camera along the view axis always has a smaller `x + y`. A box on a
lower storey is always behind one above it at the same footprint. No cycles are possible
because the boxes do not interpenetrate, which the overlap check already enforces.

The one case this does not handle is a piece rotated off ninety degrees. Its footprint is
no longer axis-aligned and the sort can pick the wrong order against a neighbour. Those
are rare, they are already called out in the plan view as their own thing, and the fallback
is a wrong-looking edge rather than a crash. Worth knowing, not worth a BSP tree.

## Rotation

Four orientations, ninety degrees apart, applied to the world before projection:

    n=0 (x, y)    n=1 (y, -x)    n=2 (-x, -y)    n=3 (-y, x)

That is enough to see behind anything without free-orbiting, and it keeps the sort exact,
which a free camera would not.

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
