# Suite identity assets

The installable product is Suite, whatever team a fan selects
(decision 0024 §11). These files are its install and share identity.

**Every `TEMPORARY-*` file here is a development stand-in, not the Suite
mark.** No final Suite icon set or neutral share image has been approved.
`tools/identitycheck.js --release` fails while any shell file references a
`TEMPORARY-*` asset, and CI runs it for `main`, so these cannot ship.

Needed before the redesign merges, each replacing its TEMPORARY file and
reference in `manifest.json` / `index.html`:

| File | Size | Use |
|---|---|---|
| icon-192.png | 192×192 | manifest `any` |
| icon-512.png | 512×512 | manifest `any` |
| maskable-512.png | 512×512, content in the central 80% | manifest `maskable` |
| apple-touch-180.png | 180×180 | iOS home screen |
| favicon-32.png, favicon-64.png (optionally favicon.svg) | 32, 64 | browser tab |
| og-1200x630.png | 1200×630 | default share image |
