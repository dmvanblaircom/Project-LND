/* Arizona State - Phase 3, the Big 12 and the ACC (David, 2026-10-28). Same
   shape as teams/indiana.js; nothing else changed.

   From GitHub's network on 2026-10-28: ESPN team 9, its home field as
   ESPN's schedule spells it (Mountain America Stadium), and the beat feeds below
   (probe-feeds.yml). Approved with the phase's review sheet. */

var TEAM_CONFIG = {

  team: {
    id:           "arizona-state",
    name:         "Arizona State",
    abbreviation: "ASU",
    sport:        "football",
    league:       "college-football",
    timeZone:     "America/Phoenix",

    venue: {
      name: "Mountain America Stadium",
      lat:  33.4264,
      lon: -111.9325
    }
  },

  sources: {
    espn: {
      teamId: "9",
      broadcastFallback: []
    },
    kalshi: {
      tickerSuffix: "-ASU",
      namePattern:  /arizona st|sun devils/i
    },

    // The Big 12's availability reports (tools/producers/conference_availability.py).
    official: {
      availabilityReportIndex: "https://big12sports.com/sports/football",
      availabilityReportLabel: "Big12Sports.com",
      availabilityFeed: { provider: "hdintelligence", conference: "B12", sport: "Football", team: "Arizona St.", aliases: ["Arizona State"] }
    },

    // Beat writers, read by the Action server-side; each answered from
    // GitHub's network on 2026-10-28.
    // Not used: One source only: thesundevils.com has no feed, House of
    // Sparky (SB Nation) is gone (404), there is no On3 team feed (404), and
    // the State Press has no working feed.
    beatFeeds: [
      { name: "Arizona State On SI", feed: "https://www.si.com/college/arizonastate/feed", site: "https://www.si.com/college/arizonastate", logo: "https://images2.minutemediacdn.com/image/upload/v1720431406/SI/ON_SI-Favicon_B_96x96_3.ico" },
      { name: "Devils Digest", feed: "https://www.on3.com/sites/asu-devils/feed/", site: "https://www.on3.com/sites/asu-devils/", paths: ["/sites/asu-devils/"], logo: "https://on3static.com/static/on3/touch-icons/apple-touch-icon-180x180.png" }
    ]
  },

  series: [
    { match: /^arizona( wildcats)?$/i, name: "Territorial Cup", kind: "trophy" }
  ],

  links: {
    roster: { url: "https://thesundevils.com/sports/football/roster", label: "thesundevils.com" }
  },

  // Arizona State inside Suite: ASU Maroon, ASU Gold (brandguide.asu.edu), every text pair checked at
  // 4.5:1 (tools/teamidentitycheck.js).
  identity: {
    programLabel: "ARIZONA STATE FOOTBALL",

    colors: {
      accent:         "#FFC627",
      accentText:     "#FFC627",
      accentOnLight:  "#8C1D40",
      accentInk:      "#8C1D40",
      accentSoft:     "#FFE088",
      accentTint:     "#FFF5D8",
      accentTintSoft: "#FFFAEE",
      focus:          "#FFFFFF",
      surface:        "#8C1D40",
      surfaceDeep:    "#65152E",
      surfaceAbyss:   "#3B0C1B",
      surfaceRaise:   "#983453"
    },

    // ASU's web standard sets type in Roboto, free: used as it is.
    fonts: {
      ui:       "'Roboto','Instrument Sans',system-ui,-apple-system,sans-serif",
      display:  "'Roboto','Instrument Display',sans-serif"
    }
  },

  // What .github/workflows/odds.yml commits for Arizona State, each because a
  // source exists for it.
  snapshots: {
    availability: { file: "data/arizona-state/availability.json", history: "data/arizona-state/availability-history.json", label: "Big12Sports.com" },
    oddsHistory:  { file: "data/arizona-state/odds-history.json" },
    beatNews:     { file: "data/arizona-state/news.json" },
    recruits:     { file: "data/arizona-state/recruits.json", label: "ESPN recruiting" }
  }
};
