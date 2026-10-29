/* Arizona - Phase 3, the Big 12 and the ACC (David, 2026-10-28). Same
   shape as teams/indiana.js; nothing else changed.

   From GitHub's network on 2026-10-28: ESPN team 12, its home field as
   ESPN's schedule spells it (Casino Del Sol Stadium), and the beat feeds below
   (probe-feeds.yml). Approved with the phase's review sheet. */

var TEAM_CONFIG = {

  team: {
    id:           "arizona",
    name:         "Arizona",
    abbreviation: "ARIZ",
    sport:        "football",
    league:       "college-football",
    timeZone:     "America/Phoenix",

    venue: {
      name: "Casino Del Sol Stadium",
      lat:  32.2288,
      lon: -110.9488
    }
  },

  sources: {
    espn: {
      teamId: "12",
      broadcastFallback: []
    },
    kalshi: {
      tickerSuffix: "-ARIZ",
      namePattern:  /(?<!northern )\barizona\b(?! st)/i
    },

    // The Big 12's availability reports (tools/producers/conference_availability.py).
    official: {
      availabilityReportIndex: "https://big12sports.com/sports/football",
      availabilityReportLabel: "Big12Sports.com",
      availabilityFeed: { provider: "hdintelligence", conference: "B12", sport: "Football", team: "Arizona" }
    },

    // Beat writers, read by the Action server-side; each answered from
    // GitHub's network on 2026-10-28. On3's team feeds carry league-wide
    // stories, so `paths` keeps only Arizona's section.
    beatFeeds: [
      { name: "Arizona Athletics", feed: "https://arizonawildcats.com/rss?path=football", site: "https://arizonawildcats.com/sports/football", logo: "https://arizonawildcats.com/favicon.ico" },
      { name: "Arizona Desert Swarm", feed: "https://www.azdesertswarm.com/rss/current.xml", site: "https://www.azdesertswarm.com/" },
      { name: "Arizona On SI", feed: "https://www.si.com/college/arizona/feed", site: "https://www.si.com/college/arizona", logo: "https://images2.minutemediacdn.com/image/upload/v1720431406/SI/ON_SI-Favicon_B_96x96_3.ico" },
      { name: "On3", feed: "https://www.on3.com/teams/arizona-wildcats/feed/", site: "https://www.on3.com/teams/arizona-wildcats/", paths: ["/teams/arizona-wildcats/"], logo: "https://on3static.com/static/on3/touch-icons/apple-touch-icon-180x180.png" },
      { name: "Arizona Daily Wildcat", feed: "https://wildcat.arizona.edu/category/sports/football/feed/", site: "https://wildcat.arizona.edu/category/sports/football/" }
    ]
  },

  series: [
    { match: /^arizona state( sun devils)?$/i, name: "Territorial Cup", kind: "trophy" }
  ],

  links: {
    roster: { url: "https://arizonawildcats.com/sports/football/roster", label: "arizonawildcats.com" }
  },

  // Arizona inside Suite: Arizona Blue, Arizona Red (brand.arizona.edu), every text pair checked at
  // 4.5:1 (tools/teamidentitycheck.js).
  identity: {
    programLabel: "ARIZONA FOOTBALL",

    colors: {
      accent:         "#AB0520",
      accentText:     "#CB6475",
      accentOnLight:  "#AB0520",
      accentInk:      "#FFFFFF",
      accentSoft:     "#D17684",
      accentTint:     "#F0D2D7",
      accentTintSoft: "#F8EBED",
      focus:          "#FFFFFF",
      surface:        "#0C234B",
      surfaceDeep:    "#091936",
      surfaceAbyss:   "#050F20",
      surfaceRaise:   "#24395D"
    },

    // Arizona's primary face, Proxima Nova, is licensed (brand.arizona.edu);
    // Montserrat is the closest free match.
    fonts: {
      ui:       "'Montserrat','Instrument Sans',system-ui,-apple-system,sans-serif",
      display:  "'Montserrat','Instrument Display',sans-serif"
    }
  },

  // What .github/workflows/odds.yml commits for Arizona, each because a
  // source exists for it.
  snapshots: {
    availability: { file: "data/arizona/availability.json", history: "data/arizona/availability-history.json", label: "Big12Sports.com" },
    oddsHistory:  { file: "data/arizona/odds-history.json" },
    beatNews:     { file: "data/arizona/news.json" },
    recruits:     { file: "data/arizona/recruits.json", label: "ESPN recruiting" }
  }
};
