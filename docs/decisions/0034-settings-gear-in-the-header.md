# Decision: Settings is a gear in the header

## Status

Accepted. Amends 0031 (the header gains one control at its right edge) and
0028 (Settings is no longer a destination under More, so it keeps no owner).

## Date

2026-10-10

## Decision

- Settings opens from a gear at the right edge of the SUITE bar, on every
  team screen. It is a link to `#settings`, named "Settings" for assistive
  technology, a full 44px tap target, and marked current while Settings is
  open.
- A gear, not a profile icon: Suite has no accounts, so a profile would
  promise something that does not exist.
- More no longer lists Settings. With no owner, no bottom-nav item is
  selected on Settings; the gear is.
- The older address `#more/settings` still opens Settings and is corrected
  in place, as `#more/news` is.
- The chooser has no team and so no gear, as it has no team context.
- The team context stays context, not a control (0031); Change Team stays
  in Settings.

## Context

David, 2026-10-10: "I feel like settings shouldn't be under More, it should
be a gear or profile icon in the top right of the header." Settings is the
fan's own preferences (style, alerts, team), not one of the team's
destinations, and the top-right gear is where phone apps put it.

## Fit

The team context takes the bar's free width, and the gear's 44px target
overlaps the gap and the gutter, so its glyph keeps 12px from the name and
lines up with the content edge. From 360px up, "OHIO STATE" and "NOTRE
DAME" stay on one line. At 320px a two-word name stacks onto two lines: the
header's existing narrow-phone rule (the whole name, never an ellipsis).
`tools/visualcheck.js` checks, on every screen for both teams, that the name
is not cut, the gear's size and edge, that it clears the name, and that it
is current only on Settings.
