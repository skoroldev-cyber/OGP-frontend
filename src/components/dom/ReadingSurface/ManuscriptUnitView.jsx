/**
 * The manuscript renderer — `blocks[]` → semantic DOM (BUILD_CONTRACT §6, master §3.4.1,
 * §3.10).
 *
 * **The manuscript is never rendered as canvas or WebGL text.** This DOM is the work, and
 * for S8–S13 the accessible tree IS the experience. Everything below follows from that:
 *
 *  - `<main>` (owned by `ReadingSurface`) → `<article>` per unit, carrying `data-unit-id`
 *    so a Founding Reader can "name the section, page, or passage" (§3.4.2, §5.8 Q2).
 *  - Real heading hierarchy with the EXACT authored strings, never normalised: the source's
 *    own punctuation differs by chapter (em-dash in Chapter 0, en-dash in Chapter 1) and the
 *    text is canonical (§8.4.1). Contract levels map 1 → `<h2>` (chapter), 2 → `<h3>`
 *    (section), 3 → `<h4>`; `<h1>` belongs to the document, not to a unit.
 *  - One-signature epigraphs → `<blockquote>` + `<cite>`, larger, gold, with ≥ 2 line-heights
 *    of breathing space: "When you see that signature, pause. Listen." The pause is rendered
 *    as space, never as a forced timer.
 *  - **Stanzas never re-wrap into prose.** Source line breaks are semantic; each line is a
 *    hard `<br>` inside one `<p>`, exactly as authored (§3.4.1, immutable text).
 *  - Micro-stories → inset `<aside>` with a small-caps title, spelled exactly as authored
 *    (the spelling differs by chapter, and is not corrected).
 *  - `runs[].bold` → `<strong>`, `runs[].italic` → `<em>` — founder emphasis recovered from
 *    the DOCX and preserved through the wire (§3.4.1).
 *  - Dividers → one restrained typographic rule. Cues → manuscript text, in the manuscript's
 *    own voice, so an authored "Turn the page." stays the author's line and never becomes a
 *    control label (§3.4.2).
 *
 * Nothing here transforms the text. No trimming, no smart quotes, no capitalisation, no
 * hyphenation dictionary, no truncation: the Opening Arc text is immutable and this
 * component only gives it structure.
 */

import { OGP_TIMING } from '@/config/ogpTheme';
import { COPY } from '@/config/copy';
import { useTypography } from '@/components/dom/ReadingSurface/TypographyProvider';

/** Contract heading level → element. `<h1>` is the document's, never a unit's. */
const HEADING_TAGS = { 1: 'h2', 2: 'h3', 3: 'h4' };

/**
 * One inline run. `bold` and `italic` are independent and may both be set.
 *
 * @param {{ run: { text: string, bold?: boolean, italic?: boolean } }} props
 */
const Run = ({ run }) => {
  const text = run?.text ?? '';
  if (run?.bold && run?.italic) {
    return (
      <strong>
        <em>{text}</em>
      </strong>
    );
  }
  if (run?.bold) return <strong>{text}</strong>;
  if (run?.italic) return <em>{text}</em>;
  return text;
};

/**
 * A run sequence.
 *
 * @param {{ runs: Array<Object> }} props
 */
const Runs = ({ runs }) =>
  (runs ?? []).map((run, index) => <Run key={`run-${index}`} run={run} />);

/**
 * Authored lines with hard breaks between them. Used by stanzas and epigraphs, which are
 * the two shapes whose line breaks are semantic.
 *
 * @param {{ lines: Array<{ runs: Array<Object> }> }} props
 */
const Lines = ({ lines }) =>
  (lines ?? []).map((line, index) => (
    <span key={`line-${index}`}>
      {index > 0 && <br />}
      <Runs runs={line?.runs} />
    </span>
  ));

/**
 * One block. The switch is exhaustive over the contract's seven shapes; an unknown shape
 * renders nothing rather than guessing, because guessing at manuscript structure would be
 * a transformation of immutable text.
 *
 * @param {{ block: Object, fadeEpigraphs: boolean }} props
 */
const Block = ({ block, fadeEpigraphs }) => {
  switch (block?.type) {
    case 'heading': {
      const Tag = HEADING_TAGS[block.level] ?? 'h4';
      return (
        <Tag className={`ogp-manuscript__heading ogp-manuscript__heading--${block.level ?? 3}`}>
          {block.text}
        </Tag>
      );
    }

    case 'paragraph':
      return (
        <p className="ogp-manuscript__paragraph">
          <Runs runs={block.runs} />
        </p>
      );

    case 'stanza':
      // Breath-paced single-thought lines. One paragraph, hard breaks, never re-flowed.
      return (
        <p className="ogp-manuscript__stanza">
          <Lines lines={block.lines} />
        </p>
      );

    case 'epigraph':
      return (
        <blockquote
          className="ogp-manuscript__epigraph"
          data-fade={fadeEpigraphs ? 'true' : 'false'}
          style={fadeEpigraphs ? { '--ogp-epigraph-fade': `${OGP_TIMING.epigraphFadeMs}ms` } : undefined}
        >
          <p className="ogp-manuscript__epigraph-lines">
            <Lines lines={block.lines} />
          </p>
          {block.attribution && (
            <cite className="ogp-manuscript__attribution">{block.attribution}</cite>
          )}
        </blockquote>
      );

    case 'microstory':
      return (
        <aside className="ogp-manuscript__microstory">
          {block.title && <h4 className="ogp-manuscript__microstory-title">{block.title}</h4>}
          <Blocks blocks={block.blocks} fadeEpigraphs={fadeEpigraphs} />
        </aside>
      );

    case 'divider':
      return <hr className="ogp-manuscript__divider" />;

    case 'cue':
      // An authored reader cue. It is manuscript text: the manuscript keeps the voice, and
      // the continue affordance sits beneath it rather than borrowing its words (§3.4.2).
      return (
        <p className="ogp-manuscript__cue">
          <Runs runs={block.runs} />
        </p>
      );

    default:
      return null;
  }
};

/**
 * @param {{ blocks: Array<Object>, fadeEpigraphs: boolean }} props
 */
const Blocks = ({ blocks, fadeEpigraphs }) =>
  (blocks ?? []).map((block, index) => (
    <Block key={`block-${index}`} block={block} fadeEpigraphs={fadeEpigraphs} />
  ));

/**
 * One manuscript unit.
 *
 * @param {{ unit: Object }} props the shape returned by `GET /manuscript/units/:unitId`
 */
export const ManuscriptUnitView = ({ unit }) => {
  const { reducedMotion } = useTypography();

  if (!unit) return null;

  const blocks = Array.isArray(unit.blocks) ? unit.blocks : [];
  // Every unit gets a stable landmark. Most carry a level-1 heading whose text is the
  // canonical title; the front-matter unit does not, so one is supplied for assistive
  // technology without inventing anything visible.
  const hasTopHeading = blocks.some((block) => block?.type === 'heading' && block.level === 1);
  const landmarkId = `ogp-unit-${unit.unitId}`;

  return (
    <article
      className="ogp-manuscript"
      data-unit-id={unit.unitId}
      data-unit-type={unit.unitType ?? undefined}
      data-sequence-index={unit.sequenceIndex ?? undefined}
      aria-labelledby={landmarkId}
      lang="en"
    >
      {!hasTopHeading && (
        <h2 className="ogp-visually-hidden" id={landmarkId}>
          {unit.canonicalTitle || COPY.READING.MANUSCRIPT_LABEL}
        </h2>
      )}

      {hasTopHeading ? (
        <div id={landmarkId}>
          <Blocks blocks={blocks} fadeEpigraphs={!reducedMotion} />
        </div>
      ) : (
        <Blocks blocks={blocks} fadeEpigraphs={!reducedMotion} />
      )}
    </article>
  );
};

export default ManuscriptUnitView;
