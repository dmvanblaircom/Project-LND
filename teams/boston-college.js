/* Boston College - Phase 3, the Big 12 and the ACC (David, 2026-10-28). Same
   shape as teams/indiana.js; nothing else changed.

   From GitHub's network on 2026-10-28: ESPN team 103, its home field as
   ESPN's schedule spells it (Alumni Stadium (Chestnut Hill, MA)), and the beat feeds below
   (probe-feeds.yml). Approved with the phase's review sheet. */

var TEAM_CONFIG = {

  team: {
    id:           "boston-college",
    name:         "Boston College",
    abbreviation: "BC",
    sport:        "football",
    league:       "college-football",
    timeZone:     "America/New_York",

    venue: {
      name: "Alumni Stadium (Chestnut Hill, MA)",
      lat:  42.3351,
      lon: -71.1665
    }
  },

  sources: {
    espn: {
      teamId: "103",
      broadcastFallback: []
    },

    // The ACC's availability reports (tools/producers/conference_availability.py).
    official: {
      availabilityReportIndex: "https://theacc.com/sports/2025/8/28/availability-reporting-football.aspx",
      availabilityReportLabel: "TheACC.com",
      availabilityFeed: { provider: "hdintelligence", conference: "ACC", sport: "Football", team: "Boston College" }
    },

    // Beat writers, read by the Action server-side; each answered from
    // GitHub's network on 2026-10-28.
    // Not used: No On3 team feed (404).
    beatFeeds: [
      { name: "Boston College Athletics", feed: "https://bceagles.com/rss?path=football", site: "https://bceagles.com/sports/football", logo: "https://bceagles.com/favicon.ico" },
      { name: "BC Interruption", feed: "https://www.bcinterruption.com/rss/current.xml", site: "https://www.bcinterruption.com/" },
      { name: "Boston College On SI", feed: "https://www.si.com/college/bostoncollege/feed", site: "https://www.si.com/college/bostoncollege", logo: "https://images2.minutemediacdn.com/image/upload/v1720431406/SI/ON_SI-Favicon_B_96x96_3.ico" },
      { name: "The Heights", feed: "https://www.bcheights.com/category/sports/football/feed/", site: "https://www.bcheights.com/category/sports/football/" }
    ]
  },

  series: [
    { match: /^syracuse( orange)?$/i, name: "Ben Schwartzwalder Trophy", kind: "trophy" },
    { match: /^notre dame( fighting irish)?$/i, name: "Frank Leahy Memorial Bowl", kind: "trophy" }
  ],

  links: {
    roster: { url: "https://bceagles.com/sports/football/roster", label: "bceagles.com" }
  },

  // Boston College inside Suite: Maroon, Gold (ESPN's), every text pair checked at
  // 4.5:1 (tools/teamidentitycheck.js).
  identity: {
    programLabel: "BOSTON COLLEGE FOOTBALL",

    colors: {
      accent:         "#DBCCA6",
      accentText:     "#DBCCA6",
      accentOnLight:  "#8C2232",
      accentInk:      "#8C2232",
      accentSoft:     "#EBE3CE",
      accentTint:     "#F9F6EF",
      accentTintSoft: "#FCFBF8",
      focus:          "#FFFFFF",
      surface:        "#8C2232",
      surfaceDeep:    "#651824",
      surfaceAbyss:   "#3B0E15",
      surfaceRaise:   "#983846"
    },

    // Boston College's brand pages did not answer; Libre Franklin stands in.
    // Please confirm.
    fonts: {
      ui:       "'Libre Franklin','Instrument Sans',system-ui,-apple-system,sans-serif",
      display:  "'Libre Franklin','Instrument Display',sans-serif"
    }
  },

  // What .github/workflows/odds.yml commits for Boston College, each because a
  // source exists for it.
  snapshots: {
    availability: { file: "data/boston-college/availability.json", history: "data/boston-college/availability-history.json", label: "TheACC.com" },
    beatNews:     { file: "data/boston-college/news.json" },
    recruits:     { file: "data/boston-college/recruits.json", label: "ESPN recruiting" }
  }
};
