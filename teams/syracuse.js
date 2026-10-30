/* Syracuse - Phase 3, the Big 12 and the ACC (David, 2026-10-28). Same
   shape as teams/indiana.js; nothing else changed.

   From GitHub's network on 2026-10-28: ESPN team 183, its home field as
   ESPN's schedule spells it (JMA Wireless Dome), and the beat feeds below
   (probe-feeds.yml). Approved with the phase's review sheet. */

var TEAM_CONFIG = {

  team: {
    id:           "syracuse",
    name:         "Syracuse",
    abbreviation: "SYR",
    sport:        "football",
    league:       "college-football",
    timeZone:     "America/New_York",

    venue: {
      name: "JMA Wireless Dome",
      lat:  43.0362,
      lon: -76.1364
    }
  },

  sources: {
    espn: {
      teamId: "183",
      broadcastFallback: []
    },

    // The ACC's availability reports (tools/producers/conference_availability.py).
    official: {
      availabilityReportIndex: "https://theacc.com/sports/2025/8/28/availability-reporting-football.aspx",
      availabilityReportLabel: "TheACC.com",
      availabilityFeed: { provider: "hdintelligence", conference: "ACC", sport: "Football", team: "Syracuse" }
    },

    // Beat writers, read by the Action server-side; each answered from
    // GitHub's network on 2026-10-28. On3's team feeds carry league-wide
    // stories, so `paths` keeps only Syracuse's section.
    // Not used: The Daily Orange has no working feed (404).
    beatFeeds: [
      { name: "Syracuse Athletics", feed: "https://cuse.com/rss?path=football", site: "https://cuse.com/sports/football", logo: "https://cuse.com/favicon.ico" },
      { name: "Troy Nunes Is an Absolute Magician", feed: "https://www.nunesmagician.com/rss/current.xml", site: "https://www.nunesmagician.com/" },
      { name: "Syracuse On SI", feed: "https://www.si.com/college/syracuse/feed", site: "https://www.si.com/college/syracuse", logo: "https://images2.minutemediacdn.com/image/upload/v1720431406/SI/ON_SI-Favicon_B_96x96_3.ico" },
      { name: "On3", feed: "https://www.on3.com/teams/syracuse-orange/feed/", site: "https://www.on3.com/teams/syracuse-orange/", paths: ["/teams/syracuse-orange/"], logo: "https://on3static.com/static/on3/touch-icons/apple-touch-icon-180x180.png" }
    ]
  },

  series: [
    { match: /^boston college( eagles)?$/i, name: "Ben Schwartzwalder Trophy", kind: "trophy" }
  ],

  links: {
    // Where the program posts its game notes (Game links to it; David,
    // 2026-10-30): its schedule, where each game's notes are posted.
    gameNotes: { url: "https://cuse.com/sports/football/schedule", label: "cuse.com", kind: "schedule" },
    roster: { url: "https://cuse.com/sports/football/roster", label: "cuse.com" }
  },

  // Syracuse inside Suite: Navy, Syracuse Orange, every text pair checked at
  // 4.5:1 (tools/teamidentitycheck.js).
  identity: {
    programLabel: "SYRACUSE FOOTBALL",

    colors: {
      accent:         "#F76900",
      accentText:     "#F76900",
      accentOnLight:  "#000E54",
      accentInk:      "#000E54",
      accentSoft:     "#FBAC73",
      accentTint:     "#FEE4D1",
      accentTintSoft: "#FEF3EB",
      focus:          "#FFFFFF",
      surface:        "#000E54",
      surfaceDeep:    "#000A3C",
      surfaceAbyss:   "#000623",
      surfaceRaise:   "#1A2665"
    },

    // Syracuse's brand pages did not answer; Montserrat stands in. Please
    // confirm.
    fonts: {
      ui:       "'Montserrat','Instrument Sans',system-ui,-apple-system,sans-serif",
      display:  "'Montserrat','Instrument Display',sans-serif"
    }
  },

  // What .github/workflows/odds.yml commits for Syracuse, each because a
  // source exists for it.
  snapshots: {
    availability: { file: "data/syracuse/availability.json", history: "data/syracuse/availability-history.json", label: "TheACC.com" },
    beatNews:     { file: "data/syracuse/news.json" },
    recruits:     { file: "data/syracuse/recruits.json", label: "ESPN recruiting" }
  }
};
