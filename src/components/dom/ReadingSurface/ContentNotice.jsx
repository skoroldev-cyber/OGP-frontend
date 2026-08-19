/**
 * The single restrained content notice (master §3.5.2, OGLCE trauma-informed requirement).
 *
 * Chapter 1 Sections 4, 5 and 7 carry witness accounts of harm to children, with named real
 * individuals. The corpus requires notices that are "clear but restrained", trauma-informed
 * and non-coercive — and it requires exactly ONE, before Chapter 1.
 *
 * **There are no mid-chapter interstitials.** Pace control is the protection: the reader
 * decides how fast to move, and nothing in the reading surface interrupts them again.
 *
 * The notice is not a modal. There are no modals in S8–S13 (popups and forced overlays are
 * prohibited mechanics); this is an inline section in the reading column that holds the
 * reader's place until they act. It holds **indefinitely** — that indefinite hold is the
 * pause option: no timer, no countdown, no auto-continue. The second option moves past the
 * chapter entirely, and choosing it costs the reader nothing.
 *
 * The notice text is `COPY.READING.CONTENT_NOTICE_CH1`, keyed by the unit's own
 * `contentNoticeKey` so the server decides where a notice belongs and the client never
 * invents one.
 */

import { COPY } from '@/config/copy';

/** `contentNoticeKey` → copy. A key with no entry renders no notice, silently. */
const NOTICES = {
  CONTENT_NOTICE_CH1: COPY.READING.CONTENT_NOTICE_CH1,
};

/**
 * @param {{ noticeKey: string, onContinue: () => void, onSkip: () => void }} props
 */
export const ContentNotice = ({ noticeKey, onContinue, onSkip }) => {
  const text = NOTICES[noticeKey];
  if (!text) return null;

  return (
    <section className="ogp-content-notice" aria-label={COPY.READING.CONTENT_NOTICE_REGION}>
      <p className="ogp-content-notice__text">{text}</p>

      <div className="ogp-content-notice__actions">
        <button type="button" className="ogp-invitation ogp-content-notice__continue" onClick={onContinue}>
          {COPY.READING.CONTENT_NOTICE_ACKNOWLEDGE}
        </button>
        <button type="button" className="ogp-affordance" onClick={onSkip}>
          {COPY.READING.CONTENT_NOTICE_SKIP}
        </button>
      </div>
    </section>
  );
};

export default ContentNotice;
