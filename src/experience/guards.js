/**
 * Transition guards.
 *
 * Every guard is a pure predicate over the machine context: `(context) => boolean`.
 * A transition fires only when EVERY guard passes; otherwise the machine waits and
 * re-evaluates on the next intent or tick.
 *
 * This is the mechanism behind the locked principle: **progression is driven by readiness
 * and reader intent, not a rigid film timeline** (master §2.2, §7.2.1). A slow device
 * simply breathes longer in the darkness, which the score explicitly permits (§2.14).
 *
 * Guards never mutate. They never read `window`, `document` or the network — everything
 * they need is already in the context, which is what makes the machine testable without
 * a browser and what makes a transition reproducible from a persisted session.
 *
 * Time is taken from `context.now` when present (the machine stamps it at the top of each
 * evaluation) so that one evaluation pass sees a single consistent instant.
 */

import { MOTION_PREFERENCES, READER_INTENTS } from '@/experience/states';

/**
 * @typedef {Object} ExperienceContext
 * @property {string} state
 * @property {number} stateEnteredAt
 * @property {number} [now]
 * @property {Record<string, boolean>} assetsReady
 * @property {Record<string, boolean>} sceneComplete
 * @property {string|null} pendingIntent
 * @property {boolean} skipUsed
 * @property {string} motionPreference
 * @property {boolean} systemReducedMotion
 * @property {boolean} audioEnabled
 */

/** @typedef {(context: ExperienceContext) => boolean} Guard */

/**
 * @param {ExperienceContext} context
 * @returns {number}
 */
const nowOf = (context) => (typeof context.now === 'number' ? context.now : Date.now());

/**
 * The dwell floor for the current state. Restraint made mechanical: "everything arrives
 * later than commercial productions would; enforce minimum dwells" (§2.3 quality 1).
 *
 * The machine subtracts time spent with the document hidden before this is evaluated, so
 * a state cannot elapse in a background tab the reader was not looking at.
 *
 * @param {number} ms milliseconds, always from `OGP_TIMING` — never a literal
 * @returns {Guard}
 */
export const minDwell = (ms) => (context) => nowOf(context) - context.stateEnteredAt >= ms;

/**
 * The named asset group has finished its warm-up pass (§7.7).
 * "Ready" means the pipeline waited, not that every byte arrived — a missing decorative
 * texture degrades the picture and must never strand a reader (see `assetManifest.js`).
 *
 * @param {string} group one of `ASSET_GROUPS`
 * @returns {Guard}
 */
export const assetsReady = (group) => (context) => context.assetsReady?.[group] === true;

/**
 * Reduced motion is in force — either from `prefers-reduced-motion` or from the explicit
 * in-experience toggle, which is mandatory and always available (§2.10, §8.3.4).
 * Reduced motion routes to still-frame variants that are a COMPLETE deliverable, not a
 * degraded one, so this guard usually appears inside `anyOf(...)` beside a scene signal
 * that will never arrive when there is no animation to complete.
 *
 * `systemReducedMotion` is deliberately NOT consulted here. It has already been folded into
 * `motionPreference` when the session began, and reading it again would let the guards route
 * to a still variant while the renderer, which honours the reader's explicit choice, plays the
 * full one — a machine waiting for a scene signal that a playing scene has no reason to send.
 * One value decides this, and it is the one the reader can change.
 *
 * @returns {Guard}
 */
export const reducedMotion = () => (context) =>
  context.motionPreference === MOTION_PREFERENCES.REDUCED ||
  context.motionPreference === MOTION_PREFERENCES.OFF;

/**
 * The reader has intentionally enabled sound. Audio is strictly opt-in: nothing plays
 * before this is true, and silence is a complete experience (§2.9).
 *
 * @returns {Guard}
 */
export const audioOptedIn = () => (context) => context.audioEnabled === true;

/**
 * A person — not the scene — has asked to move on.
 *
 * The intent is LATCHED: it survives failing guards until the transition actually fires,
 * so a reader who activates "Enter" while an asset group is still warming is honoured the
 * instant readiness arrives. Their press is never silently dropped.
 *
 * Scene-originated `complete` signals deliberately do NOT satisfy this guard: a state
 * that waits on a person (S5, S8, S13) can never be auto-advanced by a timeline
 * ("The experience stops and waits. It does not force the visitor onward.", §3.2).
 *
 * @returns {Guard}
 */
export const readerIntent = () => (context) =>
  context.pendingIntent != null && READER_INTENTS.includes(context.pendingIntent);

/**
 * The reader has not used the skip path. Used to suppress choreography that only makes
 * sense when the cinematic was actually watched. Skip is never punished — it is a first
 * class path that preserves continuity (§2.10, C-006).
 *
 * @returns {Guard}
 */
export const notSkipped = () => (context) => context.skipUsed !== true;

/* -------------------------------------------------------------------------- */
/* Additions beyond the six named in the build order — documented, still pure. */
/* -------------------------------------------------------------------------- */

/**
 * A canvas system has reported that its choreography finished (GSAP timeline complete,
 * reveal-and-hold done). Sent as `send('complete')` by the owning canvas component.
 *
 * Always pair it with a ceiling inside `anyOf(...)`: a reduced-motion or WebGL-less path
 * has no timeline to complete, and the reader must still arrive at Earth.
 *
 * @param {string} [state] defaults to the current state
 * @returns {Guard}
 */
export const sceneComplete = (state) => (context) =>
  context.sceneComplete?.[state ?? context.state] === true;

/**
 * A boolean flag carried in the context (e.g. `ageLayerEnabled`). Lets a feature flag
 * shape a transition without the machine importing environment configuration.
 *
 * @param {string} key
 * @returns {Guard}
 */
export const contextFlag = (key) => (context) => context[key] === true;

/* -------------------------------------------------------------------------- */
/* Combinators                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * @param {...Guard} guards
 * @returns {Guard}
 */
export const allOf =
  (...guards) =>
  (context) =>
    guards.every((guard) => guard(context));

/**
 * @param {...Guard} guards
 * @returns {Guard}
 */
export const anyOf =
  (...guards) =>
  (context) =>
    guards.some((guard) => guard(context));

/**
 * @param {Guard} guard
 * @returns {Guard}
 */
export const not = (guard) => (context) => !guard(context);

/**
 * Evaluate a guard list. An empty list passes — a transition with no guards is
 * unconditional by design (used for the reader-driven seams inside the reading room).
 *
 * @param {Guard[]|undefined} guards
 * @param {ExperienceContext} context
 * @returns {boolean}
 */
export const passes = (guards, context) => !guards || guards.every((guard) => guard(context));
