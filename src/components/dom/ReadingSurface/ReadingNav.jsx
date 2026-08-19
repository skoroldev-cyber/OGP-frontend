/**
 * Previous and next, on the rails either side of the page.
 *
 * They used to sit in the flow at the end of each unit, which had two costs: a control stood
 * between the reader and the last line, so the page could never end on its own words, and the
 * reader had to travel to the bottom of a unit to go anywhere at all.
 *
 * On the rails they are always reachable and never read. They sit *outside* the page, in the
 * ambient field, so nothing crosses the measure — §8.1's transfer of authority holds: the
 * words, the reader, and the truth, with the machinery at the edge of the room.
 *
 * Restraint still applies (§8.7). These are large and easy to hit, but they are hairline
 * arrows on a translucent ground, not filled buttons: no borders, no fills, no labels, no
 * counters. They recede to almost nothing while reading and come back on intent.
 */

import { COPY } from '@/config/copy';

/**
 * @param {{
 *   onPrevious: (() => void)|null,
 *   onNext: (() => void)|null,
 * }} props
 */
export const ReadingNav = ({ onPrevious, onNext }) => (
  <>
    <button
      type="button"
      className="ogp-reading-nav ogp-reading-nav--previous"
      onClick={onPrevious ?? undefined}
      disabled={!onPrevious}
      aria-label={COPY.READING.PREVIOUS}
      title={COPY.READING.PREVIOUS}
    >
      <svg viewBox="0 0 24 40" width="30" height="50" aria-hidden="true" focusable="false">
        <path
          d="M17 3 L6 20 L17 37"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>

    <button
      type="button"
      className="ogp-reading-nav ogp-reading-nav--next"
      onClick={onNext ?? undefined}
      disabled={!onNext}
      aria-label={COPY.READING.CONTINUE}
      title={COPY.READING.CONTINUE}
    >
      <svg viewBox="0 0 24 40" width="30" height="50" aria-hidden="true" focusable="false">
        <path
          d="M7 3 L18 20 L7 37"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  </>
);

export default ReadingNav;
