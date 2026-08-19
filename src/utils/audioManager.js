/**
 * The two-layer audio engine.
 *
 *   Layer 1 — ambience: at most one looping bed per name, gain-ramped, with the loop point
 *             crossfaded so no seam is ever audible. Audible loop seams are prohibited
 *             (§8.5.2), and "audio-visual loops that read as loops" are prohibited motion
 *             (§8.3.3).
 *   Layer 2 — one-shots: rare, quiet acknowledgement ticks recorded from natural materials.
 *
 * Two rules govern everything below.
 *
 *   **Nothing plays until the reader asks.** The `AudioContext` is not even constructed
 *   until `enable()` is called from an explicit reader action. No autoplay, no
 *   muted-autoplay-then-unmute; silence is complete (§2.9, BUILD_CONTRACT §0.4). This
 *   reverses itom's behaviour of starting background music on the entrance click.
 *
 *   **Every change is a ramp.** itom's `AudioManager.fade()` was a hard pause (§7.12
 *   defect 6). Here `fade()` is a real `linearRampToValueAtTime` on a `GainNode`; a cut
 *   would be perceptible machinery.
 *
 * A missing or undecodable file degrades to silence and NEVER throws: the field recordings
 * are commissioned assets that may not be present in every environment, and their absence
 * must not break a reading session.
 */

import { OGP_MOTION, OGP_TIMING } from '@/config/ogpTheme';
import { assetUrl } from '@/config/env';

const AUDIO = OGP_TIMING.audio;

/**
 * Named sources. Mirrors the audio entries of the READING_CORE asset group; those are
 * marked `preload: false` there because fetching them before opt-in would be a consent
 * violation, not merely a performance cost.
 */
export const AMBIENCE_SOURCES = Object.freeze({
  field_air_distant: '/sounds/field_air_distant.ogg',
  field_water_low: '/sounds/field_water_low.ogg',
  earth_harmonic_open: '/sounds/earth_harmonic_open.ogg',
  room_tone_reading: '/sounds/room_tone_reading.ogg',
});

/** @type {AudioContext|null} */
let context = null;
/** @type {GainNode|null} */
let master = null;
let enabled = false;
let masterVolume = AUDIO.defaultVolume;

/** @type {Map<string, AudioBuffer|null>} name -> decoded buffer, or null when unavailable */
const buffers = new Map();
/** @type {Map<string, Promise<AudioBuffer|null>>} in-flight decodes */
const loading = new Map();

/**
 * @typedef {Object} AmbienceLayer
 * @property {GainNode} gain
 * @property {number} volume            the layer's target volume, 0–1
 * @property {AudioBufferSourceNode[]} sources
 * @property {number|null} timer        loop-crossfade scheduler handle
 * @property {boolean} stopping
 */

/** @type {Map<string, AmbienceLayer>} */
const layers = new Map();

/**
 * Create the context. Only ever called from `enable()`, i.e. from a reader gesture.
 *
 * @returns {AudioContext|null}
 */
const ensureContext = () => {
  if (context) return context;
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return null;
  try {
    context = new Ctor();
    master = context.createGain();
    master.gain.setValueAtTime(masterVolume, context.currentTime);
    master.connect(context.destination);
    return context;
  } catch {
    context = null;
    master = null;
    return null;
  }
};

/**
 * A real gain ramp. `setValueAtTime(currentValue)` first, so a ramp that interrupts
 * another ramp starts from where the signal actually is rather than snapping.
 *
 * @param {GainNode} node
 * @param {number} target 0–1
 * @param {number} seconds
 */
const ramp = (node, target, seconds) => {
  if (!context) return;
  const t = context.currentTime;
  const clamped = Math.max(0, Math.min(1, target));
  const duration = Math.max(0.01, seconds);
  try {
    node.gain.cancelScheduledValues(t);
    node.gain.setValueAtTime(node.gain.value, t);
    node.gain.linearRampToValueAtTime(clamped, t + duration);
  } catch {
    /* a detached node; nothing to ramp */
  }
};

/**
 * Fetch and decode a named source. Resolves to `null` when the file is missing — silence
 * is a valid outcome, and the reader is never told.
 *
 * @param {string} name
 * @returns {Promise<AudioBuffer|null>}
 */
const loadBuffer = async (name) => {
  if (buffers.has(name)) return buffers.get(name);
  if (loading.has(name)) return loading.get(name);

  const url = AMBIENCE_SOURCES[name];
  if (!url || !ensureContext()) {
    buffers.set(name, null);
    return null;
  }

  const task = (async () => {
    try {
      const response = await fetch(assetUrl(url), { credentials: 'omit' });
      if (!response.ok) throw new Error('missing');
      const bytes = await response.arrayBuffer();
      const decoded = await context.decodeAudioData(bytes);
      buffers.set(name, decoded);
      return decoded;
    } catch {
      buffers.set(name, null);
      return null;
    } finally {
      loading.delete(name);
    }
  })();

  loading.set(name, task);
  return task;
};

/**
 * @param {string} name
 * @returns {AmbienceLayer|null}
 */
const ensureLayer = (name) => {
  if (!ensureContext()) return null;
  let layer = layers.get(name);
  if (layer) return layer;
  const gain = context.createGain();
  gain.gain.setValueAtTime(0, context.currentTime);
  gain.connect(master);
  layer = { gain, volume: 1, sources: [], timer: null, stopping: false };
  layers.set(name, layer);
  return layer;
};

/**
 * Start one buffer repetition at `when`, with an equal-power crossfade at both ends, and
 * schedule the next repetition so the two overlap. This is what removes the loop seam:
 * a plain `source.loop = true` would expose the discontinuity between the tail and the head
 * of a field recording.
 *
 * @param {string} name
 * @param {AmbienceLayer} layer
 * @param {AudioBuffer} buffer
 * @param {number} when context time
 * @param {boolean} first true for the very first repetition (ramp from silence)
 */
const scheduleRepetition = (name, layer, buffer, when, first) => {
  if (!context || layer.stopping) return;

  const crossfade = Math.min(AUDIO.loopCrossfadeSec, buffer.duration / 3);
  const source = context.createBufferSource();
  const voice = context.createGain();
  source.buffer = buffer;
  source.connect(voice);
  voice.connect(layer.gain);

  // Fade in. The first repetition uses the full opt-in fade so sound arrives rather than
  // starting; subsequent repetitions use the loop crossfade so they are inaudible.
  const fadeIn = first ? AUDIO.fadeSec : crossfade;
  voice.gain.setValueAtTime(0, when);
  voice.gain.linearRampToValueAtTime(1, when + fadeIn);

  // Fade out across the tail, overlapping the next repetition's fade in.
  const tailStart = when + Math.max(0, buffer.duration - crossfade);
  voice.gain.setValueAtTime(1, tailStart);
  voice.gain.linearRampToValueAtTime(0, when + buffer.duration);

  try {
    source.start(when);
    source.stop(when + buffer.duration + 0.05);
  } catch {
    return;
  }

  layer.sources.push(source);
  source.onended = () => {
    layer.sources = layer.sources.filter((existing) => existing !== source);
    try {
      voice.disconnect();
    } catch {
      /* already detached */
    }
  };

  // Schedule the successor slightly before this one ends so the crossfade overlaps.
  const nextAt = when + buffer.duration - crossfade;
  const delayMs = Math.max(0, (nextAt - context.currentTime - AUDIO.schedulerLookaheadSec) * 1000);
  layer.timer = window.setTimeout(() => {
    if (layer.stopping) return;
    scheduleRepetition(name, layer, buffer, Math.max(nextAt, context.currentTime + 0.05), false);
  }, delayMs);
};

/* -------------------------------------------------------------------------- */
/* Public surface                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Turn the engine on. MUST be called from an explicit reader action — a click, a tap or a
 * key press on the sound control — because that is both the consent moment and the only
 * moment a browser will let an `AudioContext` start.
 *
 * @returns {Promise<boolean>} whether audio is now available
 */
export const enable = async () => {
  if (!ensureContext()) return false;
  enabled = true;
  try {
    if (context.state === 'suspended') await context.resume();
  } catch {
    /* the reader can try again; nothing is broken */
  }
  ramp(master, masterVolume, OGP_MOTION.durations.uiGentle);
  return context.state === 'running';
};

/**
 * Turn the engine off with a ramp, then suspend it. Mute is always one action away (§2.9).
 *
 * @returns {Promise<void>}
 */
export const disable = async () => {
  enabled = false;
  if (!context || !master) return;
  ramp(master, 0, AUDIO.fadeSec);
  await new Promise((resolve) => setTimeout(resolve, AUDIO.fadeSec * 1000));
  for (const name of Array.from(layers.keys())) stopAmbience(name, 0.05);
  try {
    await context.suspend();
  } catch {
    /* already suspended */
  }
};

/** @returns {boolean} */
export const isEnabled = () => enabled && context?.state === 'running';

/**
 * @param {number} volume 0–1
 * @param {number} [seconds]
 */
export const setMasterVolume = (volume, seconds = OGP_MOTION.durations.uiGentle) => {
  masterVolume = Math.max(0, Math.min(1, volume));
  if (master) ramp(master, masterVolume, seconds);
};

/** @returns {number} */
export const getMasterVolume = () => masterVolume;

/**
 * Start a looping ambience bed. Idempotent: calling it again for a bed that is already
 * playing only adjusts its level.
 *
 * @param {string} name key of `AMBIENCE_SOURCES`
 * @param {{ volume?: number, fadeSec?: number }} [options]
 * @returns {Promise<boolean>} false when the file is unavailable (silently)
 */
export const playAmbience = async (name, options = {}) => {
  if (!enabled || !ensureContext()) return false;

  const layer = ensureLayer(name);
  if (!layer) return false;

  const volume = options.volume ?? 1;
  layer.volume = volume;
  layer.stopping = false;

  if (layer.sources.length > 0) {
    ramp(layer.gain, volume, options.fadeSec ?? AUDIO.fadeSec);
    return true;
  }

  const buffer = await loadBuffer(name);
  if (!buffer) return false; // Missing asset: silence, no error, no retry storm.
  if (layer.stopping || !context) return false;

  ramp(layer.gain, volume, options.fadeSec ?? AUDIO.fadeSec);
  scheduleRepetition(name, layer, buffer, context.currentTime + 0.05, true);
  return true;
};

/**
 * Stop a bed with a ramp. Never a pause — a cut is perceptible machinery.
 *
 * @param {string} name
 * @param {number} [fadeSec]
 */
export const stopAmbience = (name, fadeSec = AUDIO.fadeSec) => {
  const layer = layers.get(name);
  if (!layer) return;
  layer.stopping = true;
  if (layer.timer != null) {
    window.clearTimeout(layer.timer);
    layer.timer = null;
  }
  ramp(layer.gain, 0, fadeSec);
  const sources = layer.sources.slice();
  layer.sources = [];
  window.setTimeout(
    () => {
      for (const source of sources) {
        try {
          source.stop();
        } catch {
          /* already finished */
        }
      }
    },
    Math.max(50, fadeSec * 1000 + 50),
  );
};

/**
 * Ramp a bed to a level. The Reading Room uses this to settle ambience to <= 20% of the
 * opening level as the reader settles (§8.5.3).
 *
 * @param {string} name
 * @param {number} volume 0–1
 * @param {number} [ms]
 */
export const fadeTo = (name, volume, ms = AUDIO.fadeSec * 1000) => {
  const layer = layers.get(name);
  if (!layer) return;
  layer.volume = Math.max(0, Math.min(1, volume));
  ramp(layer.gain, layer.volume, ms / 1000);
};

/**
 * A single quiet acknowledgement. No impacts, no activation sounds, no chimes — those are
 * prohibited (§8.5.2). Reserved for natural-material ticks at very low level.
 *
 * @param {string} name
 * @param {{ volume?: number }} [options]
 * @returns {Promise<void>}
 */
export const playOneShot = async (name, options = {}) => {
  if (!enabled || !ensureContext()) return;
  const buffer = await loadBuffer(name);
  if (!buffer || !context) return;
  const source = context.createBufferSource();
  const gain = context.createGain();
  source.buffer = buffer;
  gain.gain.setValueAtTime(Math.max(0, Math.min(1, options.volume ?? 0.4)), context.currentTime);
  source.connect(gain);
  gain.connect(master);
  source.onended = () => {
    try {
      gain.disconnect();
    } catch {
      /* already detached */
    }
  };
  try {
    source.start();
  } catch {
    /* nothing audible; nothing broken */
  }
};

/** Ramp every bed to silence. Used at the "Become Family." threshold (§8.10.2). */
export const silenceAll = (fadeSec = AUDIO.fadeSec) => {
  for (const name of layers.keys()) fadeTo(name, 0, fadeSec * 1000);
};

/**
 * Halt on `visibilitychange: hidden` and resume with no perceptible reset (§2.11).
 *
 * @param {boolean} hidden
 */
export const setDocumentHidden = (hidden) => {
  if (!context || !enabled) return;
  if (hidden) {
    void context.suspend().catch(() => {});
  } else {
    void context.resume().catch(() => {});
  }
};

/** Full teardown. */
export const destroyAudio = () => {
  for (const name of Array.from(layers.keys())) stopAmbience(name, 0.05);
  layers.clear();
  buffers.clear();
  loading.clear();
  enabled = false;
  if (context) {
    void context.close().catch(() => {});
    context = null;
    master = null;
  }
};
