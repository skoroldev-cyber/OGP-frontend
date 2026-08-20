import { useSyncExternalStore } from 'react';

let noteOpen = false;

const listeners = new Set();

const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const getSnapshot = () => noteOpen;

const getServerSnapshot = () => false;

export const setNoteComposerOpen = (open) => {
  const next = open === true;
  if (next === noteOpen) return;
  noteOpen = next;
  for (const listener of listeners) listener();
};

export const useNoteComposerOpen = () =>
  useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
