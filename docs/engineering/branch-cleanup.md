# Branch cleanup (backlog C12): for David's approval

Proposed 2026-09-25, to run **after** Sunday's merge. Nothing is deleted
until David approves this list. An *archive tag* keeps a branch's history
reachable forever (`archive/<name>`) while removing the branch.

The check behind each row: is the branch's tip already contained in `main`,
or in the release branch that merges Sunday? If so, deleting it loses nothing.

| Branch | Last commit | Contained in | Proposal |
|---|---|---|---|
| `main` | 2026-09-25 | - | **Keep**: the product |
| `design/suite-canonical-v1` | 2026-09-25 | merges Sunday | **Delete after the merge** (the merge commit keeps its history) |
| `project-lnd-platform` | 2026-09-24 | main | **Archive tag**, then delete (retired by the new branch model) |
| `project-lnd-foundation` | 2026-09-16 | main | **Archive tag**, then delete (the historical checkpoint CLAUDE.md named) |
| `design/suite-visual-system-v1` | 2026-09-22 | **not merged**: 3 early design docs (Visual System v1, its implementation handoff, vNext references) | **Archive tag**, then delete. The docs are superseded by the canonical design (decisions 0023/0024) and Brand System v1, but kept for history. |
| `lnd/phase-1-team-config` | 2026-09-17 | main | Delete |
| `lnd/phase-2-team-model` | 2026-09-17 | main | Delete |
| `lnd/phase-3-game-adapter` | 2026-09-17 | main | Delete |
| `lnd/phase-3b-roster-adapter` | 2026-09-17 | main | Delete |
| `lnd/phase-4a-league-view` | 2026-09-17 | main | Delete |
| `lnd/phase-4b-game-center` | 2026-09-18 | main | Delete |
| `lnd/phase-4c-news` | 2026-09-18 | main | Delete |
| `lnd/phase-5a-ohio-state-proof` | 2026-09-18 | main | Delete |
| `lnd/phase-5b-data-ownership` | 2026-09-18 | main | Delete |
| `lnd/phase-6-team-identity` | 2026-09-18 | main | Delete |
| `design/suite-vnext-build` | 2026-09-22 | main | Delete (the abandoned vNext build; its commits are already in `main`) |
| `codex/find-ui-issues-and-propose-fixes` | 2026-09-22 | main | Delete |
| `claude/lnd-implementation-status-owqyo9` | 2026-09-21 | main | Delete (an earlier session's branch) |
| `docs/suite-v1-behavior-record` | 2026-09-24 | main | Delete |
| `docs/suite-v1-behavior-record-2` | 2026-09-24 | main | Delete (a duplicate of the one above) |
| `noop-temp` | 2026-09-24 | main | Delete |
| `stage/*` (created 2026-09-25) | - | - | Staged post-launch work; each is deleted when its PR merges |

The result is `main` plus short-lived work branches, and 3 archive tags.
