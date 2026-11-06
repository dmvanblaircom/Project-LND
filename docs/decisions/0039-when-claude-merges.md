# Decision: when Claude merges a pull request

## Status

Accepted.

## Date

2026-11-06

## Decision

David, 2026-11-06 ("Yes adopt that"), asked why pull requests could not merge
automatically. Until now every merge waited for his "merge N". From now on the
rule depends on what the pull request is.

**Claude merges on its own** once CI is green on the current head, there is
no merge conflict, and Codex (or any other reviewer) has no open finding:

- bug fixes, including a broken or changed data source;
- fixes to checks and tests;
- monitoring and the data refresh's own plumbing;
- building something David has already approved: a brief's or decision's
  approved steps, such as the Around steps or the wire's Phase 1.

**David's "merge N" is still needed for:**

- product briefs and decisions, and any amendment to a recorded decision;
- a new design or visual direction (decisions 0022 and 0024: a new direction
  is David's call);
- anything involving money, keys or secrets, or a new paid service;
- anything that removes a feature fans have.

When it is unclear which list a pull request belongs to, it waits for David.
A merged pull request is reported to David the same day with what changed,
and any merge can be undone by a revert pull request.

## Why

The checks and the reviewer already gate every pull request. Waiting for a
word on a green fix only delayed it: on Nov 5 the Pac-12 fix waited about five
hours with the injury reports of six teams stale and a "Run failed" email
every half hour.
