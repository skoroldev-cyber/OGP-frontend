import { COPY } from '@/config/copy';

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
