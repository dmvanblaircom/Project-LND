/* Temple - Phase 4a, the American, the Mountain West and the Pac-12 (David,
   2026-10-29). Same shape as teams/indiana.js; nothing else changed.

   From GitHub's network on 2026-10-29: ESPN team 218, its home field as
   ESPN's schedule spells it (Lincoln Financial Field), and the beat feeds
   below (probe-feeds.yml). Approved with the phase's review sheet. */

var TEAM_CONFIG = {

  team: {
    id:           "temple",
    name:         "Temple",
    abbreviation: "TEM",
    sport:        "football",
    league:       "college-football",
    timeZone:     "America/New_York",

    venue: {
      name: "Lincoln Financial Field",
      lat:  39.9008,
      lon: -75.1675
    }
  },

  sources: {
    espn: {
      teamId: "218",
      broadcastFallback: []
    },

    // The American's availability reports (tools/producers/conference_availability.py).
    official: {
      availabilityReportIndex: "https://theamerican.org/sports/football",
      availabilityReportLabel: "TheAmerican.org",
      availabilityFeed: { provider: "hdintelligence", conference: "American", sport: "Football", team: "Temple" }
    },

    // Beat writers, read by the Action server-side; each answered from
    // GitHub's network on 2026-10-29.
    // OwlScoop is On3's fan site for Temple (the former Rivals site), read
    // through its own section so On3's national stories stay out (2026-10-29).
    // Not used: the Temple News refused GitHub's network (403), and there is
    // no On SI site (404).
    beatFeeds: [
      { name: "Temple Athletics", feed: "https://owlsports.com/rss?path=football", site: "https://owlsports.com/sports/football", logo: "https://owlsports.com/favicon.ico" },
      { name: "OwlScoop", feed: "https://www.on3.com/sites/owl-scoop/feed/", site: "https://www.on3.com/sites/owl-scoop/", paths: ["/sites/owl-scoop/"], logo: "https://on3static.com/static/on3/touch-icons/apple-touch-icon-180x180.png" }
    ]
  },

  series: [

  ],

  links: {
    roster: { url: "https://owlsports.com/sports/football/roster", label: "owlsports.com" }
  },

  // Temple inside Suite: Cherry (ESPN's), white, every text pair checked at
  // 4.5:1 (tools/teamidentitycheck.js).
  identity: {
    programLabel: "TEMPLE FOOTBALL",

    colors: {
      accent:         "#FFFFFF",
      accentText:     "#FFFFFF",
      accentOnLight:  "#A41E35",
      accentInk:      "#A41E35",
      accentSoft:     "#FFFFFF",
      accentTint:     "#EFD6DB",
      accentTintSoft: "#F8EDEF",
      focus:          "#FFFFFF",
      surface:        "#A41E35",
      surfaceDeep:    "#761626",
      surfaceAbyss:   "#450D16",
      surfaceRaise:   "#AD3449"
    },

    // The Group of Five read in Suite's own faces (David's plan for the FBS
    // build-out); the school's colours carry its identity.
    fonts: {
      ui:       "'Instrument Sans',system-ui,-apple-system,sans-serif",
      display:  "'Instrument Display',sans-serif"
    }
  },

  // What .github/workflows/odds.yml commits for Temple, each because a
  // source exists for it.
  snapshots: {
    availability: { file: "data/temple/availability.json", history: "data/temple/availability-history.json", label: "TheAmerican.org" },
    beatNews:     { file: "data/temple/news.json" },
    recruits:     { file: "data/temple/recruits.json", label: "ESPN recruiting" }
  }
};
