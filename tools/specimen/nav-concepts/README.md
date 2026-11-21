# Desktop navigation concepts: evaluation only

These stylesheets are injected into the real app by `tools/capture.js` (`CAPTURE_CSS=...`) so each concept can be judged on the actual Suite: real components, tokens and fixture data. The app never loads them. Phones and tablets are untouched: every rule sits behind `@media (min-width:64rem)`.

| File | Concept |
|---|---|
| `a-rail.css` | A, rail: a persistent left rail beside the content, aligned to the grid |
| `a-dock.css` | A, docked bar: the full-width bottom bar aligned to the content column (what the Stage 1b specimen showed) |
| `b-header.css` | B: the five destinations inside the branded desktop header; the bottom bar is gone |
| `guide.css` | Optional overlay: the canvas each concept leaves for the wide (72rem) desktop grid, as a dashed outline |

Same five destinations and behaviour in all three: the hash routes, the selected state and the Game live light.
