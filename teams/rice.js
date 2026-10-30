/* Rice - Phase 4a, the American, the Mountain West and the Pac-12 (David,
   2026-10-29). Same shape as teams/indiana.js; nothing else changed.

   From GitHub's network on 2026-10-29: ESPN team 242, its home field as
   ESPN's schedule spells it (First Community Stadium), and the beat feeds
   below (probe-feeds.yml). Approved with the phase's review sheet. */

var TEAM_CONFIG = {

  team: {
    id:           "rice",
    name:         "Rice",
    abbreviation: "RICE",
    sport:        "football",
    league:       "college-football",
    timeZone:     "America/Chicago",

    venue: {
      name: "First Community Stadium",
      lat:  29.7164,
      lon: -95.4091
    }
  },

  sources: {
    espn: {
      teamId: "242",
      broadcastFallback: []
    },

    // The American's availability reports (tools/producers/conference_availability.py).
    official: {
      availabilityReportIndex: "https://theamerican.org/sports/football",
      availabilityReportLabel: "TheAmerican.org",
      availabilityFeed: { provider: "hdintelligence", conference: "American", sport: "Football", team: "Rice" }
    },

    // Beat writers, read by the Action server-side; each answered from
    // GitHub's network on 2026-10-29.
    // One source only: the Rice Thresher refused GitHub's network (405), On
    // SI has no Rice site (404), and On3's feed carries only national
    // stories.
    beatFeeds: [
      { name: "Rice Athletics", feed: "https://riceowls.com/rss?path=football", site: "https://riceowls.com/sports/football", logo: "https://riceowls.com/favicon.ico" }
    ]
  },

  series: [
    { match: /^houston( cougars)?$/i, name: "Bayou Bucket", kind: "trophy" }
  ],

  links: {
    roster: { url: "https://riceowls.com/sports/football/roster", label: "riceowls.com" }
  },

  // Rice inside Suite: Rice Blue, Gray (ESPN's), every text pair checked at
  // 4.5:1 (tools/teamidentitycheck.js).
  identity: {
    programLabel: "RICE FOOTBALL",

    colors: {
      accent:         "#C1C6C8",
      accentText:     "#C1C6C8",
      accentOnLight:  "#00205B",
      accentInk:      "#00205B",
      accentSoft:     "#DDE0E1",
      accentTint:     "#F4F5F5",
      accentTintSoft: "#FAFAFB",
      // Game Details in white, lettered in the team's colour: its silver
      // read as a disabled button (sweep, 2026-10-29; David, 2026-10-30).
      action:         "#FFFFFF",
      actionInk:      "#00205B",
      focus:          "#FFFFFF",
      surface:        "#00205B",
      surfaceDeep:    "#001742",
      surfaceAbyss:   "#000D26",
      surfaceRaise:   "#1A366B"
    },

    // The Group of Five read in Suite's own faces (David's plan for the FBS
    // build-out); the school's colours carry its identity.
    fonts: {
      ui:       "'Instrument Sans',system-ui,-apple-system,sans-serif",
      display:  "'Instrument Display',sans-serif"
    }
  },

  // What .github/workflows/odds.yml commits for Rice, each because a
  // source exists for it.
  snapshots: {
    availability: { file: "data/rice/availability.json", history: "data/rice/availability-history.json", label: "TheAmerican.org" },
    beatNews:     { file: "data/rice/news.json" },
    recruits:     { file: "data/rice/recruits.json", label: "ESPN recruiting" }
  }
};
