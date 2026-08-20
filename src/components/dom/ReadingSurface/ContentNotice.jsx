import { COPY } from '@/config/copy';

const NOTICES = {
  CONTENT_NOTICE_CH1: COPY.READING.CONTENT_NOTICE_CH1,
};

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
