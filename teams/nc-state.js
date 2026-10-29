/* NC State - Phase 3, the Big 12 and the ACC (David, 2026-10-28). Same
   shape as teams/indiana.js; nothing else changed.

   From GitHub's network on 2026-10-28: ESPN team 152, its home field as
   ESPN's schedule spells it (Carter-Finley Stadium), and the beat feeds below
   (probe-feeds.yml). Approved with the phase's review sheet. */

var TEAM_CONFIG = {

  team: {
    id:           "nc-state",
    name:         "NC State",
    abbreviation: "NCSU",
    sport:        "football",
    league:       "college-football",
    timeZone:     "America/New_York",

    venue: {
      name: "Carter-Finley Stadium",
      lat:  35.8007,
      lon: -78.7196
    }
  },

  sources: {
    espn: {
      teamId: "152",
      broadcastFallback: []
    },

    // The ACC's availability reports (tools/producers/conference_availability.py).
    official: {
      availabilityReportIndex: "https://theacc.com/sports/2025/8/28/availability-reporting-football.aspx",
      availabilityReportLabel: "TheACC.com",
      availabilityFeed: { provider: "hdintelligence", conference: "ACC", sport: "Football", team: "NC State" }
    },

    // Beat writers, read by the Action server-side; each answered from
    // GitHub's network on 2026-10-28. On3's team feeds carry league-wide
    // stories, so `paths` keeps only NC State's section.
    // Not used: The Technician has no working feed.
    beatFeeds: [
      { name: "NC State Athletics", feed: "https://gopack.com/rss?path=football", site: "https://gopack.com/sports/football", logo: "https://gopack.com/favicon.ico" },
      { name: "Backing the Pack", feed: "https://www.backingthepack.com/rss/current.xml", site: "https://www.backingthepack.com/" },
      { name: "NC State On SI", feed: "https://www.si.com/college/ncstate/feed", site: "https://www.si.com/college/ncstate", logo: "https://images2.minutemediacdn.com/image/upload/v1720431406/SI/ON_SI-Favicon_B_96x96_3.ico" },
      { name: "On3", feed: "https://www.on3.com/teams/nc-state-wolfpack/feed/", site: "https://www.on3.com/teams/nc-state-wolfpack/", paths: ["/teams/nc-state-wolfpack/"], logo: "https://on3static.com/static/on3/touch-icons/apple-touch-icon-180x180.png" }
    ]
  },

  series: [
    { match: /^north carolina( tar heels)?$/i, name: "NC State-North Carolina", kind: "rivalry" },
    { match: /^clemson( tigers)?$/i, name: "Textile Bowl", kind: "rivalry" }
  ],

  links: {
    roster: { url: "https://gopack.com/sports/football/roster", label: "gopack.com" }
  },

  // NC State inside Suite: Wolfpack Red, white, every text pair checked at
  // 4.5:1 (tools/teamidentitycheck.js).
  identity: {
    programLabel: "NC STATE FOOTBALL",

    colors: {
      accent:         "#FFFFFF",
      accentText:     "#FFFFFF",
      accentOnLight:  "#CC0000",
      accentInk:      "#CC0000",
      accentSoft:     "#FFFFFF",
      accentTint:     "#F6D1D1",
      accentTintSoft: "#FBEBEB",
      focus:          "#FFFFFF",
      surface:        "#CC0000",
      surfaceDeep:    "#930000",
      surfaceAbyss:   "#560000",
      surfaceRaise:   "#D11A1A"
    },

    // NC State's brand faces are Roboto and Roboto Slab, free
    // (brand.ncsu.edu): used as they are.
    fonts: {
      ui:       "'Roboto','Instrument Sans',system-ui,-apple-system,sans-serif",
      display:  "'Roboto Slab','Instrument Display',sans-serif"
    }
  },

  // What .github/workflows/odds.yml commits for NC State, each because a
  // source exists for it.
  snapshots: {
    availability: { file: "data/nc-state/availability.json", history: "data/nc-state/availability-history.json", label: "TheACC.com" },
    beatNews:     { file: "data/nc-state/news.json" },
    recruits:     { file: "data/nc-state/recruits.json", label: "ESPN recruiting" }
  }
};
