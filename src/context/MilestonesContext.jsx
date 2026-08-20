import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { COPY } from '@/config/copy';
import { AREAS, STORAGE_KEYS, mergeNamespaced, readNamespaced } from '@/services/storage';

export const MILESTONE_IDS = Object.freeze(Object.keys(COPY.HINTS));

const MilestonesContext = createContext(null);

export const useMilestones = () => {
  const context = useContext(MilestonesContext);
  if (!context) throw new Error('useMilestones must be used within a MilestonesProvider');
  return context;
};

export const MilestonesProvider = ({ children }) => {
  const [seen, setSeen] = useState(() => {
    const slice = readNamespaced(AREAS.SESSION, STORAGE_KEYS.SESSION, 'milestones');
    return Array.isArray(slice.seen) ? slice.seen : [];
  });
  const [activeHint, setActiveHint] = useState(null);

  const shownThisSession = useRef(new Set());

  useEffect(() => {
    mergeNamespaced(AREAS.SESSION, STORAGE_KEYS.SESSION, 'milestones', { seen });
  }, [seen]);

  const hasSeen = useCallback((id) => seen.includes(id), [seen]);

  const showHint = useCallback(
    (id) => {
      if (!MILESTONE_IDS.includes(id)) return;
      if (shownThisSession.current.has(id)) return;
      setActiveHint((current) => {
        if (current) return current;
        shownThisSession.current.add(id);
        return { id, text: COPY.HINTS[id] };
      });
    },
    [],
  );

  const dismissHint = useCallback((id) => {
    setActiveHint((current) => {
      const target = id ?? current?.id;
      if (!target) return current;
      setSeen((previous) => (previous.includes(target) ? previous : [...previous, target]));
      return current && current.id === target ? null : current;
    });
  }, []);

  const reset = useCallback(() => {
    shownThisSession.current = new Set();
    setSeen([]);
    setActiveHint(null);
  }, []);

  const value = useMemo(
    () => ({ activeHint, showHint, dismissHint, hasSeen, reset }),
    [activeHint, showHint, dismissHint, hasSeen, reset],
  );

  return <MilestonesContext.Provider value={value}>{children}</MilestonesContext.Provider>;
};

export default MilestonesProvider;
