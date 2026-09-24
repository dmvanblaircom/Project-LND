/* TeamOS - the rules about a team's games that every surface must agree on.

   Pure functions over normalized Games (teamos/espn.js makes them; this file
   never sees a provider payload). Each is ONE named policy, so Home, Game,
   Schedule and the nav cannot disagree about what a game is doing
   (decisions 0022, 0024):

     navState(game)            which Game control the nav shows: "live",
                               "delayed", "suspended" or null
     lifecycle(game)           pregame | live | final, and that lifecycle's
                               Game views with its default first
     hero(games, now, tz)      the ONE game Home is about, and why
     recentFinal(game, now, tz)  does a final still own the hero?
     atmosphere(game, zone)    "day" or "night" from the local kickoff
     venueZone(game, fallback) the venue's time zone, as near as TeamOS knows
     localDay(date, zone)      a date's calendar day in a zone, "YYYY-MM-DD"
     schedulePreview(games, now, tz)
                               Home's three schedule rows around the hero

   Display times are the fan's device's (0022 #1); these policies use the
   team's or venue's local calendar where the policy itself is local.

   This file names no team and no provider. */

var TeamOS = TeamOS || {};

TeamOS.game = (function () {
  "use strict";

  // Under way: play has begun and the game is not over. Live, or paused by
  // a delay or suspension after kickoff.
  function underWay(g) {
    if (!g) return false;
    if (g.status === "live") return true;
    return (g.status === "delayed" || g.status === "suspended") && !!g.hasStarted;
  }

  // The nav (0024 §14). A delay BEFORE kickoff is not a game under way: the
  // Game control stays normal. Only an actually active game is "live",
  // which is the only state that pulses.
  function navState(g) {
    if (!underWay(g)) return null;
    return g.status === "live" ? "live" : g.status;
  }

  // The Game screen's views by lifecycle (0022 #6, 0024 §7, §15). Pregame
  // has one real destination - Game Details - so no tab strip is drawn for
  // it; Tickets is hidden in v1. A game paused mid-play keeps the live set.
  var VIEWS = {
    pregame: [{ id: "details", label: "Game Details" }],
    live:    [{ id: "drive", label: "Drive Tracker" }, { id: "box", label: "Box Score" },
              { id: "plays", label: "Plays" }, { id: "stats", label: "Stats" }],
    final:   [{ id: "box", label: "Box Score" }, { id: "plays", label: "Plays" },
              { id: "stats", label: "Stats" }]
  };
  function lifecycle(g) {
    var phase = !g ? "pregame"
      : g.status === "final" ? "final"
      : underWay(g) ? "live"
      : "pregame";                     // scheduled, delayed before kickoff, postponed, canceled
    return { phase: phase, views: VIEWS[phase].slice(), defaultView: VIEWS[phase][0].id };
  }

  // ---- calendars ----

  // The calendar day a moment falls on in a zone: "2026-09-19". en-CA
  // formats as YYYY-MM-DD, which also sorts and compares as a string.
  function localDay(date, zone) {
    var d = date instanceof Date ? date : new Date(date);
    if (isNaN(d)) return null;
    return new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
  }
  function nextDay(day) {
    var p = day.split("-").map(Number);
    var d = new Date(Date.UTC(p[0], p[1] - 1, p[2] + 1));
    return d.toISOString().slice(0, 10);
  }
  function localHour(date, zone) {
    var d = date instanceof Date ? date : new Date(date);
    var h = new Intl.DateTimeFormat("en-US", { timeZone: zone, hour: "numeric", hourCycle: "h23" }).format(d);
    return Number(h);
  }

  // The recent-final policy (0022 #10): a final owns the Home hero through
  // the END of the calendar day after its game day, in the team's local
  // time - "today / tonight / yesterday", not a rolling 24 hours. The game
  // day is the local day of kickoff, so a night game that ends after
  // midnight still counts from the day it was played.
  function recentFinal(g, now, zone) {
    if (!g || !g.date) return false;
    var played = localDay(g.date, zone), today = localDay(now, zone);
    if (!played || !today) return false;
    return today >= played && today <= nextDay(played);
  }

  // How long after a listed kickoff a game that has not started is still
  // "the next game" rather than history. A delay can run long; a stale
  // listing should not hold Home for a day.
  var GRACE_MS = 4 * 60 * 60 * 1000;

  // The hero rule (0022 #5, #10; 0024 §3). One game, and why:
  //   live          under way, paused or not
  //   recent-final  a final, or a postponement whose date has passed, still
  //                 inside the recent-final window
  //   upcoming      the next scheduled, delayed-before-kickoff or postponed
  //                 game by date
  //   canceled      a canceled game, only when no other game is still to come
  //   season-over   nothing to come and no recent final. What owns the hero
  //                 then is an OPEN product decision, so no game is chosen:
  //                 `game` is null and `last` is the last game played, for
  //                 whatever Product decides (review of 2026-09-24).
  //   none          no games at all
  function hero(games, now, zone) {
    var list = (games || []).filter(function (g) { return g && g.date; }).slice()
      .sort(function (a, b) { return Date.parse(a.date) - Date.parse(b.date); });
    var t = (now instanceof Date ? now : new Date(now)).getTime();
    if (!list.length) return { game: null, reason: "none" };

    var live = list.filter(underWay);
    if (live.length) return { game: live[0], reason: "live" };

    var recent = list.filter(function (g) {
      var past = g.status === "final" || (g.status === "postponed" && Date.parse(g.date) <= t);
      return past && recentFinal(g, now, zone);
    });
    if (recent.length) return { game: recent[recent.length - 1], reason: "recent-final" };

    var upcoming = list.filter(function (g) {
      if (g.status === "delayed" && !g.hasStarted) return true;
      if (g.status !== "scheduled" && g.status !== "postponed") return false;
      return Date.parse(g.date) >= t - GRACE_MS;
    });
    if (upcoming.length) return { game: upcoming[0], reason: "upcoming" };

    var canceled = list.filter(function (g) { return g.status === "canceled" && Date.parse(g.date) >= t - GRACE_MS; });
    if (canceled.length) return { game: canceled[0], reason: "canceled" };

    var played = list.filter(function (g) { return g.status === "final"; });
    return { game: null, reason: "season-over", last: played.length ? played[played.length - 1] : list[list.length - 1] };
  }

  // ---- atmosphere ----

  // Day or night (0022 #11): kickoff before 6:00 PM in the game's local time
  // is DAY, 6:00 PM or later is NIGHT. From the kickoff alone - never from
  // the weather. A kickoff time not yet announced has no atmosphere.
  var NIGHT_FROM = 18;
  function atmosphere(g, zone) {
    if (!g || !g.date || g.timeSet === false || !zone) return null;
    return localHour(g.date, zone) >= NIGHT_FROM ? "night" : "day";
  }

  // The venue's zone. The schedule gives a venue's state, not its zone, so
  // this is the state's zone - exact for most of FBS, and for the states
  // that straddle two zones it is the zone most of the state's FBS venues
  // use. A caller with better knowledge (a forecast that reports the
  // venue's zone) passes that instead; with no state, the fallback stands.
  var STATE_ZONE = {
    AL: "America/Chicago", AK: "America/Anchorage", AZ: "America/Phoenix", AR: "America/Chicago",
    CA: "America/Los_Angeles", CO: "America/Denver", CT: "America/New_York", DE: "America/New_York",
    DC: "America/New_York", FL: "America/New_York", GA: "America/New_York", HI: "Pacific/Honolulu",
    ID: "America/Boise", IL: "America/Chicago", IN: "America/Indiana/Indianapolis", IA: "America/Chicago",
    KS: "America/Chicago", KY: "America/New_York", LA: "America/Chicago", ME: "America/New_York",
    MD: "America/New_York", MA: "America/New_York", MI: "America/Detroit", MN: "America/Chicago",
    MS: "America/Chicago", MO: "America/Chicago", MT: "America/Denver", NE: "America/Chicago",
    NV: "America/Los_Angeles", NH: "America/New_York", NJ: "America/New_York", NM: "America/Denver",
    NY: "America/New_York", NC: "America/New_York", ND: "America/Chicago", OH: "America/New_York",
    OK: "America/Chicago", OR: "America/Los_Angeles", PA: "America/New_York", RI: "America/New_York",
    SC: "America/New_York", SD: "America/Chicago", TN: "America/Chicago", TX: "America/Chicago",
    UT: "America/Denver", VT: "America/New_York", VA: "America/New_York", WA: "America/Los_Angeles",
    WV: "America/New_York", WI: "America/Chicago", WY: "America/Denver", PR: "America/Puerto_Rico"
  };
  // Where a state straddles zones and its FBS venues do too, the city decides.
  var CITY_ZONE = {
    "TN|knoxville": "America/New_York",      // Tennessee; Memphis and Murfreesboro are Central
    "TX|el paso": "America/Denver",          // UTEP; the rest of Texas is Central
    "KY|bowling green": "America/Chicago"    // Western Kentucky; Louisville and Lexington are Eastern
  };
  function venueZone(g, fallback) {
    var st = g && String(g.venueState || "").trim().toUpperCase();
    var city = g && String(g.city || "").trim().toLowerCase();
    if (st && CITY_ZONE[st + "|" + city]) return CITY_ZONE[st + "|" + city];
    if (st && STATE_ZONE[st]) return STATE_ZONE[st];
    return fallback || null;
  }

  // ---- Home's schedule preview (0024 §3) ----
  //
  // At most three rows, chronological, and the hero game is always one of
  // them. Around it:
  //   live, paused, recent final, postponed hero   the hero, then the next 2
  //   upcoming, in season (or a canceled hero)     the entry before it, the
  //                                                hero, the one after
  //   nothing completed yet                        the first 3
  //   season over / no future games                the last 3
  // A side that runs short is filled from the nearest entries on the other
  // side. Postponed and canceled games are entries like any other (0022 #8).
  var PREVIEW = 3;
  function schedulePreview(games, now, zone) {
    var list = (games || []).filter(function (x) { return x && x.date; }).slice()
      .sort(function (a, b) { return Date.parse(a.date) - Date.parse(b.date); });
    var n = list.length;
    if (n <= PREVIEW) return list;
    var h = hero(list, now, zone), i = list.indexOf(h.game);
    if (h.reason === "season-over" || h.reason === "none" || i < 0) return list.slice(n - PREVIEW);
    var anyPlayed = list.some(function (x) { return x.status === "final"; });
    if (!anyPlayed && h.reason === "upcoming" && h.game.status !== "postponed") return list.slice(0, PREVIEW);

    var before = (h.reason === "upcoming" || h.reason === "canceled") && h.game.status !== "postponed" ? 1 : 0;
    var start = i - before, end = start + PREVIEW - 1;
    if (end > n - 1) { start -= end - (n - 1); end = n - 1; }
    if (start < 0) { end -= start; start = 0; }
    return list.slice(start, end + 1);
  }

  // ---- results ----

  // Schedule and Results (0022 #8): the season chronology keeps every entry,
  // postponed and canceled included; Results holds only games genuinely
  // completed. A canceled game is not a result, and neither is a final the
  // source reports without a score. Chronological, like the season.
  function results(games) {
    return byDate(games || []).filter(function (g) {
      return g.status === "final" && g.us != null && g.them != null && g.us !== "" && g.them !== "";
    });
  }
  function season(games) { return byDate(games || []); }
  function byDate(list) {
    return list.slice().sort(function (a, b) { return new Date(a.date) - new Date(b.date); });
  }

  return { navState: navState, underWay: underWay, lifecycle: lifecycle, hero: hero,
           recentFinal: recentFinal, atmosphere: atmosphere, venueZone: venueZone,
           localDay: localDay, schedulePreview: schedulePreview, results: results, season: season,
           NIGHT_FROM: NIGHT_FROM };
})();
