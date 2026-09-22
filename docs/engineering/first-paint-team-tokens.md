# The first paint was the wrong team's — investigation and fix

**Reported:** 2026-09-21, Buckeye Watch on an iPhone · **Fixed:** 2026-09-21 · **Branch:** `claude/lnd-implementation-status-owqyo9`

## What was seen

Buckeye Watch on iOS Safari, rendering correctly in Ohio State charcoal and
scarlet — under a **navy** status bar and a **navy** browser toolbar.

## What it actually was

Not a hard-coded header or footer. The navy is `#07192F`, Notre Dame's
`--t-deep`, and it is the **page canvas colour from the first paint**.

Measured, from the reported screenshot:

| sRGB source | Display P3 encoding | Sampled in the screenshot |
|---|---|---|
| `#07192F` — Notre Dame `--t-deep` | `#0B192D` | **`#0C192C`** ✔ |
| `#0C2340` — Notre Dame `--t-surface` | `#12223E` | — |
| `#BA0C2F` — Ohio State accent (control) | `#AA2734` | `#AA2634` ✔ |
| `#070A0C` — Ohio State `--t-abyss` (control) | `#080A0C` | `#080B0C` ✔ |

iPhone screenshots are captured in Display P3, so the two controls are what
make the first row readable rather than a guess.

Confirmed against the page itself — `buckeye.html` loaded with JavaScript
disabled, which is exactly the state before the deferred scripts run:

```
html canvas background : rgb(7, 25, 47)      <- #07192F, Notre Dame
--t-surface=#0C2340  --t-deep=#07192F  --t-abyss=#061525  --t-accent=#C99700
```

With scripts on it repaints to `rgb(11, 17, 21)` — Ohio State. `paintIdentity()`
was never wrong; it just runs after the first paint. On iOS Safari the status
bar and toolbar tint is taken from that first paint and is not recomputed when
the tokens change a moment later, so the navy stayed for the life of the page.

**`theme-color` was not involved.** It is `#212325` on Buckeye Watch, both as
static markup and after `paintIdentity()`. iOS tinted those bars from the
canvas, not from the meta tag, which is why a correct `theme-color` did not
help.

## Root cause

`app.css` declares the `--t-*` tokens on `:root` with Notre Dame's values. That
is deliberate and documented in the file — the page has to paint before any
script runs. But the values are one team's, so **every other team's first paint
was Notre Dame's.** Phase 6 made identity data for everything a script could
reach; the first paint is the part no script is there for.

## The fix

| File | Change |
|---|---|
| `index.html`, `buckeye.html` | a `<style id="team-boot">` block after the `app.css` link, carrying that page's own `--t-*` tokens. Equal specificity to `app.css`'s `:root`, so source order is what makes it win. |
| `tools/adaptercheck.js` | 13 checks that re-derive each block from its team config and compare |
| `sw.js` | `VERSION` → `iw-2026-09-21a`, because the precached shell changed |
| `teams/notre-dame.js`, `teams/ohio-state.js`, `teamos/identity.js` | drop a duplicated `accentSoft` key (copy-paste, same value both times, no behaviour change) |

`app.css` keeps its Notre Dame defaults. They are now a fallback nothing relies
on rather than the thing every page inherits.

The block is a second copy of a team's colours, so it is not hand-maintained:
`tools/adaptercheck.js` derives the expected text from `teams/<id>.js` through
`TeamOS.identity.create()` — the same values, in the same order,
`paintIdentity()` sets — and fails if the file disagrees. It also reads
`paintIdentity`'s own token list back out of `app.js` and asserts the two sets
are identical in both directions, so a token added to one and not the other is
a failing check rather than a silent flash.

**Negative control:** pasting Notre Dame's block into `buckeye.html` — the exact
bug — fails 4 checks. Without that the suite would pass on the broken build.

## Validation

| Check | Before | After |
|---|---|---|
| `buckeye.html` canvas, scripts disabled | `rgb(7,25,47)` Notre Dame | **`rgb(11,17,21)` Ohio State** |
| `buckeye.html` canvas, scripts run | `rgb(11,17,21)` | `rgb(11,17,21)` — unchanged |
| `index.html` canvas, either way | `rgb(7,25,47)` | `rgb(7,25,47)` — unchanged |
| `--t-accent` on `buckeye.html`, first paint | `#C99700` gold | **`#BA0C2F` scarlet** |
| `theme-color` | correct already | correct, untouched |

Automated: `csscheck` 352/0/0 · `node --check` ×9 · `adaptercheck` 382 → **395** ·
`livecheck` 54. All pass.

**Not verifiable here:** the iOS Safari bar tint itself. This environment has no
iPhone, and outbound access to the deployed site is blocked, so the fix is proven
at the layer the bug is in — the canvas colour at first paint — and the bars
should be checked on the phone once this deploys. Webfonts and ESPN are also
blocked here, so the rendered screenshots are bare; the background is the part
under test.

## Consequences

1. Each entry point now states its own team twice: once as the script it loads,
   once as the tokens it boots with. The check is what keeps that honest.
2. This is a **fourth Phase 7 constraint**, alongside the three in the build
   plan. It has the same shape as the others: a static `<head>` that has to know
   the team before anything runs. When Phase 7 picks the team at runtime, these
   blocks are replaced by the stored choice written before first paint, and
   `app.css`'s `:root` should become team-neutral so an unknown team falls back
   to a neutral dark rather than to Notre Dame.
3. Desktop and Android got a fix too — the same flash was there, just brief
   enough to miss.
