/* North Carolina - Phase 3, the Big 12 and the ACC (David, 2026-10-28). Same
   shape as teams/indiana.js; nothing else changed.

   From GitHub's network on 2026-10-28: ESPN team 153, its home field as
   ESPN's schedule spells it (Kenan Stadium), and the beat feeds below
   (probe-feeds.yml). Approved with the phase's review sheet. */

var TEAM_CONFIG = {

  team: {
    id:           "north-carolina",
    name:         "North Carolina",
    abbreviation: "UNC",
    sport:        "football",
    league:       "college-football",
    timeZone:     "America/New_York",

    venue: {
      name: "Kenan Stadium",
      lat:  35.9069,
      lon: -79.0478
    }
  },

  sources: {
    espn: {
      teamId: "153",
      broadcastFallback: []
    },

    // The ACC's availability reports (tools/producers/conference_availability.py).
    official: {
      availabilityReportIndex: "https://theacc.com/sports/2025/8/28/availability-reporting-football.aspx",
      availabilityReportLabel: "TheACC.com",
      availabilityFeed: { provider: "hdintelligence", conference: "ACC", sport: "Football", team: "North Carolina" }
    },

    // Beat writers, read by the Action server-side; each answered from
    // GitHub's network on 2026-10-28. On3's team feeds carry league-wide
    // stories, so `paths` keeps only North Carolina's section.
    // Not used: The Daily Tar Heel has no working feed.
    beatFeeds: [
      { name: "North Carolina Athletics", feed: "https://goheels.com/rss?path=football", site: "https://goheels.com/sports/football", logo: "https://goheels.com/favicon.ico" },
      { name: "Tar Heel Blog", feed: "https://www.tarheelblog.com/rss/current.xml", site: "https://www.tarheelblog.com/" },
      { name: "North Carolina On SI", feed: "https://www.si.com/college/unc/feed", site: "https://www.si.com/college/unc", logo: "https://images2.minutemediacdn.com/image/upload/v1720431406/SI/ON_SI-Favicon_B_96x96_3.ico" },
      { name: "On3", feed: "https://www.on3.com/teams/north-carolina-tar-heels/feed/", site: "https://www.on3.com/teams/north-carolina-tar-heels/", paths: ["/teams/north-carolina-tar-heels/"], logo: "https://on3static.com/static/on3/touch-icons/apple-touch-icon-180x180.png" }
    ]
  },

  series: [
    { match: /^duke( blue devils)?$/i, name: "Victory Bell", kind: "trophy" },
    { match: /^virginia( cavaliers)?$/i, name: "South’s Oldest Rivalry", kind: "rivalry" },
    { match: /^nc state( wolfpack)?$/i, name: "NC State-North Carolina", kind: "rivalry" }
  ],

  links: {
    roster: { url: "https://goheels.com/sports/football/roster", label: "goheels.com" }
  },

  // North Carolina inside Suite: Navy, Carolina Blue (ESPN's), every text pair checked at
  // 4.5:1 (tools/teamidentitycheck.js).
  identity: {
    programLabel: "NORTH CAROLINA FOOTBALL",

    colors: {
      accent:         "#7BAFD4",
      accentText:     "#7BAFD4",
      accentOnLight:  "#13294B",
      accentInk:      "#13294B",
      accentSoft:     "#B6D3E7",
      accentTint:     "#E7F1F7",
      accentTintSoft: "#F4F9FC",
      focus:          "#FFFFFF",
      surface:        "#13294B",
      surfaceDeep:    "#0E1E36",
      surfaceAbyss:   "#081120",
      surfaceRaise:   "#2B3E5D"
    },

    // Carolina's brand faces are Open Sans and Field Gothic; Field Gothic is
    // licensed, and the university names Oswald in its place
    // (identity.unc.edu).
    fonts: {
      ui:       "'Open Sans','Instrument Sans',system-ui,-apple-system,sans-serif",
      display:  "'Oswald','Instrument Display',sans-serif"
    }
  },

  // What .github/workflows/odds.yml commits for North Carolina, each because a
  // source exists for it.
  snapshots: {
    availability: { file: "data/north-carolina/availability.json", history: "data/north-carolina/availability-history.json", label: "TheACC.com" },
    beatNews:     { file: "data/north-carolina/news.json" },
    recruits:     { file: "data/north-carolina/recruits.json", label: "ESPN recruiting" }
  }
};
