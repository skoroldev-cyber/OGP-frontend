import { OGP_TIMING } from '@/config/ogpTheme';
import { COPY } from '@/config/copy';
import { useTypography } from '@/components/dom/ReadingSurface/TypographyProvider';

const HEADING_TAGS = { 1: 'h2', 2: 'h3', 3: 'h4' };

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

const Runs = ({ runs }) =>
  (runs ?? []).map((run, index) => <Run key={`run-${index}`} run={run} />);

const Lines = ({ lines }) =>
  (lines ?? []).map((line, index) => (
    <span key={`line-${index}`}>
      {index > 0 && <br />}
      <Runs runs={line?.runs} />
    </span>
  ));

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
      return (
        <p className="ogp-manuscript__cue">
          <Runs runs={block.runs} />
        </p>
      );

    default:
      return null;
  }
};

const Blocks = ({ blocks, fadeEpigraphs }) =>
  (blocks ?? []).map((block, index) => (
    <Block key={`block-${index}`} block={block} fadeEpigraphs={fadeEpigraphs} />
  ));

export const ManuscriptUnitView = ({ unit }) => {
  const { reducedMotion } = useTypography();

  if (!unit) return null;

  const blocks = Array.isArray(unit.blocks) ? unit.blocks : [];
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
