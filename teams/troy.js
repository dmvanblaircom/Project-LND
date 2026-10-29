/* Troy - Phase 4b, the Sun Belt, the MAC, Conference USA and UConn (David,
   2026-10-29). Same shape as teams/indiana.js; nothing else changed.

   From GitHub's network on 2026-10-29: ESPN team 2653, its home field as
   ESPN's schedule spells it (Veterans Memorial Stadium (AL)), and the beat
   feeds below (probe-feeds.yml). Approved with the phase's review sheet. */

var TEAM_CONFIG = {

  team: {
    id:           "troy",
    name:         "Troy",
    abbreviation: "TROY",
    sport:        "football",
    league:       "college-football",
    timeZone:     "America/Chicago",

    venue: {
      name: "Veterans Memorial Stadium (AL)",
      lat:  31.8013,
      lon: -85.9531
    }
  },

  sources: {
    espn: {
      teamId: "2653",
      broadcastFallback: []
    },

    // The Sun Belt publishes no availability reports that HD Intelligence
    // carries or that could be found on sunbeltsports.org (2026-10-29), so
    // none are shown.

    // Beat writers, read by the Action server-side; each answered from
    // GitHub's network on 2026-10-29.
    // One source only: On SI has no Troy site (404), On3's feed carries only
    // national stories, and no student paper feed was found.
    beatFeeds: [
      { name: "Troy Athletics", feed: "https://troytrojans.com/rss?path=football", site: "https://troytrojans.com/sports/football", logo: "https://troytrojans.com/favicon.ico" },
      { name: "The Tropolitan", feed: "https://www.tropnews.com/blog-feed.xml", site: "https://www.tropnews.com/", sportsSection: true }
    ]
  },

  series: [
    { match: /^south alabama( jaguars)?$/i, name: "Battle for the Belt", kind: "trophy" }
  ],

  links: {
    roster: { url: "https://troytrojans.com/sports/football/roster", label: "troytrojans.com" }
  },

  // Troy inside Suite: Cardinal, Silver (ESPN's), every text pair checked at
  // 4.5:1 (tools/teamidentitycheck.js).
  identity: {
    programLabel: "TROY FOOTBALL",

    colors: {
      accent:         "#B1B1B1",
      accentText:     "#B1B1B1",
      accentOnLight:  "#862633",
      accentInk:      "#601B25",
      accentSoft:     "#D4D4D4",
      accentTint:     "#F1F1F1",
      accentTintSoft: "#F9F9F9",
      focus:          "#FFFFFF",
      surface:        "#862633",
      surfaceDeep:    "#601B25",
      surfaceAbyss:   "#381015",
      surfaceRaise:   "#923C47"
    },

    // The Group of Five read in Suite's own faces (David's plan for the FBS
    // build-out); the school's colours carry its identity.
    fonts: {
      ui:       "'Instrument Sans',system-ui,-apple-system,sans-serif",
      display:  "'Instrument Display',sans-serif"
    }
  },

  // What .github/workflows/odds.yml commits for Troy, each because a
  // source exists for it.
  snapshots: {
    beatNews:     { file: "data/troy/news.json" },
    recruits:     { file: "data/troy/recruits.json", label: "ESPN recruiting" }
  }
};
