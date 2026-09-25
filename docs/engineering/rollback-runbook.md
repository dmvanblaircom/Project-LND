# Rollback runbook: the Suite release

For the single merge of PR #4 into `main` (Sunday 2026-09-27). Rehearsed on
2026-09-25 against the real trees: Irish Watch → Suite → back to Irish Watch.

## When to roll back

Roll back when fans cannot use the app and a fix is not minutes away:
- the page is blank or errors on load
- the production check (`verify-production.yml`) fails on something fans
  see, and a quick fix is not obvious
- Home, Game or Schedule show wrong scores or data
- the installed app does not open

**Roll forward instead** (a fix PR into `main`, with a `VERSION` bump) when
one screen or one detail is wrong and everything else works. A fix and a
rollback reach fans the same way (below), and a fix keeps the release.

## How PR #4 is merged

With a **merge commit**, not squash or rebase, so the whole release is one
commit to revert. Record its SHA in the Sunday report.

## Rollback steps

1. **Revert the merge on `main`.** Branch from `main`, run
   `git revert -m 1 <merge-sha>`, then open a PR and merge it (or push it,
   if the checks cannot be waited for). This restores Irish Watch exactly as
   it was, worker included.
2. **In the same PR, patch the restored `sw.js`** so phones drop the Suite
   caches and take the old app as a new version:
   - `var VERSION = "iw-2026-09-24c";` → a new name, e.g.
     `var VERSION = "iw-<date>r";`
   - in the `activate` handler,
     `if (k.indexOf("iw-20") === 0 && k !== SHELL && k !== DATA)` →
     `if (/^(iw|suite)-20/.test(k) && k !== SHELL && k !== DATA)`

   Without the patch the rollback still works, but every phone keeps the
   Suite release's caches (about half a megabyte) forever.
3. **Wait for Pages** to deploy (`pages-build-deployment`, a minute or two).
4. **Do not rely on `verify-production.yml` after a rollback.** It checks
   for *this release's* identity (the Suite manifest, the wordmark) and will
   fail against Irish Watch by design. Check by hand instead: open the site,
   see Irish Watch, and check `sw.js` shows the new `VERSION`.
5. **Record it** in `docs/engineering/suite-redesign-completion.md`: why,
   when, and the SHAs.

## What fans see

Rehearsed with the real worker, 2026-09-25:

| Open | Plain revert | Revert + patch (step 2) |
|---|---|---|
| 1st after the rollback deploys | Still Suite (served from cache while the old worker installs) | Still Suite |
| 2nd | Irish Watch | Irish Watch |
| Left on the phone | Suite caches, forever | Only the rollback's own caches |

The rollback reaches a fan on their **second** open. The instant reload the
Suite release added lives in the Suite worker, and the restored Irish Watch
worker does not have it. Fans who never opened Suite see no change at all.
Saved team choices (`iw-team`) and App Style carry across both ways.

## Re-releasing after a rollback

Merge the fixed release as a new PR with a `VERSION` newer than the
rollback's. The Suite worker's update reload then works as designed again.
