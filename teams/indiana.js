/* Indiana - added with Minnesota, North Dakota State and BYU (David,
   2026-10-27). Same shape as teams/ohio-state.js; nothing else changed.

   Values verified on 2026-10-27 from GitHub's network (probe-sources.yml):
   ESPN team 84 spells the home field "Memorial Stadium (Bloomington, IN)" -
   Nebraska's is "Memorial Stadium (Lincoln, NE)", on this season's schedule,
   so the name keeps its city. Kalshi's championship and playoff markets are
   KXNCAAF-27-IND and KXNCAAFPLAYOFF-26-IND, named "Indiana". */

var TEAM_CONFIG = {

  team: {
    id:           "indiana",
    name:         "Indiana",
    abbreviation: "IU",
    sport:        "football",
    league:       "college-football",
    timeZone:     "America/Indiana/Indianapolis",

    venue: {
      name: "Memorial Stadium (Bloomington",
      lat:  39.1808,
      lon: -86.5256
    }
  },

  sources: {
    espn: {
      teamId: "84",
      broadcastFallback: []
    },
    kalshi: {
      tickerSuffix: "-IND",
      namePattern:  /\bindiana\b(?! st)|hoosiers/i
    },

    // The Big Ten's availability reports, as for Ohio State
    // (tools/producers/conference_availability.py).
    official: {
      availabilityReportIndex: "https://bigten.org/sports/2026/9/10/FB_Availability_Reports.aspx",
      availabilityReportLabel: "BigTen.org",
      availabilityFeed: { provider: "hdintelligence", conference: "B10", sport: "Football", team: "Indiana" }
    },

    // Beat writers, read by the Action server-side. Each was confirmed from
    // GitHub's network on 2026-10-27 (probe-feeds.yml) and approved by David
    // (2026-10-27). The student paper's feed is its whole sports section;
    // other sports are left out by the producer. `paths` keeps only On3's
    // Indiana section.
    beatFeeds: [
      { name: "Indiana Athletics",     feed: "https://iuhoosiers.com/rss?path=football",                  site: "https://iuhoosiers.com/sports/football", logo: "https://iuhoosiers.com/favicon.ico" },
      { name: "The Crimson Quarry",    feed: "https://www.crimsonquarry.com/rss/current.xml",            site: "https://www.crimsonquarry.com/" },
      { name: "Indiana On SI",         feed: "https://www.si.com/college/indiana/feed",                  site: "https://www.si.com/college/indiana", logo: "https://images2.minutemediacdn.com/image/upload/v1720431406/SI/ON_SI-Favicon_B_96x96_3.ico" },
      { name: "On3",                   feed: "https://www.on3.com/teams/indiana-hoosiers/feed/",         site: "https://www.on3.com/teams/indiana-hoosiers/", paths: ["/teams/indiana-hoosiers/"], logo: "https://on3static.com/static/on3/touch-icons/apple-touch-icon-180x180.png" },
      { name: "Hoosier Huddle",        feed: "https://hoosierhuddle.com/rss",                            site: "https://hoosierhuddle.com/" },
      { name: "Indiana Daily Student", feed: "https://www.idsnews.com/plugin/feeds/section/sports.xml",  site: "https://www.idsnews.com/section/sports" }
    ]
  },

  // Played for: the Old Oaken Bucket, against Purdue.
  series: [
    { match: /^purdue( boilermakers)?$/i, name: "Old Oaken Bucket", kind: "trophy" }
  ],

  links: {
    roster: { url: "https://iuhoosiers.com/sports/football/roster", label: "iuhoosiers.com" }
  },

  // Indiana inside Suite, from IU's brand (iu.edu/brand; the IU retail
  // style guide): crimson #990000 and cream. Crimson is the header, as it is
  // on iuhoosiers.com; cream is the accent, as gold is Notre Dame's, and
  // crimson stands in for it as text on the light page.
  identity: {
    programLabel: "INDIANA FOOTBALL",

    colors: {
      accent:         "#EEEDEB",   // IU cream, 7.62:1 on crimson
      accentText:     "#EEEDEB",
      accentOnLight:  "#990000",   // crimson as text on ivory/white: 7.94:1 / 8.92:1
      accentInk:      "#990000",   // on a cream fill, 7.62:1
      accentSoft:     "#E2C9C9",   // small labels on crimson, 5.70:1
      accentTint:     "#F3E3E3",
      accentTintSoft: "#FAF2F2",
      focus:          "#FFFFFF",

      surface:        "#990000",   // IU crimson; white on it 8.92:1
      surfaceDeep:    "#7A0000",
      surfaceAbyss:   "#4D0000",
      surfaceRaise:   "#B01E1E"
    },

    // IU sets its type in Benton Sans, which is not free to use. Libre
    // Franklin, self-hosted in assets/fonts/libre-franklin/ under the OFL, is
    // the closest public face: the same American gothic lineage. One face
    // for text and headings, as Ohio State's. Approved by David, 2026-10-27.
    fonts: {
      ui:       "'Libre Franklin','Instrument Sans',system-ui,-apple-system,sans-serif",
      display:  "'Libre Franklin','Instrument Display',sans-serif"
    }
  },

  // What .github/workflows/odds.yml commits for Indiana, each because a
  // source exists for it. No official depth chart is published.
  snapshots: {
    availability: { file: "data/indiana/availability.json", history: "data/indiana/availability-history.json", label: "BigTen.org" },
    oddsHistory:  { file: "data/indiana/odds-history.json" },
    beatNews:     { file: "data/indiana/news.json" },
    recruits:     { file: "data/indiana/recruits.json", label: "ESPN recruiting" }
  }
};
