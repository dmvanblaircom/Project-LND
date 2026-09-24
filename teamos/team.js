/* TeamOS - the Team domain model.

   A Team is what the platform knows about a team independent of where the
   data comes from: nothing here names ESPN, Kalshi or any other provider.
   Provider identifiers and matching rules live in the team config's
   `sources` section (see teams/notre-dame.js and
   docs/decisions/0003-team-is-provider-neutral.md).

   createTeam() checks that a config's `team` section has every required
   field, copies it, and freezes the result so nothing downstream can
   quietly alter the team the page is built around. A missing or malformed
   field throws at startup with the field named, which beats rendering
   "undefined" into the neutral-site rule for a second team's config. */

/* Every TeamOS module EXTENDS this namespace rather than replacing it, so
   they can load in any order. This file used to assign the namespace whole -
   `var TeamOS = (function(){...})()` - which silently erased anything already
   on it. It cost an hour on 2026-09-22 when teamos/registry.js was loaded
   first and simply vanished. tools/adaptercheck.js now checks the shape. */
var TeamOS = TeamOS || {};

TeamOS.createTeam = (function () {
  "use strict";

  function fail(field, why) {
    throw new Error("TeamOS.createTeam: team." + field + " " + why);
  }
  // `label` is the dotted path used in the error; it defaults to the field.
  function str(obj, field, label) {
    var v = obj[field];
    if (typeof v !== "string" || !v.trim()) fail(label || field, "must be a non-empty string");
    return v;
  }
  function zone(obj, field) {
    var v = str(obj, field);
    try { new Intl.DateTimeFormat("en-US", { timeZone: v }); }
    catch (e) { fail(field, "must be an IANA time zone, got " + v); }
    return v;
  }
  function num(obj, field, label) {
    var v = obj[field];
    if (typeof v !== "number" || isNaN(v)) fail(label || field, "must be a number");
    return v;
  }

  function createTeam(t) {
    if (!t || typeof t !== "object") throw new Error("TeamOS.createTeam: team config is missing");
    var team = {
      id:           str(t, "id"),
      name:         str(t, "name"),
      abbreviation: str(t, "abbreviation"),
      sport:        str(t, "sport"),
      league:       str(t, "league"),
      // The team's home time zone, IANA ("America/New_York"). Policies that
      // depend on the team's local calendar read it - a recent final holds
      // the Home hero through the end of the following local day (decision
      // 0022 #10). Display times are the device's own, never this.
      timeZone:     zone(t, "timeZone")
    };
    if (!t.venue || typeof t.venue !== "object") fail("venue", "must be an object");
    team.venue = Object.freeze({
      name: str(t.venue, "name", "venue.name"),
      lat:  num(t.venue, "lat",  "venue.lat"),
      lon:  num(t.venue, "lon",  "venue.lon")
    });
    return Object.freeze(team);
  }

  return createTeam;
})();
