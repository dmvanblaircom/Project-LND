/* Wake Forest - Phase 3, the Big 12 and the ACC (David, 2026-10-28). Same
   shape as teams/indiana.js; nothing else changed.

   From GitHub's network on 2026-10-28: ESPN team 154, its home field as
   ESPN's schedule spells it (Allegacy Federal Credit Union Stadium), and the beat feeds below
   (probe-feeds.yml). Approved with the phase's review sheet. */

var TEAM_CONFIG = {

  team: {
    id:           "wake-forest",
    name:         "Wake Forest",
    abbreviation: "WAKE",
    sport:        "football",
    league:       "college-football",
    timeZone:     "America/New_York",

    venue: {
      name: "Allegacy Federal Credit Union Stadium",
      lat:  36.1301,
      lon: -80.2549
    }
  },

  sources: {
    espn: {
      teamId: "154",
      broadcastFallback: []
    },
    kalshi: {
      tickerSuffix: "-WAKE",
      namePattern:  /wake forest/i
    },

    // The ACC's availability reports (tools/producers/conference_availability.py).
    official: {
      availabilityReportIndex: "https://theacc.com/sports/2025/8/28/availability-reporting-football.aspx",
      availabilityReportLabel: "TheACC.com",
      availabilityFeed: { provider: "hdintelligence", conference: "ACC", sport: "Football", team: "Wake Forest" }
    },

    // Beat writers, read by the Action server-side; each answered from
    // GitHub's network on 2026-10-28.
    // Not used: Two sources only: Blogger So Dear (SB Nation) is gone, Old
    // Gold & Black did not answer, and there is no On3 team feed (404).
    beatFeeds: [
      { name: "Wake Forest Athletics", feed: "https://godeacs.com/rss?path=football", site: "https://godeacs.com/sports/football", logo: "https://godeacs.com/favicon.ico" },
      { name: "Wake Forest On SI", feed: "https://www.si.com/college/wake-forest/feed", site: "https://www.si.com/college/wake-forest", logo: "https://images2.minutemediacdn.com/image/upload/v1720431406/SI/ON_SI-Favicon_B_96x96_3.ico" },
      { name: "Deacons Illustrated", feed: "https://www.on3.com/sites/deacons-illustrated/feed/", site: "https://www.on3.com/sites/deacons-illustrated/", paths: ["/sites/deacons-illustrated/"], logo: "https://on3static.com/static/on3/touch-icons/apple-touch-icon-180x180.png" }
    ]
  },

  series: [

  ],

  links: {
    roster: { url: "https://godeacs.com/sports/football/roster", label: "godeacs.com" }
  },

  // Wake Forest inside Suite: Black, Old Gold, every text pair checked at
  // 4.5:1 (tools/teamidentitycheck.js).
  identity: {
    programLabel: "WAKE FOREST FOOTBALL",

    colors: {
      accent:         "#9E7E38",
      accentText:     "#9E7E38",
      accentOnLight:  "#000000",
      accentInk:      "#000000",
      accentSoft:     "#CAB892",
      accentTint:     "#EEE8DB",
      accentTintSoft: "#F7F5EF",
      focus:          "#FFFFFF",
      surface:        "#000000",
      surfaceDeep:    "#000000",
      surfaceAbyss:   "#000000",
      surfaceRaise:   "#1A1A1A"
    },

    // Wake Forest's brand pages did not answer; Inter stands in. Please
    // confirm.
    fonts: {
      ui:       "'Inter','Instrument Sans',system-ui,-apple-system,sans-serif",
      display:  "'Inter','Instrument Display',sans-serif"
    }
  },

  // What .github/workflows/odds.yml commits for Wake Forest, each because a
  // source exists for it.
  snapshots: {
    availability: { file: "data/wake-forest/availability.json", history: "data/wake-forest/availability-history.json", label: "TheACC.com" },
    oddsHistory:  { file: "data/wake-forest/odds-history.json" },
    beatNews:     { file: "data/wake-forest/news.json" },
    recruits:     { file: "data/wake-forest/recruits.json", label: "ESPN recruiting" }
  }
};
