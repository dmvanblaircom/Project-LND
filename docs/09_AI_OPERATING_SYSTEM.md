# Project LND AI Operating System

## Purpose

This document defines how David, ChatGPT, and Claude Code work together to build Project LND.

The goal is not to create a collection of autonomous agents. The goal is to create a disciplined product development loop in which each participant has a clear responsibility and the repository preserves the shared context.

## Team

### David — Product Owner

David owns the final product decisions.

Responsibilities:
- Define the product vision and desired outcomes
- Make product tradeoffs
- Resolve disagreements
- Approve meaningful scope changes
- Decide when a feature is ready to ship

David should not need to translate technical implementation details between agents. The repository and the artifacts below are the handoff mechanism.

### ChatGPT — Product, UX, and Architecture Partner

ChatGPT owns the product and design side of the working relationship.

Responsibilities:
- Product strategy
- User problems and outcomes
- Product requirements
- User experience and information architecture
- Design direction
- TeamOS/Suite architecture decisions
- Domain modeling
- Acceptance criteria
- Feature prioritization
- Reviewing implementation against product intent
- Identifying decisions that need David's approval

ChatGPT should not silently change engineering scope or dictate implementation details when multiple valid approaches exist.

ChatGPT owns UX, UI and visual QA, and does not modify production code (David, 2026-09-23, after the vNext release was withdrawn).

### Claude Code — Engineering Partner

Claude Code owns implementation inside the repository.

Responsibilities:
- Repository inspection
- Technical planning
- Implementation
- Refactoring
- Tests and validation
- Debugging
- Git branches and commits
- Technical documentation
- Identifying implementation risks and constraints

Claude Code should not silently make product decisions. When implementation exposes an unresolved product or architecture decision, Claude Code should document the issue and ask for direction.

## Shared Source of Truth

The GitHub repository is the shared memory of the team.

Use these artifacts:

- `CLAUDE.md` — permanent engineering and architecture guardrails
- `docs/00_PROJECT_LND_NORTH_STAR.md` — product vision
- `docs/01_CURRENT_IRISH_WATCH_ARCHITECTURE.md` — current-state architecture
- `docs/02_PROJECT_LND_ARCHITECTURE.md` — target architecture
- `docs/03_DOMAIN_MODEL.md` — domain concepts
- `docs/04_TEAM_CONFIG.md` — team configuration model
- `docs/05_TEAMOS.md` — TeamOS responsibilities
- `docs/06_SUITE.md` — Suite responsibilities
- `docs/07_DATA_ARCHITECTURE.md` — data flow
- `docs/08_BUILD_PLAN.md` — phased build plan
- `docs/09_AI_OPERATING_SYSTEM.md` — this collaboration model
- `docs/product/` — approved product briefs
- `docs/engineering/` — engineering implementation notes
- `docs/decisions/` — durable architecture/product decisions
- `docs/reviews/` — implementation review records when useful
- `docs/templates/` — reusable collaboration templates

If a decision matters after the current conversation, it belongs in the repository.

## Standard Development Loop

Every meaningful feature follows this loop:

```text
Idea
  ↓
Product discussion
  ↓
Product brief
  ↓
Architecture / UX review
  ↓
Engineering handoff
  ↓
Claude Code implementation
  ↓
Tests / validation
  ↓
Pull request or reviewable branch
  ↓
Product + architecture review
  ↓
Iteration if needed
  ↓
Approval by David
  ↓
Merge
```

## Phase 1: Product Definition

David and ChatGPT define:
- Problem
- Desired user outcome
- Scope
- Requirements
- UX expectations
- Acceptance criteria
- Explicit non-goals

The result is a product brief in `docs/product/`.

Do not begin substantial implementation until the brief is clear enough to evaluate the result.

## Phase 2: Engineering Handoff

The product brief is translated into an engineering handoff.

The handoff should tell Claude Code:
- What to build
- Which existing behavior must remain unchanged
- Which files or areas are likely relevant
- Architectural constraints
- Acceptance criteria
- Tests to run
- What is explicitly out of scope

The handoff should describe the desired outcome, not prescribe every line of code.

## Phase 3: Engineering

Claude Code should:
1. Read `CLAUDE.md` and the relevant Project LND docs.
2. Read the product brief and engineering handoff.
3. Inspect the existing implementation before editing.
4. State its implementation plan when the change is meaningful.
5. Implement the smallest safe change.
6. Run relevant checks.
7. Report files changed, behavior changed, tests run, and unresolved risks.

Claude Code should avoid unrelated cleanup during feature work.

## Phase 4: Review

Review is split into two questions.

### Product review

Does the implementation solve the intended user problem?

### Architecture review

Does the implementation move Project LND toward the intended architecture without creating unnecessary coupling or duplication?

A technically correct implementation can still fail product review.

A useful product feature can still fail architecture review.

### Visual review

A passing automated UI test is not visual approval. `tools/visualcheck.js` measures contrast, focus and layout in what the browser actually paints, and writes screenshots of every state. Those screenshots are evidence for a person (visual QA, then David) to judge. They are not the verdict (decision 0021).

## Decision Rules

### Product decisions

David has final authority.

### Architecture decisions

ChatGPT and Claude Code may propose and debate approaches. David approves decisions that materially affect product direction, scope, or long-term architecture.

### Implementation decisions

Claude Code may choose the implementation approach when it stays within the approved product and architecture boundaries.

### Ambiguity

When a decision materially affects product behavior, user experience, architecture, or future extensibility and the answer is not documented, stop and ask rather than guessing.

For low-risk implementation details, use the simplest approach consistent with the existing architecture.

## Branch Strategy

Current Project LND structure:

```text
main
  Stable Irish Watch product

project-lnd-platform
  Active Project LND platform development

project-lnd-foundation
  Architecture checkpoint / historical foundation branch
```

Feature work should normally branch from `project-lnd-platform` rather than `main`.

`main` must remain a stable Irish Watch experience until the platform is ready to replace or supersede it intentionally.

## Definition of Done

A feature is not done merely because the code runs.

A meaningful Project LND change is done when:
- Product requirements are satisfied
- Existing required behavior is preserved
- Relevant tests/checks pass
- Accessibility and responsive behavior are preserved where applicable
- PWA/offline behavior is preserved where applicable
- Team-specific logic remains configuration/domain data rather than scattered UI conditionals
- Provider-specific schemas remain behind appropriate boundaries
- Documentation is updated when the change creates durable knowledge
- David has approved the resulting product behavior

## What Agents Must Not Do

Neither agent should:
- Invent product requirements
- Expand scope without approval
- Replace working architecture with a preferred framework merely for style
- Introduce infrastructure without a concrete need
- Create separate applications for individual teams
- Hide important decisions inside chat history
- Claim a feature is complete without validation

## Collaboration Principle

The objective is not maximum autonomy.

The objective is maximum leverage while keeping product intent, architecture, and implementation aligned.

David decides what Project LND should become.

ChatGPT helps define what that means.

Claude Code turns it into working software.

The repository remembers the decisions.