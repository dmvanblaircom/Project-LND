/* Middle Tennessee - Phase 4b, the Sun Belt, the MAC, Conference USA and
   UConn (David, 2026-10-29). Same shape as teams/indiana.js; nothing else
   changed.

   From GitHub's network on 2026-10-29: ESPN team 2393, its home field as
   ESPN's schedule spells it (Johnny "Red" Floyd Stadium), and the beat feeds
   below (probe-feeds.yml). Approved with the phase's review sheet. */

var TEAM_CONFIG = {

  team: {
    id:           "middle-tennessee",
    name:         "Middle Tennessee",
    abbreviation: "MTSU",
    sport:        "football",
    league:       "college-football",
    timeZone:     "America/Chicago",

    venue: {
      name: "Johnny \"Red\" Floyd Stadium",
      lat:  35.8486,
      lon: -86.3676
    }
  },

  sources: {
    espn: {
      teamId: "2393",
      broadcastFallback: []
    },

    // Conference USA publishes no availability reports that HD Intelligence
    // carries or that could be found on conferenceusa.com (2026-10-29), so
    // none are shown.

    // Beat writers, read by the Action server-side; each answered from
    // GitHub's network on 2026-10-29.
    // Not used: On SI has no Middle Tennessee site (404), and there is no On3
    // team feed (404).
    beatFeeds: [
      { name: "Middle Tennessee Athletics", feed: "https://goblueraiders.com/rss?path=football", site: "https://goblueraiders.com/sports/football", logo: "https://goblueraiders.com/favicon.ico" },
      { name: "Sidelines", feed: "https://mtsusidelines.com/category/sports/feed/", site: "https://mtsusidelines.com/category/sports/", sportsSection: true }
    ]
  },

  series: [
    { match: /^western kentucky( hilltoppers)?$/i, name: "100 Miles of Hate", kind: "rivalry" }
  ],

  links: {
    // Where the program posts its game notes (Game links to it; David,
    // 2026-10-30): its schedule, where each game's notes are posted.
    gameNotes: { url: "https://goblueraiders.com/sports/football/schedule", label: "goblueraiders.com", kind: "schedule" },
    // The Conference USA's availability reports, which Suite cannot read (its
    // viewer answers only a browser): Roster links the page instead
    // (David, 2026-10-30).
    availability: { url: "https://conferenceusa.com/sports/2025/8/23/FB_0823254134.aspx", label: "ConferenceUSA.com", conference: "Conference USA" },
    roster: { url: "https://goblueraiders.com/sports/football/roster", label: "goblueraiders.com" }
  },

  // Middle Tennessee inside Suite: Blue (ESPN's), white, every text pair checked at
  // 4.5:1 (tools/teamidentitycheck.js).
  identity: {
    programLabel: "MIDDLE TENNESSEE FOOTBALL",

    colors: {
      accent:         "#FFFFFF",
      accentText:     "#FFFFFF",
      accentOnLight:  "#036EB7",
      accentInk:      "#036EB7",
      accentSoft:     "#FFFFFF",
      accentTint:     "#D2E5F2",
      accentTintSoft: "#EBF3F9",
      focus:          "#FFFFFF",
      surface:        "#036EB7",
      surfaceDeep:    "#024F84",
      surfaceAbyss:   "#012E4D",
      surfaceRaise:   "#0D74BA"
    },

    // The Group of Five read in Suite's own faces (David's plan for the FBS
    // build-out); the school's colours carry its identity.
    fonts: {
      ui:       "'Instrument Sans',system-ui,-apple-system,sans-serif",
      display:  "'Instrument Display',sans-serif"
    }
  },

  // What .github/workflows/odds.yml commits for Middle Tennessee, each because a
  // source exists for it.
  snapshots: {
    beatNews:     { file: "data/middle-tennessee/news.json" },
    recruits:     { file: "data/middle-tennessee/recruits.json", label: "ESPN recruiting" }
  }
};
