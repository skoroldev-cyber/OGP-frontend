import { NavLink } from 'react-router-dom';

import { COPY } from '@/config/copy';
import { ADMIN_SEGMENTS, adminPath } from '@/admin/adminPaths';
import { useAdminSession } from '@/admin/useAdminSession';

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
