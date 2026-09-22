# Decision: the roster is fetched by the Action, not typed

## Status

Accepted

## Date

2026-09-22

## Decision

`teams/index.js` is **generated**, weekly, by `.github/workflows/roster.yml`.
Three inputs, each answering the one question it can:

```text
scoreboard?groups=80   ->  WHICH programs are FBS      (ESPN ids)
teams?limit=500        ->  what each one is CALLED     (location = the program)
the filesystem         ->  which ones we can RENDER    (teams/<id>.js exists)
```

`tools/build-registry.js` joins them on the ESPN id and writes the file.

**The roster is a union across runs.** No week contains every program — byes,
and the occasional non-FBS opponent — so the generator adds what it sees and
never removes what it has. It converges over a few runs, and it refuses to
shrink.

**Two fields are preserved, never generated:** `name`, when the product calls a
program something the provider does not, and `conference`, which neither
payload carries. Those are the only things to hand-edit in that file.

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

- **FACT.** Nothing in any `/teams` payload marks division, so an unfiltered
  dump cannot be filtered after the fact either.
- **FACT.** `scoreboard?groups=80&limit=400` *does* honour the group. It is the
  request `TeamOS.espn.scoreboardUrl()` has used since Phase 4A and the Top 25
  has been built on it ever since.
- **FACT.** A scoreboard's team object carries `id` and display names but not
  `location`; the roster payload carries `location`, which is the program
  ("Ohio State") where a display name carries the nickname too ("Ohio State
  Buckeyes"). Hence the join.
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
  It validates both payloads before the generator sees them, reruns
  `registrycheck` and `choosercheck` on the result, and commits only a change.
- **`teams/index.js` is no longer hand-authored.** Its header says so. Editing
  the roster there is overwritten on the next run; editing `name` or
  `conference` is not.
- Out of season the scoreboard is legitimately empty. That is not an error: the
  generator changes nothing and the Action commits nothing.
- `registrycheck` grew 12 checks covering the generator, including that it
  makes no network request of its own. Three negative controls **observed
  failing**: dropping conference preservation, declaring availability instead
  of deriving it, and replacing the union with an overwrite — the last of which
  fires the shrink guard, which is what that guard is for.
- **The registry is still four programs until the Action runs.** Nothing was
  back-filled here, because the only scoreboard available in this session was
  synthetic.
- **OPEN QUESTION — conference.** Neither payload carries it, so a filled
  registry groups everything under "Independent". Either a source is found, or
  the chooser stops grouping by conference. At 134 programs on a phone,
  alphabetical with a search box is likely the better answer anyway, and that
  is a Suite question for the visual system rather than a data one.

## Owner

David (that the roster should be solved, and the conference question) /
Claude Code (the mechanism and the checks)

## Related Documents

- `docs/decisions/0014-one-registry.md` — one list, availability derived
- `docs/decisions/0012-second-stats-provider.md` — the Action path
- `docs/decisions/0016-no-team-yet-is-a-state.md` — what reads the registry
- `tools/build-registry.js`, `.github/workflows/roster.yml`
