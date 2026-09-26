# Decision: Team identity is data, and a team that cannot be read is refused

## Status

Accepted. **Superseded in part** by decision 0024 §11
(`0024-suite-v1-design-edge-policies.md`): install-level and product-shell
identity is now Suite's, not the team's. Superseded: one manifest per team, a
team-specific installed name, installed icons, favicon and default share
image, runtime swapping of install identity, and Irish Watch / Buckeye Watch
as separate installed products. Still in force: team identity is data;
colours, marks, tagline and accents are configuration; contrast is enforced;
in-app identity is normalized through TeamOS; artwork is optional and
individually fallible. The record below is left as it was decided.

## Date

2026-09-18

## Decision

How a team is *presented* — the product's name for it, the words in the document head, its colours, its type and its artwork — is a fifth section in the team config, `identity`, validated and frozen by `TeamOS.identity.create(config, team)` and applied to the page by one function, `paintIdentity()` in `app.js`.

```js
identity: {
  productName, programLabel,
  title, shareTitle?, description, shareDescription?,
  motto | null, newsLabel, manifest,
  colors: { accent, accentText, accentInk, accentSoft, accentTint, accentTintSoft,
            focus, surface, surfaceDeep, surfaceAbyss, surfaceRaise, text?, textDim? },
  fonts:  { ui, display, headline },
  assets: { favicon?, icon32?, icon64?, appleTouch?, og? }
}
```

Three rules make this more than a bag of values:

1. **An accent is a fill, not a typeface.** `accent` paints rules, indicators, active states and team markers. Text that must stay legible uses `accentText`, which is a *separate, explicitly configured* colour. TeamOS never lightens or darkens a team's colour to make it work.
2. **A team that cannot be read is refused at startup.** `create()` throws, naming the measured ratio, unless `accentText`, `accentSoft` and any declared `text` reach 4.5:1 on the team's own deepest surface, and `accentInk` reaches 4.5:1 on the accent. The accent's own ratio against the surface is *reported and never enforced*.
3. **Artwork is optional, one piece at a time.** A team that declares no favicon gets no favicon tag — not a link to a file that is not there.

`app.css` keeps its rules, its selectors and its structure. What changed is that every team-owned value in it became a `--t-*` token, including four rgb channel triples so the sheet can build tints of a team's colour without hard-coding the channels 43 times.

## Context

- **FACT.** Phase 5A proved the domain boundary: a second team rendered every ESPN-fed surface from configuration alone. What it could not change was the page calling itself Irish Watch in navy and gold, because identity lived in `index.html`, `manifest.json`, the icon files and `app.css` (finding 4).
- **FACT.** Notre Dame's accent is legible as text on its own page (gold, 6.65:1). Ohio State's is not (scarlet, 2.88:1 on the BUX charcoal). Irish Watch uses its accent as text in roughly forty places. A theme system that simply swapped one colour for the other would have shipped an inaccessible second team.
- **FACT.** `app.css` held 150 colour literals outside its palette block, 43 of them alpha tints of the accent and 25 of the surface family, because CSS cannot apply an alpha to a `var()` colour without the channels.
- **DECISION (David, Phase 6 brief).** Product/display name is team-specific (Irish Watch / Buckeye Watch). "Leave No Doubt" is Notre Dame's motto, not a platform tagline. `accentText` is explicitly configured with an automated 4.5:1 check. The page/surface foundation is team-owned. One static manifest per team. No Ohio State artwork is to be invented, and no broken references shipped.

## Options Considered

### Derive the accessible tone from the team's colour

`lighten(team.primary)` until it passes. Rejected by the brief and on the merits: the result is a colour nobody at the team approved, it drifts with the algorithm, and for Ohio State it produces a rose that is not in the BUX palette at all.

### Let the Suite own one neutral dark surface

`docs/02` assigns the page background to the Suite. But Irish Watch's background *is* Notre Dame navy — a Suite-owned neutral would have redesigned the shipped product, which Phase 6 explicitly forbids. The surface scale is therefore team-owned; card structure, spacing, shadows, semantic colours and layout remain the Suite's.

### Generate `index.html` and `manifest.json` per team

A build step. Deferred: one static manifest per team, named by the config, is enough for a single-team deployment and adds no tooling.

## Rationale

The accent/accentText split is the whole decision in miniature. It says the platform's job is not to make every team look like the first one, and not to invent colours on a team's behalf, but to ask each team for the values its own brand system already defines — and to refuse the ones that would ship an unreadable page. The check is arithmetic, it runs in CI, and it names the ratio when it fails.

## Consequences

- `teamos/identity.js` exposes `create`, `contrast`, `luminance`, `MIN`. `tools/adaptercheck.js` grew to **314 checks**, including both teams' identity, the contrast maths against independently computed ratios, ten refusal cases, and gates asserting that `app.js` carries no colour literal, no team name and no team-id branch, and that `app.css` carries no team colour, no team-flavoured variable name and no home-town copy outside the token block.
- Notre Dame's rendered identity is unchanged: same head strings, same computed colours, same copy, same artwork (moved to `assets/notre-dame/`). Nine sub-perceptual colour values were unified to make the palette team-neutral; all are recorded in `docs/engineering/phase-6-team-identity.md`.
- The semantic "this is our team" class is `.mine`, not `.nd`.
- **ASSUMPTION.** The static `index.html` head and the `:root` token block carry the deployed team's values, so a differently configured team shows the previous team's title and palette for the instant before `paintIdentity()` runs, and to a crawler that does not execute scripts. Acceptable for a single-team deployment; it is the same limitation as the static manifest.
- **OPEN QUESTION (Phase 7).** `sw.js` precaches `teams/notre-dame.js`, the Notre Dame artwork and the six Action-written data files whatever team is configured. Observed directly during the proof: an Ohio State page downloaded and cached Notre Dame's shell and snapshots while never referencing one of them. Harmless to the rendered experience, wrong for a second deployment, and inseparable from how Phase 7 chooses a team.
- **OPEN QUESTION (product).** Ohio State ships with no artwork by decision, so Buckeye Watch is installable without a custom icon and has no share image. Adding approved artwork is a change to its `identity.assets` block alone.
- **OPEN QUESTION (legal).** Ohio State's official webfonts are named in its config (`BuckeyeSans`, `BuckeyeSerif`) with Suite fallbacks, but **no font file is distributed and no `@font-face` is declared**, pending permission. Activating them is a resource change, not an architectural one.

## Owner

David (decision) / Claude Code (proposal and implementation)

## Related Documents

- `docs/engineering/phase-6-team-identity.md` — what was done and how it was validated
- `docs/engineering/phase-5a-ohio-state-proof.md` — finding 4, which this closes
- `docs/04_TEAM_CONFIG.md` — the `identity` section
- `docs/05_TEAMOS.md`, `docs/06_SUITE.md` — the boundary
- `docs/decisions/0008-snapshots-are-owned-by-declaration.md` — the same shape, for data
- `teamos/identity.js`, `tools/adaptercheck.js`
