# Drive time while ESPN has not filled it (live scan 2026-10-10 #6)

**Problem.** A drive in progress read "3 plays, 24 yards, 0:00" (Ohio State-Maryland, 2059Z). A fan reads 0:00 as no time used.

**Evidence (all 30 live drives captured October 10).** Every in-progress drive shown with `0:00` (7 drives) has `timeElapsed: "0:00"`, no `result`, and 1-5 offensive plays. In those payloads even the plays' own clocks stand still (five plays all at 3:03), so the time was not filled rather than zero. Every finished drive carries a result and its time. A drive just begun by a kickoff (`0 plays, 0 yards, 0:00`) has a real zero.

**Rule (TeamOS, `teamos/espn.js` `driveOf`).** A drive with no result, at least one offensive play and a `0:00` time has an unknown time: `time` is `null` and the summary drops the trailing `0:00` ("3 plays, 24 yards"). Everything else keeps ESPN's words. A finished drive's zero, a not-yet-snapped drive's zero, a missing time field and a malformed time are left as sent, and no time is computed from play clocks. Suite renders the summary unchanged.

**Tests.** `tools/adaptercheck.js` adds 8 checks on two real captures, now fixtures:
- `espn-summary-drive-unfilled-oct10.json`: the 2059Z Ohio State game.
- `espn-summary-drive-filled-oct10.json`: Notre Dame 2008Z, "4 plays, 26 yards, 1:09".

The checks also cover four synthetic edge cases: a finished 0:00, a kickoff-only 0:00, no time field, and a malformed time. On the previous `espn.js`, 6 of them fail.

**Captures (320px, Ohio State Team Style).** The header and score are a test model; the drives are the real October 10 payload.
- `drive-time-2026-10-14/osu-320-drive.png`: the Drive Tracker card reads "3 plays, 24 yards".
- `drive-time-2026-10-14/osu-320-plays.png`: the Drives list. The live drive has no time, and each finished drive keeps its own (0:46, 2:29, ...).

**Limitation.** If ESPN ever sends a genuine `0:00` for a drive still in progress after a real snap, it now shows no time instead of 0:00. Saturday's data has no such case, and a snap always runs the clock.
