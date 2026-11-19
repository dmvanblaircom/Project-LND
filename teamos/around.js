/* TeamOS - Around: the week's games, in the layers that matter to one team
   (docs/product/around-your-team-brief.md, navigation-brief.md; David,
   2026-11-05; and, for the games that matter, the relevance model approved
   on 2026-11-18: docs/product/games-that-matter-relevance-proposal.md).

     1. Games that matter: a game is listed only when it has a STAKE - a
        specific, data-backed way its result changes something about this
        team's season - and the matchup could go either way. Having played a
        team is not a stake. Five stakes, in this order:
          Playoff Impact   a team competing with ours for the same places
                           (the format's cutlines) plays a real game
          Résumé Impact    a team we already played, ranked now, ranked
                           earlier this season, or one that beat us, plays a
                           real game
          Conference Race  a conference game between teams in this team's
                           conference race - within one loss of the
                           leader, once three conference games are played
                           - read from the standings; records only, never
                           a tiebreak, clinch or elimination
          Rivalry          a rival (the team's `series`: trophies and
                           rivalries, never branded events) plays a ranked
                           team or is ranked, or plays its last game before
                           ours
          Next Opponent    the next team we play, other than this week's
                           opponent, plays this week
        Playoff Impact and Résumé Impact apply only to a team in the
        national race: ranked inside the format's last cutline plus six.
        Each game carries one label and one sentence, from data only; the
        copy never says clinch or eliminate.
     2. Our conference: every other game this week with a member of the
        team's conference. An independent has no conference layer.
     3. Top 25: the week's ranked games no layer above has listed.
   A game is listed once, in the first layer that claims it.

   Pure: no fetch, no DOM, no team named in the code. Everything about the
   team is its data: its conference from the registry, its schedule, its
   series, its rank, the league's playoff format.

     TeamOS.around.layers({
       games:       LeagueGame[]       the week's FBS scoreboard
       teamId:      provider id of the team
       teamName:    the team's short name ("Notre Dame")
       conference:  the registry's conference name for the team
       conferences: { providerId: conference name } for every FBS program
       short:       { conference name: what fans call it } (league data)
       schedule:    Game[] - the team's season (oppProviderId, date, state, won)
       series:      the team config's series table
       polls:       Poll[] - the leading poll first (CFP once released)
       everRanked:  { providerId: true } - ranked in any poll week kept
                    this season
       ratings:     { providerId: rating } - a predictive rating (FPI), for
                    the matchup test when a game has no line
       cutlines:    [{ at, what }] - the playoff format's lines
       standings:   [{ name, teams: [{ providerId, wins, losses }] }] - each
                    conference's records (conference games only)
       now:         Date
     }) -> { matter: [{ game, label, kind, why: [sentence], also: [{ kind, label, why }] }],
             conference: { name, games: [{ game, why }] } | null,
             top25: LeagueGame[] }                                          */
var TeamOS = TeamOS || {};
TeamOS.around = (function () {
  "use strict";
  var NEAR = 4;                      // places either side in the poll that make a competitor
  var BUBBLE = 6;                    // places past the last cutline still in the national race
  var CLOSE_LINE = 17;               // points: a line within this is a game either side can win
  var CLOSE_RATING = 20;             // rating points, when a game has no line
  var INDEPENDENT = /independent/i;
  var STAKES = [
    { kind: "playoff",    label: "Playoff Impact" },
    { kind: "resume",     label: "Résumé Impact" },
    { kind: "conference", label: "Conference Race" },
    { kind: "rivalry",    label: "Rivalry" },
    { kind: "next",       label: "Next Opponent" }
  ];

  function sides(g) { return [g.home || {}, g.away || {}]; }
  function idOf(s) { return s && s.providerId != null ? String(s.providerId) : null; }
  function ids(g) { return sides(g).map(idOf); }
  function day(d) {
    var t = new Date(d);
    return isNaN(t) ? "" : t.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
  // A series entry from the team's config: [pattern, name] or { match, name, kind }.
  function rivalOf(series, name) {
    for (var i = 0; i < (series || []).length; i++) {
      var e = series[i], m = Array.isArray(e) ? { match: e[0], name: e[1], kind: "trophy" } : e;
      if (!m || !m.match || !m.match.test) continue;
      if (m.kind === "event") continue;              // a branded game is not a rival
      // The name, from its start, and not a different school that merely
      // begins or ends with it: Illinois's trophy is not Northern Illinois's,
      // Texas's is not Texas A&M's - but a pattern written as a prefix
      // ("michigan st") is Michigan State's (Codex, #232).
      var full = String(name || "").trim(), hit = full.match(m.match);
      if (hit && hit.index === 0) {
        var end = hit[0].length;
        if (end === full.length || (/\w/.test(full.charAt(end)) && /\w/.test(full.charAt(end - 1)))) return m.name;
      }
    }
    return null;
  }

  // The line's points: "TEX -4" -> 4, "EVEN" -> 0; null when it says none.
  function linePoints(odds) {
    var l = odds && odds.line != null ? String(odds.line) : "";
    if (/\beven\b|\bpk\b|pick/i.test(l)) return 0;
    var m = l.match(/[-+]?\d+(\.\d+)?\s*$/);
    return m ? Math.abs(parseFloat(m[0])) : null;
  }
  // Could this game go either way? Once it is on or over, the question no
  // longer applies. Before it, the line says; without one, the two ratings.
  // A side that is not an FBS program fails.
  function competitive(g, o) {
    // Not an FBS game: never, live or final included (Codex, #264).
    var fbs = o.conferences || {};
    if (Object.keys(fbs).length && ids(g).some(function (id) { return !id || !fbs[id]; })) return false;
    if (g.state === "in" || g.state === "post") return true;
    var pts = linePoints(g.odds);
    if (pts != null) return pts <= CLOSE_LINE;
    var r = o.ratings || {}, a = r[ids(g)[0]], b = r[ids(g)[1]];
    if (typeof a === "number" && typeof b === "number") return Math.abs(a - b) <= CLOSE_RATING;
    return true;                                      // nothing to judge by: not ruled out
  }

  function rankMap(poll) {
    var m = {};
    ((poll && poll.ranks) || []).forEach(function (r) {
      if (r && r.providerId != null && typeof r.rank === "number") m[String(r.providerId)] = r.rank;
    });
    return m;
  }
  function anyRank(polls, id) {
    for (var i = 0; i < (polls || []).length; i++) {
      var r = rankMap(polls[i])[id];
      if (r) return r;
    }
    return null;
  }
  function no(rank) { return "No. " + rank; }
  function named(s, rank) { return (rank ? no(rank) + " " : "") + (s.name || "TBD"); }
  function places(n) { return n === 1 ? "one place" : n + " places"; }

  // The places a team competes for: within NEAR of it, everyone between it
  // and the cutline below it, and - when it is within NEAR of the cutline
  // above it - everyone in the band above that line.
  function competitors(myRank, cuts) {
    var lines = cuts.map(function (c) { return c.at; }).filter(function (n) { return n > 0; }).sort(function (a, b) { return a - b; });
    var below = lines.filter(function (n) { return n >= myRank; })[0] || null;
    var above = lines.filter(function (n) { return n < myRank; }).pop() || null;
    var aboveFloor = above ? (lines.filter(function (n) { return n < above; }).pop() || 0) : 0;
    return function (rank) {
      if (typeof rank !== "number" || rank === myRank) return null;
      if (above && myRank - above <= NEAR && rank > aboveFloor && rank <= above) return { cut: above, across: true };
      if (Math.abs(rank - myRank) <= NEAR) return { cut: null, across: false };
      if (below && rank > myRank && rank <= below) return { cut: below, across: false };
      return null;
    };
  }
  function cutWhat(cuts, at) {
    var c = cuts.filter(function (x) { return x.at === at; })[0];
    return c ? c.what : null;
  }

  function playoffWhy(g, ctx) {
    var best = null;
    sides(g).forEach(function (s, i) {
      var id = idOf(s), rank = id ? ctx.lead[id] : null, c = rank ? ctx.compete(rank) : null;
      if (!c) return;
      var gap = Math.abs(rank - ctx.myRank);
      if (best && best.strength <= gap) return;
      var other = sides(g)[1 - i], lead = named(s, rank) + " plays " + named(other, ctx.lead[idOf(other)] || null) + ". ";
      var what = c.across ? cutWhat(ctx.cuts, c.cut) : null, tail;
      if (rank < ctx.myRank && what) tail = "A " + s.name + " loss could open " + what + " for " + no(ctx.myRank) + " " + ctx.name + ".";
      else if (rank < ctx.myRank) tail = s.name + " is " + places(ctx.myRank - rank) + " ahead of " + no(ctx.myRank) + " " + ctx.name + ".";
      else tail = s.name + " is " + places(rank - ctx.myRank) + " behind " + no(ctx.myRank) + " " + ctx.name + ".";
      best = { strength: gap, why: lead + tail };
    });
    return best;
  }

  function resumeWhy(g, ctx) {
    var best = null;
    sides(g).forEach(function (s, i) {
      var id = idOf(s), past = id ? ctx.played[id] : null;
      if (!past) return;
      var rank = ctx.lead[id] || anyRank(ctx.polls, id), beatUs = past.won === false;
      if (!rank && !ctx.ever[id] && !beatUs) return;
      var other = sides(g)[1 - i], vs = named(other, ctx.lead[idOf(other)] || null);
      var who = named(s, rank) + (!rank && ctx.ever[id] && !beatUs ? " (ranked earlier this season)" : "");
      var when = past.date ? " on " + day(past.date) : "";
      var why = beatUs
        ? who + " beat " + ctx.name + when + " and plays " + vs + ". How it finishes shapes how that loss reads."
        : ctx.name + " beat " + who + when + ". " + s.name + " plays " + vs + ", and how it finishes shapes how that win reads.";
      var strength = (beatUs ? 0 : 50) + (rank || 40);
      if (!best || strength < best.strength) best = { strength: strength, why: why };
    });
    return best;
  }

  function rivalryWhy(g, o, ctx) {
    var best = null;
    sides(g).forEach(function (s, i) {
      var trophy = rivalOf(o.series, s.name);
      if (!trophy) return;
      var id = idOf(s), other = sides(g)[1 - i], oid = idOf(other);
      var rank = id ? ctx.lead[id] || anyRank(ctx.polls, id) : null, oRank = oid ? ctx.lead[oid] || anyRank(ctx.polls, oid) : null;
      var ours = id ? ctx.upcoming.filter(function (u) { return u.id === id; })[0] : null;
      var gap = ours && g.date ? +new Date(ours.date) - +new Date(g.date) : NaN;
      var why = null, strength = 3;
      if (gap > 0 && gap <= 9 * 864e5) {
        why = named(s, rank) + " plays " + named(other, oRank) + ", its last game before " + trophy + " on " + day(ours.date) + ".";
        strength = 1;
      } else if (oRank && competitive(g, o)) {
        why = "Rival " + named(s, rank) + " plays " + named(other, oRank) + ".";
        strength = 2;
      } else if (rank && competitive(g, o)) {
        why = "Rival " + named(s, rank) + " plays " + (other.name || "TBD") + ".";
      }
      if (why && (!best || strength < best.strength)) best = { strength: strength, why: why };
    });
    return best;
  }

  // The conference race: the team's own conference, the teams within one
  // loss of its leader. Early on, when nobody has played three conference
  // games, there is no race to speak of.
  function raceOf(o, me) {
    var groups = o.standings || [];
    for (var i = 0; i < groups.length; i++) {
      var g = groups[i], rows = (g && g.teams) || [];
      var mine = rows.filter(function (t) { return String(t.providerId) === me; })[0];
      if (!mine) continue;
      var played = rows.reduce(function (m, t) { return Math.max(m, (t.wins || 0) + (t.losses || 0)); }, 0);
      if (played < 3) return null;
      var best = rows.reduce(function (m, t) { return Math.min(m, t.losses || 0); }, Infinity);
      var inRace = {};
      rows.forEach(function (t) { if ((t.losses || 0) <= best + 1) inRace[String(t.providerId)] = t; });
      var members = {};
      rows.forEach(function (t) { members[String(t.providerId)] = t; });
      return inRace[me] ? { name: (o.short || {})[g.name] || g.name, me: mine, inRace: inRace, members: members } : null;
    }
    return null;
  }
  function rec(t) { return t.wins + "-" + t.losses; }
  function conferenceWhy(g, ctx) {
    var r = ctx.race;
    if (!r) return null;
    var a = sides(g)[0], b = sides(g)[1], ra = r.members[idOf(a)], rb = r.members[idOf(b)];
    if (!ra || !rb) return null;                       // only a conference game moves a conference race
    var ia = r.inRace[idOf(a)], ib = r.inRace[idOf(b)];
    if (!ia && !ib) return null;
    var you = ctx.name + " is " + rec(r.me) + " in the " + r.name + ".";
    if (ia && ib) return { strength: 0, why: a.name + " (" + rec(ra) + ") and " + b.name + " (" + rec(rb) + ") meet, both in the " + r.name + " race. " + you };
    var s = ia ? a : b, t = ia ? ra : rb, other = ia ? b : a;
    return { strength: 1, why: s.name + ", " + rec(t) + " in the " + r.name + ", plays " + (other.name || "TBD") + ". " + you };
  }

  function nextWhy(g, ctx) {
    if (!ctx.next) return null;
    var hit = sides(g).filter(function (s) { return idOf(s) === ctx.next.id; })[0];
    if (!hit) return null;
    var other = sides(g).filter(function (s) { return s !== hit; })[0] || {};
    return { strength: 0, why: hit.name + ", " + ctx.name + "’s opponent on " + day(ctx.next.date) + ", plays " +
                               named(other, ctx.lead[idOf(other)] || null) + "." };
  }

  function layers(o) {
    o = o || {};
    var games = (o.games || []).filter(Boolean), me = o.teamId != null ? String(o.teamId) : null;
    var conferences = o.conferences || {}, claimed = {};
    var confName = o.conference && !INDEPENDENT.test(o.conference) ? o.conference : null;
    var now = o.now ? +new Date(o.now) : Date.now(), name = o.teamName || "your team";

    // What the stakes are read from.
    var lead = rankMap((o.polls || [])[0]), myRank = me ? lead[me] || null : null;
    var cuts = (o.cutlines || []).filter(function (c) { return c && typeof c.at === "number"; });
    var lastCut = cuts.reduce(function (m, c) { return Math.max(m, c.at); }, 0);
    var contender = !!(myRank && lastCut && myRank <= lastCut + BUBBLE);
    var played = {}, upcoming = [];
    (o.schedule || []).forEach(function (s) {
      if (!s || s.oppProviderId == null) return;
      var id = String(s.oppProviderId), t = s.date ? +new Date(s.date) : NaN;
      if (s.state === "post") played[id] = s;
      else if (s.state !== "in" && !isNaN(t) && t >= now - 6 * 3600e3) upcoming.push({ id: id, date: s.date });
    });
    upcoming.sort(function (a, b) { return +new Date(a.date) - +new Date(b.date); });
    var mine = games.filter(function (g) { return g.mine; })[0];
    var thisWeek = mine ? ids(mine).filter(function (id) { return id && id !== me; })[0] : null;
    var ctx = { name: name, lead: lead, polls: o.polls || [], myRank: myRank, cuts: cuts, played: played,
                upcoming: upcoming, ever: o.everRanked || {},
                compete: myRank ? competitors(myRank, cuts) : function () { return null; },
                race: me ? raceOf(o, me) : null,
                next: upcoming.filter(function (u) { return u.id !== thisWeek; })[0] || null };

    // 1. games that matter
    var matter = [];
    games.forEach(function (g) {
      if (g.mine || (me && ids(g).indexOf(me) > -1)) return;
      // The first stake that applies is the game's label and sentence; the
      // later ones that also apply are kept as secondary facts (`also`).
      var picked = null;
      STAKES.forEach(function (st, i) {
        var r = null;
        if (st.kind === "playoff") r = contender && competitive(g, o) ? playoffWhy(g, ctx) : null;
        else if (st.kind === "resume") r = contender && competitive(g, o) ? resumeWhy(g, ctx) : null;
        else if (st.kind === "conference") r = conferenceWhy(g, ctx);
        else if (st.kind === "rivalry") r = rivalryWhy(g, o, ctx);
        else if (st.kind === "next") r = nextWhy(g, ctx);
        if (!r) return;
        if (picked) picked.also.push({ kind: st.kind, label: st.label, why: r.why });
        else picked = { game: g, kind: st.kind, label: st.label, why: [r.why], also: [], order: i, strength: r.strength };
      });
      if (picked) { claimed[g.id] = true; matter.push(picked); }
    });
    matter.sort(function (a, b) {
      return a.order - b.order || a.strength - b.strength || +new Date(a.game.date) - +new Date(b.game.date);
    });
    matter.forEach(function (m) { delete m.order; delete m.strength; });

    // 2. our conference: every other game with a member
    var conference = null;
    if (confName) {
      var cg = games.filter(function (g) {
        return !claimed[g.id] && ids(g).some(function (id) { return id && conferences[id] === confName; });
      });
      cg.forEach(function (g) { claimed[g.id] = true; });
      conference = { name: (o.short || {})[confName] || confName,
                     games: cg.map(function (g) { return { game: g, why: [] }; }) };
    }

    // 3. Top 25: the ranked games no layer above has listed
    var top25 = games.filter(function (g) {
      return !claimed[g.id] && ((g.home && g.home.rank) || (g.away && g.away.rank));
    });
    return { matter: matter, conference: conference, top25: top25 };
  }

  // The format in force for a season: its cutlines.
  function cutlinesFor(playoff, season) {
    var f = ((playoff && playoff.formats) || []).filter(function (x) {
      return x && season >= (x.from || 0) && (x.to == null || season <= x.to);
    })[0];
    return f ? (f.cutlines || []).slice() : [];
  }

  return { layers: layers, cutlinesFor: cutlinesFor, STAKES: STAKES, NEAR: NEAR };
})();
