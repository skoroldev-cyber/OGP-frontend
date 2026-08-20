import { ENV } from '@/config/env';
import { OGP_TIMING } from '@/config/ogpTheme';
import { EVENTS } from '@/experience/states';
import { api } from '@/services/api';
import { AREAS, STORAGE_KEYS, readRecord, writeRecord } from '@/services/storage';
import { getSessionToken } from '@/services/session';

const PAYLOAD_WHITELIST = Object.freeze({
  [EVENTS.LANDING_STARTED]: [
    'entryPath',
    'referrerDomain',
    'reducedMotion',
    'deviceTier',
    'locale',
    'isReturnVisit',
  ],
  [EVENTS.LOGO_MANIFESTATION_STARTED]: ['msSinceLanding', 'skippedIntro'],
  [EVENTS.PORTAL_ENTRY_STARTED]: [
    'msSinceLanding',
    'inputMethod',
    'skippedCinematic',
    'silentMode',
    'motionMode',
  ],
  [EVENTS.EARTH_REVEAL_COMPLETED]: ['msSinceLanding', 'mode', 'audioEnabled'],
  [EVENTS.READING_ROOM_ENTERED]: ['msSinceLanding', 'entryType'],
  [EVENTS.READING_SESSION_STARTED]: ['resume', 'lastUnitId'],
  [EVENTS.CHAPTER_COMPLETED]: ['unitId', 'componentIndex', 'msReading'],
  [EVENTS.SHARE_PROMPT_DISPLAYED]: ['promptId', 'unitId', 'windowType', 'visualTreatment'],
  [EVENTS.SHARE_COMPLETED]: ['promptId', 'shareTokenId', 'channel'],
  [EVENTS.SHARE_TOKEN_OPENED]: ['shareTokenId'],
  [EVENTS.OPENING_ARC_COMPLETED]: ['totalMsReading', 'componentsCompleted', 'sharesCompleted'],
  [EVENTS.PATHWAY_SELECTED]: ['pathway'],
});

const FORBIDDEN_KEYS = Object.freeze([
  'ageRange',
  'ageBand',
  'birthdate',
  'dateOfBirth',
  'gender',
  'sex',
  'ip',
  'ipAddress',
  'userAgent',
  'location',
  'geo',
  'latitude',
  'longitude',
  'referrer',
  'referrerUrl',
  'fingerprint',
  'deviceId',
  'email',
  'text',
  'comment',
  'feedback',
]);

let buffer = [];
let flushTimer = null;
let initialised = false;
let counter = 0;

const sanitise = (name, payload) => {
  const allowed = PAYLOAD_WHITELIST[name];
  if (!allowed || !payload) return {};
  const clean = {};
  for (const key of allowed) {
    if (FORBIDDEN_KEYS.includes(key)) continue;
    const value = payload[key];
    if (value === undefined || value === null) continue;
    if (typeof value === 'object') continue;
    clean[key] = value;
  }
  return clean;
};

const readQueue = () => {
  const record = readRecord(AREAS.LOCAL, STORAGE_KEYS.EVENT_QUEUE);
  return Array.isArray(record.items) ? record.items : [];
};

const writeQueue = (items) => {
  const bounded = items.slice(-200);
  writeRecord(AREAS.LOCAL, STORAGE_KEYS.EVENT_QUEUE, { items: bounded, v: 1 });
};

const enqueue = (items) => {
  if (!items.length) return;
  const existing = readQueue();
  const seen = new Set(existing.map((item) => item.dedupeKey));
  const merged = existing.concat(items.filter((item) => !seen.has(item.dedupeKey)));
  writeQueue(merged);
};

const toEnvelope = (items) => ({
  events: items.map(({ name, occurredAt, payload }) => ({ name, occurredAt, payload })),
});

const canTransmit = () => ENV.eventsEnabled && Boolean(ENV.apiBaseUrl) && Boolean(getSessionToken());

const deliver = async (items, options = {}) => {
  if (!items.length) return true;
  if (!canTransmit()) {
    enqueue(items);
    return false;
  }
  try {
    await api.postEvents(toEnvelope(items), { keepalive: options.keepalive === true });
    return true;
  } catch {
    enqueue(items);
    return false;
  }
};

export const emit = (name, payload = {}) => {
  if (!PAYLOAD_WHITELIST[name]) return;
  counter += 1;
  buffer.push({
    name,
    occurredAt: new Date().toISOString(),
    payload: sanitise(name, payload),
    dedupeKey: `${name}:${counter}:${Date.now()}`,
  });
  if (buffer.length >= OGP_TIMING.events.maxBatch) void flush();
};

export const flush = async (options = {}) => {
  const pending = buffer.concat(readQueue());
  buffer = [];
  writeQueue([]);
  if (!pending.length) return;

  const ceiling = OGP_TIMING.events.wireBatchCeiling;
  for (let index = 0; index < pending.length; index += ceiling) {
    const batch = pending.slice(index, index + ceiling);
    const delivered = await deliver(batch, options);
    if (!delivered) {
      enqueue(pending.slice(index + ceiling));
      return;
    }
  }
};

const beacon = () => {
  const pending = buffer.concat(readQueue());
  if (!pending.length) return;
  buffer = [];

  if (!canTransmit()) {
    writeQueue(pending);
    return;
  }

  const batch = pending.slice(0, OGP_TIMING.events.wireBatchCeiling);
  const remainder = pending.slice(OGP_TIMING.events.wireBatchCeiling);
  writeQueue(remainder);

  try {
    void api.postEvents(toEnvelope(batch), { keepalive: true }).catch(() => enqueue(batch));
    return;
  } catch {
    void 0;
  }

  try {
    const sent =
      typeof navigator !== 'undefined' &&
      typeof navigator.sendBeacon === 'function' &&
      navigator.sendBeacon(
        `${ENV.apiBaseUrl}/events`,
        new Blob([JSON.stringify(toEnvelope(batch))], { type: 'application/json' }),
      );
    if (!sent) enqueue(batch);
  } catch {
    enqueue(batch);
  }
};

export const initEvents = () => {
  if (initialised) return () => {};
  initialised = true;

  flushTimer = setInterval(() => {
    void flush();
  }, OGP_TIMING.events.flushIntervalMs);

  const onVisibility = () => {
    if (typeof document !== 'undefined' && document.hidden) beacon();
  };
  const onPageHide = () => beacon();

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onPageHide);
  }

  void flush();

  return () => {
    if (flushTimer) clearInterval(flushTimer);
    flushTimer = null;
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onPageHide);
    }
    initialised = false;
  };
};

export const discardPending = () => {
  buffer = [];
  writeQueue([]);
};

export default { emit, flush, initEvents, discardPending };
