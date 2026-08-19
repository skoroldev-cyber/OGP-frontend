/**
 * The three states every read can be in, rendered the same way everywhere.
 *
 * A refusal shows the server's own code and message. That is the opposite of the reader's
 * client, which never surfaces one — an operator is the person who has to act on a 403, a
 * 422 from the copy lint, or a 423 from the canonical lock, and hiding it would leave them
 * guessing.
 */

import { COPY } from '@/config/copy';
import { messageForError } from '@/admin/adminFormat';
import { Notice } from '@/admin/components/Notice';

/**
 * @param {{ status: 'loading'|'ready'|'failed', error?: Error|null, isEmpty?: boolean,
 *           emptyMessage?: string, onRetry?: () => void,
 *           children: import('react').ReactNode }} props The state.
 * @returns {import('react').ReactNode} What to show.
 */
export function ResourceState({
  status,
  error = null,
  isEmpty = false,
  emptyMessage = COPY.ADMIN.COMMON.EMPTY,
  onRetry,
  children,
}) {
  if (status === 'loading') {
    return (
      <p className="ogp-admin-state" role="status">
        {COPY.ADMIN.COMMON.LOADING}
      </p>
    );
  }

  if (status === 'failed') {
    return (
      <Notice tone="error" title={COPY.ADMIN.COMMON.ERROR_TITLE}>
        <p>{messageForError(error)}</p>
        {onRetry ? (
          <button type="button" className="ogp-admin-button" onClick={onRetry}>
            {COPY.ADMIN.COMMON.RETRY}
          </button>
        ) : null}
      </Notice>
    );
  }

  if (isEmpty) {
    return <p className="ogp-admin-state">{emptyMessage}</p>;
  }

  return children;
}

export default ResourceState;
