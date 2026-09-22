# Decision: the roster is fetched by the Action, not typed

## Status

Accepted

## Date

2026-09-22

## Decision

`teams/index.js` is **generated**, weekly, by `.github/workflows/roster.yml`.
Two inputs, each answering the one question it can:

```text
www.espn.com/college-football/standings
  -> window['__espnfitt__']
    -> page.content.standings.groups.groups[]   a conference, by name
         .standings[].team                      its programs
         .children[].standings[].team           or its divisions'

the filesystem  ->  which ones we can RENDER  (teams/<id>.js exists)
```

One page answers every question the registry has: **which** programs are FBS
(exactly the ones on it — no Division II or III to filter out), what each is
**called** (`location` is the program, where a display name carries the
nickname), and what **conference** it plays in, which no API payload carries.

**The roster is a union across runs.** The generator adds what it sees and
never removes what it has, and it refuses to shrink. The page does list every
program, so this is not how the registry fills — it is what stops a bad parse
or a half-rendered page from emptying it.

**One field is preserved, never generated:** `name`, for the case where the
product calls a program something the provider does not. That is the only
thing to hand-edit in that file. `conference` used to be preserved too; the
standings page supplies it, so it no longer is.

**Availability stays derived**, and is now derived literally: the generator
checks the filesystem for `teams/<id>.js` rather than anyone declaring it
(decision 0014 said availability must not be asserted; this makes that true
rather than merely intended).

## Context

ESPN's `/teams` endpoint cannot produce an FBS list. Five attempts, five
distinct failures:

| Attempt | Result |
|---|---|
| `/teams?limit=500` | every division, **and truncated** — the limit applies to ESPN's internal id order, the response is then sorted by name, so it looks like a complete alphabetical list ending at Yale while Wyoming (2751), Sam Houston (2534) and Missouri State (2623) are absent |
| `/teams?groups=80&limit=500` | **ignored** — byte-for-byte the same 500 teams, D-II and D-III included. Verified by comparing two payloads whose fetched URLs the webarchives record |
| `standings?season=2026&group=80` | a stub: `{"fullViewLink":{…}}` |
| core API `groups/80/children` | `404 application error` |
| `scoreboard?groups=80&dates=…` | `400` — **my error**, adding a parameter to a request that works without it |
| `standings` with no params | the same stub — whose `fullViewLink` points at the page that turned out to be the answer |

- **FACT.** Nothing in any `/teams` payload marks division, so an unfiltered
  dump cannot be filtered after the fact either.
- **FACT.** The standings API stub's only content is a link to
  `www.espn.com/college-football/standings`. That page carries the data, as
  JSON in `window['__espnfitt__']`. Reading it is not a workaround for the
  stub; it is following the stub to where ESPN keeps this.
- **FACT, measured 2026-09-22.** That page yields **138 programs across 11
  conferences**, with Wyoming (2751), Sam Houston (2534) and Missouri State
  (2623) all present — the three the `/teams` truncation dropped — and no
  Division II or III programs at all. Every row carries a `location`.
- **FACT.** A conference either lists its teams directly or splits them across
  divisions. Both shapes appear on the same page: the Sun Belt has divisions,
  the Big Ten does not.
- **FACT.** The registry does **not** need ESPN ids. Those live in a team's
  `sources.espn.teamId`, and only a selectable team has a config. Four of the
  five attempts above were spent chasing ids the registry never wanted.

## Options Considered

### Keep asking for a payload to paste

What was happening. Five failures, each costing a round trip, and each one a
URL that could not be verified before it was sent. A session without egress is
the wrong place to iterate on an API.

### Type the roster from a reference list

Rejected, twice. A wrong name or a stale conference becomes a wrong name in the
chooser, which is the first screen a new fan sees. Conference realignment also
makes any typed list wrong within a season.

### Commit a roster snapshot the Action fetches, read alongside the registry

That is a second list, which decision 0014 forbids for good reason.

### Join a scoreboard to the roster payload

Built first, and superseded within the hour. `scoreboard?groups=80` does say
who is FBS, and joining it to `/teams` on the ESPN id does produce names — but
it needs two requests, converges over several runs because no week contains
every program, and still leaves conference unsourced. The standings page
answers all three in one request.

### Generate the registry itself, in the Action (chosen)

One file. The Action has the network access this session does not, and it can
try a request and validate the response — which is what makes an unverifiable
endpoint safe to depend on.

## Rationale

The pattern already existed. Decision 0012 established that data which is not
time-sensitive comes in through the Action, where a key is safe and a rate
limit is irrelevant. The roster changes once a year; it belongs on that path.
What is new is that the artefact is *code* rather than a snapshot — justified
because the alternative is two lists, and because generating it is what lets
availability be read off the filesystem instead of asserted.

## Consequences

- `tools/build-registry.js` (new), `tools/registry-header.txt` (the generated
  file's header, kept separate so the generator is not printing prose).
- `.github/workflows/roster.yml` (new), Tuesdays, after the weekend is final.
  It validates the page before the generator sees it, reruns `registrycheck`
  and `choosercheck` on the result, and commits only a change.
- **`teams/index.js` is no longer hand-authored.** Its header says so. Editing
  the roster there is overwritten on the next run; editing `name` or
  `conference` is not.
- Out of season the page still lists last season's alignment, which is the
  right answer until the new one exists. A run that finds nothing changed
  commits nothing.
- `registrycheck` grew 12 checks covering the generator, including that it
  makes no network request of its own. Three negative controls **observed
  failing**: dropping conference preservation, declaring availability instead
  of deriving it, and replacing the union with an overwrite — the last of which
  fires the shrink guard, which is what that guard is for.
- **The registry is filled: 138 programs, every one with a conference.**
  Generated in this session from a saved copy of the page, so the Action's
  first run has something to compare against rather than something to create.
- **Nothing about the roster is hand-maintained any more.** `conference` used
  to be the one field no provider supplied; the standings page supplies it.
  `name` is the only field still preserved across runs, for the case where the
  product wants to call a program something ESPN does not.
- **This reads a page, not an endpoint.** That is the cost of being the only
  source with conference. Mitigations, all of them verified by forcing the
  condition: no `__espnfitt__`, a truncated blob, a missing `standings.groups`,
  fewer than 8 conferences and fewer than 100 programs each refuse, in the
  Action's validation step *and* again in the generator. The roster is a union
  and cannot shrink. A restructured page fails the job loudly and leaves the
  last good registry in place.
- `tools/import-teams.js` is deleted. It existed to turn a `/teams` payload
  into rows, and that payload is no longer a source.

### The id a program gets, and the one refusal that was missing

An id becomes `teams/<id>.js` and a `?team=` value, so it has to be the
spelling a person would type. The first generated roster got two wrong:
`slug()` dropped an accented character whole rather than folding it, giving
`san-jos-state`, and spelled the ampersand out, giving `texas-aandm`. Both are
fixed — accents fold through NFD, `&` is dropped — and both rows are renamed
in place to `san-jose-state` and `texas-am`. Caught before either program had
a config, which is the only cheap moment to catch it.

**The id is ours; the name is the provider's.** An id is a file path, so it
folds: accents through NFD, apostrophes and ampersands closed up, everything
else a separator. A **name is never touched** — it is how the program is
written and it is what the fan reads. The roster keeps Hawai'i's apostrophe,
Miami (OH)'s brackets, San José State's accent and Texas A&M's ampersand,
character for character, and all 138 names were verified byte-identical to
ESPN's `location`. `registrycheck` now pins this against programs the
registry has **never seen** — the union preserves `name` for an id it already
knows, so running the real roster through would have proved only that
preservation works, never that a fresh parse keeps its characters. Both
halves are covered, and both were observed failing.

While pinning it, one gap: the ʻokina (U+02BB) was not in the fold list and
is not a combining mark, so NFD leaves it standing and it would have become a
separator. ESPN spells Hawai'i with a plain apostrophe today, so nothing was
wrong — but the ʻokina is the correct spelling and one provider change away,
and it would have silently renamed the program. Folded now, with U+02BC.

That fix exposed the one way this generator could quietly **double** the
roster. Change how `slug()` spells a name and the union keeps the old row and
adds a new one, so a program appears twice under two ids — and because nothing
shrank and nothing was dropped, **every refusal above passes**. The generator
now refuses when two rows share a name, naming the program and both ids,
because picking the id and renaming the config is a person's call. Observed
firing by reverting `slug()` and regenerating: exit 1, both programs named.

## Owner

David (that the roster should be solved, and the conference question) /
Claude Code (the mechanism and the checks)

## Related Documents

- `docs/decisions/0014-one-registry.md` — one list, availability derived
- `docs/decisions/0012-second-stats-provider.md` — the Action path
- `docs/decisions/0016-no-team-yet-is-a-state.md` — what reads the registry
- `tools/build-registry.js`, `.github/workflows/roster.yml`
