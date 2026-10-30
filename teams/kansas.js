/* Kansas - Phase 3, the Big 12 and the ACC (David, 2026-10-28). Same
   shape as teams/indiana.js; nothing else changed.

   From GitHub's network on 2026-10-28: ESPN team 2305, its home field as
   ESPN's schedule spells it (David Booth Kansas Memorial Stadium), and the beat feeds below
   (probe-feeds.yml). Approved with the phase's review sheet. */

var TEAM_CONFIG = {

  team: {
    id:           "kansas",
    name:         "Kansas",
    abbreviation: "KU",
    sport:        "football",
    league:       "college-football",
    timeZone:     "America/Chicago",

    venue: {
      name: "David Booth Kansas Memorial Stadium",
      lat:  38.9630,
      lon: -95.2464
    }
  },

  sources: {
    espn: {
      teamId: "2305",
      broadcastFallback: []
    },

    // The Big 12's availability reports (tools/producers/conference_availability.py).
    official: {
      availabilityReportIndex: "https://big12sports.com/sports/football",
      availabilityReportLabel: "Big12Sports.com",
      availabilityFeed: { provider: "hdintelligence", conference: "B12", sport: "Football", team: "Kansas" }
    },

    // Beat writers, read by the Action server-side; each answered from
    // GitHub's network on 2026-10-28.
    // Not used: The University Daily Kansan turned GitHub's network away
    // (429); no On3 team feed (404).
    beatFeeds: [
      { name: "Kansas Athletics", feed: "https://kuathletics.com/rss?path=football", site: "https://kuathletics.com/sports/football", logo: "https://kuathletics.com/favicon.ico" },
      { name: "Rock Chalk Talk", feed: "https://www.rockchalktalk.com/rss/current.xml", site: "https://www.rockchalktalk.com/" },
      { name: "Kansas On SI", feed: "https://www.si.com/college/kansas/feed", site: "https://www.si.com/college/kansas", logo: "https://images2.minutemediacdn.com/image/upload/v1720431406/SI/ON_SI-Favicon_B_96x96_3.ico" }
    ]
  },

  series: [
    { match: /^kansas state( wildcats)?$/i, name: "Sunflower Showdown", kind: "trophy" },
    { match: /^missouri( tigers)?$/i, name: "Border War", kind: "rivalry" }
  ],

  links: {
    // Where the program posts its game notes (Game links to it; David,
    // 2026-10-30): its schedule, where each game's notes are posted.
    gameNotes: { url: "https://kuathletics.com/sports/football/schedule", label: "kuathletics.com", kind: "schedule" },
    roster: { url: "https://kuathletics.com/sports/football/roster", label: "kuathletics.com" }
  },

  // Kansas inside Suite: KU Blue, Crimson (brand.ku.edu), every text pair checked at
  // 4.5:1 (tools/teamidentitycheck.js).
  identity: {
    programLabel: "KANSAS FOOTBALL",

    colors: {
      accent:         "#E8000D",
      accentText:     "#F48A90",
      accentOnLight:  "#0051BA",
      accentInk:      "#FFFFFF",
      accentSoft:     "#F4898F",
      accentTint:     "#FBD1D3",
      accentTintSoft: "#FDEBEC",
      focus:          "#FFFFFF",
      surface:        "#0051BA",
      surfaceDeep:    "#003A86",
      surfaceAbyss:   "#00224E",
      surfaceRaise:   "#1A62C1"
    },

    // KU's faces, Roc Grotesk and Freight (brand.ku.edu), are licensed;
    // Barlow is the closest free match to Roc Grotesk.
    fonts: {
      ui:       "'Barlow','Instrument Sans',system-ui,-apple-system,sans-serif",
      display:  "'Barlow','Instrument Display',sans-serif"
    }
  },

  // What .github/workflows/odds.yml commits for Kansas, each because a
  // source exists for it.
  snapshots: {
    availability: { file: "data/kansas/availability.json", history: "data/kansas/availability-history.json", label: "Big12Sports.com" },
    beatNews:     { file: "data/kansas/news.json" },
    recruits:     { file: "data/kansas/recruits.json", label: "ESPN recruiting" }
  }
};
