import { useCallback, useEffect, useState } from 'react';

import { COPY } from '@/config/copy';
import { FLAGS } from '@/config/env';
import { OGP_TIMING } from '@/config/ogpTheme';
import { useExperience } from '@/experience/ExperienceProvider';

import { FeedbackForm } from '@/components/dom/FeedbackForm';
import { Questionnaire } from '@/components/dom/Questionnaire';
import { ShareChannels } from '@/components/dom/ShareChannels';

export const ArcComplete = () => {
  const { advance } = useExperience();

  const [decompressed, setDecompressed] = useState(false);
  const [observationsOpen, setObservationsOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const timer = window.setTimeout(() => setDecompressed(true), OGP_TIMING.S13.minDwellMs);
    return () => window.clearTimeout(timer);
  }, []);

  const onContinue = useCallback(() => advance({ inputMethod: 'pointer' }), [advance]);
  const openObservations = useCallback(() => setObservationsOpen(true), []);
  const openNote = useCallback(() => setNoteOpen(true), []);
  const closeNote = useCallback(() => setNoteOpen(false), []);

  if (observationsOpen) return <Questionnaire onComplete={onContinue} />;

  if (noteOpen) return <FeedbackForm onComplete={onContinue} onClose={closeNote} />;

  return (
    <section className="ogp-arc-complete" aria-label={COPY.META.READING_ROOM_NAME}>
      <div className="ogp-arc-complete__quiet" aria-hidden="true" />

      <div className="ogp-arc-complete__response" data-ready={decompressed ? 'true' : 'false'}>
        {decompressed && (
          <>
            <button type="button" className="ogp-invitation" onClick={onContinue}>
              {COPY.COMPLETE.CONTINUE}
            </button>

            <button
              type="button"
              className="ogp-invitation ogp-arc-complete__note"
              onClick={openNote}
            >
              {COPY.FEEDBACK.INVITE}
            </button>

            {FLAGS.betaMode && (
              <button
                type="button"
                className="ogp-invitation ogp-arc-complete__observations"
                onClick={openObservations}
              >
                {COPY.COMPLETE.BETA_END_BUTTON}
              </button>
            )}

            <ShareChannels className="ogp-arc-complete__share" />
          </>
        )}
      </div>
    </section>
  );
};

export default ArcComplete;
