# Brand assets

The SVGs here are **engineering placeholders**. They implement the specification faithfully —
gold family, woven bands, an open centre, no neon, no flare — but the production marks come
from the Design Bible, which the corpus references and does not contain.

## The three logos (§8.6)

| # | Name | Form | Communicates |
|---|---|---|---|
| 1 | **Living Origin Field** | luminous micro-particle field | "The ecosystem is alive." |
| 2 | **Canonical One Global Logo** | the centre emblem, woven | "The ecosystem has structure." |
| 3 | **Radiant Sovereignty** | a seal — "a mark of arrival" | "The structure has become realized." |

**Phase 1 uses Logo 2 everywhere**, and it is Logo 2's form that the Living Weave resolves into
at S3. Phase 2 brings Logo 1 to the homepage, Reading Room and immersive environments. Phase 3
introduces Logo 3 as an earned status seal — *"Not for everyday use. Reserved. Rare. Earned."*
Logo 3 never appears on the landing.

The S2 golden-energy field is deliberately continuous with Logo 1's visual language, so the
Phase 2 upgrade is an asset and behaviour swap rather than a re-choreography. That is also why
`LivingWeave.jsx` takes its guide splines from data (`opening/weaveGuides.js`,
`/brand/logo2/weave_guides.json`) instead of hardcoded geometry.

## Files here

| File | Use |
|---|---|
| `favicon.svg` | browser tab; the opening must survive to 16px |
| `logo-canonical.svg` | presentation scale |
| `og-image.svg` | 1200×630 social card, no tagline baked in |

## Still required (§8.6.4)

- **Vector masters** — optimised SVG plus PDF/EPS for print. Logo 2 additionally needs an
  embossing die vector for the hardcover and one-colour reversed variants. Logo 3 needs a
  foil-stamp-ready vector.
- **Raster exports** — PNG and WebP at 256 / 512 / 1024 / 2048 px, transparent; AVIF where
  supported. `site.webmanifest` expects `icon-192.png`, `icon-512.png` and
  `icon-maskable-512.png`.
- **Favicon set** — `favicon.ico`, 32 and 64 px PNG, 180 px `apple-touch-icon`, maskable 512 px.
- **OG image** — a WebP export of `og-image.svg` at `og-image.webp` (some crawlers will not
  render SVG; `index.html` points at the WebP).
- **`logo2/canonical_512.webp`** — referenced by the asset manifest.
- **`logo2/weave_guides.json`** — the emblem silhouette as point seeds, driving the S3
  convergence. Until it exists, `weaveGuides.js` generates the band geometry procedurally.
- **Logo 1 runtime data (Phase 2)** — `logo1/field_seed.json`, plus a pre-rendered loop video
  (WebM + H.264) for the reduced-motion and LOW-tier paths.

## Usage law

Clear space ≥ 0.5× the emblem width. Minimum render size 24 px, the favicon excepted. Inside
the experience the logos appear **only on dark fields** — never boxed, never on white.

## Open question

Which Design Bible asset is the "second logo version, with the clearer central opening" —
mapping that phrase onto the recovered assets A-001 / A-002 / C-001 (Base Weave / Living Energy
Weave family) needs founder confirmation at Gate 1 packaging. The placeholders here assume the
reading that the centre must be unambiguously an *entrance*, because the entire S4 beat depends
on it: *"What first appeared to be an emblem is revealed to be an entrance."*
