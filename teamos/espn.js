/* TeamOS - the ESPN adapter.

   Everything the platform knows about how ESPN shapes a college football
   team's schedule, roster, record and news, a game's summary, and the
   league's scoreboard and rankings, lives here and nowhere else. The
   adapter is a pure transformation: it is handed ESPN's JSON (and, for the
   schedule, the Team and the team config) and it returns domain objects. It
   never fetches, never touches the page, never reads application state.
   app.js owns the network, the cache-first paint, staleness and polling;
   this file owns the meaning of ESPN's keys.

     schedule JSON + Team + TEAM_CONFIG  ->  TeamOS.espn.schedule()    ->  Game[]
     roster JSON                         ->  TeamOS.espn.roster()      ->  RosterGroup[] of Player
     team JSON                           ->  TeamOS.espn.teamStatus()  ->  { rank, record }
     scoreboard JSON + TEAM_CONFIG       ->  TeamOS.espn.scoreboard()  ->  LeagueGame[]
     rankings JSON + TEAM_CONFIG         ->  TeamOS.espn.rankings()    ->  Poll[]
     summary JSON + Team + TEAM_CONFIG   ->  TeamOS.espn.gameDetail()  ->  GameDetail
     season stats JSON                   ->  TeamOS.espn.seasonStats() ->  SeasonStat[]
     news JSON                           ->  TeamOS.espn.news()        ->  NewsItem[]

   All of these are documented in docs/03_DOMAIN_MODEL.md. Game is written
   from the team's point of view - us/them, home/away, won - because that is
   what a team's Suite renders; LeagueGame is a neutral home/away game for
   league-wide views, and the two are deliberately distinct. Nothing in any
   of them names ESPN. */

var TeamOS = TeamOS || {};

TeamOS.espn = (function () {
  "use strict";

  var SITE = "https://site.api.espn.com/apis/site/v2/sports/football/college-football";

  // ESPN flags a placeholder kickoff with timeValid:false and files it at
  // midnight Eastern, which is 04:00Z or 05:00Z - so a midnight-UTC check
  // misses it and would also misread a real 8pm ET kickoff. Trust the flag
  // when it is there; the heuristic is only a fallback for feeds that omit it.
  function timeIsSet(iso, comp){
    if(comp && typeof comp.timeValid==="boolean") return comp.timeValid;
    var d=new Date(iso); return !(d.getUTCHours()===0&&d.getUTCMinutes()===0);
  }

  // ESPN files broadcasts inconsistently: TV networks usually land in
  // competition.broadcasts, but streaming-only outlets such as Peacock often
  // appear only in geoBroadcasts, or as a bare `broadcast` string. Read every
  // shape and merge them, rather than treating geoBroadcasts as a fallback -
  // a Peacock-exclusive game has nothing in broadcasts at all.
  function broadcast(comp){
    var out=[];
    function add(v){
      if(!v) return;
      v=String(v).trim();
      if(v && out.indexOf(v)===-1) out.push(v);
    }
    function scan(x){
      if(!x) return;
      // where to watch: a radio call sign ("ERADM") is not a place to watch
      if(/radio/i.test((x.type&&x.type.shortName)||"")) return;
      if(x.media){ add(x.media.shortName); add(x.media.callLetters); add(x.media.name); }
      if(Array.isArray(x.names)) x.names.forEach(add);
      add(x.shortName); add(x.callLetters); add(x.station); add(x.name);
    }
    (comp.broadcasts||[]).forEach(scan);
    (comp.geoBroadcasts||[]).forEach(scan);
    // ESPN's one-line summary ("ESPN/Disney+") repeats networks listed above;
    // it adds only a network nothing else named
    if(typeof comp.broadcast==="string"){
      var parts=comp.broadcast.split("/").map(function(p){ return p.trim(); }).filter(Boolean);
      if(!parts.every(function(p){ return out.indexOf(p)>-1; })) add(comp.broadcast);
    }
    // a couple of feeds hang it off the event's status block instead
    if(comp.status && typeof comp.status.broadcast==="string") add(comp.status.broadcast);
    return out.join(", ");
  }

  // The line and total, from whichever block ESPN put them in.
  // Odds are compact game metadata - the spread and the total - never a
  // betting product (decision 0025). Whoever set them is kept as provenance,
  // `provider`, exactly as the feed names it: ESPN's odds source has
  // changed before (ESPN BET, then DraftKings from December 2025), so no
  // sportsbook name is ever assumed in code. Null when the feed names none.
  function oddsOf(o){
    if(!o) return null;
    var line=o.details||(o.spread!=null?String(o.spread):null), total=o.overUnder!=null?o.overUnder:null;
    if(line==null && total==null) return null;
    var p=o.provider && (o.provider.displayName||o.provider.name);
    return { line:line, total:total, provider: p ? str(p) : null };
  }
  function odds(comp){
    return oddsOf((comp.odds&&comp.odds[0])||(comp.pickcenter&&comp.pickcenter[0]));
  }

  // ESPN does not always set neutralSite. A game where the team is the listed
  // home side but the venue is not its home field is a neutral site in
  // practice - Lambeau, Gillette, the Shamrock Series and so on.
  // Venues that are never a college team's home field.
  var NEUTRAL_VENUES = /lambeau|gillette|metlife|m&t bank|soldier field|yankee stadium|aviva|at&t stadium|allegiant|mercedes-benz|hard rock|raymond james|caesars superdome|camping world|alamodome/i;

  // Case-insensitive match on the home field's name, the way ESPN spells it.
  function isHomeField(team, venueName){
    return String(venueName||"").toLowerCase().indexOf(team.venue.name.toLowerCase())>-1;
  }
  function isNeutral(team, comp, us){
    if(comp.neutralSite===true) return true;
    var v = comp.venue && comp.venue.fullName ? comp.venue.fullName : "";
    if(v === "") return false;
    // A pro or event venue is neutral no matter which side is listed as home.
    if(NEUTRAL_VENUES.test(v)) return true;
    // Listed at home but not actually at the home field.
    var listedHome = us ? us.homeAway==="home" : false;
    return listedHome && !isHomeField(team, v);
  }

  // Trophy and series names, matched on the opponent's name against the
  // team config's `series` table. No public feed carries this.
  function seriesFor(series, name){
    for(var i=0;i<series.length;i++){ if(series[i][0].test(name||"")) return series[i][1]; }
    return null;
  }

  // ESPN publishes kickoff times and broadcasts separately, and is slow on
  // streaming-only games because Peacock is not a TV network in their data
  // model. The config's fallback is consulted ONLY when ESPN returns nothing
  // for that game, so it can never contradict the feed and disappears on its
  // own once the feed catches up.
  function fallbackBroadcast(fallback, oppName){
    for(var i=0;i<fallback.length;i++){
      if(fallback[i][0].test(oppName||"")) return fallback[i][1];
    }
    return "";
  }

  // One ESPN schedule event -> one Game, from the team's point of view.
  // ESPN writes a competitor's score as an object, a string or a number
  // depending on the endpoint. null only when there is genuinely none.
  function scoreOf(c){
    var s = c ? c.score : null;
    if (s == null) return null;
    if (typeof s === "object") {
      if (s.displayValue != null) return str(s.displayValue);
      if (s.value != null) return str(s.value);
      return null;
    }
    return str(s);
  }

  /* ---------- game status ----------
     ESPN's status -> the Suite's normalized one (decisions 0022 #5, 0024
     §14). ESPN's `state` alone cannot carry it: a postponed game and a final
     one are both "post", and a delay before kickoff and a lightning delay in
     the third quarter are both named DELAYED. So the type's NAME decides the
     status, and `hasStarted` records whether play has begun - which is what
     tells those two delays apart.

       status      scheduled | live | delayed | suspended | final |
                   postponed | canceled
       hasStarted  true once there has been play; never true for a game that
                   has only been scheduled, postponed or canceled before it
                   began
       period      the quarter, 0 before kickoff
       clock       the game clock as ESPN displays it, or ""

     The names are ESPN's documented STATUS_* values; anything unknown falls
     back to what `state` says, so a new ESPN name degrades to the old
     pre/in/post behaviour rather than to nonsense. */
  function gameStatus(stat){
    stat = stat || {};
    var t = stat.type || {};
    var name = String(t.name || "").toUpperCase(), state = t.state || "pre";
    var period = Number(stat.period) || 0;
    var status =
      /CANCEL/.test(name)   ? "canceled"  :
      /POSTPONE/.test(name) ? "postponed" :
      /SUSPEND/.test(name)  ? "suspended" :
      /DELAY/.test(name)    ? "delayed"   :
      (state === "post" || t.completed === true) ? "final" :
      state === "in"        ? "live"      : "scheduled";
    var started = status === "live" || status === "final" ||
                  ((status === "delayed" || status === "suspended") && (state === "in" || period > 0)) ||
                  ((status === "postponed" || status === "canceled") && period > 0);
    return { status: status, hasStarted: started, period: period, clock: str(stat.displayClock) };
  }

  // A competitor's overall record, "3-0", from whichever shape the endpoint
  // uses: the schedule's record[] or the scoreboard's records[]. Absent is
  // null - an optional field the Suite leaves out (0022 #3).
  function recordOf(c){
    var list = c && (c.records || c.record);
    if (!Array.isArray(list) || !list.length) return null;
    var r = list.filter(function(x){ return /^(total|overall)$/i.test(x.type||x.name||""); })[0] || list[0];
    var v = r && (r.summary || r.displayValue);
    return v ? str(v) : null;
  }
  function idOf(t){ var id = t && t.id != null ? String(t.id) : ""; return /^[0-9]+$/.test(id) ? id : null; }

  function game(ev, team, config){
    var teamId = config.sources.espn.teamId;
    var comp=(ev.competitions&&ev.competitions[0])||{}, cs=comp.competitors||[];
    var us=null,them=null;
    cs.forEach(function(c){ var id=c.id||(c.team&&c.team.id);
      if(String(id)===teamId) us=c; else them=c; });
    var st=(comp.status&&comp.status.type)||(ev.status&&ev.status.type)||{};
    var gs=gameStatus(comp.status||ev.status);
    var oppLong = them&&them.team ? (them.team.displayName||them.team.shortDisplayName) : "";
    return {
      id:ev.id, date:ev.date, timeSet:timeIsSet(ev.date, comp),
      home: us?us.homeAway==="home":true,
      neutral: isNeutral(team, comp, us),
      oppName: them&&them.team?(them.team.shortDisplayName||them.team.displayName):"opponent to be announced",
      oppRank: them&&them.curatedRank&&them.curatedRank.current<26?them.curatedRank.current:null,
      // For the opponent's mark (TeamOS.espn.mark) and its initials fallback.
      oppProviderId: them ? idOf(them.team) : null,
      oppAbbr: them&&them.team ? str(them.team.abbreviation) : "",
      usRank: rankOf(us), usRecord: recordOf(us), oppRecord: recordOf(them),
      venue: comp.venue?(comp.venue.fullName||""):"",
      city: comp.venue&&comp.venue.address?comp.venue.address.city:"",
      venueState: comp.venue&&comp.venue.address?(comp.venue.address.state||""):"",
      zip: comp.venue&&comp.venue.address?(comp.venue.address.zipCode||""):"",
      net: broadcast(comp) || fallbackBroadcast(config.sources.espn.broadcastFallback, oppLong),
      odds: odds(comp),
      series: seriesFor(config.series, oppLong),
      state: st.state||"pre", detail: st.shortDetail||"",
      status: gs.status, hasStarted: gs.hasStarted, period: gs.period, clock: gs.clock,
      // A postponed game's replacement date, { date, timeSet }, only when a
      // source states one trustworthily (decision 0022 #5). ESPN does not:
      // a postponed event keeps a date that may be the original or the new
      // one, with nothing saying which. So this adapter never guesses - it
      // is null, the Suite says "New date to be announced", and when ESPN
      // reschedules the game it returns as scheduled on its new date.
      newDate: null,
      // A score of 0 is a score. The old truthiness test turned a real 0
      // into null, which the view then printed as 0 by coincidence and
      // which left the model unable to tell "0-0 in progress" from "no
      // score yet".
      us: scoreOf(us), them: scoreOf(them),
      won: us?us.winner===true:null
    };
  }

  /* ---------- roster ---------- */
  // ESPN labels its groups with raw camelCase keys like "specialTeam". Map the
  // ones college football actually uses; title-case anything unexpected.
  var GROUP_LABEL={ offense:"Offense", defense:"Defense", specialteam:"Special Teams",
                    specialteams:"Special Teams", injuredreserve:"Injured",
                    practicesquad:"Practice", suspended:"Suspended" };
  function groupLabel(key, fallback){
    var k=String(key||"").toLowerCase();
    if(GROUP_LABEL[k]) return GROUP_LABEL[k];
    var s=String(fallback||key||"Squad").replace(/([a-z])([A-Z])/g,"$1 $2");
    return s.charAt(0).toUpperCase()+s.slice(1);
  }
  function str(v){ return v==null ? "" : String(v); }

  // One ESPN athlete -> one Player. Only what the roster view shows and
  // searches; position is the abbreviation with the full name as a fallback,
  // and positionName keeps the full name so a search for "quarterback" works.
  function player(p){
    var pos=p.position||{}, xp=p.experience||{}, bp=p.birthPlace||{};
    return {
      name:         str(p.displayName||p.fullName),
      jersey:       str(p.jersey),
      position:     str(pos.abbreviation||pos.name),
      positionName: str(pos.name),
      height:       str(p.displayHeight),
      weight:       str(p.displayWeight),
      classYear:    str(xp.abbreviation||xp.displayValue),
      hometown:     { city: str(bp.city), state: str(bp.state) },
      // the provider's headshot, loaded from where it is hosted (never
      // copied); null when the feed has none - Suite draws its fallback
      photo:        p.headshot && p.headshot.href ? str(p.headshot.href) : null
    };
  }

  /* ---------- league: scoreboard and rankings ---------- */
  var TOP25 = 26;
  var LEAGUE_GROUP = 80;                 // ESPN's group id for FBS

  function rankOf(c){
    return c && c.curatedRank && c.curatedRank.current<TOP25 ? c.curatedRank.current : null;
  }
  function leagueSide(c){
    var t=(c&&c.team)||{};
    var recs=(c&&c.records)||[];
    var rec=recs.filter(function(r){ return r && r.type==="total"; })[0];
    return {
      name:       c && c.team ? str(t.shortDisplayName||t.displayName) : "opponent to be announced",
      abbr:       t.abbreviation ? str(t.abbreviation) : null,
      // opaque: Suite hands it back to ask for the program's mark
      providerId: t.id!=null ? str(t.id) : null,
      rank:       rankOf(c),
      record:     rec && rec.summary ? str(rec.summary) : null,
      score:      c && c.score!=null ? str(c.score) : null
    };
  }

  // One ESPN scoreboard event -> one LeagueGame: neutral home/away, with a
  // flag for the team's own game. `live` carries what the scoreboard already
  // knows about the ball while the game is on.
  function leagueGame(ev, config){
    var teamId=config.sources.espn.teamId;
    var comp=(ev.competitions&&ev.competitions[0])||{}, cs=comp.competitors||[];
    var home=cs.filter(function(c){return c.homeAway==="home";})[0]||cs[0];
    var away=cs.filter(function(c){return c.homeAway==="away";})[0]||cs[1];
    var st=(comp.status&&comp.status.type)||{};
    var gs=gameStatus(comp.status);
    var sit=comp.situation||{};
    var state=st.state||"pre";
    return {
      id:      str(ev.id),
      date:    ev.date,
      timeSet: timeIsSet(ev.date, comp),
      state:   state,
      status:  gs.status, hasStarted: gs.hasStarted, period: gs.period, clock: gs.clock,
      detail:  str(st.shortDetail),
      venue:   comp.venue ? str(comp.venue.fullName) : "",
      net:     broadcast(comp),
      odds:    odds(comp),
      home:    leagueSide(home),
      away:    leagueSide(away),
      mine:    cs.some(function(c){ return String(c.id)===teamId; }),
      live:    state==="in"
                 ? { downDistance: str(sit.downDistanceText||sit.shortDownDistanceText),
                     short:        str(sit.shortDownDistanceText),
                     spot:         str(sit.possessionText),
                     // which side has the ball, as "home" / "away" - never a provider id
                     possession:   sit.possession==null ? null
                                   : String(sit.possession)===String(home&&home.id||home&&home.team&&home.team.id) ? "home"
                                   : String(sit.possession)===String(away&&away.id||away&&away.team&&away.team.id) ? "away" : null,
                     lastPlay:     str(sit.lastPlay&&sit.lastPlay.text) }
                 : null
    };
  }

  // Which poll leads. Once the committee starts releasing CFP rankings those
  // are the only ones that decide anything, so they sort to the top.
  function pollOrder(r){
    var n=((r.shortName||"")+" "+(r.name||"")+" "+(r.type||"")).toLowerCase();
    if(/cfp|playoff/.test(n))               return 0;
    if(/\bap\b|associated press/.test(n))   return 1;
    if(/coach|afca|usa today/.test(n))      return 2;
    return 3;
  }
  // ESPN's rankings endpoint returns FCS, Division II and Division III polls
  // alongside the FBS ones. Keep only the three that bear on an FBS team.
  function isFBS(r){
    var n=((r.shortName||"")+" "+(r.name||"")+" "+(r.type||"")+" "+
           (r.headline||"")).toLowerCase();
    if(/\bfcs\b|division\s*(ii|iii|2|3)\b|\bd-?ii+\b|\bd-?[23]\b|naia|juco|junior college/.test(n))
      return false;
    return pollOrder(r)<3;          // CFP, AP or FBS coaches only
  }
  function pollLabel(r){
    var n=((r.shortName||"")+" "+(r.name||"")).toLowerCase();
    if(/cfp|playoff/.test(n))             return "CFP";
    if(/\bap\b|associated press/.test(n)) return "AP";
    if(/coach|afca|usa today/.test(n))    return "Coaches";
    return (r.shortName||r.name||"Poll").slice(0,10);
  }
  function poll(r, config){
    var teamId=config.sources.espn.teamId, label=pollLabel(r);
    return {
      key:   label.replace(/[^A-Za-z0-9]/g,""),
      label: label,
      name:  str(r.name||"Poll"),
      asOf:  r.occurrence ? str(r.occurrence.displayValue) : "",
      // when the poll was last published, ISO; null when the feed has no date
      updated: r.lastUpdated||r.date ? str(r.lastUpdated||r.date) : null,
      ranks: (r.ranks||[]).map(function(x){
        var t=x.team||{};
        return {
          rank:       x.current,
          team:       str(t.nickname||t.name||t.location||t.shortDisplayName),
          abbr:       t.abbreviation ? str(t.abbreviation) : null,
          providerId: t.id!=null ? str(t.id) : null,
          record:     str(x.recordSummary),
          // ESPN's `previous` is a rank, 0 for a team new to the poll, or absent
          previous:   x.previous>0 ? x.previous : null,
          isNew:      x.previous===0,
          // places moved since the last poll, up positive; null when there
          // is no earlier rank to measure from (new, or no history)
          change:     x.previous>0 && typeof x.current==="number" ? x.previous-x.current : null,
          mine:       String(t.id)===teamId
        };
      })
    };
  }

  /* ---------- game center: the summary ---------- */
  var CORE = "https://sports.core.api.espn.com/v2/sports/football/leagues/college-football";

  function pick(o, path, dflt){
    var cur=o;
    for(var i=0;i<path.length;i++){
      if(cur==null) return dflt;
      cur=cur[path[i]];
    }
    return cur==null ? dflt : cur;
  }
  function numOf(v){ var n=parseFloat(String(v).replace(/[^0-9.\-]/g,"")); return isNaN(n)?null:n; }
  // "5-13" is a made/attempted pair, not the number 5. Compare the rate.
  // "28:24" is a clock, not 2824. Compare the seconds.
  function cmpVal(v){
    var s=String(v==null?"":v).trim();
    var m=s.match(/^(\d+)\s*[-/]\s*(\d+)$/);
    if(m) return parseInt(m[2],10)===0 ? 0 : parseInt(m[1],10)/parseInt(m[2],10);
    var t=s.match(/^(\d+):(\d{2})$/);
    if(t) return parseInt(t[1],10)*60+parseInt(t[2],10);
    return numOf(s);
  }
  // A team's stat by any of the names ESPN has filed it under.
  function statVal(team, keys){
    var st=(team&&team.statistics)||[];
    for(var i=0;i<st.length;i++){
      var n=String(st[i].name||"").toLowerCase(), l=String(st[i].label||"").toLowerCase();
      for(var k=0;k<keys.length;k++){
        var want=keys[k].toLowerCase();
        if(n===want||l===want) return st[i].displayValue!=null?st[i].displayValue:st[i].value;
      }
    }
    return null;
  }
  // The team-stat rows the Game Center shows, and the ESPN stat names each
  // might be filed under. Turnovers and penalties are the two where fewer
  // is better; penalties compare as a count ("6-43" -> 6), not a rate.
  var TEAM_STAT_ROWS=[
    ["Total yards",["totalYards"]],
    ["Passing",["netPassingYards","passingYards"]],
    ["Rushing",["rushingYards"]],
    ["First downs",["firstDowns"]],
    ["3rd down",["thirdDownEff"]],
    ["Turnovers",["turnovers"]],
    ["Penalties",["totalPenaltiesYards"]],
    ["Possession",["possessionTime"]]
  ];
  // Stats where fewer is better. A share-of-total bar would read backwards
  // for these, so each row says which way it runs.
  function LOWER_WINS(label){ return label==="Turnovers"||label==="Penalties"; }
  function betterSide(label, av, hv){
    var an=cmpVal(av), hn=cmpVal(hv);
    if(label==="Penalties"){ an=numOf(av); hn=numOf(hv); }
    if(an==null||hn==null||an===hn) return null;
    var lowerWins = LOWER_WINS(label);
    return (lowerWins ? an<hn : an>hn) ? "away" : "home";
  }
  // ESPN names leader categories "passingYards", "totalTackles" and so on.
  function leaderCategory(cat){
    var n=String(cat.name||"").toLowerCase();
    if(n.indexOf("passing")===0)   return "Passing";
    if(n.indexOf("rushing")===0)   return "Rushing";
    if(n.indexOf("receiving")===0) return "Receiving";
    if(n.indexOf("sack")>-1)       return "Sacks";
    if(n.indexOf("tackle")>-1)     return "Tackles";
    if(n.indexOf("intercept")>-1)  return "Int";
    return str(cat.shortDisplayName||cat.displayName);
  }
  function leaderRows(tl){
    var out=[];
    (tl.leaders||[]).forEach(function(cat){
      var top=(cat.leaders||[])[0];
      if(!top) return;
      var nm=pick(top,["athlete","shortName"],null)||pick(top,["athlete","displayName"],"");
      if(!nm) return;
      out.push({ category:leaderCategory(cat), name:nm, line:str(top.displayValue) });
    });
    return out;
  }
  // ESPN's boxscore.players holds the complete per-player lines that
  // `leaders` only samples. Each category carries its own labels.
  function boxTables(d, teamId){
    var groups=pick(d,["boxscore","players"],[])||[];
    var tm=groups.filter(function(g){ return String(pick(g,["team","id"],""))===String(teamId); })[0];
    if(!tm) return [];
    var out=[];
    (tm.statistics||[]).forEach(function(cat){
      var labels=cat.labels||cat.keys||[];
      var rows=cat.athletes||[];
      if(!labels.length||!rows.length) return;
      var title=str(cat.text||cat.name);
      // key: the category as a stable id ("passing", "kickReturns");
      // label: it in words, without the team name ESPN puts in `text`.
      var key=str(cat.name||title).replace(/[^A-Za-z0-9]/g,"");
      var label=key.replace(/([a-z])([A-Z])/g,"$1 $2").replace(/^./,function(c){ return c.toUpperCase(); })
                   .replace(/^Defensive$/,"Defense");
      out.push({
        key: key, label: label,
        title: title.charAt(0).toUpperCase()+title.slice(1),
        labels: labels.map(str),
        rows: rows.map(function(a){
          return { name: str(pick(a,["athlete","shortName"],null)||pick(a,["athlete","displayName"],"")),
                   jersey: str(pick(a,["athlete","jersey"],"")),
                   stats: (a.stats||[]).map(str) };
        })
      });
    });
    return out;
  }
  function detailSide(c, teamId){
    var t=c.team||{};
    return {
      key:          str(t.id),
      name:         str(t.shortDisplayName||t.displayName||t.name||"TBA"),
      abbreviation: str(t.abbreviation||t.shortDisplayName),
      record:       str(c.records&&c.records[0]&&c.records[0].summary),
      score:        c.score!=null ? c.score : null,
      mine:         String(t.id)===teamId,
      // Whether this side has the ball, as the game summary says while it
      // is live; false otherwise.
      possession:   c.possession===true,
      // The program's colours as the provider publishes them, "#rrggbb" or
      // null - so a view can tell the two teams apart (whose drive it is).
      colors:       { primary: hexColor(t.color), alt: hexColor(t.alternateColor) }
    };
  }
  function hexColor(v){ var h=String(v||"").replace(/^#/,""); return /^[0-9a-f]{6}$/i.test(h) ? "#"+h.toUpperCase() : null; }
  function linescoreOf(c){
    return (c.linescores||[]).map(function(v){ return str(v.displayValue!=null?v.displayValue:v.value); });
  }

  // ---- drives and plays ----
  // A spot on the field from the OFFENSE's side: fromOwn is yards from its
  // own goal line (100 - ESPN's yardsToEndzone), so a drive always runs
  // 0 -> 100 whichever end it is at. down/distance are the snap's.
  function spotOf(s){
    if(!s || typeof s!=="object") return null;
    var yte = typeof s.yardsToEndzone==="number" ? s.yardsToEndzone : null;
    return { fromOwn: yte==null ? null : 100-yte,
             down: typeof s.down==="number" ? s.down : null,
             distance: typeof s.distance==="number" ? s.distance : null,
             short: str(s.shortDownDistanceText), spot: str(s.possessionText),
             teamId: str(pick(s,["team","id"],"")) };
  }
  function playOf(p){
    return { text: str(p.text), period: pick(p,["period","number"],null),
             clock: str(pick(p,["clock","displayValue"],"")), type: str(pick(p,["type","text"],"")),
             yards: typeof p.statYardage==="number" ? p.statYardage : null,
             scoring: !!p.scoringPlay, start: spotOf(p.start), end: spotOf(p.end) };
  }
  // A drive from the team's side: whose it is as home/away and mine, the
  // provider's own one-line summary ("11 plays, 48 yards, 4:56"), how it
  // ended, and its plays. A play the OTHER team ran inside it - the kickoff
  // that opens it - keeps its spot but says whose it was (offense: false),
  // so a field drawn from the offense's side can leave it out.
  function driveOf(d, teamId, home, away){
    var tid=str(pick(d,["team","id"],""));
    return { id: str(d.id), side: tid===home.key ? "home" : tid===away.key ? "away" : null,
             mine: tid===teamId, summary: str(d.description), result: str(d.displayResult||d.result),
             plays: (d.plays||[]).map(function(p){
               var pl=playOf(p);
               pl.offense = !pl.start || !pl.start.teamId || pl.start.teamId===tid;
               return pl;
             }) };
  }

  function drivesOf(d, teamId, home, away){
    var dr=d.drives;
    if(!dr || (!dr.previous && !dr.current)) return null;
    var list=(dr.previous||[]).map(function(x){ return driveOf(x, teamId, home, away); });
    var current=dr.current ? driveOf(dr.current, teamId, home, away) : null;
    if(current && !list.some(function(x){ return x.id && x.id===current.id; })) list.push(current);
    return list.length || current ? { current: current, list: list } : null;
  }

  // ESPN's game summary -> GameDetail: the sections the Game Center renders,
  // each null when the payload has nothing for it. Field names vary by game
  // state, so every read is defensive; a missing section drops out rather
  // than blanking the tab.
  function gameDetail(d, team, config){
    var teamId=config.sources.espn.teamId;
    var comp=pick(d,["header","competitions",0],{})||{};
    var cs=comp.competitors||[];
    var homeC=cs.filter(function(c){return c.homeAway==="home";})[0]||cs[0]||{};
    var awayC=cs.filter(function(c){return c.homeAway==="away";})[0]||cs[1]||{};
    var st=pick(comp,["status","type"],{})||{};
    var home=detailSide(homeC, teamId), away=detailSide(awayC, teamId);

    // last play: the live situation, else the current drive, else the last drive
    var sit=d.situation||comp.situation||{};
    var lastText=pick(sit,["lastPlay","text"],null);
    if(!lastText){
      var cur=pick(d,["drives","current","plays"],null);
      if(cur&&cur.length) lastText=cur[cur.length-1].text;
    }
    if(!lastText){
      var prev=pick(d,["drives","previous"],null);
      if(prev&&prev.length){
        var pl=prev[prev.length-1].plays;
        if(pl&&pl.length) lastText=pl[pl.length-1].text;
      }
    }
    var lastPlay = lastText ? {
      text:         str(lastText),
      possession:   str(pick(sit,["lastPlay","team","abbreviation"],"")),
      downDistance: str(sit.downDistanceText||sit.shortDownDistanceText)
    } : null;

    var wp=d.winprobability, hp=wp&&wp.length ? wp[wp.length-1].homeWinPercentage : null;
    var winProb = typeof hp==="number" ? { homePct: hp } : null;

    var al=linescoreOf(awayC), hl=linescoreOf(homeC);
    var linescore = (al.length||hl.length) ? { away:al, home:hl } : null;

    // team stats: home always on the right, matched by team id; if ESPN ever
    // omits the id, fall back to its own ordering rather than guessing
    var teamStats=null;
    var bt=pick(d,["boxscore","teams"],[])||[];
    if(bt.length>=2){
      var bh=bt.filter(function(t){return String(pick(t,["team","id"],""))===home.key;})[0];
      var ba=bt.filter(function(t){return String(pick(t,["team","id"],""))===away.key;})[0];
      if(!bh||!ba){ ba=bt[0]; bh=bt[1]; }
      var rows=[];
      TEAM_STAT_ROWS.forEach(function(r){
        var av=statVal(ba,r[1]), hv=statVal(bh,r[1]);
        if(av==null&&hv==null) return;
        rows.push({ label:r[0], away:av==null?null:str(av), home:hv==null?null:str(hv), better:betterSide(r[0],av,hv),
                    lowerWins:LOWER_WINS(r[0]) });
      });
      if(rows.length) teamStats=rows;
    }

    var lead=d.leaders||[];
    var la=lead.filter(function(t){return String(pick(t,["team","id"],""))===away.key;})[0];
    var lh=lead.filter(function(t){return String(pick(t,["team","id"],""))===home.key;})[0];
    if(!la&&!lh){ la=lead[0]; lh=lead[1]; }
    var leaders = lead.length ? { away: la?leaderRows(la):[], home: lh?leaderRows(lh):[] } : null;

    var boxA=boxTables(d, away.key), boxH=boxTables(d, home.key);
    var box = (boxA.length||boxH.length) ? { away:boxA, home:boxH } : null;

    var sp=d.scoringPlays||[], scoring=null;
    if(sp.length){
      scoring=sp.map(function(p){
        // who scored: match on team id, fall back to abbreviation
        var pid=String(pick(p,["team","id"],""));
        var pab=pick(p,["team","abbreviation"],null);
        var scoredAway = pid ? pid===away.key : (pab ? pab===away.abbreviation : false);
        var ab = pab || (scoredAway?away.abbreviation:home.abbreviation);
        return {
          period:    pick(p,["period","number"],null),
          clock:     str(pick(p,["clock","displayValue"],"")),
          teamAbbr:  str(ab),
          mine:      pid ? pid===teamId : ab===team.abbreviation,
          text:      str(p.text),
          awayScore: p.awayScore==null ? null : p.awayScore,
          homeScore: p.homeScore==null ? null : p.homeScore
        };
      });
    }

    return {
      state:     str(st.state||"post"),
      detail:    str(st.detail||st.shortDetail||st.description),
      home:      home,
      away:      away,
      lastPlay:  lastPlay,
      winProb:   winProb,
      linescore: linescore,
      teamStats: teamStats,
      leaders:   leaders,
      box:       box,
      scoring:   scoring,
      // { current: Drive | null, list: Drive[] } - every drive in order, the
      // one in progress last and also as `current`; null with no drives.
      drives:    drivesOf(d, teamId, home, away)
    };
  }

  /* ---------- matchup preview: season stats ---------- */
  // key, label, then the provider's stat names for it; whichever is present
  // wins. A name may be qualified with its category ("defensive.sacks") when
  // the bare name is ambiguous - ESPN files "sacks" under BOTH passing (sacks
  // this offence gave up) and defensive (sacks this defence made), and an
  // unqualified lookup picks whichever category the feed happens to list last.
  //
  // NOT mapped, deliberately: ESPN publishes `defensive.pointsAllowed` and
  // `defensive.yardsAllowed` on this endpoint and both are always 0 with rank
  // "Tied-1st" - unpopulated stubs, not data (decision 0011). The points a
  // team has allowed is derived from its own results instead, by
  // TeamOS.season, and arrives here as the `pointsAllowed` row's value.
  var PREVIEW_ROWS=[
    ["pointsFor",     "Points per game",  ["scoring.totalpointspergame","totalpointspergame","pointspergame"]],
    ["pointsAllowed", "Points allowed",   []],
    ["totalOffense",  "Total offense",    ["yardspergame","netyardspergame","totalyardspergame"]],
    ["rushOffense",   "Rushing offense",  ["rushing.rushingyardspergame","rushingyardspergame"]],
    ["passOffense",   "Passing offense",  ["passing.netpassingyardspergame","netpassingyardspergame","passingyardspergame"]],
    ["yardsPerPlay",  "Yards per play",   ["avggain"]],
    ["sacks",         "Sacks",            ["defensive.sacks"]],
    ["tacklesForLoss","Tackles for loss", ["defensive.tacklesforloss"]],
    ["turnoverMargin","Turnover margin",  ["turnoverdifferential","turnovermargin"]]
  ];
  // Flatten every category into one map so lookups do not care where ESPN
  // filed a stat this year. Each stat is keyed twice: qualified by its
  // category, and bare. Bare names collide across categories and the last one
  // listed wins - which is why anything ambiguous is looked up qualified.
  function flattenStats(d){
    var out={};
    var cats=pick(d,["splits","categories"],[])||[];
    cats.forEach(function(c){
      var cat=String((c&&c.name)||"").toLowerCase();
      (c.stats||[]).forEach(function(s){
        if(!s||!s.name) return;
        var v={
          display: s.displayValue!=null?s.displayValue:s.value,
          rank: typeof s.rank==="number" ? s.rank : null,
          rankText: s.rankDisplayValue||null
        };
        var n=String(s.name).toLowerCase();
        if(cat) out[cat+"."+n]=v;
        out[n]=v;
      });
    });
    return out;
  }

  /* ---------- team ---------- */

  // One season type per request. Asked for without one, ESPN returns the
  // season type it considers current: the regular season through November,
  // and - by the same rule - presumably only the postseason once bowls
  // begin. Bowl and CFP games never arrive with the regular season
  // (real payloads, 2026-09-25), so a season is two requests, joined below.
  var REGULAR=2, POSTSEASON=3;
  function teamSchedule(teamId, type){ return SITE+"/teams/"+teamId+"/schedule?seasontype="+type; }

  return {
    // The URLs app.js fetches. The service worker's data cache and the
    // page's cache-first paint are keyed on them, so a change of shape costs
    // every fan their offline copy once (app.js bridges the last change).
    scheduleUrl: function(config){
      return teamSchedule(config.sources.espn.teamId, REGULAR);
    },
    postseasonUrl: function(config){
      return teamSchedule(config.sources.espn.teamId, POSTSEASON);
    },
    // The same URLs for a team we have no config for - the preview needs the
    // opponent's results to work out what they have allowed.
    teamScheduleUrl: function(teamId){
      return teamSchedule(teamId, REGULAR);
    },
    teamPostseasonUrl: function(teamId){
      return teamSchedule(teamId, POSTSEASON);
    },
    // A regular-season payload and a postseason one -> one season, in the
    // same shape, for schedule() and scoreLines(). Either may be missing: no
    // postseason is the normal case until bowls are set. An event both
    // carry is kept once.
    joinSeason: function(regular, postseason){
      var seen={}, events=[];
      [regular, postseason].forEach(function(d){
        ((d&&d.events)||[]).forEach(function(ev){
          if(!ev || seen[ev.id]) return;
          seen[ev.id]=1; events.push(ev);
        });
      });
      return { events: events };
    },
    rosterUrl: function(config){
      return SITE+"/teams/"+config.sources.espn.teamId+"/roster";
    },
    teamUrl: function(config){
      return SITE+"/teams/"+config.sources.espn.teamId;
    },
    scoreboardUrl: function(){
      return SITE+"/scoreboard?groups="+LEAGUE_GROUP+"&limit=400";
    },
    summaryUrl: function(gameId){
      return SITE+"/summary?event="+gameId;
    },
    newsUrl: function(config){
      return SITE+"/news?team="+config.sources.espn.teamId+"&limit=30";
    },
    // National ranks are not in the site API; they live in ESPN's core API.
    // `key` is a GameDetail side's opaque key; `season` the season year.
    seasonStatsUrl: function(key, season){
      return CORE+"/seasons/"+season+"/types/2/teams/"+key+"/statistics";
    },
    rankingsUrl: function(){
      return SITE+"/rankings";
    },

    // A program's mark (logo), hosted by the provider. The Suite asks for a
    // team's mark and never learns how the provider builds the address - the
    // same URL ESPN's own payloads carry as team.logo. `dark` is the variant
    // drawn for dark backgrounds. No id, no mark: the view shows its own
    // fallback (the program's initials), never a broken image.
    mark: function(providerId, dark){
      var id=String(providerId==null?"":providerId);
      if(!/^[0-9]+$/.test(id)) return null;
      return "https://a.espncdn.com/i/teamlogos/ncaa/"+(dark?"500-dark":"500")+"/"+id+".png";
    },

    // ESPN's roster payload -> RosterGroup[]: { key, label, players }. Either a
    // flat athletes array or one grouped by unit; empty units (IR, practice
    // squad) are dropped, and a flat list becomes one group called "Roster".
    roster: function(json){
      var groups=[];
      var a=(json&&json.athletes)||[];
      if(a.length && a[0] && Array.isArray(a[0].items)){
        a.forEach(function(g){
          var items=g.items||[];
          if(!items.length) return;
          var key=String(g.position||g.name||"squad").toLowerCase();
          groups.push({ key:key, label:groupLabel(key, g.text||g.name), players:items.map(player) });
        });
      }
      if(!groups.length) groups.push({ key:"all", label:"Roster", players:a.map(player) });
      return groups;
    },

    // ESPN's team payload -> TeamStatus: { rank, record }. rank is null
    // outside the top 25; record is the overall summary ("2-0") or null when
    // ESPN sends none.
    teamStatus: function(json){
      var t=(json&&json.team)||{};
      // The overall record, by name rather than by position: ESPN usually
      // sends one item but is free to send home/away/conference beside it,
      // and reading whichever happened to be first is how a header ends up
      // showing a 0-0 split record during a season.
      var items=(t.record&&t.record.items)||[];
      var r=items.filter(function(x){ return x && x.type==="total"; })[0] || items[0];
      return {
        rank:   (t.rank && t.rank<TOP25) ? t.rank : null,
        record: r ? str(r.summary) : null
      };
    },

    // ESPN's schedule payload -> Game[], oldest first.
    schedule: function(json, team, config){
      return ((json&&json.events)||[]).map(function(ev){ return game(ev, team, config); })
        .sort(function(a,b){ return new Date(a.date)-new Date(b.date); });
    },

    // The pregame line and total from ESPN's game summary, for a Game the
    // schedule payload gave no odds for. null when ESPN has none either.
    gameOdds: function(summary){
      return oddsOf(summary&&summary.pickcenter&&summary.pickcenter[0]);
    },

    // ESPN's scoreboard payload (every game the league is showing this week) ->
    // LeagueGame[], oldest first. Ranked games are the ones with a side rank.
    scoreboard: function(json, config){
      return ((json&&json.events)||[]).map(function(ev){ return leagueGame(ev, config); })
        .sort(function(a,b){ return new Date(a.date)-new Date(b.date); });
    },

    // ESPN's rankings payload -> Poll[]: only the polls that bear on an FBS
    // team, CFP first, one per label when ESPN publishes a poll twice.
    rankings: function(json, config){
      var seen={};
      return ((json&&json.rankings)||[])
        .filter(function(r){ return (r.ranks||[]).length && isFBS(r); })
        .sort(function(a,b){ return pollOrder(a)-pollOrder(b); })
        .filter(function(r){ var k=pollLabel(r); if(seen[k]) return false; seen[k]=1; return true; })
        .map(function(r){ return poll(r, config); });
    },

    // ESPN's game summary -> GameDetail (docs/03_DOMAIN_MODEL.md).
    gameDetail: gameDetail,

    // ESPN's team news -> NewsItem[], in the feed's own order (ESPN does not
    // sort it; the view does). Articles with no headline or no web link are
    // dropped here - nothing could be shown for them.
    news: function(json){
      return ((json&&json.articles)||[]).map(function(a){
        var t=a.published ? Date.parse(a.published) : NaN;
        return {
          title:       str(a.headline),
          link:        a.links&&a.links.web&&a.links.web.href ? str(a.links.web.href) : null,
          image:       a.images&&a.images[0]&&a.images[0].url ? str(a.images[0].url) : "",
          source:      "ESPN",
          publishedAt: isNaN(t) ? null : t
        };
      }).filter(function(n){ return n.link && n.title; });
    },

    // ESPN's core-API season statistics for one team -> SeasonStat[]: the
    // nine matchup-preview rows in a fixed order, value null where the feed
    // has nothing under any of the names that row is filed under. A row with
    // no names at all is one this provider cannot answer; it comes back null
    // for TeamOS.season to fill, and the view skips it if nothing does.
    seasonStats: function(json){
      var map=flattenStats(json);
      return PREVIEW_ROWS.map(function(r){
        var names=r[2], hit=null;
        for(var i=0;i<names.length&&!hit;i++) hit=map[names[i]]||null;
        return { key:r[0], label:r[1],
                 value: hit ? str(hit.display) : null,
                 rank: hit ? hit.rank : null,
                 rankText: hit ? hit.rankText : null };
      });
    },

    // A team's own schedule payload -> the score line of every game on it,
    // from that team's point of view: { state, us, them }. The same three
    // fields a Game carries, so TeamOS.season reads either. This exists
    // because the preview needs the OPPONENT's results, and Game requires a
    // team config that only the configured team has.
    scoreLines: function(json, teamId){
      var id=str(teamId);
      return ((json&&json.events)||[]).map(function(ev){
        var comp=(ev.competitions&&ev.competitions[0])||{}, cs=comp.competitors||[];
        var us=null, them=null;
        cs.forEach(function(c){
          var cid=c.id||(c.team&&c.team.id);
          if(str(cid)===id) us=c; else them=c;
        });
        var st=(comp.status&&comp.status.type)||(ev.status&&ev.status.type)||{};
        return { state: st.state||"pre", us: scoreOf(us), them: scoreOf(them) };
      });
    }
  };
})();
