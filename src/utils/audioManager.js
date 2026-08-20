import { OGP_MOTION, OGP_TIMING } from '@/config/ogpTheme';
import { assetUrl } from '@/config/env';

const AUDIO = OGP_TIMING.audio;

export const AMBIENCE_SOURCES = Object.freeze({
  field_air_distant: '/sounds/field_air_distant.ogg',
  field_water_low: '/sounds/field_water_low.ogg',
  earth_harmonic_open: '/sounds/earth_harmonic_open.ogg',
  room_tone_reading: '/sounds/room_tone_reading.ogg',
});

let context = null;
let master = null;
let enabled = false;
let masterVolume = AUDIO.defaultVolume;

const buffers = new Map();
const loading = new Map();

const layers = new Map();

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
    void 0;
  }
};

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

const scheduleRepetition = (name, layer, buffer, when, first) => {
  if (!context || layer.stopping) return;

  const crossfade = Math.min(AUDIO.loopCrossfadeSec, buffer.duration / 3);
  const source = context.createBufferSource();
  const voice = context.createGain();
  source.buffer = buffer;
  source.connect(voice);
  voice.connect(layer.gain);

  const fadeIn = first ? AUDIO.fadeSec : crossfade;
  voice.gain.setValueAtTime(0, when);
  voice.gain.linearRampToValueAtTime(1, when + fadeIn);

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
      void 0;
    }
  };

  const nextAt = when + buffer.duration - crossfade;
  const delayMs = Math.max(0, (nextAt - context.currentTime - AUDIO.schedulerLookaheadSec) * 1000);
  layer.timer = window.setTimeout(() => {
    if (layer.stopping) return;
    scheduleRepetition(name, layer, buffer, Math.max(nextAt, context.currentTime + 0.05), false);
  }, delayMs);
};

export const enable = async () => {
  if (!ensureContext()) return false;
  enabled = true;
  try {
    if (context.state === 'suspended') await context.resume();
  } catch {
    void 0;
  }
  ramp(master, masterVolume, OGP_MOTION.durations.uiGentle);
  return context.state === 'running';
};

export const disable = async () => {
  enabled = false;
  if (!context || !master) return;
  ramp(master, 0, AUDIO.fadeSec);
  await new Promise((resolve) => setTimeout(resolve, AUDIO.fadeSec * 1000));
  for (const name of Array.from(layers.keys())) stopAmbience(name, 0.05);
  try {
    await context.suspend();
  } catch {
    void 0;
  }
};

export const isEnabled = () => enabled && context?.state === 'running';

export const setMasterVolume = (volume, seconds = OGP_MOTION.durations.uiGentle) => {
  masterVolume = Math.max(0, Math.min(1, volume));
  if (master) ramp(master, masterVolume, seconds);
};

export const getMasterVolume = () => masterVolume;

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
  if (!buffer) return false;
  if (layer.stopping || !context) return false;

  ramp(layer.gain, volume, options.fadeSec ?? AUDIO.fadeSec);
  scheduleRepetition(name, layer, buffer, context.currentTime + 0.05, true);
  return true;
};

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
          void 0;
        }
      }
    },
    Math.max(50, fadeSec * 1000 + 50),
  );
};

export const fadeTo = (name, volume, ms = AUDIO.fadeSec * 1000) => {
  const layer = layers.get(name);
  if (!layer) return;
  layer.volume = Math.max(0, Math.min(1, volume));
  ramp(layer.gain, layer.volume, ms / 1000);
};

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
      void 0;
    }
  };
  try {
    source.start();
  } catch {
    void 0;
  }
};

export const silenceAll = (fadeSec = AUDIO.fadeSec) => {
  for (const name of layers.keys()) fadeTo(name, 0, fadeSec * 1000);
};

export const setDocumentHidden = (hidden) => {
  if (!context || !enabled) return;
  if (hidden) {
    void context.suspend().catch(() => {});
  } else {
    void context.resume().catch(() => {});
  }
};

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
