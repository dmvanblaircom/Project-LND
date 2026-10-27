/* Wisconsin - Phase 1, the rest of the Big Ten (David, 2026-10-27). Same
   shape as teams/indiana.js; nothing else changed.

   From GitHub's network on 2026-10-27: ESPN team 275, its home field as
   ESPN's schedule spells it (Camp Randall Stadium), and the beat feeds below
   (probe-feeds.yml). Approved with the phase's review sheet. */

var TEAM_CONFIG = {

  team: {
    id:           "wisconsin",
    name:         "Wisconsin",
    abbreviation: "WIS",
    sport:        "football",
    league:       "college-football",
    timeZone:     "America/Chicago",

    venue: {
      name: "Camp Randall Stadium",
      lat:  43.0700,
      lon: -89.4128
    }
  },

  sources: {
    espn: {
      teamId: "275",
      broadcastFallback: []
    },
    kalshi: {
      tickerSuffix: "-WIS",
      namePattern:  /wisconsin|badgers/i
    },

    // The Big Ten's availability reports (tools/producers/conference_availability.py).
    official: {
      availabilityReportIndex: "https://bigten.org/sports/2026/9/10/FB_Availability_Reports.aspx",
      availabilityReportLabel: "BigTen.org",
      availabilityFeed: { provider: "hdintelligence", conference: "B10", sport: "Football", team: "Wisconsin" }
    },

    // Beat writers, read by the Action server-side; each answered from
    // GitHub's network on 2026-10-27. On3's team feeds carry league-wide
    // stories, so `paths` keeps only Wisconsin's section.
    // Not used: No On3 team feed (404); the Daily Cardinal has no working
    // feed.
    beatFeeds: [
      { name: "Wisconsin Athletics", feed: "https://uwbadgers.com/rss?path=football", site: "https://uwbadgers.com/sports/football", logo: "https://uwbadgers.com/favicon.ico" },
      { name: "Bucky’s 5th Quarter", feed: "https://www.buckys5thquarter.com/rss/current.xml", site: "https://www.buckys5thquarter.com/" },
      { name: "Wisconsin On SI", feed: "https://www.si.com/college/wisconsin/feed", site: "https://www.si.com/college/wisconsin", logo: "https://images2.minutemediacdn.com/image/upload/v1720431406/SI/ON_SI-Favicon_B_96x96_3.ico" },
      { name: "The Badger Herald", feed: "https://badgerherald.com/sports/feed/", site: "https://badgerherald.com/sports/" }
    ]
  },

  series: [
    { match: /^minnesota( golden gophers)?$/i, name: "Paul Bunyan’s Axe", kind: "trophy" },
    { match: /^iowa( hawkeyes)?$/i, name: "Heartland Trophy", kind: "trophy" }
  ],

  links: {
    roster: { url: "https://uwbadgers.com/sports/football/roster", label: "uwbadgers.com" }
  },

  // Wisconsin inside Suite: Badger Red (brand.wisc.edu), white, every text pair checked at
  // 4.5:1 (tools/teamidentitycheck.js).
  identity: {
    programLabel: "WISCONSIN FOOTBALL",

    colors: {
      accent:         "#FFFFFF",
      accentText:     "#FFFFFF",
      accentOnLight:  "#C5050C",
      accentInk:      "#C5050C",
      accentSoft:     "#FFFFFF",
      accentTint:     "#F5D2D3",
      accentTintSoft: "#FAEBEC",
      focus:          "#FFFFFF",
      surface:        "#C5050C",
      surfaceDeep:    "#8E0409",
      surfaceAbyss:   "#530205",
      surfaceRaise:   "#CB1E24"
    },

    // Wisconsin's brand faces are Red Hat Display and Red Hat Text, both
    // free: used as they are.
    fonts: {
      ui:       "'Red Hat Text','Instrument Sans',system-ui,-apple-system,sans-serif",
      display:  "'Red Hat Display','Instrument Display',sans-serif"
    }
  },

  // What .github/workflows/odds.yml commits for Wisconsin, each because a
  // source exists for it.
  snapshots: {
    availability: { file: "data/wisconsin/availability.json", history: "data/wisconsin/availability-history.json", label: "BigTen.org" },
    oddsHistory:  { file: "data/wisconsin/odds-history.json" },
    beatNews:     { file: "data/wisconsin/news.json" },
    recruits:     { file: "data/wisconsin/recruits.json", label: "ESPN recruiting" }
  }
};
