# The data refresh clock

**Why it exists.** GitHub runs scheduled workflows best-effort. The refresh
asks for a run twice an hour and gets one every 2 to 8 hours. Decision 0020
promises every 30 minutes around a game. A clock that starts the workflow on
time is what keeps that promise.

**What it is.** A cron trigger on Suite's edge API Worker (decision 0030;
`worker/wrangler.toml`, `startRefresh` in `worker/src/index.js`). At :07 and
:37 every hour it asks GitHub's API to start the "Refresh team data" workflow
with `source=clock`, using a token that can do exactly that, on this
repository only. The workflow decides what each run does (decision 0020): odds
and news every run, the depth chart every run in a game window and every 2
hours otherwise. (It replaced a planned cron-job.org job, which was never set
up: 2026-10-01.)

**Is it working?**

- **At a glance:** in the repository's Actions tab, the clock's runs are
  titled **Refresh team data (clock)**, one every 30 minutes. "(schedule)" is
  GitHub's own scheduler; "(hand)" is the Run workflow button.
- **The Worker:** `https://suite-api.dmvanblaircom.workers.dev/v1/health`
  says `"clock": true` once its token is set (never the token itself). The
  deploy workflow warns when it is `false`. It has been `true` since
  2026-10-01; the first clock-started run was at 11:07 UTC that day.
- **Without looking:** the freshness monitor (`tools/producers/freshness.py`)
  runs at the end of every refresh. Inside a game window, if two runs are more
  than 45 minutes apart, it opens a `data-freshness` issue saying whether the
  clock never reached GitHub or ran and stopped.

## The token (one time, about 3 minutes)

GitHub → Settings → Developer settings → Personal access tokens →
**Fine-grained tokens** → Generate new token
(github.com/settings/personal-access-tokens/new).

| Field | Value |
| --- | --- |
| Token name | `Suite refresh clock` |
| Expiration | 1 year (set a calendar reminder a week before) |
| Repository access | Only select repositories → `dmvanblaircom/Project-LND` |
| Permissions → Repository → Actions | **Read and write** |

Leave everything else at *No access*. Copy the token; GitHub shows it once.
Add it as a repository secret named **`REFRESH_CLOCK_TOKEN`** (Settings →
Secrets and variables → Actions). The next run of *Deploy the edge API* hands
it to the Worker.

`source=clock` matters. Without it, every run looks like a person pressed the
button, and the depth chart would be fetched every 30 minutes all week
instead of every 2 hours outside game windows.

## When the token expires

The clock's runs stop and GitHub's own scheduler carries on at its slower
pace. On the next game day the monitor opens a "runs too far apart" issue
saying the clock ran and stopped. Make a new token, replace the
`REFRESH_CLOCK_TOKEN` secret, and re-run *Deploy the edge API*.

## Why not something else

| Option | Why not |
| --- | --- |
| More cron lines in the workflow | GitHub drops them the same way; this is load on GitHub's side, not ours |
| A workflow that loops and sleeps | Burns runner time just to wait, and GitHub's terms scope Actions to building, testing and publishing the project |
| cron-job.org | A third account to keep; the Worker already exists (decision 0030) and its cron triggers run on time |
