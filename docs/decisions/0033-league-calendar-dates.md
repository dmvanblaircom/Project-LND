# 0033: Dates from the league's published calendar may be shown

**Status:** accepted, 2026-10-02 (David). Supersedes, for the league
calendar only, Top 25's rule that "no date is promised that the feed does not
give" (`suite/top25.js`, review of 2026-09-24).

## Context

David asked that fans know when the CFP committee's rankings come out, when
Selection Day is, and when their team's bowl game is announced. No game or
rankings feed carries those dates. They are published by the league once a
season, months ahead.

## Decision

1. The league's calendar is **data**: `leagues/college-football.js`
   (`LEAGUE_CALENDAR`), one block per season, each date with its source and
   the day it was checked. A new season is a new block, nothing else.
2. Only dates the league published are shown, checked at the source (the
   CFP's own pages, NCAA.com, the network's press room), never from a summary
   of them. A season with no published block shows no dates: the old
   "once the committee releases them" notice stands.
3. **One rankings show at a time:** the next show, or the one on air. Never
   the season's list. Selection Day is shown until its show ends.
4. A practice that is not a published time is said as a practice: bowls name
   their teams on Selection Day, after the playoff field, with no time of
   their own.
5. Times are shown in the fan's device time with its zone, as kickoffs are
   (decision 0022 #1).
6. `TeamOS.season.calendar` picks what to show; the Suite only writes it.

## Consequences

- The calendar is maintained once a season, when the league publishes it
  (August for 2026). The check `adaptercheck` fails a time without its
  offset.
- Notifications built on these dates are queued in
  `docs/product/notifications-brief.md` §2.
