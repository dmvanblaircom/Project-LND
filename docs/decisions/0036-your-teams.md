# Decision: Your Teams - favorites and a one-tap switch

## Status

Accepted. Amends decision 0024 §6 for the header's team context only.

## Date

2026-10-27

## Decision

David, 2026-10-27, choosing the smallest useful version of W22 (My Teams)
now that Suite has more than two teams: **quick switch**.

- **Favorites.** In the chooser, every team that can be opened has a star,
  inside its card between the name and the chevron, in the Suite's bronze
  (`--s-bronze` #B8845A): an outline, then filled champagne (`--s-champagne`
  #D4B896) edged in bronze once starred (David, 2026-10-27).
  Starred teams are the fan's teams and appear first, under **Your Teams**, in
  the order they were starred. A search still looks through every program
  once, below, so it never lists a team twice. At most 12.
- **On this device only.** Favorites are kept where the chosen team and the
  App Style are kept (`localStorage`, `suite-favorites`). No account, no
  server, nothing shared between devices.
- **The switch.** When the fan has another starred team to switch to, the
  team name in the SUITE header becomes a control. It shows a chevron, and
  it opens a sheet listing the fan's teams. The team being viewed is first
  and is shown, not offered. One tap opens another team on the screen the
  fan was on. The sheet links to **Edit Your Teams**, which is the chooser.
- **Otherwise unchanged.** With nothing to switch to, the team name stays
  quiet context, exactly as decision 0024 §6 drew it. Change Team stays in
  Settings: the switch reaches only the fan's own teams, and choosing any
  other team is still the chooser's job.

Not in this version (the options David did not choose): other favorites'
scores on Home, and game alerts for every favorite.

## Consequences

- `suite/favorites.js` is the store, loaded by the chooser and the Suite.
- `chooser.js` draws the stars and Your Teams; `app.js` draws the switch.
- `tools/favoritescheck.js` checks both.

## Owner

David (Product Owner); Claude Code implementing (decision 0035).
