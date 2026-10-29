/* Stanford - Phase 3, the Big 12 and the ACC (David, 2026-10-28). Same
   shape as teams/indiana.js; nothing else changed.

   From GitHub's network on 2026-10-28: ESPN team 24, its home field as
   ESPN's schedule spells it (Stanford Stadium), and the beat feeds below
   (probe-feeds.yml). Approved with the phase's review sheet. */

var TEAM_CONFIG = {

  team: {
    id:           "stanford",
    name:         "Stanford",
    abbreviation: "STAN",
    sport:        "football",
    league:       "college-football",
    timeZone:     "America/Los_Angeles",

    venue: {
      name: "Stanford Stadium",
      lat:  37.4346,
      lon: -122.1609
    }
  },

  sources: {
    espn: {
      teamId: "24",
      broadcastFallback: []
    },

    // The ACC's availability reports (tools/producers/conference_availability.py).
    official: {
      availabilityReportIndex: "https://theacc.com/sports/2025/8/28/availability-reporting-football.aspx",
      availabilityReportLabel: "TheACC.com",
      availabilityFeed: { provider: "hdintelligence", conference: "ACC", sport: "Football", team: "Stanford" }
    },

    // Beat writers, read by the Action server-side; each answered from
    // GitHub's network on 2026-10-28.
    // Not used: One source only: gostanford.com's feed is every sport, Rule
    // of Tree (SB Nation) did not answer, there is no On3 team feed (404),
    // and Stanford On SI has published nothing since May.
    beatFeeds: [
      { name: "The Stanford Daily", feed: "https://stanforddaily.com/category/sports/feed/", site: "https://stanforddaily.com/category/sports/", sportsSection: true },
      { name: "Cardinal Sports Report", feed: "https://www.on3.com/sites/cardinal-sports-report/feed/", site: "https://www.on3.com/sites/cardinal-sports-report/", paths: ["/sites/cardinal-sports-report/"], logo: "https://on3static.com/static/on3/touch-icons/apple-touch-icon-180x180.png", sportsSection: true }
    ]
  },

  series: [
    { match: /^california( golden bears)?$|^cal( golden bears)?$/i, name: "Big Game", kind: "trophy" },
    { match: /^notre dame( fighting irish)?$/i, name: "Legends Trophy", kind: "trophy" }
  ],

  links: {
    roster: { url: "https://gostanford.com/sports/football/roster", label: "gostanford.com" }
  },

  // Stanford inside Suite: Cardinal Red, white, every text pair checked at
  // 4.5:1 (tools/teamidentitycheck.js).
  identity: {
    programLabel: "STANFORD FOOTBALL",

    colors: {
      accent:         "#FFFFFF",
      accentText:     "#FFFFFF",
      accentOnLight:  "#8C1515",
      accentInk:      "#8C1515",
      accentSoft:     "#FFFFFF",
      accentTint:     "#EAD5D5",
      accentTintSoft: "#F6ECEC",
      focus:          "#FFFFFF",
      surface:        "#8C1515",
      surfaceDeep:    "#650F0F",
      surfaceAbyss:   "#3B0909",
      surfaceRaise:   "#982C2C"
    },

    // Stanford's brand faces are Source Sans 3 and Source Serif 4, free
    // (identity.stanford.edu): Source Sans 3 used as it is.
    fonts: {
      ui:       "'Source Sans 3','Instrument Sans',system-ui,-apple-system,sans-serif",
      display:  "'Source Sans 3','Instrument Display',sans-serif"
    }
  },

  // What .github/workflows/odds.yml commits for Stanford, each because a
  // source exists for it.
  snapshots: {
    availability: { file: "data/stanford/availability.json", history: "data/stanford/availability-history.json", label: "TheACC.com" },
    beatNews:     { file: "data/stanford/news.json" },
    recruits:     { file: "data/stanford/recruits.json", label: "ESPN recruiting" }
  }
};
