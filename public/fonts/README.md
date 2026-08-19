# Fonts

Two faces, both self-hosted. There is no runtime dependency on Google Fonts or any other third
party — the public build makes no third-party network request (§7.13 definition of done).

Neither file is committed. `_base.scss` declares a system fallback stack, so the application
builds and runs without them; the typography is simply not yet final. Add the real files before
any release candidate.

| Role | Face | File `index.html` preloads |
|---|---|---|
| Manuscript serif | **Literata** (variable) | `literata-variable.woff2` |
| UI sans | **Inter** (variable) | `inter-variable.woff2` |

The filenames are load-bearing: `index.html` preloads exactly these two paths and `_base.scss`
declares `@font-face` against them. If you ship a different file name, change both.

## Why these two

Literata is designed for long-form digital reading and renders warmly on dark surfaces, which
matters here more than usual: the reading pair is `#efe9dc` on `#12110e`, and a face that goes
brittle at that contrast will halate over a sixty-seven-minute read. §8.4.1 lists Source Serif
4, EB Garamond and Crimson Pro as the alternatives the founder may select instead. **One face
only across the entire manuscript surface** — there is no secondary serif.

Inter is the UI face and never appears inside the manuscript surface. The division is
deliberate: *the serif is the voice of the work; the sans is the voice of the machine, and the
machine stays out of the opening* (§8.4.2). Threshold display lines — the question, the first
words, "Enter" — are set in the serif for exactly that reason.

Both are SIL Open Font License 1.1. Self-hosting and subsetting are permitted; keep the licence
text alongside the files when you add them.

## Subsetting

Variable WOFF2, Latin + Latin-Extended-A, keeping the weight axis so the manuscript can carry
the founder's bold emphasis (the source DOCX marks it, the ingestion preserves it as
`runs[].bold`, and the reading surface renders it as `<strong>` — a static regular-only subset
would silently discard authored emphasis).

```bash
pip install fonttools brotli

pyftsubset Literata-VariableFont.ttf \
  --output-file=literata-variable.woff2 \
  --flavor=woff2 \
  --layout-features='*' \
  --unicodes='U+0000-00FF,U+0100-017F,U+2000-206F,U+2070-209F,U+20A0-20BF,U+2190-21BB,U+2212,U+2215,U+FEFF,U+FFFD' \
  --drop-tables+=DSIG

pyftsubset Inter-VariableFont.ttf \
  --output-file=inter-variable.woff2 \
  --flavor=woff2 \
  --layout-features='*' \
  --unicodes='U+0000-00FF,U+0100-017F,U+2000-206F,U+2212,U+FEFF,U+FFFD' \
  --drop-tables+=DSIG
```

Keep the em dash (U+2014), en dash (U+2013) and the curly quotes in the subset. The manuscript
uses them as authored punctuation and §8.4.1 forbids normalising it: Chapter 0 uses em dashes
in its section headings and Chapter 1 uses en dashes, and that difference is canonical text,
not an inconsistency to tidy.

## Canvas text

If any 3D text is ever needed, drei's troika `Text` wants a TTF or WOFF alongside the WOFF2.
The reference itom codebase used CabinSketch, RubikScribble, FrederickatheGreat and SatisfySL;
all four are gone. Note that the manuscript itself is **never** rendered in the canvas — it
lives in the DOM so it can be selected, found, scaled, and read by a screen reader (§3.12).
