# Offseason UI: reviewable direction and integration contract

Based on David's approved decisions in `docs/product/offseason-home-proposal.md`
§7. This is a proposed presentation, not approval to ship new screens.
The interactive `offseason-preview.html` beside this file uses the shipping
wordmark, local fonts and identity tokens. Open through a local HTTP server,
for example `/docs/design/offseason-preview.html?team=ohio-state&state=complete`.
Controls compare both teams, Team/Suite styles, S2, S4 and a failed next-season
request. Figures are conspicuously labeled illustrative, never fixtures or
current results. Production actions are identified rather than simulated as
completed operations.

Review captures at 390px: [awaiting selection](reviews/offseason-oct12/awaiting.png),
[season complete](reviews/offseason-oct12/complete.png), and
[next-schedule failure](reviews/offseason-oct12/failed.png). The preview was
rendered for all three states, both teams and both styles at 320/390/1280:
36 layouts without page overflow or runtime errors. The three controls and
the review-only Results action were checked. This verifies the prototype,
not the unbuilt production season transitions.

## Composition

| Region | S2: awaiting postseason | S4: season complete |
|---|---|---|
| Header | Existing SUITE/team/Settings header | Same |
| Hero | Season and regular-season-complete label; record and current CFP rank when available | Season-complete label; final record and final published ranking when available |
| Result | Last regular-season result with actual opponent | Last result with actual postseason/bowl label when available; no invented postseason for a team with none |
| What's next | Selection Day from the league calendar, in the fan's timezone; update wording during/after the show | Next-season opener when confirmed; distinct loading, unavailable and failed states otherwise |
| Action | Results of the displayed season | Results of the displayed season |
| Below hero | Preserve approved in-season ordering | News immediately below hero; supported recruiting/draft content follows |
| Nav | Existing in-season nav | Approved seasonal nav, subject to league calendar rules below |

The record is the principal visual, not a large prose recap. Two equal metric
columns, a quiet divider, and one last-result row. On 320px, titles wrap and
the action stays full-width; no horizontal scroller or reduced tap targets.
Use Ink/Pearl and the shipping type roles. Champagne is an accent label on
dark; bronze remains a small separator. Team Style retains team tokens.
Actual production results must include the opponent; the preview's generic
result labels demonstrate hierarchy only.

## State contract: Claude supplies, Codex renders

Reuse `TeamOS.season.phase`: do not recompute S1–S5 in a template. The controller
must distinguish a failed next-season request from a successful empty one;
`phase.opener === null` alone does not establish why no opener is shown.

Required inputs alongside the existing phase:

- The displayed season and a trustworthy final/regular-season record.
- A ranking tied to that season and named source; omit when unavailable.
- The last normalized Game, including source-supplied stage and valid scores.
- `TeamOS.season.calendar` for selection times and broadcast metadata.
- Next-schedule load outcome and the normalized opener, when available.
- Source-specific freshness, retained-copy and retry state.
- Recruiting and draft models from `TeamOS.prospects`; missing values absent.
- A season-matched market model; old markets never spill into the next season.

Suggested copy when no opener is displayed:

| Evidence | Copy |
|---|---|
| Request pending, no saved result | “Checking the 2027 schedule…” |
| Successful current-year request, no usable listed games | “The 2027 schedule is not available yet.” |
| Request failed, no saved result | “The 2027 schedule couldn’t load. We’ll try again when the connection returns.” |
| Failed with saved opener | Keep the opener and the existing page-level freshness warning |

Use the actual next season, not the sample year. Empty API data is not proof
the school has not announced its schedule elsewhere. Do not say “not released”
without that evidence.

## Seasonal navigation and unchanged states

- Keep Top 25 through the national title game even if this team's season is
  already complete. Team phase and league navigation phase are separate.
- In the approved offseason interval: Home, News, Schedule, Roster, More.
- Top 25 returns with the preseason AP release. Game returns with it, and
  no later than 14 days before a confirmed opener. Missing kickoff time
  never becomes an invented exact countdown.
- Preserve saved routes: last Game and final Rankings remain reachable,
  including from More. Schedule opens Results for the completed season.
- S1 remains unchanged. S3 uses the existing Game hero and real round label.
  A won playoff round awaiting its next opponent remains postseason.
- S5 reuses the existing upcoming-game card with the confirmed next-season
  opener. Do not ship the preview's S4 card as a substitute for that behavior.

## Acceptance before production integration

David reviews the concrete S2/S4 preview. Then Codex implements with Claude's
normalized state. Test ND and OSU, both styles, 320/375/390/768/1280, missing
rank/score, no postseason, a playoff win awaiting the next round, a loss,
champion, unknown kickoff, successful empty next season, failed/recovered
next season, old-season cache and January rollover. Preserve source freshness,
focus, offline behavior and deep links. A preview is not completion of W16.

The build target remains mid-November. January provider verification remains
a dated follow-up, not a reason to postpone fixture-based implementation.
