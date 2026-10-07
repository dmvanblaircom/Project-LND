(function(){
"use strict";

// The team this Suite is built around. index.html loads teams/<team>.js and
// teamos/*.js before this file; TeamOS turns the config's `team` section
// into a validated, frozen, provider-neutral Team, and everything ESPN
// knows about it arrives as domain objects (docs/03_DOMAIN_MODEL.md). The
// only provider config this file still passes on is TEAM_CONFIG.sources.kalshi,
// to TeamOS.markets.
var TEAM = TeamOS.createTeam(TEAM_CONFIG.team);
// Kalshi's markets reach the page one way only: the snapshot the refresh
// workflow commits (odds.yml -> data/league/odds-*.json), same origin, so CORS
// never enters. Kalshi sends no CORS header and rate-limits Cloudflare's
// shared network, so neither a direct call nor our edge API can stand in.
// The public relays that used to follow (corsproxy.io, allorigins,
// codetabs) are gone (W11): third parties that saw every fan's request and
// could have altered the prices, for a fallback that only ran when the
// snapshot itself failed. When it does, the service worker's last copy is
// shown, and freshness says how old it is.
var KALSHI_ROUTES = [];
function localSnapshot(path){
  // Test PLAYOFF first: KXNCAAF is a prefix of KXNCAAFPLAYOFF.
  if(/KXNCAAFPLAYOFF/.test(path)) return "data/league/odds-playoff.json";
  if(/KXNCAAF-/.test(path))       return "data/league/odds-title.json";
  return null;
}
KALSHI_ROUTES.push(function(path){
  var f = localSnapshot(path);
  if(!f) throw new Error("no snapshot for this path");
  return f + "?t=" + Date.now();
});
var TITLE_EVENT   = "KXNCAAF-27";          // national championship winner
var PLAYOFF_EVENT = "KXNCAAFPLAYOFF-26";   // playoff qualifiers

// The season as every screen reads it, and the next game. Whether any of it
// is old is per source (SRC, noteSource) - each screen says so itself.
// odds: the pregame line by game id, from the game's summary (the schedule
// carries none), re-attached each time the schedule is rebuilt.
var S = { games:null, next:null, oddsTried:null, p:null, odds:{} };
// What Home shows beyond the schedule: normalized data only (suite/home.js).
var HOME = { news:null, markets:{}, weather:null, weatherFor:null, weatherAt:0, status:null };
function $(id){ return document.getElementById(id); }
function say(msg){ $("live").textContent = msg; }

/* ---------- identity ---------- */
// The selected team's identity INSIDE Suite: the bar's team context and
// the team tokens the stylesheet reads, from the team config, applied once,
// here. The product itself - its installed name, manifest, icons and share
// card - is Suite's, the same for every team, and lives in index.html and
// manifest.json (decision 0024 §11). The one head value a team changes is
// the tab title, "<Program> · Suite", and the browser chrome colour.
var ID = TeamOS.identity.create(TEAM_CONFIG, TEAM);
var DOC_TITLE = TEAM.name + " \u00B7 Suite";
var TEAM_NICK = "";

function paintIdentity(){
  function text(sel, value){
    var el = document.querySelector(sel); if(el) el.textContent = value;
  }

  // ---- the document ----
  document.title = DOC_TITLE;

  // ---- the page ----

  // The team as quiet context in the SUITE bar, on every screen. Its
  // nickname - for Home's hero - is the registry's (the provider's
  // shortDisplayName), not a second copy typed into the team config; its
  // mark is TeamOS's to name.
  var reg = TeamOS.registry.create(typeof TEAM_REGISTRY!=="undefined" ? TEAM_REGISTRY : []).get(TEAM.id);
  text("#barTeam", TEAM.name);
  var bm = $("barMark");
  if(bm) bm.outerHTML = Suite.ui.mark(TeamOS.espn.mark(TEAM_CONFIG.sources.espn.teamId, true),
                                       TEAM.name, TEAM.abbreviation, "bare").replace('class="mark bare"', 'class="mark bare" id="barMark"');
  TEAM_NICK = reg && reg.nick ? reg.nick : "";

  applyStyle();
}

/* ---------- App Style (decision 0026) ---------- */
// The fan's choice, not the team's: stored on its own, outside every team's
// keys, so it holds across team changes. Team Style (the default) lets this
// team's colours and type lead; Suite Style uses Suite's own for every team.
// Only the stylesheet's tokens change - the team's name, mark, tagline and
// photography are who the team is, not a style, and stay.
var STYLE_KEY="suite-style";
var SUITE_ID=TeamOS.identity.create({ identity: Suite.ui.STYLE }, TEAM);
function appStyle(){
  var v=null; try{ v=localStorage.getItem(STYLE_KEY); }catch(e){}
  return v==="suite" ? "suite" : "team";
}
function applyStyle(){
  var look = appStyle()==="suite" ? SUITE_ID : ID;
  var r = document.documentElement.style, c = look.colors;
  // Start from the stylesheet's own values: what the other style set is
  // taken off first, so nothing of it lingers (a team's optional text tones).
  for(var i=r.length-1;i>=0;i--){ if(r[i].indexOf("--t-")===0) r.removeProperty(r[i]); }
  [["--t-accent",c.accent], ["--t-accent-rgb",c.accentRgb], ["--t-accent-text",c.accentText],
   ["--t-accent-on-light",c.accentOnLight],
   ["--t-accent-ink",c.accentInk], ["--t-accent-soft",c.accentSoft], ["--t-accent-tint",c.accentTint],
   ["--t-accent-tint-soft",c.accentTintSoft], ["--t-focus",c.focus],
   ["--t-surface",c.surface], ["--t-surface-rgb",c.surfaceRgb],
   ["--t-deep",c.surfaceDeep], ["--t-deep-rgb",c.surfaceDeepRgb],
   ["--t-abyss",c.surfaceAbyss], ["--t-abyss-rgb",c.surfaceAbyssRgb],
   ["--t-raise",c.surfaceRaise], ["--t-raise-rgb",c.surfaceRaiseRgb],
   ["--t-font-ui",look.fonts.ui], ["--t-font-display",look.fonts.display]].forEach(function(p){ r.setProperty(p[0], p[1]); });
  // The browser chrome matches what sits under it: the header.
  var tc = document.querySelector('meta[name="theme-color"]');
  if(tc) tc.setAttribute("content", c.surfaceDeep);
  document.documentElement.setAttribute("data-style", appStyle());

  // Leave this set behind for the next visit's first paint. app.css's :root
  // is team-neutral, so without this every visit would paint neutral for the
  // moment before this function runs. Team Style is stored under the team's
  // own id, so one team's colours can never be replayed onto another
  // (docs/engineering/first-paint-team-tokens.md); Suite Style under a key
  // no team id can take, because it is every team's.
  try{
    var boot={};
    for(var j=0;j<r.length;j++){
      var name=r[j];
      if(name.indexOf("--")===0) boot[name]=r.getPropertyValue(name);
    }
    // the tab title names the team, so only the team's own set carries it
    if(appStyle()!=="suite") boot.title = DOC_TITLE;
    boot.themeColor = c.surfaceDeep;
    localStorage.setItem(appStyle()==="suite" ? "iw-boot:suite" : "iw-boot-"+TEAM.id, JSON.stringify(boot));
  }catch(e){}   // private mode, blocked storage, a full quota: the page is fine without it
}
function setAppStyle(v){
  try{ localStorage.setItem(STYLE_KEY, v==="suite" ? "suite" : "team"); }catch(e){}
  applyStyle();
}
paintIdentity();


// A provider answer: { data, cached } - cached is the worker's X-IW-Cached
// stamp when the network failed and it answered from its last good copy.
// How many requests are out, and since when none have been: the launch
// screen waits for the first load to go quiet before it lifts.
var NET={ busy:0, quietSince:Date.now() };
function fetchJSON(url){
  NET.busy++;
  function done(){ if(--NET.busy===0) NET.quietSince=Date.now(); }
  var p=fetch(url,{cache:"no-store"}).then(function(r){
    if(!r.ok) throw new Error("HTTP "+r.status);
    var cached=r.headers.get("X-IW-Cached");
    return r.json().then(function(d){ return { data:d, cached:cached }; });
  });
  p.then(done, done);
  return p;
}
// The data itself. A source's freshness moves only once its answer is
// usable: parsed, and - where a check is given - the right shape. An answer
// that is not is a failure, not a refresh (catch-up review 1.2).
function get(url, usable){
  return fetchJSON(url).then(function(r){
    if(usable && !usable(r.data)) throw new Error("unusable answer from "+url);
    noteSource(url, r.cached);
    return r.data;
  });
}
function hasEvents(d){ return !!d && Array.isArray(d.events); }
// What a refresh step came to: the network answered, the worker answered
// with its last copy, or nothing usable came back.
function outcomeOf(key){ var x=SRC[key]; return x && x.cached ? "cached" : "network"; }

// Per-source freshness, for the one page-level state each screen shows
// (decision 0024 §13). A copy the worker served because the network failed
// carries X-IW-Cached - the time it was stored - and counts as cached.
var SRC={};
function sourceKey(url){
  if(url===TeamOS.espn.scheduleUrl(TEAM_CONFIG)) return "schedule";
  if(/scoreboard/.test(url)) return "scoreboard";
  if(url===TeamOS.espn.rankingsUrl()) return "rankings";
  if(url===TeamOS.espn.rosterUrl(TEAM_CONFIG)) return "roster";
  var dep=TeamOS.snapshots.get(TEAM_CONFIG,"depth"), av=TeamOS.snapshots.get(TEAM_CONFIG,"availability");
  if(dep && url.split("?")[0]===dep.file) return "depth";
  if(av && url.split("?")[0]===av.file) return "availability";
  if(/odds-(title|playoff)\.json|kalshi/i.test(url)) return "odds";
  if(/open-meteo/.test(url)) return "weather";
  var beat=TeamOS.snapshots.get(TEAM_CONFIG,"beatNews");
  if(url===TeamOS.espn.newsUrl(TEAM_CONFIG)) return "news";
  if(beat && url.indexOf(beat.file)===0) return "beatNews";
  return null;
}
function noteSource(url, cached){
  var k=sourceKey(url); if(!k) return;
  var at=cached ? Date.parse(cached) : Date.now();
  // a kept copy of unknown age is old, not "fetched just now"
  SRC[k]={ fetchedAt: isNaN(at) ? (cached ? null : Date.now()) : at, cached: !!cached };
  if(typeof paintMore==="function") paintMore();   // Settings' Last Updated, while it is open
}

// Offline shell. sw.js keeps the page itself and the last good copy of every
// data call, so it opens in the stadium with no signal. Registered relative to
// the page, so it works at / on localhost and under /<repo>/ on Pages.
// A returning fan (a worker already controls this page) is checked for an
// update at once - explicitly, because the browser's own check comes about
// two seconds after the page opens - so a new version is found, and swapped
// in by its worker, as early as possible. A first visit waits for load, so
// installing never competes with the first paint.
// An update found on this open reloads the page as soon as its worker takes
// over (sw.js reloadWindows). Until then the launch screen holds, so the fan
// sees one launch across the reload - not the page, then a second launch
// (David, 2026-10-01: the nav flashed up before the launch faded). A first
// install reloads nothing, so only a page a worker already controls waits.
var UPDATING=false, CHECKING=false;
// The launch has lifted while an update was still on its way: the reload it
// brings must not play the launch again (index.html reads this). A failed
// update brings no reload, so it is cleared.
function liftedMarker(on){
  try{ if(on) sessionStorage.setItem("suite-launch-lifted", String(Date.now())); else sessionStorage.removeItem("suite-launch-lifted"); }catch(e){}
}
function watchUpdate(reg){
  if(!reg || !navigator.serviceWorker.controller) return;
  // An activated worker reloads this page; if that never comes, the launch's
  // own cap still lifts it. One update can install twice (the browser's own
  // check racing ours), and the first then turns redundant on being replaced,
  // so the wait ends only when no worker it saw is still alive: a failed
  // install reloads nothing.
  var seen=[];
  function track(w){
    if(!w || seen.indexOf(w)!==-1) return;
    seen.push(w); UPDATING=true;
    w.addEventListener("statechange", function(){
      UPDATING=seen.some(function(x){ return x.state!=="redundant"; });
      if(!UPDATING) liftedMarker(false);
    });
  }
  track(reg.installing || reg.waiting);
  if(reg.addEventListener) reg.addEventListener("updatefound", function(){ track(reg.installing); });
}
if("serviceWorker" in navigator){
  var registerWorker=function(){
    // The check holds the launch too, from before register(): on a slow
    // connection fetching sw.js can outlast the launch's 2.6 seconds - and
    // register() itself can wait on that fetch - and an update found after
    // the launch lifted would reload the page under the fan (Codex review,
    // #80). A first visit has nothing to check against.
    var checking=!!navigator.serviceWorker.controller;
    if(checking) CHECKING=true;
    function checked(){ CHECKING=false; if(!UPDATING) liftedMarker(false); }
    navigator.serviceWorker.register("sw.js").then(function(reg){
      watchUpdate(reg);
      if(checking && reg && reg.update) reg.update().catch(function(){}).then(checked);
      else checked();
      return navigator.serviceWorker.ready;
    }).then(tellWorkerOurTeam).catch(function(){ checked(); });
  };
  if(navigator.serviceWorker.controller) registerWorker();
  else window.addEventListener("load", registerWorker);
}

// What this team's offline copy consists of. The worker has no TEAM_CONFIG
// and no localStorage, so it cannot work this out for itself - it precaches
// only the half of the shell that belongs to no team, and the page tells it
// the rest (decision 0015). The manifest and install icons are Suite's and
// precached with the shared shell (decision 0024), so a team's own shell is
// its config; its data is what it declares.
function teamCacheManifest(){
  return { type:"team", team:TEAM.id, shell:["teams/"+TEAM.id+".js"],
           data:TeamOS.snapshots.files(TEAM_CONFIG) };
}

function tellWorkerOurTeam(){
  var sw = navigator.serviceWorker.controller;
  if(!sw) return;                       // first load: no controller yet, the next one has it
  try{ sw.postMessage(teamCacheManifest()); }catch(e){}
}

// A worker taking control after an update has not been told anything yet.
if("serviceWorker" in navigator){
  navigator.serviceWorker.addEventListener("controllerchange", function(){
    tellWorkerOurTeam();
  });
}
// Walk the routes until one returns usable market data. A relay that is up but
// returns an error page counts as a failure, so check the shape too.
function kalshi(path){
  var i=0;
  function attempt(){
    if(i>=KALSHI_ROUTES.length) return Promise.reject(new Error("all Kalshi routes failed"));
    var url;
    try { url = KALSHI_ROUTES[i++](path); }
    catch(e){ return attempt(); }
    return get(url).then(function(d){
      if(!d || !d.markets) throw new Error("unexpected shape");
      return d;
    }).catch(attempt);
  }
  return attempt();
}

function esc(s){ return String(s==null?"":s).replace(/[&<>"]/g,function(c){
  return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]; }); }

// Case-insensitive match on the home field's name, as a feed spells it. The
// kickoff forecast asks this of a Game's venue; TeamOS.espn asks it of ESPN's.
function isHomeField(venueName){
  return String(venueName||"").toLowerCase().indexOf(TEAM.venue.name.toLowerCase())>-1;
}
/* ---------- hero ---------- */
// What sits above the tab panels depends on the tab. Home gets the whole
// game-day header. Game keeps the hero only while the next game is still
// upcoming - once it kicks off the Game Center below already has the score.
// Everywhere else the hero collapses to a one-line bar that taps through.
var UI={ tab:"schedule" };


/* ---------- kickoff weather ---------- */
// Open-Meteo: free, no key, CORS-open. The venue is geocoded once and kept in
// localStorage; the forecast is pulled for the kickoff hour. Forecasts run 16
// days out, so a game further away than that simply shows nothing.
var GEO_KEY="iw-geo-v1";

function geoCache(){ try{ return JSON.parse(localStorage.getItem(GEO_KEY)||"{}"); }catch(e){ return {}; } }
function geoRemember(key, pt){
  try{ var c=geoCache(); c[key]=pt; localStorage.setItem(GEO_KEY, JSON.stringify(c)); }catch(e){}
}
function geoSearch(q, state){
  return get(TeamOS.weather.placeUrl(q)).then(function(d){
    var pt=TeamOS.weather.place(d, state);
    if(!pt) throw new Error("no geocode hit for "+q);
    return pt;
  });
}
// Where the game is: the home field from the team config, else zip, else
// city + state.
function venuePoint(g){
  if(isHomeField(g.venue)) return Promise.resolve({lat:TEAM.venue.lat, lon:TEAM.venue.lon});
  if(!g.city && !g.zip) return Promise.reject(new Error("no venue address"));
  var key=[g.zip,g.city,g.venueState].join("|"), hit=geoCache()[key];
  if(hit) return Promise.resolve(hit);
  var first = g.zip ? geoSearch(g.zip) : Promise.reject(new Error("no zip"));
  return first.catch(function(){ return geoSearch(g.city, g.venueState||null); })
    .then(function(pt){ geoRemember(key, pt); return pt; });
}


/* ---------- top 25 ---------- */
// Top 25 is canonical (suite/top25.js; decisions 0024 §5, §6). Its games are
// the shared scoreboard, SB.games - the same LeagueGame[] every live state is
// reconciled against - so a score here cannot disagree with Home or Game.
// The polls move once or twice a week: fetched on entry when an hour old.
// Until the network answers, the last good copies (the worker's) are drawn,
// so the screen opens offline; those are never fed back into the live state.
var T25={ polls:null, cachedGames:null, at:0, pollsFailed:false, gamesFailed:false };

function top25Sources(){
  function s(key, maxAge){
    var x=SRC[key];
    return x ? { key:key, fetchedAt:x.fetchedAt, cached:x.cached, maxAgeMs:maxAge } : { key:key, missing:true };
  }
  var view=Suite.nav.current().view;
  return view==="rankings" ? [s("rankings", 8*24*HOUR)]
                           : [s("scoreboard", AUTO.liveElsewhere ? 10*60e3 : 12*HOUR)];
}

function paintTop25(){
  var host=$("screenTop25");
  if(!host || host.hidden) return;
  var route=Suite.nav.current(), now=new Date();
  var hero=S.games ? TeamOS.game.hero(S.games, now, TEAM.timeZone).game : null;
  Suite.top25.paint(host, {
    view:   route.view==="rankings" ? "rankings" : "games",
    poll:   route.view==="rankings" ? (route.path[1]||null) : null,
    polls:  T25.polls,
    games:  SB.games || T25.cachedGames,
    pollsFailed: T25.pollsFailed, gamesFailed: T25.gamesFailed,
    heroId: hero ? hero.id : null,
    mark:   function(id){ return TeamOS.espn.mark(id, false); },
    fresh:  TeamOS.freshness.summary(top25Sources(), { now:now, online: navigator.onLine!==false }),
    calendar: TeamOS.season.calendar(window.LEAGUE_CALENDAR, seasonYear(), now),
    now:    now
  });
}

function loadTop25(){
  if(T25.polls==null) cachedJSON(TeamOS.espn.rankingsUrl()).then(function(d){
    if(T25.polls==null && d){ T25.polls=TeamOS.espn.rankings(d, TEAM_CONFIG); paintTop25(); }
  }).catch(function(){});
  if(!SB.games && !T25.cachedGames) cachedJSON(TeamOS.espn.scoreboardUrl()).then(function(d){
    if(!SB.games && d){ T25.cachedGames=TeamOS.espn.scoreboard(d, TEAM_CONFIG); paintTop25(); }
  }).catch(function(){});
  if(Date.now()-T25.at > HOUR) loadRankings();
  getScoreboard(30000).then(function(){ T25.gamesFailed=false; paintTop25(); })
    .catch(function(){ T25.gamesFailed=true; paintTop25(); });
}

// The polls: one request out at a time, and what it came to.
function loadRankings(){
  if(T25.p) return T25.p;
  T25.p=get(TeamOS.espn.rankingsUrl(), function(d){ return !!d && Array.isArray(d.rankings); }).then(function(d){
    T25.polls=TeamOS.espn.rankings(d, TEAM_CONFIG); T25.at=Date.now(); T25.pollsFailed=false;
    return { key:"rankings", outcome:outcomeOf("rankings") };
  }).catch(function(){ T25.pollsFailed=true; return { key:"rankings", outcome:"failed" }; })
    .then(function(r){ T25.p=null; paintTop25(); return r; });
  return T25.p;
}

/* ---------- kalshi ---------- */
// Kalshi's market schema - prices, names, which market is this team's - is
// TeamOS.markets'. A team Kalshi takes no market on has no Season Outlook
// (decision 0024 §12): a capability the team's config declares.
function hasKalshi(){ return TeamOS.markets.covers(TEAM_CONFIG); }
// Every team each event prices, for Season Outlook's "View full field" (W18).
// settled/failed are per market: the full field says loading, failed or "no
// open market" for each view on its own.
var MARKET_FIELD = { title:null, playoff:null, settled:{}, failed:{} };

function loadStrip(){
  // A team Kalshi takes no market on has no Season Outlook (decision 0024 §12).
  if(!hasKalshi()) return Promise.resolve([]);
  // Two separate event queries, each picking the team out of its payload by
  // ticker or by name. Each market is independent: one can be missing.
  return Promise.all([{ ev: TITLE_EVENT, key: "title" }, { ev: PLAYOFF_EVENT, key: "playoff" }].map(function(q){
    return kalshi("/markets?event_ticker="+q.ev+"&limit=200&status=open").then(function(d){
      var m = TeamOS.markets.teamMarket(d, TEAM_CONFIG);
      var p = m ? TeamOS.markets.price(m) : null;
      MARKET_FIELD[q.key] = TeamOS.markets.field(d, TEAM_CONFIG, q.key);
      var o = SRC.odds||{};
      MARKET_FIELD.settled[q.key] = { asOf:o.fetchedAt||null, cached:!!o.cached };
      MARKET_FIELD.failed[q.key] = false;
      HOME.markets[q.key] = p==null ? null
        : { value:p, previous:TeamOS.markets.previous(m), asOf:o.fetchedAt||null, cached:!!o.cached };
      paintHome(); paintOutlook();
      return { key:"odds-"+q.key, outcome: o.cached ? "cached" : "network" };
    }, function(){
      // A failed refresh keeps the field already drawn; it fails only a
      // field that never loaded.
      MARKET_FIELD.failed[q.key] = !MARKET_FIELD[q.key];
      paintOutlook();
      return { key:"odds-"+q.key, outcome:"failed" };
    });
  }));
}
// Season Outlook's full field (suite/outlook.js): the view's market, whole.
function paintOutlook(){
  var host=$("screenOutlook");
  if(!host || host.hidden) return;
  var view=Suite.nav.current().view==="title" ? "title" : "playoff";
  var s=MARKET_FIELD.settled[view];
  Suite.outlook.paint(host, { team:{ name:TEAM.name }, view:view, covered:hasKalshi(),
    field:MARKET_FIELD[view], loading:!s && !MARKET_FIELD.failed[view], failed:!!MARKET_FIELD.failed[view],
    offline:navigator.onLine===false, asOf:s ? s.asOf : null, stale:!!(s && s.cached) });
}


/* ---------- game view: live line, box score, leaders ---------- */
// Everything here renders a GameDetail (docs/03_DOMAIN_MODEL.md), which
// TeamOS.espn builds from ESPN's summary endpoint. Sections the feed did not
// supply arrive as null and drop out rather than blanking the tab.


// "5-13" is a made/attempted pair, not the number 5. Compare the rate.
// "28:24" is a clock, not 2824. Compare the seconds.

// Which game to show: one in progress, else the most recent finished, else next up.
// How long the Game tab keeps showing a finished game before swapping to the
// next one. ESPN gives kickoff, not the final whistle, so add four hours for
// regulation plus overtime and a long review.
//









/* ---------- roster ---------- */
// Roster is canonical (suite/roster.js; decisions 0019, 0024 §8, §9). Its
// views follow what the team has (TeamOS.roster.views). The official depth
// chart and availability report are the team's snapshots, checked as the
// team's own (0008); the roster is ESPN's, through the adapter. TeamOS joins
// them.
//
// Each source is loaded, and remembered, on its own (RO.s[key]):
//   ok        when the network last answered with usable data
//   fetchedAt when the copy on screen was fetched; cached: it is the last
//             good copy, not the network's answer (0022 #4)
//   failed    the last attempt failed - the copy on screen, if any, stays
//   inflight  a request is out; nothing asks twice
// The last good copy draws first so the screen opens offline. A source that
// has succeeded is not asked again for 30 minutes; one that failed is asked
// again the next time Roster opens, and as soon as the connection returns.
// The one freshness state (0024 §13) is computed from the sources the
// current view actually displays.
var RO={ chart:null, avail:null, hist:null, histRaw:null, roster:null, q:"", s:{}, histAt:0, histLoading:false };
var RO_AGAIN=30*60e3;
function rosterSnap(kind){ return TeamOS.snapshots.get(TEAM_CONFIG, kind); }
function roOurs(d){ return d && TeamOS.snapshots.owned(TEAM, d) ? d : null; }
// What Roster loads, by key: where from, and how a payload becomes state.
function rosterSources(){
  var list=[{ key:"roster", url:TeamOS.espn.rosterUrl(TEAM_CONFIG), fresh:function(u){ return u; }, maxAgeMs:7*24*HOUR,
              take:function(d){ var g=d && TeamOS.espn.roster(d); if(!g) return false; RO.roster=g; return true; } }];
  var depth=rosterSnap("depth"), av=rosterSnap("availability");
  if(depth) list.push({ key:"depth", url:depth.file, fresh:function(u){ return u+"?t="+Date.now(); }, maxAgeMs:8*24*HOUR,
              take:function(d){ d=roOurs(d); if(!d || d.schema!==2) return false; RO.chart=d; return true; } });
  if(av) list.push({ key:"availability", url:av.file, fresh:function(u){ return u+"?t="+Date.now(); }, maxAgeMs:8*24*HOUR,
              take:function(d){ d=roOurs(d); if(!d) return false; RO.avail=d; return true; } });
  return list;
}
function roHas(key){ return key==="roster" ? !!RO.roster : key==="depth" ? !!RO.chart : !!RO.avail; }
function roState(key){ return RO.s[key] || (RO.s[key]={ ok:0, fetchedAt:null, cached:false, failed:false, inflight:false, tried:false, copyAt:null }); }
// One freshness source, as the view shows it. While the first request is
// still out, the copy on screen is not yet called old.
function roSource(src, optional){
  var st=roState(src.key);
  if(!roHas(src.key)) return { key:src.key, missing:true, optional:optional };
  if(st.failed) return { key:src.key, fetchedAt: st.fetchedAt || st.copyAt, cached:true, optional:optional };
  return { key:src.key, fetchedAt: st.fetchedAt, cached: st.cached, maxAgeMs: src.maxAgeMs, optional:optional };
}
function rosterFreshSources(view){
  var by={}; rosterSources().forEach(function(x){ by[x.key]=x; });
  // what each view displays: its own document, and the roster that adds
  // heights, hometowns and photos to it
  var want = view==="depth" ? [["depth",false],["roster",true]]
           : view==="availability" ? [["availability",false],["roster",true]]
           : [["roster",false]];
  return want.filter(function(w){ return by[w[0]]; }).map(function(w){ return roSource(by[w[0]], w[1]); });
}
function paintRoster(){
  var host=$("screenRoster");
  if(!host || host.hidden) return;
  var route=Suite.nav.current(), views=TeamOS.roster.views(TEAM_CONFIG);
  Suite.roster.paint(host, rosterModel(route, views));
}
function rosterModel(route, views){
  var view=views.some(function(v){ return v.id===route.view; }) ? route.view : views[0].id;
  function failed(k){ return !roHas(k) && !!roState(k).failed; }
  return {
    views: views, view: view, unit: route.path[1] || null,
    hasDepth: !!rosterSnap("depth"),
    depth: RO.chart ? TeamOS.roster.depth(RO.chart, RO.roster, RO.avail, RO.histRaw) : null,
    history: RO.hist, roster: RO.roster ? TeamOS.roster.withStatus(RO.roster, RO.avail, RO.chart) : null, query: RO.q,
    avail: RO.avail ? TeamOS.roster.availability(RO.avail, RO.roster) : null,
    failed: { depth: failed("depth"), roster: failed("roster"), avail: failed("availability") },
    fresh: TeamOS.freshness.summary(rosterFreshSources(view), { now:new Date(), online: navigator.onLine!==false })
  };
}
// The last good copy the worker kept, with when it was fetched.
function cachedCopy(url){
  if(typeof caches==="undefined") return Promise.reject(0);
  return caches.match(url).then(function(r){
    if(!r) throw 0;
    var at=Date.parse(r.headers.get("X-IW-Stored")||r.headers.get("date")||"");
    return r.json().then(function(d){ return { data:d, at: isNaN(at) ? null : at }; });
  });
}
// `warm`: the background warm-up at boot, which only fills what has not been
// asked for yet - retries are for re-entry, reconnection and refresh.
function loadRosterScreen(force, warm){
  var work=rosterSources().map(function(src){
    var st=roState(src.key);
    if(st.inflight) return st.p;                              // never asked twice at once: join it
    if(warm && st.tried) return null;
    if(!force && st.ok && !st.failed && Date.now()-st.ok < RO_AGAIN) return null;
    if(!roHas(src.key)) cachedCopy(src.url).then(function(c){
      if(!roHas(src.key) && src.take(c.data)){ st.copyAt=c.at; paintRoster(); }
    }).catch(function(){});
    st.inflight=true; st.tried=true;
    st.p=get(src.fresh(src.url)).then(function(d){
      if(!src.take(d)){ st.failed=true; return; }
      var n=SRC[src.key], copy=!!(n && n.cached);             // noteSource(): the worker's cached copy says so
      st.failed=false; st.cached=copy; st.fetchedAt=n ? n.fetchedAt : Date.now();
      // Only a network answer starts the refresh clock. The worker's last good
      // copy is shown (and called old) but stays due for another try.
      st.ok=copy ? 0 : Date.now();
    }).catch(function(){ st.failed=true; })
      .then(function(){
        st.inflight=false; paintRoster();
        return { key:src.key, outcome: st.failed ? "failed" : st.cached ? "cached" : "network" };
      });
    return st.p;
  });
  loadRosterHistory(force);
  return Promise.all(work.filter(Boolean));
}
// Every chart this season, for Week by week - a bonus: a failure only
// leaves the section out, and it is tried again next time.
function loadRosterHistory(force){
  var depth=rosterSnap("depth"), av=rosterSnap("availability");
  if(!depth || !depth.history || RO.histLoading) return;
  if(!force && RO.histAt && Date.now()-RO.histAt < RO_AGAIN) return;
  RO.histLoading=true;
  Promise.all([get(depth.history+"?t="+Date.now()),
               av && av.history ? get(av.history+"?t="+Date.now()).catch(function(){ return null; }) : null])
    .then(function(r){
      var h=roOurs(r[0]); if(!h || h.schema!==2) return;
      RO.hist=TeamOS.roster.history(h, roOurs(r[1])); RO.histRaw=h; RO.histAt=Date.now();
    }).catch(function(e){ if(window.console) console.warn("depth history:", e); })
    .then(function(){ RO.histLoading=false; paintRoster(); });
}
// Back online: what failed is asked again now, not in half an hour.
window.addEventListener("online", function(){ if(!$("screenRoster").hidden) loadRosterScreen(); });
// The roster search: only the list redraws, so the box keeps focus.
document.addEventListener("input", function(e){
  if(!e.target || e.target.id!=="rosterQ") return;
  RO.q=e.target.value;
  Suite.roster.list($("screenRoster"), rosterModel(Suite.nav.current(), TeamOS.roster.views(TEAM_CONFIG)));
});


/* ---------- matchup preview ---------- */
// Season-to-date figures with national ranks for both sides, as SeasonStat[]
// from TeamOS.espn (docs/03_DOMAIN_MODEL.md).
var SEASON_STATS={};              // side key -> SeasonStat[], cached per session

function seasonYear(){
  var d=new Date();
  return d.getMonth()<6 ? d.getFullYear()-1 : d.getFullYear();   // Jan-Jun = last season
}


// Points allowed per game, for one side of the matchup. For the configured
// team the answer is already on the page - S.games is the whole season - so
// nothing is fetched. For the opponent it costs two requests for their
// schedule - regular season and postseason - cached for the session like the
// stats themselves; a missing postseason just counts the regular season. A failure
// resolves to null rather than rejecting: a missing row is better than a
// missing card.
var PTS_ALLOWED={};               // side key -> number|null

function pointsAllowedFor(key, ourGames){
  if(!key) return Promise.resolve(null);
  if(PTS_ALLOWED.hasOwnProperty(key)) return Promise.resolve(PTS_ALLOWED[key]);
  var p = ourGames
    ? Promise.resolve(TeamOS.season.pointsAllowedPerGame(ourGames))
    : Promise.all([
        get(TeamOS.espn.teamScheduleUrl(key)),
        get(TeamOS.espn.teamPostseasonUrl(key)).catch(function(){ return null; })
      ]).then(function(r){
        return TeamOS.season.pointsAllowedPerGame(TeamOS.espn.scoreLines(TeamOS.espn.joinSeason(r[0], r[1]), key));
      });
  // An answer is kept for the session; a failure is not, so the next
  // preview asks again (code review, 2026-10-01).
  return p.then(function(v){ PTS_ALLOWED[key]=v; return v; }, function(){ return null; });
}

// Yards allowed per game, for one side: CollegeFootballData through Suite's
// edge API (decision 0030, W15) - ESPN's own figure is an empty stub. Keyed by
// school name. An answer is kept for the session (a school CFBD does not know
// answers with null figures); a failure resolves to null without being kept,
// so the next preview asks again. Either way the row shows a dash for that
// side, and the card stands.
var EDGE="https://suite-api.dmvanblaircom.workers.dev";
var YDS_ALLOWED={};               // school -> { rush, pass, ... } | null

function yardsAllowedFor(school){
  if(!school) return Promise.resolve(null);
  if(YDS_ALLOWED.hasOwnProperty(school)) return Promise.resolve(YDS_ALLOWED[school]);
  return get(EDGE+TeamOS.cfbd.seasonPath(school, seasonYear()))
    .then(function(d){ var v=TeamOS.cfbd.yardsAllowed(d); YDS_ALLOWED[school]=v; return v; },
          function(){ return null; });            // a failure is not kept: the next preview asks again
}

// The rows no ESPN feed fills: points allowed (from results) and yards
// allowed (from CFBD). Copies rather than writes, because the rows themselves
// are cached in SEASON_STATS and shared between renders.
function withDerived(rows, perGame, yards){
  var fill={ pointsAllowed: perGame,
             rushDefense: yards ? yards.rush : null,
             passDefense: yards ? yards.pass : null };
  return rows.map(function(r){
    var v=fill[r.key];
    if(v==null) return r;
    return { key:r.key, label:r.label, value:v.toFixed(1),
             rank:r.rank, rankText:r.rankText };
  });
}

function teamSeasonStats(key){
  if(!key) return Promise.reject(new Error("no team"));
  if(SEASON_STATS[key]) return Promise.resolve(SEASON_STATS[key]);
  return get(TeamOS.espn.seasonStatsUrl(key, seasonYear()))
    .then(function(d){
      var rows=TeamOS.espn.seasonStats(d);
      SEASON_STATS[key]=rows;
      return rows;
    });
}




/* ---------- season stats (W27) ---------- */
// The Stats screen's Team view (docs/product/season-stats-proposal.md). Per
// team, two requests: the core API's season statistics (figures and ranks)
// and the site API's team statistics (what the team allowed). Asked when
// Stats opens and kept for the session; Refresh Data and a pull ask again.
// In game week the next opponent's season sits beside ours (David,
// 2026-10-01). TeamOS decides which figures exist and what they are called.
// `type` is the season type the figures were fetched for: the postseason
// is only known once its schedule has answered, so data fetched before
// that is the regular season's and is asked again when the type changes
// (Codex review, #82). `oppFor` is the opponent the figures were fetched
// for (null outside game week): the schedule, too, can answer after Stats
// opened, and only then is this week's opponent known (David, 2026-10-02).
// `again`: something changed while a request was out; ask once more after.
// `outcome` is what the last ask came to, for Refresh Data's report:
// network, the worker's kept copy, or failed.
var ST={ us:null, them:null, opp:null, oppFor:null, type:null, p:null, again:false, failed:false, outcome:null };
function statsType(){ return TeamOS.espn.seasonTypeFor(POST); }
function teamSeasonFor(key, type){
  var year=seasonYear(), how=[];
  function one(url){
    return fetchJSON(url).then(function(r){ noteSource(url, r.cached); how.push(r.cached ? "cached" : "network"); return r.data; },
                               function(){ how.push("failed"); return null; });
  }
  return Promise.all([one(TeamOS.espn.seasonStatsUrl(key, year, type)), one(TeamOS.espn.teamStatsUrl(key))])
    .then(function(r){
      if(!r[0] && !r[1]) throw new Error("no season stats");
      var outcome=how.every(function(h){ return h==="network"; }) ? "network" : "cached";
      return { season: TeamOS.espn.teamSeason(r[0], r[1]), outcome: outcome };
    });
}
// This week's opponent: the next game, while it is on or within seven days.
function gameWeekGame(){
  var g=S.next;
  if(!g || !g.oppProviderId) return null;
  var ms=new Date(g.date).getTime()-Date.now();
  return g.state==="in" || (ms>-6*3600e3 && ms<7*86400e3) ? g : null;
}
function loadStats(force){
  if(ST.p){ ST.again=true; return ST.p; }
  var g=gameWeekGame(), type=statsType(), oppFor=g ? g.oppProviderId : null;
  var have=ST.us && ST.type===type && ST.oppFor===oppFor;
  if(have && !force) return Promise.resolve();
  ST.failed=false;
  ST.p=Promise.all([
    teamSeasonFor(TEAM_CONFIG.sources.espn.teamId, type),
    g ? teamSeasonFor(g.oppProviderId, type).catch(function(){ return null; }) : Promise.resolve(null)
  ]).then(function(r){ ST.us=r[0].season; ST.outcome=r[0].outcome; ST.type=type; ST.oppFor=oppFor;
                       ST.them=r[1] ? r[1].season : null; ST.opp=r[1] ? g : null; },
          // a failed refresh keeps what was on screen, and says it failed
          function(){ ST.outcome="failed"; if(!ST.us) ST.failed=true; })
    .then(function(){
      ST.p=null; paintStats();
      if(ST.again){ ST.again=false; if(!$("screenStats").hidden) loadStats(); }
    });
  paintStats();
  return ST.p;
}
// The schedule or the postseason answered: if that moved the season type or
// this week's opponent, the figures held are the wrong ones - ask again
// while Stats is open (loadStats asks only when something differs), or the
// next time it opens.
function statsInputsChanged(){
  if($("screenStats").hidden) return;
  if(statsView()==="players"){ if(PL.tables || PL.p) loadPlayers(); return; }
  if(ST.us || ST.p) loadStats();
}
function statsView(){ return Suite.nav.current().view==="players" ? "players" : "team"; }
function paintStats(){
  var host=$("screenStats");
  if(!host || host.hidden) return;
  var g=ST.them ? ST.opp : null, view=statsView();
  var shownType = view==="players" ? (PL.tables ? PL.type : statsType()) : (ST.us ? ST.type : statsType());
  Suite.stats.paint(host, { team:{ name:TEAM.name, abbr:TEAM.abbreviation },
    opp: g ? { name:g.oppName, abbr:g.oppAbbr } : null,
    season:String(seasonYear()), postseason: shownType===3,
    us:ST.us, them:ST.them, failed:ST.failed, offline:navigator.onLine===false,
    view:view, players:playersModel(), playersFailed:PL.failed });
}

/* ---------- season stats: Players (W27 Phase 2) ---------- */
// The season leaders by category, from the core API, named by athlete id
// from what the app already has: the roster, and the box score of every
// finished game this season - ESPN's roster leaves some players out, and a
// finished game's summary is kept on the device for good (summaryFor), so
// it is asked for once. `named`: every name source has answered, so a row
// still without a name is counted as such rather than as still loading.
// `again`/`nagain`: the season type or the schedule moved while a request
// was out, so ask once more when it settles (as loadStats does).
var PL={ tables:null, type:null, p:null, failed:false, outcome:null, box:{}, named:false, np:null, again:false, nagain:false };
function playerNames(){
  var names={};
  Object.keys(PL.box).forEach(function(id){ var b=PL.box[id]; for(var k in b) if(!names[k]) names[k]=b[k]; });
  (RO.roster||[]).forEach(function(gr){ gr.players.forEach(function(p){ if(p.id && p.name) names[p.id]=p.name; }); });
  return names;
}
function playersModel(){
  if(!PL.tables) return null;
  var m=TeamOS.espn.namedLeaders(PL.tables, playerNames());
  // a table missing a name that may still come is not shown as if complete:
  // the view stays loading until every name source has answered (Codex, #92)
  if(!PL.named && m.unnamed) return null;
  return m;
}
// The names: the roster (joined if it is already being asked for) and each
// finished game's box score not yet read.
function loadPlayerNames(){
  // the schedule answered while names were out: that pass never saw its
  // finished games, so scan again when it settles (Codex, #92)
  if(PL.np){ PL.nagain=true; return PL.np; }
  var scanned=!!S.games;
  var finals=(S.games||[]).filter(function(g){ return g.state==="post" && !PL.box[g.id]; });
  var roster=loadRosterScreen(false, true);
  PL.np=Promise.all([roster.catch(function(){})].concat(finals.map(function(g){
    return summaryFor(g.id).then(function(raw){ PL.box[g.id]=TeamOS.espn.boxNames(raw); paintStats(); }, function(){});
  }))).then(function(){
    PL.np=null; PL.named=PL.named || scanned;
    if(PL.nagain){ PL.nagain=false; return loadPlayerNames(); }
    paintStats();
  });
  return PL.np;
}
function loadPlayers(force){
  if(PL.p){ PL.again=true; return PL.p; }
  var type=statsType();
  if(PL.tables && PL.type===type && !force){ loadPlayerNames(); return Promise.resolve(); }
  var url=TeamOS.espn.leadersUrl(TEAM_CONFIG.sources.espn.teamId, seasonYear(), type);
  PL.failed=false;
  PL.p=fetchJSON(url).then(function(r){
    PL.tables=TeamOS.espn.seasonLeaders(r.data); PL.type=type; PL.outcome=r.cached ? "cached" : "network";
  }, function(){ PL.outcome="failed"; if(!PL.tables) PL.failed=true; })
    .then(function(){
      PL.p=null; paintStats();
      // the season type moved while the leaders were out (Codex, #92)
      if(PL.again){ PL.again=false; if(!$("screenStats").hidden) return loadPlayers(); }
      return loadPlayerNames();
    });
  paintStats();
  return PL.p;
}

/* ---------- news ---------- */
// Two sources merged: ESPN's own feed, which arrives as NewsItem[] from
// TeamOS.espn, and - for a team that declares one - the beat-writer RSS
// that the GitHub Action fetches server-side and commits as the team's
// beat-news snapshot. RSS sites send no CORS header, so the browser can
// never read them directly. A team without beat feeds gets ESPN alone.

// news.json is this project's own snapshot (docs/03_DOMAIN_MODEL.md, NewsItem):
// the same fields, with the date as ISO text and optional article/source art.
function beatItem(i){
  var t=i.published ? Date.parse(i.published) : NaN;
  function picture(u){ return /^https?:\/\/\S+$/i.test(String(u||"")) ? u : ""; }
  return { title:i.title, link:i.link, image:picture(i.image), sourceLogo:picture(i.sourceLogo),
           source:i.source, publishedAt: isNaN(t) ? null : t };
}
// Every source's stories -> one NewsItem[], newest first, one story per
// headline. Home and the full News list read the same list. Only a plain
// http(s) link survives: it is written into an href, and a feed's
// javascript: address there would run on a tap (code review, 2026-10-01).
function newsList(items){
  var all=items.filter(function(a){ return a && a.title && /^https?:\/\/\S+$/i.test(String(a.link||"")); });
  var seen={}, list=[];
  all.forEach(function(a){
    var k=a.title.toLowerCase().replace(/[^a-z0-9]/g,"").slice(0,60);
    if(seen[k]) return;
    seen[k]=1; list.push(a);
  });
  list.sort(function(a,b){ return (b.publishedAt||0)-(a.publishedAt||0); });
  return list;
}

// One store, two readers: Home shows the first three, News all of them.
// Each source is kept on its own (catch-up review 1.1): its last good
// stories, when the network last answered it, whether what it holds came
// from the worker's copy or failed to update, and the request it has out.
// A source that failed, or answered from the worker's copy, stays due for
// another try on re-entry and reconnection whatever the other one did; a
// failed update keeps that source's previous stories, called old.
var NEWS={ items:null, s:{} };
var NEWS_AGAIN=30*60e3;
function newsSources(){
  var espnUrl=TeamOS.espn.newsUrl(TEAM_CONFIG), beat=TeamOS.snapshots.get(TEAM_CONFIG,"beatNews");
  var list=[{ key:"news", optional:false, url:espnUrl, fresh:function(){ return espnUrl; },
              take:function(d){ return d && Array.isArray(d.articles) ? TeamOS.espn.news(d) : null; } }];
  if(beat) list.push({ key:"beatNews", optional:true, url:beat.file, fresh:function(){ return beat.file+"?t="+Date.now(); },
              take:function(d){ return TeamOS.snapshots.owned(TEAM,d) && Array.isArray(d.items) ? d.items.map(beatItem) : null; } });
  return list;
}
function newsState(key){
  return NEWS.s[key] || (NEWS.s[key]={ list:null, at:0, fetchedAt:null, cached:false, failed:false, tried:false, p:null });
}
function loadNewsSource(src, force){
  var st=newsState(src.key);
  if(st.p) return st.p;                                         // never asked twice at once: join it
  if(!force && st.at && Date.now()-st.at < NEWS_AGAIN) return Promise.resolve({ key:src.key, outcome:"current" });
  st.tried=true;
  st.p=fetchJSON(src.fresh()).then(function(r){
    var list=src.take(r.data);
    if(list==null) throw new Error("unusable");
    noteSource(src.url, r.cached);
    var n=SRC[src.key];
    st.list=list; st.failed=false; st.cached=!!r.cached;
    st.fetchedAt=n ? n.fetchedAt : Date.now();
    st.at=r.cached ? 0 : Date.now();                            // only the network starts the clock
    return { key:src.key, outcome: r.cached ? "cached" : "network" };
  }).catch(function(){
    st.failed=true; st.at=0;
    return { key:src.key, outcome:"failed" };
  }).then(function(res){
    st.p=null; mergeNews(); return res;
  });
  return st.p;
}
function mergeNews(){
  var srcs=newsSources(), have=srcs.filter(function(x){ return newsState(x.key).list; });
  var settled=srcs.every(function(x){ var st=newsState(x.key); return st.tried && !st.p; });
  var all=[];
  have.forEach(function(x){ all=all.concat(newsState(x.key).list); });
  NEWS.items = have.length ? newsList(all) : null;
  // Home's preview: the stories, or - once every source has answered and
  // none had any - none; still asking, nothing yet.
  HOME.news = NEWS.items ? NEWS.items.slice(0,3) : settled ? [] : null;
  paintHome(); paintNews();
}
function loadNews(force){
  return Promise.all(newsSources().map(function(src){ return loadNewsSource(src, force); }));
}
// What News displays, for its one page-level state (0024 §13): a source
// that failed to update but still has stories is old; one that never had
// any is absent, and no age is invented for it.
function newsFreshSources(){
  return newsSources().map(function(x){
    var st=newsState(x.key);
    if(!st.list) return { key:x.key, missing:true, optional:x.optional };
    if(st.failed) return { key:x.key, fetchedAt:st.fetchedAt, cached:true, optional:x.optional };
    return { key:x.key, fetchedAt:st.fetchedAt, cached:st.cached, optional:x.optional, maxAgeMs:24*HOUR };
  });
}

/* ---------- Home (canonical) ---------- */
// Home is drawn by suite/home.js from TeamOS's answers: the hero game and
// why, its three schedule rows, the Season Outlook metrics, and whether what
// this screen shows is fresh. This function only gathers them.
var HOUR=3600e3;
function homeSources(heroLive){
  function s(key, optional, maxAge){
    var x=SRC[key];
    return x ? { key:key, fetchedAt:x.fetchedAt, cached:x.cached, optional:optional, maxAgeMs:maxAge }
             : { key:key, missing:true, optional:optional };
  }
  var list=[s("schedule",false,12*HOUR)].concat(newsFreshSources(),
            [s("odds",true,36*HOUR), s("weather",true,6*HOUR)]);
  if(heroLive) list.push(s("scoreboard",false,10*60e3));
  return list;
}
function paintHome(){
  var host=$("screenHome");
  if(!host || host.hidden || !S.games) { if(host && !host.hidden && !S.games) paintHomeLoading(host); return; }
  var now=new Date();
  var h=TeamOS.game.hero(S.games, now, TEAM.timeZone), g=h.game;
  // Our rank and record now, from the team feed, when the game's own
  // competitor entry does not carry them.
  if(g && HOME.status){
    g=Object.assign({}, g);
    if(g.usRank==null && HOME.status.rank) g.usRank=HOME.status.rank;
    if(!g.usRecord && HOME.status.record) g.usRecord=HOME.status.record;
  }
  var wx = g && HOME.weatherFor===g.id ? HOME.weather : null;
  var zone = (wx && wx.zone) || TeamOS.game.venueZone(g||{}, TEAM.timeZone);
  var espnId=TEAM_CONFIG.sources.espn.teamId;
  Suite.home.paint(host, {
    team:{ name:TEAM.name, nick:TEAM_NICK, tagline:ID.tagline, abbr:TEAM.abbreviation,
           markUrl:TeamOS.espn.mark(espnId, true) },
    oppMark:function(id){ return TeamOS.espn.mark(id, true); },
    art:{ photo:ID.art, name:TEAM.name, abbr:TEAM.abbreviation, markUrl:TeamOS.espn.mark(espnId, true),
          atmosphere: g ? TeamOS.game.atmosphere(g, zone) : null },
    hero:{ game:g, reason:h.reason, weather:wx },
    heroId: g ? g.id : null,
    news: HOME.news,
    schedule: TeamOS.game.schedulePreview(S.games, now, TEAM.timeZone),
    outlook: TeamOS.outlook.metrics(HOME.markets),
    fresh: TeamOS.freshness.summary(homeSources(TeamOS.game.underWay(g)),
                                    { now:now, online: navigator.onLine!==false })
  });
  if(g) loadHomeWeather(g);
}
function paintHomeLoading(host){
  var want=SC.failed ? "failed" : "1";
  if(host.dataset.loading===want) return;
  host.dataset.loading=want;
  host.innerHTML=SC.failed ? scheduleFailed() : '<p class="sec-quiet home-loading">Loading '+esc(TEAM.name)+'\u2026</p>';
}
// Home, Game and a game opened from Schedule all wait on the schedule. When
// its first load failed and nothing is cached, they say so - the words the
// Schedule screen uses - instead of "Loading" forever; retrySchedule() keeps
// that promise.
function scheduleFailed(){
  return '<p class="sec-quiet home-loading">The schedule didn\u2019t load. Check your connection; it fills in when the connection returns.</p>';
}
// Weather is tertiary (0024 §2): a kickoff forecast before a game, current
// conditions during one, nothing when there is no answer. One request per
// game per half hour.
function loadHomeWeather(g){
  var ms=new Date(g.date)-Date.now(), live=TeamOS.game.underWay(g);
  if(!g.timeSet && !live) return;
  if(!live && (ms<-3*HOUR || ms>16*24*HOUR)) return;
  if(g.status==="final" || g.status==="canceled" || g.status==="postponed") return;
  if(HOME.weatherFor===g.id && Date.now()-HOME.weatherAt<30*60e3) return;
  HOME.weatherFor=g.id; HOME.weatherAt=Date.now();
  venuePoint(g).then(function(pt){ return get(TeamOS.weather.url(pt.lat, pt.lon)); })
    .then(function(d){
      HOME.weather = live ? TeamOS.weather.current(d) : TeamOS.weather.at(d, g.date);
      paintHome(); paintGame();
    }).catch(function(){ HOME.weather=null; });
}
// The connection changes what an open screen says (catch-up review 1.3).
window.addEventListener("online",  function(){
  retrySchedule();
  // A Matchup card that failed offline is asked for again now.
  [GV, SV].forEach(function(V){ if(V && V.previewFailed) V.at=0; });
  paintGame(); paintScheduleScreen();
  paintHome(); paintTop25(); paintRoster(); paintMore();
  loadNews();                              // each source that failed, or came from the worker's copy, is asked again
  // Stats said it would load when the connection returned: it does - and
  // so does a season that came from the worker's copy, or one missing this
  // week's opponent (Codex review, #84).
  if(!$("screenStats").hidden && statsView()==="team" && (ST.outcome!=="network" || (ST.oppFor && !ST.them))) loadStats(true);
  if(!$("screenStats").hidden && statsView()==="players" && PL.outcome!=="network") loadPlayers(true);
  // So did the full field: a market that never loaded is asked again
  // (Codex review, #109).
  if(MARKET_FIELD.failed.title || MARKET_FIELD.failed.playoff) loadStrip();
  paintOutlook();
});
window.addEventListener("offline", function(){ paintHome(); paintTop25(); paintRoster(); paintMore(); paintOutlook(); });

/* ---------- Game (canonical) ---------- */
// The Game screen is the hero game - the one TeamOS rule Home and the nav
// use - drawn by suite/game.js from its GameDetail. Its views follow the
// game's lifecycle (TeamOS.game.lifecycle); the route says which one shows.
// One game on screen, wherever it is drawn: its summary, its pregame
// matchup, the fan's team toggle and open disclosures. GV is the hero game
// on Game; SV a game opened from Schedule (#schedule/<id>).
function gameState(id){ return { id:id, gd:null, preview:undefined, side:"us", at:0, loading:false, open:{} }; }
var GV=gameState(null);
function heroGame(){
  var h=TeamOS.game.hero(S.games||[], new Date(), TEAM.timeZone), g=h.game;
  if(g && HOME.status){
    g=Object.assign({}, g);
    if(g.usRank==null && HOME.status.rank) g.usRank=HOME.status.rank;
    if(!g.usRecord && HOME.status.record) g.usRecord=HOME.status.record;
  }
  return g;
}
function gameModel(V, g, lc, view, base){
  var espnId=TEAM_CONFIG.sources.espn.teamId;
  return {
    team:{ name:TEAM.name, abbr:TEAM.abbreviation, markUrl:TeamOS.espn.mark(espnId, true) },
    oppMark:function(id){ return TeamOS.espn.mark(id, true); },
    photo:ID.art, game:g, detail:V.gd, lifecycle:lc, base:base,
    view: view || lc.defaultView, preview:V.preview, side:V.side, open:V.open,
    weather: g && HOME.weatherFor===g.id ? HOME.weather : null, now:new Date()
  };
}
function paintGame(){
  var host=$("screenGame");
  if(!host || host.hidden) return;
  if(!S.games){ host.innerHTML=SC.failed ? scheduleFailed() : '<p class="sec-quiet home-loading">Loading the game\u2026</p>'; return; }
  var g=heroGame();
  if(g && GV.id!==g.id) GV=gameState(g.id);
  var lc=TeamOS.game.lifecycle(g), route=Suite.nav.current();
  Suite.game.paint(host, gameModel(GV, g, lc, route.view, "#game"));
  if(g){ loadGameDetail(GV, g, lc, paintGame); loadHomeWeather(g); }
}
// A game's summary: every 25 seconds while it is under way, every five
// minutes otherwise, never two requests at once. While one is out, V.p is
// its promise, resolving to how it came out ("network" or "failed"), so a
// refresh can wait for it and report it.
function loadGameDetail(V, g, lc, repaint){
  var live=TeamOS.game.underWay(g);
  if(V.loading || (V.at && Date.now()-V.at < (live ? 25e3 : 5*60e3))){
    // The summary is fresh, but a Matchup preview that failed is asked
    // again on re-entry - at most every 30 seconds, not on every paint.
    if(V.previewFailed && V.gd && lc.phase==="pregame" && Date.now()-(V.previewAt||0) > 30e3) loadGamePreview(V, g, repaint);
    return;
  }
  V.loading=true;
  V.p=summaryFor(g.id, live).then(function(raw){
    V.gd=TeamOS.espn.gameDetail(raw, TEAM, TEAM_CONFIG);
    if(learnOpening(g.id, V.gd) && SB.games) SB.games=TeamOS.live.withOpening(SB.games, OPENING);
    if(lc.phase==="pregame" && (V.preview===undefined || V.previewFailed)) loadGamePreview(V, g, repaint);
    return "network";
  }).catch(function(){ return "failed"; }).then(function(outcome){
    V.at=Date.now(); V.loading=false; V.p=null; repaint();
    return outcome;
  });
}
// Pregame Matchup: both teams' season figures, with national ranks. One
// request set out at a time. A failed set leaves no card but is tried again
// at the next summary refresh, or as soon as the connection returns - never
// given up on for the session (code review, 2026-10-01).
function loadGamePreview(V, g, repaint){
  var s=Suite.game.sides(V.gd, g);
  if(!s){ V.preview=null; return; }
  if(V.previewLoading) return;
  V.previewLoading=true; V.previewAt=Date.now();
  Promise.all([teamSeasonStats(s.us.key), teamSeasonStats(s.them.key),
               pointsAllowedFor(s.us.key, S.games), pointsAllowedFor(s.them.key, null),
               yardsAllowedFor(s.us.school), yardsAllowedFor(s.them.school)])
    .then(function(r){ V.preview={ us:withDerived(r[0], r[2], r[4]), them:withDerived(r[1], r[3], r[5]) }; V.previewFailed=false; })
    .catch(function(){ if(V.preview===undefined) V.preview=null; V.previewFailed=true; })
    .then(function(){ V.previewLoading=false; repaint(); });
}
// Which game state a control belongs to, by the host it sits in.
function gameAt(el){
  if(el.closest("#screenGame")) return { V:GV, repaint:paintGame, host:"#screenGame" };
  if(el.closest("#scheduleGameHost")) return { V:SV, repaint:paintScheduleScreen, host:"#scheduleGameHost" };
  return null;
}
// A Box Score category or a drive the fan opened or closed stays that way
// through the live refresh. toggle does not bubble, so listen in capture.
document.addEventListener("toggle", function(e){
  var d=e.target, at=d && d.matches && d.matches("details[data-key]") ? gameAt(d) : null;
  if(at) at.V.open[d.getAttribute("data-key")]=d.open;
}, true);
// The Leaders and Box Score team toggle.
document.addEventListener("click", function(e){
  var b=e.target.closest ? e.target.closest("[data-side]") : null;
  var at=b ? gameAt(b) : null;
  if(!at) return;
  at.V.side=b.getAttribute("data-side")==="them" ? "them" : "us";
  at.repaint();
  var again=document.querySelector(at.host+' [data-side="'+at.V.side+'"]');
  if(again) again.focus();
});

/* ---------- schedule ---------- */
// Schedule is canonical (suite/schedule.js; decision 0022 #8): the season in
// date order and its results, from the same S.games every other surface
// reads. A row opens its game - the hero on Game, any other here, drawn by
// suite/game.js at #schedule/<id> (Product, 2026-09-24). Coming back to the
// list returns the fan to where they were in it.
var SC={ failed:false, listY:0, wasItem:false, from:"schedule" };
var SV=gameState(null);
function scheduleSources(){
  var x=SRC.schedule, list=[x ? { key:"schedule", fetchedAt:x.fetchedAt, cached:x.cached, maxAgeMs:12*HOUR }
                                : { key:"schedule", missing:true }];
  if(S.games && S.games.some(TeamOS.game.underWay)){
    var sb=SRC.scoreboard;
    list.push(sb ? { key:"scoreboard", fetchedAt:sb.fetchedAt, cached:sb.cached, maxAgeMs:10*60e3 } : { key:"scoreboard", missing:true });
  }
  return list;
}
function paintScheduleScreen(){
  var host=$("screenSchedule");
  if(!host || host.hidden) return;
  var route=Suite.nav.current();
  $("scheduleList").hidden=!!route.item;
  $("scheduleGame").hidden=!route.item;
  if(route.item){ paintScheduleGame(route); return; }
  SC.from = route.view==="results" ? "results" : "schedule";
  var season=S.games ? TeamOS.game.season(S.games) : null, hero=S.games ? heroGame() : null;
  Suite.schedule.paint($("scheduleList"), {
    view: SC.from, season: season, failed: SC.failed && !season,
    results: season ? TeamOS.game.results(season) : [],
    heroId: hero ? hero.id : null,
    record: HOME.status && HOME.status.record || null,
    oppMark: function(id){ return TeamOS.espn.mark(id, false); },
    fresh: TeamOS.freshness.summary(scheduleSources(), { now:new Date(), online: navigator.onLine!==false }),
    postseason: schedulePostseason(season)
  });
}
// Selection Day at the schedule's foot, until it is over or this team's
// postseason game is listed (leagues/, TeamOS.season.calendar).
function schedulePostseason(season){
  if(!season || season.some(function(g){ return g.postseason; })) return null;
  var c=TeamOS.season.calendar(window.LEAGUE_CALENDAR, seasonYear(), new Date());
  return c.selection ? { day: c.selection.start.slice(0,10) } : null;
}
function paintScheduleGame(route){
  var host=$("scheduleGameHost"), back=$("scheduleBack");
  back.setAttribute("href", SC.from==="results" ? "#schedule/results" : "#schedule");
  back.querySelector("span").textContent = SC.from==="results" ? "Results" : "Schedule";
  if(!S.games){ host.innerHTML=SC.failed ? scheduleFailed() : '<p class="sec-quiet home-loading">Loading the game\u2026</p>'; return; }
  var g=S.games.filter(function(x){ return x.id===route.item; })[0] || null;
  if(!g){ Suite.game.paint(host, { game:null }); return; }
  if(SV.id!==g.id) SV=gameState(g.id);
  var lc=TeamOS.game.lifecycle(g), want=route.path[1];
  // A view this game does not have is corrected in place (0024 §15).
  if(want && !lc.views.some(function(v){ return v.id===want; })){
    var def=lc.views.filter(function(v){ return v.id===lc.defaultView; })[0];
    Suite.nav.replace("schedule", [g.id, lc.defaultView], "Showing "+(def ? def.label : lc.defaultView)+".");
    return;
  }
  Suite.game.paint(host, gameModel(SV, g, lc, want, "#schedule/"+g.id));
  loadGameDetail(SV, g, lc, paintScheduleScreen);
}
// Where the fan was in the list, kept while a game is open.
Suite.nav.on(function(route){
  var item=route.screen==="schedule" && !!route.item;
  if(item && !SC.wasItem) SC.listY=window.scrollY;
  var backToList=!item && SC.wasItem && route.screen==="schedule";
  SC.wasItem=item;
  if(backToList) setTimeout(function(){ window.scrollTo(0, SC.listY); }, 0);
});
// The finger is down before the tap completes: start fetching the summary.
$("scheduleList").addEventListener("pointerdown", function(e){
  var a=e.target.closest ? e.target.closest('a[href^="#schedule/"]') : null;
  var id=a && (a.getAttribute("href").match(/^#schedule\/([0-9]+)$/)||[])[1];
  if(id) summaryFor(id).catch(function(){});
}, {passive:true});

/* ---------- screens: which content each route shows ---------- */
// The route itself is suite/nav.js's (one state: location.hash). This is the
// other half: which host a screen shows, and what it loads on entry. UI.tab
// names the screen's family, for what Refresh Data reloads.
var PANEL_FOR={ home:"home", top25:"top25", game:"game", roster:"roster", more:"more", schedule:"schedule",
                news:"more", stats:"more", settings:"more", feedback:"more", about:"more", outlook:"home" };
// More and the destinations it owns, each its own host (suite/more.js).
var MORE_HOSTS={ more:"screenMore", news:"screenNews", stats:"screenStats", settings:"screenSettings", feedback:"screenFeedback", about:"screenAbout" };
function showScreen(route){
  var name=PANEL_FOR[route.screen]||"schedule";
  // Home, Game, Top 25, Schedule and Roster are canonical; More is still
  // its pre-canonical panel.
  var home=route.screen==="home", game=route.screen==="game", top25=route.screen==="top25",
      sched=route.screen==="schedule", roster=route.screen==="roster";
  Object.keys(MORE_HOSTS).forEach(function(k){ $(MORE_HOSTS[k]).hidden = k!==route.screen; });
  // Where Feedback says the fan came from: the last destination they were
  // on - News, Settings and About included - never the More menu or
  // Feedback itself (Product, 2026-09-25, on the catch-up review's advice).
  if(route.screen!=="more" && route.screen!=="feedback") MORE.from=route.screen;
  $("screenHome").hidden=!home;
  $("screenGame").hidden=!game;
  $("screenTop25").hidden=!top25;
  $("screenSchedule").hidden=!sched;
  $("screenRoster").hidden=!roster;
  $("screenOutlook").hidden=route.screen!=="outlook";
  if(home){ paintHome(); loadNews(); }
  if(route.screen==="outlook") paintOutlook();
  if(MORE_HOSTS[route.screen]){ askVersion(); paintMore(); if(route.screen==="news") loadNews(); if(route.screen==="stats"){ if(route.view==="players") loadPlayers(); else loadStats(); } }
  if(game) paintGame();
  if(top25){ paintTop25(); loadTop25(); }
  if(sched) paintScheduleScreen();
  if(roster){ paintRoster(); loadRosterScreen(); }
  UI.tab=name;
}
Suite.nav.on(function(route){ showScreen(route); });
// A first load that failed is asked again when the fan opens a screen that
// needs it, so the failure message is never the last word while online.
Suite.nav.on(function(route){
  if(route.screen==="home" || route.screen==="game" || route.screen==="schedule") retrySchedule();
});

/* ---------- boot ---------- */
/* ---------- background warm-up ---------- */
// Every tab already guards against re-fetching once loaded, so the cost of a
// tab switch is entirely the first fetch. Do those quietly after first paint,
// staggered, and rendering into hidden panels — the bytes are the same, they
// just happen before you ask rather than while you wait.
function warmTabs(){
  if(document.hidden) return;
  var c=navigator.connection;
  if(c && (c.saveData || /(^|-)2g$/.test(c.effectiveType||""))) return;  // respect data saver

  // The scoreboard goes first: Top 25 draws from it, and it decides whether
  // the live poller should run. It is 95KB on the wire, which is why it is
  // here and not in load() competing with the schedule for first paint.
  var jobs=[function(){ getScoreboard().then(scoreboardArrived).catch(function(){}); },
            function(){ loadRosterScreen(false, true); }, loadNews, prefetchSummaries];
  jobs.forEach(function(fn,i){
    setTimeout(function(){
      if(document.hidden) return;
      try{ fn(); }catch(e){}
    }, 700 + i*500);
  });
}

/* ---------- automatic refresh ---------- */
// Polls only while a game is actually in progress, only when the page is
// visible, and only the things that change during a game. Odds, depth, roster
// and news are left alone.
var AUTO={ timer:null, every:30000, liveElsewhere:false };

// One scoreboard fetch serves two jobs: telling us whether anything is live
// (needed on first paint, before any tab is opened) and filling the Top 25 tab
// instantly when it is opened. The payload is kept as fetched so the tab's
// build sees the same input from here as from the worker's cache; the
// LeagueGame[] beside it is what the page actually reads.
var SB={ data:null, games:null, at:0 };

function getScoreboard(maxAgeMs){
  var age=Date.now()-SB.at;
  if(SB.data && age < (maxAgeMs==null?30000:maxAgeMs)) return Promise.resolve(SB.data);
  if(SB.p) return SB.p;                    // one request out at a time: join it
  SB.p=get(TeamOS.espn.scoreboardUrl(), hasEvents).then(function(d){
    SB.data=d; SB.at=Date.now();
    // Who has the ball carries over from the last scoreboard where the feed
    // names no one (a timeout, the end of a quarter, a safety).
    SB.games=TeamOS.live.withOpening(TeamOS.live.carryBall(TeamOS.espn.scoreboard(d, TEAM_CONFIG), SB.games), OPENING);
    askOpenings(SB.games);
    AUTO.liveElsewhere = SB.games.some(function(lg){ return lg.state==="in"; });
    startAuto();
    return d;
  });
  SB.p.then(function(){ SB.p=null; }, function(){ SB.p=null; });
  return SB.p;
}

// Who received each game's opening kickoff ({ gameId: "home" / "away" }), so
// halftime can say who gets the ball to start the second half
// (TeamOS.live.receives). Learned from any game summary the page already
// has; for a live game at the half that it does not - a ranked game, or
// this team's - the summary is asked for once.
var OPENING={}, OPENING_ASKED={};
function learnOpening(id, gd){
  var side=TeamOS.live.openingSide(gd);
  if(side && OPENING[id]!==side){ OPENING[id]=side; return true; }
  return false;
}
function askOpenings(games){
  (games||[]).forEach(function(lg){
    if(!TeamOS.live.atHalf(lg) || OPENING[lg.id] || OPENING_ASKED[lg.id]) return;
    if(!(lg.mine || lg.home.rank || lg.away.rank)) return;
    OPENING_ASKED[lg.id]=true;
    summaryFor(lg.id, true).then(function(raw){
      if(!learnOpening(lg.id, TeamOS.espn.gameDetail(raw, TEAM, TEAM_CONFIG))) return;
      SB.games=TeamOS.live.withOpening(SB.games, OPENING);
      scoreboardArrived(); paintTop25();
    }).catch(function(){});
  });
}

// The first scoreboard of a visit lands after the schedule has painted. It
// is the only source of this week's opponent's record and rank (a team's
// schedule has them only for games already played), so reconcile and
// repaint the surfaces that show them.
function scoreboardArrived(){
  if(!S.games || !SB.games) return;
  S.games=TeamOS.live.reconcileAll(S.games, SB.games);
  if(S.next) S.next=S.games.filter(function(g){ return g.id===S.next.id; })[0] || S.next;
  // The scoreboard can be first to say a game is under way (the schedule
  // lags): the Game screen's views follow, so Drive Tracker, not Details.
  applyGameRules();
  paintHome(); paintGame(); paintScheduleScreen();
}

function somethingLive(){
  if(S.games && S.games.some(function(g){ return g.state==="in"; })) return true;
  return AUTO.liveElsewhere;
}

// The team's game rules, from TeamOS, applied to the shell (decisions 0022,
// 0024). The nav's Game control follows the ONE hero game: raised while it is
// under way, pulsing only while it is actively live - a delay before kickoff
// leaves it normal. And the Game screen's views follow that game's
// lifecycle, so a Drive Tracker route that stops existing at the final moves
// to Box Score in place.
var GAME_PHASE=null;
function applyGameRules(){
  var h=TeamOS.game.hero(S.games||[], new Date(), TEAM.timeZone);
  Suite.nav.setGameState(TeamOS.game.navState(h.game));
  var lc=TeamOS.game.lifecycle(h.game);
  if(lc.phase!==GAME_PHASE){
    var was=GAME_PHASE; GAME_PHASE=lc.phase;
    Suite.nav.setViews("game", lc.views, was==="live" && lc.phase==="final" ? "Final." : null);
  }
}

function startAuto(){
  var on=somethingLive();
  var btn=$("refresh");
  if(btn) btn.classList.toggle("polling", on);
  applyGameRules();
  if(!on){
    if(AUTO.timer){ clearInterval(AUTO.timer); AUTO.timer=null; }
    return;
  }
  if(AUTO.timer) return;
  AUTO.timer=setInterval(autoTick, AUTO.every);
}

function autoTick(){
  if(document.hidden) return;
  if(!somethingLive()){ startAuto(); return; }   // everything finished, stand down

  // One tick, one live state. The scoreboard is refreshed first because the
  // schedule is reconciled against it, so the hero, the schedule rows, the
  // Top 25 row and the Game Center all move together rather than each on
  // their own clock.
  getScoreboard(0).catch(function(){ return null; }).then(function(){
    return refreshSchedule(false);
  }).then(function(){
    paintGame();                         // the Game screen refreshes itself on its own clock
    paintTop25();
  }).catch(function(){});
  // Top 25 redraws only the parts that changed (suite/top25.js), so scroll
  // and focus stay. The tick's own scoreboard is also what lets polling
  // stand down once the last game ends.
}

// Coming back to the app should feel current immediately, not in 30 seconds.
document.addEventListener("visibilitychange", function(){
  if(document.hidden) return;
  if(somethingLive()) autoTick();
});

// The team's rank and record now, for Home's hero.
function loadTeamStatus(){
  var url=TeamOS.espn.teamUrl(TEAM_CONFIG);
  return get(url, function(d){ return !!d && !!d.team; }).then(function(d){
    HOME.status=TeamOS.espn.teamStatus(d); paintHome();
    return { key:"team", outcome:"network" };
  }).catch(function(){ return { key:"team", outcome:"failed" }; });
}
function load(){
  loadTeamStatus();

  loadStrip();
  return refreshSchedule(true);
}

// What the service worker last stored for a URL, if anything. Lets the page
// paint from the previous visit's data before the network answers.
function cachedJSON(url){
  if(typeof caches==="undefined") return Promise.reject(0);
  return caches.match(url).then(function(r){ if(!r) throw 0; return r.json(); });
}


// Pulled out of load() so the auto-refresh can reuse it without re-fetching
// team info, odds or anything else that does not change during a game.
// Only after a first load failed with nothing to show; one request at a time.
function retrySchedule(){
  if(S.games || !SC.failed || SC.retrying) return;
  SC.retrying=true;
  refreshSchedule(true).then(function(){ SC.retrying=false; });
}
// The last postseason answer. The postseason is a second request that is
// usually empty; when it fails, the games it last returned stay on screen
// rather than a bowl game vanishing until the next poll.
var POST=null;
// One schedule request out at a time; a second caller joins it. Returning to
// the app mid-game wakes two handlers at once (the live tick and the stale
// refresh), and a slow answer outlasts the live poller's interval: each used
// to fetch the schedule and the postseason again (W10).
function refreshSchedule(first){
  if(S.p) return S.p;
  var url=TeamOS.espn.scheduleUrl(TEAM_CONFIG), postUrl=TeamOS.espn.postseasonUrl(TEAM_CONFIG);
  var announce=first && !S.games;      // only the very first paint is news

  // Everything that turns a schedule payload into pixels. Runs twice on a
  // repeat visit: once from the worker's cache the instant the page opens,
  // then again when ESPN answers.
  function apply(d){
    var games=TeamOS.espn.schedule(TeamOS.espn.joinSeason(d, POST), TEAM, TEAM_CONFIG);
    // The scoreboard is the league's live feed and the schedule is a season
    // list; where they describe the same game, the scoreboard is what is
    // happening now. Reconciling here means every surface fed by S.games -
    // Home's hero, Game, the schedule rows and Top 25 -
    // reads one state (docs/decisions/0010-one-live-state-per-game.md).
    games=TeamOS.live.reconcileAll(games, SB.games);
    // The line came from the summary, not the schedule: carry it onto the
    // rebuilt games, or it vanished at the next refresh (code review,
    // 2026-10-01) and oddsTried kept it from being asked for again.
    games.forEach(function(g){ if(!g.odds && S.odds[g.id]) g.odds=S.odds[g.id]; });
    S.games=games;
    var live=games.filter(function(g){return g.state==="in";})[0];
    var up=games.filter(function(g){return g.state==="pre";})[0];
    S.next=live||up||null;
    SC.failed=false;
    // Game's views and the nav's live state follow the hero game from the
    // first paint - the saved copy too - so a reload onto #game/plays opens
    // Plays, not the lifecycle's default (code review, 2026-10-01).
    applyGameRules();
    paintScheduleScreen();
    paintHome();
    paintGame();
    paintTop25();                        // which game #game opens rides on the schedule
    statsInputsChanged();                // and Stats' opponent column, in game week
    return games;
  }
  var painted=false;
  if(first){
    // Until 2026-09 the regular season was fetched without a season type;
    // a fan's offline copy from then is under that URL. Bridges one update.
    var kept=cachedJSON(url).catch(function(){ return cachedJSON(url.split("?")[0]); });
    Promise.all([kept, cachedJSON(postUrl).catch(function(){ return null; })]).then(function(r){
      if(S.games) return;              // the network beat the cache; nothing to do
      if(!POST) POST=r[1];
      apply(r[0]); painted=true;
    }).catch(function(){});
  }

  var post=get(postUrl, hasEvents).then(function(d){ POST=d; statsInputsChanged(); }).catch(function(){});
  S.p=Promise.all([get(url, hasEvents), post]).then(function(r){
    var games=apply(r[0]);
    // A game under way before the first scoreboard tick: fetch it now, so
    // Home's hero has the clock, the ball and the down from the start.
    if(!SB.games && games.some(TeamOS.game.underWay)){
      getScoreboard(0).then(function(){
        S.games=TeamOS.live.reconcileAll(S.games, SB.games);
        paintHome();
      }).catch(function(){});
    }
    if(announce) say("Schedule loaded, "+games.length+" games."+
      (S.next?" Next game is "+(S.next.home?"versus ":"at ")+S.next.oppName+".":""));
    startAuto();
    if(first){
      if(window.requestIdleCallback) window.requestIdleCallback(warmTabs, {timeout:2500});
      else setTimeout(warmTabs, 900);
    }

    if(S.next && !S.next.odds && S.oddsTried!==S.next.id){
      var oddsFor=S.next.id;
      S.oddsTried=oddsFor;            // ESPN often has no line for these; ask once
      summaryFor(oddsFor).then(function(sm){
        var o=TeamOS.espn.gameOdds(sm); if(!o) return;
        // the line belongs to the game it was asked for, even if the
        // schedule has moved on to another next game meanwhile
        S.odds[oddsFor]=o;
        (S.games||[]).forEach(function(x){ if(x.id===oddsFor) x.odds=o; });
        if(S.next && S.next.id===oddsFor) S.next.odds=o;
        paintHome(); paintGame(); paintScheduleScreen();
      }).catch(function(){});
    }
    return { key:"schedule", outcome:outcomeOf("schedule") };
  }).catch(function(){
    if(first && !painted){               // a failed poll, or a cached paint, keeps what is there
      SC.failed=true; paintScheduleScreen(); paintHome(); paintGame();
      say("Schedule failed to load.");
    }
    return { key:"schedule", outcome:"failed" };
  });
  S.p.then(function(){ S.p=null; });
  return S.p;
}

/* ---------- summaries: one fetch per game, finals kept for good ---------- */
// ESPN's summary is the box score, and every call to ESPN costs about half a
// second of latency whatever its size. A finished game's summary never
// changes, so it is stored in the Cache API and never fetched twice on this
// device. A live game is always fetched fresh. In-flight requests are shared,
// so a prefetch and a tap on the same row make one call between them.
var SUM={ mem:{}, inflight:{} };
var SUM_CACHE="iw-final-summaries";

function gameById(id){
  return (S.games||[]).filter(function(g){ return String(g.id)===String(id); })[0]||null;
}
function summaryFor(id, live){
  id=String(id);
  var url=TeamOS.espn.summaryUrl(id);
  var g=gameById(id), isFinal=!!g && g.state==="post";
  var hit=SUM.mem[id];
  if(!live && hit && (hit.final || Date.now()-hit.at<60000)) return Promise.resolve(hit.d);
  if(SUM.inflight[id]) return SUM.inflight[id];

  // A finished game's summary is kept for good - but only one that is
  // itself complete (ESPN's own flag) and came from the network, never the
  // worker's offline copy: either could be a mid-game copy that would then
  // stand as the final forever (code review, 2026-10-01). A stored copy is
  // checked again on the way out, so one kept before this rule is dropped.
  var stored = (isFinal && !live && typeof caches!=="undefined")
    ? caches.open(SUM_CACHE).then(function(c){
        return c.match(url).then(function(r){ if(!r) throw 0; return r.json(); }).then(function(d){
          if(TeamOS.espn.summaryFinal(d)) return { d:d, final:true };
          c.delete(url).catch(function(){});
          throw 0;
        });
      })
    : Promise.reject(0);

  var p = stored.catch(function(){
    return fetch(url,{cache:"no-store"}).then(function(r){
      if(!r.ok) throw new Error("HTTP "+r.status);
      var fromWorker=!!r.headers.get("X-IW-Cached");
      return r.json().then(function(d){
        var done=isFinal && !fromWorker && TeamOS.espn.summaryFinal(d);
        if(done && typeof caches!=="undefined"){
          caches.open(SUM_CACHE).then(function(c){
            return c.put(url, new Response(JSON.stringify(d), { headers:{ "content-type":"application/json" } }));
          }).catch(function(){});
        }
        return { d:d, final:done };
      });
    });
  }).then(function(x){
    SUM.mem[id]={ d:x.d, at:Date.now(), final:x.final };
    return x.d;
  });
  SUM.inflight[id]=p;
  p.then(function(){ delete SUM.inflight[id]; }, function(){ delete SUM.inflight[id]; });
  return p;
}

// After the page has settled: the box scores people actually tap - finished
// games, newest first - and the next game. Staggered so it never competes
// with anything the reader asked for, and skipped on a data-saver connection.
function prefetchSummaries(){
  if(document.hidden || !S.games) return;
  var c=navigator.connection;
  if(c && (c.saveData || /(^|-)2g$/.test(c.effectiveType||""))) return;
  var ids=S.games.filter(function(g){ return g.state==="post"; })
    .map(function(g){ return g.id; }).reverse();
  if(S.next) ids.unshift(S.next.id);
  ids.forEach(function(id,i){
    setTimeout(function(){ if(!document.hidden) summaryFor(id).catch(function(){}); }, 350*i);
  });
}


// Everything Refresh Data and a pull down do, and the silent refresh on
// return to a tab left in the background. Its scope (Product, 2026-09-25, on
// the catch-up review's recommendation): this team's shared data - its
// status, schedule, news and Season Outlook markets - and the data of screens
// already loaded this visit (the scoreboard, the polls, the roster, the game
// open on Game or from Schedule unless it is final); never unopened games or
// another team's. Work already under way is joined, not repeated. It resolves
// once every step has settled, to what each came to: "network", "cached"
// (the worker's last copy) or "failed" (catch-up review 1.2).
function refreshAll(silent){
  T25.at=0;
  if(!silent) say("Refreshing…");
  var steps=[loadTeamStatus(), refreshSchedule(false), loadStrip(), loadNews(true)];
  if(SB.data || SB.p) steps.push(getScoreboard(0).then(function(){ return { key:"scoreboard", outcome:outcomeOf("scoreboard") }; },
                                                       function(){ return { key:"scoreboard", outcome:"failed" }; }));
  if(T25.polls || T25.p) steps.push(loadRankings());
  if(Object.keys(RO.s).some(function(k){ return RO.s[k].tried; })) steps.push(loadRosterScreen(true));
  if(ST.us || ST.p || ST.failed) steps.push(loadStats(true).then(function(){ return { key:"stats", outcome: ST.outcome || "failed" }; }));
  if(PL.tables || PL.p || PL.failed) steps.push(loadPlayers(true).then(function(){ return { key:"players", outcome: PL.outcome || "failed" }; }));
  // An open game's summary is otherwise kept up to five minutes before
  // kickoff: drop that, so a refresh refreshes what the fan is looking at.
  [GV, SV].forEach(function(V){
    var g=V.id && gameById(V.id);
    if(g && g.state!=="post"){ V.at=0; delete SUM.mem[String(V.id)]; }
  });
  if(UI.tab==="game") paintGame();
  if(UI.tab==="schedule") paintScheduleScreen();
  // ...and the refresh is not done until that game's summary is: it waits
  // for it and reports it with the rest.
  [UI.tab==="game" && GV, UI.tab==="schedule" && SV].forEach(function(V){
    if(V && V.p) steps.push(V.p.then(function(o){ return { key:"summary", outcome:o }; }));
  });
  FRESH.at=Date.now();
  return Promise.all(steps).then(function(r){
    // The schedule and the scoreboard answer in either order, and the
    // schedule reconciles only with the scoreboard it found: so once both
    // are in, reconcile again - this week's opponent's record and rank, and
    // a game the scoreboard already calls under way (W10).
    if(SB.games) scoreboardArrived();
    var flat=[]; (function add(x){ if(Array.isArray(x)) x.forEach(add); else if(x && x.outcome) flat.push(x); })(r);
    return flat;
  });
}

/* ---------- More (canonical) ---------- */
// More and what it owns are drawn by suite/more.js; this gathers what they
// show. Settings' Refresh Data is the manual refresh (decision 0022 #13);
// Change Team opens the chooser in its CHANGE mode (0022 #7), which keeps the
// current team until another is picked and offers Cancel back to it.
// from: the last screen the fan was on, for Feedback - null until there is
// one (a direct entry names none). result: what the last Refresh Data did.
var MORE={ from:null, refreshing:false, p:null, version:null, result:null };
var FEEDBACK_TO="suiteappfeedback@gmail.com";
function paintMore(){
  var r=Suite.nav.current(), host=$(MORE_HOSTS[r.screen]);
  if(!host) return;
  if(r.screen==="more") Suite.more.menu(host);
  if(r.screen==="news") paintNews();
  if(r.screen==="stats") paintStats();
  if(r.screen==="settings") Suite.more.settings(host, {
    team:{ name:TEAM.name, abbr:TEAM.abbreviation,
           mark:Suite.ui.mark(TeamOS.espn.mark(TEAM_CONFIG.sources.espn.teamId), TEAM.name, TEAM.abbreviation) },
    changeHref: location.pathname+"?change", style: appStyle(),
    updatedAt: lastUpdated(), refreshing: MORE.refreshing, online: navigator.onLine!==false, result: MORE.result,
    alerts: alertsModel() });
  if(r.screen==="feedback") Suite.more.feedback(host, { href: feedbackHref(), address: FEEDBACK_TO });
  if(r.screen==="about") Suite.more.about(host, { version: MORE.version, sources: TeamOS.sources.list(TEAM_CONFIG) });
}
function paintNews(){
  var host=$("screenNews");
  if(!host || host.hidden) return;
  var failed=newsSources().every(function(x){ var st=newsState(x.key); return st.tried && !st.p && !st.list; });
  Suite.more.news(host, { items: NEWS.items, failed: failed, team:{ name:TEAM.name },
    fresh: TeamOS.freshness.summary(newsFreshSources(), { now:new Date(), online:navigator.onLine!==false }) });
}
// The newest time the network - not the worker's copy - answered.
function lastUpdated(){
  return Object.keys(SRC).reduce(function(max, k){
    var x=SRC[k]; return x && !x.cached && x.fetchedAt > max ? x.fetchedAt : max;
  }, 0) || null;
}
// Share Suite: a line of text and the link to Suite, handed to the phone's
// share sheet (Messages is one tap from there). Where there is no share
// sheet, the text is copied to paste into a message; where that is refused
// too, it opens as a new text message. It shares the app, not the fan's
// team: no team in the words or the link, so a friend picks their own
// (David, 2026-10-02: "sharing the app isn't dependent on liking the same
// team").
var SHARE={ t:0 };
function shareSuite(){
  var url=location.origin+location.pathname;
  var text="Join me on Suite";
  var note=document.querySelector("[data-share-note]");
  // Said twice: in the status line (announced) and on the row itself, which
  // is where the eye is when the status line sits below the fold. The row's
  // own words are kept on it the first time, so a second tap while the
  // first's message shows never makes that message the row's words.
  var sub=document.querySelector("[data-share] .mo-sub");
  if(sub && !sub.hasAttribute("data-words")) sub.setAttribute("data-words", sub.textContent);
  var was=sub && sub.getAttribute("data-words");
  function say(t){
    if(note) note.textContent=t;
    if(sub && t){ sub.textContent=t; clearTimeout(SHARE.t); SHARE.t=setTimeout(function(){ sub.textContent=was; }, 4000); }
  }
  say("");
  if(navigator.share){
    navigator.share({ title:"Suite", text:text, url:url }).catch(function(){});
    return;
  }
  var both=text+": "+url;
  function sms(){ location.href="sms:?&body="+encodeURIComponent(both); }
  if(navigator.clipboard && navigator.clipboard.writeText)
    navigator.clipboard.writeText(both).then(function(){ say("Link copied. Paste it into a text."); }, sms);
  else sms();
}
document.addEventListener("click", function(e){
  if(e.target.closest && e.target.closest("[data-share]")) shareSuite();
});
function feedbackHref(){
  var body=["", "", "—", "Team: "+TEAM.name,
            "Screen: "+(MORE.from ? Suite.nav.title(MORE.from) : "opened Feedback directly"),
            "Version: "+(MORE.version||"unknown")].join("\n");
  return "mailto:"+FEEDBACK_TO+"?subject="+encodeURIComponent("Suite feedback · "+TEAM.name)+"&body="+encodeURIComponent(body);
}
// The app's version is the worker's: one number, where the shell is cached.
// Asked for as soon as a worker controls the page - and again if one takes
// over later - so Feedback and About both have it (catch-up review 1.4).
function askVersion(){
  if(MORE.version || !navigator.serviceWorker || !navigator.serviceWorker.controller || typeof MessageChannel==="undefined") return;
  var ch=new MessageChannel();
  ch.port1.onmessage=function(e){
    if(e.data && typeof e.data.version==="string"){ MORE.version=e.data.version.replace(/^[a-z]+-/,""); paintMore(); }
  };
  try{ navigator.serviceWorker.controller.postMessage({ type:"version" }, [ch.port2]); }catch(e){}
}
document.addEventListener("change", function(e){
  if(e.target && e.target.name==="appStyle"){
    setAppStyle(e.target.value);
    say(e.target.value==="suite" ? "Suite Style on." : "Team Style on.");
    paintMore();
  }
});
if(navigator.serviceWorker){
  askVersion();
  navigator.serviceWorker.addEventListener("controllerchange", askVersion);
  if(navigator.serviceWorker.ready) navigator.serviceWorker.ready.then(function(){ setTimeout(askVersion, 0); });
}
// What a refresh came to, in words: every step's outcome, not the browser's
// idea of being online (catch-up review 1.2).
function refreshResult(outcomes){
  var fresh=outcomes.filter(function(o){ return o.outcome==="network" || o.outcome==="current"; }).length;
  var stale=outcomes.length-fresh;
  var t=new Date().toLocaleTimeString([],{hour:"numeric",minute:"2-digit"});
  if(!stale) return { say:"Data refreshed.", note:"Refreshed at "+t+"." };
  if(fresh) return { say:"Some data refreshed. "+stale+(stale===1?" source":" sources")+" couldn\u2019t be reached; showing the last data for "+(stale===1?"it":"them")+".",
                     note:"Partly refreshed at "+t+". Some data may be outdated." };
  return { say:"Couldn\u2019t refresh. Showing the last data this device saw.",
           note:"Couldn\u2019t refresh at "+t+". Showing the last data this device saw." };
}
// The manual refresh. Settings' Refresh Data and a pull down on any screen
// are one action (David, 2026-10-01), so they can never drift apart: either
// one shows as under way on the other, and Settings reports how the last one
// came out, whichever started it. A second ask while one runs joins it.
function manualRefresh(){
  if(MORE.p) return MORE.p;
  MORE.refreshing=true; paintMore();
  MORE.p=refreshAll(false).then(function(outcomes){
    var r=refreshResult(outcomes);
    MORE.refreshing=false; MORE.p=null; MORE.result=r.note; paintMore();
    return r;
  });
  return MORE.p;
}
document.addEventListener("click", function(e){
  var b=e.target.closest && e.target.closest("[data-refresh]");
  if(!b || MORE.refreshing) return;
  manualRefresh().then(function(r){
    // Back to the button the fan pressed - unless they have moved on.
    var btn=document.querySelector("#screenSettings [data-refresh]"), a=document.activeElement;
    if(btn && !$("screenSettings").hidden && (!a || a===document.body || a===btn)) btn.focus();
    say(r.say);
  });
});
Suite.nav.pull(function(){ return manualRefresh().then(function(r){ say(r.say); }); });

/* ---------- Game alerts (W19) ---------- */
// Kickoff and final for this team, pushed by the edge API (worker/src/push.js)
// to this device. Nothing is asked of the browser until the fan taps Turn On
// in Settings (notifications brief §3). Whether this device turned them on
// for this team is kept here; the Worker keeps the subscription itself.
var ALERTS={ busy:false, note:null };
var ALERT_KEY="iw-alerts-"+TEAM.id;
function alertSupport(){
  var ios=/iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform==="MacIntel" && navigator.maxTouchPoints>1);
  var installed=navigator.standalone===true || (window.matchMedia && matchMedia("(display-mode: standalone)").matches);
  if(!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window))
    return ios && !installed ? "install" : "unsupported";      // iOS offers push only to an installed app
  return "ok";
}
function alertsOnHere(){ try{ return localStorage.getItem(ALERT_KEY)==="1"; }catch(e){ return false; } }
function alertsModel(){
  var support=alertSupport(), granted=support==="ok" && Notification.permission==="granted";
  // On only while this device can still get them: permission taken back in
  // the device's settings reads Off, not a promise nothing will keep.
  return { support:support, on:granted && alertsOnHere(), busy:ALERTS.busy, note:ALERTS.note,
           denied: support==="ok" && Notification.permission==="denied" };
}
// A subscription the browser has dropped on its own (iOS can, even while
// the installed app sits suspended) is not on: checked at start, each time
// Settings is shown and each time the app comes back (Codex, PR #103).
function alertsRecheck(){
  if(!alertsOnHere() || alertSupport()!=="ok" || ALERTS.busy || !navigator.serviceWorker.ready) return;
  navigator.serviceWorker.ready.then(function(reg){ return reg.pushManager.getSubscription(); }).then(function(sub){
    if(!sub && !ALERTS.busy){ try{ localStorage.removeItem(ALERT_KEY); }catch(e){} paintMore(); }
  }).catch(function(){});
}
alertsRecheck();
document.addEventListener("visibilitychange", function(){ if(!document.hidden) alertsRecheck(); });
window.addEventListener("hashchange", function(){ if(Suite.nav.current().screen==="settings") alertsRecheck(); });
function keyBytes(b64){
  var s=atob(b64.replace(/-/g,"+").replace(/_/g,"/")+"===".slice((b64.length+3)%4)), out=new Uint8Array(s.length);
  for(var i=0;i<s.length;i++) out[i]=s.charCodeAt(i);
  return out;
}
function sameKey(sub, key){
  var k=sub && sub.options && sub.options.applicationServerKey;
  if(!k) return true;                                    // the browser does not say: keep it
  var a=new Uint8Array(k);
  return a.length===key.length && a.every(function(v,i){ return v===key[i]; });
}
function postEdge(path, body){
  return fetch(EDGE+path, { method:"POST", headers:{ "content-type":"application/json" }, body:JSON.stringify(body) })
    .then(function(r){ return r.json().catch(function(){ return {}; }).then(function(b){ return { status:r.status, body:b }; }); });
}
function alertsDone(note, on){
  if(on!=null){ try{ on ? localStorage.setItem(ALERT_KEY,"1") : localStorage.removeItem(ALERT_KEY); }catch(e){} }
  ALERTS.busy=false; ALERTS.note=note; paintMore(); say(note);
  var btn=document.querySelector("#screenSettings [data-alerts]");
  if(btn && !$("screenSettings").hidden) btn.focus();
}
function alertsTurnOn(){
  ALERTS.busy=true; ALERTS.note=null; paintMore();
  // First thing in the tap: iOS grants permission only from the tap itself.
  var asked=Notification.requestPermission();
  Promise.resolve(asked).then(function(perm){
    if(perm!=="granted") throw { why:"denied" };
    return Promise.all([navigator.serviceWorker.ready, fetch(EDGE+"/v1/push/key").then(function(r){ return r.json(); })]);
  }).then(function(x){
    var reg=x[0], key=keyBytes(x[1].key);
    return reg.pushManager.getSubscription().then(function(old){
      // A subscription made with another key cannot be reused: replace it.
      if(old && !sameKey(old, key)) return old.unsubscribe().then(function(){ return null; });
      return old;
    }).then(function(old){ return old || reg.pushManager.subscribe({ userVisibleOnly:true, applicationServerKey:key }); });
  }).then(function(sub){
    return postEdge("/v1/push/subscribe", { subscription:sub.toJSON(), team:{ id:String(TEAM_CONFIG.sources.espn.teamId), name:TEAM.name } });
  }).then(function(r){
    if(r.status!==200) throw { why:"server" };
    alertsDone(r.body.confirmation==="sent" ? "Game alerts are on. A test alert is on its way."
                                           : "Game alerts are on, but the test alert didn’t go through. Try Turn Off, then Turn On.", true);
  }).catch(function(e){
    alertsDone(e && e.why==="denied" ? "Notifications weren’t allowed, so game alerts are off."
                                     : "Couldn’t turn on game alerts. Check your connection and try again.", false);
  });
}
function alertsTurnOff(){
  ALERTS.busy=true; ALERTS.note=null; paintMore();
  navigator.serviceWorker.ready.then(function(reg){ return reg.pushManager.getSubscription(); }).then(function(sub){
    if(!sub) return { status:200 };
    return postEdge("/v1/push/unsubscribe", { endpoint:sub.endpoint, team:{ id:String(TEAM_CONFIG.sources.espn.teamId) } });
  }).then(function(r){
    if(r.status!==200) throw new Error("server");
    alertsDone("Game alerts are off.", false);
  }).catch(function(){
    alertsDone("Couldn’t turn off game alerts. Check your connection and try again.", null);
  });
}
document.addEventListener("click", function(e){
  var b=e.target.closest && e.target.closest("[data-alerts]");
  if(!b || ALERTS.busy || alertSupport()!=="ok") return;
  if(b.getAttribute("data-alerts")==="on") alertsTurnOn(); else alertsTurnOff();
});

// How long data may sit before a silent refresh: on return to a tab that was
// hidden this long, and on a timer while it stays visible.
var FRESH={ at:Date.now(), hiddenAt:null, afterHidden:10*60e3, whileVisible:30*60e3 };
document.addEventListener("visibilitychange", function(){
  if(document.hidden){ FRESH.hiddenAt=Date.now(); return; }
  var away=FRESH.hiddenAt ? Date.now()-FRESH.hiddenAt : 0;
  FRESH.hiddenAt=null;
  if(away>FRESH.afterHidden || Date.now()-FRESH.at>FRESH.whileVisible) refreshAll(true);
});
// Kickoff has come and gone but our snapshot still calls the game upcoming.
// Nothing else would notice for up to half an hour: startAuto() only runs
// after a fetch, and without a fetch there is no fetch. So look - every
// minute for the first ten minutes past kickoff, when the game is most
// likely starting, then every five while a delay drags on (a weather hold
// can be hours: a minute's poll for all of it is wasted requests, W10), and
// after eight hours stop: the half-hour refresh covers a game that never
// started. Pure, so pollcheck can ask it.
var LATE_KICKOFF={ at:0 };
function lateKickoffDue(next, now, lastAt){
  if(!next || next.state!=="pre" || !next.timeSet) return false;
  var past=now-new Date(next.date).getTime();
  if(!(past>=0) || past>8*3600e3) return false;
  var every=past<10*60e3 ? 60e3 : 5*60e3;
  return now-lastAt >= every-1000;                 // a tick's jitter never skips a turn
}
setInterval(function(){
  if(document.hidden) return;
  if(somethingLive()) return;                      // the live poller is already refreshing

  if(lateKickoffDue(S.next, Date.now(), LATE_KICKOFF.at)){
    LATE_KICKOFF.at=Date.now();
    refreshSchedule(false);
    return;
  }
  // Reading the Top 25 while the league starts playing: the same blind spot,
  // one endpoint over.
  if(!$("screenTop25").hidden && Date.now()-SB.at > 60000){
    getScoreboard(0).then(paintTop25).catch(function(){});
    return;
  }
  if(Date.now()-FRESH.at>FRESH.whileVisible) refreshAll(true);
}, 60e3);

// Roster's views follow what this team has (TeamOS.roster.views): a team
// without a depth chart or an availability report has no empty tabs.
Suite.nav.setViews("roster", TeamOS.roster.views(TEAM_CONFIG));
Suite.nav.start();
load();
liftLaunchWhenReady();

// The launch screen (index.html; David 2026-10-01: "about 3 seconds and
// clean") lifts when two things are true. Its animation has played - MIN
// from when this launch began, which an update's reload carries over - and
// the screen the fan opened is complete: Home has the season (or says it
// could not load it), no request has been out for QUIET ms (the schedule,
// rank, odds, news, weather and line all answered or failed), and every
// image in view has loaded or failed. So nothing fills in once it lifts.
// Never later than MAX: a slow network shows what it has. Reduced motion
// has no animation to wait for, so its minimum is short. While an update is
// installing it holds too (UPDATING), up to UPD_MAX - an update comes once a
// release, and lifting before its reload shows the page and then reloads it -
// and keeps its start time, so the reloaded page carries on this launch
// rather than playing a second one; a page reloaded late in the launch still
// gets OWN ms to finish its screen.
function liftLaunchWhenReady(){
  var el=$("launch"); if(!el) return;
  if(document.documentElement.hasAttribute("data-launched")){
    el.parentNode.removeChild(el);
    try{ sessionStorage.removeItem("suite-launch-at"); }catch(e){}
    return;
  }
  // From here this decides when it lifts; the inline 7-second lift is only
  // for an app.js that never runs, and must not cut an update's wait short.
  el.style.animation="none";
  var reduce=window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var start=Date.now(), at=Math.min(window.SUITE_LAUNCH_AT||start, start), MIN=reduce?600:2600, MAX=6000, UPD_MAX=10000, OWN=3000, QUIET=300;
  var cap=Math.max(at+MAX, start+OWN);
  function screen(){ return document.querySelector("#main > div:not([hidden])"); }
  function inView(img){
    var r=img.getBoundingClientRect();
    return r.width>0 && r.height>0 && r.bottom>0 && r.top<innerHeight && r.right>0 && r.left<innerWidth;
  }
  function ready(){
    var sc=screen(); if(!sc || !sc.firstChild) return false;
    if(sc.id==="screenHome" && !S.games && !SC.failed) return false;
    if(UPDATING || CHECKING) return false;
    if(NET.busy>0 || Date.now()-NET.quietSince<QUIET) return false;
    return Array.prototype.every.call(sc.querySelectorAll("img"), function(i){ return !inView(i) || i.complete; });
  }
  (function tick(){
    var age=Date.now()-at;
    var limit=UPDATING || CHECKING ? Math.max(cap, at+UPD_MAX) : cap;
    if(Date.now()>=limit || (age>=MIN && ready())){
      el.classList.add("done");
      // Lifting while an update installs: its reload is still to come, and
      // must not play the launch a second time over a page already seen.
      try{ sessionStorage.removeItem("suite-launch-at"); }catch(e){}
      if(UPDATING || CHECKING) liftedMarker(true);
      setTimeout(function(){ if(el.parentNode) el.parentNode.removeChild(el); }, 500);
      return;
    }
    setTimeout(tick, 50);
  })();
}
})();
