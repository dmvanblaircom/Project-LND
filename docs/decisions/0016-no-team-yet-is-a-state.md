# Decision: "no team yet" is a state, not a reason to guess

## Status

Accepted

## Date

2026-09-22

## Decision

A fan who arrives having asked for nobody in particular **has not chosen a
team**, and the Suite does not choose one for them. That is its own state, and
the chooser is what happens in it.

```text
?team=<id>          -> that team
no ?team, stored    -> the stored team
no ?team, nothing   -> THE CHOOSER. app.js is never loaded.
```

The last line is the change. Through 7A and 7B this fell back to a default, so
whoever arrived first saw somebody else's club.

**The chooser is not the Suite with a modal over it.** There is no team, so
`app.js` is not loaded at all — it reads `TEAM_CONFIG` as it parses and there
is none. The boot script loads the registry, TeamOS and `chooser.js`, and
nothing else. The Suite's own furniture — header, hero, odds strip, tabs — is
removed, because with no team it would be either somebody's or nobody's, and
both are wrong.

**Choosing navigates to `?team=<id>`.** One line of work that buys a lot: the
boot script's existing path runs from the top with a team, the choice lands
where every later visit reads it, and the URL is shareable and installable.
Rendering the Suite in place would be a second way to start the application.

**Everything shown comes from the registry** (decision 0014). A program is
selectable because it names a config. One that does not is still listed,
greyed, reading *Not yet* — because "we know about your team and cannot open
it yet" is useful where silence reads as "your team is not here".

The page paints in the neutral `:root` — nobody's colours — because the fan has
not told us whose to use.

## Context

- **DECISION (David, 2026-09-21).** `?team=` is canonical; URL wins; stored
  choice is the fallback; **first true visit with no URL and no stored choice
  shows the chooser**; only teams with configs are selectable; Indiana and BYU
  exist but are not; one installed PWA per team.
- **FACT.** `app.js` reads `TEAM_CONFIG` at parse time. There is no partial
  mode where it runs without a team.
- **FACT.** `app.css`'s `:root` has been team-neutral since 7A
  (decision 0013), so a page with no team already had somewhere legible to
  paint from.

## Options Considered

### Keep defaulting to Notre Dame, put a switcher in the header

Least work, and it is what the product does today. Rejected on David's rule,
and the rule is right: the bare domain showing one program makes every other
program a second-class citizen of a platform that claims not to have one.

### Render the chooser as an overlay on a loaded Suite

Means loading a team in order to ask which team — the thing being avoided, plus
a flash of the wrong club underneath.

### Choose in place, without navigating

Would need the Suite to start from JavaScript rather than from a page load:
a second, less-tested way into the application, to save one navigation that
happens once per browser.

### A chooser page, navigating on pick (chosen)

One start path, one place the choice is read, a URL that can be shared or
installed.

## Consequences

- `chooser.js` (new): renders from the registry, escapes every name, names no
  team and carries no colour of its own.
- `app.css` gains a `.chooser` block, entirely in neutral tokens.
- The boot script branches. With no choice it sets `data-choosing`, loads the
  registry, TeamOS and the chooser, and **does not load `app.js` or any team
  config**.
- `sw.js` precaches `chooser.js`; `VERSION` → `iw-2026-09-22a`.
- **The bare domain now shows the chooser to a first-time visitor**, where it
  showed Irish Watch. Anyone with the app installed, a stored choice, or a
  `?team=` link is unaffected. Notre Dame is `/?team=notre-dame`.
- `tools/choosercheck.js` (new, in `check.yml`). The check that matters most:
  every team offered as selectable has a config on disk, so the first screen
  cannot be a dead end. Three negative controls **observed failing**: making
  unavailable teams selectable, hiding them instead of greying them, and
  dropping the escaping.

### A landmine removed on the way

`teamos/team.js` assigned the namespace whole — `var TeamOS = (function(){…})()`
— while every other module extends it. Loading `teamos/registry.js` before it
therefore erased the registry, silently: the file fetched 200, defined nothing,
and the chooser failed on `TeamOS.registry.create`. TeamOS modules now all
extend, and load order no longer matters.

## Consequences still open

- **7C is the mechanism, not the finished experience.** There is no way to
  change teams from inside a Suite yet; it takes a URL or clearing storage. A
  switcher is the obvious next thing and is deliberately not in this change.
- **The registry is four programs.** The chooser is therefore short. Filling it
  is additive and blocked only on an FBS roster (decision 0014).
- **No conference data** beyond the four hand-authored rows, so a filled
  registry would group everything under "Independent" until a source is found.

## Owner

David (the rules above, and that the bare domain changes) / Claude Code (the
mechanism and the checks)

## Related Documents

- `docs/decisions/0013-the-page-chooses-its-team.md` — the boot script
- `docs/decisions/0014-one-registry.md` — what the chooser reads
- `docs/decisions/0015-the-worker-is-told-its-team.md` — what caching a team means
- `chooser.js`, `tools/choosercheck.js`
