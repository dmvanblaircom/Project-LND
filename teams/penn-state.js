/* Penn State - Phase 1, the rest of the Big Ten (David, 2026-10-27). Same
   shape as teams/indiana.js; nothing else changed.

   From GitHub's network on 2026-10-27: ESPN team 213, its home field as
   ESPN's schedule spells it (Beaver Stadium), and the beat feeds below
   (probe-feeds.yml). Approved with the phase's review sheet. */

var TEAM_CONFIG = {

  team: {
    id:           "penn-state",
    name:         "Penn State",
    abbreviation: "PSU",
    sport:        "football",
    league:       "college-football",
    timeZone:     "America/New_York",

    venue: {
      name: "Beaver Stadium",
      lat:  40.8122,
      lon: -77.8561
    }
  },

  sources: {
    espn: {
      teamId: "213",
      broadcastFallback: []
    },
    kalshi: {
      tickerSuffix: "-PSU",
      namePattern:  /penn st|nittany lions/i
    },

    // The Big Ten's availability reports (tools/producers/conference_availability.py).
    official: {
      availabilityReportIndex: "https://bigten.org/sports/2026/9/10/FB_Availability_Reports.aspx",
      availabilityReportLabel: "BigTen.org",
      availabilityFeed: { provider: "hdintelligence", conference: "B10", sport: "Football", team: "Penn St.", aliases: ["Penn State"] }
    },

    // Beat writers, read by the Action server-side; each answered from
    // GitHub's network on 2026-10-27. On3's team feeds carry league-wide
    // stories, so `paths` keeps only Penn State's section.
    // Not used: gopsusports.com's feed is every sport (its "MSOC" for men's
    // soccer would slip past the filter); the Daily Collegian turned GitHub's
    // network away (429).
    beatFeeds: [
      { name: "Black Shoe Diaries", feed: "https://www.blackshoediaries.com/rss/current.xml", site: "https://www.blackshoediaries.com/" },
      { name: "Penn State On SI", feed: "https://www.si.com/college/pennstate/feed", site: "https://www.si.com/college/pennstate", logo: "https://images2.minutemediacdn.com/image/upload/v1720431406/SI/ON_SI-Favicon_B_96x96_3.ico" },
      { name: "On3", feed: "https://www.on3.com/teams/penn-state-nittany-lions/feed/", site: "https://www.on3.com/teams/penn-state-nittany-lions/", paths: ["/teams/penn-state-nittany-lions/"], logo: "https://on3static.com/static/on3/touch-icons/apple-touch-icon-180x180.png" }
    ]
  },

  series: [
    { match: /^michigan state( spartans)?$/i, name: "Land Grant Trophy", kind: "trophy" },
    { match: /^minnesota( golden gophers)?$/i, name: "Governor’s Victory Bell", kind: "trophy" }
  ],

  links: {
    // Where the program posts its game notes (Game links to it; David,
    // 2026-10-30): its schedule, where each game's notes are posted.
    gameNotes: { url: "https://gopsusports.com/sports/football/schedule", label: "gopsusports.com", kind: "schedule" },
    roster: { url: "https://gopsusports.com/sports/football/roster", label: "gopsusports.com" }
  },

  // Penn State inside Suite: Nittany Navy, Pugh Blue (brand.psu.edu), every text pair checked at
  // 4.5:1 (tools/teamidentitycheck.js).
  identity: {
    programLabel: "PENN STATE FOOTBALL",

    colors: {
      accent:         "#96BEE6",
      accentText:     "#96BEE6",
      accentOnLight:  "#001E44",
      accentInk:      "#001E44",
      accentSoft:     "#C5DBF1",
      accentTint:     "#ECF3FA",
      accentTintSoft: "#F7FAFD",
      focus:          "#FFFFFF",
      surface:        "#001E44",
      surfaceDeep:    "#001631",
      surfaceAbyss:   "#000D1D",
      surfaceRaise:   "#1A3457"
    },

    // Penn State recommends the Roboto family, free: Roboto Slab for
    // headings, Roboto for text.
    fonts: {
      ui:       "'Roboto','Instrument Sans',system-ui,-apple-system,sans-serif",
      display:  "'Roboto Slab','Instrument Display',sans-serif"
    }
  },

  // What .github/workflows/odds.yml commits for Penn State, each because a
  // source exists for it.
  snapshots: {
    availability: { file: "data/penn-state/availability.json", history: "data/penn-state/availability-history.json", label: "BigTen.org" },
    oddsHistory:  { file: "data/penn-state/odds-history.json" },
    beatNews:     { file: "data/penn-state/news.json" },
    recruits:     { file: "data/penn-state/recruits.json", label: "ESPN recruiting" }
  }
};
