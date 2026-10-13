# Codex review and UI queue

Reconciled October 12. [backlog.md](backlog.md) is the current scope; the
[Wednesday handoff](claude-handoff-2026-10-14.md) is the integration checklist.

1. **FPI release follow-up:** #130 merged and its PR CI passed on both teams/styles, but physical iPhone/Safari/PWA and public deployment still need separate verification. Do not rebuild the FPI renderer. SP+ remains Claude's source/model work.
2. **Offseason production UI:** #131 merged an isolated S2/S4 visual prototype for review (`../design/offseason-preview-v2.html`); obtain David's explicit visual approval, then integrate with Claude's validated season/load-state model, never with illustrative records. Mid-November deadline remains.
3. **Preserve mobile fix:** #126 already merged; keep the approved halftime receiver and check any specific regression.
4. **Working additions to refine:** Outlook board, Game Alerts Settings,
   recent game-note/captain/honors presentation and shared header gear.
   Inspect current captures before proposing changes.
5. **Photography:** actual deployable art, crops and fallback, not another
   token/header rewrite.
6. **Release evidence:** pending-design-review item 4 and real iPhone checks.

**October 13 ownership:** DEV/Lab provisioning is paused at David's request
and handed to Claude (#135, #136); it does not block UI work. Draft #134 already
contains the isolated offseason renderer, awaiting Claude's normalized
controller inputs. Codex is finishing the existing, unpublished Game Alerts
Settings presentation work on current main, preserving its preference and
subscription behavior. No kickoff-time or dedupe service work moves into the
UI slice.

Completed first passes removed from this queue: Home/Game #100, Stats #104,
motion #105, type/navigation #106. Repeat only to resolve a concrete remaining
visual issue. W06 disclosure is withdrawn. W18 full-field board is implemented
(#109); it needs review, not reconstruction from the legacy board.

The latest approved direction is Instrument Sans/Display + Georgia,
Ink/Pearl, small Champagne/Bronze accents, unified SUITE/team header and the
Settings gear. OSU Team Style retains Nunito Sans. Do not restore older
mockup details that later explicit decisions superseded.
