# Project LND backlog

**Refreshed 2026-11-09**, clean-slate answers 2026-11-11, from every source we have:
- the previous queue ([archived](backlog-archive-2026-10-23.md));
- the product briefs, decisions 0001-0043 and the redesign spec (v1.2, #237);
- the open pull requests;
- David's requests since September 21, from this project's session and its context summaries.

Conflicting and finished items are removed, and each removal is listed under [Removed or superseded](#removed-or-superseded) with the reason.

This is the only active list. A brief or decision holds the detail; this file holds the order, the status and the gate.

## How to read it

**Status:**
- *approved*: David has approved the item.
- *proposed*: needs David's decision.
- *in review*: built and waiting on review.
- *blocked*: waits on someone outside the project.
- *parked*: David set it aside, with a reason.

**Gate,** the one thing that must happen before work moves:
- **D:** David decides or merges.
- **CD:** ChatGPT, as Creative Director, designs or reviews (decision 0040).
- **C:** Claude can proceed on its own and merge on green under decision 0039.
- **X:** someone outside the project.

**Standing rules** (unchanged):
- Notre Dame is data, not code.
- Parity is the floor, then each Suite becomes its own (0038).
- Merges follow decision 0039; the redesign follows decision 0040.
- No fabricated data, and no new source, key or cost without David.
- Secrets live only in repository secrets.
- Email is drafted only, never sent.
- Branches are deleted by David.

---

## 1. In flight

**Clean slate, 2026-11-09** (David: merge every open PR so the redesign is the sole focus). Merged: #237 spec v1.2, #243 this backlog, #241 play-by-play freshness, #238 Stage 1 foundation, #239 Stage 1b components, #244 `TeamOS.wire` groundwork. #135 (DEV/Lab environments) closed as paused, its branch kept.

| PR | What | Status | Gate |
|---|---|---|---|
| #240 | Desktop header navigation (0042) | open on purpose: it ships with Stage 2's wide Home and Game (0042 §6; David, 2026-11-09) | lands with R1 |

**Also in flight, approved 2026-11-11:** a first-time push confirmation, so a fan who turns on alerts sees one confirmation instead of a test alert each time (C).

**While the redesign is the focus** (David, 2026-11-09), the only other work is: live operations and bugs (F5, F6, §5), and the readers for every school's notes and depth charts (F4). Everything else in §3-§4 waits for the redesign.

## 2. The Suite redesign program (decision 0040)

The order below is the program. ChatGPT designs, David approves, and Claude builds against the approved design.

| # | Item | Status | Gate |
|---|---|---|---|
| R1 | **Stage 2: Home.** Every lifecycle state (pregame, live, final, S2, S4, S5) on phone, tablet and desktop. Includes: the desktop header navigation (#240); the wire's place above the news (0043, F1); Season Outlook's one-line standing that opens Around; Suite Style's hero marks in champagne (0041) | approved scope; waiting on design | CD: the wide Home composition and the wire row |
| R2 | **Stage 3: Game.** Scoreboard, tab strip, pregame, live and final. Moments wired from `TeamOS.moments`. A refresh that ends a play-by-play catch-up is reconciliation, never a moment (#241) | approved scope | CD per stage; after R1 |
| R3 | **Stadium art.** Night Bowl, The Tunnel, Under the Lights: original art to the NCAA accuracy standard. The pipeline (`--s-art-env`) is ready | approved | CD creates. Claude integrates; no substitutes |
| R4 | **Phase 3: propagation.** The approved visual language on Around, Roster/Players, News, Schedule, More and Settings. Each destination's own items are in §4 | approved direction; screens not designed | CD, tab by tab |
| R5 | **Phase 4: validation.** Notre Dame and Ohio State, both styles, every state and width, accessibility, offline, PWA install and update, and a physical iPhone | approved | D: device observations |

## 3. Approved product features

| # | Item | Status | Gate |
|---|---|---|---|
| F1 | **The wire, Phase 1** ([brief](../product/wire-brief.md): taxonomy and decisions of 2026-11-09). Status-change headlines in seven categories: Injury, Availability, Suspension, Transfer, Coaching, Commitment, Drafted. Steps: **(a)** groundwork, merged (#244); **(b)** measurement, at least 90% precision, to David. First run, 2026-11-09 (`docs/engineering/wire-measurement-2026-11-09.md`): 88.1% on held-out headlines, so the gate is not met. David, 2026-11-11: it ships only after a fresh sample of headlines published after 2026-11-10 clears 90%; bare "Availability Report" headlines stay off; the opponent's items stay up through the final; **(c)** Home's row with R1; **(d)** Around's wire, first out of season, with R4; **(e)** alerts, off by default, with separate switches for the team and the opponent in game week. Alerts need the Worker to read the news snapshots and a per-article "already sent" key | approved | (b) D; (c) and (d) CD; (e) D approves the Worker change |
| F2 | **Around, the rest of the approved build** ([navigation brief](../product/navigation-brief.md) steps 3-4): **(a)** conference standings, after a source probe; **(b)** the out-of-season sections month by month, from data in hand (standings and bowls, Signing Day classes, Draft picks by school, next season's slate and opponents, final and preseason polls) | approved | (a) C probes; (b) CD designs with R4 |
| F3 | **Live refresh on Around's Top 25 games** (David, 2026-11-08: no way to force a play update on a Top 25 game). Auto-refresh runs every 30 s while live; the visible refresh experience is the gap | approved need | CD: direction requested |
| F4 | **Readers for every school's game notes and depth charts** (David, 2026-10-30: "soon"). Every team links its notes today; only Notre Dame and Ohio State are read. Generalise by layout family (mostly SIDEARM PDFs), school by school, behind a check. Depth: 12 sources found | approved | C, in batches; a review sheet per batch to D |
| F5 | **Offseason rollover** (W16), live this season. S2/S4 Home and the Recruiting and Draft cards are live; S5 hero fixed (#236). Verify the real transition when each team's season ends (late November to January) | approved; verify live | C watches and fixes |
| F6 | **Postseason alerts, first live season.** Weekly CFP releases through Dec 1, Selection Day Dec 6, bowl and playoff set or declined (2025: ND declined its bowl). Fix from what the real payloads show | approved; live | C watches |

## 4. Proposed: needs a brief, a design or a decision

**Parked during the redesign (David, 2026-11-11).** Nothing here is built ahead of the design: each item comes up in its own tab's creative review (R4), or after it.

Grouped by where it would live, for the tab-by-tab creative review. Within each group, rough value order.

### Home
- **Last Time Out** (game notes #4). Last game's notables in one card until kickoff. Data: the notes.
- **A countdown that ticks** on Home, where today it shows the date (audit).
- **Coach's press conference** in the game week (notes #5). Data: the notes.

### Game
- **"The last time…" during a live game** (notes #16): "First 300-yard rushing game since Syracuse, 2025." The most distinctive idea we have; large.
- **Win-probability line** (audit). ESPN's summary carries it. Excluded from Phase 2 by the spec, so it needs approval.
- **Assistant coaches' game-day spots** (notes #6); **stadium and travel facts** (notes #25).
- **In-game injuries: parked** (David, 2026-11-02). The feed can't say when a player returns. If picked up: report the event only, for both teams, and alert for mine.

### Around
- **Former players in the NFL** (David, 2026-11-05 and 2026-11-09; notes #24 "Irish in the NFL"). Parked until after Stage 2 (David, 2026-11-11), the Sleeper probe included. Lower priority, in Around (my team), not Home. Step 1 uses headlines Suite already reads: beat feeds keep NFL stories by design. Step 2, NFL team, role and injury status, needs a source: Sleeper's public API is unverified, so a read-only probe comes first.
- **The wire, Phase 2 sources** (wire brief). Parked until after Stage 2 (David, 2026-11-11). Recommended when picked up: a free Bluesky pass, plus quote requests to Sleeper, RotoWire and SportsDataIO, drafted for David to send.

### Roster / Players
- **Player card:** tap a player for their season line. The stats exist; nothing joins them to the roster (audit).
- **From the notes:** award watch lists (#10), player notes (#11), starts and streaks (#12), hometown and previous school (#13), NFL legacy (#14).
- **Recruit stars from 247Sports and On3**, credited, beside ESPN's. Blocked: permission requested 2026-10-24.
- **Projected NFL team for draft prospects.** Blocked: no usable mock-draft source.

### Stats and Schedule
- **From the notes:** record watch (#15), streak tracker (#17), big plays (#19), money downs (#20), scoring drives (#21), leaders per result (#22), official season stats (#23).
- **Historical stats** (W27 phase 3): past seasons and career pages, after verifying sources and athlete identity.
- **Coach file** (#18) and **program facts** (#26), under More → Team.

### News
- **"New since you last looked"**, with a stored timestamp (audit).
- **Filter by source** (audit).

### Settings and More
- **Wire alert switches** (F1e).
- **Structured feedback** (David, 2026-09-28). The smallest version structures the mail-app message; sending from the app needs the Worker, spam protection and a privacy note. Decision for David: which.
- **A first-time push confirmation** instead of the repeated test alert. Approved to build now (David, 2026-11-11); see §1.

### Platform and program
- **Every Suite its own** (0038; David, 2026-10-29). After parity: traditions, rivalries, voices and rhythms, from data and declared capabilities, never conditionals. Needs a brief, and a first team to prove it on.
- **Personalisation (W22).** Favorites shipped (#187); anything further needs a scoped brief.
- **One participation feature (W23)** and **a fan validation and measurement plan (W24)**. Each needs a brief; no analytics vendor is approved.
- **Performance, remainder** (David, 2026-10-27/28: near-zero latency). Matchup prefetch and the first-paint font fix shipped (#210). Remaining:
  - the matchup batch snapshot;
  - a per-screen request inventory measured on a phone;
  - the referee is now a re-run of the ESPN-versus-NCAA audit after the regular season (§5; decision 0044 replaced the ESPN-versus-CFBD drift check of 0037; David, 2026-11-11).

## 5. Reliability and operations (Claude, ongoing)

- **W10 bounded reliability.** Repeated same-version worker install; simplify refresh ownership only where it helps.
- **W09 release evidence and physical device checks.** David's iPhone observations, push latency, the old shared-link launch. Never claimed from CI.
- **Ohio State remainder (W20).** Conference-only availability freshness expectations. The depth chart waits on Ourlads' permission (X).
- **January verification** of polls and markets against live payloads. Keep capturing real delayed, suspended and canceled games; never label invented fixtures as real.
- **Cosmetic:** skipped-job names show a raw `${{ }}` in Actions.
- **Recheck only if it recurs:** the Top 25 table 2 px wide at Ohio State, 320 px (#154).
- **Season figures, postseason ranks (decision 0044).** The passing-offense FBS rank is computed from regular-season values; in bowl season Stats shows the whole season's value. Rank the postseason values too, once a team has played one.
- **Edge API cleanup (decision 0044).** `/v1/cfbd/season` and `/v1/cfbd/ranks` have no caller; remove them and their checks.
- **ESPN against the NCAA, again.** Re-run the 2026-11-11 audit (`docs/engineering/espn-accuracy-2026-11-11.md`) after the regular season, before trusting the figures through the bowls.

## 6. Blocked outside the project

| Item | Waiting on |
|---|---|
| Ohio State depth chart | Ourlads' permission |
| 247Sports / On3 recruit stars | their permission (requested 2026-10-24) |
| Projected NFL team | a usable mock-draft source |
| Mountain West and Conference USA availability, read rather than linked | a feed from Faktor or the conferences |
| DEV/Lab environments (#135) | David resuming; Cloudflare sign-in |

## 7. Housekeeping

- **Branch cleanup: done** (David, 2026-11-11). He deleted the 22 listed probe, capture and audit branches, and noop-temp. What remains is main, open PR branches and the old branches he chose to keep.

  Keep: open PR branches, `claude/lnd-implementation-status-owqyo9`, and anything David chose to keep (branch-cleanup.md).
- **Docs that contradict decisions,** to correct when next touched:
  - `codex-review-queue.md` is inactive since Codex's role changed (0035, 0040).
  - `current-architecture.md` gains `TeamOS.wire` and the redesign components as they land.
  - Fixed 2026-11-11: `CLAUDE.md`'s branch strategy and the blueprint's "notifications deferred".

## Removed or superseded

| Was | Why it is gone |
|---|---|
| W13 photography and W14 "targeted visual finish, no broad brand reset" | Superseded by the redesign (0040): R1-R4, art by the Creative Director (R3). No licensed photography exists |
| "Claude owns implementation and design" (0035) | The design ownership is superseded by 0040. Claude implements; ChatGPT directs design |
| Instrument Sans/Display with Georgia | Georgia retired from interface headings (spec §3.2, Stage 1) |
| The wire as "sources to weigh, none chosen; next step a brief" | The brief exists; Phase 1 is approved; the taxonomy is decided (F1) |
| Former players in the NFL, and notes #24 "Irish in the NFL", as two items | One item, in Around (§4) |
| Return as its own wire category; Surgery as its own | Return folds into Availability; Surgery into Injury (David, 2026-11-09) |
| Offseason W16 "Claude finishes #161" | Shipped (S2/S4, Recruiting and Draft cards, S5 fix). Only live verification remains (F5) |
| The Top 25 tab, "Games", out-of-season News in the nav slot | Decided: Around all year (#228, #232); News lives on Home and More |
| Performance "matchup batched" as fully open | Prefetch shipped (#210); the remainder is listed in §4 |
| Playwright upgrade and the ubuntu-24.04 pins | Done (Playwright 1.64.1) |
| The 1,000th-win dry run, logo sizing, the white launch flash, Top 25 sheet flicker, availability publishing schedule, source-health emails | Done and shipped (Oct 25 to Nov 6) |
| W25 "old branches remain; no deletion campaign" | Replaced by §7: David deletes the listed temporary branches; GitHub deletes merged PR branches automatically |
| Codex review of #152/#153 tails | Codex is ad hoc only; nothing waits on it |
