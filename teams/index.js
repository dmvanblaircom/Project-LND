/* The canonical registry of programs this Suite knows about.

   One list, and only one. A program appears here whether or not the Suite can
   render it yet; what makes it selectable is that it names a `config`, and the
   config file existing is what makes that true. There is deliberately no
   second "available teams" list to drift out of step - availability is derived
   (docs/decisions/0014-one-registry.md).

     teams/index.js  ->  TEAM_REGISTRY  ->  TeamOS.registry  ->  the chooser
                                                              ->  the boot script
                                                              ->  the worker

   Fields:

     id          the Suite's own id for the program. Lower case, digits and
                 hyphens only - it becomes a file name and a ?team= value, and
                 the boot script refuses anything else.
     name        how the program is written out.
     short       how it is written where space is tight.
     conference  for grouping in the chooser. A program with none says
                 "Independent".
     config      teams/<id>.js, when one exists. ABSENT means the program is
                 known but not yet selectable, which is a real state: it is
                 what the chooser greys out rather than hiding.

   Adding a program is one row. Making it selectable is writing its config and
   naming it here. tools/registrycheck.js fails if a named config is missing,
   or if a config on disk is not named here.

   COMPLETENESS: this list is NOT yet all of FBS. It holds the programs the
   product has a decision about. Filling in the rest needs the authoritative
   roster - ESPN publishes it in one call at
   /apis/site/v2/sports/football/college-football/teams?limit=500 - rather than
   being typed from memory, because a wrong name or a stale conference here
   becomes a wrong name in the chooser. */

var TEAM_REGISTRY = [

  // Selectable today: a config exists for each.
  { id: "notre-dame", name: "Notre Dame",  short: "Notre Dame", conference: "Independent",
    config: "teams/notre-dame.js" },
  { id: "ohio-state", name: "Ohio State",  short: "Ohio State", conference: "Big Ten",
    config: "teams/ohio-state.js" },

  // Known, not yet selectable. No config, so TeamOS.registry reports them
  // unavailable and the chooser shows them greyed rather than pretending they
  // are not programs.
  { id: "indiana",    name: "Indiana",     short: "Indiana",    conference: "Big Ten" },
  { id: "byu",        name: "BYU",         short: "BYU",        conference: "Big 12" }

];
