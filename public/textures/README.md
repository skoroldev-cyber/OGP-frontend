# Textures

None of these files are committed. The application runs without them: every texture is loaded
through `useOptionalTexture`, which returns `null` on a miss, and each component falls back to
procedural shading that still honours the colour law. A missing texture must never produce an
error, a checkerboard, or a visible loading state — darkness is the loading veil (§2.14).

Add the real files here before any release candidate. Until then the build is honest about
being a proof, not a finished experience.

---

## Earth — NASA imagery only

The canonical build decision (§2.6, verbatim): *"NASA-grounded planetary imagery for truth."*
The Earth is scientifically real, borderless, luminous, fragile, and never stylised.

| Source | Use |
|---|---|
| **NASA Blue Marble Next Generation** — monthly true-colour, 500 m/pixel | the surface base texture |
| **NASA DSCOVR EPIC** — daily natural-colour full disk | colour and light truth reference; hero-frame grading |
| **NASA Worldview** — daily global imagery, layers within ~3 hours of observation | deferred to the later data phase (CesiumJS), **not** the first reveal |

### Licensing

NASA imagery is generally not copyrighted and free to use. Three obligations follow it:

1. Attribute **"NASA"** per the NASA Media Usage Guidelines.
2. Never imply NASA endorsement of One Global People.
3. Verify per-collection terms for any third-party layer carried inside a NASA product — not
   everything distributed by NASA is NASA-owned.

Log provenance per texture in the asset register (the Master Dossier requires one): source
collection, acquisition date, processing steps, and the licence line.

### Expected files

`EARTH_TIERS` in `src/config/ogpTheme.js` selects a resolution key per device tier, and the
components build these paths from it. Provide the full set:

| Path | Tier | Notes |
|---|---|---|
| `earth/surface_8k.webp` | HIGH | Blue Marble Next Generation, equirectangular |
| `earth/surface_4k.webp` | MEDIUM | |
| `earth/surface_2k.webp` | LOW | |
| `earth/clouds_4k.webp` | HIGH | alpha-carrying cloud layer, independent sphere |
| `earth/clouds_2k.webp` | MEDIUM | |
| `earth/clouds_1k.webp` | LOW | |
| `earth/ocean_mask_4k.webp` | HIGH | specular mask so water reads as reflective and alive |
| `earth/ocean_mask_2k.webp` | MEDIUM | |
| `earth/ocean_mask_1k.webp` | LOW | |
| `earth/night_4k.webp` | HIGH | night-side city lights — **extremely subtle if used at all** |
| `earth/night_2k.webp` | MEDIUM | omitted entirely on LOW |

On the night side: *"Earth as mother, not civilization as machinery."* If the lights read as a
map of human industry, they are too strong.

### Absolute prohibitions on the Earth (§2.6, §8.9)

No political borders. No country names or labels. No overlays of any kind in the first reveal.
No plastic-globe or cartoon rendering. No neon atmosphere. No fantasy goddess treatment. No
face, no anthropomorphism. No corporate stock-photo glow. No stock-space backdrop. No
exaggerated glow. No visible compression banding — run a dither pass on the void gradient.

The hero-frame test governs the whole asset set: *"If the Earth still frame does not make the
viewer pause, the animation will not save it."*

---

## Opening

| Path | Use |
|---|---|
| `opening/speck_soft.webp` | the S2 warm point — soft radial falloff, no visible edge |
| `opening/depth_mote.webp` | S1 depth particles |
| `opening/weave_strand.webp` | Living Weave strand, dormant |
| `opening/weave_strand_glow.webp` | Living Weave strand, luminous |
| `opening/passage_bands.webp` | S6 tunnel band detail |

The `X.webp` / `X_glow.webp` pair is the re-themed itom two-texture convention: what was
sketch → painted is now **dormant → luminous**, and the existing discard-reveal shader renders
the transition without modification (§8.9).

## Space, room, pathways

| Path | Use |
|---|---|
| `space/starfield_soft.webp` | starfield point sprite — dark, quiet, humble, **not** sci-fi, no flares |
| `room/field_gradient.webp` | Reading Room ambient ground |
| `room/manuscript_artifact.webp` | the closed manuscript object (ambient presence only, never body text) |
| `pathways/panel_field.webp` | S14 ambience |

Also referenced: `/images/earth_hero_still.webp` — the reduced-motion and LOW-tier arrival
frame. This one is a first-class deliverable, not a fallback: *"must be complete, not
secondary."*

---

## Pipeline

WebP everywhere for DOM and standard 3D use; AVIF acceptable for DOM images. For the heavy
Earth and starfield textures, KTX2 / Basis Universal is preferred at 4–8k because GPU-resident
compression is what actually matters at that size — bundle the transcoder locally, never from
a CDN.

The `scripts/` directory of the reference `portfolio-itom-main` codebase carries a working
sharp/jimp power-of-two optimisation pipeline. Retarget it rather than rewriting it.
