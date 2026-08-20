export const STORAGE_KEYS = Object.freeze({
  SESSION: 'ogp_session_v1',
  READING: 'ogp_reading_session',
  PREFS: 'ogp_prefs_v1',
  EVENT_QUEUE: 'ogp_event_queue_v1',
  MARKS: 'ogp_passage_marks',
});

export const AREAS = Object.freeze({ LOCAL: 'local', SESSION: 'session' });

const memory = { local: new Map(), session: new Map() };

const nativeArea = (area) => {
  if (typeof window === 'undefined') return null;
  try {
    const store = area === AREAS.SESSION ? window.sessionStorage : window.localStorage;
    const probe = '__ogp_probe__';
    store.setItem(probe, '1');
    store.removeItem(probe);
    return store;
  } catch {
    return null;
  }
};

const availability = { local: undefined, session: undefined };

const areaOf = (area) => {
  const key = area === AREAS.SESSION ? 'session' : 'local';
  if (availability[key] === undefined) availability[key] = nativeArea(area);
  return availability[key];
};

export const isStorageAvailable = (area = AREAS.LOCAL) => areaOf(area) != null;

export const readRaw = (area, key) => {
  const store = areaOf(area);
  if (store) {
    try {
      return store.getItem(key);
    } catch {
      void 0;
    }
  }
  const map = area === AREAS.SESSION ? memory.session : memory.local;
  return map.has(key) ? map.get(key) : null;
};

export const writeRaw = (area, key, value) => {
  const map = area === AREAS.SESSION ? memory.session : memory.local;
  map.set(key, value);
  const store = areaOf(area);
  if (!store) return false;
  try {
    store.setItem(key, value);
    return true;
  } catch {
    return false;
  }
};

export const readRecord = (area, key) => {
  const raw = readRaw(area, key);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

export const writeRecord = (area, key, value) => {
  try {
    return writeRaw(area, key, JSON.stringify(value));
  } catch {
    return false;
  }
};

export const mergeRecord = (area, key, patch) => {
  const next = { ...readRecord(area, key), ...patch };
  writeRecord(area, key, next);
  return next;
};

export const removeRecord = (area, key) => {
  const map = area === AREAS.SESSION ? memory.session : memory.local;
  map.delete(key);
  const store = areaOf(area);
  if (!store) return;
  try {
    store.removeItem(key);
  } catch {
    void 0;
  }
};

export const readNamespaced = (area, key, namespace) => {
  const record = readRecord(area, key);
  const slice = record?.[namespace];
  return slice && typeof slice === 'object' ? slice : {};
};

export const mergeNamespaced = (area, key, namespace, patch) => {
  const record = readRecord(area, key);
  const slice = { ...(record[namespace] ?? {}), ...patch };
  writeRecord(area, key, { ...record, [namespace]: slice, v: 1 });
  return slice;
};

export const writeNamespaced = (area, key, namespace, slice) => {
  const record = readRecord(area, key);
  writeRecord(area, key, { ...record, [namespace]: slice, v: 1 });
  return slice;
};

export const readReadingSession = () => readRecord(AREAS.LOCAL, STORAGE_KEYS.READING);

export const writeReadingSession = (patch) =>
  mergeRecord(AREAS.LOCAL, STORAGE_KEYS.READING, { ...patch, updated_at: new Date().toISOString() });

export const clearReadingSession = () => removeRecord(AREAS.LOCAL, STORAGE_KEYS.READING);

export const readPassageMarks = () => {
  const record = readRecord(AREAS.LOCAL, STORAGE_KEYS.MARKS);
  return Array.isArray(record.marks) ? record.marks : [];
};

export const writePassageMarks = (marks) =>
  writeRecord(AREAS.LOCAL, STORAGE_KEYS.MARKS, {
    marks: Array.isArray(marks) ? marks : [],
    updated_at: new Date().toISOString(),
  });

export const clearPassageMarks = () => removeRecord(AREAS.LOCAL, STORAGE_KEYS.MARKS);

export const readPreferences = () => readRecord(AREAS.LOCAL, STORAGE_KEYS.PREFS);

export const writePreferences = (patch) => mergeRecord(AREAS.LOCAL, STORAGE_KEYS.PREFS, patch);

export const clearAllOgpStorage = () => {
  for (const key of Object.values(STORAGE_KEYS)) {
    removeRecord(AREAS.LOCAL, key);
    removeRecord(AREAS.SESSION, key);
  }
};
