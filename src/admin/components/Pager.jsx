import { COPY } from '@/config/copy';
import { showingLine } from '@/admin/adminFormat';

export function Pager({ offset, count, total, pageSize, onChange }) {
  const atStart = offset <= 0;
  const atEnd = offset + count >= total;

  return (
    <nav className="ogp-admin-pager" aria-label={COPY.ADMIN.COMMON.PAGE_POSITION}>
      <button
        type="button"
        className="ogp-admin-button"
        onClick={() => onChange(Math.max(0, offset - pageSize))}
        disabled={atStart}
      >
        {COPY.ADMIN.COMMON.PREVIOUS_PAGE}
      </button>
      <p className="ogp-admin-pager__position" aria-live="polite">
        {showingLine({ offset, count, total })}
      </p>
      <button
        type="button"
        className="ogp-admin-button"
        onClick={() => onChange(offset + pageSize)}
        disabled={atEnd}
      >
        {COPY.ADMIN.COMMON.NEXT_PAGE}
      </button>
    </nav>
  );
}

export default Pager;
