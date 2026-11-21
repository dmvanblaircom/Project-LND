# Notre Dame vs Ohio State: visual direction boards (2026-11-20)

These are reference boards from ChatGPT (Creative Director, decision 0040) for the Stage 2 Home and Game redesign, delivered by David on 2026-11-20.

**These boards are design references, not production assets.** Nothing in this folder ships in the app or the service worker, and nothing is traced from them. The asset names drawn on the boards (`helmet-nd.png`, `stadium-dusk.jpg` and so on) were never delivered as files. `README-ASSET-GUIDANCE.md` is the guidance that came with the boards.

| Board | Shows |
|---|---|
| `01-home-game-complete-vision.jpg` | Home in every lifecycle state, Home on desktop, Game final, the state pills |
| `02-asset-pack.jpg` | Asset intent: stadium day/dusk/night, helmets, overlays, backgrounds |
| `03-game-hero-lifecycle-and-layouts.jpg` | Game hero in every state; Home and Game on phone and desktop |
| `04-home-lifecycle-and-layouts.jpg` | Home states, including game day; Home and Game on phone and desktop |
| `05-cinematic-asset-pack.jpg` | Asset intent: stadiums, helmet treatment, overlays |
| `06-stadium-and-helmet-pack.jpg` | Asset intent: stadium times of day, helmets for six teams |
| `07-game-day-experiences.jpg` | Home states with GameCast; desktop Home; desktop live Game |
| `08-notre-dame-asset-board.jpg` | Asset intent: stadium, helmets, marks, overlays |
| `09-ui-concept-board.jpg` | Home pregame, live Game, compact states, desktop Home |

## David's decisions on the imagery (2026-11-20)

- **Helmets:** Creative Commons photographs from Wikimedia Commons, licensed and credited, cut out. Notre Dame and Ohio State are the proof of concept. A survey of the other FBS teams' coverage decides whether they follow.
- **Stadium:** real Creative Commons photographs of the venue where the game is played: the home team's stadium, so the opponent's stadium when we are away. A neutral site, or a venue Suite has no photo of, gets a defocused, unrecognisable stadium.
- **Time of day:** day and night only. Dusk is dropped ("too orange").
- **Teams without a helmet image:** the team's large official mark, never a recoloured generic helmet.
- **Superseded 2026-11-21 (decision 0046):** every team is shown by its large official mark; Suite shows no helmets. The boards' helmets are not built.
- **Workflow:** helper sessions on the Project-LND environment fetch the files; this branch processes and ships them.
