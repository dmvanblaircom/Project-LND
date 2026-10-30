/* Delaware - Phase 4b, the Sun Belt, the MAC, Conference USA and UConn
   (David, 2026-10-29). Same shape as teams/indiana.js; nothing else changed.

   From GitHub's network on 2026-10-29: ESPN team 48, its home field as
   ESPN's schedule spells it (Delaware Stadium), and the beat feeds below
   (probe-feeds.yml). Approved with the phase's review sheet. */

var TEAM_CONFIG = {

  team: {
    id:           "delaware",
    name:         "Delaware",
    abbreviation: "DEL",
    sport:        "football",
    league:       "college-football",
    timeZone:     "America/New_York",

    venue: {
      name: "Delaware Stadium",
      lat:  39.6630,
      lon: -75.7492
    }
  },

  sources: {
    espn: {
      teamId: "48",
      broadcastFallback: []
    },

    // Conference USA publishes no availability reports that HD Intelligence
    // carries or that could be found on conferenceusa.com (2026-10-29), so
    // none are shown.

    // Beat writers, read by the Action server-side; each answered from
    // GitHub's network on 2026-10-29.
    // Not used: On SI has no Delaware site (404), and there is no On3 team
    // feed (404).
    beatFeeds: [
      { name: "Delaware Athletics", feed: "https://bluehens.com/rss?path=football", site: "https://bluehens.com/sports/football", logo: "https://bluehens.com/favicon.ico" },
      { name: "The Review", feed: "https://udreview.com/category/sports/feed/", site: "https://udreview.com/category/sports/", sportsSection: true }
    ]
  },

  series: [

  ],

  links: {
    // Where the program posts its game notes (Game links to it; David,
    // 2026-10-30): its schedule, where each game's notes are posted.
    gameNotes: { url: "https://bluehens.com/sports/football/schedule", label: "bluehens.com", kind: "schedule" },
    roster: { url: "https://bluehens.com/sports/football/roster", label: "bluehens.com" }
  },

  // Delaware inside Suite: Blue, Gold (ESPN's), every text pair checked at
  // 4.5:1 (tools/teamidentitycheck.js).
  identity: {
    programLabel: "DELAWARE FOOTBALL",

    colors: {
      accent:         "#FFD200",
      accentText:     "#FFD200",
      accentOnLight:  "#00539F",
      accentInk:      "#00539F",
      accentSoft:     "#FFE673",
      accentTint:     "#FFF7D1",
      accentTintSoft: "#FFFBEB",
      focus:          "#FFFFFF",
      surface:        "#00539F",
      surfaceDeep:    "#003C72",
      surfaceAbyss:   "#002343",
      surfaceRaise:   "#1A64A9"
    },

    // The Group of Five read in Suite's own faces (David's plan for the FBS
    // build-out); the school's colours carry its identity.
    fonts: {
      ui:       "'Instrument Sans',system-ui,-apple-system,sans-serif",
      display:  "'Instrument Display',sans-serif"
    }
  },

  // What .github/workflows/odds.yml commits for Delaware, each because a
  // source exists for it.
  snapshots: {
    beatNews:     { file: "data/delaware/news.json" },
    recruits:     { file: "data/delaware/recruits.json", label: "ESPN recruiting" }
  }
};
