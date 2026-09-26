# Live scan log - Saturday 2026-09-26

David, 2026-09-26: "Scan the app every 15 minutes today for errors and
opportunities for improvement. Don't just change things - log them."

Each scan captures real ESPN payloads on GitHub's runner (the scoreboard,
Notre Dame's schedule, the polls, and the live game summaries), runs the real
app from `main` against them with the clock fixed at the capture time
(`tools/qa/livescan.js`), and checks Home, Game (four views, 390 and 320),
Top 25 (Games and Rankings), Schedule and Roster for errors, broken text,
overflow, score/clock agreement with the scoreboard, and the possession
football and drive colour. Screenshots are reviewed for improvement ideas.

**Nothing here is changed without David's go-ahead.** Severity: **Error** -
wrong or broken for a fan now; **Warn** - likely wrong or fragile;
**Idea** - an opportunity, not a defect.

## Open items (rolled up)

| # | First seen | Severity | Where | What | Status |
|---|---|---|---|---|---|

## Scans

