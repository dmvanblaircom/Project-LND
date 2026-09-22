/* The team chooser.

   What a fan sees the first time they arrive having asked for nobody in
   particular. There is no team yet, so there is no Suite: app.js is never
   loaded, because it reads TEAM_CONFIG as it parses and there is none
   (decision 0016).

   Everything here comes from the registry (decision 0014). A program is
   selectable because it names a config; one that does not is still shown,
   greyed, because "we know about your team and cannot open it yet" is a
   truthful and useful thing to say, where leaving it out reads as "your team
   does not exist".

   Choosing navigates to ?team=<id>. That is one line of work and it buys a
   lot: the boot script's existing path runs from the top with a team, the
   choice is stored where every later visit reads it, the URL is shareable and
   installable, and the back button behaves. Rendering the Suite in place
   would mean a second way to start the application.

   The page is painted in the neutral :root - nobody's colours - because the
   fan has not told us whose to use yet. */

(function () {
  "use strict";

  var REG = TeamOS.registry.create(typeof TEAM_REGISTRY !== "undefined" ? TEAM_REGISTRY : []);

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  function choose(id) {
    try { localStorage.setItem("iw-team", id); } catch (e) {}
    // replace, not assign: the chooser is not a page anyone wants to come
    // back to with the browser's back button.
    location.replace("?team=" + encodeURIComponent(id));
  }

  function teamButton(t) {
    if (!t.available) {
      return '<li><span class="pick soon" aria-disabled="true">' +
             '<span class="pick-name">' + esc(t.name) + "</span>" +
             '<span class="pick-note">Not yet</span></span></li>';
    }
    return '<li><button type="button" class="pick" data-team="' + esc(t.id) + '">' +
           '<span class="pick-name">' + esc(t.name) + "</span>" +
           '<span class="pick-go" aria-hidden="true">→</span></button></li>';
  }

  function render() {
    var host = document.querySelector(".wrap");
    if (!host) return;

    var groups = REG.byConference();
    var ready = REG.available().length;

    var html =
      '<section class="chooser" aria-labelledby="chooseHead">' +
        '<h1 id="chooseHead">Pick your team</h1>' +
        '<p class="chooser-sub">' +
          (ready
            ? "Your team, every day. Choose one to get started — you can change it later."
            : "No team is ready to open yet.") +
        "</p>";

    groups.forEach(function (g) {
      html += '<h2 class="chooser-conf">' + esc(g.conference) + "</h2>" +
              '<ul class="chooser-list">' +
              g.teams.map(teamButton).join("") +
              "</ul>";
    });

    html +=
      '<p class="chooser-foot">More programs are on the way. A team listed as ' +
      '<em>Not yet</em> is one we know about and cannot open — yet.</p>' +
      "</section>";

    // The Suite's own furniture is not ours: there is no team to put in it.
    ["strip", "oddsHint", "oddsboard", "hero", "heroMini"].forEach(function (id) {
      var el = document.getElementById(id);
      if (el && el.parentNode) el.parentNode.removeChild(el);
    });
    var page = document.querySelector(".page");
    if (page) {
      [".bar", "nav", ".tabs", '[role="tablist"]', ".motto", "main"].forEach(function (sel) {
        [].slice.call(page.querySelectorAll(sel)).forEach(function (el) {
          if (el.parentNode) el.parentNode.removeChild(el);
        });
      });
    }
    host.innerHTML = html;

    host.addEventListener("click", function (e) {
      var btn = e.target.closest ? e.target.closest(".pick[data-team]") : null;
      if (btn) choose(btn.getAttribute("data-team"));
    });

    document.title = "Pick your team";
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", render);
  } else {
    render();
  }
})();
