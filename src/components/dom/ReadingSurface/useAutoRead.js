/**
 * Auto-reading — a slow, reader-initiated scroll.
 *
 * The boundary this observes matters. §14.4.2 prohibits "auto-advancing the reader through the
 * Opening Arc on a timer", and §3.4.2 makes progression "by readiness and reader intent, never
 * a timeline". Neither forbids the page from moving at a pace the reader asked for — a reader
 * who cannot comfortably drive a scrollbar for an hour is exactly who scalable type and motion
 * controls exist for. What they forbid is the *arc* advancing without them.
 *
 * So auto-reading scrolls within a unit and stops when it reaches the end. Crossing into the
 * next unit stays a deliberate act, every time. The reader can stop it at any moment, and any
 * manual scroll stops it too — reaching for the page is a statement that they want it back.
 *
 * Speed is in pixels per second rather than "words per minute": the honest unit is the one
 * being controlled, and a wpm figure would be a fiction derived from a type scale the reader
 * is also free to change.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

/** Pace steps, in CSS pixels per second. The middle step is the default. */
export const AUTO_READ_SPEEDS = Object.freeze([8, 14, 22, 34, 50]);

/** Index into `AUTO_READ_SPEEDS` a reader starts at. */
export const AUTO_READ_DEFAULT_SPEED = 1;

/** Scrolls smaller than this are the browser settling, not the reader reaching for the page. */
const MANUAL_SCROLL_EPSILON_PX = 2;

/**
 * @param {{
 *   scrollRef: { current: HTMLElement|null },
 *   unitId: string|null,
 *   enabled?: boolean,
 * }} options
 * @returns {{
 *   running: boolean,
 *   speedIndex: number,
 *   start: () => void,
 *   stop: () => void,
 *   toggle: () => void,
 *   setSpeedIndex: (index: number) => void,
 *   atEnd: boolean,
 * }}
 */
export function useAutoRead({ scrollRef, unitId, enabled = true }) {
  const [running, setRunning] = useState(false);
  const [speedIndex, setSpeedIndex] = useState(AUTO_READ_DEFAULT_SPEED);
  const [atEnd, setAtEnd] = useState(false);

  const frameRef = useRef(0);
  const lastTimeRef = useRef(0);
  // Sub-pixel carry. At 8 px/s a frame advances 0.13 px; assigning that to `scrollTop` rounds
  // to zero every frame and the page never moves. The remainder is accumulated instead.
  const carryRef = useRef(0);
  const expectedTopRef = useRef(null);

  const stop = useCallback(() => {
    setRunning(false);
  }, []);

  const start = useCallback(() => {
    if (!enabled) return;
    setAtEnd(false);
    setRunning(true);
  }, [enabled]);

  const toggle = useCallback(() => {
    setRunning((previous) => {
      if (!previous) setAtEnd(false);
      return !previous;
    });
  }, []);

  // A new unit is a new page. Auto-reading does not carry across the boundary, because
  // carrying it would be the timer advancing the arc — the one thing §14.4.2 forbids.
  //
  // Adjusted during render rather than reset by an effect: an effect would leave one frame in
  // which the new unit is mounted and the previous unit's scroll is still running, and that
  // frame is precisely the boundary being protected. The carry and the expected offset are
  // re-initialised by the loop's own effect, so they need no handling here.
  const [lastUnitId, setLastUnitId] = useState(unitId);
  if (lastUnitId !== unitId) {
    setLastUnitId(unitId);
    setRunning(false);
    setAtEnd(false);
  }

  useEffect(() => {
    if (!running || typeof window === 'undefined') return undefined;

    const node = scrollRef.current;
    if (!node) return undefined;

    lastTimeRef.current = 0;
    carryRef.current = 0;
    expectedTopRef.current = node.scrollTop;

    const step = (time) => {
      const target = scrollRef.current;
      if (!target) return;

      if (lastTimeRef.current === 0) lastTimeRef.current = time;
      // Clamped: a backgrounded tab hands back a huge delta on return, which would jump the
      // page. Reading is not something to catch up on.
      const delta = Math.min((time - lastTimeRef.current) / 1000, 0.05);
      lastTimeRef.current = time;

      // The reader reached for the page. Their scroll wins, and auto-reading steps back.
      if (
        expectedTopRef.current !== null &&
        Math.abs(target.scrollTop - expectedTopRef.current) > MANUAL_SCROLL_EPSILON_PX
      ) {
        setRunning(false);
        return;
      }

      const extent = target.scrollHeight - target.clientHeight;
      if (extent <= 0) {
        setRunning(false);
        setAtEnd(true);
        return;
      }

      carryRef.current += AUTO_READ_SPEEDS[speedIndex] * delta;
      const whole = Math.floor(carryRef.current);
      if (whole > 0) {
        carryRef.current -= whole;
        target.scrollTop = Math.min(extent, target.scrollTop + whole);
      }
      expectedTopRef.current = target.scrollTop;

      // The end of the unit is where it stops. The continue affordance is the reader's.
      if (target.scrollTop >= extent - 1) {
        setRunning(false);
        setAtEnd(true);
        return;
      }

      frameRef.current = window.requestAnimationFrame(step);
    };

    frameRef.current = window.requestAnimationFrame(step);

    return () => {
      window.cancelAnimationFrame(frameRef.current);
      lastTimeRef.current = 0;
    };
  }, [running, speedIndex, scrollRef]);

  // Leaving the tab pauses it. Coming back to a page that kept reading without you is worse
  // than coming back to one that waited (§2.11: time in a hidden tab is not time experienced).
  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const onVisibility = () => {
      if (document.hidden) setRunning(false);
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  return { running, speedIndex, start, stop, toggle, setSpeedIndex, atEnd };
}

export default useAutoRead;
