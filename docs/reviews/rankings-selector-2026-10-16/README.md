# Rankings source selector: 320px review

Base: `feat/sp-plus` at `6c5ec19a88fd3034a5f8bb48680d17af535a6ac5` (PR #142).
Target: `feat/sp-plus`, not `main`. Ready for David's visual review; no merge performed.

## Change

Below 360px, source links use a 44px flex basis and 4px inline padding
(previously 50.4px and 8px). The existing 16.8px type, 44px height, gap,
labels, colors, link markup, selected state and focus outline stay intact.
Coaches keeps the intrinsic width its team font needs. No horizontal scrolling.

The 320px selector loses its extra 48px row, so the calendar note and rankings
card move up by 48px. Their layout and typography are unchanged. Header,
Games/Rankings tabs and bottom navigation stay in place. At 375, 390, 768 and
1280px the selector and card geometry are unchanged; all four 390px viewport
screenshots are pixel-identical before and after under the same fixtures/clock.

Only production changes: the narrow CSS rule and the required service-worker
VERSION bump to `suite-2026-10-16selector`. No SP+ data, controller, renderer or
edge Worker changes.

## Evidence

Screenshots show the real app route with the existing ratingsflowcheck fixtures:
SP+ figures are synthetic test data, not live rankings. AP uses the captured
September 20 feed. External images are blocked by the harness, so team marks
use the app's initials fallback. Local fonts are loaded before measuring.

| Team / style | Before 320 | After 320 | After 390 |
| --- | --- | --- | --- |
| Notre Dame / Team | [Before](before/notre-dame-team-sp-plus-320.png) | [After](after/notre-dame-team-sp-plus-320.png) | [390](after/notre-dame-team-sp-plus-390.png) |
| Notre Dame / Suite | [Before](before/notre-dame-suite-sp-plus-320.png) | [After](after/notre-dame-suite-sp-plus-320.png) | [390](after/notre-dame-suite-sp-plus-390.png) |
| Ohio State / Team | [Before](before/ohio-state-team-sp-plus-320.png) | [After](after/ohio-state-team-sp-plus-320.png) | [390](after/ohio-state-team-sp-plus-390.png) |
| Ohio State / Suite | [Before](before/ohio-state-suite-sp-plus-320.png) | [After](after/ohio-state-suite-sp-plus-320.png) | [390](after/ohio-state-suite-sp-plus-390.png) |

[AP selected at 320px, Notre Dame / Suite](after/notre-dame-suite-ap-320.png).

## Verification

- `ratingsflowcheck`: **165 checks passed**. The direct-render regression and
  real SP+ route assert a shared top coordinate, all five full labels, label
  containment, 44px minimum height and no page overflow. SP+ runs both teams,
  both styles, and 320/375/390/768/1280px. Screenshot-backed contrast passes
  throughout; keyboard focus passes for all four 320px combinations. Clicking
  AP and using Back/Forward restores SP+/AP correctly for each team.
- `suitecheck`: **143 assertions passed**.
- `swipecheck`: **18 assertions passed**.
- `mobilefitcheck`: **100 checks; 0 failures**.
- `csscheck`: **865 rules; 0 shadowed, 0 dead**.
- `swcheck`: **39 assertions passed**.
- `node --check app.js`, `node --check sw.js`, and the changed test: **passed**.
- `node tools/versioncheck.js origin/feat/sp-plus`: **passed**, the shell version changes.

[Check output](checks.txt) · [Rankings assertions](ratingsflowcheck.txt) ·
[20-case geometry](geometry.json).

At 320px, the smallest target is **48.20 × 44px** (Ohio State Team Style);
every link shares the same top. The other three combinations have a minimum
target width of 50.95px.

### Negative control

With the strengthened test but the original `feat/sp-plus` production files,
`ratingsflowcheck` exits **1** at:

> five future source choices fit on one row at 320 with 44px targets and full labels

The same helper, exercised independently on the real OSU SP+ route at 320,
also exits **1**. Original link tops are 188.59px for the first four and
236.59px for SP+. All four team/style combinations reproduce the wrap.
The unchanged assertions pass with the narrow CSS fix.

[Full negative-control output](negative-control.txt).
