import { COPY } from '@/config/copy';
import { messageForError } from '@/admin/adminFormat';
import { Notice } from '@/admin/components/Notice';

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
