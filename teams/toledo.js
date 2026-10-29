/* Toledo - Phase 4b, the Sun Belt, the MAC, Conference USA and UConn (David,
   2026-10-29). Same shape as teams/indiana.js; nothing else changed.

   From GitHub's network on 2026-10-29: ESPN team 2649, its home field as
   ESPN's schedule spells it (Glass Bowl), and the beat feeds below (probe-
   feeds.yml). Approved with the phase's review sheet. */

var TEAM_CONFIG = {

  team: {
    id:           "toledo",
    name:         "Toledo",
    abbreviation: "TOL",
    sport:        "football",
    league:       "college-football",
    timeZone:     "America/New_York",

    venue: {
      name: "Glass Bowl",
      lat:  41.6567,
      lon: -83.6136
    }
  },

  sources: {
    espn: {
      teamId: "2649",
      broadcastFallback: []
    },

    // The MAC's availability reports (tools/producers/conference_availability.py).
    official: {
      availabilityReportIndex: "https://getsomemaction.com/sports/football",
      availabilityReportLabel: "GetSomeMACtion.com",
      availabilityFeed: { provider: "hdintelligence", conference: "MAC", sport: "Football", team: "Toledo" }
    },

    // Beat writers, read by the Action server-side; each answered from
    // GitHub's network on 2026-10-29.
    // One source only: the Independent Collegian's feed address now leads to
    // an unrelated site, On SI has no Toledo site (404), and On3's feed
    // carries only national stories.
    beatFeeds: [
      { name: "Toledo Athletics", feed: "https://utrockets.com/rss?path=football", site: "https://utrockets.com/sports/football", logo: "https://utrockets.com/favicon.ico" }
    ]
  },

  series: [
    { match: /^bowling green( falcons)?$/i, name: "Battle of I-75", kind: "trophy" }
  ],

  links: {
    roster: { url: "https://utrockets.com/sports/football/roster", label: "utrockets.com" }
  },

  // Toledo inside Suite: Navy, Gold (ESPN's), every text pair checked at
  // 4.5:1 (tools/teamidentitycheck.js).
  identity: {
    programLabel: "TOLEDO FOOTBALL",

    colors: {
      accent:         "#FFCD00",
      accentText:     "#FFCD00",
      accentOnLight:  "#0B2240",
      accentInk:      "#0B2240",
      accentSoft:     "#FFE473",
      accentTint:     "#FFF6D1",
      accentTintSoft: "#FFFBEB",
      focus:          "#FFFFFF",
      surface:        "#0B2240",
      surfaceDeep:    "#08182E",
      surfaceAbyss:   "#050E1B",
      surfaceRaise:   "#233853"
    },

    // The Group of Five read in Suite's own faces (David's plan for the FBS
    // build-out); the school's colours carry its identity.
    fonts: {
      ui:       "'Instrument Sans',system-ui,-apple-system,sans-serif",
      display:  "'Instrument Display',sans-serif"
    }
  },

  // What .github/workflows/odds.yml commits for Toledo, each because a
  // source exists for it.
  snapshots: {
    availability: { file: "data/toledo/availability.json", history: "data/toledo/availability-history.json", label: "GetSomeMACtion.com" },
    beatNews:     { file: "data/toledo/news.json" },
    recruits:     { file: "data/toledo/recruits.json", label: "ESPN recruiting" }
  }
};
