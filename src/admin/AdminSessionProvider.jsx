/**
 * Holds the signed-in administrator for the lifetime of the tab.
 *
 * The tokens themselves live in `adminApi`, never here and never in browser storage; this
 * provider holds only the administrator summary the API returned, which is what the chrome
 * displays. When `adminApi` cannot recover a session it calls back here, the summary is
 * dropped, and the surface returns to the sign-in form with `expired` set — so an operator is
 * told the session ended rather than silently finding themselves signed out.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  adminApi,
  clearAdminSession,
  setAdminSession,
  setSessionLostHandler,
} from '@/admin/adminApi';
import { AdminSessionContext } from '@/admin/adminSessionContext';

/**
 * @param {{ children: import('react').ReactNode }} props The subtree.
 * @returns {import('react').ReactElement} The provider.
 */
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
      // ==================================================================
      //  INTERIM LOCAL GATE — MUST NOT REACH PRODUCTION
      // ==================================================================
      // A fixed name and password, checked in the browser, with no server involved. It exists
      // so the panel's screens can be built and reviewed before the operations account flow is
      // settled, and it is deliberately loud rather than subtle.
      //
      // What it gives up, so nobody has to rediscover it later:
      //   · The credential is in the JavaScript bundle. Anyone who opens the file has it.
      //   · There is no MFA. §9.2.10 makes it mandatory for every role including the founder.
      //   · There is no server session, so nothing the panel does is actually authorised —
      //     every admin request still needs a real token, and will be refused without one.
      //
      // The credentials go to the SERVER, even under the interim gate.
      //
      // The first version of this checked the password in the browser and set the administrator
      // locally without calling anything. It signed in and then every screen failed on a missing
      // authorization header, because a client-side "yes" mints no token — there was nothing to
      // send. A panel that lets you in and then cannot load a single row is worse than one that
      // refuses you honestly.
      //
      // So the gate lives on the server (`ADMIN_DEV_LOGIN`, refused when NODE_ENV=production)
      // and issues a real session. The only thing the client decides is whether to ask for a
      // second factor, which is presentation.
      const session = await adminApi.login(credentials);
      setAdminSession(session);
      setAdmin(session.admin);
    } catch (error) {
      // The server answers every wrong combination with the same code and message, so the
      // panel does not have to decide how much to reveal (§10.8.2 progressive lockout).
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
      // A logout that never reached the server still ends the session in this tab. The
      // refresh token is dropped either way, so nothing here can be used again.
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
