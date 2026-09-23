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
still listed — because "we know about your team and cannot open it yet" is
useful where silence reads as "your team is not here".

**The list is one alphabetical run with a search box, not conference
sections** (David, 2026-09-22). Conference is shown on every program and is a
search term; it does not organise the page.

**What you can open and what is not built yet are drawn as two different
kinds of thing**, not the same row at two opacities. An openable program is a
full-width control with somewhere to go. An unbuilt one is a small card in a
dense grid under *Coming soon* — not a button, not focusable, nothing to press
that would do nothing. The openable ones sit at the top and carry no label of
their own; being first, under the heading that asks the question, is the
label.

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
  cannot be a dead end. It runs `chooser.js` against a stubbed document that
  parses the markup into nodes it can hide, so typing a query and reading back
  what is left is a test of the wiring rather than of a string. Negative
  controls **observed failing**: making unavailable teams selectable, hiding
  them instead of showing them, dropping the escaping, rendering unbuilt
  programs as buttons, leaving openable ones in place instead of first,
  leaving an emptied heading on screen, dropping the conference from a row,
  leaving the redundant word on it, letting a name reach `data-find`
  unescaped, freezing the section count, and not removing the tab bar.

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
- **There is still no way to change teams from inside a Suite.** It takes a
  URL or clearing storage.

## The chooser at 138 programs

Written for four programs, the chooser met the real roster (decision 0017) and
two things it did were wrong at that size.

**Eleven conference sections, in the provider's order.** `byConference()`
grouped in first-seen order, so the page opened on the Mountain West and put
the Big Ten tenth for no reason a fan could name — ESPN's page order reaching
rendering, which architecture rule 3 exists to stop. It also asked the fan to
know their team's 2026 conference to find it, in a season where five programs
reclassified and the Pac-12 was rebuilt.

**DECISION (David, 2026-09-22): one A-Z list, and a search box.** Conference
stays as a per-program label and a search term. `byConference()` is replaced by
`sorted()`.

- Sorting is `localeCompare(…, "en", {sensitivity:"base"})`, not `<`. Byte
  order puts San José State and lower-cased names where nobody looks for them.
- Search is by **word, not substring** (David, 2026-09-22: find variants,
  stay case-insensitive, pull nothing irrelevant, restrict nothing needlessly).
  Every word of the query must either begin a word of the program or equal
  one of its short forms. Substring matching is what made `nd` return Indiana,
  Maryland, Vanderbilt and four others; word-start matching returns Notre Dame.
- **Short forms come from the provider, not a list.** The generator now
  carries ESPN's `abbrev` (`OSU`, `ND`, `TA&M`) and `shortDisplayName`
  (`Buckeyes`, `Fighting Irish`) into the registry as `abbr` and `nick`, so a
  fan finds a school by its code or its mascot with nothing typed by hand.
  Name initials are added (`nd`, `os`) plus the spoken U (`osu`).
- **Conferences answer to what people call them.** Initials fall out for
  free (`acc`, `mac`, `mwc`, `sbc`); numerals are said both ways (`big 10`,
  `big ten`); and four abbreviations initials cannot produce are the one
  short table in the code: `sec`, `cusa`, `b1g`, `aac`. It names no team.
- Accents fold and punctuation closes up, so `hawaii` finds Hawai'i and
  `texas am` finds Texas A&M. A short form with punctuation in it (`TA&M`,
  `M-OH`) is tried whole before the query is split into words.
- **Open, not loose.** A query word no program has ever heard of is ignored
  rather than vetoing the rest (`notre dame football` finds Notre Dame). If
  nothing matches strictly, a fallback looks inside words (`bama` finds
  Alabama) — but only then, so it can never widen a query that already worked.
  A query nothing knows at all still reports nothing.
- Filtering hides items rather than re-rendering: 138 items rebuilt on every
  keystroke, and the focused input thrown away with them.
- A section heading counts what is under it *now*. Left at the resting total
  it reads "136 programs" over seventeen of them.

**DECISION (David, 2026-09-22): stop greying the unbuilt ones.** 136 of 138
dimmed rows read as a mostly broken page, and stacked full width they were a
quarter-mile of scroll. They are cards now, in a dense grid, under *Coming
soon*. They are not buttons, which also takes the chooser from 139 tab stops
to three.

### Two things this surfaced

- **The tab bar survived on the chooser.** The furniture removal only ever
  looked inside `.page`, and `nav.tabbar` and the skip link are *siblings* of
  it. So a fan with no team was looking at Home / Top 25 / Game / Depth /
  News with nothing behind any of them. Shipped that way in 7C. The removal
  now queries the document, and `choosercheck` models furniture outside the
  host so it cannot come back.
- **`hidden` is not enough on its own.** Filtering sets the `hidden`
  attribute, and these elements carry a `display` that outranks it. Chromium's
  UA sheet marks `[hidden]` important and would have hidden them anyway;
  WebKit's does not — so on the browser this product actually ships to, a
  filtered-out program would still have been on screen. `app.css` now says it
  in the author sheet.

## Owner

David (the rules above, that the bare domain changes, and the two decisions in
"The chooser at 138 programs") / Claude Code (the mechanism and the checks)

## Related Documents

- `docs/decisions/0013-the-page-chooses-its-team.md` — the boot script
- `docs/decisions/0014-one-registry.md` — what the chooser reads
- `docs/decisions/0015-the-worker-is-told-its-team.md` — what caching a team means
- `chooser.js`, `tools/choosercheck.js`
