# Project LND Build Plan

This document is the **architecture and platform roadmap**. It is intentionally separate from the consumer MVP and validation roadmap in `docs/product/mvp-validation-framework.md`.

## Phase 0: Understand

- Read the existing application end to end.
- Map data flow.
- Identify Notre Dame-specific assumptions.
- Identify reusable UI/application logic.
- Identify provider-specific logic.
- Preserve the working Irish Watch product as the baseline.

## Phase 1: Establish the First TeamOS Boundary

Create the first clear separation between team-specific identity/configuration and generic application/platform behavior.

### Milestone 1A: Extract Notre Dame Team Identity / Configuration

- Introduce a dedicated Notre Dame team configuration.
- Move appropriate team identity and external identifiers out of generic application logic.
- Have the existing Irish Watch experience consume that configuration.
- Preserve existing product behavior, PWA/offline behavior, accessibility, responsive behavior, and integrations.
- Do not attempt to complete TeamOS or build a speculative multi-team runtime in this milestone.

`TEAM_CONFIG` / team configuration is an initial configuration mechanism, not TeamOS itself.

## Phase 2: Establish Team Model

Create the smallest useful TeamOS model and validate it against Notre Dame.

The Team model should distinguish reusable team/domain concepts from simple configuration values and provide a foundation for future team implementations without prematurely modeling every possible capability.

## Phase 3: Establish Normalized Data

Move at least one major external data path behind an adapter/domain boundary.

A good first candidate is schedule/game data.

Provider-specific schemas and behavior should remain outside Suite.

## Phase 4: Rebuild Suite on TeamOS Abstractions

Irish Watch should consume the new TeamOS/team model and normalized data without changing the user's core experience.

This phase establishes the intended relationship:

```text
External Sources
      ↓
    TeamOS
      ↓
Normalized Domain Model
      ↓
    Suite
      ↓
Irish Watch
```

Status: **complete for ESPN** as of 4C. Milestones 4A (league view: `LeagueGame`, `Poll`), 4B (Game Center: `GameDetail`, `SeasonStat`) and 4C (news: `NewsItem`) moved every ESPN payload the Suite consumes behind `teamos/espn.js`; `app.js` no longer carries an ESPN URL, id or key name. A 4D milestone for the two remaining small providers — Kalshi odds (`Market`) and the Open-Meteo forecast (`Forecast`) — is defined but deferred until a concrete product or architectural reason calls for it.

## Phase 5: Add Ohio State

Add Ohio State using configuration and the same Suite/application code.

This is the most important architectural proof point: determine whether the abstractions genuinely generalize without copying the application.

Status: **5A run on 2026-09-18** — `teams/ohio-state.js` plus a one-line script swap rendered every ESPN-fed surface correctly with no application change; what leaked through was Notre Dame *data* the Action writes (depth chart, odds history, beat feeds) and the Notre Dame identity layer. Findings and the proposed 5B in `docs/engineering/phase-5a-ohio-state-proof.md`.

**5B implemented 2026-09-18** — the three data leaks are closed: the team config declares which Action-written snapshots the team has (`snapshots`), `teamos/snapshots.js` answers the capability and ownership questions, and the Depth, odds and News surfaces show an intentional unavailable state for a team that declares none. Notre Dame renders byte-identically. What remains for a second team is identity (Phase 6), team selection and the service worker (Phase 7), and an Action that produces snapshots for it. `docs/engineering/phase-5b-data-ownership.md`, `docs/decisions/0008-snapshots-are-owned-by-declaration.md`.

Use the second-team implementation to identify what belongs in TeamOS, what belongs in Suite, and what was unnecessarily abstracted.

## Phase 6: Extract Team Identity / Theme

Once the team model works, make branding and identity team-driven instead of hard-coded Notre Dame styling.

Status: **complete 2026-09-18.** A sixth config section, `identity`, and one TeamOS
module now carry the product name, head copy, colours, type and artwork; `paintIdentity()`
applies them in one place and `app.css` holds team values only as `--t-*` tokens. The
same Suite rendered **Buckeye Watch** — Ohio State's name, palette, type and copy, with
intentional empty states where it has no depth chart, no odds history, no beat feed and
no artwork — from a config swap alone, with 846 text elements passing WCAG AA and no
Notre Dame in the page. Notre Dame is unchanged but for nine sub-perceptual colour
values. `docs/engineering/phase-6-team-identity.md`,
`docs/decisions/0009-identity-is-team-data.md`.

## Phase 7: Team Selection

Allow a user to select a team and instantiate the corresponding Suite.

**7A complete 2026-09-21.** The team is chosen at runtime, not by which file the
markup names. A boot script in `index.html` resolves the team from `?team=`,
then the last choice this browser made, then the default, stores it, replays
that team's colours before anything loads, and injects the config, TeamOS and
`app.js` in order. `app.css`'s `:root` is now team-neutral, so a page that has
not yet learned its team paints nobody's colours rather than the default team's.
`buckeye.html` is retired: Ohio State is `/?team=ohio-state` on the same page.
`tools/bootcheck.js` covers the selection, the replay, the cross-team isolation
and the load order. `docs/decisions/0013-the-page-chooses-its-team.md`.

**7B complete 2026-09-21.** The worker precaches only the half of the shell that
belongs to no team; the page posts this team's config, artwork, manifest and
declared snapshots, and the worker caches those and records whose they are.
Switching teams deletes exactly the previous team's declared files - by name, so
league-wide data nobody owns survives. It also caches the icons the team's
manifest names. Verified Notre Dame -> Ohio State -> Notre Dame, online and
offline, with no contamination either way.
`docs/decisions/0015-the-worker-is-told-its-team.md`.

Alongside it, `teams/index.js` became the canonical registry: a program is
selectable because it names a config, and there is no second list.
`docs/decisions/0014-one-registry.md`.

A first visit to a team while offline still cannot work - those files have never
been fetched. Once a team has been opened online it works offline, and switching
between opened teams works offline.

**7C complete 2026-09-22.** A fan who arrives having asked for nobody in
particular has not chosen a team, and the Suite no longer chooses for them:
`chooser.js` renders from the registry, `app.js` is not loaded at all, and
picking a team navigates to `?team=<id>`. Selectable means a config exists;
everything else is listed greyed as *Not yet*. The page paints in the neutral
`:root`. `docs/decisions/0016-no-team-yet-is-a-state.md`.

**Phase 7 is complete.** The team is chosen at runtime (7A), cached per team
offline (7B), and picked by the fan (7C).

Carried forward, none of it blocking:
- There is no way to change teams from inside a Suite — a switcher is the
  obvious next thing.
- The registry is generated weekly by the Action from the FBS scoreboard
  joined to the roster payload (decision 0017). It holds four programs until
  that first runs, then converges. `conference` is still unsourced.
- No conference data beyond the four hand-authored rows.
- A first visit to a team while offline still cannot work.

## Phase 8: My Teams

Support multiple followed teams and personalized cross-team experiences.

## Phase 9: Expand Sports

Validate the domain model against additional sports and leagues. Add sport-specific capabilities only where needed.

## Data Sources

Irish Watch reaches providers two ways, chosen by **how fresh the data has to
be**, not by who publishes it (decision 0012):

- **Browser -> provider**, for anything a fan watches change: ESPN scores,
  schedule, scoreboard, summary, news. No key possible, CORS must be permitted,
  rate limits land per device.
- **Action -> provider -> a committed snapshot**, for anything that changes over
  days: the odds history, the depth chart, beat news, and — proposed — opponent
  statistics from CollegeFootballData.com. A key is safe in repository secrets,
  CORS does not apply, and the cost is a handful of calls a week.

A new provider takes the Action path unless the data must be current. Snapshots
are owned by declaration (decision 0008), so a team without a source for a kind
declares none and the Suite shows that kind as unavailable.

## Parallel Product Track

Platform architecture does not determine consumer scope by itself. Product work should run in parallel:

1. Define the target fan and problem.
2. Map the fan experience across game day and between games.
3. Define the Suite product blueprint.
4. Define the consumer MVP.
5. Test the first validation hypothesis.
6. Use evidence to determine what should be built next.

The architecture roadmap should support validated product needs rather than becoming an end in itself.

## Definition of Done

The foundation work is complete when:

1. Irish Watch continues to work.
2. Notre Dame configuration is separated from generic behavior.
3. A normalized TeamOS model exists.
4. At least one major external data path is behind a domain/provider boundary.
5. Suite consumes normalized data.
6. Ohio State can be added without copying the application.
7. Existing checks pass.
8. PWA/offline behavior remains intact.
9. Accessibility and responsive behavior remain intact.
10. Product decisions that affect architecture are documented in the product/decision records.

## Guardrails

- Do not rewrite everything.
- Do not introduce a framework without a concrete need.
- Do not add a backend prematurely.
- Do not build every sport at once.
- Do not create abstractions without a second use case.
- Do not break working features for architectural purity.
- Do not put provider-specific logic in Suite.
- Do not build speculative platform capabilities before a fan need or second use case justifies them.
- Keep `main` stable and Irish Watch-focused.
