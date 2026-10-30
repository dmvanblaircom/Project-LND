/* Cincinnati - Phase 3, the Big 12 and the ACC (David, 2026-10-28). Same
   shape as teams/indiana.js; nothing else changed.

   From GitHub's network on 2026-10-28: ESPN team 2132, its home field as
   ESPN's schedule spells it (Nippert Stadium), and the beat feeds below
   (probe-feeds.yml). Approved with the phase's review sheet. */

var TEAM_CONFIG = {

  team: {
    id:           "cincinnati",
    name:         "Cincinnati",
    abbreviation: "CIN",
    sport:        "football",
    league:       "college-football",
    timeZone:     "America/New_York",

    venue: {
      name: "Nippert Stadium",
      lat:  39.1312,
      lon: -84.5163
    }
  },

  sources: {
    espn: {
      teamId: "2132",
      broadcastFallback: []
    },

    // The Big 12's availability reports (tools/producers/conference_availability.py).
    official: {
      availabilityReportIndex: "https://big12sports.com/sports/football",
      availabilityReportLabel: "Big12Sports.com",
      availabilityFeed: { provider: "hdintelligence", conference: "B12", sport: "Football", team: "Cincinnati" }
    },

    // Beat writers, read by the Action server-side; each answered from
    // GitHub's network on 2026-10-28. On3's team feeds carry league-wide
    // stories, so `paths` keeps only Cincinnati's section.
    // Not used: Two sources only: gobearcats.com has no feed, Down the Drive
    // (SB Nation) did not answer, and the News Record turned GitHub's network
    // away (429).
    beatFeeds: [
      { name: "Cincinnati On SI", feed: "https://www.si.com/college/cincinnati/feed", site: "https://www.si.com/college/cincinnati", logo: "https://images2.minutemediacdn.com/image/upload/v1720431406/SI/ON_SI-Favicon_B_96x96_3.ico" },
      { name: "On3", feed: "https://www.on3.com/teams/cincinnati-bearcats/feed/", site: "https://www.on3.com/teams/cincinnati-bearcats/", paths: ["/teams/cincinnati-bearcats/"], logo: "https://on3static.com/static/on3/touch-icons/apple-touch-icon-180x180.png" }
    ]
  },

  series: [
    { match: /^louisville( cardinals)?$/i, name: "Keg of Nails", kind: "trophy" },
    { match: /^miami \(oh\)( redhawks)?$|^miami oh( redhawks)?$/i, name: "Victory Bell", kind: "trophy" }
  ],

  links: {
    // Where the program posts its game notes (Game links to it; David,
    // 2026-10-30): its schedule, where each game's notes are posted.
    gameNotes: { url: "https://gobearcats.com/sports/football/schedule", label: "gobearcats.com", kind: "schedule" },
    roster: { url: "https://gobearcats.com/sports/football/roster", label: "gobearcats.com" }
  },

  // Cincinnati inside Suite: Black, Bearcat Red (ESPN's), every text pair checked at
  // 4.5:1 (tools/teamidentitycheck.js).
  identity: {
    programLabel: "CINCINNATI FOOTBALL",

    colors: {
      accent:         "#E00122",
      accentText:     "#E41F3D",
      accentOnLight:  "#000000",
      accentInk:      "#FFFFFF",
      accentSoft:     "#EE7385",
      accentTint:     "#F9D1D7",
      accentTintSoft: "#FDEBED",
      focus:          "#FFFFFF",
      surface:        "#000000",
      surfaceDeep:    "#000000",
      surfaceAbyss:   "#000000",
      surfaceRaise:   "#1A1A1A"
    },

    // Cincinnati's typefaces could not be read from its brand pages; Barlow
    // is matched to its athletics lettering. Please confirm.
    fonts: {
      ui:       "'Barlow','Instrument Sans',system-ui,-apple-system,sans-serif",
      display:  "'Barlow','Instrument Display',sans-serif"
    }
  },

  // What .github/workflows/odds.yml commits for Cincinnati, each because a
  // source exists for it.
  snapshots: {
    availability: { file: "data/cincinnati/availability.json", history: "data/cincinnati/availability-history.json", label: "Big12Sports.com" },
    beatNews:     { file: "data/cincinnati/news.json" },
    recruits:     { file: "data/cincinnati/recruits.json", label: "ESPN recruiting" }
  }
};
