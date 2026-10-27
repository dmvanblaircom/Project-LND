/* BYU - added with Indiana, Minnesota and North Dakota State (David,
   2026-10-27). Same shape as teams/ohio-state.js; nothing else changed.

   Values verified on 2026-10-27 from GitHub's network (probe-sources.yml):
   ESPN team 252 spells the home field "LaVell Edwards Stadium". Kalshi's
   championship and playoff markets are KXNCAAF-27-BYU and
   KXNCAAFPLAYOFF-26-BYU, named "BYU". Not "Cougars": Houston and Washington
   State are Cougars too. */

var TEAM_CONFIG = {

  team: {
    id:           "byu",
    name:         "BYU",
    abbreviation: "BYU",
    sport:        "football",
    league:       "college-football",
    timeZone:     "America/Denver",

    venue: {
      name: "LaVell Edwards Stadium",
      lat:  40.2575,
      lon: -111.6545
    }
  },

  sources: {
    espn: {
      teamId: "252",
      broadcastFallback: []
    },
    kalshi: {
      tickerSuffix: "-BYU",
      namePattern:  /\bbyu\b|brigham young/i
    },

    // Beat writers, read by the Action server-side. Each was confirmed from
    // GitHub's network on 2026-10-27 (probe-feeds.yml) and approved by David
    // (2026-10-27). BYU Athletics' feed covers every sport; other sports are
    // left out by the producer. `paths` keeps only On3's BYU section. The
    // Daily Universe refuses the runner (403).
    beatFeeds: [
      { name: "BYU Athletics",     feed: "https://byucougars.com/rss/",                                                          site: "https://byucougars.com/sports/football", logo: "https://byucougars.com/favicon.ico" },
      { name: "Vanquish the Foe",  feed: "https://www.vanquishthefoe.com/rss/current.xml",                                       site: "https://www.vanquishthefoe.com/" },
      { name: "BYU On SI",         feed: "https://www.si.com/college/byu/feed",                                                  site: "https://www.si.com/college/byu", logo: "https://images2.minutemediacdn.com/image/upload/v1720431406/SI/ON_SI-Favicon_B_96x96_3.ico" },
      { name: "On3",               feed: "https://www.on3.com/teams/byu-cougars/feed/",                                          site: "https://www.on3.com/teams/byu-cougars/", paths: ["/teams/byu-cougars/"], logo: "https://on3static.com/static/on3/touch-icons/apple-touch-icon-180x180.png" },
      { name: "Deseret News",      feed: "https://www.deseret.com/arc/outboundfeeds/rss/category/sports/byu-cougars/?outputType=xml", site: "https://www.deseret.com/sports/byu-cougars/" }
    ]
  },

  // The Holy War is a rivalry with nothing to win; the Old Wagon Wheel is
  // played for against Utah State.
  series: [
    { match: /^utah( utes)?$/i,              name: "Holy War",        kind: "rivalry" },
    { match: /^utah state( aggies)?$/i,      name: "Old Wagon Wheel", kind: "trophy" }
  ],

  links: {
    roster: { url: "https://byucougars.com/sports/football/roster", label: "byucougars.com" }
  },

  // BYU inside Suite, from brand.byu.edu: navy #002E5D (dominant) with
  // white, and royal #0047BA. Royal is 1.6:1 on navy, too close to mark
  // anything there, so on the navy header the accent is a lighter royal;
  // royal itself is the accent's text on the light page.
  identity: {
    programLabel: "BYU FOOTBALL",

    colors: {
      accent:         "#6A9CF0",   // a lighter BYU royal, 4.92:1 on navy
      accentText:     "#A9C6F5",   // 7.80:1 on navy
      accentOnLight:  "#0047BA",   // BYU royal as text on ivory/white: 7.16:1 / 8.04:1
      accentInk:      "#002E5D",   // navy on the accent fill, 4.92:1
      accentSoft:     "#C2D3EE",   // 8.94:1 on navy
      accentTint:     "#D9E4F7",
      accentTintSoft: "#EEF3FB",
      focus:          "#FFFFFF",

      surface:        "#002E5D",   // BYU navy; white on it 13.56:1
      surfaceDeep:    "#002147",
      surfaceAbyss:   "#001630",
      surfaceRaise:   "#0B3F7A"
    },

    // BYU's primary typeface is Ringside Narrow, sold by its foundry; its web
    // theme sets text in IBM Plex Sans, which is free. One face for text and
    // headings, self-hosted under the OFL. Approved by David, 2026-10-27.
    fonts: {
      ui:       "'IBM Plex Sans','Instrument Sans',system-ui,-apple-system,sans-serif",
      display:  "'IBM Plex Sans','Instrument Display',sans-serif"
    }
  },

  snapshots: {
    oddsHistory: { file: "data/byu/odds-history.json" },
    beatNews:    { file: "data/byu/news.json" },
    recruits:    { file: "data/byu/recruits.json", label: "ESPN recruiting" }
  }
};
