/* UCLA - Phase 1, the rest of the Big Ten (David, 2026-10-27). Same
   shape as teams/indiana.js; nothing else changed.

   From GitHub's network on 2026-10-27: ESPN team 26, its home field as
   ESPN's schedule spells it (Rose Bowl), and the beat feeds below
   (probe-feeds.yml). Approved with the phase's review sheet. */

var TEAM_CONFIG = {

  team: {
    id:           "ucla",
    name:         "UCLA",
    abbreviation: "UCLA",
    sport:        "football",
    league:       "college-football",
    timeZone:     "America/Los_Angeles",

    venue: {
      name: "Rose Bowl",
      lat:  34.1613,
      lon: -118.1676
    }
  },

  sources: {
    espn: {
      teamId: "26",
      broadcastFallback: []
    },
    kalshi: {
      tickerSuffix: "-UCLA",
      namePattern:  /\bucla\b|bruins/i
    },

    // The Big Ten's availability reports (tools/producers/conference_availability.py).
    official: {
      availabilityReportIndex: "https://bigten.org/sports/2026/9/10/FB_Availability_Reports.aspx",
      availabilityReportLabel: "BigTen.org",
      availabilityFeed: { provider: "hdintelligence", conference: "B10", sport: "Football", team: "UCLA" }
    },

    // Beat writers, read by the Action server-side; each answered from
    // GitHub's network on 2026-10-27. On3's team feeds carry league-wide
    // stories, so `paths` keeps only UCLA's section.
    // Not used: Two sources only: uclabruins.com has no feed, Bruins Nation
    // (SB Nation) is gone (404), and the Daily Bruin's feed does not parse.
    beatFeeds: [
      { name: "UCLA On SI", feed: "https://www.si.com/college/ucla/feed", site: "https://www.si.com/college/ucla", logo: "https://images2.minutemediacdn.com/image/upload/v1720431406/SI/ON_SI-Favicon_B_96x96_3.ico" },
      { name: "Bruin Report Online", feed: "https://www.on3.com/sites/bruin-report-online/feed/", site: "https://www.on3.com/sites/bruin-report-online/", paths: ["/sites/bruin-report-online/"], logo: "https://on3static.com/static/on3/touch-icons/apple-touch-icon-180x180.png" }
    ]
  },

  series: [
    { match: /^usc( trojans)?$/i, name: "Victory Bell", kind: "trophy" }
  ],

  links: {
    // Where the program posts its game notes (Game links to it; David,
    // 2026-10-30): its schedule, where each game's notes are posted.
    gameNotes: { url: "https://uclabruins.com/sports/football/schedule", label: "uclabruins.com", kind: "schedule" },
    roster: { url: "https://uclabruins.com/sports/football/roster", label: "uclabruins.com" }
  },

  // UCLA inside Suite: UCLA Darker Blue, UCLA Gold PMS 109 (brand.ucla.edu), every text pair checked at
  // 4.5:1 (tools/teamidentitycheck.js).
  identity: {
    programLabel: "UCLA FOOTBALL",

    colors: {
      accent:         "#FFD100",
      accentText:     "#FFD100",
      accentOnLight:  "#005587",
      accentInk:      "#005587",
      accentSoft:     "#FFE673",
      accentTint:     "#FFF7D1",
      accentTintSoft: "#FFFBEB",
      focus:          "#FFFFFF",
      surface:        "#005587",
      surfaceDeep:    "#003D61",
      surfaceAbyss:   "#002439",
      surfaceRaise:   "#1A6693"
    },

    // UCLA's Karbon is licensed; UCLA names Roboto for digital use: used as
    // it is.
    fonts: {
      ui:       "'Roboto','Instrument Sans',system-ui,-apple-system,sans-serif",
      display:  "'Roboto','Instrument Display',sans-serif"
    }
  },

  // What .github/workflows/odds.yml commits for UCLA, each because a
  // source exists for it.
  snapshots: {
    availability: { file: "data/ucla/availability.json", history: "data/ucla/availability-history.json", label: "BigTen.org" },
    oddsHistory:  { file: "data/ucla/odds-history.json" },
    beatNews:     { file: "data/ucla/news.json" },
    recruits:     { file: "data/ucla/recruits.json", label: "ESPN recruiting" }
  }
};
