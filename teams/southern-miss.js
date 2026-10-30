/* Southern Miss - Phase 4b, the Sun Belt, the MAC, Conference USA and UConn
   (David, 2026-10-29). Same shape as teams/indiana.js; nothing else changed.

   From GitHub's network on 2026-10-29: ESPN team 2572, its home field as
   ESPN's schedule spells it (M. M. Roberts Stadium), and the beat feeds
   below (probe-feeds.yml). Approved with the phase's review sheet. */

var TEAM_CONFIG = {

  team: {
    id:           "southern-miss",
    name:         "Southern Miss",
    abbreviation: "USM",
    sport:        "football",
    league:       "college-football",
    timeZone:     "America/Chicago",

    venue: {
      name: "M. M. Roberts Stadium",
      lat:  31.3285,
      lon: -89.3317
    }
  },

  sources: {
    espn: {
      teamId: "2572",
      broadcastFallback: []
    },

    // The Sun Belt publishes no availability reports that HD Intelligence
    // carries or that could be found on sunbeltsports.org (2026-10-29), so
    // none are shown.

    // Beat writers, read by the Action server-side; each answered from
    // GitHub's network on 2026-10-29.
    // Southern Miss On SI covers every sport, so only its stories that say
    // football stay. Big Gold Nation is On3's fan site for Southern Miss (the
    // former Rivals site), read through its own section so On3's national
    // stories stay out (2026-10-29). Not used: the Student Printz refused
    // GitHub's network (403).
    beatFeeds: [
      { name: "Southern Miss Athletics", feed: "https://southernmiss.com/rss?path=football", site: "https://southernmiss.com/sports/football", logo: "https://southernmiss.com/favicon.ico" },
      { name: "Southern Miss On SI", feed: "https://www.si.com/college/southernmiss/feed", site: "https://www.si.com/college/southernmiss", logo: "https://images2.minutemediacdn.com/image/upload/v1720431406/SI/ON_SI-Favicon_B_96x96_3.ico", sportsSection: true },
      { name: "Big Gold Nation", feed: "https://www.on3.com/sites/big-gold-nation/feed/", site: "https://www.on3.com/sites/big-gold-nation/", paths: ["/sites/big-gold-nation/"], logo: "https://on3static.com/static/on3/touch-icons/apple-touch-icon-180x180.png" }
    ]
  },

  series: [
    { match: /^louisiana tech( bulldogs)?$/i, name: "Rivalry in Dixie", kind: "rivalry" },
    { match: /^tulane( green wave)?$/i, name: "Battle for the Bell", kind: "trophy" }
  ],

  links: {
    // Where the program posts its game notes (Game links to it; David,
    // 2026-10-30): its schedule, where each game's notes are posted.
    gameNotes: { url: "https://southernmiss.com/sports/football/schedule", label: "southernmiss.com", kind: "schedule" },
    roster: { url: "https://southernmiss.com/sports/football/roster", label: "southernmiss.com" }
  },

  // Southern Miss inside Suite: Black, Gold (ESPN's); gold is too light to carry white text, so black is the surface, every text pair checked at
  // 4.5:1 (tools/teamidentitycheck.js).
  identity: {
    programLabel: "SOUTHERN MISS FOOTBALL",

    colors: {
      accent:         "#FFC72C",
      accentText:     "#FFC72C",
      accentOnLight:  "#231F20",
      accentInk:      "#231F20",
      accentSoft:     "#FFE08B",
      accentTint:     "#FFF5D9",
      accentTintSoft: "#FFFBEE",
      focus:          "#FFFFFF",
      surface:        "#231F20",
      surfaceDeep:    "#191617",
      surfaceAbyss:   "#0F0D0D",
      surfaceRaise:   "#393536"
    },

    // The Group of Five read in Suite's own faces (David's plan for the FBS
    // build-out); the school's colours carry its identity.
    fonts: {
      ui:       "'Instrument Sans',system-ui,-apple-system,sans-serif",
      display:  "'Instrument Display',sans-serif"
    }
  },

  // What .github/workflows/odds.yml commits for Southern Miss, each because a
  // source exists for it.
  snapshots: {
    beatNews:     { file: "data/southern-miss/news.json" },
    recruits:     { file: "data/southern-miss/recruits.json", label: "ESPN recruiting" }
  }
};
