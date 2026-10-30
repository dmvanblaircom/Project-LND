/* Duke - Phase 3, the Big 12 and the ACC (David, 2026-10-28). Same
   shape as teams/indiana.js; nothing else changed.

   From GitHub's network on 2026-10-28: ESPN team 150, its home field as
   ESPN's schedule spells it (Wallace Wade Stadium), and the beat feeds below
   (probe-feeds.yml). Approved with the phase's review sheet. */

var TEAM_CONFIG = {

  team: {
    id:           "duke",
    name:         "Duke",
    abbreviation: "DUKE",
    sport:        "football",
    league:       "college-football",
    timeZone:     "America/New_York",

    venue: {
      name: "Wallace Wade Stadium",
      lat:  35.9954,
      lon: -78.9416
    }
  },

  sources: {
    espn: {
      teamId: "150",
      broadcastFallback: []
    },

    // The ACC's availability reports (tools/producers/conference_availability.py).
    official: {
      availabilityReportIndex: "https://theacc.com/sports/2025/8/28/availability-reporting-football.aspx",
      availabilityReportLabel: "TheACC.com",
      availabilityFeed: { provider: "hdintelligence", conference: "ACC", sport: "Football", team: "Duke" }
    },

    // Beat writers, read by the Action server-side; each answered from
    // GitHub's network on 2026-10-28.
    // Devils Illustrated is On3's fan site for Duke (the former Rivals site),
    // read through its own section so On3's national stories stay out
    // (2026-10-29). Not used: the Chronicle turned GitHub's network away
    // (405).
    beatFeeds: [
      { name: "Duke Athletics", feed: "https://goduke.com/rss?path=football", site: "https://goduke.com/sports/football", logo: "https://goduke.com/favicon.ico" },
      { name: "Duke On SI", feed: "https://www.si.com/college/duke/feed", site: "https://www.si.com/college/duke", logo: "https://images2.minutemediacdn.com/image/upload/v1720431406/SI/ON_SI-Favicon_B_96x96_3.ico" },
      { name: "Devils Illustrated", feed: "https://www.on3.com/sites/devils-illustrated/feed/", site: "https://www.on3.com/sites/devils-illustrated/", paths: ["/sites/devils-illustrated/"], logo: "https://on3static.com/static/on3/touch-icons/apple-touch-icon-180x180.png" }
    ]
  },

  series: [
    { match: /^north carolina( tar heels)?$/i, name: "Victory Bell", kind: "trophy" }
  ],

  links: {
    roster: { url: "https://goduke.com/sports/football/roster", label: "goduke.com" }
  },

  // Duke inside Suite: Duke Royal Blue, athletics' blue (brand.duke.edu), white, every text pair checked at
  // 4.5:1 (tools/teamidentitycheck.js).
  identity: {
    programLabel: "DUKE FOOTBALL",

    colors: {
      accent:         "#FFFFFF",
      accentText:     "#FFFFFF",
      accentOnLight:  "#00539B",
      accentInk:      "#00539B",
      accentSoft:     "#FFFFFF",
      accentTint:     "#D1E0ED",
      accentTintSoft: "#EBF1F7",
      focus:          "#FFFFFF",
      surface:        "#00539B",
      surfaceDeep:    "#003C70",
      surfaceAbyss:   "#002341",
      surfaceRaise:   "#1A64A5"
    },

    // Duke's web faces are Open Sans (text) and Montserrat (headlines), both
    // free (brand.duke.edu): used as they are.
    fonts: {
      ui:       "'Open Sans','Instrument Sans',system-ui,-apple-system,sans-serif",
      display:  "'Montserrat','Instrument Display',sans-serif"
    }
  },

  // What .github/workflows/odds.yml commits for Duke, each because a
  // source exists for it.
  snapshots: {
    availability: { file: "data/duke/availability.json", history: "data/duke/availability-history.json", label: "TheACC.com" },
    beatNews:     { file: "data/duke/news.json" },
    recruits:     { file: "data/duke/recruits.json", label: "ESPN recruiting" }
  }
};
