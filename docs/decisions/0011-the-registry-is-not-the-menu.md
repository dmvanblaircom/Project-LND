# Decision: the FBS registry is not the list of teams you can choose

## Status

Accepted

## Date

2026-09-20

## Decision

Two different things, kept apart on purpose:

```text
teams/index.js     every FBS program - 138 of them - so the chooser can show the league
teams/<id>.js      a TeamOS config, which is what makes a team selectable
```

A team becomes available by **someone writing its configuration**, and by nothing else. `teams/index.js` carries a `built` flag, but that flag is *derived from the contents of `teams/`* by `tools/teamindex.js` rather than maintained by hand, and the same tool fails the build when the two disagree. There is no second list to remember to edit.

```text
FBS registry  ->  is there a teams/<id>.js?  ->  selectable  ->  ?team=<id>
                                             ->  otherwise, listed but not offered
```

Resolution order in `boot.js`, completed:

| The visit says | What happens |
|---|---|
| `?team=<id>`, usable | that team, and it is remembered |
| `?team=<id>`, not a usable id | the fallback team, **not** remembered, `LND.rejected` set |
| `?team=<id>`, usable but no config | the fallback team, once, and the id is forgotten |
| nothing in the URL, something remembered | the remembered team |
| nothing at all | **the chooser** |

An id that cannot be honoured is answered with a team, not with a question: the visitor asked to open something, and the chooser would be a non-sequitur. A visit that asked for nothing is asked.

## Context

- **FACT.** Phase 7A made the team a run-time choice but defaulted a bare URL to Notre Dame, because the chooser did not exist yet.
- **DECISION (David, 7B brief).** The registry and the available teams are deliberately different concepts. Indiana and BYU should be in the registry now and become selectable when their configs exist, "without requiring us to update a second hardcoded picker list". A true first visit gets the chooser; Notre Dame stays the fallback for an unrecoverable selection.
- **FACT.** The enumeration of FBS membership is not trivial to get right. The site API's team list is capped at 500 and silently omits 16 FBS programs; its standings payload was missing an entire conference the day this was written. Walking group 80's conferences in the core API gives all 138.
- **FACT.** Two ids needed fixing from the first generation: `Texas A&M` produced `texas-aandm` and `San José State` produced `san-jos-state`.

## Options Considered

### A hand-kept list of available teams

The obvious thing, and the thing the brief explicitly ruled out. It is a second source of truth about something the filesystem already knows, and it goes stale the first time someone adds a config in a hurry.

### Probe for each config at run time

Truly automatic, and 138 requests to find out which two exist. Rejected.

### Derive the flag, and fail the build when it drifts (chosen)

`tools/teamindex.js` regenerates the registry from ESPN plus the contents of `teams/`, and in its default mode verifies the checked-in file against that folder. Adding `teams/indiana.js` and not regenerating is caught in CI, by name:

```text
FAIL built teams match teams/*.js  (registry: notre-dame, ohio-state | on disk: indiana, notre-dame, ohio-state)
1 registry check(s) FAILED - run: node tools/teamindex.js --fetch
```

## Rationale

The registry answers "who plays FBS football", which is a fact about the world and changes when conferences realign. Availability answers "what have we built", which is a fact about this repository and changes when someone commits a file. Conflating them would mean editing a list to describe something the filesystem already says — and the two would drift.

## Consequences

- `teams/index.js` (generated) — 138 programs with id, name, nickname, abbreviation, ESPN id and conference. About 19KB, loaded **only when the chooser is shown**, and precached in the shell so the chooser works offline.
- `tools/teamindex.js` — `--fetch` rebuilds from ESPN (network, run by hand when membership changes); the default mode verifies, and is wired into `check.yml`.
- `boot.js` — the chooser, and the absent-versus-malformed distinction above. It still names no team beyond the one fallback constant.
- `app.css` — the chooser's rules, added before the responsive section so the stylesheet's ordering rule holds. It paints in the deployed team's tokens, because no team config has loaded yet; that is a cosmetic accident of a first visit and not worth a second palette.
- **ASSUMPTION.** The id is `slug(location)` — accents folded, ampersand dropped — which is also the config filename and the `?team=` value. It is stable as long as ESPN's `location` for a program is stable.
- **OPEN QUESTION.** Conference realignment changes the registry, and only a human running `--fetch` will notice. A scheduled check could watch for it; that is not worth building until it has happened once.
- **KNOWN LIMITATION (accepted, decision 7 of the brief).** A crawler sees `index.html`'s static head for every `?team=` link, so shared links preview generically. GitHub Pages does no server-side rendering and per-team HTML was explicitly retired.

## Owner

David (decisions) / Claude Code (implementation)

## Related Documents

- `docs/engineering/phase-7-team-selection.md`
- `docs/decisions/0009-identity-is-team-data.md` — what a team config carries
- `boot.js`, `teams/index.js`, `tools/teamindex.js`
