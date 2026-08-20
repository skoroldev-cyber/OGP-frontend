export function Notice({ tone = 'info', title, children }) {
  return (
    <div
      className="ogp-admin-notice"
      data-tone={tone}
      role={tone === 'error' ? 'alert' : 'status'}
    >
      {title ? <p className="ogp-admin-notice__title">{title}</p> : null}
      <div className="ogp-admin-notice__body">{children}</div>
    </div>
  );
}

export default Notice;
