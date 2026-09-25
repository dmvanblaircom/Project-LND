/* Ohio State - the second team, and the architecture's proof.

   Same shape as teams/notre-dame.js, nothing else changed: index.html loads
   this file instead and app.js renders the Buckeyes. What comes out right
   and what comes out wrong is recorded in docs/engineering/ - that record,
   not this file, is the point of Phase 5A.

   Values verified against the feeds on 2026-09-18: ESPN team 194 spells the
   home field "Ohio Stadium"; Kalshi's championship and playoff markets are
   KXNCAAF-27-OSU and KXNCAAFPLAYOFF-26-OSU, named "Ohio St.". */

var TEAM_CONFIG = {

  team: {
    id:           "ohio-state",
    name:         "Ohio State",
    abbreviation: "OSU",
    sport:        "football",
    league:       "college-football",
    timeZone:     "America/New_York",   // the local calendar for team policies

    venue: {
      name: "Ohio Stadium",
      lat:  40.0017,
      lon: -83.0197
    }
  },

  sources: {
    espn: {
      teamId: "194",
      broadcastFallback: []
    },
    kalshi: {
      tickerSuffix: "-OSU",
      namePattern:  /ohio st|buckeyes/i
    }
  },

  // Only the trophy game whose name reads correctly after the page's
  // "Playing for the ..." - the Michigan game has no trophy and calling it
  // "the The Game" would be wrong. That copy is one of the proof's findings.
  series: [
    [/illinois/i, "Illibuck Trophy"]
  ],

  links: {
    roster: { url: "https://ohiostatebuckeyes.com/sports/football/roster", label: "ohiostatebuckeyes.com" }
  },

  // Ohio State inside Suite. Values from Ohio State's current BUX palette; the
  // accent is scarlet and it is a FILL, not a typeface - 2.88:1 on the
  // charcoal foundation - so accentText is BUX gray-light and scarlet is
  // kept for rules, indicators, active states and team markers. That is
  // the accessibility direction BUX itself gives for dark surfaces.
  identity: {
    programLabel: "OHIO STATE FOOTBALL",

    // No tagline: "Leave No Doubt." is Notre Dame's, not the platform's.
    tagline: null,

    colors: {
      accent:         "#BA0C2F",   // BUX scarlet
      accentText:     "#EFF1F2",   // BUX gray-light-80, 16.77:1 on the page
      accentOnLight:  "#BA0C2F",   // scarlet as text on ivory/white: 6.01:1 / 6.60:1
      accentInk:      "#FFFFFF",   // on a scarlet fill, 6.60:1
      accentSoft:     "#A7B1B7",   // BUX gray, 8.70:1 - small labels
      accentTint:     "#EFF1F2",
      accentTintSoft: "#F6F7F8",   // BUX gray-light-90
      focus:          "#EFF1F2",

      surface:        "#212325",   // BUX gray-dark-80
      surfaceDeep:    "#0B1115",
      surfaceAbyss:   "#070A0C",
      surfaceRaise:   "#3F4443"    // BUX gray-dark-60
    },

    // Ohio State's official webfonts, named as BUX names them. The font
    // files are NOT distributed with this project and no @font-face is
    // declared for them, so these stacks fall through to the Suite's own
    // faces until we have permission; activating them is then a resource
    // change, not an architectural one.
    fonts: {
      ui:       "'BuckeyeSans','Barlow',system-ui,-apple-system,sans-serif",
      display:  "'BuckeyeSans','Barlow Condensed',sans-serif"
    }
  },

  // No Action writes anything for Ohio State yet: no depth-chart source,
  // no price history, no beat feeds. Declaring none is what keeps Notre
  // Dame's files off this page (Phase 5B); each kind appears here when a
  // source for it exists.
  snapshots: {}
};
