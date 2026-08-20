import { useContext } from 'react';
import { AdminSessionContext } from '@/admin/adminSessionContext';

export function useAdminSession() {
  const value = useContext(AdminSessionContext);
  if (!value) throw new Error('useAdminSession must be used inside AdminSessionProvider.');
  return value;
}

export default useAdminSession;
