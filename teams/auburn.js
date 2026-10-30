/* Auburn - Phase 2, the SEC (David, 2026-10-28). Same
   shape as teams/indiana.js; nothing else changed.

   From GitHub's network on 2026-10-28: ESPN team 2, its home field as
   ESPN's schedule spells it (Jordan-Hare Stadium), and the beat feeds below
   (probe-feeds.yml). Approved with the phase's review sheet. */

var TEAM_CONFIG = {

  team: {
    id:           "auburn",
    name:         "Auburn",
    abbreviation: "AUB",
    sport:        "football",
    league:       "college-football",
    timeZone:     "America/Chicago",

    venue: {
      name: "Jordan-Hare Stadium",
      lat:  32.6025,
      lon: -85.4891
    }
  },

  sources: {
    espn: {
      teamId: "2",
      broadcastFallback: []
    },
    kalshi: {
      tickerSuffix: "-AUB",
      namePattern:  /\bauburn\b/i
    },

    // The SEC's availability reports (tools/producers/conference_availability.py).
    official: {
      availabilityReportIndex: "https://www.secsports.com/fbreports",
      availabilityReportLabel: "SECsports.com",
      availabilityFeed: { provider: "hdintelligence", conference: "SEC", sport: "Football", team: "Auburn" }
    },

    // Beat writers, read by the Action server-side; each answered from
    // GitHub's network on 2026-10-28. On3's team feeds carry league-wide
    // stories, so `paths` keeps only Auburn's section.
    // Not used: Two sources only: auburntigers.com's feed is every sport,
    // College and Magnolia (SB Nation) did not answer GitHub's network, and
    // the Plainsman turned it away (405).
    beatFeeds: [
      { name: "Auburn On SI", feed: "https://www.si.com/college/auburn/feed", site: "https://www.si.com/college/auburn", logo: "https://images2.minutemediacdn.com/image/upload/v1720431406/SI/ON_SI-Favicon_B_96x96_3.ico" },
      { name: "On3", feed: "https://www.on3.com/teams/auburn-tigers/feed/", site: "https://www.on3.com/teams/auburn-tigers/", paths: ["/teams/auburn-tigers/"], logo: "https://on3static.com/static/on3/touch-icons/apple-touch-icon-180x180.png" }
    ]
  },

  series: [
    { match: /^alabama( crimson tide)?$/i, name: "Iron Bowl", kind: "rivalry" },
    { match: /^georgia( bulldogs)?$/i, name: "Deep South’s Oldest Rivalry", kind: "rivalry" }
  ],

  links: {
    // Where the program posts its game notes (Game links to it; David,
    // 2026-10-30): its schedule, where each game's notes are posted.
    gameNotes: { url: "https://auburntigers.com/sports/football/schedule", label: "auburntigers.com", kind: "schedule" },
    roster: { url: "https://auburntigers.com/sports/football/roster", label: "auburntigers.com" }
  },

  // Auburn inside Suite: Auburn Blue PMS 289, Auburn Orange (Auburn's 2023 guide), every text pair checked at
  // 4.5:1 (tools/teamidentitycheck.js).
  identity: {
    programLabel: "AUBURN FOOTBALL",

    colors: {
      accent:         "#CC4E0B",
      accentText:     "#D16023",
      accentOnLight:  "#0B2341",
      accentInk:      "#FFFFFF",
      accentSoft:     "#E39E79",
      accentTint:     "#F6DFD3",
      accentTintSoft: "#FBF1EB",
      focus:          "#FFFFFF",
      surface:        "#0B2341",
      surfaceDeep:    "#08192F",
      surfaceAbyss:   "#050F1B",
      surfaceRaise:   "#233954"
    },

    // Auburn's typeface, Slate Pro, is licensed; Source Sans 3 is the closest
    // free match.
    fonts: {
      ui:       "'Source Sans 3','Instrument Sans',system-ui,-apple-system,sans-serif",
      display:  "'Source Sans 3','Instrument Display',sans-serif"
    }
  },

  // What .github/workflows/odds.yml commits for Auburn, each because a
  // source exists for it.
  snapshots: {
    availability: { file: "data/auburn/availability.json", history: "data/auburn/availability-history.json", label: "SECsports.com" },
    oddsHistory:  { file: "data/auburn/odds-history.json" },
    beatNews:     { file: "data/auburn/news.json" },
    recruits:     { file: "data/auburn/recruits.json", label: "ESPN recruiting" }
  }
};
