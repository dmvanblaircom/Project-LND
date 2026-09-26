# Inputs for two decisions: fonts (B8) and the team-first header (B1)

Prepared 2026-09-25 for David. Nothing here is built. The renders were made
from the real app, with only fonts or the header changed, and were sent in
chat; they are review material, not repository assets.

## B8: fonts

The app has three font roles:

| Role | Today | Used for |
|---|---|---|
| UI (`--t-font-ui`) | Barlow | body text, buttons, nav, rows |
| Display (`--t-font-display`) | Barlow Condensed | team names, screen titles, tabs, labels (condensed, uppercase) |
| Editorial (`--s-font-editorial`) | Georgia | section titles, news headlines |

Brand System v1 names **Neue Haas Grotesk** (primary) and **Canela** (accent),
and rules out Barlow for Suite.

### Free pairings, rendered on Home, Game, Roster and News at 390 px

All of these are SIL Open Font License fonts: free for commercial use and
free to host ourselves.

| Pairing | Result |
|---|---|
| Instrument Sans + Instrument Serif | More premium and clearly less plain than Barlow, but **wider**: "Special Teams" wraps, the depth-chart title wraps, fewer players per screen. |
| **Instrument Sans with its width axis condensed (80%) for the display role + Instrument Serif** | **Keeps today's density exactly.** Titles and tabs fit on one line again, and the same rows fit per screen, with the crisper Instrument letterforms. One sans family covers both UI and display. |
| Inter Tight + Instrument Serif | Very clean and neutral, and wide like plain Instrument Sans: the same wrapping. The closest free match to Neue Haas Grotesk's neutrality, but the most generic. |

Two constraints the renders respect:
- Instrument Sans goes up to weight 700, where display text uses 800 today.
- Instrument Serif has one weight (400), so headings are set at 400, never
  with a synthesized bold.

**Claude's recommendation:** Instrument Sans (condensed for display) +
Instrument Serif.

### Licensing Neue Haas Grotesk + Canela

Prices could not be verified from here (the foundry sites are blocked from
Claude's environment), so none are quoted. The models:

- **Neue Haas Grotesk:** Monotype / Linotype, licensed per style, with
  separate desktop, web and app licences.
- **Canela:** Commercial Type only, not on Google or Adobe Fonts. Its **web
  licence is priced by monthly page views and bought in one-year terms**, so
  it is a recurring cost that grows with traffic. It can also be rented
  through Fontstand.
- **To ask both foundries:** does an installed PWA need an app licence as
  well as a web licence? What is the page-view tier for a small launch, and
  what does it cost to renew?

## B1: the team-first header

Today the dark header shows the **SUITE** wordmark (Home, Game), or SUITE
plus the team as quiet context (Top 25). The header already contains a team
slot (mark and name), so the options below were mocked on the real screens.

| Option | What it is | Notes |
|---|---|---|
| **H1: team only** | Team mark and team name; no SUITE in the header | Most team-first. Suite remains the install name, the chooser's header, About and the icon. |
| **H2: team leads, Suite quiet** | Team mark and name on the left; a small, dimmed SUITE wordmark on the right | Keeps a "powered by Suite" cue in the product. The locked wordmark is used small; the brand system's minimum sizes should be checked. |

What the mocks surface, for the designer:
1. **Home repeats the team name**: the header says NOTRE DAME directly above
   the hero's "NOTRE DAME / FIGHTING IRISH". Either the header shows the mark
   only on Home, or the hero drops its eyebrow line.
2. **The installed app stays "Suite"**: one installed product for every team
   (decision 0024 §11). A team-named install would need per-team manifests
   again. Keep this as is unless decided otherwise.
3. **The chooser and About keep Suite** (no team yet, or about the product).
4. This reverses decision 0024's Suite-led header, so it needs a **new
   decision record** once the design is chosen, and it goes through ChatGPT.
