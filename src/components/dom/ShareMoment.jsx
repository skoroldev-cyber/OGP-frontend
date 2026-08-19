/**
 * S11 — the share opportunity (master §5.2, §5.3, §5.4; §3.7 gating contract).
 *
 * > "Sharing is human continuity transfer only after recognition, reflection, decompression,
 * > and regulation." (`rules.json` `sharing_rule`, locked, verbatim)
 *
 * **This component never decides that a reader is ready.** It asks the server, and renders
 * only when the server says a window is open. The client cannot open one, cannot retry one,
 * and cannot invent prompt copy: `promptText` arrives from `sharing_prompts`, where every
 * string carries `requires_human_review` and is inactive until the founder approves it.
 * When the answer is "no", or when the call fails, S11 closes silently and reading
 * continues — sharing degrades to invisible, never to broken.
 *
 * The four locked visual treatments are `minimal | quiet_inline | isolated | full_breath`;
 * frequency is `rare`, and the concrete meaning of rare is at most one rendered prompt per
 * session, enforced server-side.
 *
 * Absent by construction, permanently: **no share counter, no "shared N times", no
 * confirmation flourish, no celebratory animation, no badge, no unlock, no reward.** A
 * share yields the sharer nothing — that is the anti-viral rule, and the absence of any
 * post-share UI is how it is kept. Declining is silent and costless: "Not now" and scrolling
 * past are the same answer, and neither is asked twice.
 *
 * The artifact is an entrance, not an excerpt. The recipient receives their own journey from
 * the beginning; nothing about the sender's reading travels with the link.
 */

import { useCallback, useEffect, useState } from 'react';

import { COPY } from '@/config/copy';
import { useExperience } from '@/experience/ExperienceProvider';
import { api } from '@/services/api';

import { ShareChannels } from '@/components/dom/ShareChannels';

/** The four locked treatments (§5.3). An unknown value falls back to the default. */
const TREATMENTS = ['minimal', 'quiet_inline', 'isolated', 'full_breath'];
const DEFAULT_TREATMENT = 'quiet_inline';

export const ShareMoment = () => {
  const { advance } = useExperience();

  const [prompt, setPrompt] = useState(null);

  /** Leave S11 for S12. The same exit for a share, a decline and an ineligible window. */
  const leave = useCallback(() => advance({ inputMethod: 'pointer' }), [advance]);

  // The server is asked once. There is no polling and no second chance: a window that is
  // not open when the reader arrives at it does not get re-offered.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const result = await api.getSharingEligibility();
        if (cancelled) return;
        if (result?.eligible && result.prompt) {
          setPrompt(result.prompt);
          return;
        }
      } catch {
        // Prompt configuration unreachable. S11 is skipped silently (§5.3 fallback).
      }
      if (!cancelled) leave();
    })();

    return () => {
      cancelled = true;
    };
  }, [leave]);

  if (!prompt) return null;

  const treatment = TREATMENTS.includes(prompt.visualTreatment)
    ? prompt.visualTreatment
    : DEFAULT_TREATMENT;

  return (
    <section
      className="ogp-share-moment"
      data-treatment={treatment}
      aria-label={COPY.SHARE.OFFER}
    >
      {/* Server-authored, human-reviewed. Never assembled on the client. */}
      <p className="ogp-share-moment__text">{prompt.promptText}</p>

      <div className="ogp-share-moment__actions">
        <ShareChannels eventPayload={{ promptId: prompt.promptId }} />
        <button type="button" className="ogp-affordance" onClick={leave}>
          {COPY.SHARE.DECLINE}
        </button>
      </div>
    </section>
  );
};

export default ShareMoment;
