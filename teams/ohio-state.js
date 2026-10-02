/* Ohio State - the second team, and the architecture's proof.

   Same shape as teams/notre-dame.js, nothing else changed: the page loads
   this file instead (/?team=ohio-state) and the same app renders the
   Buckeyes. What came out right and what came out wrong is recorded in
   docs/engineering/phase-5a-ohio-state-proof.md.

   Values verified against the feeds on 2026-09-18: ESPN team 194 spells the
   home field "Ohio Stadium"; Kalshi's championship and playoff markets are
   KXNCAAF-27-OSU and KXNCAAFPLAYOFF-26-OSU, named "Ohio St.". */

var TEAM_CONFIG = {

  team: {
    id:           "ohio-state",
    name:         "Ohio State",
    abbreviation: "OSU",
    sport:        "football",
    league:       "college-football",
    timeZone:     "America/New_York",   // the local calendar for team policies

    venue: {
      name: "Ohio Stadium",
      lat:  40.0017,
      lon: -83.0197
    }
  },

  sources: {
    espn: {
      teamId: "194",
      broadcastFallback: []
    },
    kalshi: {
      tickerSuffix: "-OSU",
      namePattern:  /ohio st|buckeyes/i
    },

    // Beat writers, read by the Action server-side (RSS sends no CORS
    // header). Each was confirmed from GitHub's network on 2026-10-02 and
    // approved by David (docs/engineering/ohio-state-sources.md): the
    // athletics department's own football feed, SB Nation, SI, On3, and the
    // student paper's football section.
    beatFeeds: [
      { name: "Ohio State Athletics",  feed: "https://ohiostatebuckeyes.com/rss?path=football",               site: "https://ohiostatebuckeyes.com/sports/football/" },
      { name: "Land-Grant Holy Land",  feed: "https://www.landgrantholyland.com/rss/current.xml",            site: "https://www.landgrantholyland.com/" },
      { name: "Ohio State On SI",      feed: "https://www.si.com/college/ohiostate/feed",                    site: "https://www.si.com/college/ohiostate" },
      { name: "On3",                   feed: "https://www.on3.com/teams/ohio-state-buckeyes/feed/",          site: "https://www.on3.com/teams/ohio-state-buckeyes/" },
      { name: "The Lantern",           feed: "https://www.thelantern.com/category/sports/football/feed/",    site: "https://www.thelantern.com/category/sports/football/" }
    ]
  },

  // Trophy and rivalry names, matched on the opponent's name. kind (W21):
  // "trophy" is played for and gets the trophy mark; "rivalry" is a name
  // with nothing to win - Michigan is The Game, shown as itself, never as
  // "Playing for the The Game" (David approved it, 2026-10-01). Other Ohio
  // State rivalry names wait for W20's source work.
  series: [
    { match: /illinois/i,               name: "Illibuck Trophy", kind: "trophy" },
    { match: /^michigan( wolverines)?$/i, name: "The Game",       kind: "rivalry" }
  ],

  links: {
    roster: { url: "https://ohiostatebuckeyes.com/sports/football/roster", label: "ohiostatebuckeyes.com" }
  },

  // Ohio State inside Suite. Values from Ohio State's current BUX palette; the
  // accent is scarlet and it is a FILL, not a typeface - 2.88:1 on the
  // charcoal foundation - so accentText is BUX gray-light and scarlet is
  // kept for rules, indicators, active states and team markers. That is
  // the accessibility direction BUX itself gives for dark surfaces.
  identity: {
    programLabel: "OHIO STATE FOOTBALL",

    // No tagline: "Leave No Doubt." is Notre Dame's, not the platform's.
    tagline: null,

    colors: {
      accent:         "#BA0C2F",   // BUX scarlet
      accentText:     "#EFF1F2",   // BUX gray-light-80, 16.77:1 on the page
      accentOnLight:  "#BA0C2F",   // scarlet as text on ivory/white: 6.01:1 / 6.60:1
      accentInk:      "#FFFFFF",   // on a scarlet fill, 6.60:1
      accentSoft:     "#A7B1B7",   // BUX gray, 8.70:1 - small labels
      accentTint:     "#EFF1F2",
      accentTintSoft: "#F6F7F8",   // BUX gray-light-90
      focus:          "#EFF1F2",

      surface:        "#212325",   // BUX gray-dark-80
      surfaceDeep:    "#0B1115",
      surfaceAbyss:   "#070A0C",
      surfaceRaise:   "#3F4443"    // BUX gray-dark-60
    },

    // Ohio State's own webfonts are not available for independent use
    // (Ohio State's brand center, 2026-09-29). Nunito Sans is the public
    // face it recommended to stay close to the brand (2026-10-01; "not
    // Nunito"), self-hosted in assets/fonts/nunito-sans/ and declared in
    // app.css. One face for text and headings, as Ohio State sets both in
    // one family; David approved, 2026-10-01.
    fonts: {
      ui:       "'Nunito Sans','Barlow',system-ui,-apple-system,sans-serif",
      display:  "'Nunito Sans','Barlow Condensed',sans-serif"
    }
  },

  // The snapshots .github/workflows/odds.yml commits for Ohio State, each
  // because a source exists for it (W20). Price history is read from the
  // Kalshi markets above, going forward from 2026-10-02 - never back-filled;
  // the beat stories from sources.beatFeeds. Ohio State publishes no weekly
  // depth chart (a credited projection waits on permission, decision 0032);
  // the Big Ten's availability reports come when their listing is found. A kind left out
  // shows as unavailable, never as Notre Dame's (Phase 5B).
  snapshots: {
    oddsHistory: { file: "data/ohio-state/odds-history.json" },
    beatNews:    { file: "data/ohio-state/news.json" }
  }
};
