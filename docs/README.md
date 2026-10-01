# Project LND Documentation

This directory contains the durable product and technical knowledge for Project LND.

The root `README.md` is the front door to the repository. These documents go deeper and should be updated when durable product or architecture decisions change.

## Structure

| Where | Purpose |
|---|---|
| `00_PROJECT_LND_NORTH_STAR.md` - `09_AI_OPERATING_SYSTEM.md` | The core set: North Star, the pre-refactor baseline (01, historical), target architecture, domain model, team configuration, TeamOS, Suite, data architecture, build plan, collaboration model |
| `strategy/` | Product thesis and strategic direction |
| `product/` | Fan experience, MVP and validation, product briefs and proposals |
| `design/` | The Suite visual system and design reviews |
| `engineering/` | How it is built today (`current-architecture.md`), the open backlog (`backlog.md`), Codex's review queue, runbooks, handoffs and dated logs |
| `decisions/` | Durable decisions and their rationale, numbered; a later decision says which earlier one it supersedes |
| `templates/` | Product brief, engineering handoff, decision and review record templates |

Dated logs, handoffs and decision records are records of their time and are not rewritten; the numbered core documents, `current-architecture.md` and `backlog.md` describe the present.

## Documentation status labels

Use these labels inside documents where useful:

- **FACT** — supported by research, code, or product data.
- **ASSUMPTION** — believed to be true but not yet validated.
- **HYPOTHESIS** — an assumption being explicitly tested.
- **DECISION** — a chosen direction the product is being built around.
- **OPEN QUESTION** — unresolved and intentionally left open.

## Working rule

The repository should be the source of truth for durable product and technical decisions that affect the software. Chat can be used to explore ideas, but decisions worth building around should eventually be captured here.

When a change materially affects product behavior, architecture, system responsibilities, user flows, or a durable assumption, update the relevant documentation in the same workstream.
