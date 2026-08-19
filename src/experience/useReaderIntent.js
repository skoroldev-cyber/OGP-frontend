/**
 * Reader intent capture.
 *
 * itom's unified input capture (GSAP `Observer`) is kept, but its purpose is inverted.
 * In itom, wheel and drag SCRUBBED a timeline. Here they may not:
 *
 *   "The first reveal must be guided — no user control at first." (§7.2.1)
 *
 * So every gesture — wheel, drag, touch, click, Enter, Space, ArrowDown — collapses into
 * ONE discrete `send('advance')` intent. The machine then decides whether that intent can
 * be honoured yet. A reader cannot scrub the opening forward, cannot slow it down, and
 * cannot get halfway into a transition: they can only say "I am ready".
 *
 * From S9 onward continuous scroll belongs to the reading systems, so this hook is
 * disabled there (`enabled: false`) and native scrolling takes over untouched.
 */

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { Observer } from 'gsap/Observer';
import { OGP_TIMING } from '@/config/ogpTheme';
import { INTENTS } from '@/experience/states';
import { useExperience } from '@/experience/ExperienceProvider';
import { isTouchDevice } from '@/utils/deviceDetect';

gsap.registerPlugin(Observer);

/** Elements that handle their own activation; a global key intent must not double-fire. */
const INTERACTIVE = 'button, a[href], input, select, textarea, [role="button"], [contenteditable="true"]';

/**
 * @param {{ enabled?: boolean, onIntent?: (inputMethod: string) => void }} [options]
 * @returns {{ lastIntentAt: React.MutableRefObject<number> }}
 */
export const useReaderIntent = ({ enabled = true, onIntent } = {}) => {
  const { send } = useExperience();
  const lastIntentAt = useRef(0);
  // Latest-ref, written in an effect rather than during render. Effects flush before any
  // reader gesture can reach a listener, so the handler never sees a stale callback.
  const onIntentRef = useRef(onIntent);
  useEffect(() => {
    onIntentRef.current = onIntent;
  }, [onIntent]);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return undefined;

    /**
     * One gesture, one intent. The debounce is not throttling for performance — it is what
     * turns a continuous wheel event stream into a single statement of readiness.
     *
     * @param {string} inputMethod
     */
    const fire = (inputMethod) => {
      const now = Date.now();
      if (now - lastIntentAt.current < OGP_TIMING.readerIntentDebounceMs) return;
      lastIntentAt.current = now;
      onIntentRef.current?.(inputMethod);
      send(INTENTS.ADVANCE, { inputMethod });
    };

    const observer = Observer.create({
      target: window,
      type: 'wheel,touch,pointer',
      // No `onChangeY`, no deltas, no progress: the timeline is never scrubbed.
      onDown: () => fire(isTouchDevice() ? 'touch' : 'pointer'),
      onUp: () => fire(isTouchDevice() ? 'touch' : 'pointer'),
      onClick: (self) => {
        // Clicks on real controls are the control's business, not a global intent.
        const target = self?.event?.target;
        if (target?.closest?.(INTERACTIVE)) return;
        fire(self?.event?.detail === 0 ? 'assistive' : 'pointer');
      },
      tolerance: 10,
      preventDefault: false,
    });

    /**
     * @param {KeyboardEvent} event
     */
    const onKeyDown = (event) => {
      if (event.key !== 'Enter' && event.key !== ' ' && event.key !== 'ArrowDown') return;
      // Enter/Space on a focused control activates that control; intercepting here would
      // fire the intent twice and could advance past a state the reader meant to act in.
      if (event.target?.closest?.(INTERACTIVE)) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      event.preventDefault();
      fire('keyboard');
    };

    window.addEventListener('keydown', onKeyDown);

    return () => {
      observer.kill();
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [enabled, send]);

  return { lastIntentAt };
};

export default useReaderIntent;
