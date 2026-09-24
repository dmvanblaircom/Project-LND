/* Notre Dame - the team this Suite is built around.

   Everything the page knows about the team itself lives here, so that
   app.js contains no Notre Dame: it renders whatever team this file
   describes. A second team is a second file in this folder with the same
   shape, and index.html loading that one instead.

   Four sections, each owned by a different layer:

     team     the Team domain object. Provider-neutral: nothing in it names
              ESPN, Kalshi or anyone else. app.js gets it through
              TeamOS.createTeam(), which validates and freezes it.
     sources  how each outside feed identifies this team, and any patches
              for gaps in a feed. Read by app.js for now; in Phase 3 this
              moves inside the provider adapters.
     series   trophy games, matched by opponent name. Schedule data, headed
              for the normalized Game in Phase 3.
     links    the team's own pages, for the official word.
     identity how the team is presented: product name, head copy, colours,
              type and artwork. Read through TeamOS.identity.
     snapshots
              the team-data files the Action writes for this team, by
              kind. A team that has no source for a kind leaves it out and
              the Suite shows that kind as unavailable rather than reading
              another team's file. Read through TeamOS.snapshots.

   Only what the application actually uses today is here. Add a field when
   the application needs it, not before. */

var TEAM_CONFIG = {

  team: {
    id:           "notre-dame",
    name:         "Notre Dame",
    abbreviation: "ND",
    sport:        "football",
    league:       "college-football",

    // The home field, as ESPN spells it, with its coordinates. app.js
    // matches the name case-insensitively to decide when a listed home game
    // is really a neutral site, and uses the coordinates directly for the
    // kickoff forecast because Open-Meteo's geocoder does not know zip 46556.
    venue: {
      name: "Notre Dame Stadium",
      lat:  41.6984,
      lon: -86.2339
    }
  },

  sources: {
    espn: {
      // ESPN's id for the team. Kept as a string: ESPN's payloads carry the
      // id as either, and app.js compares with String().
      teamId: "87",

      // Broadcasts ESPN has not published yet, by opponent. Consulted ONLY
      // when ESPN returns nothing for that game, so an entry can never
      // contradict the feed and disappears on its own once the feed
      // catches up.
      broadcastFallback: [
        [/purdue/i, "Peacock"]        // 2026-09-26, announced 9/14, absent from ESPN
      ]
    },

    // How to pick this team's market out of a Kalshi event: the ticker ends
    // in the team's code, or the market's name says the team.
    kalshi: {
      tickerSuffix: "-ND",
      namePattern:  /notre dame|fighting irish/i
    },

    // Official athletics source for the weekly two-deep. The producer reads
    // this declaration rather than owning a separate hard-coded source.
    official: {
      depthChartIndex: "https://fightingirish.com/news/2022/08/29/ndfbmedia",
      depthChartLabel: "FightingIrish.com",
      availabilityReportIndex: "https://fightingirish.com/news/2022/08/29/ndfbmedia",
      availabilityReportLabel: "FightingIrish.com",

      // Notre Dame's own policy (game notes, "AVAILABILITY UPDATES"): a
      // report Monday, an update Thursday, a final update about 60 minutes
      // before kickoff. tools/producers/freshness.py checks each game that
      // the update we hold is as new as this says one should be.
      availabilityUpdates: {
        timeZone:           "America/New_York",
        daysBeforeKickoff:  [5, 2], // Monday's report and Thursday's update, for a Saturday game
        minutesBeforeKickoff: 60
      }
    },

    // Beat writers' RSS. Read server-side by the Action
    // (tools/producers/beat_news.py), because RSS sites send no CORS header.
    // `site` is where the producer looks for the feed when `feed` stops
    // answering, so a moved feed is found and named in the run's log.
    beatFeeds: [
      { name: "One Foot Down",       feed: "https://www.onefootdown.com/rss/current.xml",   site: "https://www.onefootdown.com/" },
      { name: "Slap the Sign",       feed: "https://slapthesign.com/feed/",                 site: "https://slapthesign.com/" },
      { name: "UHND",                feed: "https://www.uhnd.com/feed/",                    site: "https://www.uhnd.com/" },
      { name: "NDNation",            feed: "https://ndnation.com/feed",                     site: "https://ndnation.com/" },
      { name: "Blue & Gold",         feed: "https://www.on3.com/teams/notre-dame-fighting-irish/feed/", site: "https://www.on3.com/teams/notre-dame-fighting-irish/" },
      { name: "Notre Dame On SI",    feed: "https://www.si.com/college/notredame/feed",     site: "https://www.si.com/college/notredame" }
    ]
  },

  // Trophy and series names for the season's opponents, matched on the
  // opponent name because no public feed carries this. Sourced from the
  // team's own schedule release; the USC entry is dormant while that series
  // is paused.
  series: [
    [/wisconsin/i,                 "Shamrock Series"],
    [/michigan st/i,               "Megaphone Trophy"],
    [/purdue/i,                    "Shillelagh Trophy"],
    [/stanford/i,                  "Legends Trophy"],
    [/navy|midshipmen/i,           "Rip Miller Trophy"],
    [/boston college/i,            "Frank Leahy Memorial Bowl"],
    [/^usc$|southern cal|trojans/i,"Jeweled Shillelagh"],
    [/northwestern/i,              "Lost Shillelagh"]
  ],

  // The team's own pages, where the app points readers for the official word.
  links: {
    roster: { url: "https://fightingirish.com/sports/football/roster", label: "fightingirish.com" }
  },

  // How this team is presented: the product's name for it, the words in the
  // document head, its colours and type, and its artwork. Read through
  // TeamOS.identity, applied by paintIdentity() in app.js. Every value here
  // was authored into index.html, manifest.json or app.css before Phase 6.
  identity: {
    productName:  "Irish Watch",
    programLabel: "NOTRE DAME FOOTBALL",

    // The head and the share cards read slightly differently, as they
    // always have; a team that makes no distinction gives one of each.
    title:            "Irish Watch \u2014 Notre Dame football",
    shareTitle:       "Irish Watch \u2014 Notre Dame Football",
    description:      "Irish Watch \u2014 a Notre Dame football game-day dashboard.",
    shareDescription: "Game day. Every day.",

    // The team's tagline. A team thing, not Suite copy: a team without one
    // says null and the Suite leaves the line out.
    tagline: "Leave No Doubt.",

    // The rule above the News tab. Unchanged wording.
    newsLabel: "LATEST FROM SOUTH BEND",

    manifest: "assets/notre-dame/manifest.json",

    // Notre Dame Athletics navy and gold - the values fightingirish.com
    // uses. accent is the fill; accentText is the same gold because it
    // clears 6.65:1 on surfaceDeep, which a darker team colour would not.
    // The surface scale is the page itself: abyss at the gradient ends,
    // deep as the foundation, surface for cards and the header, raise for
    // hovers and insets.
    colors: {
      accent:         "#C99700",
      accentText:     "#C99700",
      accentOnLight:  "#876500",   // the gold as text on ivory/white: 4.91:1 / 5.40:1
      accentInk:      "#07192F",
      accentSoft:     "#D8B84F",
      accentTint:     "#FFE38A",
      accentTintSoft: "#FFF7D6",
      focus:          "#FFD966",

      surface:        "#0C2340",
      surfaceDeep:    "#07192F",
      surfaceAbyss:   "#061525",
      surfaceRaise:   "#143865"
    },

    // ui carries body copy, display the condensed athletic voice - the
    // Suite's own Barlow family. Editorial type is the Suite's, not a team's.
    fonts: {
      ui:       "'Barlow',system-ui,-apple-system,sans-serif",
      display:  "'Barlow Condensed',sans-serif"
    },

    assets: {
      favicon:    "assets/notre-dame/favicon.svg",
      icon32:     "assets/notre-dame/favicon-32.png",
      icon64:     "assets/notre-dame/favicon-64.png",
      appleTouch: "assets/notre-dame/icon-180.png",
      og:         "assets/notre-dame/og-1200x630.png"
    }
  },

  // The snapshots .github/workflows/odds.yml commits for this team. Each
  // is a capability the team has because a source exists for it: the
  // two-deep comes from Notre Dame's official FightingIrish.com media page,
  // the price history from the Kalshi
  // markets above, the beat stories from the RSS feeds in sources.beatFeeds. The
  // files do not yet carry a team field, so declaring one here is what
  // says it is ours (docs/decisions/0008-snapshots-are-owned-by-declaration.md).
  snapshots: {
    depth:       { file: "depth.json", history: "depth-history.json", label: "FightingIrish.com" },
    // Its own snapshot, not a field of the depth chart: a different official
    // document, published on its own schedule, with its own date
    // (docs/decisions/0019).
    availability: { file: "availability.json", history: "availability-history.json", label: "FightingIrish.com" },
    oddsHistory: { file: "odds-history.json" },
    beatNews:    { file: "news.json" }
  }
};
