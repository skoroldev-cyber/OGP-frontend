/**
 * The panel's chrome: a sidebar of sections, who is signed in, and the way out.
 *
 * §10.5 fixes the shape — "each view maps 1:1 to an API route group" — and the tone: "plain,
 * information-dense internal styling — the cinematic design mandate (§8) applies to the
 * reader experience, not to this tool." So there is no threshold styling here, no serif
 * display type, and no scene. Inter throughout; the manuscript face appears only where
 * manuscript text is shown, which is the feedback detail and nowhere else.
 *
 * The sidebar is a real `<nav>` of `NavLink`s, so the current section is announced through
 * `aria-current` rather than through colour alone, and the whole panel is operable from the
 * keyboard in document order behind one skip link.
 */

import { NavLink } from 'react-router-dom';

import { COPY } from '@/config/copy';
import { ADMIN_SEGMENTS, adminPath } from '@/admin/adminPaths';
import { useAdminSession } from '@/admin/useAdminSession';

/** The sidebar, in order. Each entry is one screen over one API route group (§10.5). */
const SECTIONS = [
  { segment: ADMIN_SEGMENTS.INVITATIONS, label: COPY.ADMIN.NAV.INVITATIONS },
  { segment: ADMIN_SEGMENTS.TEMPLATES, label: COPY.ADMIN.NAV.TEMPLATES },
  { segment: ADMIN_SEGMENTS.FEEDBACK, label: COPY.ADMIN.NAV.FEEDBACK },
  { segment: ADMIN_SEGMENTS.COHORTS, label: COPY.ADMIN.NAV.COHORTS },
  { segment: ADMIN_SEGMENTS.RESPONSES, label: COPY.ADMIN.NAV.RESPONSES },
  { segment: ADMIN_SEGMENTS.METRICS, label: COPY.ADMIN.NAV.METRICS },
  { segment: ADMIN_SEGMENTS.AUDIT, label: COPY.ADMIN.NAV.AUDIT },
];

const CONTENT_ID = 'ogp-admin-content';

/**
 * @param {{ children: import('react').ReactNode }} props The active screen.
 * @returns {import('react').ReactElement} The layout.
 */
export function AdminLayout({ children }) {
  const { admin, signOut } = useAdminSession();

  return (
    <div className="ogp-admin-layout">
      <a className="ogp-admin-skip" href={`#${CONTENT_ID}`}>
        {COPY.ADMIN.SHELL.SKIP_TO_CONTENT}
      </a>

      <header className="ogp-admin-topbar">
        <div className="ogp-admin-topbar__identity">
          <span className="ogp-admin-topbar__organisation">{COPY.ADMIN.SHELL.TITLE}</span>
          <span className="ogp-admin-topbar__surface">{COPY.ADMIN.SHELL.SUBTITLE}</span>
        </div>

        <div className="ogp-admin-topbar__account">
          <span className="ogp-admin-topbar__who">
            <span className="ogp-admin-topbar__who-label">{COPY.ADMIN.SHELL.SIGNED_IN_AS}</span>{' '}
            {admin?.displayName || admin?.email}
          </span>
          <span className="ogp-admin-topbar__role">
            <span className="ogp-admin-topbar__who-label">{COPY.ADMIN.SHELL.ROLE}</span>{' '}
            {admin?.role}
          </span>
          <button type="button" className="ogp-admin-button" onClick={() => signOut()}>
            {COPY.ADMIN.SHELL.SIGN_OUT}
          </button>
        </div>
      </header>

      <div className="ogp-admin-body">
        <nav className="ogp-admin-nav" aria-label={COPY.ADMIN.SHELL.NAV_LABEL}>
          <ul className="ogp-admin-nav__list" role="list">
            {SECTIONS.map((section) => (
              <li key={section.segment}>
                <NavLink
                  className="ogp-admin-nav__link"
                  to={adminPath(section.segment)}
                  end={false}
                >
                  {section.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <main className="ogp-admin-main" id={CONTENT_ID} aria-label={COPY.ADMIN.SHELL.MAIN_LABEL}>
          {children}
        </main>
      </div>
    </div>
  );
}

export default AdminLayout;
