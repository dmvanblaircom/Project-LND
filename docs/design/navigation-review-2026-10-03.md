# Navigation and motion review - October 3, 2026

This is the third slice in David's order, after Home/Game and Stats.

## Launch clock correction

The inline bootstrap's `else sessionStorage.setItem(...)` was accidentally
inside a line comment. A first open therefore never saved its start time,
so an update's reload could begin the launch again. Restoring that write
preserves the original clock. Existing bounds for stale and future times,
the 2.6-second minimum, reduced motion, and the app's readiness/update caps
are retained.

The original bootstrap reproduced the lost clock in a negative control.
The browser launch check now verifies the first-open write and reloads an
actual document without seeding storage. The older seeded reload test is
retained as a separate check of the lift timing. The visible-image test
also uses horizontal intersection, as corrected in Stats #104.

## Motion proposal awaiting review

A local interactive study uses the real Top 25 renderer and captured
September data. It proposes a 12px / 180ms swipe with a lighter fade, a
quieter refresh-ring shadow, 8px launch-letter travel, and no wordmark
enlargement on exit. These cosmetic changes are not applied by this fix.
Gesture thresholds, routes, history, launch minimums and reduced-motion
behavior stay settled. Page titles, sticky roster controls and the bottom
navigation still need their own visual review.

The study passed both views at 320/375/390/768/1280 for both teams/styles,
plus standard and system reduced-motion checks. Its refresh/launch
completion is simulated; it does not certify real-device touch behavior.
