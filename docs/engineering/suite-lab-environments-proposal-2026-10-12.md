# Suite environments: Production, Suite Lab and PR Previews

**Status:** Proposed architecture for product decision, 2026-10-12.
**Reason:** Long-running W16 offseason and future Suite experiences must be
usable on a real phone months before release. Screenshots and GitHub PRs are
not substitutes for an installable, functioning preview.

## Current state (verified in repository)

- Production: `main` published on GitHub Pages at
  `https://dmvanblaircom.github.io/Project-LND/`. The PWA manifest and
  service worker are rooted relative to the deployed site's own origin.
- `app.js` hardcodes `https://suite-api.dmvanblaircom.workers.dev`;
  `worker/src/index.js` only permits the production GitHub origin via CORS.
  The Worker owns live refresh triggers and stateful push subscriptions.
- No branch-specific production-equivalent preview deployment is configured.
  Existing review HTML/screenshots under `docs/design` aren't app builds.
- Do **not** deploy a feature to `main` merely to enable David's visual review.

## Recommended three viewing lanes

| Lane | Intended behavior | Branch | Hosting |
|---|---|---|---|
| **Production** | Current fan-facing Suite, no unapproved feature | `main` | Existing GitHub Pages, unchanged |
| **Suite Lab** | Stable hands-on app combining unfinished approved work, on iPhone, safely retained for weeks/months | `lab` (new protected integration branch) | A separate Cloudflare Pages project, with `lab` set as that project's *production branch* only |
| **PR Preview** | A working, isolated URL for each UI/data feature before Lab or production promotion | Short `feat/*`, `design/*`, `codex/*`, `preview/*` branch | Same Cloudflare Pages project, branch/PR preview URLs |

The Cloudflare Pages project's word **production branch** means the stable
**Suite Lab** site, NOT Suite's fan-facing production. `main` stays on
GitHub Pages. Pages preview branch controls should include deliberate development
branches only: exclude `scan/*`, `probe/*`, and data-refresh branches to
avoid excess deployments.

Do not invent an accessible Lab/PR URL before Cloudflare creates one. Add
actual URLs to the ledger/PR on first successful deployment.

## Publish a real application, not the repository

Introduce `tools/build-preview.*` to copy an allowlisted set of runtime
files to a fresh output directory (not the repository root):
`index.html`, `manifest.json`, `sw.js`, `app.js`, `app.css`,
`chooser.js`, `suite/`, `teamos/`, `teams/`, `leagues/`,
`assets/`, and user-facing `data/` snapshots. Exclude secrets, internal
docs, CI scripts, fixtures, workflow files, Worker source and proprietary
research. Verify the output with an automated route/asset/worker test.

Environment is **explicit build metadata**, not a browser hostname guess:
`production | lab | preview`, `commitSHA`, `branch`,
`apiBase`, `fixtureMode` and read-only capability flags. A distinct,
unmissable but modest `LAB` / `PREVIEW` badge and build SHA in Settings
must distinguish it from production. Lab should install as **Suite Lab**
(separate manifest name and icon treatment, while retaining Suite identity);
preview branches should be easy to distinguish too. Since each environment
uses its own **origin**, PWA service workers, storage, and caches are isolated
from the GitHub Pages production app. Never publish two competing workers
under the same scope.

Preview branches should be protected by Cloudflare Access; also protect the
root Lab site separately, because the Pages preview-access switch alone does
not secure the project's root URL. Noindex isn't access control.

## Backend and safety boundaries: mandatory before using real functionality

1. The production Worker remains `suite-api`, with its existing CORS,
   Durable Object, refresh clock and game alerts untouched.
2. Create a separate `suite-api-lab` Worker with its own configuration,
   domain, credentials and **separate data store** when interactive
   server-backed features need testing. Do not bind production Durable
   Objects or push subscriptions. Disable scheduled refresh/alerts by
   default, and never send lab push alerts to real subscribers.
3. Lab/preview frontend builds must use the lab API. Until it exists,
   block and visibly label API-dependent features rather than silently
   calling production. Existing direct public read-only sources may work
   if licensing/CORS permits; never publish an unsourced score as live.
4. For long-horizon features (offseason S2/S4, January rollover, errors,
   unannounced schedule), add **Lab-only scenarios** with clearly labeled
   fixtures, not production data mutations. Fixture selector and
   `?scenario=` shortcuts must be absent from production builds.
5. Test Access authentication and PWA offline/refresh behavior on a physical
   iPhone; Access sessions and cached app behavior need special attention.
6. No deployment workflow should mutate production push stores,
   GitHub refresh clocks, branch data producers or production Worker secrets.

## Promotion flow and ownership

- **PR Preview:** engineers push the feature branch; Pages automatically
  builds a working app URL and posts it to the PR. David can try the
  screen/interaction and check real responsive behavior.
- **Suite Lab:** approved/interesting but unreleased features are integrated
  via PR into `lab`. Keep the long-running environment available for
  broader end-to-end validation and family/friend testers when authorized.
- **Production:** deliberately promote reviewed, releasable code to
  `main` through its existing CI and release approvals. Do not automatically
  merge all Lab experiments to production. Use small promotable PRs or
  explicit feature flags with a documented default-off policy.
- UI parity and scenarios: ChatGPT/design + Codex. Backend and lab Worker:
  Claude. David: acceptance and production release decision. GitHub
  run/PR screenshots remain supporting evidence, not visual sign-off.

## First milestone: prove the pipeline without disturbing production

1. Confirm project naming and private access policy with David; configure
   Cloudflare Pages Git integration on the existing GitHub repo.
2. Create `lab` branch from current `main` and publish a *baseline*
   app with no speculative flags. Create working root Lab URL.
3. Add the runtime allowlist build, environment metadata and suite-specific
   nonproduction visual label. Check assets, teams, manifest, service worker,
   offline handling and no production API writes.
4. Prove two PR preview URLs, ideally `#134` offseason component and the
   next UI refinement; open on iPhone and test controls and distinct preview
   fixtures while production remains stable.
5. Only then integrate W16 into Lab when backend contracts exist and
   regression/compatibility gates pass. Keep unready work there as long
   as needed without blocking production releases.

## Release/preview ledger addition

Each feature entry should carry:
`feature | PR | preview URL | Lab status | scenario/fixtures | visual approval | functional QA | prod decision | actual release SHA`.
Distinguish **built**, **viewable in Lab**, **production-ready** and
**deployed**. Never infer a live preview from a branch, passed CI or
screenshot artifact.

## Open decisions

- Stable Lab URL: keep Cloudflare-generated Pages hostname initially;
  a custom `lab` domain can be added later. Do not claim it already exists.
- Lab and preview Access: prefer restricted to David and explicitly
  invited testers. Cloudflare account configuration and GitHub app
  authorization require account-owner action.
- Server-backed features: whether to introduce the isolated Lab Worker in
  milestone 1 or only when first demanded. Until then its routes remain
  disabled, not connected to production.

References: `docs/09_AI_OPERATING_SYSTEM.md`,
`docs/engineering/current-architecture.md`, `README.md`,
`worker/wrangler.toml`, Cloudflare Pages Git integration and preview docs.
