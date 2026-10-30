/* Florida International - Phase 4b, the Sun Belt, the MAC, Conference USA
   and UConn (David, 2026-10-29). Same shape as teams/indiana.js; nothing
   else changed.

   From GitHub's network on 2026-10-29: ESPN team 2229, its home field as
   ESPN's schedule spells it (Pitbull Stadium), and the beat feeds below
   (probe-feeds.yml). Approved with the phase's review sheet. */

var TEAM_CONFIG = {

  team: {
    id:           "florida-international",
    name:         "Florida International",
    abbreviation: "FIU",
    sport:        "football",
    league:       "college-football",
    timeZone:     "America/New_York",

    venue: {
      name: "Pitbull Stadium",
      lat:  25.7524,
      lon: -80.3786
    }
  },

  sources: {
    espn: {
      teamId: "2229",
      broadcastFallback: []
    },

    // Conference USA publishes no availability reports that HD Intelligence
    // carries or that could be found on conferenceusa.com (2026-10-29), so
    // none are shown.

    // Beat writers, read by the Action server-side; each answered from
    // GitHub's network on 2026-10-29.
    // One source only: PantherNOW has published nothing since April, On SI
    // has no FIU site (404), and there is no On3 team feed (404).
    beatFeeds: [
      { name: "FIU Athletics", feed: "https://fiusports.com/rss?path=football", site: "https://fiusports.com/sports/football", logo: "https://fiusports.com/favicon.ico" }
    ]
  },

  series: [
    { match: /^florida atlantic( owls)?$|^fau( owls)?$/i, name: "Shula Bowl", kind: "trophy" }
  ],

  links: {
    // The Conference USA's availability reports, which Suite cannot read (its
    // viewer answers only a browser): Roster links the page instead
    // (David, 2026-10-30).
    availability: { url: "https://conferenceusa.com/sports/2025/8/23/FB_0823254134.aspx", label: "ConferenceUSA.com", conference: "Conference USA" },
    roster: { url: "https://fiusports.com/sports/football/roster", label: "fiusports.com" }
  },

  // Florida International inside Suite: Navy, Gold (ESPN's), every text pair checked at
  // 4.5:1 (tools/teamidentitycheck.js).
  identity: {
    programLabel: "FIU FOOTBALL",

    colors: {
      accent:         "#C3993F",
      accentText:     "#C3993F",
      accentOnLight:  "#091F3F",
      accentInk:      "#091F3F",
      accentSoft:     "#DEC795",
      accentTint:     "#F4EDDC",
      accentTintSoft: "#FAF7F0",
      focus:          "#FFFFFF",
      surface:        "#091F3F",
      surfaceDeep:    "#06162D",
      surfaceAbyss:   "#040D1A",
      surfaceRaise:   "#223552"
    },

    // The Group of Five read in Suite's own faces (David's plan for the FBS
    // build-out); the school's colours carry its identity.
    fonts: {
      ui:       "'Instrument Sans',system-ui,-apple-system,sans-serif",
      display:  "'Instrument Display',sans-serif"
    }
  },

  // What .github/workflows/odds.yml commits for Florida International, each because a
  // source exists for it.
  snapshots: {
    beatNews:     { file: "data/florida-international/news.json" },
    recruits:     { file: "data/florida-international/recruits.json", label: "ESPN recruiting" }
  }
};
