# Stadium art: delivery pipeline

Phase 2, Stage 1b. This note covers engineering only. The art itself (Night Bowl, The Tunnel, Under the Lights, each in phone and desktop versions) is directed and created by the Creative Director (decision 0040). David approved the brief on 2026-11-07. Engineering does not create, source or substitute production art.

## What the art has to be

These are David's requirements. Engineering checks them on delivery and does not judge the creative choices.

- It must read as authentic college football photography and be team-neutral: no logos, no identifiable stadiums and no uniforms.
- The field must be accurate to NCAA rules:
  - lines every 5 yards, numbered 10…50…10;
  - college hash marks;
  - yard-line extensions, goal lines and end zones;
  - realistic perspective.
- It needs a licence or provenance record we can keep in the repository.

## Where it goes

The stage already has a slot for the art. No markup changes.

- The art slot's background is drawn in this order, top to bottom: the team-surface light, `var(--s-art-env, none)`, then the team gradient. The same order applies under the day and night atmospheres (`app.css`, "Art slot").
- Setting `--s-art-env` puts one shared image under every team's light, field and scrim:
  - one value for phone and one for desktop, chosen with a container or media query;
  - day and night variants through `.art-day` and `.art-night` if the compositions call for them.
- The drawn field (`--s-art-field`, `suite/ui.js` FIELD) is the fallback. It is the true NCAA projection and stays in place until approved photography replaces it.
- Team photography (`identity.art`, `.art-slot.has-photo`) still takes precedence over shared art, behind its own scrim.

## Encoding and delivery

| | |
|---|---|
| Location | `assets/suite/art/<name>-<phone\|desktop>.<avif\|webp\|jpg>` |
| Formats | AVIF first, WebP second, JPEG as the last resort, via `image-set()` |
| Size | Phone 1080 px wide, desktop 2400 px wide. Target 120 KB or less per AVIF; measure before committing. |
| Caching | Precached as non-essential (`sw.js essential()`). A missing photograph never blocks an install or an update, and the stage draws its own light and field without one. |
| Fallback | If no image arrives, the stage is the finished drawn composition: the same lights, field and grain shown today. Never a grey box or a stock photo. |
| Motion | Static. No parallax, no animated filter. Reduced motion has nothing to turn off. |

## Gates that apply on delivery

- **`tools/herocontrastcheck.js`:** every team's stage, with every lighting and state, measured from the rendered pixels at WCAG AA. Shared art sits under the text, so the check measures it automatically once `--s-art-env` is set. If any team fails, the art needs a darker treatment or a stronger scrim before it ships.
- **`versioncheck`:** new shell files need a new `VERSION` in `sw.js`.
- **Visual review:** the specimen (`tools/specimen/index.html`, "Atmosphere") shows the art under both teams in both App Styles.
