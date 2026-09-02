/* Which way the page turns.
 *
 * Pages here turn with the browser's own cross document view transition, in
 * tools/site/css.js. Left to itself every turn is the same turn, so a move back along the
 * banner looked exactly like a move forward along it, which is a small lie told on every
 * click. The banner reads left to right, so a move rightwards along it has the new page
 * slide in across the old one from the right, and a move leftwards is the mirror. A page
 * with no place in the banner (privacy, buildables, one design) is not to either side of
 * anything: it is a layer on top, so it scales up into place and scales back out on the way
 * off. The four motions and their timings are the Codrops page transitions demo, the same
 * ones acqbench uses.
 *
 * All the browser is told is one attribute on <html>. data-nav is fwd, back, in, out or
 * same, and the stylesheet keys the animations off it. It has to be set before the first
 * frame, which is why this runs in <head> rather than under the banner: the transition's
 * pseudo-elements take their animation when the new page first renders, and an attribute
 * set after that restarts the motion part way through.
 *
 * Where the reader came from is navigation.activation, which the browser fills in before
 * any script in the new document runs, and the referrer in a browser without the Navigation
 * API. Neither exists on a hard load or a typed address, and neither of those turns at all.
 *
 * ORDER is the banner's order, and test/site.js holds it to the links the banner actually
 * ships. Inlined into every site page by tools/site/shell.js and into the hosted planner by
 * build.ps1. The download gets none of it: it never navigates anywhere.
 */
(function () {
  var ORDER = ["/", "/planner/", "/artillery/", "/designs/", "/armory/", "/ballistics/",
    "/loadouts/", "/feedback/"];

  /* Where a path sits along the banner, or null for a page with no place in it. Longest
     prefix wins, so one design under /designs/ turns as Designs does. The front page is the
     brand link at the far left and matches only itself: as a prefix it would match every
     path there is. */
  var rank = function (p) {
    if (p === "/" || p === "/index.html") return 0;
    var r = null, matched = 0;
    for (var i = 1; i < ORDER.length; i++) {
      if (p.indexOf(ORDER[i]) === 0 && ORDER[i].length > matched) {
        r = i;
        matched = ORDER[i].length;
      }
    }
    return r;
  };

  /* fwd   rightwards along the banner
     back  leftwards along it
     in    onto a page with no place in the banner, or deeper into the one you are on
     out   back off one of those
     same  the same page with a different query: a filter, not a journey */
  var direction = function (from, to) {
    if (from === to) return "same";
    var a = rank(from), b = rank(to);
    if (a !== null && b !== null) {
      if (b > a) return "fwd";
      if (b < a) return "back";
      return to.length > from.length ? "in" : "out";
    }
    if (b === null) return "in";
    return "out";
  };

  window.wardogsTurn = { order: ORDER, rank: rank, direction: direction };

  var from = null;
  try {
    var act = window.navigation && window.navigation.activation;
    if (act && act.from && act.from.url) from = new URL(act.from.url).pathname;
  } catch (e) {}
  if (from === null) {
    try {
      var ref = document.referrer ? new URL(document.referrer) : null;
      if (ref && ref.origin === location.origin) from = ref.pathname;
    } catch (e) {}
  }
  if (from === null) return;
  /* Somebody who asked for less motion gets none of the sideways ones either. The
     stylesheet stills the base turn under the same query, and with no attribute set the
     directional rules never match. */
  try { if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return; } catch (e) {}
  document.documentElement.setAttribute("data-nav", direction(from, location.pathname));
})();
