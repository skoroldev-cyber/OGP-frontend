/**
 * The teleport machine (itom pattern, master §7.3).
 *
 * **Veil closes → the world is repositioned → veil opens.** Never a hard cut, never a
 * reload, never a visible remount. The application is one continuous surface (§2.1,
 * locked); this component is what lets a discontinuity in *position* happen without a
 * discontinuity in *experience*.
 *
 * Two situations use it:
 *
 *   1. **S8 → S9.** The Reading Room forms around Earth. The reader activated "Enter";
 *      what happens next is a repositioning, and the veil covers it so there is no scene
 *      switch, staging or animation reset to see (§3.3 visuals).
 *   2. **Deep links.** `/reading-room`, `/pathways`, `/openingarc` and a resumed session
 *      all place the machine at a checkpoint the reader did not walk to. The veil runs its
 *      opening half only: the world is already in position, so it simply lifts.
 *
 * The choreography is run by GSAP directly on the node — no React state, so a transition
 * can never cost a re-render of the reading surface underneath it, and the veil timings
 * stay configuration (`OGP_TIMING.veil`) rather than constants.
 *
 * `pointer-events` stays `none` throughout. A veil that swallowed input would be an
 * interface trap, and the veil is decoration: `aria-hidden`, silent.
 */

import { useEffect, useRef } from 'react';
import gsap from 'gsap';

import { OGP_MOTION, OGP_TIMING } from '@/config/ogpTheme';
import { STATES, isCinematic } from '@/experience/states';
import { useExperience } from '@/experience/ExperienceProvider';

/** Milliseconds → seconds, because GSAP takes seconds and the tokens are milliseconds. */
const sec = (ms) => ms / 1000;

/**
 * States a reader can arrive at without having walked there. Arriving at one of these on
 * the first observed render means the veil owes them its opening half.
 */
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

    // Crossing the threshold into S8 is the other seam that needs covering.
    //
    // It swaps one authored scene for another — two different WebGL scenes, one of them 4 MB —
    // and without a veil the reader sees the first scene vanish, a frame of bare void, then the
    // second appear. §2.4.3 is explicit that there are "no cuts, remounts, or flashes" and that
    // each state morphs from the previous state's final frame. The veil is what makes the swap
    // a dissolve instead of a cut; the darkness underneath it is the same darkness the opening
    // started in, so nothing about it reads as machinery.
    const crossing = from !== null && isCinematic(from) && state === STATES.S8_READING_ROOM_INVITATION;

    // Nothing to cover. Any timeline still running is left alone to finish — killing it here
    // is what used to strand the veil open over the manuscript.
    if (!deepLink && !teleport && !crossing) return undefined;

    // A new transition supersedes an unfinished one. Kill it and clear the node first, so the
    // superseded timeline's final state can never be what the reader is left looking at.
    if (timelineRef.current) {
      timelineRef.current.kill();
      gsap.set(node, { opacity: 0, visibility: 'hidden' });
    }

    const timeline = gsap.timeline();
    timelineRef.current = timeline;

    if (teleport || crossing) {
      // Close over the S8 composition, hold while the room forms, then open onto it.
      timeline
        .set(node, { opacity: 0, visibility: 'visible' })
        .to(node, {
          opacity: 1,
          duration: sec(OGP_TIMING.veil.closeMs),
          ease: OGP_MOTION.easeEnter,
        })
        .to(node, { opacity: 1, duration: sec(OGP_TIMING.veil.holdMs) });
    } else {
      // Deep link: the world is already in position. Only the opening half is owed.
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

    // Deliberately no cleanup that kills this timeline.
    //
    // This is the bug that left a black sheet over the reading room. S9 settles into S10 by
    // itself the moment the first unit is ready — usually before the veil has finished its
    // hold — so the effect re-ran, the old cleanup killed the timeline mid-close, and the new
    // run matched none of the three conditions and returned early. The veil stayed exactly
    // where the kill found it: fully opaque, over the manuscript, with nothing left to lift it.
    // Reloading onto `/reading-room` looked like a fix only because it skipped the transition.
    //
    // A transition now always runs to completion, and its last step hides the node. The only
    // thing that interrupts one is another transition, which clears the node before it starts.
    return undefined;
  }, [state]);

  // Teardown belongs to the component, not to each state change.
  useEffect(() => () => timelineRef.current?.kill(), []);

  return <div ref={veilRef} className="ogp-veil ogp-transition-veil" aria-hidden="true" />;
};

export default TransitionVeil;
