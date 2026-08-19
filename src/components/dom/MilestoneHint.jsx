/**
 * Quiet, dismissible, one-time orientation hints (master §7.3).
 *
 * The de-gamified successor to itom's achievements panel. What was deleted and may never
 * return: badges, counters, "X of 6" progress, unlock popups, celebration copy, chimes, and
 * the `achievement_unlocked` event. Badges, streaks, leaderboards, counters and social
 * proof are PROHIBITED MECHANICS (BUILD_CONTRACT §0.2).
 *
 * What is left is orientation: one short line telling a reader who is new to the room how
 * the room works, shown once, dismissible for good, and never transmitted anywhere — no
 * milestone becomes an event payload.
 *
 * It is `role="status"` with `aria-live="polite"`, not an alert: a hint that interrupted
 * would be a popup with better manners.
 */

import { useCallback } from 'react';

import { COPY } from '@/config/copy';
import { useMilestones } from '@/context/MilestonesContext';

export const MilestoneHint = () => {
  const { activeHint, dismissHint } = useMilestones();

  const onDismiss = useCallback(() => dismissHint(), [dismissHint]);

  if (!activeHint) return null;

  return (
    <div className="ogp-milestone-hint" role="status" aria-live="polite">
      <p className="ogp-milestone-hint__text">{activeHint.text}</p>
      <button type="button" className="ogp-milestone-hint__dismiss" onClick={onDismiss}>
        {COPY.A11Y.DISMISS}
      </button>
    </div>
  );
};

export default MilestoneHint;
