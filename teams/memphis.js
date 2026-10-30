/* Memphis - Phase 4a, the American, the Mountain West and the Pac-12 (David,
   2026-10-29). Same shape as teams/indiana.js; nothing else changed.

   From GitHub's network on 2026-10-29: ESPN team 235, its home field as
   ESPN's schedule spells it (Simmons Bank Liberty Stadium), and the beat
   feeds below (probe-feeds.yml). Approved with the phase's review sheet. */

var TEAM_CONFIG = {

  team: {
    id:           "memphis",
    name:         "Memphis",
    abbreviation: "MEM",
    sport:        "football",
    league:       "college-football",
    timeZone:     "America/Chicago",

    venue: {
      name: "Simmons Bank Liberty Stadium",
      lat:  35.1213,
      lon: -89.9774
    }
  },

  sources: {
    espn: {
      teamId: "235",
      broadcastFallback: []
    },

    // The American's availability reports (tools/producers/conference_availability.py).
    official: {
      availabilityReportIndex: "https://theamerican.org/sports/football",
      availabilityReportLabel: "TheAmerican.org",
      availabilityFeed: { provider: "hdintelligence", conference: "American", sport: "Football", team: "Memphis" }
    },

    // Beat writers, read by the Action server-side; each answered from
    // GitHub's network on 2026-10-29.
    // Tiger Sports Report is On3's fan site for Memphis (the former Rivals
    // site), read through its own section so On3's national stories stay out
    // (2026-10-29). Not used: the Daily Helmsman refused GitHub's network
    // (405), and there is no On SI site (404).
    beatFeeds: [
      { name: "Memphis Athletics", feed: "https://gotigersgo.com/rss?path=football", site: "https://gotigersgo.com/sports/football", logo: "https://gotigersgo.com/favicon.ico" },
      { name: "Tiger Sports Report", feed: "https://www.on3.com/sites/tiger-sports-report/feed/", site: "https://www.on3.com/sites/tiger-sports-report/", paths: ["/sites/tiger-sports-report/"], logo: "https://on3static.com/static/on3/touch-icons/apple-touch-icon-180x180.png" }
    ]
  },

  series: [

  ],

  links: {
    // Where the program posts its game notes (Game links to it; David,
    // 2026-10-30): its schedule, where each game's notes are posted.
    gameNotes: { url: "https://gotigersgo.com/sports/football/schedule", label: "gotigersgo.com", kind: "schedule" },
    roster: { url: "https://gotigersgo.com/sports/football/roster", label: "gotigersgo.com" }
  },

  // Memphis inside Suite: Memphis Blue, Gray (ESPN's), every text pair checked at
  // 4.5:1 (tools/teamidentitycheck.js).
  identity: {
    programLabel: "MEMPHIS FOOTBALL",

    colors: {
      accent:         "#8E908F",
      accentText:     "#9C9D9C",
      accentOnLight:  "#004991",
      accentInk:      "#111111",
      accentSoft:     "#C1C2C1",
      accentTint:     "#EBEBEB",
      accentTintSoft: "#F6F6F6",
      // Game Details in white, lettered in the team's colour: its silver
      // read as a disabled button (sweep, 2026-10-29; David, 2026-10-30).
      action:         "#FFFFFF",
      actionInk:      "#004991",
      focus:          "#FFFFFF",
      surface:        "#004991",
      surfaceDeep:    "#003568",
      surfaceAbyss:   "#001F3D",
      surfaceRaise:   "#1A5B9C"
    },

    // The Group of Five read in Suite's own faces (David's plan for the FBS
    // build-out); the school's colours carry its identity.
    fonts: {
      ui:       "'Instrument Sans',system-ui,-apple-system,sans-serif",
      display:  "'Instrument Display',sans-serif"
    }
  },

  // What .github/workflows/odds.yml commits for Memphis, each because a
  // source exists for it.
  snapshots: {
    availability: { file: "data/memphis/availability.json", history: "data/memphis/availability-history.json", label: "TheAmerican.org" },
    beatNews:     { file: "data/memphis/news.json" },
    recruits:     { file: "data/memphis/recruits.json", label: "ESPN recruiting" }
  }
};
