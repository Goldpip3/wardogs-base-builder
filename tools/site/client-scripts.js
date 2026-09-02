/* The JavaScript that ships inside the generated pages: signing in, voting, comment
   threads, and the redirect for designs shared before the planner moved.

   These are strings that become <script> tags, so they cross two layers of quoting on
   the way out. Escapes have been eaten on that route before. tools/check-build.js
   parses every generated page's inline scripts, which is what catches it. */
module.exports = ctx => {
  const { path, esc, stats, page, written, VOTE_API, TAG_GROUPS } = ctx;
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
    /* The banner is drawn by src/shared/acct-bar.js, which the shell inlines under the
       header and the planner inlines under its copy of it. One renderer, because the name
       is part of the banner's geometry and two of these drifting moves the boxes on one
       page and not the other.

       By DOMContentLoaded that script has certainly run. Before it, this reply can beat the
       parser to the body on a warm cache, and calling a painter that does not exist yet
       loses the answer entirely. */
    var show=function(){
      if(!window.wardogsAcct) return;
      wardogsAcct.remember(j);
      wardogsAcct.paint(j, A.signInUrl());
    };
    if(document.readyState==="loading")
      document.addEventListener("DOMContentLoaded",show);
    else show();
    return j;
  })
  .catch(function(){ A.me={loginEnabled:false,needs:{},user:null}; return A.me; });
document.addEventListener("click",function(e){
  if(e.target.closest("[data-signout]")){ e.preventDefault();
    if(window.wardogsAcct) wardogsAcct.forget();
    A.signOut(); }
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

/* The banner's account control, inlined under the header rather than run from the head, so
   it paints the cached name while the page is still parsing. See the file for why the first
   frame matters. build.ps1 inlines the same file into the planner. */
const ACCT_BAR = "<scr" + "ipt>" +
  fs.readFileSync(path.join(ROOT, "src/shared/acct-bar.js"), "utf8") + "</scr" + "ipt>";
/* Which way the page turns, in the head because it has to land before the first frame. See
   the file. build.ps1 inlines the same file into the hosted planner. */
const PAGE_TURN = "<scr" + "ipt>" +
  fs.readFileSync(path.join(ROOT, "src/shared/page-turn.js"), "utf8") + "</scr" + "ipt>";
const CREW_LABELS = JSON.stringify(
  (((ctx.catalog.crewSizes || {}).options) || []).reduce((m, o) => {
    m[o.id] = o.label;
    return m;
  }, {}));
const THUMB_DEFS = JSON.stringify(
  (ctx.catalog.buildables || []).reduce((m, b) => {
    m[b.id] = { footprint: b.footprint, role: b.role, tier: b.tier };
    return m;
  }, { __fob__: { footprint: (ctx.catalog.fob || {}).footprint || { w: 3, d: 3 },
                  isFob: true } }));

const COMMUNITY_SCRIPT = !VOTE_API ? "" : `<script>${SHARED_VIEW}
var THUMB_DEFS = ${THUMB_DEFS};
var CREW_LABELS = ${CREW_LABELS};
/* The tag vocabulary, from data/community.json. Every tag the pages draw comes from here,
   which is why an id the worker happens to be storing but this list does not know simply
   does not appear: the store is deliberately dumb about which tags exist. */
var DESIGN_TAGS = ${JSON.stringify(TAG_GROUPS)};
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
var TAG_LABEL={};
DESIGN_TAGS.forEach(function(g){ g.tags.forEach(function(t){ TAG_LABEL[t.id]=t.label; }); });
/* A tag with no entry above draws nothing. It got into storage some other way, and putting
   text nobody picked from a list onto a card is the one thing the vocabulary prevents. */
function tagPills(tags){
  var known=(tags||[]).filter(function(t){ return TAG_LABEL[t]; });
  if(!known.length) return "";
  return '<div class="tagrow">'+known.map(function(t){
    return '<span class="tag">'+esc(TAG_LABEL[t])+'</span>'; }).join("")+'</div>';
}

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

/* The public list, fetched once however many blocks on the page want it. The designs page
   wants it twice: to draw the list, and to tell which of your saved designs are already in
   it. Two fetches would also be two answers, so a design could be shown as both published
   and not published on the same screen. Signed in, so the worker can flag which are yours;
   it answers with a flag and never with the submitter's account id. */
var designsReq=null;
function communityDesigns(){
  if(!designsReq) designsReq=fetch(API+"/designs",{headers:authHeaders()})
    .then(function(r){return r.json();})
    .then(function(j){ return j.designs||[]; })
    .catch(function(){ return []; });
  return designsReq;
}
/* Assigned by the list block below if this page has one. Sending a design up for voting
   has to show it arriving, and the block that can redraw the list is not the block that
   holds the button. The account page has no list to redraw and still has to forget the
   answer it was given before the design existed. */
var reloadCommunity=function(){ designsReq=null; return Promise.resolve(); };

/* There is no paste-a-share-code form any more, and no code here for one. Submitting
   happens in the two places that already hold the design: the planner's Designs panel, and
   the Put it up for voting button on your own saved designs below. Both now ask for tags,
   which is a second thing a form would have had to grow a third copy of. */

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
  /* The home page shows the same list, shorter and without the tabs, so this renderer
     serves both rather than a second one drifting away from it. */
  var LIMIT=parseInt(list.getAttribute("data-limit")||"0",10);
  var NOTABS=list.hasAttribute("data-notabs");
  /* How many cards arrive at a time. Every card decodes a share code and paints a plan of
     the base, so a list of two hundred is two hundred decodes standing between somebody and
     the first design. Twelve fills a desktop screen and a bit; the rest arrives as the
     bottom comes into view, which is also what keeps a long list usable on a phone. */
  var PAGE=12;
  var sortBy="hot", allDesigns=[], sorted=[], shown=0, grid=null, moreBar=null;
  /* Which tags are being filtered on, as an id to true map. Not in the URL: a filtered
     list is somebody looking, not somebody linking, and the thing worth sharing from this
     page is a design rather than a view of the list. */
  var tagFilter={}, filterBox=null;

  /* Sending one of your own saved designs up has to show it arriving here, and the block
     holding that button is not the block that can redraw this list. */
  reloadCommunity=function(){
    designsReq=null;
    return communityDesigns().then(function(ds){
      if(!ds.length) return;
      allDesigns=ds;
      if(!NOTABS) buildFilters();
      render();
    });
  };

  communityDesigns().then(function(ds){
    if(!ds.length) return;                       // keep whatever static state is there
    allDesigns=ds;
    /* Anything that only makes sense once designs exist, such as the See all link on the
       home page, is hidden in the markup and revealed here. */
    Array.prototype.forEach.call(document.querySelectorAll("[data-when-designs]"),
      function(el){ el.hidden=false; });
    if(NOTABS){ render(); return; }
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
    buildFilters();
    render();
  }).catch(function(){});

  /* ---- filtering ----
     And across groups, or inside one. Bakurani with Ozeti means either map; Bakurani with
     Anti-air means both have to be true. The groups are different questions, so that is the
     only reading of two rows of chips that does what somebody expects. */
  function pickedIn(g){
    return g.tags.filter(function(t){ return tagFilter[t.id]; });
  }
  function matches(d,g){
    var picked=pickedIn(g);
    if(!picked.length) return true;
    var tags=d.tags||[];
    return picked.some(function(t){ return tags.indexOf(t.id)>=0; });
  }
  function passesFilter(d){
    return DESIGN_TAGS.every(function(g){ return matches(d,g); });
  }

  /* The number on a chip is what pressing it would leave you with, so every other group's
     filter counts and its own does not. A count that ignored the rest of the bar would
     offer you a nine and hand you nothing. */
  function countFor(gi,tagId){
    var n=0;
    allDesigns.forEach(function(d){
      if((d.tags||[]).indexOf(tagId)<0) return;
      for(var i=0;i<DESIGN_TAGS.length;i++)
        if(i!==gi && !matches(d,DESIGN_TAGS[i])) return;
      n++;
    });
    return n;
  }

  /* Only tags something in the list actually carries. Ten chips over an empty list, nine of
     which return nothing, is a worse first impression than no bar at all, and this list
     starts small. Built once: which tags exist does not change while the page is open. */
  function buildFilters(){
    /* Rebuilt rather than patched when the list changes, because sending your own design up
       can introduce a tag nothing in the list had, and a bar that cannot offer it is a
       filter that hides the design you just published. */
    if(filterBox){ filterBox.remove(); filterBox=null; }
    var used={};
    allDesigns.forEach(function(d){ (d.tags||[]).forEach(function(t){ used[t]=true; }); });
    var rows=DESIGN_TAGS.map(function(g,gi){
      var ts=g.tags.filter(function(t){ return used[t.id]; });
      if(ts.length<2) return "";                 // one chip filters nothing
      return '<div class="frow"><span class="flabel">'+esc(g.label)+'</span>'+
        '<span class="chips">'+ts.map(function(t){
          return '<button type="button" class="chip" data-tag="'+esc(t.id)+'" data-group="'+gi+
            '" aria-pressed="false">'+esc(t.label)+' <small data-role="n"></small></button>';
        }).join("")+'</span></div>';
    }).join("");
    if(!rows) return;
    filterBox=document.createElement("div");
    filterBox.className="tagfilter";
    filterBox.innerHTML=rows+
      '<button type="button" class="clear" hidden>Clear filters</button>';
    list.parentNode.insertBefore(filterBox,list);
    filterBox.addEventListener("click",function(ev){
      var c=ev.target.closest("button[data-tag]");
      if(c){
        var id=c.getAttribute("data-tag");
        if(tagFilter[id]) delete tagFilter[id]; else tagFilter[id]=true;
        render(); return;
      }
      if(ev.target.closest(".clear")){ tagFilter={}; render(); }
    });
  }

  function paintFilters(){
    if(!filterBox) return;
    var any=false;
    filterBox.querySelectorAll("button[data-tag]").forEach(function(b){
      var id=b.getAttribute("data-tag"), on=!!tagFilter[id];
      if(on) any=true;
      b.setAttribute("aria-pressed",on?"true":"false");
      var n=countFor(+b.getAttribute("data-group"),id);
      b.setAttribute("data-empty",(!on&&!n)?"1":"0");
      b.querySelector("[data-role=n]").textContent=n;
    });
    filterBox.querySelector(".clear").hidden=!any;
  }

  /* Sorting and the first page. Everything after the first page is appended rather than
     redrawn, so a comment thread somebody has open is not shut by the next page arriving. */
  function render(){
    paintFilters();
    sorted=allDesigns.filter(passesFilter)
      .sort(function(a,b){ return RANK[sortBy](b)-RANK[sortBy](a); });
    if(LIMIT>0) sorted=sorted.slice(0,LIMIT);
    if(!sorted.length){
      /* Only reachable with a filter on: the block above returns before rendering when the
         worker has no designs at all, so the static empty state stays. */
      list.innerHTML='<div class="empty"><h3>Nothing matches that</h3>'+
        '<p>No design carries every tag you have picked. Take one off, or start again.</p>'+
        '<button type="button" class="btn sm" data-role="clearall">Clear filters</button></div>';
      list.querySelector("[data-role=clearall]").addEventListener("click",function(){
        tagFilter={}; render(); });
      return;
    }
    shown=0;
    /* The same grid the built-in list uses. This one wrote its cards straight into the
       container, so the moment the worker answered, a tidy grid of designs was replaced by
       a column of full width rows. Two renderers, one look, and only one of them had it. */
    list.innerHTML='<div class="grid design-grid"></div>'+
      '<div class="more" hidden><button class="btn sm" type="button" data-role="more">'+
      'Show more</button><span data-role="left"></span></div>';
    grid=list.querySelector(".grid");
    moreBar=list.querySelector(".more");
    moreBar.querySelector("[data-role=more]").addEventListener("click",showMore);
    /* The button is the real control and the observer only presses it early, so a browser
       without IntersectionObserver loses the scrolling and keeps the list. */
    if("IntersectionObserver" in window){
      var io=new IntersectionObserver(function(es){
        es.forEach(function(e){ if(e.isIntersecting && !moreBar.hidden) showMore(); });
      },{rootMargin:"400px"});
      io.observe(moreBar);
    }
    showMore();
  }

  /* One page of cards, wired before they are attached so nothing is bound twice. */
  function showMore(){
    var next=sorted.slice(shown,shown+PAGE);
    shown+=next.length;
    if(next.length){
      var frag=document.createElement("div");
      frag.innerHTML=cardsHTML(next);
      wireVotes(frag); wireThreads(frag); wireReports(frag); wireWithdraw(frag);
      while(frag.firstChild) grid.appendChild(frag.firstChild);
      paintThumbs(grid);
    }
    var left=sorted.length-shown;
    moreBar.hidden=left<=0;
    moreBar.querySelector("[data-role=left]").textContent=
      left>0?(left+" more design"+(left===1?"":"s")):"";
  }

  function cardsHTML(ds){
    return ds.map(function(d){
      var score=(d.votes.up||0)-(d.votes.down||0);
      return '<details class="design"><summary>'+
        '<div class="card">'+
        /* The base itself, before its name. A layout is what somebody is choosing between,
           and a list of names tells you nothing about any of them. */
        '<canvas class="thumb" data-code="'+esc(d.code)+'" width="600" height="300" '+
          'aria-label="Overhead plan of '+esc(d.name)+'"></canvas>'+
        '<h3>'+esc(d.name)+'</h3>'+
        (d.note?'<p>'+esc(d.note)+'</p>':'')+
        tagPills(d.tags)+
        '<div class="stats"><span>by</span>'+esc(d.author)+
        (d.mine?'<span style="color:var(--accent)">yours</span>':'')+
        /* Who it takes to hold the base. It travels inside the share code rather than
           beside it, so there is one copy of the answer and it survives being passed on as
           a link. The card has already decoded the code to paint the picture, so this costs
           nothing extra; the slot is filled when that lands. */
        '<span class="crew" data-crew-for="'+esc(d.slug)+'" hidden></span>'+
        '<span>score</span><b data-role="score">'+score+'</b>'+
        '<span>'+ago(d.submitted)+'</span></div>'+
        /* No inline margin here: an inline style beats the stylesheet, and the stylesheet is
           what drops this row to the bottom of the card so the buttons line up across a row. */
        '<div class="vote" data-design="'+esc(d.slug)+'">'+
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
    }).join("");
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

/* Decoding is real work and a long list would do all of it before showing anything, so
   each picture is painted when it is about to be seen. A base that will not decode simply
   leaves no picture: a broken frame would be worse than none, and the card still has its
   name, its author and its link.

   Both lists on the designs page paint through this, and the public one calls it again for
   every page of cards it appends, so an already watched canvas is marked and skipped. */
function paintThumbs(root){
  var pending=[].slice.call(root.querySelectorAll("canvas.thumb[data-code]:not([data-watched])"));
  pending.forEach(function(cv){ cv.setAttribute("data-watched","1"); });
  var paint=function(cv){
    if(cv.dataset.painted) return;
    cv.dataset.painted="1";
    WardogsDesignView.decode(cv.dataset.code, function(t){ return !!THUMB_DEFS[t]; })
      .then(function(d){
        var ok=WardogsDesignView.drawThumb(cv, d.pieces, function(t){ return THUMB_DEFS[t]; });
        if(!ok) cv.style.display="none";
        var slot=cv.closest(".card").querySelector("[data-crew-for]");
        if(slot && d.crew && CREW_LABELS[d.crew]){
          // same shape as the other stats: a dim label, then the value
          slot.innerHTML='<span>players</span><b>'+esc(CREW_LABELS[d.crew])+'</b>';
          slot.hidden=false;
        }
      })
      .catch(function(){ cv.style.display="none"; });
  };
  if(!("IntersectionObserver" in window)){ pending.forEach(paint); return; }
  var io=new IntersectionObserver(function(entries){
    entries.forEach(function(e){ if(e.isIntersecting){ paint(e.target); io.unobserve(e.target); } });
  },{rootMargin:"200px"});
  pending.forEach(function(cv){ io.observe(cv); });
}

/* ---- your own saved designs ----
   Under the public list on the designs page, and the whole of the account page. They are
   two different things and the page says which is which: the list above is published and
   being voted on, this one is yours, private, and stays that way until you send one up.

   Nothing here is a second copy of the account page's list. That page used to carry its own
   renderer and this is now the only one, because two lists of the same designs drifting
   apart is exactly the kind of thing this codebase has been bitten by. */
var mineBox=document.getElementById("mineList");
if(mineBox){
  var mySaved=[], mySlots=0, publishedCode={};
  /* The account page carries this block without the public list, so 'see it in the list'
     has somewhere to go from there too. */
  var LIST_HREF=document.getElementById('designList')?'#community':'/designs/#community';

  meReady.then(function(){
    if(!ME || !ME.loginEnabled){
      mineBox.innerHTML='<div class="empty"><h3>Accounts are not live</h3>'+
        '<p>Designs still save into this browser from the planner.</p></div>';
      return;
    }
    if(!ME.user){
      mineBox.innerHTML='<div class="empty"><h3>Sign in to see yours</h3>'+
        '<p>Designs saved from the planner live against your Discord account, so they '+
        'follow you to another browser or machine. From here you can send one up to the '+
        'list above whenever it is ready.</p>'+
        '<a class="btn primary" href="'+signInUrl()+'">Sign in with Discord</a></div>';
      return;
    }
    return loadMine();
  });

  /* Both answers or neither. Which of your saved designs are already published is a
     question about both lists, and asking them separately would let a card claim it is
     not up for voting while the copy of it sits in the list above. */
  function loadMine(){
    return Promise.all([
      fetch(API+"/mine",{headers:authHeaders()}).then(function(r){return r.json();}),
      communityDesigns()
    ]).then(function(r){
      mySaved=r[0].designs||[];
      mySlots=r[0].limit||0;
      publishedCode={};
      r[1].forEach(function(d){ if(d.mine) publishedCode[d.code]=d; });
      renderMine();
    }).catch(function(){
      mineBox.innerHTML='<div class="msg">Could not reach the save service.</div>';
    });
  }

  function renderMine(){
    if(!mySaved.length){
      mineBox.innerHTML='<div class="empty"><h3>Nothing saved yet</h3>'+
        '<p>Open a design in the planner, press <strong>Designs</strong>, then '+
        '<strong>Save this design online</strong>. It lands here, and you can put it up '+
        'for voting whenever you like.</p>'+
        '<a class="btn primary" href="/planner/">Open the planner</a></div>';
      return;
    }
    mineBox.innerHTML='<div class="grid design-grid">'+mySaved.map(function(d,i){
      var up=publishedCode[d.code];
      return '<div class="card" data-mine="'+i+'">'+
        '<canvas class="thumb" data-code="'+esc(d.code)+'" width="600" height="300" '+
          'aria-label="Overhead plan of '+esc(d.name)+'"></canvas>'+
        '<h3>'+esc(d.name)+'</h3>'+
        '<div class="stats"><span>saved</span>'+esc(new Date(d.at).toLocaleDateString())+
        '<span class="crew" data-crew-for="mine'+i+'" hidden></span>'+
        (up?'<span style="color:var(--accent)">up for voting</span>':'')+'</div>'+
        '<div class="vote" data-role="actions">'+
        '<a class="btn sm" href="/planner/#d='+esc(d.code)+'">Open in planner</a>'+
        (up
          ? '<a class="btn sm" href="'+LIST_HREF+'">See it in the list</a>'
          : '<button type="button" class="btn sm primary" data-publish="'+i+'">Put it up '+
            'for voting</button>')+
        '<button type="button" class="btn sm" data-copy="'+i+'">Copy link</button>'+
        '<button type="button" class="btn sm" data-forget="'+i+'">Delete</button>'+
        '</div></div>';
    }).join("")+'</div>'+
    (mySlots?'<p style="margin-top:18px;font-size:13px;color:var(--dim)">'+
      mySaved.length+' of '+mySlots+' slots used.</p>':'');
    paintThumbs(mineBox);
  }

  /* One listener for the whole block rather than one per button, because every one of
     these actions redraws the cards underneath it. */
  mineBox.addEventListener("click",function(ev){
    var card=ev.target.closest("[data-mine]");
    var d=card?mySaved[+card.getAttribute("data-mine")]:null;

    var pub=ev.target.closest("[data-publish]");
    if(pub && d){ askNote(card,d); return; }

    var pick=ev.target.closest("[data-pick]");
    if(pick){ togglePick(pick.closest("[data-role=actions]"),pick); return; }

    var send=ev.target.closest("[data-send]");
    if(send && d){ publish(card,d,send); return; }

    if(ev.target.closest("[data-cancel]")){ renderMine(); return; }

    var cp=ev.target.closest("[data-copy]");
    if(cp && d){
      var url=location.origin+"/planner/#d="+d.code;
      navigator.clipboard.writeText(url).then(function(){
        var was=cp.textContent; cp.textContent="Copied";
        setTimeout(function(){ cp.textContent=was; },1400);
      }).catch(function(){ window.prompt("Copy this link",url); });
      return;
    }

    var del=ev.target.closest("[data-forget]");
    if(del && d){
      if(!window.confirm('Delete "'+d.name+'" from your account? The copy in your browser '+
        'is not touched'+(publishedCode[d.code]?", and the one up for voting stays up":"")+'.')) return;
      del.disabled=true;
      post("/mine/delete",{name:d.name}).then(loadMine).catch(function(err){
        del.disabled=false;
        alert(err && err.message ? err.message : "That did not go through.");
      });
      return;
    }
  });

  /* A design in the public list is being chosen between, so it gets the one line that says
     what it is for and the tags people filter on. Asking here rather than in a prompt box
     keeps it on the card it belongs to.

     The tags are asked for once, here, and never afterwards: nothing on the site edits a
     published design. That is deliberate for now, and it is why the map group is marked with
     a star rather than left to be discovered by a rejection from the worker. */
  function askNote(card,d){
    var row=card.querySelector("[data-role=actions]");
    row.innerHTML='<div class="field" style="flex:1 1 100%">'+
      '<input data-role="note" maxlength="300" placeholder="One line about it (optional)">'+
      '</div>'+
      '<div class="tagpick" style="flex:1 1 100%">'+DESIGN_TAGS.map(function(g,gi){
        return '<span class="flabel"'+(g.hint?' title="'+esc(g.hint)+'"':'')+'>'+esc(g.label)+
          (g.required?' *':'')+'</span><span class="chips">'+g.tags.map(function(t){
            return '<button type="button" class="chip" data-pick="'+esc(t.id)+'" data-group="'+
              gi+'" aria-pressed="false"'+(t.hint?' title="'+esc(t.hint)+'"':'')+'>'+
              esc(t.label)+'</button>';
          }).join("")+'</span>';
      }).join("")+'</div>'+
      '<button type="button" class="btn sm primary" data-send="1">Send it up</button>'+
      '<button type="button" class="btn sm" data-cancel="1">Cancel</button>'+
      '<div class="msg" data-role="msg" style="display:none;flex:1 1 100%"></div>';
    var box=row.querySelector("[data-role=note]");
    if(box) box.focus();
  }

  /* Any map and a named map answer the same question, so one clears the other rather than
     both sitting pressed and the design claiming both. */
  function togglePick(row,b){
    var gi=+b.getAttribute("data-group"), g=DESIGN_TAGS[gi];
    var id=b.getAttribute("data-pick");
    var def=null;
    g.tags.forEach(function(t){ if(t.id===id) def=t; });
    var on=b.getAttribute("aria-pressed")!=="true";
    if(on) row.querySelectorAll("[data-pick][data-group='"+gi+"']").forEach(function(o){
      if(o===b) return;
      var oid=o.getAttribute("data-pick"), odef=null;
      g.tags.forEach(function(t){ if(t.id===oid) odef=t; });
      if(def.exclusive || (odef && odef.exclusive)) o.setAttribute("aria-pressed","false");
    });
    b.setAttribute("aria-pressed",on?"true":"false");
  }
  function picksIn(row){
    var out=[];
    row.querySelectorAll('[data-pick][aria-pressed="true"]').forEach(function(b){
      out.push(b.getAttribute("data-pick")); });
    return out;
  }

  function publish(card,d,btn){
    var row=card.querySelector("[data-role=actions]");
    var note=row.querySelector("[data-role=note]");
    var msg=row.querySelector("[data-role=msg]");
    var tags=picksIn(row);
    /* Said here rather than left to the worker's refusal. The worker checks the same thing
       and has to, since it is the only side a crafted request meets, but a person who has
       just pressed a button deserves to be told which chip is missing rather than handed a
       four hundred. */
    var missing=DESIGN_TAGS.filter(function(g){
      return g.required && !g.tags.some(function(t){ return tags.indexOf(t.id)>=0; });
    });
    if(missing.length){
      if(msg){ msg.style.display=""; msg.className="msg";
               msg.textContent="Pick "+missing[0].label.toLowerCase()+" first, so people can "+
                 "find it by map."; }
      return;
    }
    btn.disabled=true; btn.textContent="Sending...";
    post("/submit",{name:d.name,code:d.code,note:note?note.value:"",tags:tags})
      .then(function(){
        /* The public list first, then this one. Both read the same answer, and asking for
           them at once meant this block read the copy fetched before the design existed:
           the list above gained the design and the card under it still offered to send it. */
        return reloadCommunity().then(function(){ return loadMine(); });
      })
      .catch(function(err){
        btn.disabled=false; btn.textContent="Send it up";
        if(msg){ msg.style.display=""; msg.className="msg";
                 msg.textContent=err && err.message ? err.message : "That did not go through."; }
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

  return { AUTH_SCRIPT, ACCT_BAR, PAGE_TURN, COMMUNITY_SCRIPT, voteWidget, FORWARD_SHARED };
};
