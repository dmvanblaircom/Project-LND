# Adding teams, a conference at a time

David's plan for the rest of FBS, its phases and the rules each phase
follows are in [backlog.md](backlog.md) ("The rest of FBS, in phases"). This
is how a phase is done. The first six teams were added by hand; this is the
same work, with what can be worked out from the repository worked out by
tools.

1. **Plan.** `node tools/newteams.js plan "<conference>"` lists the
   conference's programs that have no config: each one's ESPN id, its Kalshi
   market if the league's markets price it, and the On3 and On SI feed
   addresses to probe first.
2. **Probe ESPN, from GitHub's network.** Append
   `node tools/newteams.js probes "<conference>"` to `tools/probe-urls.txt` on
   the phase's branch and push: `probe-sources.yml` prints each team's names,
   colours and the venues its schedule names. A team's home venue is matched
   by substring against ESPN's, so it is written as ESPN spells it, with the
   city when another team's stadium shares the name ("Memorial Stadium
   (Bloomington").
3. **Probe the beat feeds.** Dispatch `probe-feeds.yml` with the plan's
   On3 and On SI addresses plus each school's athletics site
   (`<site>/rss?path=football` on SIDEARM sites), SB Nation site and student
   paper. Keep what works and is current, per the backlog's rule.
4. **Brand.** Each school's official palette, from its brand guide; the
   type per the backlog's rule. `tools/teamidentitycheck.js` refuses a
   palette or face that cannot be used.
5. **Write each `teams/<id>.js`,** in the shape of `teams/indiana.js`, mark
   it in `teams/index.js` (`config`), and commit its declared data files
   empty and stamped as its own (`data/<id>/`), as the four of 2026-10-27
   were. The first refresh after merge fills them.
6. **Capture the review fixtures.** Append
   `node tools/newteams.js captures "<conference>"` to
   `tools/fixtures/capture-requests.txt` and push; `capture-fixture.yml`
   commits each team's schedule and news to the branch.
7. **The review sheet.** `node tools/reviewsheet.js --teams a,b,c --out
   review.html --title "Phase 1: the Big Ten"`: each team's Home, colours with
   their contrast, faces, header label, feeds, venue, Kalshi, availability
   and trophies, on one page for David to approve in one pass.
8. **Ship.** A pull request; its checks are what a team config change needs
   (`tools/select-checks.js`).
