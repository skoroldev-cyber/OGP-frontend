import { Suspense, lazy, useEffect, useRef } from 'react';
import { Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { ADMIN_BASE } from '@/admin/adminPaths';
import { EVENTS, STATES, stateIndex } from '@/experience/states';
import { readPersistedMachine } from '@/experience/stateMachine';
import { api } from '@/services/api';
import { emit as emitEvent } from '@/services/events';
import { replacePath } from '@/utils/dom';

const AdminApp = lazy(() => import('@/admin/AdminApp'));

const TestQuestionnairePage = lazy(
  () => import('@/components/dom/questionnaire/TestQuestionnairePage'),
);

export const PATHS = Object.freeze({
  ROOT: '/',
  READING_ROOM: '/reading-room',
  OPENING_ARC: '/openingarc',
  PATHWAYS: '/pathways',
  SHARE: '/s',
  TEST_QUESTIONNAIRE: '/test-questionnaire',
  ADMIN_PANEL: ADMIN_BASE,
});

export const isAdminPath = (pathname) => {
  const path = pathname || PATHS.ROOT;
  return path === PATHS.ADMIN_PANEL || path.startsWith(`${PATHS.ADMIN_PANEL}/`);
};

export const isQuestionnairePath = (pathname) => {
  const path = (pathname || PATHS.ROOT).replace(/\/+$/, '') || PATHS.ROOT;
  return path === PATHS.TEST_QUESTIONNAIRE;
};

export const QuestionnaireRoutes = () => (
  <Suspense fallback={null}>
    <TestQuestionnairePage />
  </Suspense>
);

export const AdminRoutes = () => (
  <Suspense fallback={null}>
    <Routes>
      <Route path={`${PATHS.ADMIN_PANEL}/*`} element={<AdminApp />} />
    </Routes>
  </Suspense>
);

export const entryForPath = (pathname) => {
  const path = (pathname || PATHS.ROOT).replace(/\/+$/, '') || PATHS.ROOT;

  if (path === PATHS.READING_ROOM) {
    return {
      initialState: STATES.S9_READING_ROOM_INIT,
      entryVia: 'skip_cinematic',
      shareToken: null,
    };
  }

  if (path === PATHS.OPENING_ARC) {
    return {
      initialState: STATES.S10_OPENING_ARC_READING,
      entryVia: 'founding_reader',
      shareToken: null,
    };
  }

  if (path === PATHS.PATHWAYS) {
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

  return { initialState: undefined, entryVia: null, shareToken: null, rootEntry: true };
};

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
        void 0;
      } finally {
        navigate(PATHS.ROOT, { replace: true });
      }
    })();
  }, [token, navigate]);

  return null;
};

const PathwaysGate = () => {
  const saved = readPersistedMachine();
  const reached =
    saved?.state && stateIndex(saved.state) >= stateIndex(STATES.S13_OPENING_ARC_COMPLETE);
  return reached ? null : <Navigate to={PATHS.ROOT} replace />;
};

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

export const useCoarseUrlSync = (state) => {
  useEffect(() => {
    if (!state) return;
    if (typeof window === 'undefined') return;
    const path = window.location.pathname;

    if (path === PATHS.OPENING_ARC) return;

    const inRoom = stateIndex(state) >= stateIndex(STATES.S9_READING_ROOM_INIT);
    if (inRoom && path === PATHS.ROOT) replacePath(PATHS.READING_ROOM);
    if (!inRoom && path === PATHS.READING_ROOM) replacePath(PATHS.ROOT);

    if (path === PATHS.PATHWAYS && stateIndex(state) < stateIndex(STATES.S14_CHOOSE_YOUR_PATH)) {
      replacePath(inRoom ? PATHS.READING_ROOM : PATHS.ROOT);
    }
  }, [state]);
};

export default ExperienceRoutes;
