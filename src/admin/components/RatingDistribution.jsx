import { COPY } from '@/config/copy';
import { fill } from '@/admin/adminFormat';

export function RatingDistribution({ distribution }) {
  const rows = Array.isArray(distribution) ? distribution : [];
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
