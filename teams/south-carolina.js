/* South Carolina - Phase 2, the SEC (David, 2026-10-28). Same
   shape as teams/indiana.js; nothing else changed.

   From GitHub's network on 2026-10-28: ESPN team 2579, its home field as
   ESPN's schedule spells it (Williams-Brice Stadium), and the beat feeds below
   (probe-feeds.yml). Approved with the phase's review sheet. */

var TEAM_CONFIG = {

  team: {
    id:           "south-carolina",
    name:         "South Carolina",
    abbreviation: "SC",
    sport:        "football",
    league:       "college-football",
    timeZone:     "America/New_York",

    venue: {
      name: "Williams-Brice Stadium",
      lat:  33.9729,
      lon: -81.0192
    }
  },

  sources: {
    espn: {
      teamId: "2579",
      broadcastFallback: []
    },
    kalshi: {
      tickerSuffix: "-SCAR",
      namePattern:  /south carolina(?! st)|gamecocks/i
    },

    // The SEC's availability reports (tools/producers/conference_availability.py).
    official: {
      availabilityReportIndex: "https://www.secsports.com/fbreports",
      availabilityReportLabel: "SECsports.com",
      availabilityFeed: { provider: "hdintelligence", conference: "SEC", sport: "Football", team: "South Carolina" }
    },

    // Beat writers, read by the Action server-side; each answered from
    // GitHub's network on 2026-10-28. On3's team feeds carry league-wide
    // stories, so `paths` keeps only South Carolina's section.
    // Not used: Garnet and Black Attack (SB Nation) did not answer GitHub's
    // network; the Daily Gamecock turned it away (405).
    beatFeeds: [
      { name: "South Carolina Athletics", feed: "https://gamecocksonline.com/rss?path=football", site: "https://gamecocksonline.com/sports/football", logo: "https://gamecocksonline.com/favicon.ico" },
      { name: "South Carolina On SI", feed: "https://www.si.com/college/southcarolina/feed", site: "https://www.si.com/college/southcarolina", logo: "https://images2.minutemediacdn.com/image/upload/v1720431406/SI/ON_SI-Favicon_B_96x96_3.ico" },
      { name: "On3", feed: "https://www.on3.com/teams/south-carolina-gamecocks/feed/", site: "https://www.on3.com/teams/south-carolina-gamecocks/", paths: ["/teams/south-carolina-gamecocks/"], logo: "https://on3static.com/static/on3/touch-icons/apple-touch-icon-180x180.png" }
    ]
  },

  series: [
    { match: /^clemson( tigers)?$/i, name: "Palmetto Bowl", kind: "trophy" }
  ],

  links: {
    roster: { url: "https://gamecocksonline.com/sports/football/roster", label: "gamecocksonline.com" }
  },

  // South Carolina inside Suite: Garnet (sc.edu), white, every text pair checked at
  // 4.5:1 (tools/teamidentitycheck.js).
  identity: {
    programLabel: "SOUTH CAROLINA FOOTBALL",

    colors: {
      accent:         "#FFFFFF",
      accentText:     "#FFFFFF",
      accentOnLight:  "#73000A",
      accentInk:      "#73000A",
      accentSoft:     "#FFFFFF",
      accentTint:     "#E6D1D3",
      accentTintSoft: "#F4EBEB",
      focus:          "#FFFFFF",
      surface:        "#73000A",
      surfaceDeep:    "#530007",
      surfaceAbyss:   "#300004",
      surfaceRaise:   "#811A22"
    },

    // South Carolina's typefaces are licensed and not named publicly; Libre
    // Franklin is matched to its athletics text.
    fonts: {
      ui:       "'Libre Franklin','Instrument Sans',system-ui,-apple-system,sans-serif",
      display:  "'Libre Franklin','Instrument Display',sans-serif"
    }
  },

  // What .github/workflows/odds.yml commits for South Carolina, each because a
  // source exists for it.
  snapshots: {
    availability: { file: "data/south-carolina/availability.json", history: "data/south-carolina/availability-history.json", label: "SECsports.com" },
    oddsHistory:  { file: "data/south-carolina/odds-history.json" },
    beatNews:     { file: "data/south-carolina/news.json" },
    recruits:     { file: "data/south-carolina/recruits.json", label: "ESPN recruiting" }
  }
};
