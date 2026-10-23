# Decision: Claude Code is the main developer and designer

## Status

Accepted. Supersedes the implementation split of 2026-09-28 (Codex: production
UI, presentation and motion; Claude Code: data, behavior and reliability) and
the October 12-14 temporary assignment in `docs/09_AI_OPERATING_SYSTEM.md`.

## Date

2026-10-23

## Decision

- Claude Code owns all implementation from here: data, services, behavior,
  production UI, presentation, motion and the checks under them, including
  `app.js`, `app.css` and the shared `suite/` modules.
- Claude Code also does the design work, inside the design already
  established. No new visual language, no restyle and no new component
  family without David's say-so. The established design is:
  - decision 0022 (Suite v1 product behavior) and 0024 (the canonical Suite
    design and its edge-case policies), with the decisions that amend them
    (0026 App Style, 0028 secondary destinations, 0031 one header, 0034 the
    Settings gear and later ones);
  - the screens as built on `main`: `app.css` tokens and `suite/*.js`
    components are the reference for anything new;
  - the screen contracts in `docs/design/`, such as the offseason UI contract
    (`offseason-ui-contract-2026-10-12.md`).
- Codex is consulted ad hoc, by David, for design questions. Nothing waits
  on Codex, and no work is held for a Codex review. A Codex review that does
  arrive on a pull request is handled like any review.
- Unchanged: David is Product Owner and final decision maker. Every change
  goes through a short branch and a pull request with its checks, concrete
  visual evidence for anything a fan sees, and David's merge approval.
  Product decisions and anything that changes the design's direction are
  still David's.

## Context

David, 2026-10-23: "I also want you to hand everything now. No codex. I
downgraded my ChatGPT subscription because of costs and I'll still engage
codex from time to time for design stuff, but it will be much more infrequent
and at an ad hoc basis. So think of yourself as the main developer and
designer and stick with the already established design parameters. I think we
have a good enough design [system] and as long as we stick within, that will
be good."

## Consequences

- Open Codex work is Claude's to finish: #161 (the S2/S4 offseason Home and
  seasonal navigation on current main). David approved the S2/S4 screens the
  same day, as the offseason UI contract requires before integration.
- `docs/engineering/codex-review-queue.md` is historical; its open items are
  in the backlog under Claude.
- The backlog's ownership columns name Claude for the work Codex held.
