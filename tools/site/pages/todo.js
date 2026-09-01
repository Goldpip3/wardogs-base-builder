/* The owner's working list.
 *
 * Unlisted rather than secret, and the difference matters. docs/ is served whole by GitHub
 * Pages and the repository is public, so anything written here can be read by anyone who
 * has the URL and opens the source. The sign-in check hides it from a passer-by, not from
 * somebody looking. Nothing sensitive goes on this page: it is the same class of thing as
 * map/OPEN.md, which is already public.
 *
 * Counts are computed from the other data files rather than typed into data/todo.json, so a
 * line saying eight sizes are unconfirmed cannot go on saying eight after seven are fixed.
 */
module.exports = ctx => {
  const { catalog, esc, page, write, BALLISTICS, ARTILLERY, ARMORY } = ctx;
  const fs = ctx.fs, path = ctx.path;
  const TODO = JSON.parse(fs.readFileSync(path.join(ctx.ROOT, "data/todo.json"), "utf8"));
  const PROG = JSON.parse(fs.readFileSync(path.join(ctx.ROOT, "data/progression.json"), "utf8"));

  /* Every number on the page, worked out here. The keys match the "where" a task names, so
     a task shows its own live count without data/todo.json holding a figure that rots. */
  const counts = {
    "data/progression.json": PROG.weapons.length + " weapons carried unconfirmed, of " +
      ARMORY.items.filter(i => i.cat === "weapons").length,
    "tools/site/pages/armory.js, SIDEARMS": "5 named",
    "tools/site/pages/armory.js, attOwner": "65 of 146 attachments placed by label",
    "data/buildables.json, sizeConfirmed":
      catalog.buildables.filter(b => b.sizeConfirmed === false).length + " of " +
      catalog.buildables.length + " estimated",
    "data/ballistics.json, unfiguredWeapons":
      (BALLISTICS.unfiguredWeapons || []).length + " weapons",
    "data/artillery.json, open": (ARTILLERY.open || []).length + " questions",
    "tools/site/pages/armory.js, slotOf": "15 of 146",
  };

  const item = it =>
    '<li class="td"><b>' + esc(it.what) + "</b>" +
    (counts[it.where] ? '<span class="td-n">' + esc(counts[it.where]) + "</span>" : "") +
    "<p>" + esc(it.why) + "</p>" +
    '<code class="td-w">' + esc(it.where) + "</code></li>";

  write("todo/index.html", page({
    title: "To do",
    desc: "The owner's working list.",
    canonical: "/todo/",
    noindex: true,
    body: `<section><div class="wrap" style="max-width:820px">
  <span class="eyebrow">Unlisted, not secret</span>
  <h1>To do</h1>
  <p class="lede">What is still guessed, and what still needs building. Counts come from the
  data files, so this page cannot claim a gap that has already been closed.</p>

  <div id="gate" class="note" style="margin:26px 0">Checking who you are.</div>

  <div id="list" hidden>
    <h2 style="margin-top:34px">Confirm in game</h2>
    <p class="lede sub" style="margin:0 0 6px">${esc(TODO.confirmWhy)} Earliest
    ${esc(TODO.confirmOn)}.</p>
    <ul class="tds">${TODO.confirm.map(item).join("")}</ul>

    <h2 style="margin-top:40px">Work</h2>
    <ul class="tds">${TODO.work.map(item).join("")}</ul>

    <div class="note" style="margin-top:34px"><strong>This page is unlisted, not private.</strong>
    It carries noindex and nothing links to it, but <code>docs/</code> is served whole and the
    repository is public, so anyone with the address can read it. Keep it to work notes.</div>
  </div>
</div></section>
<script>(function(){
/* Who the owner is comes from the worker, which compares Discord user ids. This page used
   to compare display names instead, and a name is not an identity: anyone could set their
   Discord name to the owner's and the list opened for them. The id cannot be borrowed. */
var gate=document.getElementById("gate"),list=document.getElementById("list");
function show(msg){gate.innerHTML=msg;}
/* A Discord display name is somebody else's text, so it goes in as text rather than as
   markup. It used to have its angle brackets and ampersands stripped out, which was safe
   enough and quietly renamed anyone who had one. */
function showName(u){
  gate.textContent="Signed in as ";
  var b=document.createElement("b"); b.textContent=u; gate.appendChild(b);
  gate.appendChild(document.createTextNode(". This page is for the site owner."));
}
if(!window.wardogsAuth||!wardogsAuth.ready){show("Sign-in is not configured on this build.");return;}
wardogsAuth.ready.then(function(j){
  var u=j&&j.user&&j.user.name;
  if(j&&j.owner===true){gate.hidden=true;list.hidden=false;return;}
  if(u) showName(String(u));
  else show('<b>Sign in to read this.</b> <a href="'+wardogsAuth.signInUrl()+'">Sign in with Discord</a>.');
}).catch(function(){show("Could not check who you are.");});
}());<\/script>`,
  }));
};
