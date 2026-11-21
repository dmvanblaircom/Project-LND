# 0046: Teams are shown by their official marks, not helmets

**Status:** Decided by David, 2026-11-21.

## Context

The Stage 2 boards (`docs/design/reference/2026-11-20-nd-osu-boards/`) show both teams' helmets facing each other over the stadium. Suite tried to supply that with freely licensed photographs:

- A survey of Wikimedia Commons for all 138 teams found a clean helmet photo for 6, a usable one for 11 more, and nothing for 108 (`helmet-coverage.md` beside the boards). The photos that exist differ in angle, era, lighting and background, so they do not read as a set.
- Even for the proof-of-concept matchup the results were fragile. Notre Dame's only unworn photo was a 450 px shot through a display case. Ohio State's could not be mirrored (the maker's name on the bumper), so on Ohio State's own page the two helmets would have faced away from each other, and that page fell back to marks anyway.

## Decision

1. **Every team, all 138, is shown on the stage by its large official mark.** Suite does not show helmets.
2. **The helmet machinery is removed:** the helmet photographs (`assets/helmets/`), their entries in `leagues/college-football-art.js`, `TeamOS.art.helmet`/`helmetByProvider`, the stage's helmet layout and styles, and their checks. No dormant path is kept for later (architecture rule 9).
3. **The stadium photographs stay:** the venue the game is played in, by day or night, with the defocused stand-in elsewhere.

## Consequences

- Every team gets the same treatment, with no per-team photo gaps or quality differences.
- The stage departs from the boards on this one element; the marks stand where the helmets stood.
- Revisiting this would need a consistent, licensed helmet set for every team, a product decision with a cost, not a sourcing task.
