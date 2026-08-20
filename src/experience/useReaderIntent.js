import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { Observer } from 'gsap/Observer';
import { OGP_TIMING } from '@/config/ogpTheme';
import { INTENTS } from '@/experience/states';
import { useExperience } from '@/experience/ExperienceProvider';
import { isTouchDevice } from '@/utils/deviceDetect';

gsap.registerPlugin(Observer);

const INTERACTIVE = 'button, a[href], input, select, textarea, [role="button"], [contenteditable="true"]';

export const useReaderIntent = ({ enabled = true, onIntent } = {}) => {
  const { send } = useExperience();
  const lastIntentAt = useRef(0);
  const onIntentRef = useRef(onIntent);
  useEffect(() => {
    onIntentRef.current = onIntent;
  }, [onIntent]);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return undefined;

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
      onDown: () => fire(isTouchDevice() ? 'touch' : 'pointer'),
      onUp: () => fire(isTouchDevice() ? 'touch' : 'pointer'),
      onClick: (self) => {
        const target = self?.event?.target;
        if (target?.closest?.(INTERACTIVE)) return;
        fire(self?.event?.detail === 0 ? 'assistive' : 'pointer');
      },
      tolerance: 10,
      preventDefault: false,
    });

    const onKeyDown = (event) => {
      if (event.key !== 'Enter' && event.key !== ' ' && event.key !== 'ArrowDown') return;
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
