/* The account control in the site banner, on every page including the planner.
 *
 * It exists as a shared file for one reason: the banner's row of boxes is centred in what
 * the brand and the name leave either side of it, so the name is part of the banner's
 * geometry. Two copies of this drifting apart moves the boxes on one page and not the other,
 * which is the fault this file was written to close.
 *
 * The other half of that fault is time. Who you are comes back from the worker, and until
 * it did the banner was drawn with an empty name and then redrawn with one, so every
 * navigation ended in the nav jumping sideways: a flicker rather than the page turn the rest
 * of the transition does. So the last answer is kept in localStorage and painted while the
 * page is still parsing, before anything is fetched. The fetch still happens and still wins;
 * it just no longer decides what the first frame looks like.
 *
 * The cache holds a display name and two flags. No token, no id, nothing the page could not
 * already read: the token lives under its own key and the worker is the only thing that
 * decides what a token is worth.
 *
 * Inlined by tools/site/shell.js for the site and by build.ps1 for the planner. Neither side
 * keeps a copy. The downloadable planner gets none of it, along with the rest of the banner.
 */
(function () {
  var KEY = "wardogs.me";
  var esc = function (s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  };

  /* What the worker said, reduced to what the banner draws. Storing the whole reply would
     put a token's worth of account detail in a place nothing needs it. */
  var keep = function (me) {
    return {
      loginEnabled: me.loginEnabled !== false,
      owner: !!me.owner,
      user: me.user ? { name: me.user.name } : null,
    };
  };

  var markup = function (me, signInUrl) {
    if (!me.user) return '<a href="' + esc(signInUrl || "#") + '">Sign in</a>';
    return '<button type="button" class="who" aria-expanded="false">' +
        esc(me.user.name) + '<span class="caret">&#9662;</span></button>' +
      '<div class="acct-menu" hidden>' +
        '<a href="/account/" class="leaveLink">Your designs</a>' +
        /* The owner's two unlisted pages, so they are reachable without keeping the URLs in
           your head. The worker decides who sees this by Discord id; the menu only draws
           what it is told. Neither page is protected by being absent from this menu:
           /moderate/ is guarded by the admin token the worker checks, and /todo/ is
           unlisted rather than secret and says so on itself. */
        (me.owner ? '<a href="/moderate/" class="leaveLink">Moderate</a>' +
                    '<a href="/todo/" class="leaveLink">To do</a>' : "") +
        '<a href="#" data-signout>Sign out</a>' +
      "</div>";
  };

  var wire = function (el) {
    var btn = el.querySelector(".who"), menu = el.querySelector(".acct-menu");
    if (!btn) return;
    var shut = function () { menu.hidden = true; btn.setAttribute("aria-expanded", "false"); };
    btn.addEventListener("click", function (ev) {
      ev.stopPropagation();
      menu.hidden = !menu.hidden;
      btn.setAttribute("aria-expanded", String(!menu.hidden));
    });
    document.addEventListener("click", function (ev) { if (!el.contains(ev.target)) shut(); });
    document.addEventListener("keydown", function (ev) { if (ev.key === "Escape") shut(); });
  };

  window.wardogsAcct = {
    key: KEY,
    cached: function () {
      try { return JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { return null; }
    },
    remember: function (me) {
      try { localStorage.setItem(KEY, JSON.stringify(keep(me))); } catch (e) {}
    },
    forget: function () { try { localStorage.removeItem(KEY); } catch (e) {} },
    /* signInUrl is a function rather than a string because the two pages build it
       differently and neither one can build it before the script that owns the API base has
       run. Drawing from cache does not need it: a cached signed-out state is the one case
       where waiting for the real answer costs nothing, since "Sign in" is the same width
       whichever way it is built. */
    paint: function (me, signInUrl) {
      var el = document.getElementById("acct");
      if (!el) return;
      if (!me || me.loginEnabled === false) { el.className = "acct"; el.innerHTML = ""; return; }
      el.className = "acct on";
      el.innerHTML = markup(me, signInUrl);
      wire(el);
    },
    /* Called while the page is still parsing, from the script tag under the banner. */
    fromCache: function () {
      var c = this.cached();
      if (c && c.user) this.paint(c);
    },
  };

  window.wardogsAcct.fromCache();
}());
