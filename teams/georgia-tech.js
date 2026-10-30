/* Georgia Tech - Phase 3, the Big 12 and the ACC (David, 2026-10-28). Same
   shape as teams/indiana.js; nothing else changed.

   From GitHub's network on 2026-10-28: ESPN team 59, its home field as
   ESPN's schedule spells it (Bobby Dodd Stadium), and the beat feeds below
   (probe-feeds.yml). Approved with the phase's review sheet. */

var TEAM_CONFIG = {

  team: {
    id:           "georgia-tech",
    name:         "Georgia Tech",
    abbreviation: "GT",
    sport:        "football",
    league:       "college-football",
    timeZone:     "America/New_York",

    venue: {
      name: "Bobby Dodd Stadium",
      lat:  33.7726,
      lon: -84.3928
    }
  },

  sources: {
    espn: {
      teamId: "59",
      broadcastFallback: []
    },
    kalshi: {
      tickerSuffix: "-GT",
      namePattern:  /georgia tech/i
    },

    // The ACC's availability reports (tools/producers/conference_availability.py).
    official: {
      availabilityReportIndex: "https://theacc.com/sports/2025/8/28/availability-reporting-football.aspx",
      availabilityReportLabel: "TheACC.com",
      availabilityFeed: { provider: "hdintelligence", conference: "ACC", sport: "Football", team: "Georgia Tech" }
    },

    // Beat writers, read by the Action server-side; each answered from
    // GitHub's network on 2026-10-28.
    // Jackets Online is On3's fan site for Georgia Tech (the former Rivals
    // site), read through its own section so On3's national stories stay out
    // (2026-10-29). Not used: ramblinwreck.com's feed is every sport, and the
    // Technique has no working feed.
    beatFeeds: [
      { name: "From the Rumble Seat", feed: "https://www.fromtherumbleseat.com/rss/current.xml", site: "https://www.fromtherumbleseat.com/" },
      { name: "Georgia Tech On SI", feed: "https://www.si.com/college/georgiatech/feed", site: "https://www.si.com/college/georgiatech", logo: "https://images2.minutemediacdn.com/image/upload/v1720431406/SI/ON_SI-Favicon_B_96x96_3.ico" },
      { name: "Jackets Online", feed: "https://www.on3.com/sites/jackets-online/feed/", site: "https://www.on3.com/sites/jackets-online/", paths: ["/sites/jackets-online/"], logo: "https://on3static.com/static/on3/touch-icons/apple-touch-icon-180x180.png" }
    ]
  },

  series: [
    { match: /^georgia( bulldogs)?$/i, name: "Governor’s Cup", kind: "trophy" }
  ],

  links: {
    // Where the program posts its game notes (Game links to it; David,
    // 2026-10-30): its schedule, where each game's notes are posted.
    gameNotes: { url: "https://ramblinwreck.com/sports/football/schedule", label: "ramblinwreck.com", kind: "schedule" },
    roster: { url: "https://ramblinwreck.com/sports/m-footbl/roster", label: "ramblinwreck.com" }
  },

  // Georgia Tech inside Suite: Navy, Tech Gold, every text pair checked at
  // 4.5:1 (tools/teamidentitycheck.js).
  identity: {
    programLabel: "GEORGIA TECH FOOTBALL",

    colors: {
      accent:         "#B3A369",
      accentText:     "#B3A369",
      accentOnLight:  "#003057",
      accentInk:      "#003057",
      accentSoft:     "#D5CCAC",
      accentTint:     "#F1EEE4",
      accentTintSoft: "#F9F8F3",
      focus:          "#FFFFFF",
      surface:        "#003057",
      surfaceDeep:    "#00233F",
      surfaceAbyss:   "#001425",
      surfaceRaise:   "#1A4568"
    },

    // Georgia Tech names Roboto and Roboto Slab as its free web faces
    // (brand.gatech.edu): used as they are.
    fonts: {
      ui:       "'Roboto','Instrument Sans',system-ui,-apple-system,sans-serif",
      display:  "'Roboto Slab','Instrument Display',sans-serif"
    }
  },

  // What .github/workflows/odds.yml commits for Georgia Tech, each because a
  // source exists for it.
  snapshots: {
    availability: { file: "data/georgia-tech/availability.json", history: "data/georgia-tech/availability-history.json", label: "TheACC.com" },
    oddsHistory:  { file: "data/georgia-tech/odds-history.json" },
    beatNews:     { file: "data/georgia-tech/news.json" },
    recruits:     { file: "data/georgia-tech/recruits.json", label: "ESPN recruiting" }
  }
};
