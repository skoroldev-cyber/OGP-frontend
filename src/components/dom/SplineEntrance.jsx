/**
 * The Spline entrance — an alternative threshold for S1–S7.
 *
 * This replaces the R3F opening (darkness → speck → Living Weave → passage → Earth) with a
 * single authored Spline scene, selected by `VITE_ENTRANCE_MODE=spline`. The weave path is not
 * deleted: §1.3.1's No-Loss Rule forbids silently discarding a canonical engine, and the Living
 * Weave and Earth reveal are canon (§2.5, §2.6, §8.6). Both entrances live side by side and the
 * flag chooses. Setting the flag back to `weave` restores the canonical opening with no code
 * change.
 *
 * Four things this file is careful about, because the surrounding law does not relax for a
 * third-party runtime:
 *
 *   1. **No third-party requests.** The scene is served from `/scene/entrance.splinecode` on our
 *      own origin, not from `prod.spline.design`. The published definition of done (§7.13)
 *      permits "no third-party network requests from the public build except approved asset/API
 *      origins", and a CDN that is fine today is a single point of failure for the threshold
 *      tomorrow. The exported scene is self-contained — it embeds no external asset URLs.
 *
 *   2. **No visible loading machinery.** Spline's own loader is never mounted; the scene is
 *      constructed against a canvas that stays fully transparent until the runtime reports the
 *      scene loaded, and the darkness above it is what the reader sees meanwhile (§2.4.1, §2.14:
 *      "darkness is the loading veil"). There is no spinner and no percentage at any point.
 *
 *   3. **Reader intent, not a scrubbed timeline.** Scrolling does not drive the scene frame by
 *      frame. It is read as intent, debounced into a single `advance`, and the state machine's
 *      guards decide whether that intent is honoured (§7.2: "Intent advances state when guards
 *      pass; it never scrubs the cinematic timeline"). A reader who spins the wheel does not
 *      fast-forward the threshold.
 *
 *   4. **Reduced motion is honoured.** Under `reduced` the scene is rendered and then paused on
 *      its first settled frame — a still composition rather than an animation nobody asked for.
 *      Under `off` the runtime is not started at all and the still poster carries the state.
 *
 * ── One WebGL context, for the life of the mount ──────────────────────────────────────────
 *
 * A browser allows a page only a small number of live WebGL contexts — sixteen in Chrome — and
 * when a seventeenth is asked for it does not refuse it. It silently takes the OLDEST context
 * away, which is how a threshold ends up loading its scene, reporting success, and drawing
 * nothing at all: black canvas, no error, nothing in the console.
 *
 * `Application.dispose()` does not give its context back. Measured directly: fourteen
 * applications constructed, loaded and disposed left fourteen live contexts behind. So every
 * teardown here — StrictMode's, an unmount, a scene change — used to leak one, and a reader who
 * crossed into the Reading Room and came back around a few times spent the page's whole budget.
 * That is the black screen on the second and third visit, and why the first visit on a device
 * always looked fine.
 *
 * Two rules keep it from happening, and both matter:
 *
 *   · **A scene change is `load()`, not a new Application.** Entrance → invitation reuses the
 *     one that is already running, so the swap costs no context at all.
 *   · **Teardown ends the context explicitly**, with `WEBGL_lose_context`, because the runtime
 *     will not.
 *
 * And because a context can still be lost for reasons that have nothing to do with this file —
 * a driver reset, a background tab reclaimed, another part of the page spending the budget —
 * losing one is treated as a recoverable event and the scene is rebuilt. A threshold that goes
 * black must come back on its own.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import { SPLINE_SCENES, assetUrl } from '@/config/env';
import { OGP_TIMING } from '@/config/ogpTheme';
import { INTENTS, STATES } from '@/experience/states';
import { useExperience } from '@/experience/ExperienceProvider';
import '@/styles/SplineEntrance.scss';



/**
 * How much upward travel, in CSS pixels, constitutes a decision to cross.
 *
 * Roughly five full wheel gestures on a typical trackpad. The threshold is a commitment rather
 * than a control: the reader should be able to explore the scene, move it, look at it, without
 * the opening ending underneath them — but crossing should not feel like work either. 900 px
 * crossed by accident; 2700 px was further than anyone wanted to travel.
 */
const SCROLL_THRESHOLD_PX = 1600;

/**
 * Accumulated travel is forgotten after this long, so unrelated gestures never sum.
 *
 * Scaled with the threshold: the crossing takes several deliberate gestures, and a window that
 * expired between them would reset the count — the reader would scroll and scroll and never
 * arrive. Long enough to hold a sustained movement together, short enough that a flick now and
 * a flick a few seconds later are still two separate things.
 */
const SCROLL_DECAY_MS = 1600;

/** Scene objects Spline uses for its own attribution badge. */
const WATERMARK_OBJECTS = ['SplineWatermark', 'Spline Watermark', 'Watermark'];

/**
 * How many times a lost context is rebuilt before the darkness is allowed to stand.
 *
 * Recovery has to be bounded. If the loss is transient — a driver reset, a tab reclaimed —
 * one rebuild is enough. If it is not, rebuilding asks for a context, is refused, rebuilds
 * again, and burns the device down in a loop the reader cannot see or leave. Three attempts,
 * then the threshold degrades to the void it was always willing to be (§3.12).
 */
const MAX_CONTEXT_RECOVERIES = 3;

/** A beat between losing a context and asking for another, so recovery is never a spin. */
const CONTEXT_RECOVERY_DELAY_MS = 400;

/**
 * How often the runtime is asked to draw.
 *
 * The runtime's default is `auto` — its own words: "tries to only render when necessary". For
 * a scene driven by interaction that is the efficient choice, and for an authored ambient
 * piece it is the wrong one: the scene composes its first frames, the runtime decides nothing
 * further is necessary, and the threshold freezes into a still image. Constructing
 * `new Application(canvas)` with no options took that default silently, which is why both
 * scenes loaded correctly and then stopped moving.
 *
 * `continuous` is what an authored opening needs — one draw per frame, for as long as the
 * reader is looking at it. The cost is real and is spent deliberately: this is ninety seconds
 * of the work, not a decorative background.
 *
 * There is no second mode. `manual` was the reduced-motion variant, which drew only when
 * asked, and since nothing asked the scene composed one frame and held it. Motion is Full for
 * everyone now, so the scene plays for everyone.
 */
const RENDER_MODE = 'continuous';

/**
 * Scene URLs whose warm-up has already been started, for the lifetime of the document.
 *
 * Module scope rather than a ref: the point is that one download happens per page load, and
 * a remount — StrictMode's, a scene change, a hot reload — must not start a second one
 * alongside the first. Two concurrent 4.2 MB requests for the same URL are worse than none.
 */
const startedPrefetch = new Set();

/**
 * Hide the badge if the scene carries one.
 *
 * The badge is not injected by the runtime — it is baked into the scene file as an object with
 * an embedded PNG, so it renders inside the WebGL canvas and no amount of CSS reaches it. The
 * entrance scene has no such object; the invitation scene does. That difference is a per-scene
 * export setting in Spline, which means **the real fix is to re-export the scene with the
 * watermark disabled**, exactly as the entrance scene evidently was. This is the safety net,
 * not the solution: it runs on whatever the build happens to ship.
 *
 * Worth being deliberate about: on Spline's free tier the badge is an attribution requirement,
 * and hiding it there would be a licence question rather than a styling one. The entrance scene
 * shipping without it is good evidence this account may remove it — but that is the account
 * owner's call to confirm, not an inference for code to make silently.
 *
 * @param {any} app The loaded Spline application.
 * @returns {void}
 */
function hideWatermark(app) {
  if (typeof app?.findObjectByName !== 'function') return;
  for (const name of WATERMARK_OBJECTS) {
    try {
      const object = app.findObjectByName(name);
      if (object) object.visible = false;
    } catch {
      // The runtime's object API is not contractual; a miss here costs a badge, not the scene.
    }
  }
}

/**
 * End a canvas's WebGL context now, rather than whenever the collector gets to it.
 *
 * `WEBGL_lose_context.loseContext()` is the only way a page can hand a context back; three.js
 * calls it `forceContextLoss()` and does the same thing. Without it the context outlives both
 * the application and the element, counting against the page's budget until the whole document
 * is torn down — see the note at the top of this file for what that costs.
 *
 * Only ever called for a canvas that already has a context. `getContext` on one that does not
 * would CREATE the very thing this function exists to give back.
 *
 * @param {HTMLCanvasElement} canvas The canvas whose context is being released.
 * @returns {void}
 */
function releaseContext(canvas) {
  try {
    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
  } catch {
    // Best effort by nature: a context that cannot be released is not a reader-facing problem.
  }
}

/**
 * Load a scene, and if it will not parse, replace the cached copy and try once more.
 *
 * A `.splinecode` that arrives short is fatal and permanent. The runtime rejects it, the
 * threshold shows `data-failed`, and — because the bad bytes are what the HTTP cache now holds
 * for that URL — every subsequent visit fails the same way, on a device where the scene worked
 * perfectly the first time. Nothing recovers it, including a normal reload, because a normal
 * reload is served from the same cache.
 *
 * A truncated entry is not hypothetical: any interrupted download of a 4.2 MB body can leave
 * one, and an earlier version of the prefetch below both aborted its request and left the body
 * unread, either of which is enough. `cache: 'reload'` is the one fetch mode that ignores what
 * is stored and overwrites it, so the retry gives the runtime a URL whose cached bytes are
 * known-complete rather than asking it to parse the same corruption twice.
 *
 * @param {any} app The running Spline application.
 * @param {string} url The scene URL.
 * @returns {Promise<void>} resolves once the scene is loaded; rejects if the fresh copy fails too.
 */
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

/**
 * The Spline threshold.
 *
 * @param {{ scene?: 'entrance'|'invitation', onLoaded?: () => void }} props
 *        `scene` selects which self-hosted scene to load; `onLoaded` fires once it is on screen.
 */
export const SplineEntrance = ({ scene = 'entrance', onLoaded }) => {
  /** The container React owns. The canvas inside it belongs to the effect. */
  const hostRef = useRef(null);
  const appRef = useRef(null);
  const intentAt = useRef(0);

  const { state, send } = useExperience();

  /**
   * The running application, as state rather than a ref, because loading a scene into it is a
   * separate effect that has to re-run the moment it exists.
   */
  const [runtime, setRuntime] = useState(null);
  const [failed, setFailed] = useState(false);

  /**
   * Which scene is resident, rather than a `loaded` boolean.
   *
   * The distinction is what makes the entrance → invitation swap a dissolve without a
   * synchronous `setLoaded(false)` at the top of the load effect: readiness is *derived* from
   * whether the scene now on the canvas is the scene being asked for, so the moment `scene`
   * changes the canvas is already fading, one render earlier and with no cascade.
   */
  const [residentScene, setResidentScene] = useState(null);
  const loaded = runtime !== null && residentScene === scene;

  /**
   * Bumped to rebuild the runtime after the context is lost. A lost context cannot be revived
   * in place — the canvas that owned it is finished — so recovery is a fresh canvas and a fresh
   * application, which is exactly what re-running the effect below produces.
   */
  const [generation, setGeneration] = useState(0);
  const recoveries = useRef(0);

  /* ---- the runtime ------------------------------------------------------- */

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const host = hostRef.current;
    if (!host) return undefined;

    // A canvas per Application, created here and destroyed with it.
    //
    // A WebGL context belongs to its canvas element for that element's whole life. Once the
    // context has ended, the same `<canvas>` cannot hand out a fresh one — it returns the dead
    // context or nothing — so any second Application built on it loads the scene, reports
    // success, and draws nothing. Creating the element here means a new Application always gets
    // a new canvas, and the old canvas leaves with the context it owned.
    const canvas = document.createElement('canvas');
    canvas.className = 'ogp-spline-entrance__canvas';
    host.appendChild(canvas);

    // Flush layout before the runtime measures this canvas.
    //
    // A freshly appended element has no computed geometry until the browser next lays out, and
    // the runtime reads the canvas size when it is constructed in order to size its renderer.
    // With a warm cache `await import('@splinetool/runtime')` resolves in a microtask inside
    // this same task, so construction can reach the canvas before any layout has run; with a
    // cold cache the round trip guarantees one. Reading a layout property here removes that
    // difference, so the threshold does not depend on how warm the cache is.
    void canvas.getBoundingClientRect();

    let cancelled = false;
    /** @type {import('@splinetool/runtime').Application | null} */
    let app = null;
    /** Whether a context exists to give back. See `releaseContext`. */
    let hasContext = false;

    // A context can be taken away by things this page does not control: a driver reset, a
    // background tab reclaimed, another surface spending the budget. `preventDefault` is what
    // marks the loss recoverable; the rebuild is what actually recovers it. Without this the
    // canvas simply stays black for the rest of the visit.
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
        // Imported lazily so the runtime is not in the critical path of a build that never
        // shows it — the weave entrance must not pay for this one.
        const { Application } = await import('@splinetool/runtime');
        if (cancelled) return;

        app = new Application(canvas, { renderMode: RENDER_MODE });
        hasContext = true;
        appRef.current = app;
        setRuntime(app);
      } catch {
        // A threshold that cannot render is not an error the reader should meet. The darkness
        // stays, the affordances stay, and the reader can still continue — exactly the
        // degradation ladder §3.12 describes.
        if (!cancelled) setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
      appRef.current = null;
      setRuntime(null);
      // The next application starts with an empty canvas, so the scene it will load must not
      // already be counted as resident — that would fade a black canvas up to full opacity.
      setResidentScene(null);
      if (recoveryTimer != null) window.clearTimeout(recoveryTimer);
      canvas.removeEventListener('webglcontextlost', onContextLost);
      try {
        app?.dispose?.();
      } catch {
        // Disposal races a cancelled construction; nothing here is worth surfacing.
      }
      // `dispose()` does not do this, and nothing else will. See the note at the top.
      if (hasContext) releaseContext(canvas);
      canvas.remove();
    };
  }, [generation]);

  /* ---- the scene --------------------------------------------------------- */

  // Entrance → invitation is a `load()` into the application already running, not a second
  // application. The runtime replaces the scene graph in place, which keeps the swap free of a
  // context and — because the canvas never leaves the document — free of a frame of bare page.
  //
  // The swap is a dissolve rather than a cut: `residentScene` stops matching `scene` the
  // instant the prop changes, so the outgoing scene fades out through the canvas's opacity
  // transition and the incoming one fades up once it reports ready. Combined with the veil over
  // this same boundary, the reader sees one continuous darkening and lightening.
  useEffect(() => {
    if (!runtime) return undefined;

    let cancelled = false;

    (async () => {
      try {
        await loadScene(runtime, assetUrl(SPLINE_SCENES[scene] ?? SPLINE_SCENES.entrance));
        if (cancelled) return;

        hideWatermark(runtime);

        // Insist on a running loop and at least one drawn frame.
        //
        // `load()` resolving proves the scene parsed, nothing more — the runtime can be left
        // idle, and an idle runtime is indistinguishable from a broken one on screen: black
        // canvas, live GL context, no error. `play()` undoes any paused state;
        // `requestRender()` guarantees the next frame draws whatever the mode. Both are no-ops
        // when nothing was wrong.
        try {
          runtime.play?.();
          runtime.requestRender?.();
        } catch {
          // Older runtimes may not expose these. A scene already running needs neither.
        }

        // Cleared, not just set: a scene that failed once must be able to succeed later, and
        // `data-failed` holds the canvas at zero opacity for as long as it is true.
        setFailed(false);
        setResidentScene(scene);
        onLoaded?.();
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [runtime, scene, onLoaded]);

  /* ---- warm the next scene ----------------------------------------------- */

  // The invitation scene is an order of magnitude heavier than the entrance, and the crossing
  // that reveals it can happen in a couple of seconds. Fetching it only when S8 arrives would
  // put a visible wait exactly where §2.4.1 forbids one — "no visible loading machinery" — so
  // it is pulled into the HTTP cache while the reader is still in the opening, behind the
  // scene they are already watching. `low` priority so it never competes with the scene on
  // screen, and failure is ignored: this is an optimisation, not a dependency.
  //
  // **It is never aborted, and the body is always drained.** Both matter, for the same reason.
  //
  // An `AbortController` used to cancel this from the effect cleanup, which is the ordinary
  // React reflex and is wrong for this particular request: cancelling a 4.2 MB response partway
  // through can leave a truncated entry behind for that URL, and afterwards `load()` reads the
  // short body straight from cache, parses it without complaint, and renders a scene with
  // nothing in it. Leaving the body unread has the same ending by a different route — the
  // browser is entitled to drop the transfer once the unread stream is collected, so the cache
  // is left with nothing to serve and the download was spent for no benefit.
  //
  // A prefetch that runs to completion has nothing to cancel and nothing to truncate. If the
  // reader leaves, the bytes land in the cache and go unused, which costs one background
  // download and no correctness at all. `startedPrefetch` keeps a re-render from opening a
  // second one.
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
        // A warm cache is a convenience. Failing to warm it changes nothing but the wait.
        startedPrefetch.delete(url);
      }
    })();

    return undefined;
  }, [scene, loaded]);

  /* ---- scroll as intent -------------------------------------------------- */

  /**
   * One gesture, one intent.
   *
   * The debounce is not throttling for performance. It is what turns a continuous wheel or
   * touch stream into a single statement of readiness, so that a reader who scrolls hard does
   * not skip the threshold they came for.
   *
   * @param {string} inputMethod How the reader expressed it.
   */
  const expressIntent = useCallback(
    (inputMethod) => {
      const now = Date.now();
      if (now - intentAt.current < OGP_TIMING.readerIntentDebounceMs) return;
      intentAt.current = now;

      // `cross`, not `advance` and not `skip`.
      //
      // `advance` would walk one canonical sub-beat at a time — speck, manifestation,
      // threshold, passage, reveal — each with its own dwell floor, so the reader would scroll
      // and watch nothing happen for the better part of a minute. Those beats describe the
      // Living Weave opening, and under this entrance they are not being played.
      //
      // `skip` reaches the right state but lies about why: it sets `skipUsed` and stamps every
      // milestone `skipped: true`, which is how §10.4 counts readers who declined the opening.
      // Every reader would be counted as having declined it.
      send(INTENTS.CROSS, { inputMethod });
    },
    [send],
  );

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    if (!state || state === STATES.S8_READING_ROOM_INVITATION) return undefined;

    let touchStartY = 0;

    // Crossing the threshold takes a sustained gesture, not a notch.
    //
    // A single wheel tick is an accident as often as it is a decision, and this transition is
    // the one place the reader commits to leaving the opening. So travel accumulates and only
    // a deliberate amount of it counts — and it decays, so a stray flick a minute ago does not
    // add itself to a stray flick now. This is still intent rather than a scrubbed timeline:
    // it changes how much gesture the intent takes, never what the scene does meanwhile.
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
      // Scrolling *up* is the gesture the reader was asked for. Down is left alone so the
      // page's own affordances stay reachable without committing anyone onward.
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
      // A key press is unambiguous on its own; it needs no accumulation.
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

  /* ---- render ------------------------------------------------------------ */

  // `aria-hidden`: the scene is decoration. The accessible account of every state lives in
  // `ScreenReaderNarrative`, and the manuscript itself is semantic DOM (§3.10).
  return (
    <div
      ref={hostRef}
      className="ogp-spline-entrance"
      data-loaded={loaded ? 'true' : 'false'}
      data-failed={failed ? 'true' : 'false'}
      aria-hidden="true"
    >
      {/*
        Empty by design. The canvas is created and removed by the effect above, so that each
        Spline application owns an element — and therefore a WebGL context — of its own. Motion
        Off never runs the effect, so nothing is appended and the void carries the state.
      */}
    </div>
  );
};

export default SplineEntrance;
