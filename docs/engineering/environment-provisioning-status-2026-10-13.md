# Suite environment provisioning: implementation and cutover

David authorized creation of private DEV, Lab (QA/UAT), and feature previews on
October 12. PR #135 contains executable prerequisites. **Cloudflare resources,
GitHub protected environments/rules, and DEV/Lab branches are not provisioned.
No hosting URL or successful cutover is being claimed.** The Cloudflare browser
session was signed out, and secure authentication did not complete.

## Prepared implementation

| Component | Implementation | Activation |
|---|---|---|
| Allowlisted static app | `tools/build-environment.cjs`; runtime files only, separate source/data/asset SHA-256 digests and full commit SHA | Committed candidate build |
| Cloudflare build | `node tools/build-pages-preview.cjs`; output `artifacts/pages` | Connect existing GitHub repository in David's Cloudflare account |
| DEV/Lab/preview identity | Explicit `env-config.js`, shared `suite/environment.js`, visible badge and Settings revision; separate install names | Generated per build; no hostname-based environment selection |
| API isolation | Nonproduction rejects the production API, never requests push permission or writes subscriptions; an absent test API stays unavailable | Connect isolated API after Access is enforced |
| Read-only Lab API | `worker/src/lab.js`, `worker/wrangler.lab.toml`, `deploy-lab-api.yml` | Separate token/provider key, exact origins, Access; `SUITE_NONPROD_INFRA_ENABLED=true` only afterward |
| Live sports snapshots | `publish-snapshots.cjs` publishes producer-success JSON to `data-live`; `pages-artifact.yml` combines main code with live content | GitHub Pages Actions source plus `SUITE_DATA_PIPELINE_ENABLED=true` at coordinated cutover |
| Weekly registry | `roster.yml` opens a PR into DEV after cutover, rather than pushing generated code to main | `SUITE_REGISTRY_TOKEN` and active promotion flag; CI must be triggered by the identity |
| Promotion | Exact ancestry/ref gates, source-branch CI, source deployment smoke, reviewer Environment, non-force ref update, target deployment/asset smoke | Restricted promotion identity, rules, reviewers, actual URLs; promotion flag remains OFF |

## Exact provisioning sequence

1. Finish signing in to David's existing Cloudflare account. Verify the account
   that owns `suite-api`, retaining production's Worker, secrets and schedule.
2. Connect **only** `dmvanblaircom/Project-LND` to a new private Lab Pages
   project. Framework: None; root: repository root; build command:
   `node tools/build-pages-preview.cjs`; output: `artifacts/pages`.
   Stable project branch: `lab`. Preview branch allowlist: `dev`, relevant
   `feat/*`, `codex/*`, `design/*`, `automation/*`; exclude main, data-live,
   scan/probe and stale archive branches. Disable automatic builds until the
   initial baseline and access policy are ready.
3. Protect both the project's root hostname **and** its preview hostnames
   with Cloudflare Access before publishing application content. Grant David
   alone initially; no wildcard email-domain allow, public bypass, or anonymous
   access. Add a narrowly scoped service-token policy for CI smoke checks.
   Test root, DEV alias and an immutable preview anonymously: each must deny
   access or require authentication. Test David's allowed identity separately.
4. Provision `suite-api-lab` from its separate config, no cron or Durable Object
   binding. Use a separately provisioned Lab CFBD key and a nonproduction-only
   deployment token. Protect the API with Access as well. Include the exact
   verified Pages origins in CORS. The frontend may remain read-only with API
   features unavailable while this step is incomplete. Never substitute the
   production API to make a preview appear functional.
5. Merge the infrastructure bootstrap only after PR CI succeeds. Promotion is
   still OFF; all migration paths remain dormant until the coordinated switch.
   Create `data-live` from that approved main baseline. Verify the composed
   production artifact locally, then switch GitHub Pages to **GitHub Actions**
   and enable its independent-data pipeline. Run the refresh and artifact
   deployments, verifying original production URLs, source SHA, asset hashes,
   freshness and PWA behavior. If this fails, pause branch initialization and
   reconcile; do not claim the cutover complete. The clock remains on main and
   dispatches the same odds workflow; its output branch is now data-live.
6. With both direct-main writers addressed, initialize `dev` and `lab` to the
   **same current main SHA**. The weekly registry will remain in its transitional
   main-writer mode until promotion activation; pause its scheduling or ensure
   no run can occur in this narrow initialization window. Protect main and lab
   against human/producer direct pushes, force pushes and deletion. Restrict
   update bypass to the promotion identity. Require passing PR CI on dev.
   Retarget open feature PRs to dev without merging unreleased features.
7. Create `suite-lab` and `suite-production` GitHub Environments with David as
   required reviewer, and restricted main-only workflow dispatch. A single owner
   must be able to approve his own requested release; verify plan/account
   support rather than relying on prose. Restrict who can edit secrets, flags
   and environment settings. Use an installation-token identity capable of
   triggering deployments and satisfying update rules; a default Actions token
   does not trigger ordinary downstream push workflows.
8. Enable Pages automatic deployments for lab and selected preview branches.
   Verify both real URLs and capture first manifests. Configure the nonproduction
   API URL only after its safety/access checks pass. Configure CI service auth.
9. Dry-run candidate building, CI/deployment verification, normal promotion,
   disabled-state and drift rejection. Verify an installed Lab on David's
   physical iPhone, including expired Access, offline launch, refresh, separate
   storage, and distinct install identity. The initial builds distinguish their
   names/badges; PNG icons retain the canonical Suite artwork.
10. Only after every infrastructure/acceptance item passes, set
    `SUITE_PROMOTION_ENABLED=true`. Confirm the registry now opens DEV PRs.
    Perform DEV → Lab; record David's UAT against the exact deployed SHA.
    Production needs a separate release approval. Infrastructure creation is
    not approval to release the offseason feature in PR #134.

## Configuration to record after creation

| Kind | Names |
|---|---|
| Repository variables | `SUITE_DEV_URL`, `SUITE_LAB_URL`, `SUITE_PRODUCTION_URL`, `SUITE_NONPROD_API_BASE`, `SUITE_LAB_ORIGINS` |
| Cutover flags (OFF until their checks pass) | `SUITE_DATA_PIPELINE_ENABLED`, `SUITE_NONPROD_INFRA_ENABLED`, `SUITE_PROMOTION_ENABLED` |
| Nonproduction secrets | `CLOUDFLARE_NONPROD_API_TOKEN`, `CFBD_LAB_API_KEY`, `CF_ACCESS_CLIENT_ID`, `CF_ACCESS_CLIENT_SECRET` |
| Restricted update identities | `SUITE_PROMOTION_TOKEN`, `SUITE_REGISTRY_TOKEN` (review scope/expiration and rule compatibility during provisioning) |
| Existing account secret | `CLOUDFLARE_ACCOUNT_ID`; production's token/provider/clock/VAPID secrets remain separate |

Secret values belong in the providers' secure secret stores, never this file,
build metadata, app assets, issue bodies, or logs. Record actual resource IDs,
URLs, deployment manifests and access-test results in issue #136 after success.

## Verification completed in this implementation

- All four static builds package only allowlisted runtime assets and identify
  the environment/commit. Production keeps its Suite name and API behavior.
- Deployment smoke verifies actual asset bytes, source digest, environment,
  full SHA and install identity; wrong SHA/environment and mixed assets fail.
- A temporary Git remote proves snapshot publication advances data-live and
  leaves main unchanged; code files/invalid JSON fail before publication.
- Promotion ancestry/disabled/drift checks pass using a temporary Git remote.
- The read-only Lab API rejects production/uninvited origins, all push routes,
  non-GET operations, and missing configuration; has no scheduler/store.
- Browser checks cover DEV/Lab/preview, both teams, at 320 and 390 pixels:
  badge/revision visible, no edge/push requests, no errors or page overflow.
- Existing production alert and Settings flow checks pass. Full CI is still
  required before bootstrap merge. Physical iPhone and hosted access/deployment
  verification remain pending because the environments do not yet exist.
