(function(){
"use strict";

// The team this Suite is built around. index.html loads teams/<team>.js and
// teamos/*.js before this file; TeamOS turns the config's `team` section
// into a validated, frozen, provider-neutral Team, and everything ESPN
// knows about it arrives as domain objects (docs/03_DOMAIN_MODEL.md). The
// only provider config this file still reads is TEAM_CONFIG.sources.kalshi,
// in teamMarket().
var TEAM = TeamOS.createTeam(TEAM_CONFIG.team);
// Kalshi serves public market data without a key, but sends no CORS header, so
// a browser cannot read it directly. Each entry below is a way to reach them;
// they are tried in order until one works.
//
// If you deploy worker.js to Cloudflare Workers, paste the worker URL here and
// it goes first — your own relay, no third party, no rate limit worth worrying
// about. Leave it empty and the public relays below carry the load.
// Left empty on purpose. A Cloudflare worker was tried here and Kalshi
// rate-limits Cloudflare's shared edge IPs, so the GitHub Action writes the
// snapshot files instead. Paste a worker URL here only if that ever changes.
var KALSHI_PROXY = "";

var KALSHI_DIRECT = "https://api.elections.kalshi.com/trade-api/v2";

// Each builder turns a Kalshi path into a full URL to fetch.
var KALSHI_ROUTES = [];
// Same-origin snapshot committed by the GitHub Action, if you set that up.
// No cross-origin request at all, so CORS can never break it.
function localSnapshot(path){
  // Test PLAYOFF first: KXNCAAF is a prefix of KXNCAAFPLAYOFF.
  if(/KXNCAAFPLAYOFF/.test(path)) return "odds-playoff.json";
  if(/KXNCAAF-/.test(path))       return "odds-title.json";
  return null;
}
KALSHI_ROUTES.push(
  // 1. the snapshot the GitHub Action commits — same origin, always works
  function(path){
    var f = localSnapshot(path);
    if(!f) throw new Error("no snapshot for this path");
    return f + "?t=" + Date.now();
  }
);
// 2. a Cloudflare worker, if one is set. Kalshi currently rate-limits
//    Cloudflare's shared edge IPs, so this is a fallback, not the main route.
if (KALSHI_PROXY) {
  KALSHI_ROUTES.push(function(path){ return KALSHI_PROXY + path; });
}
KALSHI_ROUTES.push(
  // 3. direct, in case Kalshi ever starts sending the header
  function(path){ return KALSHI_DIRECT + path; },
  function(path){ return "https://corsproxy.io/?url=" + encodeURIComponent(KALSHI_DIRECT + path); },
  function(path){ return "https://api.allorigins.win/raw?url=" + encodeURIComponent(KALSHI_DIRECT + path); },
  function(path){ return "https://api.codetabs.com/v1/proxy?quest=" + encodeURIComponent(KALSHI_DIRECT + path); }
);
var TITLE_EVENT   = "KXNCAAF-27";          // national championship winner
var PLAYOFF_EVENT = "KXNCAAFPLAYOFF-26";   // playoff qualifiers

// stale: set when the service worker had to answer from its cache because
// the network was down, so the footer can say so instead of "last updated now".
var S = { games:null, next:null, tick:null, oddsTried:null, stale:null };
function $(id){ return document.getElementById(id); }
function say(msg){ $("live").textContent = msg; }

/* ---------- identity ---------- */
// Everything that says whose product this is: the document head, the header
// lockup, the motto, and the team tokens the stylesheet reads. Before Phase 6
// all of it was authored into index.html, manifest.json and app.css, so a
// second team's page still called itself by the first team's name, in
// the first team's colours (phase-5a-ohio-state-proof.md, finding 4). It is
// object from the team config, applied once, here.
//
// Artwork is optional and independent: a team that declares no icon gets no
// icon tag rather than a link to a file that is not there.
var ID = TeamOS.identity.create(TEAM_CONFIG, TEAM);

function paintIdentity(){
  var head = document.head;

  // A head tag is set when the team has a value for it and removed when it
  // does not, so the document never points at missing artwork.
  function tag(sel, make, attr, value){
    var el = head.querySelector(sel);
    if(value == null){ if(el) el.parentNode.removeChild(el); return; }
    if(!el){ el = make(); head.appendChild(el); }
    el.setAttribute(attr, value);
  }
  function meta(key, value, prop){
    var a = prop ? "property" : "name";
    tag("meta["+a+'="'+key+'"]', function(){
      var m = document.createElement("meta"); m.setAttribute(a, key); return m;
    }, "content", value);
  }
  function icon(sel, rel, sizes, type, value){
    tag(sel, function(){
      var l = document.createElement("link");
      l.setAttribute("rel", rel);
      if(sizes) l.setAttribute("sizes", sizes);
      if(type)  l.setAttribute("type", type);
      return l;
    }, "href", value);
  }
  function text(sel, value){
    var el = document.querySelector(sel); if(el) el.textContent = value;
  }

  // ---- the document ----
  document.title = ID.title;
  meta("description", ID.description);
  meta("theme-color", ID.colors.surface);
  meta("application-name", ID.productName);
  meta("apple-mobile-web-app-title", ID.productName);
  meta("og:title", ID.shareTitle, true);
  meta("og:description", ID.shareDescription, true);
  meta("twitter:title", ID.shareTitle);
  meta("twitter:description", ID.shareDescription);
  // The share image and its dimensions stand or fall together.
  meta("og:image", ID.assets.og, true);
  meta("og:image:width",  ID.assets.og ? "1200" : null, true);
  meta("og:image:height", ID.assets.og ? "630"  : null, true);
  meta("twitter:image", ID.assets.og);
  meta("twitter:card", ID.assets.og ? "summary_large_image" : null);

  icon('link[rel="icon"][type="image/svg+xml"]', "icon", null,    "image/svg+xml", ID.assets.favicon);
  icon('link[rel="icon"][sizes="32x32"]',        "icon", "32x32", "image/png",     ID.assets.icon32);
  icon('link[rel="icon"][sizes="64x64"]',        "icon", "64x64", "image/png",     ID.assets.icon64);
  icon('link[rel="apple-touch-icon"]', "apple-touch-icon", "180x180", null,        ID.assets.appleTouch);
  icon('link[rel="manifest"]', "manifest", null, null, ID.manifest);

  // ---- the page ----
  text(".brand-kicker", ID.programLabel);
  text(".bar h1", ID.productName);
  text(".hero-brand-name", TEAM.name);
  text("#heroHead", "Next "+TEAM.name+" game");
  text("#dataHead", TEAM.name+" and national football data");
  var m = $("motto");
  // A team without a motto does not get an empty line where one would be.
  if(m){ if(ID.motto) m.textContent = ID.motto; else m.parentNode.removeChild(m); }

  // ---- the stylesheet ----
  // app.css declares these with this team's values already, so for Notre
  // Dame every line below is a no-op; for any other config it is what makes
  // the whole sheet that team's.
  var r = document.documentElement.style, c = ID.colors;
  [["--t-accent",c.accent], ["--t-accent-rgb",c.accentRgb], ["--t-accent-text",c.accentText],
   ["--t-accent-ink",c.accentInk], ["--t-accent-soft",c.accentSoft], ["--t-accent-tint",c.accentTint],
   ["--t-accent-tint-soft",c.accentTintSoft], ["--t-focus",c.focus],
   ["--t-surface",c.surface], ["--t-surface-rgb",c.surfaceRgb],
   ["--t-deep",c.surfaceDeep], ["--t-deep-rgb",c.surfaceDeepRgb],
   ["--t-abyss",c.surfaceAbyss], ["--t-abyss-rgb",c.surfaceAbyssRgb],
   ["--t-raise",c.surfaceRaise], ["--t-raise-rgb",c.surfaceRaiseRgb],
   // a CSS content string carries its own quotes
   ["--t-news-label", JSON.stringify(ID.newsLabel)],
   ["--t-font-ui",ID.fonts.ui], ["--t-font-display",ID.fonts.display],
   ["--t-font-headline",ID.fonts.headline]].forEach(function(p){ r.setProperty(p[0], p[1]); });
  // Optional: a team whose surface needs a different text neutral than the
  // Suite's own. Left undeclared, the stylesheet's values stand.
  if(c.text)    r.setProperty("--paper", c.text);
  if(c.textDim) r.setProperty("--dim",   c.textDim);

  // Leave this team's boot set behind for the next visit. app.css's :root is
  // team-neutral, so without this every visit would paint neutral for the
  // moment before this function runs; with it, only the first ever visit to a
  // team does. Stored under the team's own id, so one team's colours can never
  // be replayed onto another (docs/engineering/first-paint-team-tokens.md).
  try{
    var boot={};
    for(var i=0;i<r.length;i++){
      var name=r[i];
      if(name.indexOf("--")===0) boot[name]=r.getPropertyValue(name);
    }
    boot.title      = ID.title;
    boot.themeColor = ID.colors.surface;
    localStorage.setItem("iw-boot-"+TEAM.id, JSON.stringify(boot));
  }catch(e){}   // private mode, blocked storage, a full quota: the page is fine without it
}
paintIdentity();


function get(url){
  return fetch(url,{cache:"no-store"}).then(function(r){
    if(!r.ok) throw new Error("HTTP "+r.status);
    var cached=r.headers.get("X-IW-Cached");
    if(cached){ S.stale = S.stale || cached; paintStale(); }
    return r.json();
  });
}

// Offline shell. sw.js keeps the page itself and the last good copy of every
// data call, so it opens in the stadium with no signal. Registered relative to
// the page, so it works at / on localhost and under /<repo>/ on Pages.
if("serviceWorker" in navigator){
  window.addEventListener("load", function(){
    navigator.serviceWorker.register("sw.js").then(function(){
      return navigator.serviceWorker.ready;
    }).then(tellWorkerOurTeam).catch(function(){});
  });
}

// What this team's offline copy consists of. The worker has no TEAM_CONFIG
// and no localStorage, so it cannot work this out for itself - it precaches
// only the half of the shell that belongs to no team, and the page tells it
// the rest (decision 0015). Every path is derived from the team's own
// configuration, so a team that adds artwork or a snapshot gets it cached
// without a second list to remember.
function teamCacheManifest(){
  var shell = ["teams/"+TEAM.id+".js", ID.manifest];
  ["favicon","icon32","icon64","appleTouch","og"].forEach(function(k){
    if(ID.assets[k]) shell.push(ID.assets[k]);
  });
  return { type:"team", team:TEAM.id, shell:shell, manifest:ID.manifest,
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
function paintStale(){
  var f=$("foot"); if(!f || !S.stale) return;
  var when=isNaN(Date.parse(S.stale)) ? "" :
    " from "+new Date(S.stale).toLocaleString([],{weekday:"short",hour:"numeric",minute:"2-digit"});
  f.textContent="Offline. Showing the last data this device saw"+when+". "+
    "Scores, odds and news will refresh when the connection is back.";
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
function fmtTime(iso){ return new Date(iso).toLocaleTimeString([],{hour:"numeric",minute:"2-digit"}); }
function fmtDay(iso){ return new Date(iso).toLocaleDateString([],{weekday:"long",month:"long",day:"numeric"}); }
function tzAbbr(){
  try{ var p=new Intl.DateTimeFormat([],{timeZoneName:"short"}).formatToParts(new Date());
    for(var i=0;i<p.length;i++) if(p[i].type==="timeZoneName") return p[i].value; }catch(e){}
  return "";
}
// Visual chip shows "SEP 13"; the accessible name says "September 13".
function localISO(d){
  return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+
         "-"+String(d.getDate()).padStart(2,"0");
}
function dateChip(iso){
  var d=new Date(iso);
  return '<time class="date" datetime="'+localISO(d)+'">'+
    '<span class="sr-only">'+d.toLocaleDateString([],{month:"long",day:"numeric"})+"</span>"+
    '<span class="m" aria-hidden="true">'+d.toLocaleDateString([],{month:"short"})+"</span>"+
    '<span class="d" aria-hidden="true">'+d.getDate()+"</span></time>";
}

// Case-insensitive match on the home field's name, as a feed spells it. The
// kickoff forecast asks this of a Game's venue; TeamOS.espn asks it of ESPN's.
function isHomeField(venueName){
  return String(venueName||"").toLowerCase().indexOf(TEAM.venue.name.toLowerCase())>-1;
}
function venueTag(g){
  if(g.neutral) return '<span class="tag n"><span class="sr-only">Neutral site game. </span>'+
    '<span aria-hidden="true">NEUTRAL</span></span>';
  if(g.home)    return '<span class="tag h"><span class="sr-only">Home game. </span>'+
    '<span aria-hidden="true">HOME</span></span>';
  return '<span class="tag a"><span class="sr-only">Away game. </span>'+
    '<span aria-hidden="true">AWAY</span></span>';
}
/* ---------- hero ---------- */
// What sits above the tab panels depends on the tab. Home gets the whole
// game-day header. Game keeps the hero only while the next game is still
// upcoming - once it kicks off the Game Center below already has the score.
// Everywhere else the hero collapses to a one-line bar that taps through.
var UI={ tab:"schedule" };
function layoutForTab(){
  var home = UI.tab==="schedule";
  var g=S.next, pre=!!g && g.state!=="in";
  var full = !!g && (home || (UI.tab==="game" && pre));
  ["motto","strip","oddsHint","oddsboard","homeSnapshot"].forEach(function(id){
    var el=$(id); if(!el) return;
    if(id==="oddsboard"){ el.hidden = !home || !BOARD.open; return; }
    if(id==="homeSnapshot"){ el.hidden = !home; return; }
    el.hidden = !home || (id==="oddsHint" && !!BOARD.open);
  });
  $("hero").hidden = !full;
  $("heroMini").hidden = full || !g;
}
function paintHeroMini(g){
  var el=$("heroMini");
  var prefix=g.neutral?"vs":(g.home?"vs":"at");
  var opp=(g.oppRank?"#"+g.oppRank+" ":"")+g.oppName;
  var when, clock;
  if(g.state==="in"){
    when='<span class="live-lbl">LIVE</span> '+esc(g.detail||"");
    clock=TEAM.abbreviation+" "+(g.us||0)+"–"+(g.them||0);
  } else {
    when = g.timeSet
      ? new Date(g.date).toLocaleDateString([],{weekday:"short"})+" "+fmtTime(g.date)+(g.net?" · "+esc(g.net):"")
      : fmtDay(g.date)+" · time TBA";
    clock="";                          // filled by the countdown tick
  }
  el.innerHTML='<span class="mopp"><span class="vs">'+prefix+"</span> "+esc(opp)+"</span>"+
    '<span class="mwhen">'+when+"</span>"+
    '<span class="mclock" id="heroMiniClock">'+esc(clock)+"</span>"+
    '<span class="sr-only">. Open the Game tab</span>';
}

function paintHomeSnapshot(g){
  var games=S.games||[];
  var done=games.filter(function(x){ return x.state==="post"; });
  var wins=done.filter(function(x){ return x.won; }).length;
  var losses=done.length-wins;
  var record=$("snapshotRecord"), rank=$("snapshotRank"), next=$("snapshotNext");
  if(record) record.textContent=done.length ? wins+"–"+losses : "0–0";
  if(rank) rank.textContent=TEAM.rank ? "#"+TEAM.rank : "NR";
  if(next) next.textContent=g ? (g.home?"vs ":"at ")+g.oppName : "Season complete";
}
function paintHero(g){
  var hero=$("hero");
  hero.classList.toggle("live", g.state==="in");
  paintHomeSnapshot(g);
  paintHeroMini(g);
  layoutForTab();
  var prefix=g.neutral?"vs":(g.home?"vs":"at");
  var prefixWord=g.neutral?"versus":(g.home?"at home versus":"away at");
  $("heroOpp").innerHTML='<span class="sr-only">'+prefixWord+" </span>"+
    '<span class="vs" aria-hidden="true">'+prefix+"</span>"+
    (g.oppRank?'<span class="sr-only">number '+g.oppRank+" </span>"+
               '<span aria-hidden="true">#'+g.oppRank+" </span>":"")+esc(g.oppName);

  $("heroSpread").innerHTML = g.odds
    ? '<span class="sr-only">Betting line: </span>'+esc(g.odds.line||"")+
      (g.odds.total!=null?'<br><span class="sr-only">Over-under </span>'+
        '<span aria-hidden="true">O/U </span>'+g.odds.total:"")
    : "";

  if(g.state==="in"){
    // The countdown belongs to a game that has not started. Leaving it
    // running here let it fire once more, see that kickoff had passed and
    // overwrite the live clock with the word "Kickoff".
    if(S.tick){ clearInterval(S.tick); S.tick=null; }
    $("heroWhen").textContent="Playing now \u00B7 "+
      (g.neutral?"neutral site":(g.home?"home game":"road game"));
    $("heroLine").innerHTML="<b>"+esc(TEAM.name)+" "+(g.us||0)+", "+esc(g.oppName)+" "+(g.them||0)+"</b>";
    $("heroVenue").textContent=g.venue;
    $("heroSeries").hidden = !g.series;
    if(g.series) $("heroSeries").textContent="Playing for the "+g.series;
    $("heroClock").textContent=g.detail;
    $("heroWx").hidden=true;
    return;
  }
  $("heroWhen").textContent="Next up \u00B7 "+
    (g.neutral?"neutral site":(g.home?"home game":"road game"));
  var known=g.timeSet, line=fmtDay(g.date);
  line += known ? " at "+fmtTime(g.date)+" "+tzAbbr() : ", kickoff time not announced";
  if(g.net) line += " on <b>"+esc(g.net)+"</b>";
  else if(known) line += ", network not announced";
  $("heroLine").innerHTML=line;
  $("heroVenue").textContent=g.venue+(g.city?", "+g.city:"");
  $("heroSeries").hidden = !g.series;
  if(g.series) $("heroSeries").textContent="Playing for the "+g.series;
  paintWeather(g);

  if(S.tick){ clearInterval(S.tick); S.tick=null; }
  if(!known){ $("heroClock").textContent=""; return; }
  function tickOnce(){
    var ms=new Date(g.date)-new Date();
    var mini=$("heroMiniClock");
    if(ms<=0){
      $("heroClock").textContent="Kickoff"; if(mini) mini.textContent="Kickoff";
      clearInterval(S.tick); return;
    }
    var s=Math.floor(ms/1000), d=Math.floor(s/86400), h=Math.floor(s%86400/3600), m=Math.floor(s%3600/60);
    var full=(d?d+" days ":"")+h+" hours "+m+" minutes until kickoff";
    $("heroClock").innerHTML='<span class="sr-only">'+full+"</span>"+
      '<span aria-hidden="true">'+(d?d+"<small>d</small>":"")+h+"<small>h</small>"+m+"<small>m</small></span>";
    // the bar has room for two units: days and hours, or hours and minutes
    if(mini) mini.textContent = d ? d+"d "+h+"h" : h+"h "+m+"m";
  }
  tickOnce(); S.tick=setInterval(tickOnce,30000);
}

/* ---------- kickoff weather ---------- */
// Open-Meteo: free, no key, CORS-open. The venue is geocoded once and kept in
// localStorage; the forecast is pulled for the kickoff hour. Forecasts run 16
// days out, so a game further away than that simply shows nothing.
var GEO="https://geocoding-api.open-meteo.com/v1/search";
var METEO="https://api.open-meteo.com/v1/forecast";
var GEO_KEY="iw-geo-v1";
var US_STATES={AL:"Alabama",AK:"Alaska",AZ:"Arizona",AR:"Arkansas",CA:"California",CO:"Colorado",
  CT:"Connecticut",DE:"Delaware",DC:"District of Columbia",FL:"Florida",GA:"Georgia",HI:"Hawaii",
  ID:"Idaho",IL:"Illinois",IN:"Indiana",IA:"Iowa",KS:"Kansas",KY:"Kentucky",LA:"Louisiana",
  ME:"Maine",MD:"Maryland",MA:"Massachusetts",MI:"Michigan",MN:"Minnesota",MS:"Mississippi",
  MO:"Missouri",MT:"Montana",NE:"Nebraska",NV:"Nevada",NH:"New Hampshire",NJ:"New Jersey",
  NM:"New Mexico",NY:"New York",NC:"North Carolina",ND:"North Dakota",OH:"Ohio",OK:"Oklahoma",
  OR:"Oregon",PA:"Pennsylvania",RI:"Rhode Island",SC:"South Carolina",SD:"South Dakota",
  TN:"Tennessee",TX:"Texas",UT:"Utah",VT:"Vermont",VA:"Virginia",WA:"Washington",
  WV:"West Virginia",WI:"Wisconsin",WY:"Wyoming"};

function geoCache(){ try{ return JSON.parse(localStorage.getItem(GEO_KEY)||"{}"); }catch(e){ return {}; } }
function geoRemember(key, pt){
  try{ var c=geoCache(); c[key]=pt; localStorage.setItem(GEO_KEY, JSON.stringify(c)); }catch(e){}
}
function geoSearch(q, admin1){
  return get(GEO+"?name="+encodeURIComponent(q)+"&count=5&language=en&format=json").then(function(d){
    var hits=(d.results||[]).filter(function(r){
      return r.country_code==="US" && (!admin1 || r.admin1===admin1);
    });
    if(!hits.length) throw new Error("no geocode hit for "+q);
    return { lat:hits[0].latitude, lon:hits[0].longitude };
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
  return first.catch(function(){ return geoSearch(g.city, US_STATES[g.venueState]||null); })
    .then(function(pt){ geoRemember(key, pt); return pt; });
}
// WMO weather codes, in plain words and a glyph. The glyph is aria-hidden;
// the words carry the meaning for a screen reader.
function wmo(c){
  if(c===0)            return ["clear",         "☀️"];   // sun
  if(c===1)            return ["mostly clear",  "🌤️"];
  if(c===2)            return ["partly cloudy", "⛅"];
  if(c===3)            return ["overcast",      "☁️"];
  if(c===45||c===48)   return ["fog",           "🌫️"];
  if(c>=51&&c<=57)     return ["drizzle",       "🌦️"];
  if(c>=61&&c<=67)     return ["rain",          "🌧️"];
  if(c>=71&&c<=77)     return ["snow",          "❄️"];
  if(c>=80&&c<=82)     return ["showers",       "🌧️"];
  if(c===85||c===86)   return ["snow showers",  "🌨️"];
  if(c>=95)            return ["thunderstorms", "⛈️"];
  return ["", ""];
}
var WX={ id:null, at:0, html:"" };      // one forecast per game, refreshed half-hourly
function paintWeather(g){
  var el=$("heroWx");
  var ms=new Date(g.date)-Date.now();
  if(!g.timeSet || ms<-3*3600e3 || ms>16*86400e3){ el.hidden=true; return; }
  if(WX.id===g.id && Date.now()-WX.at<30*60e3){ el.innerHTML=WX.html; el.hidden=!WX.html; return; }
  venuePoint(g).then(function(pt){
    return get(METEO+"?latitude="+pt.lat+"&longitude="+pt.lon+
      "&hourly=temperature_2m,precipitation_probability,wind_speed_10m,weather_code"+
      "&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=auto&forecast_days=16");
  }).then(function(d){
    // hourly.time is naive local time at the venue; shift kickoff by the
    // venue's offset and round to the nearest hour to find the row
    var h=d.hourly||{}, off=(d.utc_offset_seconds||0)*1000;
    var local=new Date(new Date(g.date).getTime()+off);
    local.setUTCMinutes(Math.round(local.getUTCMinutes()/60)*60, 0, 0);
    var key=local.toISOString().slice(0,16);
    var i=(h.time||[]).indexOf(key);
    if(i<0) throw new Error("kickoff hour not in forecast");
    var t=Math.round(h.temperature_2m[i]), p=h.precipitation_probability[i], w=Math.round(h.wind_speed_10m[i]);
    var sky=wmo(h.weather_code[i]);
    var bits=[t+"°F", sky[0], (p!=null?p+"% chance of rain":""), "wind "+w+" mph"].filter(Boolean);
    WX.id=g.id; WX.at=Date.now();
    WX.html='<span class="k">Kickoff forecast</span> '+
      (sky[1]?'<span class="glyph" aria-hidden="true">'+sky[1]+"</span> ":"")+
      '<span class="sr-only">'+esc(bits.join(", "))+'</span>'+
      '<span aria-hidden="true">'+bits.map(esc).join(" · ")+"</span>";
    el.innerHTML=WX.html; el.hidden=false;
  }).catch(function(){
    WX.id=g.id; WX.at=Date.now(); WX.html="";
    el.hidden=true;                     // no forecast is better than a wrong one
  });
}

/* ---------- schedule ---------- */
function paintSchedule(games){
  var el=$("panel-schedule");
  if(!games.length){ el.innerHTML='<p class="msg">No games on the schedule yet.</p>'; return; }
  var nextId=S.next?S.next.id:null;

  // Completed games pile up and push the next one off screen by November, so
  // the older results fold away. The most recent result stays out: that is
  // the box score people come back for during the week.
  var done=games.filter(function(g){return g.state==="post";});
  var rest=games.filter(function(g){return g.state!=="post";});
  var fold = done.length>=3;
  var older = fold ? done.slice(0,-1) : [];
  var shown = fold ? done.slice(-1).concat(rest) : games;

  // This repaints on every live poll and again when the betting line arrives.
  // Carry the open fold and any expanded box score across, or the repaint
  // snaps them shut under the reader's thumb.
  var prev=el.querySelector("details.fold");
  var wasOpen=!!(prev&&prev.open);
  var detail=el.querySelector("li.gamedetail");

  var html='<div class="season-head"><div><span class="season-eyebrow">Season</span><h2>Schedule</h2></div>'+
    '<span class="season-meta">'+done.length+' played · '+rest.length+' remaining</span></div>';
  if(fold){
    html+='<details class="fold"'+(wasOpen?" open":"")+'><summary>Earlier results '+
      '<span class="count">'+older.length+" games</span></summary>"+
      '<div class="foldbody"><ul class="plain">'+older.map(row).join("")+"</ul></div></details>";
  }
  html+='<ul class="plain">';
  shown.forEach(function(g){ html+=row(g); });
  el.innerHTML=html+"</ul>";

  if(detail && DETAIL.open){
    var anchor=el.querySelector('.row.tappable[data-ev="'+DETAIL.open+'"]');
    if(anchor){
      anchor.setAttribute("aria-expanded","true");
      anchor.parentNode.insertBefore(detail, anchor.nextSibling);
    } else {
      DETAIL.open=null; DETAIL.seq++;
    }
  }
  return;

  function row(g){
    var html="", isDone=g.state==="post", isLive=g.state==="in", right, label;
    if(isDone){
      right='<span class="sr-only">'+(g.won?"Won":"Lost")+" "+(g.us||0)+" to "+(g.them||0)+". </span>"+
        '<span aria-hidden="true"><span class="score">'+(g.us||0)+"\u2013"+(g.them||0)+"</span>"+
        '<span class="wl '+(g.won?"w":"l")+'">'+(g.won?"WIN":"LOSS")+"</span></span>";
      label="Show the box score for the "+esc(g.oppName)+" game";
    } else if(isLive){
      right='<span class="sr-only">Score: '+esc(TEAM.name)+' '+(g.us||0)+", "+esc(g.oppName)+" "+(g.them||0)+
          ". "+esc(g.detail)+"</span>"+
        '<span aria-hidden="true"><span class="score">'+(g.us||0)+"\u2013"+(g.them||0)+"</span></span>";
      label="Show the live box score for the "+esc(g.oppName)+" game";
    } else {
      right = g.net
        ? '<span class="net"><span class="sr-only">Watch on </span>'+esc(g.net)+"</span>"
        : '<span class="net tbd">Network <abbr title="to be determined">TBD</abbr></span>';
      label="Show details for the "+esc(g.oppName)+" game";
    }
    var sub = (isDone||isLive) ? esc(g.venue||"")+(g.city&&g.neutral?", "+esc(g.city):"")
      : (g.timeSet?fmtTime(g.date)+" "+tzAbbr():"Kickoff time not announced")
        + (g.odds&&g.odds.line?" \u00B7 line "+esc(g.odds.line):"")
        + (g.venue?" \u00B7 "+esc(g.venue):"");
    html+='<li class="row tappable '+(isDone?"past":"")+" "+(g.id===nextId?"next":"")+
      '" data-ev="'+esc(String(g.id))+'" role="button" tabindex="0" '+
      'aria-expanded="false" aria-label="'+label+'">'+
      dateChip(g.date)+
      '<span class="mid"><span class="team">'+ venueTag(g) +
        (g.oppRank?'<span class="rk"><span class="sr-only">number </span>'+
          '<span aria-hidden="true">#</span>'+g.oppRank+"</span> ":"")+esc(g.oppName)+
      '</span><span class="sub">'+sub+"</span>"+
      (isLive?'<span class="live"><span class="lbl">LIVE</span>'+esc(g.detail)+"</span>":"")+
      (g.series?'<span class="trophy">'+
        (isDone?(g.won?"Retained ":"Lost "):"Playing for ")+esc(g.series)+"</span>":"")+
      "</span>"+
      '<span class="right">'+right+"</span></li>";
    return html;
  }
}

/* ---------- top 25 ---------- */
// The pill carries the poll name and this team's place in it, so the options
// and the one number you care about are both visible without tapping.
function pollPill(p, active){
  var mine=p.ranks.filter(function(x){ return x.mine; })[0];
  return '<button type="button" data-poll="'+p.key+'" aria-pressed="'+active+'">'+
    esc(p.label)+
    (mine ? '<span class="n">#'+mine.rank+"</span>"
        : '<span class="n">NR</span>')+
    "</button>";
}

function pollBody(p){
  var html = p.asOf ? '<p class="pollnote">'+esc(p.name)+" \u00B7 "+esc(p.asOf)+"</p>" : "";
  html+='<ol class="plain" aria-label="'+esc(p.name)+'">';
  p.ranks.forEach(function(x){
    var mv=x.previous ? x.previous-x.rank : 0;
    var move = mv>0 ? '<span class="up"><span class="sr-only">up '+mv+'</span><span aria-hidden="true">\u25B2'+mv+"</span></span>"
             : mv<0 ? '<span class="down"><span class="sr-only">down '+Math.abs(mv)+'</span><span aria-hidden="true">\u25BC'+Math.abs(mv)+"</span></span>"
             : (x.isNew ? '<span class="up"><span class="sr-only">new</span><span aria-hidden="true">NEW</span></span>' : "");
    html+='<li class="row poll-row '+(x.mine?"mine":"")+'">'+
      '<span class="date" style="width:2rem"><span class="sr-only">Rank </span>'+
      '<span class="d">'+x.rank+"</span></span>"+
      '<span class="mid"><span class="team">'+esc(x.team)+"</span></span>"+
      '<span class="right"><span class="status">'+esc(x.record)+" "+move+"</span></span></li>";
  });
  return html+"</ol>";
}

// Games is the default because that is the several-times-a-week view; the polls
// only move once or twice. The choice survives a refresh.
var AROUND={ view:"games", poll:null };

function wireAroundPills(el){
  var view=el.querySelectorAll('.seg.pills:not(.polls) button');
  view.forEach(function(b){
    b.addEventListener("click", function(){
      AROUND.view=b.dataset.view;
      view.forEach(function(x){ x.setAttribute("aria-pressed", String(x===b)); });
      var g=el.querySelector("#ar-games"), r=el.querySelector("#ar-rankings");
      if(g) g.hidden = AROUND.view!=="games";
      if(r) r.hidden = AROUND.view!=="rankings";
      say(AROUND.view==="games" ? "Showing ranked games." : "Showing rankings.");
    });
  });

  var pollBtns=el.querySelectorAll(".seg.pills.polls button");
  pollBtns.forEach(function(b){
    b.addEventListener("click", function(){
      AROUND.poll=b.dataset.poll;
      pollBtns.forEach(function(x){ x.setAttribute("aria-pressed", String(x===b)); });
      pollBtns.forEach(function(x){
        var body=el.querySelector("#poll-"+x.dataset.poll);
        if(body) body.hidden = x.dataset.poll!==AROUND.poll;
      });
      say("Showing the "+b.textContent.replace(/#\d+|NR/,"").trim()+" poll.");
    });
  });
}

// Everything about a ranked row that can change while the game is on. Shared by
// the initial render and the in-place refresh so the two can never drift.
function rankedParts(lg){
  var o=lg.odds, net=lg.net;
  function nm(side){
    var r=side.rank
      ? '<span class="rk"><span class="sr-only">number </span><span aria-hidden="true">#</span>'+side.rank+"</span> " : "";
    return r+esc(side.name);
  }
  var right;
  if(lg.state==="post"||lg.state==="in"){
    right='<span class="sr-only">Score: '+(lg.away.score||0)+" to "+(lg.home.score||0)+". "+esc(lg.detail)+"</span>"+
      '<span aria-hidden="true"><span class="score">'+(lg.away.score||0)+"\u2013"+(lg.home.score||0)+"</span>"+
      '<span class="status">'+esc(lg.detail)+"</span></span>";
  } else {
    right = net ? '<span class="net"><span class="sr-only">Watch on </span>'+esc(net)+"</span>"
                : '<span class="net tbd">Network <abbr title="to be determined">TBD</abbr></span>';
  }
  // A live LeagueGame already carries down/distance and the last play.
  var liveLine="";
  if(lg.live){
    var bits=[lg.live.downDistance, lg.live.lastPlay].filter(Boolean).join(" \u00B7 ");
    if(bits) liveLine='<span class="live"><span class="lbl">LIVE</span>'+esc(bits.slice(0,150))+"</span>";
  }
  var sub=(lg.state==="pre"
      ? (lg.timeSet?fmtTime(lg.date)+" "+tzAbbr():"Kickoff time not announced")
      : esc(lg.venue))
    +(lg.state!=="pre"&&net?" \u00B7 "+esc(net):"")
    +(o&&o.line?" \u00B7 line "+esc(o.line):"")
    +(o&&o.total!=null?" \u00B7 over-under "+o.total:"");
  return { mine:lg.mine, teams:nm(lg.away)+' <span class="pre">at</span> '+nm(lg.home),
           sub:sub, liveLine:liveLine, right:right };
}

// Patch the rows that changed instead of rebuilding the tab. Returns false if
// the set of games itself changed, in which case the caller does a full render.
function patchRanked(games){
  var list=$("panel-around").querySelector("#ar-games ul.plain");
  if(!list) return false;
  var rows=list.querySelectorAll("li.row[data-ev]");
  if(!rows.length) return false;

  var byId={};
  (games||[]).forEach(function(lg){ byId[lg.id]=lg; });

  var seen=0;
  for(var i=0;i<rows.length;i++){
    var li=rows[i], lg=byId[li.dataset.ev];
    if(!lg) return false;                       // window shifted, rebuild
    seen++;
    var pr=rankedParts(lg);

    var right=li.querySelector(".right");
    if(right && right.innerHTML!==pr.right) right.innerHTML=pr.right;

    var sub=li.querySelector(".sub");
    if(sub && sub.innerHTML!==pr.sub) sub.innerHTML=pr.sub;

    var live=li.querySelector(".live");
    if(pr.liveLine){
      if(!live){
        li.querySelector(".mid").insertAdjacentHTML("beforeend", pr.liveLine);
      } else if(live.outerHTML!==pr.liveLine){
        live.outerHTML=pr.liveLine;
      }
    } else if(live){
      live.remove();
    }
  }
  return seen===rows.length;
}

function loadAround(){
  var el=$("panel-around");
  if(el.dataset.loaded) return;
  if(!LAST_HTML[el.id]) el.innerHTML='<p class="loading">Loading this week\u2019s Top 25 games\u2026</p>';
  var gameCount=0;

  cachedThenFresh(el,
    [TeamOS.espn.rankingsUrl(), TeamOS.espn.scoreboardUrl()],
    Promise.all([
      get(TeamOS.espn.rankingsUrl()).catch(function(){return null;}),
      getScoreboard().catch(function(){return null;})
    ]),
    build, wire
  ).catch(function(){
    if(LAST_HTML[el.id]) return;         // the cached paint stands
    el.innerHTML='<p class="msg"><strong>The national picture didn\u2019t load.</strong>'+
      'ESPN returned no rankings or scoreboard data. Choose Refresh to try again.</p>';
    say("Top 25 failed to load.");
  });

  function wire(el, res, fromCache, unchanged){
    if(!unchanged) wireAroundPills(el);
    if(!fromCache) say(AROUND.view==="games"
        ? gameCount+" ranked games this week."
        : "Rankings loaded.");
  }

  // Both payloads arrive raw - from the worker's cache or the network - and
  // cross into TeamOS here. Everything below reads Poll and LeagueGame.
  function build(res){
    var polls=TeamOS.espn.rankings(res[0], TEAM_CONFIG);
    var games=TeamOS.espn.scoreboard(res[1], TEAM_CONFIG);
    var pollHtml="", gameHtml="";
    gameCount=0;

    // ---- rankings ----
    if(polls.length){
      var keys=polls.map(function(p){ return p.key; });
      if(keys.indexOf(AROUND.poll)===-1) AROUND.poll=keys[0];
      pollHtml+='<div class="seg pills polls" role="group" aria-label="Which poll">'+
        polls.map(function(p){ return pollPill(p, p.key===AROUND.poll); }).join("")+
        "</div>";
      polls.forEach(function(p){
        pollHtml+='<div id="poll-'+p.key+'"'+
          (p.key===AROUND.poll?"":" hidden")+">"+pollBody(p)+"</div>";
      });
      if(!polls.some(function(p){ return p.label==="CFP"; })){
        pollHtml+='<p class="pollnote">CFP rankings appear here automatically once the '+
              'committee starts releasing them, and will sort to the front.</p>';
      }
    }

    // ---- ranked games ----
    if(res[1]){
      var ranked=games.filter(function(lg){ return lg.home.rank||lg.away.rank; });

      gameCount=ranked.length;
      if(!ranked.length) gameHtml+='<p class="msg">No ranked teams are playing in this window.</p>';
      else gameHtml+='<ul class="plain">';

      ranked.forEach(function(lg){
        var pr=rankedParts(lg);
        gameHtml+='<li class="row '+(pr.mine?"mine":"")+'" data-ev="'+esc(lg.id)+'">'+
          dateChip(lg.date)+
          '<span class="mid"><span class="team">'+pr.teams+"</span>"+
          '<span class="sub">'+pr.sub+"</span>"+pr.liveLine+"</span>"+
          '<span class="right">'+pr.right+"</span></li>";
      });
      if(ranked.length) gameHtml+="</ul>";
    }

    // ---- pills: games by default, rankings on demand ----
    var html="";
    if(gameHtml||pollHtml){
      var view=AROUND.view;
      if(view==="rankings" && !pollHtml) view="games";
      if(view==="games" && !gameHtml)    view="rankings";
      html='<div class="around-shell">'+
        '<div class="around-head"><div><span class="around-eyebrow">Top 25</span><h2>National picture</h2></div>'+
        '<span class="around-meta">Games + polls</span></div>'+
        '<div class="seg pills around-view" role="group" aria-label="Show">'+
        '<button type="button" data-view="games" aria-pressed="'+(view==="games")+'">'+
          'Games<span class="n">'+gameCount+"</span></button>"+
        '<button type="button" data-view="rankings" aria-pressed="'+(view==="rankings")+'">'+
          "Rankings</button>"+
        "</div>"+
        '<div id="ar-games"'+(view==="games"?"":" hidden")+">"+gameHtml+"</div>"+
        '<div id="ar-rankings"'+(view==="rankings"?"":" hidden")+">"+pollHtml+"</div></div>";
      AROUND.view=view;
    }
    return html;
  }
}

/* ---------- kalshi ---------- */
function num(v){
  if(v===null||v===undefined) return null;
  var n=parseFloat(v);
  return isNaN(n)?null:n;
}
// Kalshi now returns prices in *_dollars fields as decimal strings from 0 to 1
// ("0.8200"). The older shape used integer cents in yes_bid/yes_ask/last_price.
// Read either and always return a percentage.
function price(m){
  var bd=num(m.yes_bid_dollars), ad=num(m.yes_ask_dollars);
  if(bd!==null&&ad!==null&&(bd||ad)) return (bd+ad)/2*100;
  var ld=num(m.last_price_dollars);
  if(ld) return ld*100;
  var b=num(m.yes_bid), a=num(m.yes_ask);
  if(b!==null&&a!==null&&(b||a)) return (b+a)/2;
  return num(m.last_price);
}
function prevPrice(m){
  var d=num(m.previous_price_dollars);
  if(d!==null) return d*100;
  return num(m.previous_price);
}
function teamOf(m){ return m.yes_sub_title||m.subtitle||m.title||m.ticker; }

// Kalshi lists the programs it takes a market on - the championship
// contenders - not all of FBS. A team the market does not cover has no number
// to show, and a card reading "No market" every week is worse than no card:
// it takes up the same space to say nothing. So this is a CAPABILITY, declared
// the same way snapshots are (decision 0008): a team either has Kalshi markets
// or it does not, and a team that does not never sees the surface.
//
// A config declaring no kalshi source used to throw here, which is what a
// second team without one would have hit the moment it became selectable.
function hasKalshi(){
  var k = TEAM_CONFIG.sources && TEAM_CONFIG.sources.kalshi;
  return !!(k && (k.tickerSuffix || k.namePattern));
}

// Whether a Kalshi market is this team's: by ticker suffix, then by name.
function teamMarket(ticker, name){
  var k = TEAM_CONFIG.sources && TEAM_CONFIG.sources.kalshi;
  if(!k) return false;
  return (k.tickerSuffix && String(ticker||"").endsWith(k.tickerSuffix)) ||
         (k.namePattern  && k.namePattern.test(String(name||""))) || false;
}
function isTeamMarket(m){ return teamMarket(m.ticker, teamOf(m)); }

// Take the whole surface away: the two cards, the hint that explains tapping
// them, and the board they open. Called when the team declares no markets, and
// again if the feed turns out to carry none for them.
function dropOddsSurface(){
  ["strip","oddsHint","oddsboard"].forEach(function(id){
    var el=$(id); if(el && el.parentNode) el.parentNode.removeChild(el);
  });
}

function kalshiHelp(){
  return '<p class="msg"><strong>Kalshi didn\u2019t answer.</strong>'+
    'Kalshi sends no CORS header, and the public relays this page falls back on are '+
    'down or rate-limited right now. Choose Refresh in a minute, or deploy worker.js '+
    'to Cloudflare Workers for a relay of your own that will not do this. '+
    'The live board is at '+
    '<a href="https://kalshi.com/markets/kxncaaf/ncaaf-championship" target="_blank" rel="noopener">'+
    'kalshi.com, national championship winner<span class="sr-only"> (opens in a new tab)</span></a>.</p>';
}

// The odds board now lives under the persistent strip rather than in its own
// tab, and covers both markets. One expander, so only one board is open.
var BOARD={ open:null, seq:0 };

function oddsBar(m, top, rank){
  var mine=teamMarket(m.ticker, m.name);
  return '<li class="obar '+(mine?"mine":"")+'">'+
    '<span class="orank" aria-hidden="true">'+rank+"</span>"+
    '<span class="nm">'+esc(m.name)+"</span>"+
    '<span class="track" aria-hidden="true"><span class="fill" style="width:'+
      Math.round(m.p/top*100)+'%"></span></span>'+
    '<span class="pc">'+m.p.toFixed(0)+'<span aria-hidden="true">%</span>'+
    '<span class="sr-only"> percent</span></span></li>';
}

function renderBoard(ms, heading){
  ms.forEach(function(m,i){ m.rank=i+1; });
  var top=ms[0].p||1;
  function isMine(m){ return teamMarket(m.ticker, m.name); }
  var lead=ms.slice(0,10), tail=ms.slice(10);
  if(!lead.some(isMine)){
    var mine=tail.filter(isMine)[0];
    if(mine){ lead.push(mine); tail=tail.filter(function(m){return m!==mine;}); }
  }
  var html='<h2 class="sec">'+esc(heading)+"</h2>"+
    '<p class="foot" style="padding-top:.5rem">Midpoint of the current bid and ask on Kalshi, '+
    'in cents, which reads directly as a probability. Traded prices, not a model.</p>'+
    '<ol class="plain">'+lead.map(function(m){return oddsBar(m,top,m.rank);}).join("")+"</ol>";
  if(tail.length){
    html+='<details class="fold"><summary>The rest of the field '+
      '<span class="count">'+tail.length+" teams</span></summary>"+
      '<div class="foldbody"><ol class="plain">'+
      tail.map(function(m){return oddsBar(m,top,m.rank);}).join("")+"</ol></div></details>";
  }
  return html;
}

function loadBoard(kind){
  if(!hasKalshi()) return;
  var el=$("oddsboard");
  var ev  = kind==="playoff" ? PLAYOFF_EVENT : TITLE_EVENT;
  var head= kind==="playoff" ? "Kalshi: who makes the playoff"
                             : "Kalshi: who wins the national championship";
  // Tag each request. A response only paints if it is still the one the user
  // is waiting on, so a fast tap between the two cards cannot cross the wires.
  var token=++BOARD.seq;
  el.hidden=false;
  el.innerHTML='<p class="loading">Loading the board\u2026</p>';
  kalshi("/markets?event_ticker="+ev+"&limit=200&status=open").then(function(d){
    if(token!==BOARD.seq || BOARD.open!==kind) return;
    var ms=(d.markets||[]).map(function(m){
      return { name:teamOf(m), ticker:m.ticker, p:price(m) };
    }).filter(function(m){ return m.p!=null; }).sort(function(a,b){ return b.p-a.p; });
    if(!ms.length) throw new Error("empty");
    el.innerHTML=renderBoard(ms, head);
    say(head+" loaded, "+ms.length+" teams.");
  }).catch(function(){
    if(token!==BOARD.seq || BOARD.open!==kind) return;
    el.innerHTML=kalshiHelp();
    say("Odds board could not be loaded.");
  });
}

function closeBoard(){
  BOARD.open=null; BOARD.seq++;      // invalidate anything still in flight
  $("oddsboard").hidden=true;
  $("oddsboard").innerHTML="";
  ["btnTitle","btnPlayoff"].forEach(function(id){ $(id).setAttribute("aria-expanded","false"); });
}

function toggleBoard(kind){
  if(BOARD.open===kind){ closeBoard(); return; }
  BOARD.open=kind;
  $("btnTitle").setAttribute("aria-expanded", String(kind==="title"));
  $("btnPlayoff").setAttribute("aria-expanded", String(kind==="playoff"));
  var hint=$("oddsHint"); if(hint) hint.hidden=true;
  loadBoard(kind);
}

function loadStrip(){
  // A team Kalshi takes no market on gets no odds surface at all.
  if(!hasKalshi()){ dropOddsSurface(); return; }

  // Two separate event queries, each the same shape as the title board that we
  // know works. The team is picked out of each payload by ticker or by name.
  var found = 0, asked = 0;
  [{ ev: TITLE_EVENT,   cell: "mTitle"   },
   { ev: PLAYOFF_EVENT, cell: "mPlayoff" }].forEach(function(q){
    kalshi("/markets?event_ticker="+q.ev+"&limit=200&status=open").then(function(d){
      var m = (d.markets||[]).filter(isTeamMarket)[0];
      var p = m ? price(m) : null;
      // The feed answered and this team is not in it: they are not a program
      // Kalshi prices. Once BOTH queries have said so, the surface goes -
      // a team that is simply not a contender should not carry an empty card.
      if(p==null){
        if(++asked === 2 && found === 0) dropOddsSurface();
        else $(q.cell).textContent = "No market";
        return;
      }
      found++; asked++;
      var pp = prevPrice(m);
      var mv = (pp!==null) ? p-pp : null;
      var move = (mv==null||Math.abs(mv)<0.5) ? ""
        : mv>0 ? '<em class="up"><span class="sr-only">, up '+Math.abs(mv).toFixed(0)+'</span><span aria-hidden="true">\u25B2'+Math.abs(mv).toFixed(0)+"</span></em>"
               : '<em class="down"><span class="sr-only">, down '+Math.abs(mv).toFixed(0)+'</span><span aria-hidden="true">\u25BC'+Math.abs(mv).toFixed(0)+"</span></em>";
      $(q.cell).className="v";        // keep the class, just drop "pending"
      $(q.cell).innerHTML=p.toFixed(0)+'<span aria-hidden="true">%</span><span class="sr-only"> percent</span>'+move;
    }).catch(function(){
      $(q.cell).textContent="Unavailable";
    });
  });
  loadSparklines();
}

// The Action appends the team's price to its odds-history snapshot whenever
// it moves. Two points or more and each card gets the season drawn under
// the number - the shape of the market, not just today's reading. A team
// with no history declared, or a file that belongs to another team, gets
// the number alone.
function sparkline(vals){
  var n=vals.length, W=100, H=24, PAD=2;
  var lo=Math.min.apply(null,vals), hi=Math.max.apply(null,vals);
  var span=(hi-lo)||1;
  var pts=vals.map(function(v,i){
    var x=n>1 ? (i/(n-1))*W : W;
    var y=H-PAD-((v-lo)/span)*(H-PAD*2);
    return x.toFixed(1)+","+y.toFixed(1);
  });
  return '<svg class="spark" viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none" aria-hidden="true">'+
    '<path d="M0,'+H+' L'+pts.join(" L")+' L'+W+','+H+' Z"/>'+
    '<polyline points="'+pts.join(" ")+'"/></svg>';
}
function loadSparklines(){
  if(!hasKalshi()) return;
  var snap=TeamOS.snapshots.get(TEAM_CONFIG,"oddsHistory");
  if(!snap) return;
  get(snap.file+"?t="+Date.now()).then(function(d){
    if(!TeamOS.snapshots.owned(TEAM,d)) return;
    var pts=(d.points||[]).filter(function(p){ return p&&p.t; });
    [["title","btnTitle"],["playoff","btnPlayoff"]].forEach(function(pair){
      var vals=pts.map(function(p){ return p[pair[0]]; }).filter(function(v){ return typeof v==="number"; });
      var cell=$(pair[1]);
      var old=cell.querySelector(".spark, .sparknote"); if(old) old.remove();
      if(vals.length<2) return;
      var lo=Math.min.apply(null,vals), hi=Math.max.apply(null,vals);
      var first=pts.filter(function(p){ return typeof p[pair[0]]==="number"; })[0];
      cell.insertAdjacentHTML("beforeend", sparkline(vals)+
        '<span class="sr-only sparknote">Season range '+lo.toFixed(0)+' to '+hi.toFixed(0)+
        ' percent since '+esc(first.t.slice(0,10))+'.</span>');
    });
  }).catch(function(){ /* no history yet; the number alone is fine */ });
}

/* ---------- depth chart and availability ---------- */
// The depth chart is a team capability: the team's config declares its
// snapshot (written by the GitHub Action from the team's own source) or it
// has none, and then the tab is the roster plus a plain statement of that.
// The snapshot is same-origin, so no CORS involved.
function loadDepth(){
  var el=$("panel-depth");
  if(el.dataset.loaded) return;
  var snap=TeamOS.snapshots.get(TEAM_CONFIG,"depth");
  if(!snap){
    // No depth-chart source for this team: the roster still stands on
    // its own. Nothing to fetch, so the state is final for this load.
    unavailable('<strong>No depth chart.</strong>'+esc(TEAM.name)+
      ' has no depth chart source in this Suite yet. The full roster is above.');
    el.dataset.loaded="1";
    return;
  }
  if(!LAST_HTML[el.id]) el.innerHTML='<p class="loading">Loading the two-deep…</p>';
  var outCount=0;

  cachedThenFresh(el, [snap.file], get(snap.file+"?t="+Date.now()).then(function(d){ return [d]; }),
    build, wire
  ).catch(function(){
    if(LAST_HTML[el.id]) return;         // the cached paint stands
    unavailable('<strong>No depth chart yet.</strong>'+
      'The scheduled job writes '+esc(snap.file)+' from '+esc(snap.label||"the source")+'’s weekly post. '+
      'If this stays empty, check the Actions log.');
  });

  // The roster fold with a message under it, for every state that has no
  // two-deep to show.
  function unavailable(msg){
    el.innerHTML='<div class="depth-shell"><div class="depth-head"><div>'+
      '<span class="depth-eyebrow">Personnel</span><h2>Roster</h2></div>'+
      '<span class="depth-meta">Team roster</span></div>'+
      '<details class="fold" id="rosterFold"><summary>Full roster'+
      '<span class="count">every player</span></summary>'+
      '<div class="foldbody" id="rosterBody"></div></details>'+
      '<p class="msg">'+msg+'</p></div>';
    wireRosterFold(el);      // the roster is independent of the depth chart
  }

  function wire(el, res, fromCache, unchanged){
    if(!unchanged){ wireRosterFold(el); loadHistory(); }
    if(!fromCache) say("Depth chart loaded. "+outCount+" players out.");
  }

  function build(res){
    var d=res[0]; if(!TeamOS.snapshots.owned(TEAM,d)) return "";   // not ours: nothing to show
    var av=d.availability||{out:[],questionable:[]};
    var unavailableCount=(av.out||[]).length+(av.questionable||[]).length;
    var html='<div class="depth-shell"><div class="depth-head"><div>'+
      '<span class="depth-eyebrow">Personnel</span><h2>Depth + availability</h2></div>'+
      '<span class="depth-meta">'+(unavailableCount ? unavailableCount+' listed' : 'No players listed')+'</span></div>';
    outCount=av.out.length;
    var mmdd=function(iso){ return esc((iso||"").replace(/^\d{4}-/,"").replace("-","/")); };
    var chartLabel=function(x){ return esc((x&&x.game)||mmdd(x&&x.date)||"Current"); };
    var srcLink=function(url, label){
      return '<a href="'+esc(url||"#")+'" target="_blank" rel="noopener">'+esc(label)+
        '<span class="sr-only"> (opens in a new tab)</span></a>';
    };

    // ---- 1. the two-deep, offense open, the rest folded ----
    var groupNames=Object.keys(d.groups||{});
    if(groupNames.length){
      html+='<h2 class="sec">Depth chart</h2>'+
        '<p class="asof">'+chartLabel(d)+', from '+srcLink(d.source, d.title||snap.label||"the source")+
        '. '+esc(TEAM.name)+' publishes a new two-deep most Tuesdays.</p>';
    }
    groupNames.forEach(function(label, gi){
      var body="", posCount=0;
      var rows=d.groups[label], i=0;
      while(i<rows.length){
        var pos=rows[i].pos, block=[];
        while(i<rows.length&&rows[i].pos===pos){ block.push(rows[i]); i++; }
        var contested=block.filter(function(r){return r.depth===1;}).length>1;
        posCount++;
        body+='<div class="depth-pos"><b>'+esc(pos)+"</b>"+
          (contested?'<span class="battle">BATTLE</span>':"")+"</div>";
        body+='<ul class="ladder">';
        block.forEach(function(r){
          body+='<li class="d'+Math.min(r.depth,4)+'">'+
            '<span class="jersey">'+esc(r.no)+"</span>"+
            (r["or"]?'<span class="ortag">OR</span>':"")+
            '<span class="nm">'+esc(r.name)+"</span>"+
            '<span class="cl">'+esc(r.cl||"")+"</span></li>";
        });
        body+="</ul>";
      }
      // Ninety depth rows in one scroll is unusable on a phone.
      html+='<details class="fold"'+(gi===0?" open":"")+'><summary>'+esc(label)+
        ' <span class="count">'+posCount+" positions</span></summary>"+
        '<div class="foldbody">'+body+"</div></details>";
    });

    // ---- 2. job battles, folded ----
    if((d.battles||[]).length){
      html+='<details class="fold"><summary>Jobs still open'+
        '<span class="count">'+d.battles.length+'</span></summary><div class="foldbody"><ul class="plain avail">';
      d.battles.forEach(function(b){
        html+="<li><span class=\"who\"><span class=\"pos\">"+esc(b.pos)+"</span>"+
          esc(b.names.join("  /  "))+"</span></li>";
      });
      html+="</ul></div></details>";
    }

    // ---- 3. the injury report: this week's list, then week by week ----
    html+='<h2 class="sec">Injury report</h2>';
    if(av.reported===false){
      html+='<p class="asof">No official availability report is attached to the current '+chartLabel(d)+
        ' materials yet. No injury status is inferred from that absence.</p>';
    } else if(av.carried_from){
      html+='<p class="asof">No official availability report was published with the current chart, so this is '+
        esc(TEAM.name)+'\u2019s '+mmdd(av.carried_from)+' report from '+
        srcLink(av.carried_source,snap.label||"the source")+'.</p>';
    } else {
      html+='<p class="asof">'+esc(TEAM.name)+'\u2019s official availability report from '+
        srcLink(av.source||d.source,av.label||snap.label||"the official athletics site")+'.</p>';
    }
    if(av.out.length||av.questionable.length){
      [["Out",av.out],["Questionable",av.questionable]].forEach(function(pair){
        if(!pair[1].length) return;
        html+='<h3 class="depth-pos"><b>'+pair[0]+" ("+pair[1].length+')</b></h3><ul class="plain avail">';
        pair[1].forEach(function(p){
          html+="<li><span class=\"who\">"+
            (p.pos?'<span class="pos">'+esc(p.pos)+"</span>":"")+esc(p.name)+"</span>"+
            (p.detail?'<span class="part">'+esc(p.detail)+"</span>":"")+
            (p.weeks>1?'<span class="weeks">wk '+p.weeks+"</span>":"")+
            ((p.newer||[]).length
              ? '<span class="newer"><b>Newer reporting</b> \u00B7 '+
                p.newer.map(function(n){
                  return '<a href="'+esc(n.link)+'" target="_blank" rel="noopener">'+
                    esc(n.source)+", "+esc((n.published||"").slice(5,10).replace("-","/"))+
                    '<span class="sr-only"> — '+esc(n.title)+' (opens in a new tab)</span></a>';
                }).join(" · ")+
                ". This page doesn\u2019t pick a winner \u2014 read it and decide.</span>"
              : "")+"</li>";
        });
        html+="</ul>";
      });
    } else if(av.reported===false) {
      html+='<p class="msg">No official availability report was published with this depth chart.</p>';
    } else {
      html+='<p class="msg">Nobody is listed out or questionable.</p>';
    }
    // week-by-week history lands here once the history snapshot arrives
    html+='<div id="depthHistory"></div>';

    if(!groupNames.length && !av.out.length) return html+'<p class="msg">The depth chart file is empty.</p></div>';

    // ---- 4. the full roster ----
    html+='<h2 class="sec">Roster</h2>';
    html+='<details class="fold" id="rosterFold"><summary>Full roster'+
      '<span class="count">every player</span></summary>'+
      '<div class="foldbody" id="rosterBody"></div></details>';
    return html+"</div>";
  }
}

// Every depth chart the team's source has posted this season, newest first,
// each collapsed to its diff against the week before. Only for a team whose
// depth snapshot declares a history file.
function loadHistory(){
  var snap=TeamOS.snapshots.get(TEAM_CONFIG,"depth");
  if(!snap || !snap.history) return;
  get(snap.history+"?t="+Date.now()).then(function(d){
    if(!TeamOS.snapshots.owned(TEAM,d)) return;
    var snaps=(d.snapshots||[]).slice().reverse();
    var slot=$("panel-depth").querySelector("#depthHistory");
    if(!slot || snaps.length<2) return;
    var html='<details class="fold" open><summary>Week by week '+
      '<span class="count">'+snaps.length+" charts</span></summary><div class=\"foldbody\">";
    snaps.forEach(function(s,i){
      var av=s.availability||{}, ch=s.changes||[];
      var when=s.game || ((s.date||"").slice(5).replace("-","/")) || "Current";
      var outN=(av.out||[]).length, qN=(av.questionable||[]).length;
      var status = av.reported===false ? "official two-deep"
        : av.carried_from
          ? "no report published; "+esc(av.carried_from.slice(5).replace("-","/"))+" carried forward"
          : outN+" out"+(qN?", "+qN+" questionable":"");
      var moves = i===snaps.length-1 ? "first chart of the season"
        : (ch.length ? ch.length+(ch.length===1?" change":" changes") : "no changes");
      html+='<details class="week"'+(i===0?" open":"")+'><summary><span class="wd">'+esc(mmdd)+"</span>"+
        '<span class="ws">'+status+" · "+esc(moves)+"</span></summary>";
      html+= ch.length ? '<ul class="chg">'+ch.map(function(c){
               return "<li>"+esc(c)+"</li>"; }).join("")+"</ul>"
             : '<p class="chg" style="color:var(--dim)">Nothing moved on the two-deep.</p>';
      html+='<p class="weeksrc">Source: <a href="'+esc(s.source||"#")+
        '" target="_blank" rel="noopener">'+esc(s.title||snap.label||"the source")+
        '<span class="sr-only"> (opens in a new tab)</span></a></p>';
      html+="</details>";
    });
    html+="</div></details>";
    slot.innerHTML=html;                 // one slot, so never two copies
  }).catch(function(){ /* history is a bonus; silence is fine */ });
}

/* ---------- game view: live line, box score, leaders ---------- */
// Everything here renders a GameDetail (docs/03_DOMAIN_MODEL.md), which
// TeamOS.espn builds from ESPN's summary endpoint. Sections the feed did not
// supply arrive as null and drop out rather than blanking the tab.

// box: whether the full box score fold is open, remembered across the team
// toggle and the 25-second live repaint.
var G = { live:false, id:null, side:null, box:false, pending:false };

function numOf(v){ var n=parseFloat(String(v).replace(/[^0-9.\-]/g,"")); return isNaN(n)?null:n; }
// "5-13" is a made/attempted pair, not the number 5. Compare the rate.
// "28:24" is a clock, not 2824. Compare the seconds.

// Which game to show: one in progress, else the most recent finished, else next up.
// How long the Game tab keeps showing a finished game before swapping to the
// next one. ESPN gives kickoff, not the final whistle, so add four hours for
// regulation plus overtime and a long review.
//
// Roll over at 3am local rather than midnight: that keeps the box score up for
// the whole evening without leaving Saturday's game sitting there all Sunday.
// The six-hour floor covers a late West Coast kickoff that ends after 2am,
// where the next 3am would otherwise be twenty minutes away.
var FINAL_ROLLOVER_HOUR = 3;
var FINAL_MIN_HOLD_MS   = 6*60*60*1000;

function justFinished(g){
  var end=new Date(g.date).getTime() + 4*60*60*1000;
  if(isNaN(end)) return false;
  var cutoff=new Date(end);
  cutoff.setHours(FINAL_ROLLOVER_HOUR,0,0,0);
  if(cutoff.getTime() <= end) cutoff.setDate(cutoff.getDate()+1);   // next 3am
  var floor=end + FINAL_MIN_HOLD_MS;
  return Date.now() < Math.max(cutoff.getTime(), floor);
}

function gameToShow(){
  if(!S.games||!S.games.length) return null;
  // A game in progress always wins. Otherwise show the NEXT one, so the moment
  // Saturday's game goes final the tab swaps to next week. Past games are read
  // from the Schedule tab. Only with nothing upcoming does it fall back to the
  // last result.
  var live=S.games.filter(function(g){return g.state==="in";})[0];
  if(live) return live;

  var done=S.games.filter(function(g){return g.state==="post";});
  var last=done.length ? done[done.length-1] : null;

  // Hold a finished game until 3am the following morning (see justFinished).
  // The half hour after the whistle is when the box score matters most, so
  // swapping the instant ESPN marks it final takes it away at the worst
  // moment. Computed from the game's own end rather than its date, so a late
  // kickoff that runs past midnight still gets its full evening.
  if(last && justFinished(last)) return last;

  var next=S.games.filter(function(g){return g.state==="pre";})[0];
  if(next) return next;
  return last || S.games[0];
}

function loadGame(force){
  var el=$("panel-game");
  var g=gameToShow();
  if(!g){
    // The schedule has not landed yet. Mark it so the schedule handler can
    // come back and fill this in, instead of leaving the tab stuck forever.
    el.innerHTML='<p class="loading">Waiting on the schedule…</p>';
    G.pending=true;
    return;
  }
  G.pending=false;
  if(g.id!==G.id){ G.id=g.id; G.side=null; }   // new game, forget the last toggle
  if(el.dataset.loaded===g.id && !force) return;
  if(!el.dataset.loaded) el.innerHTML='<p class="loading">Loading the game…</p>';

  // g.state is the reconciled state, so a game the scoreboard says is in
  // play is fetched fresh even if the schedule payload still lags.
  summaryFor(g.id, g.state==="in" || G.live).then(function(raw){
    var gd=TeamOS.espn.gameDetail(raw, TEAM, TEAM_CONFIG);
    var shape=gameShape(gd);
    if(el.dataset.loaded===g.id && el.dataset.shape===shape){
      patchGame(gd);                    // scores, clock and last play only
    } else {
      el.innerHTML=renderGame(gd);
      wireLeaderSwitch(el);
      previewIfPre(gd, el);
      el.dataset.shape=shape;
    }
    el.dataset.loaded=g.id;
    schedulePoll(gd);
  }).catch(function(){
    if(el.dataset.loaded) return;              // keep the last good render
    el.innerHTML='<p class="msg"><strong>Couldn\u2019t load the game.</strong>'+
      'ESPN didn\u2019t return a summary for this one. Choose Refresh to try again.</p>';
  });
}

// The Game tab used to keep its own 25-second timer, which is how it could
// be three hours ahead of the hero: it polled the summary endpoint while
// nothing refreshed the schedule. There is now one live loop (autoTick), and
// this only records whether the ball is in play so that loop knows to include
// the Game tab.
function schedulePoll(gd){
  G.live = gd.state==="in";
}
document.addEventListener("visibilitychange", function(){
  if(!document.hidden && !$("panel-game").hidden) loadGame(true);
});

function wireLeaderSwitch(el){
  var btns=el.querySelectorAll(".seg button");
  if(!btns.length) return;
  btns.forEach(function(b){
    b.addEventListener("click", function(){
      G.side=b.dataset.side;
      btns.forEach(function(x){ x.setAttribute("aria-pressed", String(x===b)); });
      var a=el.querySelector(".ldr-away"), hm=el.querySelector(".ldr-home");
      if(a)  a.hidden  = G.side!=="away";
      if(hm) hm.hidden = G.side!=="home";
      // carry the fold state across to the side being revealed
      el.querySelectorAll("details.fold.box").forEach(function(f){ f.open=G.box; });
    });
  });
  el.querySelectorAll("details.fold.box").forEach(function(f){
    f.addEventListener("toggle", function(){ G.box=f.open; });
  });
}

// If none of these change, nothing structural moved and the view can be patched
// in place. A new score, a new quarter or a stat appearing forces a rebuild.
function gameShape(gd){
  var ls=gd.linescore, ld=gd.leaders;
  return [ (gd.scoring||[]).length,
           ls ? Math.max(ls.away.length, ls.home.length) : 0,
           gd.teamStats ? 2 : 0,
           ld ? (ld.away.length?1:0)+(ld.home.length?1:0) : 0,
           gd.state ].join("|");
}

function patchGame(gd){
  var el=$("panel-game");
  var home=gd.home, away=gd.away;
  function put(node, html){ if(node && node.innerHTML!==html) node.innerHTML=html; }

  [["away",away,home],["home",home,away]].forEach(function(t){
    var box=el.querySelector('.gscore[data-side="'+t[0]+'"]');
    if(!box) return;
    var pts=t[1].score!=null?t[1].score:"";
    put(box.querySelector(".pts"), esc(String(pts)));
    box.classList.toggle("lead", numOf(pts)>numOf(t[2].score));
  });

  var statusEl=el.querySelector("#gStatus span:not(.dot)");
  put(statusEl, esc(gd.detail));

  var lp=gd.lastPlay, lpEl=el.querySelector("#gLastPlay");
  if(lpEl && lp){
    put(lpEl.querySelector(".t"), esc(lp.text));
    var meta=esc([lp.possession,lp.downDistance].filter(Boolean).join(" \u00B7 "));
    var ddEl=lpEl.querySelector(".dd");
    if(meta && !ddEl) lpEl.insertAdjacentHTML("beforeend",'<div class="dd">'+meta+"</div>");
    else if(meta) put(ddEl, meta);
    else if(ddEl) ddEl.remove();
  }

  var wpEl=el.querySelector("#gWinProb");
  if(wpEl && gd.winProb){
    var hp=gd.winProb.homePct, favHome=hp>=0.5, spans=wpEl.querySelectorAll(".v");
    if(spans.length>1){
      put(spans[0], Math.round((favHome?hp:1-hp)*100)+"%");
      put(spans[1], esc((favHome?home:away).abbreviation));
    }
  }

  if(gd.teamStats){
    var byLabel={};
    gd.teamStats.forEach(function(r){ byLabel[r.label]=r; });
    el.querySelectorAll(".statrow[data-stat]").forEach(function(row){
      var r=byLabel[row.getAttribute("data-stat")]; if(!r) return;
      var spans=row.querySelectorAll(".v"); if(spans.length<2) return;
      put(spans[0], esc(r.away==null?"\u2013":r.away));
      put(spans[1], esc(r.home==null?"\u2013":r.home));
      spans[0].classList.toggle("win", r.better==="away");
      spans[1].classList.toggle("win", r.better==="home");
    });
  }

  var ls=gd.linescore, trs=el.querySelectorAll(".linescore tbody tr");
  if(ls && trs.length===2){
    [[ls.away,away],[ls.home,home]].forEach(function(pair,ri){
      var tds=trs[ri].querySelectorAll("td");
      for(var q=0;q<pair[0].length && q+1<tds.length-1;q++){
        put(tds[q+1], esc(pair[0][q]));
      }
      if(tds.length) put(tds[tds.length-1], esc(String(pair[1].score!=null?pair[1].score:"")));
    });
  }
}

// inline=true renders the same view for an expanded Schedule row: identical
// markup minus the element ids, which exist only so the live poller can patch
// the Game tab in place. Duplicating them would break that.
function renderGame(gd, inline){
  var home=gd.home, away=gd.away;
  var live=gd.state==="in", done=gd.state==="post";
  var html='<div class="game-shell '+(live?"is-live":(done?"is-final":"is-pregame"))+'">';


  // ---- score line ----
  function side(c){
    var other = c===home ? away : home;
    var pts=c.score!=null?c.score:"";
    var lead = done||live ? (numOf(pts)>numOf(other.score) ? " lead":"") : "";
    var sideKey=(c===home)?"home":"away";
    return '<div class="gscore'+lead+'" data-side="'+sideKey+'">'+
      '<div class="side"><div class="nm">'+(c.mine?'<span class="rk">'+esc(TEAM.abbreviation)+'</span> ':"")+esc(c.name)+"</div>"+
      (c.record?'<div class="rec">'+esc(c.record)+"</div>":"")+"</div>"+
      '<div class="pts">'+esc(String(pts))+"</div></div>";
  }
  html+=side(away)+side(home);

  // Pre-game: a slot the matchup preview fills in once both teams' season
  // stats arrive. Present in both modes, so a tapped future game on the
  // Schedule gets the same preview as the Game tab.
  if(!live && !done) html+='<div class="gpreview"'+(inline?"":' id="gPreview"')+"></div>";
  html+='<div class="gstatus"'+(inline?"":' id="gStatus"')+">"+(live?'<span class="dot" aria-hidden="true"></span>':"")+
    "<span>"+esc(gd.detail)+"</span></div>";

  // Each block below is built into `html` and then cut into a named section,
  // so the Game tab and the expanded Schedule row can order them differently
  // without duplicating the markup.
  var sec={};
  function cut(name){ sec[name]=html; html=""; }
  cut("head");

  // ---- last play and down/distance ----
  var lp=gd.lastPlay;
  if(lp && (live||done)){
    var meta=[lp.possession,lp.downDistance].filter(Boolean).join(" \u00B7 ");
    html+='<div class="lastplay"'+(inline?"":' id="gLastPlay"')+'><div class="k">'+(live?"LAST PLAY":"FINAL PLAY")+"</div>"+
      '<div class="t">'+esc(lp.text)+"</div>"+
      (meta?'<div class="dd">'+esc(meta)+"</div>":"")+
      "</div>";
  }
  cut("play");

  // ---- win probability ----
  if(live && gd.winProb){
    var hp=gd.winProb.homePct, favIsHome=hp>=0.5;
    var fav=favIsHome?home:away;
    var pct=Math.round((favIsHome?hp:1-hp)*100);
    html+='<div class="statrow"'+(inline?"":' id="gWinProb"')+'><span class="v">'+pct+'%</span>'+
      '<span class="lbl">win probability</span>'+
      '<span class="v r">'+esc(fav.abbreviation)+"</span></div>";
  }
  cut("winprob");

  // ---- linescore by quarter ----
  var ls=gd.linescore;
  if(ls){
    var qn=Math.max(ls.away.length,ls.home.length);
    html+='<h2 class="sec">By quarter</h2><table class="linescore"><thead><tr><th></th>';
    for(var q=0;q<qn;q++) html+="<th>"+(q<4?(q+1):"OT"+(q-3))+"</th>";
    html+="<th>T</th></tr></thead><tbody>";
    [[away,ls.away],[home,ls.home]].forEach(function(pair){
      html+="<tr><td>"+esc(pair[0].abbreviation)+"</td>";
      for(var q=0;q<qn;q++){
        var v=pair[1][q];
        html+="<td>"+(v!=null?esc(v):"\u2013")+"</td>";
      }
      html+='<td class="tot">'+esc(String(pair[0].score!=null?pair[0].score:""))+"</td></tr>";
    });
    html+="</tbody></table>";
  }
  cut("quarters");

  // ---- team stats, away on the left to match the score line ----
  if(gd.teamStats){
    var body="";
    gd.teamStats.forEach(function(r){
      var aw=r.better==="away"?" win":"", hw=r.better==="home"?" win":"";
      body+='<div class="statrow" data-stat="'+esc(r.label)+'"><span class="v'+aw+'">'+esc(r.away==null?"\u2013":r.away)+"</span>"+
        '<span class="lbl">'+r.label+"</span>"+
        '<span class="v r'+hw+'">'+esc(r.home==null?"\u2013":r.home)+"</span></div>";
    });
    var head=function(c,right){
      return '<span class="v'+(right?" r":"")+(c.mine?" mine":"")+'">'+esc(c.abbreviation)+"</span>";
    };
    html+='<h2 class="sec">Team stats</h2>'+
      '<div class="statrow head">'+head(away,false)+
      '<span class="lbl">AWAY \u00B7 HOME</span>'+head(home,true)+"</div>"+
      body;
  }
  cut("stats");

  // ---- leaders and box score, one team at a time ----
  function leaderRows(list){
    var out="";
    list.forEach(function(l){
      out+='<div class="ldr"><span class="cat">'+esc(l.category)+"</span>"+
        '<span class="who"><span class="nm">'+esc(l.name)+"</span>"+
        '<span class="line">'+esc(l.line)+"</span></span></div>";
    });
    return out;
  }
  var ld=gd.leaders, bx=gd.box;
  var ra=ld?leaderRows(ld.away):"", rh=ld?leaderRows(ld.home):"";
  var boxA=bx?boxTables(bx.away):"", boxH=bx?boxTables(bx.home):"";
  if(ra||rh||boxA||boxH){
    // default to whichever side is ours, and remember the choice across the
    // 25-second refresh
    if(!G.side) G.side = home.mine ? "home" : "away";
    var ab=function(c){ return esc(c.abbreviation); };
    var toggle='<div class="seg" role="group" aria-label="Show which team">'+
        '<button type="button" data-side="away" aria-pressed="'+(G.side==="away")+'">'+
          ab(away)+'<span class="sub">away</span></button>'+
        '<button type="button" data-side="home" aria-pressed="'+(G.side==="home")+'">'+
          ab(home)+'<span class="sub">home</span></button>'+
      "</div>";
    // Fold for the full box score. The open state is shared by both sides, so
    // flipping the team toggle does not shut the tables you just opened.
    var fold=function(tables, c){
      if(!tables) return "";
      return '<details class="fold box"'+(G.box?" open":"")+'><summary>Full box score'+
        '<span class="count">'+ab(c)+'</span></summary><div class="foldbody">'+tables+"</div></details>";
    };
    if(inline && (boxA||boxH)){
      // Expanded from the Schedule: the box score IS the point of tapping, so it
      // leads and the tables are open. The leaders are its first rows anyway.
      // Nothing at all before kickoff - the matchup preview covers that.
      html+='<h2 class="sec">Box score</h2>'+toggle+
        '<div class="ldr-away"'+(G.side==="away"?"":" hidden")+">"+
          (boxA||'<p class="msg">ESPN has no player stats for '+ab(away)+" yet.</p>")+"</div>"+
        '<div class="ldr-home"'+(G.side==="home"?"":" hidden")+">"+
          (boxH||'<p class="msg">ESPN has no player stats for '+ab(home)+" yet.</p>")+"</div>";
    } else if(!inline){
      html+='<h2 class="sec">Leaders and box score</h2>'+toggle+
        '<div class="ldr-away" id="ldr-away"'+(G.side==="away"?"":" hidden")+">"+ra+fold(boxA,away)+"</div>"+
        '<div class="ldr-home" id="ldr-home"'+(G.side==="home"?"":" hidden")+">"+rh+fold(boxH,home)+"</div>";
    }
  }
  cut("people");

  // ---- scoring summary ----
  var sp=gd.scoring||[];
  if(sp.length){
    var sbody="";
    var awayAb=away.abbreviation, homeAb=home.abbreviation;
    sp.forEach(function(p){
      var a=p.awayScore, hs=p.homeScore;
      var an=typeof a==="number"?a:parseInt(a,10);
      var hn=typeof hs==="number"?hs:parseInt(hs,10);
      var cls=function(mine,other){
        if(isNaN(mine)||isNaN(other)) return "";
        if(mine===other) return "tie";
        return mine>other ? "ahead" : "";
      };
      // colour alone must not carry the meaning, so say it in words too
      var srlead = (isNaN(an)||isNaN(hn)) ? ""
        : an===hn ? " Tied "+an+" all."
        : " "+(an>hn?awayAb:homeAb)+" leads "+Math.max(an,hn)+" to "+Math.min(an,hn)+".";

      sbody+='<div class="scorply '+(p.mine?"byus":"bythem")+'">'+
        '<span class="qc">'+esc((p.period?"Q"+p.period:"")+(p.clock?" "+p.clock:""))+"</span>"+
        '<span class="tm"><span class="sr-only">Scored by </span>'+esc(p.teamAbbr)+"</span>"+
        '<span class="tx">'+esc(p.text)+"</span>"+
        '<span class="sc"><span class="'+cls(an,hn)+'">'+esc(String(a==null?"":a))+"</span>"+
          "\u2013"+
          '<span class="'+cls(hn,an)+'">'+esc(String(hs==null?"":hs))+"</span>"+
          '<span class="sr-only">.'+esc(srlead)+"</span></span>"+
        "</div>";
    });
    html+='<details class="fold"><summary>Scoring summary <span class="count">'+sp.length+
      " scores</span></summary><div class=\"foldbody\">"+
      '<div class="scorply" style="border-bottom:2px solid var(--ink-3);color:var(--dim);font-size:.72rem;letter-spacing:.07em">'+
        '<span class="qc">TIME</span><span class="tm">TEAM</span>'+
        '<span class="tx">PLAY</span>'+
        '<span class="sc">'+esc(awayAb)+"\u2013"+esc(homeAb)+"</span></div>"+
      sbody+"</div></details>";
  }
  cut("scoring");

  var stamp='<p class="stamp">'+(live
      ? "Updating every 25 seconds while the game is live."
      : "Final data from ESPN. Live updates resume at kickoff.")+"</p>";

  if(inline){
    // Score, then straight to the box score. Everything else follows, and a
    // Close at the foot so a long expansion can be dismissed without
    // scrolling back up to the row.
    return '<div class="game-inline">'+sec.head+sec.people+sec.quarters+sec.stats+sec.play+sec.scoring+
      '<button type="button" class="more" data-close-detail>Close</button>'+stamp+'</div>';
  }
  return html+sec.head+sec.play+sec.winprob+sec.quarters+sec.stats+sec.people+sec.scoring+stamp+"</div>";
}

/* ---------- full roster ---------- */
// ESPN's roster endpoint is CORS-open, so this stays client side like the
// schedule. Fetched only when the fold is opened, then kept for the session.
var ROSTER={ data:null, group:"all", q:"", loading:false };

// One row of the roster, from a Player (docs/03_DOMAIN_MODEL.md).
function playerRow(p){
  var home=[p.hometown.city,p.hometown.state].filter(Boolean).join(", ");
  var meta=[ [p.height,p.weight].filter(Boolean).join(" \u00B7 "), home ].filter(Boolean).join("  \u2014  ");
  return '<li class="plr"><span class="no">'+esc(p.jersey)+"</span>"+
    '<span class="pos">'+esc(p.position)+"</span>"+
    '<span class="who">'+esc(p.name)+
      (meta?'<span class="meta">'+esc(meta)+"</span>":"")+"</span>"+
    '<span class="cl">'+esc(p.classYear.slice(0,3))+"</span></li>";
}

function renderRoster(){
  var groups=ROSTER.data||[];
  var all=[]; groups.forEach(function(g){ all=all.concat(g.players); });
  if(!all.length) return '<p class="msg">ESPN returned no roster for this team.</p>';

  var html="";
  if(groups.length>1){
    if(["all"].concat(groups.map(function(g){return g.key;})).indexOf(ROSTER.group)===-1)
      ROSTER.group="all";
    html+='<div class="seg pills roster" role="group" aria-label="Roster group">'+
      '<button type="button" data-grp="all" aria-pressed="'+(ROSTER.group==="all")+'">'+
        'All<span class="n">'+all.length+"</span></button>"+
      groups.map(function(g){
        return '<button type="button" data-grp="'+esc(g.key)+'" aria-pressed="'+
          (ROSTER.group===g.key)+'">'+esc(g.label)+
          '<span class="n">'+g.players.length+"</span></button>";
      }).join("")+"</div>";
  }

  // A hundred-odd players is too many to scan. One box filters by anything
  // you might know about a player: name, number, position or hometown.
  html+='<label class="filter"><span class="sr-only">Filter the roster</span>'+
    '<input type="search" id="rosterQ" autocomplete="off" spellcheck="false" '+
    'placeholder="Name, number, position or hometown" value="'+esc(ROSTER.q||"")+'"></label>';
  html+='<div id="rosterList">'+rosterList()+"</div>";
  return html;
}

// Text of the roster list for the current group and filter. Re-rendered on
// its own as you type, so the search box keeps focus.
function rosterHaystack(p){
  return [p.name, p.jersey, p.position, p.positionName, p.hometown.city, p.hometown.state]
    .join(" ").toLowerCase();
}
function rosterList(){
  var groups=ROSTER.data||[], all=[];
  groups.forEach(function(g){ all=all.concat(g.players); });
  var show = ROSTER.group==="all" ? all
    : (groups.filter(function(g){return g.key===ROSTER.group;})[0]||{players:[]}).players;
  var q=(ROSTER.q||"").trim().toLowerCase();
  if(q) show=show.filter(function(p){ return rosterHaystack(p).indexOf(q)>-1; });
  show=show.slice().sort(function(x,y){
    var a=parseInt(x.jersey,10), b=parseInt(y.jersey,10);
    if(isNaN(a)&&isNaN(b)) return 0;
    if(isNaN(a)) return 1;
    if(isNaN(b)) return -1;
    return a-b;
  });
  var html = show.length
    ? '<ul class="plain">'+show.map(playerRow).join("")+"</ul>"
    : '<p class="msg">No player matches \u201C'+esc(ROSTER.q)+'\u201D.</p>';
  html+='<p class="stamp">'+show.length+' player'+(show.length===1?"":"s")+
    (q?" matching":"")+' \u00B7 numbers as listed by ESPN. '+
    'Official roster at <a href="'+esc(TEAM_CONFIG.links.roster.url)+'" '+
    'target="_blank" rel="noopener">'+esc(TEAM_CONFIG.links.roster.label)+
    '<span class="sr-only"> (opens in a new tab)</span></a>.</p>';
  return html;
}

// Only hit the network when the fold is actually opened.
function wireRosterFold(el){
  var fold=el.querySelector("#rosterFold");
  if(!fold) return;
  fold.addEventListener("toggle", function(){
    if(fold.open) loadRoster(el.querySelector("#rosterBody"));
  });
}

function wireRosterPills(box){
  var btns=box.querySelectorAll(".seg.pills.roster button");
  btns.forEach(function(b){
    b.addEventListener("click", function(){
      ROSTER.group=b.dataset.grp;
      box.innerHTML=renderRoster();
      wireRosterPills(box);
    });
  });
  var q=box.querySelector("#rosterQ");
  if(q) q.addEventListener("input", function(){
    ROSTER.q=q.value;
    box.querySelector("#rosterList").innerHTML=rosterList();
  });
}

function loadRoster(box){
  if(ROSTER.data){ box.innerHTML=renderRoster(); wireRosterPills(box); return; }
  if(ROSTER.loading) return;
  ROSTER.loading=true;
  box.innerHTML='<p class="loading">Loading the roster\u2026</p>';
  get(TeamOS.espn.rosterUrl(TEAM_CONFIG)).then(function(d){
    ROSTER.loading=false;
    ROSTER.data=TeamOS.espn.roster(d);
    box.innerHTML=renderRoster();
    wireRosterPills(box);
    var n=0; ROSTER.data.forEach(function(g){ n+=g.players.length; });
    say("Roster loaded, "+n+" players.");
  }).catch(function(){
    ROSTER.loading=false;
    box.innerHTML='<p class="msg"><strong>Couldn\u2019t load the roster.</strong>'+
      'ESPN didn\u2019t return one. The official list is at '+
      '<a href="'+esc(TEAM_CONFIG.links.roster.url)+'" target="_blank" '+
      'rel="noopener">'+esc(TEAM_CONFIG.links.roster.label)+'</a>.</p>';
  });
}

// The full per-player lines for one side of a GameDetail, one table per
// category. Each category carries its own column labels.
function boxTables(tables){
  var html="";
  tables.forEach(function(cat){
    html+='<h3 class="boxcat">'+esc(cat.title)+"</h3>"+
      '<div class="boxwrap"><table class="boxtable"><thead><tr><th scope="col">Player</th>'+
      cat.labels.map(function(l){ return '<th scope="col">'+esc(l)+"</th>"; }).join("")+
      "</tr></thead><tbody>";
    cat.rows.forEach(function(r){
      html+='<tr><th scope="row">'+(r.jersey?'<span class="jn">'+esc(r.jersey)+"</span> ":"")+
        esc(r.name)+"</th>"+
        r.stats.map(function(v){ return "<td>"+esc(v)+"</td>"; }).join("")+
        "</tr>";
    });
    html+="</tbody></table></div>";
  });
  return html;
}

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
// nothing is fetched. For the opponent it costs one request for their
// schedule, cached for the session like the stats themselves. A failure
// resolves to null rather than rejecting: a missing row is better than a
// missing card.
var PTS_ALLOWED={};               // side key -> number|null

function pointsAllowedFor(key, ourGames){
  if(!key) return Promise.resolve(null);
  if(PTS_ALLOWED.hasOwnProperty(key)) return Promise.resolve(PTS_ALLOWED[key]);
  var p = ourGames
    ? Promise.resolve(TeamOS.season.pointsAllowedPerGame(ourGames))
    : get(TeamOS.espn.teamScheduleUrl(key)).then(function(d){
        return TeamOS.season.pointsAllowedPerGame(TeamOS.espn.scoreLines(d, key));
      }).catch(function(){ return null; });
  return p.then(function(v){ PTS_ALLOWED[key]=v; return v; });
}

// The one row no provider fills. Copies rather than writes, because the rows
// themselves are cached in SEASON_STATS and shared between renders.
function withPointsAllowed(rows, perGame){
  if(perGame==null) return rows;
  return rows.map(function(r){
    if(r.key!=="pointsAllowed") return r;
    return { key:r.key, label:r.label, value:perGame.toFixed(1),
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

function renderPreview(awayStats, homeStats, awayAb, homeAb){
  var body="";
  awayStats.forEach(function(a, i){
    var b=homeStats[i];
    if(a.value==null && b.value==null) return;
    // A lower rank number is better whatever the stat measures, so ranks can be
    // compared directly without knowing which direction is good.
    var aw = (a.rank&&b.rank) ? (a.rank<b.rank) : null;
    function cell(s,right){
      if(s.value==null) return '<span class="v'+(right?" r":"")+'">\u2013</span>';
      var rk=s.rankText||(s.rank?"#"+s.rank:"");
      return '<span class="v'+(right?" r":"")+
        ((aw===null)?"":((right?!aw:aw)?" win":""))+'">'+esc(s.value)+
        (rk?'<span class="rk2">'+esc(rk)+"</span>":"")+"</span>";
    }
    body+='<div class="statrow prev">'+cell(a,false)+
      '<span class="lbl">'+esc(a.label)+"</span>"+cell(b,true)+"</div>";
  });
  if(!body) return "";
  return '<h2 class="sec">Matchup</h2>'+
    '<div class="statrow head"><span class="v">'+esc(awayAb)+"</span>"+
    '<span class="lbl">SEASON \u00B7 NATIONAL RANK</span>'+
    '<span class="v r">'+esc(homeAb)+"</span></div>"+body+
    '<p class="stamp">Per-game figures for the season to date, with the national rank where one is published.</p>';
}

// Kick off the preview for a GameDetail that renderGame just painted into
// `root`, if the game has not started.
function previewIfPre(gd, root){
  if(gd.state!=="pre") return;
  loadPreview(gd.away, gd.home, root);
}

// Pre-game only: once there is a box score, that is the more useful thing.
function loadPreview(away, home, root){
  var slot=(root||$("panel-game")).querySelector(".gpreview");
  if(!slot) return;
  slot.innerHTML='<p class="loading">Loading the matchup…</p>';
  Promise.all([
    teamSeasonStats(away.key), teamSeasonStats(home.key),
    pointsAllowedFor(away.key, away.mine ? S.games : null),
    pointsAllowedFor(home.key, home.mine ? S.games : null)
  ]).then(function(r){
    var html=renderPreview(withPointsAllowed(r[0], r[2]),
                           withPointsAllowed(r[1], r[3]),
                           away.abbreviation, home.abbreviation);
    slot.innerHTML=html;
  }).catch(function(){
    slot.innerHTML="";            // no ranks available, show nothing rather than a broken block
  });
}

/* ---------- news ---------- */
// Two sources merged: ESPN's own feed, which arrives as NewsItem[] from
// TeamOS.espn, and - for a team that declares one - the beat-writer RSS
// that the GitHub Action fetches server-side and commits as the team's
// beat-news snapshot. RSS sites send no CORS header, so the browser can
// never read them directly. A team without beat feeds gets ESPN alone.

// news.json is this project's own snapshot (docs/03_DOMAIN_MODEL.md, NewsItem):
// the same fields, with the date as ISO text and never an image.
function beatItem(i){
  var t=i.published ? Date.parse(i.published) : NaN;
  return { title:i.title, link:i.link, image:"", source:i.source, publishedAt: isNaN(t) ? null : t };
}
function loadNews(){
  var el=$("panel-news");
  if(el.dataset.loaded) return;
  if(!LAST_HTML[el.id]) el.innerHTML='<p class="loading">Loading '+esc(TEAM.name)+' news…</p>';
  var count=0, sources=0;

  var espnUrl=TeamOS.espn.newsUrl(TEAM_CONFIG);
  var beatSnap=TeamOS.snapshots.get(TEAM_CONFIG,"beatNews");
  cachedThenFresh(el, [espnUrl, beatSnap ? beatSnap.file : null],
    Promise.all([get(espnUrl).catch(function(){ return null; }),
                 beatSnap ? get(beatSnap.file+"?t="+Date.now()).catch(function(){ return null; }) : Promise.resolve(null)]),
    build, wire
  ).catch(function(){
    if(LAST_HTML[el.id]) return;         // the cached paint stands
    el.innerHTML='<p class="msg"><strong>No stories right now.</strong>'+
      (beatSnap ? 'Neither ESPN nor the beat feeds returned anything.' : 'ESPN returned nothing.')+
      ' Choose Refresh to try again.</p>';
  });

  function wire(el, res, fromCache, unchanged){
    if(!unchanged){
      var btn=el.querySelector("#moreNews");
      if(btn) btn.addEventListener("click",function(){
        el.querySelectorAll("li.extra").forEach(function(li){ li.hidden=false; });
        btn.remove();
        say("Showing all "+count+" stories.");
      });
    }
    if(!fromCache) say("News loaded, "+count+" stories from "+sources+" sources.");
  }

  // Both payloads arrive raw and become NewsItem[] here; everything below
  // reads NewsItem.
  function build(res){
    var espn=TeamOS.espn.news(res[0]);
    var beat=(TeamOS.snapshots.owned(TEAM,res[1]) ? (res[1].items||[]) : []).map(beatItem);
    var all=espn.concat(beat).filter(function(a){ return a.link&&a.title; });

    // same story from two outlets: keep the first
    var seen={}, list=[];
    all.forEach(function(a){
      var k=a.title.toLowerCase().replace(/[^a-z0-9]/g,"").slice(0,60);
      if(seen[k]) return;
      seen[k]=1; list.push(a);
    });
    list.sort(function(a,b){ return (b.publishedAt||0)-(a.publishedAt||0); });
    if(!list.length) return "";
    count=list.length;
    var srcs={}; list.forEach(function(a){ srcs[a.source]=1; });
    sources=Object.keys(srcs).length;

    var FIRST=15;
    var html='<div class="news-shell"><div class="news-head"><div>'+
      '<span class="news-eyebrow">News</span><h2>Latest stories</h2></div>'+
      '<span class="news-meta">'+sources+' source'+(sources===1?"":"s")+'</span></div>'+
      '<h2 class="sr-only">Latest '+esc(TEAM.name)+' stories</h2><ul class="plain">';
    list.forEach(function(a,idx){
      var when=a.publishedAt ? new Date(a.publishedAt).toLocaleDateString([],{month:"long",day:"numeric"}) : "";
      html+='<li'+(idx>=FIRST?' class="extra" hidden':"")+'><a class="art'+(a.source==="ESPN"?"":" beat")+'" href="'+esc(a.link)+
        '" target="_blank" rel="noopener">'+
        (a.image?'<img src="'+esc(a.image)+'" alt="" loading="lazy">':"")+
        '<span><span class="hl">'+esc(a.title)+"</span>"+
        '<span class="meta"><span class="src">'+esc(a.source)+"</span>"+
        (when?" · "+when:"")+
        '<span class="sr-only"> (opens in a new tab)</span></span></span></a></li>';
    });
    html+="</ul>";
    if(list.length>FIRST){
      html+='<button type="button" class="more" id="moreNews">Show '+
        (list.length-FIRST)+" more stories</button>";
    }
    return html+"</div>";
  }
}

/* ---------- tabs: full keyboard support per ARIA practices ---------- */
var tabs=[].slice.call(document.querySelectorAll('[role="tab"]'));
function selectTab(tab, focusIt){
  tabs.forEach(function(t){
    var on = t===tab;
    t.setAttribute("aria-selected",String(on));
    t.tabIndex = on ? 0 : -1;
    $(t.getAttribute("aria-controls")).hidden = !on;
  });
  if(focusIt) tab.focus();
  // Carrying the previous tab's scroll position into a different list is
  // disorienting. Jump, do not animate — smooth scrolling here feels laggy.
  window.scrollTo(0,0);
  var name=tab.id.replace("tab-","");
  UI.tab=name; layoutForTab();
  // Force a refresh on entry: the dataset guard would otherwise leave the
  // tab showing whatever it held the last time it was open.
  if(name==="game")   loadGame(true);
  if(name==="around") loadAround();
  if(name==="depth")  loadDepth();
  if(name==="news")   loadNews();
}
tabs.forEach(function(tab,i){
  tab.addEventListener("click",function(){ selectTab(tab,false); });
  tab.addEventListener("keydown",function(e){
    var n=null;
    if(e.key==="ArrowRight") n=tabs[(i+1)%tabs.length];
    else if(e.key==="ArrowLeft") n=tabs[(i-1+tabs.length)%tabs.length];
    else if(e.key==="Home") n=tabs[0];
    else if(e.key==="End") n=tabs[tabs.length-1];
    if(n){ e.preventDefault(); selectTab(n,true); }
  });
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

  // The scoreboard goes first: loadAround reuses it, and it decides whether
  // the live poller should run. It is 95KB on the wire, which is why it is
  // here and not in load() competing with the schedule for first paint.
  var jobs=[function(){ getScoreboard().catch(function(){}); },
            loadAround, loadDepth, loadNews, function(){ loadGame(); }, prefetchSummaries];
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
  return get(TeamOS.espn.scoreboardUrl()).then(function(d){
    SB.data=d; SB.at=Date.now();
    SB.games=TeamOS.espn.scoreboard(d, TEAM_CONFIG);
    AUTO.liveElsewhere = SB.games.some(function(lg){ return lg.state==="in"; });
    startAuto();
    return d;
  });
}

function somethingLive(){
  if(S.games && S.games.some(function(g){ return g.state==="in"; })) return true;
  return AUTO.liveElsewhere;
}

function startAuto(){
  var on=somethingLive();
  var btn=$("refresh");
  if(btn) btn.classList.toggle("polling", on);
  // #tab-game.live:after is styled but nothing switches it on
  var gt=$("tab-game");
  if(gt) gt.classList.toggle("live", on);
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
    if(!$("panel-game").hidden && G.live) loadGame(true);
  }).catch(function(){});

  if(!$("panel-around").hidden){
    // Looking at the list. Patch the rows that moved rather than rebuilding the
    // tab, so scroll position, open folds and the pill selection all survive.
    getScoreboard(30000).then(function(){
      if($("panel-around").hidden) return;
      if(!patchRanked(SB.games)){
        var y=window.scrollY;
        $("panel-around").dataset.loaded="";
        loadAround();
        setTimeout(function(){
          if(!$("panel-around").hidden) window.scrollTo(0,y);
        }, 60);
      }
    }).catch(function(){});
  } else if(Date.now()-SB.at > 300000){
    // not looking, but re-check every five minutes so polling stands down
    // once the last game ends
    getScoreboard(0).catch(function(){});
  }
}

// Coming back to the app should feel current immediately, not in 30 seconds.
document.addEventListener("visibilitychange", function(){
  if(document.hidden) return;
  if(somethingLive()) autoTick();
});

function load(){
  // only an empty page shows the placeholder; a refresh keeps what is there
  if(!S.games) $("panel-schedule").innerHTML='<p class="loading">Loading the schedule…</p>';
  S.stale=null;                        // a fresh load starts optimistic

  get(TeamOS.espn.teamUrl(TEAM_CONFIG)).then(function(d){
    var st=TeamOS.espn.teamStatus(d);
    if(st.rank){
      $("rank").innerHTML='<span class="sr-only">Ranked number </span>'+
        '<span aria-hidden="true">#</span>'+st.rank;
      $("rank").hidden=false;
    }
    if(st.record!=null) $("rec").innerHTML='<span class="sr-only">Record </span>'+esc(st.record);
  }).catch(function(){});

  refreshSchedule(true);
  loadStrip();
}

// What the service worker last stored for a URL, if anything. Lets the page
// paint from the previous visit's data before the network answers.
function cachedJSON(url){
  if(typeof caches==="undefined") return Promise.reject(0);
  return caches.match(url).then(function(r){ if(!r) throw 0; return r.json(); });
}

// Paint a tab from the worker's cached copies of its sources the instant it
// is opened, then again from the network. If the fresh HTML comes out
// identical - it usually does between visits - the second paint is skipped,
// so nothing flickers and a fold the reader has already opened stays open.
//   urls   the cache keys, same order and shape as the network results
//   fresh  a Promise of the network results
//   build  results -> HTML string, or "" when there is nothing to show
//   wire   (el, results, fromCache) -> attach handlers, announce, etc.
var LAST_HTML={};
function cachedThenFresh(el, urls, fresh, build, wire){
  Promise.all(urls.map(function(u){
    return u ? cachedJSON(u).catch(function(){ return null; }) : Promise.resolve(null);
  })).then(function(res){
    if(el.dataset.loaded || !res.some(Boolean)) return;
    var html=build(res);
    if(!html || LAST_HTML[el.id]===html) return;
    el.innerHTML=html; LAST_HTML[el.id]=html;
    wire(el, res, true);
  }).catch(function(){});

  return fresh.then(function(res){
    var html=build(res);
    if(!html) throw new Error("nothing to show");
    if(LAST_HTML[el.id]!==html){
      el.innerHTML=html; LAST_HTML[el.id]=html;
      wire(el, res, false);
    } else {
      wire(el, res, false, true);        // same content: announce only
    }
    el.dataset.loaded="1";
    return res;
  });
}

// Pulled out of load() so the auto-refresh can reuse it without re-fetching
// team info, odds or anything else that does not change during a game.
function refreshSchedule(first){
  var url=TeamOS.espn.scheduleUrl(TEAM_CONFIG);
  var announce=first && !S.games;      // only the very first paint is news

  // Everything that turns a schedule payload into pixels. Runs twice on a
  // repeat visit: once from the worker's cache the instant the page opens,
  // then again when ESPN answers. paintSchedule keeps any open box score.
  function apply(d){
    var games=TeamOS.espn.schedule(d, TEAM, TEAM_CONFIG);
    // The scoreboard is the league's live feed and the schedule is a season
    // list; where they describe the same game, the scoreboard is what is
    // happening now. Reconciling here means every surface fed by S.games -
    // hero, hero-mini, schedule rows, and which game the Game tab shows -
    // reads one state (docs/decisions/0010-one-live-state-per-game.md).
    games=TeamOS.live.reconcileAll(games, SB.games);
    S.games=games;
    var live=games.filter(function(g){return g.state==="in";})[0];
    var up=games.filter(function(g){return g.state==="pre";})[0];
    S.next=live||up||null;
    if(S.next) paintHero(S.next); else { paintHomeSnapshot(null); layoutForTab(); }   // no next game: nothing above the tabs
    paintSchedule(games);
    return games;
  }
  var painted=false;
  if(first){
    cachedJSON(url).then(function(d){
      if(S.games) return;              // the network beat the cache; nothing to do
      apply(d); painted=true;
    }).catch(function(){});
  }

  return get(url).then(function(d){
    var games=apply(d);
    if(G.pending) loadGame(true);        // the Game tab was waiting on this
    if(announce) say("Schedule loaded, "+games.length+" games."+
      (S.next?" Next game is "+(S.next.home?"versus ":"at ")+S.next.oppName+".":""));
    startAuto();
    if(first){
      if(window.requestIdleCallback) window.requestIdleCallback(warmTabs, {timeout:2500});
      else setTimeout(warmTabs, 900);
    }

    if(S.next && !S.next.odds && S.oddsTried!==S.next.id){
      S.oddsTried=S.next.id;          // ESPN often has no line for these; ask once
      summaryFor(S.next.id).then(function(sm){
        var o=TeamOS.espn.gameOdds(sm); if(!o) return;
        S.next.odds=o;
        paintHero(S.next); paintSchedule(S.games);
      }).catch(function(){});
    }

    $("foot").textContent="Schedule, scores, betting lines and news come from ESPN\u2019s public feed. "+
      "Championship odds come from Kalshi. Last updated "+
      new Date().toLocaleTimeString([],{hour:"numeric",minute:"2-digit"})+".";
    paintStale();                      // overrides the line above when offline
  }).catch(function(){
    if(!first || painted) return;      // a failed poll, or a cached paint, keeps what is there
    $("panel-schedule").innerHTML='<p class="msg"><strong>The schedule didn\u2019t load.</strong>'+
      'If you are viewing this inside another app\u2019s file preview, that preview is most likely '+
      'blocking outside requests. Open the file in Safari or Chrome directly and it should fill in. '+
      'Otherwise, check your connection and choose Refresh.</p>';
    say("Schedule failed to load.");
  });
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

  var stored = (isFinal && !live && typeof caches!=="undefined")
    ? caches.open(SUM_CACHE).then(function(c){ return c.match(url); })
        .then(function(r){ if(!r) throw 0; return r.json(); })
    : Promise.reject(0);

  var p = stored.catch(function(){
    return fetch(url,{cache:"no-store"}).then(function(r){
      if(!r.ok) throw new Error("HTTP "+r.status);
      if(isFinal && typeof caches!=="undefined"){
        var copy=r.clone();
        caches.open(SUM_CACHE).then(function(c){ return c.put(url, copy); }).catch(function(){});
      }
      return r.json();
    });
  }).then(function(d){
    SUM.mem[id]={ d:d, at:Date.now(), final:isFinal };
    return d;
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

// Tapping a game on the Schedule expands it in place. It does not navigate —
// the Game tab is for the upcoming game, past results belong here.
var DETAIL={ open:null, seq:0 };

// Opening and closing never move the page: the detail simply appears under
// the row you tapped, where your eye already is.
function closeDetail(){
  var d=$("panel-schedule").querySelector("li.gamedetail");
  if(d) d.remove();
  var open=$("panel-schedule").querySelector('.row.tappable[aria-expanded="true"]');
  if(open) open.setAttribute("aria-expanded","false");
  DETAIL.open=null;
  DETAIL.seq++;                       // invalidate anything still in flight
  return open;
}

function openGame(id){
  if(!id) return;
  var panel=$("panel-schedule");
  var li=panel.querySelector('.row.tappable[data-ev="'+id+'"]');
  if(!li) return;
  if(DETAIL.open===id){ closeDetail(); return; }   // second tap closes
  closeDetail();
  DETAIL.open=id;
  li.setAttribute("aria-expanded","true");

  var slot=document.createElement("li");
  slot.className="gamedetail";
  slot.innerHTML='<p class="loading">Loading the game\u2026</p>';
  li.parentNode.insertBefore(slot, li.nextSibling);

  var token=++DETAIL.seq;
  G.side=null;                        // default the team toggle to our side
  summaryFor(id).then(function(raw){
    if(token!==DETAIL.seq || DETAIL.open!==id) return;
    var gd=TeamOS.espn.gameDetail(raw, TEAM, TEAM_CONFIG);
    slot.innerHTML=renderGame(gd, true);
    wireLeaderSwitch(slot);
    previewIfPre(gd, slot);
  }).catch(function(){
    if(token!==DETAIL.seq || DETAIL.open!==id) return;
    slot.innerHTML='<p class="msg"><strong>Couldn\u2019t load that game.</strong>'+
      "ESPN didn\u2019t return a summary for it.</p>";
  });
}
$("panel-schedule").addEventListener("click", function(e){
  if(e.target.closest("[data-close-detail]")){ closeDetail(); return; }
  var li=e.target.closest(".row.tappable[data-ev]");
  if(li) openGame(li.getAttribute("data-ev"));
});
// The finger is down before the tap completes; start the fetch then. On a
// prefetched or final game this is a no-op.
$("panel-schedule").addEventListener("pointerdown", function(e){
  var li=e.target.closest(".row.tappable[data-ev]");
  if(li) summaryFor(li.getAttribute("data-ev")).catch(function(){});
}, {passive:true});
$("panel-schedule").addEventListener("keydown", function(e){
  if(e.key!=="Enter" && e.key!==" ") return;
  var li=e.target.closest(".row.tappable[data-ev]");
  if(!li) return;
  e.preventDefault();
  openGame(li.getAttribute("data-ev"));
});

$("btnTitle").addEventListener("click", function(){ toggleBoard("title"); });
$("btnPlayoff").addEventListener("click", function(){ toggleBoard("playoff"); });

// Everything the Refresh button does. Also run on its own when the page has
// been out of sight for a while, so a tab left open all afternoon is current
// the moment it is looked at again. Tabs skip identical repaints, so a
// silent refresh that finds nothing new changes nothing on screen.
function refreshAll(silent){
  ["around","depth","news"].forEach(function(n){ $("panel-"+n).dataset.loaded=""; });
  if(BOARD.open) loadBoard(BOARD.open);
  $("panel-game").dataset.loaded="";
  if(!silent) say("Refreshing…");
  load();
  var cur=tabs.filter(function(t){return t.getAttribute("aria-selected")==="true";})[0];
  var name=cur.id.replace("tab-","");
  if(name==="game")   loadGame(true);
  if(name==="around") loadAround();
  if(name==="depth")  loadDepth();
  if(name==="news")   loadNews();
  FRESH.at=Date.now();
}
$("refresh").addEventListener("click", function(){ refreshAll(false); });
$("heroMini").addEventListener("click", function(){ selectTab($("tab-game"), false); });

// How long data may sit before a silent refresh: on return to a tab that was
// hidden this long, and on a timer while it stays visible.
var FRESH={ at:Date.now(), hiddenAt:null, afterHidden:10*60e3, whileVisible:30*60e3 };
document.addEventListener("visibilitychange", function(){
  if(document.hidden){ FRESH.hiddenAt=Date.now(); return; }
  var away=FRESH.hiddenAt ? Date.now()-FRESH.hiddenAt : 0;
  FRESH.hiddenAt=null;
  if(away>FRESH.afterHidden || Date.now()-FRESH.at>FRESH.whileVisible) refreshAll(true);
});
setInterval(function(){
  if(document.hidden) return;
  if(somethingLive()) return;                      // the live poller is already refreshing

  // Kickoff has come and gone but our snapshot still calls the game upcoming.
  // Nothing else would notice for up to half an hour: startAuto() only runs
  // after a fetch, and without a fetch there is no fetch. Look once.
  if(S.next && S.next.state==="pre" && S.next.timeSet &&
     Date.now() >= new Date(S.next.date).getTime()){
    refreshSchedule(false);
    return;
  }
  // Reading the Top 25 while the league starts playing: the same blind spot,
  // one endpoint over.
  if(!$("panel-around").hidden && Date.now()-SB.at > 60000){
    getScoreboard(0).then(function(){
      if(!$("panel-around").hidden && SB.games && !patchRanked(SB.games)){
        $("panel-around").dataset.loaded=""; loadAround();
      }
    }).catch(function(){});
    return;
  }
  if(Date.now()-FRESH.at>FRESH.whileVisible) refreshAll(true);
}, 60e3);

load();
})();
