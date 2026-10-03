# Home and Game refinement — October 3, 2026

David assigned the UI order: Home/Game, Stats, navigation/motion, brand/type,
FPI, photography, Season Outlook full field, notifications, offseason. This
is the first slice. The code began from main `ec10c0d`, after Claude's player
stats, season model, CFP calendar, news-source tile and latest iOS navigation
fixes merged. No open PR existed at the initial October 3 check.

## Requested corrections

- Matchup arrows and highlights now follow the displayed value for each of
  the nine metrics. Points allowed and rushing/passing defense reward fewer;
  the other six reward more. Ranks remain source facts, not a prerequisite
  for comparison. Ties and missing values have no edge. The screenshot's ND
  versus UNC values mark ND in eight rows and UNC in rushing offense.
- Home's Outlook metrics share grid rows for values, wrapping labels, bars
  and optional timestamps, keeping adjacent probability tracks aligned.
- The beat-news producer retains thumbnails from media metadata, image
  enclosures and article HTML in RSS/Atom. Home and News share a photo →
  publisher logo → source-name fallback. Source HTML is parsed, never
  displayed. A failed fallback is removed rather than retried in a loop.

Publisher fallback addresses were read from the publishers' own page metadata
on October 3. Ten declared feeds have an explicit logo; UHND has no verified
logo in this review and retains the source-name tile if its article image
fails. A local refresh yielded 60/60 article-image URLs for each team. This
is URL availability in the feeds, not a guarantee that every image CDN is
reachable on every fan's connection. Existing snapshots acquire the fields
on the next normal refresh after release; the schema is backward compatible.

## First visual pass

Home's hero spacing is tighter. News uses a readable rail at phone and
desktop widths, showing a preview of the next story instead of squeezing
three narrow desktop cards. Game conditions keep their centered placement,
with a quiet separating rule. Scoring drives have clearer spacing between
the summary and individual plays. Finals soften the losing score through
weight and color; ties, live games and missing scores remain balanced.

The unified SUITE header, OSU Nunito Sans, phone schedule-name fixes, current
navigation behavior, conditions hidden below 360px, and compact depth-chart
changes/arrows remain. The font/color overhaul and new hero photography are
later slices, in David's order. No canonical-reference parity is claimed:
those externally held images are still absent from this checkout.

## Verification and review

`matchupcheck` reproduces all nine screenshot values and checks missing,
tied, zero and negative values. `newscheck` covers RSS/Atom image extraction
and URL safety. `suitecheck` checks winner emphasis without invented scores.
`homegamecheck` checks both teams/styles at 320/375/390/768/1280, probability
alignment at normal and doubled text size, and both news surfaces through
successful and failed photo/logo states. Existing release gates still apply.

The local comparison preview and screenshots are review artifacts. The
earlier standalone preview at `5bbe08a` is superseded. New visual treatment
needs David's review before propagation, per the delivery handoff; automated
checks establish behavior and layout constraints, not visual approval.
