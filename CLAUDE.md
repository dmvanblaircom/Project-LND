# Project LND

## Identity

- Project LND = Leave No Doubt. This is the overall product vision.
- TeamOS = the platform/domain intelligence layer. Think of it as the brains.
- Suite = the fan-facing experience. Think of it as the destination.
- Irish Watch = the first team-specific implementation and proof of concept.

## North Star

Build a platform where the team is the center of the experience. A fan should be able to select a team and receive a complete, team-specific destination without a separate codebase for every team.

Core principle: **Notre Dame is data, not code.**

The critical architecture test is:
- Notre Dame configuration -> Irish Watch
- Ohio State configuration -> an Ohio State Suite

If adding Ohio State requires copying the application or scattering team conditionals throughout the code, the architecture boundary is wrong.

Parity is the floor, not the goal (decision 0038). Every team first gets every capability its sources allow. After that, each Suite should become as distinctive as the fandom it serves: its traditions, rivalries, voices and rhythms. That uniqueness comes from the team's data and declared capabilities, never from conditionals in the code.

## Current State

Irish Watch is a vanilla HTML/CSS/JavaScript PWA using browser APIs, ESPN data, local JSON snapshots, GitHub Actions, Kalshi data, RSS/news sources, a service worker, responsive UI, accessibility features, and automated checks. It now runs as Suite on TeamOS: one codebase, the team chosen at runtime from `teams/<team>.js`, with a small edge API (Cloudflare Worker, decision 0030) for keyed data. The as-built map is `docs/engineering/current-architecture.md`.

The existing app is a strong foundation. Do not rewrite it from scratch.

## How to Work in This Repository

Before making architectural changes:
1. Read this file and the Project LND docs.
2. Read `docs/09_AI_OPERATING_SYSTEM.md` for the collaboration model.
3. Inspect the current data flow and identify where external provider schemas enter the application.
4. Identify Notre Dame-specific assumptions.
5. Separate reusable domain behavior from TeamOS concerns and Suite concerns.
6. Preserve existing behavior unless the task explicitly changes product behavior.

For meaningful feature work:
1. Read the approved product brief in `docs/product/`.
2. Read the engineering handoff in `docs/engineering/` when one exists.
3. Inspect before editing.
4. Implement the smallest safe change.
5. Run relevant checks.
6. Report changes, validation, risks, and unresolved decisions.

If implementation requires a product decision, materially expands scope, or conflicts with an established architecture decision, stop and ask rather than guessing.

Run the existing checks after changes:
- `node tools/run-checks.js --base origin/main` runs what the branch's change needs, the same selection a pull request gets (`tools/select-checks.js`; every check is listed in `tools/checks.json`). `--all` runs everything. Locally, point Playwright at a browser with `PW_CHROMIUM`.
- a new check goes in `tools/checks.json`, never straight into `check.yml`; `tools/selectcheck.js` fails when a check script is left out
- a change to any shell file (the page, its scripts and styles, team configs, icons) needs a new `VERSION` in `sw.js`; `versioncheck` runs on every pull request against its base

## Architecture Rules

1. Team identity and team-specific behavior belong in configuration/data whenever possible.
2. Do not hard-code team-specific UI behavior into generic Suite components.
3. External provider schemas should be hidden behind adapters/normalization boundaries.
4. TeamOS owns normalized sports-domain data and team intelligence.
5. Suite consumes normalized TeamOS data and owns the fan experience.
6. Sport-specific differences should use capabilities, configuration, or adapters rather than duplicated applications.
7. Do not create separate codebases for individual teams.
8. Prove the Notre Dame -> Ohio State use case before broadening to every sport.
9. Do not introduce infrastructure merely because it might be useful later.
10. Preserve the existing PWA, offline behavior, accessibility, and responsive experience.
11. Do not remove working features during architectural refactoring.
12. Do not put provider-specific parsing directly into Suite rendering logic.

## Avoid Premature Complexity

Do not introduce React, Next.js, a database, microservices, authentication, or a dedicated backend solely for architectural purity. Introduce them only when a concrete product requirement makes them necessary.

The initial TeamOS can be a domain layer inside the existing application/repository. The goal is to establish clean boundaries first, not to create infrastructure for its own sake.

## Collaboration Boundaries

The creative/engineering partnership for the Suite visual redesign is governed by [decision 0040](docs/decisions/0040-suite-creative-direction-and-design-partnership.md). The approved design brief is [Suite visual redesign](docs/product/suite-visual-redesign.md).

### David

David is the Product Owner and final decision maker for product direction, scope, and meaningful architecture tradeoffs.

### ChatGPT

ChatGPT is Suite's Creative Director and Design Authority under decision 0040. It leads creative direction, UX, screen composition, visual system, typography, color, imagery direction, motion concepts, implementation-ready design briefs and visual review. It does not modify production code or silently expand engineering scope. It specifies approved outcomes and design constraints, not routine implementation choices.

### Claude Code

Claude Code is the Lead Engineer and Implementation Owner. It owns repository inspection, technical planning, production implementation, refactoring, testing, debugging, performance, accessibility, responsive behavior, technical documentation and delivery, including `app.js`, `app.css` and `suite/`. It implements approved designs within the existing architecture and has autonomy over routine engineering decisions inside approved design boundaries. It must surface technical constraints, material tradeoffs or proposed visual departures before proceeding. Decision 0040 supersedes the design-ownership portion of decision 0035; other provisions of 0035 remain in force.

### Codex

Consulted ad hoc by David for design questions (decision 0035). Nothing waits on Codex.

The repository is the shared source of truth. Decisions that matter after the current conversation belong in the repository rather than only in chat history.

## Branch Strategy

From the Suite release (2026-09-27), per David's decision of 2026-09-25:

- `main` = the product. Every piece of work gets a short branch and a pull request into `main`; the PR's checks are the gate.
- Who merges (decision 0039, David, 2026-11-06): Claude merges on its own once CI is green, there is no conflict and no reviewer finding is open, for bug and data-source fixes, check fixes, monitoring and the refresh's plumbing, and building what David has already approved. David's "merge N" is still needed for product briefs and decisions (and amendments to them), a new design or visual direction, anything with money, keys or new paid services, and anything that removes a fan-facing feature. When unclear, it waits for David. Every merge is reported to him.
- `project-lnd-platform` and `project-lnd-foundation`, and the other old branches David chose to keep, stay as they are (`docs/engineering/branch-cleanup.md`); GitHub deletes a merged PR's branch automatically. Other stale branches are deleted by David from the list in `docs/engineering/backlog.md` §7.

The open backlog, decisions and roadmap live in `docs/engineering/backlog.md`.

## Current Objective

Establish the boundaries that allow Irish Watch to become the first Suite built on TeamOS without breaking the working product.

The eventual architecture is:

External Sources -> Adapters/Ingestion -> TeamOS -> Normalized Domain Model -> Suite -> Fan

## Product Language

Use these names consistently:
- Project LND
- TeamOS
- Suite
- Irish Watch

Do not rename these concepts casually. Project LND is the canonical project name.
