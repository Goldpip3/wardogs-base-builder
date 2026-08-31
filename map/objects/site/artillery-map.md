---
type: object
cluster: site
universe: live
status: verified 2026-08-30
entity: tools/site/artillery-map.js
---

# Artillery map

`tools/site/artillery-map.js`: the full-screen map tool on `/artillery/`. Returns `{ html,
script }` to one page module rather than writing a page itself, because it is a component,
not a page.

## Why this shape

It is the only interactive surface on the site outside the planner, and it is built the
same way for the same reason: a firing solution is read off terrain, and terrain in a
column of prose is unreadable. Bar, panel, canvas, status bar; it takes the whole window
and the article sits below it.

It lives outside `.wrap`. That is load bearing: inside it, the tool was centred into a
1180px column and used the middle third of a wide screen.

## The three rules that will bite

1. **No backslash, no dollar-brace in the client script.** It is assembled inside a
   template literal, so an escape written there is eaten a layer early and never reaches
   the page. That is the bug that once broke sign-in. No regexes, no nested template
   literals, degrees as an HTML entity. `tools/check-build.js` parses every shipped inline
   script, which is what catches it.
2. **Tile level is chosen in device pixels.** CSS pixels shipped once and every 2x display
   drew at half resolution. It also rounds up, never to nearest. See
   [artillery-maps](../data/artillery-maps.md).
3. **Panning is the left button only.** The middle button is the browser's autoscroll
   gesture, and letting it through scrolls the page out from under the map mid-drag. It is
   swallowed on the canvas. Pointer capture is wrapped in a `try`: it throws on an id that
   is not a live pointer, and an exception there aborts before the drag is set.

## Shape

- `fitPoints` / `toZone` / `fit`: what the camera opens on. No points opens on the control
  zone; a shared link opens on its own two points; Fit is the whole terrain
- framing runs once, from a `ResizeObserver`, the first time the stage has a real size. It
  is never re-framed, so a resize cannot throw away wherever somebody has panned to
- the URL fragment carries map, weapon and both points, and `hashchange` re-reads it
- every label in the solution is a `why()` span: hover, tap or tab it and it says what the
  number is, in the panel where the number is. The dial tip is written per arc, because more
  mils is less range on the high arc and more on the low one, and telling a new player one
  rule for both would be wrong half the time
- the dial tip states no mil convention and no sight behaviour. It quotes the envelope
  `milEnds()` derives from the tables' own ends and sends the reader to the open list,
  because what the gun's sight reads is one of the six things nobody here has checked
- the solution reports what varies with the shot. Reload and round cost do not, so they are
  on the platform cards below the tool and not in the panel

## Connected to

- **reads:** [artillery-data](../data/artillery-data.md),
  [artillery-maps](../data/artillery-maps.md)
- **consumed by:** `tools/site/pages/artillery.js`, the one page module that calls it
- **looks-like-but-is-not:** [page-module](page-module.md). Those write their own files off
  the context; this returns markup to one of them.

## If you change this

- **Hits:** `/artillery/` only. `test/artillery.js` checks the solution never snaps an
  elevation to a round number and still says whether an answer is measured or interpolated.
- **Does not hit:** the planner, which shares none of this code.

## Surfaces

| Surface | Role |
|---|---|
| `tools/site/pages/artillery.js` | calls it |
| `tools/site/css.js` | styles it, every rule prefixed `amap-`, tips included |
| `tools/check-build.js` | parses the script it emits |

## See

- Source: `tools/site/artillery-map.js`
- Page: `tools/site/pages/artillery.js`
