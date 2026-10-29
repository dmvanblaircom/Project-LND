/* Florida State - Phase 3, the Big 12 and the ACC (David, 2026-10-28). Same
   shape as teams/indiana.js; nothing else changed.

   From GitHub's network on 2026-10-28: ESPN team 52, its home field as
   ESPN's schedule spells it (Doak Campbell Stadium), and the beat feeds below
   (probe-feeds.yml). Approved with the phase's review sheet. */

var TEAM_CONFIG = {

  team: {
    id:           "florida-state",
    name:         "Florida State",
    abbreviation: "FSU",
    sport:        "football",
    league:       "college-football",
    timeZone:     "America/New_York",

    venue: {
      name: "Doak Campbell Stadium",
      lat:  30.4381,
      lon: -84.3044
    }
  },

  sources: {
    espn: {
      teamId: "52",
      broadcastFallback: []
    },
    kalshi: {
      tickerSuffix: "-FSU",
      namePattern:  /florida st/i
    },

    // The ACC's availability reports (tools/producers/conference_availability.py).
    official: {
      availabilityReportIndex: "https://theacc.com/sports/2025/8/28/availability-reporting-football.aspx",
      availabilityReportLabel: "TheACC.com",
      availabilityFeed: { provider: "hdintelligence", conference: "ACC", sport: "Football", team: "Florida St.", aliases: ["Florida State"] }
    },

    // Beat writers, read by the Action server-side; each answered from
    // GitHub's network on 2026-10-28. On3's team feeds carry league-wide
    // stories, so `paths` keeps only Florida State's section.
    beatFeeds: [
      { name: "Florida State Athletics", feed: "https://seminoles.com/rss?path=football", site: "https://seminoles.com/sports/football", logo: "https://seminoles.com/favicon.ico" },
      { name: "Tomahawk Nation", feed: "https://www.tomahawknation.com/rss/current.xml", site: "https://www.tomahawknation.com/" },
      { name: "Florida State On SI", feed: "https://www.si.com/college/fsu/feed", site: "https://www.si.com/college/fsu", logo: "https://images2.minutemediacdn.com/image/upload/v1720431406/SI/ON_SI-Favicon_B_96x96_3.ico" },
      { name: "On3", feed: "https://www.on3.com/teams/florida-state-seminoles/feed/", site: "https://www.on3.com/teams/florida-state-seminoles/", paths: ["/teams/florida-state-seminoles/"], logo: "https://on3static.com/static/on3/touch-icons/apple-touch-icon-180x180.png" }
    ]
  },

  series: [
    { match: /^florida( gators)?$/i, name: "Sunshine Showdown", kind: "rivalry" },
    { match: /^miami( hurricanes)?$/i, name: "Florida State-Miami", kind: "rivalry" }
  ],

  links: {
    roster: { url: "https://seminoles.com/sports/football/roster", label: "seminoles.com" }
  },

  // Florida State inside Suite: Garnet, Gold (ESPN's), every text pair checked at
  // 4.5:1 (tools/teamidentitycheck.js).
  identity: {
    programLabel: "FLORIDA STATE FOOTBALL",

    colors: {
      accent:         "#CEB888",
      accentText:     "#CEB888",
      accentOnLight:  "#782F40",
      accentInk:      "#782F40",
      accentSoft:     "#E4D8BE",
      accentTint:     "#F6F2EA",
      accentTintSoft: "#FBF9F5",
      focus:          "#FFFFFF",
      surface:        "#782F40",
      surfaceDeep:    "#56222E",
      surfaceAbyss:   "#32141B",
      surfaceRaise:   "#864453"
    },

    // Florida State's brand pages did not answer; Montserrat stands in.
    // Please confirm.
    fonts: {
      ui:       "'Montserrat','Instrument Sans',system-ui,-apple-system,sans-serif",
      display:  "'Montserrat','Instrument Display',sans-serif"
    }
  },

  // What .github/workflows/odds.yml commits for Florida State, each because a
  // source exists for it.
  snapshots: {
    availability: { file: "data/florida-state/availability.json", history: "data/florida-state/availability-history.json", label: "TheACC.com" },
    oddsHistory:  { file: "data/florida-state/odds-history.json" },
    beatNews:     { file: "data/florida-state/news.json" },
    recruits:     { file: "data/florida-state/recruits.json", label: "ESPN recruiting" }
  }
};
