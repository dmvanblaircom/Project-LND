/* Florida Atlantic - Phase 4a, the American, the Mountain West and the
   Pac-12 (David, 2026-10-29). Same shape as teams/indiana.js; nothing else
   changed.

   From GitHub's network on 2026-10-29: ESPN team 2226, its home field as
   ESPN's schedule spells it (Flagler Credit Union Stadium), and the beat
   feeds below (probe-feeds.yml). Approved with the phase's review sheet. */

var TEAM_CONFIG = {

  team: {
    id:           "florida-atlantic",
    name:         "Florida Atlantic",
    abbreviation: "FAU",
    sport:        "football",
    league:       "college-football",
    timeZone:     "America/New_York",

    venue: {
      name: "Flagler Credit Union Stadium",
      lat:  26.3768,
      lon: -80.1072
    }
  },

  sources: {
    espn: {
      teamId: "2226",
      broadcastFallback: []
    },

    // The American's availability reports (tools/producers/conference_availability.py).
    official: {
      availabilityReportIndex: "https://theamerican.org/sports/football",
      availabilityReportLabel: "TheAmerican.org",
      availabilityFeed: { provider: "hdintelligence", conference: "American", sport: "Football", team: "Fla. Atlantic" }
    },

    // Beat writers, read by the Action server-side; each answered from
    // GitHub's network on 2026-10-29.
    // Not used: On SI has no FAU site (404), and On3's feed carries only
    // national stories.
    beatFeeds: [
      { name: "FAU Athletics", feed: "https://fausports.com/rss?path=football", site: "https://fausports.com/sports/football", logo: "https://fausports.com/favicon.ico" },
      { name: "University Press", feed: "https://www.upressonline.com/category/sports/football/feed/", site: "https://www.upressonline.com/category/sports/football/" }
    ]
  },

  series: [
    { match: /^fiu( panthers)?$|^florida international( panthers)?$/i, name: "Shula Bowl", kind: "trophy" }
  ],

  links: {
    roster: { url: "https://fausports.com/sports/football/roster", label: "fausports.com" }
  },

  // Florida Atlantic inside Suite: Blue, Red (ESPN's), every text pair checked at
  // 4.5:1 (tools/teamidentitycheck.js).
  identity: {
    programLabel: "FAU FOOTBALL",

    colors: {
      accent:         "#CC0000",
      accentText:     "#E06666",
      accentOnLight:  "#CC0000",
      accentInk:      "#FFFFFF",
      accentSoft:     "#E37373",
      accentTint:     "#F6D1D1",
      accentTintSoft: "#FBEBEB",
      focus:          "#FFFFFF",
      surface:        "#003366",
      surfaceDeep:    "#002549",
      surfaceAbyss:   "#00152B",
      surfaceRaise:   "#1A4775"
    },

    // The Group of Five read in Suite's own faces (David's plan for the FBS
    // build-out); the school's colours carry its identity.
    fonts: {
      ui:       "'Instrument Sans',system-ui,-apple-system,sans-serif",
      display:  "'Instrument Display',sans-serif"
    }
  },

  // What .github/workflows/odds.yml commits for Florida Atlantic, each because a
  // source exists for it.
  snapshots: {
    availability: { file: "data/florida-atlantic/availability.json", history: "data/florida-atlantic/availability-history.json", label: "TheAmerican.org" },
    beatNews:     { file: "data/florida-atlantic/news.json" },
    recruits:     { file: "data/florida-atlantic/recruits.json", label: "ESPN recruiting" }
  }
};
