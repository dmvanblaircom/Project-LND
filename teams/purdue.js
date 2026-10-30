/* Purdue - Phase 1, the rest of the Big Ten (David, 2026-10-27). Same
   shape as teams/indiana.js; nothing else changed.

   From GitHub's network on 2026-10-27: ESPN team 2509, its home field as
   ESPN's schedule spells it (Ross-Ade Stadium), and the beat feeds below
   (probe-feeds.yml). Approved with the phase's review sheet. */

var TEAM_CONFIG = {

  team: {
    id:           "purdue",
    name:         "Purdue",
    abbreviation: "PUR",
    sport:        "football",
    league:       "college-football",
    timeZone:     "America/Indiana/Indianapolis",

    venue: {
      name: "Ross-Ade Stadium",
      lat:  40.4351,
      lon: -86.9186
    }
  },

  sources: {
    espn: {
      teamId: "2509",
      broadcastFallback: []
    },

    // The Big Ten's availability reports (tools/producers/conference_availability.py).
    official: {
      availabilityReportIndex: "https://bigten.org/sports/2026/9/10/FB_Availability_Reports.aspx",
      availabilityReportLabel: "BigTen.org",
      availabilityFeed: { provider: "hdintelligence", conference: "B10", sport: "Football", team: "Purdue" }
    },

    // Beat writers, read by the Action server-side; each answered from
    // GitHub's network on 2026-10-27. On3's team feeds carry league-wide
    // stories, so `paths` keeps only Purdue's section.
    // Not used: purduesports.com has no feed; the Exponent turned GitHub's
    // network away (429).
    beatFeeds: [
      { name: "Hammer and Rails", feed: "https://www.hammerandrails.com/rss/current.xml", site: "https://www.hammerandrails.com/" },
      { name: "Purdue On SI", feed: "https://www.si.com/college/purdue/feed", site: "https://www.si.com/college/purdue", logo: "https://images2.minutemediacdn.com/image/upload/v1720431406/SI/ON_SI-Favicon_B_96x96_3.ico" },
      { name: "On3", feed: "https://www.on3.com/teams/purdue-boilermakers/feed/", site: "https://www.on3.com/teams/purdue-boilermakers/", paths: ["/teams/purdue-boilermakers/"], logo: "https://on3static.com/static/on3/touch-icons/apple-touch-icon-180x180.png" }
    ]
  },

  series: [
    { match: /^indiana( hoosiers)?$/i, name: "Old Oaken Bucket", kind: "trophy" },
    { match: /^illinois( fighting illini)?$/i, name: "Purdue Cannon", kind: "trophy" }
  ],

  links: {
    // Where the program posts its game notes (Game links to it; David,
    // 2026-10-30): its schedule, where each game's notes are posted.
    gameNotes: { url: "https://purduesports.com/sports/football/schedule", label: "purduesports.com", kind: "schedule" },
    roster: { url: "https://purduesports.com/sports/football/roster", label: "purduesports.com" }
  },

  // Purdue inside Suite: Black, Boilermaker Gold (purdue.edu/brand-studio), every text pair checked at
  // 4.5:1 (tools/teamidentitycheck.js).
  identity: {
    programLabel: "PURDUE FOOTBALL",

    colors: {
      accent:         "#CFB991",
      accentText:     "#CFB991",
      accentOnLight:  "#000000",
      accentInk:      "#000000",
      accentSoft:     "#E5D8C2",
      accentTint:     "#F6F2EB",
      accentTintSoft: "#FBF9F6",
      focus:          "#FFFFFF",
      surface:        "#000000",
      surfaceDeep:    "#000000",
      surfaceAbyss:   "#000000",
      surfaceRaise:   "#1A1A1A"
    },

    // Purdue's faces (United Sans, Acumin Pro) are licensed; its own
    // alternates are Impact and Franklin Gothic, matched by Anton and Libre
    // Franklin.
    fonts: {
      ui:       "'Libre Franklin','Instrument Sans',system-ui,-apple-system,sans-serif",
      display:  "'Anton','Instrument Display',sans-serif"
    }
  },

  // What .github/workflows/odds.yml commits for Purdue, each because a
  // source exists for it.
  snapshots: {
    availability: { file: "data/purdue/availability.json", history: "data/purdue/availability-history.json", label: "BigTen.org" },
    beatNews:     { file: "data/purdue/news.json" },
    recruits:     { file: "data/purdue/recruits.json", label: "ESPN recruiting" }
  }
};
