/* Texas Tech - Phase 3, the Big 12 and the ACC (David, 2026-10-28). Same
   shape as teams/indiana.js; nothing else changed.

   From GitHub's network on 2026-10-28: ESPN team 2641, its home field as
   ESPN's schedule spells it (Galaxy Stadium), and the beat feeds below
   (probe-feeds.yml). Approved with the phase's review sheet. */

var TEAM_CONFIG = {

  team: {
    id:           "texas-tech",
    name:         "Texas Tech",
    abbreviation: "TTU",
    sport:        "football",
    league:       "college-football",
    timeZone:     "America/Chicago",

    venue: {
      name: "Galaxy Stadium",
      lat:  33.5911,
      lon: -101.8728
    }
  },

  sources: {
    espn: {
      teamId: "2641",
      broadcastFallback: []
    },
    kalshi: {
      tickerSuffix: "-TTU",
      namePattern:  /texas tech/i
    },

    // The Big 12's availability reports (tools/producers/conference_availability.py).
    official: {
      availabilityReportIndex: "https://big12sports.com/sports/football",
      availabilityReportLabel: "Big12Sports.com",
      availabilityFeed: { provider: "hdintelligence", conference: "B12", sport: "Football", team: "Texas Tech" }
    },

    // Beat writers, read by the Action server-side; each answered from
    // GitHub's network on 2026-10-28.
    // Red Raider Sports is On3's fan site for Texas Tech (the former Rivals
    // site), read through its own section so On3's national stories stay out
    // (2026-10-29). Not used: Viva the Matadors (SB Nation) did not answer,
    // and the Daily Toreador turned GitHub's network away (405).
    beatFeeds: [
      { name: "Texas Tech Athletics", feed: "https://texastech.com/rss?path=football", site: "https://texastech.com/sports/football", logo: "https://texastech.com/favicon.ico" },
      { name: "Texas Tech On SI", feed: "https://www.si.com/college/texas-tech/feed", site: "https://www.si.com/college/texas-tech", logo: "https://images2.minutemediacdn.com/image/upload/v1720431406/SI/ON_SI-Favicon_B_96x96_3.ico" },
      { name: "Red Raider Sports", feed: "https://www.on3.com/sites/red-raider-sports/feed/", site: "https://www.on3.com/sites/red-raider-sports/", paths: ["/sites/red-raider-sports/"], logo: "https://on3static.com/static/on3/touch-icons/apple-touch-icon-180x180.png" }
    ]
  },

  series: [

  ],

  links: {
    // Where the program posts its game notes (Game links to it; David,
    // 2026-10-30): its notes page, which carries this season's notes
    // (checked from GitHub's network that day).
    gameNotes: { url: "https://texastech.com/sports/2026/7/10/sports-m-footbl-spec-rel-2026-gamenotes-html", label: "texastech.com", kind: "index" },
    roster: { url: "https://texastech.com/sports/football/roster", label: "texastech.com" }
  },

  // Texas Tech inside Suite: Scarlet, white (Texas Tech's page did not answer), every text pair checked at
  // 4.5:1 (tools/teamidentitycheck.js).
  identity: {
    programLabel: "TEXAS TECH FOOTBALL",

    colors: {
      accent:         "#FFFFFF",
      accentText:     "#FFFFFF",
      accentOnLight:  "#CC0000",
      accentInk:      "#CC0000",
      accentSoft:     "#FFFFFF",
      accentTint:     "#F6D1D1",
      accentTintSoft: "#FBEBEB",
      focus:          "#FFFFFF",
      surface:        "#CC0000",
      surfaceDeep:    "#930000",
      surfaceAbyss:   "#560000",
      surfaceRaise:   "#D11A1A"
    },

    // Texas Tech's brand pages did not answer; Inter stands in. Please
    // confirm.
    fonts: {
      ui:       "'Inter','Instrument Sans',system-ui,-apple-system,sans-serif",
      display:  "'Inter','Instrument Display',sans-serif"
    }
  },

  // What .github/workflows/odds.yml commits for Texas Tech, each because a
  // source exists for it.
  snapshots: {
    availability: { file: "data/texas-tech/availability.json", history: "data/texas-tech/availability-history.json", label: "Big12Sports.com" },
    oddsHistory:  { file: "data/texas-tech/odds-history.json" },
    beatNews:     { file: "data/texas-tech/news.json" },
    recruits:     { file: "data/texas-tech/recruits.json", label: "ESPN recruiting" }
  }
};
