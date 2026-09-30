# Suite's edge API (decision 0030)

Our own small API on Cloudflare Workers. Suite calls it; it holds provider
keys server-side, fetches, caches, and returns only what a screen shows.

- Code: `worker/src/index.js` (no dependencies). Checks:
  `node tools/workercheck.mjs` (in CI).
- Deploy: `.github/workflows/worker.yml`, on every change to `worker/` on
  main, or from the Actions tab. Until the secrets below exist it stops
  green with a notice.
- Routes: `GET /v1/health`; `GET /v1/cfbd/season?team=&year=` (CFBD season
  stats for one team, only the fields in `CFBD_FIELDS`, which stays empty
  until a real response has been read with the CFBD probe below).
- Only Suite's origin (`https://dmvanblaircom.github.io`) may read it from
  a browser. Responses carry `fetchedAt`; a cached copy served because the
  provider failed carries `stale: true`.

## One-time setup (David, about 15 minutes)

1. **Cloudflare account** (free): sign up at dash.cloudflare.com. Open
   *Workers & Pages* once; if it asks you to choose a `workers.dev`
   subdomain, pick one (for example `suite`).
2. **Account ID:** shown on the *Workers & Pages* overview page. Copy it.
3. **API token:** profile menu → *My Profile* → *API Tokens* → *Create
   Token* → template **Edit Cloudflare Workers** → limit it to your account
   → create. Copy it (Cloudflare shows it once).
4. **CFBD API key** (free): request one at collegefootballdata.com; it
   arrives by email.
5. **GitHub secrets:** repository → *Settings* → *Secrets and variables* →
   *Actions* → *New repository secret*, three times:

   | Name | Value |
   | --- | --- |
   | `CLOUDFLARE_API_TOKEN` | the token from step 3 |
   | `CLOUDFLARE_ACCOUNT_ID` | the ID from step 2 |
   | `CFBD_API_KEY` | the key from step 4 |

6. Tell Claude. Claude runs *Deploy the edge API* and *Probe CFBD field
   names* and checks both.

None of these values ever goes in the repository.

## After setup

- **Is it up?** `https://suite-api.<your-subdomain>.workers.dev/v1/health`
  answers `{"ok":true,...}`; the deploy workflow checks this itself.
- **Rotating a key:** replace the GitHub secret and re-run *Deploy the
  edge API*.
- **Next on this Worker** (decision 0030): the refresh clock (replacing
  cron-job.org) and notifications (W19). Kalshi stays on GitHub Actions.
