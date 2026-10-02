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
