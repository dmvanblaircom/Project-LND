/* TeamOS - Season Outlook: which market metrics a team actually has.

   Season Outlook shows a team's prediction-market odds - making the playoff,
   winning the national title. Each market is independent (decision 0024
   §12): a team the playoff market prices but the title market does not
   shows its playoff number alone, cleanly. There is no "No market" card,
   and a missing companion number is never made up. Only when NO supported
   market has a value does the section go.

     metrics({ playoff: m|null, title: m|null }, now)
       -> [ { key, label, value, change, asOf, stale } ]   in a fixed order
       -> []                                              hide the section

   A market value m is { value: percent, previous?: percent, asOf?: ISO,
   cached?: true }. A cached value - the source could not refresh, the last
   good copy is shown - is still a value (0022 #4): it is kept, and marked
   stale so the Suite can say "as of" (0024 §13) instead of replacing useful
   data with "Unavailable".

   This file names no provider and no team. */

var TeamOS = TeamOS || {};

TeamOS.outlook = (function () {
  "use strict";

  // The order the metrics read in, and their names - as the canonical Home
  // reference sets them.
  var MARKETS = [
    { key: "playoff", label: "Playoff" },
    { key: "title",   label: "National Title" }
  ];

  function num(v) {
    var n = typeof v === "number" ? v : parseFloat(v);
    return isFinite(n) ? n : null;
  }

  function metrics(markets) {
    markets = markets || {};
    var out = [];
    MARKETS.forEach(function (m) {
      var x = markets[m.key];
      var value = x ? num(x.value) : null;
      if (value == null || value < 0 || value > 100) return;       // unsupported: this one alone is hidden
      var previous = x.previous == null ? null : num(x.previous);
      out.push({
        key: m.key, label: m.label, value: value,
        change: previous == null ? null : Math.round((value - previous) * 10) / 10,
        asOf: x.asOf || null,
        stale: !!x.cached
      });
    });
    return out;
  }

  return { metrics: metrics, MARKETS: MARKETS };
})();
