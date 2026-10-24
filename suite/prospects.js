/* Suite - the recruiting class and the NFL draft board (offseason proposal
   §7, rows 4 and 6). Home draws them once the season is complete; Roster's
   Prospects view all year (David, 2026-10-24).

     Suite.prospects.recruiting(RecruitClass | null, at)  ->  markup, or ""
     Suite.prospects.draft(DraftClass | null, at)         ->  markup, or ""

   `at` keeps each screen's heading ids its own. Both draw TeamOS.prospects
   output and return "" when there is nothing to show; the screen says why.
   This file only draws: it fetches nothing and names no team. */

var Suite = Suite || {};

Suite.prospects = (function () {
  "use strict";

  var esc = Suite.ui.esc;

  // Both are ESPN's and say so, by the label the snapshot carries. A rank, a
  // grade or a pick ESPN does not give is left out, never filled in; the
  // board's order is ESPN's ranking, never called a projected pick.

  var PROSPECTS_SHOWN = 5;

  function credit(c) {
    var t = Date.parse(c.fetchedAt), label = esc(c.label);
    return '<p class="pr-src">' +
      (c.sourceUrl ? '<a href="' + esc(c.sourceUrl) + '" target="_blank" rel="noopener noreferrer">' + label +
                     '<span class="sr-only"> (opens in a new tab)</span></a>' : label) +
      (isNaN(t) ? "" : " \u00b7 Updated " + esc(new Date(t).toLocaleDateString([], { month: "short", day: "numeric" }))) + "</p>";
  }

  // One person: the labeled figure that leads (a grade, a rank, a pick),
  // the name, any star ratings, then a line or two of what ESPN gives.
  function person(fig, label, name, lines, ratings) {
    return "<li>" + (fig != null ? '<span class="pr-fig"><span class="bn-n">' + esc(fig) + '</span><span class="pr-l">' + esc(label) + "</span></span>" : "<span></span>") +
      '<span class="pr-who"><span class="pr-name">' + esc(name) + "</span>" + (ratings || []).map(stars).join("") +
      lines.filter(Boolean).map(function (l) { return '<span class="pr-meta">' + esc(l) + "</span>"; }).join("") + "</span></li>";
  }

  // Stars out of five, always with who gave them (David, 2026-10-24).
  function stars(r) {
    var n = Math.max(0, Math.min(5, r.stars));
    return '<span class="pr-stars"><span class="pr-star" aria-hidden="true">' + new Array(n + 1).join("\u2605") +
      '<span class="pr-star-off">' + new Array(6 - n).join("\u2605") + "</span></span>" +
      '<span class="pr-by" aria-hidden="true">' + esc(r.by) + '</span><span class="sr-only">' + n + "-star, " + esc(r.by) + "</span></span>";
  }

  // Five, and the rest one tap away - but never a tap for a single row.
  function people(rows, item) {
    var cut = rows.length > PROSPECTS_SHOWN + 1 ? PROSPECTS_SHOWN : rows.length, more = rows.slice(cut);
    return '<ul class="bn-list pr-list">' + rows.slice(0, cut).map(item).join("") + "</ul>" +
      (more.length ? '<details class="bn-more"><summary>Show ' + more.length + " more</summary>" +
                     '<ul class="bn-list pr-list">' + more.map(item).join("") + "</ul></details>" : "");
  }

  function prospectCard(id, title, n, words, extra, body, c) {
    return '<div class="sec-head"><h2 class="sec-title" id="' + id + '">' + title + "</h2></div>" +
      '<div class="card pr" role="group" aria-labelledby="' + id + '">' +
        '<p class="ms-count"><span class="ms-n">' + n + '</span><span class="ms-l">' + esc(words) + "</span></p>" +
        (extra ? '<p class="pr-sum">' + esc(extra) + "</p>" : "") + body + credit(c) +
      "</div>";
  }

  function rankAt(n, position) { return n && position ? "No. " + n + " " + position : ""; }

  function recruiting(c, at) {
    if (!c || !c.recruits || !c.recruits.length) return "";
    // ESPN's status words, counted only when the class is not all one of them.
    var by = {};
    c.recruits.forEach(function (r) { if (r.status) by[r.status] = (by[r.status] || 0) + 1; });
    var kinds = Object.keys(by);
    var mix = kinds.length > 1 ? kinds.map(function (k) { return by[k] + " " + k; }).join(" \u00b7 ") : "";
    return prospectCard(at + "RecHead", "Recruiting", c.total,
      (c.total === 1 ? "commitment" : "commitments") + (c.classYear != null ? " in the " + c.classYear + " class" : ""), mix,
      people(c.recruits, function (r) {
        return person(r.grade, "grade", r.name, [
          [r.position, r.highSchool, r.hometown].filter(Boolean).join(" \u00b7 "),
          [r.rank ? "No. " + r.rank + " overall" : "", rankAt(r.positionRank, r.position),
           r.stateRank ? "No. " + r.stateRank + " in state" : ""].filter(Boolean).join(" \u00b7 ")
        ], r.ratings);
      }), c);
  }

  function draft(d, at) {
    if (!d || !d.prospects || !d.prospects.length) return "";
    var picked = d.prospects.filter(function (p) { return p.pick; }).length;
    var year = d.year != null ? d.year + " " : "";
    var words = d.phase === "drafted"
      ? "drafted in " + (d.year != null ? d.year : "the draft") + ", of " + d.total + " on ESPN\u2019s board"
      : "on ESPN\u2019s " + year + "draft board";
    return prospectCard(at + "DraftHead", "NFL Draft", d.phase === "drafted" ? picked : d.total, words, "",
      people(d.prospects, function (p) {
        var k = p.pick;
        return person(k ? k.overall : p.overall, k ? "pick" : "overall", p.name, [
          k ? ["Round " + k.round + (k.pick ? ", Pick " + k.pick : ""), k.team].filter(Boolean).join(" \u00b7 ") : "",
          [rankAt(p.positionRank, p.position) || p.position, p.grade ? "ESPN grade " + p.grade : ""].filter(Boolean).join(" \u00b7 ")
        ]);
      }), d);
  }

  return { recruiting: recruiting, draft: draft };
})();
