/* Louisville - Phase 3, the Big 12 and the ACC (David, 2026-10-28). Same
   shape as teams/indiana.js; nothing else changed.

   From GitHub's network on 2026-10-28: ESPN team 97, its home field as
   ESPN's schedule spells it (L&N Federal Credit Union Stadium), and the beat feeds below
   (probe-feeds.yml). Approved with the phase's review sheet. */

var TEAM_CONFIG = {

  team: {
    id:           "louisville",
    name:         "Louisville",
    abbreviation: "LOU",
    sport:        "football",
    league:       "college-football",
    timeZone:     "America/New_York",

    venue: {
      name: "L&N Federal Credit Union Stadium",
      lat:  38.2058,
      lon: -85.7586
    }
  },

  sources: {
    espn: {
      teamId: "97",
      broadcastFallback: []
    },
    kalshi: {
      tickerSuffix: "-LOU",
      namePattern:  /louisville/i
    },

    // The ACC's availability reports (tools/producers/conference_availability.py).
    official: {
      availabilityReportIndex: "https://theacc.com/sports/2025/8/28/availability-reporting-football.aspx",
      availabilityReportLabel: "TheACC.com",
      availabilityFeed: { provider: "hdintelligence", conference: "ACC", sport: "Football", team: "Louisville" }
    },

    // Beat writers, read by the Action server-side; each answered from
    // GitHub's network on 2026-10-28.
    // Not used: No On3 team feed (404).
    beatFeeds: [
      { name: "Louisville Athletics", feed: "https://gocards.com/rss?path=football", site: "https://gocards.com/sports/football", logo: "https://gocards.com/favicon.ico" },
      { name: "Card Chronicle", feed: "https://www.cardchronicle.com/rss/current.xml", site: "https://www.cardchronicle.com/" },
      { name: "Louisville On SI", feed: "https://www.si.com/college/louisville/feed", site: "https://www.si.com/college/louisville", logo: "https://images2.minutemediacdn.com/image/upload/v1720431406/SI/ON_SI-Favicon_B_96x96_3.ico" },
      { name: "The Louisville Cardinal", feed: "https://www.louisvillecardinal.com/category/sports/feed/", site: "https://www.louisvillecardinal.com/category/sports/", sportsSection: true }
    ]
  },

  series: [
    { match: /^kentucky( wildcats)?$/i, name: "Governor’s Cup", kind: "trophy" },
    { match: /^cincinnati( bearcats)?$/i, name: "Keg of Nails", kind: "trophy" }
  ],

  links: {
    roster: { url: "https://gocards.com/sports/football/roster", label: "gocards.com" }
  },

  // Louisville inside Suite: Cardinal Red, white, every text pair checked at
  // 4.5:1 (tools/teamidentitycheck.js).
  identity: {
    programLabel: "LOUISVILLE FOOTBALL",

    colors: {
      accent:         "#FFFFFF",
      accentText:     "#FFFFFF",
      accentOnLight:  "#AD0000",
      accentInk:      "#AD0000",
      accentSoft:     "#FFFFFF",
      accentTint:     "#F0D1D1",
      accentTintSoft: "#F8EBEB",
      focus:          "#FFFFFF",
      surface:        "#AD0000",
      surfaceDeep:    "#7D0000",
      surfaceAbyss:   "#490000",
      surfaceRaise:   "#B51A1A"
    },

    // Louisville's brand pages did not answer; Montserrat stands in. Please
    // confirm.
    fonts: {
      ui:       "'Montserrat','Instrument Sans',system-ui,-apple-system,sans-serif",
      display:  "'Montserrat','Instrument Display',sans-serif"
    }
  },

  // What .github/workflows/odds.yml commits for Louisville, each because a
  // source exists for it.
  snapshots: {
    availability: { file: "data/louisville/availability.json", history: "data/louisville/availability-history.json", label: "TheACC.com" },
    oddsHistory:  { file: "data/louisville/odds-history.json" },
    beatNews:     { file: "data/louisville/news.json" },
    recruits:     { file: "data/louisville/recruits.json", label: "ESPN recruiting" }
  }
};
