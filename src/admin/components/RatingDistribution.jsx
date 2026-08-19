/**
 * The five-point histogram behind one scaled question.
 *
 * Shown because an average hides the shape it came from: five reviewers splitting 1/1/5/5/5
 * average 3.4, which describes none of them and is the single most misleading number this
 * panel could print. The mean is the headline; this is the finding.
 *
 * The bar is decoration and is hidden from assistive technology. Each row is announced as one
 * sentence instead — "three rated this 5 out of 5" — because a screen reader reading a bare
 * "5" beside a bare "3" has no way to know which is the rating (§8.10.4: never colour or
 * length alone).
 */

import { COPY } from '@/config/copy';
import { fill } from '@/admin/adminFormat';

/**
 * @param {{ distribution: Array<{ rating: number, count: number }> }} props The histogram.
 * @returns {import('react').ReactElement} The rows.
 */
export function RatingDistribution({ distribution }) {
  const rows = Array.isArray(distribution) ? distribution : [];
  // Scaled against the tallest bar rather than the total, so a question answered by four
  // people out of two hundred still shows a readable shape.
  const peak = rows.reduce((highest, row) => Math.max(highest, row.count), 0);

  return (
    <ul className="ogp-admin-distribution" role="list">
      {rows.map((row) => (
        <li className="ogp-admin-distribution__row" key={row.rating}>
          <span className="ogp-admin-distribution__rating" aria-hidden="true">
            {row.rating}
          </span>
          <span className="ogp-admin-distribution__track" aria-hidden="true">
            <span
              className="ogp-admin-distribution__bar"
              style={{ inlineSize: peak === 0 ? '0%' : `${(row.count / peak) * 100}%` }}
            />
          </span>
          <span className="ogp-admin-distribution__count" aria-hidden="true">
            {row.count}
          </span>
          <span className="ogp-visually-hidden">
            {fill(COPY.ADMIN.RESPONSES.DISTRIBUTION_LABEL, {
              count: row.count,
              rating: row.rating,
            })}
          </span>
        </li>
      ))}
    </ul>
  );
}

export default RatingDistribution;
