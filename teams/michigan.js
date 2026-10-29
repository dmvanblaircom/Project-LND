/* Michigan - Phase 1, the rest of the Big Ten (David, 2026-10-27). Same
   shape as teams/indiana.js; nothing else changed.

   From GitHub's network on 2026-10-27: ESPN team 130, its home field as
   ESPN's schedule spells it (Michigan Stadium), and the beat feeds below
   (probe-feeds.yml). Approved with the phase's review sheet. */

var TEAM_CONFIG = {

  team: {
    id:           "michigan",
    name:         "Michigan",
    abbreviation: "MICH",
    sport:        "football",
    league:       "college-football",
    timeZone:     "America/Detroit",

    venue: {
      name: "Michigan Stadium",
      lat:  42.2658,
      lon: -83.7487
    }
  },

  sources: {
    espn: {
      teamId: "130",
      broadcastFallback: []
    },
    kalshi: {
      tickerSuffix: "-MICH",
      namePattern:  /(?<!western )(?<!central )(?<!eastern )\bmichigan\b(?! st)|wolverines/i
    },

    // The Big Ten's availability reports (tools/producers/conference_availability.py).
    official: {
      availabilityReportIndex: "https://bigten.org/sports/2026/9/10/FB_Availability_Reports.aspx",
      availabilityReportLabel: "BigTen.org",
      availabilityFeed: { provider: "hdintelligence", conference: "B10", sport: "Football", team: "Michigan" }
    },

    // Beat writers, read by the Action server-side; each answered from
    // GitHub's network on 2026-10-27. On3's team feeds carry league-wide
    // stories, so `paths` keeps only Michigan's section.
    // Not used: The Michigan Daily publishes only a whole-paper feed.
    beatFeeds: [
      { name: "Michigan Athletics", feed: "https://mgoblue.com/rss?path=football", site: "https://mgoblue.com/sports/football", logo: "https://mgoblue.com/favicon.ico" },
      { name: "Maize n Brew", feed: "https://www.maizenbrew.com/rss/current.xml", site: "https://www.maizenbrew.com/" },
      { name: "Michigan On SI", feed: "https://www.si.com/college/michigan/feed", site: "https://www.si.com/college/michigan", logo: "https://images2.minutemediacdn.com/image/upload/v1720431406/SI/ON_SI-Favicon_B_96x96_3.ico" },
      { name: "On3", feed: "https://www.on3.com/teams/michigan-wolverines/feed/", site: "https://www.on3.com/teams/michigan-wolverines/", paths: ["/teams/michigan-wolverines/"], logo: "https://on3static.com/static/on3/touch-icons/apple-touch-icon-180x180.png" }
    ]
  },

  series: [
    { match: /^michigan state( spartans)?$/i, name: "Paul Bunyan Trophy", kind: "trophy" },
    { match: /^minnesota( golden gophers)?$/i, name: "Little Brown Jug", kind: "trophy" },
    { match: /^ohio state( buckeyes)?$/i, name: "The Game", kind: "rivalry" }
  ],

  links: {
    roster: { url: "https://mgoblue.com/sports/football/roster", label: "mgoblue.com" }
  },

  // Michigan inside Suite: Michigan Blue PMS 282, Maize PMS 7406, every text pair checked at
  // 4.5:1 (tools/teamidentitycheck.js).
  identity: {
    programLabel: "MICHIGAN FOOTBALL",

    colors: {
      accent:         "#FFCB05",
      accentText:     "#FFCB05",
      accentOnLight:  "#00274C",
      accentInk:      "#00274C",
      accentSoft:     "#FFE276",
      accentTint:     "#FFF6D2",
      accentTintSoft: "#FFFBEB",
      focus:          "#FFFFFF",
      surface:        "#00274C",
      surfaceDeep:    "#001C37",
      surfaceAbyss:   "#001020",
      surfaceRaise:   "#1A3D5E"
    },

    // Michigan's Victors face is reserved for its wordmark and its brand site
    // does not answer GitHub's network; IBM Plex Sans is the University of
    // Michigan's royalty-free primary (Michigan Medicine's brand).
    fonts: {
      ui:       "'IBM Plex Sans','Instrument Sans',system-ui,-apple-system,sans-serif",
      display:  "'IBM Plex Sans','Instrument Display',sans-serif"
    }
  },

  // What .github/workflows/odds.yml commits for Michigan, each because a
  // source exists for it.
  snapshots: {
    availability: { file: "data/michigan/availability.json", history: "data/michigan/availability-history.json", label: "BigTen.org" },
    oddsHistory:  { file: "data/michigan/odds-history.json" },
    beatNews:     { file: "data/michigan/news.json" },
    recruits:     { file: "data/michigan/recruits.json", label: "ESPN recruiting" }
  }
};
