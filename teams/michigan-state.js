/* Michigan State - Phase 1, the rest of the Big Ten (David, 2026-10-27). Same
   shape as teams/indiana.js; nothing else changed.

   From GitHub's network on 2026-10-27: ESPN team 127, its home field as
   ESPN's schedule spells it (Spartan Stadium), and the beat feeds below
   (probe-feeds.yml). Approved with the phase's review sheet. */

var TEAM_CONFIG = {

  team: {
    id:           "michigan-state",
    name:         "Michigan State",
    abbreviation: "MSU",
    sport:        "football",
    league:       "college-football",
    timeZone:     "America/Detroit",

    venue: {
      name: "Spartan Stadium",
      lat:  42.7281,
      lon: -84.4848
    }
  },

  sources: {
    espn: {
      teamId: "127",
      broadcastFallback: []
    },

    // The Big Ten's availability reports (tools/producers/conference_availability.py).
    official: {
      availabilityReportIndex: "https://bigten.org/sports/2026/9/10/FB_Availability_Reports.aspx",
      availabilityReportLabel: "BigTen.org",
      availabilityFeed: { provider: "hdintelligence", conference: "B10", sport: "Football", team: "Michigan St.", aliases: ["Michigan State"] }
    },

    // Beat writers, read by the Action server-side; each answered from
    // GitHub's network on 2026-10-27. On3's team feeds carry league-wide
    // stories, so `paths` keeps only Michigan State's section.
    // Not used: The State News has no working feed.
    beatFeeds: [
      { name: "Michigan State Athletics", feed: "https://msuspartans.com/rss?path=football", site: "https://msuspartans.com/sports/football", logo: "https://msuspartans.com/favicon.ico" },
      { name: "The Only Colors", feed: "https://www.theonlycolors.com/rss/current.xml", site: "https://www.theonlycolors.com/" },
      { name: "Michigan State On SI", feed: "https://www.si.com/college/michiganstate/feed", site: "https://www.si.com/college/michiganstate", logo: "https://images2.minutemediacdn.com/image/upload/v1720431406/SI/ON_SI-Favicon_B_96x96_3.ico" },
      { name: "On3", feed: "https://www.on3.com/teams/michigan-state-spartans/feed/", site: "https://www.on3.com/teams/michigan-state-spartans/", paths: ["/teams/michigan-state-spartans/"], logo: "https://on3static.com/static/on3/touch-icons/apple-touch-icon-180x180.png" }
    ]
  },

  series: [
    { match: /^michigan( wolverines)?$/i, name: "Paul Bunyan Trophy", kind: "trophy" },
    { match: /^penn state( nittany lions)?$/i, name: "Land Grant Trophy", kind: "trophy" },
    { match: /^notre dame( fighting irish)?$/i, name: "Megaphone Trophy", kind: "trophy" }
  ],

  links: {
    // Where the program posts its game notes (Game links to it; David,
    // 2026-10-30): its schedule, where each game's notes are posted.
    gameNotes: { url: "https://msuspartans.com/sports/football/schedule", label: "msuspartans.com", kind: "schedule" },
    roster: { url: "https://msuspartans.com/sports/football/roster", label: "msuspartans.com" }
  },

  // Michigan State inside Suite: Spartan Green PMS 567 (brand.msu.edu), white, every text pair checked at
  // 4.5:1 (tools/teamidentitycheck.js).
  identity: {
    programLabel: "MICHIGAN STATE FOOTBALL",

    colors: {
      accent:         "#FFFFFF",
      accentText:     "#FFFFFF",
      accentOnLight:  "#18453B",
      accentInk:      "#18453B",
      accentSoft:     "#FFFFFF",
      accentTint:     "#D5DEDC",
      accentTintSoft: "#EDF0EF",
      focus:          "#FFFFFF",
      surface:        "#18453B",
      surfaceDeep:    "#11322A",
      surfaceAbyss:   "#0A1D19",
      surfaceRaise:   "#2F584F"
    },

    // MSU's brand face is Metropolis, which replaced Gotham; Metropolis could
    // not be fetched from this environment, so Montserrat, the usual free
    // match for Gotham, stands in.
    fonts: {
      ui:       "'Montserrat','Instrument Sans',system-ui,-apple-system,sans-serif",
      display:  "'Montserrat','Instrument Display',sans-serif"
    }
  },

  // What .github/workflows/odds.yml commits for Michigan State, each because a
  // source exists for it.
  snapshots: {
    availability: { file: "data/michigan-state/availability.json", history: "data/michigan-state/availability-history.json", label: "BigTen.org" },
    beatNews:     { file: "data/michigan-state/news.json" },
    recruits:     { file: "data/michigan-state/recruits.json", label: "ESPN recruiting" }
  }
};
