# 0045: Kalshi's markets removed; Season Outlook shows ESPN's projections

**Status:** Decided by David, 2026-11-19.

## Context

Season Outlook showed Kalshi's prediction-market prices for making the playoff and winning the national title. Suite read them from Kalshi's public API every 30 minutes and committed them as files in this public repository (`data/league/odds-*.json`, and a price history per team).

David asked Kalshi for written permission (2026-11-17). Kalshi Institutional answered on 2026-11-18:

- Showing Kalshi prices to other people needs a data license, the Display & Internal Use license, even in a free app.
- That license is issued to a registered business; a sole proprietorship with a registered DBA qualifies. It is fee-free for the first 12 months.
- Until a license is in place, Kalshi asked that Suite remove the data.
- Storing the data in a public repository is not covered even with a license, because it lets anyone download the raw data. Display and caching for display are allowed; stored files must be kept private.
- Credit, under a license, reads "Powered by Kalshi Research" (brand kit, no logo).

## Decision

1. **Remove Kalshi's data from Suite now.** That covers the refresh steps that read it, the adapter (`teamos/markets.js`), each team's Kalshi declaration and price history, and the stored files. The files' past versions remain in git history; they are not rewritten out (David).
2. **Season Outlook shows ESPN's FPI projections instead.** ESPN publishes, in the FPI table Suite already reads, every FBS team's chance to make the playoff and to win the title. The FPI producer now keeps them, with the previous edition's values for the change. Every team now has a Season Outlook, where Kalshi priced 59.
3. **Pursue Kalshi's license separately.** If a license is granted, Kalshi's prices could return beside ESPN's, each named for what it is and never averaged. They would have to be cached privately (for example in the edge API) rather than committed here.

## Consequences

- A team's numbers are ESPN's model, not a market. They agree on the order of teams (rank correlation 0.94 on 2026-11-13) and typically sit 3 points apart, and 10 to 20 points apart on the playoff bubble (`docs/product/around-data-availability-audit.md` §4.14).
- The odds update once a day, when ESPN publishes, not every 30 minutes.
- About Suite credits ESPN for Season Outlook, and says projected odds are not betting advice.
