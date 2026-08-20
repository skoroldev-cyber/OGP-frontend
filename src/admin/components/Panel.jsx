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
