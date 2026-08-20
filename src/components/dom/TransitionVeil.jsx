import { useEffect, useRef } from 'react';
import gsap from 'gsap';

import { OGP_MOTION, OGP_TIMING } from '@/config/ogpTheme';
import { STATES, isCinematic } from '@/experience/states';
import { useExperience } from '@/experience/ExperienceProvider';

const sec = (ms) => ms / 1000;

const DEEP_LINK_STATES = [
  STATES.S9_READING_ROOM_INIT,
  STATES.S10_OPENING_ARC_READING,
  STATES.S13_OPENING_ARC_COMPLETE,
  STATES.S14_CHOOSE_YOUR_PATH,
];

export const TransitionVeil = () => {
  const { state } = useExperience();

  const veilRef = useRef(null);
  const previousState = useRef(null);
  const timelineRef = useRef(null);

  useEffect(() => {
    const node = veilRef.current;
    if (!node || !state) return undefined;

    const from = previousState.current;
    previousState.current = state;

    const firstObserved = from === null;
    const deepLink = firstObserved && DEEP_LINK_STATES.includes(state);
    const teleport =
      from === STATES.S8_READING_ROOM_INVITATION && state === STATES.S9_READING_ROOM_INIT;

    const crossing = from !== null && isCinematic(from) && state === STATES.S8_READING_ROOM_INVITATION;

    if (!deepLink && !teleport && !crossing) return undefined;

    if (timelineRef.current) {
      timelineRef.current.kill();
      gsap.set(node, { opacity: 0, visibility: 'hidden' });
    }

    const timeline = gsap.timeline();
    timelineRef.current = timeline;

    if (teleport || crossing) {
      timeline
        .set(node, { opacity: 0, visibility: 'visible' })
        .to(node, {
          opacity: 1,
          duration: sec(OGP_TIMING.veil.closeMs),
          ease: OGP_MOTION.easeEnter,
        })
        .to(node, { opacity: 1, duration: sec(OGP_TIMING.veil.holdMs) });
    } else {
      timeline.set(node, { opacity: 1, visibility: 'visible' });
    }

    timeline.to(node, {
      opacity: 0,
      duration: sec(OGP_TIMING.veil.openMs),
      ease: OGP_MOTION.easeExit,
      onComplete: () => {
        node.style.visibility = 'hidden';
      },
    });

    return undefined;
  }, [state]);

  useEffect(() => () => timelineRef.current?.kill(), []);

  return <div ref={veilRef} className="ogp-veil ogp-transition-veil" aria-hidden="true" />;
};

export default TransitionVeil;
