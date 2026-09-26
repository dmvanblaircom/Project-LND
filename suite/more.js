/* Suite - More, and the destinations it owns (reference 10; decisions 0022,
   0024 §17 §18, 0026, 0028).

     #more       the menu: News, Schedule, Settings, Feedback, About Suite
     #news       every story, newest first; each opens its publisher
     #settings   Team, Appearance (App Style), Data
     #feedback   an email to the Suite team - the fan's mail app sends it
     #about      what Suite is, and where every piece of data comes from

   Each keeps More selected (0028). This file only draws: app.js gathers the
   stories, the fan's App Style, the refresh state and TeamOS's list of this
   team's sources; nothing here fetches, reads a provider payload or names a
   team.

     Suite.more.menu(host)
     Suite.more.news(host, { items: NewsItem[]|null, failed, fresh, team })
     Suite.more.settings(host, { team:{name,abbr,mark}, changeHref, style,
                                 updatedAt, refreshing, online, result })
     Suite.more.feedback(host, { href, address })
     Suite.more.about(host, { version, sources: Source[] })              */

var Suite = Suite || {};

Suite.more = (function () {
  "use strict";

  var ui = Suite.ui, esc = ui.esc;
  var last = {};

  var CHEVRON = '<svg class="chev" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m9 6 6 6-6 6"/></svg>';
  var EXTERNAL = '<svg class="ext" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M14 5h5v5M19 5l-8 8M17 14v4a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1h4"/></svg>';
  var NEW_TAB = '<span class="sr-only"> (opens in a new tab)</span>';

  function icon(paths) {
    return '<svg class="mo-ic" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + paths + "</svg>";
  }
  var ICONS = {
    news:     icon('<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><path d="M7 8.5h10M7 12h4M7 15.5h4"/><rect x="13" y="11.5" width="4" height="4.5" rx=".6"/>'),
    schedule: icon('<rect x="3.5" y="5.5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3.5v4M16 3.5v4"/><path d="M7.5 13.5h.01M12 13.5h.01M16.5 13.5h.01M7.5 17h.01M12 17h.01"/>'),
    // a cog: eight square teeth round a hub (catch-up review 1.6)
    settings: icon('<path d="M9.3 5.5 L10.2 5.2 L10.2 3.0 L13.8 3.0 L13.8 5.2 L14.7 5.5 L15.5 5.9 L17.1 4.4 L19.6 6.9 L18.1 8.5 L18.5 9.3 L18.8 10.2 L21.0 10.2 L21.0 13.8 L18.8 13.8 L18.5 14.7 L18.1 15.5 L19.6 17.1 L17.1 19.6 L15.5 18.1 L14.7 18.5 L13.8 18.8 L13.8 21.0 L10.2 21.0 L10.2 18.8 L9.3 18.5 L8.5 18.1 L6.9 19.6 L4.4 17.1 L5.9 15.5 L5.5 14.7 L5.2 13.8 L3.0 13.8 L3.0 10.2 L5.2 10.2 L5.5 9.3 L5.9 8.5 L4.4 6.9 L6.9 4.4 L8.5 5.9Z"/><circle cx="12" cy="12" r="3"/>'),
    feedback: icon('<path d="M4.5 5.5h15a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H10l-4.5 3.5v-3.5h-1a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1z"/>'),
    about:    icon('<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.6h.01"/>'),
    // the share sheet's own glyph: an arrow up out of an open box
    share:    icon('<path d="M12 14.5V3.5M8 7.5l4-4 4 4"/><path d="M8.5 10.5H6.5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-2"/>')
  };

  // Paint only when something changed, so a background refresh never
  // resets a scroll position or steals focus.
  function put(host, key, html) {
    if (last[key] === html && host.innerHTML) return false;
    host.innerHTML = html; last[key] = html;
    return true;
  }

  // ---- the menu ------------------------------------------------------------

  var MENU = [
    { id: "news",     href: "#news",     title: "News",        sub: "Latest team and national coverage" },
    { id: "schedule", href: "#schedule", title: "Schedule",    sub: "Season schedule, results, and game details" },
    { id: "settings", href: "#settings", title: "Settings",    sub: "Manage your app preferences" },
    { id: "feedback", href: "#feedback", title: "Feedback",    sub: "Share your thoughts and help us improve" },
    { id: "share",    action: "share",   title: "Share Suite", sub: "Text a friend a link to join you" },
    { id: "about",    href: "#about",    title: "About Suite", sub: "Product info and data sources" }
  ];

  // A destination is a link; Share Suite is an action (the phone's share
  // sheet, or the link copied), so it is a button, and says what it did in
  // the status line under the list.
  function menu(host) {
    put(host, "menu", '<ul class="mo-list card" aria-label="More">' + MENU.map(function (x) {
      var inner = '<span class="mo-badge">' + ICONS[x.id] + "</span>" +
                  '<span class="mo-text"><span class="mo-title">' + esc(x.title) + "</span>" +
                  '<span class="mo-sub">' + esc(x.sub) + "</span></span>";
      return x.action ? '<li><button type="button" class="mo-row" data-' + x.action + ">" + inner + "</button></li>"
                      : '<li><a class="mo-row" href="' + x.href + '">' + inner + CHEVRON + "</a></li>";
    }).join("") + '</ul><p class="mo-note" role="status" data-share-note></p>');
  }

  // ---- News ----------------------------------------------------------------
  // Stories open the original publisher (0024 §17): a new context, rel
  // protections, a visible cue and a spoken one. The first twenty show; the
  // rest are one tap away.

  var FIRST = 20;

  function story(a, now, extra) {
    var img = '<span class="nw-img' + (a.image ? "" : " none") + '" aria-hidden="true">' +
                '<span class="nw-src">' + esc(a.source || "") + "</span>" +
                (a.image ? '<img src="' + esc(a.image) + '" alt="" loading="lazy" decoding="async" data-fallback>' : "") +
              "</span>";
    return "<li" + (extra ? " data-extra hidden" : "") + '><a class="nw-row" href="' + esc(a.link) +
           '" target="_blank" rel="noopener noreferrer">' + img +
           '<span class="nw-body"><span class="nw-hl">' + esc(a.title) + "</span>" +
           '<span class="nw-meta">' + esc([ui.ago(a.publishedAt, now), a.source].filter(Boolean).join(" · ")) +
           EXTERNAL + '<span class="sr-only"> (opens the original story in a new tab)</span></span></span></a></li>';
  }

  function news(host, m) {
    var fresh = ui.freshBanner(m.fresh), body;
    if (m.items == null) {
      body = '<p class="sec-quiet">' + (m.failed ? "The stories didn’t load. They appear when the connection returns."
                                                 : "Loading the latest stories…") + "</p>";
    } else if (!m.items.length) {
      body = '<p class="sec-quiet">No stories right now.</p>';
    } else {
      var now = Date.now(), more = m.items.length - FIRST;
      body = '<h2 class="sr-only">Latest ' + esc(m.team.name) + " stories</h2>" +
             '<ul class="nw-list card">' + m.items.map(function (a, i) { return story(a, now, i >= FIRST); }).join("") + "</ul>" +
             (more > 0 ? '<button type="button" class="btn btn-secondary nw-more" data-more>Show ' + more + " more " +
                         (more === 1 ? "story" : "stories") + "</button>" : "");
    }
    // A repaint keeps stories the fan already opened up.
    var open = !!host.querySelector("[data-more-done]");
    if (!put(host, "news", '<div data-mo="fresh" role="status">' + fresh + "</div>" + body) || !open) return;
    reveal(host);
  }
  function reveal(host) {
    [].forEach.call(host.querySelectorAll("li[data-extra]"), function (li) { li.hidden = false; });
    var b = host.querySelector("[data-more]");
    if (b) { b.hidden = true; b.setAttribute("data-more-done", ""); }
  }
  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("[data-more]");
    if (!b) return;
    var host = b.parentNode, first = host.querySelector("li[data-extra] a");
    reveal(host);
    if (first) first.focus();                      // continue from the first story revealed
  });

  // ---- Settings (0024 §18, amended by 0026) --------------------------------

  function group(id, title, rows) {
    return '<section class="st-group" aria-labelledby="st-' + id + '"><h2 class="sec-title" id="st-' + id + '">' +
           esc(title) + '</h2><div class="card st-card">' + rows + "</div></section>";
  }

  function when(ms) {
    if (!ms) return "";
    var d = new Date(ms), today = new Date();
    var t = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    return d.toDateString() === today.toDateString() ? "Today, " + t
         : d.toLocaleDateString([], { month: "short", day: "numeric" }) + ", " + t;
  }

  function settings(host, m) {
    var team = group("team", "Team",
      '<div class="st-row"><span class="st-k">Current Team</span><span class="st-v st-team">' +
        m.team.mark + '<span>' + esc(m.team.name) + "</span></span></div>" +
      '<a class="st-row st-link" href="' + esc(m.changeHref) + '"><span class="st-k">Change Team</span>' + CHEVRON + "</a>");

    // One choice, two options, the fan's own (0026). Native radios: arrow
    // keys move between them and the choice is announced as a group.
    var opts = [["team", "Team Style", "Recommended", "Your team’s colors and type lead."],
                ["suite", "Suite Style", "", "Suite’s standard look, the same for every team."]];
    var style = group("appearance", "Appearance",
      '<fieldset class="st-choice"><legend class="st-k">App Style</legend>' + opts.map(function (o) {
        return '<label class="st-opt"><input type="radio" name="appStyle" value="' + o[0] + '"' +
               (m.style === o[0] ? " checked" : "") + '><span class="st-opt-text"><span class="st-opt-name">' + esc(o[1]) +
               (o[2] ? ' <span class="st-rec">· ' + esc(o[2]) + "</span>" : "") + "</span>" +
               '<span class="st-opt-sub">' + esc(o[3]) + "</span></span></label>";
      }).join("") + "</fieldset>");

    var status = m.refreshing ? "Refreshing…"
               : !m.online ? "Offline" + (m.updatedAt ? " · " + when(m.updatedAt) : "")
               : m.updatedAt ? when(m.updatedAt) : "Not yet";
    // The last Refresh Data's outcome, as it actually came out (catch-up
    // review 1.2); before one, what refreshing on its own means.
    var note = m.result || "Scores, news and rankings refresh on their own.";
    var data = group("data", "Data",
      '<div class="st-row"><span class="st-k">Last Updated</span><span class="st-v" data-st="updated">' + esc(status) + "</span></div>" +
      '<div class="st-row st-action"><span class="st-note" data-st="result">' + esc(note) + "</span>" +
        // aria-disabled, not disabled, while busy: a disabled button drops the
        // keyboard focus the fan left on it
        '<button type="button" class="btn btn-secondary" data-refresh' + (m.refreshing ? ' aria-disabled="true"' : "") + ">Refresh Data</button></div>");

    // Keep focus on the control the fan used: a repaint replaces the markup.
    var active = document.activeElement, focusVal = active && host.contains(active)
      ? (active.name === "appStyle" ? "r:" + active.value : active.hasAttribute("data-refresh") ? "refresh" : null) : null;
    if (!put(host, "settings", team + style + data)) return;
    var back = focusVal === "refresh" ? host.querySelector("[data-refresh]")
             : focusVal ? host.querySelector('input[name="appStyle"][value="' + focusVal.slice(2) + '"]') : null;
    if (back) back.focus();
  }

  // ---- Feedback (0022 #12) -------------------------------------------------
  // Email, not a form: the fan's mail app owns sending, so there is no
  // "sent" state here to fake.

  function feedback(host, m) {
    put(host, "feedback",
      '<section class="card fb-card" aria-labelledby="fbHead"><h2 class="sec-title" id="fbHead">Send Feedback</h2>' +
      "<p>Tell us what’s working, what isn’t, and what you’d like to see next.</p>" +
      '<a class="btn btn-primary fb-cta" href="' + esc(m.href) + '">Email Feedback</a>' +
      '<p class="fb-note">Your email app opens with a message ready to send. It includes your team, the screen you came from and the app version, so we can follow up. Suite doesn’t send anything itself.</p>' +
      '<p class="fb-note">No email app? Write to <a href="mailto:' + esc(m.address) + '">' + esc(m.address) + "</a>.</p></section>");
  }

  // ---- About Suite ---------------------------------------------------------

  var SUPPLIES = {
    scores: "Scores", schedule: "Schedule", rankings: "Rankings", rosters: "Rosters and player photos",
    news: "News", depth: "Official depth chart", availability: "Availability report",
    outlook: "Season Outlook markets", weather: "Kickoff weather"
  };

  function about(host, m) {
    var product = '<section class="card ab-card" aria-labelledby="abHead"><h2 class="sec-title" id="abHead">Suite</h2>' +
      "<p>Your team’s games, rankings, roster and news, in one place.</p>" +
      (m.version ? '<p class="ab-ver">Version ' + esc(m.version) + "</p>" : "") + "</section>";
    var sources = '<section class="ab-sources" aria-labelledby="abSrc"><h2 class="sec-title" id="abSrc">Data Sources</h2>' +
      '<ul class="card ab-list">' + (m.sources || []).map(function (s) {
        var name = s.url ? '<a class="ab-name" href="' + esc(s.url) + '" target="_blank" rel="noopener noreferrer">' +
                             esc(s.name) + EXTERNAL + NEW_TAB + "</a>"
                         : '<span class="ab-name">' + esc(s.name) + "</span>";
        return "<li>" + name + '<span class="ab-what">' +
               esc(s.supplies.map(function (k) { return SUPPLIES[k] || k; }).join(" · ")) + "</span></li>";
      }).join("") + "</ul></section>";
    // Independence (Product, 2026-09-24): the standard statement independent
    // sports apps carry - no affiliation or endorsement, marks used only to
    // identify, third-party data that can lag. Not legal review.
    var markets = (m.sources || []).some(function (s) { return s.supplies.indexOf("outlook") > -1; });
    var legal = '<section class="ab-legal" aria-labelledby="abLegal"><h2 class="sec-title" id="abLegal">Independent App</h2>' +
      "<p>Suite is an independent app. It is not affiliated with, endorsed by or sponsored by the NCAA, any athletic " +
      "conference, college or university, or any team shown, or by the data sources listed above.</p>" +
      "<p>Team names, logos and other marks are the property of their respective owners and are used only to " +
      "identify the teams.</p>" +
      "<p>Scores, schedules, rankings and news come from the sources above and may be delayed or incomplete. " +
      "Suite is for information and entertainment" + (markets ? "; market prices are not betting advice." : ".") + "</p></section>";
    put(host, "about", product + sources + legal);
  }

  return { menu: menu, news: news, settings: settings, feedback: feedback, about: about };
})();
