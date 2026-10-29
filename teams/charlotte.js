/* Charlotte - Phase 4a, the American, the Mountain West and the Pac-12
   (David, 2026-10-29). Same shape as teams/indiana.js; nothing else changed.

   From GitHub's network on 2026-10-29: ESPN team 2429, its home field as
   ESPN's schedule spells it (Jerry Richardson Stadium), and the beat feeds
   below (probe-feeds.yml). Approved with the phase's review sheet. */

var TEAM_CONFIG = {

  team: {
    id:           "charlotte",
    name:         "Charlotte",
    abbreviation: "CLT",
    sport:        "football",
    league:       "college-football",
    timeZone:     "America/New_York",

    venue: {
      name: "Jerry Richardson Stadium",
      lat:  35.3096,
      lon: -80.7413
    }
  },

  sources: {
    espn: {
      teamId: "2429",
      broadcastFallback: []
    },

    // The American's availability reports (tools/producers/conference_availability.py).
    official: {
      availabilityReportIndex: "https://theamerican.org/sports/football",
      availabilityReportLabel: "TheAmerican.org",
      availabilityFeed: { provider: "hdintelligence", conference: "American", sport: "Football", team: "Charlotte" }
    },

    // Beat writers, read by the Action server-side; each answered from
    // GitHub's network on 2026-10-29.
    // One source only: Niner Times turned GitHub's network away twice (429),
    // On SI has no Charlotte site (404), and On3's feed carries only national
    // stories.
    beatFeeds: [
      { name: "Charlotte Athletics", feed: "https://charlotte49ers.com/rss?path=football", site: "https://charlotte49ers.com/sports/football", logo: "https://charlotte49ers.com/favicon.ico" }
    ]
  },

  series: [

  ],

  links: {
    roster: { url: "https://charlotte49ers.com/sports/football/roster", label: "charlotte49ers.com" }
  },

  // Charlotte inside Suite: Niner Green, Niner Gold (ESPN's), every text pair checked at
  // 4.5:1 (tools/teamidentitycheck.js).
  identity: {
    programLabel: "CHARLOTTE FOOTBALL",

    colors: {
      accent:         "#A49665",
      accentText:     "#A89A6B",
      accentOnLight:  "#005035",
      accentInk:      "#111111",
      accentSoft:     "#CDC5AA",
      accentTint:     "#EFECE3",
      accentTintSoft: "#F8F7F3",
      focus:          "#FFFFFF",
      surface:        "#005035",
      surfaceDeep:    "#003A26",
      surfaceAbyss:   "#002216",
      surfaceRaise:   "#1A6249"
    },

    // The Group of Five read in Suite's own faces (David's plan for the FBS
    // build-out); the school's colours carry its identity.
    fonts: {
      ui:       "'Instrument Sans',system-ui,-apple-system,sans-serif",
      display:  "'Instrument Display',sans-serif"
    }
  },

  // What .github/workflows/odds.yml commits for Charlotte, each because a
  // source exists for it.
  snapshots: {
    availability: { file: "data/charlotte/availability.json", history: "data/charlotte/availability-history.json", label: "TheAmerican.org" },
    beatNews:     { file: "data/charlotte/news.json" },
    recruits:     { file: "data/charlotte/recruits.json", label: "ESPN recruiting" }
  }
};
