/* Iowa State - Phase 3, the Big 12 and the ACC (David, 2026-10-28). Same
   shape as teams/indiana.js; nothing else changed.

   From GitHub's network on 2026-10-28: ESPN team 66, its home field as
   ESPN's schedule spells it (Jack Trice Stadium), and the beat feeds below
   (probe-feeds.yml). Approved with the phase's review sheet. */

var TEAM_CONFIG = {

  team: {
    id:           "iowa-state",
    name:         "Iowa State",
    abbreviation: "ISU",
    sport:        "football",
    league:       "college-football",
    timeZone:     "America/Chicago",

    venue: {
      name: "Jack Trice Stadium",
      lat:  42.0140,
      lon: -93.6358
    }
  },

  sources: {
    espn: {
      teamId: "66",
      broadcastFallback: []
    },

    // The Big 12's availability reports (tools/producers/conference_availability.py).
    official: {
      availabilityReportIndex: "https://big12sports.com/sports/football",
      availabilityReportLabel: "Big12Sports.com",
      availabilityFeed: { provider: "hdintelligence", conference: "B12", sport: "Football", team: "Iowa St.", aliases: ["Iowa State"] }
    },

    // Beat writers, read by the Action server-side; each answered from
    // GitHub's network on 2026-10-28.
    // Not used: The Iowa State Daily's feed is gone (410); no On3 team feed
    // (404).
    beatFeeds: [
      { name: "Iowa State Athletics", feed: "https://cyclones.com/rss?path=football", site: "https://cyclones.com/sports/football", logo: "https://cyclones.com/favicon.ico" },
      { name: "Wide Right & Natty Lite", feed: "https://www.widerightnattylite.com/rss/current.xml", site: "https://www.widerightnattylite.com/" },
      { name: "Iowa State On SI", feed: "https://www.si.com/college/iowa-state/feed", site: "https://www.si.com/college/iowa-state", logo: "https://images2.minutemediacdn.com/image/upload/v1720431406/SI/ON_SI-Favicon_B_96x96_3.ico" },
      { name: "Cyclone Fanatic", feed: "https://www.cyclonefanatic.com/feed/", site: "https://www.cyclonefanatic.com/" }
    ]
  },

  series: [
    { match: /^iowa( hawkeyes)?$/i, name: "Cy-Hawk Trophy", kind: "trophy" },
    { match: /^kansas state( wildcats)?$/i, name: "Farmageddon", kind: "rivalry" }
  ],

  links: {
    roster: { url: "https://cyclones.com/sports/football/roster", label: "cyclones.com" }
  },

  // Iowa State inside Suite: Cardinal, Gold (Iowa State's published values), every text pair checked at
  // 4.5:1 (tools/teamidentitycheck.js).
  identity: {
    programLabel: "IOWA STATE FOOTBALL",

    colors: {
      accent:         "#F1BE48",
      accentText:     "#F1BE48",
      accentOnLight:  "#C8102E",
      accentInk:      "#900C21",
      accentSoft:     "#F7DB9A",
      accentTint:     "#FCF3DE",
      accentTintSoft: "#FEFAF0",
      focus:          "#FFFFFF",
      surface:        "#C8102E",
      surfaceDeep:    "#900C21",
      surfaceAbyss:   "#540713",
      surfaceRaise:   "#CE2843"
    },

    // Iowa State's brand pages did not answer; Roboto stands in. Please
    // confirm.
    fonts: {
      ui:       "'Roboto','Instrument Sans',system-ui,-apple-system,sans-serif",
      display:  "'Roboto','Instrument Display',sans-serif"
    }
  },

  // What .github/workflows/odds.yml commits for Iowa State, each because a
  // source exists for it.
  snapshots: {
    availability: { file: "data/iowa-state/availability.json", history: "data/iowa-state/availability-history.json", label: "Big12Sports.com" },
    beatNews:     { file: "data/iowa-state/news.json" },
    recruits:     { file: "data/iowa-state/recruits.json", label: "ESPN recruiting" }
  }
};
