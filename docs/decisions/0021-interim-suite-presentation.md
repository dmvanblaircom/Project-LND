# Decision: the Suite's interim presentation

## Status

Accepted

## Date

2026-09-23

## Decision

Product owner decisions (David), made after the 2026-09-23 recovery review of
the vNext release:

1. **Baseline look until the canonical screens are built.** The Suite runs the
   stylesheet from `e36b49c`. vNext's functional fixes stay; its presentation
   does not. The canonical Suite design is still to be built. It will replace
   this look as its own reviewed change, not a restyle layered on top.
2. **The Home Record / Ranking / Next tiles are dropped.** They repeated the
   header. They were also a second source of truth: the header said 2-0 while
   a tile said 1-0 on the same data.
3. **The fourth tab is "Roster"** (it was "Players", and "Depth" before that).
4. **One shared page background for every team, for now.** Team colour
   reaches the page through accents, never the page background.
   *Roadmap:* a fan setting to choose team-coloured page backgrounds instead
   of the shared default. Deferred because it is the most complex option, not
   because it was rejected.
5. **The fifth tab is "More".** It holds News, the team being followed with
   Change team, and Refresh. The header is the team, its rank and its record,
   on one line.
   - The header ••• menu wrapped onto its own line on Buckeye Watch.
   - Measured in the browser, name + rank + record + Refresh needs about
     450px. A phone offers 349-367px.
   - Refresh left the header. The app refreshes itself on return after 10
     minutes, every 30 minutes while open, and continuously in a live game,
     so Refresh is a backup rather than a primary action.

Data freshness, decided the same day, is decision 0020.

## Working model

Also set in the recovery (see `docs/09_AI_OPERATING_SYSTEM.md`):

- David decides.
- ChatGPT owns UX, UI and visual QA, and does not modify production code.
- Claude Code implements, tests and deploys, and surfaces gaps rather than
  inventing behaviour.
- **A passing automated UI test is not visual approval.** The visual gate
  (`tools/visualcheck.js`, `tools/a11yaudit.js`) measures contrast, focus and
  layout in what the browser actually paints. Screenshots are evidence for a
  person to judge; they are not the verdict.

## Consequences

- `docs/design/suite-visual-system-vnext.md`,
  `suite-vnext-reference-designs.md` and `suite-vnext-implementation-review.md`
  are historical. They describe a release that was withdrawn, and are kept as
  a record, not as a spec.
- `tools/visualcheck.js` enforces what these decisions make checkable:
  - the header stays on one line;
  - More names the team and shows Refresh and Change team;
  - News loads under More;
  - Change team clears the stored team and lands on the chooser.

## Related

- `docs/decisions/0019-depth-is-slots-availability-is-its-own.md`
- `docs/decisions/0020-data-freshness-and-isolated-sources.md`
