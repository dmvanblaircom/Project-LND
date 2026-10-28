/* Virginia Tech - Phase 3, the Big 12 and the ACC (David, 2026-10-28). Same
   shape as teams/indiana.js; nothing else changed.

   From GitHub's network on 2026-10-28: ESPN team 259, its home field as
   ESPN's schedule spells it (Lane Stadium), and the beat feeds below
   (probe-feeds.yml). Approved with the phase's review sheet. */

var TEAM_CONFIG = {

  team: {
    id:           "virginia-tech",
    name:         "Virginia Tech",
    abbreviation: "VT",
    sport:        "football",
    league:       "college-football",
    timeZone:     "America/New_York",

    venue: {
      name: "Lane Stadium",
      lat:  37.2199,
      lon: -80.4180
    }
  },

  sources: {
    espn: {
      teamId: "259",
      broadcastFallback: []
    },
    kalshi: {
      tickerSuffix: "-VT",
      namePattern:  /virginia tech|hokies/i
    },

    // The ACC's availability reports (tools/producers/conference_availability.py).
    official: {
      availabilityReportIndex: "https://theacc.com/sports/2025/8/28/availability-reporting-football.aspx",
      availabilityReportLabel: "TheACC.com",
      availabilityFeed: { provider: "hdintelligence", conference: "ACC", sport: "Football", team: "Virginia Tech" }
    },

    // Beat writers, read by the Action server-side; each answered from
    // GitHub's network on 2026-10-28. On3's team feeds carry league-wide
    // stories, so `paths` keeps only Virginia Tech's section.
    // Not used: hokiesports.com's feed is every sport; the Collegiate Times
    // turned GitHub's network away (405).
    beatFeeds: [
      { name: "Gobbler Country", feed: "https://www.gobblercountry.com/rss/current.xml", site: "https://www.gobblercountry.com/" },
      { name: "Virginia Tech On SI", feed: "https://www.si.com/college/virginiatech/feed", site: "https://www.si.com/college/virginiatech", logo: "https://images2.minutemediacdn.com/image/upload/v1720431406/SI/ON_SI-Favicon_B_96x96_3.ico" },
      { name: "On3", feed: "https://www.on3.com/teams/virginia-tech-hokies/feed/", site: "https://www.on3.com/teams/virginia-tech-hokies/", paths: ["/teams/virginia-tech-hokies/"], logo: "https://on3static.com/static/on3/touch-icons/apple-touch-icon-180x180.png" }
    ]
  },

  series: [
    { match: /^virginia( cavaliers)?$/i, name: "Commonwealth Clash", kind: "trophy" },
    { match: /^west virginia( mountaineers)?$/i, name: "Black Diamond Trophy", kind: "trophy" }
  ],

  links: {
    roster: { url: "https://hokiesports.com/sports/football/roster", label: "hokiesports.com" }
  },

  // Virginia Tech inside Suite: Chicago Maroon, Burnt Orange, every text pair checked at
  // 4.5:1 (tools/teamidentitycheck.js).
  identity: {
    programLabel: "VIRGINIA TECH FOOTBALL",

    colors: {
      accent:         "#E5751F",
      accentText:     "#E78031",
      accentOnLight:  "#861F41",
      accentInk:      "#111111",
      accentSoft:     "#F1B384",
      accentTint:     "#FAE6D7",
      accentTintSoft: "#FDF4ED",
      focus:          "#FFFFFF",
      surface:        "#861F41",
      surfaceDeep:    "#60162F",
      surfaceAbyss:   "#380D1B",
      surfaceRaise:   "#923554"
    },

    // Virginia Tech's brand faces include Rubik, free (brand.vt.edu): used as
    // it is; Acherus Grotesque and Gineso are licensed.
    fonts: {
      ui:       "'Rubik','Instrument Sans',system-ui,-apple-system,sans-serif",
      display:  "'Rubik','Instrument Display',sans-serif"
    }
  },

  // What .github/workflows/odds.yml commits for Virginia Tech, each because a
  // source exists for it.
  snapshots: {
    availability: { file: "data/virginia-tech/availability.json", history: "data/virginia-tech/availability-history.json", label: "TheACC.com" },
    oddsHistory:  { file: "data/virginia-tech/odds-history.json" },
    beatNews:     { file: "data/virginia-tech/news.json" },
    recruits:     { file: "data/virginia-tech/recruits.json", label: "ESPN recruiting" }
  }
};
