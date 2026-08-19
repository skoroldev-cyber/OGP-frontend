/**
 * A titled region of a screen.
 *
 * Every panel is a real `<section>` with a real heading, so the panel structure is the
 * document structure and a screen reader's landmark list matches what is on the page.
 */

/**
 * @param {{ title: string, description?: string, actions?: import('react').ReactNode,
 *           children: import('react').ReactNode, level?: 2|3 }} props The panel.
 * @returns {import('react').ReactElement} The section.
 */
export function Panel({ title, description, actions, children, level = 2 }) {
  const Heading = level === 3 ? 'h3' : 'h2';
  return (
    <section className="ogp-admin-panel">
      <div className="ogp-admin-panel__head">
        <div className="ogp-admin-panel__title">
          <Heading className="ogp-admin-panel__heading">{title}</Heading>
          {description ? <p className="ogp-admin-panel__description">{description}</p> : null}
        </div>
        {actions ? <div className="ogp-admin-panel__actions">{actions}</div> : null}
      </div>
      <div className="ogp-admin-panel__body">{children}</div>
    </section>
  );
}

export default Panel;
