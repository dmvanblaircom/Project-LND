/* Washington - Phase 1, the rest of the Big Ten (David, 2026-10-27). Same
   shape as teams/indiana.js; nothing else changed.

   From GitHub's network on 2026-10-27: ESPN team 264, its home field as
   ESPN's schedule spells it (Husky Stadium), and the beat feeds below
   (probe-feeds.yml). Approved with the phase's review sheet. */

var TEAM_CONFIG = {

  team: {
    id:           "washington",
    name:         "Washington",
    abbreviation: "WASH",
    sport:        "football",
    league:       "college-football",
    timeZone:     "America/Los_Angeles",

    venue: {
      name: "Husky Stadium",
      lat:  47.6503,
      lon: -122.3016
    }
  },

  sources: {
    espn: {
      teamId: "264",
      broadcastFallback: []
    },
    kalshi: {
      tickerSuffix: "-WASH",
      namePattern:  /\bwashington\b(?! st)/i
    },

    // The Big Ten's availability reports (tools/producers/conference_availability.py).
    official: {
      availabilityReportIndex: "https://bigten.org/sports/2026/9/10/FB_Availability_Reports.aspx",
      availabilityReportLabel: "BigTen.org",
      availabilityFeed: { provider: "hdintelligence", conference: "B10", sport: "Football", team: "Washington" }
    },

    // Beat writers, read by the Action server-side; each answered from
    // GitHub's network on 2026-10-27. On3's team feeds carry league-wide
    // stories, so `paths` keeps only Washington's section.
    // Not used: The Daily turned GitHub's network away (405).
    beatFeeds: [
      { name: "Washington Athletics", feed: "https://gohuskies.com/rss?path=football", site: "https://gohuskies.com/sports/football", logo: "https://gohuskies.com/favicon.ico" },
      { name: "UW Dawg Pound", feed: "https://www.uwdawgpound.com/rss/current.xml", site: "https://www.uwdawgpound.com/" },
      { name: "Washington On SI", feed: "https://www.si.com/college/washington/feed", site: "https://www.si.com/college/washington", logo: "https://images2.minutemediacdn.com/image/upload/v1720431406/SI/ON_SI-Favicon_B_96x96_3.ico" },
      { name: "On3", feed: "https://www.on3.com/teams/washington-huskies/feed/", site: "https://www.on3.com/teams/washington-huskies/", paths: ["/teams/washington-huskies/"], logo: "https://on3static.com/static/on3/touch-icons/apple-touch-icon-180x180.png" }
    ]
  },

  series: [
    { match: /^washington state( cougars)?$/i, name: "Apple Cup", kind: "trophy" }
  ],

  links: {
    roster: { url: "https://gohuskies.com/sports/football/roster", label: "gohuskies.com" }
  },

  // Washington inside Suite: Spirit Purple, Spirit Gold (washington.edu/brand), every text pair checked at
  // 4.5:1 (tools/teamidentitycheck.js).
  identity: {
    programLabel: "WASHINGTON FOOTBALL",

    colors: {
      accent:         "#FFC700",
      accentText:     "#FFC700",
      accentOnLight:  "#4B2E83",
      accentInk:      "#4B2E83",
      accentSoft:     "#FFE073",
      accentTint:     "#FFF5D1",
      accentTintSoft: "#FFFBEB",
      focus:          "#FFFFFF",
      surface:        "#4B2E83",
      surfaceDeep:    "#36215E",
      surfaceAbyss:   "#201337",
      surfaceRaise:   "#5D438F"
    },

    // Washington's brand faces are Encode Sans (headlines) and Open Sans (web
    // text), both free: used as they are.
    fonts: {
      ui:       "'Open Sans','Instrument Sans',system-ui,-apple-system,sans-serif",
      display:  "'Encode Sans','Instrument Display',sans-serif"
    }
  },

  // What .github/workflows/odds.yml commits for Washington, each because a
  // source exists for it.
  snapshots: {
    availability: { file: "data/washington/availability.json", history: "data/washington/availability-history.json", label: "BigTen.org" },
    oddsHistory:  { file: "data/washington/odds-history.json" },
    beatNews:     { file: "data/washington/news.json" },
    recruits:     { file: "data/washington/recruits.json", label: "ESPN recruiting" }
  }
};
