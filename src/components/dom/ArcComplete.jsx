/**
 * S13 — Opening Arc Complete (master §3.13).
 *
 * The authored closing line is conditional — "If you are ready for that clarity, proceed to
 * Chapter 2 — Awareness." — and the interface honours that conditionality: **the reader is
 * asked nothing until they signal readiness.**
 *
 * After the Transition unit's final line there is held quiet space: a full viewport of
 * breathing room while the immersion state moves `reflection → decompression`. Only then,
 * and never before a brief quiet (about one to two seconds), does one quiet continue
 * affordance fade in. The hold is a floor, not a countdown, and nothing about it is
 * displayed — no timer, no progress, no "almost there".
 *
 * **Nothing that belongs to S14 exists here.** No pathway options, no commerce, no donation
 * ask, no newsletter field. Clear optional next steps come *after* meaningful completion,
 * in S14, which is a state of its own.
 *
 * What S13 does carry is what *follows* the reading rather than what comes next. In beta
 * builds (`FLAGS.betaMode`) that is the exact button `COPY.COMPLETE.BETA_END_BUTTON` —
 * "Continue to Observations" — opening the Opening Arc Beta Test Questionnaire v2.0. In every
 * build it is the invitation to leave a note. Both sit here for the same reason the
 * questionnaire does: the instrument says "Please read the Opening Arc without stopping to
 * edit", so a reader's account of the reading belongs after the reading and nowhere else.
 * That is also why no feedback UI of any kind renders mid-read — while reading, a reader may
 * mark a passage and nothing more (§3.13).
 *
 * Neither is a demand and neither is in the way. `COPY.COMPLETE.CONTINUE` is the first
 * control on the screen and goes straight to S14; the other two are doors beside it, at the
 * same weight, and a reader who ignores both loses nothing.
 */

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

  // The decompression hold. The machine enforces the same floor on the transition itself;
  // this keeps the affordance from appearing before the silence has done its work.
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

  // Closing returns the reader to this screen with the continue affordance already present.
  // Opening the form is a choice, and so is abandoning it.
  if (noteOpen) return <FeedbackForm onComplete={onContinue} onClose={closeNote} />;

  return (
    <section className="ogp-arc-complete" aria-label={COPY.META.READING_ROOM_NAME}>
      {/* Held quiet space. Nothing is rendered into it, and nothing counts it down. */}
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
