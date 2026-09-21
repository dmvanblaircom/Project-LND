# Decision: the page chooses its team, and paints nobody's colours until it knows

## Status

Accepted

## Date

2026-09-21

## Decision

**The markup names no team.** A boot script at the end of `index.html`'s head
resolves the team, and everything else follows from that one answer:

```text
?team=  ->  last choice in this browser  ->  the default
                        |
                        v
         data-team, and the choice stored
                        |
        +---------------+----------------+
        v                                v
  replay this team's stored tokens   inject teams/<id>.js, teamos/*, app.js
  (colours, title, theme-color)      in that order; app.js at DOMContentLoaded
```

Two rules make it safe:

1. **`app.css`'s `:root` is team-neutral.** The defaults are a slate that is
   nobody's. A page that has not yet learned its team paints something legible,
   and a default that is nobody's cannot be the wrong team.
2. **A stored token set is only ever replayed under the team it was stored for.**
   `paintIdentity()` writes its set to `iw-boot-<teamId>`; the boot script reads
   only that team's key. One team can never flash in another's colours.

The cost is one moment of neutral on a browser's **first ever** visit to a given
team. Every visit after paints the team before a single file is fetched.

## Context

- **FACT.** Before 7A the team was whichever file the markup named. That is why
  `buckeye.html` existed: a second team meant a second copy of the page, kept
  byte-identical below `</head>` by a check, and two edits for every change to
  the shell.
- **FACT.** 2026-09-21: Buckeye Watch rendered under Notre Dame navy browser
  chrome, because `app.css` declared Notre Dame's values on `:root` and iOS
  Safari takes its status bar and toolbar tint from the first paint and never
  recomputes it (`docs/engineering/first-paint-team-tokens.md`). The interim fix
  gave each page a static block of its own team's tokens. That does not survive
  a team chosen at runtime — there is no page to put the block on.
- **FACT.** `app.js` reads the DOM as it runs (`var tabs = ...querySelectorAll`
  at top level), so it cannot execute before `<body>` is parsed. `defer` gave it
  that for free; a dynamically injected script does not get it.
- **FACT.** Dynamically injected scripts are async by default. Setting
  `async = false` puts them in a list that executes **in insertion order**, which
  is what lets the team config be guaranteed to run before `app.js`.

## Options Considered

### Inline every team's tokens in the head

Correct first paint for everyone, always. Rejected: it is the third copy of each
team's palette, it grows with every team added, and keeping it honest needs a
check whose only job is to police a duplicate that should not exist.

### Accept a neutral first paint for everybody, every time

Simplest, and never wrong. Rejected: it makes the common case — a fan opening
their own team's app for the hundredth time — worse than it is today, to fix a
case that happens once.

### Replay the last-applied set from storage (chosen)

No duplication, nothing to keep in sync, and it scales to any number of teams. A
browser learns a team's colours by visiting it once. The first visit is neutral;
the rest are instant. `localStorage` failing (private mode, blocked storage, a
full quota) degrades to neutral, which is the safe direction.

### `document.write` the team's script tag

The old reliable way to guarantee order. Rejected: Chrome intervenes on slow
connections, and it blocks the parser for no benefit over `async = false`.

## Rationale

Phase 6 made identity data for everything a script could reach. What was left was
everything that happens *before* a script runs — and a runtime-selected team makes
that window the whole problem, not an edge case. Putting the decision in one boot
script means there is exactly one place that knows which team this page is, and
it runs before anything that could get it wrong.

Keying the stored set by team is the part that matters most. An unkeyed cache
would have reintroduced the reported bug in a worse form: not a static default
showing through, but *whichever team you looked at last* bleeding onto the next.

## Consequences

- `index.html` carries a `<script id="team-boot">` at the end of its head — after
  the tags it edits, which is not cosmetic: placed earlier, `querySelector` finds
  no `theme-color` meta and the replay silently does nothing.
- The eight static `<script src>` tags are gone. The markup names no file.
- `app.css` `:root` is a neutral slate. Contrast holds: accent-text 11.7:1 on
  deep, accent-soft 7.7:1, accent-ink 4.7:1 on the accent fill.
- `paintIdentity()` writes its applied set, plus title and theme colour, to
  `iw-boot-<teamId>`, wrapped in try/catch.
- **`buckeye.html` is deleted.** Ohio State is `/?team=ohio-state`, and its
  manifest's `start_url` follows.
- Values read back out of storage are treated as **data**: a token name must
  match `--[a-z-]+`, a value carrying CSS punctuation or `url(` is dropped, and a
  theme colour must be a plain hex. The chrome colour falls back through stored
  theme colour, then the applied surface, then the neutral.
- An unknown `?team=` falls back to the default rather than loading nothing. The
  boot script therefore holds a list of known teams, which `tools/bootcheck.js`
  checks against `teams/*.js` on disk.
- `tools/bootcheck.js` (new, in `check.yml`) lifts the boot script into a stubbed
  page. Four negative controls were **observed failing**: replaying a set
  regardless of which team stored it, dropping the value sanitising, injecting
  `app.js` with the rest instead of at `DOMContentLoaded`, and removing the team
  whitelist.
- **OPEN QUESTION — 7B.** The service worker still precaches the default team's
  config, artwork and snapshots. A worker cannot read the page's choice at
  install time. A second team works online, because its files are fetched and
  cached on demand, but not offline on a first visit; and a switch leaves the
  previous team's snapshots in the data cache.
- **OPEN QUESTION — 7C.** `?team=` is a mechanism, not an experience. Where a fan
  selects a team, and whether teams get their own URLs rather than a query
  string, is a product decision.
- **KNOWN GAP.** On a browser's first ever visit to a non-default team, the tab
  title and the header's own words are the default team's for the moment before
  `paintIdentity()` runs. The colours and the browser chrome are not — those go
  neutral. Fixing the text the same way means storing it per team, which is what
  the replay already does from the second visit on.

## Owner

David (product: that the team should be selectable; 7C remains his) / Claude Code
(the mechanism and the checks)

## Related Documents

- `docs/engineering/first-paint-team-tokens.md` — the bug that set the rules
- `docs/decisions/0009-identity-is-team-data.md` — identity as configuration
- `docs/decisions/0008-snapshots-are-owned-by-declaration.md` — what a second
  team does and does not get
- `tools/bootcheck.js`
