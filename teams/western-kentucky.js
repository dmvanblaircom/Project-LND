/* Western Kentucky - Phase 4b, the Sun Belt, the MAC, Conference USA and
   UConn (David, 2026-10-29). Same shape as teams/indiana.js; nothing else
   changed.

   From GitHub's network on 2026-10-29: ESPN team 98, its home field as
   ESPN's schedule spells it (Houchens Industries-L.T. Smith Stadium), and
   the beat feeds below (probe-feeds.yml). Approved with the phase's review
   sheet. */

var TEAM_CONFIG = {

  team: {
    id:           "western-kentucky",
    name:         "Western Kentucky",
    abbreviation: "WKU",
    sport:        "football",
    league:       "college-football",
    timeZone:     "America/Chicago",

    venue: {
      name: "Houchens Industries-L.T. Smith Stadium",
      lat:  36.9846,
      lon: -86.4594
    }
  },

  sources: {
    espn: {
      teamId: "98",
      broadcastFallback: []
    },

    // Conference USA publishes no availability reports that HD Intelligence
    // carries or that could be found on conferenceusa.com (2026-10-29), so
    // none are shown.

    // Beat writers, read by the Action server-side; each answered from
    // GitHub's network on 2026-10-29.
    // Not used: On SI has no WKU site (404), and On3's feed carries only
    // national stories.
    beatFeeds: [
      { name: "WKU Athletics", feed: "https://wkusports.com/rss?path=football", site: "https://wkusports.com/sports/football", logo: "https://wkusports.com/favicon.ico" },
      { name: "College Heights Herald", feed: "https://wkuherald.com/category/sports/feed/", site: "https://wkuherald.com/category/sports/", sportsSection: true }
    ]
  },

  series: [
    { match: /^middle tennessee( blue raiders)?$/i, name: "100 Miles of Hate", kind: "rivalry" }
  ],

  links: {
    roster: { url: "https://wkusports.com/sports/football/roster", label: "wkusports.com" }
  },

  // Western Kentucky inside Suite: Red (ESPN's), white, every text pair checked at
  // 4.5:1 (tools/teamidentitycheck.js). surface deepened 10% from #E13A3E to carry white text and to read as ink on the page.
  identity: {
    programLabel: "WKU FOOTBALL",

    colors: {
      accent:         "#FFFFFF",
      accentText:     "#FFFFFF",
      accentOnLight:  "#CA3438",
      accentInk:      "#CA3438",
      accentSoft:     "#FFFFFF",
      accentTint:     "#F5DADB",
      accentTintSoft: "#FBEFEF",
      focus:          "#FFFFFF",
      surface:        "#CA3438",
      surfaceDeep:    "#912528",
      surfaceAbyss:   "#551618",
      surfaceRaise:   "#CC3C40"
    },

    // The Group of Five read in Suite's own faces (David's plan for the FBS
    // build-out); the school's colours carry its identity.
    fonts: {
      ui:       "'Instrument Sans',system-ui,-apple-system,sans-serif",
      display:  "'Instrument Display',sans-serif"
    }
  },

  // What .github/workflows/odds.yml commits for Western Kentucky, each because a
  // source exists for it.
  snapshots: {
    beatNews:     { file: "data/western-kentucky/news.json" },
    recruits:     { file: "data/western-kentucky/recruits.json", label: "ESPN recruiting" }
  }
};
