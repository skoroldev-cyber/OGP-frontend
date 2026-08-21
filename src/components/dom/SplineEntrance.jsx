import { useCallback, useEffect, useRef, useState } from 'react';

import { SPLINE_SCENES, assetUrl } from '@/config/env';
import { OGP_TIMING } from '@/config/ogpTheme';
import { INTENTS, STATES } from '@/experience/states';
import { useExperience } from '@/experience/ExperienceProvider';
import '@/styles/SplineEntrance.scss';

const SCROLL_THRESHOLD_PX = 1600;

const SCROLL_DECAY_MS = 1600;

const WATERMARK_OBJECTS = ['SplineWatermark', 'Spline Watermark', 'Watermark'];

const MAX_CONTEXT_RECOVERIES = 3;

const CONTEXT_RECOVERY_DELAY_MS = 400;

const RENDER_MODE = 'continuous';

const startedPrefetch = new Set();

function hideWatermark(app) {
  if (typeof app?.findObjectByName !== 'function') return;
  for (const name of WATERMARK_OBJECTS) {
    try {
      const object = app.findObjectByName(name);
      if (object) object.visible = false;
    } catch {
      void 0;
    }
  }
}

function releaseContext(canvas) {
  try {
    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
  } catch {
    void 0;
  }
}

async function loadScene(app, url) {
  try {
    await app.load(url);
  } catch (error) {
    const response = await fetch(url, { cache: 'reload', credentials: 'omit' });
    if (!response.ok) throw error;
    await response.arrayBuffer();
    await app.load(url);
  }
}

export const SplineEntrance = ({ scene = 'entrance', onLoaded }) => {
  const hostRef = useRef(null);
  const appRef = useRef(null);
  const intentAt = useRef(0);

  const { state, send } = useExperience();

  const [runtime, setRuntime] = useState(null);
  const [failed, setFailed] = useState(false);

  const [residentScene, setResidentScene] = useState(null);
  const loaded = runtime !== null && residentScene === scene;

  const [generation, setGeneration] = useState(0);
  const recoveries = useRef(0);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const host = hostRef.current;
    if (!host) return undefined;

    const canvas = document.createElement('canvas');
    canvas.className = 'ogp-spline-entrance__canvas';
    host.appendChild(canvas);

    void canvas.getBoundingClientRect();

    let cancelled = false;
    let app = null;
    let hasContext = false;

    let recoveryTimer = null;
    const onContextLost = (event) => {
      event.preventDefault();
      if (cancelled) return;
      setResidentScene(null);
      if (recoveries.current >= MAX_CONTEXT_RECOVERIES) return;
      recoveries.current += 1;
      recoveryTimer = window.setTimeout(() => {
        if (!cancelled) setGeneration((value) => value + 1);
      }, CONTEXT_RECOVERY_DELAY_MS);
    };
    canvas.addEventListener('webglcontextlost', onContextLost);

    (async () => {
      try {
        const { Application } = await import('@splinetool/runtime');
        if (cancelled) return;

        app = new Application(canvas, { renderMode: RENDER_MODE });
        hasContext = true;
        appRef.current = app;
        setRuntime(app);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
      appRef.current = null;
      setRuntime(null);
      setResidentScene(null);
      if (recoveryTimer != null) window.clearTimeout(recoveryTimer);
      canvas.removeEventListener('webglcontextlost', onContextLost);
      try {
        app?.dispose?.();
      } catch {
        void 0;
      }
      if (hasContext) releaseContext(canvas);
      canvas.remove();
    };
  }, [generation]);

  useEffect(() => {
    if (!runtime) return undefined;

    let cancelled = false;

    (async () => {
      try {
        await loadScene(runtime, assetUrl(SPLINE_SCENES[scene] ?? SPLINE_SCENES.entrance));
        if (cancelled) return;

        hideWatermark(runtime);

        try {
          runtime.play?.();
          runtime.requestRender?.();
        } catch {
          void 0;
        }

        setFailed(false);
        setResidentScene(scene);
        onLoaded?.(scene);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [runtime, scene, onLoaded]);

  useEffect(() => {
    if (scene !== 'entrance' || !loaded || typeof window === 'undefined') return undefined;

    const url = assetUrl(SPLINE_SCENES.invitation);
    if (startedPrefetch.has(url)) return undefined;
    startedPrefetch.add(url);

    void (async () => {
      try {
        const response = await fetch(url, { credentials: 'omit', priority: 'low' });
        await response.arrayBuffer();
      } catch {
        startedPrefetch.delete(url);
      }
    })();

    return undefined;
  }, [scene, loaded]);

  const expressIntent = useCallback(
    (inputMethod) => {
      const now = Date.now();
      if (now - intentAt.current < OGP_TIMING.readerIntentDebounceMs) return;
      intentAt.current = now;

      send(INTENTS.CROSS, { inputMethod });
    },
    [send],
  );

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    if (!state || state === STATES.S8_READING_ROOM_INVITATION) return undefined;

    let touchStartY = 0;

    let travel = 0;
    let lastAt = 0;

    const accumulate = (amount) => {
      const now = Date.now();
      if (now - lastAt > SCROLL_DECAY_MS) travel = 0;
      lastAt = now;
      travel += amount;
      if (travel < SCROLL_THRESHOLD_PX) return false;
      travel = 0;
      return true;
    };

    const onWheel = (event) => {
      if (event.deltaY < 0 && accumulate(-event.deltaY)) expressIntent('pointer');
    };
    const onTouchStart = (event) => {
      touchStartY = event.touches[0]?.clientY ?? 0;
      travel = 0;
    };
    const onTouchMove = (event) => {
      const y = event.touches[0]?.clientY ?? 0;
      const delta = touchStartY - y;
      touchStartY = y;
      if (delta > 0 && accumulate(delta)) expressIntent('touch');
    };
    const onKey = (event) => {
      if (event.key === 'ArrowUp' || event.key === 'PageUp') expressIntent('keyboard');
    };

    window.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('keydown', onKey);

    return () => {
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('keydown', onKey);
    };
  }, [state, expressIntent]);

  return (
    <div
      ref={hostRef}
      className="ogp-spline-entrance"
      data-loaded={loaded ? 'true' : 'false'}
      data-failed={failed ? 'true' : 'false'}
      aria-hidden="true"
    >
    </div>
  );
};

export default SplineEntrance;
