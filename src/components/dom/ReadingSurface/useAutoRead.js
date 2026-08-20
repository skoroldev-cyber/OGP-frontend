import { useCallback, useEffect, useRef, useState } from 'react';

export const AUTO_READ_SPEEDS = Object.freeze([8, 14, 22, 34, 50]);

export const AUTO_READ_DEFAULT_SPEED = 1;

const MANUAL_SCROLL_EPSILON_PX = 2;

export function useAutoRead({ scrollRef, unitId, enabled = true }) {
  const [running, setRunning] = useState(false);
  const [speedIndex, setSpeedIndex] = useState(AUTO_READ_DEFAULT_SPEED);
  const [atEnd, setAtEnd] = useState(false);

  const frameRef = useRef(0);
  const lastTimeRef = useRef(0);
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
      const delta = Math.min((time - lastTimeRef.current) / 1000, 0.05);
      lastTimeRef.current = time;

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
