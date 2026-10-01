# Proposal: rivalry, trophy and series names (W21)

**Status:** Claude's proposal, 2026-10-01, for David's approval. Nothing
is built.

## What exists

- Each team's config has a `series` table: opponent pattern → a name
  (`teams/notre-dame.js`, `teams/ohio-state.js`). `TeamOS.espn` attaches the
  match to the game; Game shows it on a card **with a trophy icon**.
- No provider Suite reads carries trophy or rivalry names: none of the
  captured ESPN payloads in `tools/fixtures/` do (searched 2026-10-01), and
  CollegeFootballData is used only for season stats. The config, sourced
  from each team's own schedule release, stays the source of record.

## The problem (backlog B5)

The table mixes three different things under one trophy icon:

| Kind | Example in the configs | Is it a trophy? |
|---|---|---|
| Trophy | Shillelagh Trophy, Megaphone Trophy, Illibuck Trophy | Yes |
| Rivalry name, no trophy | (none yet; e.g. Ohio State-Michigan is "The Game") | No |
| Event / branding | Shamrock Series (Notre Dame's neutral-site home game) | No |

So the Wisconsin game showed "Shamrock Series" beside a trophy, and a
rivalry name dropped into "Playing for the ..." wording reads "Playing for
the The Game". The Suite already strips "Playing for", but it cannot know
which entries are trophies.

## Proposed model (smallest change)

Each entry says what it is:

```js
series: [
  { match: /purdue/i,    name: "Shillelagh Trophy", kind: "trophy" },
  { match: /wisconsin/i, name: "Shamrock Series",   kind: "event" },
  { match: /michigan$/i, name: "The Game",          kind: "rivalry" }   // OSU, example
]
```

- `TeamOS.espn` passes `{ name, kind }` instead of a bare string.
- Suite: trophy icon and any "Playing for" wording only for `trophy`; a
  `rivalry` or `event` shows its name plainly. No description text until a
  trustworthy source for one exists (Game review, 2026-09-24).
- The old two-element arrays keep working during the change, read as
  `trophy`, so nothing breaks mid-way.
- A check fails if any entry lacks a kind, or if Suite draws the trophy icon
  for a non-trophy.

## Where names come from

The team's own schedule release and athletics site, as today, recorded in
the config with the kind. A general reference (for example Wikipedia's
lists of rivalry trophies) is only a cross-check, never copied wholesale
into the app. Adding a team means adding its entries - data, not code.

## Decisions for David

1. Approve the `trophy` / `rivalry` / `event` split and the Suite rule
   above.
2. Whether Ohio State's config should gain "The Game" (Michigan) now. Other
   OSU rivalry names wait for W20's source work.
