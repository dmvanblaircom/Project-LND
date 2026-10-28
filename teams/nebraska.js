/* Nebraska - Phase 1, the rest of the Big Ten (David, 2026-10-27). Same
   shape as teams/indiana.js; nothing else changed.

   From GitHub's network on 2026-10-27: ESPN team 158, its home field as
   ESPN's schedule spells it (Memorial Stadium (Lincoln)), and the beat feeds below
   (probe-feeds.yml). Approved with the phase's review sheet. */

var TEAM_CONFIG = {

  team: {
    id:           "nebraska",
    name:         "Nebraska",
    abbreviation: "NEB",
    sport:        "football",
    league:       "college-football",
    timeZone:     "America/Chicago",

    venue: {
      name: "Memorial Stadium (Lincoln",
      lat:  40.8206,
      lon: -96.7056
    }
  },

  sources: {
    espn: {
      teamId: "158",
      broadcastFallback: []
    },

    // The Big Ten's availability reports (tools/producers/conference_availability.py).
    official: {
      availabilityReportIndex: "https://bigten.org/sports/2026/9/10/FB_Availability_Reports.aspx",
      availabilityReportLabel: "BigTen.org",
      availabilityFeed: { provider: "hdintelligence", conference: "B10", sport: "Football", team: "Nebraska" }
    },

    // Beat writers, read by the Action server-side; each answered from
    // GitHub's network on 2026-10-27. On3's team feeds carry league-wide
    // stories, so `paths` keeps only Nebraska's section.
    // Not used: huskers.com has no feed; the Daily Nebraskan turned GitHub's
    // network away (429).
    beatFeeds: [
      { name: "Corn Nation", feed: "https://www.cornnation.com/rss/current.xml", site: "https://www.cornnation.com/" },
      { name: "Nebraska On SI", feed: "https://www.si.com/college/nebraska/feed", site: "https://www.si.com/college/nebraska", logo: "https://images2.minutemediacdn.com/image/upload/v1720431406/SI/ON_SI-Favicon_B_96x96_3.ico" },
      { name: "On3", feed: "https://www.on3.com/teams/nebraska-cornhuskers/feed/", site: "https://www.on3.com/teams/nebraska-cornhuskers/", paths: ["/teams/nebraska-cornhuskers/"], logo: "https://on3static.com/static/on3/touch-icons/apple-touch-icon-180x180.png" }
    ]
  },

  series: [
    { match: /^iowa( hawkeyes)?$/i, name: "Heroes Trophy", kind: "trophy" },
    { match: /^minnesota( golden gophers)?$/i, name: "$5 Bits of Broken Chair Trophy", kind: "trophy" }
  ],

  links: {
    roster: { url: "https://huskers.com/sports/football/roster", label: "huskers.com" }
  },

  // Nebraska inside Suite: Scarlet PMS 186, cream (ucomm.unl.edu), every text pair checked at
  // 4.5:1 (tools/teamidentitycheck.js).
  identity: {
    programLabel: "NEBRASKA FOOTBALL",

    colors: {
      accent:         "#F5F1E7",
      accentText:     "#F5F1E7",
      accentOnLight:  "#D00000",
      accentInk:      "#D00000",
      accentSoft:     "#FAF7F2",
      accentTint:     "#F7D1D1",
      accentTintSoft: "#FBEBEB",
      focus:          "#FFFFFF",
      surface:        "#D00000",
      surfaceDeep:    "#960000",
      surfaceAbyss:   "#570000",
      surfaceRaise:   "#D51A1A"
    },

    // Nebraska's brand faces since 2023 are Work Sans and Oswald, both free:
    // used as they are.
    fonts: {
      ui:       "'Work Sans','Instrument Sans',system-ui,-apple-system,sans-serif",
      display:  "'Oswald','Instrument Display',sans-serif"
    }
  },

  // What .github/workflows/odds.yml commits for Nebraska, each because a
  // source exists for it.
  snapshots: {
    availability: { file: "data/nebraska/availability.json", history: "data/nebraska/availability-history.json", label: "BigTen.org" },
    beatNews:     { file: "data/nebraska/news.json" },
    recruits:     { file: "data/nebraska/recruits.json", label: "ESPN recruiting" }
  }
};
