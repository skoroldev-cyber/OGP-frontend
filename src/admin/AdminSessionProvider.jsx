import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  adminApi,
  clearAdminSession,
  setAdminSession,
  setSessionLostHandler,
} from '@/admin/adminApi';
import { AdminSessionContext } from '@/admin/adminSessionContext';

export function AdminSessionProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState(null);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    setSessionLostHandler(() => {
      setAdmin(null);
      setExpired(true);
    });
    return () => setSessionLostHandler(null);
  }, []);

  const signIn = useCallback(async (credentials) => {
    setPending(true);
    setFailure(null);
    setExpired(false);
    try {
      const session = await adminApi.login(credentials);
      setAdminSession(session);
      setAdmin(session.admin);
    } catch (error) {
      setFailure({ code: error.code, message: error.message });
      throw error;
    } finally {
      setPending(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await adminApi.logout();
    } catch {
      void 0;
    } finally {
      clearAdminSession();
      setAdmin(null);
      setExpired(false);
    }
  }, []);

  const value = useMemo(
    () => ({ admin, pending, failure, expired, signIn, signOut }),
    [admin, pending, failure, expired, signIn, signOut],
  );

  return <AdminSessionContext.Provider value={value}>{children}</AdminSessionContext.Provider>;
}

export default AdminSessionProvider;
