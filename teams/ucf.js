/* UCF - Phase 3, the Big 12 and the ACC (David, 2026-10-28). Same
   shape as teams/indiana.js; nothing else changed.

   From GitHub's network on 2026-10-28: ESPN team 2116, its home field as
   ESPN's schedule spells it (Acrisure Bounce House), and the beat feeds below
   (probe-feeds.yml). Approved with the phase's review sheet. */

var TEAM_CONFIG = {

  team: {
    id:           "ucf",
    name:         "UCF",
    abbreviation: "UCF",
    sport:        "football",
    league:       "college-football",
    timeZone:     "America/New_York",

    venue: {
      name: "Acrisure Bounce House",
      lat:  28.6081,
      lon: -81.1925
    }
  },

  sources: {
    espn: {
      teamId: "2116",
      broadcastFallback: []
    },

    // The Big 12's availability reports (tools/producers/conference_availability.py).
    official: {
      availabilityReportIndex: "https://big12sports.com/sports/football",
      availabilityReportLabel: "Big12Sports.com",
      availabilityFeed: { provider: "hdintelligence", conference: "B12", sport: "Football", team: "UCF" }
    },

    // Beat writers, read by the Action server-side; each answered from
    // GitHub's network on 2026-10-28.
    // UCF Sports is On3's fan site for UCF (the former Rivals site), read
    // through its own section so On3's national stories stay out (2026-10-29).
    // Not used: ucfknights.com's feed is every sport, and Black & Gold
    // Banneret (SB Nation) stopped publishing in March.
    beatFeeds: [
      { name: "UCF On SI", feed: "https://www.si.com/college/ucf/feed", site: "https://www.si.com/college/ucf", logo: "https://images2.minutemediacdn.com/image/upload/v1720431406/SI/ON_SI-Favicon_B_96x96_3.ico" },
      { name: "Knight News", feed: "https://www.knightnews.com/feed/", site: "https://www.knightnews.com/", sportsSection: true },
      { name: "UCF Sports", feed: "https://www.on3.com/sites/ucf-sports/feed/", site: "https://www.on3.com/sites/ucf-sports/", paths: ["/sites/ucf-sports/"], logo: "https://on3static.com/static/on3/touch-icons/apple-touch-icon-180x180.png" }
    ]
  },

  series: [
    { match: /^south florida( bulls)?$|^usf( bulls)?$/i, name: "War on I-4", kind: "rivalry" }
  ],

  links: {
    roster: { url: "https://ucfknights.com/sports/football/roster", label: "ucfknights.com" }
  },

  // UCF inside Suite: Black, UCF Gold (ucf.edu/brand), every text pair checked at
  // 4.5:1 (tools/teamidentitycheck.js).
  identity: {
    programLabel: "UCF FOOTBALL",

    colors: {
      accent:         "#EDB80D",
      accentText:     "#EDB80D",
      accentOnLight:  "#000000",
      accentInk:      "#000000",
      accentSoft:     "#F5D87A",
      accentTint:     "#FCF2D3",
      accentTintSoft: "#FEF9EC",
      focus:          "#FFFFFF",
      surface:        "#000000",
      surfaceDeep:    "#000000",
      surfaceAbyss:   "#000000",
      surfaceRaise:   "#1A1A1A"
    },

    // UCF's primary face, Gotham, is licensed (ucf.edu/brand); Montserrat is
    // the usual free match.
    fonts: {
      ui:       "'Montserrat','Instrument Sans',system-ui,-apple-system,sans-serif",
      display:  "'Montserrat','Instrument Display',sans-serif"
    }
  },

  // What .github/workflows/odds.yml commits for UCF, each because a
  // source exists for it.
  snapshots: {
    availability: { file: "data/ucf/availability.json", history: "data/ucf/availability-history.json", label: "Big12Sports.com" },
    beatNews:     { file: "data/ucf/news.json" },
    recruits:     { file: "data/ucf/recruits.json", label: "ESPN recruiting" }
  }
};
