/* The HTML skeleton every page is poured into: head, header, nav, footer.
   Change the nav here and it changes everywhere.

   On security headers, and why there is only one here. GitHub Pages serves docs/ and cannot
   set a response header at all, so the only ones the site gets are the handful browsers honour
   from a meta tag. `referrer` is one of them and is set below. Content-Security-Policy is not
   worth setting from a meta tag here: every page ships an inline <style> and several inline
   <script> blocks, so a policy this markup could actually satisfy would have to allow
   'unsafe-inline' and would be a policy in name only. X-Content-Type-Options, X-Frame-Options
   and HSTS do nothing from a meta tag whatsoever and are deliberately not written here, so
   nobody adds them later believing the site is covered. All of them need something in front of
   GitHub Pages that can set real headers: see map/processes/security.md. */
module.exports = ctx => {
  const { SITE, esc, adScript, adSlot, CSS, AUTH_SCRIPT } = ctx;
  /* `head` exists for one thing: a meta refresh on a page that has moved. GitHub Pages
     cannot send a 301, so that tag is the only redirect a page here can perform. Keep it to
     that. Anything else wanting into <head> is asking for a per-page style or script, and
     both of those belong in the page module's body where they can be read next to what
     needs them. */
  return function page({ title, desc, canonical, body, head = "", ogImage = "/preview.png", noindex = false }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="referrer" content="strict-origin-when-cross-origin">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${SITE}${canonical}">${noindex ? '\n<meta name="robots" content="noindex,nofollow">' : ""}${head ? "\n" + head : ""}
<meta name="theme-color" content="#12140d">
<meta property="og:type" content="website">
<meta property="og:site_name" content="WARDOGS Builder">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${SITE}${canonical}">
<meta property="og:image" content="${SITE}${ogImage}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${SITE}${ogImage}">
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='6' fill='%2312140d'/><rect x='6' y='14' width='20' height='12' rx='2' fill='%23dcaa26'/><rect x='11' y='8' width='10' height='7' rx='2' fill='%2386ad55'/></svg>">
<style>${CSS}</style>
${adScript}
${AUTH_SCRIPT}
</head>
<body>
<header class="site"><div class="wrap">
  
  <a href="/" class="brand">WARDOGS</a>
  <nav class="site">
    ${/* Every link in this nav is a .cta, which is the owner's call and worth stating so it
          is not "tidied" back. The two tools were boxed and the references were plain, on
          the reading that a box marks the thing to go and do. The owner reads the box as
          finished rather than as primary, and these are all finished now.

          The nav no longer ranks the tools above the references, and nothing in it does.
          A .nav-gap span used to hold Planner and Artillery apart from the rest, which at
          full width opened a hole most of a column wide between Artillery and Designs and
          read as a broken row rather than as a grouping. Owner's call, 2026-08-31: one
          group, centred. If the tools need to lead again, lead with order or with a
          different treatment on those two, not by pushing the other five away.

          Buildables and Vehicles are deliberately absent. Neither page is gone and neither
          must be. /buildables/ is reached from the home page grid and the footer, and
          test/site.js holds the home page to linking it. /vehicles/ is a meta-refresh stub
          pointing at the armory, which is the only redirect GitHub Pages can perform, so
          deleting either file turns a live URL into a permanent 404. */""}
    <a href="/planner/" class="cta">Planner</a>
    <a href="/artillery/" class="cta">Artillery</a>
    <a href="/designs/" class="cta">Designs</a>
    <a href="/armory/" class="cta">Armory</a>
    <a href="/ballistics/" class="cta">Damage</a>
    <a href="/loadouts/" class="cta">Loadouts</a>
    <a href="/feedback/" class="cta">Feedback</a>
    <span id="acct" class="acct"></span>
  </nav>
</div></header>
${body}
${adSlot("leaderboard") ? `<div class="wrap">${adSlot("leaderboard")}</div>` : ""}
<footer class="site"><div class="wrap">
  <span class="fine">A free, fan-made manual and planner for WARDOGS, written by a player. Not
  affiliated with, endorsed by, or connected to BULKHEAD Interactive or Team17. WARDOGS and all
  related marks and imagery belong to their respective owners.</span>
  <a href="/planner/">Planner</a><a href="/designs/">Designs</a>
  <a href="/buildables/">Buildables</a><a href="/armory/">Armory</a>
  <a href="/ballistics/">Damage</a><a href="/artillery/">Artillery</a>
  <a href="/loadouts/">Loadouts</a>
  <a href="/feedback/">Feedback</a>
  <a href="/privacy/">Privacy</a>
</div></footer>
</body>
</html>`;
};
};
