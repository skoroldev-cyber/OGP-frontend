/**
 * Read the admin session. Throws outside the provider rather than returning a null the
 * caller would have to guard on every line.
 */

import { useContext } from 'react';
import { AdminSessionContext } from '@/admin/adminSessionContext';

/**
 * @returns {import('@/admin/adminSessionContext').AdminSessionValue} The session.
 */
export function useAdminSession() {
  const value = useContext(AdminSessionContext);
  if (!value) throw new Error('useAdminSession must be used inside AdminSessionProvider.');
  return value;
}

export default useAdminSession;
