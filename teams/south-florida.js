/* South Florida - Phase 4a, the American, the Mountain West and the Pac-12
   (David, 2026-10-29). Same shape as teams/indiana.js; nothing else changed.

   From GitHub's network on 2026-10-29: ESPN team 58, its home field as
   ESPN's schedule spells it (Raymond James Stadium), and the beat feeds
   below (probe-feeds.yml). Approved with the phase's review sheet. */

var TEAM_CONFIG = {

  team: {
    id:           "south-florida",
    name:         "South Florida",
    abbreviation: "USF",
    sport:        "football",
    league:       "college-football",
    timeZone:     "America/New_York",

    venue: {
      name: "Raymond James Stadium",
      lat:  27.9759,
      lon: -82.5033
    }
  },

  sources: {
    espn: {
      teamId: "58",
      broadcastFallback: []
    },

    // The American's availability reports (tools/producers/conference_availability.py).
    official: {
      availabilityReportIndex: "https://theamerican.org/sports/football",
      availabilityReportLabel: "TheAmerican.org",
      availabilityFeed: { provider: "hdintelligence", conference: "American", sport: "Football", team: "South Fla.", aliases: ["South Florida"] }
    },

    // Beat writers, read by the Action server-side; each answered from
    // GitHub's network on 2026-10-29.
    // Not used: Voodoo Five (SB Nation) reset the connection twice, and there
    // is no On3 team feed or On SI site (404).
    beatFeeds: [
      { name: "USF Athletics", feed: "https://gousfbulls.com/rss?path=football", site: "https://gousfbulls.com/sports/football", logo: "https://gousfbulls.com/favicon.ico" },
      { name: "The Oracle", feed: "https://www.usforacle.com/category/sports/football/feed/", site: "https://www.usforacle.com/category/sports/football/" },
      { name: "Bulls Insider", feed: "https://www.on3.com/sites/bulls-insider/feed/", site: "https://www.on3.com/sites/bulls-insider/", paths: ["/sites/bulls-insider/"], logo: "https://on3static.com/static/on3/touch-icons/apple-touch-icon-180x180.png" }
    ]
  },

  series: [
    { match: /^ucf( knights)?$/i, name: "War on I-4", kind: "rivalry" }
  ],

  links: {
    roster: { url: "https://gousfbulls.com/sports/football/roster", label: "gousfbulls.com" }
  },

  // South Florida inside Suite: USF Green, Gold (ESPN's), every text pair checked at
  // 4.5:1 (tools/teamidentitycheck.js).
  identity: {
    programLabel: "USF FOOTBALL",

    colors: {
      accent:         "#CFC493",
      accentText:     "#CFC493",
      accentOnLight:  "#006747",
      accentInk:      "#004A33",
      accentSoft:     "#E5DFC4",
      accentTint:     "#F6F4EC",
      accentTintSoft: "#FBFAF6",
      focus:          "#FFFFFF",
      surface:        "#006747",
      surfaceDeep:    "#004A33",
      surfaceAbyss:   "#002B1E",
      surfaceRaise:   "#1A7659"
    },

    // The Group of Five read in Suite's own faces (David's plan for the FBS
    // build-out); the school's colours carry its identity.
    fonts: {
      ui:       "'Instrument Sans',system-ui,-apple-system,sans-serif",
      display:  "'Instrument Display',sans-serif"
    }
  },

  // What .github/workflows/odds.yml commits for South Florida, each because a
  // source exists for it.
  snapshots: {
    availability: { file: "data/south-florida/availability.json", history: "data/south-florida/availability-history.json", label: "TheAmerican.org" },
    beatNews:     { file: "data/south-florida/news.json" },
    recruits:     { file: "data/south-florida/recruits.json", label: "ESPN recruiting" }
  }
};
