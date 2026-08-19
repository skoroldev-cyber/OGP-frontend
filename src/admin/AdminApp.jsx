/**
 * The operations panel — a separate application that happens to share an origin.
 *
 * It is mounted from `src/routes.jsx` as a lazy route at `/admin-panel/*` and imports nothing
 * from the experience: no `ExperienceProvider`, no `ReadingProvider`, no R3F canvas, no Spline
 * runtime, no GSAP. That is a hard boundary rather than a preference. §10.10.1 specifies
 * "plain React 19 + React Router … no React Three Fiber, no GSAP, no immersive machinery — an
 * internal tool that stays boring, fast, maintainable", and an import from here into the
 * experience tree would pull the entire scene graph into a chunk an operator downloads to
 * read a table.
 *
 * What it does share is the token family, inverted into a light theme, which §8.8 permits for
 * "support surfaces outside the experience". The same organisation, read from the other end.
 *
 * Never linked from any reader-facing page, and marked `noindex` while it is mounted
 * (§10.10.1). The mark is applied here rather than in `index.html` because that document is
 * the reader's, and the reader's pages must remain indexable.
 */

import { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import { ADMIN_SEGMENTS, adminPath } from "@/admin/adminPaths";
import { AdminLayout } from "@/admin/AdminLayout";
import { AdminLogin } from "@/admin/AdminLogin";
import { AdminSessionProvider } from "@/admin/AdminSessionProvider";
import { useAdminSession } from "@/admin/useAdminSession";
import { AuditScreen } from "@/admin/screens/AuditScreen";
import { CohortsScreen } from "@/admin/screens/CohortsScreen";
import { FeedbackDetail } from "@/admin/screens/FeedbackDetail";
import { FeedbackScreen } from "@/admin/screens/FeedbackScreen";
import { InvitationsScreen } from "@/admin/screens/InvitationsScreen";
import { MetricsScreen } from "@/admin/screens/MetricsScreen";
import { ResponseDetail } from "@/admin/screens/ResponseDetail";
import { ResponsesScreen } from "@/admin/screens/ResponsesScreen";
import { TemplatesScreen } from "@/admin/screens/TemplatesScreen";

/** Kept out of every index and out of the sitemap (§10.10.1). */
const ROBOTS_DIRECTIVE = "noindex, nofollow";

/**
 * The signed-in panel. Split from `AdminApp` so the session provider is above it and the
 * gate below it: an operator who is not signed in never mounts a screen that would fire a
 * request the server is bound to refuse.
 *
 * @returns {import('react').ReactElement} The sign-in form, or the panel.
 */
const AdminSurface = () => {
  const { admin } = useAdminSession();
  if (!admin) return <AdminLogin />;

  const home = adminPath(ADMIN_SEGMENTS.INVITATIONS);

  return (
    <AdminLayout>
      <Routes>
        {/* Invitations is the landing screen because it is the screen with the daily work
            on it (§10.7.2, the founder's "five minutes a day"). */}
        <Route index element={<Navigate to={home} replace />} />
        <Route
          path={ADMIN_SEGMENTS.INVITATIONS}
          element={<InvitationsScreen />}
        />
        <Route path={ADMIN_SEGMENTS.TEMPLATES} element={<TemplatesScreen />} />
        <Route path={ADMIN_SEGMENTS.FEEDBACK} element={<FeedbackScreen />} />
        <Route
          path={`${ADMIN_SEGMENTS.FEEDBACK}/:feedbackId`}
          element={<FeedbackDetail />}
        />
        <Route path={ADMIN_SEGMENTS.COHORTS} element={<CohortsScreen />} />
        <Route path={ADMIN_SEGMENTS.RESPONSES} element={<ResponsesScreen />} />
        <Route
          path={`${ADMIN_SEGMENTS.RESPONSES}/:responseId`}
          element={<ResponseDetail />}
        />
        <Route path={ADMIN_SEGMENTS.METRICS} element={<MetricsScreen />} />
        <Route path={ADMIN_SEGMENTS.AUDIT} element={<AuditScreen />} />
        <Route path="*" element={<Navigate to={home} replace />} />
      </Routes>
    </AdminLayout>
  );
};

/**
 * @returns {import('react').ReactElement} The panel.
 */
export default function AdminApp() {
  useEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = ROBOTS_DIRECTIVE;
    document.head.appendChild(meta);

    // `_base.scss` paints the document `void-deep` so the reader never sees a white
    // flash before the first frame. On this surface that shows as a dark band under a
    // short page and behind an overscroll bounce, so the root is marked and the light
    // background applied there for as long as the panel is mounted.
    const root = document.documentElement;
    root.dataset.surface = "admin";

    return () => {
      meta.remove();
      delete root.dataset.surface;
    };
  }, []);

  return (
    <div className="ogp-admin">
      <AdminSessionProvider>
        <AdminSurface />
      </AdminSessionProvider>
    </div>
  );
}
