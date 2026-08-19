/**
 * Reader milestones — the de-gamified successor to itom's achievements system (§7.3).
 *
 * What was deleted, and why: itom shipped six unlock pairs, an "X/6" achievements panel,
 * unlock popups, celebration copy and an `achievement_unlocked` analytics event. Badges,
 * streaks, leaderboards, counters and social proof are PROHIBITED MECHANICS
 * (BUILD_CONTRACT §0.2). None of them exist here, and none may be added.
 *
 * What survives is the machinery only: a ref-guarded, one-shot orientation hint.
 *
 *   - Quiet. One short line, no chrome, no sound, no animation beyond a slow fade.
 *   - Dismissible, and dismissed for good.
 *   - One at a time. A second hint never interrupts a first.
 *   - Private and non-comparative. Nothing is counted, scored, ranked or transmitted:
 *     no milestone ever becomes an event payload.
 *   - Session-scoped. A hint is orientation for a reader who is new to the room, not a
 *     permanent record of what they have done.
 *
 * The itom `contact_choose` / `contact_submit` id mismatch (§7.12 defect 2) cannot recur:
 * ids come from one registry, and `showHint` ignores anything not in it.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { COPY } from '@/config/copy';
import { AREAS, STORAGE_KEYS, mergeNamespaced, readNamespaced } from '@/services/storage';

/**
 * The complete registry. Ids are the keys of `COPY.HINTS`, so a hint without copy cannot
 * exist and copy without a hint is inert.
 */
export const MILESTONE_IDS = Object.freeze(Object.keys(COPY.HINTS));

const MilestonesContext = createContext(null);

/**
 * @returns {{
 *   activeHint: { id: string, text: string }|null,
 *   showHint: (id: string) => void,
 *   dismissHint: (id?: string) => void,
 *   hasSeen: (id: string) => boolean,
 *   reset: () => void,
 * }}
 */
export const useMilestones = () => {
  const context = useContext(MilestonesContext);
  if (!context) throw new Error('useMilestones must be used within a MilestonesProvider');
  return context;
};

/**
 * @param {{ children: React.ReactNode }} props
 */
export const MilestonesProvider = ({ children }) => {
  const [seen, setSeen] = useState(() => {
    const slice = readNamespaced(AREAS.SESSION, STORAGE_KEYS.SESSION, 'milestones');
    return Array.isArray(slice.seen) ? slice.seen : [];
  });
  const [activeHint, setActiveHint] = useState(null);

  /** Ref guard: a hint may be requested many times per session and shown at most once. */
  const shownThisSession = useRef(new Set());

  useEffect(() => {
    mergeNamespaced(AREAS.SESSION, STORAGE_KEYS.SESSION, 'milestones', { seen });
  }, [seen]);

  const hasSeen = useCallback((id) => seen.includes(id), [seen]);

  /**
   * Offer a hint. Silently ignored when the id is unknown, when it has already been shown,
   * or when another hint is on screen — hints never queue up and never compete.
   *
   * @param {string} id
   */
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

  /**
   * @param {string} [id] defaults to the active hint
   */
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
