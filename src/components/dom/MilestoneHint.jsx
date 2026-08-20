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
