/**
 * Safe Web Storage wrappers.
 *
 * `localStorage` throws on access in Safari private browsing, in some embedded webviews,
 * and whenever a quota is exhausted. A reader in private mode must still be able to read
 * the manuscript, so every operation here degrades to an in-memory map and NEVER throws.
 *
 * Three keys, and their scopes, are fixed by contract:
 *
 *   `ogp_session_v1`        sessionStorage — the state machine slice and the anonymous
 *                           session token. Session-scoped by privacy policy (§7.2.1):
 *                           it dies with the tab.
 *   `ogp_reading_session`   localStorage — device reading progress. This alone satisfies
 *                           "preservation of progress without requiring an account" (§3.8.1).
 *   `ogp_prefs_v1`          localStorage — motion, audio, text size, theme.
 *
 * plus one operational key, `ogp_event_queue_v1` (localStorage), holding events that could
 * not be delivered, so a network failure pauses the beta instrument rather than silently
 * losing or duplicating events (§3.8.3), and one reader-owned key, `ogp_passage_marks`
 * (localStorage), holding the passages a reader marked while reading (§3.13).
 *
 * Records are objects namespaced by writer (`{ machine: {...}, session: {...} }`) so two
 * subsystems can share one key without clobbering each other.
 */

export const STORAGE_KEYS = Object.freeze({
  SESSION: 'ogp_session_v1',
  READING: 'ogp_reading_session',
  PREFS: 'ogp_prefs_v1',
  EVENT_QUEUE: 'ogp_event_queue_v1',
  MARKS: 'ogp_passage_marks',
});

export const AREAS = Object.freeze({ LOCAL: 'local', SESSION: 'session' });

/** In-memory fallback, used whenever the real storage is unavailable or throws. */
const memory = { local: new Map(), session: new Map() };

/**
 * @param {string} area
 * @returns {Storage|null}
 */
const nativeArea = (area) => {
  if (typeof window === 'undefined') return null;
  try {
    const store = area === AREAS.SESSION ? window.sessionStorage : window.localStorage;
    // Touch it: merely *reading* the property can throw in a blocked third-party context.
    const probe = '__ogp_probe__';
    store.setItem(probe, '1');
    store.removeItem(probe);
    return store;
  } catch {
    return null;
  }
};

/** Probed once per area; re-probing on every call would be a measurable cost. */
const availability = { local: undefined, session: undefined };

/**
 * @param {string} area
 * @returns {Storage|null}
 */
const areaOf = (area) => {
  const key = area === AREAS.SESSION ? 'session' : 'local';
  if (availability[key] === undefined) availability[key] = nativeArea(area);
  return availability[key];
};

/**
 * True when the browser is giving us real persistence. Callers use this to decide whether
 * to offer "Remember my place" — never to block reading.
 *
 * @param {string} [area]
 * @returns {boolean}
 */
export const isStorageAvailable = (area = AREAS.LOCAL) => areaOf(area) != null;

/**
 * @param {string} area
 * @param {string} key
 * @returns {string|null}
 */
export const readRaw = (area, key) => {
  const store = areaOf(area);
  if (store) {
    try {
      return store.getItem(key);
    } catch {
      /* fall through to memory */
    }
  }
  const map = area === AREAS.SESSION ? memory.session : memory.local;
  return map.has(key) ? map.get(key) : null;
};

/**
 * @param {string} area
 * @param {string} key
 * @param {string} value
 * @returns {boolean} whether the value reached real storage
 */
export const writeRaw = (area, key, value) => {
  const map = area === AREAS.SESSION ? memory.session : memory.local;
  map.set(key, value);
  const store = areaOf(area);
  if (!store) return false;
  try {
    store.setItem(key, value);
    return true;
  } catch {
    // Quota exhausted or blocked. The in-memory copy keeps this page-load working.
    return false;
  }
};

/**
 * @param {string} area
 * @param {string} key
 * @returns {Object}
 */
export const readRecord = (area, key) => {
  const raw = readRaw(area, key);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    // Corrupt record: treat it as absent rather than crashing a reader mid-session.
    return {};
  }
};

/**
 * @param {string} area
 * @param {string} key
 * @param {Object} value
 * @returns {boolean}
 */
export const writeRecord = (area, key, value) => {
  try {
    return writeRaw(area, key, JSON.stringify(value));
  } catch {
    return false;
  }
};

/**
 * @param {string} area
 * @param {string} key
 * @param {Object} patch
 * @returns {Object} the merged record
 */
export const mergeRecord = (area, key, patch) => {
  const next = { ...readRecord(area, key), ...patch };
  writeRecord(area, key, next);
  return next;
};

/**
 * @param {string} area
 * @param {string} key
 */
export const removeRecord = (area, key) => {
  const map = area === AREAS.SESSION ? memory.session : memory.local;
  map.delete(key);
  const store = areaOf(area);
  if (!store) return;
  try {
    store.removeItem(key);
  } catch {
    /* nothing further to do */
  }
};

/**
 * Read one writer's slice of a shared record.
 *
 * @param {string} area
 * @param {string} key
 * @param {string} namespace
 * @returns {Object}
 */
export const readNamespaced = (area, key, namespace) => {
  const record = readRecord(area, key);
  const slice = record?.[namespace];
  return slice && typeof slice === 'object' ? slice : {};
};

/**
 * Merge into one writer's slice, leaving every other slice untouched.
 *
 * @param {string} area
 * @param {string} key
 * @param {string} namespace
 * @param {Object} patch
 * @returns {Object} the merged slice
 */
export const mergeNamespaced = (area, key, namespace, patch) => {
  const record = readRecord(area, key);
  const slice = { ...(record[namespace] ?? {}), ...patch };
  writeRecord(area, key, { ...record, [namespace]: slice, v: 1 });
  return slice;
};

/**
 * Replace one writer's slice outright, leaving every other slice untouched.
 *
 * The counterpart to {@link mergeNamespaced}, and necessary because a merge can only ever
 * add: a form clearing its draft by merging `{}` would leave every answer exactly where it
 * was. Discarding a slice is a deliberate act and needs a way to say so.
 *
 * @param {string} area
 * @param {string} key
 * @param {string} namespace
 * @param {Object} slice The complete new slice.
 * @returns {Object} the written slice
 */
export const writeNamespaced = (area, key, namespace, slice) => {
  const record = readRecord(area, key);
  writeRecord(area, key, { ...record, [namespace]: slice, v: 1 });
  return slice;
};

/* -------------------------------------------------------------------------- */
/* Named accessors for the three contractual keys                              */
/* -------------------------------------------------------------------------- */

/** Device reading progress (§3.8.1). Survives a closed tab; never contains PII. */
export const readReadingSession = () => readRecord(AREAS.LOCAL, STORAGE_KEYS.READING);

/**
 * @param {Object} patch
 * @returns {Object}
 */
export const writeReadingSession = (patch) =>
  mergeRecord(AREAS.LOCAL, STORAGE_KEYS.READING, { ...patch, updated_at: new Date().toISOString() });

/** "Remember my place" = Off clears local progress after confirmation (§3.9). */
export const clearReadingSession = () => removeRecord(AREAS.LOCAL, STORAGE_KEYS.READING);

/**
 * The passages a reader marked while reading (§3.13).
 *
 * A separate key from the reading session on purpose. Progress is a position the platform
 * keeps *for* the reader; marks are the reader's own annotations, which they may remove one
 * at a time and which never leave the device until they choose to send them with a note.
 * Keeping them apart means "Begin again from the start" resets the position without
 * discarding what the reader wrote down along the way.
 *
 * @returns {Array<Object>} marks in the order they were made; `[]` when there are none
 */
export const readPassageMarks = () => {
  const record = readRecord(AREAS.LOCAL, STORAGE_KEYS.MARKS);
  return Array.isArray(record.marks) ? record.marks : [];
};

/**
 * @param {Array<Object>} marks the complete list; this replaces the stored one
 * @returns {boolean} whether the value reached real storage
 */
export const writePassageMarks = (marks) =>
  writeRecord(AREAS.LOCAL, STORAGE_KEYS.MARKS, {
    marks: Array.isArray(marks) ? marks : [],
    updated_at: new Date().toISOString(),
  });

/** Turning device memory off, and erasure, both remove the marks with everything else. */
export const clearPassageMarks = () => removeRecord(AREAS.LOCAL, STORAGE_KEYS.MARKS);

/** Motion / audio / text size / theme (§3.9). */
export const readPreferences = () => readRecord(AREAS.LOCAL, STORAGE_KEYS.PREFS);

/**
 * @param {Object} patch
 * @returns {Object}
 */
export const writePreferences = (patch) => mergeRecord(AREAS.LOCAL, STORAGE_KEYS.PREFS, patch);

/**
 * Erase everything this device holds about the reader. Backs the §4.1
 * `DELETE /sessions/current` erasure-and-severance path.
 */
export const clearAllOgpStorage = () => {
  for (const key of Object.values(STORAGE_KEYS)) {
    removeRecord(AREAS.LOCAL, key);
    removeRecord(AREAS.SESSION, key);
  }
};
