# Project LND

**Leave No Doubt**

Project LND is a sports fan experience platform built around a simple idea: make following a team feel less fragmented, more personal, and easier to return to every day.

The project has three layers:

- **TeamOS** — the platform and operating layer that powers team-specific experiences.
- **Suite** — the fan-facing experience layer.
- **Irish Watch** — the first team-specific implementation and product laboratory: Notre Dame's configuration of Suite.

## Product thesis

A passionate sports fan should not have to piece together their relationship with a team across a dozen disconnected places.

**Suite helps fans stay connected to their team without having to piece their fandom together across a dozen different places.**

Phase 1 is intentionally focused on earning the fan rather than monetizing the fan.

> **We don't monetize the fan first. We earn the fan first.**

## What this repository is

This repository is the working product repository for Project LND. It contains Suite - one codebase that renders any configured team (Notre Dame and Ohio State today) - plus the durable product, architecture and decision documentation behind it.

It is not intended to contain the entire LND business plan, financial model, legal work, or every research artifact. Those remain in the LND business workspace and are summarized here when they directly affect product decisions.

## Current status

**Stage:** Early product validation / platform formation

Suite is live at <https://dmvanblaircom.github.io/Project-LND/>: a vanilla HTML/CSS/JavaScript PWA on GitHub Pages. A fan picks a team and gets that team's Suite; Notre Dame (Irish Watch, the first laboratory) and Ohio State are team configurations, not copies of the app. The existing PWA, offline behavior, accessibility and responsive foundation are preserved as the product generalizes.

For how it is built today, read `docs/engineering/current-architecture.md`. For what is open, `docs/engineering/backlog.md`.

## Repository map

```text
Project-LND/
├── README.md, CLAUDE.md      # this file; how to work in the repository
├── index.html                # the page shell and its boot script (picks the team)
├── app.js, app.css           # the controller and the one stylesheet
├── chooser.js                # the team chooser (no team chosen yet)
├── sw.js, manifest.json      # offline service worker; the installed app
├── teams/                    # one configuration per team, plus the program registry
├── teamos/                   # TeamOS: pure domain rules and provider adapters
├── suite/                    # Suite: the screens, navigation and shared UI pieces
├── data/                     # snapshots the GitHub Actions write (per team, and league-wide)
├── worker/                   # Suite's edge API (Cloudflare Worker)
├── tools/                    # checks, producers, fixtures, probes
├── assets/                   # Suite's icons and artwork
├── .github/workflows/        # checks, data refresh, deploy verification
└── docs/
    ├── 00-09_*.md            # North Star, architecture, domain model, TeamOS, Suite, data, plan
    ├── strategy/  product/   # product thesis, briefs and proposals
    ├── design/               # visual system and design reviews
    ├── engineering/          # as-built architecture, backlog, runbooks, logs
    ├── decisions/            # decision records
    └── templates/            # brief, handoff, decision and review templates
```

## Core architecture

```text
PROJECT LND
    │
    ├── TeamOS
    │   Platform / brains
    │
    └── Suite
        Fan experience
            │
            ├── Irish Watch
            └── Future team experiences
```

TeamOS asks: **What does the platform need to make this possible?**

Suite asks: **What does the fan need?**

## Documentation principles

Documentation should distinguish between:

- **FACT** — supported by research, code, or product data.
- **ASSUMPTION** — believed to be true but not yet validated.
- **HYPOTHESIS** — an assumption being explicitly tested.
- **DECISION** — a chosen direction that the product is being built around.
- **OPEN QUESTION** — unresolved and intentionally left open.

Product and architecture changes should update the relevant documentation when they change a durable assumption, user flow, system responsibility, or product decision.

## First validation hypothesis

> **H1:** Passionate college sports fans will repeatedly use a free, team-specific digital experience if it makes following their team more convenient, relevant, and engaging than the fragmented alternatives they currently use.

The first validation dimensions are acquisition, activation, retention, engagement, advocacy, and expansion to additional teams.

## Product principles

1. **Fan first.** Build around the fan's relationship with the team.
2. **Fast.** The experience should feel immediate, especially on game day.
3. **Clean.** Reduce noise and unnecessary complexity.
4. **Accurate.** Scores, schedules, stats, and other core information are product requirements.
5. **Useful.** Every major surface should help the fan follow, understand, or participate.
6. **Personal.** The experience should become more relevant as the fan uses it.
7. **Platform-minded.** Irish Watch should prove concepts that can eventually work for many teams.
8. **Earn before monetizing.** Phase 1 consumer access is intentionally free by design.

## Next product work

The Fan Experience Blueprint is written (`docs/product/suite-product-blueprint.md`, with `fan-journey.md` and `fan-experience-journey.md`). What is being built next, and what waits on a decision, is kept in `docs/engineering/backlog.md`.

## Getting started

Serve the repository root over HTTP (a service worker needs it) and open the page, for example `python3 -m http.server` then `http://localhost:8000/?team=notre-dame`. `?team=ohio-state` opens the other configured team; no `?team=` opens the chooser.

Before pushing a change, run the checks a pull request runs (`.github/workflows/check.yml`); the minimum is:

```sh
node --check app.js
node --check sw.js
python3 tools/csscheck.py app.css
```

The browser checks (`tools/visualcheck.js` and the other Playwright checks) need `npm install` for Playwright. Every change goes to `main` through a short branch and a pull request; see CLAUDE.md for the branch strategy and `docs/09_AI_OPERATING_SYSTEM.md` for the collaboration model.

See the `docs/` directory for product and architecture documentation before making changes that affect the broader LND platform.
