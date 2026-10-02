# Ohio State's sources (W20 feasibility, 2026-10-02)

The question: what can Ohio State's Suite have of what Notre Dame's has
beyond ESPN? That is price history, beat writers, the official depth
chart and the availability report. Every source below was probed from
GitHub's network, which is the production runner's
(`probe-sources.yml`, `probe-feeds.yml`). This development environment
cannot reach most of them.

| Kind | Finding | State |
|---|---|---|
| **Price history** | The Kalshi markets Ohio State already declares. | **Shipped:** `data/ohio-state/odds-history.json`, from 2026-10-02 forward. There is no back-fill. |
| **Beat writers** | Feeds that work from the runner, with stories this morning:<ul><li>Land-Grant Holy Land (SB Nation): `https://www.landgrantholyland.com/rss/current.xml`, 10 stories.</li><li>Ohio State On SI: `https://www.si.com/college/ohiostate/feed`, 90 stories.</li><li>On3's Ohio State feed: `https://www.on3.com/teams/ohio-state-buckeyes/feed/`, 30 stories. It mixes in national On3 stories, as Notre Dame's Blue & Gold feed does.</li></ul>Feeds that are refused:<ul><li>Eleven Warriors (403).</li><li>Buckeyes Wire and The Columbus Dispatch (402, paywall).</li><li>cleveland.com (403).</li><li>Buckeye Sports Bulletin: its site is suspended.</li></ul> | **David's call:** the three working feeds mirror Notre Dame's mix (an SB Nation site, SI, On3). |
| **Availability report** | The Big Ten requires four reports a week for conference games in 2026 (Wednesday, Thursday and Friday by 8pm ET, and two hours before kickoff), published on BigTen.org. The documents are PDFs at `bigten.org/api/media/file/<uuid>-FB_Reporting_Week_<n>.pdf`, per search results from 2023. No static page on bigten.org links this season's: not the announcement, the weekly release or the football page. The site loads them with script. | **Next step:** find the listing the site's script calls (from the runner), then reuse `official_depth.py`'s PDF handling. Non-conference games have no report. |
| **Depth chart** | Ohio State publishes no weekly depth chart: `ohiostatebuckeyes.com/sports/football/depth-chart/` is a 404, and coverage is media projections (Ourlads, Eleven Warriors). | **None.** Roster shows Depth Chart as unavailable, honestly, never as a projection. |

The probes store and commit nothing (`tools/probe_sources.py` lists a page's
links and PDFs about availability, depth charts and injuries; never text).
