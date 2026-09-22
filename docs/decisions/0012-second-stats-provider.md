# Decision: a second provider, reached by the Action rather than the browser

## Status

**Proposed** — blocked on two things, both named below. Not to be implemented until
both clear.

## Date

2026-09-21

## Decision

Matchup data that is **not time-sensitive** may come from a second provider,
fetched **server-side by the GitHub Action** and committed as a team snapshot,
rather than fetched by the browser.

The first such provider is **CollegeFootballData.com (CFBD)**, for the
opponent-facing figures ESPN does not carry: rushing defense, passing defense,
total defense.

```text
GitHub Action (cron)  ->  CFBD  ->  a derived stats snapshot in the repo
                                             |
                    TEAM_CONFIG.snapshots.stats declares it
                                             v
                          TeamOS.snapshots  ->  TeamOS.cfbd  ->  SeasonStat[]
                                             v
                                      the matchup card

browser  ->  ESPN  ->  everything that has to be current
```

This is a **boundary decision, not just a provider choice**. Two paths into the
app now exist and they are chosen by *how fresh the data has to be*:

| | Browser path (ESPN) | Action path (CFBD) |
|---|---|---|
| Freshness | seconds | days |
| CORS | must be permitted | irrelevant, server-side |
| API key | impossible, it would ship | GitHub Secrets |
| Rate limit | per user, per device | ~15–20 calls a month, total |
| Failure mode | the surface degrades live | the snapshot goes stale, and says so |

## Context

- **FACT.** ESPN's college-football team statistics endpoint carries no
  opponent-facing data. `defensive.pointsAllowed` and `defensive.yardsAllowed`
  are published as a permanent `0` ranked `Tied-1st`, and there is no opponent
  split — `.../teams/87/statistics/1` returns
  `{"error":{"message":"No stats found.","code":404}}` (decision 0011).
- **FACT.** Points allowed was recoverable by derivation because a final score
  is on the schedule. **Yards allowed is not**: it needs a box score per game
  per team, and the opponent's finals are not in the device cache because
  `gameById` only knows `S.games`. By November that is ten-plus requests to
  paint one pregame card.
- **FACT.** The repository already has a server-side ingestion path. The
  Action commits `depth.json`, `news.json` and the odds snapshots; decision 0008
  made a team's snapshots a declaration in its config, and a team declaring none
  gets an honest unavailable state rather than another team's data.
- **ASSUMPTION.** CFBD carries opponent versions of its team season stat fields,
  plus an advanced endpoint (success rate, explosiveness, PPA, havoc rate). Free
  tier is 1,000 calls per calendar month. **Not verified against the live API** —
  see Blockers.
- **ASSUMPTION.** CFBD's terms permit commercial use but prohibit redistributing
  data without explicit permission. **See Blockers.**

## Options Considered

### Derive yards allowed from box scores, as points allowed was derived

Keeps the app on one provider. Rejected on cost, not principle: one summary
fetch per completed game per team, uncacheable for the opponent, growing all
season. If box scores ever become cheap this reopens.

### Fetch CFBD from the browser

Impossible as stated: an API key in client JavaScript is a published API key,
and CORS would have to be permitted for a site we do not control. A relay would
be needed, which is a backend — and `CLAUDE.md` says not to add one for
architectural convenience.

### Scrape a stats site

Rejected. Fragile, and hostile to the terms of every site worth scraping.

### A licensed commercial feed (SportsDataIO, Sportradar)

The right answer eventually and the wrong one now: real pricing for a product
with no revenue (decision 0002).

### Action-fetched CFBD snapshot (chosen)

The fetch happens where a key is safe and CORS does not exist, on a cadence that
matches how fast the data actually changes, through a snapshot boundary the
architecture already has.

## Rationale

The instinct to treat "where data comes from" as one question was wrong. ESPN is
the right provider for anything a fan watches change; it is simply not a source
of opponent statistics. Splitting the paths by *freshness requirement* rather
than by provider is what makes the second source cheap — a key becomes storable,
a rate limit becomes irrelevant, and a slow provider becomes acceptable.

Keeping it behind `TeamOS.snapshots` means the second team question is already
answered: Ohio State declares no `stats` snapshot, the defensive rows are
unavailable for it, and nothing in the Suite branches on a team.

## Blockers

Neither is an engineering problem. **Do not implement until both clear.**

1. **Licensing.** Committing a derived file into a public repo served by GitHub
   Pages is plausibly redistribution. Asked directly, 2026-09-21, to
   `admin@collegefootballdata.com`: whether an Action-written derived snapshot
   in a public repo is acceptable, and what attribution they want. The mail also
   discloses that Project LND intends to become a business eventually, so a
   permission granted here is not later mischaracterised. **Awaiting reply.**
2. **Verification.** No egress to CFBD from the environment this was researched
   in; every claim about its fields comes from web-search summaries of
   third-party documentation, not from a response body. One real
   `/stats/season?year=2026&team=Notre%20Dame` response must be read before any
   row is designed against it. Decision 0011 exists because a field that was
   published and always zero was nearly mapped; the same mistake is available
   here.

## Consequences

*(if it proceeds)*

- `teamos/cfbd.js` (new), a sibling of `teamos/espn.js`: pure, no fetch, provider
  shapes in and `SeasonStat[]` out.
- The team config gains `snapshots.stats`. A team without a CFBD mapping declares
  none and its defensive rows read unavailable — the Phase 5B behaviour, unchanged.
- A new Action job and an `CFBD_API_KEY` repository secret. The Action commits a
  **derived** file, not the raw payload: smaller, and a narrower licensing
  question.
- The card gains rushing and passing defense. It is capped at nine rows
  (2026-09-21, David), so two come out. Recommended: **Yards per play** and
  **Tackles for loss** — real prevention beats proxy disruption.
- A second provider means a second staleness story. The snapshot needs a
  generated-at stamp and the card needs to say when the figures are from, the way
  the footer already says when data is cached.
- **The architecture rule that follows from this:** a new provider is reached by
  the Action unless the data must be current. Adding a browser-side provider now
  needs a reason.
- **OPEN QUESTION.** CFBD's advanced stats (success rate, explosiveness, PPA,
  havoc) are better matchup predictors than raw yardage and arrive on the same
  fetch. Deliberately out of scope until the basic rows work and a fan has been
  asked whether they want them; a nine-row cap is a product constraint, not an
  oversight.

## Owner

David (product, and the licensing question) / Claude Code (research, and the
implementation when unblocked)

## Related Documents

- `docs/decisions/0011-derived-season-figures.md` — why the card is nine rows and
  what ESPN does not answer
- `docs/decisions/0008-snapshots-are-owned-by-declaration.md` — the boundary this
  rides on
- `docs/decisions/0002-free-fan-experience.md` — the revenue position disclosed
  to CFBD
- `docs/engineering/second-stats-provider-handoff.md` — the implementation plan
