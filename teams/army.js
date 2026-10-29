/* Army - Phase 4a, the American, the Mountain West and the Pac-12 (David,
   2026-10-29). Same shape as teams/indiana.js; nothing else changed.

   From GitHub's network on 2026-10-29: ESPN team 349, its home field as
   ESPN's schedule spells it (Michie Stadium), and the beat feeds below
   (probe-feeds.yml). Approved with the phase's review sheet. */

var TEAM_CONFIG = {

  team: {
    id:           "army",
    name:         "Army",
    abbreviation: "ARMY",
    sport:        "football",
    league:       "college-football",
    timeZone:     "America/New_York",

    venue: {
      name: "Michie Stadium",
      lat:  41.3875,
      lon: -73.9649
    }
  },

  sources: {
    espn: {
      teamId: "349",
      broadcastFallback: []
    },

    // The American's availability reports (tools/producers/conference_availability.py).
    official: {
      availabilityReportIndex: "https://theamerican.org/sports/football",
      availabilityReportLabel: "TheAmerican.org",
      availabilityFeed: { provider: "hdintelligence", conference: "American", sport: "Football", team: "Army West Point" }
    },

    // Beat writers, read by the Action server-side; each answered from
    // GitHub's network on 2026-10-29.
    // GoBlackKnights is On3's fan site for Army (the former Rivals site), read
    // through its own section so On3's national stories stay out (2026-10-29).
    // Not used: Against All Enemies (SB Nation) reset the connection twice,
    // and there is no On SI site (404).
    beatFeeds: [
      { name: "Army West Point Athletics", feed: "https://goarmywestpoint.com/rss?path=football", site: "https://goarmywestpoint.com/sports/football", logo: "https://goarmywestpoint.com/favicon.ico" },
      { name: "GoBlackKnights", feed: "https://www.on3.com/sites/go-black-knights/feed/", site: "https://www.on3.com/sites/go-black-knights/", paths: ["/sites/go-black-knights/"], logo: "https://on3static.com/static/on3/touch-icons/apple-touch-icon-180x180.png" }
    ]
  },

  series: [
    { match: /^navy( midshipmen)?$/i, name: "Army-Navy Game", kind: "rivalry" },
    { match: /^air force( falcons)?$/i, name: "Commander-in-Chief's Trophy", kind: "trophy" }
  ],

  links: {
    roster: { url: "https://goarmywestpoint.com/sports/football/roster", label: "goarmywestpoint.com" }
  },

  // Army inside Suite: Black, Army Gold (ESPN's), every text pair checked at
  // 4.5:1 (tools/teamidentitycheck.js).
  identity: {
    programLabel: "ARMY FOOTBALL",

    colors: {
      accent:         "#D3BC8D",
      accentText:     "#D3BC8D",
      accentOnLight:  "#000000",
      accentInk:      "#000000",
      accentSoft:     "#E7DAC0",
      accentTint:     "#F7F3EA",
      accentTintSoft: "#FBFAF6",
      focus:          "#FFFFFF",
      surface:        "#000000",
      surfaceDeep:    "#000000",
      surfaceAbyss:   "#000000",
      surfaceRaise:   "#1A1A1A"
    },

    // The Group of Five read in Suite's own faces (David's plan for the FBS
    // build-out); the school's colours carry its identity.
    fonts: {
      ui:       "'Instrument Sans',system-ui,-apple-system,sans-serif",
      display:  "'Instrument Display',sans-serif"
    }
  },

  // What .github/workflows/odds.yml commits for Army, each because a
  // source exists for it.
  snapshots: {
    availability: { file: "data/army/availability.json", history: "data/army/availability-history.json", label: "TheAmerican.org" },
    beatNews:     { file: "data/army/news.json" },
    recruits:     { file: "data/army/recruits.json", label: "ESPN recruiting" }
  }
};
