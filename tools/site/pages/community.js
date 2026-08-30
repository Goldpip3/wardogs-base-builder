/* Moderation, feedback and the signed-in account page.
   Body sits at column zero deliberately. Indenting it would add whitespace inside
   these template literals, and that whitespace is page content. */
module.exports = ctx => {
  const { path, esc, stats, page, write, VOTE_API } = ctx;

/* ---------- moderation ----------
   Not linked from anywhere, not in the sitemap, and noindex. It holds no secret itself:
   the admin token is typed in and kept in this browser only, and the worker is what
   actually checks it. Losing this page to a stranger gives them nothing. */
if (VOTE_API) write("moderate/index.html", page({
  title: "Moderate",
  desc: "Review submitted designs.",
  canonical: "/moderate/",
  noindex: true,
  body: `<section><div class="wrap" style="max-width:860px">
  <h1>Moderate</h1>
  <p class="lede">Submitted designs wait here until you approve them.</p>
  <div class="field" style="max-width:420px;margin:26px 0">
    <label for="tok">Admin token</label>
    <input id="tok" type="password" placeholder="the ADMIN_TOKEN secret">
    <div class="hint">Kept in this browser only. Never sent anywhere but your own worker.</div>
  </div>
  <div style="display:flex;gap:12px;flex-wrap:wrap">
    <button class="btn" id="load">Design queue</button>
    <button class="btn" id="loadFb">Feedback</button>
    <button class="btn sm" id="dumpFb">Download all as JSON</button>
  </div>
  <div id="out" style="margin-top:30px"></div>
</div></section>
<script>
(function(){
var API=${JSON.stringify(VOTE_API)};
var tokEl=document.getElementById("tok"), out=document.getElementById("out");
try{ tokEl.value=localStorage.getItem("wardogs.admin")||""; }catch(e){}
var esc=function(s){return String(s).replace(/[&<>"']/g,function(c){
  return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];});};

function call(path,opts){
  opts=opts||{};
  opts.headers=Object.assign({"Content-Type":"application/json",
    "X-Admin-Token":tokEl.value},opts.headers||{});
  return fetch(API+path,opts).then(function(r){
    return r.json().then(function(j){ if(!r.ok) throw new Error(j.error||("HTTP "+r.status)); return j; });
  });
}
function render(ds){
  if(!ds.length){ out.innerHTML='<div class="empty"><h3>Queue is empty</h3><p>Nothing waiting.</p></div>'; return; }
  out.innerHTML=ds.map(function(d){
    return '<div class="card" style="border:1px solid var(--line);margin-bottom:1px">'+
      '<h3>'+esc(d.name)+'</h3>'+
      '<p>'+esc(d.note||"(no description)")+'</p>'+
      '<div class="stats"><span>by</span>'+esc(d.author)+'<span>slug</span>'+esc(d.slug)+'</div>'+
      '<div style="display:flex;gap:10px;margin-top:16px;flex-wrap:wrap">'+
      '<a class="btn sm" target="_blank" rel="noopener" href="/planner/#d='+esc(d.code)+'">Open it first</a>'+
      '<button class="btn sm" data-act="approve" data-slug="'+esc(d.slug)+'">Approve</button>'+
      '<button class="btn sm" data-act="reject" data-slug="'+esc(d.slug)+'">Reject</button>'+
      '<button class="btn sm" data-act="delete" data-slug="'+esc(d.slug)+'">Delete</button>'+
      '</div></div>';
  }).join("");
}
function load(){
  out.textContent="Loading...";
  try{ localStorage.setItem("wardogs.admin",tokEl.value); }catch(e){}
  call("/admin/pending").then(function(j){ render(j.designs||[]); })
    .catch(function(e){ out.innerHTML='<div class="msg">'+esc(e.message)+'</div>'; });
}
document.getElementById("load").addEventListener("click",load);

/* Feedback is read here and nowhere else. The JSON dump is the way out: everything
   people have sent, in one file, to do whatever you want with later. */
function renderFeedback(items){
  if(!items.length){
    out.innerHTML='<div class="empty"><h3>Nothing yet</h3><p>Nobody has sent anything in.</p></div>';
    return;
  }
  out.innerHTML=items.map(function(f){
    return '<div class="card" style="border:1px solid var(--line);margin-bottom:1px">'+
      '<div class="stats" style="margin:0 0 10px"><span>'+esc(f.kind)+'</span>'+
      new Date(f.at).toLocaleString()+
      (f.contact?'<span>reply to</span>'+esc(f.contact):"")+'</div>'+
      '<p style="white-space:pre-wrap;overflow-wrap:anywhere;color:var(--text)">'+esc(f.text)+'</p>'+
      '<div style="margin-top:14px"><button class="btn sm" data-fbkey="'+esc(f.key)+'">Delete</button></div></div>';
  }).join("");
}
function loadFeedback(){
  out.textContent="Loading...";
  try{ localStorage.setItem("wardogs.admin",tokEl.value); }catch(e){}
  return call("/admin/feedback").then(function(j){ renderFeedback(j.feedback||[]); })
    .catch(function(e){ out.innerHTML='<div class="msg">'+esc(e.message)+'</div>'; });
}
document.getElementById("loadFb").addEventListener("click",loadFeedback);
document.getElementById("dumpFb").addEventListener("click",function(){
  call("/admin/feedback").then(function(j){
    var blob=new Blob([JSON.stringify(j.feedback||[],null,2)],{type:"application/json"});
    var a=document.createElement("a");
    a.href=URL.createObjectURL(blob);
    a.download="wardogs-feedback.json";
    a.click();
    URL.revokeObjectURL(a.href);
  }).catch(function(e){ alert(e.message); });
});
out.addEventListener("click",function(ev){
  var fb=ev.target.closest("button[data-fbkey]");
  if(fb){
    if(!confirm("Delete this feedback?")) return;
    fb.disabled=true;
    call("/admin/feedback/delete",{method:"POST",body:JSON.stringify({key:fb.dataset.fbkey})})
      .then(loadFeedback).catch(function(e){ fb.disabled=false; alert(e.message); });
    return;
  }
  var b=ev.target.closest("button[data-act]"); if(!b) return;
  if(b.dataset.act==="delete" && !confirm("Delete this permanently?")) return;
  b.disabled=true;
  call("/admin/design",{method:"POST",
    body:JSON.stringify({slug:b.dataset.slug,action:b.dataset.act})})
    .then(load).catch(function(e){ b.disabled=false; alert(e.message); });
});
if(tokEl.value) load();
})();
</script>`,
}));


/* ---------- feedback ----------
   A suggestion box, not a forum. Nothing sent here is published, which is what keeps it
   free of moderation: there is no audience to spam. Without a service configured the page
   still exists and says where to go instead, rather than showing a form that silently
   drops what people write. */
write("feedback/index.html", page({
  title: "Feedback",
  desc: "Tell me what to add, what is broken, or which number is wrong. Goes straight to the person who builds this.",
  canonical: "/feedback/",
  body: `<section><div class="wrap" style="max-width:720px">
  <span class="eyebrow">Say something</span>
  <h1>Feedback</h1>
  <p class="lede">This is one person's side project, so there is nobody to escalate to.
  Whatever you write here I read.</p>

  ${VOTE_API ? `
  <form class="form" id="fbForm">
    <div class="field">
      <label for="fbKind">What is it</label>
      <select id="fbKind" style="width:100%;background:var(--panel);color:var(--text);
        border:1px solid var(--line2);padding:11px 13px;font-family:var(--ui);font-size:15px">
        <option value="idea">Something to add</option>
        <option value="bug">Something is broken</option>
        <option value="data">A number is wrong</option>
        <option value="other">Something else</option>
      </select>
    </div>
    <div class="field">
      <label for="fbText">Go on</label>
      <textarea id="fbText" required maxlength="4000" style="min-height:150px"
        placeholder="Be as blunt as you like. If it is a wrong number, say which buildable and what it should be."></textarea>
    </div>
    <div class="field">
      <label for="fbContact">Reply to (optional)</label>
      <input id="fbContact" maxlength="120" placeholder="Discord, Reddit, email, or leave it blank">
      <div class="hint">Only so I can come back to you. Nothing is sent to it automatically,
      and it is never shown on the site.</div>
    </div>
    <div><button class="btn primary" type="submit">Send</button></div>
    <div class="msg" id="fbMsg" style="display:none"></div>
  </form>
  <p style="font-size:13px;color:var(--dim);margin-top:24px">
  Nothing you write here appears on the site. It goes into a private list I read and work
  from. See the <a href="/privacy/">privacy page</a> for what that stores.</p>` : `
  <div class="note" style="margin-top:30px"><strong>The form is briefly down.</strong>
  Nothing you send right now would reach me, so rather than swallow it quietly the form is
  hidden. Try again shortly.</div>`}

  <h2 style="margin-top:56px">Most useful things to tell me</h2>
  <ul style="max-width:60ch">
    <li><strong>A cost or size that is wrong.</strong> Everything in the planner was read off
    the radial menu frame by frame, so some of it will be off. Say which piece and what the
    real number is and it gets fixed for everyone.</li>
    <li><strong>Something the game does that the planner does not know about.</strong>
    Stacking rules, what can sit on what, anything that will not build in game but the
    planner allows.</li>
    <li><strong>Anything that is annoying to use.</strong> Especially if it is annoying every
    single time. Those are the ones worth fixing.</li>
  </ul>
</div></section>
${VOTE_API ? `<script>
(function(){
var API=${JSON.stringify(VOTE_API)};
var f=document.getElementById("fbForm"), out=document.getElementById("fbMsg");
f.addEventListener("submit",function(e){
  e.preventDefault();
  out.style.display=""; out.className="msg"; out.textContent="Sending...";
  fetch(API+"/feedback",{method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({kind:document.getElementById("fbKind").value,
      text:document.getElementById("fbText").value,
      contact:document.getElementById("fbContact").value,
      page:document.referrer||""})})
    .then(function(r){return r.json().then(function(j){ if(!r.ok) throw new Error(j.error||"That did not send."); return j; });})
    .then(function(){ f.reset(); out.className="msg good"; out.textContent="Got it. Thanks."; })
    .catch(function(err){ out.className="msg"; out.textContent=err.message; });
});
})();
</script>` : ""}`,
}));


/* ---------- account ----------
   What a signed-in player has saved, in one place. Designs live against the account
   rather than in a browser, so this is where they are visible from any machine. Not in
   the sitemap: there is nothing here for anyone who is not signed in. */
if (VOTE_API) write("account/index.html", page({
  title: "Your account",
  desc: "Your saved WARDOGS base designs.",
  canonical: "/account/",
  noindex: true,
  body: `<section><div class="wrap" style="max-width:860px">
  <span class="eyebrow">Account</span>
  <h1>Your designs</h1>
  <p class="lede">Everything you have saved from the planner. These live against your
  Discord account, so they follow you to another browser or machine.</p>
  <div id="acctBody" style="margin-top:34px">Checking...</div>
</div></section>
<script>
(function(){
var API=${JSON.stringify(VOTE_API)};
var A=window.wardogsAuth, box=document.getElementById("acctBody");
function esc(s){return String(s).replace(/[&<>"']/g,function(c){
  return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];});}
A.ready.then(function(me){
  if(!me.loginEnabled){ box.innerHTML='<div class="empty"><h3>Accounts are not live</h3></div>'; return; }
  if(!me.user){
    box.innerHTML='<div class="empty"><h3>Not signed in</h3>'+
      '<p>Sign in and anything you save from the planner shows up here.</p>'+
      '<a class="btn primary" href="'+A.signInUrl(location.origin+"/account/")+'">Sign in with Discord</a></div>';
    return;
  }
  load();
});
function load(){
  fetch(API+"/mine",{headers:A.headers()})
    .then(function(r){return r.json();})
    .then(function(j){
      var ds=j.designs||[];
      if(!ds.length){
        box.innerHTML='<div class="empty"><h3>Nothing saved yet</h3>'+
          '<p>Open a design in the planner, press <strong>Designs</strong>, then '+
          '<strong>Save this design online</strong>.</p>'+
          '<a class="btn primary" href="/planner/">Open the planner</a></div>';
        return;
      }
      box.innerHTML='<div class="grid">'+ds.map(function(d){
        return '<div class="card"><h3>'+esc(d.name)+'</h3>'+
          '<div class="stats"><span>saved</span>'+new Date(d.at).toLocaleDateString()+'</div>'+
          '<div style="display:flex;gap:10px;margin-top:16px;flex-wrap:wrap">'+
          '<a class="btn sm" href="/planner/#d='+esc(d.code)+'">Open</a>'+
          '<button class="btn sm" data-copy="'+esc(d.code)+'">Copy link</button>'+
          '<button class="btn sm" data-del="'+esc(d.name)+'">Delete</button></div></div>';
      }).join("")+'</div>'+
      '<p style="margin-top:24px;font-size:13px;color:var(--dim)">'+ds.length+' of '+
      (j.limit||40)+' slots used.</p>';
    })
    .catch(function(){ box.innerHTML='<div class="msg">Could not reach the save service.</div>'; });
}
box.addEventListener("click",function(e){
  var c=e.target.closest("[data-copy]");
  if(c){
    var url=location.origin+"/planner/#d="+c.dataset.copy;
    navigator.clipboard.writeText(url).then(function(){
      var was=c.textContent; c.textContent="Copied"; setTimeout(function(){c.textContent=was;},1400);
    }).catch(function(){ prompt("Copy this link",url); });
    return;
  }
  var d=e.target.closest("[data-del]");
  if(d){
    if(!confirm('Delete "'+d.dataset.del+'" from your account? The copy in your browser is not touched.')) return;
    d.disabled=true;
    fetch(API+"/mine/delete",{method:"POST",headers:A.headers(),
      body:JSON.stringify({name:d.dataset.del})}).then(load).catch(function(){d.disabled=false;});
  }
});
})();
</script>`,
}));
};
