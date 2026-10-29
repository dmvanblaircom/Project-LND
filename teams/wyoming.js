/* Wyoming - Phase 4a, the American, the Mountain West and the Pac-12 (David,
   2026-10-29). Same shape as teams/indiana.js; nothing else changed.

   From GitHub's network on 2026-10-29: ESPN team 2751, its home field as
   ESPN's schedule spells it (War Memorial Stadium), and the beat feeds below
   (probe-feeds.yml). Approved with the phase's review sheet. */

var TEAM_CONFIG = {

  team: {
    id:           "wyoming",
    name:         "Wyoming",
    abbreviation: "WYO",
    sport:        "football",
    league:       "college-football",
    timeZone:     "America/Denver",

    venue: {
      name: "War Memorial Stadium",
      lat:  41.3117,
      lon: -105.5683
    }
  },

  sources: {
    espn: {
      teamId: "2751",
      broadcastFallback: []
    },

    // The Mountain West publishes no availability reports that HD
    // Intelligence carries or that could be found on themw.com (2026-10-29),
    // so none are shown.

    // Beat writers, read by the Action server-side; each answered from
    // GitHub's network on 2026-10-29.
    // One source only: On SI has no Wyoming site (404), and On3's feed
    // carries only national stories.
    beatFeeds: [
      { name: "Wyoming Athletics", feed: "https://gowyo.com/rss?path=football", site: "https://gowyo.com/sports/football", logo: "https://gowyo.com/favicon.ico" },
      { name: "The Branding Iron", feed: "https://www.uwbrandingiron.com/?feed=rss2", site: "https://www.uwbrandingiron.com/", sportsSection: true }
    ]
  },

  series: [
    { match: /^colorado state( rams)?$/i, name: "Bronze Boot", kind: "trophy" },
    { match: /^hawai'?i( rainbow warriors)?$/i, name: "Paniolo Trophy", kind: "trophy" }
  ],

  links: {
    roster: { url: "https://gowyo.com/sports/football/roster", label: "gowyo.com" }
  },

  // Wyoming inside Suite: Brown, Gold (ESPN's), every text pair checked at
  // 4.5:1 (tools/teamidentitycheck.js).
  identity: {
    programLabel: "WYOMING FOOTBALL",

    colors: {
      accent:         "#FFC425",
      accentText:     "#FFC425",
      accentOnLight:  "#492F24",
      accentInk:      "#492F24",
      accentSoft:     "#FFDF87",
      accentTint:     "#FFF4D8",
      accentTintSoft: "#FFFAEE",
      focus:          "#FFFFFF",
      surface:        "#492F24",
      surfaceDeep:    "#35221A",
      surfaceAbyss:   "#1F140F",
      surfaceRaise:   "#5B443A"
    },

    // The Group of Five read in Suite's own faces (David's plan for the FBS
    // build-out); the school's colours carry its identity.
    fonts: {
      ui:       "'Instrument Sans',system-ui,-apple-system,sans-serif",
      display:  "'Instrument Display',sans-serif"
    }
  },

  // What .github/workflows/odds.yml commits for Wyoming, each because a
  // source exists for it.
  snapshots: {
    beatNews:     { file: "data/wyoming/news.json" },
    recruits:     { file: "data/wyoming/recruits.json", label: "ESPN recruiting" }
  }
};
