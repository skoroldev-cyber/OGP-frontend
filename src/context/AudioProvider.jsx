/**
 * Opt-in audio.
 *
 * Audio is STRICTLY opt-in (BUILD_CONTRACT §0.4, master §2.9, §8.5.1). This provider:
 *
 *  - never constructs an `AudioContext` until `enableAudio()` is called from an explicit
 *    reader action;
 *  - never restores playback automatically from a remembered preference. The preference is
 *    remembered — itom's `audio_muted`/`audio_volume` persistence is sanctioned by §2.9 —
 *    but a remembered preference is used only to pre-select the control, never to start
 *    sound on a later page-load. Reviving audio from storage on arrival would be autoplay
 *    with extra steps, and "no muted-autoplay-then-unmute" is explicit;
 *  - degrades a missing sound file to silence and never throws. Silent entry is a complete
 *    experience, not a fallback.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { OGP_TIMING } from '@/config/ogpTheme';
import { useExperience } from '@/experience/ExperienceProvider';
import { readPreferences, writePreferences } from '@/services/storage';
import {
  disable as disableEngine,
  enable as enableEngine,
  fadeTo as fadeToEngine,
  playAmbience as playAmbienceEngine,
  setDocumentHidden,
  setMasterVolume,
  silenceAll,
  stopAmbience as stopAmbienceEngine,
} from '@/utils/audioManager';

const AudioContextValue = createContext(null);

/**
 * @returns {{
 *   audioEnabled: boolean, audioPreferred: boolean,
 *   enableAudio: () => Promise<boolean>, disableAudio: () => Promise<void>,
 *   volume: number, setVolume: (v: number) => void,
 *   playAmbience: (name: string, options?: Object) => Promise<boolean>,
 *   stopAmbience: (name: string, fadeSec?: number) => void,
 *   fadeTo: (name: string, volume: number, ms?: number) => void,
 *   silence: () => void,
 * }}
 */
export const useAudio = () => {
  const context = useContext(AudioContextValue);
  if (!context) throw new Error('useAudio must be used within an AudioProvider');
  return context;
};

/**
 * @param {{ children: React.ReactNode }} props
 */
export const AudioProvider = ({ children }) => {
  const { setAudioEnabled: setMachineAudioEnabled } = useExperience();

  const [audioEnabled, setAudioEnabled] = useState(false);
  const [audioPreferred] = useState(() => readPreferences().audioEnabled === true);
  const [volume, setVolumeState] = useState(
    () => readPreferences().audioVolume ?? OGP_TIMING.audio.defaultVolume,
  );

  /**
   * The consent moment. Must originate in a reader action — a click, tap or key press on
   * the sound control. Returns false when the browser or device gives us no audio at all,
   * in which case the experience simply stays silent.
   */
  const enableAudio = useCallback(async () => {
    const started = await enableEngine();
    if (!started) return false;
    setMasterVolume(volume);
    setAudioEnabled(true);
    setMachineAudioEnabled(true);
    writePreferences({ audioEnabled: true, audioVolume: volume });
    return true;
  }, [volume, setMachineAudioEnabled]);

  /** Mute is always one action away (§2.9). Ramped, never cut. */
  const disableAudio = useCallback(async () => {
    setAudioEnabled(false);
    setMachineAudioEnabled(false);
    writePreferences({ audioEnabled: false });
    await disableEngine();
  }, [setMachineAudioEnabled]);

  const setVolume = useCallback((next) => {
    const clamped = Math.max(0, Math.min(1, next));
    setVolumeState(clamped);
    setMasterVolume(clamped);
    writePreferences({ audioVolume: clamped });
  }, []);

  const playAmbience = useCallback(
    (name, options) => playAmbienceEngine(name, options),
    [],
  );

  const stopAmbience = useCallback((name, fadeSec) => stopAmbienceEngine(name, fadeSec), []);

  const fadeTo = useCallback((name, target, ms) => fadeToEngine(name, target, ms), []);

  const silence = useCallback(() => silenceAll(), []);

  // Halt on hide, resume with no perceptible reset (§2.11). The ramp, not a pause, is what
  // makes the return inaudible.
  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const onVisibility = () => setDocumentHidden(document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  const value = useMemo(
    () => ({
      audioEnabled,
      audioPreferred,
      enableAudio,
      disableAudio,
      volume,
      setVolume,
      playAmbience,
      stopAmbience,
      fadeTo,
      silence,
    }),
    [
      audioEnabled,
      audioPreferred,
      enableAudio,
      disableAudio,
      volume,
      setVolume,
      playAmbience,
      stopAmbience,
      fadeTo,
      silence,
    ],
  );

  return <AudioContextValue.Provider value={value}>{children}</AudioContextValue.Provider>;
};

export default AudioProvider;
