/**
 * First-party event pipeline.
 *
 * There is no third-party analytics in this application. No PostHog, no Google Analytics,
 * no pixels, no cookies (BUILD_CONTRACT §0.8, master §7.10). These events exist for one
 * purpose: the privacy-first admin dashboard's S0→S14 funnel.
 *
 * Guarantees:
 *  - Batched: flushed at 10 events or 15 s, and always ≤ 20 per wire batch.
 *  - Beaconed on `visibilitychange: hidden`, so a reader closing the tab does not lose
 *    the milestone they just reached.
 *  - Queued to storage on failure and replayed idempotently. Beta-instrument integrity
 *    requires pausing rather than silently losing or duplicating events (§3.8.3).
 *  - **Whitelisted client-side as well as server-side.** The whitelist is not a
 *    convenience; it is the mechanism by which `ageRange` — and IP, user agent, location,
 *    referrer URLs and any free text from the reader — can never leave the device inside
 *    an event (BUILD_CONTRACT §3).
 *
 * Failure never surfaces to the reader, in any form.
 */

import { ENV } from '@/config/env';
import { OGP_TIMING } from '@/config/ogpTheme';
import { EVENTS } from '@/experience/states';
import { api } from '@/services/api';
import { AREAS, STORAGE_KEYS, readRecord, writeRecord } from '@/services/storage';
import { getSessionToken } from '@/services/session';

/**
 * The payload whitelist, verbatim from BUILD_CONTRACT §3. A key absent from this table is
 * dropped before the event is ever buffered — not merely before it is sent.
 */
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

/**
 * Belt and braces. Even if a whitelist entry were mis-edited, these names can never be
 * transmitted. `ageRange` is the one the corpus names explicitly and repeatedly.
 */
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

/** @type {Array<{ name: string, occurredAt: string, payload: Object, dedupeKey: string }>} */
let buffer = [];
let flushTimer = null;
let initialised = false;
let counter = 0;

/**
 * Reduce a payload to the keys the contract permits for that event.
 *
 * @param {string} name
 * @param {Object} payload
 * @returns {Object}
 */
const sanitise = (name, payload) => {
  const allowed = PAYLOAD_WHITELIST[name];
  if (!allowed || !payload) return {};
  /** @type {Record<string, any>} */
  const clean = {};
  for (const key of allowed) {
    if (FORBIDDEN_KEYS.includes(key)) continue;
    const value = payload[key];
    if (value === undefined || value === null) continue;
    // Only primitives cross the wire. An object could smuggle an un-whitelisted key.
    if (typeof value === 'object') continue;
    clean[key] = value;
  }
  return clean;
};

/**
 * @returns {Array<Object>} the persisted retry queue
 */
const readQueue = () => {
  const record = readRecord(AREAS.LOCAL, STORAGE_KEYS.EVENT_QUEUE);
  return Array.isArray(record.items) ? record.items : [];
};

/**
 * @param {Array<Object>} items
 */
const writeQueue = (items) => {
  // Bound the queue: a device offline for a long session must not fill its storage quota.
  const bounded = items.slice(-200);
  writeRecord(AREAS.LOCAL, STORAGE_KEYS.EVENT_QUEUE, { items: bounded, v: 1 });
};

/**
 * Merge undelivered events back into the queue, de-duplicated by their client dedupe key.
 *
 * @param {Array<Object>} items
 */
const enqueue = (items) => {
  if (!items.length) return;
  const existing = readQueue();
  const seen = new Set(existing.map((item) => item.dedupeKey));
  const merged = existing.concat(items.filter((item) => !seen.has(item.dedupeKey)));
  writeQueue(merged);
};

/**
 * Strip the client-only dedupe key: the wire envelope is exactly
 * `{ events: [{ name, occurredAt, payload }] }` and the server rejects unknown keys.
 *
 * @param {Array<Object>} items
 * @returns {{ events: Array<{ name: string, occurredAt: string, payload: Object }> }}
 */
const toEnvelope = (items) => ({
  events: items.map(({ name, occurredAt, payload }) => ({ name, occurredAt, payload })),
});

/**
 * @returns {boolean} whether events may be transmitted at all right now
 */
const canTransmit = () => ENV.eventsEnabled && Boolean(ENV.apiBaseUrl) && Boolean(getSessionToken());

/**
 * Deliver a batch. Undelivered batches return to the queue for the next attempt.
 *
 * @param {Array<Object>} items
 * @param {{ keepalive?: boolean }} [options]
 * @returns {Promise<boolean>}
 */
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

/**
 * Record an event.
 *
 * @param {string} name one of `EVENTS`
 * @param {Object} [payload] keys outside the contract whitelist are dropped here
 */
export const emit = (name, payload = {}) => {
  if (!PAYLOAD_WHITELIST[name]) return; // Unknown event names are never invented at runtime.
  counter += 1;
  buffer.push({
    name,
    occurredAt: new Date().toISOString(),
    payload: sanitise(name, payload),
    // Client-only. Lets a replay after a failed POST avoid duplicating what it already holds.
    dedupeKey: `${name}:${counter}:${Date.now()}`,
  });
  if (buffer.length >= OGP_TIMING.events.maxBatch) void flush();
};

/**
 * Send everything currently held — the live buffer first, then any queued failures.
 *
 * @param {{ keepalive?: boolean }} [options]
 * @returns {Promise<void>}
 */
export const flush = async (options = {}) => {
  const pending = buffer.concat(readQueue());
  buffer = [];
  writeQueue([]);
  if (!pending.length) return;

  const ceiling = OGP_TIMING.events.wireBatchCeiling;
  // Sequential: the funnel is only readable if batches arrive in the order they happened.
  for (let index = 0; index < pending.length; index += ceiling) {
    const batch = pending.slice(index, index + ceiling);
    const delivered = await deliver(batch, options);
    if (!delivered) {
      // Stop on the first failure: the remainder goes back to the queue intact, so the
      // instrument pauses rather than scattering half a session across retries.
      enqueue(pending.slice(index + ceiling));
      return;
    }
  }
};

/**
 * Beacon path. `sendBeacon` survives page teardown where `fetch` does not; when it is
 * unavailable, a keepalive fetch is the fallback, and a failed beacon simply re-queues.
 */
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

  // `sendBeacon` cannot carry an Authorization header, so a keepalive fetch — which does —
  // is the primary teardown path. The beacon is the last resort for a document that is
  // already being destroyed, and the queue is the last resort after that.
  try {
    void api.postEvents(toEnvelope(batch), { keepalive: true }).catch(() => enqueue(batch));
    return;
  } catch {
    /* the request could not even be started; try the beacon */
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

/**
 * Start the pipeline. Idempotent — React StrictMode mounts effects twice in development.
 *
 * @returns {() => void} teardown
 */
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

  // Anything left over from a previous page-load goes out as soon as a session exists.
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

/** Test/erasure hook: drop everything held locally without transmitting it. */
export const discardPending = () => {
  buffer = [];
  writeQueue([]);
};

export default { emit, flush, initEvents, discardPending };
