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

const ROBOTS_DIRECTIVE = "noindex, nofollow";

const AdminSurface = () => {
  const { admin } = useAdminSession();
  if (!admin) return <AdminLogin />;

  const home = adminPath(ADMIN_SEGMENTS.INVITATIONS);

  return (
    <AdminLayout>
      <Routes>
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

export default function AdminApp() {
  useEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = ROBOTS_DIRECTIVE;
    document.head.appendChild(meta);

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
