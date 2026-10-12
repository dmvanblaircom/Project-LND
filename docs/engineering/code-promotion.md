# Suite: Code Development and Promotion Standard

**Approved operating model:** DEV → Lab (QA/UAT) → Production.
**Current status:** implementation staged for infrastructure cutover. This
policy does not imply that Dev or Lab URLs/branches currently exist.

## The whole process

```text
Feature branch → PR + CI → dev → PROMOTE → lab → David UAT → PROMOTE → main
        │                    DEV                  QA/UAT             PROD
        └── private feature URL for early review (not an environment promotion)
```

| Stage | Who | Definition of done | Next action |
|---|---|---|---|
| Build in DEV | Codex or Claude | Feature branch from latest `dev`, focused PR into `dev`, automated tests green, real preview provided, feature acceptance checked | Merge into DEV (squash allowed only here) |
| DEV → LAB | Engineering | One stable DEV commit chosen; green CI; no active broken/unfinished features enabled | Run **Promote Suite code → lab**; never merge PRs into `lab` |
| LAB QA/UAT | David + engineering | Open private Lab on phone; validate required scenarios, team/style parity, failures, caching and real behavior; record pass or defect against exact SHA | Reject to DEV for fixes, or approve release |
| LAB → PROD | David authorizes; automation deploys | Lab deployment and smoke tests verified, QA sign-off recorded; no changes since review | Run **Promote Suite code → main**; never merge PRs into `main` |
| Production validation | Engineering | Live Pages deployment matches promoted SHA, health and PWA smoke pass | Record release and close story |

**One feature = one PR into `dev`. One release = one approved `lab` SHA
promoted unchanged to `main`.** This is a trunk-based, small-batch release
flow with staging, not three independently edited codebases.

## Five rules that prevent drift

1. **Forward-only ancestry:** `main` must be an ancestor of `lab`;
   `lab` must be an ancestor of `dev`. Production therefore cannot
   contain code missing from Lab; Lab cannot contain code missing from DEV.
2. **No direct changes to Lab or Production.** No direct commits, PR merges,
   squash, cherry-pick or manual hotfixes on `lab` or `main`.
   Promotion advances the exact SHA using a non-force fast-forward.
3. **No surprise releases:** no feature may be enabled in a Lab release
   candidate unless the team is prepared to ship it. Unfinished work lives
   on preview branches or is explicitly default-OFF through a tested runtime
   feature flag. Disablement and its dependencies are verified in Production.
4. **One approved candidate at a time:** stabilize Lab for UAT. If Lab
   changes after approval, retest. Production promotion advances exactly
   the current approved Lab head, never an arbitrary mix of changes.
5. **One audit trail:** record commit, tests, Lab URL/build, acceptance
   evidence, actor, Production deploy ID and smoke result. A merged PR is
   not proof the app was deployed.

DEV continues receiving new code while Lab is being tested, but a change
to DEV alone never modifies Lab or Production.

## Exact commands the workflow runs

The `.github/workflows/promote-suite.yml` Actions workflow is the single
promotion control, using `tools/promotion-gate.cjs`:

```shell
# Plan Dev → Lab:
SUITE_PROMOTION_ENABLED=true node tools/promotion-gate.cjs plan lab
# Plan Lab → Production:
SUITE_PROMOTION_ENABLED=true node tools/promotion-gate.cjs plan main
```

GitHub Actions pins the immutable source SHA and the prior target SHA,
waits for the named protected Environment approval, rechecks ancestry
and branch changes after that approval, and pushes without `--force`.
A stale target, divergent branches, invalid candidate or missing branch
fails the run, rather than automatically merging. Run the approved
workflow from Actions; do not run raw `git push` as a normal release.

The workflow is **fail-closed until**
`SUITE_PROMOTION_ENABLED=true` is configured after the cutover.
It does **not** yet verify external Cloudflare/GitHub Pages deployment:
those release jobs/checks must be connected and required as an additional
gate before making the promotion workflow live. Enforce restricted
branch-update credentials, GitHub branch rules and required Environment
reviewers. If the GitHub account's plan does not support those rules for
this repository visibility, use an appropriate alternative before
activating; do not treat a manually described rule as enforcement.

## QA acceptance card (one per candidate)

| Field | Required value |
|---|---|
| Candidate | Full SHA identical in DEV, Lab and Production |
| Functionality | Links/screens tested, team/style variants, failure/retry and recovery |
| Quality | CI green, no broken existing flow, mobile/PWA/accessibility checks |
| Decision | David: **Accepted for Production** or **Rejected to DEV** |
| Release | Production version, deploy result and post-release smoke |

A failed QA check: fix on a new feature/bug branch off `dev`, merge into
`dev`, promote a new exact SHA to `lab`, retest. No patching Lab.

Urgent production fix: same path, expedited approvals and focused QA.
Rollback of *code* means a revert commit created in DEV and then promoted
forward through Lab and Production. A platform-level emergency restore of
a previous artifact is incident handling and must be separately recorded;
it is not silent movement of `main` backwards.

## Environments and current blockers

- **Production:** current public GitHub Pages build on `main` (unchanged
  until cutover); **Lab:** private Cloudflare Pages `lab` environment
  (proposed); **DEV:** Cloudflare Pages `dev` preview, with feature PR
  previews as optional early interactive builds.
- Lab, DEV and feature previews need an isolated backend for anything
  writable or subscription-based. No test pushes to production subscribers.
- A fixture-based scenario switch for future seasons belongs only in
  non-production runtime configuration/data; it must never appear in the
  public fan experience.
- **Blocker 1 (critical):** `.github/workflows/odds.yml` currently writes
  sports-data snapshots directly to `main` every refresh, bypassing
  the code sequence. Move dynamic `data/**` publication into a separate
  content/data delivery pipeline while keeping existing app URLs functional.
  Code ancestry is strict; data freshness and fixture values are
  intentionally independent of the code release.
- **Blocker 2:** provision DEV/Lab branch URLs, Cloudflare Access (including
  the Lab project root), branch rules and a nonproduction API/Worker.
- **Blocker 3:** implement reproducible asset builds, attach deployed SHA
  and smoke tests to both promotions. A Lab green build must match exactly
  the source that Production receives, excluding externally supplied
  environment-specific settings. Never assume the hosting output is
  identical solely because two branches have matching SHAs.
- **Blocker 4:** retarget existing open work from `main` into the initial
  DEV backlog at cutover, preserving all PR and review history.

**Cutover sequence:** decouple snapshot writes → provision private URLs
and backend separation → initialize `dev` and `lab` from the same
approved `main` SHA → require rules and deployment checks → dry-run
promotion → set repository variable `SUITE_PROMOTION_ENABLED=true` →
start promotions. No production code freeze/branch split before these
are resolved and verified.

## Scrum cadence

Treat DEV as the active sprint integration lane. Each story states an
observable fan outcome, acceptance scenarios and preview link. Small PRs
are merged as soon as engineering definition of done is met. Lab receives
a candidate when it is releasable, not automatically at the end of a
calendar week. A single visible QA queue records **Ready for QA →
Testing → Accepted/Rejected → Released**; limit Lab to one unapproved
candidate so release scope cannot drift under testing.

There is no need for separate `release/*` branches, manual cherry-pick
lists or three independent boards.

See `docs/engineering/suite-lab-environments-proposal-2026-10-12.md`
for hosting and network boundaries. This file is the authoritative
*code promotion* contract and supersedes the earlier proposed
`feature → lab → main` shortcut.
