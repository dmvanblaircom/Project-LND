/* Colorado - Phase 3, the Big 12 and the ACC (David, 2026-10-28). Same
   shape as teams/indiana.js; nothing else changed.

   From GitHub's network on 2026-10-28: ESPN team 38, its home field as
   ESPN's schedule spells it (Folsom Field), and the beat feeds below
   (probe-feeds.yml). Approved with the phase's review sheet. */

var TEAM_CONFIG = {

  team: {
    id:           "colorado",
    name:         "Colorado",
    abbreviation: "COLO",
    sport:        "football",
    league:       "college-football",
    timeZone:     "America/Denver",

    venue: {
      name: "Folsom Field",
      lat:  40.0092,
      lon: -105.2669
    }
  },

  sources: {
    espn: {
      teamId: "38",
      broadcastFallback: []
    },

    // The Big 12's availability reports (tools/producers/conference_availability.py).
    official: {
      availabilityReportIndex: "https://big12sports.com/sports/football",
      availabilityReportLabel: "Big12Sports.com",
      availabilityFeed: { provider: "hdintelligence", conference: "B12", sport: "Football", team: "Colorado" }
    },

    // Beat writers, read by the Action server-side; each answered from
    // GitHub's network on 2026-10-28.
    // BuffBlitz is On3's fan site for Colorado (the former Rivals site), read
    // through its own section so On3's national stories stay out (2026-10-29).
    // Not used: Ralphie Report (SB Nation) stopped publishing in March, the CU
    // Independent's sports feed is advertising, and BuffZone turned GitHub's
    // network away (403).
    beatFeeds: [
      { name: "Colorado Athletics", feed: "https://cubuffs.com/rss?path=football", site: "https://cubuffs.com/sports/football", logo: "https://cubuffs.com/favicon.ico" },
      { name: "Colorado On SI", feed: "https://www.si.com/college/colorado/feed", site: "https://www.si.com/college/colorado", logo: "https://images2.minutemediacdn.com/image/upload/v1720431406/SI/ON_SI-Favicon_B_96x96_3.ico" },
      { name: "BuffBlitz", feed: "https://www.on3.com/sites/buff-blitz/feed/", site: "https://www.on3.com/sites/buff-blitz/", paths: ["/sites/buff-blitz/"], logo: "https://on3static.com/static/on3/touch-icons/apple-touch-icon-180x180.png" }
    ]
  },

  series: [
    { match: /^colorado state( rams)?$/i, name: "Rocky Mountain Showdown", kind: "trophy" }
  ],

  links: {
    roster: { url: "https://cubuffs.com/sports/football/roster", label: "cubuffs.com" }
  },

  // Colorado inside Suite: Black, CU Gold (ESPN's), every text pair checked at
  // 4.5:1 (tools/teamidentitycheck.js).
  identity: {
    programLabel: "COLORADO FOOTBALL",

    colors: {
      accent:         "#CFB87C",
      accentText:     "#CFB87C",
      accentOnLight:  "#000000",
      accentInk:      "#000000",
      accentSoft:     "#E5D8B7",
      accentTint:     "#F6F2E7",
      accentTintSoft: "#FBF9F5",
      focus:          "#FFFFFF",
      surface:        "#000000",
      surfaceDeep:    "#000000",
      surfaceAbyss:   "#000000",
      surfaceRaise:   "#1A1A1A"
    },

    // Colorado's brand pages did not answer; Roboto stands in. Please
    // confirm.
    fonts: {
      ui:       "'Roboto','Instrument Sans',system-ui,-apple-system,sans-serif",
      display:  "'Roboto','Instrument Display',sans-serif"
    }
  },

  // What .github/workflows/odds.yml commits for Colorado, each because a
  // source exists for it.
  snapshots: {
    availability: { file: "data/colorado/availability.json", history: "data/colorado/availability-history.json", label: "Big12Sports.com" },
    beatNews:     { file: "data/colorado/news.json" },
    recruits:     { file: "data/colorado/recruits.json", label: "ESPN recruiting" }
  }
};
