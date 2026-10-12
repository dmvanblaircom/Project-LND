# FPI Rankings integration

David authorized Codex to continue ready work while preserving Claude's
remaining source/service tasks until October 14 at noon America/New_York.

## Implemented in this branch

- `#top25/rankings/fpi`, alongside CFP, AP and Coaches. The default remains
  CFP when published, otherwise AP. Games and team rank badges are unchanged.
- The existing scheduled `data/league/fpi.json` producer and pure
  `TeamOS.ratings.fpi` adapter are used unchanged. The adapter is now loaded
  and precached with the shell.
- Rank, overall rating, record, the provider's seven-day rank change, season,
  edition date and source link. Zero and negative ratings remain values.
- The selected team's row is highlighted. If outside the top 25, a separate
  line reports its source rank without inserting it into the top-25 order.
- The prior-season edition explicitly says it is not current. A missing or
  failed request never claims the source has not published.
- A failed or malformed refresh keeps the table already shown. An optional
  saved copy draws first. A service-worker HTTP 200 fallback remains stale
  and does not start the 30-minute network-success timer. Re-entry,
  reconnection and Refresh Data recover; concurrent requests are joined.
- The page's warning depends on its selected source only. FPI publication
  time does not advance merely because an unchanged file was fetched again.

No SP+ production control is shown before its source works. The renderer's
`ratingSources`, `ratings` and `ratingsFailed` inputs accept a further
normalized source; the browser check exercises five choices at 320px.

## Claude's SP+ handoff

Read `docs/engineering/rankings-sources.md`: permission is already recorded.
Use the existing edge API and CFBD, credited to SP+ and CFBD. Do not publish
CFBD payloads as repository snapshots, expose its key, or scrape around the
ESPN article's access restriction. Confirm the actual payload/season and
edition semantics before implementing the pure TeamOS adapter.

Return the established Rating model from `teamos/ratings.js`, with
`key: "sp-plus"`, `label: "SP+"`, `kind: "rating"`, source identity, season,
current, publication/retrieval timestamps, top-25 rows and team identity.
Do not invent movement or an update timestamp when the source lacks them.
The renderer currently labels movement using `changeWindow`; if SP+ has no
compatible edition comparison, Codex should omit the movement column rather
than imply a seven-day SP+ change. Coordinate that small presentation change.

Keep source load state independent. Wire the fifth source only after tests
cover its authoritative payload, failure, cache fallback, freshness, retry,
season rollover and ND/OSU identity. No changes to Games' ranking source.

## Validation / review status

`tools/ratingsflowcheck.js`: 66 browser assertions passed locally, including
the real service worker, failures/retry, malformed/partial payloads,
per-source warnings, old seasons, negative/zero values, history navigation,
both teams/styles and 320/375/390/768/1280. Text contrast is measured on the
actual render. Images are intentionally failed in this deterministic check;
the existing CI visual job checks provider images separately.

Also passed: ratingscheck, bootcheck, swcheck, suitecheck, controllercheck,
pollcheck, JavaScript parsing and csscheck. Full CI and David's visual
acceptance remain separate gates. Browser-width checks are not physical
iPhone certification. This branch is not deployed.

Independent of mobile-layout PR #126. If that merges first, retain both
sets of changes and assign a new `sw.js` VERSION before integrating this PR.

## Review-branch integration on October 12

The mobile fix PR #126 and docs handoff PR #128 were already merged.
The FPI files above were applied to the latest main on a fresh review branch
and checked byte-for-byte against PR #127's implementation (except the fresh
worker version `suite-2026-10-12fpi3`). Existing main changes remain intact.
CI, manual design approval and production verification are still outstanding.
Do not merge or deploy this review branch without those gates.
