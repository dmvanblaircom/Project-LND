/* Explicit deployment metadata. Missing/invalid metadata disables server calls.
   An origin is not an environment selector. Nonproduction never enables push. */
var Suite = Suite || {};
Suite.environment = (function () {
  "use strict";
  var raw = window.SUITE_BUILD || {}, kind = raw.environment;
  var valid = ["production", "dev", "lab", "preview"].indexOf(kind) >= 0;
  var api = typeof raw.apiBase === "string" ? raw.apiBase : "";
  var productionAPI = "https://suite-api.dmvanblaircom.workers.dev";
  if (kind === "production") valid = valid && api === productionAPI;
  else if (api) valid = valid && /^https:\/\/suite-api-(lab|dev)\.dmvanblaircom\.workers\.dev$/.test(api);
  var prod = valid && kind === "production";
  var value = {
    environment: valid ? kind : "invalid",
    production: prod,
    apiBase: valid ? api : "",
    pushEnabled: prod,
    commitSHA: typeof raw.commitSHA === "string" && /^[0-9a-f]{40}$/.test(raw.commitSHA) ? raw.commitSHA : "",
    branch: typeof raw.branch === "string" ? raw.branch : "",
    label: prod ? "" : valid ? kind.toUpperCase() : "CONFIG ERROR"
  };
  function paint() {
    var badge = document.getElementById("environmentBadge");
    if (badge && !prod) {
      badge.textContent = value.label;
      badge.hidden = false;
      badge.title = "Suite " + value.label + " · " + (value.commitSHA || "unversioned");
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", paint);
  else paint();
  return Object.freeze(value);
})();
