/* Massachusetts - Phase 4b, the Sun Belt, the MAC, Conference USA and UConn
   (David, 2026-10-29). Same shape as teams/indiana.js; nothing else changed.

   From GitHub's network on 2026-10-29: ESPN team 113, its home field as
   ESPN's schedule spells it (Warren McGuirk Alumni Stadium), and the beat
   feeds below (probe-feeds.yml). Approved with the phase's review sheet. */

var TEAM_CONFIG = {

  team: {
    id:           "massachusetts",
    name:         "Massachusetts",
    abbreviation: "MASS",
    sport:        "football",
    league:       "college-football",
    timeZone:     "America/New_York",

    venue: {
      name: "Warren McGuirk Alumni Stadium",
      lat:  42.3776,
      lon: -72.5361
    }
  },

  sources: {
    espn: {
      teamId: "113",
      broadcastFallback: []
    },

    // The MAC's availability reports (tools/producers/conference_availability.py).
    official: {
      availabilityReportIndex: "https://getsomemaction.com/sports/football",
      availabilityReportLabel: "GetSomeMACtion.com",
      availabilityFeed: { provider: "hdintelligence", conference: "MAC", sport: "Football", team: "Massachusetts" }
    },

    // Beat writers, read by the Action server-side; each answered from
    // GitHub's network on 2026-10-29.
    // Not used: On SI has no UMass site (404), and On3's feed carries only
    // national stories.
    beatFeeds: [
      { name: "UMass Athletics", feed: "https://umassathletics.com/rss?path=football", site: "https://umassathletics.com/sports/football", logo: "https://umassathletics.com/favicon.ico" },
      { name: "Massachusetts Daily Collegian", feed: "https://dailycollegian.com/category/sports/football/feed/", site: "https://dailycollegian.com/category/sports/football/" }
    ]
  },

  series: [

  ],

  links: {
    roster: { url: "https://umassathletics.com/sports/football/roster", label: "umassathletics.com" }
  },

  // Massachusetts inside Suite: Maroon (ESPN's), white, every text pair checked at
  // 4.5:1 (tools/teamidentitycheck.js).
  identity: {
    programLabel: "UMASS FOOTBALL",

    colors: {
      accent:         "#FFFFFF",
      accentText:     "#FFFFFF",
      accentOnLight:  "#881C1C",
      accentInk:      "#881C1C",
      accentSoft:     "#FFFFFF",
      accentTint:     "#EAD6D6",
      accentTintSoft: "#F5EDED",
      focus:          "#FFFFFF",
      surface:        "#881C1C",
      surfaceDeep:    "#621414",
      surfaceAbyss:   "#390C0C",
      surfaceRaise:   "#943333"
    },

    // The Group of Five read in Suite's own faces (David's plan for the FBS
    // build-out); the school's colours carry its identity.
    fonts: {
      ui:       "'Instrument Sans',system-ui,-apple-system,sans-serif",
      display:  "'Instrument Display',sans-serif"
    }
  },

  // What .github/workflows/odds.yml commits for Massachusetts, each because a
  // source exists for it.
  snapshots: {
    availability: { file: "data/massachusetts/availability.json", history: "data/massachusetts/availability-history.json", label: "GetSomeMACtion.com" },
    beatNews:     { file: "data/massachusetts/news.json" },
    recruits:     { file: "data/massachusetts/recruits.json", label: "ESPN recruiting" }
  }
};
