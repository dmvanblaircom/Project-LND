/* North Dakota State - added with Indiana, Minnesota and BYU (David,
   2026-10-27). In the FBS from 2026, in the Mountain West. Same shape as
   teams/ohio-state.js; nothing else changed.

   Values verified on 2026-10-27 from GitHub's network (probe-sources.yml):
   ESPN team 2449 spells the home field "Fargodome". Kalshi lists no North
   Dakota State market today; the declaration below picks one up the day it
   is listed. */

var TEAM_CONFIG = {

  team: {
    id:           "north-dakota-state",
    name:         "North Dakota State",
    abbreviation: "NDSU",
    sport:        "football",
    league:       "college-football",
    timeZone:     "America/Chicago",

    venue: {
      name: "Fargodome",
      lat:  46.9006,
      lon: -96.8004
    }
  },

  sources: {
    espn: {
      teamId: "2449",
      broadcastFallback: []
    },
    kalshi: {
      tickerSuffix: "-NDSU",
      namePattern:  /north dakota st|\bndsu\b/i
    },

    // Beat writers, read by the Action server-side. Each was confirmed from
    // GitHub's network on 2026-10-27 (probe-feeds.yml) and approved by David
    // (2026-10-27). Coverage is thin: The Forum, the student paper and the
    // Fargo stations publish no working feed, and On SI has no NDSU site.
    // On3's feed is mostly national; `paths` keeps only its NDSU section.
    beatFeeds: [
      { name: "NDSU Athletics",   feed: "https://gobison.com/rss?path=football",                    site: "https://gobison.com/sports/football", logo: "https://gobison.com/favicon.ico" },
      { name: "Bison Illustrated", feed: "https://bisonillustrated.com/feed/",                       site: "https://bisonillustrated.com/" },
      { name: "On3",              feed: "https://www.on3.com/teams/north-dakota-state-bison/feed/", site: "https://www.on3.com/teams/north-dakota-state-bison/", paths: ["/teams/north-dakota-state-bison/"], logo: "https://on3static.com/static/on3/touch-icons/apple-touch-icon-180x180.png" }
    ]
  },

  // Played for: the Dakota Marker (South Dakota State) and the Nickel Trophy
  // (North Dakota), when they are on the schedule.
  series: [
    { match: /^south dakota state( jackrabbits)?$/i, name: "Dakota Marker", kind: "trophy" },
    { match: /^north dakota( fighting hawks)?$/i,    name: "Nickel Trophy", kind: "trophy" }
  ],

  links: {
    roster: { url: "https://gobison.com/sports/football/roster", label: "gobison.com" }
  },

  // NDSU inside Suite, from its 2025 brand basics (ndsu.edu): official green
  // #00583D, dark green #003524 and yellow #FFC425.
  identity: {
    programLabel: "NDSU FOOTBALL",

    colors: {
      accent:         "#FFC425",   // NDSU yellow, 5.35:1 on green
      accentText:     "#FFC425",
      accentOnLight:  "#00583D",   // green as text on ivory/white: 7.59:1 / 8.53:1
      accentInk:      "#003524",   // NDSU dark green on a yellow fill, 8.58:1
      accentSoft:     "#FFD866",   // 6.20:1 on green
      accentTint:     "#FFEDB8",
      accentTintSoft: "#FFF7DE",
      focus:          "#FFD866",

      surface:        "#00583D",   // NDSU green; white on it 8.53:1
      surfaceDeep:    "#003524",   // NDSU dark green
      surfaceAbyss:   "#00241A",
      surfaceRaise:   "#0B6E4F"
    },

    // NDSU's own guide names its faces: New Spirit for display, Antonio for
    // eyebrows and subheads, Gotham for text. Antonio is free, and NDSU
    // points to it; Montserrat is the closest public face to Gotham. Both
    // self-hosted under the OFL. Approved by David, 2026-10-27.
    fonts: {
      ui:       "'Montserrat','Instrument Sans',system-ui,-apple-system,sans-serif",
      display:  "'Antonio','Instrument Display',sans-serif"
    }
  },

  snapshots: {
    oddsHistory: { file: "data/north-dakota-state/odds-history.json" },
    beatNews:    { file: "data/north-dakota-state/news.json" },
    recruits:    { file: "data/north-dakota-state/recruits.json", label: "ESPN recruiting" }
  }
};
