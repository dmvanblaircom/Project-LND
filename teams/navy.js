/* Navy - Phase 4a, the American, the Mountain West and the Pac-12 (David,
   2026-10-29). Same shape as teams/indiana.js; nothing else changed.

   From GitHub's network on 2026-10-29: ESPN team 2426, its home field as
   ESPN's schedule spells it (Navy-Marine Corps Memorial Stadium), and the
   beat feeds below (probe-feeds.yml). Approved with the phase's review
   sheet. */

var TEAM_CONFIG = {

  team: {
    id:           "navy",
    name:         "Navy",
    abbreviation: "NAVY",
    sport:        "football",
    league:       "college-football",
    timeZone:     "America/New_York",

    venue: {
      name: "Navy-Marine Corps Memorial Stadium",
      lat:  38.9850,
      lon: -76.5070
    }
  },

  sources: {
    espn: {
      teamId: "2426",
      broadcastFallback: []
    },

    // The American's availability reports (tools/producers/conference_availability.py).
    official: {
      availabilityReportIndex: "https://theamerican.org/sports/football",
      availabilityReportLabel: "TheAmerican.org",
      availabilityFeed: { provider: "hdintelligence", conference: "American", sport: "Football", team: "Navy" }
    },

    // Beat writers, read by the Action server-side; each answered from
    // GitHub's network on 2026-10-29.
    // The Mid Report is On3's fan site for Navy (the former Rivals site), read
    // through its own section so On3's national stories stay out (2026-10-29).
    // Not used: there is no On SI site (404) and no student paper.
    beatFeeds: [
      { name: "Navy Athletics", feed: "https://navysports.com/rss?path=football", site: "https://navysports.com/sports/football", logo: "https://navysports.com/favicon.ico" },
      { name: "The Mid Report", feed: "https://www.on3.com/sites/the-mid-report/feed/", site: "https://www.on3.com/sites/the-mid-report/", paths: ["/sites/the-mid-report/"], logo: "https://on3static.com/static/on3/touch-icons/apple-touch-icon-180x180.png" }
    ]
  },

  series: [
    { match: /^army( black knights| west point)?$/i, name: "Army-Navy Game", kind: "rivalry" },
    { match: /^air force( falcons)?$/i, name: "Commander-in-Chief's Trophy", kind: "trophy" },
    { match: /^notre dame( fighting irish)?$/i, name: "Rip Miller Trophy", kind: "trophy" }
  ],

  links: {
    roster: { url: "https://navysports.com/sports/football/roster", label: "navysports.com" }
  },

  // Navy inside Suite: Navy Blue, Navy Gold (ESPN's), every text pair checked at
  // 4.5:1 (tools/teamidentitycheck.js).
  identity: {
    programLabel: "NAVY FOOTBALL",

    colors: {
      accent:         "#B5A67C",
      accentText:     "#B5A67C",
      accentOnLight:  "#00225B",
      accentInk:      "#00225B",
      accentSoft:     "#D6CEB7",
      accentTint:     "#F2EFE7",
      accentTintSoft: "#F9F8F5",
      focus:          "#FFFFFF",
      surface:        "#00225B",
      surfaceDeep:    "#001842",
      surfaceAbyss:   "#000E26",
      surfaceRaise:   "#1A386B"
    },

    // The Group of Five read in Suite's own faces (David's plan for the FBS
    // build-out); the school's colours carry its identity.
    fonts: {
      ui:       "'Instrument Sans',system-ui,-apple-system,sans-serif",
      display:  "'Instrument Display',sans-serif"
    }
  },

  // What .github/workflows/odds.yml commits for Navy, each because a
  // source exists for it.
  snapshots: {
    availability: { file: "data/navy/availability.json", history: "data/navy/availability-history.json", label: "TheAmerican.org" },
    beatNews:     { file: "data/navy/news.json" },
    recruits:     { file: "data/navy/recruits.json", label: "ESPN recruiting" }
  }
};
