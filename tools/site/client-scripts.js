/* The JavaScript that ships inside the generated pages: signing in, voting, comment
   threads, and the redirect for designs shared before the planner moved.

   These are strings that become <script> tags, so they cross two layers of quoting on
   the way out. Escapes have been eaten on that route before. tools/check-build.js
   parses every generated page's inline scripts, which is what catches it. */
module.exports = ctx => {
  const { path, esc, stats, page, written, VOTE_API } = ctx;


/* ---------- sign-in, on every page ----------
   The token comes back from Discord in the URL fragment and lives in localStorage after
   that. A fragment never reaches a server, so it stays out of access logs. This runs on
   every page so the header can say who you are wherever you are, and so the token is
   picked up no matter which page Discord returned you to.

   The character class is spelled out rather than using \\w, because this file is a
   template literal and an escape written here does not survive into the page. That
   mistake shipped once and broke sign-in. */
const AUTH_SCRIPT = !VOTE_API ? "" : `<script>
(function(){
var API=${JSON.stringify(VOTE_API)};
var KEY="wardogs.token";
function esc(s){return String(s).replace(/[&<>"']/g,function(c){
  return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];});}
try{
  var m=(location.hash||"").match(/[#&]token=([A-Za-z0-9_.-]+)/);
  if(m){ localStorage.setItem(KEY,m[1]);
         history.replaceState(null,"",location.pathname+location.search); }
}catch(e){}
window.wardogsAuth={
  key:KEY,
  token:function(){ try{ return localStorage.getItem(KEY); }catch(e){ return null; } },
  headers:function(){ var h={"Content-Type":"application/json"}, t=this.token();
                      if(t) h["Authorization"]="Bearer "+t; return h; },
  signInUrl:function(back){ return API+"/auth/start?return="+
    encodeURIComponent(back||(location.origin+location.pathname)); },
  signOut:function(){ try{ localStorage.removeItem(KEY); }catch(e){} location.reload(); },
  me:null,
  ready:null
};
var A=window.wardogsAuth;
A.ready=fetch(API+"/me",{headers:A.headers()})
  .then(function(r){return r.json();})
  .then(function(j){
    A.me=j;
    // a token the worker will not accept is not worth keeping
    if(j.loginEnabled && A.token() && !j.user){ try{localStorage.removeItem(KEY);}catch(e){} }
    var el=document.getElementById("acct");
    if(el && j.loginEnabled){
      el.className="acct on";
      el.innerHTML = j.user
        ? '<a href="/account/" class="who">'+esc(j.user.name)+'</a>'+
          '<span class="sep">/</span><a href="#" data-signout>Sign out</a>'
        : '<a href="'+A.signInUrl()+'">Sign in</a>';
    }
    return j;
  })
  .catch(function(){ A.me={loginEnabled:false,needs:{},user:null}; return A.me; });
document.addEventListener("click",function(e){
  if(e.target.closest("[data-signout]")){ e.preventDefault(); A.signOut(); }
});
})();
</script>`;
function voteWidget(slug) {
  const off = VOTE_API ? "" : " disabled title=\"Voting opens once the vote service is live\"";
  return `<div class="vote" data-design="${esc(slug)}">
    <button type="button" data-dir="1"${off} aria-label="Vote up">&#9650;</button>
    <span class="score" data-role="score">${VOTE_API ? "&middot;" : "&ndash;"}</span>
    <button type="button" data-dir="-1"${off} aria-label="Vote down">&#9660;</button>
  </div>`;
}

// Scores are fetched rather than baked, so a page cached for a week still shows the
// current ranking. Failure is silent and leaves the neutral dash in place.

/* Everything community-shaped runs against the worker. With no API configured the page
   keeps its static empty state and none of this is emitted, so the site never shows
   controls that cannot do anything. */
const COMMUNITY_SCRIPT = !VOTE_API ? "" : `<script>
(function(){
var API=${JSON.stringify(VOTE_API)};
var esc=function(s){return String(s).replace(/[&<>"']/g,function(c){
  return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];});};
var ago=function(ms){
  var s=Math.max(1,(Date.now()-ms)/1000);
  var u=[[86400*365,"y"],[86400*30,"mo"],[86400,"d"],[3600,"h"],[60,"m"]];
  for(var i=0;i<u.length;i++) if(s>=u[i][0]) return Math.floor(s/u[i][0])+u[i][1]+" ago";
  return "just now";
};
/* Sign-in state. The worker hands the token back in the URL fragment after Discord, and
   it lives in localStorage from then on. A fragment never reaches a server, so the token
   is not sitting in anybody's access log. */
var TOKEN=null, ME=null;
try{
  var m=(location.hash||"").match(/[#&]token=([A-Za-z0-9_.-]+)/);
  if(m){ TOKEN=m[1]; localStorage.setItem("wardogs.token",TOKEN);
         history.replaceState(null,"",location.pathname+location.search); }
  else TOKEN=localStorage.getItem("wardogs.token");
}catch(e){}

var authHeaders=function(){
  var h={"Content-Type":"application/json"};
  if(TOKEN) h["Authorization"]="Bearer "+TOKEN;
  return h;
};
var post=function(path,body){
  return fetch(API+path,{method:"POST",headers:authHeaders(),
    body:JSON.stringify(body)}).then(function(r){
      return r.json().then(function(j){ if(!r.ok){ var e=new Error(j.error||"That did not work."); e.needsLogin=j.needsLogin; throw e; } return j; });
    });
};
var signInUrl=function(){
  return API+"/auth/start?return="+encodeURIComponent(location.origin+location.pathname);
};
var signOut=function(){
  TOKEN=null; ME=null;
  try{ localStorage.removeItem("wardogs.token"); }catch(e){}
  location.reload();
};
/* Draws the sign-in strip above a form, or nothing at all if that form does not need an
   account. Returns whether the form should be usable. */
function authStrip(el,which){
  if(!ME||!ME.loginEnabled||!ME.needs[which]){
    if(ME&&ME.user) el.innerHTML='<div class="msg good">Signed in as <b>'+esc(ME.user.name)+
      '</b>. <a href="#" data-signout>Sign out</a></div>';
    return true;
  }
  if(ME.user){
    el.innerHTML='<div class="msg good">Signed in as <b>'+esc(ME.user.name)+
      '</b>. <a href="#" data-signout>Sign out</a></div>';
    return true;
  }
  el.innerHTML='<div class="msg"><b>Sign in with Discord to post.</b> It keeps bots out, '+
    'and it is how you get credited. Nothing is read except your username.<br>'+
    '<a class="btn sm" style="margin-top:12px" href="'+signInUrl()+'">Sign in with Discord</a></div>';
  return false;
}
document.addEventListener("click",function(e){
  var a=e.target.closest("[data-signout]");
  if(a){ e.preventDefault(); signOut(); }
});
var meReady=fetch(API+"/me",{headers:authHeaders()})
  .then(function(r){return r.json();})
  .then(function(j){ ME=j; if(j.loginEnabled&&TOKEN&&!j.user){ try{localStorage.removeItem("wardogs.token");}catch(e){} TOKEN=null; } return j; })
  .catch(function(){ ME={loginEnabled:false,needs:{},user:null}; });

/* ---- submit ---- */
var form=document.getElementById("submitForm");
if(form){
  var strip=document.createElement("div");
  form.parentNode.insertBefore(strip,form);
  meReady.then(function(){
    var allowed=authStrip(strip,"submit");
    form.querySelectorAll("input,textarea,button").forEach(function(el){ el.disabled=!allowed; });
    // a signed-in submission is credited to the account, so stop asking for a name
    if(allowed&&ME&&ME.user){
      var f=document.getElementById("sAuthor");
      if(f&&f.closest(".field")) f.closest(".field").style.display="none";
    }
  });
}
if(form) form.addEventListener("submit",function(e){
  e.preventDefault();
  var out=document.getElementById("submitMsg");
  // people paste the whole link; the design is the bit after #d=
  var raw=(document.getElementById("sCode").value||"").trim();
  var m=raw.match(/[#&]d=([A-Za-z0-9_-]+)/);
  var code=m?m[1]:raw;
  out.className="msg"; out.textContent="Sending...";
  post("/submit",{name:document.getElementById("sName").value,
                  author:document.getElementById("sAuthor").value,
                  note:document.getElementById("sNote").value,
                  code:code})
    .then(function(){
      form.reset();
      out.className="msg good";
      out.textContent="Thanks. It goes up once it has been looked over, usually the same day.";
    })
    .catch(function(err){ out.className="msg"; out.textContent=err.message; });
});

/* ---- the list ---- */
var list=document.getElementById("designList");
if(list){
  fetch(API+"/designs").then(function(r){return r.json();}).then(function(j){
    var ds=j.designs||[];
    if(!ds.length) return;                       // keep whatever static state is there
    list.innerHTML=ds.map(function(d){
      var score=(d.votes.up||0)-(d.votes.down||0);
      return '<details class="design"><summary>'+
        '<div class="card"><h3>'+esc(d.name)+'</h3>'+
        (d.note?'<p>'+esc(d.note)+'</p>':'')+
        '<div class="stats"><span>by</span>'+esc(d.author)+
        '<span>score</span><b data-role="score">'+score+'</b>'+
        '<span>'+ago(d.submitted)+'</span></div>'+
        '<div class="vote" data-design="'+esc(d.slug)+'" style="margin-top:14px">'+
        '<button type="button" data-dir="1" aria-label="Vote up">&#9650;</button>'+
        '<span class="score" data-role="n">'+score+'</span>'+
        '<button type="button" data-dir="-1" aria-label="Vote down">&#9660;</button>'+
        '<a class="btn sm" style="margin-left:14px" href="/planner/#d='+esc(d.code)+'">Open in planner</a>'+
        '</div></div></summary>'+
        '<div class="design-open" data-thread="'+esc(d.slug)+'">'+
        '<h3>Comments</h3><div class="thread" data-role="list"></div>'+
        '<form class="form" data-role="form" style="margin-top:16px">'+
        '<div class="field"><label>Your name</label><input maxlength="32" data-role="who" placeholder="anonymous"></div>'+
        '<div class="field"><label>Comment</label><textarea maxlength="1500" data-role="text" required></textarea></div>'+
        '<button class="btn sm" type="submit">Post comment</button>'+
        '<div class="msg" data-role="msg" style="display:none"></div></form></div></details>';
    }).join("");
    wireVotes(list);
    wireThreads(list);
  }).catch(function(){});
}

function wireVotes(root){
  root.querySelectorAll(".vote[data-design]").forEach(function(e){
    e.addEventListener("click",function(ev){
      var b=ev.target.closest("button[data-dir]"); if(!b) return;
      ev.preventDefault();
      var mine=b.dataset.cast==="1";
      post("/vote",{id:e.dataset.design,dir:mine?0:+b.dataset.dir}).then(function(t){
        var n=(t.up||0)-(t.down||0);
        e.querySelector('[data-role=n]').textContent=n;
        var card=e.closest(".card"); if(card){
          var s=card.querySelector('[data-role=score]'); if(s) s.textContent=n; }
        e.querySelectorAll("button").forEach(function(x){x.dataset.cast="";});
        if(t.you) b.dataset.cast="1";
      }).catch(function(){});
    });
  });
}

function wireThreads(root){
  root.querySelectorAll("details.design").forEach(function(det){
    var box=det.querySelector("[data-thread]"); if(!box) return;
    var slug=box.dataset.thread, loaded=false;
    var listEl=box.querySelector("[data-role=list]");
    var render=function(cs){
      listEl.innerHTML=cs.length
        ? cs.map(function(c){
            return '<div class="cmt"><span class="who">'+esc(c.author)+
              '<span class="when">'+ago(c.at)+'</span></span><p>'+esc(c.text)+'</p></div>';
          }).join("")
        : '<div class="cmt"><p>No comments yet.</p></div>';
    };
    det.addEventListener("toggle",function(){
      if(!det.open||loaded) return;
      loaded=true;
      fetch(API+"/comments?design="+encodeURIComponent(slug))
        .then(function(r){return r.json();}).then(function(j){render(j.comments||[]);})
        .catch(function(){});
    });
    // same sign-in strip above every comment box
    var cform=box.querySelector("[data-role=form]");
    var cstrip=document.createElement("div");
    cform.parentNode.insertBefore(cstrip,cform);
    meReady.then(function(){
      var allowed=authStrip(cstrip,"comment");
      cform.querySelectorAll("input,textarea,button").forEach(function(el){ el.disabled=!allowed; });
      if(allowed&&ME&&ME.user){
        var who=box.querySelector("[data-role=who]");
        if(who&&who.closest(".field")) who.closest(".field").style.display="none";
      }
    });
    cform.addEventListener("submit",function(e){
      e.preventDefault();
      var msg=box.querySelector("[data-role=msg]");
      var txt=box.querySelector("[data-role=text]");
      msg.style.display=""; msg.className="msg"; msg.textContent="Posting...";
      post("/comment",{design:slug,author:box.querySelector("[data-role=who]").value,text:txt.value})
        .then(function(){
          txt.value="";
          msg.className="msg good"; msg.textContent="Posted.";
          return fetch(API+"/comments?design="+encodeURIComponent(slug))
            .then(function(r){return r.json();}).then(function(j){render(j.comments||[]);});
        })
        .catch(function(err){ msg.className="msg"; msg.textContent=err.message; });
    });
  });
}
})();
</script>`;


// Designs shared before the planner moved to /planner/ carry their code in the root
// URL's hash. Forward those rather than dropping somebody on a marketing page.
const FORWARD_SHARED = `<script>
(function(){var m=(location.hash||"").match(/[#&]d=([A-Za-z0-9\\-_]+)/);
if(m)location.replace("/planner/#d="+m[1]);})();
</script>`;

/* Order is by submission date until a vote service exists; after that the client
   re-sorts on the fetched scores. Baking a stale ranking into a cached page would be
   worse than starting from newest. */

  return { AUTH_SCRIPT, COMMUNITY_SCRIPT, voteWidget, FORWARD_SHARED };
};
