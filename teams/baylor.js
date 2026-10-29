/* Baylor - Phase 3, the Big 12 and the ACC (David, 2026-10-28). Same
   shape as teams/indiana.js; nothing else changed.

   From GitHub's network on 2026-10-28: ESPN team 239, its home field as
   ESPN's schedule spells it (McLane Stadium), and the beat feeds below
   (probe-feeds.yml). Approved with the phase's review sheet. */

var TEAM_CONFIG = {

  team: {
    id:           "baylor",
    name:         "Baylor",
    abbreviation: "BAY",
    sport:        "football",
    league:       "college-football",
    timeZone:     "America/Chicago",

    venue: {
      name: "McLane Stadium",
      lat:  31.5583,
      lon: -97.1153
    }
  },

  sources: {
    espn: {
      teamId: "239",
      broadcastFallback: []
    },
    kalshi: {
      tickerSuffix: "-BAY",
      namePattern:  /baylor/i
    },

    // The Big 12's availability reports (tools/producers/conference_availability.py).
    official: {
      availabilityReportIndex: "https://big12sports.com/sports/football",
      availabilityReportLabel: "Big12Sports.com",
      availabilityFeed: { provider: "hdintelligence", conference: "B12", sport: "Football", team: "Baylor" }
    },

    // Beat writers, read by the Action server-side; each answered from
    // GitHub's network on 2026-10-28. On3's team feeds carry league-wide
    // stories, so `paths` keeps only Baylor's section.
    // Not used: Our Daily Bears (SB Nation) did not answer GitHub's network.
    beatFeeds: [
      { name: "Baylor Athletics", feed: "https://baylorbears.com/rss?path=football", site: "https://baylorbears.com/sports/football", logo: "https://baylorbears.com/favicon.ico" },
      { name: "Baylor On SI", feed: "https://www.si.com/college/baylor/feed", site: "https://www.si.com/college/baylor", logo: "https://images2.minutemediacdn.com/image/upload/v1720431406/SI/ON_SI-Favicon_B_96x96_3.ico" },
      { name: "On3", feed: "https://www.on3.com/teams/baylor-bears/feed/", site: "https://www.on3.com/teams/baylor-bears/", paths: ["/teams/baylor-bears/"], logo: "https://on3static.com/static/on3/touch-icons/apple-touch-icon-180x180.png" },
      { name: "The Baylor Lariat", feed: "https://baylorlariat.com/category/sports/football/feed/", site: "https://baylorlariat.com/category/sports/football/" }
    ]
  },

  series: [
    { match: /^tcu( horned frogs)?$/i, name: "Revivalry", kind: "rivalry" }
  ],

  links: {
    roster: { url: "https://baylorbears.com/sports/football/roster", label: "baylorbears.com" }
  },

  // Baylor inside Suite: Baylor Green, Baylor Gold (ESPN's; Baylor's page did not answer), every text pair checked at
  // 4.5:1 (tools/teamidentitycheck.js).
  identity: {
    programLabel: "BAYLOR FOOTBALL",

    colors: {
      accent:         "#FFB81C",
      accentText:     "#FFB81C",
      accentOnLight:  "#154734",
      accentInk:      "#154734",
      accentSoft:     "#FFD882",
      accentTint:     "#FFF2D6",
      accentTintSoft: "#FFF9ED",
      focus:          "#FFFFFF",
      surface:        "#154734",
      surfaceDeep:    "#0F3325",
      surfaceAbyss:   "#091E16",
      surfaceRaise:   "#2C5948"
    },

    // Baylor's typefaces could not be read from its brand pages; Inter, a
    // neutral free sans, stands in. Please confirm.
    fonts: {
      ui:       "'Inter','Instrument Sans',system-ui,-apple-system,sans-serif",
      display:  "'Inter','Instrument Display',sans-serif"
    }
  },

  // What .github/workflows/odds.yml commits for Baylor, each because a
  // source exists for it.
  snapshots: {
    availability: { file: "data/baylor/availability.json", history: "data/baylor/availability-history.json", label: "Big12Sports.com" },
    oddsHistory:  { file: "data/baylor/odds-history.json" },
    beatNews:     { file: "data/baylor/news.json" },
    recruits:     { file: "data/baylor/recruits.json", label: "ESPN recruiting" }
  }
};
