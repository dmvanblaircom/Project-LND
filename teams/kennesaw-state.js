/* Kennesaw State - Phase 4b, the Sun Belt, the MAC, Conference USA and UConn
   (David, 2026-10-29). Same shape as teams/indiana.js; nothing else changed.

   From GitHub's network on 2026-10-29: ESPN team 338, its home field as
   ESPN's schedule spells it (Walens Family Field at Fifth Third Stadium),
   and the beat feeds below (probe-feeds.yml). Approved with the phase's
   review sheet. */

var TEAM_CONFIG = {

  team: {
    id:           "kennesaw-state",
    name:         "Kennesaw State",
    abbreviation: "KENN",
    sport:        "football",
    league:       "college-football",
    timeZone:     "America/New_York",

    venue: {
      name: "Walens Family Field at Fifth Third Stadium",
      lat:  34.0294,
      lon: -84.5674
    }
  },

  sources: {
    espn: {
      teamId: "338",
      broadcastFallback: []
    },

    // Conference USA publishes no availability reports that HD Intelligence
    // carries or that could be found on conferenceusa.com (2026-10-29), so
    // none are shown.

    // Beat writers, read by the Action server-side; each answered from
    // GitHub's network on 2026-10-29.
    // One source only: The Sentinel's address now leads to an unrelated site,
    // On SI has no Kennesaw State site (404), and On3's feed carries only
    // national stories.
    beatFeeds: [
      { name: "Kennesaw State Athletics", feed: "https://ksuowls.com/rss?path=football", site: "https://ksuowls.com/sports/football", logo: "https://ksuowls.com/favicon.ico" }
    ]
  },

  series: [

  ],

  links: {
    // Where the program posts its game notes (Game links to it; David,
    // 2026-10-30): its schedule, where each game's notes are posted.
    gameNotes: { url: "https://ksuowls.com/sports/football/schedule", label: "ksuowls.com", kind: "schedule" },
    // The Conference USA's availability reports, which Suite cannot read (its
    // viewer answers only a browser): Roster links the page instead
    // (David, 2026-10-30).
    availability: { url: "https://conferenceusa.com/sports/2025/8/23/FB_0823254134.aspx", label: "ConferenceUSA.com", conference: "Conference USA" },
    roster: { url: "https://ksuowls.com/sports/football/roster", label: "ksuowls.com" }
  },

  // Kennesaw State inside Suite: Black, Gold (ESPN's); gold is too light to carry white text, so black is the surface, every text pair checked at
  // 4.5:1 (tools/teamidentitycheck.js).
  identity: {
    programLabel: "KENNESAW STATE FOOTBALL",

    colors: {
      accent:         "#FDBB30",
      accentText:     "#FDBB30",
      accentOnLight:  "#0B1315",
      accentInk:      "#0B1315",
      accentSoft:     "#FEDA8D",
      accentTint:     "#FFF3DA",
      accentTintSoft: "#FFFAEE",
      focus:          "#FFFFFF",
      surface:        "#0B1315",
      surfaceDeep:    "#080E0F",
      surfaceAbyss:   "#050809",
      surfaceRaise:   "#232B2C"
    },

    // The Group of Five read in Suite's own faces (David's plan for the FBS
    // build-out); the school's colours carry its identity.
    fonts: {
      ui:       "'Instrument Sans',system-ui,-apple-system,sans-serif",
      display:  "'Instrument Display',sans-serif"
    }
  },

  // What .github/workflows/odds.yml commits for Kennesaw State, each because a
  // source exists for it.
  snapshots: {
    beatNews:     { file: "data/kennesaw-state/news.json" },
    recruits:     { file: "data/kennesaw-state/recruits.json", label: "ESPN recruiting" }
  }
};
