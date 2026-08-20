import { useCallback, useState } from 'react';

import { COPY } from '@/config/copy';
import { adminApi } from '@/admin/adminApi';
import { ResourceState } from '@/admin/components/ResourceState';
import { useAdminResource } from '@/admin/useAdminResource';
import { InvitationCompose } from '@/admin/screens/InvitationCompose';
import { InvitationList } from '@/admin/screens/InvitationList';

export function InvitationsScreen() {
  const [reloadSignal, setReloadSignal] = useState(0);

  const loadReference = useCallback(
    () => Promise.all([adminApi.listCohorts(), adminApi.listTemplates()]),
    [],
  );
  const { status, data, error, reload } = useAdminResource(loadReference);

  const onSent = useCallback(() => setReloadSignal((value) => value + 1), []);

  const cohorts = data?.[0]?.cohorts ?? [];
  const templates = data?.[1]?.templates ?? [];

  return (
    <>
      <header className="ogp-admin-screen-head">
        <h1 className="ogp-admin-screen-heading">{COPY.ADMIN.INVITATIONS.HEADING}</h1>
        <p className="ogp-admin-screen-intro">{COPY.ADMIN.INVITATIONS.INTRO}</p>
      </header>

      <ResourceState status={status} error={error} onRetry={reload}>
        <InvitationCompose cohorts={cohorts} templates={templates} onSent={onSent} />
        <InvitationList cohorts={cohorts} reloadSignal={reloadSignal} />
      </ResourceState>
    </>
  );
}

export default InvitationsScreen;
