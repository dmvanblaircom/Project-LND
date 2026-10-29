/* Miami - Phase 3, the Big 12 and the ACC (David, 2026-10-28). Same
   shape as teams/indiana.js; nothing else changed.

   From GitHub's network on 2026-10-28: ESPN team 2390, its home field as
   ESPN's schedule spells it (Hard Rock Stadium), and the beat feeds below
   (probe-feeds.yml). Approved with the phase's review sheet. */

var TEAM_CONFIG = {

  team: {
    id:           "miami",
    name:         "Miami",
    abbreviation: "MIA",
    sport:        "football",
    league:       "college-football",
    timeZone:     "America/New_York",

    venue: {
      name: "Hard Rock Stadium",
      lat:  25.9580,
      lon: -80.2389
    }
  },

  sources: {
    espn: {
      teamId: "2390",
      broadcastFallback: []
    },

    // The ACC's availability reports (tools/producers/conference_availability.py).
    official: {
      availabilityReportIndex: "https://theacc.com/sports/2025/8/28/availability-reporting-football.aspx",
      availabilityReportLabel: "TheACC.com",
      availabilityFeed: { provider: "hdintelligence", conference: "ACC", sport: "Football", team: "Miami (FL)", aliases: ["Miami"] }
    },

    // Beat writers, read by the Action server-side; each answered from
    // GitHub's network on 2026-10-28. On3's team feeds carry league-wide
    // stories, so `paths` keeps only Miami's section.
    // Not used: miamihurricanes.com's feed is every sport; the Miami
    // Hurricane's feeds are empty.
    beatFeeds: [
      { name: "State of the U", feed: "https://www.stateoftheu.com/rss/current.xml", site: "https://www.stateoftheu.com/" },
      { name: "Miami On SI", feed: "https://www.si.com/college/miami/feed", site: "https://www.si.com/college/miami", logo: "https://images2.minutemediacdn.com/image/upload/v1720431406/SI/ON_SI-Favicon_B_96x96_3.ico" },
      { name: "On3", feed: "https://www.on3.com/teams/miami-hurricanes/feed/", site: "https://www.on3.com/teams/miami-hurricanes/", paths: ["/teams/miami-hurricanes/"], logo: "https://on3static.com/static/on3/touch-icons/apple-touch-icon-180x180.png" }
    ]
  },

  series: [
    { match: /^florida state( seminoles)?$/i, name: "Florida State-Miami", kind: "rivalry" }
  ],

  links: {
    roster: { url: "https://miamihurricanes.com/sports/football/roster", label: "miamihurricanes.com" }
  },

  // Miami inside Suite: Green, Orange (ESPN's), every text pair checked at
  // 4.5:1 (tools/teamidentitycheck.js).
  identity: {
    programLabel: "MIAMI FOOTBALL",

    colors: {
      accent:         "#F47321",
      accentText:     "#F47625",
      accentOnLight:  "#005030",
      accentInk:      "#111111",
      accentSoft:     "#F9B285",
      accentTint:     "#FDE6D7",
      accentTintSoft: "#FEF4ED",
      focus:          "#FFFFFF",
      surface:        "#005030",
      surfaceDeep:    "#003A23",
      surfaceAbyss:   "#002214",
      surfaceRaise:   "#1A6245"
    },

    // Miami's brand pages did not answer; Inter stands in. Please confirm.
    fonts: {
      ui:       "'Inter','Instrument Sans',system-ui,-apple-system,sans-serif",
      display:  "'Inter','Instrument Display',sans-serif"
    }
  },

  // What .github/workflows/odds.yml commits for Miami, each because a
  // source exists for it.
  snapshots: {
    availability: { file: "data/miami/availability.json", history: "data/miami/availability-history.json", label: "TheACC.com" },
    beatNews:     { file: "data/miami/news.json" },
    recruits:     { file: "data/miami/recruits.json", label: "ESPN recruiting" }
  }
};
