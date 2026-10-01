/* TeamOS - prediction-market events (Kalshi), as Suite reads them.

     event JSON (data/league/odds-*.json)  ->  TeamOS.markets.teamMarket()  ->  this team's market | null
                                           ->  TeamOS.markets.price()       ->  percent
                                           ->  TeamOS.markets.field()       ->  Field (W18, "View full field")

   Kalshi's market schema enters the app here and nowhere else (Phase 4D,
   extracted for W18). app.js owns the network and the snapshot route;
   TeamOS.outlook decides which of a team's markets Home shows.

     Field = { key, label, rows: [Row] }    every team the event prices, most likely first
     Row   = { team, ticker, value, previous, change, mine }

   - value is a percent: the midpoint of the bid and ask when there is one,
     else the last trade. A market with neither has no number and no row:
     never a made-up 0.
   - change is value - previous (the source's previous price), to one
     decimal; null when the source gives no previous price.
   - A team the event does not price is simply not in the field.
   - Information only: nothing here places, links to, or prices a bet.

   Which markets are this team's is the team's configuration
   (sources.kalshi: tickerSuffix, namePattern); this file names no team.
   Pure: no fetch, no DOM. */

var TeamOS = TeamOS || {};

TeamOS.markets = (function () {
  "use strict";

  function num(v) {
    if (v === null || v === undefined) return null;
    var n = parseFloat(v);
    return isNaN(n) ? null : n;
  }

  // Kalshi returns prices in *_dollars fields as decimal strings from 0 to 1
  // ("0.8200"). The older shape used integer cents in yes_bid/yes_ask/last_price.
  // Read either and always return a percentage.
  function price(m) {
    var bd = num(m.yes_bid_dollars), ad = num(m.yes_ask_dollars);
    if (bd !== null && ad !== null && (bd || ad)) return (bd + ad) / 2 * 100;
    var ld = num(m.last_price_dollars);
    if (ld) return ld * 100;
    var b = num(m.yes_bid), a = num(m.yes_ask);
    if (b !== null && a !== null && (b || a)) return (b + a) / 2;
    return num(m.last_price);
  }
  function previous(m) {
    var d = num(m.previous_price_dollars);
    if (d !== null) return d * 100;
    return num(m.previous_price);
  }
  function name(m) { return m.yes_sub_title || m.subtitle || m.title || m.ticker; }

  // Kalshi lists the programs it takes a market on - the championship
  // contenders - not all of FBS. So this is a CAPABILITY, declared the same
  // way snapshots are (decision 0008): a team either has Kalshi markets or
  // it does not, and a team that does not never sees the surface. A config
  // with no kalshi block answers no, and never throws.
  function kalshiOf(config) { return (config && config.sources && config.sources.kalshi) || null; }
  function covers(config) {
    var k = kalshiOf(config);
    return !!(k && (k.tickerSuffix || k.namePattern));
  }
  // Whether a market is this team's: by ticker suffix, then by name.
  function isTeams(config, ticker, label) {
    var k = kalshiOf(config);
    if (!k) return false;
    return (k.tickerSuffix && String(ticker || "").endsWith(k.tickerSuffix)) ||
           (k.namePattern && k.namePattern.test(String(label || ""))) || false;
  }
  function list(event) { return (event && Array.isArray(event.markets)) ? event.markets : []; }
  function teamMarket(event, config) {
    return list(event).filter(function (m) { return m && isTeams(config, m.ticker, name(m)); })[0] || null;
  }

  // The whole event, for "View full field": every team it prices, most
  // likely first, ties by name. The label is the one Home uses for it.
  function field(event, config, key) {
    var meta = ((TeamOS.outlook && TeamOS.outlook.MARKETS) || []).filter(function (x) { return x.key === key; })[0];
    var rows = list(event).filter(function (m) { return m && (!m.status || m.status === "active" || m.status === "open"); })
      .map(function (m) {
        var v = price(m), p = previous(m);
        if (v == null || v < 0 || v > 100) return null;
        return { team: String(name(m) || ""), ticker: String(m.ticker || ""), value: v,
                 previous: p == null ? null : p,
                 change: p == null ? null : Math.round((v - p) * 10) / 10,
                 mine: isTeams(config, m.ticker, name(m)) };
      })
      .filter(Boolean)
      .sort(function (a, b) { return b.value - a.value || (a.team < b.team ? -1 : a.team > b.team ? 1 : 0); });
    if (!rows.length) return null;
    return { key: key, label: meta ? meta.label : String(key || ""), rows: rows };
  }

  return { price: price, previous: previous, name: name, covers: covers, isTeams: isTeams,
           teamMarket: teamMarket, field: field };
})();
