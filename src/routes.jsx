/**
 * Routing (master §7.11, BUILD_CONTRACT §8).
 *
 * `react-router-dom` is activated minimally. **Routes select the state machine's entry
 * checkpoint; they are never separate pages.** The one-continuous-application law
 * (§2.1, locked) means nothing here unmounts the canvas, swaps a scene, or performs a
 * navigation the reader can perceive.
 *
 * Cinematic states are never URL-addressable — that is what protects the guided sequence
 * from being deep-linked into halfway through.
 *
 * | Path                  | Behaviour                                                  |
 * |-----------------------|------------------------------------------------------------|
 * | `/`                   | S0 -> the full experience                                  |
 * | `/reading-room`       | veil -> S9, recording `skip_cinematic` provenance          |
 * | `/openingarc`         | Founding Reader private reading page; DOM-first            |
 * | `/pathways`           | veil -> S14 if S13 was reached; otherwise redirect `/`     |
 * | `/s/:token`           | share-link arrival — validate, then `/` with `share_token` |
 * | `/test-questionnaire` | the Beta Test Questionnaire, outside the experience        |
 * | `*`                   | redirect `/` (no 404 dead ends)                            |
 */

import { Suspense, lazy, useEffect, useRef } from 'react';
import { Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { ADMIN_BASE } from '@/admin/adminPaths';
import { EVENTS, STATES, stateIndex } from '@/experience/states';
import { readPersistedMachine } from '@/experience/stateMachine';
import { api } from '@/services/api';
import { emit as emitEvent } from '@/services/events';
import { replacePath } from '@/utils/dom';

/**
 * The operations panel (§10). Lazy, and the only route in this table that renders a screen
 * rather than selecting a checkpoint — because it is not part of the experience at all.
 * `adminPaths.js` is a leaf module with no imports of its own, so naming the mount point here
 * costs nothing; importing anything else from `src/admin/` would.
 */
const AdminApp = lazy(() => import('@/admin/AdminApp'));

/**
 * The Beta Test Questionnaire (§5.8). Lazy, and the second of the two routes in this table
 * that renders a screen rather than selecting a checkpoint.
 *
 * A reviewer is sent a link to this address after reading the manuscript — as a document, in
 * print, or in the room. Mounting it inside the experience would mean the state machine, the
 * canvas and the opening cinematic all load in front of a form, and a reviewer who read the
 * DOCX would arrive at S0 with the questionnaire fourteen states away.
 */
const TestQuestionnairePage = lazy(
  () => import('@/components/dom/questionnaire/TestQuestionnairePage'),
);

/** The canonical paths. */
export const PATHS = Object.freeze({
  ROOT: '/',
  READING_ROOM: '/reading-room',
  OPENING_ARC: '/openingarc',
  PATHWAYS: '/pathways',
  SHARE: '/s',
  TEST_QUESTIONNAIRE: '/test-questionnaire',
  ADMIN_PANEL: ADMIN_BASE,
});

/**
 * Whether a pathname belongs to the operations panel.
 *
 * Asked before anything else, in `App`, because the panel is a different application: it must
 * not mount the providers, must not construct the state machine, must not open a reading
 * session, and must not appear over the canvas. `startsWith` on the base plus a boundary
 * check, so `/admin-panellike` is a reader path and `/admin-panel/feedback/xyz` is not.
 *
 * @param {string} pathname The current pathname.
 * @returns {boolean} Whether the operations panel owns this address.
 */
export const isAdminPath = (pathname) => {
  const path = pathname || PATHS.ROOT;
  return path === PATHS.ADMIN_PANEL || path.startsWith(`${PATHS.ADMIN_PANEL}/`);
};

/**
 * Whether a pathname is the standalone questionnaire.
 *
 * Asked in `App` beside `isAdminPath`, and for the same reason: this address is answered by
 * a form rather than by the experience, so nothing on it may construct the state machine or
 * mount the canvas. Exact match with an optional trailing slash — there is nothing beneath
 * this address, and `/test-questionnaire-results` is not it.
 *
 * @param {string} pathname The current pathname.
 * @returns {boolean} Whether the questionnaire owns this address.
 */
export const isQuestionnairePath = (pathname) => {
  const path = (pathname || PATHS.ROOT).replace(/\/+$/, '') || PATHS.ROOT;
  return path === PATHS.TEST_QUESTIONNAIRE;
};

/**
 * The questionnaire's route table, rendered by `App` INSTEAD of the experience.
 *
 * @returns {import('react').ReactElement} The questionnaire route.
 */
export const QuestionnaireRoutes = () => (
  <Suspense fallback={null}>
    <Routes>
      <Route path={PATHS.TEST_QUESTIONNAIRE} element={<TestQuestionnairePage />} />
      <Route path={`${PATHS.TEST_QUESTIONNAIRE}/`} element={<TestQuestionnairePage />} />
    </Routes>
  </Suspense>
);

/**
 * The operations panel's own route table.
 *
 * Rendered by `App` INSTEAD of the experience, never beside it. `AdminApp` owns everything
 * below `/admin-panel`; this declares only where it is mounted. The Suspense fallback is null
 * because the panel is a light chunk on an internal tool, and a spinner is not a thing this
 * codebase has (BUILD_CONTRACT §0.6).
 *
 * @returns {import('react').ReactElement} The admin route table.
 */
export const AdminRoutes = () => (
  <Suspense fallback={null}>
    <Routes>
      <Route path={`${PATHS.ADMIN_PANEL}/*`} element={<AdminApp />} />
    </Routes>
  </Suspense>
);

/**
 * Resolve the machine entry checkpoint for a pathname. Called once, synchronously, before
 * the providers mount, because the entry checkpoint is a constructor argument to the
 * machine rather than something applied after the fact (which would show the reader a
 * state they did not ask for).
 *
 * @param {string} pathname
 * @returns {{
 *   initialState: (string|undefined),
 *   entryVia: (string|null),
 *   shareToken: (string|null),
 *   rootEntry?: boolean,
 * }}
 */
export const entryForPath = (pathname) => {
  const path = (pathname || PATHS.ROOT).replace(/\/+$/, '') || PATHS.ROOT;

  if (path === PATHS.READING_ROOM) {
    // Records skip_cinematic provenance. The reader is not punished for arriving here;
    // a one-line invitation to experience the opening is offered, never forced (§7.11).
    return {
      initialState: STATES.S9_READING_ROOM_INIT,
      entryVia: 'skip_cinematic',
      shareToken: null,
    };
  }

  if (path === PATHS.OPENING_ARC) {
    // The one page-like route: the Founding Reader beta reading page, DOM-first,
    // ending with the exact button "Continue to Observations" (§5, §3.13).
    return {
      initialState: STATES.S10_OPENING_ARC_READING,
      entryVia: 'founding_reader',
      shareToken: null,
    };
  }

  if (path === PATHS.PATHWAYS) {
    // Only for a reader who actually reached S13. Otherwise the redirect below sends
    // them to `/`, because the pathways are meaningful only after completion (§5).
    const saved = readPersistedMachine();
    const reached =
      saved?.state && stateIndex(saved.state) >= stateIndex(STATES.S13_OPENING_ARC_COMPLETE);
    return reached
      ? { initialState: STATES.S14_CHOOSE_YOUR_PATH, entryVia: 'pathways', shareToken: null }
      : { initialState: undefined, entryVia: null, shareToken: null };
  }

  if (path.startsWith(`${PATHS.SHARE}/`)) {
    return {
      initialState: undefined,
      entryVia: 'share_token',
      shareToken: decodeURIComponent(path.slice(PATHS.SHARE.length + 1)),
    };
  }

  // `/` — the front door. The opening always plays here, whatever checkpoint this tab holds;
  // `resolveRootEntry` offers skip from the first frame to a reader who has been before, and
  // their place in the manuscript is restored when they reach the room either way.
  return { initialState: undefined, entryVia: null, shareToken: null, rootEntry: true };
};

/**
 * Share-link arrival. Validates the token, records the [PROPOSED] `ShareTokenOpened`
 * event, and hands the visitor the ordinary opening — someone was offered their own
 * journey, not a different product. An invalid token is not an error the visitor sees:
 * they simply arrive at `/`.
 */
const ShareArrival = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    (async () => {
      try {
        const result = await api.openShare(token);
        if (result?.valid) emitEvent(EVENTS.SHARE_TOKEN_OPENED, { shareTokenId: token });
      } catch {
        // Quietly ignored. A revoked or expired link still opens the experience.
      } finally {
        navigate(PATHS.ROOT, { replace: true });
      }
    })();
  }, [token, navigate]);

  return null;
};

/**
 * `/pathways` for a reader who has not completed the arc. No dead end, no explanation —
 * they are simply placed at the beginning.
 */
const PathwaysGate = () => {
  const saved = readPersistedMachine();
  const reached =
    saved?.state && stateIndex(saved.state) >= stateIndex(STATES.S13_OPENING_ARC_COMPLETE);
  return reached ? null : <Navigate to={PATHS.ROOT} replace />;
};

/**
 * The route table. Every element is side-effect-only: the experience itself is rendered
 * once by `App`, above these routes, and never remounts.
 */
export const ExperienceRoutes = () => (
  <Routes>
    <Route path={PATHS.ROOT} element={null} />
    <Route path={PATHS.READING_ROOM} element={null} />
    <Route path={PATHS.OPENING_ARC} element={null} />
    <Route path={PATHS.PATHWAYS} element={<PathwaysGate />} />
    <Route path={`${PATHS.SHARE}/:token`} element={<ShareArrival />} />
    <Route path="*" element={<Navigate to={PATHS.ROOT} replace />} />
  </Routes>
);

/**
 * Coarse URL synchronisation.
 *
 * `history.replaceState` at the `/` <-> `/reading-room` boundary ONLY. Replace, not push,
 * so the back button is never filled with states that are not pages; and only at that one
 * boundary, so no cinematic state ever acquires an address (§7.11).
 *
 * @param {string|null} state current machine state
 */
export const useCoarseUrlSync = (state) => {
  useEffect(() => {
    if (!state) return;
    if (typeof window === 'undefined') return;
    const path = window.location.pathname;

    // The beta reading page keeps its own address; it is the one page-like route.
    if (path === PATHS.OPENING_ARC) return;

    const inRoom = stateIndex(state) >= stateIndex(STATES.S9_READING_ROOM_INIT);
    if (inRoom && path === PATHS.ROOT) replacePath(PATHS.READING_ROOM);
    if (!inRoom && path === PATHS.READING_ROOM) replacePath(PATHS.ROOT);

    // `/pathways` is the one address a reader can hold while *below* S14, and only by
    // beginning the arc again from the last screen of it. Left alone, the address would still
    // read `/pathways` while the opening played, and `PathwaysGate` would bounce them to `/`
    // on the next load — sending someone who had just chosen to read again back to a screen
    // they had deliberately left.
    if (path === PATHS.PATHWAYS && stateIndex(state) < stateIndex(STATES.S14_CHOOSE_YOUR_PATH)) {
      replacePath(inRoom ? PATHS.READING_ROOM : PATHS.ROOT);
    }
  }, [state]);
};

export default ExperienceRoutes;
