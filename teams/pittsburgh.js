/* Pittsburgh - Phase 3, the Big 12 and the ACC (David, 2026-10-28). Same
   shape as teams/indiana.js; nothing else changed.

   From GitHub's network on 2026-10-28: ESPN team 221, its home field as
   ESPN's schedule spells it (Acrisure Stadium), and the beat feeds below
   (probe-feeds.yml). Approved with the phase's review sheet. */

var TEAM_CONFIG = {

  team: {
    id:           "pittsburgh",
    name:         "Pittsburgh",
    abbreviation: "PITT",
    sport:        "football",
    league:       "college-football",
    timeZone:     "America/New_York",

    venue: {
      name: "Acrisure Stadium",
      lat:  40.4468,
      lon: -80.0158
    }
  },

  sources: {
    espn: {
      teamId: "221",
      broadcastFallback: []
    },
    kalshi: {
      tickerSuffix: "-PITT",
      namePattern:  /\bpitt(sburgh)?\b/i
    },

    // The ACC's availability reports (tools/producers/conference_availability.py).
    official: {
      availabilityReportIndex: "https://theacc.com/sports/2025/8/28/availability-reporting-football.aspx",
      availabilityReportLabel: "TheACC.com",
      availabilityFeed: { provider: "hdintelligence", conference: "ACC", sport: "Football", team: "Pittsburgh", aliases: ["Pitt"] }
    },

    // Beat writers, read by the Action server-side; each answered from
    // GitHub's network on 2026-10-28.
    // Pittsburgh Sports Now is an independent Pitt site that On3 now hosts,
    // read through its own section so On3's national stories stay out
    // (2026-10-29). Not used: Cardiac Hill (SB Nation) did not answer, and the
    // Pitt News turned GitHub's network away (403).
    beatFeeds: [
      { name: "Pitt Athletics", feed: "https://pittsburghpanthers.com/rss?path=football", site: "https://pittsburghpanthers.com/sports/football", logo: "https://pittsburghpanthers.com/favicon.ico" },
      { name: "Pitt On SI", feed: "https://www.si.com/college/pittsburgh/feed", site: "https://www.si.com/college/pittsburgh", logo: "https://images2.minutemediacdn.com/image/upload/v1720431406/SI/ON_SI-Favicon_B_96x96_3.ico" },
      { name: "Pittsburgh Sports Now", feed: "https://www.on3.com/sites/pitt-sports-news/feed/", site: "https://www.on3.com/sites/pitt-sports-news/", paths: ["/sites/pitt-sports-news/"], logo: "https://on3static.com/static/on3/touch-icons/apple-touch-icon-180x180.png" }
    ]
  },

  series: [
    { match: /^west virginia( mountaineers)?$/i, name: "Backyard Brawl", kind: "rivalry" }
  ],

  links: {
    roster: { url: "https://pittsburghpanthers.com/sports/football/roster", label: "pittsburghpanthers.com" }
  },

  // Pittsburgh inside Suite: Pitt Royal, Pitt Gold (ESPN's), every text pair checked at
  // 4.5:1 (tools/teamidentitycheck.js).
  identity: {
    programLabel: "PITT FOOTBALL",

    colors: {
      accent:         "#FFB81C",
      accentText:     "#FFB81C",
      accentOnLight:  "#003594",
      accentInk:      "#003594",
      accentSoft:     "#FFD882",
      accentTint:     "#FFF2D6",
      accentTintSoft: "#FFF9ED",
      focus:          "#FFFFFF",
      surface:        "#003594",
      surfaceDeep:    "#00266B",
      surfaceAbyss:   "#00163E",
      surfaceRaise:   "#1A499F"
    },

    // Pitt's brand pages did not answer; Inter stands in. Please confirm.
    fonts: {
      ui:       "'Inter','Instrument Sans',system-ui,-apple-system,sans-serif",
      display:  "'Inter','Instrument Display',sans-serif"
    }
  },

  // What .github/workflows/odds.yml commits for Pittsburgh, each because a
  // source exists for it.
  snapshots: {
    availability: { file: "data/pittsburgh/availability.json", history: "data/pittsburgh/availability-history.json", label: "TheACC.com" },
    oddsHistory:  { file: "data/pittsburgh/odds-history.json" },
    beatNews:     { file: "data/pittsburgh/news.json" },
    recruits:     { file: "data/pittsburgh/recruits.json", label: "ESPN recruiting" }
  }
};
