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
  return function page({ title, desc, canonical, body, ogImage = "/preview.png", noindex = false }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="referrer" content="strict-origin-when-cross-origin">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${SITE}${canonical}">${noindex ? '\n<meta name="robots" content="noindex,nofollow">' : ""}
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
  <a href="/" class="brand">WARDOGS <span>Builder</span></a>
  <nav class="site">
    <a href="/planner/" class="cta">Planner</a>
    <a href="/artillery/" class="cta">Artillery</a>
    <span class="nav-gap"></span>
    <a href="/designs/">Designs</a>
    ${/* Buildables is deliberately not here. Nine links was too many to scan, and the build
          costs are the one reference you meet inside the planner anyway, priced as you
          place a piece. The page is not gone and must not be: /buildables/ is an indexed
          URL against a real query, GitHub Pages cannot serve a redirect, and test/site.js
          holds the home page to still linking it. It is reached from the home page grid
          and from the footer. Removing those is removing the page. */""}
    <a href="/armory/">Armory</a>
    <a href="/ballistics/">Damage</a>
    <a href="/loadouts/">Loadouts</a>
    <a href="/vehicles/">Vehicles</a>
    <a href="/feedback/">Feedback</a>
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
  <a href="/loadouts/">Loadouts</a><a href="/vehicles/">Vehicles</a>
  <a href="/feedback/">Feedback</a>
  <a href="/privacy/">Privacy</a>
</div></footer>
</body>
</html>`;
};
};
