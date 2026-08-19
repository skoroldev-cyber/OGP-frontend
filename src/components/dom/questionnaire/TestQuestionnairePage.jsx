/**
 * The Test Questionnaire page — `/test-questionnaire`.
 *
 * **Why this is a page, when almost nothing else is.** §2.1 is locked: the experience is one
 * continuous application, and routes select the state machine's entry checkpoint rather than
 * naming separate pages. This is outside that application, for the same reason
 * `/admin-panel` is: it is not a state of the reading, it is a form a beta reviewer is sent
 * a link to. The instrument's own reviewer metadata records the reading format as DOCX, PDF,
 * print or immersive room — three of which happen entirely elsewhere. Somebody who read the
 * manuscript as a document last night and opens this link this morning must arrive at the
 * questionnaire, not at the opening cinematic with the questionnaire fourteen states away.
 *
 * So `App` forks here, above every provider, exactly as it does for the panel: nothing on
 * this address constructs the state machine, mounts the R3F canvas, loads the Spline runtime
 * or counts an arrival in the S0 funnel. A reviewer opening a form should not download a
 * scene graph.
 *
 * **It is not the panel, either.** The panel is an internal tool and is deliberately plain.
 * This is read by the people the work is for, so it keeps the reading room's typography and
 * its theme — the reader's own dark or light setting, restored from their preferences —
 * because a questionnaire about a manuscript should look like it belongs to the manuscript.
 *
 * **A session is opened here, and only here.** `POST /questionnaire-responses` requires one.
 * It is the ordinary anonymous session: a random key and a bearer token, no account, no
 * profile, nothing derived from the device.
 */

import { useEffect, useState } from 'react';

import { COPY } from '@/config/copy';
import { READING_THEMES } from '@/experience/states';
import { ensureSession } from '@/services/session';
import { AREAS, STORAGE_KEYS, readRecord } from '@/services/storage';
import { QuestionnaireForm } from '@/components/dom/questionnaire/QuestionnaireForm';

/** The reading format recorded when the reviewer does not answer that question themselves. */
const DEFAULT_FORMAT = COPY.QUESTIONNAIRE.READING_FORMAT_DEFAULT;

/**
 * The theme the reader last chose, or the dark default.
 *
 * Read directly rather than through `ReadingProvider`, which lives inside the experience and
 * would drag the state machine onto this page with it. Preferences are a plain record on
 * disk; reading one value out of it costs nothing and keeps the boundary intact.
 *
 * @returns {string} `'light'` or `'dark'`.
 */
const preferredTheme = () => {
  const prefs = readRecord(AREAS.LOCAL, STORAGE_KEYS.PREFS);
  return prefs?.theme === READING_THEMES.LIGHT ? READING_THEMES.LIGHT : READING_THEMES.DARK;
};

/**
 * @returns {import('react').ReactElement} The page.
 */
export default function TestQuestionnairePage() {
  // The form is held back until a session exists, because submitting without one fails at
  // the end — after the reviewer has written for an hour, which is the worst possible moment
  // to discover it. An unreachable API still resolves here, with no token: the reviewer sees
  // the instrument and the send fails honestly rather than silently.
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    ensureSession({ entryVia: 'direct' }).finally(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const root = document.documentElement;
    const previous = root.dataset.theme;
    root.dataset.theme = preferredTheme();
    // Motion is irrelevant on a page with no motion, but the attribute is what the shared
    // token layer reads, and leaving it unset would let a transition escape onto a form.
    root.dataset.motion = 'reduced';
    return () => {
      if (previous) root.dataset.theme = previous;
      else delete root.dataset.theme;
      delete root.dataset.motion;
    };
  }, []);

  return (
    <main className="ogp-questionnaire ogp-questionnaire--page" aria-label={COPY.QUESTIONNAIRE.PAGE_LABEL}>
      {ready ? (
        <QuestionnaireForm
          readingFormat={DEFAULT_FORMAT}
          renderHeader={() => (
            <p className="ogp-questionnaire__organisation">
              {COPY.QUESTIONNAIRE.PAGE_ORGANISATION}
            </p>
          )}
        />
      ) : (
        <div className="ogp-questionnaire__column ogp-questionnaire__column--centred">
          <p className="ogp-questionnaire__notice" role="status">
            {COPY.QUESTIONNAIRE.LOADING}
          </p>
        </div>
      )}
    </main>
  );
}
