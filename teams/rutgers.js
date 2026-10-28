/* Rutgers - Phase 1, the rest of the Big Ten (David, 2026-10-27). Same
   shape as teams/indiana.js; nothing else changed.

   From GitHub's network on 2026-10-27: ESPN team 164, its home field as
   ESPN's schedule spells it (SHI Stadium), and the beat feeds below
   (probe-feeds.yml). Approved with the phase's review sheet. */

var TEAM_CONFIG = {

  team: {
    id:           "rutgers",
    name:         "Rutgers",
    abbreviation: "RUTG",
    sport:        "football",
    league:       "college-football",
    timeZone:     "America/New_York",

    venue: {
      name: "SHI Stadium",
      lat:  40.5137,
      lon: -74.4648
    }
  },

  sources: {
    espn: {
      teamId: "164",
      broadcastFallback: []
    },

    // The Big Ten's availability reports (tools/producers/conference_availability.py).
    official: {
      availabilityReportIndex: "https://bigten.org/sports/2026/9/10/FB_Availability_Reports.aspx",
      availabilityReportLabel: "BigTen.org",
      availabilityFeed: { provider: "hdintelligence", conference: "B10", sport: "Football", team: "Rutgers" }
    },

    // Beat writers, read by the Action server-side; each answered from
    // GitHub's network on 2026-10-27. On3's team feeds carry league-wide
    // stories, so `paths` keeps only Rutgers's section.
    // Not used: The Daily Targum turned GitHub's network away (405).
    beatFeeds: [
      { name: "Rutgers Athletics", feed: "https://scarletknights.com/rss?path=football", site: "https://scarletknights.com/sports/football", logo: "https://scarletknights.com/favicon.ico" },
      { name: "On the Banks", feed: "https://www.onthebanks.com/rss/current.xml", site: "https://www.onthebanks.com/" },
      { name: "Rutgers On SI", feed: "https://www.si.com/college/rutgers/feed", site: "https://www.si.com/college/rutgers", logo: "https://images2.minutemediacdn.com/image/upload/v1720431406/SI/ON_SI-Favicon_B_96x96_3.ico" },
      { name: "The Knight Report", feed: "https://www.on3.com/sites/the-knight-report/feed/", site: "https://www.on3.com/sites/the-knight-report/", paths: ["/sites/the-knight-report/"], logo: "https://on3static.com/static/on3/touch-icons/apple-touch-icon-180x180.png" }
    ]
  },

  series: [

  ],

  links: {
    roster: { url: "https://scarletknights.com/sports/football/roster", label: "scarletknights.com" }
  },

  // Rutgers inside Suite: Scarlet PMS 186 (Rutgers identity), white, every text pair checked at
  // 4.5:1 (tools/teamidentitycheck.js).
  identity: {
    programLabel: "RUTGERS FOOTBALL",

    colors: {
      accent:         "#FFFFFF",
      accentText:     "#FFFFFF",
      accentOnLight:  "#CC0033",
      accentInk:      "#CC0033",
      accentSoft:     "#FFFFFF",
      accentTint:     "#F6D1DA",
      accentTintSoft: "#FBEBEF",
      focus:          "#FFFFFF",
      surface:        "#CC0033",
      surfaceDeep:    "#930025",
      surfaceAbyss:   "#560015",
      surfaceRaise:   "#D11A47"
    },

    // Rutgers' published faces (Formata, ITC Giovanni) are licensed; Barlow
    // is the closest free match to Formata. Rutgers' current guide could not
    // be read: please confirm.
    fonts: {
      ui:       "'Barlow','Instrument Sans',system-ui,-apple-system,sans-serif",
      display:  "'Barlow','Instrument Display',sans-serif"
    }
  },

  // What .github/workflows/odds.yml commits for Rutgers, each because a
  // source exists for it.
  snapshots: {
    availability: { file: "data/rutgers/availability.json", history: "data/rutgers/availability-history.json", label: "BigTen.org" },
    beatNews:     { file: "data/rutgers/news.json" },
    recruits:     { file: "data/rutgers/recruits.json", label: "ESPN recruiting" }
  }
};
