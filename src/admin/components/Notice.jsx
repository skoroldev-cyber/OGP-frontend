/**
 * A message about something that just happened — a refusal, a save, a partial send.
 *
 * Announced through a live region rather than shown in a dialog. §14.4.1 prohibits popups and
 * forced overlays anywhere in the platform, and an operator who has just been told their copy
 * was refused needs the editor still in front of them, not behind a sheet.
 */

/**
 * @param {{ tone?: 'error'|'success'|'info', title?: string,
 *           children: import('react').ReactNode }} props The message.
 * @returns {import('react').ReactElement} The region.
 */
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
