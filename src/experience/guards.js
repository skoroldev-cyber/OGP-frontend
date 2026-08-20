import { MOTION_PREFERENCES, READER_INTENTS } from '@/experience/states';

const nowOf = (context) => (typeof context.now === 'number' ? context.now : Date.now());

export const minDwell = (ms) => (context) => nowOf(context) - context.stateEnteredAt >= ms;

export const assetsReady = (group) => (context) => context.assetsReady?.[group] === true;

export const reducedMotion = () => (context) =>
  context.motionPreference === MOTION_PREFERENCES.REDUCED ||
  context.motionPreference === MOTION_PREFERENCES.OFF;

export const audioOptedIn = () => (context) => context.audioEnabled === true;

export const readerIntent = () => (context) =>
  context.pendingIntent != null && READER_INTENTS.includes(context.pendingIntent);

export const notSkipped = () => (context) => context.skipUsed !== true;

export const sceneComplete = (state) => (context) =>
  context.sceneComplete?.[state ?? context.state] === true;

export const contextFlag = (key) => (context) => context[key] === true;

export const allOf =
  (...guards) =>
  (context) =>
    guards.every((guard) => guard(context));

export const anyOf =
  (...guards) =>
  (context) =>
    guards.some((guard) => guard(context));

export const not = (guard) => (context) => !guard(context);

export const passes = (guards, context) => !guards || guards.every((guard) => guard(context));
