# 0047: Home and Game are dark on top, light in the body

**Status:** Decided by David, 2026-11-25.

## Context

Stage 2 (decision 0039, merged as #273) made Home and Game fully dark, to match the reference boards. On his phone David found two problems:

- **A semantic inversion.** The Matchup card's better side was highlighted with a faint gold tint, which on navy read duller than the neutral side, so the losing side looked highlighted (fixed in #278).
- **He was unsure about the dark theme overall.** A dark body also carries known costs: gold highlights turn muddy olive on navy, and dense content (stats, schedule, news) reads worse in sunlight, such as at a stadium.

## Decision

1. **Dark top.** The header, the photo stage on Home, Game's photo header and the bottom nav stay dark. The stadium photograph and the scoreboard keep the boards' look.
2. **Light body.** The cards below the stage (quick actions, news, schedule, Matchup, box score, plays, stats) use the everyday light page, as Around, Roster and More do.
3. **Polish while we're here.** Matchup's better side carries the team's accent as border and tint, and the other side a quiet outline, so the highlight cannot invert on any ground.

## Consequences

- The screen-wide dark tokens (`#screenHome,#screenGame`) are gone, along with the overrides that existed only to undo them.
- The stage and the Game header carry their own dark ground and roles; `herocontrastcheck` already measures them outside any dark scope.
- `homegamecheck` renders into the real `#screenHome` / `#screenGame` and checks that Matchup's better side stands out more than the other.
- `darkgroundcheck` passes trivially while no screen redefines `--t-surface`, and catches a dark body if one returns.
