/* Washington State - Phase 4a, the American, the Mountain West and the
   Pac-12 (David, 2026-10-29). Same shape as teams/indiana.js; nothing else
   changed.

   From GitHub's network on 2026-10-29: ESPN team 265, its home field as
   ESPN's schedule spells it (Martin Stadium), and the beat feeds below
   (probe-feeds.yml). Approved with the phase's review sheet. */

var TEAM_CONFIG = {

  team: {
    id:           "washington-state",
    name:         "Washington State",
    abbreviation: "WSU",
    sport:        "football",
    league:       "college-football",
    timeZone:     "America/Los_Angeles",

    venue: {
      name: "Martin Stadium",
      lat:  46.7319,
      lon: -117.1606
    }
  },

  sources: {
    espn: {
      teamId: "265",
      broadcastFallback: []
    },

    // The Pac-12 posts its availability reports on Pac-12.com, not through HD
    // Intelligence (2026-10-29); there is no reader for that page yet, so
    // none are shown.

    // Beat writers, read by the Action server-side; each answered from
    // GitHub's network on 2026-10-29.
    // Not used: wsucougars.com publishes no working feed, and On3's feed
    // carries only national stories.
    beatFeeds: [
      { name: "CougCenter", feed: "https://www.cougcenter.com/rss/current.xml", site: "https://www.cougcenter.com/" },
      { name: "Washington State On SI", feed: "https://www.si.com/college/washington-state/feed", site: "https://www.si.com/college/washington-state", logo: "https://images2.minutemediacdn.com/image/upload/v1720431406/SI/ON_SI-Favicon_B_96x96_3.ico" },
      { name: "The Daily Evergreen", feed: "https://dailyevergreen.com/category/sports/football/feed/", site: "https://dailyevergreen.com/category/sports/football/" }
    ]
  },

  series: [
    { match: /^washington( huskies)?$/i, name: "Apple Cup", kind: "trophy" }
  ],

  links: {
    roster: { url: "https://wsucougars.com/sports/football/roster", label: "wsucougars.com" }
  },

  // Washington State inside Suite: Crimson (ESPN's), white; ESPN's second colour is gray, every text pair checked at
  // 4.5:1 (tools/teamidentitycheck.js).
  identity: {
    programLabel: "WASHINGTON STATE FOOTBALL",

    colors: {
      accent:         "#FFFFFF",
      accentText:     "#FFFFFF",
      accentOnLight:  "#A60F2D",
      accentInk:      "#A60F2D",
      accentSoft:     "#FFFFFF",
      accentTint:     "#EFD4D9",
      accentTintSoft: "#F8ECEE",
      focus:          "#FFFFFF",
      surface:        "#A60F2D",
      surfaceDeep:    "#780B20",
      surfaceAbyss:   "#460613",
      surfaceRaise:   "#AF2742"
    },

    // The Group of Five read in Suite's own faces (David's plan for the FBS
    // build-out); the school's colours carry its identity.
    fonts: {
      ui:       "'Instrument Sans',system-ui,-apple-system,sans-serif",
      display:  "'Instrument Display',sans-serif"
    }
  },

  // What .github/workflows/odds.yml commits for Washington State, each because a
  // source exists for it.
  snapshots: {
    beatNews:     { file: "data/washington-state/news.json" },
    recruits:     { file: "data/washington-state/recruits.json", label: "ESPN recruiting" }
  }
};
