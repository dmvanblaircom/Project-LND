# The data refresh clock

**Why it exists.** GitHub runs scheduled workflows best-effort. The refresh
asks for a run twice an hour and gets one every 2 to 5 hours: eight runs on
game day, 2026-09-19. Decision 0020 promises every 30 minutes around a game.
An outside clock that starts the workflow on time is what keeps that promise.

**What it is.** A free [cron-job.org](https://cron-job.org) job that, every 30
minutes, asks GitHub's API to start the "Refresh team data" workflow. It holds
a token that can do exactly that, on this repository only. The workflow
decides what each run does (decision 0020): odds and news every run, the
depth chart every run in a game window and every 2 hours otherwise.

**Is it working?** You can check this without looking at anything:

- The freshness monitor (`tools/producers/freshness.py`) runs at the end of
  every refresh.
- Inside a game window, if two runs are more than 45 minutes apart, it opens
  a GitHub issue labelled `data-freshness`, once per game, and GitHub emails
  you.

About 10 minutes, once.

## 1. A token that can only start this workflow

GitHub → Settings → Developer settings → Personal access tokens →
**Fine-grained tokens** → Generate new token.

| Field | Value |
| --- | --- |
| Token name | `Project LND refresh clock` |
| Expiration | 1 year (set a calendar reminder a week before) |
| Repository access | Only select repositories → `dmvanblaircom/Project-LND` |
| Permissions → Repository → Actions | **Read and write** |

Leave everything else at *No access*. Copy the token. GitHub shows it once.

## 2. The job

At cron-job.org, create a free account, then **Create cronjob**:

| Field | Value |
| --- | --- |
| Title | `Project LND refresh` |
| URL | `https://api.github.com/repos/dmvanblaircom/Project-LND/actions/workflows/odds.yml/dispatches` |
| Schedule | Every 30 minutes (custom: minutes `7,37`, every hour, every day) |
| Advanced → Request method | `POST` |
| Advanced → Headers | `Accept: application/vnd.github+json` |
| | `Authorization: Bearer <the token>` |
| | `X-GitHub-Api-Version: 2022-11-28` |
| | `Content-Type: application/json` |
| Advanced → Request body | `{"ref":"main","inputs":{"source":"clock"}}` |

Choose **Test run**.

- **Success:** the response is `204 No Content`, and a new "Refresh team data"
  run appears in the repository's Actions tab within a minute.
- **401:** the token is wrong.
- **403 or 404:** the token lacks Actions write access, or is scoped to
  another repository.

`"source":"clock"` matters. Without it, every run looks like a person
pressed the button, and the depth chart would be fetched every 30 minutes all
week instead of every 2 hours outside game windows.

## When the token expires

The clock's runs stop and GitHub's own scheduler carries on at its slower
pace. On the next game day the monitor opens a "runs too far apart" issue. To
fix it, make a new token (step 1) and paste it into the job's `Authorization`
header.

## Why not something else

| Option | Why not |
| --- | --- |
| More cron lines in the workflow | GitHub drops them the same way; this is load on GitHub's side, not ours |
| A workflow that loops and sleeps | Burns runner time just to wait, and GitHub's terms scope Actions to building, testing and publishing the project |
| A backend or hosted scheduler | Infrastructure for one HTTP call every 30 minutes (`CLAUDE.md`: no backend without a product need) |
