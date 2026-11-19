# Desktop navigation: side-by-side evaluation

**Status: decided.** David chose B on 2026-11-08 (decision 0042). The evaluation below is kept as the record of how it was decided. The implementation differs from the concept in two details: the destinations are words only at every desktop width, and Game carries a Live chip and, from 80rem, the score.

Evidence is in `docs/design/review/2026-11-07-desktop-nav/`:

- `sheet-home.jpg` and `sheet-game.jpg`: every concept at 1024, 1280 and 1440 px, on Home and on Game.
- `sheet-canvas.jpg`: the canvas each concept leaves for the wide grid.
- the individual screenshots.

## How it was made

- **The real app, not mockups.** Each concept is a stylesheet (`tools/specimen/nav-concepts/`) injected into the running Suite by `tools/capture.js` (`CAPTURE_CSS`).
- **Data and behaviour.** The Notre Dame live fixture, in Team Style. Same hash routes, selected state and Game live light in every concept.
- **Phones and tablets.** Untouched: every rule sits behind `@media (min-width:64rem)`.

Two corrections to the brief:

- **Destinations.** Suite has **five** top-level destinations, not seven: Home, Around, Game, Roster and More. News, Schedule, Stats, Feedback and About live inside More. All three concepts use the real five. Promoting two of More's items to make seven would be new top-level navigation, a product decision of its own (see the end).
- **What Concept A was.** The Concept A in the Stage 1b specimen, the one approved, was a full-width bar docked along the bottom edge, not a left rail. Both are shown here:
  - **A-rail** is the left rail as described in the brief;
  - **A-dock** is the bottom bar that was approved.

## The options

| | Today (≥48rem) | A-rail | A-dock | B: header |
|---|---|---|---|---|
| Where | a centred 640 px bar, floating at the bottom | an 88 px rail on the left, below the header, beside the content | a full-width bar along the bottom, its items over the content column | inside the existing SUITE header, on the right beside settings |
| Persistent chrome at 1280×900 (measured) | 10.1% of the screen | 12.7% | 14.1% | **6.2%** |
| Height free for content at 900 px | 773 px | 844 px | 773 px | **844 px** |
| Wide-grid canvas at 1024 / 1280 / 1440 px | n/a | 864 / 1120 / 1152 px | 976 / 1152 / 1152 px | **976 / 1152 / 1152 px** |
| Bars on screen | 2 (header, bottom bar) | 2 (header, rail): an L-shape | 2 (header, bottom bar) | **1** |
| Composition | centred | content pushed right of centre by the rail | centred, framed top and bottom | centred, open below the header |
| Live Game cue | raised circle with live light | raised circle, inside the rail | raised circle | Game tab with live light (less prominent) |
| Matches mobile | n/a | no | **yes**: the same bar, wider | no |

Concept B was tested on all 138 teams at 1024 px, with each team's own display face and Game in its widest (live) state (`tools/specimen/nav-concepts/fit.js`). Every team's name clears the first tab by at least 195 px; Michigan State is the tightest. Below 1280 px the tabs drop their icons.

## Assessment

**A-rail: not recommended.**
- **Looks like software.** A persistent vertical rail beside a header is the shape of an admin tool or analytics product. It is the strongest dashboard signal of the three, and the opposite of a destination.
- **Costs width where it hurts.** It takes 112 px of width, rail plus gap, on every screen. At 1024 px that leaves the wide grid 864 px, the narrowest of any option.
- **Throws off the layout.** It pushes the content off centre, and the raised Game circle sits awkwardly in a vertical stack.
- **Little in return.** Its benefit (always visible, near content) is something B also gives.

**A-dock: defensible, but the wrong trade on desktop.**
- **For it.** The best continuity with mobile: the same bar, the same raised Game circle.
- **Against it:**
  - Two bars frame every screen. At 14.1% it carries the most chrome of all, and the bar permanently covers the bottom 71 px of content, which is where Game's drive and play detail continues.
  - A bottom navigation is a touch convention; on a desktop with a mouse it reads as a phone layout stretched wide.

**B: recommended.**
- **Less chrome, not more.** The destinations move into a header that already exists, so the bottom bar disappears. That is 6.2% chrome against 12-14%, and the full height below the header is content.
- **The full canvas.** The wide grid gets 976 px at 1024 and its full 1152 px from 1280, with the composition centred.
- **Best for "Saturday Night. Under the Lights."** The header is a band of the team's deep colour across the top of the screen, like the rim of the stadium, and it runs straight into the dark stage below. The next step it allows, letting Home's stage run full-bleed under a header that sits over it, is only possible when nothing else is pinned to the screen. With B, the event fills the screen and the interface recedes.
- **What sports fans expect.** Sports media on desktop overwhelmingly navigates from a top bar; your instinct that a sidebar is rare there is right.

**What B costs, and what it needs:**

1. **Live prominence.** The raised Game circle becomes a tab with a live light. That is quieter than today. B should give Game a distinct live treatment in the header, for example a Live state on the tab itself. This is a design detail for the Creative Director, using existing data only.
2. **Keyboard order.** As a CSS-only concept, the header tabs are still the last thing in the page's tab order, because the navigation markup sits after the content. Shipping B means moving the navigation into the header markup, a small `index.html` and `suite/nav.js` change with no new behaviour, so keyboard and screen-reader order match what is seen.
3. **Timing.** B's header is laid out on the wide 72rem grid. Today's screens still use the 40rem reading column, so at 1440 px the header reaches wider than the content (see the sheets). It lines up once Home and Game adopt the wide grid. B therefore belongs with Stage 2 (Home), not before it.

## Recommendation

**B: the destinations in the branded header.** It has the least persistent chrome, the full canvas and the strongest fit with the creative direction. It held all 138 teams at the tightest desktop width tested. Ship it with Stage 2, with the three requirements above. Retire both Concept A variants.

**One alternative worth considering later: seven destinations.** At 1280 px and above, B's header has room to lift two of More's items (for example News and Schedule) to the top level on desktop. That would be new top-level navigation and a different structure from mobile, so it is a separate product decision, not part of this one. I would not do it now.
