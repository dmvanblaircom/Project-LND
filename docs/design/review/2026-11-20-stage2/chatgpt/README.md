# Stage 2 Home: before and after, for design review

**For:** ChatGPT, Creative Director and Design Authority (decision 0040).
**From:** Claude Code, at David's request, 2026-11-20.
**PR:** #273 (`design/stage2-home`). Not merged; it waits on this review.

## David's verdict

> Functionally this looks improved, but design/UI/UX is a huge regression that we need ChatGPT to help us correct.

David also ruled that **imagery belongs to ChatGPT**: the stadium art, the helmets and any other illustration. Claude implements whatever is approved.

## What these pictures are

- **Real renders, not mockups.** `tools/stagereview.js` loads the real app (renderer, stylesheet, fonts) in Chromium.
  - **before** = today's `main` (6c8ae70bc), which is what fans have now.
  - **after** = PR #273.
  - Each pair is the same team, App Style, width and game state.
- **Team logos are placeholders.** The initials in circles ("ND", "NAVY") are the app's fallback, because ESPN's logo host is blocked where these were rendered. On a real device the official marks sit in those circles, in both before and after. Screenshots with real marks are in PR #273's CI artifacts (`suite-visual-*`).
- **The data is test data.** Every team plays the same fixture week, so Ohio State "plays" Notre Dame and every venue is Gillette Stadium.
- **Size:** phone at 390 px wide, desktop at 1280 px, captured at 1x. Phone captures stop at the bottom of the hero; desktop shows the first screen.

## The pairs

| State | Before (main) | After (PR #273) |
|---|---|---|
| Pregame, days away | [before](before-notre-dame-team-pre-far-390.png) | [after](after-notre-dame-team-pre-far-390.png) |
| Pregame, kickoff in under 2 hours | [before](before-notre-dame-team-pre-near-390.png) | [after](after-notre-dame-team-pre-near-390.png) |
| Live | [before](before-notre-dame-team-live-390.png) | [after](after-notre-dame-team-live-390.png) |
| Halftime | [before](before-notre-dame-team-halftime-390.png) | [after](after-notre-dame-team-halftime-390.png) |
| End of game (0:00, 4th, not yet final) | [before](before-notre-dame-team-end-390.png) | [after](after-notre-dame-team-end-390.png) |
| Final (a win) | [before](before-notre-dame-team-final-win-390.png) | [after](after-notre-dame-team-final-win-390.png) |
| Live, Ohio State, Suite Style | [before](before-ohio-state-suite-live-390.png) | [after](after-ohio-state-suite-live-390.png) |
| Desktop, pregame | [before](before-notre-dame-team-pre-far-1280.png) | [after](after-notre-dame-team-pre-far-1280.png) |
| Desktop, live (night) | [before](before-notre-dame-team-live-night-1280.png) | [after](after-notre-dame-team-live-night-1280.png) |
| Desktop, final | [before](before-notre-dame-team-final-win-1280.png) | [after](after-notre-dame-team-final-win-1280.png) |

**After only:**
- [dusk lighting, phone](after-notre-dame-team-pre-dusk-390.png)
- [live at 1440](after-notre-dame-team-live-1440.png)

**Contact sheets** of every state, six teams, and day, dusk and night are one folder up (`../*.jpg`).

## What changed visually (facts, not a defence)

- **The hero is much taller.** Live on a phone it runs to about 615 px, against about 440 px before, so less of Home is on the first screen.
- **A full-bleed illustrated stadium sits behind the matchup.** It has light towers, beams, stands with crowd lights, and a striped field, lit in the team's colours. Before, the hero was a dark card with a soft glow and a faint outlined watermark of the team's initials.
- **Two large generic helmets** (pearl white, one shared form for every team) now stand behind the team marks. Before, there were no helmets.
- **More stacked lines:** team identity, the matchup, a status row, the series, the countdown, kickoff facts, then the action.
- **The countdown grows** from a quiet line to a large boxed figure in the last two hours.
- **New sections below the hero:** Quick Actions (Matchup, Availability) and the Wire. On desktop, a second column holds Season Context and Conference Standing, and the bottom nav moves into the header (decision 0042).

## Fixed on the engineering side: keep the behaviour, restyle freely

These are product behaviours the brief requires. They are built and tested, and the visual layer can change around them:

- **One hero across every state:** pregame, live, halftime, overtime, delayed and suspended, END OF GAME, and final.
  - END OF GAME never shows the postgame layout early.
  - Wins and losses get the same treatment.
- **Live context:** score, quarter and clock, possession named in words, down and distance, and the spot, each only when the source has it.
  - Halftime reads "Notre Dame receives to start the 2nd half".
  - Overtime shows no clock.
- **Countdown tiers:** days away, the day before, game day, and the last 2 hours. The figure is a value at the time of drawing, never a ticking clock.
- **The light follows the kickoff time:** day, dusk (4 to 6 PM local), or night. How each one looks is open.
- **Every word on the hero reads at WCAG AA** for all 138 teams; a check enforces this on every PR. Whatever the new design, text must stand on a solid enough surface.
- **Section order:** champion banner, hero, milestone, quick actions, wire, news, schedule. On desktop, Season Context and Conference Standing stay as two separate panels.

## Open for ChatGPT

All of the visual and UX layer. Specifically:

- The hero's composition and height.
- Whether there is an illustrated stadium, and what it looks like.
- Helmets: their form, whether to show them at all, and the asset strategy.
- How the matchup, score and status are arranged.
- Countdown styling.
- The quick actions and wire styling.
- The desktop composition.

The fastest path back is an approved direction (or a corrected brief) that Claude implements on #273's branch, re-rendered with this same harness for side-by-side review.
