/* The league's published calendar: when the College Football Playoff
   committee releases its rankings, Selection Day, and when the bowls name
   their teams. League data, not team data and not code - every team's Suite
   reads the same calendar (TeamOS.season.calendar), and a new season is a new
   block here, nothing else.

   Each date is what the league published, checked at the source from
   GitHub's network on 2026-10-02 (tools/probe_sources.py):
     - the rankings shows: NCAA.com, "College Football Playoff rankings
       schedule, release dates" (updated 2026-08-27), and FBSchedules,
       "College Football Playoff sets 2026 rankings release schedule"
       (2026-08-06); all on ESPN, times ET;
     - Selection Day: collegefootballplayoff.com, the 2026-27 bracket page:
       "Sun., Dec. 6 ... Watch Live on ESPN and the ESPN app";
     - the bowls: every bowl outside the playoff names its teams on Selection
       Day, after the playoff field (ESPN Press Room, 2025 Selection Day:
       "Championship Drive: Bowl Breakdown", 3-5 p.m.). That is the league's
       practice, not a published 2026 time, so it carries no time of its own.

   Times are Eastern with their offset, so a device anywhere reads the right
   instant; standard time from Nov 1, 2026.

   kind      rankings | selection | bowls
   n         which rankings release (1 is the first)
   start     when it begins; end, when the show ends
   on        where to watch */

var LEAGUE_CALENDAR = {
  league: "college-football",
  seasons: {
    "2026": [
      { kind: "rankings", n: 1, start: "2026-11-03T19:00:00-05:00", end: "2026-11-03T20:00:00-05:00", on: "ESPN" },
      { kind: "rankings", n: 2, start: "2026-11-10T21:00:00-05:00", end: "2026-11-10T21:30:00-05:00", on: "ESPN" },
      { kind: "rankings", n: 3, start: "2026-11-17T21:00:00-05:00", end: "2026-11-17T21:30:00-05:00", on: "ESPN" },
      { kind: "rankings", n: 4, start: "2026-11-24T19:30:00-05:00", end: "2026-11-24T20:00:00-05:00", on: "ESPN" },
      { kind: "rankings", n: 5, start: "2026-12-01T19:00:00-05:00", end: "2026-12-01T19:30:00-05:00", on: "ESPN" },
      { kind: "selection", start: "2026-12-06T12:00:00-05:00", end: "2026-12-06T15:00:00-05:00", on: "ESPN" },
      { kind: "bowls", day: "2026-12-06" }
    ]
  }
};

/* The College Football Playoff's format, by season: where the lines fall
   that a team can be on either side of. Around's "Games that matter" reads
   them (TeamOS.around; docs/product/games-that-matter-relevance-proposal.md),
   so a new format is a new block here, never code.

   2026 (REPORTED, the 12-team format as amended in 2025): the top four
   are seeded with byes, twelve make the field.
   2027 on (REPORTED, the CFP's announcement of 2026-11-09): 24 teams, the
   top eight with byes, 9 to 16 host 17 to 24 in the first round.

   cutlines  { at: the last place on the good side, what: what that side has } */
var LEAGUE_PLAYOFF = {
  league: "college-football",
  formats: [
    { from: 2024, to: 2026, field: 12,
      cutlines: [{ at: 4, what: "a first-round bye" }, { at: 12, what: "a place in the field" }] },
    { from: 2027, field: 24,
      cutlines: [{ at: 8, what: "a first-round bye" }, { at: 16, what: "a first-round home game" }, { at: 24, what: "a place in the field" }] }
  ]
};

// What fans call each conference (David, 2026-11-05: Around's "your
// conference" layer). The registry (teams/index.js) carries the full names;
// these are the names a heading uses. A conference not listed reads in full.
var LEAGUE_CONFERENCES = {
  "American Conference":       "American",
  "Atlantic Coast Conference": "ACC",
  "Big 12 Conference":         "Big 12",
  "Big Ten Conference":        "Big Ten",
  "Conference USA":            "Conference USA",
  "Mid-American Conference":   "MAC",
  "Mountain West Conference":  "Mountain West",
  "Pac-12 Conference":         "Pac-12",
  "Southeastern Conference":   "SEC",
  "Sun Belt Conference":       "Sun Belt"
};
