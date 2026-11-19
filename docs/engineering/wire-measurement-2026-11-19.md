# The wire: the fresh measurement (2026-11-19)

The gate for the wire (F1 step b; David, 2026-11-11): it ships only once a fresh sample of headlines, published after 2026-11-10, clears **90% precision**. The first measurement (`wire-measurement-2026-11-09.md`) scored 88.1%, and the rule was corrected after it, so that figure could not count.

## Method

- **The rule:** `TeamOS.wire.classify()` as last changed in 74ab058d3 (2026-11-11T03:42Z), unchanged since.
- **The sample:** `node tools/wiremeasure.js --since 2026-11-11 --sample <file>`. It covers every story first seen on or after 2026-11-11 in the 138 teams' beat feeds: **6,533 stories**. None of them was read while the rule was written.
- **Drawn:** every story the rule tagged, up to 40 a kind (101 in all), and 200 of the stories it left, at random.
- **Grading:** by hand under David's taxonomy of 2026-11-09. Grades are in `wire-grades-2026-11-19.json`; each mislabel carries a note. Where a call was close, the story was graded against the rule.

## What the rule tagged in the fresh corpus

| Kind | Tagged | Graded | Correct | Precision |
|---|---|---|---|---|
| availability | 74 | 40 | 38 | 95.0% |
| commitment | 58 | 40 | 37 | 92.5% |
| coaching | 11 | 11 | 11 | 100.0% |
| suspension | 4 | 4 | 3 | 75.0% |
| injury | 4 | 4 | 4 | 100.0% |
| transfer | 2 | 2 | 0 | 0.0% |
| drafted | 0 | 0 | - | - |
| **all** | **153** | **101** | **93** | **92.1%** |

**Precision 92.1%: the 90% gate is met.** The 95% interval is 85.1% to 95.9%, so one sample of 101 clears the bar without proving it by a wide margin. Weighted by how often each kind occurs, the estimate is 92.8%.

## Every mislabel

- **suspension**, should be news: "Border War Suspended in 2027". A rivalry series was paused; no player was suspended.
- **transfer**, should be news: "Three positions of need for Arkansas in transfer portal". Analysis; no player moved.
- **transfer**, should be news: "Even After Transferring to Kansas, Trey Lathan is Giving Back to WVU Children's Hospital". A feature about a player who transferred earlier.
- **commitment**, should be news: "GG Banks Signs with South Carolina" and "Frashad Tisby Signs with Gamecocks". Both come from gamecocksonline.com, which covers every sport. GG Banks signed on Nov 11, basketball's early signing day, and football signs in December. The sport could not be confirmed from here, so both are graded against the rule.
- **commitment**, should be news: "'Ready to get to work': Alabama commit Stafford Willis preparing to enroll early". A commit preparing to enroll: no change.
- **availability**, should be news: "Dan Lanning Says the Quiet Part Out Loud About Jeremiah McClellan's Return From Injury". Commentary; no status reported.
- **availability**, should be news: "Terrance Green 'sets the tone' for Alabama run defense in return to action". A game story, after the fact.

## Missed (from the 200 untagged)

5 of 200 should have been wire items (2.5%; 95% interval 1.1% to 5.7%):

- **coaching:** "Jeff Lebby Makes Two Major Coaching Changes at Mississippi State After Auburn Disaster" (firings, told as "coaching changes")
- **injury:** "What We Know About Tait Reynolds's Injury, Heading to Locker Room in Georgia Tech Contest"
- **injury:** "Pitt QB Holden Geriner Dealing with Injury Before Florida State Game"
- **availability:** "Iowa Football Injury Update: Star WR Tony Diaz 'Has a Chance' To Play vs. Illinois"
- **availability:** "Lewis Carter back on the field, ready to help UCF finish season strong"

That suggests about 160 missed wire stories against about 142 found, so **recall is roughly 47%**. The range is wide, 28% to 67%, because 5 in 200 is a thin estimate. The first measurement estimated 77%.

The rule is built to miss rather than mislabel, and this is the side it errs on. A fan sees fewer wire items, not wrong ones.

## What this means

- **Step (b) is met.** The wire can take its place on Home with Stage 2 (step c, CD's design), as David approved on 2026-11-11.
- **Leave the rule as measured.** Tuning it on these grades would void this measurement. The two clear fixes, a series "suspended" and the portal analysis pieces, can wait for a later round with its own fresh sample.
- **A source note.** An official athletics site's feed carries every sport, so a basketball signing can read as a football commitment. A per-source "football only" filter belongs with the news producer, not the wire rule. Not urgent: two stories in 6,533.
