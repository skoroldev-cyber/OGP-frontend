/**
 * The single continuous application.
 *
 * "The experience is one continuous application with state transitions rather than
 * disconnected web pages" (master §2.1, locked, verbatim). There is exactly one canvas and
 * exactly one DOM overlay; states change what is mounted inside them, and nothing ever
 * navigates, remounts the scene, or reloads.
 *
 * The canvas is `aria-hidden="true"` decoration. For S8–S13 **the accessible DOM tree IS
 * the experience** (§3.10): the manuscript is never rendered as canvas text, so a screen
 * reader user gets the work itself rather than a description of it.
 */

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

/**
 * The heavy 3D scene. Lazy so the opening JS budget stays inside the §2.14 critical path;
 * its absence is invisible because S1 is darkness, and darkness is the loading veil.
 */
const Experience = lazy(() => import('@/components/canvas/Experience'));

/** The Spline threshold, loaded only when it is the selected entrance (§ ENTRANCE_MODE). */
const SplineEntrance = lazy(() => import('@/components/dom/SplineEntrance'));

/** States during which the DOM reading surface is mounted. */
const READING_SURFACE_STATES = [
  STATES.S10_OPENING_ARC_READING,
  STATES.S11_SHARE_OPPORTUNITY,
  STATES.S12_CONTINUE_READING,
];

/**
 * The persistent canvas.
 *
 * `frameloop` switches to `demand` from S9 onward: during reading the canvas is ambient,
 * and a continuous render loop behind a page of text is pure battery cost (§3.12).
 */
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
          // Contract law (§7). A software-rasterised context would produce a slideshow;
          // the still Earth hero frame is a better experience than a stuttering one.
          failIfMajorPerformanceCaveat: true,
        }}
        dpr={settings.dpr}
        frameloop={inRoom ? 'demand' : 'always'}
      >
        <color attach="background" args={[OGP_COLORS.voidDeep]} />
        <fog attach="fog" args={[OGP_FOG.color, OGP_FOG.near, OGP_FOG.far]} />

        {/* One-way tier ratchet. Three flipflops before acting, so a single hitch during
            a transition never costs the reader the full experience. */}
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

/**
 * The DOM overlay — the accessible tree. Every component is gated on the current state,
 * so exactly the language the score calls for is present, and nothing else is.
 */
const DomLayer = () => {
  const { state } = useExperience();
  const index = state ? stateIndex(state) : -1;

  const inOpening =
    index >= stateIndex(STATES.S1_DARKNESS) &&
    index <= stateIndex(STATES.S8_READING_ROOM_INVITATION);
  const inRoom = index >= stateIndex(STATES.S9_READING_ROOM_INIT);

  return (
    <div className="ogp-dom-layer">
      {/* Darkness is the loading veil; it is present from the first paint. */}
      <LoadingVeil />
      <TransitionVeil />

      {/* Skip / Reduce motion / Continue in silence / Sound — mandatory from S1 (§2.10), and
          now the single home for them. The invitation used to repeat the same controls in a
          row across the middle of the scene; that row is gone, so this cluster carries them
          through S8 as well. It lives on the bottom edge and never crosses the artwork. */}
      {inOpening && <AccessibilityControls />}
      {inOpening && <ScreenReaderNarrative />}

      {/* Zero navigation before S9: the first-screen law forbids it. */}
      {inRoom && <NavigationMinimal />}

      {/* S4/S5: the threshold question and "Begin the Journey".
          Not rendered under the Spline entrance: that scene is the whole threshold, and this
          overlay would sit across the middle of it exactly as the S8 row did. The strings stay
          in `copy.js` — they are locked verbatim (§14.5) and the weave entrance still shows
          them, so this is a mounting decision rather than a deletion. */}
      {ENTRANCE_MODE !== 'spline' &&
        (state === STATES.S4_LIVING_WEAVE || state === STATES.S5_PORTAL_ENTRY) && (
          <PortalInvitation />
        )}

      {/* S8: the invitation over the still Earth composition. */}
      {state === STATES.S8_READING_ROOM_INVITATION && <ReadingRoomInvitation />}

      {/* S9: Phase 1B calibration, behind the flag. Off at launch — only
          `full_manuscript` is certified today, so S9 settles straight into S10 (§3.3). */}
      {state === STATES.S9_READING_ROOM_INIT && FLAGS.ageLayerEnabled && <AgeRangePrompt />}

      {/* S10–S12: the manuscript. */}
      {READING_SURFACE_STATES.includes(state) && <ReadingSurface />}

      {/* S11: a rare, server-gated share window. Never a prompt the client invented. */}
      {state === STATES.S11_SHARE_OPPORTUNITY && <ShareMoment />}

      {/* S13: decompression, then one quiet affordance. */}
      {state === STATES.S13_OPENING_ARC_COMPLETE && <ArcComplete />}

      {/* S14: the equal choices. */}
      {state === STATES.S14_CHOOSE_YOUR_PATH && <ChoosePath />}
    </div>
  );
};

/**
 * Everything below the providers. Owns the document-level attributes that CSS reads (motion
 * mode, text scale and theme) so no component has to reach for `documentElement` itself.
 */
const ExperienceShell = () => {
  const { state, motionPreference } = useExperience();
  const { settings } = useReading();

  useCoarseUrlSync(state);

  // Inert during S1–S4 by design: those transitions carry no `readerIntent()` guard,
  // because the first reveal is guided. What it does carry is the reader's input method,
  // which the PortalEntryStarted payload records. Disabled at S5 and beyond, where the
  // invitation control is the only thing permitted to commit the reader onward.
  // Disabled under the Spline entrance: that component owns the reader's gesture, and two
  // listeners on the same wheel event would send two intents for one movement.
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

  // The theme belongs to the document, not to the manuscript column: the reader chose it
  // once, and the room, its chrome and every pathway flow are the same environment (§8.8).
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.dataset.theme =
      settings.theme === READING_THEMES.LIGHT ? READING_THEMES.LIGHT : READING_THEMES.DARK;
  }, [settings.theme]);

  // WebGL is unavailable or would be software-rasterised: the experience takes the
  // static path. The manuscript itself never depended on the canvas (§3.4.4 fallback).
  const hasWebGL = useMemo(() => supportsWebGL(), []);

  // Which threshold carries S1–S8.
  //
  // S8 is included deliberately. It is where the reader is addressed for the first time
  // (§2.4.6, "The first human truth"), and the R3F canvas behind it draws Earth — which,
  // without the NASA textures that are still pending sourcing, is a bare shaded sphere. An
  // authored scene is a better backdrop for that moment than an untextured disc.
  //
  // From S9 the R3F canvas takes over regardless: the Reading Room's Earth presence and its
  // receding "background memory" are the same scene graph the reading surface composites
  // over (§3.4.3), and that recession is the transfer of authority to the manuscript.
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

/**
 * Provider order, outer to inner:
 *   PerformanceProvider  device tier — every other provider may need it
 *   ExperienceProvider   the state machine, session and event pipeline
 *   AudioProvider        opt-in sound, which reports its state into the machine
 *   MilestonesProvider   quiet orientation hints
 *   ReadingProvider      the manuscript, which drives the machine's reading transitions
 */
const ExperienceApp = () => {
  // Resolved once, synchronously, before the machine is constructed: the entry checkpoint
  // is a constructor argument, not something applied after the reader has seen a state.
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

/**
 * The two forks in the whole application.
 *
 * `/admin-panel` is an operations tool, not a state of the experience (§10.10.1: "a simple
 * React admin SPA … no React Three Fiber, no GSAP, no immersive machinery"). `/test-
 * questionnaire` is the Beta Test Questionnaire, which a reviewer is sent a link to after
 * reading the manuscript — often as a document, in print, or somewhere this application was
 * never open (§5.8 records the reading format as one of four, and three of them are
 * elsewhere).
 *
 * Both branches are here, above every provider, because both are addresses answered by a
 * screen rather than by a state. On either path nothing constructs the state machine, nothing
 * opens the reading session the machine would open, nothing emits a canonical event, and no
 * canvas mounts. Rendering the panel *inside* the experience would put an internal table over
 * the Living Weave and count an operator's afternoon as arrivals in the S0 funnel; rendering
 * the questionnaire inside it would greet a reviewer who has finished the book with the
 * opening cinematic.
 *
 * Everywhere else this is the single continuous application it has always been.
 *
 * @returns {import('react').ReactElement} The surface this address belongs to.
 */
export default function App() {
  const { pathname } = useLocation();
  if (isAdminPath(pathname)) return <AdminRoutes />;
  if (isQuestionnairePath(pathname)) return <QuestionnaireRoutes />;
  return <ExperienceApp />;
}
