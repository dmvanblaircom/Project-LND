/* TeamOS - team identity.

   What the Suite needs in order to *present* a team inside it: the team's
   colours and type, its tagline and its labels. Phase 5A showed that every ESPN-fed surface
   rendered a second team from configuration alone while the page still
   called itself Irish Watch in Notre Dame navy and gold - because identity
   was authored into index.html, manifest.json and app.css rather than
   carried as data. This module makes it data.

     TEAM_CONFIG.identity + Team  ->  TeamOS.identity.create()  ->  Identity
                                                                      |
                                              app.js paintIdentity()  v
                                       masthead, :root colour tokens

   The rules this file enforces, so that a team config cannot ship a page
   nobody can read (docs/decisions/0009-identity-is-team-data.md):

     - every colour is a #rrggbb string
     - accentText on the team's deepest surface is at least 4.5:1
     - accentInk on the team's accent is at least 4.5:1
     - a declared text colour on that surface is at least 4.5:1
     - on the Suite's LIGHT surfaces (the canonical Suite is ivory pages and
       white cards): accentOnLight, and the team's surface colour used as
       heading ink, are at least 4.5:1 on both

   A team that fails any of those throws at startup with the measured ratio,
   the same way createTeam() throws on a malformed team section. The accent
   itself is NOT checked against the surface: an accent is a fill, a rule and
   an indicator, and a team whose accent cannot carry text declares an
   accentText that can. Nothing here lightens or darkens a team's colour -
   the configuration decides, this file only refuses what fails.

   What a team does NOT own is the product itself (decision 0024 §11). The
   installed app, its name, icons, favicon, manifest and default share card
   are Suite's, one set for every team, in index.html and manifest.json. A
   team config that still declares any of those is refused, so no team can
   put its own brand back on the install. */

var TeamOS = TeamOS || {};

TeamOS.identity = (function () {
  "use strict";

  var MIN = 4.5;                    // WCAG AA, normal text

  // Fields a team identity used to carry and no longer may: they made the
  // installed product a team's (decision 0009, superseded here in part by
  // decision 0024 §11).
  var SHELL_OWNED = ["productName", "title", "description", "shareTitle", "shareDescription",
                     "manifest", "assets"];

  // The Suite's own light surfaces, which every team's light-UI colours are
  // checked against. They are the Suite's, not a team's: they mirror
  // --s-surface and --s-page in app.css, and adaptercheck asserts the two
  // stay equal.
  var LIGHT = { surface: "#FFFFFF", page: "#F6F4EF" };

  // Colour tokens every team supplies. Each is a role the stylesheet asks
  // for by name; none of them is a Notre Dame or an Ohio State value.
  var COLORS = [
    "accent",          // fills, rules, indicators, active states
    "accentText",      // accent-coloured TEXT - must pass on surfaceDeep
    "accentOnLight",   // accent-coloured TEXT on the Suite's light surfaces
    "accentInk",       // text and icons drawn ON an accent fill
    "accentSoft",      // a muted tone of the accent, for small labels
    "accentTint",      // a light tone of the accent, for emphasis on dark
    "accentTintSoft",  // a lighter one still
    "focus",           // the focus ring
    "surface",         // cards, header, the mid tone of the page
    "surfaceDeep",     // the page foundation
    "surfaceAbyss",    // the darkest step, gradient ends and scrims
    "surfaceRaise"     // a lifted surface, hovers and insets
  ];
  // Optional: a team may override the Suite's neutral text tones. Left out,
  // the stylesheet's own values stand.
  var OPTIONAL_COLORS = ["text", "textDim"];

  // A team may bring its own ui and display faces. Editorial type (news
  // headlines) is the Suite's, not a team's: a Notre Dame-coded face must
  // not become the platform's voice for every other team.
  var FONTS = ["ui", "display"];

  function fail(what) { throw new Error("TeamOS.identity: " + what); }

  function str(obj, field, where) {
    var v = obj[field];
    if (typeof v !== "string" || !v.trim()) fail((where || "") + field + " must be a non-empty string");
    return v;
  }

  // ---- contrast -------------------------------------------------------
  // WCAG 2.x relative luminance and contrast ratio. Pure arithmetic on a
  // #rrggbb string; exported so the checks can report a number rather than
  // a pass/fail nobody can argue with.
  function channel(c) {
    var s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  }
  function luminance(hex) {
    var h = hex.slice(1);
    var r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
  }
  function contrast(a, b) {
    var la = luminance(a), lb = luminance(b);
    var hi = la > lb ? la : lb, lo = la > lb ? lb : la;
    return (hi + 0.05) / (lo + 0.05);
  }
  function round(n) { return Math.round(n * 100) / 100; }

  function hex(obj, field, where) {
    var v = str(obj, field, where);
    if (!/^#[0-9a-fA-F]{6}$/.test(v)) fail((where || "") + field + " must be a #rrggbb colour, got " + v);
    return v.toUpperCase();
  }

  // "#0C2340" -> "12,35,64", so the stylesheet can build rgba() tints of a
  // team's colour without hard-coding the channels 44 times over.
  function rgb(h) {
    return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)].join(",");
  }

  function require(pair, min, what) {
    var r = contrast(pair[0], pair[1]);
    if (r < min) fail(what + " is " + round(r) + ":1 (" + pair[0] + " on " + pair[1] + "); " + min + ":1 is the minimum");
    return round(r);
  }

  function create(config, team) {
    var i = config && config.identity;
    if (!i || typeof i !== "object") fail("the team config has no identity section");

    SHELL_OWNED.forEach(function (k) {
      if (i[k] !== undefined) fail("identity." + k + " is Suite's, not a team's: the installed product, its " +
                                   "head, icons and share card are the same for every team (decision 0024)");
    });

    var id = {
      programLabel: str(i, "programLabel", "identity."),
      // A tagline is a team thing, not a product thing. Most teams have none,
      // and the Suite renders correctly without one.
      tagline:  i.tagline == null ? null : str(i, "tagline", "identity."),
      // The News tab's section rule. It named a city in CSS until the
      // Ohio State proof found it (phase-6 report), which is exactly the
      // kind of copy that has to be the team's, not the stylesheet's.
      newsLabel: str(i, "newsLabel", "identity.")
    };

    // ---- colours ----
    if (!i.colors || typeof i.colors !== "object") fail("identity.colors must be an object");
    var c = {};
    COLORS.forEach(function (k) { c[k] = hex(i.colors, k, "identity.colors."); });
    OPTIONAL_COLORS.forEach(function (k) {
      if (i.colors[k] != null) c[k] = hex(i.colors, k, "identity.colors.");
    });
    c.accentRgb       = rgb(c.accent);
    c.surfaceRgb      = rgb(c.surface);
    c.surfaceDeepRgb  = rgb(c.surfaceDeep);
    c.surfaceAbyssRgb = rgb(c.surfaceAbyss);
    c.surfaceRaiseRgb = rgb(c.surfaceRaise);
    id.colors = Object.freeze(c);

    // ---- the checks that keep a team legible ----
    id.contrast = Object.freeze({
      accentText: require([c.accentText, c.surfaceDeep], MIN, "identity.colors.accentText on surfaceDeep"),
      accentSoft: require([c.accentSoft, c.surfaceDeep], MIN, "identity.colors.accentSoft on surfaceDeep"),
      accentInk:  require([c.accentInk,  c.accent],      MIN, "identity.colors.accentInk on accent"),
      text: c.text == null ? null : require([c.text, c.surfaceDeep], MIN, "identity.colors.text on surfaceDeep"),
      accentOnLight: Math.min(
        require([c.accentOnLight, LIGHT.surface], MIN, "identity.colors.accentOnLight on the Suite's white surface"),
        require([c.accentOnLight, LIGHT.page],    MIN, "identity.colors.accentOnLight on the Suite's page")),
      // The team's surface is also its heading ink on light pages.
      surfaceOnLight: Math.min(
        require([c.surface, LIGHT.surface], MIN, "identity.colors.surface as ink on the Suite's white surface"),
        require([c.surface, LIGHT.page],    MIN, "identity.colors.surface as ink on the Suite's page")),
      // Reported, never enforced: an accent is a fill, not a typeface.
      accentOnSurface: round(contrast(c.accent, c.surfaceDeep))
    });

    // ---- type ----
    if (!i.fonts || typeof i.fonts !== "object") fail("identity.fonts must be an object");
    var f = {};
    FONTS.forEach(function (k) { f[k] = str(i.fonts, k, "identity.fonts."); });
    id.fonts = Object.freeze(f);

    id.team = team ? team.id : null;
    return Object.freeze(id);
  }

  return { create: create, contrast: contrast, luminance: luminance, MIN: MIN, LIGHT: LIGHT };
})();
