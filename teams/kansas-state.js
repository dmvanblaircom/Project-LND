/* Kansas State - Phase 3, the Big 12 and the ACC (David, 2026-10-28). Same
   shape as teams/indiana.js; nothing else changed.

   From GitHub's network on 2026-10-28: ESPN team 2306, its home field as
   ESPN's schedule spells it (Bill Snyder Family Stadium), and the beat feeds below
   (probe-feeds.yml). Approved with the phase's review sheet. */

var TEAM_CONFIG = {

  team: {
    id:           "kansas-state",
    name:         "Kansas State",
    abbreviation: "KSU",
    sport:        "football",
    league:       "college-football",
    timeZone:     "America/Chicago",

    venue: {
      name: "Bill Snyder Family Stadium",
      lat:  39.2018,
      lon: -96.5940
    }
  },

  sources: {
    espn: {
      teamId: "2306",
      broadcastFallback: []
    },
    kalshi: {
      tickerSuffix: "-KSU",
      namePattern:  /kansas st/i
    },

    // The Big 12's availability reports (tools/producers/conference_availability.py).
    official: {
      availabilityReportIndex: "https://big12sports.com/sports/football",
      availabilityReportLabel: "Big12Sports.com",
      availabilityFeed: { provider: "hdintelligence", conference: "B12", sport: "Football", team: "Kansas St.", aliases: ["Kansas State"] }
    },

    // Beat writers, read by the Action server-side; each answered from
    // GitHub's network on 2026-10-28. On3's team feeds carry league-wide
    // stories, so `paths` keeps only Kansas State's section.
    beatFeeds: [
      { name: "K-State Athletics", feed: "https://www.kstatesports.com/rss?path=football", site: "https://www.kstatesports.com/sports/football", logo: "https://www.kstatesports.com/favicon.ico" },
      { name: "Bring On the Cats", feed: "https://www.bringonthecats.com/rss/current.xml", site: "https://www.bringonthecats.com/" },
      { name: "Kansas State On SI", feed: "https://www.si.com/college/kstate/feed", site: "https://www.si.com/college/kstate", logo: "https://images2.minutemediacdn.com/image/upload/v1720431406/SI/ON_SI-Favicon_B_96x96_3.ico" },
      { name: "On3", feed: "https://www.on3.com/teams/kansas-state-wildcats/feed/", site: "https://www.on3.com/teams/kansas-state-wildcats/", paths: ["/teams/kansas-state-wildcats/"], logo: "https://on3static.com/static/on3/touch-icons/apple-touch-icon-180x180.png" },
      { name: "The Collegian", feed: "https://www.kstatecollegian.com/category/sports/feed/", site: "https://www.kstatecollegian.com/category/sports/", sportsSection: true }
    ]
  },

  series: [
    { match: /^kansas( jayhawks)?$/i, name: "Sunflower Showdown", kind: "trophy" },
    { match: /^iowa state( cyclones)?$/i, name: "Farmageddon", kind: "rivalry" }
  ],

  links: {
    roster: { url: "https://www.kstatesports.com/sports/football/roster", label: "www.kstatesports.com" }
  },

  // Kansas State inside Suite: K-State Purple, white, every text pair checked at
  // 4.5:1 (tools/teamidentitycheck.js).
  identity: {
    programLabel: "KANSAS STATE FOOTBALL",

    colors: {
      accent:         "#FFFFFF",
      accentText:     "#FFFFFF",
      accentOnLight:  "#512888",
      accentInk:      "#512888",
      accentSoft:     "#FFFFFF",
      accentTint:     "#E0D8EA",
      accentTintSoft: "#F1EEF5",
      focus:          "#FFFFFF",
      surface:        "#512888",
      surfaceDeep:    "#3A1D62",
      surfaceAbyss:   "#221139",
      surfaceRaise:   "#623E94"
    },

    // K-State's brand pages did not answer; Montserrat stands in. Please
    // confirm.
    fonts: {
      ui:       "'Montserrat','Instrument Sans',system-ui,-apple-system,sans-serif",
      display:  "'Montserrat','Instrument Display',sans-serif"
    }
  },

  // What .github/workflows/odds.yml commits for Kansas State, each because a
  // source exists for it.
  snapshots: {
    availability: { file: "data/kansas-state/availability.json", history: "data/kansas-state/availability-history.json", label: "Big12Sports.com" },
    oddsHistory:  { file: "data/kansas-state/odds-history.json" },
    beatNews:     { file: "data/kansas-state/news.json" },
    recruits:     { file: "data/kansas-state/recruits.json", label: "ESPN recruiting" }
  }
};
