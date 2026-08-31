/* The JavaScript that ships inside the generated pages: signing in, voting, comment
   threads, and the redirect for designs shared before the planner moved.

   These are strings that become <script> tags, so they cross two layers of quoting on
   the way out. Escapes have been eaten on that route before. tools/check-build.js
   parses every generated page's inline scripts, which is what catches it. */
module.exports = ctx => {
  const { path, esc, stats, page, written, VOTE_API } = ctx;
  const fs = require("fs");
  const ROOT = path.join(__dirname, "..", "..");


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
      /* Your name is the control, and what you can do with the account sits under it.
         Sign out used to be a second link in the header, level with the name and with
         everything else up there, which put the one destructive account action in the
         busiest row on the page next to things you press all the time. */
      el.innerHTML = j.user
        ? '<button type="button" class="who" data-acctmenu aria-expanded="false">'+
            esc(j.user.name)+'<span class="caret">&#9662;</span></button>'+
          '<div class="acct-menu" hidden>'+
            '<a href="/account/">Your designs</a>'+
            '<a href="#" data-signout>Sign out</a>'+
          '</div>'
        : '<a href="'+A.signInUrl()+'">Sign in</a>';
      var btn=el.querySelector("[data-acctmenu]"), menu=el.querySelector(".acct-menu");
      if(btn){
        var shut=function(){ menu.hidden=true; btn.setAttribute("aria-expanded","false"); };
        btn.addEventListener("click",function(ev){
          ev.stopPropagation();
          menu.hidden=!menu.hidden;
          btn.setAttribute("aria-expanded",String(!menu.hidden));
        });
        document.addEventListener("click",function(ev){ if(!el.contains(ev.target)) shut(); });
        document.addEventListener("keydown",function(ev){ if(ev.key==="Escape") shut(); });
      }
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
/* The same decoder and the same palette the planner uses, read from the file that holds
   them. The share format already had two encoders drift apart once, and its card says the
   count of places is the point, so the community list did not get a decoder of its own.

   The table under it is the slice of the catalog a picture needs: how big a piece is and
   what colour it paints. Not the names, prices, art or effects, because a thumbnail shows
   none of those and the list would carry the whole catalog to every reader for nothing. */
const SHARED_VIEW = fs.readFileSync(
  path.join(ROOT, "src/shared/design-view.js"), "utf8");
const THUMB_DEFS = JSON.stringify(
  (ctx.catalog.buildables || []).reduce((m, b) => {
    m[b.id] = { footprint: b.footprint, role: b.role, tier: b.tier };
    return m;
  }, { __fob__: { footprint: (ctx.catalog.fob || {}).footprint || { w: 3, d: 3 },
                  isFob: true } }));

const COMMUNITY_SCRIPT = !VOTE_API ? "" : `<script>${SHARED_VIEW}
var THUMB_DEFS = ${THUMB_DEFS};
</script><script>
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
  /* Ranking by raw score ranks by age: a design posted today starts at nothing and can
     never catch one that has been collecting votes for a month, however much better it is.
     Dividing by age fixes that, but the usual exponent of 1.5 overcorrects and buries good
     old work: a month-old design with sixty votes came out below a two-minute-old one with
     a single vote, which is the same complaint from the other end.

     0.7 with a twelve hour grace was picked by trying them against realistic cases rather
     than by taste. It gives a gradient instead of a cliff: liked-and-recent on top,
     liked-and-old still mid-table, unproven new things low, disliked last. A one-day-old
     design needs about eight net votes to top a month-old sixty-vote favourite, and an
     hour-old one needs four. The grace period is what stops a single first vote spiking
     something to the top for an hour.

     New exists because of the other half of the problem: under any ranking, a design with
     no votes is invisible, so it never gets a first vote and never can. New is where a
     first vote comes from. */
  var RANK = {
    hot: function(d){
      var age=(Date.now()-d.submitted)/3600000;
      return ((d.votes.up||0)-(d.votes.down||0)) / Math.pow(age+12, 0.7);
    },
    top: function(d){ return (d.votes.up||0)-(d.votes.down||0); },
    "new": function(d){ return d.submitted; }
  };
  var sortBy="hot", allDesigns=[];

  /* Signed in, so the worker can mark which of these are yours. It answers with a flag and
     never with the submitter's account id, which it used to put in this public list. */
  fetch(API+"/designs",{headers:authHeaders()}).then(function(r){return r.json();}).then(function(j){
    var ds=j.designs||[];
    if(!ds.length) return;                       // keep whatever static state is there
    allDesigns=ds;
    var tabs=document.createElement("div");
    /* "sorts" so these three sit at the width of three words. The plain chips row is a
       filter bar built to span its column next to a search box, and three tabs wearing it
       drew a grey band most of the way across the page with nothing in it. */
    tabs.className="chips sorts";
    tabs.style.margin="0 0 18px";
    tabs.innerHTML=["hot","new","top"].map(function(k){
      return '<button class="chip" data-sort="'+k+'" aria-pressed="'+(k==="hot")+'">'+
        (k==="hot"?"Hot":k==="new"?"New":"Top")+'</button>';
    }).join("");
    list.parentNode.insertBefore(tabs,list);
    tabs.addEventListener("click",function(ev){
      var b=ev.target.closest("button[data-sort]"); if(!b) return;
      sortBy=b.dataset.sort;
      tabs.querySelectorAll("button").forEach(function(o){
        o.setAttribute("aria-pressed", String(o===b)); });
      render();
    });
    render();
  }).catch(function(){});

  function render(){
    var ds=allDesigns.slice().sort(function(a,b){ return RANK[sortBy](b)-RANK[sortBy](a); });
    /* The same grid the built-in list uses. This one wrote its cards straight into the
       container, so the moment the worker answered, a tidy grid of designs was replaced by
       a column of full width rows. Two renderers, one look, and only one of them had it. */
    list.innerHTML='<div class="grid">'+ds.map(function(d){
      var score=(d.votes.up||0)-(d.votes.down||0);
      return '<details class="design"><summary>'+
        '<div class="card">'+
        /* The base itself, before its name. A layout is what somebody is choosing between,
           and a list of names tells you nothing about any of them. */
        '<canvas class="thumb" data-code="'+esc(d.code)+'" width="600" height="300" '+
          'aria-label="Overhead plan of '+esc(d.name)+'"></canvas>'+
        '<h3>'+esc(d.name)+'</h3>'+
        (d.note?'<p>'+esc(d.note)+'</p>':'')+
        '<div class="stats"><span>by</span>'+esc(d.author)+
        (d.mine?'<span style="color:var(--accent)">yours</span>':'')+
        '<span>score</span><b data-role="score">'+score+'</b>'+
        '<span>'+ago(d.submitted)+'</span></div>'+
        '<div class="vote" data-design="'+esc(d.slug)+'" style="margin-top:14px">'+
        '<button type="button" data-dir="1" aria-label="Vote up">&#9650;</button>'+
        '<span class="score" data-role="n">'+score+'</span>'+
        '<button type="button" data-dir="-1" aria-label="Vote down">&#9660;</button>'+
        '<a class="btn sm" style="margin-left:14px" href="/planner/#d='+esc(d.code)+'">Open in planner</a>'+
        /* Your own work offers the button that makes sense on it. Reporting yourself does
           not, and being unable to take your own post down is the wrong shape entirely. */
        (d.mine
          ? '<button type="button" class="btn sm" data-withdraw="'+esc(d.slug)+'" '+
              'style="margin-left:8px" '+
              'title="Remove this from the list. It cannot be undone.">Take it down</button>'
          : '<button type="button" class="btn sm" data-report="'+esc(d.slug)+'" '+
              'style="margin-left:8px;opacity:.6" '+
              'title="Report this for a name or content that should not be here">Report</button>')+
        '</div></div></summary>'+
        '<div class="design-open" data-thread="'+esc(d.slug)+'">'+
        '<h3>Comments</h3><div class="thread" data-role="list"></div>'+
        '<form class="form" data-role="form" style="margin-top:16px">'+
        '<div class="field"><label>Your name</label><input maxlength="32" data-role="who" placeholder="anonymous"></div>'+
        '<div class="field"><label>Comment</label><textarea maxlength="1500" data-role="text" required></textarea></div>'+
        '<button class="btn sm" type="submit">Post comment</button>'+
        '<div class="msg" data-role="msg" style="display:none"></div></form></div></details>';
    }).join("")+'</div>';
    wireVotes(list);
    wireThreads(list);
    wireReports(list);
    wireWithdraw(list);
    paintThumbs(list);
  }

  /* Decoding is real work and a long list would do all of it before showing anything, so
     each picture is painted when it is about to be seen. A base that will not decode simply
     leaves no picture: a broken frame would be worse than none, and the card still has its
     name, its author and its link. */
  function paintThumbs(root){
    var pending=[].slice.call(root.querySelectorAll("canvas.thumb[data-code]"));
    var paint=function(cv){
      if(cv.dataset.painted) return;
      cv.dataset.painted="1";
      WardogsDesignView.decode(cv.dataset.code, function(t){ return !!THUMB_DEFS[t]; })
        .then(function(d){
          var ok=WardogsDesignView.drawThumb(cv, d.pieces, function(t){ return THUMB_DEFS[t]; });
          if(!ok) cv.style.display="none";
        })
        .catch(function(){ cv.style.display="none"; });
    };
    if(!("IntersectionObserver" in window)){ pending.forEach(paint); return; }
    var io=new IntersectionObserver(function(entries){
      entries.forEach(function(e){ if(e.isIntersecting){ paint(e.target); io.unobserve(e.target); } });
    },{rootMargin:"200px"});
    pending.forEach(function(cv){ io.observe(cv); });
  }

  /* Taking your own design down removes it here and in storage, comments and votes with it.
     It is the one destructive thing a visitor can do, so it asks first and says plainly that
     it does not come back. */
  function wireWithdraw(root){
    root.querySelectorAll("[data-withdraw]").forEach(function(b){
      b.addEventListener("click",function(ev){
        ev.preventDefault();
        if(b.disabled) return;
        if(!window.confirm("Take this design down for good? Its votes and comments go too.")) return;
        b.disabled=true; b.textContent="Taking it down...";
        post("/withdraw",{slug:b.dataset.withdraw}).then(function(){
          allDesigns=allDesigns.filter(function(d){ return d.slug!==b.dataset.withdraw; });
          render();
        }).catch(function(err){
          b.disabled=false; b.textContent="Take it down";
          alert(err && err.message ? err.message : "That did not go through.");
        });
      });
    });
  }
}

/* Reporting is the other half of publishing straight away. Three reports and a design takes
   itself off the list until a person looks, which is reversible; nothing here deletes. */
function wireReports(root){
  root.querySelectorAll("[data-report]").forEach(function(b){
    b.addEventListener("click",function(ev){
      ev.preventDefault();
      if(b.disabled) return;
      if(!window.confirm("Report this design? It hides once a few people have.")) return;
      b.disabled=true; b.textContent="Reporting...";
      post("/report",{id:b.dataset.report}).then(function(t){
        b.textContent=t.already?"Already reported":(t.hidden?"Hidden":"Reported");
      }).catch(function(err){
        b.disabled=false; b.textContent="Report";
        alert(err && err.message ? err.message : "That did not go through.");
      });
    });
  });
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
      }).catch(function(err){
        /* This used to swallow the error, so a vote that did not count looked exactly like
           a vote that did: the arrow moved and nothing happened. The free tier allows a
           thousand writes a day and a vote costs two of them, so running out is a real
           thing that will happen on a busy day, and it should say so rather than leave
           somebody clicking. */
        var n=e.querySelector('[data-role=n]');
        if(n){
          var was=n.textContent;
          n.textContent="!";
          n.title=(err && err.message) ? err.message : "That vote did not go through.";
          setTimeout(function(){ n.textContent=was; n.title=""; },2500);
        }
      });
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
