/**
 * Previous / next over a counted list.
 *
 * Written as two buttons and a sentence rather than a numbered strip: the sentence names the
 * rows on screen and the total, which is the thing an operator actually wants to know, and it
 * stays readable when the total is four figures. Both buttons are real buttons — disabled at
 * the ends rather than hidden, so the control does not move under the pointer.
 */

import { COPY } from '@/config/copy';
import { showingLine } from '@/admin/adminFormat';

/**
 * @param {{ offset: number, count: number, total: number, pageSize: number,
 *           onChange: (offset: number) => void }} props The window and how to move it.
 * @returns {import('react').ReactElement} The pager.
 */
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
