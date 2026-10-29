/* Bowling Green - Phase 4b, the Sun Belt, the MAC, Conference USA and UConn
   (David, 2026-10-29). Same shape as teams/indiana.js; nothing else changed.

   From GitHub's network on 2026-10-29: ESPN team 189, its home field as
   ESPN's schedule spells it (Doyt L. Perry Stadium), and the beat feeds
   below (probe-feeds.yml). Approved with the phase's review sheet. */

var TEAM_CONFIG = {

  team: {
    id:           "bowling-green",
    name:         "Bowling Green",
    abbreviation: "BGSU",
    sport:        "football",
    league:       "college-football",
    timeZone:     "America/New_York",

    venue: {
      name: "Doyt L. Perry Stadium",
      lat:  41.3780,
      lon: -83.6233
    }
  },

  sources: {
    espn: {
      teamId: "189",
      broadcastFallback: []
    },

    // The MAC's availability reports (tools/producers/conference_availability.py).
    official: {
      availabilityReportIndex: "https://getsomemaction.com/sports/football",
      availabilityReportLabel: "GetSomeMACtion.com",
      availabilityFeed: { provider: "hdintelligence", conference: "MAC", sport: "Football", team: "Bowling Green" }
    },

    // Beat writers, read by the Action server-side; each answered from
    // GitHub's network on 2026-10-29.
    // Not used: BG Falcon Media publishes one feed for the whole paper, so
    // only its stories that say football stay. On SI has no Bowling Green
    // site (404), and On3's feed carries only national stories.
    beatFeeds: [
      { name: "Bowling Green Athletics", feed: "https://bgsufalcons.com/rss?path=football", site: "https://bgsufalcons.com/sports/football", logo: "https://bgsufalcons.com/favicon.ico" },
      { name: "BG Falcon Media", feed: "https://bgfalconmedia.com/feed/", site: "https://bgfalconmedia.com/", sportsSection: true }
    ]
  },

  series: [
    { match: /^toledo( rockets)?$/i, name: "Battle of I-75", kind: "trophy" }
  ],

  links: {
    roster: { url: "https://bgsufalcons.com/sports/football/roster", label: "bgsufalcons.com" }
  },

  // Bowling Green inside Suite: Brown, Orange (ESPN's); orange is too light to carry white text, so brown is the surface, every text pair checked at
  // 4.5:1 (tools/teamidentitycheck.js).
  identity: {
    programLabel: "BOWLING GREEN FOOTBALL",

    colors: {
      accent:         "#FD5000",
      accentText:     "#FD5000",
      accentOnLight:  "#4F2C1D",
      accentInk:      "#392015",
      accentSoft:     "#FE9F73",
      accentTint:     "#FFE0D1",
      accentTintSoft: "#FFF1EB",
      focus:          "#FFFFFF",
      surface:        "#4F2C1D",
      surfaceDeep:    "#392015",
      surfaceAbyss:   "#21120C",
      surfaceRaise:   "#614134"
    },

    // The Group of Five read in Suite's own faces (David's plan for the FBS
    // build-out); the school's colours carry its identity.
    fonts: {
      ui:       "'Instrument Sans',system-ui,-apple-system,sans-serif",
      display:  "'Instrument Display',sans-serif"
    }
  },

  // What .github/workflows/odds.yml commits for Bowling Green, each because a
  // source exists for it.
  snapshots: {
    availability: { file: "data/bowling-green/availability.json", history: "data/bowling-green/availability-history.json", label: "GetSomeMACtion.com" },
    beatNews:     { file: "data/bowling-green/news.json" },
    recruits:     { file: "data/bowling-green/recruits.json", label: "ESPN recruiting" }
  }
};
