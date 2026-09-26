# Suite identity assets

The installable product is Suite, whatever team a fan selects
(decision 0024 §11). These files are its install, share and header identity:
the **Suite Release Identity Pack v1**, installed unchanged.

- Ink `#111D35`, Pearl `#F1F2F0`.
- The full wordmark is the approved custom vector lettering; the app mark
  (`suite-app-mark.svg`, the icons and favicons) is its exact custom **S** -
  the wide wordmark is never squeezed into a square.

| File | Size | Use |
|---|---|---|
| icon-192.png | 192×192 | manifest `any` |
| icon-512.png | 512×512 | manifest `any` |
| maskable-512.png | 512×512, the S well inside the central 80% | manifest `maskable` |
| apple-touch-180.png | 180×180 | iOS home screen |
| favicon.svg, favicon-32.png, favicon-64.png | scalable, 32, 64 | browser tab |
| og-1200x630.png | 1200×630 | default share image |
| suite-wordmark-pearl.svg | 662:132 | the dark Suite header (`index.html` `.wordmark`) |
| suite-wordmark-ink.svg | 662:132 | light surfaces (not used yet) |
| suite-wordmark-*.png, suite-app-mark.svg | | fallbacks and source, from the pack |

`tools/identitycheck.js --release` fails if any shell file references a
`TEMPORARY-*` asset; CI runs it for `main` and PRs into it.

The full Suite Style token system (Pearl surfaces and the rest) is a
separate post-launch pass - see `docs/engineering/suite-redesign-completion.md`.
