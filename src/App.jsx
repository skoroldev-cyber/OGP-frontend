import { Suspense, lazy, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { Canvas } from '@react-three/fiber';
import { PerformanceMonitor } from '@react-three/drei';

import { ENTRANCE_MODE, FLAGS } from '@/config/env';
import { OGP_COLORS, OGP_FOG, OGP_TYPE } from '@/config/ogpTheme';
import { PerformanceProvider, usePerformance } from '@/context/PerformanceContext';
import { AudioProvider } from '@/context/AudioProvider';
import { MilestonesProvider } from '@/context/MilestonesContext';
import { ReadingProvider, useReading } from '@/context/ReadingProvider';
import { ExperienceProvider, useExperience } from '@/experience/ExperienceProvider';
import { useReaderIntent } from '@/experience/useReaderIntent';
import { READING_THEMES, STATES, isCinematic, stateIndex } from '@/experience/states';
import {
  AdminRoutes,
  ExperienceRoutes,
  QuestionnaireRoutes,
  entryForPath,
  isAdminPath,
  isQuestionnairePath,
  useCoarseUrlSync,
} from '@/routes';
import { supportsWebGL } from '@/utils/deviceDetect';

import { LoadingVeil } from '@/components/dom/LoadingVeil';
import { TransitionVeil } from '@/components/dom/TransitionVeil';
import { AccessibilityControls } from '@/components/dom/AccessibilityControls';
import { ScreenReaderNarrative } from '@/components/dom/ScreenReaderNarrative';
import { NavigationMinimal } from '@/components/dom/NavigationMinimal';
import { PortalInvitation } from '@/components/dom/PortalInvitation';
import { ReadingRoomInvitation } from '@/components/dom/ReadingRoomInvitation';
import { AgeRangePrompt } from '@/components/dom/AgeRangePrompt';
import { ReadingSurface } from '@/components/dom/ReadingSurface/ReadingSurface';
import { ShareMoment } from '@/components/dom/ShareMoment';
import { ArcComplete } from '@/components/dom/ArcComplete';
import { ChoosePath } from '@/components/dom/pathways/ChoosePath';

const Experience = lazy(() => import('@/components/canvas/Experience'));

const SplineEntrance = lazy(() => import('@/components/dom/SplineEntrance'));

const READING_SURFACE_STATES = [
  STATES.S10_OPENING_ARC_READING,
  STATES.S11_SHARE_OPPORTUNITY,
  STATES.S12_CONTINUE_READING,
];

const CanvasLayer = () => {
  const { settings, downgradeTier } = usePerformance();
  const { state } = useExperience();

  const inRoom = state ? stateIndex(state) >= stateIndex(STATES.S9_READING_ROOM_INIT) : false;

  return (
    <div className="ogp-canvas-layer" aria-hidden="true">
      <Canvas
        camera={{ position: [0, 0.2, 28], fov: 60, near: 0.1, far: 400 }}
        gl={{
          antialias: settings.antialias,
          alpha: false,
          powerPreference: settings.powerPreference,
          failIfMajorPerformanceCaveat: true,
        }}
        dpr={settings.dpr}
        frameloop={inRoom ? 'demand' : 'always'}
      >
        <color attach="background" args={[OGP_COLORS.voidDeep]} />
        <fog attach="fog" args={[OGP_FOG.color, OGP_FOG.near, OGP_FOG.far]} />

        <PerformanceMonitor
          onDecline={downgradeTier}
          onFallback={downgradeTier}
          flipflops={3}
        />

        <Suspense fallback={null}>
          <Experience />
        </Suspense>
      </Canvas>
    </div>
  );
};

const DomLayer = () => {
  const { state } = useExperience();
  const index = state ? stateIndex(state) : -1;

  const inOpening =
    index >= stateIndex(STATES.S1_DARKNESS) &&
    index <= stateIndex(STATES.S8_READING_ROOM_INVITATION);
  const inRoom = index >= stateIndex(STATES.S9_READING_ROOM_INIT);

  return (
    <div className="ogp-dom-layer">
      <LoadingVeil />
      <TransitionVeil />

      {inOpening && <AccessibilityControls />}
      {inOpening && <ScreenReaderNarrative />}

      {inRoom && <NavigationMinimal />}

      {ENTRANCE_MODE !== 'spline' &&
        (state === STATES.S4_LIVING_WEAVE || state === STATES.S5_PORTAL_ENTRY) && (
          <PortalInvitation />
        )}

      {state === STATES.S8_READING_ROOM_INVITATION && <ReadingRoomInvitation />}

      {state === STATES.S9_READING_ROOM_INIT && FLAGS.ageLayerEnabled && <AgeRangePrompt />}

      {READING_SURFACE_STATES.includes(state) && <ReadingSurface />}

      {state === STATES.S11_SHARE_OPPORTUNITY && <ShareMoment />}

      {state === STATES.S13_OPENING_ARC_COMPLETE && <ArcComplete />}

      {state === STATES.S14_CHOOSE_YOUR_PATH && <ChoosePath />}
    </div>
  );
};

const ExperienceShell = () => {
  const { state, motionPreference } = useExperience();
  const { settings } = useReading();

  useCoarseUrlSync(state);

  useReaderIntent({
    enabled:
      ENTRANCE_MODE !== 'spline' &&
      Boolean(state) &&
      isCinematic(state) &&
      state !== STATES.S5_PORTAL_ENTRY,
  });

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.dataset.motion = motionPreference;
  }, [motionPreference]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const scale = OGP_TYPE.textSizeSteps[settings.textSizeIndex] ?? 1;
    document.documentElement.style.setProperty('--ogp-text-scale', String(scale));
  }, [settings.textSizeIndex]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.dataset.theme =
      settings.theme === READING_THEMES.LIGHT ? READING_THEMES.LIGHT : READING_THEMES.DARK;
  }, [settings.theme]);

  const hasWebGL = useMemo(() => supportsWebGL(), []);

  const splineBackdrop =
    ENTRANCE_MODE === 'spline' &&
    Boolean(state) &&
    (isCinematic(state) || state === STATES.S8_READING_ROOM_INVITATION);

  const splineScene = state === STATES.S8_READING_ROOM_INVITATION ? 'invitation' : 'entrance';

  return (
    <div className="ogp-app">
      {splineBackdrop && (
        <Suspense fallback={null}>
          <SplineEntrance scene={splineScene} />
        </Suspense>
      )}
      {hasWebGL && !splineBackdrop && <CanvasLayer />}
      <DomLayer />
      <ExperienceRoutes />
    </div>
  );
};

const ExperienceApp = () => {
  const entry = useMemo(
    () => entryForPath(typeof window === 'undefined' ? '/' : window.location.pathname),
    [],
  );

  return (
    <PerformanceProvider>
      <ExperienceProvider
        initialState={entry.initialState}
        entryVia={entry.entryVia}
        rootEntry={entry.rootEntry === true}
      >
        <AudioProvider>
          <MilestonesProvider>
            <ReadingProvider>
              <ExperienceShell />
            </ReadingProvider>
          </MilestonesProvider>
        </AudioProvider>
      </ExperienceProvider>
    </PerformanceProvider>
  );
};

export default function App() {
  const { pathname } = useLocation();
  if (isAdminPath(pathname)) return <AdminRoutes />;
  if (isQuestionnairePath(pathname)) return <QuestionnaireRoutes />;
  return <ExperienceApp />;
}
