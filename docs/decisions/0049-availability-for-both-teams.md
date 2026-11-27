# 0049: Availability covers both teams in the next game

**Status:** Decided by David, 2026-11-27 ("Both-teams availability"). It meets the brief's §4.5 and the approved spec's Quick Actions line: "Availability covers both teams in the selected team's next game."

## Context

Home's Availability action opened our own team's official report only. Stage 2 recorded this as a known gap (`docs/design/review/2026-11-20-stage2/README.md` §10). The opponent's report was already in the repository: the pipeline writes every program's to `data/<id>/availability.json` (117 of 138 today).

What blocked it was ownership. Decision 0008 makes a snapshot a team's own by its config's declaration, and the page loads one config, ours.

## Decision

- **Roster → Availability shows both teams.**
  - A switch at the top reads, for example, ND | MSU.
  - Ours is at `#roster/availability`, the opponent's at `#roster/availability/them`.
  - The opponent is this week's, the same game-week rule Matchup and Stats use.
- **The opponent's report is read where every team's is written.** `TeamOS.snapshots.of(id, kind)` gives the path. No declaration vouches for the file, so it counts as theirs only when stamped with their id (`stampedFor`, stricter than `owned`). It is shown under their name, never as ours. Decision 0008 stands: a team never borrows another's file as its own.
- **Only this game's report is shown.**
  - The report's kickoff date must be within a day of the game (`TeamOS.roster.forGame`).
  - A report for another week reads "hasn't published its official availability report for this game yet".
  - An opponent with no report Suite reads says so. Nothing is inferred from silence (0019).
- **Home's Availability action** opens the in-app view whenever Suite reads either team's report. A team that reads neither keeps its conference's page, as before.

## Consequences

- `rostercheck` covers the lookup, the stamp rule, the same-game rule, the switch and each opponent state. It also checks that every availability file on record is stamped with its team.
- The opponent's file is fetched from the network. It is not precached, so offline its side says it didn't load.
- Opponents outside the registry (FCS) have no report, and their side says so.
