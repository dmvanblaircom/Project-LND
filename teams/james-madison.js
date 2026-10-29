/* James Madison - Phase 4b, the Sun Belt, the MAC, Conference USA and UConn
   (David, 2026-10-29). Same shape as teams/indiana.js; nothing else changed.

   From GitHub's network on 2026-10-29: ESPN team 256, its home field as
   ESPN's schedule spells it (Bridgeforth Stadium), and the beat feeds below
   (probe-feeds.yml). Approved with the phase's review sheet. */

var TEAM_CONFIG = {

  team: {
    id:           "james-madison",
    name:         "James Madison",
    abbreviation: "JMU",
    sport:        "football",
    league:       "college-football",
    timeZone:     "America/New_York",

    venue: {
      name: "Bridgeforth Stadium",
      lat:  38.4352,
      lon: -78.8726
    }
  },

  sources: {
    espn: {
      teamId: "256",
      broadcastFallback: []
    },
    kalshi: {
      tickerSuffix: "-JMU",
      namePattern:  /james madison|\bjmu\b/i
    },

    // The Sun Belt publishes no availability reports that HD Intelligence
    // carries or that could be found on sunbeltsports.org (2026-10-29), so
    // none are shown.

    // Beat writers, read by the Action server-side; each answered from
    // GitHub's network on 2026-10-29.
    // One source only: The Breeze publishes no working feed, On SI has no JMU
    // site (404), and On3's feed carries only national stories.
    beatFeeds: [
      { name: "JMU Athletics", feed: "https://jmusports.com/rss?path=football", site: "https://jmusports.com/sports/football", logo: "https://jmusports.com/favicon.ico" }
    ]
  },

  series: [
    { match: /^old dominion( monarchs)?$/i, name: "Royal Rivalry", kind: "rivalry" }
  ],

  links: {
    roster: { url: "https://jmusports.com/sports/football/roster", label: "jmusports.com" }
  },

  // James Madison inside Suite: Purple, Gold (ESPN's), every text pair checked at
  // 4.5:1 (tools/teamidentitycheck.js).
  identity: {
    programLabel: "JMU FOOTBALL",

    colors: {
      accent:         "#CBB677",
      accentText:     "#CBB677",
      accentOnLight:  "#450084",
      accentInk:      "#450084",
      accentSoft:     "#E2D7B4",
      accentTint:     "#F6F2E7",
      accentTintSoft: "#FBF9F4",
      focus:          "#FFFFFF",
      surface:        "#450084",
      surfaceDeep:    "#32005F",
      surfaceAbyss:   "#1D0037",
      surfaceRaise:   "#581A90"
    },

    // The Group of Five read in Suite's own faces (David's plan for the FBS
    // build-out); the school's colours carry its identity.
    fonts: {
      ui:       "'Instrument Sans',system-ui,-apple-system,sans-serif",
      display:  "'Instrument Display',sans-serif"
    }
  },

  // What .github/workflows/odds.yml commits for James Madison, each because a
  // source exists for it.
  snapshots: {
    oddsHistory:  { file: "data/james-madison/odds-history.json" },
    beatNews:     { file: "data/james-madison/news.json" },
    recruits:     { file: "data/james-madison/recruits.json", label: "ESPN recruiting" }
  }
};
