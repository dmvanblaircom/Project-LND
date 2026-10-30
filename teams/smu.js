/* SMU - Phase 3, the Big 12 and the ACC (David, 2026-10-28). Same
   shape as teams/indiana.js; nothing else changed.

   From GitHub's network on 2026-10-28: ESPN team 2567, its home field as
   ESPN's schedule spells it (Gerald J. Ford Stadium), and the beat feeds below
   (probe-feeds.yml). Approved with the phase's review sheet. */

var TEAM_CONFIG = {

  team: {
    id:           "smu",
    name:         "SMU",
    abbreviation: "SMU",
    sport:        "football",
    league:       "college-football",
    timeZone:     "America/Chicago",

    venue: {
      name: "Gerald J. Ford Stadium",
      lat:  32.8375,
      lon: -96.7828
    }
  },

  sources: {
    espn: {
      teamId: "2567",
      broadcastFallback: []
    },
    kalshi: {
      tickerSuffix: "-SMU",
      namePattern:  /\bsmu\b|southern methodist/i
    },

    // The ACC's availability reports (tools/producers/conference_availability.py).
    official: {
      availabilityReportIndex: "https://theacc.com/sports/2025/8/28/availability-reporting-football.aspx",
      availabilityReportLabel: "TheACC.com",
      availabilityFeed: { provider: "hdintelligence", conference: "ACC", sport: "Football", team: "SMU" }
    },

    // Beat writers, read by the Action server-side; each answered from
    // GitHub's network on 2026-10-28. On3's team feeds carry league-wide
    // stories, so `paths` keeps only SMU's section.
    // Not used: The Daily Campus turned GitHub's network away (403).
    beatFeeds: [
      { name: "SMU Athletics", feed: "https://smumustangs.com/rss?path=football", site: "https://smumustangs.com/sports/football", logo: "https://smumustangs.com/favicon.ico" },
      { name: "SMU On SI", feed: "https://www.si.com/college/smu/feed", site: "https://www.si.com/college/smu", logo: "https://images2.minutemediacdn.com/image/upload/v1720431406/SI/ON_SI-Favicon_B_96x96_3.ico" },
      { name: "On3", feed: "https://www.on3.com/teams/smu-mustangs/feed/", site: "https://www.on3.com/teams/smu-mustangs/", paths: ["/teams/smu-mustangs/"], logo: "https://on3static.com/static/on3/touch-icons/apple-touch-icon-180x180.png" }
    ]
  },

  series: [
    { match: /^tcu( horned frogs)?$/i, name: "Iron Skillet", kind: "trophy" }
  ],

  links: {
    // Where the program posts its game notes (Game links to it; David,
    // 2026-10-30): its schedule, where each game's notes are posted.
    gameNotes: { url: "https://smumustangs.com/sports/football/schedule", label: "smumustangs.com", kind: "schedule" },
    roster: { url: "https://smumustangs.com/sports/football/roster", label: "smumustangs.com" }
  },

  // SMU inside Suite: SMU Red (ESPN's), white, every text pair checked at
  // 4.5:1 (tools/teamidentitycheck.js).
  identity: {
    programLabel: "SMU FOOTBALL",

    colors: {
      accent:         "#FFFFFF",
      accentText:     "#FFFFFF",
      accentOnLight:  "#A80000",
      accentInk:      "#A80000",
      accentSoft:     "#FFFFFF",
      accentTint:     "#EFD1D1",
      accentTintSoft: "#F8EBEB",
      focus:          "#FFFFFF",
      surface:        "#A80000",
      surfaceDeep:    "#790000",
      surfaceAbyss:   "#470000",
      surfaceRaise:   "#B11A1A"
    },

    // SMU's brand pages did not answer; Montserrat stands in. Please confirm.
    fonts: {
      ui:       "'Montserrat','Instrument Sans',system-ui,-apple-system,sans-serif",
      display:  "'Montserrat','Instrument Display',sans-serif"
    }
  },

  // What .github/workflows/odds.yml commits for SMU, each because a
  // source exists for it.
  snapshots: {
    availability: { file: "data/smu/availability.json", history: "data/smu/availability-history.json", label: "TheACC.com" },
    oddsHistory:  { file: "data/smu/odds-history.json" },
    beatNews:     { file: "data/smu/news.json" },
    recruits:     { file: "data/smu/recruits.json", label: "ESPN recruiting" }
  }
};
