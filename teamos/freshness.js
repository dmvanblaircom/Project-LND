/* TeamOS - is what this screen shows fresh?

   Decision 0024 §13: ONE page-level freshness state, computed from the
   sources the CURRENT screen displays - never "the stalest source anywhere".
   A stale availability report does not warn on Home, which does not show it.

     current screen -> the sources it displays -> summary() -> one treatment

     summary(sources, { online, now })
       sources  [ { key, fetchedAt, cached, maxAgeMs, optional, missing } ]
                fetchedAt  when this copy was fetched (ISO or ms)
                cached     true when the network failed and the last good
                           copy is being shown instead (0022 #4)
                maxAgeMs   how old it may be before it is stale for its use
                optional   tertiary content the screen omits when absent
                missing    no copy at all
       -> { state: "fresh" | "stale" | "offline", since, keys }
                since  the oldest refresh among what makes the screen stale
                keys   which sources did

   Rules:
     - offline is the network's state and is shell-wide
     - a displayed, non-optional source that is cached or past its maximum
       age makes the screen stale
     - an optional source that is missing is simply omitted by the screen,
       so its absence makes nothing stale; a missing required one is the
       screen's own empty state, not a freshness warning

   Fresh content carries no timestamps; the Suite formats `since` only for
   the one banner. This file names no provider and no team. */

var TeamOS = TeamOS || {};

TeamOS.freshness = (function () {
  "use strict";

  function ms(t) {
    if (t == null) return null;
    var n = typeof t === "number" ? t : Date.parse(t);
    return isNaN(n) ? null : n;
  }

  function summary(sources, opts) {
    opts = opts || {};
    var now = ms(opts.now instanceof Date ? opts.now.getTime() : opts.now) || Date.now();
    var stale = (sources || []).filter(function (s) {
      if (!s || s.missing) return false;         // absent: omitted or an empty state, not stale
      if (s.cached) return true;
      var at = ms(s.fetchedAt);
      return at != null && s.maxAgeMs != null && now - at > s.maxAgeMs;
    });
    var oldest = stale.reduce(function (min, s) {
      var at = ms(s.fetchedAt);
      return at != null && (min == null || at < min) ? at : min;
    }, null);
    if (opts.online === false) {
      return { state: "offline", since: oldest, keys: stale.map(function (s) { return s.key; }) };
    }
    if (!stale.length) return { state: "fresh", since: null, keys: [] };
    return { state: "stale", since: oldest, keys: stale.map(function (s) { return s.key; }) };
  }

  return { summary: summary };
})();
