/**
 * One read from the admin API, with its own status.
 *
 * The loader is supplied by the caller, wrapped in `useCallback` over whatever filters it
 * closes over — so changing a filter changes the loader identity, which is what re-runs the
 * read. There is no filter vocabulary in here; every screen owns its own.
 *
 * The previous result stays on screen while the next one is in flight. That is deliberate:
 * an operator changing a filter should see the table they were reading until it is replaced,
 * rather than the table disappearing and the page jumping. Only the first read shows a
 * loading line, because until then there is nothing to keep.
 */

import { useCallback, useEffect, useState } from 'react';

/**
 * @template T
 * @param {() => Promise<T>} load The read, stable across renders.
 * @returns {{ status: 'loading'|'ready'|'failed', data: T|null, error: Error|null,
 *             reload: () => void }} The resource.
 */
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
