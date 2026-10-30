/* UConn - Phase 4b, the Sun Belt, the MAC, Conference USA and UConn (David,
   2026-10-29). Same shape as teams/indiana.js; nothing else changed.

   From GitHub's network on 2026-10-29: ESPN team 41, its home field as
   ESPN's schedule spells it (Pratt & Whitney Stadium), and the beat feeds
   below (probe-feeds.yml). Approved with the phase's review sheet. */

var TEAM_CONFIG = {

  team: {
    id:           "uconn",
    name:         "UConn",
    abbreviation: "CONN",
    sport:        "football",
    league:       "college-football",
    timeZone:     "America/New_York",

    venue: {
      name: "Pratt & Whitney Stadium",
      lat:  41.7598,
      lon: -72.6189
    }
  },

  sources: {
    espn: {
      teamId: "41",
      broadcastFallback: []
    },

    // UConn is independent: no conference publishes its availability reports,
    // and HD Intelligence carries none (2026-10-29), so none are shown.

    // Beat writers, read by the Action server-side; each answered from
    // GitHub's network on 2026-10-29.
    // Not used: The UConn Blog (SB Nation) covers every UConn sport, so only
    // its stories that say football stay. UConn On SI has published nothing
    // about football since April, and there is no On3 team feed (404).
    beatFeeds: [
      { name: "UConn Athletics", feed: "https://uconnhuskies.com/rss?path=football", site: "https://uconnhuskies.com/sports/football", logo: "https://uconnhuskies.com/favicon.ico" },
      { name: "The UConn Blog", feed: "https://www.theuconnblog.com/rss/current.xml", site: "https://www.theuconnblog.com/", sportsSection: true },
      { name: "The Daily Campus", feed: "https://dailycampus.com/category/sports/feed/", site: "https://dailycampus.com/category/sports/", sportsSection: true }
    ]
  },

  series: [

  ],

  links: {
    roster: { url: "https://uconnhuskies.com/sports/football/roster", label: "uconnhuskies.com" }
  },

  // UConn inside Suite: National Flag Blue, Silver (ESPN's), every text pair checked at
  // 4.5:1 (tools/teamidentitycheck.js).
  identity: {
    programLabel: "UCONN FOOTBALL",

    colors: {
      accent:         "#A2AAAD",
      accentText:     "#A2AAAD",
      accentOnLight:  "#0C2340",
      accentInk:      "#0C2340",
      accentSoft:     "#CCD0D2",
      accentTint:     "#EEF0F0",
      accentTintSoft: "#F8F8F8",
      // Game Details in white, lettered in the team's colour: its silver
      // read as a disabled button (sweep, 2026-10-29; David, 2026-10-30).
      action:         "#FFFFFF",
      actionInk:      "#0C2340",
      focus:          "#FFFFFF",
      surface:        "#0C2340",
      surfaceDeep:    "#09192E",
      surfaceAbyss:   "#050F1B",
      surfaceRaise:   "#243953"
    },

    // The Group of Five read in Suite's own faces (David's plan for the FBS
    // build-out); the school's colours carry its identity.
    fonts: {
      ui:       "'Instrument Sans',system-ui,-apple-system,sans-serif",
      display:  "'Instrument Display',sans-serif"
    }
  },

  // What .github/workflows/odds.yml commits for UConn, each because a
  // source exists for it.
  snapshots: {
    beatNews:     { file: "data/uconn/news.json" },
    recruits:     { file: "data/uconn/recruits.json", label: "ESPN recruiting" }
  }
};
