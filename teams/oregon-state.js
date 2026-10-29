/* Oregon State - Phase 4a, the American, the Mountain West and the Pac-12
   (David, 2026-10-29). Same shape as teams/indiana.js; nothing else changed.

   From GitHub's network on 2026-10-29: ESPN team 204, its home field as
   ESPN's schedule spells it (Reser Stadium), and the beat feeds below
   (probe-feeds.yml). Approved with the phase's review sheet. */

var TEAM_CONFIG = {

  team: {
    id:           "oregon-state",
    name:         "Oregon State",
    abbreviation: "ORST",
    sport:        "football",
    league:       "college-football",
    timeZone:     "America/Los_Angeles",

    venue: {
      name: "Reser Stadium",
      lat:  44.5596,
      lon: -123.2814
    }
  },

  sources: {
    espn: {
      teamId: "204",
      broadcastFallback: []
    },
    kalshi: {
      tickerSuffix: "-ORST",
      namePattern:  /\boregon st|beavers/i
    },

    // The Pac-12 posts its availability reports on Pac-12.com, not through HD
    // Intelligence (2026-10-29); there is no reader for that page yet, so
    // none are shown.

    // Beat writers, read by the Action server-side; each answered from
    // GitHub's network on 2026-10-29. On3's team feeds carry league-wide
    // stories, so `paths` keeps only Oregon State's section.
    // Not used: Building the Dam (SB Nation) reset the connection twice.
    beatFeeds: [
      { name: "Oregon State Athletics", feed: "https://osubeavers.com/rss?path=football", site: "https://osubeavers.com/sports/football", logo: "https://osubeavers.com/favicon.ico" },
      { name: "Oregon State On SI", feed: "https://www.si.com/college/oregon-state/feed", site: "https://www.si.com/college/oregon-state", logo: "https://images2.minutemediacdn.com/image/upload/v1720431406/SI/ON_SI-Favicon_B_96x96_3.ico" },
      { name: "BeaverBlitz (On3)", feed: "https://www.on3.com/teams/oregon-state-beavers/feed/", site: "https://www.on3.com/teams/oregon-state-beavers/", paths: ["/teams/oregon-state-beavers/"], logo: "https://on3static.com/static/on3/touch-icons/apple-touch-icon-180x180.png" }
    ]
  },

  series: [
    { match: /^oregon( ducks)?$/i, name: "Platypus Trophy", kind: "trophy" }
  ],

  links: {
    roster: { url: "https://osubeavers.com/sports/football/roster", label: "osubeavers.com" }
  },

  // Oregon State inside Suite: Black, Beaver Orange (ESPN's), every text pair checked at
  // 4.5:1 (tools/teamidentitycheck.js).
  identity: {
    programLabel: "OREGON STATE FOOTBALL",

    colors: {
      accent:         "#DC4405",
      accentText:     "#DC4405",
      accentOnLight:  "#000000",
      accentInk:      "#000000",
      accentSoft:     "#EC9876",
      accentTint:     "#F9DDD2",
      accentTintSoft: "#FCF0EB",
      focus:          "#FFFFFF",
      surface:        "#000000",
      surfaceDeep:    "#000000",
      surfaceAbyss:   "#000000",
      surfaceRaise:   "#1A1A1A"
    },

    // The Group of Five read in Suite's own faces (David's plan for the FBS
    // build-out); the school's colours carry its identity.
    fonts: {
      ui:       "'Instrument Sans',system-ui,-apple-system,sans-serif",
      display:  "'Instrument Display',sans-serif"
    }
  },

  // What .github/workflows/odds.yml commits for Oregon State, each because a
  // source exists for it.
  snapshots: {
    oddsHistory:  { file: "data/oregon-state/odds-history.json" },
    beatNews:     { file: "data/oregon-state/news.json" },
    recruits:     { file: "data/oregon-state/recruits.json", label: "ESPN recruiting" }
  }
};
