import { useCallback, useEffect, useState } from 'react';

export function useAdminResource(load) {
  const [state, setState] = useState({ status: 'loading', data: null, error: null });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    load()
      .then((data) => {
        if (live) setState({ status: 'ready', data, error: null });
      })
      .catch((error) => {
        if (live) setState({ status: 'failed', data: null, error });
      });
    return () => {
      live = false;
    };
  }, [load, attempt]);

  const reload = useCallback(() => setAttempt((value) => value + 1), []);

  return { ...state, reload };
}

export default useAdminResource;
