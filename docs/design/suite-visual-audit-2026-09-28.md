# Suite visual audit

September 28, 2026 · Recommendations only; no application code changed

## Reconciliation addendum (September 28 evening)

This audit is preserved as review evidence. The active execution order and subsequent decisions are in `docs/engineering/backlog.md` and take precedence. Instrument Sans + Instrument Serif were already selected in the September 25 backlog decisions; the license-purchase recommendation in V02 is superseded. Team colors stay; unlicensed teams use the approved Instrument fallback after implementation. Home's approved future preview is last result plus next three games (four rows), superseding this audit's three-game preservation note. PR #12 already removed the current-chart top changes list; issue #30 adds back only a compact optional disclosure. Issue #31 removes battle/open-jobs framing at Week 2 publication while preserving OR listings. Broad visual recommendations still need reference/prototype approval before rollout; queuing the pass does not approve unseen pixels.


## Assessment

Suite has a useful, consistent implementation of the screen structure. It does not yet have the visual finish of the approved image references. The biggest differences are the photographic art direction, the balance of typography, the amount of space consumed before content, and the repeated card treatment. These are visible design differences, not evidence that the application needs a new framework or a backend rewrite.

Codex can implement a materially closer result. Changing coding agents alone will not produce it: the implementation needs approved assets, measurable component specifications, and repeated browser screenshot review. Use the existing TeamOS/Suite boundary and improve the presentation in a separate visual branch.

## Evidence and limits

- Live production: `https://dmvanblaircom.github.io/Project-LND/`, inspected September 28. About displayed version `2026-09-28a`.
- Source snapshot: main at `42a9945`. Later deployed head `e52ee0b` has the same application code; changes are snapshots and documentation.
- Mobile evidence: GitHub artifact `suite-visual-smoke`, artifact ID `10947063827`, commit `650d0f0`, created September 28. Downloaded 176 screenshots. Reviewed representative 320/390 phone layouts and desktop captures across the screen families. GitHub comparison from that commit through `e52ee0b` shows only data/documentation changes, so the presentation code matches.
- Mobile screenshots use fixtures, including artificial schedule combinations and fallback news tiles. Their data is not a statement about production. Real news images and headshots were observed loading in the live browser.
- Visual authority: the ten locked images in `Project-LND-Suite-Canonical-References.zip`, with decisions 0022/0023/0024 and subsequent release decisions taking precedence over incidental mockup content. The withdrawn vNext designs were excluded.
- Live inspection covered the chooser, ND Home, pregame Game, final Game/Box Score/Plays/Stats, Top 25 Games and Rankings, Schedule and Results, Roster/Depth/Availability, More, News, Settings, Feedback and About. Also inspected Ohio State Home and roster, Suite Style on ND, and lower Home/About content. Mobile CI review adds second-team and responsive evidence.
- This is a visual audit, not a fresh full regression certification. No current live game was available. Drive Tracker and exceptional live states still need a dedicated visual pass with coherent captured game data. The CI files named `home-livenav` and `game-livenav` show a pregame body; their names do not prove a full live-screen review. Safari browser chrome, installed PWA safe areas, zoom and keyboard behavior were not retested on physical devices.

## Priority order

| ID | Priority | Work | Classification |
|---|---|---|---|
| V01 | First | Restore photographic atmosphere | Approved fallback; asset/art-direction follow-up |
| V02 | First | Complete Suite Style brand integration | Explicitly deferred, not a release regression |
| V03 | First | Reduce overuse of condensed display type | New refinement to approved Team Style |
| V04 | First | Rebalance headers and content density | New refinement; team ownership principle already established |
| V05 | First | Make final-game winner visually clear | Reference-contract correction |
| V06 | Next | Differentiate surfaces and reduce card repetition | Visual refinement |
| V07 | Next | Improve Home news proportions and hierarchy | Visual refinement; feed prioritization is a separate product decision |
| V08 | Next | Tighten rankings and roster entry points | Visual refinement; preserve all data relationships |
| V09 | Next | Improve game statistics and play presentation | Refinement plus existing deferred play-text work |
| V10 | Next | Refine schedule row alignment | Visual refinement |
| V11 | Polish | Simplify utility screens and navigation detailing | Visual refinement |
| V12 | Process | Add an explicit visual acceptance gate | Workflow recommendation |

## V01. Photography is the largest missing ingredient

**Observed:** Home, Game and mastheads use gradients with oversized, rotated team-logo watermarks. Neither current team config declares hero art. The references use a close gold helmet, stadium light, campus atmosphere and layered depth. A logo watermark cannot deliver the same emotional effect.

**Important distinction:** decision 0024 section 10 explicitly approved the fallback as a shipping state and did not require photography for release. This is an asset gap and a deliberate next investment, not a claim that Claude ignored that decision.

**Recommendation:** create or supply an approved deployable image set for Home/Game and mastheads, with separate crops suited to those shapes. Use restrained directional overlays instead of darkening the entire image equally. Keep text in deliberately quiet areas. Retain the existing finished fallback for teams without imagery. Notre Dame's helmet stays plain gold, with no ND logo overlaid on it.

**Acceptance:** at 320, 390 and 1280, the subject is recognizable, text contrast passes, focal points are not cut off, and failed imagery reveals the fallback without a broken-image icon or layout jump. Test photo and fallback states separately. If multiple art roles are needed, declare them in team identity and normalize them through TeamOS; do not add team-specific branches to screen code.

**Files:** team identity configs, `teamos/identity.js`, `suite/ui.js`, `suite/home.js`, `suite/game.js`, `app.css`.

## V02. Suite Style is still the provisional brand

**Observed:** the optional style still uses cobalt actions (`#2F5BEA` / `#2A52D6`), provisional champagne (`#E4CF9E`), Barlow, an ivory page (`#F6F4EF`) and white cards. The shipping Suite wordmark is installed correctly, but the broader brand system is not.

**Approved direction:** Ink `#111D35`, Pearl `#F1F2F0`, Champagne `#D4B896`, Bronze `#B8845A`, Slate `#485563`, Charcoal `#1A1A1A`; Neue Haas Grotesk primary and Canela selectively. No cobalt action system. Champagne and bronze should work like jewelry: small, deliberate details.

**Recommendation:** finish a role-by-role Suite Style mapping. Prototype Ink actions on light surfaces and Pearl actions on dark surfaces; use champagne/bronze for small rules and accents, not every button. Final placement remains a design decision. Obtain the required webfont licenses before shipping commercial fonts; choose an explicitly approved fallback in the meantime.

**Acceptance:** first paint and live switching show the same tokens; there is no cobalt left in Suite Style; Pearl placements are intentional; Team Style remains the default and retains team colors; both teams pass contrast and font-loading/fallback checks. Preserve the production wordmark aspect ratio and full-bleed PWA icons.

**Files:** `suite/ui.js` (`STYLE`), `app.css`, first-paint identity handling, font loading in `index.html`. This is broader than replacing ten color values.

## V03. Condensed type is doing too many jobs

**Observed:** Barlow Condensed appears in mastheads, tab labels, position headings, menu labels, score/stat numbers and small metadata. Georgia carries Home section titles and story headlines. The combination often reads as an athletic utility dashboard rather than the restrained premium experience in the references.

**Recommendation:** keep the athletic display face for team identity and selected score moments. Move navigation, utility headings, menu names and table labels to the normal-width UI face. Establish three clear levels: display identity, readable content headings, quiet metadata. Reduce all-caps and letter-spacing outside short labels. This does not require replacing Team Style's entire approved type family.

**Acceptance:** compare identical data at 320 and 390; names and tab labels fit without reducing essential text; numbers use tabular alignment; metadata remains readable. Treat this as a new Team Style refinement, not a retrospective claim that the approved Barlow decision was wrong.

**Files:** shared typography selectors in `app.css`, team font declarations only if the selected direction actually requires them.

## V04. Headers consume too much space and desktop alignment breaks down

**Observed:** ND mastheads occupy about 230 pixels on the inspected desktop. The logo and page title sit near the far left while the content begins in a narrow centered column. On phones, Roster combines a large masthead, peer tabs, source card and unit control before the first player. In the 390 capture the first player starts around the middle of the initial viewport.

**Recommendation:** align masthead inner content to the same container as the body on desktop. Give utility pages a compact team-aware treatment. Reserve the richest art for Home/Game and selected sports sections. For Roster, tighten the masthead and combine the report title, source and report context into one compact block. Keep actual control hit areas at least as usable as today.

Your later direction that the active team owns the experience supports a quieter Suite presence. The exact revised header composition still needs a visual decision; the current compact Suite header follows the older release contract.

**Acceptance:** at 1280, header identity, title and body share clear alignment; at 390, materially more roster/table content appears before scrolling without shrinking body text. A proposed first target is saving roughly 60-90 pixels above Roster content; validate visually rather than treating that target as an already approved spec. Keep Top 25 visibly national in scope.

**Desktop scope:** the current 40rem maximum column is an intentional phone-first choice. A wider two-column desktop Home is a separate enhancement. Fix alignment first; do not stretch tables merely to fill the window.

## V05. Final scoreboards need winner emphasis

**Observed:** the live ND-Purdue final shows 49 and 10 in identical white type and weight. `teamBlock()` in `suite/game.js` has no final winner/loser styling. Home's score renderer likewise does not assign a winner treatment.

**Recommendation:** when a final has both valid scores, emphasize the winner and soften the losing side while preserving readable contrast. Use a non-color cue such as a winner mark or stronger weight. Apply it consistently to Home and Game, including games opened from Schedule. The emphasis must follow the winner even when the active team loses.

**Acceptance:** ND win, ND loss, OSU win, tie, live game and incomplete-score fixtures. Ties stay balanced; live games do not receive final winner treatment. Never infer a winner from a missing score. The separately documented missing-final-score product decision should be handled explicitly, not silently changed during this work.

## V06. Cards need a hierarchy, not one treatment everywhere

**Observed:** the shared 14px rounded card and shadow are used for news, lists, source summaries, tables and utility content. Many screens are a stack of similarly elevated white boxes. The references feel more like integrated editorial surfaces with a few important cards.

**Recommendation:** define three surface roles: page canvas, flat content panel, elevated feature card. Keep strongest depth for hero/featured content; flatten tabular lists and source metadata. Use spacing and a fine divider before adding another box. Standardize border contrast and corner radii by component role.

**Acceptance:** no nested panel looks like an unrelated widget; each screen has one clear focal point; separators remain visible; interactive boundaries are still understandable. Do not remove useful touch affordances just to achieve a flatter screenshot.

## V07. Home needs better editorial proportions

**Observed:** desktop forces three news cards into a roughly 585px content area, producing narrow cards and heavily truncated headlines. Mobile uses 80%-width horizontal cards, showing one story plus a sliver, whereas the reference presents a broader view of the news. The large hero and generous vertical stacks push Schedule and Season Outlook well down the page.

**Recommendation:** establish an explicit responsive news layout. At medium widths, use two readable cards or a wider scroll rail; only use three columns when each card has adequate headline width. On phones, prototype around 65-70% card width with a clear next-card preview, then choose based on headline readability. Tighten nonessential hero spacing and section gaps; do not miniaturize type to imitate an AI mockup's density.

**Acceptance:** long real headlines stay useful before truncation; card images share a deliberate crop; metadata baselines align; all three preview stories remain reachable by touch and keyboard. Keep the approved three-story/three-game limits.

**Separate product opportunity:** both live team Homes led with national ESPN stories. Team relevance could improve the feeling of entering a team's space, but changing story prioritization is a feed/product decision, not a CSS correction.

## V08. Rankings and Roster can feel much more precise

**Rankings observed:** title, primary tabs, poll selector, CFP information notice and table card form five stacked layers. The unavailable-CFP note occupies prominent space even while AP is selected. The table itself is one of the clearer screens and should be preserved.

**Rankings recommendation:** simplify the control stack and move the CFP explanation to a less dominant location or the CFP view, subject to approval of that display policy. Align team marks optically, maintain fixed numeric columns and keep the selected-team highlight restrained. Account for the already queued FPI/SP+ work when selecting a scalable poll control; do not squeeze five labels into the current three-way layout.

**Roster observed:** all real depth levels and OR relationships survive, and provider headshots make a meaningful difference. The stacked controls and individual position-card chrome are heavy. The small red `O` availability badge is easy to read as another jersey number.

**Roster recommendation:** reduce framing around metadata; use one consistent row grid and optical headshot crop. Prototype a short `Out` badge or clear status legend. Keep name, jersey, depth level and OR relationships primary; hometown and physical details remain secondary. Preserve official position order and the distinction between unknown and missing matches.

**Acceptance:** all 25 rankings remain accessible; all roster levels/OR entries remain intact; long names fit; no fake player chevrons; unit navigation remains reachable while scrolling; OSU continues to omit tabs for unavailable capabilities. No added player profile feature is implied.

## V09. Game details need editorial finishing

**Observed:** the pregame hero is dominated by a centered opponent label and small flat marks. The Stats screen uses one continuous share bar with active-team color plus pale gray, rather than the clearer opposing bars of the visual reference. Plays retains raw provider phrasing. The final Box Score is orderly but visually undifferentiated.

**Recommendation:** improve optical balance between marks, matchup identity and event metadata. Give weather and odds deliberate separation; the current Home flex metadata visibly crowds the dot separator. Prototype mirrored stat bars around the metric label, or add a much clearer two-team key if retaining share bars. Preserve truthful metric direction: fewer turnovers/penalties can be better. Give scoring events and drive summaries stronger grouping, with time and down/distance consistently aligned.

**Acceptance:** comparison direction is instantly understandable; zero/missing stats and ties do not fabricate a result; provider text is retained where safe structured fields cannot replace it. Validate live Drive Tracker, scoring play, turnover, long drive, paused game and final from coherent captures. Do not invent facts or use a free-text parser to rewrite play meaning.

**Files:** `suite/game.js`, `suite/home.js`, `app.css`. Safe play-text presentation is already a deferred item; the new work should close it rather than duplicate the backlog.

## V10. Schedule rows need stronger column discipline

**Observed:** mobile rows carry date, site pill, logo, opponent, venue, rivalry, kickoff, network and odds. Text wraps into several uneven lines; the right metadata stack can become as prominent as the opponent. Results are simpler and read better.

**Recommendation:** lock a repeatable date column and opponent baseline. Make kickoff/result the secondary anchor; group network/odds as quieter supporting text. Keep rivalry context below the opponent where available. Reduce pill prominence, especially when a list repeats the same site state.

**Acceptance:** a long opponent name plus a long venue and TV name works at 320 without overlapping columns or deleting facts. The next game is identifiable without a large tinted block. Completed/neutral/postponed rows preserve their meanings and route ownership.

## V11. More and utility pages need less ceremony

**More:** menu structure and icons are sound. Use normal-width labels, lighter separators and a compact masthead; the oversized sports banner competes with simple menu tasks. Preserve Share Suite as an action and do not add a destination chevron to it.

**Settings:** retain native radios and the clear Team/Appearance/Data groups. Reduce nested card framing. A small visual preview of Team versus Suite Style could help, but it is an optional enhancement, not required to fix the current design.

**Feedback:** the mailto explanation and visible address are useful. Keep them. The large masthead and card elevation are the main polish opportunities; no new form or sent state is warranted.

**About:** use a compact product introduction with the approved wordmark; simplify source-list typography and spacing. Keep actual sources and independence copy intact. This review does not evaluate legal sufficiency.

**Navigation:** retain the five destinations, scoreboard icon, More ownership rules, and separate selected/live/paused states. Tune optical icon weight, label baseline and active indicator together. Verify that the raised live Game control never hides content or obscures which tab is selected.

**Chooser:** preserve its approved composition and functionality. Only shared brand-token/navigation/browser treatment should touch it. No chooser redesign is recommended.

## V12. Define visual acceptance separately from CI correctness

The current checks can prove contrast, no overflow, image fallbacks and routing without proving that the result resembles the reference. A polished image and a functional screenshot need an explicit design comparison.

1. Create a visual-only branch from current main. Preserve routes, data contracts, caching, refresh behavior and existing tests.
2. Establish one approved 390px Home and Game implementation with real content. Compare against the canonical reference side by side, with browser chrome removed consistently. Record intentional differences.
3. Lock the component rules: type roles, surface roles, header dimensions, spacing, art crops, icon metrics and selected states.
4. Propagate those rules to Roster, Top 25, Schedule and the utility pages. Team Style stays default; Suite Style gets its own approved token mapping.
5. Review 320, 375, 390, 768 and 1280. Include long content, missing art, failed headshots, loading, stale/offline, pregame, live, paused and final. Add physical Safari/PWA checks for safe areas and text scaling.
6. Require a small evidence set with matching route, team, state and data at each visual approval. Passing automated checks is necessary; it is not visual approval.

## Preserve and defer intentionally

Keep the working wordmark/icon assets, provider headshot fallback, strict player joins, adaptive roster tabs, source attribution, stale-data recovery and route ownership. Do not restore obsolete image artifacts: Tickets, Coaches, Home search/share, unsupported player links or made-up CFP dates. TV names as text and team marks instead of helmet logos were deliberate implementation choices.

The following remain separate backlog work: Season Outlook full field, offseason Home, rivalry context source, FPI/SP+ rankings, and safe play-text presentation. Their absence is not a new visual regression. Final brand integration belongs in this next visual pass because it directly affects the requested result.

## Recommended first implementation slice

Start with approved Home/Game imagery, typography roles, header proportions and final winner treatment. Produce before/after screenshots before propagating the changes. These will have a much larger visual effect than changing individual chevrons, adding stronger shadows, or starting a second application.

No branch, commit, issue or production change was made by this audit.
