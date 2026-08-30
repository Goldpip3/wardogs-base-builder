/* The privacy policy.
   Body sits at column zero deliberately. Indenting it would add whitespace inside
   these template literals, and that whitespace is page content. */
module.exports = ctx => {
  const { adsOn, run, page, write, written, VOTE_API } = ctx;

/* A privacy policy is not optional once third-party ads are on the page - AdSense
   requires one, and it is one of the commonest reasons a site is turned down. It is
   written to be true of this site specifically rather than pasted from a generator:
   the planner genuinely stores nothing server-side, and that is worth saying plainly. */
write("privacy/index.html", page({
  title: "Privacy - WARDOGS Base Builder",
  desc: "What this site stores, what it does not, and what the advertising and vote services see.",
  canonical: "/privacy/",
  body: `<section><div class="wrap" style="max-width:760px">
  <span class="eyebrow">Legal</span>
  <h1>Privacy</h1>
  <p class="lede">The short version: your designs never leave your browser, there are no
  accounts, and I cannot see what you build.</p>

  <h2 style="margin-top:44px">What the planner stores</h2>
  <p>By default, everything stays in your browser. Designs save themselves to local storage
  on your own machine as you work. No account, nothing uploaded, and no copy anywhere I can
  reach. Clearing your browser data deletes them and nobody, me included, can get them back.</p>
  ${VOTE_API ? `<p><strong>Unless you choose to save one online.</strong> If you sign in and
  press <em>Save this design online</em>, that design is stored against your Discord account
  so it survives a cleared browser and follows you to another machine. Only designs you
  explicitly save are kept: nothing is uploaded in the background, and autosave stays local.
  You can delete any of them from the same panel, which removes them for good. I can see
  them, in the sense that I run the storage, and I do not look at them or do anything with
  them.</p>` : ""}
  <p>When you use <strong>Share</strong>, the whole design is encoded into the link itself.
  The link is not uploaded or registered anywhere; whoever you send it to decodes it in
  their own browser. If you never send it, it never leaves your machine.</p>

  <h2>What the site collects</h2>
  <p>Nothing directly. There is no analytics script, no tracking pixel, no newsletter, and
  no contact form. I do not know who visits or what they build.</p>
  <p>The site is hosted on GitHub Pages, which keeps its own server logs including IP
  addresses, as any web host does. That is covered by
  <a href="https://docs.github.com/site-policy/privacy-policies/github-privacy-statement">GitHub's privacy statement</a>.</p>

  <h2>Advertising</h2>
  ${adsOn ? `<p>This site shows ads from Google AdSense on its article and reference pages.
  Google and its partners use cookies and similar technologies to serve and measure those
  ads, and may personalise them based on your prior visits to this and other sites. That
  processing is Google's, not mine - I never see it and cannot access it.</p>
  <p>You can control or turn off personalised advertising at
  <a href="https://myadcenter.google.com/">Google My Ad Center</a>, and read how Google uses
  data from sites that use its services at
  <a href="https://policies.google.com/technologies/partner-sites">policies.google.com/technologies/partner-sites</a>.
  If you are in the EEA, the UK or Switzerland, you will be asked for consent before any
  personalised ads are served, and you can change that choice at any time.</p>
  <p><strong>The planner itself carries no ads and loads nothing from Google.</strong> It is
  a single self-contained page and works with no network connection at all.</p>`
  : `<p>The site currently shows no ads and loads no advertising code. If that changes,
  this page will say so before it happens, and will name exactly what the ad provider
  collects.</p>`}

  <h2>Designs and feedback you send in</h2>
  ${VOTE_API ? `<p>If you submit a design, what gets stored is the design itself, the name you
  gave it, and the name you asked to be credited under. If you post a comment, the same.
  Both are public once approved, which is the point of them.</p>
  <p>The feedback form is the opposite: nothing sent through it is ever published. It stores
  what you wrote, which of the four categories you picked, and the contact you gave if you
  gave one. The contact is only so I can come back to you about it. It is not added to any
  list, nothing is sent to it automatically, and it is not passed to anyone.</p>`
  : `<p>Submissions and feedback are not open yet. When they are, this section will say
  exactly what each one stores.</p>`}

  <h2>Voting on community designs</h2>
  ${VOTE_API ? `<p>Voting needs to stop one person voting a hundred times, and there are no
  accounts here to do it with. So when you vote, the service stores a one-way hash of your
  IP address combined with the design id. Your address itself is not stored, is not
  recoverable from the hash, and is not linked to anything else you do on the site. It is
  kept for a year so the buttons can show you what you already picked.</p>`
  : `<p>Voting is not live yet. When it is, it will work without accounts and this section
  will describe exactly what it stores.</p>`}

  <h2>Cookies</h2>
  <p>The site sets no cookies of its own.${adsOn ? ` Google's advertising cookies are described
  above, and if you are shown the consent banner your answer is stored on your device so you
  are not asked again on every page. You can reopen that choice and change it at any time
  from the privacy link the banner leaves behind.` : ""}
  Local storage is used for your saved designs and interface preferences, which is not the
  same thing as a cookie: it is never transmitted anywhere, only read by the page itself.</p>

  <h2>Children</h2>
  <p>This site is not directed at children under 13 and does not knowingly collect anything
  from them.</p>

  <h2>Changes and contact</h2>
  <p>If this policy changes in a way that affects what is collected, the change will be
  visible in this site's
  <a href="https://github.com/Goldpip3/wardogs-base-builder/commits/main">public commit history</a>,
  which is the whole record of how the site was built. Questions or corrections go through
  the <a href="/feedback/">feedback form</a>.</p>
</div></section>`,
}));
};
