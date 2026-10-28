/* West Virginia - Phase 3, the Big 12 and the ACC (David, 2026-10-28). Same
   shape as teams/indiana.js; nothing else changed.

   From GitHub's network on 2026-10-28: ESPN team 277, its home field as
   ESPN's schedule spells it (Milan Puskar Stadium), and the beat feeds below
   (probe-feeds.yml). Approved with the phase's review sheet. */

var TEAM_CONFIG = {

  team: {
    id:           "west-virginia",
    name:         "West Virginia",
    abbreviation: "WVU",
    sport:        "football",
    league:       "college-football",
    timeZone:     "America/New_York",

    venue: {
      name: "Milan Puskar Stadium",
      lat:  39.6503,
      lon: -79.9549
    }
  },

  sources: {
    espn: {
      teamId: "277",
      broadcastFallback: []
    },

    // The Big 12's availability reports (tools/producers/conference_availability.py).
    official: {
      availabilityReportIndex: "https://big12sports.com/sports/football",
      availabilityReportLabel: "Big12Sports.com",
      availabilityFeed: { provider: "hdintelligence", conference: "B12", sport: "Football", team: "West Virginia" }
    },

    // Beat writers, read by the Action server-side; each answered from
    // GitHub's network on 2026-10-28.
    // Not used: The Daily Athenaeum turned GitHub's network away (429); no
    // On3 team feed (404).
    beatFeeds: [
      { name: "West Virginia Athletics", feed: "https://wvusports.com/rss?path=football", site: "https://wvusports.com/sports/football", logo: "https://wvusports.com/favicon.ico" },
      { name: "The Smoking Musket", feed: "https://www.smokingmusket.com/rss/current.xml", site: "https://www.smokingmusket.com/" },
      { name: "West Virginia On SI", feed: "https://www.si.com/college/westvirginia/feed", site: "https://www.si.com/college/westvirginia", logo: "https://images2.minutemediacdn.com/image/upload/v1720431406/SI/ON_SI-Favicon_B_96x96_3.ico" }
    ]
  },

  series: [
    { match: /^pittsburgh( panthers)?$|^pitt( panthers)?$/i, name: "Backyard Brawl", kind: "rivalry" },
    { match: /^virginia tech( hokies)?$/i, name: "Black Diamond Trophy", kind: "trophy" }
  ],

  links: {
    roster: { url: "https://wvusports.com/sports/football/roster", label: "wvusports.com" }
  },

  // West Virginia inside Suite: WVU Blue, Old Gold (ESPN's), every text pair checked at
  // 4.5:1 (tools/teamidentitycheck.js).
  identity: {
    programLabel: "WEST VIRGINIA FOOTBALL",

    colors: {
      accent:         "#EAAA00",
      accentText:     "#EAAA00",
      accentOnLight:  "#002855",
      accentInk:      "#002855",
      accentSoft:     "#F3D073",
      accentTint:     "#FBF0D1",
      accentTintSoft: "#FDF8EB",
      focus:          "#FFFFFF",
      surface:        "#002855",
      surfaceDeep:    "#001D3D",
      surfaceAbyss:   "#001124",
      surfaceRaise:   "#1A3E66"
    },

    // WVU's brand pages did not answer; Inter stands in. Please confirm.
    fonts: {
      ui:       "'Inter','Instrument Sans',system-ui,-apple-system,sans-serif",
      display:  "'Inter','Instrument Display',sans-serif"
    }
  },

  // What .github/workflows/odds.yml commits for West Virginia, each because a
  // source exists for it.
  snapshots: {
    availability: { file: "data/west-virginia/availability.json", history: "data/west-virginia/availability-history.json", label: "Big12Sports.com" },
    beatNews:     { file: "data/west-virginia/news.json" },
    recruits:     { file: "data/west-virginia/recruits.json", label: "ESPN recruiting" }
  }
};
